import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/endpoints/auth'
import { usersApi } from '../services/endpoints/users'
import { onSessionExpired } from '../services/apiClient'
import { storage } from '../services/storage'

const AuthContext = createContext(null)

/**
 * The session lives in an HttpOnly cookie, so the only question this provider
 * answers is "does the server still consider me signed in?". On mount it always
 * calls `/auth/me`; there is no token in localStorage to inspect.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser())
  const [status, setStatus] = useState('loading')
  const [sessionMessage, setSessionMessage] = useState(null)

  const applySession = useCallback((payload) => {
    setUser(payload?.user ?? payload ?? null)
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

    authApi
      .me()
      .then((payload) => {
        if (!cancelled) applySession(payload)
      })
      .catch((error) => {
        if (cancelled) return
        // A network failure must not look like a logout; keep the cached user
        // and surface the problem instead.
        if (error?.isNetworkError) {
          setStatus(storage.getUser() ? 'authenticated' : 'anonymous')
          setSessionMessage('You appear to be offline. Some actions may fail.')
          return
        }
        clearSession()
      })

    return () => {
      cancelled = true
    }
  }, [applySession, clearSession])

  const login = useCallback(
    async (credentials) => {
      const session = await authApi.login(credentials)
      applySession(session)
      const profile = await authApi.me()
      applySession(profile)
      return profile.user
    },
    [applySession],
  )

  const register = useCallback(
    async (payload) => {
      const session = await authApi.register(payload)
      applySession(session)
      const profile = await authApi.me()
      applySession(profile)
      return profile.user
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
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
        applySession(profile)
        return profile
      },
      updateUser: async (patch) => {
        const response = await usersApi.updateProfile(patch)
        const next = { ...user, ...patch, ...(response?.user ?? {}) }
        setUser(next)
        storage.setUser(next)
        return next
      },
      clearSession,
    }),
    [user, status, sessionMessage, login, register, logout, clearSession, applySession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}