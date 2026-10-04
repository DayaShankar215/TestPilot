import * as service from './automation.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function listJobs(req, res) {
  const { items, meta } = await service.listJobs(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function getJob(req, res) {
  return sendSuccess(res, { data: await service.getJob(req.auth, req.params.projectId, req.params.jobId) })
}

export async function createJob(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Automation job created',
    data: await service.createJob(req.auth, req.params.projectId, req.body),
  })
}

export async function updateJob(req, res) {
  return sendSuccess(res, {
    message: 'Automation job updated',
    data: await service.updateJob(req.auth, req.params.projectId, req.params.jobId, req.body),
  })
}

export async function queueRun(req, res) {
  const { job } = await service.queueRun(req.auth, req.params.projectId, req.params.jobId, req.body ?? {})
  return sendSuccess(res, { status: 202, message: 'Automation run queued', data: job })
}

export async function rerunJob(req, res) {
  const { job } = await service.rerunJob(req.auth, req.params.projectId, req.params.jobId)
  return sendSuccess(res, { status: 202, message: 'Rerun queued', data: job })
}

export async function cancelJob(req, res) {
  return sendSuccess(res, { message: 'Automation job cancelled', data: await service.cancelJob(req.auth, req.params.projectId, req.params.jobId) })
}

export async function listArtifacts(req, res) {
  const { items, meta } = await service.listArtifacts(req.auth, req.params.projectId, req.params.jobId, {
    ...req.query,
    ...pageOf(req.query),
  })
  return sendSuccess(res, { data: { items, meta } })
}

export async function uploadArtifact(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Artifact stored',
    data: await service.uploadArtifact(req.auth, req.params.jobId, req.query, req.file),
  })
}