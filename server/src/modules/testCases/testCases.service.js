import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, textSearch, orderBy, nextRef } from '../../utils/query.js'
import { normalizeSteps } from '../../schemas/common.js'

const SORTABLE = { ref: 'ref', title: 'title', status: 'status', priority: 'priority', createdAt: 'createdAt', updatedAt: 'updatedAt' }

const CASE_INCLUDE = {
  steps: { orderBy: { order: 'asc' } },
  requirementLinks: { include: { requirement: { select: { id: true, ref: true, title: true } } } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { results: true, versions: true } },
}

/** Wraps link rows so the client sees a plain `requirements` array. */
function shape(testCase) {
  const { requirementLinks, ...rest } = testCase
  return { ...rest, requirements: requirementLinks.map((link) => link.requirement) }
}

export async function listTestCases(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)
  const search = textSearch(query.search, ['ref', 'title', 'description'])

  const where = {
    projectId,
    archivedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.isAutomated === undefined ? {} : { isAutomated: query.isAutomated }),
    ...(query.requirementId ? { requirementLinks: { some: { requirementId: query.requirementId } } } : {}),
    ...(search ? { AND: [search] } : {}),
  }

  const { items, meta } = await paginate('testCase', {
    where,
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { ...orderBy(query, SORTABLE, 'ref'), ref: 'asc' },
    ...paging,
  })

  return { items, meta }
}

export async function getTestCase(auth, projectId, testCaseId) {
  await resolveProjectAccess(auth, projectId)
  const testCase = await prisma.testCase.findFirst({
    where: { id: testCaseId, projectId, archivedAt: null },
    include: CASE_INCLUDE,
  })
  if (!testCase) throw ApiError.notFound('Test case not found.')
  return shape(testCase)
}

export async function createTestCase(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead', allowArchived: false })

  const ref = input.ref ?? (await nextRef('testCase', projectId, 'TC'))
  const steps = normalizeSteps(input.steps)

  const testCase = await prisma.$transaction(async (tx) => {
    const created = await tx.testCase.create({
      data: {
        projectId,
        ref,
        title: input.title,
        description: input.description ?? null,
        preconditions: input.preconditions ?? null,
        testData: input.testData ?? null,
        type: input.type,
        priority: input.priority,
        status: input.status,
        isAutomated: input.isAutomated ?? false,
        source: input.source,
        createdById: auth.user.id,
        steps: { create: steps },
        ...(input.requirementIds?.length
          ? { requirementLinks: { create: input.requirementIds.map((requirementId) => ({ requirementId })) } }
          : {}),
      },
      include: CASE_INCLUDE,
    })

    await tx.testCaseVersion.create({
      data: {
        testCaseId: created.id,
        version: 1,
        title: created.title,
        description: created.description,
        type: created.type,
        priority: created.priority,
        status: created.status,
        steps,
        changeNote: input.changeNote ?? 'Created',
        changedById: auth.user.id,
      },
    })

    return created
  })

  await recordActivity(auth, {
    projectId,
    action: 'testcase.created',
    entityType: 'testCase',
    entityId: testCase.id,
    summary: `Created ${testCase.ref} — ${testCase.title}`,
  })

  return shape(testCase)
}

export async function updateTestCase(auth, projectId, testCaseId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead' })

  const existing = await prisma.testCase.findFirst({ where: { id: testCaseId, projectId, archivedAt: null } })
  if (!existing) throw ApiError.notFound('Test case not found.')

  const data = {}
  for (const field of ['title', 'description', 'preconditions', 'testData', 'type', 'priority', 'status']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }
  if (input.isAutomated !== undefined) data.isAutomated = input.isAutomated
  if (input.archived === true) data.archivedAt = new Date()
  if (input.archived === false) data.archivedAt = null

  const steps = input.steps ? normalizeSteps(input.steps) : null

  const testCase = await prisma.$transaction(async (tx) => {
    // Steps are replaced wholesale so ordering can never drift.
    if (steps) {
      await tx.testStep.deleteMany({ where: { testCaseId } })
      if (steps.length > 0) await tx.testStep.createMany({ data: steps.map((step) => ({ ...step, testCaseId })) })
    }

    const updated = await tx.testCase.update({
      where: { id: testCaseId },
      data: { ...data, ...(steps ? { version: { increment: 1 } } : {}) },
      include: CASE_INCLUDE,
    })

    await tx.testCaseVersion.create({
      data: {
        testCaseId,
        version: updated.version,
        title: updated.title,
        description: updated.description,
        type: updated.type,
        priority: updated.priority,
        status: updated.status,
        steps: steps ?? (await tx.testStep.findMany({ where: { testCaseId }, orderBy: { order: 'asc' } })),
        changeNote: input.changeNote ?? 'Updated',
        changedById: auth.user.id,
      },
    })

    return updated
  })

  await recordActivity(auth, {
    projectId,
    action: 'testcase.updated',
    entityType: 'testCase',
    entityId: testCaseId,
    summary: `Updated ${testCase.ref}`,
  })

  return shape(testCase)
}

/** `DELETE` in the contract means "deprecate": keep history, drop from new runs. */
export async function deprecateTestCase(auth, projectId, testCaseId) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead' })

  const existing = await prisma.testCase.findFirst({ where: { id: testCaseId, projectId } })
  if (!existing) throw ApiError.notFound('Test case not found.')

  const testCase = await prisma.testCase.update({
    where: { id: testCaseId },
    data: { status: 'deprecated', archivedAt: new Date() },
    include: CASE_INCLUDE,
  })

  await recordActivity(auth, {
    projectId,
    action: 'testcase.deprecated',
    entityType: 'testCase',
    entityId: testCaseId,
    summary: `Deprecated ${testCase.ref}`,
  })

  return shape(testCase)
}

export async function cloneTestCase(auth, projectId, testCaseId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead', allowArchived: false })

  const source = await prisma.testCase.findFirst({
    where: { id: testCaseId, projectId, archivedAt: null },
    include: { steps: { orderBy: { order: 'asc' } }, requirementLinks: true },
  })
  if (!source) throw ApiError.notFound('Test case not found.')

  const ref = await nextRef('testCase', projectId, 'TC')

  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.testCase.create({
      data: {
        projectId,
        ref,
        title: input.title ?? `${source.title} (copy)`,
        description: source.description,
        preconditions: source.preconditions,
        testData: source.testData,
        type: source.type,
        priority: source.priority,
        // A clone always starts as a draft so it gets reviewed again.
        status: 'draft',
        isAutomated: source.isAutomated,
        source: 'clone',
        createdById: auth.user.id,
        steps: { create: source.steps.map((step) => ({ order: step.order, action: step.action, expected: step.expected })) },
        requirementLinks: { create: source.requirementLinks.map((link) => ({ requirementId: link.requirementId })) },
      },
      include: CASE_INCLUDE,
    })

    await tx.testCaseVersion.create({
      data: {
        testCaseId: created.id,
        version: 1,
        title: created.title,
        description: created.description,
        type: created.type,
        priority: created.priority,
        status: created.status,
        steps: source.steps,
        changeNote: `Cloned from ${source.ref}`,
        changedById: auth.user.id,
      },
    })

    return created
  })

  await recordActivity(auth, {
    projectId,
    action: 'testcase.cloned',
    entityType: 'testCase',
    entityId: copy.id,
    summary: `Cloned ${source.ref} into ${copy.ref}`,
  })

  return shape(copy)
}

export async function setTestCaseRequirements(auth, projectId, testCaseId, requirementIds) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead' })

  const testCase = await prisma.testCase.findFirst({ where: { id: testCaseId, projectId, archivedAt: null } })
  if (!testCase) throw ApiError.notFound('Test case not found.')

  if (requirementIds.length > 0) {
    const valid = await prisma.requirement.count({ where: { id: { in: requirementIds }, projectId } })
    if (valid !== new Set(requirementIds).size) {
      throw ApiError.badRequest('One or more requirements do not belong to this project.')
    }
  }

  await prisma.$transaction([
    prisma.requirementTestCase.deleteMany({ where: { testCaseId } }),
    ...requirementIds.map((requirementId) =>
      prisma.requirementTestCase.create({ data: { testCaseId, requirementId } }),
    ),
  ])

  return getTestCase(auth, projectId, testCaseId)
}

export async function testCaseHistory(auth, projectId, testCaseId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)

  return paginate('testCaseVersion', {
    where: { testCaseId },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { version: 'desc' },
    ...paging,
  })
}