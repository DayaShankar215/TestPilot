import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../context/PermissionsContext'
import { Spinner } from '../components/common/Spinner'
import { PermissionDeniedState } from '../components/feedback/States'

export function ProtectedRoute({ children, ability }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (ability) {
    return <AbilityGate ability={ability}>{children}</AbilityGate>
  }

  return children
}

export function AbilityGate({ ability, children }) {
  const { can } = usePermissions()

  if (!can(ability)) {
    return (
      <div className="card">
        <PermissionDeniedState message="Your workspace role does not include this permission. Contact a workspace admin to request access." />
      </div>
    )
  }

  return children
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return children
}
