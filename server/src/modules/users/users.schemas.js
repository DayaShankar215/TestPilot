import { z } from 'zod'
import { changePasswordSchema, preferencesSchema } from '../auth/auth.schemas.js'

/** PATCH semantics: every field is optional, but at least one must be sent. */
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    title: z.string().trim().max(80).nullish(),
    avatarUrl: z.string().trim().url('Avatar must be a valid URL').max(500).nullish(),
    timezone: z.string().trim().min(1).max(40).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'Provide at least one field to update',
  })

export { changePasswordSchema }

export const preferencesUpdateSchema = preferencesSchema.partial()

export const userSearchSchema = z.object({
  search: z.string().trim().optional(),
  workspaceId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
})

export const memberListSchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(['owner', 'admin', 'qa_lead', 'tester', 'viewer']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
})

export const workspaceIdParamSchema = z.object({ workspaceId: z.string().min(1) })

export const memberParamsSchema = z.object({
  workspaceId: z.string().min(1),
  memberId: z.string().min(1),
})

export const userIdParamSchema = z.object({ userId: z.string().min(1) })

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(['admin', 'qa_lead', 'tester', 'viewer']).default('tester'),
})

export const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'qa_lead', 'tester', 'viewer']),
})

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
})