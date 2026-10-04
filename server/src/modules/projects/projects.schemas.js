import { z } from 'zod'
import { listQuery, idParam } from '../../schemas/common.js'

export const projectIdParam = z.object({ projectId: idParam('projectId') })

export const projectListQuery = listQuery.extend({
  status: z.string().trim().max(40).optional(),
})

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name is required').max(120),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Key must be 2-8 characters')
    .max(8)
    .regex(/^[A-Z0-9]+$/, 'Key must be letters and numbers only'),
  description: z.string().trim().max(2000).nullish(),
  status: z.string().trim().max(40).optional(),
  ownerId: z.string().trim().min(1).nullish(),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  archived: z.boolean().optional(),
})

export const projectMemberSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  role: z.enum(['manager', 'qa_lead', 'tester', 'viewer']).default('tester'),
})

export const dashboardQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export const activityQuery = listQuery.extend({
  entityType: z.string().trim().max(40).optional(),
})