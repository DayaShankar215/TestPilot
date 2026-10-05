import { Router } from 'express'
import * as controller from './users.controller.js'
import * as schemas from './users.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiError } from '../../utils/apiError.js'

/**
 * The API contract addresses the caller's own workspace as `/workspaces/current`
 * rather than by id, so the literal segment carries no `:workspaceId` param.
 * Resolving it here lets every service and controller keep working against a
 * concrete workspace id.
 *
 * Must run *after* any `validate({ params })` on the same route, because validate
 * replaces `req.params` with the parsed schema output.
 */
function resolveCurrentWorkspace(req, _res, next) {
  if (req.params.workspaceId && req.params.workspaceId !== 'current') {
    return next()
  }

  const workspaceId = req.auth?.primaryWorkspaceId
  if (!workspaceId) {
    return next(
      new ApiError({ status: 404, code: 'WORKSPACE_NOT_FOUND', message: 'No workspace is associated with this account.' }),
    )
  }

  req.params.workspaceId = workspaceId
  return next()
}

export const usersRouter = Router()

usersRouter.use(authenticate)

usersRouter.get('/me', asyncHandler(controller.getProfile))
usersRouter.patch('/me', requireCsrf, validate({ body: schemas.profileSchema }), asyncHandler(controller.updateProfile))
usersRouter.post(
  '/me/password',
  requireCsrf,
  validate({ body: schemas.changePasswordSchema }),
  asyncHandler(controller.changePassword),
)

usersRouter.get('/me/preferences', asyncHandler(controller.getPreferences))
usersRouter.put(
  '/me/preferences',
  requireCsrf,
  validate({ body: schemas.preferencesUpdateSchema }),
  asyncHandler(controller.updatePreferences),
)

usersRouter.get('/', validate({ query: schemas.userSearchSchema }), asyncHandler(controller.searchUsers))
usersRouter.post('/:userId/deactivate', requireCsrf, asyncHandler(controller.deactivateUser))

export const workspacesRouter = Router()

workspacesRouter.use(authenticate)

workspacesRouter.get('/', asyncHandler(controller.listWorkspaces))
workspacesRouter.get('/current', resolveCurrentWorkspace, asyncHandler(controller.getCurrentWorkspace))
workspacesRouter.patch(
  '/current',
  resolveCurrentWorkspace,
  requireCsrf,
  validate({ body: schemas.workspaceSettingsSchema }),
  asyncHandler(controller.updateCurrentWorkspace),
)

workspacesRouter.get(
  '/current/members',
  resolveCurrentWorkspace,
  validate({ query: schemas.memberListSchema }),
  asyncHandler(controller.listCurrentMembers),
)
workspacesRouter.post(
  '/current/members',
  resolveCurrentWorkspace,
  requireCsrf,
  validate({ body: schemas.addMemberSchema }),
  asyncHandler(controller.addCurrentMember),
)
workspacesRouter.patch(
  '/current/members/:memberId',
  resolveCurrentWorkspace,
  requireCsrf,
  validate({ params: schemas.memberParamsSchema, body: schemas.updateMemberSchema }),
  asyncHandler(controller.updateCurrentMember),
)
workspacesRouter.delete(
  '/current/members/:memberId',
  resolveCurrentWorkspace,
  requireCsrf,
  validate({ params: schemas.memberParamsSchema }),
  asyncHandler(controller.removeCurrentMember),
)
