import { cn } from '../../utils/cn'

export function Skeleton({ width, height = 16, radius, className, style }) {
  return (
    <span
      className={cn('skeleton', className)}
      style={{ display: 'block', width: width ?? '100%', height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('stack-sm', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '60%' : '100%'} height={13} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn('card', className)} aria-hidden="true">
      <div className="card__body stack">
        <Skeleton width="45%" height={20} />
        <SkeletonText lines={3} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index}>
                <Skeleton width="70%" height={11} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, columnIndex) => (
                <td key={columnIndex}>
                  <Skeleton width={columnIndex === 0 ? '80%' : '60%'} height={13} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonGrid({ count = 4, height = 96, className }) {
  return (
    <div className={cn('grid-kpi', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} radius="var(--radius-lg)" />
      ))}
    </div>
  )
}
