'use client'
import { useState } from 'react'
import PageHero from '@/components/PageHero'
import { submitPartnerInquiry } from '@/lib/api'

const ROLES = [
  { value: 'government', label: '🏛️ সরকারি সংস্থা' },
  { value: 'journalist', label: '📰 সাংবাদিক' },
  { value: 'researcher', label: '🔬 গবেষক' },
  { value: 'other', label: '✉️ অন্যান্য' },
]

export default function PartnerPage() {
  const [form, setForm] = useState({
    name: '', organization: '', role: 'government', email: '', phone: '', message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setError('')
    const res = await submitPartnerInquiry(form)
    if (res.success) {
      setStatus('sent')
    } else {
      setStatus('error')
      setError(res.error || 'পাঠানো যায়নি।')
    }
  }

  const inputStyle = 'w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-cyan-500/60 transition text-sm'

  return (
    <div>
      <PageHero
        icon="🤝"
        eyebrow="Partnerships & Outreach"
        title="যোগাযোগ করুন"
        lead="সরকারি সংস্থা, সাংবাদিক ও গবেষকদের জন্য — Eprohori-র সাথে কাজ করতে নিচের ফর্মটি পূরণ করুন।"
      />
      <div className="max-w-2xl mx-auto px-6 pb-20">
        {status === 'sent' ? (
          <div className="text-center p-10 rounded-2xl bg-green-500/10 border border-green-500/30">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-white mb-2">বার্তা পাঠানো হয়েছে!</h2>
            <p className="text-slate-300 text-sm">
              ধন্যবাদ। আমরা শীঘ্রই <span className="text-cyan-400">eprohori.tech@gmail.com</span> থেকে আপনার সাথে যোগাযোগ করব।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">নাম <span className="text-red-400">*</span></label>
                <input className={inputStyle} required value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="আপনার পূর্ণ নাম" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">প্রতিষ্ঠান</label>
                <input className={inputStyle} value={form.organization}
                  onChange={e => set('organization', e.target.value)} placeholder="সংস্থা / মিডিয়া / বিশ্ববিদ্যালয়" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">আপনি কে? <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROLES.map(r => (
                  <button type="button" key={r.value} onClick={() => set('role', r.value)}
                    className="px-3 py-2.5 rounded-xl text-xs font-medium border transition"
                    style={{
                      borderColor: form.role === r.value ? 'rgba(0,229,196,0.5)' : 'rgba(148,163,184,0.2)',
                      backgroundColor: form.role === r.value ? 'rgba(0,229,196,0.1)' : 'transparent',
                      color: form.role === r.value ? '#00e5c4' : '#94a3b8',
                    }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">ইমেইল <span className="text-red-400">*</span></label>
                <input className={inputStyle} type="email" required value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">ফোন</label>
                <input className={inputStyle} value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="+880…" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">বার্তা <span className="text-red-400">*</span></label>
              <textarea className={inputStyle} required rows={5} value={form.message}
                onChange={e => set('message', e.target.value)}
                placeholder="কীভাবে আমরা একসাথে কাজ করতে পারি তা সংক্ষেপে লিখুন…" />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>
            )}

            <button type="submit" disabled={status === 'sending'}
              className="w-full py-3.5 rounded-xl font-semibold transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#00e5c4,#0891b2)', color: '#04221c' }}>
              {status === 'sending' ? 'পাঠানো হচ্ছে…' : '✉️ বার্তা পাঠান'}
            </button>
            <p className="text-xs text-slate-500 text-center">
              অথবা সরাসরি মেইল করুন: <a href="mailto:eprohori.tech@gmail.com" className="text-cyan-400 hover:underline">eprohori.tech@gmail.com</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
