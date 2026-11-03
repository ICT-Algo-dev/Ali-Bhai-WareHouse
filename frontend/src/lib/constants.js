export const BUSINESS_INFO = {
  // PLACEHOLDERS: replace with approved business contact details before launch.
  phone: '+44 20 XXXX XXXX',
  phoneLink: '+4420XXXXXXXX',
  email: 'hello@yourdomain.co.uk',
  openingHours: 'Mon to Fri, 8:00 am to 6:00 pm (UK time)',
}

export const ADDRESS = {
  line1: '36 Roxby Street',
  city: 'Bradford',
  postcode: 'BD5 7NU',
  country: 'United Kingdom',
  countryCode: 'GB',
}

export const ADDRESS_MULTILINE = [
  ADDRESS.line1,
  ADDRESS.city,
  ADDRESS.postcode,
  ADDRESS.country,
].join('\n')

export const ADDRESS_ONE_LINE = `${ADDRESS.line1}, ${ADDRESS.city}, ${ADDRESS.postcode}, ${ADDRESS.country}`

export const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS_ONE_LINE)}&output=embed`
export const MAP_SEARCH_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS_ONE_LINE)}`

export const SERVICE_OPTIONS = [
  { value: 'inventory-receiving', label: 'Inventory receiving' },
  { value: 'warehousing-storage', label: 'Warehousing & storage' },
  { value: 'inventory-management', label: 'Inventory management' },
  { value: 'order-fulfillment', label: 'Order fulfilment' },
  { value: 'packaging-labeling', label: 'Packaging & labelling' },
  { value: 'courier-dispatch', label: 'Courier dispatch with UK carriers' },
  { value: 'returns-handling', label: 'Returns handling' },
]

export const INTAKE_ENUMS = {
  categories: {
    'general-merchandise': 'General merchandise',
    'electronics-gadgets': 'Electronics & gadgets',
    'beauty-personal-care': 'Beauty & personal care',
    'cosmetics-skincare': 'Cosmetics & skincare',
    'perfumes-fragrances': 'Perfumes & fragrances',
    'health-personal-care': 'Health & personal care',
    'food-beverages': 'Food & beverages',
    'clothing-apparel': 'Clothing & apparel',
    'shoes-accessories': 'Shoes & accessories',
    'home-kitchen': 'Home & kitchen',
    'toys-games': 'Toys & games',
    'automotive-products': 'Automotive products',
    supplements: 'Supplements',
    'cleaning-products': 'Cleaning products',
    'industrial-products': 'Industrial products',
    other: 'Other',
  },
  services: {
    'inventory-receiving': 'Inventory receiving',
    'product-inspection': 'Product inspection',
    'fnsku-labelling': 'FNSKU labelling',
    'barcode-labelling': 'Barcode labelling',
    'poly-bagging': 'Poly bagging',
    'bubble-wrapping': 'Bubble wrapping',
    'bundling-kitting': 'Bundling and kitting',
    'carton-repacking': 'Carton repacking',
    palletising: 'Palletising',
    'amazon-fba-prep': 'Amazon FBA preparation',
    'amazon-fbm-fulfilment': 'Amazon FBM fulfilment',
    'shopify-order-fulfilment': 'Shopify order fulfilment',
    'storage-only': 'Storage only',
    'returns-processing': 'Returns processing',
    'international-shipping': 'International shipping',
  },
  declaredStatus: {
    'non-hazmat': 'Non-Hazmat (regular product)',
    hazmat: 'Hazmat / dangerous goods',
    'limited-quantity': 'Limited Quantity (LQ)',
    'excepted-quantity': 'Excepted Quantity (EQ)',
    'not-sure': 'Not sure / need classification help',
  },
  hazardTypes: {
    'lithium-battery-products': 'Lithium battery products',
    'flammable-liquids': 'Flammable liquids',
    'flammable-solids': 'Flammable solids',
    'corrosive-materials': 'Corrosive materials',
    'aerosols-pressurised-products': 'Aerosols / pressurised products',
    'oxidising-substances': 'Oxidising substances',
    'toxic-harmful-substances': 'Toxic / harmful substances',
    'environmentally-hazardous-materials': 'Environmentally hazardous materials',
  },
  sdsStatus: {
    available: 'Yes, SDS available',
    unavailable: 'Yes, SDS not available',
    no: 'No',
    'not-sure': 'Not sure',
    'not-required': 'Not required',
  },
  hazardClass: {
    'class-1': 'Class 1 — Explosives',
    'class-2': 'Class 2 — Gases',
    'class-3': 'Class 3 — Flammable liquids',
    'class-4.1': 'Class 4.1 — Flammable solids',
    'class-4.2': 'Class 4.2 — Spontaneously combustible',
    'class-4.3': 'Class 4.3 — Dangerous when wet',
    'class-5.1': 'Class 5.1 — Oxidising substances',
    'class-5.2': 'Class 5.2 — Organic peroxides',
    'class-6.1': 'Class 6.1 — Toxic substances',
    'class-6.2': 'Class 6.2 — Infectious substances',
    'class-7': 'Class 7 — Radioactive material',
    'class-8': 'Class 8 — Corrosive substances',
    'class-9': 'Class 9 — Miscellaneous dangerous goods',
  },
  packingGroup: {
    'packing-group-i': 'Packing Group I — High danger',
    'packing-group-ii': 'Packing Group II — Medium danger',
    'packing-group-iii': 'Packing Group III — Low danger',
    'not-applicable': 'Not applicable',
    'not-sure': 'Not sure',
  },
  storage: {
    standard: 'Standard',
    'temperature-controlled': 'Temperature-controlled',
    'climate-controlled': 'Climate-controlled',
    refrigerated: 'Refrigerated',
    frozen: 'Frozen',
    'flammable-goods': 'Flammable goods',
    'hazmat-compliant': 'Hazmat-compliant',
    fragile: 'Fragile item handling',
    'high-value-secure': 'High-value secure storage',
  },
  physicalState: { liquid: 'Liquid', solid: 'Solid', powder: 'Powder', gas: 'Gas' },
  yesNo: { yes: 'Yes', no: 'No' },
  leakageRisk: { yes: 'Yes', no: 'No', 'not-sure': 'Not sure' },
  batteryType: {
    'lithium-ion': 'Lithium-ion',
    'lithium-metal': 'Lithium-metal',
    'other-battery': 'Other battery type',
    'not-sure': 'Not sure',
  },
  batteryConfiguration: {
    'contained-in-equipment': 'Contained in equipment',
    'packed-with-equipment': 'Packed with equipment',
    'batteries-only': 'Batteries only',
    'button-cell': 'Button cell',
    'not-sure': 'Not sure',
  },
  un38TestSummaryStatus: { available: 'Available', unavailable: 'Not available', 'not-sure': 'Not sure' },
  amazonFulfilmentChannel: { fba: 'FBA', fbm: 'FBM', both: 'Both', 'not-sure': 'Not sure' },
  amazonListingStatus: { active: 'Active', restricted: 'Restricted', 'not-listed': 'Not listed yet', 'not-sure': 'Not sure' },
  amazonDangerousGoodsReviewStatus: {
    'not-applicable': 'Not applicable',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    'not-sure': 'Not sure',
  },
  amazonComplianceDocumentsAvailable: { yes: 'Yes', no: 'No', 'not-sure': 'Not sure' },
  packingMode: { uniform: 'Same quantity in every carton', individual: 'Different cartons' },
}

export const INTAKE_SERVICES = Object.entries(INTAKE_ENUMS.services)
  .map(([value, label]) => ({ value, label }))

export const ADMIN_LABELS = {
  requiredServices: {
    'inventory-receiving': 'Inventory receiving',
    'warehousing-storage': 'Warehousing & storage',
    'inventory-management': 'Inventory management',
    'order-fulfillment': 'Order fulfilment',
    'packaging-labeling': 'Packaging & labelling',
    'courier-dispatch': 'Courier dispatch',
    'returns-handling': 'Returns handling',
  },
  estimatedInventoryVolume: {
    'under-5-pallets': 'Under 5 pallets',
    '5-20-pallets': '5–20 pallets',
    '21-50-pallets': '21–50 pallets',
    'over-50-pallets': 'Over 50 pallets',
    'not-sure': 'Not sure yet',
  },
  monthlyOrderVolume: {
    'under-100': 'Under 100 orders',
    '100-500': '100–500 orders',
    '501-2000': '501–2,000 orders',
    '2000-plus': 'More than 2,000 orders',
    'not-sure': 'Not sure yet',
  },
  estimatedMonthlyOrders: {
    'under-100': 'Under 100 orders',
    '100-500': '100–500 orders',
    '501-2000': '501–2,000 orders',
    '2000-plus': 'More than 2,000 orders',
    'not-sure': 'Not sure yet',
  },
  businessType: {
    'online-retail': 'Online retail',
    'e-commerce': 'E-commerce',
    ecommerce: 'E-commerce',
    retailer: 'Retailer',
    retail: 'Retail',
    'marketplace-seller': 'Marketplace seller',
    manufacturer: 'Manufacturer',
    wholesaler: 'Wholesaler',
    'subscription-box': 'Subscription box',
    'direct-to-consumer': 'Direct to consumer',
    other: 'Other',
  },
  type: {
    contact: 'Contact enquiry',
    quote: 'Quote request',
  },
  status: {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    closed: 'Closed',
  },
  intakeCategory: INTAKE_ENUMS.categories,
  intakeStatus: {
    submitted: 'Submitted',
    'under-review': 'Under review',
    received: 'Received',
    closed: 'Closed',
  },
  packingMode: INTAKE_ENUMS.packingMode,
  intakeDeclaredStatus: INTAKE_ENUMS.declaredStatus,
  intakeHazardType: INTAKE_ENUMS.hazardTypes,
  intakeSdsStatus: INTAKE_ENUMS.sdsStatus,
  intakeHazardClass: INTAKE_ENUMS.hazardClass,
  intakePackingGroup: INTAKE_ENUMS.packingGroup,
  intakeBatteryType: INTAKE_ENUMS.batteryType,
  intakeBatteryConfiguration: INTAKE_ENUMS.batteryConfiguration,
  intakeUn38Status: INTAKE_ENUMS.un38TestSummaryStatus,
  intakeStorage: INTAKE_ENUMS.storage,
  intakePhysicalState: INTAKE_ENUMS.physicalState,
  intakeYesNo: { ...INTAKE_ENUMS.yesNo, 'not-sure': 'Not sure' },
  intakeAmazonChannel: INTAKE_ENUMS.amazonFulfilmentChannel,
  intakeAmazonListing: INTAKE_ENUMS.amazonListingStatus,
  intakeAmazonDgReview: INTAKE_ENUMS.amazonDangerousGoodsReviewStatus,
  intakeService: INTAKE_ENUMS.services,
  intakeVerificationStatus: {
    pending: 'Pending',
    verified: 'Verified',
    'dangerous-goods-rejected': 'Dangerous goods rejected',
  },
  intakeSdsVerification: {
    'not-reviewed': 'Not reviewed',
    verified: 'Verified',
    'not-provided': 'Not provided',
    rejected: 'Rejected',
    'not-required': 'Not required',
  },
  intakeClassificationOutcome: {
    'not-classified': 'Not classified',
    'not-dangerous-goods': 'Not dangerous goods',
    'dangerous-goods': 'Dangerous goods',
    'limited-quantity': 'Limited Quantity (LQ)',
    'excepted-quantity': 'Excepted Quantity (EQ)',
  },
  intakeFileKind: {
    'barcode-pdf': 'Barcode PDF',
    'fnsku-labels-pdf': 'FNSKU labels PDF',
    'carton-labels-pdf': 'Carton / box labels PDF',
    'product-labels-pdf': 'Product labels PDF',
    sds: 'Safety Data Sheet (SDS)',
    'un383-test-summary': 'UN 38.3 test summary',
    'dangerous-goods-declaration': 'Dangerous goods declaration',
    'product-specification-sheet': 'Product specification sheet',
    'product-image': 'Product image',
    'packaging-image': 'Packaging image',
    'other-compliance': 'Other compliance document',
    'commercial-invoice': 'Commercial invoice',
    'other-document': 'Other document',
  },
  intakeFileStatus: {
    pending: 'Pending',
    uploading: 'Uploading',
    uploaded: 'Uploaded',
    failed: 'Failed',
    cancelled: 'Cancelled',
  },
  intakeDocumentsStatus: {
    complete: 'Files complete',
    incomplete: 'Files missing',
  },
}

export const INTAKE_CATEGORIES = Object.entries(ADMIN_LABELS.intakeCategory)
  .map(([value, label]) => ({ value, label }))

export const INTAKE_OPTION_GROUPS = Object.fromEntries(
  Object.entries(ADMIN_LABELS)
    .filter(([group]) => group.startsWith('intake') && !['intakeStatus'].includes(group))
    .map(([group, labels]) => [group, Object.entries(labels).map(([value, label]) => ({ value, label }))]),
)

export const INTAKE_DG_DECLARATION_NOTICE = 'The information you provide is a declaration. The warehouse will verify it and determine the final classification. Incorrect declarations may result in the shipment being refused.'

export const NAV_LINKS = [
  { label: 'Services', to: '/services' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'About', to: '/about' },
  { label: 'Courier partners', to: '/courier-partners' },
  { label: 'Contact', to: '/contact' },
]

export const IMAGE_PLACEHOLDERS = {
  // Replace these illustrative stock-photo URLs with approved local brand photography.
  hero: '/images/hero-warehouse.jpg',
  warehouse: '/images/warehouse-storage.jpg',
  packing: '/images/packing-area.jpg',
}
