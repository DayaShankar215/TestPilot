import { z } from 'zod'
import { ENVIRONMENT, PROJECT_STATUS, PRIORITY, REQUIREMENT_STATUS, SEVERITY, DEFECT_STATUS, TEST_CASE_STATUS, TEST_CASE_TYPE, TEST_RESULT } from './constants'

const requiredText = (label) => z.string().trim().min(1, `${label} is required.`)

export const projectSchema = z.object({
  name: z.string().trim().min(3, 'Project name must be at least 3 characters.').max(80, 'Keep the name under 80 characters.'),
  key: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters.')
    .max(4, 'Use at most 4 characters.')
    .regex(/^[A-Za-z0-9]+$/, 'Use letters and numbers only.')
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(500, 'Keep the description under 500 characters.').optional().default(''),
  status: z.enum(Object.keys(PROJECT_STATUS), { message: 'Select a status.' }),
  release: z.string().trim().min(1, 'Enter the current release or version.'),
  environment: z.enum(Object.keys(ENVIRONMENT), { message: 'Select an environment.' }),
  ownerId: requiredText('An owner'),
})

export const requirementSchema = z.object({
  title: z.string().trim().min(4, 'Give the requirement a descriptive title.').max(140, 'Keep the title under 140 characters.'),
  description: z.string().trim().min(10, 'Describe the behaviour that must hold.'),
  module: z.string().trim().min(1, 'Select or name a module.'),
  acceptanceCriteria: z
    .array(z.string().trim().min(5, 'Each criterion needs at least 5 characters.'))
    .min(1, 'Add at least one acceptance criterion.'),
  priority: z.enum(Object.keys(PRIORITY), { message: 'Select a priority.' }),
  status: z.enum(Object.keys(REQUIREMENT_STATUS), { message: 'Select a status.' }),
  ownerId: requiredText('An owner'),
})

const stepSchema = z.object({
  id: z.string().optional(),
  action: z.string().trim().min(5, 'Describe the action in at least 5 characters.'),
  expectedResult: z.string().trim().min(5, 'Describe the expected result in at least 5 characters.'),
})

export const testCaseSchema = z.object({
  title: z.string().trim().min(5, 'Give the test case a descriptive title.').max(140),
  description: z.string().trim().max(500).optional().default(''),
  type: z.enum(Object.keys(TEST_CASE_TYPE), { message: 'Select a test type.' }),
  priority: z.enum(Object.keys(PRIORITY), { message: 'Select a priority.' }),
  status: z.enum(Object.keys(TEST_CASE_STATUS), { message: 'Select a status.' }),
  module: z.string().trim().min(1, 'Select or name a module.'),
  requirementIds: z.array(z.string()),
  preconditions: z.string().trim().max(500).optional().default(''),
  testData: z.array(z.object({ name: z.string(), value: z.string() })),
  steps: z.array(stepSchema).min(1, 'Add at least one test step.'),
})

export const testRunSchema = z.object({
  name: z.string().trim().min(3, 'Give the run a name.').max(80),
  release: z.string().trim().min(1, 'Enter the release or version under test.'),
  build: z.string().trim().min(1, 'Enter the build identifier.'),
  environment: z.enum(Object.keys(ENVIRONMENT), { message: 'Select an environment.' }),
  assigneeId: requiredText('An assignee'),
  scope: z.enum(['smoke', 'targeted', 'regression', 'full'], { message: 'Select a scope.' }),
  testCaseIds: z.array(z.string()).min(1, 'Select at least one test case.'),
})

export const executionResultSchema = z
  .object({
    result: z.enum(Object.keys(TEST_RESULT), { message: 'Select a result.' }),
    actualResult: z.string().trim().max(1000).optional().default(''),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .refine((values) => values.result !== 'fail' || values.actualResult.trim().length > 0, {
    message: 'Describe what actually happened so a developer can reproduce it.',
    path: ['actualResult'],
  })
  .refine((values) => values.result !== 'blocked' || values.notes.trim().length > 0, {
    message: 'Record what is blocking this test.',
    path: ['notes'],
  })

export const defectSchema = z.object({
  title: z.string().trim().min(6, 'Give the defect a descriptive title.').max(160),
  description: z.string().trim().min(10, 'Describe the defect.'),
  reproductionSteps: z.array(z.string().trim().min(4, 'Each step needs at least 4 characters.')),
  expectedResult: z.string().trim().min(5, 'Describe the expected result.'),
  actualResult: z.string().trim().min(5, 'Describe the actual result.'),
  severity: z.enum(Object.keys(SEVERITY), { message: 'Select a severity.' }),
  priority: z.enum(Object.keys(PRIORITY), { message: 'Select a priority.' }),
  assigneeId: z.string().optional().nullable(),
  requirementId: z.string().optional().nullable(),
  testCaseId: z.string().optional().nullable(),
})

export const defectStatusSchema = z.object({
  status: z.enum(Object.keys(DEFECT_STATUS), { message: 'Select a status.' }),
  note: z.string().trim().max(500).optional().default(''),
})

export const aiGenerationSchema = z
  .object({
    requirementId: z.string().optional().default(''),
    description: z.string().trim().max(2000).optional().default(''),
    types: z.array(z.enum(Object.keys(TEST_CASE_TYPE))).min(1, 'Select at least one test type.'),
    count: z.number().int().min(1, 'Generate at least 1 case.').max(15, 'Generate at most 15 cases.'),
  })
  .refine((values) => values.requirementId || values.description.trim().length >= 10, {
    message: 'Select a requirement or describe the behaviour in at least 10 characters.',
    path: ['description'],
  })

export const regressionSuiteSchema = z.object({
  name: z.string().trim().min(3, 'Name the regression suite.').max(80),
  testCaseIds: z.array(z.string()).min(1, 'Select at least one test case.'),
})

export const notificationPreferencesSchema = z.object({
  email: z.record(z.string(), z.boolean()),
  inApp: z.record(z.string(), z.boolean()),
})

export const preferencesSchema = z.object({
  timezone: z.string().min(1, 'Select a timezone.'),
  dateFormat: z.string().min(1, 'Select a date format.'),
  weekStartsOn: z.enum(['monday', 'sunday']),
  compactTables: z.boolean(),
  defaultPageSize: z.number().int().min(10).max(100),
})
