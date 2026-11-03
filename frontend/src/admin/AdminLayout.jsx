import { LogOut, PackageCheck } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { useAuth } from './AuthContext'

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex min-h-[72px] items-center justify-between gap-4">
          <Link to="/admin" className="flex items-center gap-3 rounded-lg" aria-label="Admin dashboard">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
              <PackageCheck size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-navy-900">Warehouse &amp; Fulfilment</span>
              <span className="block text-xs text-slate-500">Admin dashboard</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/" className="hidden text-sm font-medium text-slate-600 hover:text-navy-900 sm:inline">View website</Link>
            <Button variant="outline" className="min-h-10 px-3 py-2" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </Container>
        <Container className="flex gap-2 pb-3">
          {[
            ['/admin', 'Inquiries', true],
            ['/admin/intakes', 'Intakes', false],
          ].map(([to, label, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}`}
            >
              {label}
            </NavLink>
          ))}
        </Container>
      </header>
      <main id="admin-main" className="py-8 sm:py-10">
        <Container>
          <Outlet />
        </Container>
      </main>
    </div>
  )
}
