import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import Container from '../ui/Container'

export default function FinalCTA() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-navy-900 px-6 py-12 text-center sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Ready for a better workflow?</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">Let’s make fulfilment easier to manage.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Tell us about your products, order volume and operational goals. We’ll help you explore the right setup.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to="/get-a-quote">Request a quote <ArrowRight size={16} aria-hidden="true" /></Button>
            <Button to="/contact" variant="light">Talk to our team</Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
