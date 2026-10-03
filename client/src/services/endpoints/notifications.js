import { apiClient, unwrap, unwrapList } from '../apiClient'

export const notificationsApi = {
  async list(params = {}) {
    const response = await apiClient.get('/notifications', { params })
    return unwrapList(response)
  },

  async markRead(notificationId, payload = {}) {
    const response = await apiClient.patch(`/notifications/${notificationId}`, { read: true, ...payload })
    return unwrap(response)
  },

  async markAllRead() {
    const response = await apiClient.post('/notifications/read-all')
    return unwrap(response)
  },
}