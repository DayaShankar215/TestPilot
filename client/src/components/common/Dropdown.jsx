import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useOutsideClick } from '../../hooks/useDisclosure'

export function Dropdown({ trigger, children, align = 'right', width = 240, className }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useOutsideClick(containerRef, () => setOpen(false), open)

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const left = align === 'right' ? rect.right - width : rect.left
      setCoords({
        top: Math.min(rect.bottom + 6, window.innerHeight - 12),
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
      })
    }
    setOpen(true)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger({ open, toggle, ref: containerRef })}
      {open && (
        <div
          className={cn('dropdown', className)}
          style={{ top: coords.top, left: coords.left, width, position: 'fixed' }}
          role="menu"
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}

export function DropdownTrigger({ label, count, className, open, ...rest }) {
  return (
    <button
      type="button"
      className={cn('btn btn--ghost btn--icon', className)}
      aria-expanded={open}
      aria-haspopup="menu"
      title={label}
      {...rest}
    >
      <span className="visually-hidden">{label}</span>
      {count > 0 ? (
        <span className="badge badge--danger" style={{ padding: '1px 5px' }}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}

export function DropdownItem({ icon: Icon, children, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn('dropdown__item', danger && 'dropdown__item--danger')}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </button>
  )
}

export function DropdownLabel({ children }) {
  return <div className="dropdown__label">{children}</div>
}

export function DropdownSeparator() {
  return <div className="dropdown__separator" role="separator" />
}

export function SelectTrigger({ children, open, className, icon: Icon = ChevronDown, ...rest }) {
  return (
    <button
      type="button"
      className={cn('btn btn--secondary', className)}
      aria-expanded={open}
      aria-haspopup="listbox"
      {...rest}
    >
      <span className="truncate">{children}</span>
      <Icon size={15} aria-hidden="true" />
    </button>
  )
}

export function useDropdownKeyboard(open, setOpen, itemCount) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (open && activeIndex !== 0 && itemCount === 0) setActiveIndex(0)

  return { activeIndex, setActiveIndex, itemCount }
}
