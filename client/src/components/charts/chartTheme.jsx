import { useMemo } from 'react'

export const SERIES_COLORS = {
  pass: 'var(--success)',
  fail: 'var(--danger)',
  blocked: 'var(--warning)',
  not_run: 'var(--text-muted)',
  critical: 'var(--danger)',
  high: 'var(--danger-hover)',
  medium: 'var(--warning)',
  low: 'var(--info)',
  trivial: 'var(--text-muted)',
}

export function useChartTheme() {
  return useMemo(
    () => ({
      grid: 'var(--chart-grid)',
      axis: 'var(--chart-axis)',
      text: 'var(--text-muted)',
      tooltipBg: 'var(--surface-raised)',
      tooltipBorder: 'var(--border)',
      tooltipText: 'var(--text-primary)',
      series: SERIES_COLORS,
    }),
    [],
  )
}

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="card"
      style={{ padding: 'var(--space-3)', boxShadow: 'var(--shadow-md)', minWidth: 160, background: 'var(--surface-raised)' }}
    >
      {label && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>}
      <div className="stack-sm" style={{ gap: 4 }}>
        {payload.map((entry) => (
          <div key={entry.dataKey ?? entry.name} className="row-sm" style={{ justifyContent: 'space-between', gap: 16 }}>
            <span className="row-sm" style={{ gap: 6 }}>
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: 2, background: entry.color ?? entry.payload?.fill }}
              />
              <span style={{ fontSize: 'var(--text-xs)' }}>{entry.name}</span>
            </span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)' }}>
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartLegend({ items }) {
  return (
    <ul className="row-wrap" style={{ gap: 'var(--space-4)' }}>
      {items.map((item) => (
        <li key={item.label} className="row-sm" style={{ gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          <span
            aria-hidden="true"
            style={{ width: 9, height: 9, borderRadius: 2, background: item.color, flexShrink: 0 }}
          />
          {item.label}
          {item.value !== undefined && (
            <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{item.value}</strong>
          )}
        </li>
      ))}
    </ul>
  )
}
