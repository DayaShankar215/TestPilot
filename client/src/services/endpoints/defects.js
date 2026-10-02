import { apiClient } from '../apiClient'

export const defectsApi = {
  async list(projectId, params = {}) {
    const { data } = await apiClient.get(`/projects/${projectId}/defects`, { params })
    return { items: data.data, meta: data.meta }
  },

  async get(defectId) {
    const { data } = await apiClient.get(`/defects/${defectId}`)
    return data.data
  },

  async create(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/defects`, payload)
    return data.data
  },

  async update(defectId, payload) {
    const { data } = await apiClient.patch(`/defects/${defectId}`, payload)
    return data.data
  },

  async addComment(defectId, body) {
    const { data } = await apiClient.post(`/defects/${defectId}/comments`, { body })
    return data.data
  },

  async transition(defectId, status) {
    const { data } = await apiClient.patch(`/defects/${defectId}`, { status })
    return data.data
  },

  async retest(defectId) {
    const { data } = await apiClient.post(`/defects/${defectId}/retest`)
    return data.data
  },
}
