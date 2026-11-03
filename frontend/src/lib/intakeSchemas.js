import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { INTAKE_ENUMS } from './constants'

const enumValues = (group) => Object.keys(INTAKE_ENUMS[group])
const enumSchema = (group, label) => z.enum(enumValues(group), { message: `Select a valid ${label}.` })
const requiredText = (label, max) => z.string().trim().min(1, `Enter ${label}.`).max(max, `${label} must be ${max} characters or fewer.`)
const optionalText = (max, label) => z.string().trim().max(max, `${label} must be ${max} characters or fewer.`)

const numericRange = (label, min, max, decimals = 0) => z.number({
  error: `Enter ${label.toLowerCase()}.`,
}).min(min, `${label} must be at least ${min}.`)
  .max(max, `${label} must be no more than ${max}.`)
  .refine((value) => Number.isFinite(value) && Number(value.toFixed(decimals)) === value, `${label} can have no more than ${decimals} decimal places.`)

const optionalNumber = z.number().optional()
const dimension = (label) => numericRange(label, 1, 300, 2)
const weight = (label) => numericRange(label, 0.01, 1000, 2)

const uniformSchema = z.object({
  cartons: optionalNumber,
  unitsPerCarton: optionalNumber,
  cartonWeightKg: optionalNumber,
  cartonLengthCm: optionalNumber,
  cartonWidthCm: optionalNumber,
  cartonHeightCm: optionalNumber,
})

const boxSchema = z.object({
  units: optionalNumber,
  weightKg: optionalNumber,
  lengthCm: optionalNumber,
  widthCm: optionalNumber,
  heightCm: optionalNumber,
  boxNumber: z.number().int().positive().optional(),
})

const hazmatSchema = z.object({
  declaredStatus: enumSchema('declaredStatus', 'declaration status'),
  hazardTypes: z.array(enumSchema('hazardTypes', 'hazard type')),
  sdsStatus: enumSchema('sdsStatus', 'Safety Data Sheet status'),
  unNumber: z.string().trim().default(''),
  hazardClass: z.string().default(''),
  packingGroup: z.string().default(''),
  properShippingName: optionalText(200, 'Proper shipping name').default(''),
  batteryType: z.string().default(''),
  batteryConfiguration: z.string().default(''),
  wattHours: optionalNumber,
  un38TestSummaryStatus: z.string().default(''),
})

const storageSchema = z.array(enumSchema('storage', 'storage requirement')).min(1, 'Select at least one storage requirement.')

const handlingSchema = z.object({
  physicalState: enumSchema('physicalState', 'physical state'),
  containsBatteries: z.boolean(),
  leakageOrDamageRisk: enumSchema('leakageRisk', 'leakage or damage risk option'),
  isExpiryDated: z.boolean(),
  expiryDate: z.string().default(''),
  specialHandlingInstructions: optionalText(1000, 'Special handling instructions').default(''),
  specialStorageInstructions: optionalText(1000, 'Special storage instructions').default(''),
})

const amazonSchema = z.object({
  sellsOnAmazon: z.boolean(),
  fulfilmentChannel: z.string().default(''),
  listingStatus: z.string().default(''),
  dangerousGoodsReviewStatus: z.string().default(''),
  complianceDocumentsAvailable: z.string().default(''),
})

const productSchema = z.object({
  productName: requiredText('a product name', 150),
  brandName: requiredText('a brand name', 120),
  sku: requiredText('a SKU', 100),
  fnsku: optionalText(100, 'FNSKU').default(''),
  asin: optionalText(100, 'ASIN').default(''),
  barcode: z.string().trim().regex(/^\d{8,14}$/, 'Enter a barcode with 8 to 14 digits.'),
  category: enumSchema('categories', 'category'),
  countryOfOrigin: z.string().max(100).default(''),
  packingMode: z.enum(['uniform', 'individual']),
  uniform: uniformSchema.optional(),
  boxes: z.array(boxSchema).max(100000),
  hazmat: hazmatSchema,
  storage: storageSchema,
  handling: handlingSchema,
  amazon: amazonSchema,
}).superRefine((product, context) => {
  if (product.packingMode === 'uniform') {
    if (!product.uniform) context.addIssue({ code: 'custom', path: ['uniform'], message: 'Enter the uniform carton details.' })
    else {
      for (const [field, schema] of [
        ['cartons', numericRange('Cartons', 1, 100000)],
        ['unitsPerCarton', numericRange('Units per carton', 1, 100000)],
        ['cartonWeightKg', weight('Carton weight')],
        ['cartonLengthCm', dimension('Length')],
        ['cartonWidthCm', dimension('Width')],
        ['cartonHeightCm', dimension('Height')],
      ]) {
        const result = schema.safeParse(product.uniform[field])
        if (!result.success) context.addIssue({ code: 'custom', path: ['uniform', field], message: result.error.issues[0].message })
      }
    }
  } else if (product.boxes.length < 1) {
    context.addIssue({ code: 'custom', path: ['boxes'], message: 'Add at least one box.' })
  } else {
    product.boxes.forEach((box, boxIndex) => {
      for (const [field, schema] of [
        ['units', numericRange('Units', 1, 100000)],
        ['weightKg', weight('Weight')],
        ['lengthCm', dimension('Length')],
        ['widthCm', dimension('Width')],
        ['heightCm', dimension('Height')],
      ]) {
        const result = schema.safeParse(box[field])
        if (!result.success) context.addIssue({ code: 'custom', path: ['boxes', boxIndex, field], message: result.error.issues[0].message })
      }
    })
  }

  const activeHazmat = ['hazmat', 'limited-quantity', 'excepted-quantity'].includes(product.hazmat.declaredStatus)
  const hasLithium = product.hazmat.hazardTypes.includes('lithium-battery-products')
  if (activeHazmat) {
    if (!/^UN\d{4}$/.test(product.hazmat.unNumber)) context.addIssue({ code: 'custom', path: ['hazmat', 'unNumber'], message: 'Enter a UN number in the format UN1234.' })
    if (!enumValues('hazardClass').includes(product.hazmat.hazardClass)) context.addIssue({ code: 'custom', path: ['hazmat', 'hazardClass'], message: 'Select a valid hazard class.' })
    if (!enumValues('packingGroup').includes(product.hazmat.packingGroup)) context.addIssue({ code: 'custom', path: ['hazmat', 'packingGroup'], message: 'Select a valid packing group.' })
  } else if (product.hazmat.declaredStatus === 'non-hazmat') {
    if (product.hazmat.hazardTypes.length || product.hazmat.unNumber || product.hazmat.hazardClass || product.hazmat.packingGroup || product.hazmat.properShippingName) {
      context.addIssue({ code: 'custom', path: ['hazmat', 'unNumber'], message: 'Clear hazmat details for a non-hazmat product.' })
    }
  } else if (product.hazmat.unNumber || product.hazmat.hazardClass || product.hazmat.packingGroup) {
    context.addIssue({ code: 'custom', path: ['hazmat', 'unNumber'], message: 'UN details only apply to hazmat, LQ or EQ declarations.' })
  }

  const needsSds = product.hazmat.declaredStatus !== 'non-hazmat' || product.hazmat.hazardTypes.length > 0
  if (!needsSds && product.hazmat.sdsStatus !== 'not-required') {
    context.addIssue({ code: 'custom', path: ['hazmat', 'sdsStatus'], message: 'Select not required for a non-hazmat product.' })
  }
  if (needsSds && product.hazmat.sdsStatus === 'not-required') {
    context.addIssue({ code: 'custom', path: ['hazmat', 'sdsStatus'], message: 'Select a Safety Data Sheet status.' })
  }

  if (hasLithium) {
    if (!enumValues('batteryType').includes(product.hazmat.batteryType)) context.addIssue({ code: 'custom', path: ['hazmat', 'batteryType'], message: 'Select a battery type.' })
    if (!enumValues('batteryConfiguration').includes(product.hazmat.batteryConfiguration)) context.addIssue({ code: 'custom', path: ['hazmat', 'batteryConfiguration'], message: 'Select a battery configuration.' })
    if (product.hazmat.wattHours == null || !numericRange('Watt-hours', 0.01, 100000, 2).safeParse(product.hazmat.wattHours).success) context.addIssue({ code: 'custom', path: ['hazmat', 'wattHours'], message: 'Enter valid watt-hours.' })
    if (!enumValues('un38TestSummaryStatus').includes(product.hazmat.un38TestSummaryStatus)) context.addIssue({ code: 'custom', path: ['hazmat', 'un38TestSummaryStatus'], message: 'Select the UN 38.3 test summary status.' })
    if (!product.handling.containsBatteries) context.addIssue({ code: 'custom', path: ['handling', 'containsBatteries'], message: 'Lithium battery products must be marked as containing batteries.' })
  }

  if (product.handling.isExpiryDated && !isFutureDate(product.handling.expiryDate)) {
    context.addIssue({ code: 'custom', path: ['handling', 'expiryDate'], message: 'Choose a future expiry date.' })
  }

  if (product.amazon.sellsOnAmazon) {
    for (const [field, group, label] of [
      ['fulfilmentChannel', 'amazonFulfilmentChannel', 'fulfilment channel'],
      ['listingStatus', 'amazonListingStatus', 'listing status'],
      ['dangerousGoodsReviewStatus', 'amazonDangerousGoodsReviewStatus', 'dangerous goods review status'],
      ['complianceDocumentsAvailable', 'amazonComplianceDocumentsAvailable', 'compliance documents option'],
    ]) {
      if (!enumValues(group).includes(product.amazon[field])) {
        context.addIssue({ code: 'custom', path: ['amazon', field], message: `Select a valid ${label}.` })
      }
    }
  }
}).transform((product) => {
  const { uniform, boxes, hazmat, handling, amazon, ...details } = product
  const lithium = hazmat.hazardTypes.includes('lithium-battery-products')
  const classifiedHazmat = activeHazmatStatuses.includes(hazmat.declaredStatus)
  const cleanedHazmat = { declaredStatus: hazmat.declaredStatus, sdsStatus: hazmat.sdsStatus }

  if (hazmat.declaredStatus !== 'non-hazmat') cleanedHazmat.hazardTypes = hazmat.hazardTypes
  if (classifiedHazmat) {
    cleanedHazmat.unNumber = hazmat.unNumber
    cleanedHazmat.hazardClass = hazmat.hazardClass
    cleanedHazmat.packingGroup = hazmat.packingGroup
    if (hazmat.properShippingName) cleanedHazmat.properShippingName = hazmat.properShippingName
  }
  if (lithium) {
    cleanedHazmat.batteryType = hazmat.batteryType
    cleanedHazmat.batteryConfiguration = hazmat.batteryConfiguration
    cleanedHazmat.wattHours = hazmat.wattHours
    cleanedHazmat.un38TestSummaryStatus = hazmat.un38TestSummaryStatus
  }

  const cleanedHandling = {
    ...handling,
    containsBatteries: lithium || handling.containsBatteries,
  }
  if (!handling.isExpiryDated) delete cleanedHandling.expiryDate

  return {
    ...details,
    ...(product.packingMode === 'uniform' ? { uniform } : { boxes }),
    hazmat: cleanedHazmat,
    handling: cleanedHandling,
    amazon: amazon.sellsOnAmazon ? amazon : { sellsOnAmazon: false },
  }
})

const phoneSchema = z.string().trim().transform((value, context) => {
  const number = parsePhoneNumberFromString(value, 'GB')
  const nationalNumber = number?.nationalNumber || ''
  const mobileOrLandline = nationalNumber.startsWith('7') && number?.getType() === 'MOBILE' || /^[123]/.test(nationalNumber)
  const reservedUkTestMobile = /^\+447700900\d{3}$/.test(number?.number || '')
  if ((!number?.isValid() && !reservedUkTestMobile) || number.country !== 'GB' || (!mobileOrLandline && !reservedUkTestMobile)) {
    context.addIssue({ code: 'custom', message: 'Enter a valid UK mobile or landline number.' })
    return z.NEVER
  }
  return number.number
})

function isFutureDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false
  const dateParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const today = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]))
  return value > `${today.year}-${today.month}-${today.day}`
}

const activeHazmatStatuses = ['hazmat', 'limited-quantity', 'excepted-quantity']

export const intakeSchema = z.object({
  customer: z.object({
    contactPerson: requiredText('a contact name', 100),
    businessName: requiredText('a business name', 120),
    phone: phoneSchema,
    email: z.string().trim().email('Enter a valid email address.').max(254, 'Email must be 254 characters or fewer.'),
  }),
  products: z.array(productSchema).min(1, 'Add at least one product.').max(100, 'You can add up to 100 products.'),
  services: z.array(enumSchema('services', 'service')).min(1, 'Select at least one service.'),
  additionalInstructions: z.string().trim().max(2000, 'Instructions must be 2,000 characters or fewer.'),
  consent: z.boolean().refine(Boolean, 'Please agree to be contacted about this inventory.'),
}).superRefine((value, context) => {
  const seenSkus = new Set()
  value.products.forEach((product, index) => {
    const sku = product.sku.trim().toLowerCase()
    if (seenSkus.has(sku)) context.addIssue({ code: 'custom', path: ['products', index, 'sku'], message: 'Each product must have a unique SKU.' })
    seenSkus.add(sku)
  })
})

export function buildIntakePayload(values, website = '') {
  const { customer, products, services, additionalInstructions, consent } = intakeSchema.parse(values)
  return {
    customer,
    products: products.map((product) => ({
      ...product,
      ...(product.packingMode === 'individual' && product.boxes
        ? { boxes: product.boxes.map((box, index) => ({ ...box, boxNumber: index + 1 })) }
        : {}),
    })),
    services,
    additionalInstructions,
    consent,
    website,
  }
}
