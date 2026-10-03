import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, FlaskConical, ShieldCheck, Zap } from 'lucide-react'
import { ROUTES } from '../utils/routes'
import { cn } from '../utils/cn'

const HIGHLIGHTS = [
  { icon: CheckCircle2, title: 'Traceable', text: 'Every test case links to the requirement it verifies.' },
  { icon: Zap, title: 'Fast execution', text: 'Step-by-step runs built for high-volume manual testing.' },
  { icon: FlaskConical, title: 'AI-assisted', text: 'Generate draft test cases from a requirement, then review them.' },
  { icon: ShieldCheck, title: 'Release criteria', text: 'Readiness checks report evidence instead of a single score.' },
]

export function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  const location = useLocation()
  const isReset = location.pathname === ROUTES.resetPassword

  return (
    <div className="auth-shell">
      <div className="auth-shell__panel">
        <div className="auth-card">
          <Link to={ROUTES.login} className="app-brand" style={{ marginBottom: 'var(--space-8)' }}>
            <span className="app-brand__mark" aria-hidden="true">
              TP
            </span>
            <span className="app-brand__text">TestPilot</span>
          </Link>

          {!isReset && (
            <div className="stack-sm" style={{ gap: 6, marginBottom: 'var(--space-6)' }}>
              <h1 className="page__title">{title}</h1>
              {subtitle && <p className="text-secondary">{subtitle}</p>}
            </div>
          )}

          {children}

          {footer && <div className="auth-card__footer">{footer}</div>}
        </div>
      </div>

      <aside className={cn('auth-shell__aside', wide && 'is-wide')} aria-hidden="true">
        <div className="auth-aside__inner">
          <p className="auth-aside__eyebrow">Software quality assurance and test management</p>
          <h2 className="auth-aside__headline">
            One workspace for requirements, test execution, defects and release readiness.
          </h2>
          <ul className="auth-aside__list">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <item.icon size={17} aria-hidden="true" />
                <div className="stack-sm" style={{ gap: 1 }}>
                  <span style={{ fontWeight: 'var(--weight-medium)' }}>{item.title}</span>
                  <span style={{ color: 'var(--navy-200)', fontSize: 'var(--text-sm)' }}>{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
