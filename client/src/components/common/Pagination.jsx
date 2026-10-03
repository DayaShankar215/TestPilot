import { cn } from '../../utils/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { PAGE_SIZE_OPTIONS } from '../../utils/constants'
import { formatNumber } from '../../utils/formatters'

function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export function Pagination({ meta, page, pageSize, onPageChange, onPageSizeChange, itemLabel = 'items' }) {
  if (!meta) return null

  const totalPages = meta.totalPages ?? 1
  const start = meta.total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, meta.total)

  return (
    <div className="pagination">
      <div className="row-sm">
        <span className="pagination__info">
          {meta.total === 0
            ? `No ${itemLabel}`
            : `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(meta.total)} ${itemLabel}`}
        </span>
        {onPageSizeChange && (
          <>
            <label className="visually-hidden" htmlFor="page-size-select">
              Items per page
            </label>
            <select
              id="page-size-select"
              className="select"
              style={{ width: 'auto', minHeight: 32, paddingTop: 0, paddingBottom: 0, fontSize: 'var(--text-sm)' }}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <nav className="pagination__controls" aria-label="Pagination">
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronLeft}
          onClick={() => onPageChange(page - 1)}
          disabled={!meta.hasPrevious}
          aria-label="Previous page"
        />
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === '…' ? (
            <span key={`gap-${index}`} className="text-muted" aria-hidden="true" style={{ padding: '0 4px' }}>
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={cn('pagination__page')}
              aria-current={entry === page ? 'page' : undefined}
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </button>
          ),
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronRight}
          onClick={() => onPageChange(page + 1)}
          disabled={!meta.hasNext}
          aria-label="Next page"
        />
      </nav>
    </div>
  )
}
