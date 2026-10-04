import * as service from './defects.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const { items, meta } = await service.listDefects(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function get(req, res) {
  return sendSuccess(res, { data: await service.getDefect(req.auth, req.params.projectId, req.params.defectId) })
}

export async function create(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Defect created successfully',
    data: await service.createDefect(req.auth, req.params.projectId, req.body),
  })
}

export async function update(req, res) {
  return sendSuccess(res, {
    message: 'Defect updated',
    data: await service.updateDefect(req.auth, req.params.projectId, req.params.defectId, req.body),
  })
}

export async function addComment(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Comment added',
    data: await service.addComment(req.auth, req.params.projectId, req.params.defectId, req.body.body),
  })
}

export async function reopen(req, res) {
  return sendSuccess(res, {
    message: 'Defect reopened',
    data: await service.reopenDefect(req.auth, req.params.projectId, req.params.defectId, req.body?.note),
  })
}

export async function retest(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Retest run created',
    data: await service.retest(req.auth, req.params.projectId, req.params.defectId),
  })
}

export async function history(req, res) {
  const { items, meta } = await service.defectHistory(req.auth, req.params.projectId, req.params.defectId, {
    ...req.query,
    ...pageOf(req.query),
  })
  return sendSuccess(res, { data: { items, meta } })
}