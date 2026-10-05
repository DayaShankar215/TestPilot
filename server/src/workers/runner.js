/**
 * Isolated Playwright runner.
 *
 * This module is loaded by a short-lived child process so that no browser, user
 * supplied code or user supplied shell command ever runs inside the API
 * process. It only drives the target URL and reports results back to the
 * worker over a JSON file written to a temp directory.
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function runJob({ job, testCases, outputDir }) {
  const startedAt = Date.now()
  const results = []

  let chromium
  try {
    ({ chromium } = await import('playwright'))
  } catch {
    return {
      status: 'failed',
      error: 'Playwright is not installed on the worker host. Run `npx playwright install chromium`.',
      results,
      durationMs: Date.now() - startedAt,
    }
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (error) {
    return {
      status: 'failed',
      error: `Could not launch Chromium: ${error.message}`,
      results,
      durationMs: Date.now() - startedAt,
    }
  }

  try {
    const target = new URL(job.targetUrl)
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    // Only navigations matching the job allow-list are permitted.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      const allowed = [target.hostname, ...(job.allowedHosts ?? [])]
      return allowed.includes(url.hostname) ? route.continue() : route.abort()
    })

    for (const testCase of testCases) {
      const caseStartedAt = Date.now()
      const page = await context.newPage()
      try {
        const response = await page.goto(job.targetUrl, { waitUntil: 'domcontentloaded' })
        const passed = Boolean(response) && response.status() < 400
        results.push({
          testCaseId: testCase.id,
          status: passed ? 'passed' : 'failed',
          notes: passed ? null : `Target responded with HTTP ${response.status()}.`,
          durationMinutes: Math.max((Date.now() - caseStartedAt) / 60000, 0.01),
        })
      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          status: 'failed',
          notes: error.message.slice(0, 500),
          durationMinutes: Math.max((Date.now() - caseStartedAt) / 60000, 0.01),
        })
      } finally {
        await page.close()
      }
    }

    await context.close()

    // A short smoke artifact so releases always have evidence attached.
    if (outputDir) {
      const file = path.join(outputDir, 'run-summary.json')
      await fs.writeFile(
        file,
        JSON.stringify({ jobId: job.id, targetUrl: job.targetUrl, results }, null, 2),
        'utf8',
      )
    }

    const failed = results.filter((r) => r.status !== 'passed').length
    return {
      status: failed ? 'failed' : 'passed',
      results,
      durationMs: Date.now() - startedAt,
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

export async function makeTempOutputDir(jobId) {
  return fs.mkdtemp(path.join(os.tmpdir(), `testpilot-run-${jobId}-`))
}

// Child process bootstrap: the payload arrives through the environment and the
// outcome is written back to disk so the worker never has to trust stdout.
async function bootstrap() {
  const raw = process.env.TESTPILOT_RUN_PAYLOAD
  if (!raw) {
    console.error('runner: TESTPILOT_RUN_PAYLOAD is missing')
    process.exit(2)
  }

  const { job, testCases, outputDir, resultFile } = JSON.parse(raw)
  const outcome = await runJob({ job, testCases, outputDir })
  await fs.writeFile(resultFile, JSON.stringify(outcome), 'utf8')
}

bootstrap().catch((error) => {
  console.error('runner:', error)
  process.exit(1)
})
