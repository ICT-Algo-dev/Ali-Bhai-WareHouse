export default function StepCard({ number, title, description, last = false }) {
  return (
    <div className="relative flex gap-5">
      {!last && <span aria-hidden="true" className="absolute left-[22px] top-12 h-[calc(100%+1rem)] w-px bg-navy-100" />}
      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-bold text-orange-600">
        {number}
      </span>
      <div className="pb-8">
        <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
        <p className="mt-2 max-w-xl leading-7 text-slate-600">{description}</p>
      </div>
    </div>
  )
}
