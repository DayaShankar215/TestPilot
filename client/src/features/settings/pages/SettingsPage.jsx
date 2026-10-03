import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Bell,
  Check,
  Mail,
  Monitor,
  Save,
  Settings2,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Badge, StatusBadge } from '../../../components/common/Badge'
import { Avatar } from '../../../components/common/Avatar'
import { EmptyState } from '../../../components/common/EmptyState'
import { ConfirmDialog, Modal } from '../../../components/common/Overlay'
import { Skeleton } from '../../../components/common/Skeleton'
import { Tabs, TabPanel } from '../../../components/common/Tabs'
import { Alert, ErrorState } from '../../../components/feedback/States'
import { FormField, Input, Select } from '../../../components/forms/FormControls'
import { DataTable } from '../../../components/tables/DataTable'
import { settingsApi, notificationsApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../context/ToastContext'
import { useAuth } from '../../../context/AuthContext'
import { useTheme } from '../../../context/ThemeContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { DATE_FORMATS, MEMBERSHIP_ROLE, TIMEZONES } from '../../../utils/constants'
import { preferencesSchema } from '../../../utils/schemas'
import { formatDateTime, timeAgo } from '../../../utils/formatters'

const NOTIFICATION_CHANNELS = [
  { key: 'testRuns', label: 'Test run results' },
  { key: 'defects', label: 'Defect activity' },
  { key: 'requirements', label: 'Requirement changes' },
  { key: 'automation', label: 'Automation runs' },
  { key: 'comments', label: 'Comments and mentions' },
]

export function SettingsPage() {
  const [tab, setTab] = useState('members')

  const tabs = [
    { id: 'members', label: 'Members' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'preferences', label: 'Preferences' },
  ]

  return (
    <div className="page">
      <PageHeader title="Settings" description="Team access, workspace details and your personal preferences." />
      <Card>
        <CardBody>
          <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Settings sections" />
          <div style={{ paddingTop: 'var(--space-5)' }}>
            <TabPanel id="members" activeId={tab}>
              <MembersPanel />
            </TabPanel>
            <TabPanel id="workspace" activeId={tab}>
              <WorkspacePanel />
            </TabPanel>
            <TabPanel id="notifications" activeId={tab}>
              <NotificationsPanel />
            </TabPanel>
            <TabPanel id="preferences" activeId={tab}>
              <PreferencesPanel />
            </TabPanel>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function MembersPanel() {
  const toast = useToast()
  const { can } = usePermissions()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const membersFetcher = useMemo(() => () => settingsApi.members(), [])
  const { data: members, isLoading, isError, error, refetch } = useApi(membersFetcher, [])

  const changeRole = async (member, role) => {
    try {
      await settingsApi.updateMember(member.id, { role })
      toast.success('Role updated', `${member.name} is now ${MEMBERSHIP_ROLE[role]?.label ?? role}.`)
      refetch()
    } catch (caught) {
      toast.error('Could not update role', caught?.message)
    }
  }

  const remove = async () => {
    const member = removing
    setRemoving(null)
    try {
      await settingsApi.removeMember(member.id)
      toast.info('Member removed', `${member.name} no longer has workspace access.`)
      refetch()
    } catch (caught) {
      toast.error('Could not remove member', caught?.message)
    }
  }

  if (isError) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div className="stack">
      <div className="row-between">
        <div className="stack-sm" style={{ gap: 2 }}>
          <h2 className="section__title">Members</h2>
          <p className="section__description">
            Roles decide what each member can do. Permissions are enforced by the API, not just hidden in the UI.
          </p>
        </div>
        <Button icon={UserPlus} onClick={() => setInviteOpen(true)} disabled={!can('member:manage')}>
          Invite member
        </Button>
      </div>

      {isLoading && <Skeleton height={240} />}

      {members && (
        <DataTable
          caption="Workspace members"
          columns={[
            {
              key: 'member',
              header: 'Member',
              render: (row) => (
                <div className="row-sm" style={{ gap: 10 }}>
                  <Avatar name={row.name} email={row.email} size="sm" />
                  <div className="stack-sm" style={{ gap: 0 }}>
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{row.name}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {row.email}
                      {row.isWorkspaceOwner ? ' · workspace owner' : ''}
                    </span>
                  </div>
                </div>
              ),
            },
            { key: 'title', header: 'Title', width: 180, render: (row) => row.title ?? '—' },
            {
              key: 'projects',
              header: 'Projects',
              width: 220,
              render: (row) => (
                <span className="row-sm" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {row.projects?.length ? (
                    row.projects.map((project) => (
                      <Badge key={project.id} tone="neutral">
                        {project.key}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted">None</span>
                  )}
                </span>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              width: 190,
              render: (row) =>
                can('member:manage') && !row.isWorkspaceOwner ? (
                  <>
                    <label className="visually-hidden" htmlFor={`role-${row.id}`}>
                      Role for {row.name}
                    </label>
                    <Select
                      id={`role-${row.id}`}
                      value={row.role}
                      onChange={(event) => changeRole(row, event.target.value)}
                      style={{ minHeight: 34 }}
                    >
                      {Object.entries(MEMBERSHIP_ROLE).map(([value, entry]) => (
                        <option key={value} value={value}>
                          {entry.label}
                        </option>
                      ))}
                    </Select>
                  </>
                ) : (
                  <StatusBadge map={MEMBERSHIP_ROLE} value={row.role} />
                ),
            },
            {
              key: 'actions',
              header: '',
              width: 60,
              align: 'right',
              render: (row) =>
                can('member:manage') && !row.isWorkspaceOwner ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => setRemoving(row)}
                    aria-label={`Remove ${row.name}`}
                  />
                ) : null,
            },
          ]}
          rows={members}
        />
      )}

      {!isLoading && members?.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title="No members yet"
          description="Invite the first teammate to collaborate on this workspace."
        />
      )}

      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(next) => {
          setInviteOpen(false)
          setBusy(false)
          refetch()
          toast.success('Invitation sent', next.email)
        }}
        onError={(message) => {
          setBusy(false)
          toast.error('Could not invite member', message)
        }}
        busy={busy}
        setBusy={setBusy}
      />

      <ConfirmDialog
        isOpen={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title={`Remove ${removing?.name ?? 'this member'}?`}
        description="They immediately lose access to every project in this workspace."
        confirmLabel="Remove member"
      >
        <p className="text-secondary">
          Projects and test history are preserved. You can invite the member again later.
        </p>
      </ConfirmDialog>
    </div>
  )
}

function InviteModal({ isOpen, onClose, onInvited, onError, busy, setBusy }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'tester', title: '' })

  useEffect(() => {
    if (isOpen) setForm({ email: '', name: '', role: 'tester', title: '' })
  }, [isOpen])

  const submit = async () => {
    if (!form.email.trim()) {
      onError('An email address is required.')
      return
    }
    setBusy(true)
    try {
      await settingsApi.inviteMember({ ...form, email: form.email.trim() })
      onInvited(form)
    } catch (caught) {
      onError(caught?.message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite a member"
      description="They receive access to the workspace and can be added to projects."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={Mail}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="stack">
        <FormField label="Email" htmlFor="invite-email" required>
          <Input
            id="invite-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="teammate@example.com"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Full name" htmlFor="invite-name">
          <Input
            id="invite-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Job title" htmlFor="invite-title">
          <Input
            id="invite-title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Role" htmlFor="invite-role" required>
          <Select
            id="invite-role"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            {Object.entries(MEMBERSHIP_ROLE).map(([value, entry]) => (
              <option key={value} value={value}>
                {entry.label}
              </option>
            ))}
          </Select>
        </FormField>
        <Alert tone="info">
          Testers and developers can create requirements, cases, runs and defects. Viewers are read-only.
        </Alert>
      </div>
    </Modal>
  )
}

function WorkspacePanel() {
  const toast = useToast()
  const { can } = usePermissions()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const workspaceFetcher = useMemo(() => () => settingsApi.workspace(), [])
  const { data: workspace, isLoading, isError, error, refetch } = useApi(workspaceFetcher, [])

  useEffect(() => {
    if (workspace) setForm({ name: workspace.name, slug: workspace.slug })
  }, [workspace])

  const save = async () => {
    setSaving(true)
    try {
      await settingsApi.updateWorkspace(form)
      toast.success('Workspace updated', 'Changes apply immediately.')
      refetch()
    } catch (caught) {
      toast.error('Could not update workspace', caught?.message)
    } finally {
      setSaving(false)
    }
  }

  if (isError) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !form) return <Skeleton height={240} />

  return (
    <div className="stack">
      <div className="stack-sm" style={{ gap: 2 }}>
        <h2 className="section__title">Workspace</h2>
        <p className="section__description">
          The workspace holds every project, member and shared setting.
        </p>
      </div>

      <Card>
        <CardBody className="stack">
          <FormField label="Workspace name" htmlFor="workspace-name" required>
            <Input
              id="workspace-name"
              value={form.name}
              disabled={!can('workspace:manage')}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </FormField>
          <FormField label="Workspace slug" htmlFor="workspace-slug" required hint="Used in shared links and report filenames.">
            <Input
              id="workspace-slug"
              value={form.slug}
              disabled={!can('workspace:manage')}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
            />
          </FormField>
          <dl className="definition-list">
            <dt>Owner</dt>
            <dd>{workspace.owner?.name ?? 'Unknown'}</dd>
            <dt>Members</dt>
            <dd>{workspace.memberCount}</dd>
            <dt>Projects</dt>
            <dd>{workspace.projectIds?.length ?? workspace.projects?.length ?? '—'}</dd>
          </dl>
          {can('workspace:manage') ? (
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button icon={Save} onClick={save} loading={saving}>
                Save workspace
              </Button>
            </div>
          ) : (
            <Alert tone="info">
              Only workspace admins can change these details.
            </Alert>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function NotificationsPanel() {
  const toast = useToast()

  const notificationsFetcher = useMemo(() => () => notificationsApi.list(), [])
  const { data: notifications, refetch } = useApi(notificationsFetcher, [])

  const preferencesFetcher = useMemo(() => () => settingsApi.preferences(), [])
  const { data: preferences, setData } = useApi(preferencesFetcher, [])
  const [saving, setSaving] = useState(false)

  const toggle = (channel, channelType, key) => {
    if (!preferences) return
    setData({
      ...preferences,
      [channelType]: {
        ...preferences[channelType],
        [key]: !preferences[channelType]?.[key],
      },
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await settingsApi.updatePreferences({
        notificationPreferences: {
          email: preferences.notificationPreferences?.email ?? {},
          inApp: preferences.notificationPreferences?.inApp ?? {},
        },
      })
      toast.success('Notification preferences saved', 'Applies to future events only.')
    } catch (caught) {
      toast.error('Could not save preferences', caught?.message)
    } finally {
      setSaving(false)
    }
  }

  if (!preferences) return <Skeleton height={280} />

  return (
    <div className="stack">
      <div className="stack-sm" style={{ gap: 2 }}>
        <h2 className="section__title">Notifications</h2>
        <p className="section__description">
          Choose how TestPilot notifies you. Email preferences are stored on your profile.
        </p>
      </div>

      <Card>
        <CardHeader title="Delivery preferences" />
        <CardBody flush>
          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Notification delivery preferences</caption>
              <thead>
                <tr>
                  <th>Event</th>
                  <th style={{ width: 140 }}>In-app</th>
                  <th style={{ width: 140 }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <tr key={channel.key}>
                    <td>{channel.label}</td>
                    <td>
                      <Toggle
                        checked={Boolean(preferences.notificationPreferences?.inApp?.[channel.key])}
                        onChange={() => toggle('inApp', 'inApp', channel.key)}
                        label={`${channel.label} in-app notifications`}
                      />
                    </td>
                    <td>
                      <Toggle
                        checked={Boolean(preferences.notificationPreferences?.email?.[channel.key])}
                        onChange={() => toggle('email', 'email', channel.key)}
                        label={`${channel.label} email notifications`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
        <div className="card__footer">
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button icon={Save} onClick={save} loading={saving}>
              Save preferences
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Recent notifications"
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={Check}
              onClick={async () => {
                try {
                  await notificationsApi.markAllRead()
                  refetch()
                  toast.success('All notifications marked as read')
                } catch (caught) {
                  toast.error('Could not update notifications', caught?.message)
                }
              }}
            >
              Mark all read
            </Button>
          }
        />
        <CardBody className="stack-sm">
          {(notifications ?? []).length === 0 && (
            <EmptyState compact icon={Bell} title="Nothing to catch up on" description="You are all caught up." />
          )}
          {(notifications ?? []).map((entry) => (
            <div key={entry.id} className="row-between" style={{ gap: 12 }}>
              <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: entry.read ? 'var(--weight-normal)' : 'var(--weight-semibold)' }}>
                  {entry.title}
                </span>
                <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  {entry.body}
                </span>
              </div>
              <div className="row-sm" style={{ gap: 8, flexShrink: 0 }}>
                {!entry.read && <Badge tone="accent">New</Badge>}
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {timeAgo(entry.createdAt)}
                </span>
                {!entry.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await notificationsApi.markRead(entry.id)
                        refetch()
                      } catch (caught) {
                        toast.error('Could not update notification', caught?.message)
                      }
                    }}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

function PreferencesPanel() {
  const toast = useToast()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      timezone: user?.timezone ?? 'UTC',
      dateFormat: user?.dateFormat ?? 'dd MMM yyyy',
      weekStartsOn: user?.weekStartsOn ?? 'monday',
      compactTables: false,
      defaultPageSize: 25,
    },
  })

  const profileFetcher = useMemo(() => () => settingsApi.preferences(), [])
  const { data: preferences } = useApi(profileFetcher, [])

  useEffect(() => {
    if (preferences) {
      reset({
        timezone: preferences.timezone ?? 'UTC',
        dateFormat: preferences.dateFormat ?? 'dd MMM yyyy',
        weekStartsOn: preferences.weekStartsOn ?? 'monday',
        compactTables: preferences.compactTables ?? false,
        defaultPageSize: preferences.defaultPageSize ?? 25,
      })
    }
  }, [preferences, reset])

  const onSubmit = async (values) => {
    setSaving(true)
    try {
      await settingsApi.updatePreferences(values)
      toast.success('Preferences saved', 'Tables and dates will use these settings.')
    } catch (caught) {
      toast.error('Could not save preferences', caught?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <div className="stack-sm" style={{ gap: 2 }}>
        <h2 className="section__title">Preferences</h2>
        <p className="section__description">Display and formatting settings for your account.</p>
      </div>

      <Card>
        <CardHeader title="Appearance" subtitle="Applies immediately on this device" />
        <CardBody className="stack">
          <FormField label="Theme" htmlFor="preference-theme">
            <Select id="preference-theme" value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Match system ({resolvedTheme})</option>
            </Select>
          </FormField>
          <p className="row-sm text-muted" style={{ gap: 6, fontSize: 'var(--text-xs)' }}>
            <Monitor size={13} aria-hidden="true" />
            Currently rendering in {resolvedTheme} mode.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tables and dates" />
        <CardBody className="stack">
          <form className="stack" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid-2">
              <FormField label="Timezone" htmlFor="preference-timezone" error={errors.timezone?.message}>
                <Select id="preference-timezone" {...register('timezone')}>
                  {TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Date format" htmlFor="preference-date" error={errors.dateFormat?.message}>
                <Select id="preference-date" {...register('dateFormat')}>
                  {DATE_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Week starts on" htmlFor="preference-week" error={errors.weekStartsOn?.message}>
                <Select id="preference-week" {...register('weekStartsOn')}>
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </Select>
              </FormField>
              <FormField label="Default page size" htmlFor="preference-page-size" error={errors.defaultPageSize?.message}>
                <Select id="preference-page-size" {...register('defaultPageSize', { valueAsNumber: true })}>
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} rows
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <Toggle
              checked={Boolean(watch('compactTables'))}
              onChange={(event) => setValue('compactTables', event.target.checked, { shouldDirty: true })}
              label="Use compact table rows"
            />

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button type="submit" icon={Save} loading={saving}>
                Save preferences
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Profile" />
        <CardBody className="stack">
          <dl className="definition-list">
            <dt>Name</dt>
            <dd>{user?.name}</dd>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
            <dt>Role</dt>
            <dd>
              <StatusBadge map={MEMBERSHIP_ROLE} value={user?.role ?? 'viewer'} />
            </dd>
            <dt>Member since</dt>
            <dd>{formatDateTime(user?.createdAt ?? user?.invitedAt)}</dd>
          </dl>
          <Alert tone="info" icon={Settings2}>
            Profile fields are managed by your workspace admin. Contact them to change your name, email or role.
          </Alert>
        </CardBody>
      </Card>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="row-sm" style={{ gap: 8, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
      />
      <span style={{ fontSize: 'var(--text-sm)' }}>{label}</span>
    </label>
  )
}