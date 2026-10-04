import * as service from './ai.service.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

export async function generate(req, res) {
  return sendSuccess(res, {
    status: 201,
    message: 'Suggestions generated. Nothing is saved until you approve it.',
    data: await service.generateTestCases(req.auth, req.body),
  })
}