import * as service from './requirements.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const { items, meta } = await service.listRequirements(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function get(req, res) {
  return sendSuccess(res, { data: await service.getRequirement(req.auth, req.params.requirementId) })
}

export async function create(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Requirement created successfully',
    data: await service.createRequirement(req.auth, req.params.projectId, req.body),
  })
}

export async function update(req, res) {
  return sendSuccess(res, { message: 'Requirement updated', data: await service.updateRequirement(req.auth, req.params.requirementId, req.body) })
}

export async function archive(req, res) {
  return sendSuccess(res, { message: 'Requirement archived', data: await service.archiveRequirement(req.auth, req.params.requirementId) })
}

export async function history(req, res) {
  const { items, meta } = await service.requirementHistory(req.auth, req.params.requirementId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function testCases(req, res) {
  const { items, meta } = await service.requirementTestCases(req.auth, req.params.requirementId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}