import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess, findProjectAccess } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, textSearch, orderBy, listMeta } from '../../utils/query.js'

const SORTABLE = { name: 'name', key: 'key', createdAt: 'createdAt', updatedAt: 'updatedAt' }

const PROJECT_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  _count: { select: { members: true, requirements: true, testCases: true, testRuns: true, defects: true } },
}

export async function listProjects(auth, query) {
  const paging = readPaging(query)
  const search = textSearch(query.search, ['name', 'key', 'description'])

  const { items, meta } = await paginate('project', {
    where: {
      workspaceId: { in: auth.workspaceIds },
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { AND: [search] } : {}),
    },
    include: PROJECT_INCLUDE,
    orderBy: orderBy(query, SORTABLE, 'name'),
    ...paging,
  })

  return { items, meta }
}

export async function getProject(auth, projectId) {
  const { project, role } = await resolveProjectAccess(auth, projectId)
  return { ...project, role }
}

export async function createProject(auth, workspaceId, input) {
  const existing = await prisma.project.findFirst({ where: { workspaceId, key: input.key } })
  if (existing) throw ApiError.conflict(`Project key ${input.key} is already used in this workspace.`)

  const project = await prisma.project.create({
    data: {
      workspaceId,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'planning',
      ownerId: input.ownerId ?? auth.user.id,
      members: { create: { userId: input.ownerId ?? auth.user.id, role: 'manager' } },
    },
    include: PROJECT_INCLUDE,
  })

  await recordActivity(auth, {
    projectId: project.id,
    action: 'project.created',
    entityType: 'project',
    entityId: project.id,
    summary: `Created project ${project.key} — ${project.name}`,
  })

  return project
}

export async function updateProject(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'manager' })

  const data = {}
  for (const field of ['name', 'key', 'description', 'status']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }
  if (input.archived === true) data.archivedAt = new Date()
  if (input.archived === false) data.archivedAt = null
  if (input.ownerId !== undefined) data.ownerId = input.ownerId ?? null

  if (input.key) {
    const clash = await prisma.project.findFirst({ where: { key: input.key, NOT: { id: projectId } } })
    if (clash) throw ApiError.conflict(`Project key ${input.key} is already used.`)
  }

  const project = await prisma.project.update({ where: { id: projectId }, data, include: PROJECT_INCLUDE })

  await recordActivity(auth, {
    projectId,
    action: input.archived === true ? 'project.archived' : 'project.updated',
    entityType: 'project',
    entityId: projectId,
    summary: `Updated project ${project.key}`,
  })

  return project
}

export async function archiveProject(auth, projectId) {
  return updateProject(auth, projectId, { archived: true })
}

export async function listProjectMembers(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)
  const search = textSearch(query.search, ['name', 'email'])

  const where = { projectId, ...(search ? { user: search } : {}) }

  const [rows, total] = await Promise.all([
    prisma.projectMember.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, title: true } } },
      orderBy: { createdAt: 'asc' },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.projectMember.count({ where }),
  ])

  const { listMeta: buildMeta } = { listMeta }
  return {
    items: rows.map((row) => ({
      id: row.user.id,
      membershipId: row.id,
      name: row.user.name,
      email: row.user.email,
      title: row.user.title,
      role: row.role,
      createdAt: row.createdAt,
    })),
    meta: buildMeta({ page: paging.page, pageSize: paging.pageSize, total }),
  }
}

export async function addProjectMember(auth, projectId, { userId, role }) {
  const { project } = await resolveProjectAccess(auth, projectId, { minimumRole: 'manager' })

  const user = await prisma.user.findFirst({
    where: { id: userId, workspaceMemberships: { some: { workspaceId: project.workspaceId } } },
    select: { id: true },
  })
  if (!user) throw ApiError.notFound('That user is not a member of this workspace.')

  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
}

/** Dashboard KPIs, computed from real rows rather than stored counters. */
export async function projectDashboard(auth, projectId, { days }) {
  await resolveProjectAccess(auth, projectId, { allowArchived: false })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [requirementCount, testCaseCount, openDefects, runs, results, criticalDefects, trend] = await Promise.all([
    prisma.requirement.count({ where: { projectId, archivedAt: null } }),
    prisma.testCase.count({ where: { projectId, archivedAt: null } }),
    prisma.defect.count({ where: { projectId, archivedAt: null, status: { notIn: ['closed'] } } }),
    prisma.testRun.findMany({
      where: { projectId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, status: true, createdAt: true, environment: true },
    }),
    prisma.testResult.findMany({
      where: { run: { projectId } },
      select: { status: true },
    }),
    prisma.defect.count({ where: { projectId, archivedAt: null, severity: { in: ['high', 'critical'] }, status: { notIn: ['closed'] } } }),
    prisma.testRun.count({ where: { projectId, createdAt: { gte: since } } }),
  ])

  const passed = results.filter((row) => row.status === 'pass').length
  const failed = results.filter((row) => row.status === 'fail').length
  const blocked = results.filter((row) => row.status === 'blocked').length
  const notRun = results.filter((row) => row.status === 'not_run').length
  const executed = passed + failed + blocked

  return {
    projectId,
    kpis: {
      requirements: requirementCount,
      testCases: testCaseCount,
      openDefects,
      criticalDefects,
      passRate: executed === 0 ? 0 : Math.round((passed / executed) * 1000) / 10,
      executed,
      passed,
      failed,
      blocked,
      notRun,
      runsInPeriod: trend,
    },
    recentRuns: runs,
  }
}

export async function projectActivity(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)

  const where = {
    projectId,
    ...(query.entityType ? { entityType: query.entityType } : {}),
  }

  const { items, meta } = await paginate('activityLog', {
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    ...paging,
  })

  return { items, meta }
}

export { findProjectAccess }