import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { Button } from '../../../components/common/Button'
import { Checkbox, FormField, Input, PasswordInput, Select } from '../../../components/forms/FormControls'
import { Alert } from '../../../components/feedback/States'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../utils/routes'
import { TIMEZONES } from '../../../utils/constants'
import { registerSchema } from '../authSchemas'

export function RegisterPage() {
  const { register: signUp } = useAuth()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', timezone: 'UTC', acceptTerms: false },
  })

  const password = watch('password')

  const onSubmit = async (values) => {
    setApiError(null)
    try {
      await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        timezone: values.timezone,
      })
      navigate(ROUTES.dashboard, { replace: true })
    } catch (error) {
      setApiError(error)
    }
  }

  const strength = [
    { label: '10+ characters', met: (password ?? '').length >= 10 },
    { label: 'Lowercase letter', met: /[a-z]/.test(password ?? '') },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password ?? '') },
    { label: 'Number', met: /\d/.test(password ?? '') },
  ]

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your TestPilot workspace access in a couple of minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to={ROUTES.login} className="text-link">
            Sign in
          </Link>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {apiError && (
          <Alert tone="danger" title="Could not create your account">
            {apiError.message}
          </Alert>
        )}

        <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" autoComplete="name" placeholder="Arun Mehta" invalid={Boolean(errors.name)} {...register('name')} />
        </FormField>

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

        <FormField label="Timezone" htmlFor="timezone" error={errors.timezone?.message}>
          <Select id="timezone" {...register('timezone')}>
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </FormField>

        <ul className="stack-sm" aria-live="polite" style={{ gap: 2 }}>
          {strength.map((rule) => (
            <li key={rule.label} className="row-sm" style={{ fontSize: 'var(--text-xs)' }}>
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: rule.met ? 'var(--success-soft)' : 'var(--surface-sunken)',
                  color: rule.met ? 'var(--success-text)' : 'var(--text-muted)',
                  border: `1px solid ${rule.met ? 'var(--success-border)' : 'var(--border)'}`,
                  fontSize: 9,
                }}
              >
                {rule.met ? '✓' : '·'}
              </span>
              <span className={rule.met ? 'text-success' : 'text-muted'}>{rule.label}</span>
            </li>
          ))}
        </ul>

        <FormField label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </FormField>

        <div className="stack-sm">
          <Checkbox label="I accept the terms of service and privacy policy" {...register('acceptTerms')} />
          {errors.acceptTerms && (
            <span className="field__error" role="alert">
              {errors.acceptTerms.message}
            </span>
          )}
        </div>

        <Button type="submit" size="lg" block loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
