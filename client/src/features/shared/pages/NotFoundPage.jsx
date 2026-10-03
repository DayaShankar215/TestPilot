import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Card, CardBody } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { EmptyState } from '../../../components/common/EmptyState'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../utils/routes'

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  const destination = isAuthenticated ? ROUTES.dashboard : ROUTES.login
  const label = isAuthenticated ? 'Back to dashboard' : 'Go to sign in'

  return (
    <div
      className={isAuthenticated ? 'page' : 'auth-shell__panel'}
      style={isAuthenticated ? undefined : { minHeight: '100vh' }}
    >
      <Card>
        <CardBody>
          <EmptyState
            icon={Compass}
            title="This page does not exist"
            description="The link may be out of date, or the record it pointed to was removed."
          />
          <div className="row" style={{ justifyContent: 'center' }}>
            <Button as={Link} to={destination} icon={Compass}>
              {label}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}