import { BarChart3, Focus, PackageCheck, RefreshCw } from 'lucide-react'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'

const benefits = [
  { icon: Focus, title: 'Focus on your customers', description: 'Spend less time coordinating day-to-day warehouse tasks and more time growing your business.' },
  { icon: PackageCheck, title: 'A consistent order experience', description: 'Bring product handling, packing and dispatch preparation into a repeatable workflow.' },
  { icon: BarChart3, title: 'More operational clarity', description: 'Keep inventory activity and fulfilment steps easier to understand and manage.' },
  { icon: RefreshCw, title: 'Flexible support', description: 'Discuss a fulfilment setup that makes sense for the way your business operates.' },
]

export default function Benefits() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow="The business benefit" title="Create room to focus on growth" description="A thoughtful fulfilment operation supports a better customer experience while reducing the day-to-day warehouse workload on your team." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article key={title} className="border-t-2 border-orange-500 pt-5">
              <Icon size={25} className="text-navy-700" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
