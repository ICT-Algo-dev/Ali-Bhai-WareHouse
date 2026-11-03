import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LoaderCircle, LockKeyhole, PackageCheck } from 'lucide-react'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import AdminSeo from './AdminSeo'
import Container from '../components/ui/Container'
import { Input } from '../components/ui/FormFields'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
})

export default function AdminLogin() {
  const { isAuthenticated, login, sessionExpired } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  if (isAuthenticated) return <Navigate to="/admin" replace />

  async function onSubmit(credentials) {
    setServerError('')
    try {
      await login(credentials)
      const destination = location.state?.from?.pathname?.startsWith('/admin')
        ? location.state.from.pathname
        : '/admin'
      navigate(destination, { replace: true })
    } catch {
      setServerError('Invalid credentials')
    }
  }

  return (
    <>
      <AdminSeo title="Admin sign in" />
      <main className="flex min-h-screen items-center bg-navy-950 px-5 py-12">
        <Container className="max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-soft sm:p-9">
            <Link to="/" className="inline-flex items-center gap-3 text-navy-900">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-white"><PackageCheck size={22} aria-hidden="true" /></span>
              <span className="text-sm font-bold">Warehouse &amp; Fulfilment</span>
            </Link>
            <div className="mt-8 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><LockKeyhole size={21} aria-hidden="true" /></div>
            <h1 className="mt-4 text-2xl font-bold text-navy-900">Admin sign in</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to review and manage customer enquiries.</p>
            {sessionExpired && (
              <p className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900" role="status">
                Session expired. Please sign in again.
              </p>
            )}
            {serverError && (
              <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                {serverError}
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
              <Input id="admin-email" label="Email address" type="email" autoComplete="username" placeholder="name@company.co.uk" error={errors.email?.message} {...register('email')} />
              <Input id="admin-password" label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
              <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <><LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Signing in…</> : 'Sign in'}
              </button>
            </form>
          </div>
        </Container>
      </main>
    </>
  )
}
