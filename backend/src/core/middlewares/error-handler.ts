import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../utils/errors';
import { sendError } from '../../utils/response';
import { logger } from '../../utils/logger';
import { StandardErrorCode } from '@sicp/shared';

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = (res.locals.requestId as string) || req.header('X-Request-Id') || 'unknown';

  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      details: err.details,
      requestId,
      path: req.path,
      method: req.method,
    });
    sendError(res, err.statusCode, {
      code: err.errorCode,
      message: err.message,
      details: err.details,
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    const formatted = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn(`Validation Error on ${req.method} ${req.path}`, {
      errors: formatted,
      requestId,
    });
    // Produce a direct, field-informative summary instead of an opaque generic message
    const humanReadableMessage =
      formatted.map(f => f.message).join('. ') || 'Request payload validation failed';

    sendError(res, 400, {
      code: StandardErrorCode.VALIDATION_ERROR,
      message: humanReadableMessage,
      details: formatted,
      requestId,
    });
    return;
  }

  // Database Connection / Initialization Failure (e.g. Postgres server down)
  if (
    err.name === 'PrismaClientInitializationError' ||
    err.message?.includes("Can't reach database server") ||
    (err as unknown as { code?: string }).code === 'P1001'
  ) {
    logger.warn(`Database connection unavailable: ${err.message}`, { requestId });
    sendError(res, 503, {
      code: StandardErrorCode.DEPENDENCY_UNAVAILABLE,
      message: 'The PostgreSQL database server is currently unreachable. Please ensure PostgreSQL is running or set a valid DATABASE_URL in .env.',
      details: { dependency: 'PostgreSQL Database' },
      requestId,
    });
    return;
  }

  // Unhandled / Internal Server Error
  logger.error(`Unhandled Exception: ${err.message}`, {
    stack: err.stack,
    requestId,
    path: req.path,
    method: req.method,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  sendError(res, 500, {
    code: StandardErrorCode.INTERNAL_ERROR,
    message: isProduction ? 'An unexpected internal server error occurred.' : err.message,
    details: isProduction ? undefined : { stack: err.stack },
    requestId,
  });
}
