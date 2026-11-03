import { Router } from 'express';
import { deleteCustomerIntakeFile, getCustomerIntakeFiles, getIntakePdfByToken, submitIntake, uploadIntakeFile } from '../controllers/intake.controller.js';
import { intakeLimiter, intakeUploadLimiter } from '../middleware/rateLimiter.js';
import { logHoneypot, validate } from '../middleware/validate.js';
import { intakeSchema } from '../validators/intake.schema.js';
import { receiveIntakeUpload, requireIntakeUploadToken } from '../middleware/intake-upload.js';

const router = Router();
router.post('/', intakeLimiter, (req, res, next) => {
  if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
    logHoneypot('intakes');
    return res.status(201).json({ success: true, message: 'Inventory intake submitted successfully', data: { id: 'accepted' } });
  }
  next();
}, validate(intakeSchema), submitIntake);
router.get('/:reference/pdf', getIntakePdfByToken);
router.post('/:reference/files', intakeUploadLimiter, requireIntakeUploadToken, receiveIntakeUpload, uploadIntakeFile);
router.get('/:reference/files', requireIntakeUploadToken, getCustomerIntakeFiles);
router.delete('/:reference/files/:fileId', requireIntakeUploadToken, deleteCustomerIntakeFile);
export default router;
