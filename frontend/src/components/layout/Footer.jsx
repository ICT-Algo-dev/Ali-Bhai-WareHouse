import { Link } from 'react-router-dom'
import { Clock3, Mail, MapPin, PackageCheck, Phone } from 'lucide-react'
import Container from '../ui/Container'
import { ADDRESS, BUSINESS_INFO, NAV_LINKS } from '../../lib/constants'

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_0.8fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><PackageCheck size={22} aria-hidden="true" /></span>
              <span className="font-bold">Warehouse &amp; Fulfilment</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
              Practical warehousing, inventory management and order fulfilment for businesses ready to grow.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Explore</h2>
            <ul className="mt-4 space-y-3">
              {NAV_LINKS.map((link) => <li key={link.to}><Link className="text-sm text-slate-300 hover:text-white" to={link.to}>{link.label}</Link></li>)}
              <li><Link className="text-sm text-slate-300 hover:text-white" to="/get-a-quote">Get a quote</Link></li>
              <li><Link className="text-sm text-slate-300 hover:text-white" to="/inventory-intake">Inventory intake</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li><a className="inline-flex items-center gap-3 hover:text-white" href={`tel:${BUSINESS_INFO.phoneLink}`}><Phone size={16} aria-hidden="true" />{BUSINESS_INFO.phone}</a></li>
              <li><a className="inline-flex items-center gap-3 hover:text-white" href={`mailto:${BUSINESS_INFO.email}`}><Mail size={16} aria-hidden="true" />{BUSINESS_INFO.email}</a></li>
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 shrink-0" size={16} aria-hidden="true" /><address className="not-italic">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address></li>
              <li className="flex items-start gap-3"><Clock3 className="mt-0.5 shrink-0" size={16} aria-hidden="true" /><span>{BUSINESS_INFO.openingHours}</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6">
          <nav aria-label="Legal information" className="flex flex-wrap gap-x-6 gap-y-3">
            <Link className="text-xs text-slate-300 hover:text-white" to="/privacy-policy">Privacy Policy</Link>
            <Link className="text-xs text-slate-300 hover:text-white" to="/cookie-policy">Cookie Policy</Link>
            <Link className="text-xs text-slate-300 hover:text-white" to="/terms">Terms</Link>
          </nav>
          <div className="mt-5 space-y-1 text-xs text-slate-400">
            <p>Registered in England &amp; Wales, Company No. (placeholder: XXXXXXXX)</p>
            <div>Registered office: <address className="mt-1 not-italic">{ADDRESS.line1}, {ADDRESS.city}, {ADDRESS.postcode}, {ADDRESS.country}</address></div>
            <p>VAT No. (placeholder: GB XXXXXXXXX)</p>
          </div>
          <p className="mt-5 text-xs text-slate-400">© {new Date().getFullYear()} Warehouse &amp; Fulfilment. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  )
}
