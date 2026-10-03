import { apiClient, unwrap, unwrapList } from '../apiClient'

export const regressionApi = {
  /** Builds a regression plan from a base run plus selected requirements. */
  async createPlan(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/regression/plan`, payload)
    return unwrap(response)
  },

  async plans(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/regression/plans`, { params })
    return unwrapList(response)
  },

  async plan(projectId, planId) {
    const response = await apiClient.get(`/projects/${projectId}/regression/plans/${planId}`)
    return unwrap(response)
  },
}