import { apiClient, unwrap, unwrapList } from '../apiClient'

export const defectsApi = {
  async list(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/defects`, { params })
    return unwrapList(response)
  },

  async get(projectId, defectId) {
    const response = await apiClient.get(`/projects/${projectId}/defects/${defectId}`)
    return unwrap(response)
  },

  async create(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/defects`, payload)
    return unwrap(response)
  },

  async update(projectId, defectId, payload) {
    const response = await apiClient.patch(`/projects/${projectId}/defects/${defectId}`, payload)
    return unwrap(response)
  },

  async addComment(projectId, defectId, body) {
    const response = await apiClient.post(`/projects/${projectId}/defects/${defectId}/comments`, { body })
    return unwrap(response)
  },

  /** Dedicated reopen action; the spec does not use a status PATCH for this. */
  async reopen(projectId, defectId, payload = {}) {
    const response = await apiClient.post(`/projects/${projectId}/defects/${defectId}/reopen`, payload)
    return unwrap(response)
  },

  async retest(projectId, defectId) {
    const response = await apiClient.post(`/projects/${projectId}/defects/${defectId}/retest`)
    return unwrap(response)
  },

  async history(projectId, defectId) {
    const response = await apiClient.get(`/projects/${projectId}/defects/${defectId}/history`)
    return unwrapList(response)
  },
}