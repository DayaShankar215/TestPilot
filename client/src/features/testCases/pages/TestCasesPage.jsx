import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bot, Copy, FileCheck2, Link2, Pencil, Play, Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Badge, Progress, StatusBadge } from '../../../components/common/Badge'
import { Avatar } from '../../../components/common/Avatar'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { Tabs, TabPanel } from '../../../components/common/Tabs'
import { DataTable } from '../../../components/tables/DataTable'
import { FilterToolbar } from '../../../components/tables/FilterToolbar'
import { Pagination } from '../../../components/common/Pagination'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { FormField, Input, Select, Textarea } from '../../../components/forms/FormControls'
import { MultiSelect } from '../../../components/forms/MultiSelect'
import { StepEditor, TestDataEditor } from '../../../components/forms/Editors'
import { testCasesApi, requirementsApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useTableQuery } from '../../../hooks/useTableQuery'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { PRIORITY, REQUIREMENT_STATUS, TEST_CASE_STATUS, TEST_CASE_TYPE, TEST_RESULT } from '../../../utils/constants'
import { testCaseSchema } from '../../../utils/schemas'
import { formatDate, formatNumber, timeAgo, titleCase } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

export function TestCasesPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState([])

  const table = useTableQuery({
    defaultPageSize: 15,
    defaultSortBy: 'updatedAt',
    defaultSortDir: 'desc',
    filters: {
      status: searchParams.get('status') ?? '',
      requirementId: searchParams.get('requirementId') ?? '',
    },
  })

  const debouncedSearch = useDebounce(table.search)

  const fetcher = useMemo(
    () => () => testCasesApi.list(projectId, { ...table.params, search: debouncedSearch || undefined }),
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
      options: Object.entries(TEST_CASE_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
    },
    {
      key: 'type',
      label: 'All types',
      value: table.filters.type ?? '',
      options: Object.entries(TEST_CASE_TYPE).map(([value, entry]) => ({ value, label: entry.label })),
    },
    {
      key: 'priority',
      label: 'All priorities',
      value: table.filters.priority ?? '',
      options: Object.entries(PRIORITY).map(([value, entry]) => ({ value, label: entry.label })),
    },
    {
      key: 'module',
      label: 'All modules',
      value: table.filters.module ?? '',
      options: [
        ...new Set((data?.items ?? []).map((item) => item.module).filter(Boolean)),
      ]
        .sort()
        .map((value) => ({ value, label: value })),
    },
  ]

  const addSelectionToRun = () => {
    navigate(`${ROUTES.testRunNew(projectId)}?testCaseIds=${selected.join(',')}`)
  }

  return (
    <div className="page">
      <PageHeader
        title="Test Cases"
        description="Ordered steps with expected results. Each case links to the requirement it verifies so coverage can be measured."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Play}
              onClick={addSelectionToRun}
              disabled={selected.length === 0 || !can('testRun:write')}
            >
              {selected.length > 0 ? `Add ${selected.length} to a run` : 'Add to a run'}
            </Button>
            <Button
              variant="secondary"
              icon={Sparkles}
              onClick={() => navigate(ROUTES.aiGenerator(projectId))}
              disabled={!can('ai:generate')}
            >
              AI generator
            </Button>
            <Button icon={Plus} onClick={() => navigate(ROUTES.testCaseNew(projectId))} disabled={!can('testCase:write')}>
              New test case
            </Button>
          </>
        }
      />

      <FilterToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by reference or title"
        filters={filters}
        onFilterChange={table.updateFilter}
        onReset={table.resetFilters}
        hasActiveFilters={table.hasActiveFilters}
      />

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {isLoading && !data && (
        <Card>
          <CardBody flush>
            <Skeleton height={380} />
          </CardBody>
        </Card>
      )}

      {data && (
        <Card>
          {selected.length > 0 && (
            <div
              className="toolbar"
              style={{ border: 0, borderBottom: '1px solid var(--border-subtle)', borderRadius: 0 }}
            >
              <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                {selected.length} test case{selected.length === 1 ? '' : 's'} selected on this page
              </span>
              <div className="spacer" />
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear selection
              </Button>
              <Button size="sm" icon={Play} onClick={addSelectionToRun} disabled={!can('testRun:write')}>
                Add to test run
              </Button>
            </div>
          )}

          <DataTable
            selectable
            selectedIds={selected}
            onSelectionChange={setSelected}
            sortKey={table.sortBy}
            sortDir={table.sortDir}
            caption="Test cases"
            columns={[
              {
                key: 'ref',
                header: 'Reference',
                sortable: true,
                sortKey: 'ref',
                onSort: table.toggleSort,
                width: 110,
                render: (row) => (
                  <span className="mono" style={{ fontWeight: 'var(--weight-medium)' }}>
                    {row.ref}
                  </span>
                ),
              },
              {
                key: 'title',
                header: 'Title',
                sortable: true,
                sortKey: 'title',
                onSort: table.toggleSort,
                render: (row) => (
                  <div className="stack-sm" style={{ gap: 3 }}>
                    <Link to={ROUTES.testCase(projectId, row.id)} style={{ fontWeight: 'var(--weight-medium)' }}>
                      {row.title}
                    </Link>
                    <span className="row-sm" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {row.requirements?.map((requirement) => (
                        <Badge key={requirement.id} tone="accent" icon={Link2}>
                          {requirement.ref}
                        </Badge>
                      ))}
                      {row.automated && <Badge tone="highlight" icon={Bot}>Automated</Badge>}
                    </span>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                sortable: true,
                sortKey: 'type',
                onSort: table.toggleSort,
                width: 120,
                render: (row) => titleCase(row.type),
              },
              {
                key: 'priority',
                header: 'Priority',
                sortable: true,
                sortKey: 'priority',
                onSort: table.toggleSort,
                width: 110,
                render: (row) => <StatusBadge map={PRIORITY} value={row.priority} />,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                sortKey: 'status',
                onSort: table.toggleSort,
                width: 120,
                render: (row) => <StatusBadge map={TEST_CASE_STATUS} value={row.status} />,
              },
              {
                key: 'lastResult',
                header: 'Last result',
                width: 130,
                render: (row) =>
                  row.lastResult ? (
                    <span className="stack-sm" style={{ gap: 2 }}>
                      <StatusBadge map={TEST_RESULT} value={row.lastResult} />
                      <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                        {timeAgo(row.lastExecutedAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted">Never run</span>
                  ),
              },
              {
                key: 'updatedAt',
                header: 'Updated',
                sortable: true,
                sortKey: 'updatedAt',
                onSort: table.toggleSort,
                width: 120,
                render: (row) => (
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {timeAgo(row.updatedAt)}
                  </span>
                ),
              },
            ]}
            rows={data.items}
            onRowClick={(row) => navigate(ROUTES.testCase(projectId, row.id))}
            empty={
              <EmptyState
                icon={FileCheck2}
                title={table.hasActiveFilters ? 'No test cases match these filters' : 'No test cases yet'}
                description={
                  table.hasActiveFilters
                    ? 'Try a different search term or clear the filters.'
                    : 'Author your first test case, or generate suggestions from a requirement.'
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
            itemLabel="test cases"
          />
        </Card>
      )}
    </div>
  )
}

export function TestCaseFormPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'functional',
      priority: 'medium',
      status: 'draft',
      module: '',
      requirementIds: [],
      preconditions: '',
      testData: [],
      steps: [{ action: '', expectedResult: '' }],
    },
  })

  const requirementsFetcher = useMemo(
    () => () => requirementsApi.list(projectId, { pageSize: 100, sortBy: 'ref' }),
    [projectId],
  )
  const { data: requirementData } = useApi(requirementsFetcher, [projectId])

  const presetRequirementId = searchParams.get('requirementId')

  useEffect(() => {
    if (presetRequirementId) setValue('requirementIds', [presetRequirementId])
  }, [presetRequirementId, setValue])

  if (!can('testCase:write')) {
    return (
      <div className="page">
        <Alert tone="info" title="Read-only access">
          Your role can view test cases but cannot create or edit them.
        </Alert>
      </div>
    )
  }

  const steps = watch('steps')
  const testData = watch('testData')

  const onSubmit = async (values) => {
    setSaving(true)
    setApiError(null)
    try {
      const created = await testCasesApi.create(projectId, values)
      toast.success('Test case created', `${created.ref} saved as ${titleCase(created.status)}.`)
      navigate(ROUTES.testCase(projectId, created.id))
    } catch (error) {
      setApiError(error)
      toast.error('Could not create test case', error?.message)
    } finally {
      setSaving(false)
    }
  }

  const stepErrors = Object.entries(errors).reduce((accumulator, [key, value]) => {
    if (key.startsWith('steps') && value?.message) {
      accumulator[key.replace(/^steps\.?/, 'steps.')] = value.message
    }
    return accumulator
  }, {})

  return (
    <div className="page">
      <PageHeader
        title="New test case"
        description="Add ordered steps with an expected result for each. Link the case to the requirement it verifies."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(ROUTES.testCases(projectId))}>
              Cancel
            </Button>
            <Button type="submit" form="test-case-form" loading={saving}>
              Create test case
            </Button>
          </>
        }
      />

      {apiError && <Alert tone="danger">{apiError.message}</Alert>}

      <form id="test-case-form" className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader title="Test case details" />
          <CardBody className="stack">
            <FormField label="Title" htmlFor="tc-title" required error={errors.title?.message}>
              <Input
                id="tc-title"
                placeholder="Verify login rejects an unverified account"
                invalid={Boolean(errors.title)}
                {...register('title')}
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="tc-description"
              error={errors.description?.message}
              hint="Context a new tester needs before running this case."
            >
              <Textarea
                id="tc-description"
                rows={3}
                placeholder="What this case covers and which dependencies it relies on."
                invalid={Boolean(errors.description)}
                {...register('description')}
              />
            </FormField>

            <div className="grid-2">
              <FormField label="Type" htmlFor="tc-type" required error={errors.type?.message}>
                <Select id="tc-type" {...register('type')}>
                  {Object.entries(TEST_CASE_TYPE).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Priority" htmlFor="tc-priority" required error={errors.priority?.message}>
                <Select id="tc-priority" {...register('priority')}>
                  {Object.entries(PRIORITY).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Status" htmlFor="tc-status" required error={errors.status?.message}>
                <Select id="tc-status" {...register('status')}>
                  {Object.entries(TEST_CASE_STATUS).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Module" htmlFor="tc-module" required error={errors.module?.message}>
                <Input
                  id="tc-module"
                  placeholder="Authentication"
                  invalid={Boolean(errors.module)}
                  {...register('module')}
                />
              </FormField>
            </div>

            <MultiSelect
              label="Linked requirements"
              options={(requirementData?.items ?? []).map((requirement) => ({
                value: requirement.id,
                label: `${requirement.ref} — ${requirement.title}`,
              }))}
              value={watch('requirementIds')}
              onChange={(next) => setValue('requirementIds', next, { shouldValidate: true })}
              placeholder="Link requirements to measure coverage"
              emptyLabel="This project has no requirements yet."
              invalid={Boolean(errors.requirementIds)}
            />
            {typeof errors.requirementIds?.message === 'string' && (
              <span className="field__error" role="alert">
                {errors.requirementIds.message}
              </span>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preconditions and data" />
          <CardBody className="stack">
            <FormField label="Preconditions" htmlFor="tc-preconditions" error={errors.preconditions?.message}>
              <Textarea
                id="tc-preconditions"
                rows={3}
                placeholder="Test accounts, seeded data and feature flags that must be set first."
                invalid={Boolean(errors.preconditions)}
                {...register('preconditions')}
              />
            </FormField>

            <TestDataEditor rows={testData} onChange={(next) => setValue('testData', next)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Steps" subtitle="Executed in the order shown" />
          <CardBody className="stack">
            <StepEditor
              steps={steps}
              onChange={(next) => setValue('steps', next, { shouldValidate: true })}
              errors={stepErrors}
            />
            {typeof errors.steps?.message === 'string' && (
              <span className="field__error" role="alert">
                {errors.steps.message}
              </span>
            )}
          </CardBody>
        </Card>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => reset()} disabled={saving}>
            Reset form
          </Button>
          <Button type="submit" loading={saving}>
            Create test case
          </Button>
        </div>
      </form>
    </div>
  )
}

export function TestCaseDetailPage() {
  const { projectId, testCaseId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [tab, setTab] = useState('steps')
  const [busy, setBusy] = useState(false)

  const fetcher = useMemo(() => () => testCasesApi.get(projectId, testCaseId), [projectId, testCaseId])
  const { data: testCase, isLoading, isError, error, refetch } = useApi(fetcher, [projectId, testCaseId])

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !testCase) {
    return (
      <div className="page">
        <Skeleton height={140} radius="var(--radius-lg)" />
        <Skeleton height={340} radius="var(--radius-lg)" />
      </div>
    )
  }

  const duplicate = async () => {
    setBusy(true)
    try {
      const copy = await testCasesApi.clone(projectId, testCaseId)
      toast.success('Test case duplicated', `${copy.ref} created as a draft.`)
      navigate(ROUTES.testCase(projectId, copy.id))
    } catch (caught) {
      toast.error('Could not duplicate test case', caught?.message)
    } finally {
      setBusy(false)
    }
  }

  const deprecate = async () => {
    setBusy(true)
    try {
      await testCasesApi.deprecate(projectId, testCaseId)
      toast.success('Test case deprecated', 'It stays available for historical results but will not appear in new runs.')
      refetch()
    } catch (caught) {
      toast.error('Could not deprecate test case', caught?.message)
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'steps', label: 'Steps', count: testCase.steps.length },
    { id: 'requirements', label: 'Requirements', count: testCase.requirements.length },
    { id: 'revisions', label: 'Revisions', count: testCase.revisions?.length ?? 1 },
  ]

  return (
    <div className="page">
      <PageHeader
        title={testCase.title}
        description={`${testCase.ref} · ${testCase.module} · revision ${testCase.revision}`}
        actions={
          <>
            <StatusBadge map={TEST_CASE_STATUS} value={testCase.status} />
            <StatusBadge map={PRIORITY} value={testCase.priority} />
            <Button
              variant="secondary"
              icon={Copy}
              onClick={duplicate}
              loading={busy}
              disabled={!can('testCase:write')}
            >
              Duplicate
            </Button>
            {testCase.status !== 'deprecated' && (
              <Button variant="ghost" onClick={deprecate} disabled={!can('testCase:write') || busy}>
                Deprecate
              </Button>
            )}
          </>
        }
      />

      {testCase.status === 'deprecated' && (
        <Alert tone="warning" title="This test case is deprecated">
          Deprecated cases stay visible for historical results but should not be added to new runs.
        </Alert>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardBody>
            <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Test case sections" />
            <div style={{ paddingTop: 'var(--space-5)' }}>
              <TabPanel id="steps" activeId={tab}>
                <div className="stack">
                  {testCase.description && (
                    <div className="stack-sm" style={{ gap: 4 }}>
                      <h2 className="section__title">Description</h2>
                      <p className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                        {testCase.description}
                      </p>
                    </div>
                  )}

                  {testCase.preconditions && (
                    <div className="stack-sm" style={{ gap: 4 }}>
                      <h2 className="section__title">Preconditions</h2>
                      <p className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                        {testCase.preconditions}
                      </p>
                    </div>
                  )}

                  {testCase.testData?.length > 0 && (
                    <div className="stack-sm" style={{ gap: 4 }}>
                      <h2 className="section__title">Test data</h2>
                      <dl className="definition-list">
                        {testCase.testData.map((row) => (
                          <div key={row.name} style={{ display: 'contents' }}>
                            <dt>{row.name}</dt>
                            <dd className="mono">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  <hr className="divider" />

                  <h2 className="section__title">Steps</h2>
                  <ol className="step-list">
                    {testCase.steps.map((step, index) => (
                      <li key={step.id ?? index} className="step-card">
                        <span className="step-card__number" aria-hidden="true">
                          {index + 1}
                        </span>
                        <div className="step-card__body">
                          <div className="stack-sm" style={{ gap: 2 }}>
                            <span className="stat__label">Action</span>
                            <p>{step.action}</p>
                          </div>
                          <div className="stack-sm" style={{ gap: 2 }}>
                            <span className="stat__label">Expected result</span>
                            <p>{step.expectedResult}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </TabPanel>

              <TabPanel id="requirements" activeId={tab}>
                <div className="stack">
                  <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                    Requirements this case verifies. Requirement coverage is measured from these links.
                  </p>
                  {testCase.requirements.length === 0 ? (
                    <EmptyState
                      compact
                      icon={Link2}
                      title="No requirements linked"
                      description="Link at least one requirement so this case contributes to coverage."
                    />
                  ) : (
                    <div className="link-list">
                      {testCase.requirements.map((requirement) => (
                        <Link key={requirement.id} to={ROUTES.requirement(requirement.id)} className="link-tile">
                          <span className="workspace-selector__mark" aria-hidden="true" style={{ fontSize: 9 }}>
                            REQ
                          </span>
                          <span className="link-tile__body">
                            <span className="row-sm" style={{ gap: 8 }}>
                              <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                                {requirement.ref}
                              </span>
                              <StatusBadge
                                map={REQUIREMENT_STATUS}
                                value={requirement.status}
                                fallback={titleCase(requirement.status)}
                              />
                            </span>
                            <span style={{ fontWeight: 'var(--weight-medium)' }}>{requirement.title}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </TabPanel>

              <TabPanel id="revisions" activeId={tab}>
                <div className="stack">
                  <Alert tone="info">
                    Execution history refers to the revision that was current at the time of the run.
                  </Alert>
                  <ol className="timeline">
                    {[...(testCase.revisions ?? [])].reverse().map((entry) => (
                      <li key={`${entry.revision}-${entry.changedAt}`} className="timeline__item">
                        <span className="timeline__marker">
                          <Pencil size={13} aria-hidden="true" />
                        </span>
                        <span className="timeline__line" aria-hidden="true" />
                        <div className="timeline__body">
                          <p className="timeline__title">
                            <strong>Revision {entry.revision}</strong> — {entry.summary}
                          </p>
                          <p className="timeline__meta">{formatDate(entry.changedAt, 'd MMM yyyy, HH:mm')}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </TabPanel>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="stack">
            <dl className="definition-list">
              <dt>Reference</dt>
              <dd className="mono">{testCase.ref}</dd>
              <dt>Type</dt>
              <dd>{titleCase(testCase.type)}</dd>
              <dt>Priority</dt>
              <dd>
                <StatusBadge map={PRIORITY} value={testCase.priority} />
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge map={TEST_CASE_STATUS} value={testCase.status} />
              </dd>
              <dt>Module</dt>
              <dd>{testCase.module}</dd>
              <dt>Author</dt>
              <dd className="row-sm" style={{ gap: 8 }}>
                <Avatar name={testCase.author?.name} email={testCase.author?.email} size="sm" />
                {testCase.author?.name ?? 'Unknown'}
              </dd>
              <dt>Steps</dt>
              <dd>{formatNumber(testCase.steps.length)}</dd>
              <dt>Last result</dt>
              <dd>
                {testCase.lastResult ? (
                  <StatusBadge map={TEST_RESULT} value={testCase.lastResult} />
                ) : (
                  'Never executed'
                )}
              </dd>
              <dt>Last run</dt>
              <dd>{testCase.lastExecutedAt ? timeAgo(testCase.lastExecutedAt) : '—'}</dd>
              <dt>Automation</dt>
              <dd>{testCase.automated ? 'Linked to an automated job' : 'Manual only'}</dd>
              <dt>Created</dt>
              <dd>{formatDate(testCase.createdAt)}</dd>
              <dt>Updated</dt>
              <dd>{formatDate(testCase.updatedAt, 'd MMM yyyy, HH:mm')}</dd>
            </dl>

            {typeof testCase.regression === 'object' && testCase.regression !== null && (
              <div className="stack-sm" style={{ gap: 6 }}>
                <span className="stat__label">Coverage contribution</span>
                <Progress value={100} label="Linked requirements covered by this case" />
              </div>
            )}

            <hr className="divider" />

            <Button
              block
              icon={Play}
              onClick={() => navigate(ROUTES.testRunNew(projectId))}
              disabled={!can('testRun:write')}
            >
              Create a run with this case
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}