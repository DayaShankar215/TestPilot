import { apiClient } from '../apiClient'

export const automationApi = {
  async listJobs(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/automation/jobs`)
    return data.data
  },

  async getJob(jobId) {
    const { data } = await apiClient.get(`/automation/jobs/${jobId}`)
    return data.data
  },

  async startJob(jobId) {
    const { data } = await apiClient.post(`/automation/jobs/${jobId}/run`)
    return data.data
  },

  async rerunJob(jobId) {
    const { data } = await apiClient.post(`/automation/jobs/${jobId}/rerun`)
    return data.data
  },

  async updateJob(jobId, payload) {
    const { data } = await apiClient.patch(`/automation/jobs/${jobId}`, payload)
    return data.data
  },
}
