import mongoose from 'mongoose';
import { INTAKE_CATEGORIES, INTAKE_SERVICES, STORAGE_REQUIREMENTS, DECLARED_HAZMAT_STATUSES, HAZARD_TYPES, SDS_STATUSES, BATTERY_UN383_STATUSES, HAZARD_CLASSES, PACKING_GROUPS, BATTERY_TYPES, BATTERY_CONFIGURATIONS, PHYSICAL_STATES, LEAKAGE_DAMAGE_RISKS, AMAZON_FULFILMENT_CHANNELS, AMAZON_LISTING_STATUSES, AMAZON_DG_REVIEW_STATUSES, AMAZON_COMPLIANCE_DOCS_STATUSES, WAREHOUSE_STATUSES, VERIFICATION_SDS_STATUSES, FINAL_CLASSIFICATIONS, PACKING_MODES, INTAKE_STATUSES, INTAKE_EMAIL_STATUSES, DOCUMENTS_STATUSES } from '../constants/intake.js';

const uniformSchema = new mongoose.Schema({
  cartons: { type: Number, required: true, min: 1, max: 100000 },
  unitsPerCarton: { type: Number, required: true, min: 1, max: 100000 },
  cartonWeightKg: { type: Number, required: true, min: 0.01, max: 1000 },
  cartonLengthCm: { type: Number, min: 1, max: 300 },
  cartonWidthCm: { type: Number, min: 1, max: 300 },
  cartonHeightCm: { type: Number, min: 1, max: 300 },
  // Read old Phase 1 uniform records until they age out under retention.
  lengthCm: { type: Number, min: 1, max: 300 }, widthCm: { type: Number, min: 1, max: 300 }, heightCm: { type: Number, min: 1, max: 300 }
}, { _id: false });

const boxSchema = new mongoose.Schema({
  boxNumber: { type: Number, min: 1 },
  units: { type: Number, required: true, min: 1, max: 100000 },
  weightKg: { type: Number, required: true, min: 0.01, max: 1000 },
  lengthCm: { type: Number, required: true, min: 1, max: 300 },
  widthCm: { type: Number, required: true, min: 1, max: 300 },
  heightCm: { type: Number, required: true, min: 1, max: 300 }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  cartons: { type: Number, required: true, min: 1 },
  units: { type: Number, required: true, min: 1 },
  grossWeightKg: { type: Number, required: true, min: 0 },
  volumeM3: { type: Number, required: true, min: 0 }
}, { _id: false });

const batterySchema = new mongoose.Schema({
  type: { type: String, enum: BATTERY_TYPES }, configuration: { type: String, enum: BATTERY_CONFIGURATIONS },
  wattHours: { type: Number, min: 0.1, max: 100000 }, un383Status: { type: String, enum: BATTERY_UN383_STATUSES }
}, { _id: false });
const hazmatSchema = new mongoose.Schema({
  declaredStatus: { type: String, enum: DECLARED_HAZMAT_STATUSES, required: true },
  hazardTypes: { type: [{ type: String, enum: HAZARD_TYPES }], default: [] },
  sdsStatus: { type: String, enum: SDS_STATUSES, default: 'not-required' },
  unNumber: { type: String, uppercase: true, match: /^UN\d{4}$/ }, hazardClass: { type: String, enum: HAZARD_CLASSES },
  packingGroup: { type: String, enum: PACKING_GROUPS }, properShippingName: { type: String, trim: true, maxlength: 200, default: '' },
  battery: { type: batterySchema, default: undefined }, instructions: { type: String, trim: true, maxlength: 1000, default: '' }
}, { _id: false });
const handlingSchema = new mongoose.Schema({
  containsBatteries: { type: Boolean, default: false }, isExpiryDated: { type: Boolean, default: false }, expiryDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  physicalState: { type: String, enum: PHYSICAL_STATES }, leakageOrDamageRisk: { type: String, enum: LEAKAGE_DAMAGE_RISKS },
  leakageRisk: { type: String }, instructions: { type: String, trim: true, maxlength: 1000, default: '' }
}, { _id: false });
const amazonSchema = new mongoose.Schema({ sellsOnAmazon: { type: Boolean, required: true }, fulfilmentChannel: { type: String, enum: AMAZON_FULFILMENT_CHANNELS }, listingStatus: { type: String, enum: AMAZON_LISTING_STATUSES }, dgReviewStatus: { type: String, enum: AMAZON_DG_REVIEW_STATUSES }, complianceDocsAvailable: { type: String, enum: AMAZON_COMPLIANCE_DOCS_STATUSES }, fnsku: { type: String, trim: true, maxlength: 10, default: '' }, asin: { type: String, trim: true, maxlength: 10, default: '' }, instructions: { type: String, trim: true, maxlength: 1000, default: '' } }, { _id: false });
const verificationSchema = new mongoose.Schema({
  warehouseStatus: { type: String, enum: WAREHOUSE_STATUSES, default: 'not-reviewed' },
  sdsStatus: { type: String, enum: VERIFICATION_SDS_STATUSES, default: 'not-required' },
  finalClassification: { type: String, enum: FINAL_CLASSIFICATIONS, default: '' },
  verifiedBy: { type: String, trim: true, maxlength: 254, default: '' }, verifiedAt: { type: Date }, notes: { type: String, trim: true, maxlength: 1000, default: '' }
}, { _id: false });
const auditSchema = new mongoose.Schema({ at: { type: Date, required: true }, by: { type: String, required: true, maxlength: 254 }, action: { type: String, required: true, maxlength: 100 }, productId: { type: String, default: '' }, changes: { type: mongoose.Schema.Types.Mixed, default: {} } }, { _id: false });

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, trim: true, maxlength: 160 },
  brandName: { type: String, trim: true, maxlength: 120, default: '' },
  sku: { type: String, required: true, trim: true, maxlength: 64 },
  fnsku: { type: String, trim: true, maxlength: 10 },
  asin: { type: String, trim: true, maxlength: 10 },
  barcode: { type: String, required: true, trim: true, match: /^\d{8,14}$/ },
  category: { type: String, enum: INTAKE_CATEGORIES, required: true },
  countryOfOrigin: { type: String, uppercase: true, trim: true, maxlength: 2 },
  packingMode: { type: String, enum: PACKING_MODES, required: true },
  storage: { type: [{ type: String, enum: STORAGE_REQUIREMENTS }], default: undefined }, hazmat: { type: hazmatSchema }, handling: { type: handlingSchema }, amazon: { type: amazonSchema }, verification: { type: verificationSchema },
  uniform: { type: uniformSchema },
  boxes: { type: [boxSchema], default: undefined },
  results: { type: resultSchema, required: true }
});

const intakeSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, immutable: true },
  customer: {
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    businessName: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 }
  },
  products: { type: [productSchema], required: true, validate: (value) => value.length >= 1 && value.length <= 100 },
  totals: {
    skus: { type: Number, required: true, min: 1 },
    cartons: { type: Number, required: true, min: 1, max: 100000 },
    units: { type: Number, required: true, min: 1 },
    grossWeightKg: { type: Number, required: true, min: 0 },
    volumeM3: { type: Number, required: true, min: 0 }
  },
  services: { type: [{ type: String, enum: INTAKE_SERVICES }], default: undefined },
  requiresDgReview: { type: Boolean, default: false }, dgProductCount: { type: Number, default: 0, min: 0 }, auditLog: { type: [auditSchema], default: [] },
  documentsStatus: { type: String, enum: DOCUMENTS_STATUSES, default: 'incomplete' },
  additionalInstructions: { type: String, trim: true, maxlength: 3000, default: '' },
  consent: { type: Boolean, required: true, validate: (value) => value === true },
  consentAt: { type: Date, required: true },
  consentVersion: { type: String, required: true, trim: true },
  status: { type: String, enum: INTAKE_STATUSES, default: 'submitted' },
  emailStatus: { type: String, enum: INTAKE_EMAIL_STATUSES, default: 'pending' },
  emailSentAt: { type: Date },
  ip: { type: String, maxlength: 64 },
  userAgent: { type: String, maxlength: 500 }
}, { timestamps: true, versionKey: false });

intakeSchema.index({ createdAt: 1 });
intakeSchema.index({ status: 1 });
intakeSchema.index({ 'customer.businessName': 1 });
intakeSchema.index({ requiresDgReview: 1 });
intakeSchema.index({ documentsStatus: 1 });

export const Intake = mongoose.models.Intake || mongoose.model('Intake', intakeSchema);
