import axios from 'axios'
import { resolveHandler } from './mock/adapter'
import { storage } from './storage'

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

const mockSession = { user: storage.getUser() }

function stripBasePath(path) {
  return path.replace(/^\/api\/v\d+/, '') || '/'
}

const mockAdapter = async (config) => {
  const method = config.method?.toUpperCase() ?? 'GET'
  const basePath = config.baseURL ?? ''
  const fullUrl = `${basePath}${config.url ?? ''}`

  let pathname = fullUrl.split('?')[0]
  try {
    pathname = new URL(fullUrl, typeof window === 'undefined' ? 'http://localhost' : window.location.origin).pathname
  } catch {
    pathname = fullUrl.split('?')[0]
  }

  const path = stripBasePath(pathname || '/')
  const queryFromUrl = fullUrl.includes('?') ? fullUrl.slice(fullUrl.indexOf('?') + 1) : ''
  const params = {
    ...Object.fromEntries(new URLSearchParams(queryFromUrl)),
    ...(config.params ?? {}),
  }

  let body = config.data
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body)
    } catch {
      body = config.data
    }
  }

  const match = resolveHandler(method, path)

  const toEnvelope = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'data' in value) return value
    return { data: value }
  }

  const respond = (payload) => ({
    data: toEnvelope(payload.data),
    status: payload.status ?? 200,
    statusText: payload.status === 201 ? 'Created' : payload.status === 202 ? 'Accepted' : 'OK',
    headers: { 'content-type': 'application/json', 'x-testpilot-mock': 'true' },
    config,
  })

  await new Promise((resolve) => {
    setTimeout(resolve, 180 + Math.random() * 260)
  })

  if (!match) {
    const error = new Error(`No mock handler for ${method} ${path}`)
    error.status = 404
    error.code = 'NOT_FOUND'
    error.config = config
    error.isAxiosError = true
    error.response = {
      data: { error: { code: 'NOT_FOUND', message: `Mock handler not found: ${method} ${path}` } },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
    }
    throw error
  }

  try {
    const result = match.handler({ params: { ...params, ...match.params }, body, state: mockSession, config })
    if (result.delay) await new Promise((resolve) => setTimeout(resolve, result.delay))
    if (method === 'POST' && /login|register/.test(path) && result.data?.user) {
      mockSession.user = result.data.user
    }
    if (method === 'GET' && path === '/auth/me' && result.data) {
      mockSession.user = result.data
    }
    if (method === 'PATCH' && path === '/auth/me' && result.data) {
      mockSession.user = result.data
    }
    return respond(result)
  } catch (thrown) {
    const status = thrown.status ?? 500
    const error = new Error(thrown.message)
    error.status = status
    error.code = thrown.code ?? 'INTERNAL_ERROR'
    error.config = config
    error.isAxiosError = true
    error.response = {
      data: {
        error: {
          code: error.code,
          message: thrown.message,
          fieldErrors: thrown.fieldErrors ?? undefined,
        },
      },
      status,
      statusText: String(status),
      headers: {},
      config,
    }
    throw error
  }
}

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
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  ...(USE_MOCK_API ? { adapter: mockAdapter } : {}),
})

apiClient.interceptors.request.use((config) => {
  const token = storage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
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
      (status === 0 ? 'Unable to reach the TestPilot API. Check your connection and try again.' : 'Something went wrong.')

    if (status === 401) {
      storage.clearSession()
      mockSession.user = null
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

export const mockSessionState = mockSession
