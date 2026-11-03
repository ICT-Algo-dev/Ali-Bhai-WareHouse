import { describe, expect, it } from 'vitest'
import { INTAKE_ENUMS } from '../lib/constants'
import { buildIntakePayload, intakeSchema } from '../lib/intakeSchemas'

const sampleProduct = {
  productName: 'Test Cotton T-Shirt',
  brandName: 'TestBrand',
  sku: 'TSH-001',
  fnsku: '',
  asin: '',
  barcode: '5012345678900',
  category: 'clothing-apparel',
  countryOfOrigin: '',
  packingMode: 'uniform',
  uniform: {
    cartons: 10,
    unitsPerCarton: 24,
    cartonWeightKg: 12,
    cartonLengthCm: 40,
    cartonWidthCm: 30,
    cartonHeightCm: 25,
  },
  boxes: [],
  hazmat: {
    declaredStatus: 'non-hazmat',
    hazardTypes: [],
    sdsStatus: 'not-required',
    unNumber: '',
    hazardClass: '',
    packingGroup: '',
    properShippingName: '',
    batteryType: '',
    batteryConfiguration: '',
    wattHours: undefined,
    un38TestSummaryStatus: '',
  },
  storage: ['standard'],
  handling: {
    physicalState: 'solid',
    containsBatteries: false,
    leakageOrDamageRisk: 'no',
    isExpiryDated: false,
    expiryDate: '',
    specialHandlingInstructions: '',
    specialStorageInstructions: '',
  },
  amazon: {
    sellsOnAmazon: false,
    fulfilmentChannel: '',
    listingStatus: '',
    dangerousGoodsReviewStatus: '',
    complianceDocumentsAvailable: '',
  },
}

const sampleIntake = {
  customer: {
    contactPerson: 'Test User',
    businessName: 'Test Brand Ltd',
    phone: '07700900123',
    email: 'test@example.co.uk',
  },
  products: [sampleProduct],
  services: ['inventory-receiving', 'product-inspection'],
  additionalInstructions: '',
  consent: true,
}

describe('inventory intake schema and payload', () => {
  it('uses the exact API storage requirement slugs', () => {
    expect(Object.keys(INTAKE_ENUMS.storage)).toEqual([
      'standard',
      'temperature-controlled',
      'climate-controlled',
      'refrigerated',
      'frozen',
      'flammable-goods',
      'hazmat-compliant',
      'fragile',
      'high-value-secure',
    ])
    expect(INTAKE_ENUMS.storage['high-value-secure']).toBe('High-value secure storage')
  })

  it('accepts the current nested API contract sample', () => {
    expect(intakeSchema.safeParse(sampleIntake).success).toBe(true)
  })

  it('builds the exact payload keys and normalises the UK phone number', () => {
    const payload = buildIntakePayload(sampleIntake, '')

    expect(Object.keys(payload)).toEqual(['customer', 'products', 'services', 'additionalInstructions', 'consent', 'website'])
    expect(payload.customer.phone).toBe('+447700900123')
    expect(payload.products[0].uniform).toEqual(sampleProduct.uniform)
    expect(payload.products[0]).not.toHaveProperty('boxes')
    expect(payload.website).toBe('')
  })

  it('rejects duplicate SKUs case-insensitively', () => {
    const result = intakeSchema.safeParse({
      ...sampleIntake,
      products: [sampleProduct, { ...sampleProduct, sku: 'tSh-001' }],
    })

    expect(result.success).toBe(false)
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'products.1.sku')).toBe(true)
  })

  it('rejects an invalid barcode', () => {
    const result = intakeSchema.safeParse({
      ...sampleIntake,
      products: [{ ...sampleProduct, barcode: '12345' }],
    })

    expect(result.success).toBe(false)
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'products.0.barcode')).toBe(true)
  })

  it('rejects UN details on a non-hazmat product', () => {
    const result = intakeSchema.safeParse({
      ...sampleIntake,
      products: [{
        ...sampleProduct,
        hazmat: { ...sampleProduct.hazmat, unNumber: 'UN1234' },
      }],
    })

    expect(result.success).toBe(false)
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'products.0.hazmat.unNumber')).toBe(true)
  })
})
