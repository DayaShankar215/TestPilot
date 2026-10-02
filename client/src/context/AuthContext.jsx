import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/endpoints/auth'
import { onSessionExpired } from '../services/apiClient'
import { storage } from '../services/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser())
  const [status, setStatus] = useState(() => (storage.getToken() ? 'loading' : 'anonymous'))
  const [sessionMessage, setSessionMessage] = useState(null)

  const applySession = useCallback((session) => {
    setUser(session.user)
    setStatus('authenticated')
    setSessionMessage(null)
  }, [])

  const clearSession = useCallback((message = null) => {
    storage.clearSession()
    setUser(null)
    setStatus('anonymous')
    setSessionMessage(message)
  }, [])

  useEffect(() => {
    onSessionExpired(() => clearSession('Your session expired. Please sign in again.'))
  }, [clearSession])

  useEffect(() => {
    let cancelled = false
    if (!storage.getToken()) {
      setStatus('anonymous')
      return undefined
    }

    authApi
      .me()
      .then((profile) => {
        if (!cancelled) applySession({ user: profile })
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })

    return () => {
      cancelled = true
    }
  }, [applySession, clearSession])

  const login = useCallback(
    async (credentials) => {
      const session = await authApi.login(credentials)
      applySession(session)
      return session.user
    },
    [applySession],
  )

  const register = useCallback(
    async (payload) => {
      const session = await authApi.register(payload)
      applySession(session)
      return session.user
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    clearSession()
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      sessionMessage,
      login,
      register,
      logout,
      refresh: async () => {
        const profile = await authApi.me()
        setUser(profile)
        return profile
      },
      updateUser: (patch) => {
        setUser((current) => {
          const next = { ...current, ...patch }
          storage.setUser(next)
          return next
        })
      },
      clearSession,
    }),
    [user, status, sessionMessage, login, register, logout, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
