import { db } from './db'

const DAY = 86400000

function envelope(data, meta) {
  return { data, meta }
}

function paginate(items, params = {}) {
  const page = Math.max(Number(params.page) || 1, 1)
  const pageSize = Math.max(Number(params.pageSize) || 25, 1)
  const total = items.length
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const start = (page - 1) * pageSize
  return envelope(items.slice(start, start + pageSize), {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  })
}

function sortItems(items, sortBy, sortDir = 'asc') {
  if (!sortBy) return items
  const factor = sortDir === 'desc' ? -1 : 1
  return [...items].sort((a, b) => {
    const left = a?.[sortBy]
    const right = b?.[sortBy]
    if (left === right) return 0
    if (left === null || left === undefined) return 1
    if (right === null || right === undefined) return -1
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
    return String(left).localeCompare(String(right)) * factor
  })
}

function includesText(value, needle) {
  if (!needle) return true
  return String(value ?? '').toLowerCase().includes(String(needle).toLowerCase())
}

function applyFilters(items, params = {}, searchableFields = []) {
  const { search, status, priority, severity, assigneeId, type, module, environment, result, from, to, requirementId, automated, impact } = params

  const filtered = items.filter((item) => {
    if (search && searchableFields.length) {
      const matches = searchableFields.some((field) => includesText(item[field], search))
      if (!matches) return false
    }
    if (status && String(item.status) !== String(status)) return false
    if (priority && String(item.priority) !== String(priority)) return false
    if (severity && String(item.severity) !== String(severity)) return false
    if (type && String(item.type) !== String(type)) return false
    if (module && item.module !== module) return false
    if (environment && String(item.environment) !== String(environment)) return false
    if (result && String(item.result) !== String(result)) return false
    if (assigneeId && item.assigneeId !== assigneeId) return false
    if (requirementId && !item.requirementIds?.includes(requirementId)) return false
    if (impact && item.impact !== impact) return false
    if (automated !== undefined && automated !== '' && item.automated !== (automated === 'true' || automated === true)) return false
    if (from && new Date(item.updatedAt ?? item.createdAt) < new Date(from)) return false
    if (to && new Date(item.updatedAt ?? item.createdAt) > new Date(to + DAY)) return false
    return true
  })

  return sortItems(filtered, params.sortBy, params.sortDir)
}

function resolveUser(userId) {
  return db.users.find((user) => user.id === userId) ?? null
}

function expandProject(project) {
  if (!project) return null
  return {
    ...project,
    owner: resolveUser(project.ownerId),
    memberCount: project.memberIds.length,
    members: project.memberIds.map(resolveUser).filter(Boolean),
  }
}

function expandUserRefs(entity) {
  if (!entity) return null
  return { ...entity, owner: resolveUser(entity.ownerId) }
}

function enrichTestCase(testCase) {
  if (!testCase) return null
  const requirements = testCase.requirementIds
    .map((id) => db.requirements.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => ({ id: item.id, ref: item.ref, title: item.title, status: item.status }))
  const lastRun = [...db.testRuns]
    .reverse()
    .find((run) => run.executions.some((execution) => execution.testCaseId === testCase.id))
  const lastExecution = lastRun?.executions.find((execution) => execution.testCaseId === testCase.id) ?? null
  return {
    ...testCase,
    author: resolveUser(testCase.authorId),
    requirements,
    lastResult: lastExecution?.result ?? null,
    lastExecutedAt: lastExecution?.executedAt ?? null,
  }
}

function enrichDefect(defect) {
  if (!defect) return null
  const requirement = db.requirements.find((item) => item.id === defect.requirementId) ?? null
  const testCase = db.testCases.find((item) => item.id === defect.testCaseId) ?? null
  return {
    ...defect,
    assignee: resolveUser(defect.assigneeId),
    reporter: resolveUser(defect.reporterId),
    requirement: requirement ? { id: requirement.id, ref: requirement.ref, title: requirement.title } : null,
    testCase: testCase ? { id: testCase.id, ref: testCase.ref, title: testCase.title } : null,
    comments: defect.comments.map((comment) => ({ ...comment, author: resolveUser(comment.authorId) })),
    statusHistory: defect.statusHistory.map((entry) => ({ ...entry, changedBy: resolveUser(entry.changedById) })),
  }
}

function enrichRun(run) {
  if (!run) return null
  const executions = run.executions.map((execution) => {
    const testCase = db.testCases.find((item) => item.id === execution.testCaseId)
    return {
      ...execution,
      testCase: testCase
        ? {
            id: testCase.id,
            ref: testCase.ref,
            title: testCase.title,
            type: testCase.type,
            priority: testCase.priority,
            module: testCase.module,
            preconditions: testCase.preconditions,
            testData: testCase.testData,
            requirementIds: testCase.requirementIds,
            steps: testCase.steps,
          }
        : null,
      executedBy: resolveUser(execution.executedById),
    }
  })

  const counts = executions.reduce(
    (acc, execution) => {
      acc[execution.result] += 1
      return acc
    },
    { pass: 0, fail: 0, blocked: 0, not_run: 0 },
  )

  const executed = counts.pass + counts.fail + counts.blocked
  const previous = db.testRuns
    .filter(
      (candidate) =>
        candidate.id !== run.id &&
        candidate.projectId === run.projectId &&
        candidate.scope === run.scope &&
        candidate.status === 'completed',
    )
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]

  const previousCounts = previous
    ? previous.executions.reduce(
        (acc, execution) => {
          acc[execution.result] += 1
          return acc
        },
        { pass: 0, fail: 0, blocked: 0, not_run: 0 },
      )
    : null

  return {
    ...run,
    assignee: resolveUser(run.assigneeId),
    executions,
    summary: {
      total: executions.length,
      executed,
      ...counts,
      progress: executions.length ? Math.round((executed / executions.length) * 100) : 0,
      passRate: executed ? Number(((counts.pass / executed) * 100).toFixed(1)) : null,
      previousRunId: previous?.id ?? null,
      previousRunName: previous?.name ?? null,
      previousCounts,
    },
  }
}

function projectMetrics(projectId) {
  const cases = db.testCases.filter((item) => item.projectId === projectId)
  const requirements = db.requirements.filter((item) => item.projectId === projectId)
  const runs = db.testRuns.filter((item) => item.projectId === projectId)
  const defects = db.defects.filter((item) => item.projectId === projectId)
  const executions = runs.flatMap((run) => run.executions)
  const coveredRequirementIds = new Set(cases.flatMap((item) => item.requirementIds))
  const openDefects = defects.filter((item) => !['closed', 'verified', 'deferred'].includes(item.status))
  const executed = executions.filter((item) => item.result !== 'not_run')
  const passRate = executed.length
    ? Number(((executed.filter((item) => item.result === 'pass').length / executed.length) * 100).toFixed(1))
    : null

  return {
    testCases: cases.length,
    approvedTestCases: cases.filter((item) => item.status === 'approved').length,
    requirements: requirements.length,
    requirementCoverage: requirements.length
      ? Number(((coveredRequirementIds.size / requirements.length) * 100).toFixed(1))
      : null,
    uncoveredRequirements: requirements.filter((item) => !coveredRequirementIds.has(item.id)).length,
    runs: runs.length,
    activeRuns: runs.filter((item) => item.status === 'in_progress').length,
    executions: executions.length,
    executed: executed.length,
    passRate,
    openDefects: openDefects.length,
    criticalDefects: openDefects.filter((item) => item.severity === 'critical' || item.severity === 'high').length,
    automationCoverage: cases.length
      ? Number(((cases.filter((item) => item.automated).length / cases.length) * 100).toFixed(1))
      : 0,
  }
}

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function buildTrend(executions, days) {
  const buckets = new Map()
  for (let i = days - 1; i >= 0; i -= 1) {
    buckets.set(dateKey(Date.now() - i * DAY), { date: dateKey(Date.now() - i * DAY), passed: 0, failed: 0, blocked: 0 })
  }
  executions.forEach((execution) => {
    if (!execution.executedAt || execution.result === 'not_run') return
    const key = dateKey(execution.executedAt)
    const bucket = buckets.get(key)
    if (!bucket) return
    if (execution.result === 'pass') bucket.passed += 1
    else if (execution.result === 'fail') bucket.failed += 1
    else bucket.blocked += 1
  })
  return [...buckets.values()]
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function lastCompletedRun(projectId) {
  return db.testRuns
    .filter((run) => run.projectId === projectId && run.status === 'completed')
    .sort((a, b) => new Date(b.completedAt ?? b.startedAt) - new Date(a.completedAt ?? a.startedAt))[0]
}

function staleRequirements(projectId) {
  const run = lastCompletedRun(projectId)
  if (!run) return []
  const cutoff = new Date(run.completedAt ?? run.startedAt).getTime()
  return db.requirements
    .filter((item) => item.projectId === projectId && new Date(item.updatedAt).getTime() > cutoff)
    .map((item) => ({
      ...item,
      changedAfterRunId: run.id,
      changedAfterRunName: run.name,
      changedAfterRunAt: run.completedAt ?? run.startedAt,
    }))
}

export const handlers = {
  'POST /auth/login': ({ body }) => {
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = body?.password ?? ''
    if (!email || !password) throw badRequest('Email and password are required.')

    const session = db.sessions[email]
    if (!session || session.password !== password) {
      throw unauthorized('The email or password you entered is incorrect.')
    }

    const user = resolveUser(session.userId)
    return {
      data: {
        token: `mock.${user.id}.${Date.now().toString(36)}`,
        user: { ...user, mustChangePassword: session.mustChangePassword },
      },
    }
  },

  'POST /auth/register': ({ body }) => {
    const email = String(body?.email ?? '').trim().toLowerCase()
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      throw conflict('An account with that email already exists.')
    }
    const name = body?.name?.trim() || email.split('@')[0]
    const user = {
      id: `usr-${db.users.length + 1}`,
      name,
      email,
      role: 'tester',
      title: 'Team Member',
      timezone: body?.timezone ?? 'UTC',
      joinedAt: new Date().toISOString(),
    }
    db.users.push(user)
    db.sessions[email] = { password: body?.password ?? '', userId: user.id, mustChangePassword: false }
    return { data: { token: `mock.${user.id}.${Date.now().toString(36)}`, user }, status: 201 }
  },

  'POST /auth/forgot-password': () => ({ data: { message: 'If that email exists, a reset link has been sent.' } }),

  'POST /auth/reset-password': ({ body }) => {
    const session = db.sessions[String(body?.email ?? '').trim().toLowerCase()]
    if (session) session.password = body?.password ?? session.password
    return { data: { message: 'Password updated.' } }
  },

  'POST /auth/change-password': ({ body }) => {
    const current = String(body?.currentPassword ?? '')
    const next = String(body?.newPassword ?? '')
    if (!next || next.length < 10) {
      throw validation('New password must be at least 10 characters.')
    }
    if (current === next) {
      throw validation('New password must be different from the current password.')
    }
    return { data: { message: 'Password changed.' } }
  },

  'GET /auth/me': ({ state }) => {
    if (!state.user) throw unauthorized('Your session has expired. Please sign in again.')
    return { data: state.user }
  },

  'PATCH /auth/me': ({ body, state }) => {
    const user = db.users.find((item) => item.id === state.user?.id)
    if (!user) throw notFound('User not found.')
    Object.assign(user, {
      name: body?.name ?? user.name,
      title: body?.title ?? user.title,
      timezone: body?.timezone ?? user.timezone,
    })
    return { data: user }
  },

  'POST /auth/logout': ({ state }) => {
    state.user = null
    return { data: { message: 'Signed out.' } }
  },

  'GET /users': ({ params }) => {
    const items = db.users.filter((user) => includesText(user.name, params?.search) || includesText(user.email, params?.search))
    return { data: items }
  },

  'GET /projects': ({ params }) => {
    const items = applyFilters(db.projects, params, ['name', 'description', 'key']).map((project) => ({
      ...expandProject(project),
      metrics: projectMetrics(project.id),
    }))
    return paginate(items, params)
  },

  'POST /projects': ({ body }) => {
    const project = {
      id: `prj-${db.projects.length + 1}`,
      key: String(body?.key ?? 'PRJ').toUpperCase().slice(0, 4),
      name: body?.name,
      description: body?.description ?? '',
      status: body?.status ?? 'planning',
      ownerId: body?.ownerId ?? db.workspace.ownerId,
      memberIds: body?.memberIds?.length ? body.memberIds : [db.workspace.ownerId],
      release: body?.release ?? 'unassigned',
      environment: body?.environment ?? 'dev',
      createdAt: new Date().toISOString(),
    }
    db.projects.unshift(project)
    db.activities.unshift({
      id: `act-${project.id}-created`,
      projectId: project.id,
      actorId: project.ownerId,
      type: 'project_created',
      message: `created project ${project.name}`,
      entityType: 'project',
      entityId: project.id,
      createdAt: project.createdAt,
    })
    return { data: { ...expandProject(project), metrics: projectMetrics(project.id) }, status: 201 }
  },

  'GET /projects/:id': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    return {
      data: {
        ...expandProject(project),
        metrics: projectMetrics(project.id),
        staleRequirements: staleRequirements(project.id).length,
      },
    }
  },

  'PATCH /projects/:id': ({ params, body }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    Object.assign(project, {
      name: body?.name ?? project.name,
      description: body?.description ?? project.description,
      status: body?.status ?? project.status,
      release: body?.release ?? project.release,
      environment: body?.environment ?? project.environment,
      ownerId: body?.ownerId ?? project.ownerId,
    })
    return { data: { ...expandProject(project), metrics: projectMetrics(project.id) } }
  },

  'DELETE /projects/:id': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    project.status = 'archived'
    return { data: { id: project.id, status: project.status } }
  },

  'GET /projects/:id/overview': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const metrics = projectMetrics(project.id)
    return {
      data: {
        project: expandProject(project),
        metrics,
        recentRuns: db.testRuns
          .filter((run) => run.projectId === project.id)
          .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
          .slice(0, 5)
          .map(enrichRun),
        openDefects: db.defects
          .filter((item) => item.projectId === project.id && !['closed', 'verified', 'deferred'].includes(item.status))
          .slice(0, 6)
          .map(enrichDefect),
        activity: db.activities.filter((item) => item.projectId === project.id).slice(0, 10),
      },
    }
  },

  'GET /projects/:id/activity': ({ params }) => ({
    data: db.activities
      .filter((item) => item.projectId === params.id)
      .slice(0, Number(params?.limit) || 30),
  }),

  'GET /projects/:id/requirements': ({ params }) => {
    const items = db.requirements
      .filter((item) => item.projectId === params.id)
      .filter((item) => (params?.uncoveredOnly === 'true' ? !db.testCases.some((tc) => tc.requirementIds.includes(item.id)) : true))
      .filter((item) => (params?.changedOnly === 'true' ? staleRequirements(params.id).some((s) => s.id === item.id) : true))
    const sorted = applyFilters(items, params, ['ref', 'title', 'description', 'module']).map(expandUserRefs)
    return paginate(sorted, params)
  },

  'POST /projects/:id/requirements': ({ params, body }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const nextRef = db.requirements.reduce((max, item) => Math.max(max, Number(String(item.ref).split('-')[1]) || 0), 100) + 1
    const requirement = {
      id: `req-${params.id}-${Date.now().toString(36)}`,
      projectId: params.id,
      ref: `REQ-${nextRef}`,
      title: body?.title,
      description: body?.description ?? '',
      module: body?.module ?? 'Unassigned',
      acceptanceCriteria: body?.acceptanceCriteria ?? [],
      priority: body?.priority ?? 'medium',
      status: body?.status ?? 'draft',
      ownerId: body?.ownerId ?? project.ownerId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVerifiedAt: null,
      tags: body?.tags ?? [],
      history: [{ version: 1, changedAt: new Date().toISOString(), changedById: project.ownerId, summary: 'Requirement created' }],
    }
    db.requirements.push(requirement)
    return { data: expandUserRefs(requirement), status: 201 }
  },

  'GET /requirements/:id': ({ params }) => {
    const requirement = db.requirements.find((item) => item.id === params.id)
    if (!requirement) throw notFound('Requirement not found.')
    const linkedCases = db.testCases
      .filter((item) => item.requirementIds.includes(requirement.id))
      .map((item) => ({
        id: item.id,
        ref: item.ref,
        title: item.title,
        type: item.type,
        priority: item.priority,
        status: item.status,
      }))
    const stale = staleRequirements(requirement.projectId).find((item) => item.id === requirement.id)
    return {
      data: {
        ...expandUserRefs(requirement),
        linkedTestCases: linkedCases,
        changedAfterLastRun: stale
          ? {
              runId: stale.changedAfterRunId,
              runName: stale.changedAfterRunName,
              runCompletedAt: stale.changedAfterRunAt,
              requirementUpdatedAt: requirement.updatedAt,
            }
          : null,
        history: (requirement.history ?? []).map((entry) => ({ ...entry, changedBy: resolveUser(entry.changedById) })),
      },
    }
  },

  'PATCH /requirements/:id': ({ params, body, state }) => {
    const requirement = db.requirements.find((item) => item.id === params.id)
    if (!requirement) throw notFound('Requirement not found.')

    const changedFields = Object.keys(body ?? {}).filter((key) => body[key] !== requirement[key])
    requirement.version += 1
    requirement.updatedAt = new Date().toISOString()
    requirement.history = [
      ...(requirement.history ?? []),
      {
        version: requirement.version,
        changedAt: requirement.updatedAt,
        changedById: state.user?.id,
        summary: `Updated ${changedFields.join(', ') || 'fields'}`,
      },
    ]
    Object.assign(requirement, {
      title: body?.title ?? requirement.title,
      description: body?.description ?? requirement.description,
      module: body?.module ?? requirement.module,
      acceptanceCriteria: body?.acceptanceCriteria ?? requirement.acceptanceCriteria,
      priority: body?.priority ?? requirement.priority,
      status: body?.status ?? requirement.status,
      ownerId: body?.ownerId ?? requirement.ownerId,
      tags: body?.tags ?? requirement.tags,
    })
    return { data: expandUserRefs(requirement) }
  },

  'DELETE /requirements/:id': ({ params }) => {
    const requirement = db.requirements.find((item) => item.id === params.id)
    if (!requirement) throw notFound('Requirement not found.')
    requirement.status = 'obsolete'
    return { data: { id: requirement.id, status: requirement.status } }
  },

  'GET /projects/:id/test-cases': ({ params }) => {
    let items = db.testCases.filter((item) => item.projectId === params.id)
    if (params?.requirementId) {
      items = items.filter((item) => item.requirementIds.includes(params.requirementId))
    }
    if (params?.module) items = items.filter((item) => item.module === params.module)
    const sorted = applyFilters(items, params, ['ref', 'title', 'description']).map(enrichTestCase)
    return paginate(sorted, params)
  },

  'POST /projects/:id/test-cases': ({ params, body }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const nextRef = db.testCases.reduce((max, item) => Math.max(max, Number(String(item.ref).split('-')[1]) || 0), 1000) + 1
    const steps = (body?.steps ?? []).map((step, index) => ({
      id: `step-${Date.now().toString(36)}-${index}`,
      action: step.action,
      expectedResult: step.expectedResult,
    }))
    const testCase = {
      id: `tc-${params.id}-${Date.now().toString(36)}`,
      projectId: params.id,
      ref: `TC-${nextRef}`,
      title: body?.title,
      description: body?.description ?? '',
      type: body?.type ?? 'functional',
      priority: body?.priority ?? 'medium',
      status: body?.status ?? 'draft',
      requirementIds: body?.requirementIds ?? [],
      module: body?.module ?? 'Unassigned',
      preconditions: body?.preconditions ?? '',
      testData: body?.testData ?? [],
      steps,
      revision: 1,
      authorId: body?.authorId ?? project.ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      automated: false,
      revisions: [{ revision: 1, changedAt: new Date().toISOString(), changedById: project.ownerId, summary: 'Test case created' }],
    }
    db.testCases.push(testCase)
    return { data: enrichTestCase(testCase), status: 201 }
  },

  'GET /test-cases/:id': ({ params }) => {
    const testCase = db.testCases.find((item) => item.id === params.id)
    if (!testCase) throw notFound('Test case not found.')
    return { data: enrichTestCase(testCase) }
  },

  'PATCH /test-cases/:id': ({ params, body, state }) => {
    const testCase = db.testCases.find((item) => item.id === params.id)
    if (!testCase) throw notFound('Test case not found.')
    testCase.revision += 1
    testCase.updatedAt = new Date().toISOString()
    testCase.revisions = [
      ...(testCase.revisions ?? []),
      { revision: testCase.revision, changedAt: testCase.updatedAt, changedById: state.user?.id, summary: 'Test case updated' },
    ]
    Object.assign(testCase, {
      title: body?.title ?? testCase.title,
      description: body?.description ?? testCase.description,
      type: body?.type ?? testCase.type,
      priority: body?.priority ?? testCase.priority,
      status: body?.status ?? testCase.status,
      requirementIds: body?.requirementIds ?? testCase.requirementIds,
      module: body?.module ?? testCase.module,
      preconditions: body?.preconditions ?? testCase.preconditions,
      testData: body?.testData ?? testCase.testData,
      steps:
        body?.steps?.map((step, index) => ({
          id: step.id ?? `step-${Date.now().toString(36)}-${index}`,
          action: step.action,
          expectedResult: step.expectedResult,
        })) ?? testCase.steps,
    })
    return { data: enrichTestCase(testCase) }
  },

  'DELETE /test-cases/:id': ({ params }) => {
    const testCase = db.testCases.find((item) => item.id === params.id)
    if (!testCase) throw notFound('Test case not found.')
    testCase.status = 'deprecated'
    return { data: { id: testCase.id, status: testCase.status } }
  },

  'POST /test-cases/:id/duplicate': ({ params, state }) => {
    const source = db.testCases.find((item) => item.id === params.id)
    if (!source) throw notFound('Test case not found.')
    const nextRef = db.testCases.reduce((max, item) => Math.max(max, Number(String(item.ref).split('-')[1]) || 0), 1000) + 1
    const copy = {
      ...source,
      id: `tc-${source.projectId}-${Date.now().toString(36)}`,
      ref: `TC-${nextRef}`,
      title: `${source.title} (copy)`,
      status: 'draft',
      revision: 1,
      authorId: state.user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: source.steps.map((step, index) => ({ ...step, id: `step-${Date.now().toString(36)}-${index}` })),
      revisions: [{ revision: 1, changedAt: new Date().toISOString(), changedById: state.user?.id, summary: `Cloned from ${source.ref}` }],
    }
    db.testCases.push(copy)
    return { data: enrichTestCase(copy), status: 201 }
  },

  'POST /projects/:id/ai-test-cases/generate': ({ params, body }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')

    const requirement = body?.requirementId
      ? db.requirements.find((item) => item.id === body.requirementId)
      : null
    const subject = requirement?.title ?? body?.description ?? 'the described behaviour'
    const count = Math.min(Number(body?.count) || 5, 15)
    const types = body?.types?.length ? body.types : ['functional', 'negative']

    const existingTitles = db.testCases
      .filter((item) => item.projectId === params.id)
      .map((item) => item.title.toLowerCase())

    const templates = [
      { title: `Verify ${subject.toLowerCase()} on the happy path`, type: 'functional', steps: ['Complete the primary flow with valid data', 'Submit and confirm the outcome'] },
      { title: `Verify ${subject.toLowerCase()} rejects invalid input`, type: 'negative', steps: ['Submit with a missing required value', 'Confirm the validation message blocks submission'] },
      { title: `Verify ${subject.toLowerCase()} at the maximum allowed boundary`, type: 'boundary', steps: ['Enter the maximum permitted value', 'Confirm the value is accepted without error'] },
      { title: `Verify ${subject.toLowerCase()} at the minimum allowed boundary`, type: 'boundary', steps: ['Enter the minimum permitted value', 'Confirm the value is accepted without error'] },
      { title: `Verify ${subject.toLowerCase()} with a viewer role`, type: 'functional', steps: ['Sign in with a viewer account', 'Attempt the action and confirm it is not permitted'] },
      { title: `Verify ${subject.toLowerCase()} persists across sessions`, type: 'regression', steps: ['Record the state', 'Sign out and sign back in, then confirm the state'] },
      { title: `Verify ${subject.toLowerCase()} handles a server error`, type: 'negative', steps: ['Force a 500 response from the dependent service', 'Confirm a clear error message is shown and no partial data is saved'] },
      { title: `Verify ${subject.toLowerCase()} end to end with the upstream service`, type: 'integration', steps: ['Trigger the upstream request', 'Confirm the downstream record matches'] },
    ]

    const suggestions = templates.slice(0, count).map((template, index) => {
      const chosenType = types[index % types.length]
      const title = template.title
      return {
        id: `sug-${Date.now().toString(36)}-${index}`,
        title,
        type: chosenType,
        priority: index < 2 ? 'high' : 'medium',
        description: `Generated suggestion for ${requirement?.ref ?? 'the supplied description'}. Review before approving.`,
        preconditions: 'A test account with the appropriate role is provisioned.',
        requirementIds: requirement ? [requirement.id] : [],
        steps: template.steps.map((action, stepIndex) => ({
          id: `sug-step-${index}-${stepIndex}`,
          action,
          expectedResult: `The system behaves as documented for ${subject.toLowerCase()}.`,
        })),
        status: 'pending',
        possibleDuplicate: existingTitles.some((existing) => existing.includes(title.toLowerCase().slice(0, 40))),
        missingFields: index === 2 ? ['expectedResult detail'] : [],
        confidence: index < 3 ? 'high' : 'medium',
      }
    })

    return {
      data: {
        generatedAt: new Date().toISOString(),
        model: 'testpilot-suggester (mock)',
        basedOn: requirement ? { type: 'requirement', ref: requirement.ref, title: requirement.title } : { type: 'description', value: subject },
        suggestions,
        disclaimer: 'These are unapproved suggestions. Nothing is written to the test library until you approve and save them.',
      },
      status: 201,
      delay: 900,
    }
  },

  'GET /projects/:id/test-runs': ({ params }) => {
    const items = applyFilters(db.testRuns, params, ['name', 'release', 'build'])
      .filter((run) => run.projectId === params.id)
      .map(enrichRun)
    return paginate(sortItems(items, params.sortBy, params.sortDir), params)
  },

  'POST /projects/:id/test-runs': ({ params, body }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const testCaseIds = body?.testCaseIds ?? []
    if (!testCaseIds.length) throw validation('Select at least one test case for the run.')

    const run = {
      id: `run-${Date.now().toString(36)}`,
      projectId: params.id,
      name: body?.name,
      release: body?.release ?? project.release,
      build: body?.build ?? `build-${Math.floor(Math.random() * 900 + 4000)}`,
      environment: body?.environment ?? project.environment,
      assigneeId: body?.assigneeId ?? project.ownerId,
      status: 'planned',
      scope: body?.scope ?? 'targeted',
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      executions: testCaseIds.map((testCaseId) => ({
        id: `exe-${Date.now().toString(36)}-${testCaseId}`,
        runId: null,
        testCaseId,
        projectId: params.id,
        result: 'not_run',
        notes: '',
        actualResult: '',
        executedById: null,
        executedAt: null,
        stepResults: [],
        evidence: [],
      })),
    }
    run.executions.forEach((execution) => {
      execution.runId = run.id
    })
    db.testRuns.unshift(run)
    return { data: enrichRun(run), status: 201 }
  },

  'GET /test-runs/:id': ({ params }) => {
    const run = db.testRuns.find((item) => item.id === params.id)
    if (!run) throw notFound('Test run not found.')
    return { data: enrichRun(run) }
  },

  'PATCH /test-runs/:id': ({ params, body }) => {
    const run = db.testRuns.find((item) => item.id === params.id)
    if (!run) throw notFound('Test run not found.')
    Object.assign(run, {
      name: body?.name ?? run.name,
      release: body?.release ?? run.release,
      build: body?.build ?? run.build,
      environment: body?.environment ?? run.environment,
      assigneeId: body?.assigneeId ?? run.assigneeId,
      status: body?.status ?? run.status,
      startedAt: body?.status === 'in_progress' && !run.startedAt ? new Date().toISOString() : run.startedAt,
      completedAt: body?.status === 'completed' ? new Date().toISOString() : run.completedAt,
    })
    return { data: enrichRun(run) }
  },

  'PATCH /test-runs/:id/executions/:executionId': ({ params, body, state }) => {
    const run = db.testRuns.find((item) => item.id === params.id)
    if (!run) throw notFound('Test run not found.')
    const execution = run.executions.find((item) => item.id === params.executionId)
    if (!execution) throw notFound('Execution not found.')

    execution.result = body?.result ?? execution.result
    execution.notes = body?.notes ?? execution.notes
    execution.actualResult = body?.actualResult ?? execution.actualResult
    execution.stepResults = body?.stepResults ?? execution.stepResults
    execution.evidence = body?.evidence ?? execution.evidence
    execution.executedById = body?.result && body.result !== 'not_run' ? state.user?.id : execution.executedById
    execution.executedAt = body?.result && body.result !== 'not_run' ? new Date().toISOString() : execution.executedAt

    if (run.status === 'planned') run.status = 'in_progress'
    if (!run.startedAt) run.startedAt = new Date().toISOString()

    return { data: enrichRun(run) }
  },

  'GET /projects/:id/defects': ({ params }) => {
    let items = db.defects.filter((item) => item.projectId === params.id)
    if (params?.openOnly === 'true') {
      items = items.filter((item) => !['closed', 'verified', 'deferred'].includes(item.status))
    }
    const sorted = applyFilters(items, params, ['ref', 'title', 'description']).map(enrichDefect)
    return paginate(sorted, params)
  },

  'POST /projects/:id/defects': ({ params, body, state }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const nextRef = db.defects.reduce((max, item) => Math.max(max, Number(String(item.ref).split('-')[1]) || 0), 500) + 1
    const now = new Date().toISOString()
    const defect = {
      id: `bug-${params.id}-${Date.now().toString(36)}`,
      projectId: params.id,
      ref: `BUG-${nextRef}`,
      title: body?.title,
      description: body?.description ?? '',
      reproductionSteps: body?.reproductionSteps ?? [],
      expectedResult: body?.expectedResult ?? '',
      actualResult: body?.actualResult ?? '',
      severity: body?.severity ?? 'medium',
      priority: body?.priority ?? 'medium',
      status: body?.status ?? 'new',
      assigneeId: body?.assigneeId ?? null,
      reporterId: state.user?.id,
      requirementId: body?.requirementId ?? null,
      testCaseId: body?.testCaseId ?? null,
      executionId: body?.executionId ?? null,
      runId: body?.runId ?? null,
      attachments: body?.attachments ?? [],
      comments: [],
      statusHistory: [{ status: 'new', changedAt: now, changedById: state.user?.id }],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    }
    db.defects.unshift(defect)
    return { data: enrichDefect(defect), status: 201 }
  },

  'GET /defects/:id': ({ params }) => {
    const defect = db.defects.find((item) => item.id === params.id)
    if (!defect) throw notFound('Defect not found.')
    return { data: enrichDefect(defect) }
  },

  'PATCH /defects/:id': ({ params, body, state }) => {
    const defect = db.defects.find((item) => item.id === params.id)
    if (!defect) throw notFound('Defect not found.')
    const now = new Date().toISOString()
    Object.assign(defect, {
      title: body?.title ?? defect.title,
      description: body?.description ?? defect.description,
      reproductionSteps: body?.reproductionSteps ?? defect.reproductionSteps,
      expectedResult: body?.expectedResult ?? defect.expectedResult,
      actualResult: body?.actualResult ?? defect.actualResult,
      severity: body?.severity ?? defect.severity,
      priority: body?.priority ?? defect.priority,
      assigneeId: body?.assigneeId !== undefined ? body.assigneeId : defect.assigneeId,
      requirementId: body?.requirementId !== undefined ? body.requirementId : defect.requirementId,
      testCaseId: body?.testCaseId !== undefined ? body.testCaseId : defect.testCaseId,
      updatedAt: now,
    })
    if (body?.status && body.status !== defect.status) {
      defect.status = body.status
      defect.statusHistory = [...defect.statusHistory, { status: body.status, changedAt: now, changedById: state.user?.id }]
      defect.resolvedAt = ['resolved', 'verified', 'closed'].includes(body.status) ? now : null
    }
    return { data: enrichDefect(defect) }
  },

  'POST /defects/:id/comments': ({ params, body, state }) => {
    const defect = db.defects.find((item) => item.id === params.id)
    if (!defect) throw notFound('Defect not found.')
    if (!body?.body?.trim()) throw validation('Comment cannot be empty.')
    const comment = {
      id: `cmt-${Date.now().toString(36)}`,
      body: body.body,
      authorId: state.user?.id,
      createdAt: new Date().toISOString(),
    }
    defect.comments = [...defect.comments, comment]
    defect.updatedAt = comment.createdAt
    return { data: enrichDefect(defect), status: 201 }
  },

  'POST /defects/:id/retest': ({ params }) => {
    const defect = db.defects.find((item) => item.id === params.id)
    if (!defect) throw notFound('Defect not found.')
    if (!defect.testCaseId) {
      throw validation('This defect is not linked to a test case, so a retest run cannot be created automatically.')
    }
    const testCase = db.testCases.find((item) => item.id === defect.testCaseId)
    const run = {
      id: `run-retest-${Date.now().toString(36)}`,
      projectId: defect.projectId,
      name: `Retest ${defect.ref} — ${testCase?.ref ?? 'linked case'}`,
      release: 'retest',
      build: `build-${Math.floor(Math.random() * 900 + 4000)}`,
      environment: 'qa',
      assigneeId: defect.assigneeId ?? defect.reporterId,
      status: 'planned',
      scope: 'targeted',
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      executions: [
        {
          id: `exe-retest-${Date.now().toString(36)}`,
          runId: null,
          testCaseId: defect.testCaseId,
          projectId: defect.projectId,
          result: 'not_run',
          notes: `Created automatically from ${defect.ref}.`,
          actualResult: '',
          executedById: null,
          executedAt: null,
          stepResults: [],
          evidence: [],
          retestOfDefectId: defect.id,
        },
      ],
    }
    run.executions[0].runId = run.id
    db.testRuns.unshift(run)
    defect.status = 'resolved'
    defect.updatedAt = new Date().toISOString()
    return { data: { defect: enrichDefect(defect), run: enrichRun(run) }, status: 201 }
  },

  'GET /projects/:id/regression/change-sets': ({ params }) => ({
    data: db.regressionChangeSets
      .filter((item) => item.projectId === params.id)
      .map((changeSet) => ({
        ...changeSet,
        requirements: changeSet.requirementIds
          .map((id) => db.requirements.find((item) => item.id === id))
          .filter(Boolean)
          .map((item) => ({ id: item.id, ref: item.ref, title: item.title, module: item.module, updatedAt: item.updatedAt, status: item.status })),
        recommendationCount: changeSet.recommendations.length,
        createdBy: resolveUser(changeSet.createdById),
      })),
  }),

  'GET /projects/:id/regression/change-sets/:changeSetId': ({ params }) => {
    const changeSet = db.regressionChangeSets.find(
      (item) => item.id === params.changeSetId && item.projectId === params.id,
    )
    if (!changeSet) throw notFound('Change set not found.')
    return {
      data: {
        ...changeSet,
        createdBy: resolveUser(changeSet.createdById),
        requirements: changeSet.requirementIds
          .map((id) => db.requirements.find((item) => item.id === id))
          .filter(Boolean),
        recommendations: changeSet.recommendations.map((recommendation) => {
          const testCase = db.testCases.find((item) => item.id === recommendation.testCaseId)
          const previousRun = db.testRuns
            .filter((run) => run.projectId === params.id && run.status === 'completed')
            .sort((a, b) => new Date(b.completedAt ?? b.startedAt) - new Date(a.completedAt ?? a.startedAt))[0]
          const previousExecution = previousRun?.executions.find((item) => item.testCaseId === recommendation.testCaseId)
          return {
            ...recommendation,
            testCase: testCase
              ? {
                  id: testCase.id,
                  ref: testCase.ref,
                  title: testCase.title,
                  type: testCase.type,
                  priority: testCase.priority,
                  module: testCase.module,
                  automated: testCase.automated,
                }
              : null,
            previousRun: previousRun ? { id: previousRun.id, name: previousRun.name } : null,
            previousResult: previousExecution?.result ?? null,
            previousExecutedAt: previousExecution?.executedAt ?? null,
          }
        }),
        sourceNote:
          'Recommendations are returned by the TestPilot recommendation service and include the reason and dependency path that produced them.',
      },
    }
  },

  'POST /projects/:id/regression/suites': ({ params, body }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    if (!body?.testCaseIds?.length) throw validation('Select at least one test case for the regression suite.')
    return {
      data: {
        id: `suite-${Date.now().toString(36)}`,
        projectId: params.id,
        name: body?.name ?? 'Regression suite',
        testCaseIds: body.testCaseIds,
        changeSetId: body?.changeSetId ?? null,
        createdAt: new Date().toISOString(),
      },
      status: 201,
    }
  },

  'GET /projects/:id/automation/jobs': ({ params }) => ({
    data: db.automationJobs.filter((item) => item.projectId === params.id),
  }),

  'GET /automation/jobs/:id': ({ params }) => {
    const job = db.automationJobs.find((item) => item.id === params.id)
    if (!job) throw notFound('Automation job not found.')
    return {
      data: {
        ...job,
        testCases: job.testCaseIds
          .map((id) => db.testCases.find((item) => item.id === id))
          .filter(Boolean)
          .map((item) => ({ id: item.id, ref: item.ref, title: item.title, module: item.module })),
      },
    }
  },

  'POST /automation/jobs/:id/run': ({ params }) => {
    const job = db.automationJobs.find((item) => item.id === params.id)
    if (!job) throw notFound('Automation job not found.')
    if (!job.enabled) throw forbidden('This automation job is disabled and cannot be started.')

    const startedAt = new Date().toISOString()
    const total = job.lastRun.total
    const failed = job.lastRun.failed
    job.lastRun = {
      ...job.lastRun,
      id: `jobrun-${Date.now().toString(36)}`,
      status: 'running',
      startedAt,
      durationMs: 0,
      total,
      passed: 0,
      failed: 0,
      skipped: 0,
    }
    job.history = [{ ...job.lastRun, total, passed: Math.max(total - failed, 0), failed, status: 'failed' }, ...job.history].slice(0, 8)
    return { data: { ...job, lastRun: { ...job.lastRun, status: 'running' } }, status: 202 }
  },

  'POST /automation/jobs/:id/rerun': ({ params }) => {
    const job = db.automationJobs.find((item) => item.id === params.id)
    if (!job) throw notFound('Automation job not found.')
    const failedCount = job.lastRun?.failed ?? 0
    if (failedCount <= 0) {
      throw validation('This job has no recorded failures to rerun. Start a full run instead.')
    }
    const failedTestCaseIds = job.testCaseIds.slice(0, Math.min(failedCount, job.testCaseIds.length))
    return {
      data: {
        jobId: job.id,
        queued: true,
        scope: 'failed_specs',
        testCaseIds: failedTestCaseIds,
        queuedAt: new Date().toISOString(),
      },
      status: 202,
    }
  },

  'PATCH /automation/jobs/:id': ({ params, body }) => {
    const job = db.automationJobs.find((item) => item.id === params.id)
    if (!job) throw notFound('Automation job not found.')
    job.enabled = body?.enabled ?? job.enabled
    job.targetEnvironment = body?.targetEnvironment ?? job.targetEnvironment
    job.trigger = body?.trigger ?? job.trigger
    job.schedule = body?.schedule ?? job.schedule
    job.notifyOnFailure = body?.notifyOnFailure ?? job.notifyOnFailure
    return { data: job }
  },

  'GET /dashboard/summary': ({ params }) => {
    const projectId = params?.projectId && params.projectId !== 'all' ? params.projectId : null
    const projects = projectId ? [db.projects.find((item) => item.id === projectId)].filter(Boolean) : db.projects
    const scope = (collection) => (projectId ? collection.filter((item) => item.projectId === projectId) : collection)
    const requirements = scope(db.requirements)
    const testCases = scope(db.testCases)
    const runs = scope(db.testRuns)
    const defects = scope(db.defects)
    const executions = runs.flatMap((run) => run.executions)
    const executed = executions.filter((item) => item.result !== 'not_run')
    const covered = new Set(testCases.flatMap((item) => item.requirementIds))
    const openDefects = defects.filter((item) => !['closed', 'verified', 'deferred'].includes(item.status))

    return {
      data: {
        projectId,
        projectName: projectId ? projects[0]?.name ?? null : null,
        kpis: {
          totalTestCases: testCases.length,
          executedTests: executed.length,
          totalExecutions: executions.length,
          passRate: executed.length
            ? Number(((executed.filter((item) => item.result === 'pass').length / executed.length) * 100).toFixed(1))
            : null,
          openDefects: openDefects.length,
          requirementCoverage: requirements.length
            ? Number(((covered.size / requirements.length) * 100).toFixed(1))
            : null,
          uncoveredRequirements: requirements.length - covered.size,
          automationCoverage: testCases.length
            ? Number(((testCases.filter((item) => item.automated).length / testCases.length) * 100).toFixed(1))
            : 0,
          activeRuns: runs.filter((item) => item.status === 'in_progress').length,
        },
        executionTrend: buildTrend(executions, Number(params?.days) || 30),
        resultDistribution: [
          { name: 'Pass', key: 'pass', value: executions.filter((item) => item.result === 'pass').length },
          { name: 'Fail', key: 'fail', value: executions.filter((item) => item.result === 'fail').length },
          { name: 'Blocked', key: 'blocked', value: executions.filter((item) => item.result === 'blocked').length },
          { name: 'Not Run', key: 'not_run', value: executions.filter((item) => item.result === 'not_run').length },
        ].filter((item) => item.value > 0),
        defectSeverity: ['critical', 'high', 'medium', 'low', 'trivial'].map((key) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          value: defects.filter((item) => item.severity === key && !['closed', 'verified'].includes(item.status)).length,
        })),
        defectAging: [0, 1, 2, 3, 4].map((bucket) => {
          const lower = bucket * 7
          const upper = lower + 7
          const count = openDefects.filter((item) => {
            const age = (Date.now() - new Date(item.createdAt).getTime()) / DAY
            return age >= lower && age < upper
          }).length
          return { key: `${lower}-${upper}d`, label: `${lower}–${upper} days`, value: count }
        }),
        recentRuns: runs
          .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
          .slice(0, 5)
          .map(enrichRun),
        recentDefects: [...defects]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
          .map(enrichDefect),
        activity: scope(db.activities).slice(0, 12).map((item) => ({ ...item, actor: resolveUser(item.actorId) })),
        modules: [...new Set(requirements.map((item) => item.module))].map((module) => {
          const moduleRequirements = requirements.filter((item) => item.module === module)
          const moduleCovered = moduleRequirements.filter((item) => covered.has(item.id)).length
          return {
            module,
            requirements: moduleRequirements.length,
            covered: moduleCovered,
            coverage: moduleRequirements.length ? Number(((moduleCovered / moduleRequirements.length) * 100).toFixed(1)) : 0,
          }
        }),
        staleRequirements: projectId ? staleRequirements(projectId).length : 0,
        projectSummaries: projects.map((project) => ({
          id: project.id,
          name: project.name,
          key: project.key,
          status: project.status,
          metrics: projectMetrics(project.id),
        })),
      },
    }
  },

  'GET /projects/:id/reports/summary': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const runs = db.testRuns.filter((item) => item.projectId === params.id)
    const executions = runs.flatMap((run) => run.executions)
    const regressionRuns = runs.filter((run) => run.scope === 'regression')
    return {
      data: {
        period: { from: params?.from ?? null, to: params?.to ?? null },
        project: { id: project.id, name: project.name, release: project.release, environment: project.environment },
        execution: {
          byRun: runs.map(enrichRun),
          byEnvironment: Object.entries(countBy(executions, (item) => item.result)).map(([key, value]) => ({ key, value })),
          totalExecutions: executions.length,
        },
        regression: {
          runs: regressionRuns.length,
          executions: regressionRuns.flatMap((run) => run.executions).length,
          lastRun: regressionRuns.length ? enrichRun([...regressionRuns].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]) : null,
        },
        modules: countBy(db.testCases.filter((item) => item.projectId === params.id), (item) => item.module),
      },
    }
  },

  'GET /projects/:id/reports/coverage': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const requirements = db.requirements.filter((item) => item.projectId === params.id)
    const testCases = db.testCases.filter((item) => item.projectId === params.id)
    const rows = requirements.map((requirement) => {
      const linked = testCases.filter((item) => item.requirementIds.includes(requirement.id))
      return {
        id: requirement.id,
        ref: requirement.ref,
        title: requirement.title,
        module: requirement.module,
        priority: requirement.priority,
        status: requirement.status,
        testCaseCount: linked.length,
        approvedTestCases: linked.filter((item) => item.status === 'approved').length,
        covered: linked.length > 0,
      }
    })
    return {
      data: {
        rows,
        totals: {
          requirements: requirements.length,
          covered: rows.filter((row) => row.covered).length,
          uncovered: rows.filter((row) => !row.covered).length,
          coveragePercent: requirements.length
            ? Number(((rows.filter((row) => row.covered).length / requirements.length) * 100).toFixed(1))
            : null,
        },
      },
    }
  },

  'GET /projects/:id/reports/defect-aging': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const defects = db.defects.filter((item) => item.projectId === params.id)
    const open = defects.filter((item) => !['closed', 'verified', 'deferred'].includes(item.status))

    return {
      data: {
        bySeverity: ['critical', 'high', 'medium', 'low', 'trivial'].map((key) => ({
          key,
          open: open.filter((item) => item.severity === key).length,
          total: defects.filter((item) => item.severity === key).length,
          resolved: defects.filter((item) => item.severity === key && ['resolved', 'verified', 'closed'].includes(item.status)).length,
        })),
        aging: [0, 1, 2, 3, 4].map((bucket) => {
          const lower = bucket * 7
          const upper = lower + 7
          const inBucket = open.filter((item) => {
            const age = (Date.now() - new Date(item.createdAt).getTime()) / DAY
            return age >= lower && age < upper
          })
          return {
            key: `${lower}-${upper}d`,
            label: `${lower}–${upper} days`,
            total: inBucket.length,
            critical: inBucket.filter((item) => item.severity === 'critical' || item.severity === 'high').length,
          }
        }),
        rows: [...defects]
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .map((item) => {
            const ageDays = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / DAY)
            const resolvedDays = item.resolvedAt
              ? Math.floor((new Date(item.resolvedAt).getTime() - new Date(item.createdAt).getTime()) / DAY)
              : null
            return {
              id: item.id,
              ref: item.ref,
              title: item.title,
              severity: item.severity,
              priority: item.priority,
              status: item.status,
              assignee: resolveUser(item.assigneeId)?.name ?? 'Unassigned',
              ageDays,
              timeToResolveDays: resolvedDays,
              createdAt: item.createdAt,
            }
          }),
        totals: {
          total: defects.length,
          open: open.length,
          resolved: defects.length - open.length,
          meanTimeToResolve: (() => {
            const resolved = defects.filter((item) => item.resolvedAt)
            if (!resolved.length) return null
            const total = resolved.reduce(
              (sum, item) => sum + (new Date(item.resolvedAt).getTime() - new Date(item.createdAt).getTime()) / DAY,
              0,
            )
            return Number((total / resolved.length).toFixed(1))
          })(),
        },
      },
    }
  },

  'GET /projects/:id/reports/release-readiness': ({ params }) => {
    const project = db.projects.find((item) => item.id === params.id)
    if (!project) throw notFound('Project not found.')
    const metrics = projectMetrics(project.id)
    const openDefects = db.defects.filter(
      (item) => item.projectId === project.id && !['closed', 'verified', 'deferred'].includes(item.status),
    )
    const requirements = db.requirements.filter((item) => item.projectId === project.id)
    const covered = new Set(db.testCases.filter((item) => item.projectId === project.id).flatMap((item) => item.requirementIds))
    const completedRuns = db.testRuns
      .filter((item) => item.projectId === project.id && item.status === 'completed')
      .sort((a, b) => new Date(b.completedAt ?? b.startedAt) - new Date(a.completedAt ?? a.startedAt))
    const latestRun = completedRuns[0] ? enrichRun(completedRuns[0]) : null
    const blockers = completedRuns.length
      ? db.requirements.filter(
          (item) => item.projectId === project.id && new Date(item.updatedAt) > new Date(completedRuns[0].completedAt ?? completedRuns[0].startedAt),
        )
      : requirements

    const criteria = [
      {
        key: 'critical_defects',
        label: 'No open critical defects',
        status: openDefects.some((item) => item.severity === 'critical') ? 'fail' : 'pass',
        observed: `${openDefects.filter((item) => item.severity === 'critical').length} open critical, ${openDefects.filter((item) => item.severity === 'high').length} open high`,
        weight: 'blocking',
      },
      {
        key: 'test_pass_rate',
        label: 'Test pass rate at or above 95%',
        status:
          metrics.passRate === null ? 'unknown' : metrics.passRate >= 95 ? 'pass' : 'fail',
        observed: metrics.passRate === null ? 'No executions recorded' : `${metrics.passRate}% across ${metrics.executed} executions`,
        weight: 'blocking',
      },
      {
        key: 'requirement_coverage',
        label: 'Every requirement has at least one approved test case',
        status:
          requirements.length === 0
            ? 'unknown'
            : requirements.every(
                (item) =>
                  covered.has(item.id) &&
                  db.testCases.some(
                    (testCase) => testCase.requirementIds.includes(item.id) && testCase.status === 'approved',
                  ),
              )
            ? 'pass'
            : 'fail',
        observed: `${requirements.length - covered.size} of ${requirements.length} requirements have no test case`,
        weight: 'blocking',
      },
      {
        key: 'requirements_frozen',
        label: 'No requirements changed after the last completed run',
        status: blockers.length ? 'fail' : 'pass',
        observed: blockers.length
          ? `${blockers.length} requirement(s) changed after ${completedRuns[0]?.name ?? 'the last completed run'}`
          : 'No requirements changed after the last completed run',
        weight: 'warning',
      },
      {
        key: 'blocked_tests',
        label: 'No blocked tests outstanding',
        status: latestRun
          ? latestRun.summary.blocked === 0
            ? 'pass'
            : 'fail'
          : 'unknown',
        observed: latestRun ? `${latestRun.summary.blocked} blocked in ${latestRun.name}` : 'No completed run available',
        weight: 'warning',
      },
      {
        key: 'not_run_tests',
        label: 'All planned tests executed',
        status: latestRun
          ? latestRun.summary.not_run === 0
            ? 'pass'
            : 'fail'
          : 'unknown',
        observed: latestRun ? `${latestRun.summary.not_run} not run in ${latestRun.name}` : 'No completed run available',
        weight: 'warning',
      },
      {
        key: 'automation_coverage',
        label: 'At least 60% of test cases automated',
        status: metrics.automationCoverage >= 60 ? 'pass' : 'fail',
        observed: `${metrics.automationCoverage}% of ${metrics.testCases} test cases are automated`,
        weight: 'informational',
      },
    ]

    return {
      data: {
        project: { id: project.id, name: project.name, release: project.release, environment: project.environment },
        generatedAt: new Date().toISOString(),
        latestRun,
        criteria,
        counts: {
          totalTestCases: metrics.testCases,
          executedTests: metrics.executed,
          totalExecutions: metrics.totalExecutions,
          passRate: metrics.passRate,
          openDefects: metrics.openDefects,
          requirements: metrics.requirements,
          uncoveredRequirements: metrics.uncoveredRequirements,
          requirementCoverage: metrics.requirementCoverage,
          automationCoverage: metrics.automationCoverage,
        },
        openDefectBreakdown: ['critical', 'high', 'medium', 'low', 'trivial'].map((key) => ({
          key,
          count: openDefects.filter((item) => item.severity === key).length,
        })),
        uncoveredRequirements: requirements
          .filter((item) => !covered.has(item.id))
          .map((item) => ({ id: item.id, ref: item.ref, title: item.title, priority: item.priority })),
        requirementsChangedAfterRun: blockers.map((item) => ({
          id: item.id,
          ref: item.ref,
          title: item.title,
          updatedAt: item.updatedAt,
        })),
        disclaimer:
          'This page reports whether the configured release criteria are met. It is decision support only — the release decision stays with the release owner, and an unmet criterion should be reviewed rather than scored away.',
      },
    }
  },

  'GET /settings/workspace': () => ({
    data: { ...db.workspace, owner: resolveUser(db.workspace.ownerId), memberCount: db.workspace.memberIds.length },
  }),

  'PATCH /settings/workspace': ({ body }) => {
    Object.assign(db.workspace, { name: body?.name ?? db.workspace.name, slug: body?.slug ?? db.workspace.slug })
    return { data: { ...db.workspace, owner: resolveUser(db.workspace.ownerId), memberCount: db.workspace.memberIds.length } }
  },

  'GET /settings/members': () => ({
    data: db.users.map((user) => ({
      ...user,
      projects: db.projects.filter((project) => project.memberIds.includes(user.id)).map((project) => ({ id: project.id, name: project.name, key: project.key })),
      isWorkspaceOwner: user.id === db.workspace.ownerId,
    })),
  }),

  'POST /settings/members/invite': ({ body }) => {
    if (!body?.email) throw validation('Email is required.')
    if (db.users.some((user) => user.email.toLowerCase() === String(body.email).toLowerCase())) {
      throw conflict('A member with that email already exists.')
    }
    const user = {
      id: `usr-${Date.now().toString(36)}`,
      name: body?.name || String(body.email).split('@')[0],
      email: body.email,
      role: body?.role ?? 'tester',
      title: body?.title ?? 'Invited member',
      timezone: body?.timezone ?? 'UTC',
      invitedAt: new Date().toISOString(),
    }
    db.users.push(user)
    return { data: user, status: 201 }
  },

  'PATCH /settings/members/:id': ({ params, body }) => {
    const user = db.users.find((item) => item.id === params.id)
    if (!user) throw notFound('Member not found.')
    Object.assign(user, {
      role: body?.role ?? user.role,
      title: body?.title ?? user.title,
      timezone: body?.timezone ?? user.timezone,
    })
    return { data: user }
  },

  'DELETE /settings/members/:id': ({ params }) => {
    const index = db.users.findIndex((item) => item.id === params.id)
    if (index === -1) throw notFound('Member not found.')
    if (db.users[index].id === db.workspace.ownerId) {
      throw forbidden('The workspace owner cannot be removed.')
    }
    db.users.splice(index, 1)
    return { data: { id: params.id } }
  },

  'GET /settings/preferences': ({ state }) => ({
    data: {
      theme: state.user?.theme ?? 'light',
      timezone: state.user?.timezone ?? 'UTC',
      dateFormat: state.user?.dateFormat ?? 'dd MMM yyyy',
      weekStartsOn: state.user?.weekStartsOn ?? 'monday',
      compactTables: state.user?.compactTables ?? false,
      defaultPageSize: state.user?.defaultPageSize ?? 25,
      notificationPreferences: state.user?.notificationPreferences ?? {
        email: { testRuns: true, defects: true, requirements: false, automation: true, comments: true },
        inApp: { testRuns: true, defects: true, requirements: true, automation: true, comments: true },
      },
    },
  }),

  'PUT /settings/preferences': ({ body, state }) => {
    const user = db.users.find((item) => item.id === state.user?.id)
    if (user) Object.assign(user, body ?? {})
    return { data: body }
  },

  'GET /notifications': () => ({ data: [...db.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }),

  'PATCH /notifications/:id': ({ params, body }) => {
    const notification = db.notifications.find((item) => item.id === params.id)
    if (!notification) throw notFound('Notification not found.')
    notification.read = body?.read ?? notification.read
    return { data: notification }
  },

  'POST /notifications/read-all': () => {
    db.notifications.forEach((item) => {
      item.read = true
    })
    return { data: { message: 'All notifications marked as read.' } }
  },
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400, code: 'BAD_REQUEST' })
}

function unauthorized(message) {
  return Object.assign(new Error(message), { status: 401, code: 'UNAUTHORIZED' })
}

function forbidden(message) {
  return Object.assign(new Error(message), { status: 403, code: 'FORBIDDEN' })
}

function notFound(message) {
  return Object.assign(new Error(message), { status: 404, code: 'NOT_FOUND' })
}

function conflict(message) {
  return Object.assign(new Error(message), { status: 409, code: 'CONFLICT' })
}

function validation(message) {
  return Object.assign(new Error(message), { status: 422, code: 'VALIDATION_ERROR' })
}

export { paginate, applyFilters, sortItems, projectMetrics, staleRequirements, enrichRun, enrichDefect, enrichTestCase }

function compilePattern(pattern) {
  const keys = []
  const source = pattern
    .split('/')
    .map((segment) => {
      if (!segment.startsWith(':')) return segment
      keys.push(segment.slice(1))
      return '([^/]+)'
    })
    .join('/')
  return { regex: new RegExp(`^${source}$`), keys }
}

const compiled = Object.entries(handlers).map(([signature, handler]) => {
  const [method, path] = signature.split(' ')
  return { method: method.toUpperCase(), path, ...compilePattern(path), handler }
})

export function resolveHandler(method, path) {
  const normalizedMethod = method.toUpperCase()
  const normalizedPath = path.replace(/\/+$/, '') || '/'

  for (const route of compiled) {
    if (route.method !== normalizedMethod) continue
    const match = normalizedPath.match(route.regex)
    if (!match) continue
    const params = route.keys.reduce((acc, key, index) => {
      acc[key] = decodeURIComponent(match[index + 1])
      return acc
    }, {})
    return { handler: route.handler, params }
  }

  return null
}
