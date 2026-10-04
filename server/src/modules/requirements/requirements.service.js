import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess, resolveScopedRecord } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, textSearch, orderBy, nextRef } from '../../utils/query.js'

const SORTABLE = { ref: 'ref', title: 'title', status: 'status', priority: 'priority', createdAt: 'createdAt', updatedAt: 'updatedAt' }

const REQUIREMENT_INCLUDE = {
  owner: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { links: true, versions: true } },
}

export async function listRequirements(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)
  const search = textSearch(query.search, ['ref', 'title', 'description'])

  const where = {
    projectId,
    archivedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.module ? { module: query.module } : {}),
    ...(search ? { AND: [search] } : {}),
  }

  return paginate('requirement', {
    where,
    include: REQUIREMENT_INCLUDE,
    orderBy: { ...orderBy(query, SORTABLE, 'ref'), ref: 'asc' },
    ...paging,
  })
}

export async function getRequirement(auth, requirementId) {
  const { record } = await resolveScopedRecord(auth, {
    model: 'requirement',
    id: requirementId,
    where: { archivedAt: null },
    include: REQUIREMENT_INCLUDE,
  })
  return record
}

export async function createRequirement(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead', allowArchived: false })

  const ref = input.ref ?? (await nextRef('requirement', projectId, 'REQ'))

  const requirement = await prisma.$transaction(async (tx) => {
    const created = await tx.requirement.create({
      data: {
        projectId,
        ref,
        title: input.title,
        description: input.description,
        module: input.module ?? null,
        acceptanceCriteria: input.acceptanceCriteria,
        priority: input.priority,
        status: input.status,
        ownerId: input.ownerId ?? auth.user.id,
        createdById: auth.user.id,
      },
      include: REQUIREMENT_INCLUDE,
    })

    // Every revision is kept so the regression planner can diff changes.
    await tx.requirementVersion.create({
      data: {
        requirementId: created.id,
        version: 1,
        title: created.title,
        description: created.description,
        module: created.module,
        acceptanceCriteria: created.acceptanceCriteria,
        priority: created.priority,
        status: created.status,
        changeNote: input.changeNote ?? 'Created',
        changedById: auth.user.id,
      },
    })

    return created
  })

  await recordActivity(auth, {
    projectId,
    action: 'requirement.created',
    entityType: 'requirement',
    entityId: requirement.id,
    summary: `Created ${requirement.ref} — ${requirement.title}`,
  })

  return requirement
}

export async function updateRequirement(auth, requirementId, input) {
  const { record: existing } = await resolveScopedRecord(auth, {
    model: 'requirement',
    id: requirementId,
    minimumRole: 'qa_lead',
    where: { archivedAt: null },
  })

  const data = {}
  for (const field of ['title', 'description', 'module', 'priority', 'status']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }
  if (input.acceptanceCriteria !== undefined) data.acceptanceCriteria = input.acceptanceCriteria
  if (input.ownerId !== undefined) data.ownerId = input.ownerId ?? null
  if (input.archived === true) data.archivedAt = new Date()
  if (input.archived === false) data.archivedAt = null

  const changed =
    data.title !== undefined ||
    data.description !== undefined ||
    data.module !== undefined ||
    data.acceptanceCriteria !== undefined ||
    data.priority !== undefined ||
    data.status !== undefined

  const requirement = await prisma.$transaction(async (tx) => {
    const updated = await tx.requirement.update({
      where: { id: requirementId },
      data: changed ? { ...data, version: { increment: 1 } } : data,
      include: REQUIREMENT_INCLUDE,
    })

    if (changed) {
      await tx.requirementVersion.create({
        data: {
          requirementId,
          version: updated.version,
          title: updated.title,
          description: updated.description,
          module: updated.module,
          acceptanceCriteria: updated.acceptanceCriteria,
          priority: updated.priority,
          status: updated.status,
          changeNote: input.changeNote ?? 'Updated',
          changedById: auth.user.id,
        },
      })
    }

    return updated
  })

  await recordActivity(auth, {
    projectId: existing.projectId,
    action: input.archived === true ? 'requirement.archived' : 'requirement.updated',
    entityType: 'requirement',
    entityId: requirementId,
    summary: `Updated ${requirement.ref}`,
  })

  return requirement
}

export async function archiveRequirement(auth, requirementId) {
  return updateRequirement(auth, requirementId, { archived: true })
}

export async function requirementHistory(auth, requirementId, query) {
  await resolveScopedRecord(auth, { model: 'requirement', id: requirementId })
  const paging = readPaging(query)

  return paginate('requirementVersion', {
    where: { requirementId },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { version: 'desc' },
    ...paging,
  })
}

export async function requirementTestCases(auth, requirementId, query) {
  const { record } = await resolveScopedRecord(auth, { model: 'requirement', id: requirementId })
  const paging = readPaging(query)

  return paginate('requirementTestCase', {
    where: { requirementId },
    include: {
      testCase: {
        select: {
          id: true,
          ref: true,
          title: true,
          type: true,
          priority: true,
          status: true,
          isAutomated: true,
          archivedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    ...paging,
  }).then(({ items, meta }) => ({
    items: items.map((link) => ({ ...link.testCase, linkedAt: link.createdAt, projectId: record.projectId })),
    meta,
  }))
}

export { ApiError }