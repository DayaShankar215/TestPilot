import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bug,
  CheckCircle2,
  FileCheck2,
  FolderPlus,
  ListChecks,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { KPICard } from '../../../components/common/KPICard'
import { StatusBadge } from '../../../components/common/Badge'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton, SkeletonGrid } from '../../../components/common/Skeleton'
import { Avatar } from '../../../components/common/Avatar'
import { ExecutionTrendChart, ModuleCoverageChart, ResultDistributionChart, SeverityBarChart } from '../../../components/charts/Charts'
import { ErrorState } from '../../../components/feedback/States'
import { Alert } from '../../../components/feedback/States'
import { projectsApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useActiveProject } from '../../../context/ActiveProjectContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { formatDate, formatNumber, formatPercent, timeAgo } from '../../../utils/formatters'
import { DEFECT_STATUS, JOB_STATUS, TEST_RESULT, TEST_RUN_STATUS, SEVERITY } from '../../../utils/constants'
import { ROUTES } from '../../../utils/routes'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { activeProjectId, activeProject, isAll } = useActiveProject()
  const { can } = usePermissions()
  const [days, setDays] = useState(30)

  // The spec scopes the dashboard to a single project; the workspace-wide view
  // falls back to the project list until a cross-project route is defined.
  const fetcher = useMemo(
    () => () => (isAll ? projectsApi.list({ pageSize: 200 }) : projectsApi.dashboard(activeProjectId, { days })),
    [activeProjectId, days, isAll],
  )

  const { data, isLoading, isError, error, refetch } = useApi(fetcher, [activeProjectId, days, isAll])

  const kpis = isAll ? null : data?.kpis

  return (
    <div className="page">
      <PageHeader
        title={isAll ? 'Workspace dashboard' : `${activeProject?.name ?? 'Project'} dashboard`}
        description={
          isAll
            ? 'Aggregated QA metrics across every project you can read. Pick a project scope to narrow the numbers.'
            : 'Quality metrics for the selected project, calculated from recorded test executions and defects.'
        }
        actions={
          <>
            <div className="row-sm" role="group" aria-label="Date range">
              {RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={days === range.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDays(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <Button variant="secondary" icon={BarChart3} onClick={() => navigate(activeProjectId === 'all' ? ROUTES.projects : ROUTES.reports(activeProjectId))}>
              Reports
            </Button>
          </>
        }
      />

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data?.staleRequirements > 0 && (
        <Alert tone="warning" title={`${data.staleRequirements} requirement${data.staleRequirements === 1 ? '' : 's'} changed after the last completed run`}>
          Results recorded before that change may not reflect current behaviour. Re-execute the affected tests before
          relying on them for a release decision.
        </Alert>
      )}

      {isLoading && !data && <SkeletonGrid count={6} height={110} />}

      {kpis && (
        <div className="grid-kpi">
          <KPICard
            label="Total test cases"
            value={kpis.totalTestCases}
            icon={FileCheck2}
            footnote={isAll ? 'All projects' : activeProject?.name}
            onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.testCases(activeProjectId))}
          />
          <KPICard
            label="Executed tests"
            value={kpis.executedTests}
            icon={CheckCircle2}
            tone="success"
            footnote={`of ${formatNumber(kpis.totalExecutions)} planned`}
            onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.testRuns(activeProjectId))}
          />
          <KPICard
            label="Pass rate"
            value={kpis.passRate === null ? '—' : formatPercent(kpis.passRate)}
            icon={TrendingUp}
            tone="highlight"
            footnote={kpis.passRate === null ? 'No executions recorded' : 'Across all completed executions'}
            onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.testRuns(activeProjectId))}
          />
          <KPICard
            label="Open defects"
            value={kpis.openDefects}
            icon={Bug}
            tone="danger"
            footnote="Excludes closed, verified and deferred"
            onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.defects(activeProjectId))}
          />
          <KPICard
            label="Requirement coverage"
            value={kpis.requirementCoverage === null ? '—' : formatPercent(kpis.requirementCoverage)}
            icon={ShieldCheck}
            tone="accent"
            footnote={`${kpis.uncoveredRequirements} requirement${kpis.uncoveredRequirements === 1 ? '' : 's'} without a test case`}
            onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.reports(activeProjectId))}
          />
          <KPICard
            label="Automation coverage"
            value={formatPercent(kpis.automationCoverage, 0)}
            icon={Sparkles}
            tone="info"
            footnote="Test cases linked to an automated job"
          />
        </div>
      )}

      {isLoading && !data && <Skeleton height={260} radius="var(--radius-lg)" />}

      {data && (
        <>
          <div className="grid-2">
            <Card>
              <CardHeader
                title="Test execution trend"
                subtitle={`Recorded executions over the last ${days} days`}
                actions={
                  <Button variant="ghost" size="sm" onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.testRuns(activeProjectId))}>
                    View runs
                  </Button>
                }
              />
              <CardBody>
                <ExecutionTrendChart data={data.executionTrend} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Test status distribution" subtitle="Every recorded execution by result" />
              <CardBody>
                <ResultDistributionChart
                  data={data.resultDistribution}
                  onSegmentClick={(entry) => {
                    if (entry?.key) navigate(isAll ? ROUTES.projects : `${ROUTES.testRuns(activeProjectId)}?result=${entry.key}`)
                  }}
                />
              </CardBody>
            </Card>
          </div>

          <div className="grid-2">
            <Card>
              <CardHeader title="Open defects by severity" subtitle="Severity recorded against unresolved defects" />
              <CardBody>
                <SeverityBarChart
                  data={data.defectSeverity}
                  onBarClick={(entry) => {
                    if (entry?.key) navigate(isAll ? ROUTES.projects : `${ROUTES.defects(activeProjectId)}?severity=${entry.key}`)
                  }}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Requirement coverage by module" subtitle="Share of requirements with at least one test case" />
              <CardBody>
                <ModuleCoverageChart data={data.modules} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Quick actions"
              subtitle="Create the records you work with most often"
            />
            <CardBody>
              <div className="grid-3">
                <QuickAction
                  icon={FolderPlus}
                  title="New project"
                  description="Start a scoped QA workspace"
                  onClick={() => navigate(ROUTES.projectNew)}
                  disabled={!can('project:create')}
                />
                <QuickAction
                  icon={ListChecks}
                  title="New requirement"
                  description="Capture a verifiable requirement"
                  onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.requirements(activeProjectId))}
                  disabled={!can('requirement:write') || isAll}
                  hint={isAll ? 'Select a project scope first' : undefined}
                />
                <QuickAction
                  icon={FileCheck2}
                  title="New test case"
                  description="Author steps and expected results"
                  onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.testCaseNew(activeProjectId))}
                  disabled={!can('testCase:write') || isAll}
                  hint={isAll ? 'Select a project scope first' : undefined}
                />
                <QuickAction
                  icon={PlayCircle}
                  title="New test run"
                  description="Execute a selected set of cases"
                  onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.testRunNew(activeProjectId))}
                  disabled={!can('testRun:write') || isAll}
                  hint={isAll ? 'Select a project scope first' : undefined}
                />
                <QuickAction
                  icon={Sparkles}
                  title="AI test generator"
                  description="Draft cases from a requirement"
                  onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.aiGenerator(activeProjectId))}
                  disabled={!can('ai:generate') || isAll}
                  hint={isAll ? 'Select a project scope first' : undefined}
                />
                <QuickAction
                  icon={AlertTriangle}
                  title="Report a defect"
                  description="Record a failure with evidence"
                  onClick={() => navigate(isAll ? ROUTES.projects : ROUTES.defectNew(activeProjectId))}
                  disabled={!can('defect:write') || isAll}
                  hint={isAll ? 'Select a project scope first' : undefined}
                />
              </div>
            </CardBody>
          </Card>

          <div className="grid-2">
            <Card>
              <CardHeader
                title="Recent test runs"
                subtitle="Newest first"
                actions={
                  <Button as={Link} variant="ghost" size="sm" to={isAll ? ROUTES.projects : ROUTES.testRuns(activeProjectId)}>
                    View all
                  </Button>
                }
              />
              <CardBody flush>
                {data.recentRuns.length === 0 ? (
                  <EmptyState compact icon={PlayCircle} title="No test runs yet" description="Create a run to start recording executions." />
                ) : (
                  <div className="table-wrap">
                    <table className="table table--compact">
                      <thead>
                        <tr>
                          <th>Run</th>
                          <th>Status</th>
                          <th>Result</th>
                          <th>Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentRuns.map((run) => (
                          <tr key={run.id} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.testRun(run.id))}>
                            <td>
                              <span className="truncate" style={{ display: 'block', maxWidth: 220, fontWeight: 'var(--weight-medium)' }}>
                                {run.name}
                              </span>
                              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                                {run.environment} · {run.build}
                              </span>
                            </td>
                            <td>
                              <StatusBadge map={TEST_RUN_STATUS} value={run.status} />
                            </td>
                            <td>
                              <ResultSummary run={run} />
                            </td>
                            <td className="text-muted" style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                              {timeAgo(run.startedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Recently reported defects"
                actions={
                  <Button as={Link} variant="ghost" size="sm" to={isAll ? ROUTES.projects : ROUTES.defects(activeProjectId)}>
                    View all
                  </Button>
                }
              />
              <CardBody flush>
                {data.recentDefects.length === 0 ? (
                  <EmptyState compact icon={Bug} title="No defects reported" description="Nothing has failed in the current scope." />
                ) : (
                  <ul className="link-list" style={{ padding: 'var(--space-4)' }}>
                    {data.recentDefects.map((defect) => (
                      <li key={defect.id}>
                        <Link to={ROUTES.defect(defect.id)} className="link-tile">
                          <span className="stack-sm" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                            <span className="row-sm" style={{ gap: 6 }}>
                              <span className="mono text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                                {defect.ref}
                              </span>
                              <StatusBadge map={SEVERITY} value={defect.severity} />
                            </span>
                            <span className="truncate" style={{ fontWeight: 'var(--weight-medium)' }}>
                              {defect.title}
                            </span>
                            <span className="row-sm" style={{ gap: 6 }}>
                              <StatusBadge map={DEFECT_STATUS} value={defect.status} />
                              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                                {defect.assignee?.name ?? 'Unassigned'} · {timeAgo(defect.createdAt)}
                              </span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid-2">
            <Card>
              <CardHeader title="Project summaries" subtitle="Scoped quality metrics" />
              <CardBody flush>
                <div className="table-wrap">
                  <table className="table table--compact">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Status</th>
                        <th align="right">Pass rate</th>
                        <th align="right">Open defects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.projectSummaries.map((summary) => (
                        <tr key={summary.id} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.project(summary.id))}>
                          <td>
                            <span style={{ fontWeight: 'var(--weight-medium)' }}>{summary.name}</span>
                            <span className="text-muted" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                              {summary.metrics.testCases} test cases · {summary.metrics.requirements} requirements
                            </span>
                          </td>
                          <td>
                            <StatusBadge map={JOB_STATUS} value={summary.status} fallback={summary.status} />
                          </td>
                          <td align="right">{summary.metrics.passRate === null ? '—' : formatPercent(summary.metrics.passRate)}</td>
                          <td align="right">{summary.metrics.openDefects}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent activity" subtitle="Latest recorded events in scope" />
              <CardBody>
                {data.activity.length === 0 ? (
                  <EmptyState compact icon={Activity} title="No activity yet" />
                ) : (
                  <ol className="timeline">
                    {data.activity.map((item) => (
                      <li key={item.id} className="timeline__item">
                        <span className="timeline__marker">
                          <Avatar name={item.actor?.name} email={item.actor?.email} size="sm" />
                        </span>
                        <span className="timeline__line" aria-hidden="true" />
                        <div className="timeline__body">
                          <p className="timeline__title">
                            <strong>{item.actor?.name ?? 'A member'}</strong> {item.message}
                          </p>
                          <p className="timeline__meta">
                            {formatDate(item.createdAt, 'd MMM yyyy, HH:mm')} · {timeAgo(item.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function QuickAction({ icon: Icon, title, description, onClick, disabled, hint }) {
  return (
    <button type="button" className="link-tile" onClick={onClick} disabled={disabled} style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
      <span className="kpi__icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <span className="link-tile__body">
        <span style={{ fontWeight: 'var(--weight-medium)' }}>{title}</span>
        <span className="card__subtitle">{hint ?? description}</span>
      </span>
      <Plus size={15} aria-hidden="true" />
    </button>
  )
}

function ResultSummary({ run }) {
  const { pass, fail, blocked, not_run: notRun } = run.summary
  return (
    <span className="row-sm" style={{ gap: 6, fontSize: 'var(--text-xs)' }}>
      <StatusBadge map={TEST_RESULT} value="pass" /> <span>{pass}</span>
      <StatusBadge map={TEST_RESULT} value="fail" /> <span>{fail}</span>
      {blocked > 0 && (
        <>
          <StatusBadge map={TEST_RESULT} value="blocked" /> <span>{blocked}</span>
        </>
      )}
      {notRun > 0 && <span className="text-muted">+{notRun} not run</span>}
    </span>
  )
}

