import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';
import { Inquiry } from '../src/models/Inquiry.js';
import { connectDatabase } from '../src/config/db.js';

let mongo;
beforeAll(async () => {
  app.set('trust proxy', true);
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Inquiry.deleteMany({});
});

const contact = {
  fullName: ' Alex Taylor ', businessName: 'Example Trading Ltd', phone: '07123 456789', email: ' SALES@EXAMPLE.CO.UK ',
  requiredServices: ['warehousing-storage'], estimatedMonthlyOrders: '100-500', message: 'Please call me', consent: true, website: ''
};
const forwardedIp = (lastOctet) => `198.51.100.${lastOctet}`;

describe('public API', () => {
  test('health endpoint matches the API contract', async () => {
    await request(app).get('/api/v1/health').expect(200, { success: true, status: 'ok' });
  });

  test('valid UK mobile inquiry is stored in E.164 form', async () => {
    const response = await request(app).post('/api/v1/contact').set('X-Forwarded-For', forwardedIp(1)).send({ ...contact, extraField: 'stripped' }).expect(201);
    expect(response.body).toMatchObject({ success: true, data: { id: expect.any(String) } });
    const saved = await Inquiry.findById(response.body.data.id).lean();
    expect(saved).toMatchObject({ type: 'contact', fullName: 'Alex Taylor', phone: '+447123456789', email: 'sales@example.co.uk', status: 'new', consent: true, consentVersion: 'test-policy-1' });
    expect(saved.consentAt).toBeInstanceOf(Date);
    expect(saved.extraField).toBeUndefined();
  });

  test('valid UK landline in international format is accepted', async () => {
    const response = await request(app).post('/api/v1/quotes').set('X-Forwarded-For', forwardedIp(2)).send({
      businessName: 'Example Trading Ltd', contactPerson: 'Alex Taylor', phone: '+44 20 7946 0958', email: 'SALES@example.co.uk',
      businessType: 'Retail', estimatedInventoryVolume: '500 units', monthlyOrderVolume: '200 orders',
      requiredServices: ['inventory-receiving', 'courier-dispatch'], additionalRequirements: 'Fragile goods', consent: true, website: ''
    }).expect(201);
    const saved = await Inquiry.findById(response.body.data.id).lean();
    expect(saved).toMatchObject({ type: 'quote', contactPerson: 'Alex Taylor', phone: '+442079460958', email: 'sales@example.co.uk', status: 'new', consent: true });
  });

  test('invalid UK phone returns a field error', async () => {
    const response = await request(app).post('/api/v1/contact').set('X-Forwarded-For', forwardedIp(3)).send({ ...contact, phone: '12345' }).expect(400);
    expect(response.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'phone' })]));
  });

  test('missing and false consent are rejected on both inquiry endpoints', async () => {
    const quote = { businessName: 'Example Trading Ltd', contactPerson: 'Alex Taylor', phone: '07123456789', email: 'alex@example.co.uk', businessType: 'Retail', requiredServices: ['order-fulfillment'], website: '' };
    const missingContact = { ...contact };
    delete missingContact.consent;
    const cases = [
      ['/contact', missingContact, 4],
      ['/quotes', { ...quote, consent: false }, 5]
    ];
    for (const [path, body, ip] of cases) {
      const response = await request(app).post(`/api/v1${path}`).set('X-Forwarded-For', forwardedIp(ip)).send(body).expect(400);
      expect(response.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'consent' })]));
    }
  });

  test('honeypot returns success without persisting the inquiry', async () => {
    const response = await request(app).post('/api/v1/contact').set('X-Forwarded-For', forwardedIp(6)).send({ website: 'bot filled this', nonsense: { $gt: '' } }).expect(201);
    expect(response.body.success).toBe(true);
    expect(await Inquiry.countDocuments()).toBe(0);
  });

  test('limits submissions to five per IP in the rate window', async () => {
    const quote = { businessName: 'Example Trading Ltd', contactPerson: 'Alex Taylor', phone: '07123456789', email: 'alex@example.co.uk', businessType: 'Retail', requiredServices: ['order-fulfillment'], consent: true, website: '' };
    const results = [];
    for (let i = 0; i < 6; i += 1) results.push(await request(app).post('/api/v1/quotes').set('X-Forwarded-For', forwardedIp(44)).send(quote));
    expect(results.slice(0, 5).every((result) => result.status === 201)).toBe(true);
    expect(results[5].status).toBe(429);
    expect(results[5].body).toMatchObject({ success: false, errors: [] });
  });

  test('retention TTL index uses the configured 730-day expiry', () => {
    const ttlIndex = Inquiry.schema.indexes().find(([keys, options]) => keys.createdAt === 1 && Number.isInteger(options.expireAfterSeconds));
    expect(ttlIndex?.[1].expireAfterSeconds).toBe(730 * 24 * 60 * 60);
  });

  test('admin can delete an inquiry for erasure', async () => {
    const created = await request(app).post('/api/v1/contact').set('X-Forwarded-For', forwardedIp(7)).send(contact).expect(201);
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const response = await request(app).delete(`/api/v1/admin/inquiries/${created.body.data.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(response.body).toMatchObject({ success: true, data: { id: created.body.data.id } });
    expect(await Inquiry.countDocuments()).toBe(0);
  });

  test('admin inquiry search is case-insensitive, escaped and returns totalPages', async () => {
    const matching = [
      { fullName: 'Needle Person' },
      { contactPerson: 'Needle Contact' },
      { businessName: 'Needle Business Ltd' },
      { email: 'needle@example.co.uk' }
    ];
    await Inquiry.create(matching.map((fields) => ({
      type: fields.contactPerson ? 'quote' : 'contact',
      businessName: fields.businessName || 'Unrelated Ltd',
      contactPerson: fields.contactPerson,
      fullName: fields.fullName,
      email: fields.email || 'unrelated@example.co.uk',
      phone: '+447123456789', requiredServices: ['warehousing-storage'], consent: true,
      consentAt: new Date(), consentVersion: 'test-policy-1'
    })));
    await Inquiry.create({ type: 'contact', fullName: 'Other Person', businessName: 'Unrelated Ltd', email: 'other@example.co.uk', phone: '+447700900123', requiredServices: ['warehousing-storage'], consent: true, consentAt: new Date(), consentVersion: 'test-policy-1' });

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/v1/admin/inquiries?search=NEEDLE&page=1&limit=2').set('Authorization', `Bearer ${token}`).expect(200);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });

    const injection = await request(app).get('/api/v1/admin/inquiries?search=.*').set('Authorization', `Bearer ${token}`).expect(200);
    expect(injection.body.data.items).toHaveLength(0);
    expect(injection.body.data.pagination).toMatchObject({ total: 0, totalPages: 0 });

    const phone = await request(app).get('/api/v1/admin/inquiries?search=%2B447700900123').set('Authorization', `Bearer ${token}`).expect(200);
    expect(phone.body.data.items).toHaveLength(1);
    expect(phone.body.data.items[0].phone).toBe('+447700900123');
  });

  test('admin inquiry list accepts empty type, status and search filters', async () => {
    await Inquiry.create([
      { type: 'contact', fullName: 'Alex Taylor', businessName: 'Example Trading Ltd', phone: '+447123456789', email: 'alex@example.co.uk', requiredServices: ['warehousing-storage'], consent: true, consentAt: new Date(), consentVersion: 'test-policy-1' },
      { type: 'quote', contactPerson: 'Sam Jones', businessName: 'Sample Goods Ltd', phone: '+442079460958', email: 'sam@example.co.uk', requiredServices: ['order-fulfillment'], consent: true, consentAt: new Date(), consentVersion: 'test-policy-1' }
    ]);
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/v1/admin/inquiries?page=1&limit=20&type=&status=&search=').set('Authorization', `Bearer ${token}`).expect(200);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  test('admin inquiry list still rejects an invalid status filter', async () => {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/v1/admin/inquiries?status=foo').set('Authorization', `Bearer ${token}`).expect(400);
    expect(response.body).toMatchObject({ success: false, message: 'Invalid query parameters' });
    expect(response.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'status' })]));
  });
});
