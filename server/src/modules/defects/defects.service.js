import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, textSearch, orderBy, nextRef } from '../../utils/query.js'

const SORTABLE = { title: 'title', severity: 'severity', status: 'status', createdAt: 'createdAt', updatedAt: 'updatedAt' }

const DEFECT_INCLUDE = {
  assignee: { select: { id: true, name: true } },
  reporter: { select: { id: true, name: true } },
  testCase: { select: { id: true, ref: true, title: true } },
  comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
}

/**
 * The UI labels these fields `expectedResult`/`actualResult`, so responses
 * carry both names and keep the stored columns as the source of truth.
 */
function withUiAliases(defect) {
  if (!defect) return defect
  return { ...defect, expectedResult: defect.expectedBehavior, actualResult: defect.actualBehavior }
}

async function loadDefect(auth, projectId, defectId) {
  await resolveProjectAccess(auth, projectId)
  const defect = await prisma.defect.findFirst({ where: { id: defectId, projectId }, include: DEFECT_INCLUDE })
  if (!defect) throw ApiError.notFound('Defect not found.')
  return withUiAliases(defect)
}

export async function listDefects(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)
  const search = textSearch(query.search, ['title', 'description'])

  const where = {
    projectId,
    archivedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(search ? { AND: [search] } : {}),
  }

  const result = await paginate('defect', {
    where,
    include: { assignee: { select: { id: true, name: true } }, reporter: { select: { id: true, name: true } } },
    orderBy: orderBy(query, SORTABLE, 'createdAt'),
    ...paging,
  })
  return { ...result, items: result.items.map(withUiAliases) }
}


export async function getDefect(auth, projectId, defectId) {
  return loadDefect(auth, projectId, defectId)
}

export async function createDefect(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester', allowArchived: false })

  if (input.testCaseId) {
    const testCase = await prisma.testCase.findFirst({ where: { id: input.testCaseId, projectId } })
    if (!testCase) throw ApiError.badRequest('That test case does not belong to this project.')
  }

  if (input.requirementId) {
    const requirement = await prisma.requirement.findFirst({ where: { id: input.requirementId, projectId } })
    if (!requirement) throw ApiError.badRequest('That requirement does not belong to this project.')
  }

  const ref = await nextRef('defect', projectId, 'DEF')

  const defect = await prisma.$transaction(async (tx) => {
    const created = await tx.defect.create({
      data: {
        projectId,
        ref,
        title: input.title,
        description: input.description,
        reproductionSteps: input.reproductionSteps,
        expectedBehavior: input.expectedBehavior ?? input.expectedResult ?? null,
        actualBehavior: input.actualBehavior ?? input.actualResult ?? null,
        severity: input.severity,
        priority: input.priority,
        status: input.status,
        assigneeId: input.assigneeId ?? null,
        reporterId: auth.user.id,
        sourceResultId: input.sourceResultId ?? null,
        testCaseId: input.testCaseId ?? null,
      },
      include: DEFECT_INCLUDE,
    })

    await tx.defectHistory.create({
      data: { defectId: created.id, fromStatus: null, toStatus: created.status, note: 'Defect logged', changedById: auth.user.id },
    })

    if (input.sourceResultId) {
      await tx.defectTestResult.create({ data: { defectId: created.id, resultId: input.sourceResultId } })
    }

    return created
  })

  await recordActivity(auth, {
    projectId,
    action: 'defect.created',
    entityType: 'defect',
    entityId: defect.id,
    summary: `Logged ${defect.severity} defect: ${defect.title}`,
  })

  return withUiAliases(defect)
}

export async function updateDefect(auth, projectId, defectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const existing = await prisma.defect.findFirst({ where: { id: defectId, projectId } })
  if (!existing) throw ApiError.notFound('Defect not found.')

  const data = {}
  for (const field of ['title', 'description', 'severity', 'priority', 'status']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }
  // Accept either the UI alias or the stored column name.
  for (const [field, alias] of [['expectedBehavior', 'expectedResult'], ['actualBehavior', 'actualResult']]) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
    else if (input[alias] !== undefined) data[field] = input[alias] ?? null
  }
  for (const field of ['assigneeId', 'testCaseId', 'sourceResultId']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }
  if (input.reproductionSteps !== undefined) data.reproductionSteps = input.reproductionSteps
  if (input.archived === true) data.archivedAt = new Date()
  if (input.archived === false) data.archivedAt = null

  if (input.status !== undefined && input.status !== existing.status) {
    if (input.status === 'closed') data.closedAt = new Date()
    if (input.status !== 'closed') data.closedAt = null
  }

  const defect = await prisma.$transaction(async (tx) => {
    const updated = await tx.defect.update({ where: { id: defectId }, data, include: DEFECT_INCLUDE })

    if (input.status !== undefined && input.status !== existing.status) {
      await tx.defectHistory.create({
        data: {
          defectId,
          fromStatus: existing.status,
          toStatus: input.status,
          note: input.changeNote ?? null,
          changedById: auth.user.id,
        },
      })
    }

    return updated
  })

  await recordActivity(auth, {
    projectId,
    action: 'defect.updated',
    entityType: 'defect',
    entityId: defectId,
    summary: `Updated ${defect.title}`,
  })

  return withUiAliases(defect)
}

export async function addComment(auth, projectId, defectId, body) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })
  await loadDefect(auth, projectId, defectId)

  await prisma.defectComment.create({ data: { defectId, authorId: auth.user.id, body } })

  return loadDefect(auth, projectId, defectId)
}

export async function reopenDefect(auth, projectId, defectId, note) {
  const defect = await updateDefect(auth, projectId, defectId, {
    status: 'reopened',
    changeNote: note ?? 'Defect reopened',
  })
  return defect
}

export async function defectHistory(auth, projectId, defectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)

  return paginate('defectHistory', {
    where: { defectId },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    ...paging,
  })
}

/**
 * Retest reuses the defect's linked test case, or the cases that failed in the
 * defect's latest run, and returns a new run in `ready_for_retest` state.
 */
export async function retest(auth, projectId, defectId) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const defect = await prisma.defect.findFirst({ where: { id: defectId, projectId } })
  if (!defect) throw ApiError.notFound('Defect not found.')

  let testCaseIds = defect.testCaseId ? [defect.testCaseId] : []

  if (!testCaseIds.length) {
    const linked = await prisma.defectTestResult.findMany({
      where: { defectId },
      include: { result: { select: { testCaseId: true } } },
      orderBy: { result: { createdAt: 'desc' } },
      take: 20,
    })
    testCaseIds = [...new Set(linked.map((row) => row.result.testCaseId))]
  }

  if (!testCaseIds.length) {
    throw ApiError.badRequest('Link this defect to a test case or a failed result before running a retest.')
  }

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.testRun.create({
      data: {
        projectId,
        name: `Retest — ${defect.ref} ${defect.title}`.slice(0, 160),
        release: null,
        build: null,
        environment: process.env.NODE_ENV ?? 'staging',
        scope: 'selected',
        status: 'planned',
        createdById: auth.user.id,
        results: { create: testCaseIds.map((testCaseId) => ({ testCaseId, status: 'not_run' })) },
      },
      include: { results: { include: { testCase: { select: { id: true, ref: true, title: true } } } } },
    })

    await tx.defect.update({
      where: { id: defectId },
      data: { status: 'ready_for_retest', retestRunId: created.id },
    })
    await tx.defectHistory.create({
      data: { defectId, fromStatus: defect.status, toStatus: 'ready_for_retest', note: 'Retest run created', changedById: auth.user.id },
    })

    return created
  })

  await recordActivity(auth, {
    projectId,
    action: 'defect.retest',
    entityType: 'defect',
    entityId: defectId,
    summary: `Created retest run ${run.name}`,
  })

  return { run, testCaseIds }
}