import { ArrowRight, Check } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from '../ui/Button'
import Container from '../ui/Container'
import { IMAGE_PLACEHOLDERS } from '../../lib/constants'

export default function Hero() {
  const reduceMotion = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-navy-950">
      <Container className="grid min-h-[620px] items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Warehousing &amp; fulfilment across the UK
          </div>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your Inventory,<br /><span className="text-orange-400">Our Responsibility.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Complete warehousing, inventory management and order fulfilment solutions. We store, pack and dispatch while you focus on growing your business.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/get-a-quote" className="sm:min-w-40">Get a Quote <ArrowRight size={17} aria-hidden="true" /></Button>
            <Button to="/contact" variant="light" className="sm:min-w-40">Contact Us</Button>
          </div>
          <ul className="mt-9 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            {['Inventory handled with care', 'Flexible fulfilment support', 'Dispatch through carrier options'].map((item) => (
              <li key={item} className="flex items-center gap-2"><Check size={16} className="text-orange-400" aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </motion.div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-[2rem] border border-white/10" aria-hidden="true" />
          <img
            src={IMAGE_PLACEHOLDERS.hero}
            alt="Organised warehouse shelving and inventory"
            width="1400"
            height="1000"
            className="relative h-[330px] w-full rounded-3xl object-cover shadow-2xl sm:h-[440px]"
          />
          <div className="absolute -bottom-5 left-5 max-w-[250px] rounded-2xl border border-white/60 bg-white p-4 shadow-soft sm:left-[-2rem]">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">One operations partner</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-navy-900">From inbound stock to courier handoff</p>
          </div>
        </div>
      </Container>
    </section>
  )
}
