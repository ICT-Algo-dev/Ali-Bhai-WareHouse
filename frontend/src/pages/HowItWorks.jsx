import { PackageCheck } from 'lucide-react'
import { FULFILLMENT_STEPS } from '../components/sections/HowItWorks'
import Container from '../components/ui/Container'
import StepCard from '../components/ui/StepCard'
import Button from '../components/ui/Button'
import Seo from '../components/ui/Seo'

export default function HowItWorksPage() {
  return (
    <>
      <Seo title="How Fulfilment Works" description="See how we receive your stock, manage inventory, pick and pack customer orders, and prepare them for UK carrier dispatch." />
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Our process</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Simple steps. Thoughtful fulfilment.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">A practical flow that connects your inventory to the orders your customers place.</p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
          <div>
            <div className="mb-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Fulfilment workflow</p>
              <h2 className="mt-3 text-2xl font-bold text-navy-900">From your inventory to carrier handoff</h2>
            </div>
            {FULFILLMENT_STEPS.map((step, index) => <StepCard key={step.title} number={String(index + 1).padStart(2, '0')} {...step} last={index === FULFILLMENT_STEPS.length - 1} />)}
          </div>
          <aside className="h-fit rounded-3xl bg-navy-50 p-7 sm:p-9">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-orange-500 shadow-card"><PackageCheck aria-hidden="true" /></span>
            <h2 className="mt-5 text-xl font-bold text-navy-900">Support for your operations</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">We take responsibility for warehousing and fulfilment tasks, then prepare shipments for dispatch with the carrier selected for your orders.</p>
            <Button to="/get-a-quote" className="mt-6">Discuss your workflow</Button>
          </aside>
        </Container>
      </section>
    </>
  )
}
