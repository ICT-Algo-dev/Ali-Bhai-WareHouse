import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { maskPersonalData } from '../utils/maskPersonalData.js';

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);
  if (err instanceof ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message })) });
  const suppliedStatus = Number.isInteger(err.statusCode) ? err.statusCode : err.status;
  const status = suppliedStatus === 413 && !Number.isInteger(err.statusCode) ? 400 : Number.isInteger(suppliedStatus) && suppliedStatus >= 400 && suppliedStatus <= 599 ? suppliedStatus : 500;
  if (status >= 500) {
    const logData = {
      errorName: err.name,
      errorMessage: maskPersonalData(err.message || 'Unknown error'),
      requestId: req.id
    };
    if (process.env.NODE_ENV === 'development' && err.stack) logData.stack = maskPersonalData(err.stack);
    logger.error(logData, 'Request failed');
  }
  const bodyLimitKb = Number.isFinite(err.limit) ? Math.ceil(err.limit / 1024) : 10;
  const message = status === 400 && err.status === 413 ? `Request body exceeds the ${bodyLimitKb}kb limit` : status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Request failed');
  return res.status(status).json({ success: false, message, errors: err.errors || [] });
}
