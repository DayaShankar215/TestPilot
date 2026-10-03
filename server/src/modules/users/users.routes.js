import { Router } from 'express'
import * as controller from './users.controller.js'
import * as schemas from './users.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

export const usersRouter = Router()

usersRouter.use(authenticate)

usersRouter.get('/me', asyncHandler(controller.getProfile))
usersRouter.patch('/me', requireCsrf, validate({ body: schemas.profileSchema }), asyncHandler(controller.updateProfile))

usersRouter.get('/preferences', asyncHandler(controller.getPreferences))
usersRouter.patch(
  '/preferences',
  requireCsrf,
  validate({ body: schemas.preferencesUpdateSchema }),
  asyncHandler(controller.updatePreferences),
)

usersRouter.get('/', validate({ query: schemas.userSearchSchema }), asyncHandler(controller.searchUsers))
usersRouter.post('/:userId/deactivate', requireCsrf, asyncHandler(controller.deactivateUser))

export const workspacesRouter = Router()

workspacesRouter.use(authenticate)

workspacesRouter.get('/', asyncHandler(controller.listWorkspaces))
workspacesRouter.get('/:workspaceId', validate({ params: schemas.workspaceIdParamSchema }), asyncHandler(controller.getWorkspace))
workspacesRouter.patch(
  '/:workspaceId',
  requireCsrf,
  validate({ params: schemas.workspaceIdParamSchema, body: schemas.workspaceSettingsSchema }),
  asyncHandler(controller.updateWorkspaceSettings),
)

workspacesRouter.get(
  '/:workspaceId/members',
  validate({ params: schemas.workspaceIdParamSchema, query: schemas.memberListSchema }),
  asyncHandler(controller.listMembers),
)
workspacesRouter.post(
  '/:workspaceId/members',
  requireCsrf,
  validate({ params: schemas.workspaceIdParamSchema, body: schemas.addMemberSchema }),
  asyncHandler(controller.addMember),
)
workspacesRouter.patch(
  '/:workspaceId/members/:memberId',
  requireCsrf,
  validate({ params: schemas.memberParamsSchema, body: schemas.updateMemberSchema }),
  asyncHandler(controller.updateMember),
)
workspacesRouter.delete(
  '/:workspaceId/members/:memberId',
  requireCsrf,
  validate({ params: schemas.memberParamsSchema }),
  asyncHandler(controller.removeMember),
)