import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'

/** Attaches a request id used in logs and the `X-Request-Id` response header. */
export function requestContext(req, res, next) {
  const incoming = req.get('x-request-id')
  req.id = incoming && incoming.length <= 64 ? incoming : crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
}

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`))
}

/**
 * Single exit point for errors: normalises the documented envelope, hides
 * internals in production, and maps Prisma's known error codes.
 */
export function errorHandler(error, req, res, _next) {
  const status = error.status ?? 500
  const code = error.code ?? 'INTERNAL_ERROR'
  const message = status >= 500 && env.isProduction ? 'Something went wrong' : error.message

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[${req.id}] ${req.method} ${req.originalUrl}`, error)
  }

  const fieldErrors = error.details?.fieldErrors ?? null
  const body = {
    success: false,
    message: message || 'Something went wrong',
    errors: fieldErrors ?? undefined,
    error: {
      code,
      message: message || 'Something went wrong',
      ...(fieldErrors ? { fieldErrors } : {}),
    },
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    return mapPrismaError(res, error)
  }

  if (code === 'RATE_LIMITED') {
    return res.status(429).json(body)
  }

  return res.status(status).json(body)
}

function mapPrismaError(res, error) {
  const map = {
    P2002: { status: 409, code: 'CONFLICT', message: 'A record with these values already exists' },
    P2003: { status: 422, code: 'FOREIGN_KEY_CONSTRAINT', message: 'A referenced record does not exist' },
    P2025: { status: 404, code: 'NOT_FOUND', message: 'The requested resource was not found' },
  }
  const mapped = map[error.code] ?? { status: 500, code: 'DATABASE_ERROR', message: 'Database request failed' }

  return res.status(mapped.status).json({
    success: false,
    message: mapped.message,
    error: { code: mapped.code, message: mapped.message },
  })
}