import { getAdminLabel } from './adminUtils'

const statusStyles = {
  new: 'bg-orange-100 text-orange-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
}

export default function StatusBadge({ status = 'new' }) {
  const normalised = Object.hasOwn(statusStyles, status) ? status : 'new'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[normalised]}`}>
      {getAdminLabel('status', normalised)}
    </span>
  )
}
