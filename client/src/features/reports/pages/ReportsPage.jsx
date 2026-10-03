import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, BarChart3, Download, FileWarning, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Progress, StatusBadge } from '../../../components/common/Badge'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { DataTable } from '../../../components/tables/DataTable'
import { Alert, ErrorState } from '../../../components/feedback/States'
import {
  PassRateTrendChart,
  ResultDistributionChart,
  SeverityBarChart,
} from '../../../components/charts/Charts'
import { reportsApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { PRIORITY, REQUIREMENT_STATUS, SEVERITY, TEST_RESULT } from '../../../utils/constants'
import { downloadCsv, formatDateTime, formatNumber, formatPercent, titleCase } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

const CRITERIA_TONE = {
  pass: 'success',
  fail: 'danger',
  unknown: 'neutral',
}

const CRITERIA_LABEL = {
  pass: 'Met',
  fail: 'Not met',
  unknown: 'Not evaluated',
}

const WEIGHT_LABEL = {
  blocking: 'Blocking',
  warning: 'Warning',
  informational: 'Informational',
}

export function ReportsPage() {
  const { projectId } = useParams()
  const toast = useToast()
  const { can } = usePermissions()

  const summaryFetcher = useMemo(() => () => reportsApi.summary(projectId), [projectId])
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useApi(summaryFetcher, [projectId])

  const coverageFetcher = useMemo(() => () => reportsApi.coverage(projectId), [projectId])
  const { data: coverage, isLoading: coverageLoading } = useApi(coverageFetcher, [projectId])

  const agingFetcher = useMemo(() => () => reportsApi.defectAging(projectId), [projectId])
  const { data: aging, isLoading: agingLoading } = useApi(agingFetcher, [projectId])

  const exportCoverage = () => {
    downloadCsv(`${summary?.project?.name ?? 'project'}-coverage`, coverage?.rows ?? [], [
      { label: 'Reference', value: (row) => row.ref },
      { label: 'Title', value: (row) => row.title },
      { label: 'Module', value: (row) => row.module },
      { label: 'Priority', value: (row) => row.priority },
      { label: 'Status', value: (row) => row.status },
      { label: 'Test cases', value: (row) => row.testCaseCount },
      { label: 'Approved test cases', value: (row) => row.approvedTestCases },
      { label: 'Covered', value: (row) => (row.covered ? 'Yes' : 'No') },
    ])
    toast.success('Coverage exported', 'The CSV matches the filters shown on this page.')
  }

  const exportDefects = () => {
    downloadCsv(`${summary?.project?.name ?? 'project'}-defect-aging`, aging?.rows ?? [], [
      { label: 'Reference', value: (row) => row.ref },
      { label: 'Title', value: (row) => row.title },
      { label: 'Severity', value: (row) => row.severity },
      { label: 'Priority', value: (row) => row.priority },
      { label: 'Status', value: (row) => row.status },
      { label: 'Assignee', value: (row) => row.assignee },
      { label: 'Age (days)', value: (row) => row.ageDays },
      { label: 'Days to resolve', value: (row) => row.timeToResolveDays ?? '' },
    ])
    toast.success('Defect aging exported', 'Open defects and mean time to resolve are included.')
  }

  if (summaryError) {
    return (
      <div className="page">
        <ErrorState error={summaryError} />
      </div>
    )
  }

  const latestRun = summary?.execution?.byRun?.find((run) => run.status === 'completed')
  const passRate = latestRun?.summary?.passRate

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        description="Execution trends, requirement coverage and defect aging for this project."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={exportCoverage}
              disabled={!can('report:export') || !coverage}
            >
              Export coverage
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              onClick={exportDefects}
              disabled={!can('report:export') || !aging}
            >
              Export defects
            </Button>
            <Button as={Link} to={ROUTES.releaseReadiness(projectId)} icon={ShieldCheck}>
              Release readiness
            </Button>
          </>
        }
      />

      <div className="kpi-grid">
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Requirement coverage</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatPercent(coverage?.totals?.coveragePercent ?? 0)}
            </span>
            <Progress value={coverage?.totals?.coveragePercent ?? 0} label="Requirements with at least one test case" />
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {formatNumber(coverage?.totals?.uncovered ?? 0)} of {formatNumber(coverage?.totals?.requirements ?? 0)}{' '}
              requirements uncovered
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Latest run pass rate</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {passRate === null || passRate === undefined ? '—' : formatPercent(passRate)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {latestRun ? latestRun.name : 'No completed run yet'}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Open defects</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatNumber(aging?.totals?.open ?? 0)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {aging?.totals?.meanTimeToResolve
                ? `Mean time to resolve ${aging.totals.meanTimeToResolve} days`
                : 'No resolved defects yet'}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Executions recorded</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatNumber(summary?.execution?.totalExecutions ?? 0)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {formatNumber(summary?.regression?.executions ?? 0)} in regression runs
            </span>
          </CardBody>
        </Card>
      </div>

      <div className="grid-2">
        <Card>
          <CardHeader title="Pass rate by run" subtitle="Every recorded run, newest first" />
          <CardBody>
            {summaryLoading ? (
              <Skeleton height={260} />
            ) : (summary?.execution?.byRun?.length ?? 0) === 0 ? (
              <EmptyState compact icon={BarChart3} title="No runs yet" description="Create a test run to populate this chart." />
            ) : (
              <PassRateTrendChart
                data={summary.execution.byRun.map((run) => ({
                  label: run.name.length > 20 ? `${run.name.slice(0, 20)}…` : run.name,
                  passRate: run.summary.passRate ?? 0,
                }))}
                height={260}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Result mix" subtitle="All recorded executions" />
          <CardBody>
            {summaryLoading ? (
              <Skeleton height={260} />
            ) : (summary?.execution?.byEnvironment?.length ?? 0) === 0 ? (
              <EmptyState compact icon={BarChart3} title="No results yet" description="Record execution results to see the mix." />
            ) : (
              <ResultDistributionChart
                data={summary.execution.byEnvironment.map((entry) => ({
                  key: entry.key,
                  name: TEST_RESULT[entry.key]?.label ?? titleCase(entry.key),
                  value: entry.value,
                }))}
                height={240}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Requirement coverage" subtitle="Coverage is derived from requirement to test case links" />
        <CardBody flush>
          {coverageLoading ? (
            <CardBody>
              <Skeleton height={260} />
            </CardBody>
          ) : (
            <DataTable
              caption="Requirement coverage"
              compact
              columns={[
                {
                  key: 'ref',
                  header: 'Reference',
                  width: 110,
                  render: (row) => (
                    <Link to={ROUTES.requirement(row.id)} className="mono">
                      {row.ref}
                    </Link>
                  ),
                },
                { key: 'title', header: 'Requirement', render: (row) => row.title },
                { key: 'module', header: 'Module', width: 150 },
                {
                  key: 'priority',
                  header: 'Priority',
                  width: 110,
                  render: (row) => <StatusBadge map={PRIORITY} value={row.priority} />,
                },
                {
                  key: 'status',
                  header: 'Status',
                  width: 120,
                  render: (row) => <StatusBadge map={REQUIREMENT_STATUS} value={row.status} />,
                },
                {
                  key: 'testCaseCount',
                  header: 'Cases',
                  width: 110,
                  align: 'right',
                  render: (row) => (
                    <span className="row-sm" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {formatNumber(row.testCaseCount)}
                      {row.approvedTestCases > 0 && (
                        <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                          ({row.approvedTestCases} approved)
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'covered',
                  header: 'Coverage',
                  width: 120,
                  render: (row) =>
                    row.covered ? (
                      <StatusBadge map={{ covered: { label: 'Covered', tone: 'success' } }} value="covered" />
                    ) : (
                      <StatusBadge map={{ uncovered: { label: 'Uncovered', tone: 'danger' } }} value="uncovered" />
                    ),
                },
              ]}
              rows={coverage?.rows ?? []}
              empty={
                <EmptyState
                  icon={AlertTriangle}
                  title="No requirements to measure"
                  description="Add requirements and link test cases to them to report coverage."
                />
              }
            />
          )}
        </CardBody>
      </Card>

      <div className="grid-2">
        <Card>
          <CardHeader title="Defect aging" subtitle="Open defects by age" />
          <CardBody>
            {agingLoading ? (
              <Skeleton height={240} />
            ) : (
              <SeverityBarChart
                data={(aging?.aging ?? []).map((bucket) => ({
                  key: bucket.key,
                  label: bucket.label,
                  value: bucket.total,
                }))}
                height={240}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Open defects by severity" subtitle="Open versus total" />
          <CardBody>
            {agingLoading ? (
              <Skeleton height={240} />
            ) : (
              <SeverityBarChart
                data={(aging?.bySeverity ?? []).map((entry) => ({
                  key: entry.key,
                  label: SEVERITY[entry.key]?.label ?? titleCase(entry.key),
                  value: entry.open,
                }))}
                height={240}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export function ReleaseReadinessPage() {
  const { projectId } = useParams()
  const [showUnknown, setShowUnknown] = useState(true)

  const fetcher = useMemo(() => () => reportsApi.releaseReadiness(projectId), [projectId])
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
        <Skeleton height={140} radius="var(--radius-lg)" />
        <Skeleton height={320} radius="var(--radius-lg)" />
      </div>
    )
  }

  const criteria = data.criteria ?? []
  const blocking = criteria.filter((item) => item.weight === 'blocking')
  const blockingFailures = blocking.filter((item) => item.status === 'fail')
  const evaluated = criteria.filter((item) => item.status !== 'unknown')
  const metCount = evaluated.filter((item) => item.status === 'pass').length
  const visibleCriteria = showUnknown ? criteria : criteria.filter((item) => item.status !== 'unknown')

  return (
    <div className="page">
      <PageHeader
        title="Release readiness"
        description={`${data.project.name} · ${data.project.release} · ${titleCase(data.project.environment)}`}
        actions={
          <Button as={Link} to={ROUTES.reports(projectId)} icon={BarChart3}>
            Back to reports
          </Button>
        }
      />

      <Alert tone="warning" title="Decision support, not a verdict">
        {data.disclaimer}
      </Alert>

      {blockingFailures.length > 0 ? (
        <Alert tone="danger" title={`${blockingFailures.length} blocking criteria not met`}>
          {blockingFailures.map((item) => item.label).join(' · ')}
        </Alert>
      ) : (
        <Alert tone="success" title="No blocking criteria unmet">
          Review the remaining criteria and evidence before deciding.
        </Alert>
      )}

      <div className="kpi-grid">
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Criteria met</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {metCount}/{evaluated.length}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {criteria.length - evaluated.length} not evaluated yet
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Pass rate</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {data.counts.passRate === null ? '—' : formatPercent(data.counts.passRate)}
            </span>
            <Progress value={data.counts.passRate ?? 0} label="Latest pass rate" />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Requirement coverage</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatPercent(data.counts.requirementCoverage)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {formatNumber(data.counts.uncoveredRequirements)} uncovered
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Open defects</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatNumber(data.counts.openDefects)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Generated {formatDateTime(data.generatedAt)}
            </span>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Release criteria"
          subtitle="Each criterion shows the observed evidence behind its status"
          actions={
            <label className="row-sm" style={{ gap: 6, fontSize: 'var(--text-sm)' }}>
              <input
                type="checkbox"
                checked={showUnknown}
                onChange={(event) => setShowUnknown(event.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Show criteria without evidence
            </label>
          }
        />
        <CardBody flush>
          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Release criteria</caption>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 150 }}>Weight</th>
                  <th>Criterion</th>
                  <th>Observed</th>
                </tr>
              </thead>
              <tbody>
                {visibleCriteria.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <StatusBadge
                        map={Object.fromEntries(
                          Object.entries(CRITERIA_LABEL).map(([key, label]) => [key, { label, tone: CRITERIA_TONE[key] }]),
                        )}
                        value={item.status}
                        fallback={CRITERIA_LABEL[item.status]}
                      />
                    </td>
                    <td>
                      <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                        {WEIGHT_LABEL[item.weight] ?? item.weight}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'var(--weight-medium)' }}>{item.label}</td>
                    <td className="text-secondary">{item.observed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid-2">
        <Card>
          <CardHeader title="Uncovered requirements" subtitle="No linked test case" />
          <CardBody className="stack-sm">
            {data.uncoveredRequirements?.length ? (
              data.uncoveredRequirements.map((requirement) => (
                <Link key={requirement.id} to={ROUTES.requirement(requirement.id)} className="link-tile">
                  <span className="workspace-selector__mark" aria-hidden="true" style={{ fontSize: 9 }}>
                    REQ
                  </span>
                  <span className="link-tile__body">
                    <span className="row-sm" style={{ gap: 8 }}>
                      <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                        {requirement.ref}
                      </span>
                      <StatusBadge map={PRIORITY} value={requirement.priority} />
                    </span>
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{requirement.title}</span>
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState compact icon={ShieldCheck} title="Every requirement has a test case" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Changed after the last run" subtitle="Requirements frozen criterion" />
          <CardBody className="stack-sm">
            {data.requirementsChangedAfterRun?.length ? (
              data.requirementsChangedAfterRun.map((requirement) => (
                <Link key={requirement.id} to={ROUTES.requirement(requirement.id)} className="link-tile">
                  <span className="workspace-selector__mark" aria-hidden="true" style={{ fontSize: 9 }}>
                    REQ
                  </span>
                  <span className="link-tile__body">
                    <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                      {requirement.ref}
                    </span>
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{requirement.title}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      Updated {formatDateTime(requirement.updatedAt)}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState compact icon={ShieldCheck} title="No requirement changed after the last run" />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Open defects by severity" />
        <CardBody>
          <div className="row-sm" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(data.openDefectBreakdown ?? []).map((entry) => (
              <div key={entry.key} className="stat" style={{ minWidth: 140 }}>
                <span className="stat__label">{SEVERITY[entry.key]?.label ?? titleCase(entry.key)}</span>
                <span className="stat__value">{entry.count}</span>
              </div>
            ))}
          </div>
          {data.openDefectBreakdown?.every((entry) => entry.count === 0) && (
            <p className="row-sm text-muted" style={{ gap: 6, fontSize: 'var(--text-sm)', marginTop: 12 }}>
              <FileWarning size={14} aria-hidden="true" />
              No open defects recorded in this project.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}