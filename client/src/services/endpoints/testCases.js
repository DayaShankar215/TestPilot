import { apiClient, unwrap, unwrapList } from '../apiClient'

export const testCasesApi = {
  async list(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/test-cases`, { params })
    return unwrapList(response)
  },

  async get(projectId, testCaseId) {
    const response = await apiClient.get(`/projects/${projectId}/test-cases/${testCaseId}`)
    return unwrap(response)
  },

  async create(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/test-cases`, payload)
    return unwrap(response)
  },

  async update(projectId, testCaseId, payload) {
    const response = await apiClient.patch(`/projects/${projectId}/test-cases/${testCaseId}`, payload)
    return unwrap(response)
  },

  async deprecate(projectId, testCaseId) {
    const response = await apiClient.delete(`/projects/${projectId}/test-cases/${testCaseId}`)
    return unwrap(response)
  },

  async clone(projectId, testCaseId, payload = {}) {
    const response = await apiClient.post(`/projects/${projectId}/test-cases/${testCaseId}/clone`, payload)
    return unwrap(response)
  },

  /** Replaces the requirements linked to a test case. */
  async setRequirements(projectId, testCaseId, requirementIds) {
    const response = await apiClient.put(`/projects/${projectId}/test-cases/${testCaseId}/requirements`, {
      requirementIds,
    })
    return unwrap(response)
  },

  async history(projectId, testCaseId) {
    const response = await apiClient.get(`/projects/${projectId}/test-cases/${testCaseId}/history`)
    return unwrapList(response)
  },
}