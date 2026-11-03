import { ArrowUpRight } from 'lucide-react'

export default function ServiceCard({ icon: Icon, title, description, index, className = '' }) {
  return (
    <article className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:border-navy-200 hover:shadow-soft motion-reduce:transform-none ${className}`}>
      <div className="mb-6 flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-900">
          <Icon aria-hidden="true" size={23} strokeWidth={1.8} />
        </span>
        {index && <span className="text-xs font-semibold tracking-widest text-slate-400">{index}</span>}
      </div>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ArrowUpRight aria-hidden="true" className="mt-5 h-4 w-4 text-orange-500 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
    </article>
  )
}
