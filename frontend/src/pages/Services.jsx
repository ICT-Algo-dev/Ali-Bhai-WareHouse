import { ArrowRight } from 'lucide-react'
import { SERVICES } from '../components/sections/ServicesOverview'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import ServiceCard from '../components/ui/ServiceCard'
import Button from '../components/ui/Button'
import Seo from '../components/ui/Seo'
import { Link } from 'react-router-dom'

export default function Services() {
  return (
    <>
      <Seo title="Fulfilment Services" description="Explore inventory receiving, warehousing, inventory management, order fulfilment, packaging, UK carrier dispatch and returns handling." />
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Our services</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">The operational support behind every order.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Choose connected warehousing and fulfilment services to match the way your business works across the United Kingdom.</p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading title="From inbound stock to returns" description="We manage your inventory and prepare orders for handoff to UK carriers including Royal Mail, DPD and Evri. We are a warehousing and fulfilment provider, not a courier company." />
          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, index) => <ServiceCard key={service.title} {...service} index={String(index + 1).padStart(2, '0')} />)}
          </div>
          <div className="mt-12 rounded-3xl bg-navy-50 p-7 sm:flex sm:items-center sm:justify-between sm:p-9">
            <div>
              <h2 className="text-xl font-bold text-navy-900">Looking for a tailored setup?</h2>
              <p className="mt-2 text-sm text-slate-600">Tell us about your products and order workflow.</p>
              <p className="mt-2 text-sm text-slate-600">Already preparing a delivery? <Link to="/inventory-intake" className="font-semibold text-navy-800 underline underline-offset-2">Submit an inventory intake</Link>.</p>
            </div>
            <Button to="/get-a-quote" className="mt-5 sm:mt-0">Get a quote <ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </Container>
      </section>
    </>
  )
}
