import { Inquiry } from '../models/Inquiry.js';
import { sendInquiryNotification } from './mail.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { maskPersonalData } from '../utils/maskPersonalData.js';

function queueInquiryNotification(inquiry) {
  const payload = { ...inquiry.toObject(), id: inquiry.id, receivedAt: inquiry.createdAt };
  setImmediate(() => {
    void (async () => {
      let sent = false;
      try {
        sent = await sendInquiryNotification(payload);
      } catch (error) {
        logger.error({ errorName: error?.name || 'Error', errorMessage: maskPersonalData(error?.message || 'Email delivery failed') }, 'Enquiry email delivery failed');
      }

      try {
        await Inquiry.updateOne(
          { _id: inquiry._id },
          sent
            ? { $set: { emailStatus: 'sent', emailSentAt: new Date() } }
            : { $set: { emailStatus: 'failed' }, $unset: { emailSentAt: 1 } }
        );
      } catch (error) {
        logger.error({ errorName: error?.name || 'Error' }, 'Could not update enquiry email status');
      }
    })();
  });
}

export async function createInquiry(type, data, req) {
  const { website, ...fields } = data;
  const inquiry = await Inquiry.create({
    ...fields,
    type,
    consentAt: new Date(),
    consentVersion: env.PRIVACY_POLICY_VERSION,
    ip: req.ip?.slice(0, 64),
    userAgent: (req.get('user-agent') || '').slice(0, 500)
  });
  queueInquiryNotification(inquiry);
  return inquiry;
}
