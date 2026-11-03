import { Quote } from 'lucide-react'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'

const samples = [
  { quote: 'Sample content — replace with an approved customer story before launch.', attribution: 'Online retail brand' },
  { quote: 'Sample content — replace with an approved customer story before launch.', attribution: 'Growing consumer business' },
  { quote: 'Sample content — replace with an approved customer story before launch.', attribution: 'Growing online retailer' },
]

export default function Testimonials() {
  return (
    <section className="bg-navy-50/70 py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow="Customer stories" title="Built around dependable operations" description="Sample content — replace with approved customer testimonials before publishing." />
        <div className="mt-11 grid gap-5 md:grid-cols-3">
          {samples.map((sample) => (
            <blockquote key={sample.attribution} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <Quote className="h-6 w-6 text-orange-500" aria-hidden="true" />
              <p className="mt-5 min-h-14 text-sm leading-6 text-slate-600">{sample.quote}</p>
              <footer className="mt-5 border-t border-slate-100 pt-4 text-sm font-semibold text-navy-900">{sample.attribution}</footer>
            </blockquote>
          ))}
        </div>
      </Container>
    </section>
  )
}
