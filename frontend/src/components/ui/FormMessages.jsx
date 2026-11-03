import { CheckCircle2, CircleAlert } from 'lucide-react'

export function FormSuccess({ children }) {
  return (
    <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
