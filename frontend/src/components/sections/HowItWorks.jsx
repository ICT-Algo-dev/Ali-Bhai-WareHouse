import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import StepCard from '../ui/StepCard'
import Button from '../ui/Button'
import { Link } from 'react-router-dom'

export const FULFILLMENT_STEPS = [
  { title: 'Send Your Inventory', description: 'Coordinate the inbound delivery of your products to our warehouse.' },
  { title: 'Inventory Receiving', description: 'We receive your products and record them into your inventory.' },
  { title: 'Safe Storage', description: 'Your stock is organised and stored until an order is ready.' },
  { title: 'Order Processing & Packing', description: 'Orders are picked, checked and packed according to your requirements.' },
  { title: 'Courier Dispatch', description: 'We hand off prepared shipments to available courier partners for delivery.' },
]

export default function HowItWorks({ preview = false }) {
  const steps = preview ? FULFILLMENT_STEPS.slice(0, 3) : FULFILLMENT_STEPS
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow="How it works" title="A clear path from stock to dispatch" description="A straightforward fulfilment workflow that keeps your inventory moving and your team in control." />
        <div className="mx-auto mt-12 max-w-3xl">
          {steps.map((step, index) => (
            <div key={step.title}>
              <StepCard number={String(index + 1).padStart(2, '0')} {...step} last={index === steps.length - 1} />
              {index === 0 && (
                <p className="-mt-3 mb-8 pl-16 text-sm text-slate-600">
                  <Link to="/inventory-intake" className="font-semibold text-navy-800 underline underline-offset-2 hover:text-orange-600">Submit your inventory details</Link>
                </p>
              )}
            </div>
          ))}
        </div>
        {preview && <div className="mt-3 text-center"><Button to="/how-it-works" variant="outline">See the full process</Button></div>}
      </Container>
    </section>
  )
}
