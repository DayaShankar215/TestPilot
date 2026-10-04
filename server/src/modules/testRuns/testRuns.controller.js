import * as service from './testRuns.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const { items, meta } = await service.listRuns(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function get(req, res) {
  return sendSuccess(res, { data: await service.getRun(req.auth, req.params.projectId, req.params.runId) })
}

export async function create(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Test run created successfully',
    data: await service.createRun(req.auth, req.params.projectId, req.body),
  })
}

export async function update(req, res) {
  return sendSuccess(res, {
    message: 'Test run updated',
    data: await service.updateRun(req.auth, req.params.projectId, req.params.runId, req.body),
  })
}

export async function recordResult(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Result recorded',
    data: await service.recordResult(req.auth, req.params.projectId, req.params.runId, req.body),
  })
}

export async function listResults(req, res) {
  const { items, meta } = await service.listResults(req.auth, req.params.projectId, req.params.runId, {
    ...req.query,
    ...pageOf(req.query),
  })
  return sendSuccess(res, { data: { items, meta } })
}

export async function updateResult(req, res) {
  return sendSuccess(res, {
    message: 'Result updated',
    data: await service.updateResult(req.auth, req.params.resultId, req.body),
  })
}