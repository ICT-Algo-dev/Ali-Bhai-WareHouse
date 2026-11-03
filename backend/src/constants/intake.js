export const INTAKE_CATEGORIES = ['general-merchandise', 'electronics-gadgets', 'beauty-personal-care', 'cosmetics-skincare', 'perfumes-fragrances', 'health-personal-care', 'food-beverages', 'clothing-apparel', 'shoes-accessories', 'home-kitchen', 'toys-games', 'automotive-products', 'supplements', 'cleaning-products', 'industrial-products', 'other'];
export const PACKING_MODES = ['uniform', 'individual'];
export const INTAKE_STATUSES = ['submitted', 'under-review', 'received', 'closed'];
export const INTAKE_EMAIL_STATUSES = ['pending', 'sent', 'failed'];
export const INTAKE_FILE_KINDS = ['barcode-pdf', 'fnsku-labels-pdf', 'carton-labels-pdf', 'product-labels-pdf', 'sds', 'un383-test-summary', 'dangerous-goods-declaration', 'product-photo', 'packing-list', 'commercial-invoice', 'other'];
export const PRODUCT_FILE_KINDS = ['barcode-pdf', 'fnsku-labels-pdf', 'carton-labels-pdf', 'product-labels-pdf', 'sds', 'un383-test-summary', 'dangerous-goods-declaration', 'product-photo'];
export const SUBMISSION_FILE_KINDS = ['packing-list', 'commercial-invoice', 'other'];
export const PDF_ONLY_FILE_KINDS = ['barcode-pdf', 'fnsku-labels-pdf', 'carton-labels-pdf', 'product-labels-pdf'];
export const DOCUMENTS_STATUSES = ['complete', 'incomplete'];
export const SCAN_STATUSES = ['not-scanned', 'clean', 'rejected'];
export const UPLOADED_VIA = ['customer', 'admin'];
export const UPLOAD_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const STORAGE_PROVIDERS = ['local'];
export const INTAKE_SERVICES = ['inventory-receiving', 'product-inspection', 'fnsku-labelling', 'barcode-labelling', 'poly-bagging', 'bubble-wrapping', 'bundling-kitting', 'carton-repacking', 'palletising', 'amazon-fba-prep', 'amazon-fbm-fulfilment', 'shopify-order-fulfilment', 'storage-only', 'returns-processing', 'international-shipping'];
export const STORAGE_REQUIREMENTS = ['standard', 'temperature-controlled', 'climate-controlled', 'refrigerated', 'frozen', 'flammable-goods', 'hazmat-compliant', 'fragile', 'high-value-secure'];
export const DECLARED_HAZMAT_STATUSES = ['non-hazmat', 'hazmat-dangerous-goods', 'limited-quantity', 'excepted-quantity', 'not-sure'];
export const HAZARD_TYPES = ['lithium-battery', 'flammable-liquid', 'flammable-solid', 'corrosive', 'aerosol-pressurised', 'oxidising', 'toxic-harmful', 'environmentally-hazardous'];
export const SDS_STATUSES = ['available', 'not-available', 'not-required', 'not-sure'];
export const HAZARD_CLASSES = ['1', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '7', '8', '9'];
export const PACKING_GROUPS = ['I', 'II', 'III', 'not-applicable', 'unknown'];
export const BATTERY_TYPES = ['lithium-ion', 'lithium-metal', 'other', 'unknown'];
export const BATTERY_CONFIGURATIONS = ['standalone', 'packed-with-equipment', 'contained-in-equipment'];
export const BATTERY_UN383_STATUSES = ['available', 'not-available', 'not-sure'];
export const PHYSICAL_STATES = ['liquid', 'solid', 'powder', 'gas'];
export const LEAKAGE_DAMAGE_RISKS = ['yes', 'no', 'not-sure'];
export const AMAZON_FULFILMENT_CHANNELS = ['fba', 'fbm', 'both', 'not-sure'];
export const AMAZON_LISTING_STATUSES = ['active', 'restricted', 'not-listed-yet', 'not-sure'];
export const AMAZON_DG_REVIEW_STATUSES = ['not-applicable', 'pending', 'approved', 'rejected', 'not-sure'];
export const AMAZON_COMPLIANCE_DOCS_STATUSES = ['yes', 'no', 'not-sure'];
export const WAREHOUSE_STATUSES = ['not-reviewed', 'under-review', 'verified', 'rejected'];
export const VERIFICATION_SDS_STATUSES = ['pending', 'verified', 'rejected', 'not-required'];
export const FINAL_CLASSIFICATIONS = ['', ...DECLARED_HAZMAT_STATUSES];

const title = (value) => value.split('-').map((word) => word.toUpperCase() === 'FBA' || word.toUpperCase() === 'FBM' ? word.toUpperCase() : `${word[0]?.toUpperCase() || ''}${word.slice(1)}`).join(' ');
const labelsFor = (values, overrides = {}) => Object.freeze(Object.fromEntries(values.map((value) => [value, overrides[value] || title(value)])));

export const INTAKE_CATEGORY_LABELS = labelsFor(INTAKE_CATEGORIES, {
  'general-merchandise': 'General merchandise', 'electronics-gadgets': 'Electronics and gadgets', 'beauty-personal-care': 'Beauty and personal care',
  'cosmetics-skincare': 'Cosmetics and skincare', 'perfumes-fragrances': 'Perfumes and fragrances', 'health-personal-care': 'Health and personal care',
  'food-beverages': 'Food and beverages', 'clothing-apparel': 'Clothing and apparel', 'shoes-accessories': 'Shoes and accessories',
  'home-kitchen': 'Home and kitchen', 'toys-games': 'Toys and games', 'automotive-products': 'Automotive products',
  supplements: 'Supplements', 'cleaning-products': 'Cleaning products', 'industrial-products': 'Industrial products', other: 'Other'
});
export const INTAKE_SERVICE_LABELS = labelsFor(INTAKE_SERVICES, {
  'fnsku-labelling': 'FNSKU labelling', 'barcode-labelling': 'Barcode labelling', 'poly-bagging': 'Poly bagging', 'bubble-wrapping': 'Bubble wrapping',
  'bundling-kitting': 'Bundling and kitting', 'carton-repacking': 'Carton repacking', palletising: 'Palletising', 'amazon-fba-prep': 'Amazon FBA preparation',
  'amazon-fbm-fulfilment': 'Amazon FBM fulfilment', 'shopify-order-fulfilment': 'Shopify order fulfilment', 'storage-only': 'Storage only',
  'returns-processing': 'Returns processing'
});
export const STORAGE_LABELS = labelsFor(STORAGE_REQUIREMENTS, { 'high-value-secure': 'High-value secure storage' });
export const DECLARED_HAZMAT_STATUS_LABELS = labelsFor(DECLARED_HAZMAT_STATUSES);
export const HAZARD_TYPE_LABELS = labelsFor(HAZARD_TYPES, { 'aerosol-pressurised': 'Pressurised aerosol', 'toxic-harmful': 'Toxic or harmful' });
export const SDS_STATUS_LABELS = labelsFor(SDS_STATUSES);
export const HAZARD_CLASS_LABELS = labelsFor(HAZARD_CLASSES, Object.fromEntries(HAZARD_CLASSES.map((value) => [value, `Class ${value}`])));
export const PACKING_GROUP_LABELS = labelsFor(PACKING_GROUPS, Object.fromEntries(PACKING_GROUPS.slice(0, 3).map((value) => [value, `Packing group ${value}`])));
export const BATTERY_TYPE_LABELS = labelsFor(BATTERY_TYPES);
export const BATTERY_CONFIGURATION_LABELS = labelsFor(BATTERY_CONFIGURATIONS);
export const BATTERY_UN383_STATUS_LABELS = labelsFor(BATTERY_UN383_STATUSES);
export const PHYSICAL_STATE_LABELS = labelsFor(PHYSICAL_STATES);
export const LEAKAGE_DAMAGE_RISK_LABELS = labelsFor(LEAKAGE_DAMAGE_RISKS);
export const AMAZON_FULFILMENT_CHANNEL_LABELS = labelsFor(AMAZON_FULFILMENT_CHANNELS);
export const AMAZON_LISTING_STATUS_LABELS = labelsFor(AMAZON_LISTING_STATUSES);
export const AMAZON_DG_REVIEW_STATUS_LABELS = labelsFor(AMAZON_DG_REVIEW_STATUSES);
export const AMAZON_COMPLIANCE_DOCS_LABELS = labelsFor(AMAZON_COMPLIANCE_DOCS_STATUSES);
