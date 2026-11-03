import { getAdminLabel } from './adminUtils'

export const INTAKE_STATUSES = ['submitted', 'under-review', 'received', 'closed']

export function getIntakeId(intake) {
  return intake.id ?? intake._id ?? intake.reference
}

export function getIntakeReference(intake) {
  return intake.reference ?? intake.referenceNumber ?? intake.id ?? intake._id ?? '—'
}

export function getIntakeDate(intake) {
  return intake.createdAt ?? intake.created_at ?? intake.submittedAt ?? intake.submitted_at ?? null
}

export function getIntakeStatus(intake) {
  const status = String(intake.status ?? '').toLowerCase()
  return INTAKE_STATUSES.includes(status) ? status : 'submitted'
}

export function getIntakeProducts(intake) {
  return Array.isArray(intake.products) ? intake.products : intake.items ?? []
}

export function getIntakeProductTotals(product) {
  const boxes = Array.isArray(product.boxes) ? product.boxes : []
  const uniform = product.uniform ?? product
  const cartons = Number(product.cartons ?? product.cartonCount ?? uniform.cartons ?? boxes.length) || 0
  const units = Number(product.totalUnits ?? product.units) || (
    product.packingMode === 'uniform'
      ? cartons * (Number(uniform.unitsPerCarton) || 0)
      : boxes.reduce((sum, box) => sum + (Number(box.units) || 0), 0)
  )
  const grossWeightKg = Number(product.grossWeightKg ?? product.grossWeight) || (
    product.packingMode === 'uniform'
      ? cartons * (Number(uniform.cartonWeightKg) || 0)
      : boxes.reduce((sum, box) => sum + (Number(box.weightKg ?? box.cartonWeightKg) || 0), 0)
  )
  const volumeM3 = Number(product.volumeM3 ?? product.volume) || (
    product.packingMode === 'uniform'
      ? cartons * (Number(uniform.cartonLengthCm ?? uniform.lengthCm) || 0) * (Number(uniform.cartonWidthCm ?? uniform.widthCm) || 0) * (Number(uniform.cartonHeightCm ?? uniform.heightCm) || 0) / 1_000_000
      : boxes.reduce((sum, box) => sum + (Number(box.lengthCm ?? box.length) || 0) * (Number(box.widthCm ?? box.width) || 0) * (Number(box.heightCm ?? box.height) || 0) / 1_000_000, 0)
  )
  return { cartons, units, grossWeightKg, volumeM3 }
}

export function getIntakeTotals(intake) {
  const totals = intake.totals ?? intake.summary ?? intake
  const products = getIntakeProducts(intake)
  return {
    skus: Number(totals.skus ?? totals.skuCount ?? products.length),
    cartons: Number(totals.cartons ?? totals.cartonCount ?? products.reduce((sum, product) => sum + getIntakeProductTotals(product).cartons, 0)),
    units: Number(totals.units ?? totals.totalUnits ?? products.reduce((sum, product) => sum + getIntakeProductTotals(product).units, 0)),
    grossWeightKg: Number(totals.grossWeightKg ?? totals.grossWeight ?? products.reduce((sum, product) => sum + getIntakeProductTotals(product).grossWeightKg, 0)),
    volumeM3: Number(totals.volumeM3 ?? totals.volume ?? products.reduce((sum, product) => sum + getIntakeProductTotals(product).volumeM3, 0)),
  }
}

export function getIntakeStatusLabel(status) {
  return getAdminLabel('intakeStatus', status)
}

export function getIntakeCategoryLabel(category) {
  return getAdminLabel('intakeCategory', category)
}

export function formatIntakeNumber(value, maximumFractionDigits = 2) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits }).format(Number(value))
}

export function formatIntakeDate(value, includeTime = true) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}),
  }).format(date)
}

export function parseIntakePage(response, requestedPage = 1, requestedLimit = 20) {
  const root = response?.data ?? response
  const payload = root?.data ?? root
  const intakes = Array.isArray(payload)
    ? payload
    : payload?.intakes ?? payload?.items ?? payload?.results ?? root?.intakes ?? root?.items ?? []
  const metadata = payload?.pagination ?? payload?.meta ?? root?.pagination ?? root?.meta ?? {}
  const totalValue = metadata.total ?? metadata.totalItems ?? metadata.totalCount ?? root?.total
  const total = Number(totalValue ?? intakes.length)
  const page = Number(metadata.page ?? metadata.currentPage ?? requestedPage)
  const limit = Number(metadata.limit ?? metadata.perPage ?? requestedLimit)
  const totalPagesValue = metadata.totalPages ?? metadata.pages
  const hasMore = totalPagesValue != null
    ? page < Number(totalPagesValue)
    : totalValue != null
      ? page * limit < total
      : intakes.length >= requestedLimit
  const totalPages = Number(totalPagesValue ?? (
    totalValue != null
      ? Math.ceil(total / Math.max(limit, 1))
      : page + Number(hasMore)
  ))
  return {
    intakes: Array.isArray(intakes) ? intakes : [],
    total: Number.isFinite(total) ? total : intakes.length,
    page: Number.isFinite(page) ? page : requestedPage,
    totalPages: Number.isFinite(totalPages) ? totalPages : 1,
    hasMore,
  }
}

export function getIntakeTechnicalEntries(intake) {
  return Object.entries(intake)
    .filter(([key]) => /^(ip|ipAddress|ip_address|userAgent|user_agent)$/i.test(key))
    .map(([key, value]) => [key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' '), value ?? '—'])
}
