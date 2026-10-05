import { prisma } from '../../config/database.js'
import { ApiError } from '../../utils/apiError.js'
import { env } from '../../config/env.js'
import { resolveProjectAccess } from '../../services/permissions.js'
import { recordActivity } from '../../services/activity.js'
import { paginate, readPaging, textSearch, orderBy } from '../../utils/query.js'

const JOB_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  testCaseLinks: { include: { testCase: { select: { id: true, ref: true, title: true } } } },
}

const ARTIFACT_TYPES = new Set(['screenshot', 'log', 'trace', 'report'])

function shape(job) {
  const { testCaseLinks, allowedHosts, ...rest } = job
  return {
    ...rest,
    allowedHosts: Array.isArray(allowedHosts) ? allowedHosts : [],
    testCases: testCaseLinks.map((link) => link.testCase),
    // The client renders run history straight off the job detail payload.
    history: job.runs ?? [],
  }
}

/** Jobs may only ever point at hosts the job explicitly allow-lists. */
function assertHostAllowed(allowedHosts, url) {
  const host = new URL(url).hostname
  if (!allowedHosts.includes(host)) {
    throw ApiError.badRequest(`Host ${host} is not in this job's allowed host list.`)
  }
}

async function loadJob(auth, projectId, jobId) {
  await resolveProjectAccess(auth, projectId)
  const job = await prisma.automationJob.findFirst({
    where: { id: jobId, projectId },
    include: { ...JOB_INCLUDE, runs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!job) throw ApiError.notFound('Automation job not found.')
  return job
}

export async function listJobs(auth, projectId, query) {
  await resolveProjectAccess(auth, projectId)
  const paging = readPaging(query)
  const search = textSearch(query.search, ['name', 'suite'])

  const { items, meta } = await paginate('automationJob', {
    where: {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { AND: [search] } : {}),
    },
    include: JOB_INCLUDE,
    orderBy: orderBy(query, { name: 'name', status: 'status', createdAt: 'createdAt' }, 'createdAt'),
    ...paging,
  })

  return { items: items.map((job) => ({ ...shape(job), history: [] })), meta }
}

export async function getJob(auth, projectId, jobId) {
  return shape(await loadJob(auth, projectId, jobId))
}

export async function createJob(auth, projectId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead', allowArchived: false })

  if (!env.AUTOMATION_ENABLED) throw ApiError.forbidden('Automation is disabled on this server.')
  assertHostAllowed(input.allowedHosts, input.targetUrl)

  if (input.testCaseIds.length) {
    const found = await prisma.testCase.count({ where: { id: { in: input.testCaseIds }, projectId } })
    if (found !== new Set(input.testCaseIds).size) {
      throw ApiError.badRequest('One or more test cases do not belong to this project.')
    }
  }

  const job = await prisma.automationJob.create({
    data: {
      projectId,
      name: input.name,
      suite: input.suite,
      framework: input.framework,
      targetUrl: input.targetUrl,
      allowedHosts: input.allowedHosts,
      trigger: input.trigger,
      schedule: input.schedule ?? null,
      timeoutMs: input.timeoutMs,
      createdById: auth.user.id,
      testCaseLinks: { create: input.testCaseIds.map((testCaseId) => ({ testCaseId })) },
    },
    include: { ...JOB_INCLUDE, runs: true },
  })

  await recordActivity(auth, {
    projectId,
    action: 'automation.created',
    entityType: 'automationJob',
    entityId: job.id,
    summary: `Created automation job ${job.name}`,
  })

  return shape(job)
}

export async function updateJob(auth, projectId, jobId, input) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'qa_lead' })

  const existing = await prisma.automationJob.findFirst({ where: { id: jobId, projectId } })
  if (!existing) throw ApiError.notFound('Automation job not found.')

  const allowedHosts = input.allowedHosts ?? existing.allowedHosts
  assertHostAllowed(Array.isArray(allowedHosts) ? allowedHosts : [], input.targetUrl ?? existing.targetUrl)

  const data = {}
  for (const field of ['name', 'suite', 'trigger', 'schedule', 'enabled', 'timeoutMs']) {
    if (input[field] !== undefined) data[field] = input[field] ?? null
  }
  if (input.allowedHosts !== undefined) data.allowedHosts = input.allowedHosts
  if (input.targetUrl !== undefined) data.targetUrl = input.targetUrl

  const job = await prisma.automationJob.update({
    where: { id: jobId },
    data,
    include: { ...JOB_INCLUDE, runs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })

  await recordActivity(auth, {
    projectId,
    action: 'automation.updated',
    entityType: 'automationJob',
    entityId: jobId,
    summary: `Updated automation job ${job.name}`,
  })

  return shape(job)
}

/**
 * Runs are queued as rows and executed out-of-band by the worker, so the request
 * never waits on a browser. No user-supplied shell command is ever executed.
 */
export async function queueRun(auth, projectId, jobId, input = {}) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const job = await prisma.automationJob.findFirst({
    where: { id: jobId, projectId },
    include: { ...JOB_INCLUDE, runs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!job) throw ApiError.notFound('Automation job not found.')
  if (!env.AUTOMATION_ENABLED) throw ApiError.forbidden('Automation is disabled on this server.')
  if (!job.enabled) throw ApiError.badRequest('This job is disabled.')
  if (!job.testCaseLinks.length) throw ApiError.badRequest('Link at least one test case to this job before running it.')

  assertHostAllowed(Array.isArray(job.allowedHosts) ? job.allowedHosts : [], job.targetUrl)

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.automationJobRun.create({
      data: {
        jobId,
        status: 'queued',
        trigger: job.trigger,
        total: job.testCaseLinks.length,
        commitSha: input.commitSha ?? null,
        branch: input.branch ?? null,
      },
    })
    await tx.automationJob.update({ where: { id: jobId }, data: { status: 'queued' } })
    return created
  })

  await recordActivity(auth, {
    projectId,
    action: 'automation.queued',
    entityType: 'automationJob',
    entityId: jobId,
    summary: `Queued ${job.name}`,
  })

  return { job: shape(await loadJob(auth, projectId, jobId)), run }
}

export async function rerunJob(auth, projectId, jobId) {
  const job = await prisma.automationJob.findFirst({ where: { id: jobId, projectId } })
  if (!job) throw ApiError.notFound('Automation job not found.')

  const previous = await prisma.automationJobRun.findFirst({
    where: { jobId, status: { in: ['failed', 'timed_out'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (!previous) throw ApiError.badRequest('There is no failed run to rerun.')

  return queueRun(auth, projectId, jobId, { commitSha: previous.commitSha, branch: previous.branch })
}

export async function cancelJob(auth, projectId, jobId) {
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const job = await prisma.automationJob.findFirst({ where: { id: jobId, projectId } })
  if (!job) throw ApiError.notFound('Automation job not found.')
  if (!['queued', 'running'].includes(job.status)) {
    throw ApiError.badRequest('Only a queued or running job can be cancelled.')
  }

  await prisma.$transaction([
    prisma.automationJobRun.updateMany({
      where: { jobId, status: { in: ['queued', 'running'] } },
      data: { status: 'cancelled', finishedAt: new Date() },
    }),
    prisma.automationJob.update({ where: { id: jobId }, data: { status: 'cancelled' } }),
  ])

  return shape(await loadJob(auth, projectId, jobId))
}

export async function listArtifacts(auth, projectId, jobId, query) {
  await resolveProjectAccess(auth, projectId)

  const job = await prisma.automationJob.findFirst({ where: { id: jobId, projectId } })
  if (!job) throw ApiError.notFound('Automation job not found.')

  const paging = readPaging(query)

  return paginate('automationArtifact', {
    where: { jobId, ...(query.runId ? { runId: query.runId } : {}), ...(query.type ? { type: query.type } : {}) },
    orderBy: { createdAt: 'desc' },
    ...paging,
  })
}

/**
 * Artifact bytes go to private disk storage; only metadata is stored in MySQL.
 * The extension allow-list keeps executables out of the artifact directory.
 */
export async function uploadArtifact(auth, jobId, query, file) {
  const projectId = query.projectId
  await resolveProjectAccess(auth, projectId, { minimumRole: 'tester' })

  const job = await prisma.automationJob.findFirst({ where: { id: jobId, projectId } })
  if (!job) throw ApiError.notFound('Automation job not found.')
  if (!file) throw ApiError.badRequest('No file was uploaded.')

  const type = query.type ?? typeFromName(file.originalname)
  if (!ARTIFACT_TYPES.has(type)) throw ApiError.badRequest('That artifact type is not accepted.')

  if (query.runId) {
    const run = await prisma.automationJobRun.findFirst({ where: { id: query.runId, jobId } })
    if (!run) throw ApiError.notFound('Automation run not found.')
  }

  const storageKey = `${projectId}/${jobId}/${Date.now()}-${file.originalname}`
  await writePrivateArtifact(storageKey, file.buffer, file.mimetype)

  return prisma.automationArtifact.create({
    data: {
      jobId,
      runId: query.runId ?? null,
      type,
      fileName: file.originalname,
      storageKey,
      contentType: file.mimetype,
      sizeBytes: file.size,
    },
  })
}

function typeFromName(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp') return 'screenshot'
  if (extension === 'zip') return 'trace'
  return 'report'
}

async function writePrivateArtifact(storageKey, buffer, contentType) {
  const { mkdir, writeFile } = await import('node:fs/promises')
  const path = await import('node:path')
  const target = path.resolve(env.artifactDir, storageKey)
  // Refuse anything that escapes the artifact root.
  if (!target.startsWith(path.resolve(env.artifactDir))) throw ApiError.badRequest('Invalid artifact path.')

  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, buffer, { mode: 0o600 })

  return { target, contentType }
}