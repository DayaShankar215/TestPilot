import * as service from './regression.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const { items, meta } = await service.listPlans(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function get(req, res) {
  return sendSuccess(res, { data: await service.getPlan(req.auth, req.params.projectId, req.params.planId) })
}

export async function create(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Regression suite saved',
    data: await service.createPlan(req.auth, req.params.projectId, req.body),
  })
}