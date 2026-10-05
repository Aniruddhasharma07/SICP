import helmet from 'helmet';
import cors from 'cors';
import { env } from '../../config/env';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
});

const BUILTIN_ALLOWED_ORIGINS = [
  'https://sicp-frontend-zeta.vercel.app',
  'https://sicp-frontend-production.up.railway.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

export const corsMiddleware = cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!requestOrigin) {
      return callback(null, true);
    }
    const configuredOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
    const isAllowed =
      BUILTIN_ALLOWED_ORIGINS.includes(requestOrigin) ||
      configuredOrigins.includes(requestOrigin) ||
      configuredOrigins.includes('*') ||
      /^https:\/\/sicp-frontend.*\.vercel\.app$/i.test(requestOrigin) ||
      (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin));

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id'],
});
