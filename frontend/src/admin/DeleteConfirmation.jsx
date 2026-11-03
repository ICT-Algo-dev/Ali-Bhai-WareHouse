import { useEffect, useRef } from 'react'

export default function DeleteConfirmation({
  onCancel,
  onConfirm,
  busy = false,
  itemName = 'inquiry',
  title = `Delete this ${itemName}?`,
  description = "This permanently erases this person's data.",
  confirmLabel = 'Delete permanently',
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled])')]
    focusable()[0]?.focus()

    function trapFocus(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!busy) onCancel()
        return
      }
      if (event.key !== 'Tab') return

      const buttons = focusable()
      if (buttons.length === 0) {
        event.preventDefault()
        return
      }
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', trapFocus)
    return () => {
      dialog.removeEventListener('keydown', trapFocus)
      previousFocus?.focus?.()
    }
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/60 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel()
    }}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
      >
        <h2 id="delete-dialog-title" className="text-xl font-bold text-navy-900">{title}</h2>
        <p id="delete-dialog-description" className="mt-3 text-sm leading-6 text-slate-600">
          {description}
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
