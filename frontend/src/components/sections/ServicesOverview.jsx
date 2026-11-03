import { Boxes, ClipboardList, PackageCheck, PackageOpen, ScanLine, Truck, Undo2 } from 'lucide-react'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import ServiceCard from '../ui/ServiceCard'
import Button from '../ui/Button'

export const SERVICES = [
  { icon: PackageOpen, title: 'Inventory Receiving', description: 'Receive incoming products, check quantities and record stock accurately.' },
  { icon: Boxes, title: 'Warehousing & Storage', description: 'Keep your products organised in a managed storage environment.' },
  { icon: ClipboardList, title: 'Inventory Management', description: 'Maintain clear stock records to support confident business decisions.' },
  { icon: PackageCheck, title: 'Order Fulfilment', description: 'We pick, pack and prepare customer orders for dispatch.' },
  { icon: ScanLine, title: 'Packaging & Labelling', description: 'Present orders professionally and prepare parcels for carrier handoff.' },
  { icon: Truck, title: 'Courier Dispatch', description: 'We prepare orders for dispatch with UK carriers including Royal Mail, DPD and Evri.' },
  { icon: Undo2, title: 'Returns Handling', description: 'Receive returned orders and coordinate the next inventory step.' },
]

export default function ServicesOverview({ compact = false }) {
  const services = compact ? SERVICES.slice(0, 4) : SERVICES
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="What we do"
          title="Fulfilment built around your business"
          description="Reliable operational support across the inventory journey, from receiving your stock to handing packed orders to a carrier."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => <ServiceCard key={service.title} {...service} index={String(index + 1).padStart(2, '0')} />)}
        </div>
        <div className="mt-9 text-center">
          <Button to="/services" variant="outline">Explore all services</Button>
        </div>
      </Container>
    </section>
  )
}
