import bcrypt from 'bcrypt'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'
import { randomToken, sha256 } from '../utils/ids.js'
import { createSession, revokeAllUserSessions, revokeSession } from './sessions.js'

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  jobTitle: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS)
}

/**
 * Creating a user always provisions a personal workspace with the caller as its
 * owner, matching the "every user gets their own tenant" rule in the spec.
 */
export async function register({ name, email, password, workspaceName }, req) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw ApiError.conflict('An account with this email already exists.')

  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, passwordHash },
      select: PUBLIC_USER_SELECT,
    })

    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName ?? `${name}'s Workspace`,
        slug: uniqueSlug(name),
        ownerId: created.id,
        members: {
          create: { userId: created.id, role: 'owner' },
        },
      },
    })

    await tx.preference.create({
      data: {
        userId: created.id,
        theme: 'system',
        density: 'comfortable',
        defaultPageSize: 25,
        locale: 'en-IN',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        notificationFrequency: 'daily',
      },
    })

    return { ...created, workspaceId: workspace.id }
  })

  const session = await createSession({ user: { id: user.id }, req })
  return { user, session }
}

export async function login({ email, password }, req) {
  const user = await prisma.user.findUnique({ where: { email } })

  // Always run a comparison so timing does not reveal whether the email exists.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi'
  const valid = await bcrypt.compare(password, hash)

  if (!user || !valid) throw ApiError.unauthorized('Email or password is incorrect.')
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.')

  const session = await createSession({ user, req })
  return { user, session }
}

export async function logout(sessionId) {
  await revokeSession(sessionId)
}

export async function currentUser(auth) {
  const [memberships, preferences] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: auth.user.id },
      include: { workspace: { select: { id: true, name: true, slug: true, plan: true } } },
    }),
    prisma.preference.findUnique({ where: { userId: auth.user.id } }),
  ])

  return {
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      jobTitle: auth.user.jobTitle,
      avatarUrl: auth.user.avatarUrl,
      createdAt: auth.user.createdAt,
    },
    preferences: preferences ?? null,
    memberships: memberships.map((membership) => ({
      workspaceId: membership.workspaceId,
      role: membership.role,
      workspace: membership.workspace,
    })),
    csrfToken: auth.csrfToken,
  }
}

/**
 * Issues a fresh session only when the current one is past its idle window,
 * so a page reload does not rotate the cookie unnecessarily.
 */
export async function refreshSession(auth, req) {
  const session = await prisma.session.findUnique({ where: { id: auth.sessionId } })
  if (!session || session.revokedAt) throw ApiError.unauthorized('Your session is no longer valid.')

  const idleWindowMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000
  const needsRefresh = Date.now() - session.lastSeenAt.getTime() > idleWindowMs / 2
  if (!needsRefresh) return { refreshed: false, session: null }

  const created = await createSession({ user: auth.user, req })
  await revokeSession(auth.sessionId)
  return { refreshed: true, session: created }
}

export async function changePassword(auth, { currentPassword, newPassword }, req) {
  const user = await prisma.user.findUnique({ where: { id: auth.user.id } })
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw ApiError.validation([{ field: 'currentPassword', message: 'Current password is incorrect' }])

  const passwordHash = await hashPassword(newPassword)

  // Changing a password invalidates every other session, then keeps this one.
  await revokeAllUserSessions(auth.user.id)
  const created = await createSession({ user, req })

  return { session: created }
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } })
  // Always return success: revealing whether the email exists is an enumeration leak.
  if (!user) return { sent: true, resetToken: null }

  const token = randomToken()
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  })

  return { sent: true, resetToken: token, user }
}

export async function resetPassword({ token, password }) {
  const reset = await prisma.passwordResetToken.findFirst({
    where: { token: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
  })
  if (!reset) throw ApiError.badRequest('This reset link is invalid or has expired.')

  const passwordHash = await hashPassword(password)

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
}

function uniqueSlug(name) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`
}

export { PUBLIC_USER_SELECT }