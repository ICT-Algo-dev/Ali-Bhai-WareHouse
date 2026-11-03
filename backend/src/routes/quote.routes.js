import { Router } from 'express';
import { submitQuote } from '../controllers/inquiry.controller.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';
import { honeypot } from '../middleware/validate.js';
import { quoteSchema } from '../validators/quote.schema.js';
const router = Router();
router.post('/', submissionLimiter, honeypot(quoteSchema, 'quotes'), submitQuote);
export default router;
