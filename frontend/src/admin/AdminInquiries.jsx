import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { getAdminInquiries, getAllAdminInquiries, parseInquiryPage } from '../lib/api'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/FormFields'
import AdminSeo from './AdminSeo'
import StatusBadge from './StatusBadge'
import ServiceBadges from './ServiceBadges'
import {
  buildInquiryCsv,
  formatUKDateTime,
  getAdminLabel,
  getInquiryDate,
  getInquiryId,
  getInquiryName,
  getInquiryStatus,
  getInquiryType,
  isNewThisWeek,
} from './adminUtils'

const PAGE_SIZE = 20
const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'closed']

function requestError(error) {
  if (error.response?.status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (!error.response) return 'Unable to connect to the server. Please check your connection and try again.'
  return error.response.data?.message || 'Unable to load inquiries. Please try again.'
}

function TypeBadge({ type }) {
  const isQuote = type === 'quote'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isQuote ? 'bg-navy-100 text-navy-800' : 'bg-slate-100 text-slate-700'}`}>
      {getAdminLabel('type', type)}
    </span>
  )
}

function SummaryCard({ label, value, loading }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" aria-label={`Loading ${label}`} />
      ) : (
        <p className="mt-2 text-3xl font-bold tracking-tight text-navy-900">{value}</p>
      )}
    </article>
  )
}

function TableSkeleton() {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block" role="status" aria-label="Loading inquiries">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 6 }, (_, index) => (
            <tr key={index} className="border-b border-slate-100">
              <td colSpan="7" className="px-5 py-5"><div className="h-5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InquiryMobileCard({ inquiry }) {
  const id = getInquiryId(inquiry)
  const phone = inquiry.phone ?? inquiry.phoneNumber
  const email = inquiry.email

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/admin/inquiries/${encodeURIComponent(id)}`} className="font-semibold text-navy-900 underline-offset-2 hover:underline">{getInquiryName(inquiry)}</Link>
          <p className="mt-1 text-xs text-slate-500">{formatUKDateTime(getInquiryDate(inquiry))}</p>
        </div>
        <StatusBadge status={getInquiryStatus(inquiry)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TypeBadge type={getInquiryType(inquiry)} />
        {inquiry.businessName && inquiry.businessName !== getInquiryName(inquiry) && <span className="text-xs text-slate-600">{inquiry.businessName}</span>}
      </div>
      {phone && <p className="mt-3 text-sm"><a className="text-navy-700 underline underline-offset-2" href={`tel:${phone}`}>{phone}</a></p>}
      {email && <p className="mt-1 break-all text-sm"><a className="text-navy-700 underline underline-offset-2" href={`mailto:${email}`}>{email}</a></p>}
      <div className="mt-3"><ServiceBadges inquiry={inquiry} /></div>
    </article>
  )
}

function downloadCsv(csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `inquiries-${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replaceAll('/', '-')}.csv`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function AdminInquiries() {
  const location = useLocation()
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageData, setPageData] = useState(() => parseInquiryPage(null, 1, PAGE_SIZE))
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(location.state?.toast || '')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [type, status, debouncedSearch])

  const loadList = useCallback(async (signal) => {
    setLoading(true)
    setListError('')
    try {
      const params = { page, limit: PAGE_SIZE, type, status, search: debouncedSearch }
      const response = await getAdminInquiries(params, signal)
      const parsed = parseInquiryPage(response, page, PAGE_SIZE)
      parsed.inquiries.sort((left, right) => new Date(getInquiryDate(right) || 0) - new Date(getInquiryDate(left) || 0))
      setPageData(parsed)
    } catch (error) {
      if (!signal.aborted) setListError(requestError(error))
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [page, type, status, debouncedSearch])

  useEffect(() => {
    const controller = new AbortController()
    loadList(controller.signal)
    return () => controller.abort()
  }, [loadList])

  useEffect(() => {
    const controller = new AbortController()
    setSummaryLoading(true)
    setSummaryError('')
    getAllAdminInquiries({}, controller.signal)
      .then(setSummaryData)
      .catch((error) => {
        if (!controller.signal.aborted) setSummaryError(requestError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false)
      })
    return () => controller.abort()
  }, [])

  const summary = useMemo(() => {
    if (!summaryData) return null
    const inquiries = summaryData
    return {
      total: inquiries.length,
      newThisWeek: inquiries.filter((item) => isNewThisWeek(getInquiryDate(item))).length,
      newQuotes: inquiries.filter((item) => getInquiryType(item) === 'quote' && getInquiryStatus(item) === 'new').length,
    }
  }, [summaryData])

  async function handleExport() {
    setExporting(true)
    setToast('')
    try {
      const inquiries = await getAllAdminInquiries({ type, status, search: debouncedSearch })
      inquiries.sort((left, right) => new Date(getInquiryDate(right) || 0) - new Date(getInquiryDate(left) || 0))
      downloadCsv(buildInquiryCsv(inquiries))
      setToast(`Exported ${inquiries.length} ${inquiries.length === 1 ? 'inquiry' : 'inquiries'}.`)
    } catch (error) {
      setToast(requestError(error))
    } finally {
      setExporting(false)
    }
  }

  const inquiries = pageData.inquiries
  const pageCount = Math.max(pageData.totalPages, 1)

  return (
    <>
      <AdminSeo title="Inquiries" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900">Inquiries</h1>
          <p className="mt-2 text-sm text-slate-600">Review and manage contact enquiries and quote requests.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleExport} disabled={exporting} className="min-h-11">
          <Download size={17} aria-hidden="true" /> {exporting ? 'Preparing CSV…' : 'Export filtered list'}
        </Button>
      </div>

      {toast && <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">{toast}</p>}
      {summaryError && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">{summaryError}</p>}

      <section aria-label="Inquiry summary" className="mt-7 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total inquiries" value={summary?.total ?? '—'} loading={summaryLoading} />
        <SummaryCard label="New this week" value={summary?.newThisWeek ?? '—'} loading={summaryLoading} />
        <SummaryCard label="New quotes" value={summary?.newQuotes ?? '—'} loading={summaryLoading} />
      </section>

      <section aria-label="Filter inquiries" className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_0.7fr_0.7fr]">
          <div>
            <label htmlFor="inquiry-search" className="text-sm font-semibold text-navy-900">Search inquiries</label>
            <div className="relative mt-2">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input id="inquiry-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone or business" className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" />
            </div>
          </div>
          <Select id="inquiry-type" label="Type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All types</option>
            <option value="contact">{getAdminLabel('type', 'contact')}</option>
            <option value="quote">{getAdminLabel('type', 'quote')}</option>
          </Select>
          <Select id="inquiry-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{getAdminLabel('status', item)}</option>)}
          </Select>
        </div>
      </section>

      {listError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{listError}</p>}

      <section className="mt-5" aria-label="Inquiry results">
        {loading ? (
          <>
            <TableSkeleton />
            <div className="space-y-3 md:hidden" role="status" aria-label="Loading inquiries">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />)}
            </div>
          </>
        ) : inquiries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold text-navy-900">{listError ? 'Inquiries could not be loaded' : 'No inquiries found'}</h2>
            <p className="mt-2 text-sm text-slate-600">{listError ? 'Please try again shortly.' : 'Try adjusting your filters or search terms.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card md:block">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <caption className="sr-only">Filtered customer inquiries, newest first</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-4 font-semibold">Date/time</th>
                    <th scope="col" className="px-4 py-4 font-semibold">Type</th>
                    <th scope="col" className="px-4 py-4 font-semibold">Name or business</th>
                    <th scope="col" className="px-4 py-4 font-semibold">Phone</th>
                    <th scope="col" className="px-4 py-4 font-semibold">Email</th>
                    <th scope="col" className="px-4 py-4 font-semibold">Services</th>
                    <th scope="col" className="px-4 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inquiries.map((inquiry, index) => {
                    const id = getInquiryId(inquiry)
                    const phone = inquiry.phone ?? inquiry.phoneNumber
                    const email = inquiry.email
                    return (
                      <tr key={id ?? index} className="align-top text-slate-700 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-4">{formatUKDateTime(getInquiryDate(inquiry))}</td>
                        <td className="px-4 py-4"><TypeBadge type={getInquiryType(inquiry)} /></td>
                        <td className="max-w-48 px-4 py-4">
                          <Link to={`/admin/inquiries/${encodeURIComponent(id)}`} state={{ inquiry }} className="font-semibold text-navy-900 underline-offset-2 hover:underline">{getInquiryName(inquiry)}</Link>
                          {inquiry.businessName && inquiry.businessName !== getInquiryName(inquiry) && <span className="mt-1 block text-xs text-slate-500">{inquiry.businessName}</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">{phone ? <a href={`tel:${phone}`} className="text-navy-700 underline underline-offset-2">{phone}</a> : '—'}</td>
                        <td className="max-w-48 break-all px-4 py-4">{email ? <a href={`mailto:${email}`} className="text-navy-700 underline underline-offset-2">{email}</a> : '—'}</td>
                        <td className="max-w-52 px-4 py-4"><ServiceBadges inquiry={inquiry} /></td>
                        <td className="px-4 py-4"><StatusBadge status={getInquiryStatus(inquiry)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {inquiries.map((inquiry, index) => <InquiryMobileCard key={getInquiryId(inquiry) ?? index} inquiry={inquiry} />)}
            </div>
          </>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {pageData.hasTotal && pageData.total > 0
            ? `${pageData.total} ${pageData.total === 1 ? 'inquiry' : 'inquiries'}${pageData.totalPages > 1 ? ` · Page ${page} of ${pageCount}` : ''}`
            : inquiries.length > 0 ? `Showing ${inquiries.length} ${inquiries.length === 1 ? 'inquiry' : 'inquiries'} on this page` : ''}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-10 px-4 py-2" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
          <Button type="button" variant="outline" className="min-h-10 px-4 py-2" disabled={loading || !pageData.hasMore} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </div>
      </div>
    </>
  )
}
