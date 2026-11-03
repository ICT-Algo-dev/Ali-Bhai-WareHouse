import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import Container from '../components/ui/Container'
import Seo from '../components/ui/Seo'
import ContactForm from '../components/sections/ContactForm'
import { ADDRESS, BUSINESS_INFO, MAP_EMBED_URL, MAP_SEARCH_URL } from '../lib/constants'

export default function Contact() {
  const [mapFailed, setMapFailed] = useState(false)

  return (
    <>
      <Seo title="Contact Us" description="Contact our UK warehousing and fulfilment team to discuss storage, inventory management and order fulfilment." includePostalAddress />
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Contact</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Let’s talk about your operations.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Tell us what you need help with and our team will be in touch.</p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="grid items-start gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <aside>
            <h2 className="text-2xl font-bold text-navy-900">Get in touch</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Reach us directly or send a message using the form.</p>
            <div className="mt-7 space-y-5">
              <a href={`tel:${BUSINESS_INFO.phoneLink}`} className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4 hover:border-navy-300">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
                <span><span className="block text-xs font-medium text-slate-500">Phone</span><span className="mt-1 block text-sm font-semibold text-navy-900">{BUSINESS_INFO.phone}</span></span>
              </a>
              <a href={`mailto:${BUSINESS_INFO.email}`} className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4 hover:border-navy-300">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
                <span><span className="block text-xs font-medium text-slate-500">Email</span><span className="mt-1 block text-sm font-semibold text-navy-900">{BUSINESS_INFO.email}</span></span>
              </a>
              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
                <span><span className="block text-xs font-medium text-slate-500">Address</span><address className="mt-1 text-sm font-semibold not-italic leading-6 text-navy-900">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address></span>
              </div>
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              {!mapFailed ? (
                <iframe
                  title="Map showing our warehouse location"
                  src={MAP_EMBED_URL}
                  width="100%"
                  height="250"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block"
                  onError={() => setMapFailed(true)}
                />
              ) : (
                <div className="min-h-[250px] bg-slate-50 p-6 text-sm text-slate-700">
                  <p className="font-semibold text-navy-900">Map unavailable</p>
                  <address className="mt-2 not-italic leading-6">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address>
                </div>
              )}
            </div>
            <a href={MAP_SEARCH_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-navy-800 underline underline-offset-2">Open in Google Maps</a>
          </aside>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-9">
            <h2 className="mb-6 text-2xl font-bold text-navy-900">Send us a message</h2>
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  )
}
