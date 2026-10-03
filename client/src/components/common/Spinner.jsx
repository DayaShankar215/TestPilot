import { cn } from '../../utils/cn'

export function Spinner({ size, className }) {
  return <span className={cn('spinner', size === 'lg' && 'spinner--lg', className)} role="status" aria-label="Loading" />
}
