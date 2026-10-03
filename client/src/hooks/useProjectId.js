import { useParams } from 'react-router-dom'
import { useActiveProject } from '../context/ActiveProjectContext'

export function useProjectId() {
  const params = useParams()
  const { activeProjectId, requireProject } = useActiveProject()

  const fromRoute = params.projectId ?? null
  const projectId = fromRoute ?? requireProject
  const fromScope = Boolean(fromRoute) || activeProjectId !== 'all'

  return {
    projectId,
    fromRoute,
    fromScope,
    isMissing: !projectId,
  }
}
