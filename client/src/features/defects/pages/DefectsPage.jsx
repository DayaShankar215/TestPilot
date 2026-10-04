import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  Bug,
  Filter,
  MessageSquare,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Avatar } from '../../../components/common/Avatar'
import { StatusBadge } from '../../../components/common/Badge'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { Tabs, TabPanel } from '../../../components/common/Tabs'
import { DataTable } from '../../../components/tables/DataTable'
import { FilterToolbar } from '../../../components/tables/FilterToolbar'
import { Pagination } from '../../../components/common/Pagination'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { FormField, Input, Select, Textarea } from '../../../components/forms/FormControls'
import { ListEditor } from '../../../components/forms/Editors'
import { defectsApi, requirementsApi, testCasesApi, usersApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useTableQuery } from '../../../hooks/useTableQuery'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { DEFECT_STATUS, PRIORITY, SEVERITY } from '../../../utils/constants'
import { defectSchema } from '../../../utils/schemas'
import { formatDateTime, timeAgo } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

const NEXT_STATUS = {
  new: 'triaged',
  triaged: 'in_progress',
  in_progress: 'resolved',
  resolved: 'verified',
  verified: 'closed',
  reopened: 'in_progress',
  closed: 'reopened',
  deferred: 'in_progress',
}

const STATUS_ACTION_LABEL = {
  new: 'Triage defect',
  triaged: 'Start work',
  in_progress: 'Mark resolved',
  resolved: 'Verify fix',
  verified: 'Close defect',
  closed: 'Reopen defect',
  reopened: 'Start work',
  deferred: 'Resume work',
}

export function DefectsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [openOnly, setOpenOnly] = useState(searchParams.get('openOnly') === 'true')

  const table = useTableQuery({
    defaultPageSize: 15,
    defaultSortBy: 'createdAt',
    defaultSortDir: 'desc',
    filters: {
      status: searchParams.get('status') ?? '',
      severity: searchParams.get('severity') ?? '',
      assigneeId: searchParams.get('assigneeId') ?? '',
    },
  })

  const debouncedSearch = useDebounce(table.search)

  const fetcher = useMemo(
    () => () =>
      defectsApi.list(projectId, {
        ...table.params,
        search: debouncedSearch || undefined,
        openOnly: openOnly ? 'true' : '',
      }),
    [projectId, table.params, debouncedSearch, openOnly],
  )

  const { data, isLoading, isError, error, refetch } = useApi(fetcher, [
    projectId,
    debouncedSearch,
    JSON.stringify(table.filters),
    openOnly,
    table.page,
    table.pageSize,
    table.sortBy,
    table.sortDir,
  ])

  const usersFetcher = useMemo(() => () => usersApi.list({ pageSize: 100 }), [])
  const { data: users } = useApi(usersFetcher, [])

  const filters = [
    {
      key: 'status',
      label: 'All statuses',
      value: table.filters.status ?? '',
      options: Object.entries(DEFECT_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
    },
    {
      key: 'severity',
      label: 'All severities',
      value: table.filters.severity ?? '',
      options: Object.entries(SEVERITY).map(([value, entry]) => ({ value, label: entry.label })),
    },
    {
      key: 'assigneeId',
      label: 'All assignees',
      value: table.filters.assigneeId ?? '',
      options: (users ?? []).map((user) => ({ value: user.id, label: user.name })),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Defects"
        description="Issues found during testing, linked to the requirement and test case that surfaced them."
        actions={
          <Button icon={Plus} onClick={() => navigate(ROUTES.defectNew(projectId))}>
            Report defect
          </Button>
        }
      />

      <FilterToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by reference or title"
        filters={filters}
        onFilterChange={table.updateFilter}
        onReset={table.resetFilters}
        hasActiveFilters={table.hasActiveFilters || openOnly}
      >
        <Button
          variant={openOnly ? 'primary' : 'secondary'}
          size="sm"
          icon={Filter}
          onClick={() => {
            setOpenOnly((current) => !current)
            table.setPage(1)
          }}
          aria-pressed={openOnly}
        >
          Open only
        </Button>
      </FilterToolbar>

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
            caption="Defects"
            sortKey={table.sortBy}
            sortDir={table.sortDir}
            columns={[
              {
                key: 'ref',
                header: 'Ref',
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
                    <Link to={ROUTES.defect(projectId, row.id)} style={{ fontWeight: 'var(--weight-medium)' }}>
                      {row.title}
                    </Link>
                    <span className="row-sm" style={{ gap: 6, flexWrap: 'wrap', fontSize: 'var(--text-xs)' }}>
                      {row.requirement && (
                        <Link to={ROUTES.requirement(row.requirement.id)} className="text-muted">
                          {row.requirement.ref}
                        </Link>
                      )}
                      {row.testCase && (
                        <Link to={ROUTES.testCase(projectId, row.testCase.id)} className="text-muted">
                          {row.testCase.ref}
                        </Link>
                      )}
                    </span>
                  </div>
                ),
              },
              {
                key: 'severity',
                header: 'Severity',
                sortable: true,
                sortKey: 'severity',
                onSort: table.toggleSort,
                width: 110,
                render: (row) => <StatusBadge map={SEVERITY} value={row.severity} />,
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
                width: 130,
                render: (row) => <StatusBadge map={DEFECT_STATUS} value={row.status} />,
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
                key: 'createdAt',
                header: 'Reported',
                sortable: true,
                sortKey: 'createdAt',
                onSort: table.toggleSort,
                width: 120,
                render: (row) => (
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {timeAgo(row.createdAt)}
                  </span>
                ),
              },
            ]}
            rows={data.items}
            onRowClick={(row) => navigate(ROUTES.defect(projectId, row.id))}
            empty={
              <EmptyState
                icon={Bug}
                title={table.hasActiveFilters || openOnly ? 'No defects match these filters' : 'No defects reported'}
                description={
                  table.hasActiveFilters || openOnly
                    ? 'Try a different search term, or clear the filters to see closed defects too.'
                    : 'Report a defect from a failed execution to start tracking it.'
                }
                action={table.hasActiveFilters || openOnly ? table.resetFilters : undefined}
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
            itemLabel="defects"
          />
        </Card>
      )}
    </div>
  )
}

export function DefectFormPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(defectSchema),
    defaultValues: {
      title: searchParams.get('title') ?? '',
      description: '',
      reproductionSteps: [''],
      expectedResult: '',
      actualResult: '',
      severity: 'medium',
      priority: 'medium',
      assigneeId: '',
      requirementId: searchParams.get('requirementId') ?? '',
      testCaseId: searchParams.get('testCaseId') ?? '',
    },
  })

  const usersFetcher = useMemo(() => () => usersApi.list({ pageSize: 100 }), [])
  const { data: users } = useApi(usersFetcher, [])

  const requirementsFetcher = useMemo(
    () => () => requirementsApi.list(projectId, { pageSize: 100, sortBy: 'ref' }),
    [projectId],
  )
  const { data: requirementData } = useApi(requirementsFetcher, [projectId])

  const casesFetcher = useMemo(
    () => () => testCasesApi.list(projectId, { pageSize: 100, sortBy: 'ref' }),
    [projectId],
  )
  const { data: caseData } = useApi(casesFetcher, [projectId])

  const onSubmit = async (values) => {
    setSaving(true)
    setApiError(null)
    try {
      const created = await defectsApi.create(projectId, {
        ...values,
        reproductionSteps: values.reproductionSteps.filter((step) => step.trim().length > 0),
        assigneeId: values.assigneeId || null,
        requirementId: values.requirementId || null,
        testCaseId: values.testCaseId || null,
      })
      toast.success('Defect reported', `${created.ref} created.`)
      navigate(ROUTES.defect(projectId, created.id))
    } catch (error) {
      setApiError(error)
      toast.error('Could not report defect', error?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Report a defect"
        description="Describe what happened, how to reproduce it, and what was expected instead."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(ROUTES.defects(projectId))}>
              Cancel
            </Button>
            <Button type="submit" form="defect-form" loading={saving}>
              Report defect
            </Button>
          </>
        }
      />

      {apiError && <Alert tone="danger">{apiError.message}</Alert>}

      <form id="defect-form" className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader title="Summary" />
          <CardBody className="stack">
            <FormField label="Title" htmlFor="defect-title" required error={errors.title?.message}>
              <Input
                id="defect-title"
                placeholder="Password reset email is sent to the previous address"
                invalid={Boolean(errors.title)}
                {...register('title')}
              />
            </FormField>

            <div className="grid-2">
              <FormField label="Severity" htmlFor="defect-severity" required error={errors.severity?.message}>
                <Select id="defect-severity" {...register('severity')}>
                  {Object.entries(SEVERITY).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Priority" htmlFor="defect-priority" required error={errors.priority?.message}>
                <Select id="defect-priority" {...register('priority')}>
                  {Object.entries(PRIORITY).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Description" htmlFor="defect-description" required error={errors.description?.message}>
              <Textarea
                id="defect-description"
                rows={4}
                placeholder="What the defect is, where it happens, and how often it occurs."
                invalid={Boolean(errors.description)}
                {...register('description')}
              />
            </FormField>

            <ListEditor
              label="Reproduction steps"
              hint="Ordered steps that reproduce the defect on a clean environment."
              items={watch('reproductionSteps')}
              onChange={(next) => setValue('reproductionSteps', next, { shouldValidate: true })}
              placeholder="Open the login page"
            />
            {errors.reproductionSteps && (
              <span className="field__error" role="alert">
                {errors.reproductionSteps.message ?? errors.reproductionSteps.root?.message}
              </span>
            )}

            <div className="grid-2">
              <FormField
                label="Expected result"
                htmlFor="defect-expected"
                required
                error={errors.expectedResult?.message}
              >
                <Textarea
                  id="defect-expected"
                  rows={3}
                  invalid={Boolean(errors.expectedResult)}
                  {...register('expectedResult')}
                />
              </FormField>
              <FormField
                label="Actual result"
                htmlFor="defect-actual"
                required
                error={errors.actualResult?.message}
              >
                <Textarea
                  id="defect-actual"
                  rows={3}
                  invalid={Boolean(errors.actualResult)}
                  {...register('actualResult')}
                />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Links" subtitle="Connect the defect to the work it affects" />
          <CardBody className="stack">
            <div className="grid-2">
              <FormField label="Assignee" htmlFor="defect-assignee">
                <Select id="defect-assignee" {...register('assigneeId')}>
                  <option value="">Unassigned</option>
                  {(users ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Requirement" htmlFor="defect-requirement">
                <Select id="defect-requirement" {...register('requirementId')}>
                  <option value="">Not linked</option>
                  {(requirementData?.items ?? []).map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>
                      {requirement.ref} — {requirement.title}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Test case" htmlFor="defect-testcase">
                <Select id="defect-testcase" {...register('testCaseId')}>
                  <option value="">Not linked</option>
                  {(caseData?.items ?? []).map((testCase) => (
                    <option key={testCase.id} value={testCase.id}>
                      {testCase.ref} — {testCase.title}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <Alert tone="info">
              Linking a test case lets you raise a retest run with a single action once the fix is deployed.
            </Alert>
          </CardBody>
        </Card>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate(ROUTES.defects(projectId))} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Report defect
          </Button>
        </div>
      </form>
    </div>
  )
}

export function DefectDetailPage() {
  const { projectId, defectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [tab, setTab] = useState('details')
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [busy, setBusy] = useState(false)

  const fetcher = useMemo(() => () => defectsApi.get(projectId, defectId), [projectId, defectId])
  const { data: defect, isLoading, isError, error, refetch, setData } = useApi(fetcher, [projectId, defectId])

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !defect) {
    return (
      <div className="page">
        <Skeleton height={140} radius="var(--radius-lg)" />
        <Skeleton height={340} radius="var(--radius-lg)" />
      </div>
    )
  }

  const nextStatus = NEXT_STATUS[defect.status]
  const isOpen = !['closed', 'verified', 'deferred'].includes(defect.status)

  const transition = async (status) => {
    setBusy(true)
    try {
      const updated = await defectsApi.update(projectId, defectId, { status })
      setData(updated)
      toast.success('Status updated', `Defect moved to ${status.replace('_', ' ')}.`)
    } catch (caught) {
      toast.error('Could not update status', caught?.message)
    } finally {
      setBusy(false)
    }
  }

  const retest = async () => {
    setBusy(true)
    try {
      const response = await defectsApi.retest(projectId, defectId)
      toast.success('Retest run created', response.run.name)
      navigate(ROUTES.testRun(projectId, response.run.id))
    } catch (caught) {
      toast.error('Could not create retest run', caught?.message)
      setBusy(false)
    }
  }

  const postComment = async () => {
    if (!comment.trim()) return
    setPosting(true)
    try {
      const updated = await defectsApi.addComment(projectId, defectId, comment.trim())
      setData(updated)
      setComment('')
    } catch (caught) {
      toast.error('Could not add comment', caught?.message)
    } finally {
      setPosting(false)
    }
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'comments', label: 'Comments', count: defect.comments.length },
    { id: 'history', label: 'History', count: defect.statusHistory.length },
  ]

  return (
    <div className="page">
      <PageHeader
        title={defect.title}
        description={`${defect.ref} · reported by ${defect.reporter?.name ?? 'unknown'} ${timeAgo(defect.createdAt)}`}
        actions={
          <>
            <StatusBadge map={DEFECT_STATUS} value={defect.status} />
            {can('defect:write') && nextStatus && (
              <Button icon={ArrowRight} onClick={() => transition(nextStatus)} loading={busy}>
                {STATUS_ACTION_LABEL[defect.status]}
              </Button>
            )}
            {can('defect:write') && defect.testCaseId && isOpen && (
              <Button variant="secondary" icon={RefreshCw} onClick={retest} loading={busy}>
                Create retest run
              </Button>
            )}
          </>
        }
      />

      {defect.status === 'reopened' && (
        <Alert tone="warning" title="Reopened">
          This defect failed verification and is back with the assignee.
        </Alert>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardBody>
            <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Defect sections" />
            <div style={{ paddingTop: 'var(--space-5)' }}>
              <TabPanel id="details" activeId={tab}>
                <div className="stack">
                  <div className="stack-sm" style={{ gap: 4 }}>
                    <h2 className="section__title">Description</h2>
                    <p className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                      {defect.description}
                    </p>
                  </div>

                  <hr className="divider" />

                  <div className="stack-sm" style={{ gap: 4 }}>
                    <h2 className="section__title">Reproduction steps</h2>
                    <ol className="step-list">
                      {(defect.reproductionSteps ?? []).map((step, index) => (
                        <li key={index} className="step-card">
                          <span className="step-card__number" aria-hidden="true">
                            {index + 1}
                          </span>
                          <div className="step-card__body">
                            <p>{step}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <hr className="divider" />

                  <div className="grid-2">
                    <div className="stack-sm" style={{ gap: 4 }}>
                      <span className="stat__label">Expected result</span>
                      <p className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                        {defect.expectedResult}
                      </p>
                    </div>
                    <div className="stack-sm" style={{ gap: 4 }}>
                      <span className="stat__label">Actual result</span>
                      <p className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                        {defect.actualResult}
                      </p>
                    </div>
                  </div>
                </div>
              </TabPanel>

              <TabPanel id="comments" activeId={tab}>
                <div className="stack">
                  <div className="stack-sm">
                    {defect.comments.length === 0 && (
                      <p className="text-secondary">
                        No comments yet. Keep the discussion here so the resolution stays auditable.
                      </p>
                    )}
                    {defect.comments.map((entry) => (
                      <div key={entry.id} className="comment">
                        <Avatar name={entry.author?.name} email={entry.author?.email} size="sm" />
                        <div className="comment__body">
                          <p className="comment__meta">
                            <strong>{entry.author?.name ?? 'Unknown'}</strong> · {timeAgo(entry.createdAt)}
                          </p>
                          <p>{entry.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {can('defect:write') && (
                    <>
                      <hr className="divider" />
                      <div className="stack-sm">
                        <FormField label="Add a comment" htmlFor="defect-comment">
                          <Textarea
                            id="defect-comment"
                            rows={3}
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="Share evidence, an investigation note or a question."
                          />
                        </FormField>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <Button
                            icon={MessageSquare}
                            onClick={postComment}
                            loading={posting}
                            disabled={!comment.trim()}
                          >
                            Post comment
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabPanel>

              <TabPanel id="history" activeId={tab}>
                <ol className="timeline">
                  {[...defect.statusHistory].reverse().map((entry, index) => (
                    <li key={`${entry.status}-${entry.changedAt}-${index}`} className="timeline__item">
                      <span className="timeline__marker">
                        <StatusBadge map={DEFECT_STATUS} value={entry.status} dot={false} />
                      </span>
                      <span className="timeline__line" aria-hidden="true" />
                      <div className="timeline__body">
                        <p className="timeline__title">
                          Moved to <strong>{entry.status.replace('_', ' ')}</strong>
                        </p>
                        <p className="timeline__meta">
                          {entry.changedBy?.name ?? 'System'} · {formatDateTime(entry.changedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabPanel>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="stack">
            <dl className="definition-list">
              <dt>Reference</dt>
              <dd className="mono">{defect.ref}</dd>
              <dt>Severity</dt>
              <dd>
                <StatusBadge map={SEVERITY} value={defect.severity} />
              </dd>
              <dt>Priority</dt>
              <dd>
                <StatusBadge map={PRIORITY} value={defect.priority} />
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge map={DEFECT_STATUS} value={defect.status} />
              </dd>
              <dt>Assignee</dt>
              <dd className="row-sm" style={{ gap: 8 }}>
                <Avatar name={defect.assignee?.name} email={defect.assignee?.email} size="sm" />
                {defect.assignee?.name ?? 'Unassigned'}
              </dd>
              <dt>Reporter</dt>
              <dd>{defect.reporter?.name ?? 'Unknown'}</dd>
              <dt>Requirement</dt>
              <dd>
                {defect.requirement ? (
                  <Link to={ROUTES.requirement(defect.requirement.id)}>{defect.requirement.ref}</Link>
                ) : (
                  'Not linked'
                )}
              </dd>
              <dt>Test case</dt>
              <dd>
                {defect.testCase ? (
                  <Link to={ROUTES.testCase(projectId, defect.testCase.id)}>{defect.testCase.ref}</Link>
                ) : (
                  'Not linked'
                )}
              </dd>
              <dt>Reported</dt>
              <dd>{formatDateTime(defect.createdAt)}</dd>
              <dt>Last updated</dt>
              <dd>{timeAgo(defect.updatedAt)}</dd>
              {defect.resolvedAt && (
                <>
                  <dt>Resolved</dt>
                  <dd>{formatDateTime(defect.resolvedAt)}</dd>
                </>
              )}
            </dl>

            <hr className="divider" />

            <Button
              block
              variant="secondary"
              icon={RefreshCw}
              onClick={retest}
              disabled={!can('defect:write') || !defect.testCaseId || busy}
            >
              Create retest run
            </Button>
            {!defect.testCaseId && (
              <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                Link a test case to this defect to enable one-click retest runs.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      </div>
  )
}