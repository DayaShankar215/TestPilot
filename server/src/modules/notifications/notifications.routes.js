import { Router } from 'express'
import * as controller from './notifications.controller.js'
import * as schemas from './notifications.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

/** Notifications are per-user, so these are not project-scoped. */
export const notificationsRouter = Router()

notificationsRouter.use(authenticate)

notificationsRouter.get('/', validate({ query: schemas.notificationQuery }), asyncHandler(controller.list))
notificationsRouter.post('/read-all', requireCsrf, asyncHandler(controller.markAllRead))
notificationsRouter.patch(
  '/:notificationId',
  requireCsrf,
  validate({ params: schemas.notificationParams, body: schemas.updateSchema }),
  asyncHandler(controller.markRead),
)