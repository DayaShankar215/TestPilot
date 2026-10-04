import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { resolveProjectAccess } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, orderBy } from '../../utils/query.js'

const PLAN_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  _count: { select: { runs: true } },
}

/**
 * Recommendations come from explicit links only: a requirement change pulls in the
 * cases that cover it, and a module dependency pulls in the cases in the dependent
 * module. Each recommendation states its reason and the path that produced it.
 */
async function buildRecommendations(projectId) {
  const [recentVersions, dependencies] = await Promise.all([
    prisma.requirementVersion.findMany({
      where: { requirement: { projectId, archivedAt: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      include: { requirement: { select: { id: true, ref: true, title: true, module: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.moduleDependency.findMany({ where: { projectId } }),
  ])

  const changedRequirements = new Map()
  for (const version of recentVersions) {
    if (!changedRequirements.has(version.requirement.id)) changedRequirements.set(version.requirement.id, version.requirement)
  }

  const changedModules = [...changedRequirements.values()].map((row) => row.module).filter(Boolean)
  const dependentModules = new Map()
  for (const dependency of dependencies) {
    if (!changedModules.includes(dependency.fromModule)) continue
    if (!dependentModules.has(dependency.toModule)) dependentModules.set(dependency.toModule, dependency.fromModule)
  }

  const cases = await prisma.testCase.findMany({
    where: { projectId, archivedAt: null },
    select: {
      id: true,
      ref: true,
      title: true,
      requirementLinks: {
        select: { requirement: { select: { id: true, ref: true, module: true } } },
      },
    },
  })

  const recommendations = []

  for (const testCase of cases) {
    const covered = testCase.requirementLinks
      .map((link) => changedRequirements.get(link.requirement.id))
      .filter(Boolean)

    if (covered.length > 0) {
      recommendations.push({
        id: `rec_${testCase.id}_requirement`,
        testCaseId: testCase.id,
        ref: testCase.ref,
        title: testCase.title,
        reason: `Covers changed requirement ${covered.map((row) => row.ref).join(', ')}`,
        path: covered.map((row) => row.module).filter(Boolean),
        impact: 'high',
      })
      continue
    }

    // No direct requirement changed, so fall back to the modules the case's
    // requirements depend on through `module_dependencies`.
    const upstream = testCase.requirementLinks
      .map((link) => dependentModules.get(link.requirement.module))
      .find(Boolean)
    if (upstream) {
      recommendations.push({
        id: `rec_${testCase.id}_dependency`,
        testCaseId: testCase.id,
        ref: testCase.ref,
        title: testCase.title,
        reason: `Depends on module ${upstream}, which changed`,
        path: [upstream],
        impact: 'medium',
      })
    }
  }

  return recommendations
}

export async function listPlans(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)

  return paginate('regressionPlan', {
    where: { projectId, ...(query.status ? { status: query.status } : {}) },
    include: PLAN_INCLUDE,
    orderBy: orderBy(query, { name: 'name', createdAt: 'createdAt' }, 'createdAt'),
    ...paging,
  })
}

export async function getPlan(auth, projectId, planId) {
  await resolveProjectAccess(auth, projectId)

  const plan = await prisma.regressionPlan.findFirst({ where: { id: planId, projectId }, include: PLAN_INCLUDE })
  if (!plan) throw ApiError.notFound('Regression plan not found.')

  // Older plans predate stored recommendations, so they are recomputed on read.
  const recommendations = Array.isArray(plan.recommendations) && plan.recommendations.length
    ? plan.recommendations
    : await buildRecommendations(projectId)

  return { ...plan, recommendations }
}

export async function createPlan(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead', allowArchived: false })

  const selected = [...new Set(input.testCaseIds)]
  const found = await prisma.testCase.count({ where: { id: { in: selected }, projectId, archivedAt: null } })
  if (found !== selected.length) throw ApiError.badRequest('One or more selected test cases do not belong to this project.')

  if (input.baselineRunId) {
    const baseline = await prisma.testRun.findFirst({ where: { id: input.baselineRunId, projectId } })
    if (!baseline) throw ApiError.notFound('Baseline run not found.')
  }

  const plan = await prisma.regressionPlan.create({
    data: {
      projectId,
      name: input.name,
      baselineRunId: input.baselineRunId ?? null,
      changeSetNote: input.changeSetNote ?? null,
      changedRequirementIds: [],
      recommendations: await buildRecommendations(projectId),
      selectedTestCaseIds: selected,
      createdById: auth.user.id,
    },
    include: PLAN_INCLUDE,
  })

  await recordActivity(auth, {
    projectId,
    action: 'regression.created',
    entityType: 'regressionPlan',
    entityId: plan.id,
    summary: `Saved regression suite ${plan.name} with ${selected.length} cases`,
  })

  return plan
}