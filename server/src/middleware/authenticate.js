import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'

const SESSION_TOUCH_INTERVAL_MS = 60_000

function readCookie(req, name) {
  const cookies = req.cookies ?? {}
  return cookies[name]
}

/**
 * Resolves the caller's session into `req.auth`. Sessions are server-managed
 * rows; the cookie only carries an opaque token whose SHA-256 hash is stored.
 */
export async function authenticate(req, _res, next) {
  const token = readCookie(req, env.SESSION_COOKIE_NAME)
  if (!token) {
    next(ApiError.unauthorized('You are not signed in'))
    return
  }

  const { sha256 } = await import('../utils/ids.js')
  const session = await prisma.session.findUnique({
    where: { token: sha256(token) },
    include: {
      user: {
        include: {
          workspaceMemberships: {
            include: { workspace: true },
          },
        },
      },
    },
  })

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    next(ApiError.unauthorized('Your session has expired. Please sign in again.'))
    return
  }

  const memberships = session.user.workspaceMemberships.map((membership) => ({
    workspaceId: membership.workspaceId,
    role: membership.role,
  }))

  req.auth = {
    sessionId: session.id,
    csrfToken: session.csrfToken,
    user: session.user,
    memberships,
    workspaceIds: memberships.map((membership) => membership.workspaceId),
    primaryWorkspaceId: memberships[0]?.workspaceId ?? null,
  }

  const lastSeen = session.lastSeenAt.getTime()
  if (Date.now() - lastSeen > SESSION_TOUCH_INTERVAL_MS) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {})
  }

  next()
}

/** Attaches `req.auth` when a valid session exists, but never rejects. */
export async function optionalAuthenticate(req, res, next) {
  try {
    await authenticate(req, res, (error) => {
      if (error) throw error
    })
  } catch {
    req.auth = null
  }
  next()
}

/**
 * Double-submit CSRF check for state-changing requests. Requests without an
 * ambient session (login/register/reset) are skipped by design.
 */
export function requireCsrf(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }

  const cookieToken = readCookie(req, env.CSRF_COOKIE_NAME)
  const headerToken = req.get('x-csrf-token')

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new ApiError(403, 'CSRF_TOKEN_MISMATCH', 'Missing or invalid CSRF token'))
    return
  }

  next()
}