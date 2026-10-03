import { forwardRef } from 'react'
import { cn } from '../../utils/cn'
import { Spinner } from './Spinner'

const VARIANTS = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
  dangerSoft: 'btn--danger-soft',
  highlight: 'btn--highlight',
}

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size,
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    block = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      type={Component === 'button' ? type : undefined}
      className={cn(
        'btn',
        VARIANTS[variant] ?? VARIANTS.primary,
        size === 'sm' && 'btn--sm',
        size === 'lg' && 'btn--lg',
        !children && 'btn--icon',
        block && 'btn--block',
        loading && 'btn--loading',
        className,
      )}
      disabled={Component === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className="btn__spinner" aria-hidden="true">
          <Spinner />
        </span>
      )}
      {Icon && !loading && <Icon size={size === 'sm' ? 15 : 16} aria-hidden="true" />}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 15 : 16} aria-hidden="true" />}
    </Component>
  )
})
