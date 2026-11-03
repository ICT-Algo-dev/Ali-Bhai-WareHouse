import PDFDocument from 'pdfkit';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { env } from '../config/env.js';
import { getIntakeCategoryLabel, getIntakeServiceLabels, DECLARED_HAZMAT_STATUS_LABELS, HAZARD_TYPE_LABELS, STORAGE_LABELS, SDS_STATUS_LABELS, HAZARD_CLASS_LABELS, PACKING_GROUP_LABELS, BATTERY_TYPE_LABELS, BATTERY_CONFIGURATION_LABELS, BATTERY_UN383_STATUS_LABELS, PHYSICAL_STATE_LABELS, LEAKAGE_DAMAGE_RISK_LABELS, AMAZON_FULFILMENT_CHANNEL_LABELS, AMAZON_LISTING_STATUS_LABELS, AMAZON_DG_REVIEW_STATUS_LABELS, AMAZON_COMPLIANCE_DOCS_LABELS } from '../utils/labels.js';

const NAVY = '#0B1F3A';
const ORANGE = '#F97316';
const BODY = '#263445';
const clean = (value, max = 3000) => String(value ?? '').replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim().slice(0, max).replace(/[^\u0020-\u00FF\u20AC]/g, '?');
const fixed = (value, places) => Number(value || 0).toFixed(places);

function londonDate(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

function writeDetailsRow(doc, label, value, max = 500) {
  const text = clean(value, max);
  if (!text) return;
  const x = doc.page.margins.left;
  const valueX = x + 128;
  const width = doc.page.width - doc.page.margins.right - valueX;
  doc.font('Helvetica').fontSize(10);
  const height = doc.heightOfString(text, { width, lineGap: 3 });
  const bottom = doc.page.height - doc.page.margins.bottom - 54;
  if (doc.y + Math.min(height, bottom - doc.page.margins.top) > bottom) doc.addPage();
  const y = doc.y;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(clean(label, 80), x, y, { width: 118 });
  doc.fillColor(BODY).font('Helvetica').fontSize(10).text(text, valueX, y, { width, lineGap: 3 });
  doc.y = Math.max(doc.y, y + 15) + 7;
}

function section(doc, title) {
  const bottom = doc.page.height - doc.page.margins.bottom - 54;
  if (doc.y + 34 > bottom) doc.addPage();
  doc.moveDown(0.4).fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(title);
  doc.moveTo(doc.page.margins.left, doc.y + 3).lineTo(doc.page.width - doc.page.margins.right, doc.y + 3).strokeColor(ORANGE).lineWidth(1.5).stroke();
  doc.moveDown(0.7).fillColor(BODY).font('Helvetica').fontSize(10);
}

const pageBottom = (doc) => doc.page.height - doc.page.margins.bottom - 54;
const skuColumns = [
  { title: 'SKU', key: 'sku', width: 62 }, { title: 'Product', key: 'product', width: 88 },
  { title: 'Barcode', key: 'barcode', width: 68 }, { title: 'Cartons', key: 'cartons', width: 48 },
  { title: 'Units', key: 'units', width: 48 }, { title: 'Gross kg', key: 'weight', width: 66 },
  { title: 'Volume m3', key: 'volume', width: 68 }
];
const boxColumns = [
  { title: 'Box', key: 'box', width: 80 }, { title: 'Units', key: 'units', width: 90 },
  { title: 'Gross kg', key: 'weight', width: 110 }, { title: 'Dimensions (L x W x H cm)', key: 'dimensions', width: 168 }
];

function drawTableHeader(doc, columns) {
  const xStart = doc.page.margins.left;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const y = doc.y;
  doc.rect(xStart, y, totalWidth, 20).fill(NAVY);
  let x = xStart;
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
  for (const column of columns) {
    doc.text(column.title, x + 3, y + 6, { width: column.width - 6, lineBreak: false });
    x += column.width;
  }
  doc.y = y + 24;
}

function drawTableRow(doc, columns, row, redrawHeader = true) {
  const values = columns.map((column) => clean(row[column.key], 180));
  doc.font('Helvetica').fontSize(7);
  const rowHeight = Math.max(18, ...values.map((value, index) => doc.heightOfString(value, { width: columns[index].width - 6, fontSize: 7, lineGap: 1 }) + 10));
  if (doc.y + rowHeight > pageBottom(doc)) {
    doc.addPage();
    if (redrawHeader) drawTableHeader(doc, columns);
  }
  const y = doc.y;
  let x = doc.page.margins.left;
  values.forEach((value, index) => {
    doc.fillColor(BODY).font('Helvetica').fontSize(7).text(value, x + 3, y + 5, { width: columns[index].width - 6, lineGap: 1 });
    x += columns[index].width;
  });
  doc.moveTo(doc.page.margins.left, y + rowHeight).lineTo(doc.page.margins.left + columns.reduce((sum, column) => sum + column.width, 0), y + rowHeight).strokeColor('#D7DEE7').lineWidth(0.4).stroke();
  doc.y = y + rowHeight + 2;
}

function formatPhone(value) {
  const parsed = parsePhoneNumberFromString(clean(value, 30), 'GB');
  return parsed?.country === 'GB' ? parsed.formatNational() : clean(value, 30);
}

export function generateIntakePdf(intake, { admin = false } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 48, right: 48, bottom: 64, left: 48 }, bufferPages: true, compress: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    try {
      doc.info.Title = 'Inventory Intake Summary';
      doc.rect(0, 0, doc.page.width, 118).fill(NAVY);
      doc.rect(0, 114, doc.page.width, 4).fill(ORANGE);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(clean(env.BUSINESS_NAME || 'Warehouse & Fulfilment', 120), 48, 32, { width: doc.page.width - 96 });
      doc.fontSize(22).text('Inventory Intake Summary', 48, 62, { width: doc.page.width - 96 });
      doc.y = 140;

      writeDetailsRow(doc, 'Reference', intake.reference, 40);
      writeDetailsRow(doc, 'Submitted', londonDate(intake.createdAt || new Date()), 40);
      section(doc, 'Customer details');
      writeDetailsRow(doc, 'Contact person', intake.customer?.contactPerson, 120);
      writeDetailsRow(doc, 'Business name', intake.customer?.businessName, 160);
      writeDetailsRow(doc, 'Phone', formatPhone(intake.customer?.phone), 30);
      writeDetailsRow(doc, 'Email', intake.customer?.email, 254);

      section(doc, 'Overall totals');
      writeDetailsRow(doc, 'SKUs', intake.totals?.skus);
      writeDetailsRow(doc, 'Cartons', intake.totals?.cartons);
      writeDetailsRow(doc, 'Units', intake.totals?.units);
      writeDetailsRow(doc, 'Gross weight', `${fixed(intake.totals?.grossWeightKg, 2)} kg`);
      writeDetailsRow(doc, 'Volume', `${fixed(intake.totals?.volumeM3, 3)} m3`);
      section(doc, 'Services');
      writeDetailsRow(doc, 'Services', getIntakeServiceLabels(intake.services || []).join(', '));

      section(doc, 'Per-SKU breakdown');
      drawTableHeader(doc, skuColumns);
      for (const product of intake.products || []) {
        drawTableRow(doc, skuColumns, {
          sku: product.sku,
          product: `${clean(product.productName, 120)} (${getIntakeCategoryLabel(product.category)})`,
          barcode: product.barcode,
          cartons: product.results?.cartons,
          units: product.results?.units,
          weight: fixed(product.results?.grossWeightKg, 2),
          volume: fixed(product.results?.volumeM3, 3)
        });
      }

      section(doc, 'Dangerous goods and handling (customer declared)');
      for (const product of intake.products || []) {
        if (doc.y + 35 > pageBottom(doc)) doc.addPage();
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text(`${clean(product.sku, 64)} - ${clean(product.productName, 160)}`);
        doc.moveDown(0.25);
        const h = product.hazmat || {}; const handling = product.handling || {}; const amazon = product.amazon || {};
        writeDetailsRow(doc, 'Declared status', DECLARED_HAZMAT_STATUS_LABELS[h.declaredStatus] || h.declaredStatus || 'Not recorded');
        writeDetailsRow(doc, 'Hazard types', (h.hazardTypes || []).map((item) => HAZARD_TYPE_LABELS[item] || item).join(', ') || 'None declared');
        writeDetailsRow(doc, 'SDS status', SDS_STATUS_LABELS[h.sdsStatus] || h.sdsStatus || 'Not recorded');
        writeDetailsRow(doc, 'UN number', h.unNumber); writeDetailsRow(doc, 'Hazard class', HAZARD_CLASS_LABELS[h.hazardClass] || h.hazardClass); writeDetailsRow(doc, 'Packing group', PACKING_GROUP_LABELS[h.packingGroup] || h.packingGroup);
        writeDetailsRow(doc, 'Proper shipping name', h.properShippingName);
        writeDetailsRow(doc, 'Battery', h.battery ? [BATTERY_TYPE_LABELS[h.battery.type], BATTERY_CONFIGURATION_LABELS[h.battery.configuration], h.battery.wattHours != null ? `${fixed(h.battery.wattHours, 2)} Wh` : '', BATTERY_UN383_STATUS_LABELS[h.battery.un383Status]].filter(Boolean).join(', ') : 'None declared');
        writeDetailsRow(doc, 'Storage', (product.storage || []).map((item) => STORAGE_LABELS[item] || item).join(', '));
        writeDetailsRow(doc, 'Physical state', PHYSICAL_STATE_LABELS[handling.physicalState] || handling.physicalState); writeDetailsRow(doc, 'Expiry date', handling.expiryDate);
        writeDetailsRow(doc, 'Leakage or damage risk', LEAKAGE_DAMAGE_RISK_LABELS[handling.leakageOrDamageRisk] || handling.leakageOrDamageRisk || handling.leakageRisk); writeDetailsRow(doc, 'Handling instructions', handling.instructions);
        writeDetailsRow(doc, 'Hazmat instructions', h.instructions);
        writeDetailsRow(doc, 'Amazon', amazon.sellsOnAmazon ? [AMAZON_FULFILMENT_CHANNEL_LABELS[amazon.fulfilmentChannel], AMAZON_LISTING_STATUS_LABELS[amazon.listingStatus], AMAZON_DG_REVIEW_STATUS_LABELS[amazon.dgReviewStatus], AMAZON_COMPLIANCE_DOCS_LABELS[amazon.complianceDocsAvailable], amazon.fnsku, amazon.asin, amazon.instructions].filter(Boolean).join(', ') : 'No');
        if (admin) {
          section(doc, 'Warehouse verification');
          const v = product.verification || {};
          writeDetailsRow(doc, 'Warehouse status', v.warehouseStatus || 'not-reviewed');
          writeDetailsRow(doc, 'SDS verification', v.sdsStatus || 'pending');
          writeDetailsRow(doc, 'Final classification', v.finalClassification || '');
          writeDetailsRow(doc, 'Verified by', v.verifiedBy || '');
          writeDetailsRow(doc, 'Verified at', v.verifiedAt ? londonDate(v.verifiedAt) : '');
          writeDetailsRow(doc, 'Verification notes', v.notes || '');
        }
        doc.moveDown(0.5);
      }

      const individualProducts = (intake.products || []).filter((product) => product.packingMode === 'individual');
      if (individualProducts.length) {
        section(doc, 'Individual carton breakdown');
        for (const product of individualProducts) {
          if (doc.y + 38 > pageBottom(doc)) doc.addPage();
          doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(`${clean(product.sku, 64)} - ${clean(product.productName, 160)}`, doc.page.margins.left, doc.y, { width: doc.page.width - 96 });
          doc.moveDown(0.5);
          drawTableHeader(doc, boxColumns);
          for (const [index, box] of (product.boxes || []).entries()) {
            drawTableRow(doc, boxColumns, {
              box: index + 1,
              units: box.units,
              weight: fixed(box.weightKg, 2),
              box: box.boxNumber ?? index + 1,
              dimensions: `${box.lengthCm} x ${box.widthCm} x ${box.heightCm}`
            });
          }
          doc.moveDown(0.5);
        }
      }

      section(doc, 'Files uploaded');
      for (const product of intake.products || []) {
        const productFiles = (intake.files || []).filter((file) => file.sku === product.sku);
        writeDetailsRow(doc, `${clean(product.sku, 64)} file count`, productFiles.length);
        if (!productFiles.length) writeDetailsRow(doc, 'Files', 'No files uploaded');
        for (const file of productFiles) writeDetailsRow(doc, 'Uploaded file', `${clean(file.kind, 60)}: ${clean(file.originalName, 150)}`);
      }
      const submissionFiles = (intake.files || []).filter((file) => !file.sku);
      for (const file of submissionFiles) writeDetailsRow(doc, 'Submission file', `${clean(file.kind, 60)}: ${clean(file.originalName, 150)}`);
      if (intake.documentsStatus === 'incomplete' || (intake.missingRequiredFiles || []).length) {
        doc.moveDown(0.3).fillColor('#B42318').font('Helvetica-Bold').fontSize(10).text(`Missing required files: ${(intake.missingRequiredFiles || []).map((entry) => `${clean(entry.sku, 64)} (${clean(entry.kind, 60)})`).join(', ') || 'Barcode PDF required for each product'}`, { width: doc.page.width - 96, lineGap: 3 });
      }

      if (intake.additionalInstructions) {
        section(doc, 'Additional instructions');
        doc.fillColor(BODY).font('Helvetica').fontSize(10).text(clean(intake.additionalInstructions), { width: doc.page.width - 96, lineGap: 4 });
      }
      doc.moveDown(0.5).fillColor(BODY).font('Helvetica-Oblique').fontSize(9).text('Quantities and weights are declared by the customer and are subject to physical verification by warehouse staff.', { width: doc.page.width - 96, lineGap: 3 });
      doc.moveDown(0.4).fillColor(BODY).font('Helvetica-Oblique').fontSize(9).text('Hazmat and dangerous goods information is declared by the customer and is subject to verification by the warehouse. Final classification is determined by the warehouse.', { width: doc.page.width - 96, lineGap: 3 });

      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page += 1) {
        doc.switchToPage(page);
        const footerY = doc.page.height - 47;
        doc.moveTo(48, footerY - 8).lineTo(doc.page.width - 48, footerY - 8).strokeColor('#D7DEE7').lineWidth(0.7).stroke();
        doc.fillColor('#566273').font('Helvetica').fontSize(8);
        if (env.BUSINESS_ADDRESS) doc.text(clean(env.BUSINESS_ADDRESS, 300), 48, footerY - 10, { width: doc.page.width - 96, lineBreak: false });
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
