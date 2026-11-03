import { ArrowUpRight } from 'lucide-react'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'

const courierNames = ['Royal Mail', 'DPD', 'Evri', 'DHL', 'UPS', 'FedEx', 'Parcelforce', 'and other UK and international carriers']

export default function CourierPartners() {
  return (
    <section className="border-y border-slate-100 bg-slate-50 py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Dispatch options" title="Courier choice that fits your workflow" description="We prepare shipments and coordinate handoff with courier services. Delivery is carried out by the courier selected for your orders." />
        <div className="mx-auto mt-9 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courierNames.map((name) => (
            <div key={name} className="flex min-h-20 items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 shadow-card">
              <span className="font-semibold text-navy-900">{name}</span>
              <ArrowUpRight size={18} className="text-orange-500" aria-hidden="true" />
            </div>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-500">
          Courier names indicate carriers we can dispatch with; no official partnership or endorsement is implied.
        </p>
      </Container>
    </section>
  )
}
