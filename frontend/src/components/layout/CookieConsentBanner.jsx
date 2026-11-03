import { useState } from 'react'
import { Link } from 'react-router-dom'

const CONSENT_STORAGE_KEY = 'warehouse-cookie-consent'

export default function CookieConsentBanner() {
  const [choice, setChoice] = useState(() => window.localStorage.getItem(CONSENT_STORAGE_KEY))

  function chooseCookies(value) {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
    setChoice(value)
  }

  if (choice) return null

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-5 shadow-soft sm:p-6" aria-label="Cookie preferences">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-sm font-bold text-navy-900">Your privacy matters</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            We use essential storage to remember your choice. No analytics or non-essential cookies are loaded. Read our <Link className="font-semibold text-navy-800 underline underline-offset-2" to="/cookie-policy">Cookie Policy</Link>.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => chooseCookies('rejected')} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50">
            Reject optional cookies
          </button>
          <button type="button" onClick={() => chooseCookies('accepted')} className="min-h-11 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
            Accept optional cookies
          </button>
        </div>
      </div>
    </aside>
  )
}