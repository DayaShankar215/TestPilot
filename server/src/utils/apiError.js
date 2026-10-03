/**
 * Error type used by every service. Controllers and the error handler translate
 * these into the documented JSON envelope.
 */
export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  static badRequest(message = 'Malformed request', details) {
    return new ApiError(400, 'BAD_REQUEST', message, details)
  }

  static unauthorized(message = 'Authentication required', details) {
    return new ApiError(401, 'UNAUTHENTICATED', message, details)
  }

  static forbidden(message = 'You do not have permission to perform this action', details) {
    return new ApiError(403, 'FORBIDDEN', message, details)
  }

  /** Also used to conceal records that belong to another workspace. */
  static notFound(message = 'The requested resource was not found', details) {
    return new ApiError(404, 'NOT_FOUND', message, details)
  }

  static conflict(message = 'The request conflicts with the current state', details) {
    return new ApiError(409, 'CONFLICT', message, details)
  }

  static validation(fieldErrors, message = 'Validation failed') {
    return new ApiError(422, 'VALIDATION_ERROR', message, { fieldErrors })
  }

  static tooManyRequests(message = 'Too many requests', details) {
    return new ApiError(429, 'RATE_LIMITED', message, details)
  }

  static internal(message = 'Something went wrong', details) {
    return new ApiError(500, 'INTERNAL_ERROR', message, details)
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', details) {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message, details)
  }
}