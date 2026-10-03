const STORAGE_KEYS = {
  user: 'testpilot.auth.user',
  theme: 'testpilot.theme',
  sidebar: 'testpilot.sidebar.collapsed',
  project: 'testpilot.activeProject',
}

/**
 * Auth state is a server-side session cookie, so nothing sensitive is stored
 * here. `user` is only a cache of `GET /auth/me` used to render before the
 * request resolves; the cookie is the actual authority.
 */
function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return null
  }
  return null
}

function readFlag(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeFlag(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, String(value))
  } catch {
    return null
  }
  return null
}

export const storage = {
  getUser: () => readJson(STORAGE_KEYS.user),
  setUser: (user) => writeJson(STORAGE_KEYS.user, user?.user ?? user),
  getTheme: () => readFlag(STORAGE_KEYS.theme),
  setTheme: (theme) => writeFlag(STORAGE_KEYS.theme, theme),
  getSidebarCollapsed: () => readFlag(STORAGE_KEYS.sidebar) === 'true',
  setSidebarCollapsed: (collapsed) => writeFlag(STORAGE_KEYS.sidebar, Boolean(collapsed)),
  getActiveProject: () => readJson(STORAGE_KEYS.project),
  setActiveProject: (project) => writeJson(STORAGE_KEYS.project, project),
  clearSession: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.user)
    } catch {
      return null
    }
  },
}

/** Reads the readable CSRF cookie issued alongside the session cookie. */
export function readCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}