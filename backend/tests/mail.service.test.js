import { describe, test, expect, jest } from '@jest/globals';
import { createMailService } from '../src/services/mail.service.js';

const envConfig = {
  SMTP_HOST: 'smtp.example.test', SMTP_PORT: 587, SMTP_SECURE: false,
  SMTP_USER: 'smtp-user', SMTP_PASSWORD: 'smtp-password',
  SMTP_FROM: 'Warehouse & Fulfilment <no-reply@example.co.uk>',
  NOTIFY_EMAIL: 'owner@example.co.uk, enquiries@example.co.uk'
};
const inquiry = {
  id: '507f1f77bcf86cd799439011', type: 'quote', contactPerson: 'Alex Taylor',
  businessName: 'Example Trading\r\nBcc: attacker@example.com', phone: '+447123456789',
  email: 'alex@example.co.uk', requiredServices: ['warehousing-storage'], receivedAt: new Date()
};

describe('mail service', () => {
  test('attaches the PDF, sets Reply-To and sanitises the subject', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
    const pdf = Buffer.from('%PDF-test');
    const service = createMailService({
      envConfig,
      transportFactory: jest.fn(() => ({ sendMail })),
      pdfGenerator: jest.fn().mockResolvedValue(pdf),
      delay: jest.fn().mockResolvedValue(undefined),
      log: { warn: jest.fn() }
    });

    await expect(service.sendInquiryNotification(inquiry)).resolves.toBe(true);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toEqual(['owner@example.co.uk', 'enquiries@example.co.uk']);
    expect(message.replyTo).toBe('alex@example.co.uk');
    expect(message.subject).toMatch(/^New quote request: Example Trading Bcc: attacker@example\.com$/);
    expect(message.subject).not.toMatch(/[\r\n]/);
    expect(message.attachments[0]).toMatchObject({ content: pdf, contentType: 'application/pdf' });
    expect(message.attachments[0].filename).toMatch(/^Quote-Example-Trading-Bcc-attacker-example-com-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(message.text).toContain('Full details are in the attached PDF.');
    expect(message.html).toContain('Warehousing and storage');
  });

  test('retries failed SMTP delivery three times with backoff', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('Temporary SMTP failure'));
    const delay = jest.fn().mockResolvedValue(undefined);
    const service = createMailService({
      envConfig,
      transportFactory: () => ({ sendMail }),
      pdfGenerator: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
      delay,
      log: { warn: jest.fn() }
    });

    await expect(service.sendInquiryNotification(inquiry)).resolves.toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(3);
    expect(delay.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([300, 600]);
  });

  test('sends intake PDF with the reference filename, intake subject and customer Reply-To', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'intake-test' });
    const service = createMailService({
      envConfig,
      transportFactory: () => ({ sendMail }),
      pdfGenerator: jest.fn().mockResolvedValue(Buffer.from('%PDF-intake')),
      delay: jest.fn(),
      log: { warn: jest.fn() }
    });
    const intake = {
      id: '507f1f77bcf86cd799439011', type: 'intake', reference: 'INT-2026-000001',
      customer: { contactPerson: 'Alex Taylor', businessName: 'Example Trading Ltd', phone: '+447123456789', email: 'alex@example.co.uk' },
      products: [{ sku: 'SKU-1', productName: 'Storage bin', category: 'home' }],
      totals: { skus: 1, cartons: 10, units: 240 }, receivedAt: new Date()
    };

    await expect(service.sendInquiryNotification(intake)).resolves.toBe(true);
    const message = sendMail.mock.calls[0][0];
    expect(message.subject).toBe('New inventory intake: INT-2026-000001 - Example Trading Ltd');
    expect(message.replyTo).toBe('alex@example.co.uk');
    expect(message.attachments[0].filename).toBe('Intake-INT-2026-000001.pdf');
  });
});
