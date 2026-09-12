import winston from 'winston';

const SENSITIVE_KEYS = new Set(['password', 'passwordhash', 'token', 'refreshtoken', 'secret', 'authorization', 'cookie']);

function sanitizeObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const customFormat = winston.format.printf(({ level, message, timestamp, requestId, ...metadata }) => {
  const sanitizedMeta = sanitizeObject(metadata);
  const metaStr = Object.keys(sanitizedMeta as object).length ? ` ${JSON.stringify(sanitizedMeta)}` : '';
  const reqStr = requestId ? ` [Req: ${requestId}]` : '';
  return `[${timestamp}] [${level.toUpperCase()}]${reqStr}: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? winston.format.json() : customFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});
