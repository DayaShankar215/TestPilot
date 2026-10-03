import { Router } from 'express'
import * as controller from './auth.controller.js'
import * as schemas from './auth.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { z } from 'zod'

export const authRouter = Router()

const sessionParams = z.object({ sessionId: z.string().min(1) })

authRouter.post('/register', validate({ body: schemas.registerSchema }), asyncHandler(controller.register))
authRouter.post('/login', validate({ body: schemas.loginSchema }), asyncHandler(controller.login))

authRouter.get('/me', authenticate, asyncHandler(controller.me))
authRouter.post('/refresh', authenticate, requireCsrf, asyncHandler(controller.refresh))
authRouter.post('/logout', authenticate, requireCsrf, asyncHandler(controller.logout))
authRouter.post(
  '/change-password',
  authenticate,
  requireCsrf,
  validate({ body: schemas.changePasswordSchema }),
  asyncHandler(controller.changePassword),
)
authRouter.post(
  '/forgot-password',
  validate({ body: schemas.forgotPasswordSchema }),
  asyncHandler(controller.forgotPassword),
)
authRouter.post('/reset-password', validate({ body: schemas.resetPasswordSchema }), asyncHandler(controller.resetPassword))

authRouter.get('/sessions', authenticate, asyncHandler(controller.listSessions))
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  requireCsrf,
  validate({ params: sessionParams }),
  asyncHandler(controller.revokeSessionById),
)