import { apiClient } from '../apiClient'

export const requirementsApi = {
  async list(projectId, params = {}) {
    const { data } = await apiClient.get(`/projects/${projectId}/requirements`, { params })
    return { items: data.data, meta: data.meta }
  },

  async get(requirementId) {
    const { data } = await apiClient.get(`/requirements/${requirementId}`)
    return data.data
  },

  async create(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/requirements`, payload)
    return data.data
  },

  async update(requirementId, payload) {
    const { data } = await apiClient.patch(`/requirements/${requirementId}`, payload)
    return data.data
  },

  async archive(requirementId) {
    const { data } = await apiClient.delete(`/requirements/${requirementId}`)
    return data.data
  },
}
