import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/FormFields'
import { getAdminIntakes } from '../lib/api'
import AdminSeo from './AdminSeo'
import IntakeStatusBadge from './IntakeStatusBadge'
import { formatIntakeDate, formatIntakeNumber, getIntakeDate, getIntakeId, getIntakeReference, getIntakeStatusLabel, getIntakeTotals, getIntakeStatus, parseIntakePage, INTAKE_STATUSES } from './intakeUtils'

const PAGE_SIZE = 20

function requestError(error) {
  if (error.response?.status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (!error.response) return 'Unable to connect to the server. Please check your connection and try again.'
  return error.response.data?.message || 'Unable to load inventory intakes. Please try again.'
}

function IntakeSummary({ intake }) {
  const totals = getIntakeTotals(intake)
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div><dt className="text-xs text-slate-500">SKUs</dt><dd className="font-semibold text-navy-900">{formatIntakeNumber(totals.skus)}</dd></div>
      <div><dt className="text-xs text-slate-500">Cartons</dt><dd className="font-semibold text-navy-900">{formatIntakeNumber(totals.cartons)}</dd></div>
      <div><dt className="text-xs text-slate-500">Units</dt><dd className="font-semibold text-navy-900">{formatIntakeNumber(totals.units)}</dd></div>
      <div><dt className="text-xs text-slate-500">Gross weight</dt><dd className="font-semibold text-navy-900">{formatIntakeNumber(totals.grossWeightKg)} kg</dd></div>
    </dl>
  )
}

function needsDangerousGoodsReview(intake) {
  return intake.requiresDgReview === true
    || intake.requiresDgReview === 'true'
    || intake.requires_dg_review === true
    || intake.requires_dg_review === 'true'
}

function DangerousGoodsBadge() {
  return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">DG review</span>
}

function MissingFilesBadge() {
  return <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Files missing</span>
}

function filesAreMissing(intake) {
  return (intake.documentsStatus ?? intake.documents_status) === 'incomplete'
}

export default function AdminIntakes() {
  const location = useLocation()
  const [status, setStatus] = useState('')
  const [dgReview, setDgReview] = useState('')
  const [documentsStatus, setDocumentsStatus] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageData, setPageData] = useState(() => parseIntakePage(null, 1, PAGE_SIZE))
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(location.state?.toast || '')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [status, debouncedSearch, dgReview, documentsStatus])

  const load = useCallback(async (signal) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const response = await getAdminIntakes({
        page,
        limit: PAGE_SIZE,
        status,
        search: debouncedSearch,
        requiresDgReview: dgReview === '' ? '' : String(dgReview === 'needs-review'),
        documentsStatus,
      }, signal)
      const parsed = parseIntakePage(response, page, PAGE_SIZE)
      parsed.intakes.sort((left, right) => new Date(getIntakeDate(right) || 0) - new Date(getIntakeDate(left) || 0))
      setPageData(parsed)
    } catch (error) {
      if (!signal.aborted) setErrorMessage(requestError(error))
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [page, status, debouncedSearch, dgReview, documentsStatus])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const intakes = pageData.intakes

  return (
    <>
      <AdminSeo title="Inventory intakes" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Admin</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900">Inventory intakes</h1><p className="mt-2 text-sm text-slate-600">Review inbound stock submissions and warehouse receiving details.</p></div>
      </div>
      {toast && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{toast}</p>}

      <section aria-label="Filter inventory intakes" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="intake-search" className="text-sm font-semibold text-navy-900">Search intakes</label>
            <div className="relative mt-2">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input id="intake-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, business, contact or SKU" className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" />
            </div>
          </div>
          <Select id="intake-status-filter" label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {INTAKE_STATUSES.map((item) => <option key={item} value={item}>{getIntakeStatusLabel(item)}</option>)}
          </Select>
          <Select id="intake-dg-review-filter" label="Dangerous goods" value={dgReview} onChange={(event) => setDgReview(event.target.value)}>
            <option value="">All</option>
            <option value="needs-review">Needs DG review</option>
            <option value="no-items">No DG items</option>
          </Select>
          <Select id="intake-files-filter" label="Files" value={documentsStatus} onChange={(event) => setDocumentsStatus(event.target.value)}>
            <option value="">All files</option>
            <option value="complete">Files complete</option>
            <option value="incomplete">Files missing</option>
          </Select>
        </div>
      </section>

      {errorMessage && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>}
      <section className="mt-5" aria-label="Inventory intake results">
        {loading ? (
          <div className="space-y-3" role="status" aria-label="Loading inventory intakes">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />)}
          </div>
        ) : intakes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold text-navy-900">{errorMessage ? 'Intakes could not be loaded' : 'No inventory intakes found'}</h2>
            <p className="mt-2 text-sm text-slate-600">{errorMessage ? 'Please try again shortly.' : 'Try adjusting your filters or search terms.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card md:block">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <caption className="sr-only">Inventory intakes, newest first</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>
                  {['Reference', 'Date/time', 'Business', 'Contact', 'SKUs', 'Cartons', 'Units', 'Gross weight', 'Status'].map((label) => <th key={label} scope="col" className="px-4 py-4 font-semibold">{label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">{intakes.map((intake, index) => {
                  const id = getIntakeId(intake)
                  const totals = getIntakeTotals(intake)
                  const contact = intake.contactPerson ?? intake.customer?.contactPerson ?? '—'
                  return (
                    <tr key={id ?? index} className="align-top text-slate-700 hover:bg-slate-50">
                      <td className="px-4 py-4"><Link to={`/admin/intakes/${encodeURIComponent(id)}`} state={{ intake }} className="font-semibold text-navy-900 underline-offset-2 hover:underline">{getIntakeReference(intake)}</Link>{(needsDangerousGoodsReview(intake) || filesAreMissing(intake)) && <div className="mt-2 flex flex-wrap gap-2">{needsDangerousGoodsReview(intake) && <DangerousGoodsBadge />}{filesAreMissing(intake) && <MissingFilesBadge />}</div>}</td>
                      <td className="whitespace-nowrap px-4 py-4">{formatIntakeDate(getIntakeDate(intake))}</td>
                      <td className="px-4 py-4">{intake.businessName ?? intake.customer?.businessName ?? '—'}</td>
                      <td className="px-4 py-4">{contact}</td>
                      <td className="px-4 py-4">{formatIntakeNumber(totals.skus)}</td>
                      <td className="px-4 py-4">{formatIntakeNumber(totals.cartons)}</td>
                      <td className="px-4 py-4">{formatIntakeNumber(totals.units)}</td>
                      <td className="px-4 py-4">{formatIntakeNumber(totals.grossWeightKg)} kg</td>
                      <td className="px-4 py-4"><IntakeStatusBadge status={getIntakeStatus(intake)} /></td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {intakes.map((intake, index) => {
                const id = getIntakeId(intake)
                return (
                  <article key={id ?? index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div><Link to={`/admin/intakes/${encodeURIComponent(id)}`} state={{ intake }} className="font-semibold text-navy-900 underline">{getIntakeReference(intake)}</Link><p className="mt-1 text-xs text-slate-500">{formatIntakeDate(getIntakeDate(intake))}</p></div>
                      <div className="flex flex-col items-start gap-2"><IntakeStatusBadge status={getIntakeStatus(intake)} />{needsDangerousGoodsReview(intake) && <DangerousGoodsBadge />}{filesAreMissing(intake) && <MissingFilesBadge />}</div>
                    </div>
                    <p className="mt-3 text-sm font-medium text-navy-900">{intake.businessName ?? intake.customer?.businessName ?? '—'}</p>
                    <p className="mt-1 text-sm text-slate-600">{intake.contactPerson ?? intake.customer?.contactPerson ?? '—'}</p>
                    <div className="mt-3"><IntakeSummary intake={intake} /></div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{pageData.total ? `${pageData.total} ${pageData.total === 1 ? 'intake' : 'intakes'} · Page ${page} of ${Math.max(pageData.totalPages, 1)}` : ''}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-10 px-4 py-2" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
          <Button type="button" variant="outline" className="min-h-10 px-4 py-2" disabled={loading || !pageData.hasMore} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </div>
      </div>
    </>
  )
}
