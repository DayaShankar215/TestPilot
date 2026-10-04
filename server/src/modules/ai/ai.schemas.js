import { z } from 'zod'
import { testTypeEnum } from '../../schemas/common.js'

/**
 * The generator accepts a requirement id/reference, free text, or both.
 * `projectId` is optional so the endpoint can still be used from the global
 * generator screen before a project is chosen.
 */
export const generationRequestSchema = z
  .object({
    requirementId: z.string().trim().max(60).optional().default(''),
    description: z.string().trim().max(2000).optional().default(''),
    types: z.array(testTypeEnum).min(1, 'Select at least one test type.').max(6),
    count: z.coerce.number().int().min(1).max(15),
    projectId: z.string().trim().min(1).optional(),
  })
  .refine((input) => Boolean(input.requirementId) || input.description.length >= 10, {
    message: 'Select a requirement or describe the behaviour in at least 10 characters.',
    path: ['description'],
  })