import { z } from 'zod'
import {
  listQuery,
  idParam,
  priorityEnum,
  testCaseStatusEnum,
  testTypeEnum,
  stepsSchema,
} from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const testCaseParams = z.object({ projectId: idParam('projectId'), testCaseId: idParam('testCaseId') })

export const testCaseListQuery = listQuery.extend({
  status: testCaseStatusEnum.optional(),
  priority: priorityEnum.optional(),
  type: testTypeEnum.optional(),
  isAutomated: z.coerce.boolean().optional(),
  requirementId: idParam('requirementId').optional(),
})

export const createTestCaseSchema = z.object({
  ref: z.string().trim().min(1).max(20).optional(),
  title: z.string().trim().min(2, 'Title is required').max(200),
  description: z.string().trim().max(8000).nullish(),
  preconditions: z.string().trim().max(4000).nullish(),
  testData: z.string().trim().max(4000).nullish(),
  type: testTypeEnum.default('functional'),
  priority: priorityEnum.default('medium'),
  status: testCaseStatusEnum.default('draft'),
  isAutomated: z.boolean().optional(),
  source: z.string().trim().max(40).default('manual'),
  requirementIds: z.array(z.string().min(1)).max(100).optional(),
  steps: stepsSchema,
  changeNote: z.string().trim().max(500).nullish(),
})

export const updateTestCaseSchema = createTestCaseSchema
  .partial()
  .extend({ archived: z.boolean().optional() })

export const cloneTestCaseSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
})

export const setRequirementsSchema = z.object({
  requirementIds: z.array(z.string().min(1)).max(100).default([]),
})