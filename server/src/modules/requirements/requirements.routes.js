import { Router } from 'express'
import * as controller from './requirements.controller.js'
import * as schemas from './requirements.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { listQuery } from '../../schemas/common.js'

/** `/projects/:projectId/requirements` */
export const projectRequirementsRouter = Router({ mergeParams: true })

projectRequirementsRouter.use(authenticate)

projectRequirementsRouter.get(
  '/',
  validate({ params: schemas.projectIdParam, query: schemas.requirementListQuery }),
  asyncHandler(controller.list),
)
projectRequirementsRouter.post(
  '/',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.createRequirementSchema }),
  asyncHandler(controller.create),
)

/** `/requirements/:requirementId` — not project-scoped, so access is proven via the parent project. */
export const requirementsRouter = Router()

requirementsRouter.use(authenticate)

requirementsRouter.get(
  '/:requirementId',
  validate({ params: schemas.requirementIdParam }),
  asyncHandler(controller.get),
)
requirementsRouter.patch(
  '/:requirementId',
  requireCsrf,
  validate({ params: schemas.requirementIdParam, body: schemas.updateRequirementSchema }),
  asyncHandler(controller.update),
)
requirementsRouter.delete(
  '/:requirementId',
  requireCsrf,
  validate({ params: schemas.requirementIdParam }),
  asyncHandler(controller.archive),
)
requirementsRouter.get(
  '/:requirementId/history',
  validate({ params: schemas.requirementIdParam, query: listQuery }),
  asyncHandler(controller.history),
)
requirementsRouter.get(
  '/:requirementId/test-cases',
  validate({ params: schemas.requirementIdParam, query: listQuery }),
  asyncHandler(controller.testCases),
)