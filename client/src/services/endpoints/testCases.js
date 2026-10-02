import { apiClient } from '../apiClient'

export const testCasesApi = {
  async list(projectId, params = {}) {
    const { data } = await apiClient.get(`/projects/${projectId}/test-cases`, { params })
    return { items: data.data, meta: data.meta }
  },

  async get(testCaseId) {
    const { data } = await apiClient.get(`/test-cases/${testCaseId}`)
    return data.data
  },

  async create(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/test-cases`, payload)
    return data.data
  },

  async update(testCaseId, payload) {
    const { data } = await apiClient.patch(`/test-cases/${testCaseId}`, payload)
    return data.data
  },

  async deprecate(testCaseId) {
    const { data } = await apiClient.delete(`/test-cases/${testCaseId}`)
    return data.data
  },

  async duplicate(testCaseId) {
    const { data } = await apiClient.post(`/test-cases/${testCaseId}/duplicate`)
    return data.data
  },
}
