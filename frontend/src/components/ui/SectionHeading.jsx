export default function SectionHeading({ eyebrow, title, description, align = 'center', className = '' }) {
  const alignment = align === 'left' ? 'text-left' : 'mx-auto text-center'
  return (
    <div className={`max-w-3xl ${alignment} ${className}`}>
      {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>}
      <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>}
    </div>
  )
}
