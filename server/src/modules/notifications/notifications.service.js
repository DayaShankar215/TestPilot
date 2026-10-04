import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { paginate, readPaging } from '../../utils/query.js'

export async function listNotifications(auth, query) {
  const paging = readPaging(query)
  const where = { userId: auth.user.id, ...(query.unreadOnly ? { read: false } : {}) }

  const { items, meta } = await paginate('notification', {
    where,
    orderBy: { createdAt: 'desc' },
    ...paging,
  })

  return { items, meta, unreadCount: await prisma.notification.count({ where: { userId: auth.user.id, read: false } }) }
}

export async function markRead(auth, notificationId, read = true) {
  const existing = await prisma.notification.findFirst({ where: { id: notificationId, userId: auth.user.id } })
  if (!existing) throw ApiError.notFound('Notification not found.')

  return prisma.notification.update({ where: { id: notificationId }, data: { read } })
}

export async function markAllRead(auth) {
  const { count } = await prisma.notification.updateMany({
    where: { userId: auth.user.id, read: false },
    data: { read: true },
  })

  return { updated: count }
}

export async function unreadCount(auth) {
  return { count: await prisma.notification.count({ where: { userId: auth.user.id, read: false } }) }
}