import { useId, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

const FILE_LIMIT = 10 * 1024 * 1024

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function isAllowedFile(file, fileType) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (fileType === 'pdf') return extension === 'pdf' && file.type === 'application/pdf'
  if (extension === 'pdf') return file.type === 'application/pdf'
  if (['jpg', 'jpeg'].includes(extension)) return file.type === 'image/jpeg'
  if (extension === 'png') return file.type === 'image/png'
  return false
}

export default function FileDropzone({
  id,
  label,
  helpText,
  files = [],
  onAdd,
  onRemove,
  fileType = 'pdf',
  multiple = true,
  disabled = false,
}) {
  const generatedId = useId()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const inputId = id || `file-dropzone-${generatedId}`
  const accept = fileType === 'pdf' ? '.pdf,application/pdf' : '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

  function addFiles(fileList) {
    const candidates = Array.from(fileList || [])
    if (!candidates.length) return
    let added = 0
    const messages = []
    for (const file of candidates) {
      if (!isAllowedFile(file, fileType)) {
        messages.push(`${file.name}: choose a ${fileType === 'pdf' ? 'PDF' : 'PDF, JPG or PNG'} file with a matching file type.`)
        continue
      }
      if (file.size > FILE_LIMIT) {
        messages.push(`${file.name}: files must be 10 MB or smaller.`)
        continue
      }
      const addResult = onAdd(file)
      if (addResult === true) {
        added += 1
      } else {
        messages.push(typeof addResult === 'string' ? addResult : `${file.name}: the upload limit has been reached.`)
      }
    }
    if (added && messages.length === 0) setAnnouncement(`${added} ${added === 1 ? 'file' : 'files'} added.`)
    else if (added) setAnnouncement(`${added} ${added === 1 ? 'file' : 'files'} added. ${messages.join(' ')}`)
    else setAnnouncement(messages.join(' '))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-navy-900">{label}</label>
      {helpText && <p className="text-xs leading-5 text-slate-600">{helpText}</p>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) addFiles(event.dataTransfer.files) }}
        className={`flex min-h-24 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-60 ${dragging ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-navy-400'}`}
        aria-describedby={`${inputId}-help ${inputId}-status`}
      >
        <Upload size={19} aria-hidden="true" />
        <span className="mt-2 font-semibold">{dragging ? 'Drop files here' : 'Choose files or drag them here'}</span>
        <span className="mt-1 text-xs text-slate-600">{fileType === 'pdf' ? 'PDF only · Up to 10 MB per file' : 'PDF, JPG or PNG · Up to 10 MB per file'}</span>
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
        onChange={(event) => addFiles(event.target.files)}
      />
      <p id={`${inputId}-help`} className="sr-only">Use the button to choose files or drag files onto it.</p>
      <ul className="space-y-2" aria-label={`${label} selected files`}>
        {files.map((entry) => (
          <li key={entry.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block break-all font-medium text-navy-900">{entry.file.name}</span>
              <span className="text-xs text-slate-500">{formatFileSize(entry.file.size)}</span>
            </span>
            <button type="button" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500" aria-label={`Remove ${entry.file.name}`} disabled={disabled} onClick={() => { onRemove(entry.id); setAnnouncement(`${entry.file.name} removed.`) }}>
              <X size={16} aria-hidden="true" /> Remove
            </button>
          </li>
        ))}
      </ul>
      <p id={`${inputId}-status`} className="text-xs text-slate-600" aria-live="polite">{announcement}</p>
    </div>
  )
}
