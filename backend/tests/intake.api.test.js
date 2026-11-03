import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { Counter } from '../src/models/Counter.js';
import { Intake } from '../src/models/Intake.js';
import { connectDatabase } from '../src/config/db.js';
import { generateIntakeReference } from '../src/services/intake.service.js';
import { IntakeFile } from '../src/models/IntakeFile.js';
import { storageProvider } from '../src/storage/LocalStorageProvider.js';
import { cleanupExpiredIntakes } from '../src/services/intake-cleanup.service.js';

let mongo;
beforeAll(async () => {
  app.set('trust proxy', true);
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Counter.init(), Intake.init(), IntakeFile.init()]);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  const files = await IntakeFile.find({}).select('+storageKey');
  await Promise.all(files.map((file) => storageProvider.delete(file.storageKey).catch(() => {})));
  await Promise.all([Intake.deleteMany({}), Counter.deleteMany({})]);
  await IntakeFile.deleteMany({});
});

const uniformProduct = (overrides = {}) => ({
  productName: 'Storage bin', brandName: 'Example', sku: 'SKU-1', fnsku: 'ABC1234567', asin: 'B012345678',
  barcode: '12345678', category: 'home-kitchen', countryOfOrigin: 'GB', packingMode: 'uniform',
  storage: ['standard'], hazmat: { declaredStatus: 'non-hazmat' },
  uniform: { cartons: 10, unitsPerCarton: 24, cartonWeightKg: 12, cartonLengthCm: 40, cartonWidthCm: 30, cartonHeightCm: 25 },
  ...overrides
});
const intakeBody = () => ({
  customer: { contactPerson: 'Alex Taylor', businessName: 'Example Trading Ltd', phone: '07123456789', email: 'alex@example.co.uk' },
  services: ['inventory-receiving'], products: [uniformProduct()], additionalInstructions: 'Receive by appointment', consent: true, website: ''
});
const token = () => jwt.sign({ role: 'admin', email: 'admin@example.co.uk' }, process.env.JWT_SECRET);
const ip = '198.51.100.88';
const parsePdf = (response, callback) => {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
};
const parseBuffer = (response, callback) => {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
};
const upload = (reference, uploadToken, kind, sku, buffer, filename = 'document.pdf', ipAddress = ip) => {
  let req = request(app).post(`/api/v1/intakes/${reference}/files`).set('X-Forwarded-For', ipAddress).set('Authorization', `Bearer ${uploadToken}`).field('kind', kind);
  if (sku !== undefined) req = req.field('sku', sku);
  return req.attach('file', buffer, { filename, contentType: 'application/pdf' });
};

describe('inventory intake API', () => {
  test('accepts the client uniform fixture and calculates the contract totals', async () => {
    const body = JSON.parse(await readFile(new URL('./fixtures/intake-valid.json', import.meta.url), 'utf8'));
    const response = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.120').send(body).expect(201);
    expect(response.body.data.totals).toEqual({ skus: 1, cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 });
  });

  test('accepts the client individual hazmat fixture', async () => {
    const body = JSON.parse(await readFile(new URL('./fixtures/intake-hazmat.json', import.meta.url), 'utf8'));
    const response = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.121').send(body).expect(201);
    expect(response.body.data.totals).toMatchObject({ cartons: 1, units: 12, grossWeightKg: 12, volumeM3: 0.03 });
  });

  test('saves intake, calculates totals and returns a 24-hour PDF token', async () => {
    const body = intakeBody();
    body.products[0].verification = { warehouseStatus: 'verified', verifiedBy: 'attacker@example.com' };
    const response = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', ip).send(body).expect(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        reference: expect.stringMatching(/^INT-\d{4}-\d{6,}$/),
        status: 'submitted',
        totals: { skus: 1, cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 },
        perSku: [{ sku: 'SKU-1', cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 }],
        pdfToken: expect.any(String),
        pdfExpiresAt: expect.any(String)
      }
    });
    const saved = await Intake.findById(response.body.data.id).lean();
    expect(saved.products[0].results).toMatchObject({ cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 });
    expect(saved.customer.phone).toBe('+447123456789');
    expect(saved.requiresDgReview).toBe(false);
    expect(saved.dgProductCount).toBe(0);
    expect(saved.products[0].verification.warehouseStatus).toBe('not-reviewed');
    expect(response.body.data.uploadToken).toEqual(expect.any(String));
    expect(response.body.data.uploadTokenExpiresAt).toEqual(expect.any(String));
  });

  test('honeypot returns 201 without creating intake or incrementing the reference counter', async () => {
    const response = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.89').send({ website: 'bot', invalid: true }).expect(201);
    expect(response.body.success).toBe(true);
    expect(await Intake.countDocuments()).toBe(0);
    expect(await Counter.countDocuments()).toBe(0);
  });

  test('computes DG review flags from declared hazard data and exposes them in admin rows', async () => {
    const body = intakeBody();
    body.products[0].hazmat = { declaredStatus: 'hazmat-dangerous-goods', hazardTypes: ['flammable-liquid'], sdsStatus: 'available', unNumber: 'UN1993', hazardClass: '3' };
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.93').send(body).expect(201);
    const saved = await Intake.findById(submitted.body.data.id).lean();
    expect(saved.requiresDgReview).toBe(true);
    expect(saved.dgProductCount).toBe(1);
    const response = await request(app).get('/api/v1/admin/intakes?requiresDgReview=true').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(response.body.data.items[0]).toMatchObject({ requiresDgReview: true, dgProductCount: 1 });
  });

  test('limits intake submissions to five per IP per 15 minutes', async () => {
    const results = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      results.push(await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.90').send(intakeBody()));
    }
    expect(results.slice(0, 5).every((result) => result.status === 201)).toBe(true);
    expect(results[5].status).toBe(429);
  });

  test('PDF token rejects expiry and reference mismatch, and valid token returns PDF', async () => {
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.91').send(intakeBody()).expect(201);
    const { reference, pdfToken } = submitted.body.data;
    const expiredToken = jwt.sign({ purpose: 'intake-pdf', reference }, process.env.JWT_SECRET, { expiresIn: -1 });
    await request(app).get(`/api/v1/intakes/${reference}/pdf`).set('Authorization', `Bearer ${expiredToken}`).expect(401);
    await request(app).get(`/api/v1/intakes/INT-2026-999999/pdf`).set('Authorization', `Bearer ${pdfToken}`).expect(401);
    const pdf = await request(app).get(`/api/v1/intakes/${reference}/pdf`).set('Authorization', `Bearer ${pdfToken}`).buffer(true).parse(parsePdf).expect(200).expect('Content-Type', /application\/pdf/);
    expect(pdf.body.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  test('uploads verify magic bytes, enforce PDF rules, reject active content and update document status', async () => {
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.94').send(intakeBody()).expect(201);
    const { reference, uploadToken } = submitted.body.data;
    await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('MZ this is not a PDF'), 'renamed.pdf', '198.51.100.95').expect(415);
    await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'wrong-kind.png', '198.51.100.107').expect(415);
    await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('not a PDF'), 'wrong.txt', '198.51.100.96').expect(415);
    await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('%PDF-1.7 /JavaScript evil'), 'active.pdf', '198.51.100.97').expect(400);
    await upload(reference, uploadToken, 'barcode-pdf', '../SKU-1', Buffer.from('%PDF-1.7 safe'), '../../unsafe.pdf', '198.51.100.98').expect(400);
    const accepted = await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('%PDF-1.7 safe content'), '../../barcode.pdf', '198.51.100.99').expect(201);
    expect(accepted.body.data).not.toHaveProperty('storageKey');
    expect(accepted.body.data).toMatchObject({ kind: 'barcode-pdf', sku: 'SKU-1', mimeType: 'application/pdf', documentsStatus: 'complete' });
    expect(accepted.body.data.originalName).toBe('barcode.pdf');
    await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('%PDF-1.7 safe content'), 'duplicate.pdf', '198.51.100.100').expect(400);
    const listing = await request(app).get(`/api/v1/intakes/${reference}/files`).set('Authorization', `Bearer ${uploadToken}`).expect(200);
    expect(listing.body.data.files).toHaveLength(1);
    expect(listing.body.data.files[0]).not.toHaveProperty('storageKey');
    const savedFile = await IntakeFile.findById(accepted.body.data._id).select('+storageKey');
    await request(app).delete(`/api/v1/intakes/${reference}/files/${accepted.body.data._id}`).set('Authorization', `Bearer ${uploadToken}`).expect(200).expect((res) => expect(res.body.data.documentsStatus).toBe('incomplete'));
    expect(await storageProvider.exists(savedFile.storageKey)).toBe(false);
  });

  test('upload token is required, scoped to its reference, and expires', async () => {
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.101').send(intakeBody()).expect(201);
    const { reference, uploadToken } = submitted.body.data;
    await request(app).get(`/api/v1/intakes/${reference}/files`).expect(401);
    await request(app).get(`/api/v1/intakes/${reference}/files`).set('Authorization', `Bearer ${uploadToken}`).expect(200);
    await request(app).get(`/api/v1/intakes/INT-2026-999999/files`).set('Authorization', `Bearer ${uploadToken}`).expect(401);
    const expired = jwt.sign({ purpose: 'intake-upload', reference }, process.env.JWT_SECRET, { expiresIn: -1 });
    await request(app).get(`/api/v1/intakes/${reference}/files`).set('Authorization', `Bearer ${expired}`).expect(401);
  });

  test('admin can stream and ZIP uploads, and intake deletion removes disk files', async () => {
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.102').send(intakeBody()).expect(201);
    const { id, reference, uploadToken } = submitted.body.data;
    const added = await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('%PDF-1.7 admin test'), 'barcode.pdf', '198.51.100.103').expect(201);
    const fileId = added.body.data._id;
    const file = await IntakeFile.findById(fileId).select('+storageKey');
    await request(app).get(`/api/v1/admin/intakes/${id}/files/${fileId}`).expect(401);
    const authorization = `Bearer ${token()}`;
    const download = await request(app).get(`/api/v1/admin/intakes/${id}/files/${fileId}`).set('Authorization', authorization).buffer(true).parse(parseBuffer).expect(200);
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(download.body.toString('ascii', 0, 5)).toBe('%PDF-');
    await request(app).get(`/api/v1/admin/intakes/${id}/files/${fileId}?download=1`).set('Authorization', authorization).expect(200).expect('Content-Disposition', /attachment/);
    const archive = await request(app).get(`/api/v1/admin/intakes/${id}/files.zip`).set('Authorization', authorization).buffer(true).parse(parseBuffer).expect(200).expect('Content-Type', /application\/zip/);
    expect(archive.body.length).toBeGreaterThan(20);
    const afterZip = await Intake.findById(id).lean();
    expect(afterZip.auditLog.some((entry) => entry.action === 'files-zip-downloaded')).toBe(true);
    await request(app).delete(`/api/v1/admin/intakes/${id}`).set('Authorization', authorization).expect(200);
    expect(await storageProvider.exists(file.storageKey)).toBe(false);
    expect(await IntakeFile.countDocuments({ intakeId: id })).toBe(0);
  });

  test('enforces per-product count and per-file size limits', async () => {
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.108').send(intakeBody()).expect(201);
    const { reference, uploadToken } = submitted.body.data;
    for (let index = 0; index < 20; index += 1) {
      const image = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from([index])]);
      await upload(reference, uploadToken, 'product-photo', 'SKU-1', image, `photo-${index}.png`, '198.51.100.109').expect(201);
    }
    await upload(reference, uploadToken, 'product-photo', 'SKU-1', Buffer.from([0x89, 0x50, 0x4e, 0x47, 21]), 'photo-20.png', '198.51.100.109').expect((response) => { expect([400, 413]).toContain(response.status); expect(response.body.message).toMatch(/per product/i); });
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41);
    await upload(reference, uploadToken, 'product-photo', 'SKU-1', oversized, 'large.png', '198.51.100.110').expect((response) => expect([400, 413]).toContain(response.status));
  });

  test('upload is blocked after receipt and retention cleanup removes file data before expired intakes', async () => {
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.104').send(intakeBody()).expect(201);
    const { id, reference, uploadToken } = submitted.body.data;
    const added = await upload(reference, uploadToken, 'barcode-pdf', 'SKU-1', Buffer.from('%PDF-1.7 stored'), 'barcode.pdf', '198.51.100.105').expect(201);
    const savedFile = await IntakeFile.findById(added.body.data._id).select('+storageKey');
    await request(app).patch(`/api/v1/admin/intakes/${id}/status`).set('Authorization', `Bearer ${token()}`).send({ status: 'received' }).expect(200);
    await upload(reference, uploadToken, 'product-photo', 'SKU-1', Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image.png', '198.51.100.106').expect(400);
    await Intake.updateOne({ _id: id }, { $set: { createdAt: new Date(Date.now() - 800 * 86400000) } });
    await cleanupExpiredIntakes();
    expect(await Intake.findById(id)).toBeNull();
    expect(await IntakeFile.countDocuments({ intakeId: id })).toBe(0);
    expect(await storageProvider.exists(savedFile.storageKey)).toBe(false);
  });

  test('admin routes require admin JWT and support details, status, deletion and PDF', async () => {
    await request(app).get('/api/v1/admin/intakes').expect(401);
    const submitted = await request(app).post('/api/v1/intakes').set('X-Forwarded-For', '198.51.100.92').send(intakeBody()).expect(201);
    const id = submitted.body.data.id;
    const saved = await Intake.findById(id);
    const productId = String(saved.products[0]._id);
    const authorization = `Bearer ${token()}`;
    await request(app).get(`/api/v1/admin/intakes/${id}`).set('Authorization', authorization).expect(200);
    const filtered = await request(app).get('/api/v1/admin/intakes?page=1&limit=20&status=&search=').set('Authorization', authorization).expect(200);
    expect(filtered.body.data.items).toHaveLength(1);
    expect(filtered.body.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    await request(app).get('/api/v1/admin/intakes?status=foo').set('Authorization', authorization).expect(400);
    const adminPdf = await request(app).get(`/api/v1/admin/intakes/${id}/pdf`).set('Authorization', authorization).buffer(true).parse(parsePdf).expect(200).expect('Content-Type', /application\/pdf/);
    expect(adminPdf.body.toString('ascii', 0, 5)).toBe('%PDF-');
    await request(app).patch(`/api/v1/admin/intakes/${id}/status`).set('Authorization', authorization).send({ status: 'under-review' }).expect(200);
    const verified = await request(app).patch(`/api/v1/admin/intakes/${id}/products/${productId}/verification`).set('Authorization', authorization).send({ warehouseStatus: 'verified', sdsStatus: 'not-required', finalClassification: 'non-hazmat', notes: 'Checked' }).expect(200);
    expect(verified.body.data.products[0].verification.verifiedBy).toBe('admin@example.co.uk');
    expect(verified.body.data.auditLog).toHaveLength(2);
    expect(verified.body.data.auditLog[0].action).toBe('status-updated');
    expect(verified.body.data.auditLog[1].action).toBe('product-verification-updated');
    await request(app).delete(`/api/v1/admin/intakes/${id}`).set('Authorization', authorization).expect(200);
    await request(app).get(`/api/v1/admin/intakes/${id}`).set('Authorization', authorization).expect(404);
  });

  test('legacy Phase 1 intake records still return defaults and review filter works', async () => {
    const legacyId = new mongoose.Types.ObjectId();
    await Intake.collection.insertOne({ _id: legacyId, reference: 'INT-2020-000001', customer: { contactPerson: 'Old Customer', businessName: 'Old Ltd', phone: '+447123456789', email: 'old@example.co.uk' }, products: [{ productName: 'Legacy item', sku: 'OLD-1', barcode: '12345678', category: 'home', packingMode: 'uniform', uniform: { cartons: 1, unitsPerCarton: 1, cartonWeightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }, results: { cartons: 1, units: 1, grossWeightKg: 1, volumeM3: 0.000001 } }], totals: { skus: 1, cartons: 1, units: 1, grossWeightKg: 1, volumeM3: 0.000001 }, consent: true, consentAt: new Date(), consentVersion: 'old', createdAt: new Date(), updatedAt: new Date() });
    const auth = { Authorization: `Bearer ${token()}` };
    const detail = await request(app).get(`/api/v1/admin/intakes/${legacyId}`).set(auth).expect(200);
    expect(detail.body.data.products[0].verification.warehouseStatus).toBe('not-reviewed');
    expect(detail.body.data.services).toEqual([]);
    expect(detail.body.data.auditLog).toEqual([]);
    expect((await request(app).get('/api/v1/admin/intakes?requiresDgReview=false').set(auth).expect(200)).body.data.items[0].requiresDgReview).toBe(false);
  });

  test('reference allocation is atomic under concurrency and recovers if the counter is reset', async () => {
    const year = new Date().getUTCFullYear();
    await Intake.create({
      reference: `INT-${year}-000009`,
      customer: { contactPerson: 'Alex Taylor', businessName: 'Example Ltd', phone: '+447123456789', email: 'alex@example.co.uk' },
      products: [{ ...uniformProduct(), results: { cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 } }],
      totals: { skus: 1, cartons: 10, units: 240, grossWeightKg: 120, volumeM3: 0.3 }, consent: true,
      consentAt: new Date(), consentVersion: 'test-policy-1'
    });
    await Counter.deleteMany({});
    const references = await Promise.all(Array.from({ length: 20 }, () => generateIntakeReference(new Date(Date.UTC(year, 0, 1)))));
    expect(new Set(references).size).toBe(20);
    expect(references).toContain(`INT-${year}-000010`);
  });
});
