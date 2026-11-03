import { BadgeCheck, Boxes, Headset, Layers3 } from 'lucide-react'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import { IMAGE_PLACEHOLDERS } from '../../lib/constants'

const reasons = [
  { icon: Boxes, title: 'Your stock, organised', description: 'A clear process for receiving, storing and tracking the products you entrust to us.' },
  { icon: Layers3, title: 'One connected workflow', description: 'Keep storage, pick-and-pack and dispatch coordination together in one operation.' },
  { icon: BadgeCheck, title: 'Careful handling', description: 'Thoughtful product handling and packaging at each stage of fulfilment.' },
  { icon: Headset, title: 'A responsive team', description: 'Work with a team focused on understanding your operational needs as they evolve.' },
]

export default function WhyChooseUs() {
  return (
    <section className="bg-navy-50/70 py-20 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <img src={IMAGE_PLACEHOLDERS.warehouse} alt="Warehouse storage area with neatly arranged inventory" width="1200" height="900" loading="lazy" className="h-[380px] w-full rounded-3xl object-cover sm:h-[480px]" />
          <div className="absolute bottom-5 right-5 max-w-[220px] rounded-2xl bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-navy-900">Built for growing operations</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">A considered approach to storage, orders and dispatch.</p>
          </div>
        </div>
        <div>
          <SectionHeading align="left" eyebrow="Why work with us" title="A dependable extension of your team" description="Outsource the operational details without losing sight of your stock or customer experience." />
          <div className="mt-9 grid gap-x-6 gap-y-7 sm:grid-cols-2">
            {reasons.map(({ icon: Icon, title, description }) => (
              <article key={title}>
                <Icon className="h-6 w-6 text-orange-500" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-navy-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
