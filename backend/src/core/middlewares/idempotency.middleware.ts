import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only enforce for mutating POST and PUT methods
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return next();
  }

  const idempotencyKey = req.header('Idempotency-Key');
  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return next();
  }

  const key = idempotencyKey.trim();
  const requestId = (res.locals.requestId as string) || 'unknown';

  prisma.idempotencyRecord
    .findUnique({ where: { key } })
    .then(existing => {
      if (existing) {
        // If expired, let it proceed
        if (new Date() > existing.expiresAt) {
          logger.info(`Idempotency key ${key} expired, allowing retry`, { requestId });
          return next();
        }

        logger.info(`Replaying cached response for idempotency key: ${key}`, { requestId });
        res.setHeader('X-Idempotency-Replay', 'true');
        return res.status(existing.responseStatus).json(existing.responseBody);
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
          prisma.idempotencyRecord
            .create({
              data: {
                key,
                endpoint: `${req.method} ${req.originalUrl || req.url}`,
                responseStatus: res.statusCode,
                responseBody: body as object,
                expiresAt,
              },
            })
            .catch(err => {
              logger.error(`Failed to persist idempotency key ${key}: ${err.message}`, { requestId });
            });
        }
        return originalJson(body);
      };

      next();
    })
    .catch(err => {
      logger.error(`Error querying idempotency key: ${err.message}`, { requestId });
      next();
    });
}
