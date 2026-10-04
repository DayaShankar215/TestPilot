import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Archive,
  FileCheck2,
  History,
  ListChecks,
  Pencil,
  Plus,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { StatusBadge, Progress } from '../../../components/common/Badge'
import { Avatar } from '../../../components/common/Avatar'
import { EmptyState } from '../../../components/common/EmptyState'
import { Skeleton } from '../../../components/common/Skeleton'
import { Modal, ConfirmDialog } from '../../../components/common/Overlay'
import { Tabs, TabPanel } from '../../../components/common/Tabs'
import { DataTable } from '../../../components/tables/DataTable'
import { FilterToolbar } from '../../../components/tables/FilterToolbar'
import { Pagination } from '../../../components/common/Pagination'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { FormField, Input, Select, Textarea } from '../../../components/forms/FormControls'
import { ListEditor } from '../../../components/forms/Editors'
import { requirementsApi, usersApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useTableQuery } from '../../../hooks/useTableQuery'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { PROJECT_STATUS, PRIORITY, REQUIREMENT_STATUS } from '../../../utils/constants'
import { requirementSchema } from '../../../utils/schemas'
import { formatDate, formatNumber, formatPercent, timeAgo } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'
import { titleCase } from '../../../utils/formatters'

export function RequirementsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [uncoveredOnly, setUncoveredOnly] = useState(false)
  const [changedOnly, setChangedOnly] = useState(false)

  const table = useTableQuery({
    defaultPageSize: 15,
    defaultSortBy: 'updatedAt',
    defaultSortDir: 'desc',
    filters: { status: searchParams.get('status') ?? '' },
  })

  const debouncedSearch = useDebounce(table.search)

  const fetcher = useMemo(
    () => () =>
      requirementsApi.list(projectId, {
        ...table.params,
        search: debouncedSearch || undefined,
        uncoveredOnly: uncoveredOnly ? 'true' : undefined,
        changedOnly: changedOnly ? 'true' : undefined,
      }),
    [projectId, table.params, debouncedSearch, uncoveredOnly, changedOnly],
  )

  const { data, isLoading, isError, error, refetch } = useApi(fetcher, [
    projectId,
    debouncedSearch,
    uncoveredOnly,
    changedOnly,
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
      options: Object.entries(REQUIREMENT_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
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
      options: moduleOptions(data?.items ?? []),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Requirements"
        description="Verifiable statements of expected behaviour. Every requirement should have at least one approved test case before release."
        actions={
          <>
            <Button
              variant={uncoveredOnly ? 'primary' : 'secondary'}
              size="sm"
              icon={ShieldAlert}
              onClick={() => setUncoveredOnly((current) => !current)}
              aria-pressed={uncoveredOnly}
            >
              Uncovered only
            </Button>
            <Button
              variant={changedOnly ? 'primary' : 'secondary'}
              size="sm"
              icon={AlertTriangle}
              onClick={() => setChangedOnly((current) => !current)}
              aria-pressed={changedOnly}
            >
              Changed after last run
            </Button>
            <Button
              icon={Plus}
              onClick={() => setCreateOpen(true)}
              disabled={!can('requirement:write')}
            >
              New requirement
            </Button>
          </>
        }
      />

      <Alert tone="info" title="Coverage is calculated from linked test cases">
        A requirement counts as covered once at least one test case references it. Coverage does not imply the test has
        been executed recently.
      </Alert>

      <FilterToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by reference, title or module"
        filters={filters}
        onFilterChange={table.updateFilter}
        onReset={() => {
          setUncoveredOnly(false)
          setChangedOnly(false)
          table.resetFilters()
        }}
        hasActiveFilters={table.hasActiveFilters || uncoveredOnly || changedOnly}
      />

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {isLoading && !data && (
        <Card>
          <CardBody flush>
            <Skeleton height={360} />
          </CardBody>
        </Card>
      )}

      {data && (
        <Card>
          <DataTable
            sortKey={table.sortBy}
            sortDir={table.sortDir}
            caption="Requirements"
            columns={[
              {
                key: 'ref',
                header: 'Reference',
                sortable: true,
                sortKey: 'ref',
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
                render: (row) => (
                  <div className="stack-sm" style={{ gap: 2 }}>
                    <Link to={ROUTES.requirement(row.id)} style={{ fontWeight: 'var(--weight-medium)' }}>
                      {row.title}
                    </Link>
                    <span className="text-muted truncate" style={{ fontSize: 'var(--text-xs)', maxWidth: 460, display: 'block' }}>
                      {row.description}
                    </span>
                  </div>
                ),
              },
              {
                key: 'module',
                header: 'Module',
                sortable: true,
                sortKey: 'module',
                width: 140,
                render: (row) => <span className="text-secondary">{row.module}</span>,
              },
              {
                key: 'priority',
                header: 'Priority',
                sortable: true,
                sortKey: 'priority',
                width: 110,
                render: (row) => <StatusBadge map={PRIORITY} value={row.priority} />,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                sortKey: 'status',
                width: 130,
                render: (row) => <StatusBadge map={REQUIREMENT_STATUS} value={row.status} />,
              },
              {
                key: 'owner',
                header: 'Owner',
                width: 170,
                render: (row) => (
                  <span className="row-sm" style={{ gap: 6 }}>
                    <Avatar name={row.owner?.name} email={row.owner?.email} size="sm" />
                    <span className="truncate text-secondary">{row.owner?.name ?? 'Unassigned'}</span>
                  </span>
                ),
              },
              {
                key: 'updatedAt',
                header: 'Updated',
                sortable: true,
                sortKey: 'updatedAt',
                width: 120,
                render: (row) => (
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {timeAgo(row.updatedAt)}
                  </span>
                ),
              },
            ]}
            rows={data.items}
            onRowClick={(row) => navigate(ROUTES.requirement(row.id))}
            empty={
              <EmptyState
                icon={ListChecks}
                title={table.hasActiveFilters ? 'No requirements match these filters' : 'No requirements yet'}
                description={
                  table.hasActiveFilters
                    ? 'Try a different search or clear the filters.'
                    : 'Create the first requirement to start linking test cases.'
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
            itemLabel="requirements"
          />
        </Card>
      )}

      <RequirementFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        onCreated={(requirement) => {
          setCreateOpen(false)
          refetch()
          navigate(ROUTES.requirement(requirement.id))
        }}
      />
    </div>
  )
}

function moduleOptions(items) {
  const modules = [...new Set(items.map((item) => item.module).filter(Boolean))].sort()
  return modules.map((value) => ({ value, label: value }))
}

export function RequirementFormModal({ isOpen, onClose, projectId, requirement, onCreated }) {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [apiError, setApiError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      title: '',
      description: '',
      module: '',
      acceptanceCriteria: [''],
      priority: 'medium',
      status: 'draft',
      ownerId: '',
    },
  })

  const criteria = watch('acceptanceCriteria')

  useEffect(() => {
    if (!isOpen) return
    usersApi
      .list()
      .then((list) => {
        setUsers(list)
        setValue('ownerId', requirement?.ownerId ?? list[0]?.id ?? '')
      })
      .catch(() => setUsers([]))

    reset({
      title: requirement?.title ?? '',
      description: requirement?.description ?? '',
      module: requirement?.module ?? '',
      acceptanceCriteria: requirement?.acceptanceCriteria?.length ? requirement.acceptanceCriteria : [''],
      priority: requirement?.priority ?? 'medium',
      status: requirement?.status ?? 'draft',
      ownerId: requirement?.ownerId ?? '',
    })
    setApiError(null)
  }, [isOpen, requirement, reset, setValue])

  const onSubmit = async (values) => {
    setApiError(null)
    try {
      const payload = {
        ...values,
        acceptanceCriteria: values.acceptanceCriteria.map((item) => item.trim()).filter(Boolean),
      }
      if (requirement) {
        await requirementsApi.update(requirement.id, payload)
        toast.success('Requirement updated', payload.title)
        onCreated?.({ id: requirement.id })
      } else {
        const created = await requirementsApi.create(projectId, payload)
        toast.success('Requirement created', `${created.ref} added to the project.`)
        onCreated?.(created)
      }
      onClose()
    } catch (error) {
      setApiError(error)
      toast.error(requirement ? 'Could not save requirement' : 'Could not create requirement', error?.message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={requirement ? `Edit ${requirement.ref}` : 'New requirement'}
      description="A requirement states verifiable expected behaviour. Link test cases to it so coverage can be measured."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="requirement-form" loading={isSubmitting}>
            {requirement ? 'Save changes' : 'Create requirement'}
          </Button>
        </>
      }
    >
      <form id="requirement-form" className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {apiError && <Alert tone="danger">{apiError.message}</Alert>}

        <FormField label="Title" htmlFor="req-title" required error={errors.title?.message}>
          <Input id="req-title" placeholder="User can reset their password by email link" invalid={Boolean(errors.title)} {...register('title')} />
        </FormField>

        <FormField label="Description" htmlFor="req-description" required error={errors.description?.message}>
          <Textarea id="req-description" rows={4} placeholder="Describe the behaviour, including boundaries and preconditions." invalid={Boolean(errors.description)} {...register('description')} />
        </FormField>

        <div className="grid-2">
          <FormField label="Module" htmlFor="req-module" required error={errors.module?.message}>
            <Input id="req-module" placeholder="Authentication" invalid={Boolean(errors.module)} {...register('module')} />
          </FormField>
          <FormField label="Priority" htmlFor="req-priority" required error={errors.priority?.message}>
            <Select id="req-priority" {...register('priority')}>
              {Object.entries(PRIORITY).map(([value, entry]) => (
                <option key={value} value={value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="req-status" required error={errors.status?.message}>
            <Select id="req-status" {...register('status')}>
              {Object.entries(REQUIREMENT_STATUS).map(([value, entry]) => (
                <option key={value} value={value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Owner" htmlFor="req-owner" required error={errors.ownerId?.message}>
            <Select id="req-owner" {...register('ownerId')}>
              <option value="">Select an owner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {user.title}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <hr className="divider" />

        <ListEditor
          label="Acceptance criteria"
          hint="Each criterion should be independently verifiable."
          items={criteria}
          onChange={(next) => setValue('acceptanceCriteria', next, { shouldValidate: true })}
          placeholder="Given … when … then …"
        />
        {typeof errors.acceptanceCriteria?.message === 'string' && (
          <span className="field__error" role="alert">
            {errors.acceptanceCriteria.message}
          </span>
        )}
      </form>
    </Modal>
  )
}

export function RequirementDetailPage() {
  const { requirementId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [tab, setTab] = useState('description')

  const fetcher = useMemo(() => () => requirementsApi.get(requirementId), [requirementId])
  const { data: requirement, isLoading, isError, error, refetch } = useApi(fetcher, [requirementId])

  if (isError) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (isLoading || !requirement) {
    return (
      <div className="page">
        <Skeleton height={140} radius="var(--radius-lg)" />
        <Skeleton height={320} radius="var(--radius-lg)" />
      </div>
    )
  }

  const projectId = requirement.projectId
  const coverage = requirement.linkedTestCases.length
    ? Math.round((requirement.linkedTestCases.filter((item) => item.status === 'approved').length / requirement.linkedTestCases.length) * 100)
    : 0

  const confirmArchive = async () => {
    setArchiving(true)
    try {
      await requirementsApi.archive(requirementId)
      toast.success('Requirement archived', `${requirement.ref} is now marked obsolete.`)
      setArchiveOpen(false)
      refetch()
    } catch (caught) {
      toast.error('Could not archive requirement', caught?.message)
    } finally {
      setArchiving(false)
    }
  }

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'testCases', label: 'Linked test cases', count: requirement.linkedTestCases.length },
    { id: 'history', label: 'Change history', count: requirement.history.length },
  ]

  return (
    <div className="page">
      <PageHeader
        title={requirement.title}
        description={`${requirement.ref} · ${requirement.module} · version ${requirement.version}`}
        actions={
          <>
            <StatusBadge map={REQUIREMENT_STATUS} value={requirement.status} />
            <StatusBadge map={PRIORITY} value={requirement.priority} />
            <Button variant="secondary" onClick={() => navigate(ROUTES.requirements(projectId))}>
              All requirements
            </Button>
            {can('requirement:write') && requirement.status !== 'obsolete' && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button variant="danger-soft" icon={Archive} onClick={() => setArchiveOpen(true)}>
                  Archive
                </Button>
              </>
            )}
          </>
        }
      />

      {requirement.changedAfterLastRun && (
        <Alert tone="warning" title="This requirement changed after the last completed test run">
          Updated {formatDate(requirement.updatedAt, 'd MMM yyyy, HH:mm')}, after{' '}
          <strong>{requirement.changedAfterLastRun.runName}</strong> completed on{' '}
          {formatDate(requirement.changedAfterLastRun.runCompletedAt, 'd MMM yyyy')}. Any recorded pass result predates
          the current text and should be re-executed.
        </Alert>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardBody>
            <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Requirement sections" />
            <div style={{ paddingTop: 'var(--space-5)' }}>
              <TabPanel id="description" activeId={tab}>
                <div className="stack">
                  <section className="stack-sm" style={{ gap: 6 }}>
                    <h2 className="section__title">Description</h2>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{requirement.description}</p>
                  </section>

                  <hr className="divider" />

                  <section className="stack-sm" style={{ gap: 8 }}>
                    <h2 className="section__title">Acceptance criteria</h2>
                    <ol className="stack-sm" style={{ gap: 6 }}>
                      {requirement.acceptanceCriteria.map((criterion, index) => (
                        <li key={index} className="row-sm" style={{ gap: 8, alignItems: 'flex-start' }}>
                          <span
                            aria-hidden="true"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: 'var(--accent-soft)',
                              color: 'var(--accent-soft-text)',
                              fontSize: 'var(--text-2xs)',
                              fontWeight: 'var(--weight-semibold)',
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <hr className="divider" />

                  <dl className="definition-list">
                    <dt>Owner</dt>
                    <dd className="row-sm" style={{ gap: 8 }}>
                      <Avatar name={requirement.owner?.name} email={requirement.owner?.email} size="sm" />
                      {requirement.owner?.name ?? 'Unassigned'}
                    </dd>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge map={REQUIREMENT_STATUS} value={requirement.status} />
                    </dd>
                    <dt>Priority</dt>
                    <dd>
                      <StatusBadge map={PRIORITY} value={requirement.priority} />
                    </dd>
                    <dt>Tags</dt>
                    <dd className="row-wrap" style={{ gap: 6 }}>
                      {requirement.tags?.length ? (
                        requirement.tags.map((tag) => (
                          <span key={tag} className="badge badge--neutral">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">No tags</span>
                      )}
                    </dd>
                    <dt>Created</dt>
                    <dd>{formatDate(requirement.createdAt, 'd MMM yyyy')}</dd>
                    <dt>Updated</dt>
                    <dd>{formatDate(requirement.updatedAt, 'd MMM yyyy, HH:mm')}</dd>
                    <dt>Last verified</dt>
                    <dd>{requirement.lastVerifiedAt ? formatDate(requirement.lastVerifiedAt) : 'Not verified yet'}</dd>
                  </dl>
                </div>
              </TabPanel>

              <TabPanel id="testCases" activeId={tab}>
                <div className="stack">
                  <div className="row-between">
                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                      {requirement.linkedTestCases.length} test case
                      {requirement.linkedTestCases.length === 1 ? '' : 's'} reference this requirement.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Plus}
                      onClick={() => navigate(ROUTES.testCaseNew(projectId))}
                      disabled={!can('testCase:write')}
                    >
                      New test case
                    </Button>
                  </div>

                  {requirement.linkedTestCases.length === 0 ? (
                    <EmptyState
                      compact
                      icon={FileCheck2}
                      title="No linked test cases"
                      description="This requirement has no coverage. Add a test case and link it to close the gap."
                    />
                  ) : (
                    <DataTable
                      compact
                      caption="Linked test cases"
                      columns={[
                        {
                          key: 'ref',
                          header: 'Reference',
                          width: 110,
                          render: (row) => (
                            <Link to={ROUTES.testCase(projectId, row.id)} className="mono">
                              {row.ref}
                            </Link>
                          ),
                        },
                        {
                          key: 'title',
                          header: 'Title',
                          render: (row) => <span style={{ fontWeight: 'var(--weight-medium)' }}>{row.title}</span>,
                        },
                        {
                          key: 'type',
                          header: 'Type',
                          width: 120,
                          render: (row) => titleCase(row.type),
                        },
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
                          render: (row) => <StatusBadge map={PROJECT_STATUS} value={row.status} fallback={titleCase(row.status)} />,
                        },
                      ]}
                      rows={requirement.linkedTestCases}
                    />
                  )}

                  <div className="stack-sm" style={{ gap: 6 }}>
                    <div className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
                      <span>Approved share of linked cases</span>
                      <strong>{coverage}%</strong>
                    </div>
                    <Progress value={coverage} tone={coverage === 100 ? 'success' : 'warning'} label="Approved share" />
                  </div>
                </div>
              </TabPanel>

              <TabPanel id="history" activeId={tab}>
                <div className="stack">
                  <Alert tone="info">
                    Every saved change creates a new version. Recorded test results always refer to the version that was
                    current when the test ran.
                  </Alert>
                  {requirement.history.length === 0 ? (
                    <EmptyState compact icon={History} title="No recorded changes" />
                  ) : (
                    <ol className="timeline">
                      {[...requirement.history].reverse().map((entry) => (
                        <li key={`${entry.version}-${entry.changedAt}`} className="timeline__item">
                          <span className="timeline__marker">
                            <History size={13} aria-hidden="true" />
                          </span>
                          <span className="timeline__line" aria-hidden="true" />
                          <div className="timeline__body">
                            <p className="timeline__title">
                              <strong>v{entry.version}</strong> — {entry.summary}
                            </p>
                            <p className="timeline__meta">
                              {formatDate(entry.changedAt, 'd MMM yyyy, HH:mm')} ·{' '}
                              {entry.changedBy?.name ?? 'System'}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </TabPanel>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Summary" />
          <CardBody className="stack">
            <div className="stat-row">
              <StatBox label="Linked cases" value={formatNumber(requirement.linkedTestCases.length)} />
              <StatBox label="Approved" value={formatNumber(requirement.linkedTestCases.filter((item) => item.status === 'approved').length)} />
              <StatBox label="Version" value={formatNumber(requirement.version)} />
            </div>
            <hr className="divider" />
            <dl className="definition-list">
              <dt>Reference</dt>
              <dd className="mono">{requirement.ref}</dd>
              <dt>Project</dt>
              <dd>
                <Link to={ROUTES.project(projectId)}>View project</Link>
              </dd>
              <dt>Coverage</dt>
              <dd>{formatPercent(coverage, 0)} approved</dd>
            </dl>
          </CardBody>
        </Card>
      </div>

      <RequirementFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        requirement={requirement}
        onCreated={() => {
          refetch()
          toast.info('Requirement updated')
        }}
      />

      <ConfirmDialog
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={confirmArchive}
        loading={archiving}
        title={`Archive ${requirement.ref}?`}
        description="Archiving marks this requirement obsolete. Linked test cases are kept."
        confirmLabel="Archive requirement"
      >
        <p className="text-secondary">
          Coverage figures will still count this requirement, but it will no longer appear in active planning views.
        </p>
      </ConfirmDialog>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="stack-sm" style={{ gap: 0 }}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  )
}
