import * as service from './notifications.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const { items, meta, unreadCount } = await service.listNotifications(req.auth, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta, unreadCount } })
}

export async function markRead(req, res) {
  return sendSuccess(res, {
    message: 'Notification updated',
    data: await service.markRead(req.auth, req.params.notificationId, req.body.read),
  })
}

export async function markAllRead(req, res) {
  return sendSuccess(res, { message: 'All notifications read', data: await service.markAllRead(req.auth) })
}

export async function unread(req, res) {
  return sendSuccess(res, { data: await service.unreadCount(req.auth) })
}