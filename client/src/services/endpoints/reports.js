import { apiClient, unwrap } from '../apiClient'

export const reportsApi = {
  async execution(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/reports/execution`, { params })
    return unwrap(response)
  },

  async coverage(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/reports/coverage`, { params })
    return unwrap(response)
  },

  /** Defect analytics (aging, by severity, by module). */
  async defects(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/reports/defects`, { params })
    return unwrap(response)
  },

  async releaseReadiness(projectId) {
    const response = await apiClient.get(`/projects/${projectId}/reports/release-readiness`)
    return unwrap(response)
  },
}