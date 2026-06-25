'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://eprohori-production.up.railway.app'

/**
 * "Did EProhori save you from a scam?" — the pilot's core impact metric.
 * Lightweight, public (no login), one tap. Shows a thank-you after responding.
 */
export default function SavedFeedback({ source = 'app' }: { source?: string }) {
  const [done, setDone] = useState(false)

  const send = async (saved: boolean) => {
    setDone(true) // optimistic — never block the user
    try {
      await fetch(`${API}/api/feedback/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved, source }),
      })
    } catch { /* best-effort; UI already thanked them */ }
  }

  if (done) {
    return (
      <div className="rounded-xl p-4 text-center text-sm"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
        🙏 ধন্যবাদ! আপনার মতামত EProhori-কে আরও ভালো করতে সাহায্য করবে।
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(0,229,196,0.05)', border: '1px solid rgba(0,229,196,0.2)' }}>
      <p className="text-sm text-slate-200 mb-3 text-center font-medium">
        এই তথ্য আপনার কোনো উপকারে এসেছে?
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => send(true)}
          className="px-5 py-2 rounded-lg text-sm font-bold transition hover:brightness-110"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }}
        >
          ✅ হ্যাঁ
        </button>
        <button
          onClick={() => send(false)}
          className="px-5 py-2 rounded-lg text-sm font-bold transition hover:brightness-110"
          style={{ background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}
        >
          না
        </button>
      </div>
    </div>
  )
}
