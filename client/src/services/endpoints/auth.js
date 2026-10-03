import { apiClient, unwrap } from '../apiClient'

export const authApi = {
  /** The session arrives as an HttpOnly cookie; only the user is returned. */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials)
    return unwrap(response)
  },

  async register(payload) {
    const response = await apiClient.post('/auth/register', payload)
    return unwrap(response)
  },

  async logout() {
    const response = await apiClient.post('/auth/logout')
    return unwrap(response)
  },

  /** Returns `{ user, preferences, memberships }` for the current session. */
  async me() {
    const response = await apiClient.get('/auth/me')
    return unwrap(response)
  },

  /** Cheap heartbeat that rotates the cookie only when it nears expiry. */
  async refresh() {
    const response = await apiClient.post('/auth/refresh')
    return unwrap(response)
  },

  async requestPasswordReset(email) {
    const response = await apiClient.post('/auth/forgot-password', { email })
    return unwrap(response)
  },

  async resetPassword(payload) {
    const response = await apiClient.post('/auth/reset-password', payload)
    return unwrap(response)
  },

  async listSessions() {
    const response = await apiClient.get('/auth/sessions')
    return unwrap(response)
  },

  async revokeSession(sessionId) {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}`)
    return unwrap(response)
  },
}