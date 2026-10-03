import { apiClient, unwrap, unwrapList } from '../apiClient'

export const testRunsApi = {
  async list(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/test-runs`, { params })
    return unwrapList(response)
  },

  async get(projectId, runId) {
    const response = await apiClient.get(`/projects/${projectId}/test-runs/${runId}`)
    return unwrap(response)
  },

  async create(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/test-runs`, payload)
    return unwrap(response)
  },

  async update(projectId, runId, payload) {
    const response = await apiClient.patch(`/projects/${projectId}/test-runs/${runId}`, payload)
    return unwrap(response)
  },

  async results(projectId, runId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/test-runs/${runId}/results`, { params })
    return unwrapList(response)
  },

  async recordResult(projectId, runId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/test-runs/${runId}/results`, payload)
    return unwrap(response)
  },

  async updateResult(resultId, payload) {
    const response = await apiClient.patch(`/test-results/${resultId}`, payload)
    return unwrap(response)
  },
}