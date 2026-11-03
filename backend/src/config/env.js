import 'dotenv/config';
import { z } from 'zod';
import path from 'node:path';
import { STORAGE_PROVIDERS } from '../constants/intake.js';

const optionalTrimmed = z.string().trim().optional().transform((v) => v || undefined);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  FORCE_HTTPS: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),
  FRONTEND_DIST_DIR: z.string().trim().min(1).default('dist').transform((value) => path.resolve(process.cwd(), value)),
  MONGODB_URI: optionalTrimmed,
  CORS_ORIGINS: z.string().default(''),
  JWT_SECRET: optionalTrimmed,
  JWT_EXPIRES_IN: z.string().default('8h'),
  SMTP_HOST: optionalTrimmed,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),
  SMTP_USER: optionalTrimmed,
  SMTP_PASSWORD: optionalTrimmed,
  SMTP_FROM: optionalTrimmed,
  BUSINESS_NAME: optionalTrimmed,
  BUSINESS_ADDRESS: z.string().trim().max(300).default(''),
  NOTIFY_EMAIL: optionalTrimmed,
  ADMIN_EMAIL: optionalTrimmed,
  ADMIN_PASSWORD_HASH: optionalTrimmed,
  PRIVACY_POLICY_VERSION: z.string().trim().min(1).default('1.0'),
  INQUIRY_RETENTION_DAYS: z.coerce.number().int().min(1).max(36500).default(730),
  STORAGE_PROVIDER: z.enum(STORAGE_PROVIDERS).default('local'),
  UPLOADS_DIR: z.string().trim().default(path.resolve(process.cwd(), 'private-uploads')).refine((value) => path.isAbsolute(value), 'must be an absolute path').transform((value) => path.resolve(value)),
  UPLOAD_MAX_FILE_MB: z.coerce.number().int().min(1).max(100).default(10),
  UPLOAD_MAX_FILES_PER_INTAKE: z.coerce.number().int().min(1).max(1000).default(200),
  UPLOAD_MAX_FILES_PER_PRODUCT: z.coerce.number().int().min(1).max(200).default(20),
  UPLOAD_MAX_TOTAL_MB_PER_INTAKE: z.coerce.number().int().min(1).max(10000).default(150),
  PDF_REJECT_ACTIVE_CONTENT: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  FRONTEND_URL: optionalTrimmed.refine((value) => value === undefined || /^https?:\/\//i.test(value), 'must be an HTTP(S) URL'),
  CLAMAV_HOST: optionalTrimmed,
  CLAMAV_PORT: z.coerce.number().int().min(1).max(65535).default(3310)
}).superRefine((env, ctx) => {
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'must be at least 32 characters' });
  if (env.NODE_ENV === 'production' && !env.JWT_SECRET) ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'is required in production' });
  if (Boolean(env.ADMIN_EMAIL) !== Boolean(env.ADMIN_PASSWORD_HASH)) ctx.addIssue({ code: 'custom', path: ['ADMIN_EMAIL'], message: 'ADMIN_EMAIL and ADMIN_PASSWORD_HASH must both be configured' });
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
export const env = Object.freeze({ ...parsed.data, CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) });
