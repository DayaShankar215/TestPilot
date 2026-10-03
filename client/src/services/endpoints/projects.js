import { apiClient, unwrap, unwrapList } from '../apiClient'

export const workspacesApi = {
  async list() {
    const response = await apiClient.get('/workspaces')
    return unwrapList(response)
  },

  /** Spec alias for the caller's primary workspace. */
  async current() {
    const response = await apiClient.get('/workspaces/current')
    return unwrap(response)
  },

  async updateCurrent(payload) {
    const response = await apiClient.patch('/workspaces/current', payload)
    return unwrap(response)
  },

  async members() {
    const response = await apiClient.get('/workspaces/current/members')
    return unwrapList(response)
  },

  async addMember(payload) {
    const response = await apiClient.post('/workspaces/current/members', payload)
    return unwrap(response)
  },

  async updateMember(memberId, payload) {
    const response = await apiClient.patch(`/workspaces/current/members/${memberId}`, payload)
    return unwrap(response)
  },

  async removeMember(memberId) {
    const response = await apiClient.delete(`/workspaces/current/members/${memberId}`)
    return unwrap(response)
  },
}

export const projectsApi = {
  async list(params = {}) {
    const response = await apiClient.get('/projects', { params })
    return unwrapList(response)
  },

  async get(projectId) {
    const response = await apiClient.get(`/projects/${projectId}`)
    return unwrap(response)
  },

  async create(payload) {
    const response = await apiClient.post('/projects', payload)
    return unwrap(response)
  },

  async update(projectId, payload) {
    const response = await apiClient.patch(`/projects/${projectId}`, payload)
    return unwrap(response)
  },

  /** Spec defines DELETE as a soft archive. */
  async archive(projectId) {
    const response = await apiClient.delete(`/projects/${projectId}`)
    return unwrap(response)
  },

  async members(projectId) {
    const response = await apiClient.get(`/projects/${projectId}/members`)
    return unwrapList(response)
  },

  async addMember(projectId, payload) {
    const response = await apiClient.post(`/projects/${projectId}/members`, payload)
    return unwrap(response)
  },

  async dashboard(projectId) {
    const response = await apiClient.get(`/projects/${projectId}/dashboard`)
    return unwrap(response)
  },

  async activity(projectId, params = {}) {
    const response = await apiClient.get(`/projects/${projectId}/activity`, { params })
    return unwrapList(response)
  },
}