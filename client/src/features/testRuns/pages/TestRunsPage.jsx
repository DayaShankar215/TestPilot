import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Ban,
  Check,
  CircleSlash,
  Clock,
  FileText,
  Play,
  Plus,
  Square,
  X,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Progress, StatusBadge } from '../../../components/common/Badge'
import { Avatar } from '../../../components/common/Avatar'
import { EmptyState } from '../../../components/common/EmptyState'
import { Modal, ConfirmDialog } from '../../../components/common/Overlay'
import { Skeleton } from '../../../components/common/Skeleton'
import { DataTable } from '../../../components/tables/DataTable'
import { FilterToolbar } from '../../../components/tables/FilterToolbar'
import { Pagination } from '../../../components/common/Pagination'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { FormField, Input, Select, Textarea } from '../../../components/forms/FormControls'
import { MultiSelect } from '../../../components/forms/MultiSelect'
import { testRunsApi, testCasesApi, defectsApi, usersApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useTableQuery } from '../../../hooks/useTableQuery'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import {
  ENVIRONMENT,
  TEST_RESULT,
  TEST_RUN_STATUS,
} from '../../../utils/constants'
import { executionResultSchema, testRunSchema } from '../../../utils/schemas'
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  timeAgo,
  titleCase,
} from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

const SCOPES = [
  { value: 'smoke', label: 'Smoke', description: 'Fast checks on the critical path' },
  { value: 'targeted', label: 'Targeted', description: 'Cases chosen for a specific change' },
  { value: 'regression', label: 'Regression', description: 'Full regression suite' },
  { value: 'full', label: 'Full', description: 'Every test case in the project' },
]

function ResultSelector({ value, onChange, name = 'result' }) {
  return (
    <div className="row-sm" role="radiogroup" aria-label="Execution result">
      {Object.entries(TEST_RESULT).map(([key, entry]) => {
        const active = value === key
        const Icon = key === 'pass' ? Check : key === 'fail' ? X : key === 'blocked' ? Ban : CircleSlash
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            name={name}
            className="btn btn--secondary btn--sm"
            style={active ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
            onClick={() => onChange(key)}
          >
            <Icon size={14} aria-hidden="true" />
            {entry.label}
          </button>
        )
      })}
    </div>
  )
}

export function TestRunsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()

  const table = useTableQuery({
    defaultPageSize: 15,
    defaultSortBy: 'startedAt',
    defaultSortDir: 'desc',
    filters: {
      status: searchParams.get('status') ?? '',
      scope: searchParams.get('scope') ?? '',
      environment: searchParams.get('environment') ?? '',
    },
  })

  const debouncedSearch = useDebounce(table.search)

  const fetcher = useMemo(
    () => () => testRunsApi.list(projectId, { ...table.params, search: debouncedSearch || undefined }),
    [projectId, table.params, debouncedSearch],
  )

  const { data, isLoading, isError, error, refetch } = useApi(fetcher, [
    projectId,
    debouncedSearch,
    JSON.stringify(table.filters),
    table.page,
    table.pageSize,
    table.sortBy,
    table.sortDir,
  ])

  const filters = [
    {
      key: 'status',
      label: 'All statuses',
      value: table.filters.status ?? '',
      options: Object.entries(TEST_RUN_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
    },
    {
      key: 'scope',
      label: 'All scopes',
      value: table.filters.scope ?? '',
      options: SCOPES.map((scope) => ({ value: scope.value, label: scope.label })),
    },
    {
      key: 'environment',
      label: 'All environments',
      value: table.filters.environment ?? '',
      options: Object.entries(ENVIRONMENT).map(([value, entry]) => ({ value, label: entry.label })),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Test Runs"
        description="Grouped executions of test cases against a release and build. Results feed coverage, defects and release readiness."
        actions={
          <Button
            icon={Plus}
            onClick={() => navigate(ROUTES.testRunNew(projectId))}
            disabled={!can('testRun:write')}
          >
            New test run
          </Button>
        }
      />

      <FilterToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by run name, release or build"
        filters={filters}
        onFilterChange={table.updateFilter}
        onReset={table.resetFilters}
        hasActiveFilters={table.hasActiveFilters}
      />

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {isLoading && !data && (
        <Card>
          <CardBody flush>
            <Skeleton height={320} />
          </CardBody>
        </Card>
      )}

      {data && (
        <Card>
          <DataTable
            caption="Test runs"
            sortKey={table.sortBy}
            sortDir={table.sortDir}
            columns={[
              {
                key: 'name',
                header: 'Run',
                sortable: true,
                sortKey: 'name',
                onSort: table.toggleSort,
                render: (row) => (
                  <div className="stack-sm" style={{ gap: 3 }}>
                    <Link to={ROUTES.testRun(projectId, row.id)} style={{ fontWeight: 'var(--weight-medium)' }}>
                      {row.name}
                    </Link>
                    <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {row.release} Â· {row.build} Â· {ENVIRONMENT[row.environment]?.label ?? row.environment} Â·{' '}
                      {titleCase(row.scope)}
                    </span>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                sortKey: 'status',
                onSort: table.toggleSort,
                width: 130,
                render: (row) => <StatusBadge map={TEST_RUN_STATUS} value={row.status} />,
              },
              {
                key: 'progress',
                header: 'Progress',
                width: 180,
                render: (row) => (
                  <div className="stack-sm" style={{ gap: 4 }}>
                    <Progress
                      value={row.summary?.progress ?? 0}
                      label={`${row.summary?.executed ?? 0} of ${row.summary?.total ?? 0} executions recorded`}
                    />
                    <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                      {formatNumber(row.summary?.executed ?? 0)}/{formatNumber(row.summary?.total ?? 0)} executed
                    </span>
                  </div>
                ),
              },
              {
                key: 'results',
                header: 'Pass / Fail',
                width: 160,
                render: (row) => (
                  <div className="stack-sm" style={{ gap: 2 }}>
                    <span className="row-sm" style={{ gap: 6, fontSize: 'var(--text-xs)' }}>
                      <span style={{ color: 'var(--success)' }}>{row.summary?.pass ?? 0} pass</span>
                      <span className="text-muted">Â·</span>
                      <span style={{ color: 'var(--danger)' }}>{row.summary?.fail ?? 0} fail</span>
                      {row.summary?.blocked > 0 && (
                        <span style={{ color: 'var(--warning)' }}>Â· {row.summary.blocked} blocked</span>
                      )}
                    </span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                      {row.summary?.passRate === null || row.summary?.passRate === undefined
                        ? 'No results yet'
                        : `${formatPercent(row.summary.passRate)} pass rate`}
                    </span>
                  </div>
                ),
              },
              {
                key: 'assignee',
                header: 'Assignee',
                width: 170,
                render: (row) => (
                  <span className="row-sm" style={{ gap: 8 }}>
                    <Avatar name={row.assignee?.name} email={row.assignee?.email} size="sm" />
                    <span className="truncate" style={{ maxWidth: 110 }}>
                      {row.assignee?.name ?? 'Unassigned'}
                    </span>
                  </span>
                ),
              },
              {
                key: 'startedAt',
                header: 'Started',
                sortable: true,
                sortKey: 'startedAt',
                onSort: table.toggleSort,
                width: 130,
                render: (row) => (
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {row.startedAt ? timeAgo(row.startedAt) : 'Not started'}
                  </span>
                ),
              },
            ]}
            rows={data.items}
            onRowClick={(row) => navigate(ROUTES.testRun(projectId, row.id))}
            empty={
              <EmptyState
                icon={Play}
                title={table.hasActiveFilters ? 'No test runs match these filters' : 'No test runs yet'}
                description={
                  table.hasActiveFilters
                    ? 'Try a different search term or clear the filters.'
                    : 'Create a run to start recording execution results.'
                }
                action={table.hasActiveFilters ? table.resetFilters : undefined}
                actionLabel="Clear filters"
              />
            }
          />

          <Pagination
            meta={data.meta}
            page={table.page}
            pageSize={table.pageSize}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            itemLabel="test runs"
          />
        </Card>
      )}
    </div>
  )
}

export function TestRunFormPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedCaseIds, setSelectedCaseIds] = useState(
    searchParams.get('testCaseIds')?.split(',').filter(Boolean) ?? [],
  )

  const casesFetcher = useMemo(() => () => testCasesApi.list(projectId, { pageSize: 100, sortBy: 'ref' }), [projectId])
  const { data: caseData } = useApi(casesFetcher, [projectId])

  const usersFetcher = useMemo(() => () => usersApi.list({ pageSize: 100 }), [])
  const { data: users } = useApi(usersFetcher, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(testRunSchema),
    defaultValues: {
      name: '',
      release: '',
      build: '',
      environment: 'qa',
      assigneeId: '',
      scope: 'targeted',
    },
  })

  const scope = watch('scope')

  const selectAllVisible = () => setSelectedCaseIds((caseData?.items ?? []).map((item) => item.id))

  const onSubmit = async (values) => {
    setSaving(true)
    setApiError(null)
    try {
      const created = await testRunsApi.create(projectId, { ...values, testCaseIds: selectedCaseIds })
      toast.success('Test run created', `${created.name} is ready to execute.`)
      navigate(ROUTES.testRun(projectId, created.id))
    } catch (error) {
      setApiError(error)
      toast.error('Could not create test run', error?.message)
    } finally {
      setSaving(false)
    }
  }

  if (!can('testRun:write')) {
    return (
      <div className="page">
        <Alert tone="info" title="Read-only access">
          Your role can view test runs but cannot create them.
        </Alert>
      </div>
    )
  }

  const formErrors = errors
  const selectedMissing = selectedCaseIds.length === 0

  return (
    <div className="page">
      <PageHeader
        title="New test run"
        description="Select the test cases to execute and record results against a release and build."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(ROUTES.testRuns(projectId))}>
              Cancel
            </Button>
            <Button type="submit" form="test-run-form" loading={saving}>
              Create run
            </Button>
          </>
        }
      />

      {apiError && <Alert tone="danger">{apiError.message}</Alert>}

      <form id="test-run-form" className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader title="Run details" />
          <CardBody className="stack">
            <FormField label="Run name" htmlFor="run-name" required error={formErrors.name?.message}>
              <Input id="run-name" placeholder="Sprint 24 regression" invalid={Boolean(formErrors.name)} {...register('name')} />
            </FormField>

            <div className="grid-2">
              <FormField label="Release" htmlFor="run-release" required error={formErrors.release?.message}>
                <Input id="run-release" placeholder="2026.3.0" invalid={Boolean(formErrors.release)} {...register('release')} />
              </FormField>
              <FormField label="Build" htmlFor="run-build" required error={formErrors.build?.message}>
                <Input id="run-build" placeholder="build-4821" invalid={Boolean(formErrors.build)} {...register('build')} />
              </FormField>
              <FormField label="Environment" htmlFor="run-environment" required error={formErrors.environment?.message}>
                <Select id="run-environment" {...register('environment')}>
                  {Object.entries(ENVIRONMENT).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Assignee" htmlFor="run-assignee" required error={formErrors.assigneeId?.message}>
                <Select id="run-assignee" {...register('assigneeId')}>
                  <option value="">Select an assignee</option>
                  {(users ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Scope" required error={formErrors.scope?.message}>
              <div className="row-sm" style={{ gap: 8, flexWrap: 'wrap' }}>
                {SCOPES.map((entry) => (
                  <Button
                    key={entry.value}
                    type="button"
                    variant={scope === entry.value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setValue('scope', entry.value, { shouldValidate: true })}
                    title={entry.description}
                  >
                    {entry.label}
                  </Button>
                ))}
              </div>
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Test cases"
            subtitle={`${selectedCaseIds.length} selected`}
            actions={
              <Button variant="ghost" size="sm" onClick={selectAllVisible} type="button">
                Select all on this page
              </Button>
            }
          />
          <CardBody className="stack">
            <MultiSelect
              label="Cases to include"
              options={(caseData?.items ?? []).map((item) => ({
                value: item.id,
                label: `${item.ref} â€” ${item.title}`,
              }))}
              value={selectedCaseIds}
              onChange={setSelectedCaseIds}
              placeholder="Select at least one test case"
              emptyLabel="This project has no test cases yet."
              invalid={selectedMissing && Boolean(formErrors.testCaseIds)}
            />
            {selectedMissing && (
              <Alert tone="warning">
                Select at least one test case so the run has something to execute.
              </Alert>
            )}
          </CardBody>
        </Card>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate(ROUTES.testRuns(projectId))} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={selectedMissing}>
            Create run
          </Button>
        </div>
      </form>
    </div>
  )
}

export function TestRunDetailPage() {
  const { projectId, runId } = useParams()
  const toast = useToast()
  const { can } = usePermissions()
  const [activeExecution, setActiveExecution] = useState(null)
  const [aborting, setAborting] = useState(false)

  const fetcher = useMemo(() => () => testRunsApi.get(projectId, runId), [projectId, runId])
  const { data: run, isLoading, isError, error, refetch, setData } = useApi(fetcher, [projectId, runId])

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !run) {
    return (
      <div className="page">
        <Skeleton height={140} radius="var(--radius-lg)" />
        <Skeleton height={340} radius="var(--radius-lg)" />
      </div>
    )
  }

  const summary = run.summary ?? {}
  const pending = run.executions.filter((item) => item.result === 'not_run')
  const canExecute = can('testRun:write') && run.status !== 'aborted'

  const startRun = async () => {
    try {
      const updated = await testRunsApi.update(projectId, runId, { status: 'in_progress' })
      setData(updated)
      toast.success('Run started', 'Recording results will now mark the run as in progress.')
    } catch (caught) {
      toast.error('Could not start run', caught?.message)
    }
  }

  const completeRun = async () => {
    try {
      const updated = await testRunsApi.update(projectId, runId, { status: 'completed' })
      setData(updated)
      toast.success('Run completed', 'Results are now included in coverage and reports.')
    } catch (caught) {
      toast.error('Could not complete run', caught?.message)
    }
  }

  const abortRun = async () => {
    setAborting(false)
    try {
      const updated = await testRunsApi.update(projectId, runId, { status: 'aborted' })
      setData(updated)
      toast.warning('Run aborted', 'Remaining executions were not recorded.')
    } catch (caught) {
      toast.error('Could not abort run', caught?.message)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={run.name}
        description={`${run.release} Â· ${run.build} Â· ${ENVIRONMENT[run.environment]?.label ?? run.environment} Â· ${titleCase(run.scope)} scope`}
        actions={
          <>
            <StatusBadge map={TEST_RUN_STATUS} value={run.status} />
            {run.status === 'planned' && can('testRun:write') && (
              <Button icon={Play} onClick={startRun}>
                Start run
              </Button>
            )}
            {run.status === 'in_progress' && can('testRun:write') && (
              <Button icon={Check} onClick={completeRun}>
                Complete run
              </Button>
            )}
            {run.status !== 'completed' && can('testRun:write') && (
              <Button variant="ghost" icon={Square} onClick={() => setAborting(true)}>
                Abort
              </Button>
            )}
          </>
        }
      />

      {run.status === 'aborted' && (
        <Alert tone="warning" title="This run was aborted">
          Executions that were never recorded are still marked as not run. Start a new run if you need to continue.
        </Alert>
      )}

      {pending.length > 0 && run.status === 'in_progress' && (
        <Alert tone="info" icon={Clock}>
          {pending.length} execution{pending.length === 1 ? '' : 's'} still to record.
        </Alert>
      )}

      <div className="kpi-grid">
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Progress</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatNumber(summary.executed ?? 0)}/{formatNumber(summary.total ?? 0)}
            </span>
            <Progress value={summary.progress ?? 0} label="Executions recorded" />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Pass rate</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {summary.passRate === null || summary.passRate === undefined ? 'â€”' : formatPercent(summary.passRate)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {summary.previousCounts ? 'Compared with the previous run of this scope' : 'No comparable previous run'}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Failures</span>
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              {formatNumber(summary.fail ?? 0)}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {summary.blocked ? `${summary.blocked} blocked` : 'None blocked'}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Assignee</span>
            <span className="row-sm" style={{ gap: 8 }}>
              <Avatar name={run.assignee?.name} email={run.assignee?.email} size="sm" />
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{run.assignee?.name ?? 'Unassigned'}</span>
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {run.startedAt ? `Started ${formatDateTime(run.startedAt)}` : 'Not started yet'}
            </span>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Executions" subtitle="Record a result for each test case" />
        <CardBody flush>
          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Executions for this test run</caption>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Reference</th>
                  <th>Test case</th>
                  <th style={{ width: 120 }}>Result</th>
                  <th style={{ width: 150 }}>Executed</th>
                  <th style={{ width: 190 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {run.executions.map((execution) => (
                  <tr key={execution.id}>
                    <td>
                      <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                        {execution.testCase?.ref}
                      </span>
                    </td>
                    <td>
                      {execution.testCase ? (
                        <Link to={ROUTES.testCase(projectId, execution.testCase.id)}>{execution.testCase.title}</Link>
                      ) : (
                        <span className="text-muted">Test case removed</span>
                      )}
                      {execution.notes && (
                        <p className="text-muted" style={{ fontSize: 'var(--text-xs)', margin: '4px 0 0' }}>
                          {execution.notes}
                        </p>
                      )}
                    </td>
                    <td>
                      <StatusBadge map={TEST_RESULT} value={execution.result} />
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {execution.executedAt ? timeAgo(execution.executedAt) : 'â€”'}
                      </span>
                    </td>
                    <td>
                      <div className="row-sm" style={{ gap: 6 }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!canExecute}
                          onClick={() => setActiveExecution(execution)}
                        >
                          {execution.result === 'not_run' ? 'Record' : 'Update'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <ExecutionModal
        runId={runId}
        projectId={run.projectId}
        execution={activeExecution}
        onClose={() => setActiveExecution(null)}
        onSaved={(updated) => {
          setData(updated)
          setActiveExecution(null)
          toast.success('Result recorded', 'The run summary has been updated.')
        }}
      />

      <ConfirmDialog
        isOpen={aborting}
        onClose={() => setAborting(false)}
        onConfirm={abortRun}
        variant="danger"
        title="Abort this test run?"
        description="Remaining executions stay marked as not run."
        confirmLabel="Abort run"
      >
        <p className="text-secondary">
          Aborted runs are kept for the audit trail but are excluded from completed-run metrics. You can start a new run
          at any time.
        </p>
      </ConfirmDialog>
    </div>
  )
}

function ExecutionModal({ runId, projectId, execution, onClose, onSaved }) {
  const [result, setResult] = useState('not_run')
  const [actualResult, setActualResult] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const open = Boolean(execution)

  useEffect(() => {
    if (execution) {
      setResult(execution.result ?? 'not_run')
      setActualResult(execution.actualResult ?? '')
      setNotes(execution.notes ?? '')
      setError(null)
    }
  }, [execution])

  const parsed = executionResultSchema.safeParse({ result, actualResult, notes })

  const save = async () => {
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setSaving(true)
    try {
      const updated = await testRunsApi.updateResult(execution.id, parsed.data)
      onSaved(updated)
    } catch (caught) {
      setError(caught?.message)
    } finally {
      setSaving(false)
    }
  }

  const raiseDefect = async () => {
    if (!execution?.testCase) return
    try {
      const created = await defectsApi.create(projectId, {
        title: execution.testCase.title,
        description: parsed.data.actualResult || 'Raised from a failed execution.',
        reproductionSteps: (execution.testCase.steps ?? []).map((step) => step.action),
        expectedResult: execution.testCase.steps?.[0]?.expectedResult ?? 'Documented behaviour',
        actualResult: parsed.data.actualResult || 'See execution notes',
        severity: 'high',
        priority: 'high',
        assigneeId: null,
        requirementId: execution.testCase.requirementIds?.[0] ?? null,
        testCaseId: execution.testCase.id,
      })
      toast.success('Defect raised', `${created.ref} created and linked to this execution.`)
    } catch (caught) {
      toast.error('Could not raise defect', caught?.message)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={execution ? `Record result â€” ${execution.testCase?.ref ?? ''}` : 'Record result'}
      description={execution?.testCase?.title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {result === 'fail' && (
            <Button variant="highlight" icon={AlertTriangle} onClick={raiseDefect} disabled={saving}>
              Raise defect
            </Button>
          )}
          <Button onClick={save} loading={saving}>
            Save result
          </Button>
        </>
      }
    >
      {execution && (
        <div className="stack">
          {execution.testCase?.preconditions && (
            <div className="stack-sm" style={{ gap: 4 }}>
              <span className="stat__label">Preconditions</span>
              <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                {execution.testCase.preconditions}
              </p>
            </div>
          )}

          <div className="stack-sm" style={{ gap: 4 }}>
            <span className="stat__label">Steps</span>
            <ol className="step-list">
              {(execution.testCase?.steps ?? []).map((step, index) => (
                <li key={step.id ?? index} className="step-card">
                  <span className="step-card__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="step-card__body">
                    <p>{step.action}</p>
                    <p className="text-muted">{step.expectedResult}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <hr className="divider" />

          <FormField label="Result" required>
            <ResultSelector value={result} onChange={setResult} />
          </FormField>

          <FormField
            label="Actual result"
            htmlFor="execution-actual"
            required={result === 'fail'}
            error={error && result === 'fail' ? error : undefined}
            hint="Required when marking a failure so a developer can reproduce it."
          >
            <Textarea
              id="execution-actual"
              rows={3}
              value={actualResult}
              onChange={(event) => setActualResult(event.target.value)}
              placeholder="What actually happened, including any error message."
            />
          </FormField>

          <FormField label="Notes" htmlFor="execution-notes" error={error && result === 'blocked' ? error : undefined}>
            <Textarea
              id="execution-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Environment issues, blockers, follow-up actions."
            />
          </FormField>

          {error && !['fail', 'blocked'].includes(result) && (
            <Alert tone="danger">{error}</Alert>
          )}

          <p className="text-muted row-sm" style={{ gap: 6, fontSize: 'var(--text-xs)' }}>
            <FileText size={13} aria-hidden="true" />
            Results feed requirement coverage, defect counts and release readiness.
          </p>
        </div>
      )}
    </Modal>
  )
}