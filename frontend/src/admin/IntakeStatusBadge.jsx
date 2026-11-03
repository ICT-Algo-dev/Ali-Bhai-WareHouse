import { getIntakeStatus, getIntakeStatusLabel } from './intakeUtils'

const STYLES = {
  submitted: 'bg-orange-100 text-orange-800',
  'under-review': 'bg-blue-100 text-blue-800',
  received: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
}

export default function IntakeStatusBadge({ status }) {
  const normalised = getIntakeStatus({ status })
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[normalised]}`}>{getIntakeStatusLabel(normalised)}</span>
}
