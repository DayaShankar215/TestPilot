import { cn } from '../../utils/cn'

export function Badge({ tone = 'neutral', icon: Icon, dot = false, className, children }) {
  return (
    <span className={cn('badge', `badge--${tone}`, className)}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {Icon && <Icon size={12} className="badge__icon" aria-hidden="true" />}
      {children}
    </span>
  )
}

const TONE_TO_COLOR = {
  neutral: 'var(--text-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  accent: 'var(--accent)',
  highlight: 'var(--highlight)',
}

export function StatusBadge({ map, value, fallback = 'Unknown', dot = true, className }) {
  const entry = map?.[value]
  const label = entry?.label ?? fallback
  const tone = entry?.tone ?? 'neutral'
  const color = TONE_TO_COLOR[tone] ?? TONE_TO_COLOR.neutral

  return (
    <span
      className={cn('badge', `badge--${tone}`, className)}
      title={`Status: ${label}`}
      data-status={label}
    >
      {dot && <span className="badge__dot" style={{ background: color }} aria-hidden="true" />}
      {label}
    </span>
  )
}

export function Trend({ value, direction, suffix = '%', label }) {
  if (value === null || value === undefined) return <span className="text-muted">No prior data</span>
  const tone = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'flat'
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'
  return (
    <span className={cn('kpi__trend', `kpi__trend--${tone}`)}>
      <span aria-hidden="true">{arrow}</span>
      {value}
      {suffix}
      {label && <span className="text-muted"> {label}</span>}
    </span>
  )
}

export function Progress({ value, tone = 'accent', label }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <div
        className={cn('progress__bar', tone !== 'accent' && `progress__bar--${tone}`)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
