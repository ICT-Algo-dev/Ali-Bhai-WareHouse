import { ADMIN_LABELS } from '../lib/constants'

export const INQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'closed']

export function humaniseLabel(value) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getAdminLabel(group, value) {
  if (value == null || value === '') return '—'
  const normalisedValue = String(value).trim().toLowerCase()
  return ADMIN_LABELS[group]?.[normalisedValue] ?? humaniseLabel(value)
}

export function getInquiryId(inquiry) {
  return inquiry.id ?? inquiry._id
}

export function getInquiryType(inquiry) {
  const value = String(inquiry.type ?? inquiry.inquiryType ?? '').toLowerCase()
  if (value === 'quote' || value === 'quotes' || inquiry.contactPerson || inquiry.businessType || inquiry.estimatedInventoryVolume) {
    return 'quote'
  }
  return 'contact'
}

export function getInquiryName(inquiry) {
  return inquiry.fullName ?? inquiry.contactPerson ?? inquiry.name ?? inquiry.businessName ?? '—'
}

export function getInquiryDate(inquiry) {
  return inquiry.createdAt ?? inquiry.created_at ?? inquiry.submittedAt ?? inquiry.submitted_at ?? inquiry.date ?? null
}

export function formatUKDateTime(value, includeTime = true) {
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

export function isNewThisWeek(value, now = new Date()) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const datePart = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  const localDate = new Date(Date.UTC(Number(datePart.year), Number(datePart.month) - 1, Number(datePart.day)))

  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const nowPart = Object.fromEntries(nowParts.map(({ type, value: partValue }) => [type, partValue]))
  const localToday = new Date(Date.UTC(Number(nowPart.year), Number(nowPart.month) - 1, Number(nowPart.day)))
  const daysSinceMonday = (localToday.getUTCDay() + 6) % 7
  const monday = new Date(localToday)
  monday.setUTCDate(localToday.getUTCDate() - daysSinceMonday)

  return localDate >= monday && localDate <= localToday
}

export function getInquiryServices(inquiry) {
  return getInquiryServiceLabels(inquiry).join(', ') || '—'
}

export function getInquiryServiceLabels(inquiry) {
  const services = inquiry.requiredServices ?? inquiry.services ?? []
  const values = Array.isArray(services) ? services : String(services).split(',')
  return values.map((value) => getAdminLabel('requiredServices', value)).filter((value) => value !== '—')
}

export function getInquiryStatus(inquiry) {
  const status = String(inquiry.status ?? 'new').toLowerCase()
  return INQUIRY_STATUSES.includes(status) ? status : 'new'
}

function isTechnicalField(key) {
  const normalisedKey = key.replace(/[^a-z]/gi, '').toLowerCase()
  return /^(ip|ipaddress|clientip|clientipaddress|remoteip|remoteipaddress|requestip|requestipaddress|useragent)$/.test(normalisedKey)
}

export function buildInquiryCsv(inquiries) {
  const columns = [
    ['Date/time', (item) => formatUKDateTime(getInquiryDate(item))],
    ['Type', (item) => getAdminLabel('type', getInquiryType(item))],
    ['Name or business', getInquiryName],
    ['Business name', (item) => item.businessName ?? ''],
    ['Phone', (item) => item.phone ?? item.phoneNumber ?? ''],
    ['Email', (item) => item.email ?? ''],
    ['Services', getInquiryServices],
    ['Business type', (item) => item.businessType ? getAdminLabel('businessType', item.businessType) : ''],
    ['Estimated inventory volume', (item) => item.estimatedInventoryVolume ? getAdminLabel('estimatedInventoryVolume', item.estimatedInventoryVolume) : ''],
    ['Estimated monthly orders', (item) => {
      const value = item.estimatedMonthlyOrders ?? item.monthlyOrderVolume
      return value ? getAdminLabel(item.estimatedMonthlyOrders != null ? 'estimatedMonthlyOrders' : 'monthlyOrderVolume', value) : ''
    }],
    ['Status', (item) => getAdminLabel('status', getInquiryStatus(item))],
  ]
  const escapeCsv = (value) => {
    const text = String(value ?? '')
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }
  const rows = [columns.map(([label]) => escapeCsv(label)).join(',')]
  for (const inquiry of inquiries) {
    rows.push(columns.map(([, getValue]) => escapeCsv(getValue(inquiry))).join(','))
  }
  return `\uFEFF${rows.join('\r\n')}`
}

export function getInquiryEntries(inquiry) {
  const hiddenKeys = new Set(['id', '_id', '__v'])

  return Object.entries(inquiry)
    .filter(([key]) => !hiddenKeys.has(key) && !isTechnicalField(key) && key !== 'requiredServices' && key !== 'services')
    .map(([key, value]) => {
      const label = ['consentAt', 'consentedAt', 'consent_at', 'consented_at', 'consentTimestamp', 'consent_timestamp'].includes(key)
        ? 'Consent at'
        : humaniseLabel(key)
      if (value == null || value === '') return [label, '—']
      if (['type', 'inquiryType'].includes(key)) return [label, getAdminLabel('type', getInquiryType(inquiry))]
      if (key === 'status') return [label, getAdminLabel('status', value)]
      if (['estimatedInventoryVolume', 'monthlyOrderVolume', 'estimatedMonthlyOrders', 'businessType'].includes(key)) {
        return [label, getAdminLabel(key, value)]
      }
      if (Array.isArray(value)) return [label, value.join(', ') || '—']
      if (typeof value === 'boolean') return [label, value ? 'Yes' : 'No']
      if (/(created|submitted|consent|timestamp|date|updated)/i.test(key) && (typeof value === 'string' || typeof value === 'number')) {
        return [label, formatUKDateTime(value)]
      }
      if (typeof value === 'object') return [label, JSON.stringify(value)]
      return [label, String(value)]
    })
}

export function getTechnicalEntries(inquiry) {
  return Object.entries(inquiry)
    .filter(([key]) => isTechnicalField(key))
    .map(([key, value]) => [humaniseLabel(key), value == null || value === '' ? '—' : String(value)])
}
