import { apiClient, unwrap, unwrapList } from '../apiClient'

export const requirementsApi = {
  async list(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/requirements`, { params })
    return unwrapList(response)
  },

  async get(requirementId) {
    const response = await apiClient.get(`/requirements/${requirementId}`)
    return unwrap(response)
  },

  async create(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/requirements`, payload)
    return unwrap(response)
  },

  async update(requirementId, payload) {
    const response = await apiClient.patch(`/requirements/${requirementId}`, payload)
    return unwrap(response)
  },

  /** Spec defines DELETE as a soft archive. */
  async archive(requirementId) {
    const response = await apiClient.delete(`/requirements/${requirementId}`)
    return unwrap(response)
  },

  async history(requirementId) {
    const response = await apiClient.get(`/requirements/${requirementId}/history`)
    return unwrapList(response)
  },

  async testCases(requirementId, params = {}) {
    const response = await apiClient.get(`/requirements/${requirementId}/test-cases`, { params })
    return unwrapList(response)
  },
}