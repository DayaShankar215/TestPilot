import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

let toastCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    ({ title, message, variant = 'info', duration = 5000 }) => {
      toastCounter += 1
      const id = `toast-${toastCounter}`
      setToasts((current) => [...current, { id, title, message, variant }])
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      success: (title, message) => push({ title, message, variant: 'success' }),
      error: (title, message) => push({ title, message, variant: 'error', duration: 8000 }),
      warning: (title, message) => push({ title, message, variant: 'warning', duration: 7000 }),
      info: (title, message) => push({ title, message, variant: 'info' }),
      push,
    }),
    [toasts, dismiss, push],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
