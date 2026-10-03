import * as endpoints from '../src/services/endpoints/index.js'
import { db } from '../src/services/mock/db.js'

const project = db.projects[0]
const requirement = db.requirements.find((item) => item.projectId === project.id)
const testCase = db.testCases.find((item) => item.projectId === project.id)
const run = db.testRuns.find((item) => item.projectId === project.id)
const execution = run?.executions?.[0]
const defect = db.defects.find((item) => item.projectId === project.id)
const job = db.automationJobs[0]
const changeSet = db.regressionChangeSets.find((item) => item.projectId === project.id)

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

await check('auth.login', () => endpoints.authApi.login({ email: db.users[0].email, password: 'TestPilot@2026' }))
await check('auth.me', () => endpoints.authApi.me())
await check('auth.updateProfile', () => endpoints.authApi.updateProfile({ title: 'QA Lead' }))
await check('auth.changePassword', () => endpoints.authApi.changePassword({ currentPassword: 'TestPilot@2026', newPassword: 'TestPilot@2027' }))
await check('auth.logout', () => endpoints.authApi.logout())
await check('auth.login again', () => endpoints.authApi.login({ email: db.users[0].email, password: 'TestPilot@2026' }))

await check('dashboard.summary', () => endpoints.dashboardApi.summary({ projectId: project.id }))
await check('projects.list', () => endpoints.projectsApi.list({ page: 1, pageSize: 5 }))
await check('projects.get', () => endpoints.projectsApi.get(project.id))
await check('projects.overview', () => endpoints.projectsApi.overview(project.id))
await check('projects.activity', () => endpoints.projectsApi.activity(project.id))
await check('projects.create', () => endpoints.projectsApi.create({ name: 'Smoke Project', key: 'SMK', description: 'Created by smoke test' }))
await check('projects.update', () => endpoints.projectsApi.update(project.id, { description: 'Smoke update' }))
await check('projects.archive', () => endpoints.projectsApi.archive(db.projects[db.projects.length - 1].id))

await check('requirements.list', () => endpoints.requirementsApi.list(project.id, { page: 1, pageSize: 5 }))
await check('requirements.get', () => endpoints.requirementsApi.get(requirement.id))
await check('requirements.create', () =>
  endpoints.requirementsApi.create(project.id, {
    title: 'Smoke requirement',
    description: 'Created by the endpoint smoke test.',
    module: 'Smoke',
    acceptanceCriteria: ['It responds.'],
    priority: 'medium',
    status: 'draft',
  }),
)
await check('requirements.update', () => endpoints.requirementsApi.update(requirement.id, { priority: 'high' }))
await check('requirements.archive', () => endpoints.requirementsApi.archive(db.requirements[db.requirements.length - 1].id))

await check('testCases.list', () => endpoints.testCasesApi.list(project.id, { page: 1, pageSize: 5 }))
await check('testCases.get', () => endpoints.testCasesApi.get(testCase.id))
await check('testCases.create', () =>
  endpoints.testCasesApi.create(project.id, {
    title: 'Smoke test case',
    description: 'Created by the endpoint smoke test.',
    type: 'functional',
    priority: 'medium',
    status: 'draft',
    steps: [{ order: 1, action: 'Open the app', expected: 'Dashboard renders' }],
  }),
)
await check('testCases.update', () => endpoints.testCasesApi.update(testCase.id, { priority: 'high' }))
await check('testCases.duplicate', () => endpoints.testCasesApi.duplicate(testCase.id))
await check('testCases.deprecate', () => endpoints.testCasesApi.deprecate(testCase.id))

await check('aiGenerator.generate', () =>
  endpoints.aiGeneratorApi.generate(project.id, { requirementId: requirement.id, count: 3, focus: 'happy path' }),
)

await check('testRuns.list', () => endpoints.testRunsApi.list(project.id, { page: 1, pageSize: 5 }))
await check('testRuns.get', () => endpoints.testRunsApi.get(run.id))
await check('testRuns.update', () => endpoints.testRunsApi.update(run.id, { status: 'in_progress' }))
await check(
  'testRuns.recordExecution',
  () =>
    endpoints.testRunsApi.recordExecution(run.id, execution.id, {
      result: 'pass',
      notes: 'Recorded by smoke test.',
      durationMinutes: 2,
    }),
)

await check('defects.list', () => endpoints.defectsApi.list(project.id, { page: 1, pageSize: 5 }))
await check('defects.get', () => endpoints.defectsApi.get(defect.id))
await check('defects.create', () =>
  endpoints.defectsApi.create(project.id, {
    title: 'Smoke defect',
    description: 'Created by the endpoint smoke test.',
    severity: 'medium',
    priority: 'medium',
    status: 'open',
    reproductionSteps: [{ order: 1, action: 'Click the button', expected: 'Nothing happens' }],
  }),
)
await check('defects.update', () => endpoints.defectsApi.update(defect.id, { priority: 'high' }))
await check('defects.addComment', () => endpoints.defectsApi.addComment(defect.id, 'Smoke comment'))
await check('defects.transition', () => endpoints.defectsApi.transition(defect.id, 'in_progress'))
await check('defects.retest', () => endpoints.defectsApi.retest(defect.id))

await check('regression.changeSets', () => endpoints.regressionApi.changeSets(project.id))
await check('regression.changeSet', () => endpoints.regressionApi.changeSet(project.id, changeSet.id))
await check('regression.saveSuite', () =>
  endpoints.regressionApi.saveSuite(project.id, {
    name: 'Smoke regression suite',
    changeSetId: changeSet.id,
    testCaseIds: changeSet.recommendations.map((item) => item.testCaseId),
  }),
)

await check('automation.listJobs', () => endpoints.automationApi.listJobs(project.id))
await check('automation.getJob', () => endpoints.automationApi.getJob(job.id))
await check('automation.updateJob', () => endpoints.automationApi.updateJob(job.id, { schedule: '0 2 * * *' }))
await check('automation.startJob', () => endpoints.automationApi.startJob(job.id))

const failingJob = db.automationJobs.find((item) => item.lastRun?.failed > 0) ?? db.automationJobs[0]
await check('automation.rerunJob', () => endpoints.automationApi.rerunJob(failingJob.id))

await check('reports.summary', () => endpoints.reportsApi.summary(project.id))
await check('reports.coverage', () => endpoints.reportsApi.coverage(project.id))
await check('reports.defectAging', () => endpoints.reportsApi.defectAging(project.id))
await check('reports.releaseReadiness', () => endpoints.reportsApi.releaseReadiness(project.id))

await check('settings.members', () => endpoints.settingsApi.members())
await check('settings.workspace', () => endpoints.settingsApi.workspace())
await check('settings.updateWorkspace', () => endpoints.settingsApi.updateWorkspace({ name: 'TestPilot Engineering' }))
await check('settings.inviteMember', () => endpoints.settingsApi.inviteMember({ email: 'smoke@testpilot.dev', role: 'tester' }))
await check('settings.updateMember', () => endpoints.settingsApi.updateMember(db.users[1].id, { role: 'qa_lead' }))
await check('settings.removeMember', () => endpoints.settingsApi.removeMember(db.users[db.users.length - 1].id))
await check('settings.preferences', () => endpoints.settingsApi.preferences())
await check('settings.updatePreferences', () => endpoints.settingsApi.updatePreferences({ compactTables: true }))

await check('notifications.list', () => endpoints.notificationsApi.list())
await check('notifications.markRead', () => endpoints.notificationsApi.markRead(db.notifications[0].id))
await check('notifications.markAllRead', () => endpoints.notificationsApi.markAllRead())
await check('users.list', () => endpoints.usersApi.list({ pageSize: 100 }))

console.log(`\n${total - failures}/${total} endpoint calls succeeded through the mock adapter.`)
process.exit(failures === 0 ? 0 : 1)