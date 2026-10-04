/**
 * Exercises every endpoint module against a running TestPilot API.
 *
 * Auth is cookie based, so this script installs a minimal cookie jar that keeps
 * `document.cookie` in sync with `Set-Cookie`. That is what lets `apiClient`'s
 * CSRF interceptor read the readable `testpilot_csrf` cookie and echo it on
 * mutating calls, exactly as a browser would.
 *
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node --experimental-strip-types scripts/api-smoke.mjs
 */
import * as endpoints from '../src/services/endpoints/index.js'
import { apiClient } from '../src/services/apiClient.js'

const EMAIL = process.env.SMOKE_EMAIL ?? 'arun.mehta@testpilot.dev'
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'TestPilot@2026'

const jar = new Map()

/** `readCookie` in storage.js reads document.cookie; give it one in Node. */
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { cookie: '' }
}

function syncDocumentCookie() {
  const readable = [...jar].filter(([name]) => name !== 'testpilot_sid')
  globalThis.document.cookie = readable.map(([name, value]) => `${name}=${value}`).join('; ')
}

apiClient.interceptors.request.use((config) => {
  // Axios has no cookie jar outside the browser, so replay the session cookie
  // that `Set-Cookie` handed us. Browsers do this automatically.
  if (jar.size > 0) {
    config.headers.Cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
  }
  return config
})

apiClient.interceptors.response.use((response) => {
  const raw = response.headers?.['set-cookie'] ?? []
  for (const entry of Array.isArray(raw) ? raw : [raw]) {
    const [pair] = entry.split(';')
    const index = pair.indexOf('=')
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
  }
  syncDocumentCookie()
  return response
})

let failures = 0
let total = 0

async function check(label, fn) {
  total += 1
  try {
    const result = await fn()
    const preview = Array.isArray(result)
      ? `array(${result.length})`
      : result && typeof result === 'object'
        ? Object.keys(result).slice(0, 6).join(',')
        : JSON.stringify(result)
    console.log(` ok  ${label} -> ${preview}`)
    return result
  } catch (error) {
    failures += 1
    console.log(`FAIL ${label} -> ${error.status ?? 0} ${error.message}`)
    return null
  }
}

const firstOf = (result) => result?.items?.[0] ?? null

console.log(`API: ${apiClient.defaults.baseURL}`)
console.log(`user: ${EMAIL}\n`)

await check('auth.login', () => endpoints.authApi.login({ email: EMAIL, password: PASSWORD }))
await check('auth.me', () => endpoints.authApi.me())
await check('auth.refresh', () => endpoints.authApi.refresh())
await check('auth.logout', () => endpoints.authApi.logout())
await check('auth.login again', () => endpoints.authApi.login({ email: EMAIL, password: PASSWORD }))
await check('users.profile', () => endpoints.usersApi.profile())
await check('users.updateProfile', () => endpoints.usersApi.updateProfile({ title: 'QA Lead' }))
await check('users.preferences', () => endpoints.usersApi.preferences())
await check('users.updatePreferences', () => endpoints.usersApi.updatePreferences({ compactTables: true }))
await check('users.list', () => endpoints.usersApi.list({ pageSize: 100 }))

await check('workspaces.current', () => endpoints.workspacesApi.current())
await check('workspaces.list', () => endpoints.workspacesApi.list())
await check('workspaces.updateCurrent', () => endpoints.workspacesApi.updateCurrent({ name: 'TestPilot Engineering' }))
await check('workspaces.members', () => endpoints.workspacesApi.members())

await check('projects.list', () => endpoints.projectsApi.list({ page: 1, pageSize: 5 }))
const project = firstOf(await check('projects.list (resolve)', () => endpoints.projectsApi.list({ page: 1, pageSize: 5 })))
let projectId = project?.id

// Project keys are unique per workspace, so a rerun needs a fresh key.
const runKey = `SMK${Date.now().toString(36).toUpperCase().slice(-5)}`
const createdProject = await check('projects.create', () =>
  endpoints.projectsApi.create({ name: 'Smoke Project', key: runKey, description: 'Created by smoke test' }),
)
// Everything below runs against the project this run created, so the smoke never
// depends on seed data being present.
if (createdProject?.id) projectId = createdProject.id
await check('projects.get', () => endpoints.projectsApi.get(projectId))
await check('projects.dashboard', () => endpoints.projectsApi.dashboard(projectId, { days: 30 }))
await check('projects.activity', () => endpoints.projectsApi.activity(projectId))
await check('projects.members', () => endpoints.projectsApi.members(projectId))
await check('projects.update', () => endpoints.projectsApi.update(projectId, { description: 'Smoke update' }))

await check('requirements.list', () => endpoints.requirementsApi.list(projectId, { page: 1, pageSize: 5 }))
const requirement = await check('requirements.create', () =>
  endpoints.requirementsApi.create(projectId, {
    title: 'Smoke requirement',
    description: 'Created by the endpoint smoke test.',
    module: 'Smoke',
    acceptanceCriteria: ['It responds.'],
    priority: 'medium',
    status: 'draft',
  }),
)
await check('requirements.get', () => endpoints.requirementsApi.get(requirement?.id))
await check('requirements.update', () => endpoints.requirementsApi.update(requirement?.id, { priority: 'high' }))
await check('requirements.history', () => endpoints.requirementsApi.history(requirement?.id))
await check('requirements.testCases', () => endpoints.requirementsApi.testCases(requirement?.id, { pageSize: 5 }))

await check('testCases.list', () => endpoints.testCasesApi.list(projectId, { page: 1, pageSize: 5 }))
const testCase = await check('testCases.create', () =>
  endpoints.testCasesApi.create(projectId, {
    title: 'Smoke test case',
    description: 'Created by the endpoint smoke test.',
    type: 'functional',
    priority: 'medium',
    status: 'draft',
    steps: [{ order: 1, action: 'Open the app', expected: 'Dashboard renders' }],
  }),
)
await check('testCases.get', () => endpoints.testCasesApi.get(projectId, testCase?.id))
await check('testCases.update', () => endpoints.testCasesApi.update(projectId, testCase?.id, { priority: 'high' }))
await check('testCases.clone', () => endpoints.testCasesApi.clone(projectId, testCase?.id, { title: 'Smoke clone' }))
await check('testCases.setRequirements', () =>
  endpoints.testCasesApi.setRequirements(projectId, testCase?.id, requirement ? [requirement.id] : []),
)
await check('testCases.history', () => endpoints.testCasesApi.history(projectId, testCase?.id))
// Deprecating is left until last: an archived case can no longer join a new run.

await check('aiGenerator.generate', () =>
  endpoints.aiGeneratorApi.generate(
    { requirementId: requirement?.id ?? '', description: '', types: ['functional', 'negative'], count: 3 },
    projectId,
  ),
)

await check('testRuns.list', () => endpoints.testRunsApi.list(projectId, { page: 1, pageSize: 5 }))
const run = await check('testRuns.create', () =>
  endpoints.testRunsApi.create(projectId, {
    name: 'Smoke run',
    environment: 'local',
    scope: 'selected',
    testCaseIds: testCase ? [testCase.id] : [],
  }),
)
await check('testRuns.get', () => endpoints.testRunsApi.get(projectId, run?.id))
await check('testRuns.update', () => endpoints.testRunsApi.update(projectId, run?.id, { status: 'in_progress' }))
await check('testRuns.recordResult', () =>
  endpoints.testRunsApi.recordResult(projectId, run?.id, {
    testCaseId: testCase?.id,
    status: 'pass',
    notes: 'Recorded by the smoke test.',
  }),
)
await check('testRuns.results', () => endpoints.testRunsApi.results(projectId, run?.id, { pageSize: 5 }))
const results = firstOf(await check('testRuns.results (resolve)', () => endpoints.testRunsApi.results(projectId, run?.id, { pageSize: 5 })))
if (results?.id) {
  await check('testRuns.updateResult', () => endpoints.testRunsApi.updateResult(results.id, { status: 'pass' }))
}

await check('defects.list', () => endpoints.defectsApi.list(projectId, { page: 1, pageSize: 5 }))
const defect = await check('defects.create', () =>
  endpoints.defectsApi.create(projectId, {
    title: 'Smoke defect',
    description: 'Created by the endpoint smoke test.',
    severity: 'medium',
    priority: 'medium',
    status: 'open',
    testCaseId: testCase?.id ?? null,
    reproductionSteps: [{ order: 1, action: 'Click the button', expected: 'Nothing happens' }],
  }),
)
await check('defects.get', () => endpoints.defectsApi.get(projectId, defect?.id))
await check('defects.update', () => endpoints.defectsApi.update(projectId, defect?.id, { priority: 'high' }))
await check('defects.addComment', () => endpoints.defectsApi.addComment(projectId, defect?.id, 'Smoke comment'))
await check('defects.retest', () => endpoints.defectsApi.retest(projectId, defect?.id))
await check('defects.reopen', () => endpoints.defectsApi.reopen(projectId, defect?.id, { note: 'Smoke reopen' }))
await check('defects.history', () => endpoints.defectsApi.history(projectId, defect?.id))

await check('regression.plans', () => endpoints.regressionApi.plans(projectId, { pageSize: 5 }))
const plan = firstOf(await check('regression.plans (resolve)', () => endpoints.regressionApi.plans(projectId, { pageSize: 5 })))
if (plan?.id) await check('regression.plan', () => endpoints.regressionApi.plan(projectId, plan.id))
await check('regression.createPlan', () =>
  endpoints.regressionApi.createPlan(projectId, { name: 'Smoke regression suite', testCaseIds: testCase ? [testCase.id] : [] }),
)

await check('automation.jobs', () => endpoints.automationApi.jobs(projectId, { pageSize: 5 }))
const job = await check('automation.createJob', () =>
  endpoints.automationApi.createJob(projectId, {
    name: 'Smoke job',
    suite: 'smoke.spec.js',
    framework: 'playwright',
    targetUrl: 'http://localhost:5173',
    allowedHosts: ['localhost'],
    testCaseIds: testCase ? [testCase.id] : [],
    trigger: 'manual',
  }),
)
await check('automation.job', () => endpoints.automationApi.job(projectId, job?.id))
await check('automation.updateJob', () => endpoints.automationApi.updateJob(projectId, job?.id, { schedule: '0 2 * * *' }))
await check('automation.artifacts', () => endpoints.automationApi.artifacts(projectId, job?.id))
// Runs are queued as rows; without the Playwright worker running they stay queued.
await check('automation.startJob', () => endpoints.automationApi.startJob(projectId, job?.id))

await check('testCases.deprecate', () => endpoints.testCasesApi.deprecate(projectId, testCase?.id))

await check('reports.execution', () => endpoints.reportsApi.execution(projectId, {}))
await check('reports.coverage', () => endpoints.reportsApi.coverage(projectId, {}))
await check('reports.defects', () => endpoints.reportsApi.defects(projectId, {}))
await check('reports.releaseReadiness', () => endpoints.reportsApi.releaseReadiness(projectId))

await check('notifications.list', () => endpoints.notificationsApi.list({ pageSize: 5 }))
const notification = firstOf(await check('notifications.list (resolve)', () => endpoints.notificationsApi.list({ pageSize: 5 })))
if (notification?.id) await check('notifications.markRead', () => endpoints.notificationsApi.markRead(notification.id, {}))
await check('notifications.markAllRead', () => endpoints.notificationsApi.markAllRead())

await check('auth.logout (final)', () => endpoints.authApi.logout())

console.log(`\n${total - failures}/${total} endpoint calls succeeded against ${apiClient.defaults.baseURL}.`)
process.exit(failures === 0 ? 0 : 1)