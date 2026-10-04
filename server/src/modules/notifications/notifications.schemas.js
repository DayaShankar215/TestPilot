import { z } from 'zod'
import { listQuery, idParam } from '../../schemas/common.js'

export const notificationParams = z.object({ notificationId: idParam('notificationId') })
export const notificationQuery = listQuery.extend({
  unreadOnly: z.coerce.boolean().optional(),
})
export const updateSchema = z.object({
  read: z.boolean().default(true),
})