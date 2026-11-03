import { useState } from 'react'
import { Download, Eye, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { getAdminLabel } from './adminUtils'
import { formatIntakeDate, formatIntakeNumber } from './intakeUtils'

function getFileId(file) {
  return file.id ?? file._id ?? file.fileId
}

function getFileName(file) {
  const rawName = file.originalName ?? file.originalFilename ?? file.filename ?? file.name ?? 'Uploaded file'
  return String(rawName).split(/[\\/]/).pop() || 'Uploaded file'
}

function formatBytes(bytes) {
  if (bytes == null || !Number.isFinite(Number(bytes))) return 'Size unavailable'
  const size = Number(bytes)
  return size < 1024 * 1024
    ? `${formatIntakeNumber(size / 1024, 0)} KB`
    : `${formatIntakeNumber(size / (1024 * 1024), 2)} MB`
}

function AdminFileItem({ file, onView, onDownload, onDelete }) {
  const [busyAction, setBusyAction] = useState('')
  const name = getFileName(file)

  async function run(action, callback) {
    setBusyAction(action)
    try {
      await callback(file)
    } finally {
      setBusyAction('')
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-all text-sm font-semibold text-navy-900">{name}</p>
        <p className="mt-1 text-xs text-slate-600">{formatBytes(file.size ?? file.sizeBytes)} · Uploaded {formatIntakeDate(file.uploadedAt ?? file.createdAt ?? file.created_at)}</p>
        {file.status && <p className="mt-1 text-xs font-medium text-slate-600">{getAdminLabel('intakeFileStatus', file.status)}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-10 px-3 py-2" disabled={Boolean(busyAction)} onClick={() => run('view', onView)}><Eye size={15} aria-hidden="true" /> View</Button>
        <Button type="button" variant="outline" className="min-h-10 px-3 py-2" disabled={Boolean(busyAction)} onClick={() => run('download', onDownload)}><Download size={15} aria-hidden="true" /> Download</Button>
        <Button type="button" variant="outline" className="min-h-10 px-3 py-2 text-red-700" disabled={Boolean(busyAction)} onClick={() => onDelete(file)}><Trash2 size={15} aria-hidden="true" /> Delete</Button>
      </div>
      {busyAction && <span className="sr-only" role="status">{busyAction === 'view' ? 'Opening file…' : 'Downloading file…'}</span>}
    </li>
  )
}

export default function IntakeFilesPanel({ title, files = [], requiredKinds = [], recommendedKinds = [], onView, onDownload, onDelete }) {
  const grouped = files.reduce((result, file) => {
    const kind = file.kind ?? file.type ?? 'other-document'
    result[kind] = [...(result[kind] || []), file]
    return result
  }, {})
  const kinds = [...new Set([...Object.keys(grouped), ...requiredKinds, ...recommendedKinds])]

  return (
    <section className="mt-5 rounded-xl border border-slate-200 p-4" aria-label={title}>
      <h4 className="font-semibold text-navy-900">{title}</h4>
      {kinds.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No files uploaded.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {kinds.map((kind) => {
            const kindFiles = grouped[kind] || []
            const requiredMissing = requiredKinds.includes(kind) && kindFiles.length === 0
            const recommendedMissing = recommendedKinds.includes(kind) && kindFiles.length === 0
            return (
              <section key={kind} aria-label={getAdminLabel('intakeFileKind', kind)}>
                <h5 className="text-sm font-semibold text-navy-900">{getAdminLabel('intakeFileKind', kind)}</h5>
                {requiredMissing && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="status">Required file missing.</p>}
                {recommendedMissing && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">Recommended file missing.</p>}
                {kindFiles.length > 0 && <ul className="mt-2 space-y-2">{kindFiles.map((file, index) => <AdminFileItem key={getFileId(file) ?? `${kind}-${index}`} file={file} onView={onView} onDownload={onDownload} onDelete={onDelete} />)}</ul>}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
