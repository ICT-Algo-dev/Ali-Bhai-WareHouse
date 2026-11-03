import PDFDocument from 'pdfkit';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { env } from '../config/env.js';
import { getServiceLabels } from '../utils/labels.js';
import { generateIntakePdf } from './intake-pdf.service.js';

export { generateIntakePdf };

const NAVY = '#0B1F3A';
const ORANGE = '#F97316';
const BODY = '#263445';
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const SPECIAL_CHARACTERS = { '“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...', '•': '*' };

function cleanText(value, maxLength = 3000) {
  return String(value ?? '').replace(CONTROL_CHARS, ' ').trim().slice(0, maxLength)
    .replace(/[“”‘’–—…•]/g, (character) => SPECIAL_CHARACTERS[character])
    .replace(/[^\u0020-\u00FF\u20AC]/g, '?');
}

function formatLondonDate(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

function formatPhone(value) {
  const phone = parsePhoneNumberFromString(cleanText(value, 30), 'GB');
  return phone?.country === 'GB' ? phone.formatNational() : cleanText(value, 30);
}

function makeRow(doc, label, rawValue, { maxLength = 500 } = {}) {
  const value = cleanText(rawValue, maxLength);
  if (!value) return;
  const left = doc.page.margins.left;
  const valueX = left + 128;
  const valueWidth = doc.page.width - doc.page.margins.right - valueX;
  doc.font('Helvetica').fontSize(10);
  const height = doc.heightOfString(value, { width: valueWidth, lineGap: 3 });
  const bottom = doc.page.height - doc.page.margins.bottom - 54;
  if (doc.y + Math.min(height, bottom - doc.page.margins.top) > bottom) doc.addPage();
  const y = doc.y;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(cleanText(label, 80), left, y, { width: 118 });
  doc.fillColor(BODY).font('Helvetica').fontSize(10).text(value, valueX, y, { width: valueWidth, lineGap: 3 });
  doc.y = Math.max(doc.y, y + 15) + 7;
}

function addSection(doc, title) {
  const bottom = doc.page.height - doc.page.margins.bottom - 54;
  if (doc.y + 34 > bottom) doc.addPage();
  doc.moveDown(0.4).fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(title);
  doc.moveTo(doc.page.margins.left, doc.y + 3).lineTo(doc.page.width - doc.page.margins.right, doc.y + 3).strokeColor(ORANGE).lineWidth(1.5).stroke();
  doc.moveDown(0.7).fillColor(BODY).font('Helvetica').fontSize(10);
}

export function generateInquiryPdf(inquiry, options = {}) {
  if (inquiry.type === 'intake') return generateIntakePdf(inquiry, options);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 48, right: 48, bottom: 64, left: 48 }, bufferPages: true, compress: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    try {
      const title = inquiry.type === 'quote' ? 'New Quote Request' : 'New Contact Enquiry';
      const submittedAt = inquiry.receivedAt || inquiry.createdAt || new Date();
      const contactName = inquiry.fullName || inquiry.contactPerson || '';
      doc.info.Title = title;
      doc.info.Subject = 'Warehouse and fulfilment enquiry';

      doc.rect(0, 0, doc.page.width, 118).fill(NAVY);
      doc.rect(0, 114, doc.page.width, 4).fill(ORANGE);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(cleanText(env.BUSINESS_NAME || 'Warehouse & Fulfilment', 120), 48, 32, { width: doc.page.width - 96 });
      doc.fontSize(22).text(title, 48, 62, { width: doc.page.width - 96 });
      doc.y = 140;
      makeRow(doc, 'Reference', cleanText(inquiry.id || inquiry._id, 64));
      makeRow(doc, 'Submitted', formatLondonDate(submittedAt));

      addSection(doc, 'Contact details');
      makeRow(doc, inquiry.type === 'quote' ? 'Contact person' : 'Name', contactName, { maxLength: 120 });
      makeRow(doc, 'Business name', inquiry.businessName, { maxLength: 160 });
      makeRow(doc, 'Phone', formatPhone(inquiry.phone), { maxLength: 30 });
      makeRow(doc, 'Email', inquiry.email, { maxLength: 254 });

      addSection(doc, 'Requirements');
      makeRow(doc, 'Services', getServiceLabels(Array.isArray(inquiry.requiredServices) ? inquiry.requiredServices : []).join(', '), { maxLength: 500 });
      makeRow(doc, 'Business type', inquiry.businessType, { maxLength: 100 });
      makeRow(doc, 'Inventory volume', inquiry.estimatedInventoryVolume, { maxLength: 100 });
      makeRow(doc, 'Monthly orders', inquiry.monthlyOrderVolume || inquiry.estimatedMonthlyOrders, { maxLength: 100 });

      addSection(doc, 'Message / Additional requirements');
      const longFields = [
        ['Message', inquiry.message],
        ['Additional requirements', inquiry.additionalRequirements]
      ].filter(([, value]) => cleanText(value, 3000));
      if (longFields.length === 0) longFields.push(['Details', 'No additional message provided.']);
      for (const [label, rawValue] of longFields) {
        const text = cleanText(rawValue, 3000);
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(label);
        doc.fillColor(BODY).font('Helvetica').fontSize(10).text(text, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, lineGap: 4 });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.6);

      addSection(doc, 'Consent');
      makeRow(doc, 'Consent given', inquiry.consent === true ? 'Yes' : 'No');
      makeRow(doc, 'Consent date/time', inquiry.consentAt ? formatLondonDate(inquiry.consentAt) : 'Not recorded');
      makeRow(doc, 'Privacy policy version', inquiry.consentVersion, { maxLength: 80 });

      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page += 1) {
        doc.switchToPage(page);
        const footerY = doc.page.height - 47;
        doc.moveTo(48, footerY - 8).lineTo(doc.page.width - 48, footerY - 8).strokeColor('#D7DEE7').lineWidth(0.7).stroke();
        doc.fillColor('#566273').font('Helvetica').fontSize(8);
        if (env.BUSINESS_ADDRESS) doc.text(cleanText(env.BUSINESS_ADDRESS, 300), 48, footerY - 10, { width: doc.page.width - 96, lineBreak: false });
        doc.text('Generated automatically. Contains personal data, handle in line with UK GDPR.', 48, footerY, { width: 440, lineBreak: false });
        doc.text(`Page ${page + 1} of ${range.count}`, doc.page.width - 100, footerY, { width: 52, align: 'right', lineBreak: false });
      }
      doc.end();
    } catch (error) {
      doc.destroy(error);
      reject(error);
    }
  });
}
