import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address')

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')

const workspaceNameSchema = z.string().trim().min(2).max(80)

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: emailSchema,
  password: passwordSchema,
  workspaceName: workspaceNameSchema.optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

export const preferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  timezone: z.string().trim().min(1).max(40).default('UTC'),
  dateFormat: z.string().trim().min(1).max(20).default('dd MMM yyyy'),
  weekStartsOn: z.enum(['monday', 'sunday']).default('monday'),
  compactTables: z.boolean().default(false),
  defaultPageSize: z.coerce.number().int().min(5).max(100).default(25),
  notificationSettings: z
    .object({
      email: z.boolean().default(true),
      inApp: z.boolean().default(true),
      defectAssigned: z.boolean().default(true),
      runCompleted: z.boolean().default(true),
    })
    .partial()
    .nullish(),
})

export const userParamsSchema = z.object({ userId: z.string().min(1) })

export const memberParamsSchema = z.object({ memberId: z.string().min(1) })

export const createMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'qa_lead', 'tester', 'viewer']).default('tester'),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'qa_lead', 'tester', 'viewer']),
})