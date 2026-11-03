import { createReadStream, promises as fs } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { Intake } from '../models/Intake.js';
import { IntakeFile } from '../models/IntakeFile.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { INTAKE_FILE_KINDS, PRODUCT_FILE_KINDS, SUBMISSION_FILE_KINDS, PDF_ONLY_FILE_KINDS, DOCUMENTS_STATUSES, SCAN_STATUSES, UPLOAD_MIME_TYPES } from '../constants/intake.js';
import { storageProvider } from '../storage/LocalStorageProvider.js';
import { scanFile } from './virus-scan.service.js';

const imageTypes = new Set(UPLOAD_MIME_TYPES.filter((type) => type.startsWith('image/')));
const fileTypes = {
  pdf: { mimeType: UPLOAD_MIME_TYPES[0], extension: 'pdf', prefix: Buffer.from('%PDF-') },
  jpeg: { mimeType: UPLOAD_MIME_TYPES[1], extension: 'jpg', prefix: Buffer.from([0xff, 0xd8, 0xff]) },
  png: { mimeType: UPLOAD_MIME_TYPES[2], extension: 'png', prefix: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }
};

export function issueUploadToken(reference) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return { uploadToken: jwt.sign({ purpose: 'intake-upload', reference, iat: issuedAt }, env.JWT_SECRET, { expiresIn: 86400 }), uploadTokenExpiresAt: new Date((issuedAt + 86400) * 1000) };
}

export function verifyUploadToken(token, reference) {
  if (!token || !env.JWT_SECRET) throw new ApiError(401, 'Valid upload token required');
  try {
    const claims = jwt.verify(token, env.JWT_SECRET);
    if (claims.purpose !== 'intake-upload' || claims.reference !== reference) throw new Error('Token scope mismatch');
    return claims;
  } catch { throw new ApiError(401, 'Invalid or expired upload token'); }
}

export async function detectFileType(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const bytes = Buffer.alloc(8); const { bytesRead } = await handle.read(bytes, 0, 8, 0);
    const header = bytes.subarray(0, bytesRead);
    return Object.values(fileTypes).find(({ prefix }) => header.subarray(0, prefix.length).equals(prefix)) || null;
  } finally { await handle.close(); }
}

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function safeOriginalName(value) {
  const leaf = String(value || 'upload').replace(/\\/g, '/').split('/').pop().replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 150);
  return leaf || 'upload';
}

export function publicFileRecord(file) {
  const data = typeof file.toObject === 'function' ? file.toObject() : { ...file };
  delete data.storageKey;
  return data;
}

export async function calculateDocumentsStatus(intake) {
  const files = await IntakeFile.find({ intakeId: intake._id }).select('sku kind').lean();
  const have = new Set(files.map((file) => `${file.sku || ''}\0${file.kind}`));
  const missingRequiredFiles = (intake.products || []).filter((product) => !have.has(`${product.sku}\0barcode-pdf`)).map((product) => ({ sku: product.sku, kind: 'barcode-pdf' }));
  const recommendedFilesMissing = [];
  for (const product of intake.products || []) {
    const hazmat = product.hazmat || {};
    if (hazmat.sdsStatus === 'available' && !have.has(`${product.sku}\0sds`)) recommendedFilesMissing.push({ sku: product.sku, kind: 'sds' });
    if (hazmat.battery?.un383Status === 'available' && !have.has(`${product.sku}\0un383-test-summary`)) recommendedFilesMissing.push({ sku: product.sku, kind: 'un383-test-summary' });
    if (['hazmat-dangerous-goods', 'limited-quantity', 'excepted-quantity'].includes(hazmat.declaredStatus) && !have.has(`${product.sku}\0dangerous-goods-declaration`)) recommendedFilesMissing.push({ sku: product.sku, kind: 'dangerous-goods-declaration' });
    if (product.fnsku && !have.has(`${product.sku}\0fnsku-labels-pdf`)) recommendedFilesMissing.push({ sku: product.sku, kind: 'fnsku-labels-pdf' });
  }
  return { documentsStatus: missingRequiredFiles.length ? DOCUMENTS_STATUSES[1] : DOCUMENTS_STATUSES[0], missingRequiredFiles, recommendedFilesMissing };
}

export async function refreshDocumentsStatus(intake) {
  const summary = await calculateDocumentsStatus(intake);
  await Intake.updateOne({ _id: intake._id }, { $set: { documentsStatus: summary.documentsStatus } });
  return summary;
}

export async function saveIntakeUpload({ intake, file, fields, ip }) {
  const { kind, sku } = fields;
  if (!INTAKE_FILE_KINDS.includes(kind)) throw new ApiError(400, 'Invalid file kind', [{ field: 'kind', message: 'Choose an allowed file kind' }]);
  const productScoped = PRODUCT_FILE_KINDS.includes(kind);
  if (productScoped && !sku) throw new ApiError(400, 'SKU is required for this file kind', [{ field: 'sku', message: 'SKU is required' }]);
  if (SUBMISSION_FILE_KINDS.includes(kind) && sku) throw new ApiError(400, 'SKU is not allowed for this file kind', [{ field: 'sku', message: 'Omit SKU for submission-level files' }]);
  let product = null;
  if (productScoped) {
    product = intake.products.find((entry) => entry.sku.toLocaleLowerCase('en-GB') === String(sku).trim().toLocaleLowerCase('en-GB'));
    if (!product) throw new ApiError(400, 'SKU does not belong to this intake', [{ field: 'sku', message: 'Select a product SKU from this intake' }]);
  }
  if (['received', 'closed'].includes(intake.status)) throw new ApiError(400, 'Uploads are closed for this intake');
  let detected;
  try { detected = await detectFileType(file.path); }
  catch { throw new ApiError(500, 'Could not inspect uploaded file'); }
  if (!detected || (PDF_ONLY_FILE_KINDS.includes(kind) && detected.mimeType !== 'application/pdf') || (!PDF_ONLY_FILE_KINDS.includes(kind) && detected.mimeType !== 'application/pdf' && !imageTypes.has(detected.mimeType))) {
    throw new ApiError(415, 'File type is not allowed for this kind');
  }
  if (detected.mimeType === 'application/pdf' && env.PDF_REJECT_ACTIVE_CONTENT) {
    let raw;
    try { raw = await fs.readFile(file.path); }
    catch { throw new ApiError(500, 'Could not inspect uploaded PDF'); }
    if (/\/(?:JavaScript|JS|Launch|OpenAction)\b/i.test(raw.toString('latin1'))) throw new ApiError(400, 'PDF contains active content');
  }
  let scanStatus;
  try { scanStatus = await scanFile(file.path); }
  catch { throw new ApiError(503, 'Virus scanning service is unavailable'); }
  if (scanStatus === SCAN_STATUSES[2]) throw new ApiError(400, 'File rejected by virus scanner');
  let sha256;
  try { sha256 = await hashFile(file.path); }
  catch { throw new ApiError(500, 'Could not process uploaded file'); }
  const duplicate = await IntakeFile.exists({ intakeId: intake._id, sku: productScoped ? product.sku : null, kind, sha256 });
  if (duplicate) throw new ApiError(400, 'An identical file has already been uploaded for this SKU and kind');
  const [intakeCount, productCount, intakeFiles] = await Promise.all([
    IntakeFile.countDocuments({ intakeId: intake._id }),
    productScoped ? IntakeFile.countDocuments({ intakeId: intake._id, sku: product.sku }) : 0,
    IntakeFile.find({ intakeId: intake._id }).select('sizeBytes').lean()
  ]);
  if (intakeCount >= env.UPLOAD_MAX_FILES_PER_INTAKE) throw new ApiError(413, 'Upload limit reached: maximum files per intake');
  if (productScoped && productCount >= env.UPLOAD_MAX_FILES_PER_PRODUCT) throw new ApiError(413, 'Upload limit reached: maximum files per product');
  const totalBytes = intakeFiles.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (totalBytes + file.size > env.UPLOAD_MAX_TOTAL_MB_PER_INTAKE * 1024 * 1024) throw new ApiError(413, 'Upload limit reached: maximum total intake size');
  const originalName = safeOriginalName(file.originalname);
  const storageKey = `intakes/${intake.reference}/${randomUUID()}.${detected.extension}`;
  try { await storageProvider.save(file.path, storageKey); }
  catch { throw new ApiError(500, 'File storage operation failed'); }
  let saved;
  try {
    saved = await IntakeFile.create({ intakeId: intake._id, reference: intake.reference, productId: product ? String(product._id) : null, sku: product?.sku || null, kind, originalName, storageKey, mimeType: detected.mimeType, sizeBytes: file.size, sha256, scanStatus, uploadedVia: 'customer', ip: String(ip || '').slice(0, 64) });
    const summary = await refreshDocumentsStatus(intake);
    return { file: publicFileRecord(saved), ...summary };
  } catch (error) {
    if (saved) await IntakeFile.deleteOne({ _id: saved._id }).catch(() => {});
    await storageProvider.delete(storageKey).catch(() => {});
    if (error.code === 11000) throw new ApiError(400, 'An identical file has already been uploaded for this SKU and kind');
    throw error;
  }
}

export async function listIntakeFiles(intakeId) {
  const files = await IntakeFile.find({ intakeId }).sort({ uploadedAt: 1 }).lean();
  return files.map(publicFileRecord);
}

export async function deleteIntakeFile(intakeId, fileId) {
  const file = await IntakeFile.findOne({ _id: fileId, intakeId }).select('+storageKey');
  if (!file) throw new ApiError(404, 'File not found');
  try { await storageProvider.delete(file.storageKey); }
  catch { throw new ApiError(500, 'File storage operation failed'); }
  await file.deleteOne();
  return file;
}

export function safeDownloadName(value) {
  const base = path.basename(String(value || 'file').replace(/\\/g, '/')).replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/[^a-zA-Z0-9._ -]/g, '-').trim().slice(0, 140);
  return !base || base === '.' || base === '..' ? 'file' : base;
}
