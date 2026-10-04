import { Router } from 'express'
import * as controller from './regression.controller.js'
import * as schemas from './regression.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

/** `/api/v1/projects/:projectId/regression` */
export const regressionRouter = Router()

regressionRouter.use(authenticate)

regressionRouter.get(
  '/plans',
  validate({ params: schemas.projectIdParam, query: schemas.planListQuery }),
  asyncHandler(controller.list),
)
regressionRouter.get(
  '/plans/:planId',
  validate({ params: schemas.planParams }),
  asyncHandler(controller.get),
)
regressionRouter.post(
  '/plan',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.createPlanSchema }),
  asyncHandler(controller.create),
)