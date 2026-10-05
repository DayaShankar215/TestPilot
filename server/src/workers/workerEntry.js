/**
 * Automation worker entry point (`npm run worker`).
 *
 * Polls for queued runs, claims them atomically and executes each one in a
 * short-lived child process so browsers and untrusted suites never touch the
 * API process. Honours AUTOMATION_ENABLED, AUTOMATION_MAX_CONCURRENCY and the
 * per job timeout.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'

const RUNNER_URL = new URL('./runner.js', import.meta.url)
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000)
const inFlight = new Set()
let shuttingDown = false

function claimRun() {
  // updateMany acts as the claim: only one worker can flip queued -> running.
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.automationJobRun.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      include: {
        job: {
          include: {
            testCaseLinks: { include: { testCase: { select: { id: true, title: true } } } },
          },
        },
      },
    })
    if (!candidate) return null

    const claimed = await tx.automationJobRun.updateMany({
      where: { id: candidate.id, status: 'queued' },
      data: { status: 'running', startedAt: new Date() },
    })
    if (claimed.count !== 1) return null

    await tx.automationJob.update({ where: { id: candidate.jobId }, data: { status: 'running' } })
    return candidate
  })
}

function executeInChildProcess(payload) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(RUNNER_URL)], {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, TESTPILOT_RUN_PAYLOAD: JSON.stringify(payload) },
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, payload.timeoutMs)

    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ status: 'failed', error: `Runner failed to start: ${error.message}`, results: [] })
    })

    child.on('close', async (code) => {
      clearTimeout(timer)
      let outcome = null
      try {
        outcome = JSON.parse(await fs.readFile(payload.resultFile, 'utf8'))
      } catch {
        outcome = null
      }
      if (!outcome) {
        resolve({
          status: 'failed',
          error: `Runner exited with code ${code} and no result file. ${stderr.slice(0, 300)}`.trim(),
          results: [],
        })
        return
      }
      resolve(outcome)
    })
  })
}

async function processRun(run) {
  const job = run.job
  const testCases = job.testCaseLinks.map((link) => link.testCase)
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), `testpilot-run-${run.id}-`))
  const resultFile = path.join(outputDir, 'outcome.json')
  const timeoutMs = Math.max(job.timeoutMs || env.automationJobTimeoutMs, 1000)

  let outcome
  try {
    outcome = await executeInChildProcess({
      job,
      testCases,
      outputDir,
      resultFile,
      timeoutMs,
    })
  } catch (error) {
    outcome = { status: 'failed', error: error.message, results: [], durationMs: 0 }
  }

  await persist(run, outcome, outputDir)

  await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {})
}

async function persist(run, outcome, outputDir) {
  const counts = { passed: 0, failed: 0, skipped: 0 }
  for (const result of outcome.results ?? []) {
    if (counts[result.status] !== undefined) counts[result.status] += 1
  }

  await prisma.$transaction(async (tx) => {
    await tx.automationJobRun.update({
      where: { id: run.id },
      data: {
        status: outcome.status,
        passed: counts.passed,
        failed: counts.failed,
        skipped: counts.skipped,
        durationMs: outcome.durationMs ?? null,
        error: outcome.error ?? null,
        finishedAt: new Date(),
      },
    })

    await tx.automationJob.update({
      where: { id: run.jobId },
      data: { status: outcome.status },
    })
  })

  // Store the run summary as a private artifact alongside the run.
  const summary = path.join(outputDir, 'run-summary.json')
  if (await fs.stat(summary).then(() => true, () => false)) {
    const body = await fs.readFile(summary)
    const storageKey = path.join('runs', run.id, 'run-summary.json')
    const target = path.resolve(env.artifactDir, storageKey)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, body)
    await prisma.automationArtifact.create({
      data: {
        jobId: run.jobId,
        runId: run.id,
        type: 'report',
        fileName: 'run-summary.json',
        storageKey,
        contentType: 'application/json',
        sizeBytes: body.byteLength,
      },
    })
  }
}

async function tick() {
  if (shuttingDown) return
  while (!shuttingDown && inFlight.size < env.automationMaxConcurrency) {
    const run = await claimRun().catch(() => null)
    if (!run) break
    inFlight.add(run.id)
    processRun(run)
      .catch((error) => {
        console.error(`[worker] run ${run.id} crashed: ${error.message}`)
        return prisma.automationJobRun
          .update({
            where: { id: run.id },
            data: { status: 'failed', error: error.message.slice(0, 500), finishedAt: new Date() },
          })
          .catch(() => {})
      })
      .finally(() => inFlight.delete(run.id))
  }
}

async function main() {
  if (!env.AUTOMATION_ENABLED) {
    console.log('[worker] AUTOMATION_ENABLED=false — nothing to do.')
    return
  }
  console.log(
    `[worker] polling every ${POLL_INTERVAL_MS}ms, max concurrency ${env.automationMaxConcurrency}.`,
  )
  while (!shuttingDown) {
    await tick()
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  await Promise.allSettled(inFlight)
  await prisma.$disconnect()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} received — draining.`)
    shuttingDown = true
  })
}

main().catch((error) => {
  console.error('[worker] fatal:', error)
  process.exit(1)
})
