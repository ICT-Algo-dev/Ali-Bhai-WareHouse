import { ArrowRight, PackageCheck } from 'lucide-react'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Seo from '../components/ui/Seo'

const courierServices = [
  'Royal Mail',
  'DPD',
  'Evri',
  'DHL',
  'UPS',
  'FedEx',
  'Parcelforce',
  'and other UK and international carriers',
]

export default function CourierPartners() {
  return (
    <>
      <Seo title="UK Courier Dispatch Options" description="We prepare orders for dispatch with Royal Mail, DPD, Evri, DHL, UPS, FedEx, Parcelforce and other UK and international carriers. Delivery is carried out by the selected carrier." />
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Courier dispatch</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Your orders, prepared for courier handoff.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">We are a third-party warehousing and fulfilment provider. We prepare and hand off shipments; delivery is managed by the carrier selected for each order.</p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><PackageCheck aria-hidden="true" /></div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy-900">Courier options for dispatch coordination</h2>
            <p className="mt-4 leading-7 text-slate-600">We pack your orders and coordinate dispatch through the carrier option suitable for your workflow and service availability.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {courierServices.map((name) => (
              <article key={name} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
                <h3 className="text-xl font-bold text-navy-900">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Carrier option for prepared orders, subject to your dispatch requirements and service availability.</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-7 max-w-3xl text-center text-sm leading-6 text-slate-500">
            Courier names indicate carriers we can dispatch with; no official partnership or endorsement is implied.
          </p>
          <div className="mt-10 text-center">
            <Button to="/get-a-quote">Discuss dispatch options <ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </Container>
      </section>
    </>
  )
}
