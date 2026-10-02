import { apiClient } from '../apiClient'

export const regressionApi = {
  async changeSets(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/regression/change-sets`)
    return data.data
  },

  async changeSet(projectId, changeSetId) {
    const { data } = await apiClient.get(`/projects/${projectId}/regression/change-sets/${changeSetId}`)
    return data.data
  },

  async saveSuite(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/regression/suites`, payload)
    return data.data
  },
}
