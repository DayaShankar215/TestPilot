import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { projectsApi } from '../services/endpoints/projects'
import { storage } from '../services/storage'
import { useAuth } from './AuthContext'

const ActiveProjectContext = createContext(null)

export function ActiveProjectProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(() => storage.getActiveProject()?.id ?? 'all')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const { items } = await projectsApi.list({ page: 1, pageSize: 100, sortBy: 'name' })
      setProjects(items)
      setStatus('ready')
      return items
    } catch (caught) {
      setError(caught)
      setStatus('error')
      return []
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated, load])

  const setActiveProject = useCallback((projectId) => {
    const next = projectId === 'all' ? 'all' : projectId
    setActiveProjectId(next)
    const project = projects.find((item) => item.id === next)
    storage.setActiveProject(project ? { id: project.id, name: project.name, key: project.key } : { id: 'all', name: 'All projects' })
  }, [projects])

  const value = useMemo(
    () => ({
      projects,
      activeProjectId,
      activeProject: projects.find((item) => item.id === activeProjectId) ?? null,
      setActiveProject,
      reloadProjects: load,
      status,
      error,
      isAll: activeProjectId === 'all',
      requireProject: activeProjectId === 'all' ? null : activeProjectId,
    }),
    [projects, activeProjectId, setActiveProject, load, status, error],
  )

  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext)
  if (!context) throw new Error('useActiveProject must be used inside ActiveProjectProvider')
  return context
}
