import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { FormField, PasswordInput } from '../../../components/forms/FormControls'
import { Alert } from '../../../components/feedback/States'
import { EmptyState } from '../../../components/common/EmptyState'
import { authApi } from '../../../services/endpoints/auth'
import { ROUTES } from '../../../utils/routes'
import { resetPasswordSchema } from '../authSchemas'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState(null)

  const email = searchParams.get('email') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  if (!email) {
    return (
      <div className="auth-shell__panel" style={{ minHeight: '100vh' }}>
        <div className="auth-card">
          <EmptyState
            icon={KeyRound}
            title="Reset link is missing its token"
            description="Password reset links include an email and a single-use token. Request a new link to continue."
          />
          <div className="row" style={{ justifyContent: 'center' }}>
            <Button as={Link} to={ROUTES.forgotPassword}>
              Request a new link
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const onSubmit = async (values) => {
    setApiError(null)
    try {
      await authApi.resetPassword({ email, password: values.password })
      navigate(ROUTES.login, { replace: true, state: { resetComplete: true } })
    } catch (error) {
      setApiError(error)
    }
  }

  return (
    <div className="auth-shell__panel" style={{ minHeight: '100vh' }}>
      <div className="auth-card">
        <Link to={ROUTES.login} className="app-brand" style={{ marginBottom: 'var(--space-8)' }}>
          <span className="app-brand__mark" aria-hidden="true">
            TP
          </span>
          <span className="app-brand__text">TestPilot</span>
        </Link>

        <div className="stack-sm" style={{ gap: 6, marginBottom: 'var(--space-6)' }}>
          <h1 className="page__title">Choose a new password</h1>
          <p className="text-secondary">Setting a new password for {email}.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          {apiError && (
            <Alert tone="danger" title="Could not reset your password">
              {apiError.message}
            </Alert>
          )}

          <FormField label="New password" htmlFor="password" required error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              invalid={Boolean(errors.confirmPassword)}
              {...register('confirmPassword')}
            />
          </FormField>

          <Button type="submit" size="lg" block loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
