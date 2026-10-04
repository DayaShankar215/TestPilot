import { z } from 'zod'
import { listQuery, idParam } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })
export const jobParams = z.object({ projectId: idParam('projectId'), jobId: idParam('jobId') })

export const JOB_STATUSES = ['queued', 'running', 'passed', 'failed', 'cancelled', 'timed_out']
export const jobStatus = z.enum(JOB_STATUSES)

export const jobListQuery = listQuery.extend({ status: jobStatus.optional() })

export const createJobSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(160),
  suite: z.string().trim().min(1, 'Suite is required').max(120),
  framework: z.enum(['playwright']).default('playwright'),
  targetUrl: z.string().trim().url('targetUrl must be a valid URL').max(500),
  allowedHosts: z.array(z.string().trim().min(1).max(200)).min(1, 'At least one allowed host is required').max(20),
  testCaseIds: z.array(z.string().min(1)).max(500).default([]),
  trigger: z.enum(['manual', 'schedule', 'webhook']).default('manual'),
  schedule: z.string().trim().max(120).nullish(),
  timeoutMs: z.coerce.number().int().min(5000).max(900000).default(120000),
})

export const updateJobSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  suite: z.string().trim().min(1).max(120).optional(),
  targetUrl: z.string().trim().url().max(500).optional(),
  allowedHosts: z.array(z.string().trim().min(1).max(200)).min(1).max(20).optional(),
  trigger: z.enum(['manual', 'schedule', 'webhook']).optional(),
  schedule: z.string().trim().max(120).nullish(),
  enabled: z.boolean().optional(),
  timeoutMs: z.coerce.number().int().min(5000).max(900000).optional(),
})

export const queueRunSchema = z.object({
  commitSha: z.string().trim().max(60).nullish(),
  branch: z.string().trim().max(120).nullish(),
})

export const artifactQuery = listQuery.extend({
  runId: idParam('runId').optional(),
  type: z.enum(['screenshot', 'log', 'trace', 'report']).optional(),
})

export const uploadQuerySchema = z.object({
  projectId: idParam('projectId'),
  runId: idParam('runId').optional(),
  type: z.enum(['screenshot', 'log', 'trace', 'report']).optional(),
})