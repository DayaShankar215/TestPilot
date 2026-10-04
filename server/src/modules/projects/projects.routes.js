import { Router } from 'express'
import * as controller from './projects.controller.js'
import * as schemas from './projects.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

export const projectsRouter = Router()

projectsRouter.use(authenticate)

projectsRouter.get('/', validate({ query: schemas.projectListQuery }), asyncHandler(controller.list))
projectsRouter.post(
  '/',
  requireCsrf,
  validate({ body: schemas.createProjectSchema }),
  asyncHandler(controller.create),
)

projectsRouter.get(
  '/:projectId',
  validate({ params: schemas.projectIdParam }),
  asyncHandler(controller.get),
)
projectsRouter.patch(
  '/:projectId',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.updateProjectSchema }),
  asyncHandler(controller.update),
)
projectsRouter.delete(
  '/:projectId',
  requireCsrf,
  validate({ params: schemas.projectIdParam }),
  asyncHandler(controller.archive),
)

projectsRouter.get(
  '/:projectId/members',
  validate({ params: schemas.projectIdParam, query: schemas.listQuerySchema }),
  asyncHandler(controller.listMembers),
)
projectsRouter.post(
  '/:projectId/members',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.projectMemberSchema }),
  asyncHandler(controller.addMember),
)

projectsRouter.get(
  '/:projectId/dashboard',
  validate({ params: schemas.projectIdParam, query: schemas.dashboardQuery }),
  asyncHandler(controller.dashboard),
)
projectsRouter.get(
  '/:projectId/activity',
  validate({ params: schemas.projectIdParam, query: schemas.activityQuery }),
  asyncHandler(controller.activity),
)