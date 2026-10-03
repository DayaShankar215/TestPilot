import { AlertCircle, AlertTriangle, Inbox, Lock, RefreshCw, ServerCrash, WifiOff } from 'lucide-react'
import { Button } from '../common/Button'
import { EmptyState } from '../common/EmptyState'
import { ApiError } from '../../services/apiClient'

const STATUS_COPY = {
  400: { title: 'That request was not valid', message: 'Check the values you submitted and try again.' },
  401: { title: 'You are not signed in', message: 'Your session may have expired. Sign in again to continue.' },
  403: { title: 'You do not have access to this', message: 'Your role does not permit this action. Ask a workspace admin if you need it.' },
  404: { title: 'We could not find that', message: 'The record may have been deleted or the link may be out of date.' },
  409: { title: 'That conflicts with something existing', message: 'Adjust the values and try again.' },
  422: { title: 'Some fields need attention', message: 'The server rejected the submitted values.' },
  500: { title: 'The server had a problem', message: 'This is a server-side error. Try again in a moment.' },
  503: { title: 'Service temporarily unavailable', message: 'The API is not responding right now.' },
}

export function ErrorState({ error, onRetry, compact = false, title, description }) {
  const status = error?.status ?? 0
  const copy = STATUS_COPY[status] ?? {
    title: 'Something went wrong',
    message: 'An unexpected error occurred while loading this content.',
  }

  const Icon = error instanceof ApiError && error.isNetworkError ? WifiOff : status >= 500 ? ServerCrash : AlertCircle

  return (
    <div
      className="empty-state"
      style={compact ? { padding: 'var(--space-8) var(--space-4)' } : undefined}
      role="alert"
    >
      <span className="empty-state__icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <div className="stack-sm" style={{ gap: 2 }}>
        <h3 className="empty-state__title">{title ?? copy.title}</h3>
        <p className="empty-state__description">{description ?? error?.message ?? copy.message}</p>
        {status ? (
          <p className="text-muted mono" style={{ fontSize: 'var(--text-xs)' }}>
            HTTP {status} {error?.code ? `· ${error.code}` : ''}
          </p>
        ) : null}
      </div>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function PermissionDeniedState({ message }) {
  return (
    <EmptyState
      icon={Lock}
      title="You do not have access to this"
      description={message ?? 'Your workspace role does not include this permission. Contact a workspace admin to request access.'}
    />
  )
}

export function NoResultsState({ onReset, entityLabel = 'results' }) {
  return (
    <EmptyState
      icon={Inbox}
      title={`No ${entityLabel} match these filters`}
      description="Try a different search term or clear the filters to see everything."
      action={onReset}
      actionLabel="Clear filters"
    />
  )
}

export function Alert({ tone = 'info', title, children, icon: Icon, action }) {
  const fallbackIcon = {
    info: AlertCircle,
    warning: AlertTriangle,
    danger: AlertCircle,
    success: AlertCircle,
  }[tone]
  const ResolvedIcon = Icon ?? fallbackIcon

  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <ResolvedIcon size={16} className="alert__icon" aria-hidden="true" />
      <div className="stack-sm" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        {title && <span className="alert__title">{title}</span>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  )
}
