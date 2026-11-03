import { BadgeCheck, Boxes, HeartHandshake, PackageCheck } from 'lucide-react'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Seo from '../components/ui/Seo'
import { IMAGE_PLACEHOLDERS } from '../lib/constants'

const commitments = [
  { icon: Boxes, title: 'Secure storage', text: 'Careful, organised storage for the inventory your business depends on.' },
  { icon: PackageCheck, title: 'Reliable order processing', text: 'A consistent approach to receiving, picking, packing and dispatch preparation.' },
  { icon: BadgeCheck, title: 'Professional packaging', text: 'Orders packed thoughtfully and prepared for courier handoff.' },
  { icon: HeartHandshake, title: 'Customer-first commitment', text: 'A service mindset focused on supporting your business and its customers.' },
]

export default function About() {
  return (
    <>
      <Seo title="About Our Fulfilment Team" description="Learn about our commitment to secure storage, organised inventory, reliable order processing and professional packaging across the United Kingdom." />
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">About us</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">A steady hand behind your growing business.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">We help businesses across the United Kingdom manage the moving parts between inventory arriving and customer orders being dispatched.</p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Your fulfilment partner</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900">Operations handled with care and clarity.</h2>
            <p className="mt-5 leading-7 text-slate-600">Our work is centred on secure storage, organised stock management, dependable order processing and professional packaging. We coordinate courier dispatch as part of the fulfilment process, while delivery itself is handled by the selected courier.</p>
            <p className="mt-4 leading-7 text-slate-600">As your requirements change, our team works with you to shape a practical operation around your products, customer expectations and order flow.</p>
            <Button to="/contact" className="mt-7">Talk to our team</Button>
          </div>
          <img src={IMAGE_PLACEHOLDERS.packing} alt="Carefully packed e-commerce order ready for dispatch" width="1000" height="800" loading="lazy" className="h-[380px] w-full rounded-3xl object-cover sm:h-[480px]" />
        </Container>
      </section>
      <section className="bg-navy-50/70 py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">What you can expect</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900">Committed to the details that matter</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <Icon className="h-6 w-6 text-orange-500" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
          <p className="mt-7 text-center text-sm text-slate-600">Multiple courier options are available for dispatch coordination, subject to your order and service requirements.</p>
        </Container>
      </section>
    </>
  )
}
