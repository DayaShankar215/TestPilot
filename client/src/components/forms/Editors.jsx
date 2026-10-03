import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '../common/Button'
import { Input, Textarea } from './FormControls'
import { cn } from '../../utils/cn'

const EMPTY_STEP = { action: '', expectedResult: '' }

export function StepEditor({ steps, onChange, errors = {}, disabled = false }) {
  const list = steps ?? []

  const updateStep = (index, field, value) => {
    onChange(list.map((step, stepIndex) => (stepIndex === index ? { ...step, [field]: value } : step)))
  }

  const addStep = () => onChange([...list, { ...EMPTY_STEP }])

  const removeStep = (index) => onChange(list.filter((_, stepIndex) => stepIndex !== index))

  const duplicateStep = (index) => {
    const copy = { ...list[index] }
    const next = [...list]
    next.splice(index + 1, 0, copy)
    onChange(next)
  }

  const moveStep = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="field__label">Test steps</span>
          <span className="field__hint">
            Steps run in order. Each step needs an action and an expected result.
          </span>
        </div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={addStep} disabled={disabled}>
          Add step
        </Button>
      </div>

      {list.length === 0 && (
        <div className="muted-panel">
          No steps yet. Add the first step to describe what the tester should do.
        </div>
      )}

      <div className="step-list">
        {list.map((step, index) => (
          <div key={step.id ?? `new-${index}`} className="step-card">
            <div className="step-card__number" aria-hidden="true">
              {index + 1}
            </div>
            <div className="step-card__body">
              <div className="field">
                <label className="field__label" htmlFor={`step-action-${index}`}>
                  Action
                  <span className="field__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <Textarea
                  id={`step-action-${index}`}
                  rows={2}
                  value={step.action}
                  onChange={(event) => updateStep(index, 'action', event.target.value)}
                  placeholder="Describe the action the tester performs"
                  disabled={disabled}
                  invalid={Boolean(errors[`steps.${index}.action`])}
                />
                {errors[`steps.${index}.action`] && (
                  <span className="field__error" role="alert">
                    {errors[`steps.${index}.action`]}
                  </span>
                )}
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`step-expected-${index}`}>
                  Expected result
                  <span className="field__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <Textarea
                  id={`step-expected-${index}`}
                  rows={2}
                  value={step.expectedResult}
                  onChange={(event) => updateStep(index, 'expectedResult', event.target.value)}
                  placeholder="Describe the outcome that proves the step passed"
                  disabled={disabled}
                  invalid={Boolean(errors[`steps.${index}.expectedResult`])}
                />
                {errors[`steps.${index}.expectedResult`] && (
                  <span className="field__error" role="alert">
                    {errors[`steps.${index}.expectedResult`]}
                  </span>
                )}
              </div>
            </div>
            <div className="step-card__controls">
              <span className="icon-btn" aria-hidden="true">
                <GripVertical size={14} />
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowUp}
                onClick={() => moveStep(index, -1)}
                disabled={disabled || index === 0}
                aria-label={`Move step ${index + 1} up`}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowDown}
                onClick={() => moveStep(index, 1)}
                disabled={disabled || index === list.length - 1}
                aria-label={`Move step ${index + 1} down`}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Copy}
                onClick={() => duplicateStep(index)}
                disabled={disabled}
                aria-label={`Duplicate step ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => removeStep(index)}
                disabled={disabled}
                aria-label={`Delete step ${index + 1}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TestDataEditor({ rows, onChange, disabled = false }) {
  const list = rows ?? []

  return (
    <div className="stack">
      <div className="row-between">
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="field__label">Test data</span>
          <span className="field__hint">Named values the tester can reference while executing.</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => onChange([...list, { name: '', value: '' }])}
          disabled={disabled}
        >
          Add value
        </Button>
      </div>
      {list.length === 0 && <div className="muted-panel">No test data defined for this case.</div>}
      {list.map((row, index) => (
        <div key={index} className={cn('row-sm', { 'step-card': false })}>
          <Input
            value={row.name}
            placeholder="Name"
            onChange={(event) =>
              onChange(list.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
            }
            disabled={disabled}
            aria-label={`Test data name ${index + 1}`}
          />
          <Input
            value={row.value}
            placeholder="Value"
            onChange={(event) =>
              onChange(list.map((item, itemIndex) => (itemIndex === index ? { ...item, value: event.target.value } : item)))
            }
            disabled={disabled}
            aria-label={`Test data value ${index + 1}`}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))}
            disabled={disabled}
            aria-label={`Delete test data row ${index + 1}`}
          />
        </div>
      ))}
    </div>
  )
}

export function ListEditor({ label, hint, items, onChange, placeholder = 'Add an item', disabled = false }) {
  const list = items ?? []

  return (
    <div className="stack">
      <div className="stack-sm" style={{ gap: 2 }}>
        <span className="field__label">{label}</span>
        {hint && <span className="field__hint">{hint}</span>}
      </div>
      <div className="stack-sm">
        {list.map((item, index) => (
          <div key={index} className="row-sm">
            <Textarea
              rows={2}
              value={item}
              placeholder={placeholder}
              onChange={(event) => onChange(list.map((value, valueIndex) => (valueIndex === index ? event.target.value : value)))}
              disabled={disabled}
              aria-label={`${label} item ${index + 1}`}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => onChange(list.filter((_, valueIndex) => valueIndex !== index))}
              disabled={disabled}
              aria-label={`Delete ${label} item ${index + 1}`}
            />
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        onClick={() => onChange([...list, ''])}
        disabled={disabled}
        style={{ alignSelf: 'flex-start' }}
      >
        Add {label.toLowerCase().replace(/s$/, '')}
      </Button>
    </div>
  )
}
