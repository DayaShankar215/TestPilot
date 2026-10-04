import { prisma } from '../config/database.js'
import { ApiError } from '../utils/apiError.js'
import { rankForRole, workspaceRoleIn } from '../middleware/authorize.js'

/**
 * Single place that answers "may this user touch this project?".
 *
 * Resolution order:
 *   1. explicit `project_members.role` (highest of workspace/project role)
 *   2. workspace membership role
 *   3. nothing -> the project is treated as non-existent (404) so a user can
 *      never confirm that another workspace's project exists.
 */

export async function resolveProjectAccess(auth, projectId, { minimumRole = 'viewer', allowArchived = true } = {}) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: { in: auth.workspaceIds },
      ...(allowArchived ? {} : { archivedAt: null }),
    },
    include: {
      members: { where: { userId: auth.user.id }, select: { role: true } },
    },
  })

  if (!project) {
    throw ApiError.notFound('Project not found.')
  }

  const workspaceRole = workspaceRoleIn(auth, project.workspaceId)
  if (!workspaceRole) {
    throw ApiError.notFound('Project not found.')
  }

  const projectRole = project.members[0]?.role ?? null
  const effectiveRole = highestRole(workspaceRole, projectRole)

  if (rankOf(effectiveRole) < rankOf(minimumRole)) {
    throw ApiError.forbidden(`This action requires the ${minimumRole} role or higher in this project.`)
  }

  return {
    project,
    role: effectiveRole,
    workspaceRole,
    projectRole,
    canWrite: rankOf(effectiveRole) >= rankOf('qa_lead'),
    canManage: rankOf(effectiveRole) >= rankOf('manager'),
  }
}

/** Same as resolveProjectAccess but returns null instead of throwing. */
export async function findProjectAccess(auth, projectId, options) {
  try {
    return await resolveProjectAccess(auth, projectId, options)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

function rankOf(role) {
  return rankForRole(role)
}

function highestRole(workspaceRole, projectRole) {
  return rankOf(projectRole) > rankOf(workspaceRole) ? projectRole : workspaceRole
}

/**
 * Loads a child record and proves the caller may access it through its project.
 * Used by every `/:resourceId` route that is not project-scoped.
 */
export async function resolveScopedRecord(auth, { model, id, minimumRole = 'viewer', select, include, where = {} }) {
  // `select` needs projectId for the access check; `include` already returns scalars.
  const query = select
    ? { where: { id, ...where }, select: { projectId: true, ...select } }
    : { where: { id, ...where }, ...(include ? { include } : {}) }

  const record = await prisma[model].findFirst(query)
  if (!record) throw ApiError.notFound('The requested resource was not found.')

  const access = await resolveProjectAccess(auth, record.projectId, { minimumRole })
  return { record, access }
}