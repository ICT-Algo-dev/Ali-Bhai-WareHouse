import axios from 'axios'

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  return `${configuredBaseUrl.replace(/\/+$/, '')}/api/v1`
}

function createApiClient(config = {}) {
  return axios.create({ baseURL: getApiBaseUrl(), ...config })
}

const publicApi = createApiClient({ timeout: 15000 })
const uploadApi = createApiClient({ timeout: 0 })

export const api = createApiClient({
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

const ADMIN_TOKEN_KEY = 'warehouse_admin_token'
let adminToken = null
let onSessionExpired = null

export function hydrateAdminToken() {
  adminToken = window.sessionStorage.getItem(ADMIN_TOKEN_KEY)
  return adminToken
}

export function setAdminToken(token) {
  adminToken = token
  if (token) {
    window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  } else {
    window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  }
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

api.interceptors.request.use((config) => {
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && adminToken) {
      setAdminToken(null)
      onSessionExpired?.()
    }
    return Promise.reject(error)
  },
)

export async function submitContact(payload) {
  const { data } = await api.post('/contact', payload)
  return data
}

export async function submitQuote(payload) {
  const { data } = await api.post('/quotes', payload)
  return data
}

export async function submitIntake(payload) {
  const { data } = await api.post('/intakes', payload)
  return data
}

export async function uploadIntakeFile(reference, token, { kind, sku, file, onUploadProgress, signal }) {
  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('sku', sku || '')
  formData.append('file', file)
  const { data } = await uploadApi.post(`/intakes/${encodeURIComponent(reference)}/files`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
    signal,
  })
  return data
}

export async function getAdminIntakes(params, signal) {
  const queryParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => (
      value != null && (typeof value !== 'string' || value.trim() !== '')
    )),
  )
  const { data } = await api.get('/admin/intakes', { params: queryParams, signal })
  return data
}

export async function getAdminIntake(id, signal) {
  const { data } = await api.get(`/admin/intakes/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function updateIntakeStatus(id, status) {
  const { data } = await api.patch(`/admin/intakes/${encodeURIComponent(id)}/status`, { status })
  return data
}

export async function updateIntakeProductVerification(intakeId, productId, verification) {
  const { data } = await api.patch(
    `/admin/intakes/${encodeURIComponent(intakeId)}/products/${encodeURIComponent(productId)}/verification`,
    verification,
  )
  return data
}

export async function deleteIntake(id) {
  const { data } = await api.delete(`/admin/intakes/${encodeURIComponent(id)}`)
  return data
}

export async function downloadIntakePdf(reference, token) {
  const { data } = await publicApi.get(`/intakes/${encodeURIComponent(reference)}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    responseType: 'blob',
  })
  return data
}

export async function downloadAdminIntakePdf(id) {
  const { data } = await api.get(`/admin/intakes/${encodeURIComponent(id)}/pdf`, { responseType: 'blob' })
  return data
}

export async function downloadAdminIntakeFile(intakeId, fileId) {
  return api.get(`/admin/intakes/${encodeURIComponent(intakeId)}/files/${encodeURIComponent(fileId)}`, {
    responseType: 'blob',
  })
}

export async function downloadAdminIntakeFilesZip(intakeId, onDownloadProgress) {
  const { data } = await api.get(`/admin/intakes/${encodeURIComponent(intakeId)}/files.zip`, {
    responseType: 'blob',
    onDownloadProgress,
  })
  return data
}

export async function deleteAdminIntakeFile(intakeId, fileId) {
  const { data } = await api.delete(`/admin/intakes/${encodeURIComponent(intakeId)}/files/${encodeURIComponent(fileId)}`)
  return data
}

export async function adminLogin(payload) {
  const { data } = await api.post('/admin/login', payload)
  return data
}

export async function getAdminInquiries(params, signal) {
  const queryParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => (
      value != null && (typeof value !== 'string' || value.trim() !== '')
    )),
  )
  const { data } = await api.get('/admin/inquiries', { params: queryParams, signal })
  return data
}

export async function updateInquiryStatus(id, status) {
  const { data } = await api.patch(`/admin/inquiries/${encodeURIComponent(id)}/status`, { status })
  return data
}

export async function deleteInquiry(id) {
  const { data } = await api.delete(`/admin/inquiries/${encodeURIComponent(id)}`)
  return data
}

export function parseInquiryPage(response, requestedPage = 1, requestedLimit = 20) {
  const root = response?.data ?? response
  const payload = root?.data ?? root
  const inquiries = Array.isArray(payload)
    ? payload
    : payload?.inquiries ?? payload?.items ?? payload?.results ?? root?.inquiries ?? root?.items ?? []
  const metadata = payload?.pagination ?? payload?.meta ?? root?.pagination ?? root?.meta ?? {}
  const totalValue = metadata.total ?? metadata.totalItems ?? metadata.totalCount ?? root?.total
  const total = Number(totalValue ?? inquiries.length)
  const page = Number(metadata.page ?? metadata.currentPage ?? requestedPage)
  const limit = Number(metadata.limit ?? metadata.perPage ?? requestedLimit)
  const totalPagesValue = metadata.totalPages ?? metadata.pages
  const totalPages = Number(totalPagesValue ?? Math.ceil(total / Math.max(limit, 1)))
  const hasMore = totalPagesValue != null
    ? page < totalPages
    : totalValue != null
      ? page * limit < total
      : inquiries.length >= requestedLimit

  return {
    inquiries: Array.isArray(inquiries) ? inquiries : [],
    total: Number.isFinite(total) ? total : inquiries.length,
    page: Number.isFinite(page) ? page : requestedPage,
    limit: Number.isFinite(limit) && limit > 0 ? limit : requestedLimit,
    totalPages: Number.isFinite(totalPages) ? totalPages : 1,
    hasMore,
    hasTotal: totalValue != null && Number.isFinite(total),
  }
}

export async function getAllAdminInquiries(params = {}, signal) {
  const limit = 100
  const inquiries = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await getAdminInquiries({ ...params, page, limit }, signal)
    const result = parseInquiryPage(response, page, limit)
    inquiries.push(...result.inquiries)
    hasMore = result.hasMore && result.inquiries.length > 0
    page += 1
  }

  return inquiries
}

export function getSubmissionError(error) {
  if (error.response?.status === 429) {
    return 'We have received several requests recently. Please wait a moment and try again.'
  }

  if (!error.response) {
    return 'We could not connect right now. Please check your connection and try again.'
  }

  return error.response.data?.message || 'Something went wrong while sending your request. Please try again.'
}

export function applyServerFieldErrors(error, setError, allowedFields) {
  const errors = error.response?.data?.errors || error?.errors
  if (!Array.isArray(errors)) return false

  let mapped = false
  for (const item of errors) {
    if (item?.field && allowedFields.includes(item.field)) {
      setError(item.field, { type: 'server', message: item.message || 'Please check this field.' })
      mapped = true
    }
  }
  return mapped
}
