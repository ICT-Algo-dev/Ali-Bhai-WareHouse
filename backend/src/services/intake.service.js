import jwt from 'jsonwebtoken';
import { Counter } from '../models/Counter.js';
import { Intake } from '../models/Intake.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { maskPersonalData } from '../utils/maskPersonalData.js';
import { calculateIntake } from '../utils/intakeCalc.js';
import { sendInquiryNotification } from './mail.service.js';
import { issueUploadToken } from './intake-files.service.js';
import { IntakeFile } from '../models/IntakeFile.js';
import { calculateDocumentsStatus, publicFileRecord } from './intake-files.service.js';

export async function generateIntakeReference(now = new Date()) {
  const latest = await Intake.aggregate([
    { $match: { reference: /^INT-\d{4}-\d+$/ } },
    { $project: { sequence: { $toLong: { $arrayElemAt: [{ $split: ['$reference', '-'] }, 2] } } } },
    { $sort: { sequence: -1 } },
    { $limit: 1 }
  ]);
  try {
    await Counter.findOneAndUpdate(
      { _id: 'intake-reference' },
      { $max: { sequence: Number(latest[0]?.sequence || 0) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Counter.updateOne({ _id: 'intake-reference' }, { $max: { sequence: Number(latest[0]?.sequence || 0) } });
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: 'intake-reference' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `INT-${now.getUTCFullYear()}-${String(counter.sequence).padStart(6, '0')}`;
}

function queueIntakeEmail(intake) {
  const payload = { ...intake.toObject(), id: intake.id, type: 'intake', receivedAt: intake.createdAt };
  setImmediate(() => {
    void (async () => {
      let sent = false;
      try {
        const [files, fileSummary] = await Promise.all([IntakeFile.find({ intakeId: intake._id }).lean(), calculateDocumentsStatus(intake)]);
        sent = await sendInquiryNotification({ ...payload, files: files.map(publicFileRecord), ...fileSummary });
      } catch (error) {
        logger.error({ errorName: error?.name || 'Error', errorMessage: maskPersonalData(error?.message || 'Email delivery failed') }, 'Intake email delivery failed');
      }
      try {
        await Intake.updateOne(
          { _id: intake._id },
          sent
            ? { $set: { emailStatus: 'sent', emailSentAt: new Date() } }
            : { $set: { emailStatus: 'failed' }, $unset: { emailSentAt: 1 } }
        );
      } catch (error) {
        logger.error({ errorName: error?.name || 'Error' }, 'Could not update intake email status');
      }
    })();
  });
}

export async function createIntake(data, req) {
  if (!env.JWT_SECRET) throw new ApiError(503, 'Intake PDF access is not configured');
  const calculations = calculateIntake(data.products);
  const dgProducts = data.products.filter((product) => product.hazmat?.declaredStatus !== 'non-hazmat' || product.hazmat?.hazardTypes?.length || product.storage?.some((item) => ['hazmat-compliant', 'flammable-goods'].includes(item)));
  const reference = await generateIntakeReference();
  const { website, ...fields } = data;
  const now = new Date();
  const intake = await Intake.create({
    ...fields,
    reference,
    products: data.products.map((product, index) => ({ ...product, results: calculations.perSku[index], verification: { warehouseStatus: 'not-reviewed', sdsStatus: product.hazmat?.sdsStatus && product.hazmat.sdsStatus !== 'not-required' ? 'pending' : 'not-required', finalClassification: '', verifiedBy: '', notes: '' } })),
    totals: calculations.totals,
    requiresDgReview: dgProducts.length > 0,
    dgProductCount: dgProducts.length,
    consentAt: now,
    consentVersion: env.PRIVACY_POLICY_VERSION,
    status: 'submitted',
    ip: req.ip?.slice(0, 64),
    userAgent: (req.get('user-agent') || '').slice(0, 500)
  });

  const issuedAt = Math.floor(Date.now() / 1000);
  const pdfToken = jwt.sign({ purpose: 'intake-pdf', reference, iat: issuedAt }, env.JWT_SECRET, { expiresIn: 24 * 60 * 60 });
  const upload = issueUploadToken(reference);
  const pdfExpiresAt = new Date((issuedAt + 24 * 60 * 60) * 1000);
  queueIntakeEmail(intake);
  return { intake, perSku: calculations.perSku, pdfToken, pdfExpiresAt, ...upload };
}

export function verifyIntakePdfToken(token, reference) {
  if (!token || !env.JWT_SECRET) throw new ApiError(401, 'Valid PDF access token required');
  try {
    const claims = jwt.verify(token, env.JWT_SECRET);
    if (claims.purpose !== 'intake-pdf' || claims.reference !== reference) throw new Error('Token does not match the requested intake');
    return claims;
  } catch {
    throw new ApiError(401, 'Invalid or expired PDF access token');
  }
}
