import { apiClient, unwrap, unwrapList } from '../apiClient'

export const automationApi = {
  async jobs(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/automation/jobs`, { params })
    return unwrapList(response)
  },

  async job(projectId, jobId) {
    const response = await apiClient.get(`/projects/${projectId}/automation/jobs/${jobId}`)
    return unwrap(response)
  },

  async createJob(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/automation/jobs`, payload)
    return unwrap(response)
  },

  async updateJob(projectId, jobId, payload) {
    const response = await apiClient.patch(`/projects/${projectId}/automation/jobs/${jobId}`, payload)
    return unwrap(response)
  },

  /** Queues a run of the job. */
  async startJob(projectId, jobId) {
    const response = await apiClient.post(`/projects/${projectId}/automation/jobs/${jobId}/runs`)
    return unwrap(response)
  },

  async rerunJob(projectId, jobId) {
    const response = await apiClient.post(`/projects/${projectId}/automation/jobs/${jobId}/rerun`)
    return unwrap(response)
  },

  async cancelJob(projectId, jobId) {
    const response = await apiClient.post(`/projects/${projectId}/automation/jobs/${jobId}/cancel`)
    return unwrap(response)
  },

  async artifacts(projectId, jobId) {
    const response = await apiClient.get(`/projects/${projectId}/automation/jobs/${jobId}/artifacts`)
    return unwrapList(response)
  },

  /** Uploads an artifact for a job run; the server validates the upload type. */
  async uploadArtifact(jobId, file, { projectId, onUploadProgress } = {}) {
    const form = new FormData()
    form.append('file', file)

    const response = await apiClient.post(`/automation/jobs/${jobId}/artifacts`, form, {
      params: projectId ? { projectId } : undefined,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    return unwrap(response)
  },
}