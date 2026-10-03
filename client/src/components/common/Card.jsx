import { cn } from '../../utils/cn'

export function Card({ as: Component = 'div', interactive = false, className, children, ...rest }) {
  return (
    <Component
      className={cn('card', interactive && 'card--interactive', className)}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('card__header', className)}>
      <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
        <h3 className="card__title">{title}</h3>
        {subtitle && <span className="card__subtitle">{subtitle}</span>}
      </div>
      {actions && <div className="row-sm">{actions}</div>}
    </div>
  )
}

export function CardBody({ flush = false, className, children }) {
  return <div className={cn('card__body', flush && 'card__body--flush', className)}>{children}</div>
}

export function CardFooter({ className, children }) {
  return <div className={cn('card__footer', className)}>{children}</div>
}

export function Section({ title, description, actions, children, className }) {
  return (
    <section className={cn('section', className)}>
      {(title || actions) && (
        <div className="section__header">
          <div className="stack-sm" style={{ gap: 2 }}>
            {title && <h2 className="section__title">{title}</h2>}
            {description && <p className="section__description">{description}</p>}
          </div>
          {actions && <div className="row-sm">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, className }) {
  return (
    <div className={cn('stat', className)}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {hint && <span className="card__subtitle">{hint}</span>}
    </div>
  )
}
