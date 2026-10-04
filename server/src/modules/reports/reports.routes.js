import { Router } from 'express'
import * as controller from './reports.controller.js'
import * as schemas from './reports.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

/** `/projects/:projectId` reporting, dashboard, and activity. */
export const reportsRouter = Router({ mergeParams: true })

reportsRouter.use(authenticate)

reportsRouter.get(
  '/dashboard',
  validate({ params: schemas.projectIdParam, query: schemas.reportQuery }),
  asyncHandler(controller.dashboard),
)
reportsRouter.get(
  '/activity',
  validate({ params: schemas.projectIdParam, query: schemas.activityQuery }),
  asyncHandler(controller.activity),
)
reportsRouter.get(
  '/reports/quality-trend',
  validate({ params: schemas.projectIdParam, query: schemas.reportQuery }),
  asyncHandler(controller.qualityTrend),
)
reportsRouter.get(
  '/reports/coverage',
  validate({ params: schemas.projectIdParam, query: schemas.reportQuery }),
  asyncHandler(controller.coverage),
)
reportsRouter.get(
  '/reports/execution',
  validate({ params: schemas.projectIdParam, query: schemas.reportQuery }),
  asyncHandler(controller.execution),
)
reportsRouter.get(
  '/reports/defects',
  validate({ params: schemas.projectIdParam, query: schemas.reportQuery }),
  asyncHandler(controller.defects),
)
reportsRouter.get(
  '/reports/release-readiness',
  validate({ params: schemas.projectIdParam, query: schemas.reportQuery }),
  asyncHandler(controller.releaseReadiness),
)