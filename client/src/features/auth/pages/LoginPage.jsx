import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { Button } from '../../../components/common/Button'
import { Checkbox, FormField, PasswordInput, Input } from '../../../components/forms/FormControls'
import { Alert } from '../../../components/feedback/States'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../utils/routes'
import { loginSchema } from '../authSchemas'

export function LoginPage() {
  const { login, sessionMessage } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [apiError, setApiError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  })

  const onSubmit = async (values) => {
    setApiError(null)
    try {
      await login({ email: values.email, password: values.password })
      const destination = location.state?.from?.pathname ?? ROUTES.dashboard
      navigate(destination, { replace: true })
    } catch (error) {
      setApiError(error)
    }
  }

  return (
    <AuthLayout
      title="Sign in to TestPilot"
      subtitle="Manage requirements, test execution and release readiness from one workspace."
      footer={
        <>
          New to TestPilot?{' '}
          <Link to={ROUTES.register} className="text-link">
            Create an account
          </Link>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {(sessionMessage || apiError) && (
          <Alert tone="danger" title={sessionMessage ? 'Session ended' : 'Could not sign in'}>
            {apiError?.message ?? sessionMessage}
          </Alert>
        )}

        <FormField label="Email address" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
          hint={
            <Link to={ROUTES.forgotPassword} className="text-link">
              Forgot your password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </FormField>

        <Checkbox label="Keep me signed in on this device" {...register('rememberMe')} />

        <Button type="submit" size="lg" block loading={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        {apiError?.isNetworkError && (
          <p className="text-muted row-sm" style={{ fontSize: 'var(--text-xs)', gap: 6 }}>
            <AlertCircle size={12} aria-hidden="true" />
            Check that the API is running and VITE_API_BASE_URL is correct.
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
