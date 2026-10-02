import { apiClient } from '../apiClient'
import { storage } from '../storage'

export const authApi = {
  async login(credentials) {
    const { data } = await apiClient.post('/auth/login', credentials)
    storage.setToken(data.data.token)
    storage.setUser(data.data.user)
    return data.data
  },

  async register(payload) {
    const { data } = await apiClient.post('/auth/register', payload)
    storage.setToken(data.data.token)
    storage.setUser(data.data.user)
    return data.data
  },

  async requestPasswordReset(email) {
    const { data } = await apiClient.post('/auth/forgot-password', { email })
    return data.data
  },

  async resetPassword(payload) {
    const { data } = await apiClient.post('/auth/reset-password', payload)
    return data.data
  },

  async changePassword(payload) {
    const { data } = await apiClient.post('/auth/change-password', payload)
    return data.data
  },

  async me() {
    const { data } = await apiClient.get('/auth/me')
    const user = data.data
    storage.setUser(user)
    return user
  },

  async updateProfile(payload) {
    const { data } = await apiClient.patch('/auth/me', payload)
    storage.setUser(data.data)
    return data.data
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      storage.clearSession()
    }
  },
}
