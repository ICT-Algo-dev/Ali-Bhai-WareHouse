import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

export function logHoneypot(route) {
  logger.warn({ route, timestamp: new Date().toISOString() }, 'Honeypot field was populated');
}

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.validatedBody = result.data;
    next();
  };
}
export function honeypot(schema, route) {
  return (req, res, next) => {
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      logHoneypot(route);
      return res.status(201).json({ success: true, message: 'Inquiry submitted successfully', data: { id: randomUUID() } });
    }
    return validate(schema)(req, res, next);
  };
}

