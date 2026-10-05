import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Bot,
  Bug,
  Check,
  ChevronRight,
  FileCheck2,
  FolderKanban,
  GitPullRequestArrow,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Search,
  Settings,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useActiveProject } from '../context/ActiveProjectContext'
import { usePermissions } from '../context/PermissionsContext'
import { useToast } from '../context/ToastContext'
import { NAV_ITEMS, ROUTES } from '../utils/routes'
import { storage } from '../services/storage'
import { notificationsApi } from '../services/endpoints/notifications'
import { Avatar } from '../components/common/Avatar'
import { Button } from '../components/common/Button'
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '../components/common/Dropdown'
import { cn } from '../utils/cn'
import { timeAgo } from '../utils/formatters'

const NAV_ICONS = {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  FileCheck2,
  PlayCircle,
  Bug,
  GitPullRequestArrow,
  Bot,
  BarChart3,
  Settings,
}

function resolveNavTarget(item, projectId) {
  if (item.to) return item.to
  if (!projectId) return ROUTES.projects
  switch (item.label) {
    case 'Requirements':
      return ROUTES.requirements(projectId)
    case 'Test Cases':
      return ROUTES.testCases(projectId)
    case 'Test Runs':
      return ROUTES.testRuns(projectId)
    case 'Defects':
      return ROUTES.defects(projectId)
    case 'Regression Planner':
      return ROUTES.regression(projectId)
    case 'Automation':
      return ROUTES.automation(projectId)
    case 'Reports':
      return ROUTES.reports(projectId)
    default:
      return ROUTES.projects
  }
}

function WorkspaceSelector({ collapsed }) {
  const { projects, activeProjectId, setActiveProject, isAll } = useActiveProject()
  const active = projects.find((item) => item.id === activeProjectId)

  return (
    <Dropdown
      width={260}
      align="left"
      trigger={({ toggle, open, ref }) => (
        <button
          ref={ref}
          type="button"
          className="workspace-selector__trigger"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Select project scope"
          title={collapsed ? 'Switch project scope' : undefined}
        >
          <span className="workspace-selector__mark" aria-hidden="true">
            {isAll ? 'ALL' : (active?.key ?? '—')}
          </span>
          {!collapsed && (
            <span className="stack-sm" style={{ gap: 0, minWidth: 0, flex: 1, textAlign: 'left' }}>
              <span className="text-muted" style={{ fontSize: 'var(--text-2xs)', lineHeight: 1.2 }}>
                Project scope
              </span>
              <span className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                {isAll ? 'All projects' : (active?.name ?? 'Select project')}
              </span>
            </span>
          )}
        </button>
      )}
    >
      <DropdownLabel>Project scope</DropdownLabel>
      <DropdownItem icon={FolderKanban} onClick={() => setActiveProject('all')}>
        All projects {isAll ? '✓' : ''}
      </DropdownItem>
      <DropdownSeparator />
      {projects.map((project) => (
        <DropdownItem
          key={project.id}
          icon={FolderKanban}
          onClick={() => setActiveProject(project.id)}
        >
          <span className="truncate">
            {project.name} {project.id === activeProjectId ? '✓' : ''}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  )
}

function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { activeProjectId } = useActiveProject()
  const projectId = activeProjectId === 'all' ? null : activeProjectId

  return (
    <>
      {mobileOpen && <div className="sidebar-scrim no-print" onClick={onCloseMobile} />}
      <aside
        className={cn('app-sidebar', collapsed && 'is-collapsed', mobileOpen && 'is-mobile-open')}
        aria-label="Primary navigation"
      >
        <div className="app-sidebar__brand">
          <Link to={ROUTES.dashboard} className="app-brand" onClick={onCloseMobile}>
            <span className="app-brand__mark" aria-hidden="true">
              TP
            </span>
            {!collapsed && <span className="app-brand__text">TestPilot</span>}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={mobileOpen ? onCloseMobile : onToggle}
            aria-label={mobileOpen ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={16} aria-hidden="true" /> : collapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </Button>
        </div>

        <div className="app-sidebar__workspace">
          <WorkspaceSelector collapsed={collapsed} />
        </div>

        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.icon] ?? Settings
            const to = resolveNavTarget(item, projectId)

            return (
              <NavLink
                key={item.label}
                to={to}
                onClick={onCloseMobile}
                className={({ isActive }) => cn('app-navlink', isActive && 'is-active')}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && <span className="visually-hidden">{item.label}</span>}
                {!collapsed && item.type === 'project' && !projectId && (
                  <span className="app-navlink__hint" aria-hidden="true">
                    —
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="app-sidebar__footer">
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
              {projectId
                ? 'Project-scoped pages are filtered to the selected scope.'
                : 'Select a project scope to reach requirements, test cases and reports.'}
            </p>
          </div>
        )}
      </aside>
    </>
  )
}

function GlobalSearch() {
  const navigate = useNavigate()
  const { projects } = useActiveProject()

  return (
    <Dropdown
      width={360}
      align="left"
      trigger={({ toggle, open, ref }) => (
        <button ref={ref} type="button" className="topbar__search" onClick={toggle} aria-expanded={open} aria-label="Global search">
          <Search size={15} aria-hidden="true" />
          <span className="truncate">Search projects and jump to pages…</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Jump to a project</DropdownLabel>
          {projects.slice(0, 8).map((project) => (
            <DropdownItem
              key={project.id}
              icon={FolderKanban}
              onClick={() => {
                close()
                navigate(ROUTES.project(project.id))
              }}
            >
              {project.name}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem
            icon={ListChecks}
            onClick={() => {
              close()
              navigate(ROUTES.projects)
            }}
          >
            Browse all projects
          </DropdownItem>
          <DropdownItem
            icon={Settings}
            onClick={() => {
              close()
              navigate(ROUTES.members)
            }}
          >
            Team and settings
          </DropdownItem>
        </>
      )}
    </Dropdown>
  )
}

function NotificationBell() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    notificationsApi
      .list()
      .then(({ items: rows }) => {
        if (!cancelled) setItems(rows)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const unread = items.filter((item) => !item.read).length

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems((current) => current.map((item) => ({ ...item, read: true })))
      toast.success('Notifications cleared', 'All notifications are marked as read.')
    } catch (error) {
      toast.error('Could not update notifications', error?.message)
    }
  }

  return (
    <Dropdown
      width={340}
      trigger={({ toggle, open, ref }) => (
        <button
          ref={ref}
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={toggle}
          aria-expanded={open}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          style={{ position: 'relative' }}
        >
          <Bell size={17} aria-hidden="true" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="topbar__dot"
            />
          )}
        </button>
      )}
    >
      <DropdownLabel>Notifications{unread > 0 ? ` · ${unread} unread` : ''}</DropdownLabel>
      {loading && <div className="dropdown__item text-muted">Loading notifications…</div>}
      {!loading && items.length === 0 && <div className="dropdown__item text-muted">You are all caught up.</div>}
      {items.slice(0, 6).map((item) => (
        <div key={item.id} className="dropdown__item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              marginTop: 6,
              flexShrink: 0,
              background: item.read ? 'var(--border-strong)' : 'var(--accent)',
            }}
          />
          <span className="stack-sm" style={{ gap: 1, minWidth: 0 }}>
            <span style={{ fontWeight: item.read ? 'var(--weight-normal)' : 'var(--weight-medium)' }}>{item.title}</span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)', whiteSpace: 'normal' }}>
              {item.message}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
              {timeAgo(item.createdAt)}
            </span>
          </span>
        </div>
      ))}
      {items.length > 0 && (
        <>
          <DropdownSeparator />
          <DropdownItem icon={Check} onClick={markAll}>
            Mark all as read
          </DropdownItem>
        </>
      )}
    </Dropdown>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { roleLabel } = usePermissions()
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      toast.info('Signed out', 'You have been signed out of TestPilot.')
      navigate(ROUTES.login, { replace: true })
    } catch (error) {
      toast.error('Could not sign out', error?.message)
    }
  }

  return (
    <Dropdown
      width={240}
      trigger={({ toggle, open, ref }) => (
        <button ref={ref} type="button" className="topbar__user" onClick={toggle} aria-expanded={open} aria-label="Account menu">
          <Avatar name={user?.name} email={user?.email} />
          <span className="topbar__user-meta">
            <span className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
              {user?.name}
            </span>
            <span className="truncate text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
              {roleLabel}
            </span>
          </span>
        </button>
      )}
    >
      <DropdownLabel>{user?.email}</DropdownLabel>
      <DropdownItem
        icon={UserIcon}
        onClick={() => navigate(ROUTES.profile)}
      >
        Profile
      </DropdownItem>
      <DropdownItem
        icon={Settings}
        onClick={() => navigate(ROUTES.preferences)}
      >
        Preferences
      </DropdownItem>
      <DropdownItem
        icon={BarChart3}
        onClick={() => navigate(ROUTES.workspace)}
      >
        Workspace settings
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem icon={LogOut} danger onClick={handleLogout}>
        Sign out
      </DropdownItem>
    </Dropdown>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const label = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="sm"
      icon={theme === 'dark' ? Sun : Moon}
      onClick={toggleTheme}
      aria-label={`Switch to ${label} theme`}
      title={`Switch to ${label} theme`}
    />
  )
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (!segments.length) return <span className="breadcrumbs__current">Dashboard</span>

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to={ROUTES.dashboard}>TestPilot</Link>
      {segments.map((segment, index) => {
        const to = `/${segments.slice(0, index + 1).join('/')}`
        const isLast = index === segments.length - 1
        return (
          <span key={to} className="row-sm" style={{ gap: 4 }}>
            <ChevronRight size={13} aria-hidden="true" />
            {isLast ? <span className="breadcrumbs__current">{segment}</span> : <Link to={to}>{segment}</Link>}
          </span>
        )
      })}
    </nav>
  )
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(storage.getSidebarCollapsed())
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef(null)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      storage.setSidebarCollapsed(!current)
      return !current
    })
  }

  return (
    <div className={cn('app-shell', collapsed && 'is-collapsed')}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="app-main">
        <header className="topbar no-print">
          <Button
            variant="ghost"
            size="sm"
            icon={Menu}
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="topbar__menu"
          />
          <div className="topbar__crumbs">
            <Breadcrumbs />
          </div>
          <div className="topbar__actions">
            <GlobalSearch />
            <NotificationBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main-content" className="app-content" tabIndex={-1} ref={mainRef}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
