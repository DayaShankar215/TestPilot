import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'

const app = createApp()

async function main() {
  await connectDatabase()

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`TestPilot API listening on http://localhost:${env.PORT}${env.API_PREFIX} (${env.NODE_ENV})`)
  })

  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down`)
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error)
  process.exit(1)
})