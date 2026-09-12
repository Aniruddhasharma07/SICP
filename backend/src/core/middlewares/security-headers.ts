import helmet from 'helmet';
import cors from 'cors';
import { env } from '../../config/env';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
});

export const corsMiddleware = cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!requestOrigin) {
      return callback(null, true);
    }
    const configuredOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    if (configuredOrigins.includes(requestOrigin) || configuredOrigins.includes('*')) {
      return callback(null, true);
    }
    // In non-production, allow any localhost or 127.0.0.1 port
    if (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id'],
});
