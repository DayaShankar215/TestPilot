import { avatarColor, initials } from '../../utils/formatters'
import { cn } from '../../utils/cn'

export function Avatar({ name, email, size, className, title }) {
  const label = name ?? email ?? '?'
  return (
    <span
      className={cn('avatar', size === 'sm' && 'avatar--sm', size === 'lg' && 'avatar--lg', className)}
      style={{ background: avatarColor(email ?? label) }}
      title={title ?? label}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  )
}

export function AvatarStack({ users = [], max = 4, size = 'sm' }) {
  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  return (
    <div className="row-sm">
      <span className="avatar-stack">
        {visible.map((user) => (
          <Avatar key={user.id} name={user.name} email={user.email} size={size} />
        ))}
      </span>
      {overflow > 0 && (
        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          +{overflow}
        </span>
      )}
    </div>
  )
}
