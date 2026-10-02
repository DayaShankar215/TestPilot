import { apiClient } from '../apiClient'

export const dashboardApi = {
  async summary(params = {}) {
    const { data } = await apiClient.get('/dashboard/summary', { params })
    return data.data
  },
}

export const reportsApi = {
  async summary(projectId, params = {}) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/summary`, { params })
    return data.data
  },

  async coverage(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/coverage`)
    return data.data
  },

  async defectAging(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/defect-aging`)
    return data.data
  },

  async releaseReadiness(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/release-readiness`)
    return data.data
  },
}
