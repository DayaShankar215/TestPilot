import { z } from 'zod'
import { listQuery, idParam, runStatusEnum, resultStatusEnum } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const runParams = z.object({ projectId: idParam('projectId'), runId: idParam('runId') })
export const resultParams = z.object({ resultId: idParam('resultId') })

export const runListQuery = listQuery.extend({
  status: runStatusEnum.optional(),
  release: z.string().trim().max(60).optional(),
  environment: z.string().trim().max(60).optional(),
})

export const createRunSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(160),
  release: z.string().trim().max(60).nullish(),
  build: z.string().trim().max(60).nullish(),
  environment: z.string().trim().min(1, 'Environment is required').max(60),
  scope: z.enum(['selected', 'full', 'regression']).default('selected'),
  planId: z.string().trim().min(1).nullish(),
  testCaseIds: z.array(z.string().min(1)).min(1, 'Select at least one test case').max(500),
})

export const updateRunSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  release: z.string().trim().max(60).nullish(),
  build: z.string().trim().max(60).nullish(),
  status: runStatusEnum.optional(),
})

export const recordResultSchema = z.object({
  testCaseId: z.string().trim().min(1, 'testCaseId is required'),
  status: resultStatusEnum.default('not_run'),
  notes: z.string().trim().max(4000).nullish(),
  durationMinutes: z.coerce.number().int().min(0).max(10000).nullish(),
  automated: z.boolean().optional(),
  defectId: z.string().trim().min(1).nullish(),
})

export const updateResultSchema = z.object({
  status: resultStatusEnum.optional(),
  notes: z.string().trim().max(4000).nullish(),
  durationMinutes: z.coerce.number().int().min(0).max(10000).nullish(),
  executedAt: z.coerce.date().optional(),
})