import { getInquiryServiceLabels } from './adminUtils'

export default function ServiceBadges({ inquiry }) {
  const services = getInquiryServiceLabels(inquiry)
  if (services.length === 0) return <span className="text-sm text-slate-500">—</span>

  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {services.map((service) => (
        <span key={service} className="inline-flex rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800">
          {service}
        </span>
      ))}
    </span>
  )
}
