import { jest, describe, test, expect } from '@jest/globals';
import request from 'supertest';

const sendInquiryNotification = jest.fn();
const create = jest.fn();
const updateOne = jest.fn();
const aggregateIntakes = jest.fn();
const createIntakeRecord = jest.fn();
const updateIntakeRecord = jest.fn();
const updateCounter = jest.fn();
const findIntakeFiles = jest.fn();
jest.unstable_mockModule('../src/services/mail.service.js', () => ({ sendInquiryNotification }));
jest.unstable_mockModule('../src/models/Inquiry.js', () => ({ Inquiry: { create, updateOne } }));
jest.unstable_mockModule('../src/models/Intake.js', () => ({ Intake: { aggregate: aggregateIntakes, create: createIntakeRecord, updateOne: updateIntakeRecord } }));
jest.unstable_mockModule('../src/models/Counter.js', () => ({ Counter: { findOneAndUpdate: updateCounter } }));
jest.unstable_mockModule('../src/models/IntakeFile.js', () => ({ IntakeFile: { find: findIntakeFiles, exists: jest.fn(), countDocuments: jest.fn(), create: jest.fn(), deleteMany: jest.fn() } }));
const { app } = await import('../src/app.js');

describe('inquiry submission when SMTP fails', () => {
  test('returns 201 while background email delivery fails', async () => {
    let failEmail;
    const savedId = '507f1f77bcf86cd799439011';
    create.mockResolvedValue({
      _id: savedId,
      id: savedId,
      createdAt: new Date(),
      toObject: () => ({ _id: savedId, id: savedId, type: 'contact', businessName: 'Example Trading Ltd', createdAt: new Date() })
    });
    updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    sendInquiryNotification.mockImplementation(() => new Promise((_resolve, reject) => { failEmail = reject; }));
    const response = await request(app).post('/api/v1/contact').set('X-Forwarded-For', '198.51.100.99').send({
      fullName: 'Alex Taylor', businessName: 'Example Trading Ltd', phone: '07123456789', email: 'alex@example.co.uk',
      requiredServices: ['warehousing-storage'], consent: true, website: ''
    }).expect(201);

    expect(response.body.success).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(response.body.data.id).toBe(savedId);
    for (let attempt = 0; attempt < 20 && !failEmail; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(failEmail).toBeDefined();
    failEmail(new Error('SMTP failed for alex@example.co.uk +447123456789'));
    for (let attempt = 0; attempt < 20 && !updateOne.mock.calls.length; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(updateOne).toHaveBeenCalledWith({ _id: savedId }, { $set: { emailStatus: 'failed' }, $unset: { emailSentAt: 1 } });
  });

  test('intake submission returns 201 before a failed background email completes', async () => {
    let failEmail;
    const savedId = '507f1f77bcf86cd799439012';
    let sequence = 0;
    findIntakeFiles.mockReturnValue({ select: () => ({ lean: async () => [] }), lean: async () => [] });
    aggregateIntakes.mockResolvedValue([]);
    updateCounter.mockImplementation(async (_filter, update) => {
      if (update.$max) sequence = Math.max(sequence, update.$max.sequence);
      if (update.$inc) sequence += update.$inc.sequence;
      return { sequence };
    });
    createIntakeRecord.mockImplementation(async (fields) => ({
      ...fields,
      _id: savedId,
      id: savedId,
      createdAt: new Date(),
      toObject() { return { ...fields, _id: savedId, id: savedId, createdAt: this.createdAt }; }
    }));
    updateIntakeRecord.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    sendInquiryNotification.mockImplementation(() => new Promise((_resolve, reject) => { failEmail = reject; }));

    const response = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.98').send({
      customer: { contactPerson: 'Alex Taylor', businessName: 'Example Trading Ltd', phone: '07123456789', email: 'alex@example.co.uk' },
      services: ['inventory-receiving'], products: [{ productName: 'Storage bin', sku: 'SKU-1', barcode: '12345678', category: 'home-kitchen', packingMode: 'uniform', storage: ['standard'], hazmat: { declaredStatus: 'non-hazmat' }, uniform: { cartons: 1, unitsPerCarton: 24, cartonWeightKg: 12, cartonLengthCm: 40, cartonWidthCm: 30, cartonHeightCm: 25 } }],
      consent: true, website: ''
    }).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(savedId);
    expect(createIntakeRecord).toHaveBeenCalledTimes(1);
    for (let attempt = 0; attempt < 20 && !failEmail; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(failEmail).toBeDefined();
    failEmail(new Error('SMTP failed for alex@example.co.uk +447123456789'));
    for (let attempt = 0; attempt < 20 && !updateIntakeRecord.mock.calls.length; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(updateIntakeRecord).toHaveBeenCalledWith({ _id: savedId }, { $set: { emailStatus: 'failed' }, $unset: { emailSentAt: 1 } });
  });
});
