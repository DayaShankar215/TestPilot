import { z } from 'zod'
import { listQuery, idParam, priorityEnum, requirementStatusEnum } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const requirementIdParam = z.object({ requirementId: idParam('requirementId') })

export const requirementListQuery = listQuery.extend({
  status: requirementStatusEnum.optional(),
  priority: priorityEnum.optional(),
  module: z.string().trim().max(80).optional(),
})

export const createRequirementSchema = z.object({
  ref: z.string().trim().min(1).max(20).optional(),
  title: z.string().trim().min(2, 'Title is required').max(200),
  description: z.string().trim().max(8000).default(''),
  module: z.string().trim().max(80).nullish(),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(2000)).max(50).default([]),
  priority: priorityEnum.default('medium'),
  status: requirementStatusEnum.default('draft'),
  ownerId: z.string().trim().min(1).nullish(),
  changeNote: z.string().trim().max(500).nullish(),
})

export const updateRequirementSchema = createRequirementSchema
  .partial()
  .extend({ archived: z.boolean().optional() })