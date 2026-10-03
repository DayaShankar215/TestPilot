import { ApiError } from '../utils/apiError.js'

/** Ordered from most to least privileged. */
export const WORKSPACE_ROLE_RANK = {
  owner: 5,
  admin: 4,
  qa_lead: 3,
  tester: 2,
  viewer: 1,
}

export const PROJECT_ROLE_RANK = {
  manager: 4,
  qa_lead: 3,
  tester: 2,
  viewer: 1,
}

function rankOf(table, role) {
  return table[role] ?? 0
}

export function rankForRole(role) {
  return rankOf(WORKSPACE_ROLE_RANK, role) || rankOf(PROJECT_ROLE_RANK, role)
}

export function hasWorkspaceRole(auth, workspaceId, minimumRole) {
  const membership = auth.memberships.find((item) => item.workspaceId === workspaceId)
  if (!membership) return false
  return rankOf(WORKSPACE_ROLE_RANK, membership.role) >= rankOf(WORKSPACE_ROLE_RANK, minimumRole)
}

export function workspaceRoleIn(auth, workspaceId) {
  return auth.memberships.find((item) => item.workspaceId === workspaceId)?.role ?? null
}

/** Route guard for workspace-scoped endpoints. */
export function requireWorkspaceRole(minimumRole) {
  return function workspaceRoleGuard(req, _res, next) {
    if (!req.auth) {
      next(ApiError.unauthorized())
      return
    }

    const workspaceId = req.params.workspaceId ?? req.auth.primaryWorkspaceId
    if (!workspaceId) {
      next(ApiError.forbidden('You are not a member of any workspace'))
      return
    }

    if (!hasWorkspaceRole(req.auth, workspaceId, minimumRole)) {
      next(ApiError.forbidden(`This action requires the ${minimumRole} role or higher`))
      return
    }

    req.workspaceId = workspaceId
    next()
  }
}

/**
 * Coarse capability check used by routes that have no project in the path.
 * `manage` covers workspace administration, `write` covers authoring.
 */
export function requireCapability(capability) {
  return function capabilityGuard(req, _res, next) {
    if (!req.auth) {
      next(ApiError.unauthorized())
      return
    }

    const allowed = auth.workspaceIds.some((workspaceId) => {
      const minimum = capability === 'manage' ? 'admin' : capability === 'write' ? 'qa_lead' : 'viewer'
      return hasWorkspaceRole(req.auth, workspaceId, minimum)
    })

    if (!allowed) {
      next(ApiError.forbidden(`This action requires ${capability} access`))
      return
    }

    next()
  }
}