import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { Button } from '../../../components/common/Button'
import { FormField, Input } from '../../../components/forms/FormControls'
import { authApi } from '../../../services/endpoints/auth'
import { ROUTES } from '../../../utils/routes'
import { forgotPasswordSchema } from '../authSchemas'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [apiError, setApiError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values) => {
    setApiError(null)
    try {
      await authApi.requestPasswordReset(values.email)
      setEmail(values.email)
      setSent(true)
    } catch (error) {
      setApiError(error)
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="If an account exists for that address, a reset link is on its way."
        footer={
          <Link to={ROUTES.login} className="text-link">
            Back to sign in
          </Link>
        }
      >
        <div className="stack">
          <div className="alert alert--success">
            <MailCheck size={16} className="alert__icon" aria-hidden="true" />
            <div className="stack-sm" style={{ gap: 2 }}>
              <span className="alert__title">Reset link sent</span>
              <span>
                We sent reset instructions to <strong>{email}</strong>. The link expires in 60 minutes.
              </span>
            </div>
          </div>
          <Button variant="secondary" block onClick={() => setSent(false)}>
            Send to a different address
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email address on your account and we will send you a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to={ROUTES.login} className="text-link">
            Back to sign in
          </Link>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {apiError && <div className="alert alert--danger">{apiError.message}</div>}

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

        <Button type="submit" size="lg" block loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  )
}
