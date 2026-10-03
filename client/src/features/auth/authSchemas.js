import { z } from 'zod'

export const passwordRule = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/\d/, 'Include a number.')

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  email: z.email('Enter a valid email address.'),
  password: passwordRule,
  confirmPassword: z.string().min(1, 'Confirm your password.'),
  acceptTerms: z.literal(true, { message: 'You must accept the terms to continue.' }),
})

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address.'),
})

export const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
  })

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  title: z.string().trim().min(1, 'Enter your job title.'),
  timezone: z.string().min(1, 'Select a timezone.'),
})
