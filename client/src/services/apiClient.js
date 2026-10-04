import axios from 'axios'
import { storage, readCookie } from './storage'

/** Cookie name must match CSRF_COOKIE_NAME on the server. */
const CSRF_COOKIE = 'testpilot_csrf'
const CSRF_HEADER = 'X-CSRF-Token'
const SAFE_METHODS = new Set(['get', 'head', 'options'])

export class ApiError extends Error {
  constructor({ message, status, code, fieldErrors, details }) {
    super(message)
    this.name = 'ApiError'
    this.status = status ?? 0
    this.code = code ?? 'UNKNOWN_ERROR'
    this.fieldErrors = fieldErrors ?? null
    this.details = details ?? null
  }

  get isNetworkError() {
    return this.status === 0
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isValidation() {
    return this.status === 422 || this.status === 400
  }

  get isServerError() {
    return this.status >= 500
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
  // The session id lives in an HttpOnly cookie; it must ride along on every call.
  withCredentials: true,
})

/**
 * Mutating calls need the CSRF token issued next to the session cookie. The
 * server compares it against the session row, so it must be re-read per request
 * in case the session was refreshed.
 */
apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (!SAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE)
    if (token) config.headers[CSRF_HEADER] = token
  }
  return config
})

let sessionExpiryHandler = null

export function onSessionExpired(handler) {
  sessionExpiryHandler = handler
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject({ cancelled: true })
    }

    const status = error.response?.status ?? 0
    const payload = error.response?.data?.error ?? error.response?.data ?? {}

    const message =
      payload?.message ??
      error.response?.statusText ??
      (status === 0
        ? 'Unable to reach the TestPilot API. Check your connection and try again.'
        : 'Something went wrong.')

    if (status === 401) {
      storage.clearSession()
      sessionExpiryHandler?.()
    }

    return Promise.reject(
      new ApiError({
        message,
        status,
        code: payload?.code ?? error.code,
        fieldErrors: payload?.fieldErrors ?? null,
        details: payload?.details ?? null,
      }),
    )
  },
)

/** Unwraps `{ success, data }` so callers deal in domain objects. */
export function unwrap(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'data' in body) return body.data
  return body
}

/** Unwraps list envelopes into `{ items, meta }`. */
export function unwrapList(response) {
  const body = response?.data
  const data = body && typeof body === 'object' && 'data' in body ? body.data : body
  const items = Array.isArray(data) ? data : (data?.items ?? [])
  const meta = data?.meta ?? body?.meta ?? null
  return { items, meta }
}

export function buildListParams({ page, pageSize, search, sortBy, sortDir, filters, ...rest }) {
  return {
    page,
    pageSize,
    search,
    sortBy,
    sortDir,
    ...filters,
    ...rest,
  }
}

export function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, String(value))
  })
  return search.toString()
}