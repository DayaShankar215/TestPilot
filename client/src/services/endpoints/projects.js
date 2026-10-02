import { apiClient } from '../apiClient'

export const projectsApi = {
  async list(params = {}) {
    const { data } = await apiClient.get('/projects', { params })
    return { items: data.data, meta: data.meta }
  },

  async get(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}`)
    return data.data
  },

  async create(payload) {
    const { data } = await apiClient.post('/projects', payload)
    return data.data
  },

  async update(projectId, payload) {
    const { data } = await apiClient.patch(`/projects/${projectId}`, payload)
    return data.data
  },

  async archive(projectId) {
    const { data } = await apiClient.delete(`/projects/${projectId}`)
    return data.data
  },

  async overview(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/overview`)
    return data.data
  },

  async activity(projectId, limit = 30) {
    const { data } = await apiClient.get(`/projects/${projectId}/activity`, { params: { limit } })
    return data.data
  },
}
