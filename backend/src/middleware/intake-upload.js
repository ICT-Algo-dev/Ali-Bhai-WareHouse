import multer from 'multer';
import path from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyUploadToken } from '../services/intake-files.service.js';

const tempDirectory = path.join(env.UPLOADS_DIR, 'tmp');
const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try { await mkdir(tempDirectory, { recursive: true, mode: 0o700 }); callback(null, tempDirectory); }
    catch { callback(new ApiError(500, 'Upload storage is unavailable')); }
  },
  filename: (_req, _file, callback) => callback(null, `${randomUUID()}.upload`)
});
const uploadOne = multer({ storage, limits: { fileSize: env.UPLOAD_MAX_FILE_MB * 1024 * 1024, files: 1, fields: 2, parts: 3 } }).single('file');

export function requireIntakeUploadToken(req, _res, next) {
  try {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer') throw new ApiError(401, 'Upload token required');
    req.uploadClaims = verifyUploadToken(token, req.params.reference);
    next();
  } catch (error) { next(error); }
}

export function receiveIntakeUpload(req, res, next) {
  uploadOne(req, res, async (error) => {
    if (error) {
      if (req.file?.path) await rm(req.file.path, { force: true }).catch(() => {});
      if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, `File exceeds the ${env.UPLOAD_MAX_FILE_MB} MB size limit`));
      if (['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code)) return next(new ApiError(400, 'Upload exactly one file in the multipart field "file"'));
      if (error.name === 'MulterError') return next(new ApiError(400, 'Invalid multipart upload fields or format'));
      return next(error);
    }
    if (!req.file) return next(new ApiError(400, 'A file is required in the multipart field "file"'));
    next();
  });
}
