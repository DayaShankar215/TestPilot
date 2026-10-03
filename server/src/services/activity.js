import { prisma } from '../config/database.js'

/**
 * Append-only audit trail. Administrative and evidence-changing actions are
 * recorded here; failures never break the request that triggered them.
 */
export async function recordActivity({ actor, projectId, action, entityType, entityId, summary, metadata }) {
  try {
    await prisma.activityLog.create({
      data: {
        projectId: projectId ?? null,
        userId: actor?.id ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        summary,
        metadata: metadata ?? undefined,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('activity log write failed', error.message)
  }
}

export async function notifyUsers({ userIds, title, message, link }) {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, title, message, link: link ?? null })),
  })
}