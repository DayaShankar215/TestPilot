import { apiClient } from '../apiClient'

export const testRunsApi = {
  async list(projectId, params = {}) {
    const { data } = await apiClient.get(`/projects/${projectId}/test-runs`, { params })
    return { items: data.data, meta: data.meta }
  },

  async get(runId) {
    const { data } = await apiClient.get(`/test-runs/${runId}`)
    return data.data
  },

  async create(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/test-runs`, payload)
    return data.data
  },

  async update(runId, payload) {
    const { data } = await apiClient.patch(`/test-runs/${runId}`, payload)
    return data.data
  },

  async recordExecution(runId, executionId, payload) {
    const { data } = await apiClient.patch(`/test-runs/${runId}/executions/${executionId}`, payload)
    return data.data
  },
}
