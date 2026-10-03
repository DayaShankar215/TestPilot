import { cn } from '../../utils/cn'
import { Button } from './Button'

export function EmptyState({ icon: Icon, title, description, action, actionLabel, className, compact = false }) {
  return (
    <div className={cn('empty-state', compact && 'empty-state--compact', className)} style={compact ? { padding: 'var(--space-8) var(--space-4)' } : undefined}>
      {Icon && <span className="empty-state__icon">{<Icon size={22} aria-hidden="true" />}</span>}
      <div className="stack-sm" style={{ gap: 2 }}>
        <h3 className="empty-state__title">{title}</h3>
        {description && <p className="empty-state__description">{description}</p>}
      </div>
      {action && (
        <Button variant="secondary" onClick={action} icon={action.icon}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
