import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bot,
  Bug,
  FileCheck2,
  GitPullRequestArrow,
  ListChecks,
  PlayCircle,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader, Stat } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { StatusBadge, Progress } from '../../../components/common/Badge'
import { Avatar } from '../../../components/common/Avatar'
import { KPICard } from '../../../components/common/KPICard'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { ErrorState } from '../../../components/feedback/States'
import { Alert } from '../../../components/feedback/States'
import { projectsApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { usePermissions } from '../../../context/PermissionsContext'
import { formatDate, formatNumber, formatPercent, timeAgo } from '../../../utils/formatters'
import { DEFECT_STATUS, MEMBERSHIP_ROLE, PROJECT_STATUS, SEVERITY, TEST_RESULT, TEST_RUN_STATUS } from '../../../utils/constants'
import { ROUTES } from '../../../utils/routes'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const fetcher = useMemo(() => () => projectsApi.get(projectId), [projectId])
  const { data, isLoading, isError, error, refetch } = useApi(fetcher, [projectId])

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="page">
        <PageHeader title="Project" />
        <Skeleton height={120} radius="var(--radius-lg)" />
        <Skeleton height={280} radius="var(--radius-lg)" />
      </div>
    )
  }

  const { project, metrics, recentRuns, openDefects, activity } = data

  return (
    <div className="page">
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <>
            <StatusBadge map={PROJECT_STATUS} value={project.status} />
            <Button variant="secondary" icon={Users} onClick={() => navigate(ROUTES.members)}>
              Members
            </Button>
            {can('project:edit') && (
              <Button variant="secondary" icon={Settings} onClick={() => navigate(ROUTES.projectSettings(project.id))}>
                Settings
              </Button>
            )}
          </>
        }
      />

      {project.status === 'archived' && (
        <Alert tone="warning" title="This project is archived">
          Archived projects are read-only. Existing requirements, runs and reports remain available for reference.
        </Alert>
      )}

      {data.staleRequirements > 0 && (
        <Alert tone="warning" title={`${data.staleRequirements} requirement${data.staleRequirements === 1 ? '' : 's'} changed after the last completed run`}>
          Coverage figures below are calculated from test cases, not from verification status. Review the affected
          requirements before relying on these numbers.
        </Alert>
      )}

      <div className="grid-kpi">
        <KPICard label="Test cases" value={metrics.testCases} icon={FileCheck2} footnote={`${metrics.approvedTestCases} approved`} onClick={() => navigate(ROUTES.testCases(project.id))} />
        <KPICard
          label="Pass rate"
          value={metrics.passRate === null ? '—' : formatPercent(metrics.passRate)}
          icon={PlayCircle}
          tone="success"
          footnote={`${formatNumber(metrics.executed)} executions`}
          onClick={() => navigate(ROUTES.testRuns(project.id))}
        />
        <KPICard
          label="Requirement coverage"
          value={metrics.requirementCoverage === null ? '—' : formatPercent(metrics.requirementCoverage)}
          icon={ListChecks}
          tone="accent"
          footnote={`${metrics.uncoveredRequirements} uncovered`}
          onClick={() => navigate(ROUTES.requirements(project.id))}
        />
        <KPICard
          label="Open defects"
          value={metrics.openDefects}
          icon={Bug}
          tone="danger"
          footnote={`${metrics.criticalDefects} critical or high`}
          onClick={() => navigate(ROUTES.defects(project.id))}
        />
        <KPICard
          label="Automation coverage"
          value={formatPercent(metrics.automationCoverage, 0)}
          icon={Bot}
          tone="info"
          footnote="Test cases linked to a job"
          onClick={() => navigate(ROUTES.automation(project.id))}
        />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader
            title="QA metrics"
            subtitle="Calculated from recorded executions and defect state"
          />
          <CardBody className="stack">
            <div className="stack-sm" style={{ gap: 6 }}>
              <div className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
                <span>Requirement coverage</span>
                <strong>{metrics.requirementCoverage === null ? '—' : formatPercent(metrics.requirementCoverage)}</strong>
              </div>
              <Progress
                value={metrics.requirementCoverage ?? 0}
                tone={metrics.requirementCoverage >= 80 ? 'success' : 'warning'}
                label="Requirement coverage"
              />
              <span className="field__hint">
                {metrics.requirements} requirements · {metrics.uncoveredRequirements} without any test case
              </span>
            </div>

            <div className="stack-sm" style={{ gap: 6 }}>
              <div className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
                <span>Automation coverage</span>
                <strong>{formatPercent(metrics.automationCoverage, 0)}</strong>
              </div>
              <Progress value={metrics.automationCoverage} tone="highlight" label="Automation coverage" />
              <span className="field__hint">Share of test cases mapped to an automated job</span>
            </div>

            <hr className="divider" />

            <div className="stat-row">
              <Stat label="Runs" value={formatNumber(metrics.runs)} />
              <Stat label="Active runs" value={formatNumber(metrics.activeRuns)} />
              <Stat label="Executions" value={formatNumber(metrics.executions)} />
              <Stat label="Open defects" value={formatNumber(metrics.openDefects)} />
            </div>

            <div className="row-wrap">
              <Button variant="secondary" size="sm" icon={Sparkles} onClick={() => navigate(ROUTES.aiGenerator(project.id))} disabled={!can('ai:generate')}>
                AI generator
              </Button>
              <Button variant="secondary" size="sm" icon={GitPullRequestArrow} onClick={() => navigate(ROUTES.regression(project.id))}>
                Regression planner
              </Button>
              <Button variant="secondary" size="sm" icon={BarChart3} onClick={() => navigate(ROUTES.reports(project.id))}>
                Reports
              </Button>
              <Button variant="secondary" size="sm" icon={ShieldAlert} onClick={() => navigate(ROUTES.releaseReadiness(project.id))}>
                Release readiness
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Team" subtitle={`${project.memberCount} member${project.memberCount === 1 ? '' : 's'}`} />
          <CardBody flush>
            <ul className="link-list" style={{ padding: 'var(--space-3)' }}>
              {project.members.map((member) => (
                <li key={member.id}>
                  <Link to={ROUTES.members} className="link-tile">
                    <Avatar name={member.name} email={member.email} />
                    <span className="link-tile__body">
                      <span className="row-between">
                        <span style={{ fontWeight: 'var(--weight-medium)' }}>{member.name}</span>
                        <StatusBadge map={MEMBERSHIP_ROLE} value={member.role} />
                      </span>
                      <span className="card__subtitle">
                        {member.title} · {member.email}
                      </span>
                    </span>
                    {project.ownerId === member.id && <span className="badge badge--accent">Owner</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader
            title="Recent test runs"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.testRuns(project.id))}>
                View all
              </Button>
            }
          />
          <CardBody flush>
            {recentRuns.length === 0 ? (
              <EmptyState compact icon={PlayCircle} title="No test runs yet" description="Create a run to start recording executions." />
            ) : (
              <ul className="link-list" style={{ padding: 'var(--space-4)' }}>
                {recentRuns.map((run) => (
                  <li key={run.id}>
                    <Link to={ROUTES.testRun(projectId, run.id)} className="link-tile">
                      <span className="link-tile__body">
                        <span className="row-between">
                          <span className="truncate" style={{ fontWeight: 'var(--weight-medium)' }}>
                            {run.name}
                          </span>
                          <StatusBadge map={TEST_RUN_STATUS} value={run.status} />
                        </span>
                        <span className="row-sm card__subtitle" style={{ gap: 8 }}>
                          <span className="row-sm" style={{ gap: 4 }}>
                            <StatusBadge map={TEST_RESULT} value="pass" dot={false} /> {run.summary.pass}
                          </span>
                          <span className="row-sm" style={{ gap: 4 }}>
                            <StatusBadge map={TEST_RESULT} value="fail" dot={false} /> {run.summary.fail}
                          </span>
                          <span className="row-sm" style={{ gap: 4 }}>
                            <StatusBadge map={TEST_RESULT} value="not_run" dot={false} /> {run.summary.not_run}
                          </span>
                        </span>
                        <span className="card__subtitle">
                          {run.environment} · {run.build} · {timeAgo(run.startedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Open defects"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTES.defects(project.id)}?openOnly=true`)}>
                View all
              </Button>
            }
          />
          <CardBody flush>
            {openDefects.length === 0 ? (
              <EmptyState compact icon={Bug} title="No open defects" description="Nothing is currently unresolved in this project." />
            ) : (
              <ul className="link-list" style={{ padding: 'var(--space-4)' }}>
                {openDefects.map((defect) => (
                  <li key={defect.id}>
                    <Link to={ROUTES.defect(projectId, defect.id)} className="link-tile">
                      <span className="link-tile__body">
                        <span className="row-between">
                          <span className="truncate" style={{ fontWeight: 'var(--weight-medium)' }}>
                            {defect.title}
                          </span>
                          <StatusBadge map={SEVERITY} value={defect.severity} />
                        </span>
                        <span className="row-sm card__subtitle" style={{ gap: 8 }}>
                          <span className="mono">{defect.ref}</span>
                          <StatusBadge map={DEFECT_STATUS} value={defect.status} />
                          <span>{defect.assignee?.name ?? 'Unassigned'}</span>
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

      <Card>
        <CardHeader title="Project activity" subtitle="Most recent recorded events" />
        <CardBody>
          {activity.length === 0 ? (
            <EmptyState compact icon={Activity} title="No activity recorded" />
          ) : (
            <ol className="timeline">
              {activity.map((item) => (
                <li key={item.id} className="timeline__item">
                  <span className="timeline__marker">
                    <Activity size={14} aria-hidden="true" />
                  </span>
                  <span className="timeline__line" aria-hidden="true" />
                  <div className="timeline__body">
                    <p className="timeline__title">{item.message}</p>
                    <p className="timeline__meta">{formatDate(item.createdAt, 'd MMM yyyy, HH:mm')}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
