'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://eprohori-production.up.railway.app'

export default function BetaSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setStatus('loading')
    try {
      const r = await fetch(`${API}/api/beta-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Failed')
      setStatus('success')
      setMessage(data.message || 'ধন্যবাদ!')
      setEmail('')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'সমস্যা হয়েছে — আবার চেষ্টা করুন')
    }
  }

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,229,196,0.08) 0%, rgba(8,145,178,0.06) 100%)',
          border: '1px solid rgba(0,229,196,0.2)',
        }}>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00e5c4 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0891b2 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-6 tracking-wider"
            style={{ backgroundColor: 'rgba(0,229,196,0.15)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.3)' }}>
            🚀 BETA ACCESS • SEATS LIMITED
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 font-heading">
            Eprohori Beta-তে যোগ দিন
          </h2>
          <p className="text-slate-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            প্রথম ১০০০ beta user-রা পাবেন <span className="text-cyan-400 font-semibold">আজীবন ফ্রি premium features</span> + early access + community badge।
          </p>

          {status === 'success' ? (
            <div className="max-w-md mx-auto rounded-xl p-6 bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-emerald-300 font-medium">{message}</p>
              <p className="text-sm text-slate-400 mt-2">শীঘ্রই admin@eprohori.tech থেকে invitation email পাবেন।</p>
            </div>
          ) : (
            <form onSubmit={submit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={status === 'loading'}
                className="flex-1 px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-cyan-400 outline-none text-white placeholder-slate-500 transition"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-7 py-3.5 rounded-xl font-bold transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #00e5c4 0%, #0891b2 100%)', color: '#050810' }}
              >
                {status === 'loading' ? '...' : 'যোগ দিন →'}
              </button>
            </form>
          )}

          {status === 'error' && <p className="mt-4 text-red-400 text-sm">{message}</p>}

          <p className="mt-6 text-xs text-slate-500">
            ✓ No spam &nbsp;&nbsp;✓ Unsubscribe anytime &nbsp;&nbsp;✓ Bangladesh-first
          </p>
        </div>
      </div>
    </section>
  )
}
