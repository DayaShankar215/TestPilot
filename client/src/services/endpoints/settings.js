import { apiClient } from '../apiClient'

export const settingsApi = {
  async workspace() {
    const { data } = await apiClient.get('/settings/workspace')
    return data.data
  },

  async updateWorkspace(payload) {
    const { data } = await apiClient.patch('/settings/workspace', payload)
    return data.data
  },

  async members() {
    const { data } = await apiClient.get('/settings/members')
    return data.data
  },

  async inviteMember(payload) {
    const { data } = await apiClient.post('/settings/members/invite', payload)
    return data.data
  },

  async updateMember(memberId, payload) {
    const { data } = await apiClient.patch(`/settings/members/${memberId}`, payload)
    return data.data
  },

  async removeMember(memberId) {
    const { data } = await apiClient.delete(`/settings/members/${memberId}`)
    return data.data
  },

  async preferences() {
    const { data } = await apiClient.get('/settings/preferences')
    return data.data
  },

  async updatePreferences(payload) {
    const { data } = await apiClient.put('/settings/preferences', payload)
    return data.data
  },
}

export const notificationsApi = {
  async list() {
    const { data } = await apiClient.get('/notifications')
    return data.data
  },

  async markRead(notificationId) {
    const { data } = await apiClient.patch(`/notifications/${notificationId}`, { read: true })
    return data.data
  },

  async markAllRead() {
    const { data } = await apiClient.post('/notifications/read-all')
    return data.data
  },
}
