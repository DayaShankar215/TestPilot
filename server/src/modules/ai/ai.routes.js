import { Router } from 'express'
import * as controller from './ai.controller.js'
import * as schemas from './ai.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

/** `POST /api/v1/ai/test-case-generation` — not project-scoped. */
export const aiRouter = Router()

aiRouter.use(authenticate)

aiRouter.post(
  '/test-case-generation',
  requireCsrf,
  validate({ body: schemas.generationRequestSchema }),
  asyncHandler(controller.generate),
)