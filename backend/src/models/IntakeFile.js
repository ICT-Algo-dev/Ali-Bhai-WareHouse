import mongoose from 'mongoose';
import { INTAKE_FILE_KINDS, SCAN_STATUSES, UPLOADED_VIA, UPLOAD_MIME_TYPES } from '../constants/intake.js';

const intakeFileSchema = new mongoose.Schema({
  intakeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Intake', required: true },
  reference: { type: String, required: true, maxlength: 40 },
  productId: { type: String, default: null, maxlength: 40 },
  sku: { type: String, default: null, maxlength: 64 },
  kind: { type: String, enum: INTAKE_FILE_KINDS, required: true },
  originalName: { type: String, required: true, maxlength: 150 },
  storageKey: { type: String, required: true, maxlength: 300, select: false },
  mimeType: { type: String, enum: UPLOAD_MIME_TYPES, required: true },
  sizeBytes: { type: Number, required: true, min: 1 },
  sha256: { type: String, required: true, match: /^[a-f\d]{64}$/ },
  scanStatus: { type: String, enum: SCAN_STATUSES, default: 'not-scanned' },
  uploadedAt: { type: Date, default: Date.now },
  uploadedVia: { type: String, enum: UPLOADED_VIA, required: true },
  ip: { type: String, maxlength: 64 }
}, { timestamps: false, versionKey: false });

intakeFileSchema.index({ intakeId: 1 });
intakeFileSchema.index({ reference: 1 });
intakeFileSchema.index({ intakeId: 1, sku: 1, kind: 1 });
intakeFileSchema.index({ intakeId: 1, sku: 1, kind: 1, sha256: 1 }, { unique: true });

export const IntakeFile = mongoose.models.IntakeFile || mongoose.model('IntakeFile', intakeFileSchema);
