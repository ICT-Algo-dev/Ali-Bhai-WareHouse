import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Button from '../components/ui/Button'
import Container from '../components/ui/Container'
import { Input, Select, Textarea } from '../components/ui/FormFields'
import Seo from '../components/ui/Seo'
import FileDropzone from '../components/ui/FileDropzone'
import Honeypot from '../components/ui/Honeypot'
import { INTAKE_CATEGORIES, INTAKE_DG_DECLARATION_NOTICE, INTAKE_OPTION_GROUPS, INTAKE_SERVICES } from '../lib/constants'
import { downloadIntakePdf, submitIntake, uploadIntakeFile } from '../lib/api'
import { buildIntakePayload, intakeSchema } from '../lib/intakeSchemas'
import { formatIntakeNumber, getIntakeCategoryLabel, getIntakeProductTotals, getIntakeTotals } from '../admin/intakeUtils'
import { getAdminLabel } from '../admin/adminUtils'

const DRAFT_KEY = 'intakeDraft:v3'
const LEGACY_DRAFT_KEY = 'warehouse_inventory_intake_draft'
const MAX_SUBMISSION_SIZE = 150 * 1024 * 1024
const MAX_SUBMISSION_FILES = 200
const MAX_PRODUCT_FILES = 20
const PRODUCT_UPLOADS = [
  ['barcode-pdf', 'Barcode PDF', 'pdf', true],
  ['fnsku-labels-pdf', 'FNSKU labels PDF', 'pdf'],
  ['carton-labels-pdf', 'Carton / box labels PDF', 'pdf'],
  ['product-labels-pdf', 'Product labels PDF', 'pdf'],
  ['sds', 'Safety Data Sheet (SDS)', 'document'],
  ['un383-test-summary', 'UN 38.3 test summary', 'document'],
  ['dangerous-goods-declaration', 'Dangerous goods declaration', 'document'],
  ['product-specification-sheet', 'Product specification sheet', 'document'],
  ['product-image', 'Product images', 'document'],
  ['packaging-image', 'Packaging images', 'document'],
  ['other-compliance', 'Other compliance documents', 'document'],
]
const SUBMISSION_UPLOADS = [
  ['commercial-invoice', 'Commercial invoice'],
  ['other-document', 'Other documents'],
]
let uploadFileSequence = 0

function nextFileId() {
  uploadFileSequence += 1
  return `intake-file-${Date.now()}-${uploadFileSequence}`
}

function formatUploadSize(size) {
  return size < 1024 * 1024
    ? `${(size / 1024).toFixed(0)} KB`
    : `${(size / (1024 * 1024)).toFixed(2)} MB`
}
const EMPTY_BOX = { units: '', weightKg: '', lengthCm: '', widthCm: '', heightCm: '' }
const EMPTY_PRODUCT = {
  productName: '',
  brandName: '',
  sku: '',
  fnsku: '',
  asin: '',
  barcode: '',
  category: '',
  countryOfOrigin: '',
  packingMode: 'uniform',
  uniform: {
    cartons: undefined,
    unitsPerCarton: undefined,
    cartonWeightKg: undefined,
    cartonLengthCm: undefined,
    cartonWidthCm: undefined,
    cartonHeightCm: undefined,
  },
  boxes: [],
  hazmat: {
    declaredStatus: 'non-hazmat',
    hazardTypes: [],
    sdsStatus: 'not-required',
    unNumber: '',
    hazardClass: '',
    packingGroup: '',
    properShippingName: '',
    batteryType: '',
    batteryConfiguration: '',
    wattHours: undefined,
    un38TestSummaryStatus: '',
  },
  storage: ['standard'],
  handling: {
    physicalState: 'solid',
    containsBatteries: false,
    leakageOrDamageRisk: 'no',
    isExpiryDated: false,
    expiryDate: '',
    specialHandlingInstructions: '',
    specialStorageInstructions: '',
  },
  amazon: {
    sellsOnAmazon: false,
    fulfilmentChannel: '',
    listingStatus: '',
    dangerousGoodsReviewStatus: '',
    complianceDocumentsAvailable: '',
  },
}
function createEmptyProduct() {
  return {
    ...EMPTY_PRODUCT,
    uniform: { ...EMPTY_PRODUCT.uniform },
    boxes: [],
    hazmat: { ...EMPTY_PRODUCT.hazmat },
    storage: ['standard'],
    handling: { ...EMPTY_PRODUCT.handling },
    amazon: { ...EMPTY_PRODUCT.amazon },
  }
}
const ORIGIN_OPTIONS = [
  ['GB', 'United Kingdom'], ['CN', 'China'], ['US', 'United States'], ['IN', 'India'],
  ['DE', 'Germany'], ['FR', 'France'], ['IT', 'Italy'], ['ES', 'Spain'],
  ['TR', 'Türkiye'], ['VN', 'Vietnam'], ['TH', 'Thailand'], ['JP', 'Japan'],
  ['KR', 'South Korea'], ['TW', 'Taiwan'], ['Other', 'Other'],
]

function readDraft() {
  try {
    window.sessionStorage.removeItem(LEGACY_DRAFT_KEY)
    const saved = window.sessionStorage.getItem(DRAFT_KEY)
    if (!saved) return { value: null, error: '' }
    const value = JSON.parse(saved)
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'website')) {
      delete value.website
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value))
    }
    const hasExpectedShape = value
      && typeof value === 'object'
      && value.version === 3
      && value.customer
      && Array.isArray(value.products)
      && value.products.length >= 1
      && value.products.length <= 100
      && value.products.every((product) => product && typeof product === 'object' && Array.isArray(product.boxes) && product.hazmat && product.handling && product.amazon)
    if (!hasExpectedShape) window.sessionStorage.removeItem(DRAFT_KEY)
    return hasExpectedShape
      ? { value, error: '' }
      : { value: null, error: 'Your previous draft uses an older format and was cleared. Please enter your details again.' }
  } catch {
    return { value: null, error: 'The saved intake draft could not be restored. You can start a new intake.' }
  }
}

function getDefaultValues(draft) {
  const baseline = {
    customer: { contactPerson: '', businessName: '', phone: '', email: '' },
    products: [createEmptyProduct()],
    services: [],
    additionalInstructions: '',
    consent: false,
  }
  if (!draft || typeof draft !== 'object') return baseline
  const savedProducts = Array.isArray(draft.products) ? draft.products : baseline.products
  return {
    ...baseline,
    ...draft,
    consent: false,
    customer: { ...baseline.customer, ...draft.customer },
    services: Array.isArray(draft.services) ? draft.services : [],
    products: savedProducts.map((product) => ({
      ...createEmptyProduct(),
      ...product,
      uniform: { ...EMPTY_PRODUCT.uniform, ...product.uniform },
      boxes: Array.isArray(product.boxes) ? product.boxes : [],
      hazmat: { ...EMPTY_PRODUCT.hazmat, ...product.hazmat },
      storage: Array.isArray(product.storage) && product.storage.length
        ? product.storage
        : ['standard'],
      handling: { ...EMPTY_PRODUCT.handling, ...product.handling },
      amazon: { ...EMPTY_PRODUCT.amazon, ...product.amazon },
    })),
  }
}

function calculateProductTotals(product = {}) {
  if (product.packingMode === 'individual') {
    const boxes = Array.isArray(product.boxes) ? product.boxes : []
    return boxes.reduce((totals, box) => ({
      cartons: totals.cartons + 1,
      units: totals.units + (Number(box.units) || 0),
      grossWeightKg: totals.grossWeightKg + (Number(box.weightKg) || 0),
      volumeM3: totals.volumeM3 + ((Number(box.lengthCm) || 0) * (Number(box.widthCm) || 0) * (Number(box.heightCm) || 0)) / 1_000_000,
    }), { cartons: 0, units: 0, grossWeightKg: 0, volumeM3: 0 })
  }

  const uniform = product.uniform || {}
  const cartons = Number(uniform.cartons) || 0
  return {
    cartons,
    units: cartons * (Number(uniform.unitsPerCarton) || 0),
    grossWeightKg: cartons * (Number(uniform.cartonWeightKg) || 0),
    volumeM3: cartons * (Number(uniform.cartonLengthCm) || 0) * (Number(uniform.cartonWidthCm) || 0) * (Number(uniform.cartonHeightCm) || 0) / 1_000_000,
  }
}

function calculateIntakeTotals(products = []) {
  const result = products.reduce((totals, product) => {
    const productTotals = calculateProductTotals(product)
    return {
      cartons: totals.cartons + productTotals.cartons,
      units: totals.units + productTotals.units,
      grossWeightKg: totals.grossWeightKg + productTotals.grossWeightKg,
      volumeM3: totals.volumeM3 + productTotals.volumeM3,
    }
  }, { cartons: 0, units: 0, grossWeightKg: 0, volumeM3: 0 })
  return { ...result, skus: products.length }
}

function findFirstError(error, prefix = '') {
  if (!error || typeof error !== 'object') return ''
  for (const [key, value] of Object.entries(error)) {
    if (key === 'ref') continue
    const path = prefix ? `${prefix}.${key}` : key
    if (value?.message) return path
    const nested = findFirstError(value, path)
    if (nested) return nested
  }
  return ''
}

function getValidationProblemText(issue) {
  const path = issue.path.map(String)
  if (path[0] === 'customer') {
    const labels = { contactPerson: 'Contact person', businessName: 'Business name', phone: 'Phone number', email: 'Email address' }
    return `Customer, ${labels[path[1]] || path[1]} - ${issue.message}`
  }
  if (path[0] === 'products' && /^\d+$/.test(path[1] || '')) {
    const productNumber = Number(path[1]) + 1
    const field = path.slice(2)
    if (field[0] === 'files' && field[1] === 'barcode-pdf') {
      return `Product ${productNumber}: Barcode PDF is required`
    }

    const section = field[0] === 'storage'
      ? 'Storage'
      : field[0] === 'handling'
        ? 'Handling'
        : field[0] === 'amazon'
          ? 'Amazon'
          : field[0] === 'hazmat'
            ? 'Hazmat'
            : field[0] === 'files'
              ? 'Files'
              : 'Product details and packing'
    const fieldName = field[0] === 'boxes' ? field[2] : ['uniform', 'hazmat', 'handling', 'amazon'].includes(field[0]) ? field[1] : field[0]
    const fieldLabel = field[0] === 'boxes'
      ? `Box ${Number(field[1]) + 1} ${fieldName || 'details'}`
      : fieldName === 'storage'
        ? 'Storage requirements'
        : fieldName === 'physicalState'
          ? 'Physical state'
          : fieldName === 'leakageOrDamageRisk'
            ? 'Leakage or damage risk'
            : fieldName === 'isExpiryDated'
              ? 'Expiry-dated'
              : fieldName === 'expiryDate'
                ? 'Expiry date'
                : fieldName === 'barcode'
                  ? 'Barcode'
                  : fieldName?.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()) || 'Product details'
    return `Product ${productNumber}, ${section}: ${fieldLabel} - ${issue.message}`
  }

  const labels = {
    contactPerson: 'Contact person',
    businessName: 'Business name',
    phone: 'Phone number',
    email: 'Email address',
    services: 'Services',
    additionalInstructions: 'Additional instructions',
    consent: 'Consent',
    products: 'Products',
  }
  return `${labels[path[0]] || path[0] || 'Form'}: ${issue.message}`
}

function getNestedError(errors, path) {
  return path.split('.').reduce((current, key) => current?.[key], errors)
}

function isProductReviewRequired(product) {
  return product.hazmat?.declaredStatus !== 'non-hazmat'
    || (product.hazmat?.hazardTypes || []).length > 0
    || product.hazmat?.sdsStatus === 'unavailable'
    || product.hazmat?.sdsStatus === 'not-sure'
    || product.amazon?.dangerousGoodsReviewStatus === 'pending'
}

function FieldsetRadios({ label, name, options, value, onChange, error, idPrefix }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-navy-900">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map(({ value: option, label: optionLabel }) => (
          <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${value === option ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
            <input id={`${idPrefix}-${name}-${option}`} type="radio" name={name} value={option} checked={value === option} onChange={onChange} className="h-4 w-4 accent-orange-500" />
            {optionLabel}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-700" role="alert">{error}</p>}
    </fieldset>
  )
}

function MultiSelectCards({ label, options, value = [], onChange, error, columns = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-navy-900">{label}</legend>
      <div className={`mt-3 grid gap-2 ${columns}`}>
        {options.map(({ value: option, label: optionLabel }) => (
          <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${value.includes(option) ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-navy-300'}`}>
            <input
              type="checkbox"
              checked={value.includes(option)}
              className="mt-0.5 h-4 w-4 accent-orange-500"
              onChange={() => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])}
            />
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-700" role="alert">{error}</p>}
    </fieldset>
  )
}

function SectionIndicator({ error, complete }) {
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${error ? 'bg-red-100 text-red-800' : complete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{error ? 'Needs attention' : complete ? 'Complete' : 'In progress'}</span>
}

function dateInputMinimum() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const tomorrow = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + 1))
  return tomorrow.toISOString().slice(0, 10)
}

function ProductExtraSections({ index, fieldId, product, register, errors, watch, getValues, setValue, onCopyPrevious }) {
  const path = `products.${index}`
  const productErrors = errors?.products?.[index] || {}
  const fieldError = (field) => getNestedError(productErrors, field)?.message
  const sectionError = (fields) => fields.some((field) => getNestedError(productErrors, field))
  const hazmat = product.hazmat || EMPTY_PRODUCT.hazmat
  const handling = product.handling || EMPTY_PRODUCT.handling
  const amazon = product.amazon || EMPTY_PRODUCT.amazon
  const activeHazmatStatus = ['hazmat', 'limited-quantity', 'excepted-quantity'].includes(hazmat.declaredStatus)
  const hasLithium = (hazmat.hazardTypes || []).includes('lithium-battery-products')
  const showHazards = activeHazmatStatus || hazmat.declaredStatus === 'not-sure'
  const showSds = hazmat.declaredStatus !== 'non-hazmat' || (hazmat.hazardTypes || []).length > 0
  const storage = product.storage || []
  const storageSuggested = !storage.includes('hazmat-compliant')
    && (activeHazmatStatus || (hazmat.hazardTypes || []).length > 0)
  const completeness = {
    hazmat: Boolean(hazmat.declaredStatus)
      && (!showSds || Boolean(hazmat.sdsStatus))
      && (!activeHazmatStatus || Boolean(hazmat.unNumber && hazmat.hazardClass && hazmat.packingGroup))
      && (!hasLithium || Boolean(hazmat.batteryType && hazmat.batteryConfiguration && hazmat.wattHours && hazmat.un38TestSummaryStatus)),
    storage: storage.length > 0,
    handling: Boolean(handling.physicalState && handling.leakageOrDamageRisk)
      && (!handling.isExpiryDated || Boolean(handling.expiryDate)),
    amazon: !amazon.sellsOnAmazon || Boolean(amazon.fulfilmentChannel && amazon.listingStatus && amazon.dangerousGoodsReviewStatus && amazon.complianceDocumentsAvailable),
  }

  function updateDeclaredStatus(event) {
    const status = event.target.value
    setValue(`${path}.hazmat.declaredStatus`, status, { shouldDirty: true, shouldValidate: true })
    if (status === 'non-hazmat') {
      setValue(`${path}.hazmat.hazardTypes`, [], { shouldDirty: true })
      setValue(`${path}.hazmat.sdsStatus`, 'not-required', { shouldDirty: true })
      clearHazmatFields()
      return
    }
    if (status === 'not-sure') {
      clearHazmatFields()
      setValue(`${path}.hazmat.sdsStatus`, '', { shouldDirty: true })
      return
    }
    if (hazmat.sdsStatus === 'not-required') setValue(`${path}.hazmat.sdsStatus`, '', { shouldDirty: true })
  }

  function clearHazmatFields() {
    for (const field of ['unNumber', 'hazardClass', 'packingGroup', 'properShippingName', 'batteryType', 'batteryConfiguration', 'wattHours', 'un38TestSummaryStatus']) {
      setValue(`${path}.hazmat.${field}`, field === 'wattHours' ? undefined : '', { shouldDirty: true })
    }
  }

  function updateHazards(next) {
    setValue(`${path}.hazmat.hazardTypes`, next, { shouldDirty: true, shouldValidate: true })
    if (next.includes('lithium-battery-products')) {
      setValue(`${path}.handling.containsBatteries`, true, { shouldDirty: true })
      return
    }
    for (const field of ['batteryType', 'batteryConfiguration', 'wattHours', 'un38TestSummaryStatus']) {
      setValue(`${path}.hazmat.${field}`, field === 'wattHours' ? undefined : '', { shouldDirty: true })
    }
  }

  function copyFromPrevious() {
    onCopyPrevious(index)
  }

  const statusOptions = INTAKE_OPTION_GROUPS.intakeDeclaredStatus
  const valueOptions = (group) => INTAKE_OPTION_GROUPS[group] || []

  return (
    <div className="mt-4 space-y-3">
      {index > 0 && (
        <button type="button" onClick={copyFromPrevious} className="rounded-lg border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50">
          Copy hazmat, storage and handling from previous product
        </button>
      )}

      <details ref={(element) => { if (element && sectionError(['hazmat'])) element.open = true }} data-section={`${fieldId}-hazmat`} className="rounded-xl border border-slate-200 p-4" aria-live="polite">
        <summary className="cursor-pointer font-semibold text-navy-900">B. Hazmat and dangerous goods <SectionIndicator error={sectionError(['hazmat'])} complete={completeness.hazmat} /></summary>
        <div className="mt-4 space-y-5">
          <Select id={`${fieldId}-declaredStatus`} label="Declared status" error={fieldError('hazmat.declaredStatus')} value={hazmat.declaredStatus} onChange={updateDeclaredStatus}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">{INTAKE_DG_DECLARATION_NOTICE}</div>

          {showHazards && (
            <div aria-live="polite">
              <MultiSelectCards
                label={`Hazard types${hazmat.declaredStatus === 'not-sure' ? ' (optional)' : ''}`}
                options={valueOptions('intakeHazardType')}
                value={hazmat.hazardTypes || []}
                onChange={updateHazards}
                error={fieldError('hazmat.hazardTypes')}
              />
            </div>
          )}

          {showSds && (
            <div aria-live="polite">
              <Select id={`${fieldId}-sdsStatus`} label="Does your product require a Safety Data Sheet?" error={fieldError('hazmat.sdsStatus')} {...register(`${path}.hazmat.sdsStatus`)}>
                <option value="">Select an option</option>
                {valueOptions('intakeSdsStatus').filter(({ value }) => value !== 'not-required').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
          )}

          {activeHazmatStatus && (
            <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
              <Input
                id={`${fieldId}-unNumber`}
                label="UN number"
                placeholder="UN1234"
                hint="Enter UN followed by four digits."
                error={fieldError('hazmat.unNumber')}
                value={hazmat.unNumber || ''}
                onChange={(event) => setValue(`${path}.hazmat.unNumber`, event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
              />
              <Select id={`${fieldId}-hazardClass`} label="Hazard class" error={fieldError('hazmat.hazardClass')} {...register(`${path}.hazmat.hazardClass`)}>
                <option value="">Select a hazard class</option>
                {valueOptions('intakeHazardClass').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Select id={`${fieldId}-packingGroup`} label="Packing group" error={fieldError('hazmat.packingGroup')} {...register(`${path}.hazmat.packingGroup`)}>
                <option value="">Select a packing group</option>
                {valueOptions('intakePackingGroup').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Input id={`${fieldId}-properShippingName`} label="Proper shipping name (optional)" error={fieldError('hazmat.properShippingName')} {...register(`${path}.hazmat.properShippingName`)} />
            </div>
          )}

          {hasLithium && (
            <div className="grid gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 sm:grid-cols-2" aria-live="polite">
              <Select id={`${fieldId}-batteryType`} label="Battery type" error={fieldError('hazmat.batteryType')} {...register(`${path}.hazmat.batteryType`)}>
                <option value="">Select battery type</option>
                {valueOptions('intakeBatteryType').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Select id={`${fieldId}-batteryConfiguration`} label="Battery configuration" error={fieldError('hazmat.batteryConfiguration')} {...register(`${path}.hazmat.batteryConfiguration`)}>
                <option value="">Select configuration</option>
                {valueOptions('intakeBatteryConfiguration').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <NumberField name={`${path}.hazmat.wattHours`} label="Watt-hours (Wh)" register={register} errors={getNestedError(productErrors, 'hazmat.wattHours')} min="0.01" max="100000" step="0.01" idPrefix={`${fieldId}-`} />
              <Select id={`${fieldId}-un38TestSummaryStatus`} label="UN 38.3 test summary" error={fieldError('hazmat.un38TestSummaryStatus')} {...register(`${path}.hazmat.un38TestSummaryStatus`)}>
                <option value="">Select status</option>
                {valueOptions('intakeUn38Status').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <p className="text-sm font-semibold text-navy-900 sm:col-span-2">Contains batteries: Yes (required for lithium battery products)</p>
            </div>
          )}
        </div>
      </details>

      <details ref={(element) => { if (element && sectionError(['storage'])) element.open = true }} data-section={`${fieldId}-storage`} className="rounded-xl border border-slate-200 p-4" aria-live="polite">
        <summary className="cursor-pointer font-semibold text-navy-900">C. Storage requirements <SectionIndicator error={sectionError(['storage'])} complete={completeness.storage} /></summary>
        <div className="mt-4 space-y-4">
          <MultiSelectCards
            label="Select all storage requirements"
            options={valueOptions('intakeStorage')}
            value={storage}
            onChange={(next) => setValue(`${path}.storage`, next, { shouldDirty: true, shouldValidate: true })}
            error={fieldError('storage')}
          />
          {storageSuggested && (
            <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900" role="status">
              Consider adding hazmat-compliant storage for the declared hazards.
              <button type="button" className="ml-1 font-semibold underline" onClick={() => setValue(`${path}.storage`, [...storage, 'hazmat-compliant'], { shouldDirty: true, shouldValidate: true })}>Add it</button>
            </p>
          )}
        </div>
      </details>

      <details ref={(element) => { if (element && sectionError(['handling'])) element.open = true }} data-section={`${fieldId}-handling`} className="rounded-xl border border-slate-200 p-4" aria-live="polite">
        <summary className="cursor-pointer font-semibold text-navy-900">D. Handling details <SectionIndicator error={sectionError(['handling'])} complete={completeness.handling} /></summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select id={`${fieldId}-physicalState`} label="Physical state" error={fieldError('handling.physicalState')} {...register(`${path}.handling.physicalState`)}>
            {valueOptions('intakePhysicalState').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select id={`${fieldId}-containsBatteries`} label="Contains batteries" value={hasLithium || handling.containsBatteries ? 'yes' : 'no'} disabled={hasLithium} error={fieldError('handling.containsBatteries')} onChange={(event) => setValue(`${path}.handling.containsBatteries`, event.target.value === 'yes', { shouldDirty: true, shouldValidate: true })}>
            <option value="yes">Yes</option><option value="no">No</option>
          </Select>
          <Select id={`${fieldId}-leakageRisk`} label="Any leakage or damage risk?" error={fieldError('handling.leakageOrDamageRisk')} {...register(`${path}.handling.leakageOrDamageRisk`)}>
            {valueOptions('intakeYesNo').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select
            id={`${fieldId}-expiryDated`}
            label="Expiry-dated?"
            error={fieldError('handling.isExpiryDated')}
            value={handling.isExpiryDated ? 'yes' : 'no'}
            onChange={(event) => {
              const isDated = event.target.value === 'yes'
              setValue(`${path}.handling.isExpiryDated`, isDated, { shouldDirty: true, shouldValidate: true })
              if (!isDated) setValue(`${path}.handling.expiryDate`, '', { shouldDirty: true })
            }}
          >
            <option value="yes">Yes</option><option value="no">No</option>
          </Select>
          {handling.isExpiryDated && (
            <Input id={`${fieldId}-expiryDate`} label="Expiry date" type="date" min={dateInputMinimum()} hint="Display format: DD/MM/YYYY" error={fieldError('handling.expiryDate')} {...register(`${path}.handling.expiryDate`)} />
          )}
          <div>
            <Textarea id={`${fieldId}-specialHandlingInstructions`} label="Special handling instructions" maxLength={1000} error={fieldError('handling.specialHandlingInstructions')} {...register(`${path}.handling.specialHandlingInstructions`)} />
            <p className="mt-1 text-right text-xs text-slate-500" aria-live="polite">{(watch(`${path}.handling.specialHandlingInstructions`) || '').length}/1000</p>
          </div>
          <div>
            <Textarea id={`${fieldId}-specialStorageInstructions`} label="Special storage instructions" maxLength={1000} error={fieldError('handling.specialStorageInstructions')} {...register(`${path}.handling.specialStorageInstructions`)} />
            <p className="mt-1 text-right text-xs text-slate-500" aria-live="polite">{(watch(`${path}.handling.specialStorageInstructions`) || '').length}/1000</p>
          </div>
        </div>
      </details>

      <div data-section={`${fieldId}-amazon-question`} className="rounded-xl border border-slate-200 p-4">
        <FieldsetRadios
          label="Do you sell this product on Amazon?"
          name={`${path}.amazon.sellsOnAmazon`}
          idPrefix={fieldId}
          value={amazon.sellsOnAmazon ? 'yes' : 'no'}
          options={valueOptions('intakeYesNo').filter(({ value }) => value !== 'not-sure')}
          onChange={(event) => {
            const next = event.target.value === 'yes'
            setValue(`${path}.amazon.sellsOnAmazon`, next, { shouldDirty: true, shouldValidate: true })
            if (!next) {
              for (const field of ['fulfilmentChannel', 'listingStatus', 'dangerousGoodsReviewStatus', 'complianceDocumentsAvailable']) {
                setValue(`${path}.amazon.${field}`, '', { shouldDirty: true })
              }
            }
          }}
        />
      </div>

      {amazon.sellsOnAmazon && (
        <details open data-section={`${fieldId}-amazon`} className="rounded-xl border border-slate-200 p-4" aria-live="polite">
          <summary className="cursor-pointer font-semibold text-navy-900">E. Amazon <SectionIndicator error={sectionError(['amazon'])} complete={completeness.amazon} /></summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ['fulfilmentChannel', 'Fulfilment channel', 'intakeAmazonChannel'],
              ['listingStatus', 'Listing status', 'intakeAmazonListing'],
              ['dangerousGoodsReviewStatus', 'Dangerous goods review status', 'intakeAmazonDgReview'],
              ['complianceDocumentsAvailable', 'Compliance documents available', 'intakeYesNo'],
            ].map(([field, label, group]) => (
              <Select key={field} id={`${fieldId}-${field}`} label={label} error={fieldError(`amazon.${field}`)} {...register(`${path}.amazon.${field}`)}>
                <option value="">Select an option</option>
                {valueOptions(group).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            ))}
          </div>
        </details>
      )}

    </div>
  )
}

function ProductFileSections({ product, fieldId, files, error, onAdd, onRemove, disabled }) {
  const hazmat = product.hazmat || EMPTY_PRODUCT.hazmat
  const activeHazmatStatus = ['hazmat', 'limited-quantity', 'excepted-quantity'].includes(hazmat.declaredStatus)
  const hasLithium = (hazmat.hazardTypes || []).includes('lithium-battery-products')
  const showSds = hazmat.declaredStatus !== 'non-hazmat'
    || (hazmat.hazardTypes || []).length > 0
    || hazmat.sdsStatus === 'available'
    || hazmat.sdsStatus === 'unavailable'
    || files.some((entry) => entry.kind === 'sds')
  const recommended = [
    ...(hazmat.sdsStatus === 'available' ? [['sds', 'You said an SDS is available, please upload it']] : []),
    ...(hasLithium && hazmat.un38TestSummaryStatus === 'available' ? [['un383-test-summary', 'You said a UN 38.3 test summary is available, please upload it']] : []),
    ...(activeHazmatStatus ? [['dangerous-goods-declaration', 'A dangerous goods declaration is recommended for this declared status']] : []),
    ...(product.fnsku?.trim() ? [['fnsku-labels-pdf', 'FNSKU labels are recommended because an FNSKU is entered']] : []),
  ]

  return (
    <details open data-section={`${fieldId}-files`} className="rounded-xl border border-slate-200 p-4" aria-live="polite">
      <summary className="cursor-pointer font-semibold text-navy-900">
        F. Barcodes, labels and documents
        <SectionIndicator error={Boolean(error)} complete={files.some((entry) => entry.kind === 'barcode-pdf')} />
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-sm leading-6 text-slate-600">Files are kept in this tab only and are not included in saved drafts. Keep this tab open until uploads finish. Maximum 10 MB per file, 20 files per product and 150 MB total.</p>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        {!files.some((entry) => entry.kind === 'barcode-pdf') && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="status">At least one barcode PDF is required for this product.</p>
        )}
        {recommended.filter(([kind]) => !files.some((entry) => entry.kind === kind)).map(([kind, message]) => (
          <p key={kind} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">{message}</p>
        ))}
        {PRODUCT_UPLOADS.map(([kind, label, fileType, required]) => {
          if (kind === 'fnsku-labels-pdf' && !product.fnsku?.trim() && !files.some((entry) => entry.kind === kind)) return null
          if (kind === 'sds' && !showSds) return null
          if (kind === 'un383-test-summary' && !hasLithium && !files.some((entry) => entry.kind === kind)) return null
          if (kind === 'dangerous-goods-declaration' && !activeHazmatStatus && !files.some((entry) => entry.kind === kind)) return null
          return (
            <FileDropzone
              key={kind}
              id={`${fieldId}-upload-${kind}`}
              label={`${label}${required ? ' (required)' : ''}`}
              helpText={kind === 'barcode-pdf' ? 'Upload the barcode sheet for this product.' : ''}
              fileType={fileType}
              files={files.filter((entry) => entry.kind === kind)}
              onAdd={(file) => onAdd(kind, file)}
              onRemove={onRemove}
              disabled={disabled}
            />
          )
        })}
      </div>
    </details>
  )
}

function SummaryTotals({ totals, title = 'Estimated, confirmed on receipt' }) {
  const cards = [
    ['SKUs', totals.skus],
    ['Cartons', totals.cartons],
    ['Units', totals.units],
    ['Gross weight (kg)', totals.grossWeightKg],
    ['Volume (m³)', totals.volumeM3],
  ]
  return (
    <div className="rounded-2xl bg-navy-50 p-4 sm:p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-600">{label}</dt>
            <dd className="mt-1 font-semibold text-navy-900">{formatIntakeNumber(value, 3)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function NumberField({ name, label, register, errors, step = '1', min, max, inputMode = 'decimal', idPrefix = '' }) {
  const id = `${idPrefix}${name.replaceAll('.', '-')}`
  return (
    <Input
      id={id}
      label={label}
      type="number"
      inputMode={inputMode}
      min={min}
      max={max}
      step={step}
      error={errors?.message}
      {...register(name, { setValueAs: (value) => value === '' ? undefined : Number(value) })}
    />
  )
}

function ProductCard({ index, fieldId, register, errors, control, watch, getValues, setValue, onRemove, onDuplicate, onCopyPrevious, canRemove, canAdd, files, fileError, onFileAdd, onFileRemove, filesDisabled, hasError }) {
  const productPath = `products.${index}`
  const { fields: boxes, append, remove } = useFieldArray({ control, name: `${productPath}.boxes` })
  const product = watch(productPath) || {}
  const totals = calculateProductTotals(product)
  const numberErrors = (key) => getNestedError(errors?.products?.[index], key)
  const boxError = (boxIndex, key) => errors?.products?.[index]?.boxes?.[boxIndex]?.[key]?.message

  function addBoxes(count) {
    const available = Math.max(0, 100000 - boxes.length)
    append(Array.from({ length: Math.min(count, available) }, () => ({ ...EMPTY_BOX })))
  }

  function copyPreviousBox(boxIndex) {
    if (boxIndex === 0) return
    const previous = getValues(`${productPath}.boxes.${boxIndex - 1}`)
    if (previous) setValue(`${productPath}.boxes.${boxIndex}`, { ...previous }, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-card sm:p-6 ${hasError ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy-900">Product {index + 1}</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-10 px-3 py-2" disabled={!canAdd} onClick={onDuplicate}><Copy size={15} aria-hidden="true" /> Duplicate</Button>
          <Button type="button" variant="outline" className="min-h-10 px-3 py-2 text-red-700" disabled={!canRemove} onClick={onRemove}><Trash2 size={15} aria-hidden="true" /> Remove</Button>
        </div>
      </div>

      <details open data-section={`${fieldId}-product`} className="mt-5 rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold text-navy-900">A. Product details and packing <SectionIndicator error={Boolean(numberErrors('productName') || numberErrors('brandName') || numberErrors('sku') || numberErrors('barcode') || numberErrors('category') || numberErrors('uniform') || numberErrors('boxes'))} complete={Boolean(product.productName && product.sku && product.barcode && product.category)} /></summary>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input id={`${fieldId}-productName`} label="Product name" error={numberErrors('productName')?.message} {...register(`${productPath}.productName`)} />
        <Input id={`${fieldId}-brandName`} label="Brand name" error={numberErrors('brandName')?.message} {...register(`${productPath}.brandName`)} />
        <Input id={`${fieldId}-sku`} label="SKU" error={numberErrors('sku')?.message} {...register(`${productPath}.sku`)} />
        <Input id={`${fieldId}-fnsku`} label="FNSKU (optional)" error={numberErrors('fnsku')?.message} {...register(`${productPath}.fnsku`)} />
        <Input id={`${fieldId}-asin`} label="ASIN (optional)" error={numberErrors('asin')?.message} {...register(`${productPath}.asin`)} />
        <Input id={`${fieldId}-barcode`} label="Barcode (UPC/EAN/GTIN)" inputMode="numeric" error={numberErrors('barcode')?.message} {...register(`${productPath}.barcode`)} />
        <Select id={`${fieldId}-category`} label="Category" error={numberErrors('category')?.message} {...register(`${productPath}.category`)}>
          <option value="">Select a category</option>
          {INTAKE_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </Select>
        <Select id={`${fieldId}-countryOfOrigin`} label="Country of origin (optional)" error={numberErrors('countryOfOrigin')?.message} {...register(`${productPath}.countryOfOrigin`)}>
          <option value="">Select a country</option>
          {ORIGIN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-navy-900">Packing mode</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {[
            ['uniform', getAdminLabel('packingMode', 'uniform')],
            ['individual', getAdminLabel('packingMode', 'individual')],
          ].map(([value, label]) => (
            <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${product.packingMode === value ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
              <input type="radio" value={value} className="h-4 w-4 accent-orange-500" {...register(`${productPath}.packingMode`)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {product.packingMode === 'uniform' ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField name={`${productPath}.uniform.cartons`} label="Cartons" register={register} errors={numberErrors('uniform.cartons')} min="1" max="100000" inputMode="numeric" idPrefix={`${fieldId}-`} />
          <NumberField name={`${productPath}.uniform.unitsPerCarton`} label="Units per carton" register={register} errors={numberErrors('uniform.unitsPerCarton')} min="1" max="100000" inputMode="numeric" idPrefix={`${fieldId}-`} />
          <NumberField name={`${productPath}.uniform.cartonWeightKg`} label="Carton weight (kg)" register={register} errors={numberErrors('uniform.cartonWeightKg')} min="0.01" max="1000" step="0.01" idPrefix={`${fieldId}-`} />
          <NumberField name={`${productPath}.uniform.cartonLengthCm`} label="Length (cm)" register={register} errors={numberErrors('uniform.cartonLengthCm')} min="1" max="300" step="0.01" idPrefix={`${fieldId}-`} />
          <NumberField name={`${productPath}.uniform.cartonWidthCm`} label="Width (cm)" register={register} errors={numberErrors('uniform.cartonWidthCm')} min="1" max="300" step="0.01" idPrefix={`${fieldId}-`} />
          <NumberField name={`${productPath}.uniform.cartonHeightCm`} label="Height (cm)" register={register} errors={numberErrors('uniform.cartonHeightCm')} min="1" max="300" step="0.01" idPrefix={`${fieldId}-`} />
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-10 px-3 py-2" disabled={boxes.length >= 100000} onClick={() => addBoxes(1)}><Plus size={15} aria-hidden="true" /> Add box</Button>
            <Button type="button" variant="outline" className="min-h-10 px-3 py-2" disabled={boxes.length >= 100000} onClick={() => addBoxes(10)}><Plus size={15} aria-hidden="true" /> Add 10 boxes</Button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 md:overflow-x-auto">
            <table className="block w-full text-left text-sm md:table md:min-w-[790px]">
              <thead className="hidden bg-slate-50 text-xs font-semibold uppercase text-slate-600 md:table-header-group"><tr>
                <th className="p-3">Box</th><th className="p-3">Units</th><th className="p-3">Weight (kg)</th><th className="p-3">L (cm)</th><th className="p-3">W (cm)</th><th className="p-3">H (cm)</th><th className="p-3">Actions</th>
              </tr></thead>
              <tbody className="block md:table-row-group md:divide-y md:divide-slate-100">{boxes.map((box, boxIndex) => (
                <tr key={box.id} className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 md:mb-0 md:table-row md:gap-0 md:rounded-none md:border-0 md:p-0">
                  <th scope="row" className="col-span-2 block p-1 font-medium text-navy-900 md:table-cell md:p-3">{`Box ${boxIndex + 1}`}</th>
                  {[
                    ['units', 'Units', 1, 100000, 1],
                    ['weightKg', 'Weight (kg)', 0.01, 1000, 0.01],
                    ['lengthCm', 'Length (cm)', 1, 300, 0.01],
                    ['widthCm', 'Width (cm)', 1, 300, 0.01],
                    ['heightCm', 'Height (cm)', 1, 300, 0.01],
                  ].map(([key, label, min, max, step]) => (
                    <td key={key} className="block p-1 md:table-cell md:p-2">
                      <label htmlFor={`${fieldId}-box-${boxIndex}-${key}`} className="text-xs font-semibold text-slate-700 md:hidden">{label}</label>
                      <input id={`${fieldId}-box-${boxIndex}-${key}`} type="number" inputMode={key === 'units' ? 'numeric' : 'decimal'} min={min} max={max} step={step} aria-invalid={Boolean(boxError(boxIndex, key))} aria-describedby={boxError(boxIndex, key) ? `${fieldId}-box-${boxIndex}-${key}-error` : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 md:mt-0 md:w-24" {...register(`${productPath}.boxes.${boxIndex}.${key}`, { setValueAs: (value) => value === '' ? undefined : Number(value) })} />
                      {boxError(boxIndex, key) && <p id={`${fieldId}-box-${boxIndex}-${key}-error`} className="mt-1 text-xs text-red-700">{boxError(boxIndex, key)}</p>}
                    </td>
                  ))}
                  <td className="col-span-2 flex flex-wrap gap-4 p-1 md:table-cell md:whitespace-nowrap md:p-2">
                    {boxIndex > 0 && <button type="button" className="text-xs font-semibold text-navy-800 underline" onClick={() => copyPreviousBox(boxIndex)}>Copy from previous row</button>}
                    <button type="button" className="text-xs font-semibold text-red-700 underline" onClick={() => remove(boxIndex)} disabled={boxes.length <= 1}>Remove box</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {errors?.products?.[index]?.boxes?.message && <p className="mt-2 text-sm text-red-700" role="alert">{errors.products[index].boxes.message}</p>}
        </div>
      )}
      </details>

      <ProductExtraSections
        index={index}
        fieldId={fieldId}
        product={product}
        register={register}
        errors={errors}
        watch={watch}
        getValues={getValues}
        setValue={setValue}
        onCopyPrevious={onCopyPrevious}
      />

      <ProductFileSections
        product={product}
        fieldId={fieldId}
        files={files}
        error={fileError}
        onAdd={onFileAdd}
        onRemove={onFileRemove}
        disabled={filesDisabled}
      />

      <div className="mt-5">
        <SummaryTotals totals={{ skus: 1, ...totals }} />
      </div>
    </article>
  )
}

function DownloadButton({ reference, token, onError, onSuccess }) {
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const blob = await downloadIntakePdf(reference, token)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `inventory-intake-${reference}.pdf`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      onSuccess()
    } catch (error) {
      const status = error.response?.status
      if (import.meta.env.DEV) {
        console.error('Intake summary PDF download failed', {
          status: status ?? null,
          response: error.response?.data ?? error.message,
        })
      }
      onError(status === 401 || status === 403
        ? 'This download link has expired. The warehouse team will email you a copy.'
        : !error.response
          ? 'A network error interrupted the download. Please try again.'
          : 'The summary PDF could not be downloaded. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <Button type="button" onClick={download} disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{busy ? 'Preparing PDF…' : 'Download summary PDF'}</Button>
}

function SuccessView({ result, pdfToken, onPdfError, uploads, tokenExpired, uploading, onRetry }) {
  const data = result?.data ?? result ?? {}
  const reference = data.reference ?? data.referenceNumber ?? data.intake?.reference ?? data.intake?.referenceNumber ?? '—'
  const returnedTotals = data.totals ?? data.summary ?? data.intake?.totals
  const returnedProducts = data.products ?? data.intake?.products ?? []
  const requiresDgReview = data.requiresDgReview ?? data.intake?.requiresDgReview
  const documentsStatus = data.documentsStatus ?? data.intake?.documentsStatus
  const totals = returnedTotals ? getIntakeTotals({ totals: returnedTotals, products: returnedProducts }) : getIntakeTotals({ products: returnedProducts })

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(String(reference))
    } catch {
      onPdfError('The reference could not be copied automatically. Please select and copy it.')
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Intake submitted</p>
      <h1 className="mt-3 text-3xl font-bold text-navy-900">Thank you. We’ve received your inventory details.</h1>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <p className="rounded-xl bg-navy-50 px-4 py-3 font-semibold text-navy-900">Reference: {reference}</p>
        {reference !== '—' && <Button type="button" variant="outline" className="min-h-11 px-4 py-2" onClick={copyReference}><Copy size={15} aria-hidden="true" /> Copy reference</Button>}
      </div>
      {requiresDgReview === true && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          Some items need dangerous goods verification before they can be accepted.
        </p>
      )}
      {requiresDgReview === false && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
          The warehouse team will confirm your inventory details on receipt.
        </p>
      )}
      {documentsStatus === 'incomplete' && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          Some files are still missing. The warehouse team will contact you about the outstanding documents.
        </p>
      )}
      {uploads.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5" aria-labelledby="submitted-file-status">
          <h2 id="submitted-file-status" className="font-bold text-navy-900">File upload status</h2>
          <ul className="mt-3 space-y-2">
            {uploads.map((file) => (
              <li key={file.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block break-all font-medium text-navy-900">{getAdminLabel('intakeFileKind', file.kind)} · {file.file.name}</span>
                  <span className="text-xs text-slate-500">{formatUploadSize(file.file.size)}</span>
                  {file.error && <span className="mt-1 block text-xs text-red-700">{file.error}</span>}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${file.status === 'uploaded' ? 'text-emerald-800' : 'text-red-700'}`}>{getAdminLabel('intakeFileStatus', file.status)}</span>
              </li>
            ))}
          </ul>
          {tokenExpired && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">The secure upload token has expired. The warehouse team will contact you about any missing files.</p>}
          {!tokenExpired && uploads.some((file) => file.status === 'failed') && (
            <Button type="button" className="mt-4" disabled={uploading} onClick={onRetry}>Retry failed uploads</Button>
          )}
        </section>
      )}
      <div className="mt-6"><SummaryTotals totals={totals} title="Submitted totals" /></div>
      {returnedProducts.length > 0 && (
        <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">SKU</th><th className="p-3">Product</th><th className="p-3">Cartons</th><th className="p-3">Units</th><th className="p-3">Weight (kg)</th><th className="p-3">Volume (m³)</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{returnedProducts.map((product, index) => {
              const productTotals = product.totals ?? getIntakeProductTotals(product)
              return <tr key={`${product.sku ?? 'sku'}-${index}`}><td className="p-3 font-medium">{product.sku ?? '—'}</td><td className="p-3">{product.productName ?? product.name ?? '—'}</td><td className="p-3">{formatIntakeNumber(productTotals.cartons ?? product.cartons)}</td><td className="p-3">{formatIntakeNumber(productTotals.units ?? product.totalUnits)}</td><td className="p-3">{formatIntakeNumber(productTotals.grossWeightKg ?? product.grossWeightKg)}</td><td className="p-3">{formatIntakeNumber(productTotals.volumeM3 ?? product.volumeM3, 3)}</td></tr>
            })}</tbody>
          </table>
        </div>
      )}
      <div className="mt-7 rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <h2 className="font-bold text-navy-900">What happens next</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Your submission is pending verification by warehouse staff. We’ll review the inventory details and contact you if anything needs clarification. Final quantities and measurements will be confirmed on receipt.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {reference !== '—' && <DownloadButton reference={reference} token={pdfToken} onError={onPdfError} onSuccess={() => onPdfError('')} />}
        <Button to="/" variant="outline">Return to home</Button>
      </div>
    </section>
  )
}

function UploadingView({ reference, records, progress, onCancel }) {
  const uploaded = records.filter((record) => record.status === 'uploaded').length
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Reference: {reference}</p>
      <h1 className="mt-3 text-3xl font-bold text-navy-900">Uploading your files</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Keep this tab open until the upload finishes. You can cancel and retry any files that do not complete.</p>
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm font-medium text-navy-900"><span>Overall progress</span><span>{progress}%</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Overall file upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-600" aria-live="polite">{uploaded} of {records.length} files uploaded</p>
      </div>
      <ul className="mt-5 space-y-3">
        {records.map((record) => (
          <li key={record.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="break-all font-medium text-navy-900">{record.file.name}</span>
              <span className="text-xs text-slate-600">{getAdminLabel('intakeFileStatus', record.status)}</span>
            </div>
            {record.status === 'uploading' && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Uploading ${record.file.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={record.progress}>
                <div className="h-full rounded-full bg-navy-700 transition-[width]" style={{ width: `${record.progress}%` }} />
              </div>
            )}
            {record.error && <p className="mt-2 text-xs text-red-700">{record.error}</p>}
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" className="mt-6" onClick={onCancel}><X size={16} aria-hidden="true" /> Cancel uploads</Button>
    </section>
  )
}

export default function InventoryIntake() {
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [pdfToken, setPdfToken] = useState('')
  const [uploadToken, setUploadToken] = useState('')
  const [uploadTokenExpiresAt, setUploadTokenExpiresAt] = useState('')
  const [uploadRecords, setUploadRecords] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadTokenExpired, setUploadTokenExpired] = useState(false)
  const [productFiles, setProductFiles] = useState({})
  const [productFileErrors, setProductFileErrors] = useState({})
  const [submissionFiles, setSubmissionFiles] = useState([])
  const [submissionFileError, setSubmissionFileError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [validationIssues, setValidationIssues] = useState([])
  const [draftError, setDraftError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const productTopRef = useRef(null)
  const validationSummaryRef = useRef(null)
  const honeypotRef = useRef(null)
  const submittingRef = useRef(false)
  const productFilesRef = useRef({})
  const submissionFilesRef = useRef([])
  const uploadControllerRef = useRef(null)
  const uploadRecordsRef = useRef([])
  const [restored] = useState(readDraft)
  const {
    register,
    control,
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    trigger,
    setFocus,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(intakeSchema),
    mode: 'onTouched',
    defaultValues: getDefaultValues(restored.value),
  })
  useEffect(() => {
    if (restored.error) setDraftError(restored.error)
  }, [restored.error])
  useEffect(() => () => uploadControllerRef.current?.abort(), [])
  const { fields, append, remove, insert } = useFieldArray({ control, name: 'products' })
  const values = watch()
  const estimatedTotals = calculateIntakeTotals(values.products ?? [])
  useEffect(() => {
    if (step === 3 && validationIssues.length) {
      validationSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      validationSummaryRef.current?.focus({ preventScroll: true })
    }
  }, [step, validationIssues])

  function addProductFile(productKey, kind, file) {
    const currentFiles = productFilesRef.current[productKey] || []
    const allFiles = [
      ...Object.values(productFilesRef.current).flat(),
      ...submissionFilesRef.current,
    ]
    if (currentFiles.length >= MAX_PRODUCT_FILES) return 'This product has reached the 20-file limit.'
    if (allFiles.length >= MAX_SUBMISSION_FILES) return 'This intake has reached the 200-file limit.'
    if (allFiles.reduce((sum, entry) => sum + entry.file.size, 0) + file.size > MAX_SUBMISSION_SIZE) return 'The total file size cannot exceed 150 MB.'
    const entry = { id: nextFileId(), kind, file }
    productFilesRef.current = { ...productFilesRef.current, [productKey]: [...currentFiles, entry] }
    setProductFiles(productFilesRef.current)
    setProductFileErrors((current) => ({ ...current, [productKey]: '' }))
    return true
  }

  function removeProductFile(productKey, fileId) {
    productFilesRef.current = {
      ...productFilesRef.current,
      [productKey]: (productFilesRef.current[productKey] || []).filter((entry) => entry.id !== fileId),
    }
    setProductFiles(productFilesRef.current)
  }

  function addSubmissionFile(kind, file) {
    const allFiles = [...Object.values(productFilesRef.current).flat(), ...submissionFilesRef.current]
    if (submissionFilesRef.current.length >= MAX_SUBMISSION_FILES) return 'The intake has reached the 200-file limit.'
    if (allFiles.length >= MAX_SUBMISSION_FILES) return 'This intake has reached the 200-file limit.'
    if (allFiles.reduce((sum, entry) => sum + entry.file.size, 0) + file.size > MAX_SUBMISSION_SIZE) return 'The total file size cannot exceed 150 MB.'
    submissionFilesRef.current = [...submissionFilesRef.current, { id: nextFileId(), kind, file }]
    setSubmissionFiles(submissionFilesRef.current)
    setSubmissionFileError('')
    return true
  }

  function removeSubmissionFile(fileId) {
    submissionFilesRef.current = submissionFilesRef.current.filter((entry) => entry.id !== fileId)
    setSubmissionFiles(submissionFilesRef.current)
  }

  function updateUploadRecord(id, patch) {
    uploadRecordsRef.current = uploadRecordsRef.current.map((record) => record.id === id ? { ...record, ...patch } : record)
    setUploadRecords(uploadRecordsRef.current)
    const totalBytes = uploadRecordsRef.current.reduce((sum, record) => sum + record.file.size, 0)
    const transferredBytes = uploadRecordsRef.current.reduce((sum, record) => (
      sum + (record.status === 'uploaded' ? record.file.size : record.status === 'uploading' ? record.file.size * (record.progress || 0) / 100 : 0)
    ), 0)
    setUploadProgress(totalBytes ? Math.floor(transferredBytes / totalBytes * 100) : 100)
  }

  function friendlyUploadError(error) {
    const status = error.response?.status
    if (status === 413) return 'This file is too large. Files must be 10 MB or smaller.'
    if (status === 415) return 'This file type is not supported. Upload a PDF, JPG or PNG as requested.'
    if (status === 429) return 'The upload service is busy. Please wait a moment before retrying.'
    if (status === 400) return error.response?.data?.message || 'The server could not accept this file. Check its contents and try again.'
    if (status === 401 || status === 403 || status === 410) return 'The secure upload token has expired.'
    return error.response?.data?.message || 'The file could not be uploaded. Please try again.'
  }

  function isTransientUploadError(error) {
    const status = error.response?.status
    return !status || status === 408 || status === 429 || status >= 500
  }

  async function runFileUploads(records, token, expiresAt = '') {
    if (!records.length) return
    const expiryTime = expiresAt ? new Date(expiresAt).getTime() : NaN
    if (!token || (Number.isFinite(expiryTime) && expiryTime <= Date.now())) {
      setUploadTokenExpired(true)
      for (const record of records) updateUploadRecord(record.id, { status: 'failed', progress: 0, error: 'The secure upload token has expired.' })
      return
    }

    const controller = new AbortController()
    uploadControllerRef.current = controller
    setUploading(true)
    const queue = records.map((record) => record.id)
    let nextIndex = 0

    async function worker() {
      while (nextIndex < queue.length && !controller.signal.aborted) {
        const id = queue[nextIndex]
        nextIndex += 1
        const record = uploadRecordsRef.current.find((entry) => entry.id === id)
        if (!record) continue
        updateUploadRecord(id, { status: 'uploading', progress: 0, error: '' })
        let lastError
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await uploadIntakeFile(record.reference, token, {
              kind: record.kind,
              sku: record.sku,
              file: record.file,
              signal: controller.signal,
              onUploadProgress: (event) => {
                if (event.total) updateUploadRecord(id, { progress: Math.min(99, Math.round(event.loaded / event.total * 100)) })
              },
            })
            if (response?.success === false) {
              const responseError = new Error(response.message || 'The file could not be uploaded.')
              responseError.response = { status: response.statusCode || 400, data: response }
              throw responseError
            }
            updateUploadRecord(id, { status: 'uploaded', progress: 100, error: '', response: response?.data ?? response })
            lastError = null
            break
          } catch (error) {
            lastError = error
            if (controller.signal.aborted || attempt === 1 || !isTransientUploadError(error)) break
            await new Promise((resolve) => window.setTimeout(resolve, 600))
          }
        }
        if (lastError) {
          const expired = [401, 403, 410].includes(lastError.response?.status)
          if (expired) setUploadTokenExpired(true)
          updateUploadRecord(id, {
            status: 'failed',
            progress: 0,
            error: controller.signal.aborted ? 'Upload cancelled. Retry this file when ready.' : friendlyUploadError(lastError),
          })
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: Math.min(3, queue.length) }, () => worker()))
    } finally {
      if (controller.signal.aborted) {
        uploadRecordsRef.current
          .filter((record) => record.status === 'pending')
          .forEach((record) => updateUploadRecord(record.id, { status: 'failed', error: 'Upload cancelled. Retry this file when ready.' }))
      }
      if (uploadControllerRef.current === controller) uploadControllerRef.current = null
      setUploading(false)
    }
  }

  function cancelUploads() {
    uploadControllerRef.current?.abort()
  }

  function retryFailedUploads() {
    if (uploadTokenExpired) return
    const retryable = uploadRecordsRef.current.filter((record) => record.status !== 'uploaded')
    void runFileUploads(retryable, uploadToken, uploadTokenExpiresAt)
  }

  function validateRequiredBarcodeFiles() {
    const errorsByProduct = {}
    fields.forEach((field, index) => {
      const current = productFilesRef.current[field.id] || []
      if (!current.some((entry) => entry.kind === 'barcode-pdf')) errorsByProduct[field.id] = `Product ${index + 1} needs at least one barcode PDF.`
    })
    setProductFileErrors(errorsByProduct)
    const missing = fields.find((field) => errorsByProduct[field.id])
    if (missing) {
      setStep(1)
      window.setTimeout(() => {
        const section = document.querySelector(`[data-section="intake-product-${fields.indexOf(missing)}-files"]`)
        section?.setAttribute('open', '')
        section?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        section?.querySelector('button')?.focus()
      }, 0)
      return false
    }
    return true
  }

  function getSubmissionValidationIssues() {
    const parsed = intakeSchema.safeParse(getValues())
    const schemaIssues = parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
        }))
    const barcodeIssues = fields.flatMap((field, index) => {
      const current = productFilesRef.current[field.id] || []
      return current.some((entry) => entry.kind === 'barcode-pdf')
        ? []
        : [{ path: ['products', String(index), 'files', 'barcode-pdf'], message: 'Barcode PDF is required.' }]
    })
    const uniqueIssues = new Map()
    for (const issue of [...schemaIssues, ...barcodeIssues]) {
      const key = `${issue.path.join('.')}:${issue.message}`
      if (!uniqueIssues.has(key)) {
        uniqueIssues.set(key, {
          ...issue,
          text: getValidationProblemText(issue),
        })
      }
    }
    return [...uniqueIssues.values()]
  }

  function handleInvalidSubmit() {
    const parsed = intakeSchema.safeParse(getValues())
    if (import.meta.env.DEV) {
      console.error('Inventory intake validation failed:', {
        success: parsed.success,
        issues: parsed.success ? [] : parsed.error.issues.map((issue) => ({
          ...issue,
          path: [...issue.path],
        })),
      })
    }
    setSubmitError('')
    setValidationIssues(getSubmissionValidationIssues())
    setStep(3)
  }

  useEffect(() => {
    let timer
    const subscription = watch((draft) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        try {
          const draftWithoutHoneypot = { ...draft, version: 3 }
          delete draftWithoutHoneypot.website
          delete draftWithoutHoneypot.consent
          window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftWithoutHoneypot))
          setDraftError('')
        } catch {
          setDraftError('Your draft could not be saved in this tab. Please keep this page open until you submit.')
        }
      }, 300)
    })
    return () => {
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [watch])

  const stepFields = [
    ['customer'],
    ['products'],
    ['services'],
    ['additionalInstructions', 'consent'],
  ]

  function focusFieldPath(fieldPath) {
    const desiredStep = fieldPath.startsWith('products.')
      ? 1
      : fieldPath === 'services'
        ? 2
        : fieldPath.startsWith('customer.')
          ? 0
          : 3
    setStep(desiredStep)
    window.setTimeout(() => {
      if (fieldPath.startsWith('products.')) {
        const [, productIndex, ...fieldParts] = fieldPath.split('.')
        const fieldName = fieldParts.join('.')
        const sectionName = fieldName.startsWith('storage')
          ? 'storage'
          : fieldName.startsWith('files')
            ? 'files'
          : fieldName.startsWith('handling')
            ? 'handling'
            : fieldName.startsWith('amazon')
              ? 'amazon-question'
              : fieldName.startsWith('hazmat')
                ? 'hazmat'
                : 'product'
        const section = document.querySelector(`[data-section="intake-product-${productIndex}-${sectionName}"]`)
        if (section) {
          section.open = true
          section.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        const boxMatch = fieldName.match(/^boxes\.(\d+)\.(units|weightKg|lengthCm|widthCm|heightCm)$/)
        const customFieldSelector = boxMatch
          ? `#intake-product-${productIndex}-box-${boxMatch[1]}-${boxMatch[2]}`
          : fieldName.startsWith('files')
            ? 'button'
            : {
          'hazmat.declaredStatus': 'select',
          'hazmat.hazardTypes': 'input[type="checkbox"]',
          'hazmat.unNumber': `#intake-product-${productIndex}-unNumber`,
          'storage': 'input[type="checkbox"]',
          'handling.containsBatteries': `#intake-product-${productIndex}-containsBatteries`,
          'amazon.sellsOnAmazon': 'input[type="radio"]',
        }[fieldName]
        if (customFieldSelector) section?.querySelector(customFieldSelector)?.focus()
        else setFocus(fieldPath)
      } else {
        if (fieldPath === 'services') document.querySelector('[data-section="intake-services"] input[type="checkbox"]')?.focus()
        else if (fieldPath.startsWith('customer.')) setFocus(fieldPath)
        else setFocus(fieldPath)
      }
    }, 0)
  }

  async function moveNext(event) {
    event?.preventDefault()
    if (step === 1 && !validateRequiredBarcodeFiles()) return
    clearErrors()
    const valid = await trigger(stepFields[step], { shouldFocus: true })
    if (valid) {
      setSubmitError('')
      setStep((current) => Math.min(current + 1, 3))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const parsed = intakeSchema.safeParse(getValues())
    const firstError = parsed.error?.issues[0]?.path.map(String).join('.') || findFirstError(errors)
    if (firstError) focusFieldPath(firstError)
    if (step === 1) productTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function moveBack(event) {
    event?.preventDefault()
    if (step === 3) {
      setValue('consent', false, { shouldDirty: true, shouldValidate: false })
      clearErrors('consent')
    }
    setStep((current) => Math.max(current - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function removeProduct(index) {
    const product = getValues(`products.${index}`)
    const filled = Object.entries(product || {}).some(([key, value]) => {
      if (key === 'boxes' || key === 'packingMode') return false
      return value !== '' && value != null
    }) || (product?.boxes || []).some((box) => Object.values(box).some((value) => value !== '' && value != null))
    if (filled && !window.confirm(`Remove product ${index + 1}? Entered product and carton details will be lost.`)) return
    const productKey = fields[index]?.id
    if (productKey) {
      const remainingFiles = Object.fromEntries(Object.entries(productFilesRef.current).filter(([key]) => key !== productKey))
      productFilesRef.current = remainingFiles
      setProductFiles(remainingFiles)
      setProductFileErrors((current) => {
        return Object.fromEntries(Object.entries(current).filter(([key]) => key !== productKey))
      })
    }
    remove(index)
  }

  function duplicateProduct(index) {
    const product = JSON.parse(JSON.stringify(getValues(`products.${index}`)))
    product.sku = ''
    insert(index + 1, product)
  }

  function copyComplianceFromPrevious(index) {
    if (index < 1) return
    const previous = getValues(`products.${index - 1}`)
    if (!previous) return
    const fields = ['hazmat', 'storage', 'handling']
    for (const field of fields) {
      const value = previous[field]
      setValue(`products.${index}.${field}`, Array.isArray(value) ? [...value] : { ...value }, { shouldDirty: true, shouldValidate: true })
    }
  }

  function mapServerPath(field) {
    return String(field || '').replace(/\[([^\]]+)\]/g, '.$1')
  }

  function mapIntakeServerErrors(error) {
    const serverErrors = error.response?.data?.errors ?? error.errors
    if (!Array.isArray(serverErrors)) return false
    let mapped = false
    for (const item of serverErrors) {
      const path = mapServerPath(item?.field)
      if (path !== 'website' && /^(customer\.(contactPerson|businessName|phone|email)|products\.\d+\.[\w.]+|services|additionalInstructions|consent)$/.test(path)) {
        setError(path, { type: 'server', message: item.message || 'Please check this field.' })
        mapped = true
      }
    }
    return mapped
  }

  async function submit(valuesToSend, event) {
    if (step !== 3) {
      event?.preventDefault()
      return
    }
    if (submittingRef.current) return
    const submissionIssues = getSubmissionValidationIssues()
    const missingBarcodeIssues = submissionIssues.filter((issue) => issue.path[2] === 'files')
    if (missingBarcodeIssues.length) {
      const fileErrors = {}
      fields.forEach((field, index) => {
        if (missingBarcodeIssues.some((issue) => Number(issue.path[1]) === index)) {
          fileErrors[field.id] = `Product ${index + 1} needs at least one barcode PDF.`
        }
      })
      setProductFileErrors(fileErrors)
      setValidationIssues(submissionIssues)
      setStep(3)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError('')
    setValidationIssues([])
    setServerError('')
    try {
      const payload = buildIntakePayload(getValues(), honeypotRef.current?.value ?? '')
      if (import.meta.env.DEV) console.log('Submitting inventory intake payload:', payload)
      const response = await submitIntake(payload)
      if (response?.success === false) {
        const submissionError = new Error(response.message || 'The intake could not be submitted.')
        submissionError.response = { data: response }
        throw submissionError
      }
      const data = response?.data ?? response
      const intakeData = data.intake ?? data
      const reference = intakeData.reference ?? intakeData.referenceNumber
      const nextUploadToken = intakeData.uploadToken ?? data.uploadToken ?? ''
      const nextTokenExpiry = intakeData.uploadTokenExpiresAt ?? data.uploadTokenExpiresAt ?? ''
      const queuedFiles = [
        ...valuesToSend.products.flatMap((product, index) => (
          (productFilesRef.current[fields[index]?.id] || []).map((entry) => ({
            ...entry,
            reference,
            sku: product.sku,
            status: 'pending',
            progress: 0,
            error: '',
          }))
        )),
        ...submissionFilesRef.current.map((entry) => ({
          ...entry,
          reference,
          sku: '',
          status: 'pending',
          progress: 0,
          error: '',
        })),
      ]
      uploadRecordsRef.current = queuedFiles
      setUploadRecords(queuedFiles)
      setUploadProgress(0)
      setUploadToken(nextUploadToken)
      setUploadTokenExpiresAt(nextTokenExpiry)
      setUploadTokenExpired(false)
      setResult(data)
      setPdfToken(intakeData.pdfToken ?? data.pdfToken ?? '')
      try {
        window.sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        setDraftError('The submitted draft could not be cleared from this tab.')
      }
      if (queuedFiles.length > 0) await runFileUploads(queuedFiles, nextUploadToken, nextTokenExpiry)
    } catch (error) {
      const mapped = mapIntakeServerErrors(error)
      if (!mapped) {
        const status = error.response?.status
        setSubmitError(status === 413
          ? 'Your intake request is too large. Remove some files or submit fewer details.'
          : status === 415
            ? 'The intake request contains a file type that is not supported.'
            : status === 429
              ? 'We have received several requests recently. Please wait a moment and try again.'
              : status === 400
                ? error.response?.data?.message || 'The server could not accept this intake. Please check the details and try again.'
                : status === 500
                  ? 'The server could not process your intake just now. Please try again shortly.'
                  : !status
                    ? 'We could not connect to the server. Check your connection and try again.'
                    : error.response?.data?.message || 'We could not submit your inventory details. Please try again.')
      }
      else {
        const serverErrors = error.response?.data?.errors ?? error.errors ?? []
        setValidationIssues(serverErrors.filter((item) => !/^website(?:\.|$)/.test(mapServerPath(item?.field))).map((item) => {
          const path = mapServerPath(item?.field).split('.')
          const issue = { path, message: item?.message || 'Please check this field.' }
          return { ...issue, text: getValidationProblemText(issue) }
        }))
        const firstPath = mapServerPath(error.response?.data?.errors?.[0]?.field)
        if (/^(contactPerson|businessName|phone|email|products\.\d+\.[\w.]+|services|additionalInstructions|consent)$/.test(firstPath)) focusFieldPath(firstPath)
        setSubmitError('Please review the highlighted fields and try again.')
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <>
        <Seo title="Inventory Intake" description="Submit your UK warehouse inventory intake details securely." />
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <Container className="py-12 sm:py-16">
          {serverError && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">{serverError}</p>}
          {uploading ? (
            <UploadingView
              reference={result.reference ?? result.referenceNumber ?? result.intake?.reference ?? '—'}
              records={uploadRecords}
              progress={uploadProgress}
              onCancel={cancelUploads}
            />
          ) : (
            <SuccessView
              result={result}
              pdfToken={pdfToken}
              onPdfError={setServerError}
              uploads={uploadRecords}
              tokenExpired={uploadTokenExpired}
              uploading={uploading}
              onRetry={retryFailedUploads}
            />
          )}
        </Container>
      </>
    )
  }

  return (
    <>
      <Seo title="Inventory Intake" description="Submit product, carton and inbound inventory details to our UK warehouse team." />
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Container className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Warehouse inbound</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Inventory intake</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Share your product and carton details so our warehouse team can prepare for your delivery. Estimates are confirmed when inventory is received.</p>

          <ol className="mt-7 grid grid-cols-4 gap-2" aria-label="Intake steps">
            {['Customer', 'Products', 'Services', 'Review'].map((label, index) => (
              <li key={label} aria-current={step === index ? 'step' : undefined} className={`rounded-xl px-3 py-3 text-center text-xs font-semibold sm:text-sm ${index === step ? 'bg-navy-900 text-white' : index < step ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-600'}`}>
                <span className="mr-1">{index + 1}.</span>{label}
              </li>
            ))}
          </ol>

          {draftError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">{draftError}</p>}
          <form
            onSubmit={(event) => {
              if (step !== 3) {
                event.preventDefault()
                return
              }
              handleSubmit(submit, handleInvalidSubmit)(event)
            }}
            onKeyDown={(event) => {
              if (step !== 3 && event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                event.preventDefault()
              }
            }}
            noValidate
            className="mt-6 space-y-5"
          >
            <Honeypot ref={honeypotRef} />

            {step === 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                <h2 className="text-xl font-bold text-navy-900">Customer details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input id="intake-contactPerson" label="Contact person" autoComplete="name" error={errors.customer?.contactPerson?.message} {...register('customer.contactPerson')} />
                  <Input id="intake-businessName" label="Business name" autoComplete="organization" error={errors.customer?.businessName?.message} {...register('customer.businessName')} />
                  <Input id="intake-phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XXX XXXXXX" hint="UK phone number" hintBelow error={errors.customer?.phone?.message} {...register('customer.phone')} />
                  <Input id="intake-email" label="Email address" type="email" autoComplete="email" error={errors.customer?.email?.message} {...register('customer.email')} />
                </div>
              </section>
            )}

            {step === 1 && (
              <section ref={productTopRef} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><h2 className="text-xl font-bold text-navy-900">Product and carton details</h2><p className="mt-1 text-sm text-slate-600">Add each unique SKU as a separate product.</p></div>
                  <Button type="button" variant="outline" className="min-h-10 px-4 py-2" disabled={fields.length >= 100} onClick={() => append(createEmptyProduct())}><Plus size={16} aria-hidden="true" /> Add product</Button>
                </div>
                {errors.products?.message && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{errors.products.message}</p>}
                {fields.map((field, index) => (
                  <ProductCard
                    key={field.id}
                    fieldId={`intake-product-${index}`}
                    index={index}
                    register={register}
                    errors={errors}
                    control={control}
                    watch={watch}
                    getValues={getValues}
                    setValue={setValue}
                    canRemove={fields.length > 1}
                    canAdd={fields.length < 100}
                    onRemove={() => removeProduct(index)}
                    onDuplicate={() => duplicateProduct(index)}
                    onCopyPrevious={copyComplianceFromPrevious}
                    files={productFiles[field.id] || []}
                    fileError={productFileErrors[field.id]}
                    onFileAdd={(kind, file) => addProductFile(field.id, kind, file)}
                    onFileRemove={(fileId) => removeProductFile(field.id, fileId)}
                    filesDisabled={uploading || Boolean(result)}
                    hasError={validationIssues.some((issue) => issue.path[0] === 'products' && Number(issue.path[1]) === index)}
                  />
                ))}
                <SummaryTotals totals={estimatedTotals} />
              </section>
            )}

            {step === 2 && (
              <section data-section="intake-services" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                <h2 className="text-xl font-bold text-navy-900">Services required</h2>
                <p className="mt-2 text-sm text-slate-600">Select all services you would like our warehouse team to provide.</p>
                <div className="mt-5">
                  <MultiSelectCards
                    label="Choose at least one service"
                    options={INTAKE_SERVICES}
                    value={values.services || []}
                    onChange={(next) => setValue('services', next, { shouldDirty: true, shouldValidate: true })}
                    error={errors.services?.message}
                  />
                </div>
              </section>
            )}

            {step === 3 && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                  <h2 className="text-xl font-bold text-navy-900">Review your inventory</h2>
                  {validationIssues.length > 0 && (
                    <div
                      ref={validationSummaryRef}
                      tabIndex="-1"
                      className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                      role="alert"
                      aria-live="assertive"
                      aria-labelledby="intake-validation-heading"
                    >
                      <h3 id="intake-validation-heading" className="font-bold">Please fix these issues before submitting</h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {validationIssues.map((issue, index) => (
                          <li key={`${issue.path.join('.')}-${index}`}>
                            <a
                              href="#"
                              className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                              onClick={(event) => {
                                event.preventDefault()
                                focusFieldPath(issue.path.join('.'))
                              }}
                            >
                              {issue.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {values.products?.some(isProductReviewRequired) && (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
                      Some items need dangerous goods verification before they can be accepted.
                    </p>
                  )}
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-xs font-semibold uppercase text-slate-500">Contact person</dt><dd className="mt-1 text-sm text-navy-900">{values.customer?.contactPerson || '—'}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-slate-500">Business</dt><dd className="mt-1 text-sm text-navy-900">{values.customer?.businessName || '—'}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-slate-500">Phone</dt><dd className="mt-1 text-sm text-navy-900">{values.customer?.phone || '—'}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-slate-500">Email</dt><dd className="mt-1 break-all text-sm text-navy-900">{values.customer?.email || '—'}</dd></div>
                  </dl>
                  <div className="mt-5"><SummaryTotals totals={estimatedTotals} /></div>
                  <div className="mt-5 space-y-3">
                    {(values.products || []).map((product, index) => {
                      const totals = calculateProductTotals(product)
                      const hazmat = product.hazmat || EMPTY_PRODUCT.hazmat
                      const handling = product.handling || EMPTY_PRODUCT.handling
                      const amazon = product.amazon || EMPTY_PRODUCT.amazon
                      const uniform = product.uniform || {}
                      return (
                        <article key={`${product.sku || 'new'}-${index}`} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <h3 className="font-semibold text-navy-900">{product.productName || `Product ${index + 1}`} <span className="font-normal text-slate-600">· {product.sku || 'No SKU'}</span></h3>
                            <span className="text-xs text-slate-600">{getAdminLabel('packingMode', product.packingMode)}</span>
                          </div>
                          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            {[
                              ['Brand', product.brandName],
                              ['FNSKU', product.fnsku],
                              ['ASIN', product.asin],
                              ['Barcode', product.barcode],
                              ['Category', getIntakeCategoryLabel(product.category)],
                              ['Country of origin', product.countryOfOrigin],
                              ['Cartons', formatIntakeNumber(totals.cartons)],
                              ['Units', formatIntakeNumber(totals.units)],
                              ['Gross weight (kg)', formatIntakeNumber(totals.grossWeightKg)],
                              ['Volume (m³)', formatIntakeNumber(totals.volumeM3, 3)],
                            ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-words text-navy-900">{value || '—'}</dd></div>)}
                          </dl>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800">{getAdminLabel('intakeDeclaredStatus', hazmat.declaredStatus)}</span>
                            {(product.storage || []).map((storageItem) => <span key={storageItem} className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800">{getAdminLabel('intakeStorage', storageItem)}</span>)}
                          </div>
                          <p className="mt-2 text-xs text-slate-600">
                            {getAdminLabel('intakePhysicalState', handling.physicalState)} · Batteries: {getAdminLabel('intakeYesNo', handling.containsBatteries ? 'yes' : 'no')} · Leakage/damage risk: {getAdminLabel('intakeYesNo', handling.leakageOrDamageRisk)} · Expiry-dated: {getAdminLabel('intakeYesNo', handling.isExpiryDated ? 'yes' : 'no')}{handling.expiryDate ? ` (${handling.expiryDate.split('-').reverse().join('/')})` : ''}
                          </p>
                          {hazmat.hazardTypes?.length > 0 && <p className="mt-2 text-xs text-slate-600">Hazards: {hazmat.hazardTypes.map((hazard) => getAdminLabel('intakeHazardType', hazard)).join(', ')}</p>}
                          {amazon.sellsOnAmazon && (
                            <p className="mt-2 text-xs text-slate-600">
                              Amazon: {getAdminLabel('intakeAmazonChannel', amazon.fulfilmentChannel)} · {getAdminLabel('intakeAmazonListing', amazon.listingStatus)} · DG review: {getAdminLabel('intakeAmazonDgReview', amazon.dangerousGoodsReviewStatus)} · Documents: {getAdminLabel('intakeYesNo', amazon.complianceDocumentsAvailable)}
                            </p>
                          )}
                          {product.packingMode === 'uniform' ? (
                            <p className="mt-3 text-sm text-slate-700">{formatIntakeNumber(uniform.unitsPerCarton)} units/carton · {formatIntakeNumber(uniform.cartonWeightKg)} kg/carton · {formatIntakeNumber(uniform.cartonLengthCm)} × {formatIntakeNumber(uniform.cartonWidthCm)} × {formatIntakeNumber(uniform.cartonHeightCm)} cm</p>
                          ) : (
                            <div className="mt-4">
                              <h4 className="mb-2 text-sm font-semibold text-navy-900">Carton breakdown</h4>
                              <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full min-w-[560px] text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Box</th><th className="p-2">Units</th><th className="p-2">Weight (kg)</th><th className="p-2">L × W × H (cm)</th></tr></thead>
                                  <tbody className="divide-y divide-slate-100">{(product.boxes || []).map((box, boxIndex) => <tr key={boxIndex}><td className="p-2">{boxIndex + 1}</td><td className="p-2">{formatIntakeNumber(box.units)}</td><td className="p-2">{formatIntakeNumber(box.weightKg)}</td><td className="p-2">{[box.lengthCm, box.widthCm, box.heightCm].map((value) => formatIntakeNumber(value)).join(' × ')}</td></tr>)}</tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-navy-900">Selected services</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(values.services || []).map((service) => <span key={service} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-900">{getAdminLabel('intakeService', service)}</span>)}
                    </div>
                  </div>
                  <section className="mt-6 border-t border-slate-200 pt-5" aria-labelledby="submission-documents-heading">
                    <h3 id="submission-documents-heading" className="text-lg font-bold text-navy-900">Submission documents (optional)</h3>
                    <p className="mt-2 text-sm text-slate-600">These files are also kept in this tab only and are not included in saved drafts.</p>
                    {submissionFileError && <p className="mt-3 text-sm text-red-700" role="alert">{submissionFileError}</p>}
                    <div className="mt-4 space-y-5">
                      {SUBMISSION_UPLOADS.map(([kind, label]) => (
                        <FileDropzone
                          key={kind}
                          id={`intake-submission-upload-${kind}`}
                          label={label}
                          fileType="document"
                          files={submissionFiles.filter((entry) => entry.kind === kind)}
                          onAdd={(file) => addSubmissionFile(kind, file)}
                          onRemove={removeSubmissionFile}
                          disabled={uploading || Boolean(result)}
                        />
                      ))}
                    </div>
                  </section>
                  <Textarea id="intake-additionalInstructions" label="Additional instructions (optional)" maxLength={2000} error={errors.additionalInstructions?.message} className="mt-5" {...register('additionalInstructions')} />
                  <div className="mt-5">
                    <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-orange-500" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'intake-consent-error' : undefined} {...register('consent')} />
                      <span>I agree to be contacted about this inventory. See our <Link to="/privacy-policy" className="font-semibold text-navy-800 underline underline-offset-2">Privacy Policy</Link>.</span>
                    </label>
                    {errors.consent && <p id="intake-consent-error" className="mt-1 text-sm text-red-700" role="alert">{errors.consent.message}</p>}
                  </div>
                </section>
              </>
            )}

            {step === 3 && submitError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{submitError}</p>}
            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              {step > 0 ? <Button key="back" type="button" variant="outline" onClick={moveBack}>Back</Button> : <span key="back-placeholder" />}
              {step < 3
                ? <Button key="next" type="button" onClick={moveNext}>Continue</Button>
                : <Button key="submit" type="submit" disabled={submitting}>{submitting && <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{submitting ? 'Submitting...' : 'Submit inventory intake'}</Button>}
            </div>
          </form>
          <p className="mt-5 text-xs text-slate-500">All quantities and dimensions are estimates, confirmed by warehouse staff on receipt.</p>
        </div>
      </Container>
    </>
  )
}
