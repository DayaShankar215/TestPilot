function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(20260314)

const pick = (items) => items[Math.floor(random() * items.length)]

const pickSome = (items, min, max) => {
  const count = min + Math.floor(random() * (max - min + 1))
  const pool = [...items]
  const result = []
  for (let i = 0; i < count && pool.length; i += 1) {
    result.push(pool.splice(Math.floor(random() * pool.length), 1)[0])
  }
  return result
}

const weightedPick = (entries) => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return entries[entries.length - 1][0]
}

const int = (min, max) => min + Math.floor(random() * (max - min + 1))

const DAY = 86400000

const iso = (date) => new Date(date).toISOString()

const daysAgo = (days, hour = 10, minute = 0) => {
  const date = new Date(Date.now() - days * DAY)
  date.setHours(hour, minute, int(0, 59), 0)
  return date.toISOString()
}

const MODULES = [
  'Authentication',
  'Billing',
  'Notifications',
  'Reporting',
  'User Management',
  'Search',
  'File Upload',
  'Audit Log',
  'Integrations',
  'Dashboard',
]

const USERS = [
  { id: 'usr-1', name: 'Arun Mehta', email: 'arun.mehta@testpilot.dev', role: 'admin', timezone: 'Asia/Kolkata', title: 'Head of QA' },
  { id: 'usr-2', name: 'Priya Sharma', email: 'priya.sharma@testpilot.dev', role: 'manager', timezone: 'Asia/Kolkata', title: 'QA Lead' },
  { id: 'usr-3', name: 'Daniel Okafor', email: 'daniel.okafor@testpilot.dev', role: 'tester', timezone: 'Europe/London', title: 'SDET' },
  { id: 'usr-4', name: 'Sofia Alvarez', email: 'sofia.alvarez@testpilot.dev', role: 'tester', timezone: 'America/Los_Angeles', title: 'QA Engineer' },
  { id: 'usr-5', name: 'Kenji Watanabe', email: 'kenji.watanabe@testpilot.dev', role: 'developer', timezone: 'Asia/Tokyo', title: 'Backend Engineer' },
  { id: 'usr-6', name: 'Maya Haddad', email: 'maya.haddad@testpilot.dev', role: 'developer', timezone: 'Europe/Berlin', title: 'Frontend Engineer' },
  { id: 'usr-7', name: 'Tom Bennett', email: 'tom.bennett@testpilot.dev', role: 'tester', timezone: 'America/New_York', title: 'QA Engineer' },
  { id: 'usr-8', name: 'Nina Kowalski', email: 'nina.kowalski@testpilot.dev', role: 'viewer', timezone: 'Europe/Berlin', title: 'Product Owner' },
  { id: 'usr-9', name: 'Rahul Iyer', email: 'rahul.iyer@testpilot.dev', role: 'developer', timezone: 'Asia/Kolkata', title: 'Platform Engineer' },
  { id: 'usr-10', name: 'Elena Petrova', email: 'elena.petrova@testpilot.dev', role: 'manager', timezone: 'Europe/Berlin', title: 'Engineering Manager' },
  { id: 'usr-11', name: 'Marcus Reed', email: 'marcus.reed@testpilot.dev', role: 'tester', timezone: 'America/Chicago', title: 'Automation Engineer' },
  { id: 'usr-12', name: 'Aisha Rahman', email: 'aisha.rahman@testpilot.dev', role: 'viewer', timezone: 'Asia/Singapore', title: 'QA Analyst' },
]

const PROJECTS = [
  {
    id: 'prj-1',
    key: 'TP',
    name: 'TestPilot Core Platform',
    description:
      'The main TestPilot web application: authentication, test case authoring, execution tracking and reporting.',
    status: 'active',
    ownerId: 'usr-1',
    memberIds: ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-8'],
    release: '2026.03',
    environment: 'staging',
    createdAt: daysAgo(240, 9),
  },
  {
    id: 'prj-2',
    key: 'PAY',
    name: 'Payments Gateway',
    description: 'Subscription billing, invoicing and the payment gateway integration.',
    status: 'active',
    ownerId: 'usr-10',
    memberIds: ['usr-10', 'usr-2', 'usr-5', 'usr-7', 'usr-9'],
    release: '2026.03',
    environment: 'qa',
    createdAt: daysAgo(180, 11),
  },
  {
    id: 'prj-3',
    key: 'MOB',
    name: 'Mobile Companion App',
    description: 'iOS and Android companion application with offline execution support.',
    status: 'planning',
    ownerId: 'usr-10',
    memberIds: ['usr-10', 'usr-4', 'usr-6'],
    release: '2026.05',
    environment: 'dev',
    createdAt: daysAgo(45, 14),
  },
  {
    id: 'prj-4',
    key: 'INT',
    name: 'Integrations Hub',
    description: 'Third-party integrations: Jira, Slack, GitHub and CI providers.',
    status: 'active',
    ownerId: 'usr-9',
    memberIds: ['usr-9', 'usr-3', 'usr-11', 'usr-5'],
    release: '2026.02',
    environment: 'staging',
    createdAt: daysAgo(320, 8),
  },
  {
    id: 'prj-5',
    key: 'LEG',
    name: 'Legacy Import Utility',
    description: 'One-off migration tool importing historical test cases from spreadsheets.',
    status: 'paused',
    ownerId: 'usr-2',
    memberIds: ['usr-2', 'usr-7'],
    release: '2025.11',
    environment: 'qa',
    createdAt: daysAgo(400, 16),
  },
  {
    id: 'prj-6',
    key: 'SEC',
    name: 'Security Hardening 2026',
    description: 'Cross-cutting security requirements: SSO, audit logging, session handling.',
    status: 'completed',
    ownerId: 'usr-1',
    memberIds: ['usr-1', 'usr-9', 'usr-11', 'usr-3'],
    release: '2026.01',
    environment: 'production',
    createdAt: daysAgo(280, 10),
  },
]

const REQUIREMENT_BLUEPRINTS = [
  ['User can register with email and password', 'Authentication', 'A new user can create an account using a valid email address and a password that meets the complexity policy, and receives a verification email within 60 seconds.'],
  ['User can log in with valid credentials', 'Authentication', 'An active user can authenticate with a valid email and password and is redirected to the dashboard. Locked or unverified accounts are rejected with an explicit message.'],
  ['Password reset link expires after 60 minutes', 'Authentication', 'A password reset link issued to a valid email becomes unusable after 60 minutes and the user is prompted to request a new one.'],
  ['Session persists across browser restarts', 'Authentication', 'A logged-in user remains authenticated after closing and reopening the browser, until the session is explicitly terminated or expires.'],
  ['Subscription plan can be upgraded mid-cycle', 'Billing', 'A user on a lower plan can upgrade to a higher plan mid-cycle, is charged the prorated difference, and the new limits apply immediately.'],
  ['Invoice is generated for every successful charge', 'Billing', 'For each successful charge an invoice is generated, stored, and emailed to the billing contact with correct tax information.'],
  ['Failed payment retries follow dunning schedule', 'Billing', 'A failed charge is retried on the configured dunning schedule and the account is suspended only after the final retry fails.'],
  ['Refund is issued to the original payment method', 'Billing', 'An approved refund is returned to the original payment method within the provider stated settlement window and is recorded against the invoice.'],
  ['Email notification respects per-user preferences', 'Notifications', 'A notification is delivered only when the recipient has enabled that notification type in their preferences.'],
  ['In-app notification centre lists unread items', 'Notifications', 'The notification centre lists unread items newest first and marks them read when opened.'],
  ['Dashboard widgets render execution trend', 'Dashboard', 'The dashboard renders an execution trend for the selected project and date range, sourced from recorded executions.'],
  ['CSV export respects active filters', 'Reporting', 'A CSV export contains exactly the rows matching the filters active at the moment of export, and states the reporting period inside the file.'],
  ['Members can be invited with a role', 'User Management', 'A workspace administrator can invite a member with a specific role; the invitation expires after 7 days if not accepted.'],
  ['Roles control administrative actions', 'User Management', 'Only members with an administrative role can manage members, workspace settings and destructive project actions.'],
  ['Global search returns scoped results', 'Search', 'Global search is limited to the entities the current user can read and groups results by entity type.'],
  ['Large attachments upload with progress feedback', 'File Upload', 'An attachment up to the configured size limit uploads with visible progress and can be retried without losing the parent record.'],
  ['Audit log records every permission change', 'Audit Log', 'Every change to a role, membership or permission is written to the audit log with actor, timestamp and before/after values.'],
  ['Slack notifications are sent for critical defects', 'Integrations', 'A defect raised with critical severity posts a message to the configured Slack channel within 30 seconds.'],
  ['Jira issues sync status both directions', 'Integrations', 'A linked Jira issue syncs its status in both directions and conflicts are surfaced rather than silently overwritten.'],
  ['CI provider reports automated results', 'Integrations', 'A CI provider can report automated test results which are matched to TestPilot test cases and stored as automation executions.'],
]

const STEP_BLUEPRINTS = [
  ['Navigate to the {page} page', 'The {page} page loads without console errors'],
  ['Enter {value} in the {field} field', 'The {field} field accepts the value'],
  ['Select {option} from the dropdown', 'The dropdown displays {option}'],
  ['Click the {action} button', 'The {action} button is enabled and clickable'],
  ['Submit the form', 'A success notification appears within 3 seconds'],
  ['Verify the record in the list view', 'The record appears in the list with the expected values'],
  ['Attempt to submit an empty required field', 'A validation message appears and the form does not submit'],
  ['Reload the browser', 'The user remains authenticated and the record is intact'],
  ['Sign out and sign back in', 'The user can authenticate again with the same credentials'],
  ['Check the record in the audit log', 'An entry exists with the current actor and timestamp'],
  ['Trigger the action as an unauthorised role', 'A 403 response is returned and no state changes occur'],
  ['Open the report for the current date range', 'The report shows the reporting period and matching row counts'],
]

const FAILURE_NOTES = [
  'Expected the success notification but the request returned a 500 error.',
  'Validation message did not appear; form submitted with an invalid value.',
  'Record was saved but is missing from the list view until a manual refresh.',
  'Correct behaviour on staging, still reproducible on QA build 4821.',
  'Intermittent: reproduced on 3 of 10 attempts.',
]

const TEST_CASE_TITLES = [
  'Verify {module} happy path',
  'Verify {module} validation on required fields',
  'Verify {module} authorisation for restricted roles',
  'Verify {module} persistence after browser restart',
  'Verify {module} error handling on server failure',
  'Verify {module} boundary conditions',
  'Verify {module} audit log entry is written',
  'Verify {module} notification delivery preference',
  'Verify {module} list filters combine correctly',
  'Verify {module} CSV export matches filters',
  'Verify {module} session timeout handling',
  'Verify {module} empty state rendering',
]

function buildRequirements() {
  const requirements = []
  let counter = 100

  PROJECTS.forEach((project) => {
    const blueprintCount = project.id === 'prj-1' ? 14 : project.id === 'prj-2' ? 12 : 8
    const blueprints = pickSome(REQUIREMENT_BLUEPRINTS, blueprintCount, blueprintCount)

    blueprints.forEach(([titleTemplate, module, description]) => {
      counter += 1
      const status = weightedPick([
        ['draft', 8],
        ['review', 10],
        ['approved', 18],
        ['in_progress', 16],
        ['implemented', 14],
        ['verified', 28],
        ['obsolete', 6],
      ])
      const changedDaysAgo = int(0, 40)
      requirements.push({
        id: `req-${project.id}-${counter}`,
        projectId: project.id,
        ref: `REQ-${counter}`,
        title: titleTemplate,
        description,
        module,
        acceptanceCriteria: [
          `Given a ${module.toLowerCase()} scenario, when the action is performed, then the documented outcome occurs.`,
          'No console errors are produced during the flow.',
          'The outcome is recorded in the audit log with actor and timestamp.',
        ],
        priority: weightedPick([
          ['critical', 12],
          ['high', 26],
          ['medium', 40],
          ['low', 22],
        ]),
        status,
        ownerId: pick(project.memberIds),
        version: int(1, 6),
        createdAt: daysAgo(int(60, 240), 10),
        updatedAt: daysAgo(changedDaysAgo, int(9, 18)),
        lastVerifiedAt: status === 'verified' ? daysAgo(int(1, 20), 15) : null,
        tags: pickSome(['api', 'ui', 'security', 'performance', 'accessibility'], 1, 3),
      })
    })
  })

  return requirements
}

const REQUIREMENTS = buildRequirements()

function buildTestCases() {
  const testCases = []
  let counter = 1000

  PROJECTS.forEach((project) => {
    const projectRequirements = REQUIREMENTS.filter((item) => item.projectId === project.id)
    const count = project.id === 'prj-1' ? 34 : project.id === 'prj-2' ? 24 : 14

    for (let i = 0; i < count; i += 1) {
      counter += 1
      const requirement = projectRequirements[Math.floor(random() * projectRequirements.length)]
      const module = requirement?.module ?? pick(MODULES)
      const titleTemplate = pick(TEST_CASE_TITLES)
      const title = titleTemplate
        .replace('{module}', module.toLowerCase())
        .replace('{scenario}', requirement?.title.toLowerCase() ?? 'module')
      const stepTemplates = pickSome(STEP_BLUEPRINTS, 3, 6)

      testCases.push({
        id: `tc-${project.id}-${counter}`,
        projectId: project.id,
        ref: `TC-${counter}`,
        title,
        description: `Validate ${module.toLowerCase()} behaviour described in ${requirement?.ref ?? 'REQ-100'}.`,
        type: weightedPick([
          ['functional', 30],
          ['positive', 18],
          ['negative', 18],
          ['boundary', 12],
          ['integration', 12],
          ['regression', 10],
        ]),
        priority: weightedPick([
          ['critical', 10],
          ['high', 28],
          ['medium', 42],
          ['low', 20],
        ]),
        status: weightedPick([
          ['draft', 14],
          ['review', 16],
          ['approved', 60],
          ['deprecated', 10],
        ]),
        requirementIds: requirement ? [requirement.id] : [],
        module,
        preconditions: `Test account with ${pick(['tester', 'manager', 'admin', 'viewer'])} role is provisioned in the ${pick(['qa', 'staging'])} environment.`,
        testData: [
          { name: 'valid email', value: 'qa.tester@testpilot.dev' },
          { name: 'invalid email', value: 'not-an-email' },
          { name: 'boundary input', value: 'x'.repeat(255) },
        ],
        steps: stepTemplates.map(([actionTemplate, expectedTemplate], index) => ({
          id: `step-${counter}-${index}`,
          action: actionTemplate
            .replace('{page}', module.toLowerCase())
            .replace('{field}', 'email address')
            .replace('{option}', 'All statuses')
            .replace('{action}', 'Save')
            .replace('{value}', 'qa.tester@testpilot.dev'),
          expectedResult: expectedTemplate
            .replace('{page}', module.toLowerCase())
            .replace('{field}', 'email address')
            .replace('{option}', 'All statuses'),
        })),
        revision: int(1, 4),
        authorId: pick(project.memberIds),
        createdAt: daysAgo(int(20, 200), 11),
        updatedAt: daysAgo(int(0, 45), int(9, 18)),
        automated: random() < 0.35,
      })
    }
  })

  return testCases
}

const TEST_CASES = buildTestCases()

function buildExecutions(testCase, runId, runDayOffset) {
  const result = weightedPick([
    ['pass', 62],
    ['fail', 18],
    ['blocked', 8],
    ['not_run', 12],
  ])

  return {
    id: `exe-${runId}-${testCase.id}`,
    runId,
    testCaseId: testCase.id,
    projectId: testCase.projectId,
    result,
    notes: result === 'fail' ? pick(FAILURE_NOTES) : result === 'blocked' ? 'Blocked by an open defect on the dependent module.' : '',
    actualResult:
      result === 'pass'
        ? 'All steps produced the expected outcome.'
        : result === 'fail'
          ? 'Step 3 did not produce the expected outcome. See attached screenshot.'
          : '',
    executedById: pick(['usr-2', 'usr-3', 'usr-4', 'usr-7', 'usr-11']),
    executedAt: daysAgo(Math.max(runDayOffset - int(0, 2), 0), int(9, 18)),
    stepResults: testCase.steps.map((step, index) => ({
      stepId: step.id,
      result:
        result === 'pass'
          ? 'pass'
          : result === 'fail' && index === 2
            ? 'fail'
            : result === 'blocked'
              ? 'blocked'
              : 'pass',
    })),
    evidence:
      result === 'fail'
        ? [
            {
              id: `ev-${runId}-${testCase.id}-1`,
              name: `failure-${testCase.ref.toLowerCase()}.png`,
              size: int(48000, 320000),
              uploadedAt: daysAgo(Math.max(runDayOffset - 1, 0), 12),
            },
          ]
        : [],
  }
}

function buildTestRuns() {
  const runs = []
  let counter = 0

  PROJECTS.filter((project) => project.status !== 'planning').forEach((project) => {
    const projectCases = TEST_CASES.filter((item) => item.projectId === project.id && item.status !== 'draft')
    const runCount = project.id === 'prj-1' ? 5 : 3

    for (let i = 0; i < runCount; i += 1) {
      counter += 1
      const dayOffset = i * 7 + int(1, 4)
      const cases = pickSome(projectCases, Math.min(8, projectCases.length), Math.min(18, projectCases.length))
      const status = weightedPick([
        ['completed', 62],
        ['in_progress', 22],
        ['planned', 10],
        ['aborted', 6],
      ])
      const executions = cases.map((testCase) => buildExecutions(testCase, `run-${counter}`, dayOffset))

      runs.push({
        id: `run-${counter}`,
        projectId: project.id,
        name: `${project.key} ${project.release} — ${['Smoke', 'Full Regression', 'Release Candidate', 'Integration', 'Hotfix Verification'][i % 5]}`,
        release: project.release,
        build: `build-${4820 + counter}`,
        environment: project.environment,
        assigneeId: pick(project.memberIds),
        status,
        scope: i % 5 === 1 ? 'regression' : i % 5 === 0 ? 'smoke' : 'targeted',
        startedAt: daysAgo(dayOffset, 9),
        completedAt: status === 'completed' ? daysAgo(Math.max(dayOffset - int(0, 2), 0), 17) : null,
        createdAt: daysAgo(dayOffset + 2, 15),
        executions,
      })
    }
  })

  return runs
}

const TEST_RUNS = buildTestRuns()

function buildDefects() {
  const defects = []
  let counter = 500

  TEST_RUNS.filter((run) => run.status === 'completed' || run.status === 'in_progress').forEach((run) => {
    const failed = run.executions.filter((execution) => execution.result === 'fail')

    failed.forEach((execution) => {
      counter += 1
      const testCase = TEST_CASES.find((item) => item.id === execution.testCaseId)
      const status = weightedPick([
        ['new', 14],
        ['triaged', 12],
        ['in_progress', 20],
        ['resolved', 16],
        ['verified', 14],
        ['reopened', 8],
        ['closed', 12],
        ['deferred', 4],
      ])
      const createdAt = execution.executedAt

      defects.push({
        id: `bug-${run.id}-${counter}`,
        projectId: run.projectId,
        ref: `BUG-${counter}`,
        title: `${testCase?.title ?? 'Test case'} fails on ${run.environment}`,
        description: execution.notes,
        reproductionSteps: testCase?.steps.map((step, index) => `${index + 1}. ${step.action}`) ?? [],
        expectedResult: testCase?.steps[2]?.expectedResult ?? 'The documented outcome occurs.',
        actualResult: execution.actualResult,
        severity: weightedPick([
          ['critical', 10],
          ['high', 24],
          ['medium', 36],
          ['low', 22],
          ['trivial', 8],
        ]),
        priority: weightedPick([
          ['critical', 12],
          ['high', 30],
          ['medium', 38],
          ['low', 20],
        ]),
        status,
        assigneeId: pick(PROJECTS.find((item) => item.id === run.projectId)?.memberIds ?? ['usr-1']),
        reporterId: execution.executedById,
        requirementId: testCase?.requirementIds?.[0] ?? null,
        testCaseId: testCase?.id ?? null,
        executionId: execution.id,
        runId: run.id,
        attachments: execution.evidence.map((item) => ({ ...item, kind: 'image' })),
        comments: pickSome(
          [
            'Reproduced on the staging build. Confirmed by the reporter.',
            'Root cause appears to be a missing null check in the service layer.',
            'Fix is merged behind a feature flag; waiting on the release train.',
            'Cannot reproduce on QA build 4821. Closing pending more evidence.',
          ],
          int(0, 3),
        ).map((body, index) => ({
          id: `cmt-${counter}-${index}`,
          body,
          authorId: pick(['usr-1', 'usr-2', 'usr-3', 'usr-5', 'usr-9']),
          createdAt: daysAgo(int(0, 20), int(9, 18)),
        })),
        statusHistory: [
          { status: 'new', changedAt: createdAt, changedById: execution.executedById },
          ...(status !== 'new'
            ? [{ status, changedAt: daysAgo(int(0, 25), int(9, 18)), changedById: pick(['usr-1', 'usr-2', 'usr-5']) }]
            : []),
        ],
        createdAt,
        updatedAt: daysAgo(int(0, 25), int(9, 18)),
        resolvedAt: ['resolved', 'verified', 'closed'].includes(status) ? daysAgo(int(0, 20), 12) : null,
      })
    })
  })

  return defects
}

const DEFECTS = buildDefects()

function buildRegressionChangeSets() {
  const changeSets = []

  PROJECTS.filter((project) => project.status === 'active').forEach((project) => {
    const projectRequirements = REQUIREMENTS.filter(
      (item) => item.projectId === project.id && item.status !== 'obsolete',
    )
    const recent = [...projectRequirements]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)

    if (recent.length < 2) return

    const requirements = pickSome(recent, 2, 4)
    const recommended = TEST_CASES.filter((item) => item.projectId === project.id && item.status === 'approved')
      .filter((item) => requirements.some((req) => item.requirementIds.includes(req.id)))
      .slice(0, 6)

    changeSets.push({
      id: `cs-${project.id}-1`,
      projectId: project.id,
      name: `${project.module ?? project.key} change set — ${requirements[0].module}`,
      module: requirements[0].module,
      createdAt: daysAgo(int(1, 9), 16),
      createdById: pick(project.memberIds),
      requirementIds: requirements.map((item) => item.id),
      baselineRunId: TEST_RUNS.filter((run) => run.projectId === project.id).slice(-1)[0]?.id ?? null,
      recommendations: (recommended.length ? recommended : TEST_CASES.filter((item) => item.projectId === project.id).slice(0, 4)).map(
        (testCase, index) => {
          const direct = requirements.some((req) => testCase.requirementIds.includes(req.id))
          return {
            id: `rec-${project.id}-1-${index}`,
            testCaseId: testCase.id,
            impact: direct ? 'direct' : index % 2 === 0 ? 'dependency' : 'adjacent',
            confidence: direct ? (index % 3 === 0 ? 'high' : 'medium') : 'low',
            reason: direct
              ? `Covers ${requirements.find((req) => testCase.requirementIds.includes(req.id)).ref}, which changed in this change set.`
              : `Shares the ${requirements[0].module} module and the same service dependency as the changed requirements.`,
            viaPaths: direct
              ? [`${requirements.find((req) => testCase.requirementIds.includes(req.id)).ref} → ${testCase.ref}`]
              : [`${requirements[0].ref} → ${requirements[0].module} service → ${testCase.ref}`],
            lastResult: weightedPick([
              ['pass', 58],
              ['fail', 22],
              ['blocked', 8],
              ['not_run', 12],
            ]),
          }
        },
      ),
    })
  })

  return changeSets
}

const REGRESSION_CHANGE_SETS = buildRegressionChangeSets()

const AUTOMATION_JOBS = PROJECTS.filter((project) => project.status === 'active')
  .flatMap((project) =>
    ['Smoke Suite', 'API Contract Suite', 'Critical Path Suite'].map((suite, index) => {
      const jobCases = TEST_CASES.filter(
        (item) => item.projectId === project.id && item.automated,
      ).slice(0, 6)
      const total = jobCases.length * int(3, 6)
      const failed = int(0, Math.max(1, Math.floor(total * 0.3)))
      const status = weightedPick([
        ['passed', 45],
        ['failed', 30],
        ['running', 8],
        ['queued', 7],
        ['timed_out', 5],
        ['cancelled', 5],
      ])

      return {
        id: `job-${project.id}-${index + 1}`,
        projectId: project.id,
        name: suite,
        suite,
        framework: pick(['playwright', 'cypress', 'jest', 'selenium']),
        targetEnvironment: pick(['qa', 'staging']),
        trigger: pick(['on-push', 'nightly', 'manual']),
        schedule: pick(['0 2 * * *', '0 */4 * * *', '15 3 * * 1-5', '0 6 * * 0']),
        notifyOnFailure: random() < 0.6,
        enabled: random() < 0.85,
        testCaseIds: jobCases.map((item) => item.id),
        lastRun: {
          id: `jobrun-${project.id}-${index + 1}-1`,
          status,
          startedAt: daysAgo(int(0, 3), int(2, 22)),
          durationMs: int(45000, 900000),
          total,
          passed: Math.max(total - failed, 0),
          failed,
          skipped: int(0, 3),
          commit: `${Math.random().toString(16).slice(2, 9)}`,
          branch: pick(['main', 'release/2026.03', 'develop']),
        },
        history: Array.from({ length: int(3, 6) }, (_, historyIndex) => {
          const historyTotal = total
          const historyFailed = int(0, Math.max(1, Math.floor(historyTotal * 0.25)))
          return {
            id: `jobrun-${project.id}-${index + 1}-${historyIndex + 2}`,
            status: weightedPick([
              ['passed', 55],
              ['failed', 30],
              ['timed_out', 8],
              ['cancelled', 7],
            ]),
            startedAt: daysAgo(historyIndex * 2 + 2, int(2, 22)),
            durationMs: int(45000, 900000),
            total: historyTotal,
            passed: Math.max(historyTotal - historyFailed, 0),
            failed: historyFailed,
            commit: Math.random().toString(16).slice(2, 9),
            branch: pick(['main', 'release/2026.03', 'develop']),
          }
        }),
        failures:
          status === 'failed' || status === 'timed_out'
            ? jobCases.slice(0, Math.min(failed, 2)).map((testCase, failureIndex) => ({
                id: `fail-${project.id}-${index + 1}-${failureIndex}`,
                testCaseId: testCase.id,
                testCaseRef: testCase.ref,
                message: pick([
                  'expect(locator).toBeVisible() timed out after 30000ms',
                  'Expected status code 200 but received 500',
                  'Element not found: role=button[name="Save"]',
                  'Timeout exceeded while waiting for network response',
                ]),
                screenshot: `artifacts/${testCase.ref.toLowerCase()}-failure.png`,
                log: `2026-03-14T09:${10 + failureIndex}:22.114Z  INFO  worker started\n2026-03-14T09:${10 + failureIndex}:24.801Z  ERROR assertion failed: expected visible, received hidden\n2026-03-14T09:${11 + failureIndex}:02.440Z  INFO  artifacts written to ./artifacts`,
              }))
            : [],
      }
    }),
  )

const ACTIVITIES = (() => {
  const activity = []
  PROJECTS.forEach((project) => {
    const projectDefects = DEFECTS.filter((item) => item.projectId === project.id)
    const projectRuns = TEST_RUNS.filter((item) => item.projectId === project.id)
    const projectCases = TEST_CASES.filter((item) => item.projectId === project.id)

    activity.push({
      id: `act-${project.id}-run`,
      projectId: project.id,
      actorId: pick(project.memberIds),
      type: 'run_completed',
      message: `completed test run ${projectRuns[0]?.name ?? 'a test run'}`,
      entityType: 'testRun',
      entityId: projectRuns[0]?.id ?? null,
      createdAt: projectRuns[0]?.completedAt ?? daysAgo(3, 16),
    })
    activity.push({
      id: `act-${project.id}-defect`,
      projectId: project.id,
      actorId: projectDefects[0]?.reporterId ?? pick(project.memberIds),
      type: 'defect_opened',
      message: `opened defect ${projectDefects[0]?.ref ?? 'BUG-500'}: ${projectDefects[0]?.title ?? 'Test failure'}`,
      entityType: 'defect',
      entityId: projectDefects[0]?.id ?? null,
      createdAt: projectDefects[0]?.createdAt ?? daysAgo(2, 11),
    })
    activity.push({
      id: `act-${project.id}-case`,
      projectId: project.id,
      actorId: projectCases[0]?.authorId ?? pick(project.memberIds),
      type: 'test_case_created',
      message: `created test case ${projectCases[0]?.ref ?? 'TC-1000'}`,
      entityType: 'testCase',
      entityId: projectCases[0]?.id ?? null,
      createdAt: projectCases[0]?.createdAt ?? daysAgo(4, 14),
    })
    activity.push({
      id: `act-${project.id}-member`,
      projectId: project.id,
      actorId: pick(project.memberIds),
      type: 'member_joined',
      message: 'joined the project',
      entityType: 'member',
      entityId: null,
      createdAt: daysAgo(int(5, 30), 12),
    })
  })

  return activity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})()

const NOTIFICATIONS = [
  { id: 'ntf-1', title: 'Critical defect assigned', message: 'BUG-512 was assigned to you on TestPilot Core Platform.', createdAt: daysAgo(0, 8), read: false, link: null, kind: 'defect' },
  { id: 'ntf-2', title: 'Test run due', message: 'Payments Gateway 2026.03 — Smoke has 4 unexecuted cases.', createdAt: daysAgo(0, 7), read: false, link: null, kind: 'run' },
  { id: 'ntf-3', title: 'Requirement changed', message: 'REQ-108 was updated after the last completed run. Coverage may be stale.', createdAt: daysAgo(1, 16), read: false, link: null, kind: 'requirement' },
  { id: 'ntf-4', title: 'Automation job failed', message: 'Critical Path Suite failed on staging with 2 failing specs.', createdAt: daysAgo(1, 3), read: true, link: null, kind: 'automation' },
  { id: 'ntf-5', title: 'Mention in comment', message: 'Daniel Okafor mentioned you on BUG-524.', createdAt: daysAgo(3, 10), read: true, link: null, kind: 'comment' },
]

const WORKSPACE = {
  id: 'ws-1',
  name: 'TestPilot Engineering',
  slug: 'testpilot-engineering',
  plan: 'business',
  ownerId: 'usr-1',
  createdAt: daysAgo(260, 9),
  memberIds: USERS.map((user) => user.id),
}

const SESSIONS = USERS.reduce((acc, user) => {
  acc[user.email] = {
    password: 'TestPilot@2026',
    userId: user.id,
    mustChangePassword: false,
  }
  return acc
}, {})

export const db = {
  users: USERS,
  projects: PROJECTS,
  requirements: REQUIREMENTS,
  testCases: TEST_CASES,
  testRuns: TEST_RUNS,
  defects: DEFECTS,
  regressionChangeSets: REGRESSION_CHANGE_SETS,
  automationJobs: AUTOMATION_JOBS,
  activities: ACTIVITIES,
  notifications: NOTIFICATIONS,
  workspace: WORKSPACE,
  sessions: SESSIONS,
}

export const helpers = { random, pick, pickSome, int, weightedPick, daysAgo, iso }

export function nextId(prefix) {
  const match = db[`${prefix}s`] ?? []
  const max = match.reduce((acc, item) => {
    const numeric = Number(String(item.id).split('-').pop())
    return Number.isNaN(numeric) ? acc : Math.max(acc, numeric)
  }, 0)
  return `${prefix}-${max + 1}`
}
