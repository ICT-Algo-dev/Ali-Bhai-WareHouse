import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Inquiry } from '../models/Inquiry.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });
const statusSchema = z.object({ status: z.enum(['new', 'contacted', 'qualified', 'closed']) });
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emptyToUndefined = (schema) => z.preprocess((value) => value === '' ? undefined : value, schema);

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Invalid email or password', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH || !env.JWT_SECRET) throw new ApiError(503, 'Admin login is not configured');
  const emailMatches = parsed.data.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  const passwordMatches = await bcrypt.compare(parsed.data.password, env.ADMIN_PASSWORD_HASH).catch(() => false);
  if (!emailMatches || !passwordMatches) throw new ApiError(401, 'Invalid email or password');
  const token = jwt.sign({ role: 'admin', email: env.ADMIN_EMAIL }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  res.json({ success: true, data: { token, tokenType: 'Bearer', expiresIn: env.JWT_EXPIRES_IN } });
});

export const listInquiries = asyncHandler(async (req, res) => {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: emptyToUndefined(z.enum(['contact', 'quote']).optional()),
    status: emptyToUndefined(z.enum(['new', 'contacted', 'qualified', 'closed']).optional()),
    search: emptyToUndefined(z.string().trim().max(200).optional())
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, 'Invalid query parameters', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const { page, limit, type, status, search } = parsed.data;
  const searchFilter = search ? { $or: ['fullName', 'contactPerson', 'businessName', 'email', 'phone'].map((field) => ({ [field]: new RegExp(escapeRegex(search), 'i') })) } : {};
  const filter = { ...(type ? { type } : {}), ...(status ? { status } : {}), ...searchFilter };
  const [items, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Inquiry.countDocuments(filter)
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
});

export const updateInquiryStatus = asyncHandler(async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Invalid status', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new ApiError(400, 'Invalid inquiry ID', [{ field: 'id', message: 'Must be a MongoDB ObjectId' }]);
  const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status: parsed.data.status }, { new: true, runValidators: true });
  if (!inquiry) throw new ApiError(404, 'Inquiry not found');
  res.json({ success: true, data: { id: inquiry.id, status: inquiry.status } });
});

export const deleteInquiry = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new ApiError(400, 'Invalid inquiry ID', [{ field: 'id', message: 'Must be a MongoDB ObjectId' }]);
  const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
  if (!inquiry) throw new ApiError(404, 'Inquiry not found');
  res.json({ success: true, message: 'Inquiry deleted successfully', data: { id: inquiry.id } });
});
