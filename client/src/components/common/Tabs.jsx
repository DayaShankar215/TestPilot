import { cn } from '../../utils/cn'

export function Tabs({ tabs, activeId, onChange, className, ariaLabel = 'Sections' }) {
  return (
    <div className={cn('tabs', className)} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          className="tabs__tab"
          aria-selected={tab.id === activeId}
          aria-controls={`panel-${tab.id}`}
          tabIndex={tab.id === activeId ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            const index = tabs.findIndex((item) => item.id === activeId)
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              onChange(tabs[(index + 1) % tabs.length].id)
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              onChange(tabs[(index - 1 + tabs.length) % tabs.length].id)
            }
          }}
        >
          {tab.label}
          {tab.count !== undefined && tab.count !== null && <span className="tabs__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function TabPanel({ id, activeId, children }) {
  if (id !== activeId) return null
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  )
}
