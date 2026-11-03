import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, PackageCheck, X } from 'lucide-react'
import Container from '../ui/Container'
import Button from '../ui/Button'
import { NAV_LINKS } from '../../lib/constants'

const navClass = ({ isActive }) => `text-sm font-medium transition-colors hover:text-orange-600 ${isActive ? 'text-orange-600' : 'text-slate-600'}`

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
      <Container className="flex h-[76px] items-center justify-between">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3 rounded-lg" aria-label="Warehouse & Fulfilment home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
            <PackageCheck size={22} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-navy-900">Warehouse</span>
            <span className="block text-xs font-medium text-slate-500">&amp; Fulfilment</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={navClass}>{link.label}</NavLink>)}
          <Button to="/get-a-quote" className="min-h-10 px-4 py-2">Get a quote</Button>
        </nav>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-navy-900 hover:bg-navy-50 md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </Container>
      {menuOpen && (
        <nav id="mobile-navigation" className="border-t border-slate-100 bg-white px-5 py-5 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={closeMenu} className={({ isActive }) => `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? 'bg-navy-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                {link.label}
              </NavLink>
            ))}
            <Button to="/get-a-quote" onClick={closeMenu} className="mt-3">Get a quote</Button>
          </div>
        </nav>
      )}
    </header>
  )
}
