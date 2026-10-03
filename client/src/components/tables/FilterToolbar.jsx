import { Search, X } from 'lucide-react'
import { Input, Select } from '../forms/FormControls'
import { Button } from '../common/Button'

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  onFilterChange,
  onReset,
  hasActiveFilters = false,
  children,
}) {
  return (
    <div className="toolbar" role="search">
      {onSearchChange && (
        <div className="toolbar__search">
          <Search size={15} className="toolbar__search-icon" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <div className="toolbar__group">
        {filters.map((filter) => (
          <Select
            key={filter.key}
            className="toolbar__select"
            value={filter.value ?? ''}
            onChange={(event) => onFilterChange(filter.key, event.target.value)}
            aria-label={filter.label}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}
      </div>

      {children}

      {hasActiveFilters && onReset && (
        <Button variant="ghost" size="sm" icon={X} onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

export function FilterChip({ label, value, onRemove }) {
  return (
    <span className="badge badge--accent">
      <span className="text-muted">{label}:</span> {value}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        style={{ display: 'grid', placeItems: 'center', marginLeft: 2 }}
      >
        <X size={11} aria-hidden="true" />
      </button>
    </span>
  )
}
