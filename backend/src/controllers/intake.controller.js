import { asyncHandler } from '../utils/asyncHandler.js';
import { createIntake, verifyIntakePdfToken } from '../services/intake.service.js';
import { Intake } from '../models/Intake.js';
import { IntakeFile } from '../models/IntakeFile.js';
import { generateInquiryPdf } from '../services/pdf.service.js';
import { ApiError } from '../utils/ApiError.js';
import { saveIntakeUpload, listIntakeFiles, deleteIntakeFile, refreshDocumentsStatus, calculateDocumentsStatus, publicFileRecord } from '../services/intake-files.service.js';
import { rm } from 'node:fs/promises';

export const submitIntake = asyncHandler(async (req, res) => {
  const { intake, perSku, pdfToken, pdfExpiresAt, uploadToken, uploadTokenExpiresAt } = await createIntake(req.validatedBody, req);
  res.status(201).json({
    success: true,
    message: 'Inventory intake submitted successfully',
    data: { id: intake.id, reference: intake.reference, totals: intake.totals, perSku, status: intake.status, pdfToken, pdfExpiresAt, uploadToken, uploadTokenExpiresAt }
  });
});

export const getIntakePdfByToken = asyncHandler(async (req, res) => {
  const authorization = req.get('authorization') || '';
  const bearerToken = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
  verifyIntakePdfToken(bearerToken, req.params.reference);
  const intake = await Intake.findOne({ reference: req.params.reference }).lean();
  if (!intake) throw new ApiError(404, 'Intake not found');
  const [files, fileSummary] = await Promise.all([IntakeFile.find({ intakeId: intake._id }).lean(), calculateDocumentsStatus(intake)]);
  const pdf = await generateInquiryPdf({ ...intake, ...fileSummary, files: files.map(publicFileRecord), id: String(intake._id), type: 'intake' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `attachment; filename="Intake-${intake.reference}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
});

export const uploadIntakeFile = asyncHandler(async (req, res) => {
  try {
    const intake = await Intake.findOne({ reference: req.params.reference });
    if (!intake) throw new ApiError(404, 'Intake not found');
    const result = await saveIntakeUpload({ intake, file: req.file, fields: req.body, ip: req.ip });
    res.status(201).json({ success: true, data: { ...result.file, documentsStatus: result.documentsStatus, missingRequiredFiles: result.missingRequiredFiles, recommendedFilesMissing: result.recommendedFilesMissing } });
  } finally {
    if (req.file?.path) await rm(req.file.path, { force: true }).catch(() => {});
  }
});

export const getCustomerIntakeFiles = asyncHandler(async (req, res) => {
  const intake = await Intake.findOne({ reference: req.params.reference }).lean();
  if (!intake) throw new ApiError(404, 'Intake not found');
  const [files, summary] = await Promise.all([listIntakeFiles(intake._id), calculateDocumentsStatus(intake)]);
  res.json({ success: true, data: { files, documentsStatus: summary.documentsStatus, missingRequiredFiles: summary.missingRequiredFiles, recommendedFilesMissing: summary.recommendedFilesMissing } });
});

export const deleteCustomerIntakeFile = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.fileId)) throw new ApiError(400, 'Invalid file ID', [{ field: 'fileId', message: 'Must be a MongoDB ObjectId' }]);
  const intake = await Intake.findOne({ reference: req.params.reference });
  if (!intake) throw new ApiError(404, 'Intake not found');
  if (intake.status !== 'submitted') throw new ApiError(400, 'Files can only be removed while the intake is submitted');
  const file = await deleteIntakeFile(intake._id, req.params.fileId);
  const summary = await refreshDocumentsStatus(intake);
  res.json({ success: true, message: 'File deleted', data: { id: String(file._id), documentsStatus: summary.documentsStatus, missingRequiredFiles: summary.missingRequiredFiles, recommendedFilesMissing: summary.recommendedFilesMissing } });
});
