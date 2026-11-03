import { ShieldCheck } from 'lucide-react'
import Container from '../components/ui/Container'
import Seo from '../components/ui/Seo'
import QuoteForm from '../components/sections/QuoteForm'

export default function GetQuote() {
  return (
    <>
      <Seo title="Request a Fulfilment Quote" description="Share your inventory, monthly order volume and service requirements to request a UK warehousing and fulfilment quote." />
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Get a quote</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">A fulfilment setup built around your needs.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Tell us a little about your business and we’ll follow up to discuss a practical solution.</p>
        </Container>
      </section>
      <section className="py-14 sm:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-14">
          <aside className="lg:sticky lg:top-28">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><ShieldCheck aria-hidden="true" /></div>
            <h2 className="mt-5 text-2xl font-bold text-navy-900">Help us understand your operation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Share the services you need and a rough idea of your inventory and order volumes. We’ll use this information to start a conversation about the right fit.</p>
            <p className="mt-5 text-xs leading-5 text-slate-500">Submitting this form does not create a service agreement. We’ll contact you to learn more.</p>
          </aside>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-9">
            <QuoteForm />
          </div>
        </Container>
      </section>
    </>
  )
}
