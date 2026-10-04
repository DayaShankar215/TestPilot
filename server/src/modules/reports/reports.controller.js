import * as service from './reports.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function activity(req, res) {
  const { items, meta } = await service.listActivity(req.auth, req.params.projectId, {
    ...req.query,
    ...pageOf(req.query),
  })
  return sendSuccess(res, { data: { items, meta } })
}

export async function dashboard(req, res) {
  return sendSuccess(res, { data: await service.projectDashboard(req.auth, req.params.projectId, req.query) })
}

export async function qualityTrend(req, res) {
  return sendSuccess(res, { data: await service.qualityTrend(req.auth, req.params.projectId, req.query) })
}

export async function coverage(req, res) {
  return sendSuccess(res, { data: await service.coverageReport(req.auth, req.params.projectId) })
}

export async function execution(req, res) {
  return sendSuccess(res, { data: await service.executionReport(req.auth, req.params.projectId, req.query) })
}

export async function defects(req, res) {
  return sendSuccess(res, { data: await service.defectReport(req.auth, req.params.projectId) })
}

export async function releaseReadiness(req, res) {
  return sendSuccess(res, { data: await service.releaseReadiness(req.auth, req.params.projectId, req.query) })
}