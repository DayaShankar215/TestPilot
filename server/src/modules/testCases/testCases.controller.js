import * as service from './testCases.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

function pageOf(query) {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export async function list(req, res) {
  const { items, meta } = await service.listTestCases(req.auth, req.params.projectId, { ...req.query, ...pageOf(req.query) })
  return sendSuccess(res, { data: { items, meta } })
}

export async function get(req, res) {
  return sendSuccess(res, { data: await service.getTestCase(req.auth, req.params.projectId, req.params.testCaseId) })
}

export async function create(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Test case created successfully',
    data: await service.createTestCase(req.auth, req.params.projectId, req.body),
  })
}

export async function update(req, res) {
  return sendSuccess(res, {
    message: 'Test case updated',
    data: await service.updateTestCase(req.auth, req.params.projectId, req.params.testCaseId, req.body),
  })
}

export async function deprecate(req, res) {
  return sendSuccess(res, {
    message: 'Test case deprecated',
    data: await service.deprecateTestCase(req.auth, req.params.projectId, req.params.testCaseId),
  })
}

export async function clone(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Test case cloned',
    data: await service.cloneTestCase(req.auth, req.params.projectId, req.params.testCaseId, req.body ?? {}),
  })
}

export async function setRequirements(req, res) {
  return sendSuccess(res, {
    message: 'Linked requirements updated',
    data: await service.setTestCaseRequirements(req.auth, req.params.projectId, req.params.testCaseId, req.body.requirementIds),
  })
}

export async function history(req, res) {
  const { items, meta } = await service.testCaseHistory(req.auth, req.params.projectId, req.params.testCaseId, {
    ...req.query,
    ...pageOf(req.query),
  })
  return sendSuccess(res, { data: { items, meta } })
}