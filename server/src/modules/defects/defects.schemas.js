import { z } from 'zod'
import { listQuery, idParam, priorityEnum, severityEnum, defectStatusEnum, stepsSchema } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const defectParams = z.object({ projectId: idParam('projectId'), defectId: idParam('defectId') })

export const defectListQuery = listQuery.extend({
  status: defectStatusEnum.optional(),
  severity: severityEnum.optional(),
  priority: priorityEnum.optional(),
  assigneeId: idParam('assigneeId').optional(),
})

export const createDefectSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(200),
  description: z.string().trim().max(8000).default(''),
  reproductionSteps: stepsSchema,
  expectedBehavior: z.string().trim().max(4000).nullish(),
  actualBehavior: z.string().trim().max(4000).nullish(),
  severity: severityEnum.default('medium'),
  priority: priorityEnum.default('medium'),
  status: defectStatusEnum.default('open'),
  assigneeId: z.string().trim().min(1).nullish(),
  requirementId: z.string().trim().min(1).nullish(),
  testCaseId: z.string().trim().min(1).nullish(),
  sourceResultId: z.string().trim().min(1).nullish(),
})

export const updateDefectSchema = createDefectSchema
  .partial()
  .extend({ changeNote: z.string().trim().max(500).nullish(), archived: z.boolean().optional() })

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(4000),
})

export const reopenSchema = z.object({
  note: z.string().trim().max(500).nullish(),
})