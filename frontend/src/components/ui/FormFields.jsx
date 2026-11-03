import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const fieldClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100'

export const Input = forwardRef(function Input({ label, error, id, hint, hintBelow = false, className = '', ...props }, ref) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-navy-900">{label}</label>
      {hint && !hintBelow && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      <input ref={ref} id={id} className={`${fieldClass} ${error ? 'border-red-500' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props} />
      {hint && hintBelow && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  )
})

export const Select = forwardRef(function Select({ label, error, id, children, className = '', ...props }, ref) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-navy-900">{label}</label>
      <select ref={ref} id={id} className={`${fieldClass} ${error ? 'border-red-500' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props}>
        {children}
      </select>
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, id, className = '', ...props }, ref) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-navy-900">{label}</label>
      <textarea ref={ref} id={id} className={`${fieldClass} min-h-32 resize-y ${error ? 'border-red-500' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  )
})

export function CheckboxGroup({ label, options, value = [], onChange, error }) {
  function toggle(optionValue) {
    const updated = value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue]
    onChange(updated, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-navy-900">{label}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-navy-300">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-orange-500" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </fieldset>
  )
}

export function ConsentCheckbox({ register, error }) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-orange-500"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'consent-error' : undefined}
          {...register}
        />
        <span>
          I agree to be contacted about my enquiry. See our{' '}
          <Link to="/privacy-policy" className="font-semibold text-navy-800 underline underline-offset-2 hover:text-orange-600">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {error && <p id="consent-error" className="mt-1.5 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  )
}
