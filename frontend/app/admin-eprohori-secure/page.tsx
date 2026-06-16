'use client'
import { useEffect, useState } from 'react'
import { fetchThreats, fetchStats, verifyThreatWithAlerts, rejectThreat, broadcastAlert, adminLogin, fetchAuditLog, getAdminToken, setAdminToken } from '@/lib/api'
import type { Threat, Stats, AuditEntry } from '@/lib/api'

export default function AdminPage() {
  const [loginEmail, setLoginEmail] = useState('')
  const [input, setInput] = useState('')
  const [authed, setAuthed] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [error, setError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('ভুল তথ্য — আবার চেষ্টা করুন')
  const [loggingIn, setLoggingIn] = useState(false)
  const [audit, setAudit] = useState<AuditEntry[]>([])

  const [threats, setThreats] = useState<Threat[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const [broadcast, setBroadcast] = useState({ title: '', message: '', severity: 'high' })
  const [sent, setSent] = useState(false)

  const [approved, setApproved] = useState<number[]>([])
  const [rejected, setRejected] = useState<number[]>([])
  const [actionError, setActionError] = useState<string | null>(null)

  // Restore admin session within this browser tab (JWT survives reloads)
  useEffect(() => {
    if (getAdminToken()) setAuthed(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    Promise.all([
      fetchThreats({ status: 'pending', limit: 50 }),
      fetchStats(),
    ]).then(([t, s]) => {
      setThreats(t)
      setStats(s)
      setLoading(false)
    })
    fetchAuditLog().then(setAudit)
  }, [authed])

  const handleApprove = async (id: number) => {
    try {
      const res = await verifyThreatWithAlerts(id)
      setApproved(a => [...a, id])
      setActionError(res.emails_sent
        ? `✅ Verified — district alert emails dispatched (${res.severity})`
        : `✅ Verified — no alert emails (confidence below 70%)`
      )
      setTimeout(() => setActionError(null), 4000)
      fetchAuditLog().then(setAudit) // refresh audit row
    } catch {
      setActionError('অনুমোদন ব্যর্থ হয়েছে — আবার চেষ্টা করুন')
      setTimeout(() => setActionError(null), 3000)
    }
  }

  const handleReject = async (id: number) => {
    try {
      await rejectThreat(id)
      setRejected(r => [...r, id])
    } catch {
      setActionError('প্রত্যাখ্যান ব্যর্থ হয়েছে — আবার চেষ্টা করুন')
      setTimeout(() => setActionError(null), 3000)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcast.title || !broadcast.message) return
    try {
      await broadcastAlert(broadcast)
      setSent(true)
    } catch {
      setActionError('সতর্কতা প্রকাশে ব্যর্থ — সার্ভার সংযোগ নেই')
      setTimeout(() => setActionError(null), 4000)
    }
  }

  const handleLogin = async () => {
    setError(false)
    setLoggingIn(true)
    try {
      // Server-side verification against the admin account — issues a 1h JWT
      const admin = await adminLogin(loginEmail.trim(), input)
      setAdminName(admin.name)
      setAuthed(true)
    } catch (e) {
      setErrorMsg(
        e instanceof Error && /invalid/i.test(e.message)
          ? 'ভুল ইমেইল বা পাসওয়ার্ড'
          : e instanceof Error && /admin access/i.test(e.message)
          ? 'এই অ্যাকাউন্টের admin অনুমতি নেই'
          : 'সার্ভার সংযোগ নেই — backend চালু করুন'
      )
      setError(true)
    }
    setLoggingIn(false)
  }

  const handleAdminLogout = () => {
    setAdminToken(null)
    setAuthed(false)
    setInput('')
    setLoginEmail('')
  }

  const pending = threats.filter(t => !approved.includes(t.id) && !rejected.includes(t.id))

  if (!authed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-4xl">🔒</span>
            <h1 className="font-heading text-xl font-bold mt-3" style={{ color: '#ff6666' }}>
              ADMIN PANEL — Restricted Access
            </h1>
            <p className="text-slate-400 text-sm mt-1">শুধুমাত্র অনুমোদিত ব্যবহারকারীর জন্য</p>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-sm font-semibold text-slate-300 mb-2">অ্যাডমিন ইমেইল</label>
            <input
              type="email"
              value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="admin@eprohori.bd"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none mb-4"
              style={{
                backgroundColor: '#060d1a',
                border: `1px solid ${error ? '#ff4444' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
            <label className="block text-sm font-semibold text-slate-300 mb-2">পাসওয়ার্ড</label>
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="পাসওয়ার্ড দিন..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none mb-4"
              style={{
                backgroundColor: '#060d1a',
                border: `1px solid ${error ? '#ff4444' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
            {error && <p className="text-xs mb-3" style={{ color: '#ff4444' }}>{errorMsg}</p>}
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="w-full py-3 rounded-xl font-heading font-bold"
              style={{ backgroundColor: '#00e5c4', color: '#060d1a', opacity: loggingIn ? 0.6 : 1 }}
            >
              {loggingIn ? 'যাচাই হচ্ছে...' : 'প্রবেশ করুন'}
            </button>
            <p className="text-xs text-slate-600 text-center mt-3">🔐 Server-verified · 1h JWT session · auto-logout</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" style={{ borderTop: '3px solid #ff4444' }}>
      <div
        className="rounded-xl px-4 py-2.5 mb-6 text-center text-sm font-bold"
        style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.35)', color: '#ff6666' }}
      >
        🔒 ADMIN PANEL — Restricted Access
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {adminName ? <>👤 {adminName} · </> : null}Eprohori নিয়ন্ত্রণ কেন্দ্র
          </p>
        </div>
        <button
          onClick={handleAdminLogout}
          className="text-sm px-4 py-2 rounded-full text-slate-400 hover:text-white"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          লগআউট
        </button>
      </div>

      {/* API error banner */}
      {actionError && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444' }}>
          ⚠️ {actionError}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'আজকের রিপোর্ট', value: stats.today_reports, color: '#00e5c4' },
            { label: 'সক্রিয় হুমকি', value: stats.active_threats, color: '#ff4444' },
            { label: 'পেন্ডিং রিভিউ', value: pending.length, color: '#f59e0b' },
            { label: 'অনুমোদিত', value: approved.length, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="font-heading text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending threats */}
        <div>
          <h2 className="font-heading text-xl font-bold text-white mb-4">⏳ পেন্ডিং রিভিউ</h2>
          {loading ? (
            <div className="text-slate-400 text-sm">লোড হচ্ছে...</div>
          ) : pending.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-slate-400 text-sm">কোনো পেন্ডিং রিপোর্ট নেই।</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(t => {
                const willAlert = t.confidence >= 70
                return (
                <div key={t.id} className="rounded-xl p-4" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-sm text-white font-medium mb-1">{t.detail}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                    <span>{t.type}</span>
                    <span>📍 {t.division}</span>
                    <span>AI: {t.confidence}%</span>
                  </div>
                  <div
                    className="inline-block text-xs px-2.5 py-1 rounded-full font-semibold mb-3"
                    style={{
                      backgroundColor: willAlert ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.1)',
                      color: willAlert ? '#f59e0b' : '#94a3b8',
                      border: `1px solid ${willAlert ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.2)'}`,
                    }}
                  >
                    {willAlert
                      ? '📧 Verification will alert district users'
                      : '📋 Internal verification only (no emails)'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(t.id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      ✓ অনুমোদন
                    </button>
                    <button
                      onClick={() => handleReject(t.id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)' }}
                    >
                      ✕ প্রত্যাখ্যান
                    </button>
                  </div>
                </div>
                  )
              })}
            </div>
          )}
        </div>

        {/* Broadcast */}
        <div>
          <h2 className="font-heading text-xl font-bold text-white mb-4">📢 সতর্কতা প্রচার</h2>
          <div className="rounded-xl p-5" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}>
            {sent ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-bold text-white">সতর্কতা প্রকাশিত!</p>
                <button
                  onClick={() => { setSent(false); setBroadcast({ title: '', message: '', severity: 'high' }) }}
                  className="mt-4 text-sm px-4 py-2 rounded-full"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                >
                  আবার পাঠান
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">শিরোনাম</label>
                    <input
                      value={broadcast.title}
                      onChange={e => setBroadcast(b => ({ ...b, title: e.target.value }))}
                      placeholder="সতর্কতার শিরোনাম..."
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: '#060d1a', border: '1px solid rgba(255,255,255,0.07)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">বার্তা</label>
                    <textarea
                      value={broadcast.message}
                      onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
                      rows={4}
                      placeholder="সতর্কতার বিবরণ..."
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none resize-none"
                      style={{ backgroundColor: '#060d1a', border: '1px solid rgba(255,255,255,0.07)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">তীব্রতা</label>
                    <select
                      value={broadcast.severity}
                      onChange={e => setBroadcast(b => ({ ...b, severity: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: '#060d1a', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <option value="critical">🚨 জরুরি</option>
                      <option value="high">⚠️ উচ্চ</option>
                      <option value="medium">📢 মাঝারি</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcast.title || !broadcast.message}
                  className="w-full mt-5 py-3 rounded-xl font-heading font-bold disabled:opacity-40"
                  style={{ backgroundColor: '#00e5c4', color: '#060d1a' }}
                >
                  সতর্কতা প্রকাশ করুন
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Audit log — who did what, when ── */}
      <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="font-heading text-lg font-bold text-white mb-4">🧾 Admin Activity Log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-slate-500">কোনো কার্যকলাপ এখনো নেই।</p>
        ) : (
          <div className="space-y-2">
            {audit.map(a => {
              const color = a.action === 'approve' ? '#22c55e' : a.action === 'reject' ? '#ff4444' : a.action === 'broadcast' ? '#f59e0b' : '#00e5c4'
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    {a.action}
                  </span>
                  <span className="text-slate-300 flex-1 truncate">{a.target}</span>
                  <span className="text-xs text-slate-500 shrink-0">{a.admin_email}</span>
                  <span className="text-xs text-slate-600 shrink-0">
                    {new Date(/Z$|[+]/.test(a.created_at) ? a.created_at : a.created_at + 'Z').toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
