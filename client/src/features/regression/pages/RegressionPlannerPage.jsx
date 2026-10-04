import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GitPullRequestArrow, Info, Play, Route, Save, ShieldQuestion } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Badge, StatusBadge } from '../../../components/common/Badge'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { Input } from '../../../components/forms/FormControls'
import { regressionApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { CONFIDENCE, REGRESSION_IMPACT, REQUIREMENT_STATUS, TEST_RESULT } from '../../../utils/constants'
import { regressionSuiteSchema } from '../../../utils/schemas'
import { formatDateTime, formatNumber, timeAgo } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

export function RegressionPlannerPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [selected, setSelected] = useState({})
  const [suiteName, setSuiteName] = useState('')
  const [saving, setSaving] = useState(false)

  const plansFetcher = useMemo(() => () => regressionApi.plans(projectId), [projectId])
  const {
    data: plans,
    isLoading,
    isError,
    error,
    refetch,
  } = useApi(plansFetcher, [projectId])

  const firstPlan = plans?.items?.[0]
  const activeId = firstPlan?.id

  const detailFetcher = useMemo(
    () => () => regressionApi.plan(projectId, activeId),
    [projectId, activeId],
  )
  const {
    data: plan,
    isLoading: isDetailLoading,
    error: detailError,
  } = useApi(detailFetcher, [projectId, activeId], { immediate: Boolean(activeId) })

  const recommendations = plan?.recommendations ?? []
  const selectedIds = recommendations.filter((item) => selected[item.id]).map((item) => item.testCaseId)
  const impactCounts = recommendations.reduce((accumulator, item) => {
    accumulator[item.impact] = (accumulator[item.impact] ?? 0) + 1
    return accumulator
  }, {})

  const saveSuite = async () => {
    const parsed = regressionSuiteSchema.safeParse({ name: suiteName || `Regression — ${plan?.name}`, testCaseIds: selectedIds })
    if (!parsed.success) {
      toast.error('Could not create the regression run', parsed.error.issues[0]?.message)
      return
    }

    setSaving(true)
    try {
      await regressionApi.createPlan(projectId, parsed.data)
      toast.success(
        'Regression run ready',
        `${parsed.data.testCaseIds.length} recommended test cases selected. Create a run to execute them.`,
      )
      navigate(`${ROUTES.testRunNew(projectId)}?testCaseIds=${parsed.data.testCaseIds.join(',')}`)
    } catch (caught) {
      toast.error('Could not save the selection', caught?.message)
    } finally {
      setSaving(false)
    }
  }

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Regression Planner"
        description="Recommendations are produced by the TestPilot recommendation service from change-set dependencies. Review each one before adding it to a run."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Save}
              onClick={saveSuite}
              loading={saving}
              disabled={selectedIds.length === 0 || !can('testRun:write')}
            >
              Create run from selection
            </Button>
            <Button icon={Play} onClick={() => navigate(ROUTES.reports(projectId))}>
              Coverage report
            </Button>
          </>
        }
      />

      {isLoading && (
        <Card>
          <CardBody className="stack">
            <Skeleton height={80} />
            <Skeleton height={240} />
          </CardBody>
        </Card>
      )}

      {!isLoading && !plans?.items?.length && (
        <Card>
          <CardBody flush>
            <EmptyState
              icon={GitPullRequestArrow}
              title="No regression plans yet"
              description="Create a plan from a base run and selected requirements to get recommended test cases to re-run."
            />
          </CardBody>
        </Card>
      )}

      {plans?.items?.length > 0 && (
        <>
          <div className="grid-3">
            {plans.items.map((entry) => (
              <Card key={entry.id} interactive={entry.id === activeId}>
                <CardBody className="stack-sm" style={{ gap: 6 }}>
                  <div className="row-between">
                    <h2 className="card__title">{entry.name}</h2>
                    {entry.id === activeId && <Badge tone="accent">Selected</Badge>}
                  </div>
                  <span className="card__subtitle">
                    {entry.module ?? 'Plan'} · {entry.requirements?.length ?? 0} changed requirement
                    {entry.requirements?.length === 1 ? '' : 's'}
                  </span>
                  <div className="row-sm" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {(entry.requirements ?? []).map((requirement) => (
                      <Link key={requirement.id} to={ROUTES.requirement(requirement.id)} className="badge badge--neutral mono">
                        {requirement.ref}
                      </Link>
                    ))}
                  </div>
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {formatNumber(entry.recommendationCount)} recommendations · {timeAgo(entry.createdAt)} ·{' '}
                    {entry.createdBy?.name ?? 'Unknown'}
                  </span>
                </CardBody>
              </Card>
            ))}
          </div>

          {detailError && <ErrorState error={detailError} compact />}

          <Card>
            <CardHeader
              title="Recommended test cases"
              subtitle={`${recommendations.length} suggestions · ${selectedIds.length} selected`}
              actions={
                <div className="row-sm" style={{ gap: 6 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelected(
                        recommendations.reduce((accumulator, item) => ({ ...accumulator, [item.id]: true }), {}),
                      )
                    }
                  >
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
                    Clear
                  </Button>
                </div>
              }
            />
            <CardBody className="stack">
              <Alert tone="info" icon={Info}>
                {plan?.sourceNote ??
                  'Recommendations come from the recommendation service and include the reason and dependency path behind each suggestion.'}
              </Alert>

              <div className="row-sm" style={{ gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(REGRESSION_IMPACT).map(([key, entry]) => (
                  <Badge key={key} tone={entry.tone}>
                    {entry.label}: {impactCounts[key] ?? 0}
                  </Badge>
                ))}
              </div>

              {isDetailLoading && <Skeleton height={220} />}

              <div className="stack-sm">
                {recommendations.map((recommendation) => {
                  const checked = Boolean(selected[recommendation.id])
                  return (
                    <label key={recommendation.id} className="link-tile" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected((current) => ({ ...current, [recommendation.id]: !current[recommendation.id] }))
                        }
                        style={{ accentColor: 'var(--accent)', marginTop: 4 }}
                        aria-label={`Include ${recommendation.testCase?.ref ?? 'test case'}`}
                      />
                      <span className="link-tile__body">
                        <span className="row-sm" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                            {recommendation.testCase?.ref}
                          </span>
                          <StatusBadge map={REGRESSION_IMPACT} value={recommendation.impact} />
                          <StatusBadge map={CONFIDENCE} value={recommendation.confidence} />
                          {recommendation.previousResult && (
                            <StatusBadge
                              map={TEST_RESULT}
                              value={recommendation.previousResult}
                              fallback={`Last: ${recommendation.previousResult}`}
                            />
                          )}
                        </span>
                        <span style={{ fontWeight: 'var(--weight-medium)' }}>
                          {recommendation.testCase?.title ?? 'Test case removed'}
                        </span>
                        <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                          {recommendation.reason}
                        </span>
                        <span className="row-sm" style={{ gap: 6, flexWrap: 'wrap' }}>
                          {(recommendation.viaPaths ?? []).map((path) => (
                            <span key={path} className="badge badge--neutral">
                              <Route size={11} aria-hidden="true" />
                              {path}
                            </span>
                          ))}
                        </span>
                        {recommendation.previousRun && (
                          <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                            Last executed in{' '}
                            <Link to={ROUTES.testRun(recommendation.previousRun.id)}>
                              {recommendation.previousRun.name}
                            </Link>{' '}
                            {recommendation.previousExecutedAt
                              ? `on ${formatDateTime(recommendation.previousExecutedAt)}`
                              : ''}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>

              {recommendations.length === 0 && !isDetailLoading && (
                <EmptyState
                  compact
                  icon={ShieldQuestion}
                  title="No recommendations"
                  description="The recommendation service did not return any test cases for this change set."
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Changed requirements in this change set" />
            <CardBody className="stack-sm">
              <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                Requirements updated after the baseline run. These drive the recommendations above.
              </p>
              {(plan?.requirements ?? []).map((requirement) => (
                <Link key={requirement.id} to={ROUTES.requirement(requirement.id)} className="link-tile">
                  <span className="workspace-selector__mark" aria-hidden="true" style={{ fontSize: 9 }}>
                    REQ
                  </span>
                  <span className="link-tile__body">
                    <span className="row-sm" style={{ gap: 8 }}>
                      <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                        {requirement.ref}
                      </span>
                      <StatusBadge map={REQUIREMENT_STATUS} value={requirement.status} />
                    </span>
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{requirement.title}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {requirement.module} · updated {timeAgo(requirement.updatedAt)}
                    </span>
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          {can('testRun:write') && (
            <Card>
              <CardBody className="row-between" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div className="stack-sm" style={{ gap: 4 }}>
                  <h2 className="card__title">Save the selection as a regression run</h2>
                  <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                    {selectedIds.length} test case{selectedIds.length === 1 ? '' : 's'} selected. You will be taken to the
                    run form with these cases pre-selected.
                  </p>
                </div>
                <div className="row-sm">
                  <Input
                    value={suiteName}
                    onChange={(event) => setSuiteName(event.target.value)}
                    placeholder="Regression suite name"
                    aria-label="Regression suite name"
                    style={{ minWidth: 220 }}
                  />
                  <Button icon={Play} onClick={saveSuite} loading={saving} disabled={selectedIds.length === 0}>
                    Continue to run
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}