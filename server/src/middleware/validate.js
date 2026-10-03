import { ZodError } from 'zod'
import { ApiError } from '../utils/apiError.js'

/**
 * Translates a ZodError into the documented field-error array. Nested paths are
 * flattened (`steps.0.action`) so the UI can attach messages to inputs.
 */
export function fieldErrorsFromZod(error) {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '_root',
    message: issue.message,
  }))
}

/**
 * `validate({ body, query, params })` middleware. Parsed output replaces the
 * raw request values so handlers always receive coerced, trimmed data.
 */
export function validate(schemas) {
  return function validateRequest(req, _res, next) {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params)
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query)
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true })
      }
      if (schemas.body) req.body = schemas.body.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(ApiError.validation(fieldErrorsFromZod(error)))
        return
      }
      next(error)
    }
  }
}