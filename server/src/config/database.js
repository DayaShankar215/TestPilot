import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.__testpilotPrisma ??
  new PrismaClient({
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
    datasources: { db: { url: env.DATABASE_URL } },
  })

if (!env.isProduction) globalForPrisma.__testpilotPrisma = prisma

export async function connectDatabase() {
  await prisma.$connect()
}

export async function disconnectDatabase() {
  await prisma.$disconnect()
}

export async function databaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true }
  } catch (error) {
    return { ok: false, message: error.message }
  }
}

/**
 * Wraps a unit of work in a transaction so multi-record writes either land
 * together or not at all (test case + steps, run + results, defect + history).
 */
export function transaction(handler) {
  return prisma.$transaction(handler)
}