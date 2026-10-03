import axios from 'axios'
import { readCookie, storage } from './storage'

export const CSRF_COOKIE = 'testpilot_csrf'
export const CSRF_HEADER = 'X-CSRF-Token'

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

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
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  // Required for the HttpOnly session cookie to be sent and stored.
  withCredentials: true,
})

/**
 * Double-submit CSRF: every state-changing request echoes the readable
 * `testpilot_csrf` cookie in a header. Safe endpoints (login, register,
 * password reset) are exempt server-side, so the header is simply omitted when
 * no CSRF cookie exists yet.
 */
apiClient.interceptors.request.use((config) => {
  if (UNSAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
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
    const payload = error.response?.data ?? {}
    const detail = payload.error ?? {}

    const message =
      detail.message ??
      payload.message ??
      error.response?.statusText ??
      (status === 0 ? 'Unable to reach the TestPilot API. Check your connection and try again.' : 'Something went wrong.')

    if (status === 401) {
      storage.clearSession()
      sessionExpiryHandler?.()
    }

    return Promise.reject(
      new ApiError({
        message,
        status,
        code: detail.code ?? error.code,
        fieldErrors: detail.fieldErrors ?? payload.errors ?? null,
        details: detail.details ?? null,
      }),
    )
  },
)

export function unwrap(response) {
  return response.data?.data ?? null
}

export function unwrapList(response) {
  const body = response.data ?? {}
  const data = body.data ?? []
  return {
    items: Array.isArray(data) ? data : (data.items ?? []),
    meta: body.meta ?? data?.meta ?? null,
  }
}

export function buildListParams({ page, pageSize, search, sortBy, sortDir, filters, ...rest } = {}) {
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