import mongoose from 'mongoose';
import { env } from '../config/env.js';
const inquirySchema = new mongoose.Schema({
  type: { type: String, enum: ['contact', 'quote'], required: true, index: true },
  fullName: { type: String, trim: true, maxlength: 120 }, businessName: { type: String, trim: true, required: true, maxlength: 160 },
  contactPerson: { type: String, trim: true, maxlength: 120 }, phone: { type: String, required: true, maxlength: 20 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 }, businessType: { type: String, trim: true, maxlength: 100 },
  estimatedMonthlyOrders: { type: String, trim: true, maxlength: 80 }, estimatedInventoryVolume: { type: String, trim: true, maxlength: 100 },
  monthlyOrderVolume: { type: String, trim: true, maxlength: 100 }, requiredServices: { type: [String], required: true, validate: (items) => items.length > 0 },
  message: { type: String, trim: true, maxlength: 3000 }, additionalRequirements: { type: String, trim: true, maxlength: 3000 },
  consent: { type: Boolean, required: true, default: false, validate: (value) => value === true },
  consentAt: { type: Date, required: true }, consentVersion: { type: String, required: true, trim: true },
  emailStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  emailSentAt: { type: Date },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'closed'], default: 'new', index: true }, ip: { type: String, maxlength: 64 }, userAgent: { type: String, maxlength: 500 }
}, { timestamps: true, versionKey: false });
inquirySchema.index({ createdAt: 1 }, { expireAfterSeconds: env.INQUIRY_RETENTION_DAYS * 24 * 60 * 60 });
inquirySchema.index({ type: 1, status: 1, createdAt: -1 });
export const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);
