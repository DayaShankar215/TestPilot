import { apiClient } from '../apiClient'

export const usersApi = {
  async list(params = {}) {
    const { data } = await apiClient.get('/users', { params })
    return data.data
  },
}
