import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { databaseHealth } from './config/database.js'
import { requestContext, errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter, workspacesRouter } from './modules/users/users.routes.js'
import { projectsRouter } from './modules/projects/projects.routes.js'
import { projectRequirementsRouter, requirementsRouter } from './modules/requirements/requirements.routes.js'
import { testCasesRouter } from './modules/testCases/testCases.routes.js'
import { testRunsRouter, testResultsRouter } from './modules/testRuns/testRuns.routes.js'
import { defectsRouter } from './modules/defects/defects.routes.js'
import { regressionRouter } from './modules/regression/regression.routes.js'
import { automationRouter, artifactRouter } from './modules/automation/automation.routes.js'
import { aiRouter } from './modules/ai/ai.routes.js'
import { reportsRouter } from './modules/reports/reports.routes.js'
import { notificationsRouter } from './modules/notifications/notifications.routes.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(dirname, '../../client/dist')

export function createApp() {
  const app = express()

  app.set('env', env)
  if (env.TRUST_PROXY) app.set('trust proxy', 1)

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }))
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Origin not allowed by CORS'))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(cookieParser())
  app.use(requestContext)
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'))

  app.get('/health', async (_req, res) => {
    const database = await databaseHealth()
    res.status(database.ok ? 200 : 503).json({
      status: database.ok ? 'ok' : 'degraded',
      service: 'testpilot-api',
      version: process.env.npm_package_version ?? '0.0.0',
      database,
      automationEnabled: env.AUTOMATION_ENABLED,
      aiProvider: env.AI_PROVIDER,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    })
  })

  const api = express.Router()
  api.use(apiRateLimiter)
  api.use('/auth', authRouter)
  api.use('/users', usersRouter)
  api.use('/workspaces', workspacesRouter)
  api.use('/projects', projectsRouter)
  api.use('/requirements', requirementsRouter)
  api.use('/test-results', testResultsRouter)
  api.use('/notifications', notificationsRouter)
  api.use('/ai', aiRouter)
  api.use('/automation', artifactRouter)
  // Project-scoped routers are mounted last so these generic prefixes stay free.
  api.use('/projects/:projectId/requirements', projectRequirementsRouter)
  api.use('/projects/:projectId/test-cases', testCasesRouter)
  api.use('/projects/:projectId/test-runs', testRunsRouter)
  api.use('/projects/:projectId/defects', defectsRouter)
  api.use('/projects/:projectId/regression', regressionRouter)
  api.use('/projects/:projectId/automation', automationRouter)
  api.use('/projects/:projectId', reportsRouter)
  app.use(env.API_PREFIX, api)

  // Serve the built SPA when it exists so the API can host the app single-origin.
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }))
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(clientDist, 'index.html'), (error) => (error ? next() : undefined))
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}