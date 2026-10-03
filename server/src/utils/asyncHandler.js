/** Wraps async route handlers so rejected promises reach the error handler. */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

/** Standard success envelope. `meta` is only attached for paginated payloads. */
export function sendSuccess(res, { status = 200, message, data = null, meta } = {}) {
  const body = { success: true }
  if (message) body.message = message
  body.data = data
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

export function sendNoContent(res) {
  return res.status(204).end()
}