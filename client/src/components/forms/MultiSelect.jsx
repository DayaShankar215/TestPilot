import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useOutsideClick } from '../../hooks/useDisclosure'
import { Badge } from '../common/Badge'
import { Checkbox, Input } from './FormControls'

export function MultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options',
  searchable = true,
  emptyLabel = 'No options available',
  invalid = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useOutsideClick(containerRef, () => setOpen(false), open)

  const selected = useMemo(() => options.filter((option) => value.includes(option.value)), [options, value])

  const filtered = useMemo(() => {
    if (!search) return options
    const needle = search.toLowerCase()
    return options.filter((option) => String(option.label).toLowerCase().includes(needle))
  }, [options, search])

  const toggle = (optionValue) => {
    onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue])
  }

  return (
    <div className="field">
      {label && <span className="field__label">{label}</span>}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className={cn('input row-wrap', invalid && 'input--invalid')}
          style={{ minHeight: 38, cursor: 'pointer', textAlign: 'left', gap: 6 }}
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {selected.length === 0 ? (
            <span className="text-muted">{placeholder}</span>
          ) : (
            selected.map((option) => (
              <Badge key={option.value} tone={option.tone ?? 'accent'}>
                {option.label}
              </Badge>
            ))
          )}
          <ChevronDown size={15} aria-hidden="true" style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </button>

        {open && (
          <div
            className="dropdown"
            style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, width: 'auto', maxHeight: 280, overflowY: 'auto' }}
            role="listbox"
            aria-multiselectable="true"
          >
            {searchable && (
              <div style={{ padding: 'var(--space-2)' }}>
                <div className="input-wrap">
                  <Search
                    size={14}
                    aria-hidden="true"
                    style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }}
                  />
                  <Input
                    autoFocus
                    placeholder="Search…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    style={{ paddingLeft: 30, minHeight: 32 }}
                  />
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <p className="text-muted" style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                {emptyLabel}
              </p>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value.includes(option.value)}
                className="dropdown__item"
                onClick={() => toggle(option.value)}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: '1px solid var(--border-strong)',
                    background: value.includes(option.value) ? 'var(--accent)' : 'transparent',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {value.includes(option.value) && <Check size={11} aria-hidden="true" />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            ))}
            {selected.length > 0 && (
              <>
                <div className="dropdown__separator" />
                <button type="button" className="dropdown__item" onClick={() => onChange([])}>
                  <X size={14} aria-hidden="true" />
                  Clear {selected.length} selected
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <span className="field__hint">
          {selected.length} selected. Press the control again to change the selection.
        </span>
      )}
      {options.length === 0 && <span className="field__hint">{emptyLabel}</span>}
    </div>
  )
}

export function SingleSelectList({ options, value, onChange, name = 'selection' }) {
  return (
    <div className="stack-sm" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <label
          key={option.value}
          className="link-tile"
          style={{
            cursor: 'pointer',
            borderColor: value === option.value ? 'var(--accent)' : undefined,
            background: value === option.value ? 'var(--accent-soft)' : undefined,
          }}
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="link-tile__body">
            <span style={{ fontWeight: 'var(--weight-medium)' }}>{option.label}</span>
            {option.description && <span className="card__subtitle">{option.description}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

export { Checkbox }
