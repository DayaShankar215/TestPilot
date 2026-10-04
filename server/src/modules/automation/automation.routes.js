import { Router } from 'express'
import multer from 'multer'
import * as controller from './automation.controller.js'
import * as schemas from './automation.schemas.js'
import { validate } from '../../middleware/validate.js'
import { authenticate, requireCsrf } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { idParam } from '../../schemas/common.js'
import { z } from 'zod'
import { ApiError } from '../../utils/apiError.js'

const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ARTIFACT_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'application/zip',
      'application/json',
      'text/html',
      'text/csv',
    ]
    if (!allowed.includes(file.mimetype)) {
      return callback(ApiError.badRequest('That file type cannot be stored as an artifact.'))
    }
    return callback(null, true)
  },
})

const jobOnlyParams = z.object({ jobId: idParam('jobId') })

/** `/api/v1/projects/:projectId/automation` */
export const automationRouter = Router()

automationRouter.use(authenticate)

automationRouter.get(
  '/jobs',
  validate({ params: schemas.projectIdParam, query: schemas.jobListQuery }),
  asyncHandler(controller.listJobs),
)
automationRouter.post(
  '/jobs',
  requireCsrf,
  validate({ params: schemas.projectIdParam, body: schemas.createJobSchema }),
  asyncHandler(controller.createJob),
)

automationRouter.get(
  '/jobs/:jobId',
  validate({ params: schemas.jobParams }),
  asyncHandler(controller.getJob),
)
automationRouter.patch(
  '/jobs/:jobId',
  requireCsrf,
  validate({ params: schemas.jobParams, body: schemas.updateJobSchema }),
  asyncHandler(controller.updateJob),
)
automationRouter.post(
  '/jobs/:jobId/runs',
  requireCsrf,
  validate({ params: schemas.jobParams, body: schemas.queueRunSchema }),
  asyncHandler(controller.queueRun),
)
automationRouter.post(
  '/jobs/:jobId/rerun',
  requireCsrf,
  validate({ params: schemas.jobParams }),
  asyncHandler(controller.rerunJob),
)
automationRouter.post(
  '/jobs/:jobId/cancel',
  requireCsrf,
  validate({ params: schemas.jobParams }),
  asyncHandler(controller.cancelJob),
)
automationRouter.get(
  '/jobs/:jobId/artifacts',
  validate({ params: schemas.jobParams, query: schemas.artifactQuery }),
  asyncHandler(controller.listArtifacts),
)

/** `POST /api/v1/automation/jobs/:jobId/artifacts` — not project-scoped. */
export const artifactRouter = Router()

artifactRouter.use(authenticate)

artifactRouter.post(
  '/jobs/:jobId/artifacts',
  requireCsrf,
  upload.single('file'),
  validate({ params: jobOnlyParams, query: schemas.uploadQuerySchema }),
  asyncHandler(controller.uploadArtifact),
)