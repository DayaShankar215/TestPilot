import * as service from './users.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'
import { buildMeta } from '../../utils/pagination.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function getProfile(req, res) {
  return sendSuccess(res, { data: { user: req.auth.user } })
}

export async function updateProfile(req, res) {
  return sendSuccess(res, { message: 'Profile updated', data: { user: await service.updateProfile(req.auth, req.body) } })
}

export async function getPreferences(req, res) {
  return sendSuccess(res, { data: { preferences: await service.getPreferences(req.auth) } })
}

export async function updatePreferences(req, res) {
  return sendSuccess(res, {
    message: 'Preferences saved',
    data: { preferences: await service.updatePreferences(req.auth, req.body) },
  })
}

export async function searchUsers(req, res) {
  const paging = pageOf(req.query)
  const { items, total } = await service.searchUsers(req.auth, { ...req.query, ...paging })
  return sendSuccess(res, { data: { items, meta: buildMeta({ ...paging, total }) } })
}

export async function deactivateUser(req, res) {
  return sendSuccess(res, { message: 'User deactivated', data: await service.deactivateUser(req.auth, req.params.userId) })
}

export async function listWorkspaces(req, res) {
  const paging = pageOf(req.query)
  const { items, total } = await service.listWorkspaces(req.auth, paging)
  return sendSuccess(res, { data: { items, meta: buildMeta({ ...paging, total }) } })
}

export async function getWorkspace(req, res) {
  return sendSuccess(res, { data: await service.getWorkspace(req.auth, req.params.workspaceId) })
}

export async function updateWorkspaceSettings(req, res) {
  return sendSuccess(res, {
    message: 'Workspace updated',
    data: await service.renameWorkspace(req.auth, req.params.workspaceId, req.body),
  })
}

export async function listMembers(req, res) {
  const paging = pageOf(req.query)
  const { items, total } = await service.listWorkspaceMembers(req.auth, req.params.workspaceId, {
    search: req.query.search,
    ...paging,
  })
  return sendSuccess(res, { data: { items, meta: buildMeta({ ...paging, total }) } })
}

export async function addMember(req, res) {
  const result = await service.addWorkspaceMember(req.auth, req.params.workspaceId, req.body)
  return sendSuccess(res, {
    status: 201,
    message: 'Member added to workspace',
    data: {
      member: result.membership,
      user: result.user,
      // Only surfaced outside production so an admin can hand over credentials.
      temporaryPassword: req.app.get('env').isProduction ? undefined : result.temporaryPassword,
    },
  })
}

export async function updateMember(req, res) {
  return sendSuccess(res, {
    message: 'Member role updated',
    data: await service.updateMemberRole(req.auth, req.params.workspaceId, req.params.memberId, req.body.role),
  })
}

export async function removeMember(req, res) {
  return sendSuccess(res, {
    message: 'Member removed from workspace',
    data: await service.removeWorkspaceMember(req.auth, req.params.workspaceId, req.params.memberId),
  })
}