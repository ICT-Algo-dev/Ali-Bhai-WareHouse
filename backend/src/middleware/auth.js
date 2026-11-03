import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
export function requireAdmin(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token || !env.JWT_SECRET) return next(new ApiError(401, 'Authentication required'));
  try { const payload = jwt.verify(token, env.JWT_SECRET); if (payload.role !== 'admin') throw new Error('Invalid role'); req.admin = payload; next(); }
  catch { next(new ApiError(401, 'Invalid or expired token')); }
}
