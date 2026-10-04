import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess } from '../../services/permissions.js'
import { paginate, readPaging, orderBy } from '../../utils/query.js'

const DAY_MS = 24 * 60 * 60 * 1000

function percent(part, whole) {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10
}

function range(query, fallbackDays = 30) {
  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - fallbackDays * DAY_MS)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw ApiError.badRequest('from and to must be valid dates.')
  }
  return { from, to }
}

export async function listActivity(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)

  return paginate('activityLog', {
    where: {
      projectId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: orderBy(query, { createdAt: 'createdAt' }, 'createdAt'),
    ...paging,
  })
}

export async function projectDashboard(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const { from, to } = range(query)

  const [requirements, testCases, runs, openDefects] = await Promise.all([
    prisma.requirement.groupBy({ by: ['status'], where: { projectId, archivedAt: null }, _count: { _all: true } }),
    prisma.testCase.groupBy({ by: ['status'], where: { projectId, archivedAt: null }, _count: { _all: true } }),
    prisma.testRun.findMany({
      where: { projectId, createdAt: { gte: from, lte: to } },
      select: { id: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.defect.groupBy({ by: ['severity', 'status'], where: { projectId }, _count: { _all: true } }),
  ])

  const executed = runs.filter((run) => run.status === 'completed').length
  const inFlight = runs.filter((run) => run.status === 'in_progress' || run.status === 'planned').length

  return {
    period: { from, to },
    requirements: {
      total: requirements.reduce((sum, row) => sum + row._count._all, 0),
      byStatus: Object.fromEntries(requirements.map((row) => [row.status, row._count._all])),
    },
    testCases: {
      total: testCases.reduce((sum, row) => sum + row._count._all, 0),
      byStatus: Object.fromEntries(testCases.map((row) => [row.status, row._count._all])),
    },
    runs: { total: runs.length, completed: executed, inFlight, completionRate: percent(executed, runs.length) },
    defects: {
      total: openDefects.reduce((sum, row) => sum + row._count._all, 0),
      bySeverity: Object.fromEntries(openDefects.map((row) => [row.severity, row._count._all])),
      open: openDefects.filter((row) => row.status !== 'closed').reduce((sum, row) => sum + row._count._all, 0),
    },
  }
}

export async function qualityTrend(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const { from, to } = range(query)

  const results = await prisma.testResult.findMany({
    where: { run: { projectId, createdAt: { gte: from, lte: to } }, status: { not: 'not_run' } },
    select: { status: true, executedAt: true },
  })

  const buckets = new Map()
  for (const result of results) {
    const day = (result.executedAt ?? new Date()).toISOString().slice(0, 10)
    const bucket = buckets.get(day) ?? { day, passed: 0, failed: 0, blocked: 0 }
    if (result.status === 'pass') bucket.passed += 1
    else if (result.status === 'fail') bucket.failed += 1
    else bucket.blocked += 1
    buckets.set(day, bucket)
  }

  return [...buckets.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((bucket) => {
      const executed = bucket.passed + bucket.failed + bucket.blocked
      return { ...bucket, executed, passRate: percent(bucket.passed, executed) }
    })
}

export async function coverageReport(auth, projectId) {
  await resolveProjectAccess(auth, projectId)

  const [requirements, links] = await Promise.all([
    prisma.requirement.findMany({
      where: { projectId, archivedAt: null },
      select: { id: true, ref: true, title: true, module: true, _count: { select: { links: true } } },
      orderBy: { ref: 'asc' },
    }),
    prisma.requirementTestCase.groupBy({
      by: ['requirementId'],
      where: { testCase: { projectId, archivedAt: null } },
      _count: { _all: true },
    }),
  ])

  const counts = new Map(links.map((row) => [row.requirementId, row._count._all]))
  const items = requirements.map((row) => ({
    id: row.id,
    ref: row.ref,
    title: row.title,
    module: row.module,
    testCaseCount: counts.get(row.id) ?? 0,
    covered: (counts.get(row.id) ?? 0) > 0,
  }))

  return {
    total: items.length,
    covered: items.filter((row) => row.covered).length,
    coverageRate: percent(items.filter((row) => row.covered).length, items.length),
    items,
  }
}

export async function executionReport(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const { from, to } = range(query)

  const runs = await prisma.testRun.findMany({
    where: { projectId, createdAt: { gte: from, lte: to } },
    include: { results: { select: { status: true, durationMinutes: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const items = runs.map((run) => {
    const passed = run.results.filter((row) => row.status === 'pass').length
    const failed = run.results.filter((row) => row.status === 'fail').length
    const blocked = run.results.filter((row) => row.status === 'blocked').length
    const notRun = run.results.filter((row) => row.status === 'not_run').length
    const executed = passed + failed + blocked
    const minutes = run.results.reduce((sum, row) => sum + (row.durationMinutes ?? 0), 0)
    return {
      id: run.id,
      name: run.name,
      status: run.status,
      release: run.release,
      environment: run.environment,
      completedAt: run.completedAt,
      total: run.results.length,
      passed,
      failed,
      blocked,
      notRun,
      passRate: percent(passed, executed),
      durationMinutes: Math.round(minutes),
    }
  })

  return {
    period: { from, to },
    runs: items,
    totals: {
      runs: items.length,
      passed: items.reduce((sum, row) => sum + row.passed, 0),
      failed: items.reduce((sum, row) => sum + row.failed, 0),
    },
  }
}

/**
 * Readiness reports the evidence behind every criterion. It never claims a
 * release is clean — each criterion states what was measured and whether it passed.
 */
export async function releaseReadiness(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const { from, to } = range(query, 14)

  const [latestRun, results, criticalDefects, openDefects, aiPending, flakyCases] = await Promise.all([
    prisma.testRun.findFirst({
      where: { projectId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true, createdAt: true, results: { select: { status: true, testCaseId: true } } },
    }),
    prisma.testResult.findMany({
      where: { run: { projectId, createdAt: { gte: from, lte: to } } },
      select: { status: true, testCaseId: true },
    }),
    prisma.defect.findMany({
      where: { projectId, severity: { in: ['high', 'critical'] }, status: { not: 'closed' } },
      select: { id: true, ref: true, title: true, severity: true, status: true },
    }),
    prisma.defect.count({ where: { projectId, status: { not: 'closed' } } }),
    prisma.aiGeneration.count({ where: { projectId, status: 'pending' } }),
    prisma.testResult.groupBy({
      by: ['testCaseId'],
      where: { run: { projectId, createdAt: { gte: from, lte: to } }, status: { not: 'not_run' } },
      _count: { _all: true },
    }),
  ])

  const executed = results.filter((row) => row.status !== 'not_run')
  const passed = executed.filter((row) => row.status === 'pass').length
  const failed = executed.filter((row) => row.status === 'fail')
  const notRun = results.filter((row) => row.status === 'not_run').length
  const passRate = percent(passed, executed.length)
  const flaky = flakyCases
    .map((row) => ({ testCaseId: row.testCaseId, executions: row._count._all }))
    .filter((row) => row.executions >= 2)

  const criteria = [
    {
      id: 'execution_coverage',
      label: 'Execution coverage',
      passed: executed.length > 0 && notRun === 0,
      value: percent(executed.length, results.length),
      threshold: 'All planned cases executed',
      evidence: `${executed.length} executed, ${notRun} not run, pass rate ${passRate}%`,
    },
    {
      id: 'unresolved_critical_defects',
      label: 'No unresolved critical defects',
      passed: criticalDefects.length === 0,
      value: criticalDefects.length,
      threshold: '0 open high or critical defects',
      evidence: criticalDefects.length
        ? criticalDefects.map((row) => `${row.ref} (${row.severity}) ${row.title}`).join('; ')
        : 'No open high or critical defects',
    },
    {
      id: 'failed_tests',
      label: 'No failing tests in the window',
      passed: failed.length === 0,
      value: failed.length,
      threshold: '0 failed results',
      evidence: failed.length ? `${failed.length} failing result(s) in the selected window` : 'No failures recorded',
    },
    {
      id: 'flaky_tests',
      label: 'No repeatedly re-executed cases',
      passed: flaky.length === 0,
      value: flaky.length,
      threshold: 'No case executed more than once in the window',
      evidence: flaky.length
        ? `${flaky.length} case(s) executed repeatedly: ${flaky.slice(0, 5).map((row) => row.testCaseId).join(', ')}`
        : 'No repeated executions in the window',
    },
    {
      id: 'unreviewed_ai_suggestions',
      label: 'No unreviewed AI suggestions',
      passed: aiPending === 0,
      value: aiPending,
      threshold: '0 pending generations',
      evidence: aiPending ? `${aiPending} generation(s) still pending review` : 'All generations reviewed',
    },
  ]

  const blockers = criteria.filter((criterion) => !criterion.passed)

  return {
    period: { from, to },
    latestRun: latestRun
      ? { id: latestRun.id, name: latestRun.name, status: latestRun.status, createdAt: latestRun.createdAt }
      : null,
    openDefects,
    ready: blockers.length === 0,
    criteria,
    blockers: blockers.map((criterion) => ({ id: criterion.id, label: criterion.label, evidence: criterion.evidence })),
  }
}

export async function defectReport(auth, projectId) {
  await resolveProjectAccess(auth, projectId)

  const [bySeverity, byStatus, byAssignee, aging] = await Promise.all([
    prisma.defect.groupBy({ by: ['severity'], where: { projectId }, _count: { _all: true } }),
    prisma.defect.groupBy({ by: ['status'], where: { projectId }, _count: { _all: true } }),
    prisma.defect.groupBy({
      by: ['assigneeId'],
      where: { projectId, assigneeId: { not: null } },
      _count: { _all: true },
      include: { assignee: { select: { id: true, name: true } } },
    }),
    prisma.defect.findMany({
      where: { projectId, status: { not: 'closed' } },
      select: { id: true, ref: true, title: true, severity: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const now = Date.now()
  return {
    bySeverity: bySeverity.map((row) => ({ severity: row.severity, count: row._count._all })),
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    byAssignee: byAssignee.map((row) => ({
      id: row.assignee?.id ?? null,
      name: row.assignee?.name ?? 'Unassigned',
      count: row._count._all,
    })),
    open: aging.map((row) => ({ ...row, ageDays: Math.floor((now - row.createdAt.getTime()) / DAY_MS) })),
  }
}
