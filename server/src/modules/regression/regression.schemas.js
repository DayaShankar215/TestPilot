import { z } from 'zod'
import { listQuery, idParam } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const planParams = z.object({ projectId: idParam('projectId'), planId: idParam('planId') })

export const planListQuery = listQuery.extend({
  status: z.string().trim().max(40).optional(),
})

export const createPlanSchema = z.object({
  name: z.string().trim().min(3, 'Name the regression suite.').max(160),
  testCaseIds: z.array(z.string().min(1)).min(1, 'Select at least one test case.').max(500),
  baselineRunId: z.string().trim().min(1).nullish(),
  changeSetNote: z.string().trim().max(4000).nullish(),
})