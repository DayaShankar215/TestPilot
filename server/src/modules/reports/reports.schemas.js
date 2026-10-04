import { z } from 'zod'
import { listQuery, idParam } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const activityQuery = listQuery.extend({
  entityType: z.string().trim().max(60).optional(),
  entityId: idParam('entityId').optional(),
  userId: idParam('userId').optional(),
})
export const reportQuery = listQuery.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})