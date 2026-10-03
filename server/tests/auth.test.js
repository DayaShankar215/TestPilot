import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { sha256 } from '../src/utils/ids.js'

const PASSWORD = 'TestPilot@2026'

let app
let owner
let member

beforeAll(async () => {
  app = createApp()
  const passwordHash = await bcrypt.hash(PASSWORD, 8)

  owner = await prisma.user.upsert({
    where: { email: 'it-owner@testpilot.dev' },
    create: { email: 'it-owner@testpilot.dev', name: 'IT Owner', passwordHash, title: 'Owner' },
    update: { passwordHash },
  })
  member = await prisma.user.upsert({
    where: { email: 'it-member@testpilot.dev' },
    create: { email: 'it-member@testpilot.dev', name: 'IT Member', passwordHash, title: 'Tester' },
    update: { passwordHash },
  })
  await prisma.userPreference.createMany({
    data: [{ userId: owner.id }, { userId: member.id }],
    skipDuplicates: true,
  })

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'testpilot-it' },
    create: { name: 'TestPilot IT', slug: 'testpilot-it', ownerId: owner.id },
    update: {},
  })
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: member.id, role: 'tester' },
    ],
    skipDuplicates: true,
  })
})

afterAll(async () => {
  const workspace = await prisma.workspace.findUnique({ where: { slug: 'testpilot-it' } })
  if (workspace) {
    const projects = await prisma.project.findMany({ where: { workspaceId: workspace.id }, select: { id: true } })
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } })
    await prisma.projectMember.deleteMany({ where: { projectId: { in: projects.map((p) => p.id) } } })
    await prisma.project.deleteMany({ where: { workspaceId: workspace.id } })
    await prisma.workspace.delete({ where: { id: workspace.id } })
  }
  await prisma.session.deleteMany({ where: { userId: { in: [owner.id, member.id] } } })
  await prisma.userPreference.deleteMany({ where: { userId: { in: [owner.id, member.id] } } })
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, member.id] } } })
  await prisma.$disconnect()
})

function login(email = 'it-owner@testpilot.dev', password = PASSWORD) {
  return request(app).post('/api/v1/auth/login').send({ email, password })
}

describe('health', () => {
  it('reports database connectivity', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.database.ok).toBe(true)
  })
})

describe('authentication', () => {
  it('sets an httpOnly session cookie plus a readable CSRF cookie', async () => {
    const res = await login()
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const cookies = res.headers['set-cookie'].join(';')
    expect(cookies).toContain('testpilot_sid=')
    expect(cookies).toContain('HttpOnly')
    expect(cookies).toContain('SameSite=Lax')

    const csrf = res.headers['set-cookie'].find((value) => value.startsWith('testpilot_csrf='))
    expect(csrf).not.toContain('HttpOnly')
  })

  it('stores only a hash of the session token', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })

    const sessionCookie = agent.jar.getCookie('testpilot_sid', { domain: '127.0.0.1', path: '/', secure: false, script: false })
    const stored = await prisma.session.findFirst({ where: { userId: owner.id, revokedAt: null }, orderBy: { createdAt: 'desc' } })
    expect(stored).toBeTruthy()
    expect(stored.token).toBe(sha256(sessionCookie.value))
  })

  it('rejects wrong credentials without revealing which field failed', async () => {
    const res = await login(owner.email, 'WrongPass@123')
    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Email or password is incorrect.')
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns 401 for /me without a session', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns the profile and memberships for a valid session', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })

    const res = await agent.get('/api/v1/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(owner.email)
    expect(res.body.data.memberships[0].role).toBe('owner')
  })

  it('blocks mutating requests that omit the CSRF header', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })

    const res = await agent.patch('/api/v1/users/me').send({ name: 'Renamed' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_TOKEN_MISMATCH')
  })

  it('accepts a matching CSRF header and cookie', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })
    const csrf = agent.jar.getCookie('testpilot_csrf', { domain: '127.0.0.1', path: '/', secure: false, script: false })

    const res = await agent
      .patch('/api/v1/users/me')
      .set('X-CSRF-Token', csrf.value)
      .send({ name: 'Renamed Owner' })

    expect(res.status).toBe(200)
    expect(res.body.data.user.name).toBe('Renamed Owner')
  })

  it('validates the body with field-level errors', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })
    const csrf = agent.jar.getCookie('testpilot_csrf', { domain: '127.0.0.1', path: '/', secure: false, script: false })

    const res = await agent.patch('/api/v1/users/me').set('X-CSRF-Token', csrf.value).send({ name: 'x' })
    expect(res.status).toBe(422)
    expect(res.body.errors[0].field).toBe('name')
    expect(res.body.error.fieldErrors[0].field).toBe('name')
  })

  it('revokes the session on logout', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })
    const csrf = agent.jar.getCookie('testpilot_csrf', { domain: '127.0.0.1', path: '/', secure: false, script: false })

    const logout = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf.value)
    expect(logout.status).toBe(200)

    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(401)
  })

  it('does not reveal whether an email exists during password reset', async () => {
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: member.email })
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@testpilot.dev' })

    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(known.body.message).toBe(unknown.body.message)
  })
})

describe('workspace isolation', () => {
  it('lists only workspaces the caller belongs to', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: member.email, password: PASSWORD })

    const res = await agent.get('/api/v1/workspaces')
    expect(res.status).toBe(200)
    expect(res.body.data.items.map((item) => item.slug)).toEqual(['testpilot-it'])
  })

  it('conceals workspaces the caller is not a member of', async () => {
    const other = await prisma.workspace.create({
      data: { name: 'Foreign', slug: 'testpilot-foreign', ownerId: member.id },
    })

    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: owner.email, password: PASSWORD })
    const res = await agent.get(`/api/v1/workspaces/${other.id}`)
    expect(res.status).toBe(404)

    await prisma.workspace.delete({ where: { id: other.id } })
  })

  it('stops a tester from renaming the workspace', async () => {
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug: 'testpilot-it' } })

    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email: member.email, password: PASSWORD })
    const csrf = agent.jar.getCookie('testpilot_csrf', { domain: '127.0.0.1', path: '/', secure: false, script: false })

    const res = await agent
      .patch(`/api/v1/workspaces/${workspace.id}`)
      .set('X-CSRF-Token', csrf.value)
      .send({ name: 'Renamed by tester' })

    expect(res.status).toBe(403)
  })
})

describe('unknown routes', () => {
  it('returns the standard 404 envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})