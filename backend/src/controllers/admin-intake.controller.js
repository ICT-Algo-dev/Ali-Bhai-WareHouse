import { z } from 'zod';
import { Intake } from '../models/Intake.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateInquiryPdf } from '../services/pdf.service.js';
import { WAREHOUSE_STATUSES, VERIFICATION_SDS_STATUSES, FINAL_CLASSIFICATIONS, INTAKE_STATUSES, DOCUMENTS_STATUSES } from '../constants/intake.js';
import { IntakeFile } from '../models/IntakeFile.js';
import { calculateDocumentsStatus, deleteIntakeFile, publicFileRecord, safeDownloadName } from '../services/intake-files.service.js';
import { storageProvider } from '../storage/LocalStorageProvider.js';
import { ZipArchive } from 'archiver';
import path from 'node:path';
import { getIntakeCategoryLabel, getIntakeServiceLabels, STORAGE_LABELS, DECLARED_HAZMAT_STATUS_LABELS, HAZARD_TYPE_LABELS, SDS_STATUS_LABELS, HAZARD_CLASS_LABELS, PACKING_GROUP_LABELS, BATTERY_TYPE_LABELS, BATTERY_CONFIGURATION_LABELS, BATTERY_UN383_STATUS_LABELS, PHYSICAL_STATE_LABELS, LEAKAGE_DAMAGE_RISK_LABELS, AMAZON_FULFILMENT_CHANNEL_LABELS, AMAZON_LISTING_STATUS_LABELS, AMAZON_DG_REVIEW_STATUS_LABELS, AMAZON_COMPLIANCE_DOCS_LABELS } from '../utils/labels.js';

function withReadDefaults(item) {
  const plain = { ...item };
  plain.requiresDgReview ??= false;
  plain.dgProductCount ??= (plain.products || []).filter((p) => p.hazmat?.declaredStatus && p.hazmat.declaredStatus !== 'non-hazmat').length;
  plain.services ??= [];
  plain.serviceLabels = getIntakeServiceLabels(plain.services);
  plain.documentsStatus ??= 'incomplete';
  plain.auditLog ??= [];
  plain.products = (plain.products || []).map((product) => {
    const hazmat = product.hazmat || {}; const handling = product.handling || {}; const amazon = product.amazon || {};
    return {
      ...product,
      categoryLabel: getIntakeCategoryLabel(product.category),
      storageLabels: (product.storage || []).map((value) => STORAGE_LABELS[value] || value),
      hazmatLabels: { declaredStatus: DECLARED_HAZMAT_STATUS_LABELS[hazmat.declaredStatus] || hazmat.declaredStatus, hazardTypes: (hazmat.hazardTypes || []).map((value) => HAZARD_TYPE_LABELS[value] || value), sdsStatus: SDS_STATUS_LABELS[hazmat.sdsStatus] || hazmat.sdsStatus, hazardClass: HAZARD_CLASS_LABELS[hazmat.hazardClass] || hazmat.hazardClass, packingGroup: PACKING_GROUP_LABELS[hazmat.packingGroup] || hazmat.packingGroup, batteryType: BATTERY_TYPE_LABELS[hazmat.battery?.type] || hazmat.battery?.type, batteryConfiguration: BATTERY_CONFIGURATION_LABELS[hazmat.battery?.configuration] || hazmat.battery?.configuration, un383Status: BATTERY_UN383_STATUS_LABELS[hazmat.battery?.un383Status] || hazmat.battery?.un383Status },
      handlingLabels: { physicalState: PHYSICAL_STATE_LABELS[handling.physicalState] || handling.physicalState, leakageOrDamageRisk: LEAKAGE_DAMAGE_RISK_LABELS[handling.leakageOrDamageRisk] || handling.leakageOrDamageRisk || handling.leakageRisk },
      amazonLabels: { fulfilmentChannel: AMAZON_FULFILMENT_CHANNEL_LABELS[amazon.fulfilmentChannel] || amazon.fulfilmentChannel, listingStatus: AMAZON_LISTING_STATUS_LABELS[amazon.listingStatus] || amazon.listingStatus, dgReviewStatus: AMAZON_DG_REVIEW_STATUS_LABELS[amazon.dgReviewStatus] || amazon.dgReviewStatus, complianceDocsAvailable: AMAZON_COMPLIANCE_DOCS_LABELS[amazon.complianceDocsAvailable] || amazon.complianceDocsAvailable },
      verification: product.verification || { warehouseStatus: 'not-reviewed', sdsStatus: product.hazmat?.sdsStatus && product.hazmat.sdsStatus !== 'not-required' ? 'pending' : 'not-required', finalClassification: '', verifiedBy: '', notes: '' }
    };
  });
  return plain;
}

const intakeStatuses = INTAKE_STATUSES;
const emptyAsUndefined = (schema) => z.preprocess((value) => value === '' ? undefined : value, schema);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ensureValidId = (id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, 'Invalid intake ID', [{ field: 'id', message: 'Must be a MongoDB ObjectId' }]);
};

export const listIntakes = asyncHandler(async (req, res) => {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: emptyAsUndefined(z.enum(intakeStatuses).optional()),
    requiresDgReview: emptyAsUndefined(z.enum(['true', 'false']).transform((v) => v === 'true').optional()),
    documentsStatus: emptyAsUndefined(z.enum(DOCUMENTS_STATUSES).optional()),
    search: emptyAsUndefined(z.string().trim().max(200).optional())
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, 'Invalid query parameters', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  const { page, limit, status, search, requiresDgReview, documentsStatus } = parsed.data;
  const searchFilter = search ? { $or: [
    { reference: new RegExp(escapeRegex(search), 'i') },
    { 'customer.businessName': new RegExp(escapeRegex(search), 'i') },
    { 'customer.contactPerson': new RegExp(escapeRegex(search), 'i') },
    { 'customer.email': new RegExp(escapeRegex(search), 'i') },
    { 'customer.phone': new RegExp(escapeRegex(search), 'i') },
    { 'products.sku': new RegExp(escapeRegex(search), 'i') }
  ] } : {};
  const filter = { ...(status ? { status } : {}), ...(requiresDgReview !== undefined ? { requiresDgReview } : {}), ...(documentsStatus === 'complete' ? { documentsStatus } : {}) };
  const clauses = [];
  if (search) clauses.push(searchFilter);
  if (documentsStatus === 'incomplete') clauses.push({ $or: [{ documentsStatus: 'incomplete' }, { documentsStatus: { $exists: false } }] });
  if (clauses.length) filter.$and = clauses;
  const [items, total] = await Promise.all([
    Intake.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Intake.countDocuments(filter)
  ]);
  res.json({ success: true, data: { items: items.map(withReadDefaults), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
});

export const getIntake = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const intake = await Intake.findById(req.params.id).lean();
  if (!intake) throw new ApiError(404, 'Intake not found');
  const [files, fileSummary] = await Promise.all([IntakeFile.find({ intakeId: intake._id }).sort({ uploadedAt: 1 }).lean(), calculateDocumentsStatus(intake)]);
  const data = withReadDefaults(intake);
  data.files = files.map(publicFileRecord);
  data.documentsStatus = intake.documentsStatus || fileSummary.documentsStatus;
  data.missingRequiredFiles = fileSummary.missingRequiredFiles;
  data.recommendedFilesMissing = fileSummary.recommendedFilesMissing;
  res.json({ success: true, data });
});

export const updateIntakeStatus = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const parsed = z.object({ status: z.enum(intakeStatuses) }).safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Invalid status', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  const existing = await Intake.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Intake not found');
  const nextStatus = parsed.data.status;
  const update = { $set: { status: nextStatus } };
  if (existing.status !== nextStatus) update.$push = { auditLog: { at: new Date(), by: req.admin?.email || 'admin', action: 'status-updated', changes: { status: { from: existing.status, to: nextStatus } } } };
  const intake = await Intake.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  res.json({ success: true, data: { id: intake.id, reference: intake.reference, status: intake.status } });
});

export const updateProductVerification = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const bodySchema = z.object({ warehouseStatus: z.enum(WAREHOUSE_STATUSES), sdsStatus: z.enum(VERIFICATION_SDS_STATUSES), finalClassification: z.enum(FINAL_CLASSIFICATIONS), notes: z.string().trim().max(1000).default('') });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Invalid verification data', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const intake = await Intake.findById(req.params.id);
  if (!intake) throw new ApiError(404, 'Intake not found');
  const product = intake.products.id(req.params.productId);
  if (!product) throw new ApiError(404, 'Intake product not found');
  const from = product.verification?.toObject?.() || product.verification || { warehouseStatus: 'not-reviewed', sdsStatus: product.hazmat?.sdsStatus && product.hazmat.sdsStatus !== 'not-required' ? 'pending' : 'not-required', finalClassification: '', verifiedBy: '', notes: '' };
  const verifiedAt = new Date();
  const to = { ...parsed.data, verifiedBy: req.admin?.email || '', verifiedAt };
  const changes = {};
  for (const field of ['warehouseStatus', 'sdsStatus', 'finalClassification', 'notes']) if ((from[field] || '') !== (to[field] || '')) changes[`verification.${field}`] = { from: from[field] ?? '', to: to[field] ?? '' };
  changes['verification.verifiedBy'] = { from: from.verifiedBy || '', to: to.verifiedBy };
  changes['verification.verifiedAt'] = { from: from.verifiedAt || null, to: verifiedAt };
  product.verification = to;
  intake.auditLog.push({ at: verifiedAt, by: req.admin?.email || 'admin', action: 'product-verification-updated', productId: req.params.productId, changes });
  await intake.save();
  res.json({ success: true, data: withReadDefaults(intake.toObject()) });
});

export const deleteIntake = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const intake = await Intake.findById(req.params.id);
  if (!intake) throw new ApiError(404, 'Intake not found');
  try { await storageProvider.deletePrefix(`intakes/${intake.reference}`); }
  catch { throw new ApiError(500, 'File storage operation failed'); }
  await IntakeFile.deleteMany({ intakeId: intake._id });
  await intake.deleteOne();
  res.json({ success: true, message: 'Intake deleted successfully', data: { id: intake.id, reference: intake.reference } });
});

export const getIntakePdf = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const intake = await Intake.findById(req.params.id).lean();
  if (!intake) throw new ApiError(404, 'Intake not found');
  const [files, fileSummary] = await Promise.all([IntakeFile.find({ intakeId: intake._id }).lean(), calculateDocumentsStatus(intake)]);
  const pdf = await generateInquiryPdf({ ...withReadDefaults(intake), files: files.map(publicFileRecord), ...fileSummary, id: String(intake._id), type: 'intake' }, { admin: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `attachment; filename="Intake-${intake.reference}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
});

export const downloadIntakeFile = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  if (!/^[a-f\d]{24}$/i.test(req.params.fileId)) throw new ApiError(400, 'Invalid file ID', [{ field: 'fileId', message: 'Must be a MongoDB ObjectId' }]);
  const file = await IntakeFile.findOne({ _id: req.params.fileId, intakeId: req.params.id }).select('+storageKey');
  if (!file) throw new ApiError(404, 'File not found');
  let storedFileExists;
  try { storedFileExists = await storageProvider.exists(file.storageKey); }
  catch { throw new ApiError(500, 'File storage operation failed'); }
  if (!storedFileExists) throw new ApiError(404, 'Stored file not found');
  const stream = storageProvider.openReadStream(file.storageKey);
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeDownloadName(file.originalName)}"`);
  stream.on('error', (error) => { if (!res.headersSent) return res.status(404).json({ success: false, message: 'Stored file not found', errors: [] }); res.destroy(error); });
  stream.pipe(res);
});

export const deleteAdminIntakeFile = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  if (!/^[a-f\d]{24}$/i.test(req.params.fileId)) throw new ApiError(400, 'Invalid file ID', [{ field: 'fileId', message: 'Must be a MongoDB ObjectId' }]);
  const intake = await Intake.findById(req.params.id);
  if (!intake) throw new ApiError(404, 'Intake not found');
  const file = await deleteIntakeFile(intake._id, req.params.fileId);
  await Intake.updateOne({ _id: intake._id }, { $push: { auditLog: { at: new Date(), by: req.admin?.email || 'admin', action: 'file-deleted', productId: file.productId || '', changes: { file: { from: file.originalName, to: null } } } } });
  const fileSummary = await calculateDocumentsStatus(intake);
  await Intake.updateOne({ _id: intake._id }, { $set: { documentsStatus: fileSummary.documentsStatus } });
  res.json({ success: true, message: 'File deleted', data: { id: String(file._id), documentsStatus: fileSummary.documentsStatus, missingRequiredFiles: fileSummary.missingRequiredFiles } });
});

export const downloadIntakeFilesZip = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const intake = await Intake.findById(req.params.id);
  if (!intake) throw new ApiError(404, 'Intake not found');
  const files = await IntakeFile.find({ intakeId: intake._id }).select('+storageKey').sort({ uploadedAt: 1 });
  await Intake.updateOne({ _id: intake._id }, { $push: { auditLog: { at: new Date(), by: req.admin?.email || 'admin', action: 'files-zip-downloaded', changes: { fileCount: { from: 0, to: files.length } } } } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `attachment; filename="Intake-${safeDownloadName(intake.reference)}-files.zip"`);
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', (error) => { if (!res.headersSent) return res.status(500).end(); res.destroy(error); });
  archive.pipe(res);
  const used = new Set();
  for (const file of files) {
    const folder = `${safeDownloadName(file.sku || '_submission')}/${safeDownloadName(file.kind)}`;
    const base = safeDownloadName(file.originalName);
    let name = base; let counter = 1;
    while (used.has(`${folder}/${name}`.toLocaleLowerCase('en-GB'))) { const ext = path.extname(base); name = `${path.basename(base, ext)}-${counter++}${ext}`; }
    used.add(`${folder}/${name}`.toLocaleLowerCase('en-GB'));
    try {
      if (await storageProvider.exists(file.storageKey)) archive.append(storageProvider.openReadStream(file.storageKey), { name: `${folder}/${name}` });
    } catch { throw new ApiError(500, 'File storage operation failed'); }
  }
  await archive.finalize();
});
