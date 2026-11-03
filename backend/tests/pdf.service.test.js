import { describe, test, expect } from '@jest/globals';
import { generateInquiryPdf } from '../src/services/pdf.service.js';

const sampleInquiry = {
  id: '507f1f77bcf86cd799439011', type: 'quote', fullName: 'Alex O’Neil', contactPerson: 'Alex O’Neil',
  businessName: 'Example Trading & Co', phone: '+447123456789', email: 'alex@example.co.uk', businessType: 'Retail',
  estimatedInventoryVolume: '500 units', monthlyOrderVolume: '200 orders', requiredServices: ['inventory-receiving', 'order-fulfillment'],
  additionalRequirements: 'Fragile goods', consent: true, consentAt: new Date('2026-10-31T12:00:00.000Z'),
  consentVersion: '1.0', receivedAt: new Date('2026-10-31T12:00:00.000Z')
};

describe('generateInquiryPdf', () => {
  test('returns an in-memory PDF buffer', async () => {
    const pdf = await generateInquiryPdf(sampleInquiry);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  test('handles very long messages and special characters', async () => {
    const pdf = await generateInquiryPdf({
      ...sampleInquiry,
      message: `${'<script>alert("x & y")</script> £ café 😀 '.repeat(1000)}`
    });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  test('generates a paginated inventory intake PDF with the shared product labels', async () => {
    const boxes = Array.from({ length: 120 }, (_, index) => ({ units: index + 1, weightKg: 1.25, lengthCm: 40, widthCm: 30, heightCm: 25 }));
    const pdf = await generateInquiryPdf({
      type: 'intake', reference: 'INT-2026-000001', createdAt: new Date('2026-10-31T12:00:00.000Z'),
      customer: { contactPerson: 'Alex Taylor', businessName: 'Example Ltd', phone: '+447123456789', email: 'alex@example.co.uk' },
      services: ['warehousing-storage'], files: [{ sku: 'BIN-1', kind: 'barcode-pdf', originalName: 'barcode.pdf' }], documentsStatus: 'incomplete', missingRequiredFiles: [{ sku: 'SKU-2', kind: 'barcode-pdf' }], products: [
        { _id: '507f191e810c19729de860ea', sku: 'BIN-1', productName: 'Storage bin', barcode: '12345678', category: 'home', packingMode: 'individual', boxes, storage: ['hazmat-compliant'], hazmat: { declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'provided', battery: { wattHours: 25 } }, handling: { containsBatteries: true, physicalState: 'solid', leakageRisk: 'low', instructions: 'Handle carefully' }, verification: { warehouseStatus: 'verified', sdsStatus: 'verified', finalClassification: 'hazmat-dangerous-goods', verifiedBy: 'admin@example.co.uk', verifiedAt: new Date(), notes: 'Reviewed' }, results: { cartons: 120, units: 7260, grossWeightKg: 150, volumeM3: 3.6 } },
        ...Array.from({ length: 20 }, (_, i) => ({ sku: `SKU-${i + 2}`, productName: `Product ${i + 2}`, barcode: '87654321', category: 'home', packingMode: 'uniform', uniform: { cartons: 1, unitsPerCarton: 2, cartonWeightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }, storage: ['ambient'], hazmat: { declaredStatus: 'non-hazmat', sdsStatus: 'not-required' }, results: { cartons: 1, units: 2, grossWeightKg: 1, volumeM3: 0.001 } }))
      ],
      totals: { skus: 1, cartons: 120, units: 7260, grossWeightKg: 150, volumeM3: 3.6 }
    });
    expect(pdf.toString('ascii', 0, 5)).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBeGreaterThan(1);
    const adminPdf = await generateInquiryPdf({
      type: 'intake', reference: 'INT-2026-000001', createdAt: new Date(), services: ['warehousing-storage'],
      customer: { contactPerson: 'Alex', businessName: 'Example', phone: '+447123456789', email: 'alex@example.co.uk' },
      products: [{ sku: 'LITHIUM', productName: 'Battery', barcode: '12345678', packingMode: 'uniform', storage: ['hazmat-compliant'], hazmat: { declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'provided', battery: { wattHours: 25 } }, handling: { containsBatteries: true }, verification: { warehouseStatus: 'verified', sdsStatus: 'verified', finalClassification: 'hazmat-dangerous-goods', verifiedBy: 'admin@example.co.uk', notes: 'Reviewed' } }],
      totals: { skus: 1, cartons: 1, units: 1, grossWeightKg: 1, volumeM3: 1 },
      products: [{ sku: 'LITHIUM', productName: 'Battery', barcode: '12345678', packingMode: 'uniform', storage: ['hazmat-compliant'], hazmat: { declaredStatus: 'not-sure', hazardTypes: ['lithium-battery'], sdsStatus: 'provided', battery: { wattHours: 25 } }, handling: { containsBatteries: true }, verification: { warehouseStatus: 'verified', sdsStatus: 'verified', finalClassification: 'hazmat-dangerous-goods', verifiedBy: 'admin@example.co.uk', notes: 'Reviewed' } }]
    }, { admin: true });
    expect(adminPdf.toString('ascii', 0, 5)).toBe('%PDF-');
  });
});
