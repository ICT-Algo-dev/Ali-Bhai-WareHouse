import { Router } from 'express';
import { submitContact } from '../controllers/inquiry.controller.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';
import { honeypot } from '../middleware/validate.js';
import { contactSchema } from '../validators/contact.schema.js';
const router = Router();
router.post('/', submissionLimiter, honeypot(contactSchema, 'contact'), submitContact);
export default router;
