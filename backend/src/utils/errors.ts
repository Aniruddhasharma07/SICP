import { StandardErrorCode } from '@sicp/shared';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: StandardErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: StandardErrorCode = StandardErrorCode.INTERNAL_ERROR,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, StandardErrorCode.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 401, StandardErrorCode.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied', details?: unknown) {
    super(message, 403, StandardErrorCode.FORBIDDEN, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    const msg = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(msg, 404, StandardErrorCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, StandardErrorCode.CONFLICT, details);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(fromState: string, toState: string, reason?: string) {
    const msg = `Invalid state transition from '${fromState}' to '${toState}'${reason ? `: ${reason}` : ''}`;
    super(msg, 400, StandardErrorCode.INVALID_STATE_TRANSITION, { fromState, toState, reason });
  }
}

export class DependencyUnavailableError extends AppError {
  constructor(dependency: string, actionDescription: string) {
    const msg = `Required dependency '${dependency}' is currently unavailable for action '${actionDescription}'`;
    super(msg, 503, StandardErrorCode.DEPENDENCY_UNAVAILABLE, { dependency, actionDescription });
  }
}

export class ResourceVersionConflictError extends AppError {
  constructor(resource: string, id: string) {
    const msg = `Conflict: ${resource} '${id}' was modified by another concurrent action. Please reload and retry.`;
    super(msg, 409, StandardErrorCode.RESOURCE_VERSION_CONFLICT, { resource, id });
  }
}

export class AiUnavailableError extends AppError {
  constructor(message: string = 'AI analysis service is unavailable or unconfigured') {
    super(message, 503, StandardErrorCode.AI_UNAVAILABLE);
  }
}
