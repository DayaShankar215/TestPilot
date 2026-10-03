import { z } from 'zod'

/** Zod mirrors of the Prisma enums so invalid values fail as 422 field errors. */
export const priorityEnum = z.enum(['low', 'medium', 'high', 'critical'])
export const severityEnum = z.enum(['low', 'medium', 'high', 'critical'])
export const statusEnum = z.enum(['draft', 'review', 'approved', 'deprecated'])
export const requirementStatusEnum = z.enum([
  'draft',
  'review',
  'approved',
  'implemented',
  'tested',
  'done',
])
export const testTypeEnum = z.enum(['functional', 'regression', 'smoke', 'api', 'e2e', 'performance', 'accessibility', 'security'])
export const executionModeEnum = z.enum(['manual', 'automated'])
export const runStatusEnum = z.enum(['planned', 'in_progress', 'blocked', 'completed', 'aborted'])
export const resultStatusEnum = z.enum(['passed', 'failed', 'blocked', 'skipped', 'flaky'])
export const defectStatusEnum = z.enum([
  'open',
  'triaged',
  'in_progress',
  'retest_pending',
  'verified',
  'closed',
  'reopened',
  'deferred',
])
export const automationJobStatusEnum = z.enum(['queued', 'running', 'passed', 'failed', 'cancelled', 'error'])
export const automationTriggerEnum = z.enum(['pre_commit', 'nightly', 'manual', 'ci'])

export const cuidParam = (name) => z.object({ [name]: z.string().min(1, `${name} is required`) })

export const idParamSchema = (name = 'id') => cuidParam(name)

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  format: z.enum(['json', 'csv']).optional(),
})

export const emptyObjectSchema = z.object({}).passthrough()