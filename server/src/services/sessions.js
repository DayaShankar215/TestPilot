import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { randomToken, sha256 } from '../utils/ids.js'

/**
 * Server-managed sessions delivered as an opaque HttpOnly cookie. Nothing
 * readable by JavaScript is issued; the CSRF cookie is a separate,
 * script-readable value used for the double-submit check.
 */
export function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: maxAgeMs,
  }
}

export const csrfCookieOptions = {
  httpOnly: false,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  path: '/',
  maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
}

export async function createSession({ user, req }) {
  const token = randomToken()
  const csrfToken = randomToken(18)
  const now = new Date()
  const absoluteExpiry = new Date(now.getTime() + env.SESSION_ABSOLUTE_TTL_HOURS * 60 * 60 * 1000)
  const expiresAt = new Date(
    Math.min(now.getTime() + env.SESSION_TTL_HOURS * 60 * 60 * 1000, absoluteExpiry.getTime()),
  )

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: sha256(token),
      csrfToken,
      userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
      ipAddress: req.ip ?? null,
      expiresAt,
    },
  })

  return { session, token, csrfToken, absoluteExpiry }
}

export function attachSessionCookies(res, { token, csrfToken }, maxAgeMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000) {
  res.cookie(env.SESSION_COOKIE_NAME, token, cookieOptions(maxAgeMs))
  res.cookie(env.CSRF_COOKIE_NAME, csrfToken, { ...csrfCookieOptions, maxAge: maxAgeMs })
}

export function clearSessionCookies(res) {
  res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' })
  res.clearCookie(env.CSRF_COOKIE_NAME, { path: '/' })
}

export async function revokeSession(sessionId) {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeAllUserSessions(userId) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function purgeExpiredSessions() {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return count
}