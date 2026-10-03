import { cn } from '../../utils/cn'
import { formatNumber } from '../../utils/formatters'
import { Trend } from './Badge'

export function KPICard({ label, value, icon: Icon, trend, trendDirection, footnote, to, onClick, tone = 'accent' }) {
  const Wrapper = to ? 'a' : onClick ? 'button' : 'div'
  const wrapperProps = {
    className: cn('kpi'),
    ...(to ? { href: to } : {}),
    ...(onClick ? { type: 'button', onClick } : {}),
  }

  return (
    <Wrapper {...wrapperProps}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        {Icon && (
          <span
            className="kpi__icon"
            style={
              tone !== 'accent'
                ? { background: `var(--${tone}-soft)`, color: `var(--${tone}-text)` }
                : undefined
            }
          >
            <Icon size={17} aria-hidden="true" />
          </span>
        )}
      </div>
      <span className="kpi__value">{typeof value === 'number' ? formatNumber(value) : value}</span>
      <div className="kpi__footer">
        {trend !== undefined && trend !== null && <Trend value={trend} direction={trendDirection} />}
        {footnote && <span>{footnote}</span>}
      </div>
    </Wrapper>
  )
}
