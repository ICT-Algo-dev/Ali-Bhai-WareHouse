import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, Mail, Phone, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { deleteInquiry, getAdminInquiries, getAllAdminInquiries, parseInquiryPage, updateInquiryStatus } from '../lib/api'
import AdminSeo from './AdminSeo'
import { Select } from '../components/ui/FormFields'
import Button from '../components/ui/Button'
import DeleteConfirmation from './DeleteConfirmation'
import StatusBadge from './StatusBadge'
import ServiceBadges from './ServiceBadges'
import { formatUKDateTime, getAdminLabel, getInquiryDate, getInquiryEntries, getInquiryId, getInquiryName, getInquiryStatus, getTechnicalEntries, INQUIRY_STATUSES } from './adminUtils'

function errorMessage(error) {
  if (error.response?.status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (error.response?.data?.message) return error.response.data.message
  if (error.response) return 'The requested action could not be completed. Please try again.'
  if (error.message && error.message !== 'Network Error') return error.message
  return 'Unable to connect to the server. Please check your connection and try again.'
}

function getRecord(response, id) {
  const parsed = parseInquiryPage(response, 1, 100)
  return parsed.inquiries.find((inquiry) => String(getInquiryId(inquiry)) === String(id)) || null
}

export default function AdminInquiryDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeInquiry = location.state?.inquiry
  const [inquiry, setInquiry] = useState(() => (
    routeInquiry && String(getInquiryId(routeInquiry)) === String(id) ? routeInquiry : null
  ))
  const [loading, setLoading] = useState(!inquiry)
  const [loadError, setLoadError] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [toast, setToast] = useState('')

  const loadInquiry = useCallback(async (signal) => {
    if (routeInquiry && String(getInquiryId(routeInquiry)) === String(id)) {
      setInquiry(routeInquiry)
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')
    try {
      const searchResponse = await getAdminInquiries({ page: 1, limit: 100, search: id }, signal)
      let found = getRecord(searchResponse, id)
      if (!found) {
        const allInquiries = await getAllAdminInquiries({}, signal)
        found = allInquiries.find((item) => String(getInquiryId(item)) === String(id)) || null
      }
      if (!found) {
        setLoadError('This inquiry could not be found.')
      } else {
        setInquiry(found)
      }
    } catch (error) {
      if (!signal.aborted) setLoadError(errorMessage(error))
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [id, routeInquiry])

  useEffect(() => {
    const controller = new AbortController()
    loadInquiry(controller.signal)
    return () => controller.abort()
  }, [loadInquiry])

  async function handleStatusChange(event) {
    const nextStatus = event.target.value
    const previousStatus = getInquiryStatus(inquiry)
    setInquiry((current) => ({ ...current, status: nextStatus }))
    setStatusBusy(true)
    setToast('')
    try {
      const response = await updateInquiryStatus(id, nextStatus)
      if (response?.success === false) throw new Error(response.message || 'Status update failed.')
      const returnedInquiry = response?.data?.inquiry ?? response?.data
      if (returnedInquiry && typeof returnedInquiry === 'object' && getInquiryId(returnedInquiry)) {
        setInquiry((current) => ({ ...current, ...returnedInquiry }))
      }
      setToast('Inquiry status updated.')
    } catch (error) {
      setInquiry((current) => ({ ...current, status: previousStatus }))
      setToast(errorMessage(error))
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleDelete() {
    setDeleteBusy(true)
    setToast('')
    try {
      const response = await deleteInquiry(id)
      if (response?.success === false) throw new Error(response.message || 'Delete failed.')
      navigate('/admin', { replace: true, state: { toast: 'Inquiry deleted.' } })
    } catch (error) {
      setToast(errorMessage(error))
      setDeleteBusy(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <>
        <AdminSeo title="Loading inquiry" />
        <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500 motion-reduce:animate-none" aria-hidden="true" />
          Loading inquiry…
        </div>
      </>
    )
  }

  if (!inquiry) {
    return (
      <>
        <AdminSeo title="Inquiry not found" />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-navy-900">{loadError || 'Inquiry not found'}</h1>
          <Link to="/admin" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-800 underline underline-offset-2"><ArrowLeft size={16} aria-hidden="true" /> Back to inquiries</Link>
        </div>
      </>
    )
  }

  const phone = inquiry.phone ?? inquiry.phoneNumber ?? ''
  const email = inquiry.email ?? ''
  const entries = getInquiryEntries(inquiry)
  const technicalEntries = getTechnicalEntries(inquiry)

  return (
    <>
      <AdminSeo title={`Inquiry ${id}`} />
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-orange-600">
        <ArrowLeft size={16} aria-hidden="true" /> Back to inquiries
      </Link>

      {toast && <p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">{toast}</p>}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Inquiry details</p>
            <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{getInquiryName(inquiry)}</h1>
            <p className="mt-2 text-sm text-slate-600">Created {formatUKDateTime(getInquiryDate(inquiry))} (UK time)</p>
            <div className="mt-3"><StatusBadge status={getInquiryStatus(inquiry)} /></div>
          </div>
          <div className="flex flex-wrap gap-3">
            {email && <Button href={`mailto:${email}`} variant="outline"><Mail size={16} aria-hidden="true" /> Reply by email</Button>}
            {phone && <Button href={`tel:${phone}`} variant="outline"><Phone size={16} aria-hidden="true" /> Call</Button>}
            <Button type="button" className="bg-red-700 hover:bg-red-800" onClick={() => setDeleteOpen(true)}><Trash2 size={16} aria-hidden="true" /> Delete</Button>
          </div>
        </div>
        <div className="mt-7 max-w-xs">
          <Select id="inquiry-detail-status" label="Update status" value={getInquiryStatus(inquiry)} disabled={statusBusy} onChange={handleStatusChange}>
            {INQUIRY_STATUSES.map((status) => <option key={status} value={status}>{getAdminLabel('status', status)}</option>)}
          </Select>
          {statusBusy && <p className="mt-2 text-xs text-slate-500" role="status">Saving status…</p>}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h2 className="text-xl font-bold text-navy-900">Submitted information</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([label, value]) => (
            <div key={label} className="min-w-0 border-b border-slate-100 pb-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 break-words whitespace-pre-wrap text-sm leading-6 text-navy-900">{value}</dd>
            </div>
          ))}
          <div className="min-w-0 border-b border-slate-100 pb-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Services</dt>
            <dd className="mt-2"><ServiceBadges inquiry={inquiry} /></dd>
          </div>
        </dl>
      </section>

      {technicalEntries.length > 0 && (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
          <summary className="cursor-pointer font-semibold text-navy-900 focus-visible:rounded-md">
            Technical details
          </summary>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {technicalEntries.map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-slate-100 pb-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm leading-6 text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {deleteOpen && (
        <DeleteConfirmation
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          busy={deleteBusy}
        />
      )}
    </>
  )
}
