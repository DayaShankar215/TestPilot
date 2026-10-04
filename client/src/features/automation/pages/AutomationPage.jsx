import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bot, KeyRound, Play, RotateCcw, ShieldAlert, Timer, Zap } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Badge, StatusBadge } from '../../../components/common/Badge'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { Tabs, TabPanel } from '../../../components/common/Tabs'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { automationApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { ENVIRONMENT, JOB_STATUS } from '../../../utils/constants'
import { formatDateTime, formatDuration, formatNumber, timeAgo, titleCase } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

function scheduleLabel(job) {
  if (job.schedule) return job.schedule
  if (job.trigger === 'nightly') return 'Nightly'
  if (job.trigger === 'on-push') return 'On every push'
  return 'Manual only'
}

export function AutomationPage() {
  const { projectId } = useParams()
  const toast = useToast()
  const { can } = usePermissions()
  const [busyJobId, setBusyJobId] = useState(null)

  const jobsFetcher = useMemo(() => () => automationApi.jobs(projectId), [projectId])
  const { data: jobs, isLoading, isError, error, refetch } = useApi(jobsFetcher, [projectId])

  const startJob = async (job) => {
    setBusyJobId(job.id)
    try {
      await automationApi.startJob(projectId, job.id)
      toast.success('Job queued', `${job.name} started against ${ENVIRONMENT[job.targetEnvironment]?.label ?? job.targetEnvironment}.`)
      refetch()
    } catch (caught) {
      toast.error('Could not start job', caught?.message)
    } finally {
      setBusyJobId(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Automation"
        description="Automated suites run against an environment. Results are matched back to test cases so they count towards coverage."
        actions={
          <Badge tone="accent" icon={ShieldAlert}>
            Credentials stored server-side
          </Badge>
        }
      />

      <Alert tone="info" title="Secrets stay on the server">
        TestPilot never accepts runner credentials in the browser. Connection details and environment variables are held
        by the runner service and referenced by name only.
      </Alert>

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {isLoading && (
        <div className="grid-2">
          <Skeleton height={180} radius="var(--radius-lg)" />
          <Skeleton height={180} radius="var(--radius-lg)" />
        </div>
      )}

      {jobs?.length === 0 && (
        <Card>
          <CardBody flush>
            <EmptyState
              icon={Bot}
              title="No automation jobs configured"
              description="Connect a runner to this project to schedule suites and see results here."
            />
          </CardBody>
        </Card>
      )}

      {jobs?.map((job) => (
        <Card key={job.id}>
          <CardHeader
            title={job.name}
            subtitle={`${job.framework} · ${titleCase(job.trigger)} · ${ENVIRONMENT[job.targetEnvironment]?.label ?? job.targetEnvironment}`}
            actions={
              <>
                <StatusBadge map={JOB_STATUS} value={job.lastRun?.status ?? 'queued'} fallback="Never run" />
                {can('automation:configure') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await automationApi.updateJob(job.id, { enabled: !job.enabled })
                        toast.info(job.enabled ? 'Job disabled' : 'Job enabled', job.name)
                        refetch()
                      } catch (caught) {
                        toast.error('Could not update job', caught?.message)
                      }
                    }}
                  >
                    {job.enabled ? 'Disable' : 'Enable'}
                  </Button>
                )}
                {can('automation:run') && (
                  <Button
                    size="sm"
                    icon={Play}
                    onClick={() => startJob(job)}
                    loading={busyJobId === job.id}
                    disabled={!job.enabled}
                    title={job.enabled ? undefined : 'Enable this job before running it'}
                  >
                    Run now
                  </Button>
                )}
              </>
            }
          />
          <CardBody className="stack">
            {!job.enabled && (
              <Alert tone="warning">
                This job is disabled. Enable it to allow manual runs and scheduled triggers.
              </Alert>
            )}

            <div className="kpi-grid kpi-grid--tight">
              <div className="stat">
                <span className="stat__label">Last run</span>
                <span className="stat__value">
                  {job.lastRun ? timeAgo(job.lastRun.startedAt) : 'Never'}
                </span>
                <span className="card__subtitle">
                  {job.lastRun ? formatDuration(job.lastRun.durationMs) : 'No execution recorded'}
                </span>
              </div>
              <div className="stat">
                <span className="stat__label">Passed</span>
                <span className="stat__value">{formatNumber(job.lastRun?.passed ?? 0)}</span>
                <span className="card__subtitle">of {formatNumber(job.lastRun?.total ?? 0)} specs</span>
              </div>
              <div className="stat">
                <span className="stat__label">Failed</span>
                <span className="stat__value">{formatNumber(job.lastRun?.failed ?? 0)}</span>
                <span className="card__subtitle">Rerun failures from the job page</span>
              </div>
              <div className="stat">
                <span className="stat__label">Schedule</span>
                <span className="stat__value" style={{ fontSize: 'var(--text-lg)' }}>
                  {scheduleLabel(job)}
                </span>
                <span className="card__subtitle">{titleCase(job.trigger)}</span>
              </div>
            </div>

            {job.failures?.length > 0 && (
              <div className="stack-sm" style={{ gap: 4 }}>
                <span className="stat__label">Recent failures</span>
                <ul className="stack-sm" style={{ gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
                  {job.failures.slice(0, 4).map((failure) => (
                    <li key={failure.id} className="row-sm" style={{ gap: 8, fontSize: 'var(--text-sm)', flexWrap: 'wrap' }}>
                      <StatusBadge map={JOB_STATUS} value="failed" dot={false} />
                      <span className="mono">{failure.testCaseRef}</span>
                      <span className="text-muted truncate">{failure.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="row-sm">
              <Button variant="secondary" size="sm" as={Link} to={ROUTES.automationJob(projectId, job.id)} icon={Timer}>
                View runs and logs
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

export function AutomationJobPage() {
  const { projectId, jobId } = useParams()
  const toast = useToast()
  const { can } = usePermissions()
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('runs')

  const fetcher = useMemo(() => () => automationApi.job(projectId, jobId), [projectId, jobId])
  const { data: job, isLoading, isError, error, refetch, setData } = useApi(fetcher, [projectId, jobId])

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !job) {
    return (
      <div className="page">
        <Skeleton height={140} radius="var(--radius-lg)" />
        <Skeleton height={300} radius="var(--radius-lg)" />
      </div>
    )
  }

  const start = async () => {
    setBusy(true)
    try {
      const updated = await automationApi.startJob(jobId)
      setData(updated)
      toast.success('Job started', 'Results appear here once the runner reports back.')
    } catch (caught) {
      toast.error('Could not start job', caught?.message)
    } finally {
      setBusy(false)
    }
  }

  const rerunFailures = async () => {
    setBusy(true)
    try {
      await automationApi.rerunJob(jobId)
      toast.success('Rerun queued', 'Only previously failed specs will execute.')
    } catch (caught) {
      toast.error('Could not queue rerun', caught?.message)
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'runs', label: 'Runs', count: job.history?.length ?? 0 },
    { id: 'cases', label: 'Covered cases', count: job.testCases?.length ?? 0 },
    { id: 'config', label: 'Configuration' },
  ]

  return (
    <div className="page">
      <PageHeader
        title={job.name}
        description={`${job.framework} · ${ENVIRONMENT[job.targetEnvironment]?.label ?? job.targetEnvironment} · ${titleCase(job.trigger)}`}
        actions={
          <>
            <StatusBadge map={JOB_STATUS} value={job.lastRun?.status ?? 'queued'} fallback="Never run" />
            {can('automation:run') && job.failures?.length > 0 && (
              <Button variant="secondary" icon={RotateCcw} onClick={rerunFailures} loading={busy}>
                Rerun failures
              </Button>
            )}
            {can('automation:run') && (
              <Button icon={Play} onClick={start} loading={busy} disabled={!job.enabled}>
                Run job
              </Button>
            )}
          </>
        }
      />

      {!job.enabled && (
        <Alert tone="warning" title="Job disabled">
          This job is disabled and cannot run until it is enabled.
        </Alert>
      )}

      <Card>
        <CardBody>
          <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Automation job sections" />
          <div style={{ paddingTop: 'var(--space-5)' }}>
            <TabPanel id="runs" activeId={tab}>
              {job.history?.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <caption className="visually-hidden">Recent automation runs</caption>
                    <thead>
                      <tr>
                        <th>Started</th>
                        <th style={{ width: 130 }}>Status</th>
                        <th style={{ width: 110 }}>Passed</th>
                        <th style={{ width: 110 }}>Failed</th>
                        <th style={{ width: 120 }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.history.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDateTime(entry.startedAt)}</td>
                          <td>
                            <StatusBadge map={JOB_STATUS} value={entry.status} />
                          </td>
                          <td>{entry.passed}</td>
                          <td>{entry.failed}</td>
                          <td>{formatDuration(entry.durationMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Zap}
                  title="No completed runs"
                  description="Start the job to record a run history."
                />
              )}
            </TabPanel>

            <TabPanel id="cases" activeId={tab}>
              <div className="stack">
                <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  Test cases covered by this suite. Results reported by the runner are matched to these cases.
                </p>
                <div className="link-list">
                  {(job.testCases ?? []).map((testCase) => (
                    <Link key={testCase.id} to={ROUTES.testCase(testCase.id)} className="link-tile">
                      <span className="workspace-selector__mark" aria-hidden="true" style={{ fontSize: 9 }}>
                        TC
                      </span>
                      <span className="link-tile__body">
                        <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                          {testCase.ref}
                        </span>
                        <span style={{ fontWeight: 'var(--weight-medium)' }}>{testCase.title}</span>
                        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                          {testCase.module}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </TabPanel>

            <TabPanel id="config" activeId={tab}>
              <dl className="definition-list">
                <dt>Framework</dt>
                <dd>{job.framework}</dd>
                <dt>Trigger</dt>
                <dd>{titleCase(job.trigger)}</dd>
                <dt>Schedule</dt>
                <dd>{scheduleLabel(job)}</dd>
                <dt>Environment</dt>
                <dd>{ENVIRONMENT[job.targetEnvironment]?.label ?? job.targetEnvironment}</dd>
                <dt>Enabled</dt>
                <dd>{job.enabled ? 'Yes' : 'No'}</dd>
                <dt>Credentials</dt>
                <dd className="row-sm" style={{ gap: 6 }}>
                  <KeyRound size={13} aria-hidden="true" />
                  Held by the runner service
                </dd>
              </dl>
              <Alert tone="info">
                Configuration changes apply to the next run. Secrets are never editable from the browser.
              </Alert>
            </TabPanel>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}