import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { env } from '../src/config/env.js'

const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })

const PASSWORD = process.env.SEED_PASSWORD ?? 'TestPilot@2026'

const USERS = [
  { email: 'arun.mehta@testpilot.dev', name: 'Arun Mehta', title: 'Head of QA', role: 'owner' },
  { email: 'priya.sharma@testpilot.dev', name: 'Priya Sharma', title: 'QA Lead', role: 'admin' },
  { email: 'rahul.verma@testpilot.dev', name: 'Rahul Verma', title: 'SDET', role: 'qa_lead' },
  { email: 'sana.khan@testpilot.dev', name: 'Sana Khan', title: 'QA Engineer', role: 'tester' },
  { email: 'imran.ali@testpilot.dev', name: 'Imran Ali', title: 'Business Analyst', role: 'viewer' },
]

async function upsertUser(spec, passwordHash) {
  const user = await prisma.user.upsert({
    where: { email: spec.email },
    create: { email: spec.email, name: spec.name, title: spec.title, passwordHash },
    update: { name: spec.name, title: spec.title, isActive: true },
  })
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, timezone: 'Asia/Kolkata' },
    update: {},
  })
  return user
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, env.BCRYPT_ROUNDS)
  const users = []

  for (const spec of USERS) {
    // eslint-disable-next-line no-await-in-loop
    users.push(await upsertUser(spec, passwordHash))
  }
  const [arun] = users

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'testpilot' },
    create: { name: 'TestPilot', slug: 'testpilot', ownerId: arun.id },
    update: {},
  })

  for (const [index, user] of users.entries()) {
    const role = USERS[index].role
    // eslint-disable-next-line no-await-in-loop
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      create: { workspaceId: workspace.id, userId: user.id, role },
      update: {},
    })
  }

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-payments' },
    create: {
      id: 'seed-project-payments',
      workspaceId: workspace.id,
      name: 'Payments Platform',
      key: 'PAY',
      description: 'Card, wallet and settlement platform used by TestPilot.',
      status: 'active',
      ownerId: arun.id,
      members: {
        create: users.slice(1).map((user, index) => ({
          userId: user.id,
          role: ['qa_lead', 'tester', 'tester', 'viewer'][index] ?? 'viewer',
        })),
      },
    },
    update: {},
  })

  const requirement = await prisma.requirement.upsert({
    where: { id: 'seed-req-wallet-topup' },
    create: {
      id: 'seed-req-wallet-topup',
      projectId: project.id,
      ref: 'REQ-1',
      title: 'Wallet top-up with instant settlement',
      description: 'Users can top up their wallet and see the balance update immediately.',
      module: 'Wallets',
      acceptanceCriteria: ['Balance updates within 2 seconds', 'Idempotent on retry', 'Audit entry written'],
      priority: 'high',
      status: 'approved',
      createdById: arun.id,
      ownerId: arun.id,
    },
    update: {},
  })

  await prisma.requirementVersion.create({
    data: {
      requirementId: requirement.id,
      version: 1,
      title: requirement.title,
      description: requirement.description,
      acceptanceCriteria: requirement.acceptanceCriteria,
      changeSummary: 'Initial approved baseline',
      changedById: arun.id,
    },
  })

  const testCase = await prisma.testCase.upsert({
    where: { id: 'seed-tc-wallet-topup' },
    create: {
      id: 'seed-tc-wallet-topup',
      projectId: project.id,
      ref: 'TC-1',
      title: 'Top up wallet via UPI and verify balance',
      description: 'Covers the happy path for an immediate wallet credit.',
      type: 'functional',
      priority: 'high',
      status: 'approved',
      createdById: rahul(users).id,
      steps: {
        create: [
          { order: 1, action: 'Open Wallet page', expected: 'Wallet balance is visible' },
          { order: 2, action: 'Click Add Money', expected: 'Payment methods list appears' },
          { order: 3, action: 'Pay 500 via UPI', expected: 'Razorpay checkout opens' },
          { order: 4, action: 'Complete payment', expected: 'Balance increases by 500' },
        ],
      },
    },
    update: {},
  })

  await prisma.requirementTestCase.upsert({
    where: { id: 'seed-link-req1-tc1' },
    create: { requirementId: requirement.id, testCaseId: testCase.id },
    update: {},
  })

  const run = await prisma.testRun.upsert({
    where: { id: 'seed-run-release-24-1' },
    create: {
      id: 'seed-run-release-24-1',
      projectId: project.id,
      name: 'Release 24.1 regression',
      release: '24.1',
      build: '4120',
      environment: 'staging',
      scope: 'selected',
      status: 'completed',
      startedAt: new Date(Date.now() - 3 * 86400000),
      completedAt: new Date(Date.now() - 3 * 86400000 + 5400000),
      createdById: rahul(users).id,
    },
    update: {},
  })

  await prisma.testResult.upsert({
    where: { id: 'seed-result-1' },
    create: {
      id: 'seed-result-1',
      runId: run.id,
      testCaseId: testCase.id,
      attempt: 1,
      status: 'fail',
      notes: 'Balance updated after 6 seconds, expected within 2.',
      durationMinutes: 12,
      environment: 'staging',
      executedById: sana(users).id,
      executedAt: new Date(),
    },
    update: {},
  })

  const defect = await prisma.defect.upsert({
    where: { id: 'seed-defect-1' },
    create: {
      id: 'seed-defect-1',
      projectId: project.id,
      ref: 'BUG-1',
      title: 'Wallet balance updates slowly after UPI top-up',
      description: 'Balance refresh is delayed well beyond the 2 second acceptance criterion.',
      reproductionSteps: ['Top up via UPI', 'Observe the wallet balance', 'Compare against the 2s SLA'],
      expectedBehavior: 'Balance reflects the credit within 2 seconds',
      actualBehavior: 'Balance reflects the credit after 6-8 seconds',
      severity: 'high',
      priority: 'high',
      status: 'open',
      reporterId: sana(users).id,
      assigneeId: rahul(users).id,
    },
    update: {},
  })

  await prisma.defectTestResult.upsert({
    where: { id: 'seed-defect-link-1' },
    create: { defectId: defect.id, resultId: 'seed-result-1' },
    update: {},
  })

  await prisma.defectHistory.create({
    data: { defectId: defect.id, fromStatus: null, toStatus: 'open', comment: 'Reported from failed TC-1', changedById: sana(users).id },
  })

  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      userId: arun.id,
      action: 'seed',
      entityType: 'project',
      entityId: project.id,
      summary: 'Seed data created for local development',
    },
  })

  // eslint-disable-next-line no-console
  console.log(`Seeded workspace "${workspace.name}" with ${USERS.length} users.`)
  // eslint-disable-next-line no-console
  console.log(`Sign in with ${USERS[0].email} / ${PASSWORD}`)
}

function rahul(users) {
  return users.find((user) => user.email.startsWith('rahul'))
}

function sana(users) {
  return users.find((user) => user.email.startsWith('sana'))
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })