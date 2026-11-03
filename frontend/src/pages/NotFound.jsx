import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Container from '../components/ui/Container'
import Seo from '../components/ui/Seo'

export default function NotFound() {
  return (
    <>
      <Seo title="Page Not Found" description="The page you are looking for could not be found on this UK warehousing and fulfilment website." />
      <section className="flex min-h-[65vh] items-center py-16">
        <Container className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">404 — Page not found</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">This page isn’t in our inventory.</h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-600">The page may have moved or the address might be incorrect.</p>
          <Link to="/" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
            <ArrowLeft size={17} aria-hidden="true" /> Back to home
          </Link>
        </Container>
      </section>
    </>
  )
}
