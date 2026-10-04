import { Router } from 'express'
import * as controller from './defects.controller.js'
import * as schemas from './defects.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { listQuery } from '../../schemas/common.js'

/** `/api/v1/projects/:projectId/defects` */
export const defectsRouter = Router({ mergeParams: true })

defectsRouter.use(authenticate)

defectsRouter.get(
  '/',
  validate({ params: schemas.projectIdParam, query: schemas.defectListQuery }),
  asyncHandler(controller.list),
)
defectsRouter.post(
  '/',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.createDefectSchema }),
  asyncHandler(controller.create),
)

defectsRouter.get(
  '/:defectId',
  validate({ params: schemas.defectParams }),
  asyncHandler(controller.get),
)
defectsRouter.patch(
  '/:defectId',
  requireCsrf,
  validate({ params: schemas.defectParams, body: schemas.updateDefectSchema }),
  asyncHandler(controller.update),
)
defectsRouter.post(
  '/:defectId/comments',
  requireCsrf,
  validate({ params: schemas.defectParams, body: schemas.commentSchema }),
  asyncHandler(controller.addComment),
)
defectsRouter.post(
  '/:defectId/reopen',
  requireCsrf,
  validate({ params: schemas.defectParams, body: schemas.reopenSchema }),
  asyncHandler(controller.reopen),
)
defectsRouter.post(
  '/:defectId/retest',
  requireCsrf,
  validate({ params: schemas.defectParams }),
  asyncHandler(controller.retest),
)
defectsRouter.get(
  '/:defectId/history',
  validate({ params: schemas.defectParams, query: listQuery }),
  asyncHandler(controller.history),
)