const STORAGE_KEYS = {
  token: 'testpilot.auth.token',
  user: 'testpilot.auth.user',
  theme: 'testpilot.theme',
  sidebar: 'testpilot.sidebar.collapsed',
  project: 'testpilot.activeProject',
  preferences: 'testpilot.preferences',
}

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

export const storage = {
  getToken: () => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.token)
    } catch {
      return null
    }
  },
  setToken: (token) => {
    try {
      if (token) window.localStorage.setItem(STORAGE_KEYS.token, token)
      else window.localStorage.removeItem(STORAGE_KEYS.token)
    } catch {
      return null
    }
  },
  getUser: () => readJson(STORAGE_KEYS.user),
  setUser: (user) => writeJson(STORAGE_KEYS.user, user),
  getTheme: () => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.theme)
    } catch {
      return null
    }
  },
  setTheme: (theme) => {
    try {
      if (theme) window.localStorage.setItem(STORAGE_KEYS.theme, theme)
    } catch {
      return null
    }
  },
  getSidebarCollapsed: () => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.sidebar) === 'true'
    } catch {
      return false
    }
  },
  setSidebarCollapsed: (collapsed) => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.sidebar, String(Boolean(collapsed)))
    } catch {
      return null
    }
  },
  getActiveProject: () => readJson(STORAGE_KEYS.project),
  setActiveProject: (project) => writeJson(STORAGE_KEYS.project, project),
  getPreferences: () => readJson(STORAGE_KEYS.preferences) ?? {},
  setPreferences: (preferences) => writeJson(STORAGE_KEYS.preferences, preferences),
  clearSession: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.token)
      window.localStorage.removeItem(STORAGE_KEYS.user)
    } catch {
      return null
    }
  },
}
