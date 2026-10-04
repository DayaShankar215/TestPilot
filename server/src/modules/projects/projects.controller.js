import * as service from './projects.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const paging = pageOf(req.query)
  const { items, meta } = await service.listProjects(req.auth, { ...req.query, ...paging })
  return sendSuccess(res, { data: { items, meta } })
}

export async function get(req, res) {
  return sendSuccess(res, { data: await service.getProject(req.auth, req.params.projectId) })
}

export async function create(req, res) {
  const workspaceId = req.auth.primaryWorkspaceId
  return sendSuccess(res, {
    status: 201,
    message: 'Project created successfully',
    data: await service.createProject(req.auth, workspaceId, req.body),
  })
}

export async function update(req, res) {
  return sendSuccess(res, { message: 'Project updated', data: await service.updateProject(req.auth, req.params.projectId, req.body) })
}

export async function archive(req, res) {
  return sendSuccess(res, { message: 'Project archived', data: await service.archiveProject(req.auth, req.params.projectId) })
}

export async function listMembers(req, res) {
  const { items, meta } = await service.listProjectMembers(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function addMember(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Project member added',
    data: await service.addProjectMember(req.auth, req.params.projectId, req.body),
  })
}

export async function dashboard(req, res) {
  return sendSuccess(res, { data: await service.projectDashboard(req.auth, req.params.projectId, req.query) })
}

export async function activity(req, res) {
  const { items, meta } = await service.projectActivity(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}