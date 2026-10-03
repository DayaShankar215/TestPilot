import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { storage } from '../services/storage'

const ThemeContext = createContext(null)

function prefersDark() {
  if (typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

function readInitialTheme() {
  const stored = storage.getTheme()
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme)
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event) => setSystemDark(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    document.documentElement.style.colorScheme = resolvedTheme
    storage.setTheme(theme)
  }, [resolvedTheme, theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const active = current === 'system' ? (prefersDark() ? 'dark' : 'light') : current
      return active === 'dark' ? 'light' : 'dark'
    })
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, isDark: resolvedTheme === 'dark' }),
    [theme, resolvedTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}