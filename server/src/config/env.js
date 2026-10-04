import 'dotenv/config'
import { z } from 'zod'

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  API_PREFIX: z.string().default('/api/v1'),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  TRUST_PROXY: bool,

  SESSION_COOKIE_NAME: z.string().default('testpilot_sid'),
  CSRF_COOKIE_NAME: z.string().default('testpilot_csrf'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  SESSION_ABSOLUTE_TTL_HOURS: z.coerce.number().positive().default(168),
  COOKIE_SECURE: bool,

  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  AI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().positive().default(20000),
  AI_MAX_SUGGESTIONS: z.coerce.number().int().positive().max(20).default(6),
  AI_PROMPT_VERSION: z.string().default('2026.03'),

  AUTOMATION_ENABLED: z.enum(['true', 'false']).default('false'),
  AUTOMATION_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  AUTOMATION_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  AUTOMATION_ALLOWED_HOSTS: z.string().default('localhost,127.0.0.1'),
  ARTIFACT_DIR: z.string().default('var/artifacts'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`)
  throw new Error('Invalid environment configuration')
}

const raw = parsed.data

export const env = Object.freeze({
  ...raw,
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  automationAllowedHosts: raw.AUTOMATION_ALLOWED_HOSTS.split(',').map((host) => host.trim()).filter(Boolean),
  // The raw schema keeps these as strings; expose real booleans so callers
  // never treat the string 'false' as truthy.
  AUTOMATION_ENABLED: raw.AUTOMATION_ENABLED === 'true',
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: raw.RATE_LIMIT_MAX,
  authRateLimitMax: raw.AUTH_RATE_LIMIT_MAX,
  aiRateLimitMax: raw.AI_RATE_LIMIT_MAX,
  aiMaxSuggestions: raw.AI_MAX_SUGGESTIONS,
  aiTimeoutMs: raw.AI_TIMEOUT_MS,
  automationMaxConcurrency: raw.AUTOMATION_MAX_CONCURRENCY,
  automationJobTimeoutMs: raw.AUTOMATION_JOB_TIMEOUT_MS,
  artifactDir: raw.ARTIFACT_DIR,
})