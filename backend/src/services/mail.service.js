import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getIntakeCategoryLabel, getIntakeServiceLabels, getServiceLabels } from '../utils/labels.js';
import { maskPersonalData } from '../utils/maskPersonalData.js';
import { generateInquiryPdf } from './pdf.service.js';

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const safeText = (value, maxLength = 1000) => String(value ?? '').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const formatLondonTime = (value) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'long' }).format(new Date(value));
const defaultDelay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function safeFilename(value) {
  const slug = safeText(value, 160).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return slug || 'Business';
}

function cleanInquiry(inquiry) {
  const cleaned = {
    ...inquiry,
    fullName: safeText(inquiry.fullName, 120),
    contactPerson: safeText(inquiry.contactPerson, 120),
    businessName: safeText(inquiry.businessName, 160),
    phone: safeText(inquiry.phone, 30),
    email: safeText(inquiry.email, 254),
    businessType: safeText(inquiry.businessType, 100),
    estimatedMonthlyOrders: safeText(inquiry.estimatedMonthlyOrders, 80),
    estimatedInventoryVolume: safeText(inquiry.estimatedInventoryVolume, 100),
    monthlyOrderVolume: safeText(inquiry.monthlyOrderVolume, 100),
    message: safeText(inquiry.message, 3000),
    additionalRequirements: safeText(inquiry.additionalRequirements, 3000),
    requiredServices: Array.isArray(inquiry.requiredServices) ? inquiry.requiredServices.slice(0, 7).map((service) => safeText(service, 80)) : [],
    consentVersion: safeText(inquiry.consentVersion, 80),
    id: safeText(inquiry.id || inquiry._id, 64)
  };
  if (inquiry.customer) {
    cleaned.reference = safeText(inquiry.reference, 40);
    cleaned.customer = {
      contactPerson: safeText(inquiry.customer.contactPerson, 120),
      businessName: safeText(inquiry.customer.businessName, 160),
      phone: safeText(inquiry.customer.phone, 30),
      email: safeText(inquiry.customer.email, 254)
    };
    cleaned.products = (inquiry.products || []).slice(0, 100).map((product) => ({
      ...product,
      productName: safeText(product.productName, 160),
      brandName: safeText(product.brandName, 120),
      sku: safeText(product.sku, 64),
      fnsku: safeText(product.fnsku, 10),
      asin: safeText(product.asin, 10),
      barcode: safeText(product.barcode, 14),
      countryOfOrigin: safeText(product.countryOfOrigin, 2),
      boxes: (product.boxes || []).slice(0, 500).map((box) => ({ ...box }))
    }));
    cleaned.additionalInstructions = safeText(inquiry.additionalInstructions, 3000);
  }
  return cleaned;
}

export function createMailService({ envConfig = env, transportFactory = nodemailer.createTransport, pdfGenerator = generateInquiryPdf, delay = defaultDelay, log = logger } = {}) {
  let transport;
  const getTransport = () => {
    if (!transport) transport = transportFactory({
      host: envConfig.SMTP_HOST,
      port: envConfig.SMTP_PORT,
      secure: envConfig.SMTP_SECURE,
      ...(envConfig.SMTP_USER ? { auth: { user: envConfig.SMTP_USER, pass: envConfig.SMTP_PASSWORD || '' } } : {})
    });
    return transport;
  };

  async function sendInquiryNotification(inquiry) {
    const isIntakeRequest = inquiry.type === 'intake';
    const recipients = String(envConfig.NOTIFY_EMAIL || '').split(',').map((address) => address.trim()).filter(Boolean);
    if (!envConfig.SMTP_HOST || recipients.length === 0) {
      log.warn(isIntakeRequest
        ? 'SMTP_HOST or NOTIFY_EMAIL is not configured; intake email skipped'
        : 'SMTP_HOST or NOTIFY_EMAIL is not configured; enquiry email skipped');
      return false;
    }

    const safeInquiry = cleanInquiry(inquiry);
    const isIntake = safeInquiry.type === 'intake';
    const isQuote = safeInquiry.type === 'quote';
    const contactName = isIntake ? safeInquiry.customer.contactPerson : safeInquiry.fullName || safeInquiry.contactPerson;
    const businessName = isIntake ? safeInquiry.customer.businessName : safeInquiry.businessName;
    const subject = (isIntake
      ? `New inventory intake: ${safeInquiry.reference} - ${businessName}`
      : `New ${isQuote ? 'quote request' : 'contact enquiry'}: ${isQuote ? businessName : contactName}`)
      .replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const dgReviewSkus = isIntake && safeInquiry.requiresDgReview
      ? safeInquiry.products.filter((product) => product.hazmat?.declaredStatus !== 'non-hazmat' || product.hazmat?.hazardTypes?.length || product.storage?.some((item) => ['hazmat-compliant', 'flammable-goods'].includes(item))).map((product) => product.sku)
      : [];
    const mailSubject = (dgReviewSkus.length ? `[DG REVIEW] ${subject}` : subject).slice(0, 200);
    const serviceLabels = isIntake ? [] : getServiceLabels(safeInquiry.requiredServices);
    const intakeSummary = isIntake
      ? `${safeInquiry.products.length} SKUs; ${safeInquiry.totals?.cartons || 0} cartons; ${safeInquiry.totals?.units || 0} units. Categories: ${[...new Set(safeInquiry.products.map((product) => getIntakeCategoryLabel(product.category)))].join(', ')}`
      : '';
    const emailAddress = isIntake ? safeInquiry.customer.email : safeInquiry.email;
    const phone = isIntake ? safeInquiry.customer.phone : safeInquiry.phone;
    const receivedAt = formatLondonTime(safeInquiry.receivedAt || safeInquiry.createdAt || new Date());
    const businessAddress = safeText(envConfig.BUSINESS_ADDRESS, 300);
    const summary = [
      `Name: ${contactName}`,
      `Phone: ${phone}`,
      `Email: ${emailAddress}`,
      isIntake ? `Intake: ${intakeSummary}` : `Services: ${serviceLabels.join(', ') || 'Not specified'}`
    ];
    if (dgReviewSkus.length) summary.push(`DG review required for SKUs: ${dgReviewSkus.join(', ')}`);
    if (isIntake && safeInquiry.services?.length) summary.push(`Services: ${getIntakeServiceLabels(safeInquiry.services).join(', ')}`);
    if (isIntake) {
      summary.push(`Files uploaded: ${(safeInquiry.files || []).length}`);
      if (safeInquiry.documentsStatus === 'incomplete') summary.push(`Files missing: ${(safeInquiry.missingRequiredFiles || []).map((entry) => `${entry.sku}: ${entry.kind}`).join(', ') || 'Required barcode PDFs'}`);
    }
    const title = isIntake ? `New inventory intake: ${safeInquiry.reference}` : `New ${isQuote ? 'quote request' : 'contact enquiry'}`;
    const adminLink = isIntake && envConfig.FRONTEND_URL ? `${String(envConfig.FRONTEND_URL).replace(/\/$/, '')}/admin/intakes/${encodeURIComponent(safeInquiry.id)}` : '';
    const text = [title, ...summary, '', 'Full details are in the attached PDF.', ...(adminLink ? [`Admin record: ${adminLink}`] : []), `Received: ${receivedAt} (Europe/London)`, ...(businessAddress ? ['', businessAddress] : [])].join('\n');
    const htmlSummary = summary.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const filename = isIntake ? `Intake-${safeFilename(safeInquiry.reference)}.pdf` : `Quote-${safeFilename(safeInquiry.businessName)}-${date}.pdf`;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const pdf = await pdfGenerator(safeInquiry);
        await getTransport().sendMail({
          from: envConfig.SMTP_FROM || envConfig.SMTP_USER || recipients[0],
          to: recipients,
          replyTo: emailAddress,
          subject: mailSubject,
          text,
          html: `<div style="font-family:Arial,sans-serif;color:#263445"><h2 style="color:#0B1F3A">${escapeHtml(title)}</h2><p>Summary of the submission:</p><ul>${htmlSummary}</ul><p>Full details are in the attached PDF.</p>${adminLink ? `<p><a href="${escapeHtml(adminLink)}">View this intake in the admin portal</a></p>` : ''}<p>Received: ${escapeHtml(receivedAt)} (Europe/London)</p>${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ''}</div>`,
          attachments: [{ filename, content: pdf, contentType: 'application/pdf' }]
        });
        return true;
      } catch (error) {
        log.warn({ attempt, errorName: error?.name || 'Error', errorMessage: maskPersonalData(error?.message || 'Email delivery failed') }, isIntakeRequest ? 'Intake email attempt failed' : 'Enquiry email attempt failed');
        if (attempt < 3) await delay(300 * (2 ** (attempt - 1)));
      }
    }
    return false;
  }

  return { sendInquiryNotification };
}

export const { sendInquiryNotification } = createMailService();
