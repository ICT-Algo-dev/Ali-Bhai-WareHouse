import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { logger } from './utils/logger.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use((req, res, next) => { req.id = randomUUID(); res.setHeader('X-Request-Id', req.id); next(); });
const forceHttps = env.NODE_ENV === 'production' && env.FORCE_HTTPS;
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      // Admin document previews open PDF blobs in a browser frame.
      frameSrc: ['https://www.google.com', 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: forceHttps ? [] : null
    }
  },
  hsts: forceHttps ? { maxAge: 31536000, includeSubDomains: true } : false
}));
app.use(cors({ origin(origin, callback) {
  if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(compression());
app.use('/api/v1/intakes', express.json({ limit: '256kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(mongoSanitize());
app.use(hpp());
app.use(morgan(':method :status :response-time ms', { stream: { write: (line) => process.stdout.write(line) } }));
app.use('/api/v1', generalLimiter, apiRoutes);
// Keep all API paths out of the SPA fallback, including unknown API versions/routes.
app.use('/api', notFound);

const frontendIndex = path.join(env.FRONTEND_DIST_DIR, 'index.html');
const frontendAvailable = existsSync(frontendIndex);
if (!frontendAvailable && env.NODE_ENV === 'production') {
  logger.warn({ frontendDistDir: env.FRONTEND_DIST_DIR }, 'Frontend dist/index.html is missing; only the API is available');
}
if (frontendAvailable) {
  app.use(express.static(env.FRONTEND_DIST_DIR, {
    index: false,
    dotfiles: 'deny',
    setHeaders(res, filePath) {
      const relativePath = path.relative(env.FRONTEND_DIST_DIR, filePath).split(path.sep).join('/');
      if (relativePath.startsWith('assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else res.setHeader('Cache-Control', 'no-cache');
    }
  }));
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path === '/api' || req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(frontendIndex, { cacheControl: false }, (error) => { if (error) next(error); });
  });
}
app.use(notFound);
app.use(errorHandler);
