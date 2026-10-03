import { forwardRef, useId, useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'

export function FormField({ label, htmlFor, required, hint, error, children, className }) {
  return (
    <div className={cn('field', className)}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cn('input', invalid && 'input--invalid', className)} aria-invalid={invalid || undefined} {...rest} />
})

export const Textarea = forwardRef(function Textarea({ className, invalid, ...rest }, ref) {
  return <textarea ref={ref} className={cn('textarea', invalid && 'textarea--invalid', className)} aria-invalid={invalid || undefined} {...rest} />
})

export const Select = forwardRef(function Select({ className, invalid, children, placeholder, ...rest }, ref) {
  return (
    <select ref={ref} className={cn('select', invalid && 'select--invalid', className)} aria-invalid={invalid || undefined} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
})

export function PasswordInput({ className, invalid, ...rest }) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <div className="input-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={cn('input', invalid && 'input--invalid', className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        className="input-wrap__action"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
      </button>
    </div>
  )
}

export function Checkbox({ label, className, disabled, ...rest }) {
  return (
    <label className={cn('checkbox', disabled && 'checkbox--disabled', className)}>
      <input type="checkbox" disabled={disabled} {...rest} />
      {label && <span>{label}</span>}
    </label>
  )
}

export function Radio({ label, className, disabled, ...rest }) {
  return (
    <label className={cn('checkbox', disabled && 'checkbox--disabled', className)}>
      <input type="radio" disabled={disabled} {...rest} />
      {label && <span>{label}</span>}
    </label>
  )
}

export function Switch({ label, description, checked, onChange, disabled, id }) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label className="switch" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="switch__track" aria-hidden="true" />
      <span className="stack-sm" style={{ gap: 1 }}>
        {label && <span style={{ fontSize: 'var(--text-base)' }}>{label}</span>}
        {description && <span className="field__hint">{description}</span>}
      </span>
    </label>
  )
}

export function CheckboxGroup({ legend, options, value = [], onChange, columns = 2, describedBy }) {
  const toggle = (optionValue) => {
    const next = value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue]
    onChange(next)
  }

  return (
    <fieldset className="field" aria-describedby={describedBy}>
      <legend className="field__label">{legend}</legend>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 'var(--space-2)' }}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={() => toggle(option.value)}
          />
        ))}
      </div>
    </fieldset>
  )
}
