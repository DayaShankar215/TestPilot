import { apiClient, unwrap, unwrapList } from '../apiClient'

export const usersApi = {
  /** Directory search, scoped to the caller's workspaces. */
  async list(params = {}) {
    const response = await apiClient.get('/users', { params })
    return unwrapList(response)
  },

  async profile() {
    const response = await apiClient.get('/users/me')
    return unwrap(response)
  },

  async updateProfile(payload) {
    const response = await apiClient.patch('/users/me', payload)
    return unwrap(response)
  },

  async changePassword(payload) {
    const response = await apiClient.post('/users/me/password', payload)
    return unwrap(response)
  },

  async preferences() {
    const response = await apiClient.get('/users/me/preferences')
    return unwrap(response)
  },

  async updatePreferences(payload) {
    const response = await apiClient.put('/users/me/preferences', payload)
    return unwrap(response)
  },
}