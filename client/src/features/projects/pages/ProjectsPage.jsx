import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  FolderKanban,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Settings,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { StatusBadge, Progress } from '../../../components/common/Badge'
import { AvatarStack } from '../../../components/common/Avatar'
import { EmptyState } from '../../../components/common/EmptyState'
import { SkeletonGrid, SkeletonTable } from '../../../components/common/Skeleton'
import { ConfirmDialog } from '../../../components/common/Overlay'
import { Dropdown, DropdownItem } from '../../../components/common/Dropdown'
import { DataTable } from '../../../components/tables/DataTable'
import { FilterToolbar } from '../../../components/tables/FilterToolbar'
import { Pagination } from '../../../components/common/Pagination'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { projectsApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useTableQuery } from '../../../hooks/useTableQuery'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { useActiveProject } from '../../../context/ActiveProjectContext'
import { formatDate, formatNumber, formatPercent, timeAgo } from '../../../utils/formatters'
import { PROJECT_STATUS } from '../../../utils/constants'
import { ROUTES } from '../../../utils/routes'

export function ProjectsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const { setActiveProject } = useActiveProject()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState(searchParams.get('view') === 'table' ? 'table' : 'cards')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)

  const table = useTableQuery({
    defaultPageSize: 12,
    defaultSortBy: 'name',
    defaultSortDir: 'asc',
    filters: { status: searchParams.get('status') ?? '' },
  })

  const debouncedSearch = useDebounce(table.search)

  const fetcher = useMemo(
    () => () => projectsApi.list({ ...table.params, search: debouncedSearch || undefined }),
    [table.params, debouncedSearch],
  )

  const { data, isLoading, isError, error, refetch } = useApi(fetcher, [debouncedSearch, JSON.stringify(table.filters), table.page, table.pageSize, table.sortBy, table.sortDir])

  const confirmArchive = async () => {
    setArchiving(true)
    try {
      await projectsApi.archive(archiveTarget.id)
      toast.success('Project archived', `${archiveTarget.name} is now read-only.`)
      setArchiveTarget(null)
      refetch()
    } catch (caught) {
      toast.error('Could not archive project', caught?.message)
    } finally {
      setArchiving(false)
    }
  }

  const filters = [
    {
      key: 'status',
      label: 'All statuses',
      value: table.filters.status ?? '',
      options: Object.entries(PROJECT_STATUS).map(([value, entry]) => ({ value, label: entry.label })),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Projects"
        description="Each project scopes its own requirements, test cases, runs, defects and reports."
        actions={
          <>
            <div className="row-sm" role="group" aria-label="View mode">
              <Button
                variant={view === 'cards' ? 'primary' : 'secondary'}
                size="sm"
                icon={LayoutGrid}
                onClick={() => setView('cards')}
                aria-pressed={view === 'cards'}
              >
                Cards
              </Button>
              <Button
                variant={view === 'table' ? 'primary' : 'secondary'}
                size="sm"
                icon={List}
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
              >
                Table
              </Button>
            </div>
            <Button icon={FolderKanban} onClick={() => navigate(ROUTES.projectNew)} disabled={!can('project:create')}>
              New project
            </Button>
          </>
        }
      />

      {!can('project:create') && (
        <Alert tone="info" title="Read-only access">
          Your role can view projects but not create them. Ask a workspace admin if you need a new project.
        </Alert>
      )}

      <FilterToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search projects by name or description"
        filters={filters}
        onFilterChange={table.updateFilter}
        onReset={table.resetFilters}
        hasActiveFilters={table.hasActiveFilters}
      />

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {isLoading && !data && (view === 'cards' ? <SkeletonGrid count={6} height={220} /> : <Card><SkeletonTable rows={6} columns={6} /></Card>)}

      {data && data.items.length === 0 && (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title={table.hasActiveFilters ? 'No projects match these filters' : 'No projects yet'}
            description={
              table.hasActiveFilters
                ? 'Try a different search term or clear the filters.'
                : 'Create a project to start managing requirements and test cases.'
            }
            action={table.hasActiveFilters ? table.resetFilters : undefined}
            actionLabel="Clear filters"
          />
        </Card>
      )}

      {data && data.items.length > 0 && view === 'cards' && (
        <>
          <div className="grid-cards">
            {data.items.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => {
                  setActiveProject(project.id)
                  navigate(ROUTES.project(project.id))
                }}
                onEdit={() => navigate(ROUTES.projectSettings(project.id))}
                onArchive={() => setArchiveTarget(project)}
                canEdit={can('project:edit')}
                canArchive={can('project:archive')}
              />
            ))}
          </div>
          <Card>
            <Pagination
              meta={data.meta}
              page={table.page}
              pageSize={table.pageSize}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
              itemLabel="projects"
            />
          </Card>
        </>
      )}

      {data && data.items.length > 0 && view === 'table' && (
        <Card>
          <DataTable
            sortKey={table.sortBy}
            sortDir={table.sortDir}
            columns={tableColumns({
              onOpen: (project) => {
                setActiveProject(project.id)
                navigate(ROUTES.project(project.id))
              },
              onEdit: (project) => navigate(ROUTES.projectSettings(project.id)),
              onArchive: (project) => setArchiveTarget(project),
              canEdit: can('project:edit'),
              canArchive: can('project:archive'),
            })}
            rows={data.items}
            onRowClick={(project) => navigate(ROUTES.project(project.id))}
            caption="Projects"
          />
          <Pagination
            meta={data.meta}
            page={table.page}
            pageSize={table.pageSize}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            itemLabel="projects"
          />
        </Card>
      )}

      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        loading={archiving}
        title={`Archive ${archiveTarget?.name}?`}
        description="Archived projects become read-only. Historical data is preserved."
        confirmLabel="Archive project"
      >
        <p className="text-secondary">
          Members keep read access. You can still view requirements, runs and reports, but nothing new can be created.
        </p>
      </ConfirmDialog>
    </div>
  )
}

function ProjectCard({ project, onOpen, onEdit, onArchive, canEdit, canArchive }) {
  const { metrics } = project

  return (
    <Card interactive className="stack" style={{ padding: 0 }}>
      <button type="button" onClick={onOpen} className="stack" style={{ padding: 'var(--space-5)', textAlign: 'left', gap: 'var(--space-3)' }}>
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
            <span className="row-sm" style={{ gap: 8 }}>
              <span className="workspace-selector__mark" aria-hidden="true">
                {project.key}
              </span>
              <StatusBadge map={PROJECT_STATUS} value={project.status} />
            </span>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>{project.name}</h3>
          </div>
          <ProjectMenu onOpen={onOpen} onEdit={onEdit} onArchive={onArchive} canEdit={canEdit} canArchive={canArchive} />
        </div>

        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
          {project.description}
        </p>

        <div className="row-between">
          <span className="row-sm" style={{ gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            <Users size={13} aria-hidden="true" />
            {project.memberCount} member{project.memberCount === 1 ? '' : 's'}
          </span>
          <AvatarStack users={project.members} />
        </div>

        <div className="stat-row" style={{ gap: 'var(--space-4)' }}>
          <MiniStat label="Test cases" value={formatNumber(metrics.testCases)} />
          <MiniStat label="Requirements" value={formatNumber(metrics.requirements)} />
          <MiniStat
            label="Pass rate"
            value={metrics.passRate === null ? '—' : formatPercent(metrics.passRate, 0)}
          />
          <MiniStat label="Open defects" value={formatNumber(metrics.openDefects)} />
        </div>

        <div className="stack-sm" style={{ gap: 4 }}>
          <div className="row-between" style={{ fontSize: 'var(--text-xs)' }}>
            <span className="text-muted">Requirement coverage</span>
            <strong>{metrics.requirementCoverage === null ? '—' : formatPercent(metrics.requirementCoverage, 0)}</strong>
          </div>
          <Progress
            value={metrics.requirementCoverage ?? 0}
            tone={metrics.requirementCoverage >= 80 ? 'success' : metrics.requirementCoverage >= 50 ? 'warning' : 'danger'}
            label="Requirement coverage"
          />
        </div>
      </button>
    </Card>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="stack-sm" style={{ gap: 0 }}>
      <span className="stat__label" style={{ fontSize: 'var(--text-2xs)' }}>
        {label}
      </span>
      <span style={{ fontWeight: 'var(--weight-semibold)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function ProjectMenu({ onOpen, onEdit, onArchive, canEdit, canArchive }) {
  return (
    <Dropdown
      trigger={({ toggle, open, ref }) => (
        <button ref={ref} type="button" className="icon-btn" onClick={toggle} aria-expanded={open} aria-label="Project actions">
          <MoreVertical size={15} aria-hidden="true" />
        </button>
      )}
    >
      <DropdownItem icon={FolderKanban} onClick={onOpen}>
        Open project
      </DropdownItem>
      {canEdit && (
        <DropdownItem icon={Pencil} onClick={onEdit}>
          Edit settings
        </DropdownItem>
      )}
      {canArchive && (
        <DropdownItem icon={Archive} danger onClick={onArchive}>
          Archive project
        </DropdownItem>
      )}
    </Dropdown>
  )
}

function tableColumns({ onOpen, onEdit, onArchive, canEdit, canArchive }) {
  return [
    {
      key: 'name',
      header: 'Project',
      sortable: true,
      sortKey: 'name',
      render: (project) => (
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="row-sm" style={{ gap: 8 }}>
            <span className="workspace-selector__mark" aria-hidden="true" style={{ width: 24, height: 24, fontSize: 9 }}>
              {project.key}
            </span>
            <span style={{ fontWeight: 'var(--weight-medium)' }}>{project.name}</span>
          </span>
          <span className="text-muted truncate" style={{ fontSize: 'var(--text-xs)', maxWidth: 320, display: 'block' }}>
            {project.description}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortKey: 'status',
      width: 130,
      render: (project) => <StatusBadge map={PROJECT_STATUS} value={project.status} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortKey: 'ownerId',
      width: 160,
      render: (project) => <span className="text-secondary">{project.owner?.name ?? '—'}</span>,
    },
    {
      key: 'members',
      header: 'Members',
      width: 90,
      align: 'right',
      render: (project) => formatNumber(project.memberCount),
    },
    {
      key: 'testCases',
      header: 'Test cases',
      align: 'right',
      width: 110,
      render: (project) => formatNumber(project.metrics.testCases),
    },
    {
      key: 'passRate',
      header: 'Pass rate',
      align: 'right',
      width: 110,
      render: (project) => (project.metrics.passRate === null ? '—' : formatPercent(project.metrics.passRate)),
    },
    {
      key: 'openDefects',
      header: 'Open defects',
      align: 'right',
      width: 120,
      render: (project) => formatNumber(project.metrics.openDefects),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      sortKey: 'updatedAt',
      width: 130,
      render: (project) => (
        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {project.updatedAt ? timeAgo(project.updatedAt) : formatDate(project.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      width: 110,
      render: (project) => (
        <div className="table__actions">
          <Button variant="ghost" size="sm" icon={Settings} onClick={() => onEdit(project)} aria-label={`Settings for ${project.name}`} disabled={!canEdit} />
          <Dropdown
            trigger={({ toggle, open, ref }) => (
              <button ref={ref} type="button" className="icon-btn" onClick={toggle} aria-expanded={open} aria-label={`More actions for ${project.name}`}>
                <MoreVertical size={15} aria-hidden="true" />
              </button>
            )}
          >
            <DropdownItem icon={FolderKanban} onClick={() => onOpen(project)}>
              Open project
            </DropdownItem>
            {canEdit && (
              <DropdownItem icon={Pencil} onClick={() => onEdit(project)}>
                Edit settings
              </DropdownItem>
            )}
            {canArchive && (
              <DropdownItem icon={Archive} danger onClick={() => onArchive(project)}>
                Archive project
              </DropdownItem>
            )}
          </Dropdown>
        </div>
      ),
    },
  ]
}

