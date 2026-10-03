import * as authService from '../../services/auth.service.js'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { attachSessionCookies, clearSessionCookies, revokeSession } from '../../services/sessions.js'
import { sendSuccess } from '../../utils/asyncHandler.js'

export async function register(req, res) {
  const { user, session } = await authService.register(req.body, req)
  attachSessionCookies(res, session)
  return sendSuccess(res, {
    status: 201,
    message: 'Account created',
    data: { user: { id: user.id, name: user.name, email: user.email }, workspaceId: user.workspaceId, csrfToken: session.csrfToken },
  })
}

export async function login(req, res) {
  const { user, session } = await authService.login(req.body, req)
  attachSessionCookies(res, session)
  return sendSuccess(res, {
    message: 'Signed in',
    data: { user: { id: user.id, name: user.name, email: user.email }, csrfToken: session.csrfToken },
  })
}

export async function logout(req, res) {
  await authService.logout(req.auth.sessionId)
  clearSessionCookies(res)
  return sendSuccess(res, { message: 'Signed out', data: { revokedAt: new Date().toISOString() } })
}

export async function me(req, res) {
  return sendSuccess(res, { data: await authService.currentUser(req.auth) })
}

/** Session heartbeat: rotates the cookie only when it is close to expiring. */
export async function refresh(req, res) {
  const { refreshed, session } = await authService.refreshSession(req.auth, req)
  if (refreshed) attachSessionCookies(res, session)
  return sendSuccess(res, {
    message: refreshed ? 'Session refreshed' : 'Session still valid',
    data: { refreshed, expiresInSeconds: env.SESSION_TTL_HOURS * 3600 },
  })
}

export async function changePassword(req, res) {
  const { session } = await authService.changePassword(req.auth, req.body, req)
  attachSessionCookies(res, session)
  return sendSuccess(res, { message: 'Password updated', data: { changedAt: new Date().toISOString() } })
}

export async function forgotPassword(req, res) {
  const { resetToken } = await authService.requestPasswordReset(req.body.email)
  return sendSuccess(res, {
    message: 'If that email is registered, a reset link has been sent.',
    // Returned only outside production so integration tests can complete the flow.
    data: env.isProduction ? {} : { resetToken },
  })
}

export async function resetPassword(req, res) {
  await authService.resetPassword(req.body)
  return sendSuccess(res, { message: 'Password reset. You can sign in now.', data: { resetAt: new Date().toISOString() } })
}

export async function listSessions(req, res) {
  const sessions = await prisma.session.findMany({
    where: { userId: req.auth.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, ipAddress: true, lastSeenAt: true, createdAt: true },
    orderBy: { lastSeenAt: 'desc' },
  })

  return sendSuccess(res, {
    data: sessions.map((session) => ({ ...session, current: session.id === req.auth.sessionId })),
  })
}

export async function revokeSessionById(req, res) {
  const owns = await prisma.session.findFirst({
    where: { id: req.params.sessionId, userId: req.auth.user.id },
    select: { id: true },
  })
  if (!owns) {
    return sendSuccess(res, { message: 'Session not found', data: { revoked: false } })
  }

  await revokeSession(owns.id)
  if (owns.id === req.auth.sessionId) clearSessionCookies(res)
  return sendSuccess(res, { message: 'Session revoked', data: { revoked: true } })
}