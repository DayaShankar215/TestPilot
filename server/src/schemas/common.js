import { z } from 'zod'

/** Zod mirrors of the Prisma enums so invalid values fail as 422 field errors. */
export const priorityEnum = z.enum(['low', 'medium', 'high', 'critical'])
export const severityEnum = z.enum(['trivial', 'low', 'medium', 'high', 'critical'])

/** Mirrors Prisma `RequirementStatus`. */
export const requirementStatusEnum = z.enum([
  'draft',
  'under_review',
  'approved',
  'implemented',
  'verified',
  'deprecated',
])

/** Mirrors Prisma `TestCaseStatus`. */
export const testCaseStatusEnum = z.enum(['draft', 'under_review', 'approved', 'deprecated'])

/** Mirrors Prisma `TestCaseType`. */
export const testTypeEnum = z.enum([
  'functional',
  'positive',
  'negative',
  'boundary',
  'integration',
  'regression',
])

/** Mirrors Prisma `TestRunStatus`. */
export const runStatusEnum = z.enum(['planned', 'in_progress', 'completed', 'aborted'])

/** Mirrors Prisma `ResultStatus`. */
export const resultStatusEnum = z.enum(['pass', 'fail', 'blocked', 'not_run'])

/** Mirrors Prisma `DefectStatus`. */
export const defectStatusEnum = z.enum([
  'open',
  'in_progress',
  'fixed',
  'ready_for_retest',
  'reopened',
  'closed',
])

/** Mirrors Prisma `AutomationJobStatus`. */
export const automationJobStatusEnum = z.enum([
  'queued',
  'running',
  'passed',
  'failed',
  'cancelled',
  'timed_out',
])

export const automationTriggerEnum = z.enum(['manual', 'schedule', 'ci'])

export const projectRoleEnum = z.enum(['manager', 'qa_lead', 'tester', 'viewer'])

export const artifactTypeEnum = z.enum(['screenshot', 'log', 'trace', 'report'])

export const idParam = (name) => z.string().min(1, `${name} is required`)

export const cuidParam = (name) => z.object({ [name]: idParam(name) })

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
})

export const emptyObjectSchema = z.object({}).passthrough()

/** Ordered steps shared by test cases and defect reproduction steps. */
export const stepsSchema = z
  .array(
    z.object({
      order: z.coerce.number().int().min(0).optional(),
      action: z.string().trim().min(1, 'Action is required').max(2000),
      expected: z.string().trim().min(1, 'Expected result is required').max(2000),
    }),
  )
  .max(200)
  .default([])

/** Re-numbers steps 1..n so callers can send them in any order. */
export function normalizeSteps(steps) {
  return steps.map((step, index) => ({ order: index + 1, action: step.action, expected: step.expected }))
}