import { createPortal } from 'react-dom'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../utils/cn'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function ToastViewport() {
  const { toasts, dismiss } = useToast()

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant] ?? Info
        return (
          <div key={toast.id} className={cn('toast', `toast--${toast.variant}`)} role="status">
            <Icon size={16} className="toast__icon" aria-hidden="true" />
            <div className="toast__content">
              <p className="toast__title">{toast.title}</p>
              {toast.message && <p className="toast__message">{toast.message}</p>}
            </div>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
