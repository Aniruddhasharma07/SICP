# SICP API Contract & Conventions Standard

All endpoints follow RESTful standards and are prefixed with `/api/v1/...`.

## 1. Response Envelope
Every API response adheres to the immutable `ApiResponse<T>` contract:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "fe-1773259400-abc12",
    "timestamp": "2026-09-11T01:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Invalid state transition from 'DRAFT' to 'APPROVED'",
    "details": {
      "fromState": "DRAFT",
      "toState": "APPROVED"
    },
    "requestId": "fe-1773259400-abc12"
  },
  "meta": {
    "requestId": "fe-1773259400-abc12",
    "timestamp": "2026-09-11T01:30:00.000Z"
  }
}
```

## 2. Standard Machine-Readable Error Codes
- `VALIDATION_ERROR` (400): Zod schema validation failed.
- `UNAUTHORIZED` (401): Missing, invalid, or expired JWT.
- `FORBIDDEN` (403): Role lacks required granular permission.
- `NOT_FOUND` (404): Requested entity does not exist.
- `CONFLICT` (409): Unique constraint violation (e.g. duplicate email or slug).
- `INVALID_STATE_TRANSITION` (400): Transition path not permitted by domain state machine.
- `RESOURCE_VERSION_CONFLICT` (409): Optimistic locking conflict (concurrent modification).
- `DEPENDENCY_UNAVAILABLE` (503): Redis, BullMQ, or database temporarily unreachable.
- `AI_UNAVAILABLE` (503): Gemini unconfigured or unreachable (no fake production output).
- `RATE_LIMITED` (429): Rate limit exceeded.
- `INTERNAL_ERROR` (500): Unhandled server exception.

## 3. Mandatory Request Headers
- `X-Request-Id`: Unique correlation UUID for end-to-end tracing.
- `Idempotency-Key`: Required for critical mutating POST/PUT actions to prevent double-submit.