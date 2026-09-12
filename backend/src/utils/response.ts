import { Response } from 'express';
import { ApiResponse, ApiError } from '@sicp/shared';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  extraMeta?: Record<string, unknown>
): Response {
  const requestId = (res.locals?.requestId as string) || 'req-unknown';
  const responsePayload: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...extraMeta,
    },
  };
  return res.status(statusCode).json(responsePayload);
}

export function sendError(
  res: Response,
  statusCode: number,
  error: ApiError,
  extraMeta?: Record<string, unknown>
): Response {
  const requestId = (res.locals?.requestId as string) || error.requestId || 'req-unknown';
  const responsePayload: ApiResponse<never> = {
    success: false,
    error: {
      ...error,
      requestId,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...extraMeta,
    },
  };
  return res.status(statusCode).json(responsePayload);
}
