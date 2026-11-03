import rateLimit from 'express-rate-limit';
const handler = (_req, res) => res.status(429).json({ success: false, message: 'Too many requests. Please try again later.', errors: [] });
export const submissionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, handler });
export const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false, handler, skip: (req) => req.method === 'POST' && (['/contact', '/quotes', '/intakes'].includes(req.path) || req.path.startsWith('/intakes/')) });
export const intakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, handler });
export const intakeUploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, handler });
