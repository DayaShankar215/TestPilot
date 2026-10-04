import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, textSearch, orderBy, listMeta } from '../../utils/query.js'

const SORTABLE = { name: 'name', status: 'status', createdAt: 'createdAt', updatedAt: 'updatedAt' }

const RESULT_INCLUDE = {
  testCase: { select: { id: true, ref: true, title: true, type: true, isAutomated: true } },
  executedBy: { select: { id: true, name: true } },
}

function summarize(results) {
  const total = results.length
  const passed = results.filter((row) => row.status === 'pass').length
  const failed = results.filter((row) => row.status === 'fail').length
  const blocked = results.filter((row) => row.status === 'blocked').length
  const notRun = results.filter((row) => row.status === 'not_run').length
  const executed = passed + failed + blocked
  return {
    total,
    passed,
    failed,
    blocked,
    notRun,
    passRate: executed === 0 ? 0 : Math.round((passed / executed) * 1000) / 10,
  }
}

async function loadRun(auth, projectId, runId) {
  await resolveProjectAccess(auth, projectId)
  const run = await prisma.testRun.findFirst({
    where: { id: runId, projectId },
    include: {
      createdBy: { select: { id: true, name: true } },
      results: { include: RESULT_INCLUDE, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!run) throw ApiError.notFound('Test run not found.')
  return run
}

export async function listRuns(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)
  const search = textSearch(query.search, ['name', 'release', 'build'])

  const where = {
    projectId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.release ? { release: query.release } : {}),
    ...(query.environment ? { environment: query.environment } : {}),
    ...(search ? { AND: [search] } : {}),
  }

  const [runs, total] = await Promise.all([
    prisma.testRun.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } }, results: { select: { status: true } } },
      orderBy: orderBy(query, SORTABLE, 'createdAt'),
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.testRun.count({ where }),
  ])

  return {
    items: runs.map((run) => {
      const { results, ...rest } = run
      return { ...rest, summary: summarize(results) }
    }),
    meta: listMeta({ page: paging.page, pageSize: paging.pageSize, total }),
  }
}

export async function getRun(auth, projectId, runId) {
  const run = await loadRun(auth, projectId, runId)
  const { results, ...rest } = run
  return { ...rest, results, summary: summarize(results) }
}

export async function createRun(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester', allowArchived: false })

  const owned = await prisma.testCase.count({ where: { id: { in: input.testCaseIds }, projectId, archivedAt: null } })
  if (owned !== new Set(input.testCaseIds).size) {
    throw ApiError.badRequest('One or more test cases do not belong to this project.')
  }

  if (input.planId) {
    const plan = await prisma.regressionPlan.findFirst({ where: { id: input.planId, projectId } })
    if (!plan) throw ApiError.notFound('Regression plan not found.')
  }

  const run = await prisma.testRun.create({
    data: {
      projectId,
      name: input.name,
      release: input.release ?? null,
      build: input.build ?? null,
      environment: input.environment,
      scope: input.scope,
      planId: input.planId ?? null,
      createdById: auth.user.id,
      // A run always starts with one not_run row per case, so progress is visible.
      results: {
        create: input.testCaseIds.map((testCaseId) => ({ testCaseId, status: 'not_run' })),
      },
    },
    include: { createdBy: { select: { id: true, name: true } }, results: { include: RESULT_INCLUDE } },
  })

  await recordActivity(auth, {
    projectId,
    action: 'testrun.created',
    entityType: 'testRun',
    entityId: run.id,
    summary: `Created run ${run.name} with ${input.testCaseIds.length} cases`,
  })

  const { results, ...rest } = run
  return { ...rest, results, summary: summarize(results) }
}

export async function updateRun(auth, projectId, runId, input) {
  const run = await loadRun(auth, projectId, runId)
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const data = {}
  for (const field of ['name', 'release', 'build', 'status']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }

  // Timestamps follow the status so run duration can be derived later.
  if (input.status === 'in_progress' && !run.startedAt) data.startedAt = new Date()
  if (input.status === 'completed' || input.status === 'aborted') {
    data.completedAt = new Date()
    if (!run.startedAt) data.startedAt = run.createdAt
  }

  const updated = await prisma.testRun.update({
    where: { id: runId },
    data,
    include: { createdBy: { select: { id: true, name: true } }, results: { include: RESULT_INCLUDE } },
  })

  const { results, ...rest } = updated
  return { ...rest, results, summary: summarize(results) }
}

/**
 * The placeholder row created with the run is filled in the first time a case is
 * recorded. Later recordings append a new attempt so retest history is preserved.
 */
export async function recordResult(auth, projectId, runId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const run = await prisma.testRun.findFirst({ where: { id: runId, projectId } })
  if (!run) throw ApiError.notFound('Test run not found.')

  const testCase = await prisma.testCase.findFirst({ where: { id: input.testCaseId, projectId } })
  if (!testCase) throw ApiError.badRequest('That test case does not belong to this project.')

  const data = {
    status: input.status,
    notes: input.notes ?? null,
    durationMinutes: input.durationMinutes ?? null,
    automated: input.automated ?? false,
    executedById: auth.user.id,
    executedAt: new Date(),
  }

  const placeholder = await prisma.testResult.findFirst({
    where: { runId, testCaseId: input.testCaseId, status: 'not_run' },
    orderBy: { attempt: 'asc' },
    select: { id: true },
  })

  let result
  if (placeholder) {
    result = await prisma.testResult.update({ where: { id: placeholder.id }, data, include: RESULT_INCLUDE })
  } else {
    const latest = await prisma.testResult.findFirst({
      where: { runId, testCaseId: input.testCaseId },
      orderBy: { attempt: 'desc' },
      select: { attempt: true },
    })
    result = await prisma.testResult.create({
      data: { ...data, runId, testCaseId: input.testCaseId, attempt: (latest?.attempt ?? 0) + 1 },
      include: RESULT_INCLUDE,
    })
  }

  if (input.status === 'fail' && input.defectId) {
    await prisma.defectTestResult.upsert({
      where: { defectId_resultId: { defectId: input.defectId, resultId: result.id } },
      create: { defectId: input.defectId, resultId: result.id },
      update: {},
    })
  }

  return getRun(auth, projectId, runId)
}

export async function listResults(auth, projectId, runId, query) {
  await resolveProjectAccess(auth, projectId)
  const run = await prisma.testRun.findFirst({ where: { id: runId, projectId } })
  if (!run) throw ApiError.notFound('Test run not found.')

  const paging = readPaging(query)
  const where = { runId, ...(query.status ? { status: query.status } : {}) }

  const { items, meta } = await paginate('testResult', {
    where,
    include: RESULT_INCLUDE,
    orderBy: { createdAt: 'asc' },
    ...paging,
  })

  return { items, meta }
}

export async function updateResult(auth, resultId, input) {
  const existing = await prisma.testResult.findUnique({
    where: { id: resultId },
    select: { id: true, runId: true, run: { select: { projectId: true } } },
  })
  if (!existing) throw ApiError.notFound('Test result not found.')

  await resolveProjectAccess(auth, existing.run.projectId, { minimumRole: 'tester' })

  const data = {}
  for (const field of ['status', 'notes', 'durationMinutes', 'executedAt']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }

  return prisma.testResult.update({ where: { id: resultId }, data, include: RESULT_INCLUDE })
}