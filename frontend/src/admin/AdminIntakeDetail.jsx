import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Download, LoaderCircle, Mail, Phone, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/FormFields'
import { deleteAdminIntakeFile, deleteIntake, downloadAdminIntakeFile, downloadAdminIntakeFilesZip, downloadAdminIntakePdf, getAdminIntake, updateIntakeProductVerification, updateIntakeStatus } from '../lib/api'
import { getAdminLabel, humaniseLabel } from '../admin/adminUtils'
import { INTAKE_OPTION_GROUPS } from '../lib/constants'
import DeleteConfirmation from './DeleteConfirmation'
import IntakeFilesPanel from './IntakeFilesPanel'
import AdminSeo from './AdminSeo'
import IntakeStatusBadge from './IntakeStatusBadge'
import { formatIntakeDate, formatIntakeNumber, getIntakeCategoryLabel, getIntakeDate, getIntakeId, getIntakeProductTotals, getIntakeProducts, getIntakeReference, getIntakeStatus, getIntakeStatusLabel, getIntakeTechnicalEntries, getIntakeTotals, INTAKE_STATUSES } from './intakeUtils'

function requestError(error) {
  if (error.response?.status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (error.response?.data?.message) return error.response.data.message
  if (!error.response) return 'Unable to connect to the server. Please check your connection and try again.'
  return 'The requested action could not be completed. Please try again.'
}

function unwrapIntake(response) {
  const data = response?.data ?? response
  return data?.intake ?? data
}

function normaliseFiles(files) {
  if (Array.isArray(files)) return files
  if (!files || typeof files !== 'object') return []
  if (files.kind || files.id || files._id || files.fileId || files.originalName) return [files]
  return Object.entries(files).flatMap(([kind, entries]) => (
    (Array.isArray(entries) ? entries : [entries]).filter(Boolean).map((file) => ({ kind, ...file }))
  ))
}

function getFileId(file) {
  return file.id ?? file._id ?? file.fileId
}

function getFileName(file) {
  const rawName = file.originalName ?? file.originalFilename ?? file.filename ?? file.name ?? 'uploaded-file'
  return String(rawName).split(/[\\/]/).pop() || 'uploaded-file'
}

function getContentDispositionName(header, fallback) {
  if (!header) return fallback
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const basic = header.match(/filename="?([^";]+)"?/i)?.[1]
  try {
    return decodeURIComponent(encoded || basic || fallback).split(/[\\/]/).pop() || fallback
  } catch {
    return fallback
  }
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function listIntakeFiles(intake) {
  return normaliseFiles(intake.files ?? intake.documents ?? intake.attachments)
}

function getProductFiles(product, allFiles) {
  const productFiles = normaliseFiles(product.files ?? product.documents ?? product.attachments)
  if (productFiles.length) return productFiles
  const productId = String(product.id ?? product._id ?? '')
  const sku = String(product.sku ?? '')
  return allFiles.filter((file) => (
    (file.productId != null && String(file.productId) === productId)
    || (file.sku != null && String(file.sku) === sku)
  ))
}

function isSubmissionFile(file) {
  return ['commercial-invoice', 'other-document'].includes(file.kind ?? file.type)
    || (!file.productId && !file.product?.id && !file.sku)
}

function VerificationEditor({ intakeId, product, index, onSaved }) {
  const verification = product.verification ?? product.warehouseVerification ?? {}
  const classification = verification.finalClassification ?? {}
  const [draft, setDraft] = useState(() => ({
    status: verification.status ?? verification.warehouseStatus ?? 'pending',
    sdsVerification: verification.sdsVerification ?? 'not-reviewed',
    outcome: classification.outcome ?? 'not-classified',
    classification: classification.classification ?? '',
    unNumber: classification.unNumber ?? '',
    hazardClass: classification.hazardClass ?? '',
    packingGroup: classification.packingGroup ?? '',
    notes: verification.notes ?? '',
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const verifiedBy = typeof verification.verifiedBy === 'object'
    ? verification.verifiedBy?.name ?? verification.verifiedBy?.email ?? verification.verifiedBy?.id
    : verification.verifiedBy

  useEffect(() => {
    setDraft({
      status: verification.status ?? verification.warehouseStatus ?? 'pending',
      sdsVerification: verification.sdsVerification ?? 'not-reviewed',
      outcome: classification.outcome ?? 'not-classified',
      classification: classification.classification ?? '',
      unNumber: classification.unNumber ?? '',
      hazardClass: classification.hazardClass ?? '',
      packingGroup: classification.packingGroup ?? '',
      notes: verification.notes ?? '',
    })
  }, [product])

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function save() {
    if (!product.id && !product._id) {
      setError('This product cannot be verified because its identifier is missing.')
      return
    }
    if (draft.status === 'dangerous-goods-rejected' && !window.confirm('Confirm that this dangerous goods declaration is rejected?')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await updateIntakeProductVerification(intakeId, product.id ?? product._id, {
        status: draft.status,
        sdsVerification: draft.sdsVerification,
        finalClassification: {
          outcome: draft.outcome,
          classification: draft.classification,
          unNumber: draft.unNumber,
          hazardClass: draft.hazardClass,
          packingGroup: draft.packingGroup,
        },
        notes: draft.notes,
      })
      if (response?.success === false) {
        const verificationError = new Error(response.message || 'Verification could not be saved.')
        verificationError.response = { data: response }
        throw verificationError
      }
      const data = response?.data?.data ?? response?.data ?? response
      await onSaved(index, data?.product ?? data)
      setMessage('Warehouse verification saved.')
    } catch (saveError) {
      setError(requestError(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4" aria-label={`Warehouse verification for product ${index + 1}`}>
      <h4 className="font-semibold text-navy-900">Warehouse verification</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select id={`verification-${index}-status`} label="Warehouse status" value={draft.status} onChange={(event) => update('status', event.target.value)}>
          {INTAKE_OPTION_GROUPS.intakeVerificationStatus.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select id={`verification-${index}-sds`} label="SDS verification" value={draft.sdsVerification} onChange={(event) => update('sdsVerification', event.target.value)}>
          {INTAKE_OPTION_GROUPS.intakeSdsVerification.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select id={`verification-${index}-outcome`} label="Final classification outcome" value={draft.outcome} onChange={(event) => update('outcome', event.target.value)}>
          {INTAKE_OPTION_GROUPS.intakeClassificationOutcome.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Input id={`verification-${index}-classification`} label="Final classification" value={draft.classification} onChange={(event) => update('classification', event.target.value)} />
        <Input id={`verification-${index}-un`} label="Final UN number" value={draft.unNumber} onChange={(event) => update('unNumber', event.target.value.toUpperCase())} />
        <Select id={`verification-${index}-hazard-class`} label="Final hazard class" value={draft.hazardClass} onChange={(event) => update('hazardClass', event.target.value)}>
          <option value="">Select a hazard class</option>
          {INTAKE_OPTION_GROUPS.intakeHazardClass.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select id={`verification-${index}-packing-group`} label="Final packing group" value={draft.packingGroup} onChange={(event) => update('packingGroup', event.target.value)}>
          <option value="">Select a packing group</option>
          {INTAKE_OPTION_GROUPS.intakePackingGroup.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Textarea id={`verification-${index}-notes`} label="Verification notes" maxLength={2000} value={draft.notes} onChange={(event) => update('notes', event.target.value)} className="sm:col-span-2" />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-medium text-slate-500">Verified by</dt><dd className="mt-1 text-navy-900">{verifiedBy || 'Not verified'}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Verified at</dt><dd className="mt-1 text-navy-900">{verification.verifiedAt ? formatIntakeDate(verification.verifiedAt) : 'Not verified'}</dd></div>
      </dl>
      {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-800" role="status" aria-live="polite">{message}</p>}
      <Button type="button" className="mt-4" disabled={busy} onClick={save}>{busy ? 'Saving verification…' : 'Save verification'}</Button>
    </section>
  )
}

function ProductBreakdown({ intakeId, product, index, onVerificationSaved, files, onFileView, onFileDownload, onFileDelete }) {
  const totals = product.totals ?? getIntakeProductTotals(product)
  const boxes = Array.isArray(product.boxes) ? product.boxes : []
  const uniform = product.uniform ?? product
  const hazmat = product.hazmat ?? product
  const handling = product.handling ?? product
  const amazon = product.amazon ?? product
  const storage = product.storageRequirements ?? product.storage ?? []
  const individual = product.packingMode === 'individual' || product.packingMode === 'individual-cartons'
  return (
    <article className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy-900">{product.productName ?? product.name ?? `Product ${index + 1}`}</h3>
          <p className="mt-1 text-sm text-slate-600">SKU: {product.sku ?? '—'}{product.brandName ? ` · ${product.brandName}` : ''}</p>
        </div>
        <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">{getAdminLabel('packingMode', product.packingMode)}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Category</dt><dd className="mt-1">{getIntakeCategoryLabel(product.category)}</dd></div>
        <div><dt className="text-xs text-slate-500">Cartons</dt><dd className="mt-1">{formatIntakeNumber(totals.cartons ?? product.cartons ?? boxes.length)}</dd></div>
        <div><dt className="text-xs text-slate-500">Units</dt><dd className="mt-1">{formatIntakeNumber(totals.units ?? product.totalUnits ?? product.units)}</dd></div>
        <div><dt className="text-xs text-slate-500">Gross weight</dt><dd className="mt-1">{formatIntakeNumber(totals.grossWeightKg ?? product.grossWeightKg)} kg</dd></div>
        <div><dt className="text-xs text-slate-500">FNSKU</dt><dd className="mt-1 break-words">{product.fnsku || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">ASIN</dt><dd className="mt-1 break-words">{product.asin || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Barcode</dt><dd className="mt-1 break-words">{product.barcode || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Country of origin</dt><dd className="mt-1">{product.countryOfOrigin || '—'}</dd></div>
      </dl>
      {product.packingMode === 'uniform' && <p className="mt-4 text-sm text-slate-700">{formatIntakeNumber(uniform.unitsPerCarton)} units/carton · {formatIntakeNumber(uniform.cartonWeightKg)} kg/carton · {[uniform.cartonLengthCm ?? uniform.lengthCm, uniform.cartonWidthCm ?? uniform.widthCm, uniform.cartonHeightCm ?? uniform.heightCm].map((value) => formatIntakeNumber(value)).join(' × ')} cm</p>}
      <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label={`Customer declaration for product ${index + 1}`}>
        <h4 className="font-semibold text-navy-900">Customer declared</h4>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Dangerous goods status</dt><dd className="mt-1">{getAdminLabel('intakeDeclaredStatus', product.declaredStatus ?? hazmat.declaredStatus)}</dd></div>
          <div><dt className="text-xs text-slate-500">SDS status</dt><dd className="mt-1">{getAdminLabel('intakeSdsStatus', product.sdsStatus ?? hazmat.sdsStatus)}</dd></div>
          <div><dt className="text-xs text-slate-500">UN number / hazard class / packing group</dt><dd className="mt-1">{[product.unNumber ?? hazmat.unNumber, getAdminLabel('intakeHazardClass', product.hazardClass ?? hazmat.hazardClass), getAdminLabel('intakePackingGroup', product.packingGroup ?? hazmat.packingGroup)].filter((value) => value !== '—').join(' · ') || '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Physical state / batteries</dt><dd className="mt-1">{getAdminLabel('intakePhysicalState', product.physicalState ?? handling.physicalState)} · {getAdminLabel('intakeYesNo', product.containsBatteries ?? handling.containsBatteries)}</dd></div>
          <div><dt className="text-xs text-slate-500">Proper shipping name</dt><dd className="mt-1">{product.properShippingName ?? hazmat.properShippingName ?? '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Battery details</dt><dd className="mt-1">{[getAdminLabel('intakeBatteryType', product.batteryType ?? hazmat.batteryType), getAdminLabel('intakeBatteryConfiguration', product.batteryConfiguration ?? hazmat.batteryConfiguration), product.wattHours ?? hazmat.wattHours ? `${product.wattHours ?? hazmat.wattHours} Wh` : '', getAdminLabel('intakeUn38Status', product.un38TestSummaryStatus ?? hazmat.un38TestSummaryStatus)].filter((value) => value !== '—' && value !== '').join(' · ') || '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Leakage/damage risk</dt><dd className="mt-1">{getAdminLabel('intakeYesNo', handling.leakageOrDamageRisk ?? product.leakageRisk)}</dd></div>
          <div><dt className="text-xs text-slate-500">Expiry</dt><dd className="mt-1">{getAdminLabel('intakeYesNo', product.expiryDated ?? handling.isExpiryDated)}{(product.expiryDate ?? handling.expiryDate) ? ` · ${String(product.expiryDate ?? handling.expiryDate).split('-').reverse().join('/')}` : ''}</dd></div>
          <div><dt className="text-xs text-slate-500">Amazon</dt><dd className="mt-1">{getAdminLabel('intakeYesNo', product.sellsOnAmazon ?? amazon.sellsOnAmazon)}{(product.amazonFulfilmentChannel ?? amazon.fulfilmentChannel) ? ` · ${getAdminLabel('intakeAmazonChannel', product.amazonFulfilmentChannel ?? amazon.fulfilmentChannel)}` : ''}{(product.amazonListingStatus ?? amazon.listingStatus) ? ` · ${getAdminLabel('intakeAmazonListing', product.amazonListingStatus ?? amazon.listingStatus)}` : ''}{(product.amazonDangerousGoodsReviewStatus ?? amazon.dangerousGoodsReviewStatus) ? ` · DG review: ${getAdminLabel('intakeAmazonDgReview', product.amazonDangerousGoodsReviewStatus ?? amazon.dangerousGoodsReviewStatus)}` : ''}</dd></div>
        </dl>
        {(product.hazardTypes ?? hazmat.hazardTypes ?? []).length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-500">Declared hazards</p>
            <div className="mt-2 flex flex-wrap gap-2">{(product.hazardTypes ?? hazmat.hazardTypes ?? []).map((hazard) => <span key={hazard} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-950">{getAdminLabel('intakeHazardType', hazard)}</span>)}</div>
          </div>
        )}
        {storage.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-500">Storage requirements</p>
            <div className="mt-2 flex flex-wrap gap-2">{storage.map((storageRequirement) => <span key={storageRequirement} className="rounded-full bg-navy-100 px-2.5 py-1 text-xs font-medium text-navy-900">{getAdminLabel('intakeStorage', storageRequirement)}</span>)}</div>
          </div>
        )}
        {(product.specialHandlingInstructions ?? handling.specialHandlingInstructions) && <p className="mt-3 whitespace-pre-wrap text-sm"><span className="font-medium">Special handling:</span> {product.specialHandlingInstructions ?? handling.specialHandlingInstructions}</p>}
        {(product.specialStorageInstructions ?? handling.specialStorageInstructions) && <p className="mt-3 whitespace-pre-wrap text-sm"><span className="font-medium">Special storage:</span> {product.specialStorageInstructions ?? handling.specialStorageInstructions}</p>}
      </section>
      {individual && boxes.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-navy-900">Box breakdown</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[610px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">Box</th><th className="p-3">Units</th><th className="p-3">Weight (kg)</th><th className="p-3">L × W × H (cm)</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{boxes.map((box, boxIndex) => (
                <tr key={box.id ?? boxIndex}>
                  <td className="p-3">{box.boxNumber ?? boxIndex + 1}</td>
                  <td className="p-3">{formatIntakeNumber(box.units)}</td>
                  <td className="p-3">{formatIntakeNumber(box.weightKg ?? box.cartonWeightKg)}</td>
                  <td className="p-3">{[box.lengthCm ?? box.length, box.widthCm ?? box.width, box.heightCm ?? box.height].map((value) => formatIntakeNumber(value)).join(' × ')}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      <IntakeFilesPanel
        title="Files"
        files={files}
        requiredKinds={['barcode-pdf']}
        recommendedKinds={[
          ...(product.fnsku ? ['fnsku-labels-pdf'] : []),
          ...((product.sdsStatus ?? hazmat.sdsStatus) === 'available' ? ['sds'] : []),
          ...(['hazmat', 'limited-quantity', 'excepted-quantity'].includes(product.declaredStatus ?? hazmat.declaredStatus) ? ['dangerous-goods-declaration'] : []),
          ...((product.hazardTypes ?? hazmat.hazardTypes ?? []).includes('lithium-battery-products') && (product.un38TestSummaryStatus ?? hazmat.un38TestSummaryStatus) === 'available' ? ['un383-test-summary'] : []),
        ]}
        onView={(file) => onFileView(file)}
        onDownload={(file) => onFileDownload(file)}
        onDelete={(file) => onFileDelete(file)}
      />
      <VerificationEditor intakeId={intakeId} product={product} index={index} onSaved={onVerificationSaved} />
    </article>
  )
}

export default function AdminIntakeDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeIntake = location.state?.intake
  const [intake, setIntake] = useState(() => routeIntake && String(getIntakeId(routeIntake)) === String(id) ? routeIntake : null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [zipBusy, setZipBusy] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [fileMessage, setFileMessage] = useState('')
  const [fileToDelete, setFileToDelete] = useState(null)
  const [fileDeleteBusy, setFileDeleteBusy] = useState(false)

  const loadIntake = useCallback(async (signal) => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await getAdminIntake(id, signal)
      const found = unwrapIntake(response)
      if (!found || typeof found !== 'object') setLoadError('This intake could not be found.')
      else setIntake(found)
    } catch (error) {
      if (!signal.aborted) setLoadError(requestError(error))
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [id, routeIntake])

  useEffect(() => {
    const controller = new AbortController()
    loadIntake(controller.signal)
    return () => controller.abort()
  }, [loadIntake])

  function handleVerificationSaved(index, returnedProduct) {
    setIntake((current) => {
      const currentProducts = getIntakeProducts(current)
      const nextProducts = [...currentProducts]
      nextProducts[index] = { ...nextProducts[index], ...returnedProduct }
      return { ...current, products: nextProducts }
    })
  }

  async function handleStatusChange(event) {
    const nextStatus = event.target.value
    const previousStatus = getIntakeStatus(intake)
    setIntake((current) => ({ ...current, status: nextStatus }))
    setStatusBusy(true)
    setMessage('')
    try {
      const response = await updateIntakeStatus(id, nextStatus)
      if (response?.success === false) throw new Error(response.message || 'Status update failed.')
      const returned = unwrapIntake(response)
      if (returned && typeof returned === 'object' && getIntakeId(returned)) setIntake((current) => ({ ...current, ...returned }))
      setMessage('Inventory intake status updated.')
    } catch (error) {
      setIntake((current) => ({ ...current, status: previousStatus }))
      setMessage(requestError(error))
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleDownload() {
    setPdfBusy(true)
    setMessage('')
    try {
      const blob = await downloadAdminIntakePdf(id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `inventory-intake-${getIntakeReference(intake)}.pdf`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage(error.response?.status === 404
        ? 'The PDF is not available for this intake.'
        : requestError(error))
    } finally {
      setPdfBusy(false)
    }
  }

  async function handleDownloadAllFiles() {
    setZipBusy(true)
    setZipProgress(0)
    setFileMessage('')
    try {
      const blob = await downloadAdminIntakeFilesZip(id, (event) => {
        if (event.total) setZipProgress(Math.round(event.loaded / event.total * 100))
      })
      saveBlob(blob, `intake-${getIntakeReference(intake)}-files.zip`)
    } catch (error) {
      setFileMessage(requestError(error))
    } finally {
      setZipBusy(false)
    }
  }

  async function handleFileAction(file, action) {
    const fileId = getFileId(file)
    if (!fileId) {
      setFileMessage('This file cannot be opened because its identifier is missing.')
      return
    }
    setFileMessage('')
    let previewWindow
    if (action === 'view') {
      previewWindow = window.open('about:blank', '_blank')
      if (!previewWindow) {
        setFileMessage('Allow pop-ups to view this file in a new tab.')
        return
      }
      previewWindow.opener = null
    }
    try {
      const response = await downloadAdminIntakeFile(id, fileId)
      const filename = getContentDispositionName(response.headers?.['content-disposition'], getFileName(file))
      if (previewWindow) {
        const url = URL.createObjectURL(response.data)
        previewWindow.location.replace(url)
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else saveBlob(response.data, filename)
    } catch (error) {
      previewWindow?.close()
      setFileMessage(requestError(error))
    }
  }

  async function confirmDeleteFile() {
    const fileId = getFileId(fileToDelete || {})
    if (!fileId) return
    setFileDeleteBusy(true)
    setFileMessage('')
    try {
      const response = await deleteAdminIntakeFile(id, fileId)
      if (response?.success === false) throw new Error(response.message || 'File could not be deleted.')
      setIntake((current) => ({
        ...current,
        files: normaliseFiles(current.files ?? current.documents ?? current.attachments).filter((file) => String(getFileId(file)) !== String(fileId)),
        products: getIntakeProducts(current).map((product) => ({
          ...product,
          files: normaliseFiles(product.files ?? product.documents ?? product.attachments).filter((file) => String(getFileId(file)) !== String(fileId)),
        })),
        ...(response?.data?.auditLog ? { auditLog: response.data.auditLog } : {}),
      }))
      setFileToDelete(null)
      try {
        const refreshed = unwrapIntake(await getAdminIntake(id))
        if (refreshed && typeof refreshed === 'object') setIntake(refreshed)
      } catch {
        setFileMessage('The file was deleted, but the latest audit log could not be refreshed.')
      }
    } catch (error) {
      setFileMessage(requestError(error))
    } finally {
      setFileDeleteBusy(false)
    }
  }

  async function handleDelete() {
    setDeleteBusy(true)
    setMessage('')
    try {
      const response = await deleteIntake(id)
      if (response?.success === false) throw new Error(response.message || 'Delete failed.')
      navigate('/admin/intakes', { replace: true, state: { toast: 'Inventory intake deleted.' } })
    } catch (error) {
      setMessage(requestError(error))
      setDeleteBusy(false)
      setDeleteOpen(false)
    }
  }

  if (loading) return <><AdminSeo title="Loading inventory intake" /><div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-orange-500 motion-reduce:animate-none" aria-hidden="true" />Loading inventory intake…</div></>
  if (!intake) return <><AdminSeo title="Inventory intake not found" /><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-2xl font-bold text-navy-900">{loadError || 'Inventory intake not found'}</h1><Link to="/admin/intakes" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-800 underline"><ArrowLeft size={16} aria-hidden="true" /> Back to intakes</Link></div></>

  const customer = intake.customer ?? intake
  const phone = customer.phone ?? customer.phoneNumber ?? ''
  const email = customer.email ?? ''
  const products = getIntakeProducts(intake)
  const allFiles = listIntakeFiles(intake)
  const submissionFiles = allFiles.filter(isSubmissionFile)
  const totals = getIntakeTotals(intake)
  const technical = getIntakeTechnicalEntries(intake)
  const services = Array.isArray(intake.services) ? intake.services : []
  const intakeAuditLogs = Array.isArray(intake.auditLog)
    ? intake.auditLog
    : Array.isArray(intake.auditLogs)
      ? intake.auditLogs
      : []
  const productAuditLogs = products.flatMap((product) => {
    const entries = product.verification?.auditLog
      ?? product.verification?.auditLogs
      ?? product.warehouseVerification?.auditLog
      ?? product.warehouseVerification?.auditLogs
      ?? []
    return Array.isArray(entries) ? entries : []
  })
  const auditLogs = intakeAuditLogs.length > 0 ? intakeAuditLogs : productAuditLogs
  const consentAt = intake.consentAt ?? intake.consentedAt ?? intake.consent_at ?? intake.consented_at ?? intake.consentTimestamp ?? null
  const instructions = intake.additionalInstructions ?? intake.instructions ?? ''

  return (
    <>
      <AdminSeo title={`Inventory intake ${getIntakeReference(intake)}`} />
      <Link to="/admin/intakes" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-orange-600"><ArrowLeft size={16} aria-hidden="true" /> Back to intakes</Link>
      {loadError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Showing the available list details because the full intake could not be refreshed: {loadError}</p>}
      {message && <p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status" aria-live="polite">{message}</p>}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Inventory intake</p>
            <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{getIntakeReference(intake)}</h1>
            <p className="mt-2 text-sm text-slate-600">Submitted {formatIntakeDate(getIntakeDate(intake))} (UK time)</p>
            <div className="mt-3"><IntakeStatusBadge status={getIntakeStatus(intake)} /></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={handleDownload} disabled={pdfBusy}>{pdfBusy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{pdfBusy ? 'Preparing PDF…' : 'Download PDF'}</Button>
            <Button type="button" variant="outline" onClick={handleDownloadAllFiles} disabled={zipBusy}>{zipBusy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{zipBusy ? 'Preparing ZIP…' : 'Download all files (ZIP)'}</Button>
            {email && <Button href={`mailto:${email}`} variant="outline"><Mail size={16} aria-hidden="true" /> Reply by email</Button>}
            {phone && <Button href={`tel:${phone}`} variant="outline"><Phone size={16} aria-hidden="true" /> Call</Button>}
            <Button type="button" className="bg-red-700 hover:bg-red-800" onClick={() => setDeleteOpen(true)}><Trash2 size={16} aria-hidden="true" /> Delete</Button>
          </div>
          {zipBusy && (
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-xs text-slate-600"><span>Preparing file archive</span><span>{zipProgress}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="File archive download progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={zipProgress}>
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${zipProgress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="mt-7 max-w-xs">
          <Select id="intake-detail-status" label="Update status" value={getIntakeStatus(intake)} disabled={statusBusy} onChange={handleStatusChange}>
            {INTAKE_STATUSES.map((status) => <option key={status} value={status}>{getIntakeStatusLabel(status)}</option>)}
          </Select>
          {statusBusy && <p className="mt-2 text-xs text-slate-500" role="status">Saving status…</p>}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h2 className="text-xl font-bold text-navy-900">Customer details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact person</dt><dd className="mt-1 text-sm text-navy-900">{customer.contactPerson ?? '—'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business</dt><dd className="mt-1 text-sm text-navy-900">{customer.businessName ?? '—'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt><dd className="mt-1 text-sm">{phone ? <a href={`tel:${phone}`} className="text-navy-800 underline">{phone}</a> : '—'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 break-all text-sm">{email ? <a href={`mailto:${email}`} className="text-navy-800 underline">{email}</a> : '—'}</dd></div>
        </dl>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consent</dt><dd className="mt-1 text-sm text-navy-900">{intake.consent === false ? 'Not recorded' : 'Agreed'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consent at</dt><dd className="mt-1 text-sm text-navy-900">{consentAt ? formatIntakeDate(consentAt) : 'Not recorded'}</dd></div>
        </dl>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h2 className="text-xl font-bold text-navy-900">Inventory totals</h2>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ['SKUs', totals.skus],
            ['Cartons', totals.cartons],
            ['Units', totals.units],
            ['Gross weight (kg)', totals.grossWeightKg],
            ['Volume (m³)', totals.volumeM3],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-navy-50 p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-semibold text-navy-900">{formatIntakeNumber(value, 3)}</dd></div>)}
        </dl>
        {services.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-navy-900">Requested services</h3>
            <div className="mt-2 flex flex-wrap gap-2">{services.map((service) => <span key={service} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-900">{getAdminLabel('intakeService', service)}</span>)}</div>
          </div>
        )}
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">Product / SKU</th><th className="p-3">Category</th><th className="p-3">Packing mode</th><th className="p-3">Cartons</th><th className="p-3">Units</th><th className="p-3">Gross weight (kg)</th><th className="p-3">Volume (m³)</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{products.map((product, index) => {
              const productTotals = product.totals ?? getIntakeProductTotals(product)
              return <tr key={product.id ?? product.sku ?? index}><th scope="row" className="p-3 font-semibold text-navy-900">{product.productName ?? product.name ?? `Product ${index + 1}`}<span className="mt-1 block font-normal text-slate-600">{product.sku ?? '—'}</span></th><td className="p-3">{getIntakeCategoryLabel(product.category)}</td><td className="p-3">{getAdminLabel('packingMode', product.packingMode)}</td><td className="p-3">{formatIntakeNumber(productTotals.cartons)}</td><td className="p-3">{formatIntakeNumber(productTotals.units)}</td><td className="p-3">{formatIntakeNumber(productTotals.grossWeightKg)}</td><td className="p-3">{formatIntakeNumber(productTotals.volumeM3, 3)}</td></tr>
            })}</tbody>
          </table>
        </div>
        <div className="mt-6 space-y-4">{products.map((product, index) => <ProductBreakdown key={product.id ?? product.sku ?? index} intakeId={id} product={product} index={index} files={getProductFiles(product, allFiles)} onVerificationSaved={handleVerificationSaved} onFileView={(file) => handleFileAction(file, 'view')} onFileDownload={(file) => handleFileAction(file, 'download')} onFileDelete={setFileToDelete} />)}</div>
      </section>

      <IntakeFilesPanel
        title="Submission-level documents"
        files={submissionFiles}
        onView={(file) => handleFileAction(file, 'view')}
        onDownload={(file) => handleFileAction(file, 'download')}
        onDelete={setFileToDelete}
      />
      {fileMessage && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status" aria-live="polite">{fileMessage}</p>}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h2 className="text-xl font-bold text-navy-900">Verification audit log</h2>
        {auditLogs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No verification audit entries are available.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {auditLogs.map((entry, index) => {
              const admin = typeof entry.admin === 'object'
                ? entry.admin?.name ?? entry.admin?.email ?? entry.admin?.id
                : entry.admin
              const changes = entry.changes && typeof entry.changes === 'object'
                        ? (Array.isArray(entry.changes)
                          ? entry.changes.map((change) => `${humaniseLabel(change.field ?? 'Change')}: ${change.from ?? change.oldValue ?? '—'} → ${change.to ?? change.newValue ?? '—'}`)
                          : Object.entries(entry.changes).map(([field, change]) => {
                          const changeText = change && typeof change === 'object'
                            ? `${change.from ?? change.oldValue ?? '—'} → ${change.to ?? change.newValue ?? '—'}`
                            : String(change ?? '—')
                          return `${humaniseLabel(field)}: ${changeText}`
                          }))
                        : []
              return (
                <li key={entry.id ?? entry._id ?? index} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-navy-900">{formatIntakeDate(entry.createdAt ?? entry.timestamp ?? entry.at)} · {admin ?? entry.actor ?? 'Admin'}</p>
                  <p className="mt-1 text-sm text-slate-700">{humaniseLabel(entry.action ?? 'verification updated')}</p>
                  {changes.length > 0 && <ul className="mt-2 list-inside list-disc text-sm text-slate-600">{changes.map((change) => <li key={change}>{change}</li>)}</ul>}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h2 className="text-xl font-bold text-navy-900">Additional instructions</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{instructions || 'No additional instructions provided.'}</p>
      </section>

      {technical.length > 0 && (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
          <summary className="cursor-pointer font-semibold text-navy-900 focus-visible:rounded-md">Technical details</summary>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">{technical.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-navy-900">{String(value)}</dd></div>)}</dl>
        </details>
      )}

      {deleteOpen && <DeleteConfirmation itemName="inventory intake" onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} busy={deleteBusy} />}
      {fileToDelete && (
        <DeleteConfirmation
          itemName="file"
          title="Delete this uploaded file?"
          description="This permanently removes the file from this inventory intake."
          confirmLabel="Delete file"
          onCancel={() => setFileToDelete(null)}
          onConfirm={confirmDeleteFile}
          busy={fileDeleteBusy}
        />
      )}
    </>
  )
}
