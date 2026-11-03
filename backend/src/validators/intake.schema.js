import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.js';
import { INTAKE_CATEGORIES, INTAKE_SERVICES, STORAGE_REQUIREMENTS, DECLARED_HAZMAT_STATUSES, HAZARD_TYPES, SDS_STATUSES, BATTERY_UN383_STATUSES, HAZARD_CLASSES, PACKING_GROUPS, BATTERY_TYPES, BATTERY_CONFIGURATIONS, PHYSICAL_STATES, LEAKAGE_DAMAGE_RISKS, AMAZON_FULFILMENT_CHANNELS, AMAZON_LISTING_STATUSES, AMAZON_DG_REVIEW_STATUSES, AMAZON_COMPLIANCE_DOCS_STATUSES, PACKING_MODES } from '../constants/intake.js';

export { INTAKE_CATEGORIES };
const ISO_COUNTRIES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LY MA MC MD ME MF MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const emptyAsUndefined = (schema) => z.preprocess((v) => v === '' ? undefined : v, schema);
const text = (max, label, defaultValue = '') => z.string().trim().max(max, `${label} must be ${max} characters or fewer`).default(defaultValue);
const instructions = (label) => z.string().transform((v) => v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')).pipe(z.string().trim().max(1000, `${label} must be 1000 characters or fewer`)).default('');
const requiredText = (max, label) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);
const enumSchema = (values, label) => z.enum(values, { errorMap: () => ({ message: `Choose a valid ${label}` }) });
const positiveInteger = (label, max = 100000) => z.number().int(`${label} must be a whole number`).min(1, `${label} must be at least 1`).max(max, `${label} must be ${max} or fewer`);
const decimalPlaces = (v) => (String(v).toLowerCase().split('e')[0].split('.')[1] || '').length;
const dimension = (label) => z.number().finite().min(1, `${label} must be at least 1 cm`).max(300, `${label} must be 300 cm or fewer`).refine((v) => decimalPlaces(v) <= 2, `${label} must have at most 2 decimal places`);
const weight = (label) => z.number().finite().min(0.01, `${label} must be at least 0.01 kg`).max(1000).refine((v) => decimalPlaces(v) <= 2, `${label} must have at most 2 decimal places`);
const uniqueArray = (schema, label) => z.array(schema).min(1, `Select at least one ${label}`).refine((a) => new Set(a).size === a.length, `${label} must not contain duplicates`);
const boxDimensions = { lengthCm: dimension('Length'), widthCm: dimension('Width'), heightCm: dimension('Height') };
const uniformDimensions = { cartonLengthCm: dimension('Carton length'), cartonWidthCm: dimension('Carton width'), cartonHeightCm: dimension('Carton height') };
const uniformSchema = z.object({ cartons: positiveInteger('Cartons'), unitsPerCarton: positiveInteger('Units per carton'), cartonWeightKg: weight('Carton weight'), ...uniformDimensions });
const boxSchema = z.object({ boxNumber: z.number().int().min(1).optional(), units: positiveInteger('Units'), weightKg: weight('Box weight'), ...boxDimensions });
const hazmatSchema = z.object({
  declaredStatus: enumSchema(DECLARED_HAZMAT_STATUSES, 'hazmat declared status'),
  hazardTypes: z.array(enumSchema(HAZARD_TYPES, 'hazard type')).default([]),
  sdsStatus: enumSchema(SDS_STATUSES, 'SDS status').optional(),
  unNumber: emptyAsUndefined(z.string().trim().regex(/^UN\d{4}$/i, 'UN number must match UN followed by four digits').transform((v) => v.toUpperCase()).optional()),
  hazardClass: emptyAsUndefined(enumSchema(HAZARD_CLASSES, 'hazard class').optional()),
  packingGroup: emptyAsUndefined(enumSchema(PACKING_GROUPS, 'packing group').optional()),
  properShippingName: text(200, 'Proper shipping name'),
  battery: z.object({ type: enumSchema(BATTERY_TYPES, 'battery type').optional(), configuration: enumSchema(BATTERY_CONFIGURATIONS, 'battery configuration').optional(), wattHours: z.number().min(0.1).max(100000).refine((v) => decimalPlaces(v) <= 2, 'Watt-hours must have at most 2 decimal places').optional(), un383Status: enumSchema(BATTERY_UN383_STATUSES, 'UN 38.3 status').optional() }).optional(),
  instructions: instructions('Hazmat instructions')
}).superRefine((h, ctx) => {
  const dg = h.declaredStatus !== 'non-hazmat' || h.hazardTypes.length > 0;
  if (dg && !h.sdsStatus) ctx.addIssue({ code: 'custom', path: ['sdsStatus'], message: 'SDS status is required for declared dangerous goods' });
  if (!dg && !h.sdsStatus) h.sdsStatus = 'not-required';
  if (h.declaredStatus === 'non-hazmat') {
    for (const [field, value] of Object.entries({ hazardTypes: h.hazardTypes.length, unNumber: h.unNumber, hazardClass: h.hazardClass, packingGroup: h.packingGroup, properShippingName: h.properShippingName, battery: h.battery })) {
      if (value && (typeof value !== 'number' || value > 0)) ctx.addIssue({ code: 'custom', path: [field], message: 'Must be empty when declared status is non-hazmat' });
    }
  } else if (!h.hazardTypes.length) ctx.addIssue({ code: 'custom', path: ['hazardTypes'], message: 'Select at least one hazard type for this declared status' });
  const lithium = h.hazardTypes.includes('lithium-battery');
  if (lithium && !h.battery) ctx.addIssue({ code: 'custom', path: ['battery'], message: 'Battery details are required for lithium batteries' });
  if (!lithium && h.battery) ctx.addIssue({ code: 'custom', path: ['battery'], message: 'Battery details are only allowed for lithium batteries' });
});
const handlingSchema = z.object({ containsBatteries: z.boolean().default(false), isExpiryDated: z.boolean().default(false), expiryDate: emptyAsUndefined(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must use YYYY-MM-DD').optional()), physicalState: enumSchema(PHYSICAL_STATES, 'physical state').optional(), leakageOrDamageRisk: enumSchema(LEAKAGE_DAMAGE_RISKS, 'leakage or damage risk').optional(), leakageRisk: z.string().optional(), instructions: instructions('Handling instructions') }).superRefine((h, ctx) => {
  if (h.expiryDate) {
    const date = new Date(`${h.expiryDate}T00:00:00.000Z`);
    const now = new Date(); const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const max = new Date(Date.UTC(now.getUTCFullYear() + 10, now.getUTCMonth(), now.getUTCDate()));
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== h.expiryDate || date.getTime() <= today || date > max) ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date must be a real date in the future and within 10 years' });
  }
  if (h.isExpiryDated && !h.expiryDate) ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date is required for expiry-dated products' });
  if (!h.isExpiryDated && h.expiryDate) ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date is only allowed when isExpiryDated is true' });
});
const amazonSchema = z.object({ sellsOnAmazon: z.boolean(), fulfilmentChannel: enumSchema(AMAZON_FULFILMENT_CHANNELS, 'Amazon fulfilment channel').optional(), listingStatus: enumSchema(AMAZON_LISTING_STATUSES, 'Amazon listing status').optional(), dgReviewStatus: enumSchema(AMAZON_DG_REVIEW_STATUSES, 'Amazon dangerous goods review status').optional(), complianceDocsAvailable: enumSchema(AMAZON_COMPLIANCE_DOCS_STATUSES, 'Amazon compliance document status').optional(), fnsku: text(10, 'Amazon FNSKU'), asin: text(10, 'Amazon ASIN'), instructions: instructions('Amazon instructions') }).superRefine((a, ctx) => {
  if (a.sellsOnAmazon && !a.fulfilmentChannel) ctx.addIssue({ code: 'custom', path: ['fulfilmentChannel'], message: 'Fulfilment channel is required when selling on Amazon' });
  if (!a.sellsOnAmazon && (a.fulfilmentChannel || a.listingStatus || a.dgReviewStatus || a.complianceDocsAvailable || a.fnsku || a.asin || a.instructions)) ctx.addIssue({ code: 'custom', path: ['fulfilmentChannel'], message: 'Amazon details must be empty when sellsOnAmazon is false' });
});
const productFields = {
  productName: requiredText(160, 'Product name'), brandName: text(120, 'Brand name'),
  sku: z.string({ required_error: 'SKU is required' }).trim().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/, 'SKU may contain only letters, numbers, hyphens, underscores and full stops'),
  fnsku: emptyAsUndefined(z.string().trim().regex(/^[a-zA-Z0-9]{10}$/, 'FNSKU must be 10 alphanumeric characters').optional()),
  asin: emptyAsUndefined(z.string().trim().regex(/^[a-zA-Z0-9]{10}$/, 'ASIN must be 10 alphanumeric characters').optional()),
  barcode: z.string({ required_error: 'Barcode is required' }).trim().regex(/^\d{8,14}$/, 'Barcode must contain 8 to 14 digits'),
  category: enumSchema(INTAKE_CATEGORIES, 'product category'),
  countryOfOrigin: emptyAsUndefined(z.string().trim().transform((v) => v.toUpperCase()).refine((v) => ISO_COUNTRIES.includes(v), 'Country of origin must be an ISO 3166-1 alpha-2 code').optional()),
  storage: uniqueArray(enumSchema(STORAGE_REQUIREMENTS, 'storage requirement'), 'storage requirement'), hazmat: hazmatSchema, handling: handlingSchema.optional(), amazon: amazonSchema.optional()
};
const uniformProductSchema = z.object({ ...productFields, packingMode: z.literal(PACKING_MODES[0]), uniform: uniformSchema, boxes: z.never().optional() });
const individualProductSchema = z.object({ ...productFields, packingMode: z.literal(PACKING_MODES[1]), uniform: z.never().optional(), boxes: z.array(boxSchema).min(1).max(500) });
const productSchema = z.discriminatedUnion('packingMode', [uniformProductSchema, individualProductSchema]).superRefine((p, ctx) => {
  if (p.hazmat.hazardTypes.includes('lithium-battery') && !p.handling?.containsBatteries) ctx.addIssue({ code: 'custom', path: ['handling', 'containsBatteries'], message: 'Must be true for lithium-battery products' });
});
const consentSchema = z.boolean({ required_error: 'Consent is required', invalid_type_error: 'Consent must be true' }).refine(Boolean, 'Consent is required');

export const intakeSchema = z.object({
  customer: z.object({ contactPerson: requiredText(120, 'Contact person'), businessName: requiredText(160, 'Business name'), phone: phoneSchema, email: emailSchema }),
  services: uniqueArray(enumSchema(INTAKE_SERVICES, 'service'), 'service'),
  products: z.array(productSchema).min(1).max(100), additionalInstructions: instructions('Additional instructions'), consent: consentSchema, website: z.string().trim().max(500).default('')
}).superRefine((data, ctx) => {
  const seen = new Set(); let cartons = 0;
  data.products.forEach((p, i) => { const sku = p.sku.toLowerCase(); if (seen.has(sku)) ctx.addIssue({ code: 'custom', path: ['products', i, 'sku'], message: 'SKU must be unique within the submission' }); seen.add(sku); cartons += p.packingMode === 'uniform' ? p.uniform.cartons : p.boxes.length; });
  if (cartons > 100000) ctx.addIssue({ code: 'custom', path: ['products'], message: 'Total cartons must be 100000 or fewer' });
});
