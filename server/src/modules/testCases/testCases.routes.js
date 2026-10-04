import { Router } from 'express'
import * as controller from './testCases.controller.js'
import * as schemas from './testCases.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { listQuery } from '../../schemas/common.js'

/** Test cases are project-scoped in both the contract and the client. */
export const testCasesRouter = Router()

testCasesRouter.use(authenticate)

testCasesRouter.get(
  '/',
  validate({ params: schemas.projectIdParam, query: schemas.testCaseListQuery }),
  asyncHandler(controller.list),
)
testCasesRouter.post(
  '/',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.createTestCaseSchema }),
  asyncHandler(controller.create),
)

testCasesRouter.get(
  '/:testCaseId',
  validate({ params: schemas.testCaseParams }),
  asyncHandler(controller.get),
)
testCasesRouter.patch(
  '/:testCaseId',
  requireCsrf,
  validate({ params: schemas.testCaseParams, body: schemas.updateTestCaseSchema }),
  asyncHandler(controller.update),
)
testCasesRouter.delete(
  '/:testCaseId',
  requireCsrf,
  validate({ params: schemas.testCaseParams }),
  asyncHandler(controller.deprecate),
)

testCasesRouter.post(
  '/:testCaseId/clone',
  requireCsrf,
  validate({ params: schemas.testCaseParams, body: schemas.cloneTestCaseSchema }),
  asyncHandler(controller.clone),
)
testCasesRouter.put(
  '/:testCaseId/requirements',
  requireCsrf,
  validate({ params: schemas.testCaseParams, body: schemas.setRequirementsSchema }),
  asyncHandler(controller.setRequirements),
)
testCasesRouter.get(
  '/:testCaseId/history',
  validate({ params: schemas.testCaseParams, query: listQuery }),
  asyncHandler(controller.history),
)