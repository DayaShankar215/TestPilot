import { Router } from 'express'
import * as controller from './testRuns.controller.js'
import * as schemas from './testRuns.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { listQuery, resultStatusEnum } from '../../schemas/common.js'

/** `/projects/:projectId/test-runs` */
export const testRunsRouter = Router()

testRunsRouter.use(authenticate)

testRunsRouter.get(
  '/',
  validate({ params: schemas.projectIdParam, query: schemas.runListQuery }),
  asyncHandler(controller.list),
)
testRunsRouter.post(
  '/',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.createRunSchema }),
  asyncHandler(controller.create),
)

testRunsRouter.get(
  '/:runId',
  validate({ params: schemas.runParams }),
  asyncHandler(controller.get),
)
testRunsRouter.patch(
  '/:runId',
  requireCsrf,
  validate({ params: schemas.runParams, body: schemas.updateRunSchema }),
  asyncHandler(controller.update),
)

testRunsRouter.post(
  '/:runId/results',
  requireCsrf,
  validate({ params: schemas.runParams, body: schemas.recordResultSchema }),
  asyncHandler(controller.recordResult),
)
testRunsRouter.get(
  '/:runId/results',
  validate({ params: schemas.runParams, query: listQuery.extend({ status: resultStatusEnum.optional() }) }),
  asyncHandler(controller.listResults),
)

/** `/test-results/:resultId` — resolves the project from the result's run. */
export const testResultsRouter = Router()

testResultsRouter.use(authenticate)

testResultsRouter.patch(
  '/:resultId',
  requireCsrf,
  validate({ params: schemas.resultParams, body: schemas.updateResultSchema }),
  asyncHandler(controller.updateResult),
)