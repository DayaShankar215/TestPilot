import { cn } from '../../utils/cn'

export function PageHeader({ title, description, actions, className, breadcrumbSlot }) {
  return (
    <header className={cn('page__header', className)}>
      {breadcrumbSlot}
      <div className="page__heading">
        <h1 className="page__title">{title}</h1>
        {description && <p className="page__description">{description}</p>}
      </div>
      {actions && <div className="page__actions">{actions}</div>}
    </header>
  )
}
