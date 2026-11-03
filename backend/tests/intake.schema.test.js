import { describe, test, expect } from '@jest/globals';
import { intakeSchema } from '../src/validators/intake.schema.js';
import { Intake } from '../src/models/Intake.js';
import { readFile } from 'node:fs/promises';

const validIntake = () => ({
  customer: { contactPerson: ' Alex Taylor ', businessName: ' Example Ltd ', phone: '07123456789', email: ' ALEX@example.co.uk ' },
  products: [{
    productName: ' Storage bin ', sku: 'SKU-1', barcode: '12345678', category: 'clothing-apparel', countryOfOrigin: 'gb', packingMode: 'uniform', storage: ['standard'], hazmat: { declaredStatus: 'non-hazmat' },
    uniform: { cartons: 10, unitsPerCarton: 24, cartonWeightKg: 12, cartonLengthCm: 40, cartonWidthCm: 30, cartonHeightCm: 25 }
  }],
  consent: true,
  services: ['inventory-receiving'],
  totals: { units: 1 },
  ignoredClientField: true
});

describe('intakeSchema', () => {
  test.each(['intake-valid.json', 'intake-hazmat.json'])('accepts the client request fixture %s', async (fixture) => {
    const body = JSON.parse(await readFile(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'));
    const result = intakeSchema.safeParse(body);
    if (!result.success) throw new Error(JSON.stringify(result.error.issues));
  });

  test('trims input, normalises UK phone/email/country, and strips client totals and unknown keys', () => {
    const result = intakeSchema.parse(validIntake());
    expect(result.customer).toMatchObject({ contactPerson: 'Alex Taylor', businessName: 'Example Ltd', phone: '+447123456789', email: 'alex@example.co.uk' });
    expect(result.products[0]).toMatchObject({ productName: 'Storage bin', countryOfOrigin: 'GB' });
    expect(result.products[0].hazmat.sdsStatus).toBe('not-required');
    expect(result).not.toHaveProperty('totals');
    expect(result).not.toHaveProperty('ignoredClientField');
  });

  test('rejects duplicate SKUs case-insensitively', () => {
    const body = validIntake();
    body.products.push({ ...body.products[0], sku: 'sku-1' });
    const result = intakeSchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((issue) => issue.message.includes('SKU must be unique'))).toBe(true);
  });

  test('requires the packing data for its mode and rejects the other mode', () => {
    const body = validIntake();
    body.products[0].boxes = [{ units: 1, weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }];
    expect(intakeSchema.safeParse(body).success).toBe(false);
  });

  test('rejects invalid barcode, country, dimensions, weight precision, and missing consent', () => {
    const body = validIntake();
    body.products[0].barcode = 'ABCD';
    body.products[0].countryOfOrigin = 'ZZ';
    body.products[0].uniform.cartonLengthCm = 1.234;
    body.products[0].uniform.cartonWeightKg = 1.234;
    body.consent = false;
    const result = intakeSchema.safeParse(body);
    expect(result.success).toBe(false);
    const paths = result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['products.0.barcode', 'products.0.countryOfOrigin', 'products.0.uniform.cartonLengthCm', 'products.0.uniform.cartonWeightKg', 'consent']));
  });

  test('rejects a total carton count above the cap', () => {
    const body = validIntake();
    body.products[0].uniform.cartons = 60000;
    body.products.push({ ...body.products[0], sku: 'SKU-2', barcode: '87654321', uniform: { ...body.products[0].uniform, cartons: 50000 } });
    const result = intakeSchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((issue) => issue.message.includes('Total cartons'))).toBe(true);
  });

  test('uses scheduled cleanup instead of an intake TTL index and defines admin indexes', () => {
    const indexes = Intake.schema.indexes();
    expect(indexes.some(([keys, options]) => keys.createdAt === 1 && options.expireAfterSeconds)).toBe(false);
    expect(indexes.some(([keys]) => keys.createdAt === 1)).toBe(true);
    expect(indexes.some(([keys, options]) => keys.reference === 1 && options.unique === true)).toBe(true);
    expect(indexes.some(([keys]) => keys.status === 1)).toBe(true);
    expect(indexes.some(([keys]) => keys['customer.businessName'] === 1)).toBe(true);
    expect(indexes.some(([keys]) => keys.requiresDgReview === 1)).toBe(true);
    expect(indexes.some(([keys]) => keys.documentsStatus === 1)).toBe(true);
  });

  test('enforces declared hazardous goods conflicts, SDS and lithium battery rules', () => {
    const base = validIntake();
    const attempt = (hazmat, handling = { containsBatteries: false }) => intakeSchema.safeParse({ ...base, products: [{ ...base.products[0], hazmat, handling }] });
    expect(attempt({ declaredStatus: 'non-hazmat', hazardTypes: ['flammable-liquid'] }).success).toBe(false);
    expect(attempt({ declaredStatus: 'non-hazmat', unNumber: 'UN1234' }).success).toBe(false);
    expect(attempt({ declaredStatus: 'non-hazmat', hazardClass: '3' }).success).toBe(false);
    expect(attempt({ declaredStatus: 'non-hazmat', packingGroup: 'II' }).success).toBe(false);
    expect(attempt({ declaredStatus: 'non-hazmat', properShippingName: 'Paint' }).success).toBe(false);
    expect(attempt({ declaredStatus: 'non-hazmat', battery: { wattHours: 20 } }).success).toBe(false);
    expect(attempt({ declaredStatus: 'hazmat-dangerous-goods' }).success).toBe(false);
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['corrosive'] }).success).toBe(false);
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['corrosive'], sdsStatus: 'available' }).success).toBe(true);
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'available' }).success).toBe(false);
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'available', battery: { wattHours: 100, type: 'lithium-ion', configuration: 'standalone', un383Status: 'available' }, unNumber: 'un3481' }, { containsBatteries: true }).data.products[0].hazmat.unNumber).toBe('UN3481');
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['corrosive'], sdsStatus: 'available', battery: { wattHours: 1 } }).success).toBe(false);
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'available', battery: { wattHours: 100000.01 } }, { containsBatteries: true }).success).toBe(false);
    expect(attempt({ declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'available', battery: { wattHours: 1.234 } }, { containsBatteries: true }).success).toBe(false);
  });

  test('enforces storage and services uniqueness, expiry and Amazon combinations', () => {
    const body = validIntake();
    body.services = ['inventory-receiving', 'inventory-receiving'];
    expect(intakeSchema.safeParse(body).success).toBe(false);
    body.services = ['inventory-receiving']; body.products[0].storage = ['standard', 'standard'];
    expect(intakeSchema.safeParse(body).success).toBe(false);
    body.products[0].storage = ['standard']; body.products[0].handling = { isExpiryDated: true };
    expect(intakeSchema.safeParse(body).success).toBe(false);
    body.products[0].handling = { isExpiryDated: false, expiryDate: '2030-01-01' };
    expect(intakeSchema.safeParse(body).success).toBe(false);
    const year = new Date().getUTCFullYear();
    body.products[0].handling = { isExpiryDated: true, expiryDate: `${year + 1}-02-30` };
    expect(intakeSchema.safeParse(body).success).toBe(false);
    body.products[0].handling = { isExpiryDated: true, expiryDate: `${year + 11}-01-01` };
    expect(intakeSchema.safeParse(body).success).toBe(false);
    body.products[0].handling = { isExpiryDated: false }; body.products[0].amazon = { sellsOnAmazon: true };
    expect(intakeSchema.safeParse(body).success).toBe(false);
    body.products[0].amazon = { sellsOnAmazon: false, asin: 'B012345678' };
    expect(intakeSchema.safeParse(body).success).toBe(false);
  });
});
