import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { ApiError } from '../../utils/apiError.js'
import { randomToken } from '../../utils/ids.js'
import { hasWorkspaceRole } from '../../middleware/authorize.js'
import { PUBLIC_USER_SELECT } from '../../services/auth.service.js'
import { revokeAllUserSessions } from '../../services/sessions.js'

const MAX_OWNERS = 5

export async function getPreferences(auth) {
  const preferences = await prisma.userPreference.findUnique({ where: { userId: auth.user.id } })
  return preferences ?? { userId: auth.user.id, theme: 'system' }
}

export async function updatePreferences(auth, values) {
  return prisma.userPreference.upsert({
    where: { userId: auth.user.id },
    create: { userId: auth.user.id, ...values },
    update: values,
  })
}

export async function updateProfile(auth, { name, title, avatarUrl, timezone }) {
  return prisma.user.update({
    where: { id: auth.user.id },
    data: { name, title, avatarUrl, timezone },
    select: PUBLIC_USER_SELECT,
  })
}

/**
 * Password change for the signed-in user. Every other session is revoked so a
 * stolen cookie cannot survive a credential rotation.
 */
export async function changePassword(auth, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: auth.user.id } })
  if (!user) throw ApiError.notFound('User not found.')
  if (!user.passwordHash) {
    throw ApiError.badRequest('This account signs in with SSO, so it has no password to change.')
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.unauthorized('Current password is incorrect.')
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw ApiError.badRequest('New password must be different from the current password.')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, env.bcryptRounds) },
  })
  await revokeAllUserSessions(user.id)
}

/** Directory search inside workspaces the caller belongs to. */
export async function searchUsers(auth, { search, workspaceId, skip, take }) {  const scopedWorkspaceIds = workspaceId ? [workspaceId] : auth.workspaceIds
  if (workspaceId && !auth.workspaceIds.includes(workspaceId)) {
    throw ApiError.notFound('Workspace not found.')
  }

  const where = {
    isActive: true,
    workspaceMemberships: { some: { workspaceId: { in: scopedWorkspaceIds } } },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...PUBLIC_USER_SELECT, title: true },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ])

  return { items, total }
}

export async function listWorkspaceMembers(auth, workspaceId, { search, skip, take }) {
  // Membership must be proven before any roster data is returned.
  await getWorkspace(auth, workspaceId)

  const where = {
    workspaceId,
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.workspaceMember.findMany({
      where,
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    }),
    prisma.workspaceMember.count({ where }),
  ])

  return { items, total }
}

/**
 * Invites an existing user, or registers a lightweight placeholder account that
 * can complete registration later with the temporary password we return.
 */
export async function addWorkspaceMember(auth, workspaceId, { email, role }) {
  if (!hasWorkspaceRole(auth, workspaceId, 'admin')) {
    throw ApiError.forbidden('Only workspace admins can add members.')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  let user = existing
  let temporaryPassword = null

  if (!user) {
    temporaryPassword = `Tp-${randomToken(6)}-Aa1`
    user = await prisma.user.create({
      data: {
        name: email.split('@')[0],
        email,
        passwordHash: await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS),
      },
      select: PUBLIC_USER_SELECT,
    })
    await prisma.userPreference.create({ data: { userId: user.id } }).catch(() => {})
  }

  const membership = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    create: { workspaceId, userId: user.id, role },
    update: { role },
    select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
  })

  return { membership, user, temporaryPassword, isNewUser: !existing }
}

export async function updateMemberRole(auth, workspaceId, memberId, role) {
  if (!hasWorkspaceRole(auth, workspaceId, 'admin')) {
    throw ApiError.forbidden('Only workspace admins can change member roles.')
  }

  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } })
  if (!member) throw ApiError.notFound('Workspace member not found.')

  const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: 'owner' } })
  if (member.role === 'owner' && role !== 'owner' && ownerCount <= 1) {
    throw ApiError.conflict('A workspace must always have at least one owner.')
  }
  if (role === 'owner' && member.role !== 'owner' && ownerCount >= MAX_OWNERS) {
    throw ApiError.conflict(`A workspace cannot have more than ${MAX_OWNERS} owners.`)
  }

  return prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
  })
}

/**
 * Removing a member also strips their project-level grants, otherwise a
 * demoted user would keep access through project_members.
 */
export async function removeWorkspaceMember(auth, workspaceId, memberId) {
  if (!hasWorkspaceRole(auth, workspaceId, 'admin')) {
    throw ApiError.forbidden('Only workspace admins can remove members.')
  }

  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } })
  if (!member) throw ApiError.notFound('Workspace member not found.')

  const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: 'owner' } })
  if (member.role === 'owner' && ownerCount <= 1) {
    throw ApiError.conflict('The workspace owner cannot be removed.')
  }
  if (member.userId === auth.user.id) {
    throw ApiError.conflict('You cannot remove yourself from the workspace.')
  }

  const projectIds = (
    await prisma.project.findMany({ where: { workspaceId }, select: { id: true } })
  ).map((project) => project.id)

  await prisma.$transaction([
    prisma.projectMember.deleteMany({ where: { userId: member.userId, projectId: { in: projectIds } } }),
    prisma.workspaceMember.delete({ where: { id: memberId } }),
  ])

  return { removedAt: new Date() }
}

export async function listWorkspaces(auth, { skip, take }) {
  const [items, total] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: auth.user.id },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            createdAt: true,
            _count: { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { workspace: { name: 'asc' } },
      skip,
      take,
    }),
    prisma.workspaceMember.count({ where: { userId: auth.user.id } }),
  ])

  return {
    items: items.map((item) => ({ ...item.workspace, role: item.role })),
    total,
  }
}

export async function getWorkspace(auth, workspaceId) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId: auth.user.id } } },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
      _count: { select: { members: true, projects: true } },
    },
  })
  if (!workspace) throw ApiError.notFound('Workspace not found.')
  return workspace
}

export async function renameWorkspace(auth, workspaceId, { name }) {
  if (!hasWorkspaceRole(auth, workspaceId, 'admin')) {
    throw ApiError.forbidden('Only workspace admins can update workspace settings.')
  }
  await prisma.workspace.update({ where: { id: workspaceId }, data: { name } })
  return getWorkspace(auth, workspaceId)
}

/** Deactivates rather than deletes so audit trails and history stay intact. */
export async function deactivateUser(auth, userId) {
  if (auth.user.id === userId) throw ApiError.conflict('You cannot deactivate your own account.')
  const isSelfOrAdmin = await prisma.workspaceMember.findFirst({
    where: {
      userId: auth.user.id,
      workspaceId: { in: auth.workspaceIds },
      role: { in: ['owner', 'admin'] },
    },
    select: { id: true },
  })
  if (!isSelfOrAdmin) throw ApiError.forbidden('Only workspace admins can deactivate members.')

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!target) throw ApiError.notFound('User not found.')

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } })
  await revokeAllUserSessions(userId)

  return { userId, deactivatedAt: new Date() }
}