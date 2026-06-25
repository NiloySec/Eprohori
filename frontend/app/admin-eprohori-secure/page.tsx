'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchAdminPendingThreats, fetchStats, approveThreat, rejectThreat, broadcastAlert, adminLogin, fetchAuditLog, getAdminToken, setAdminToken } from '@/lib/api'
import type { Threat, Stats, AuditEntry } from '@/lib/api'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://eprohori-production.up.railway.app'

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
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'broadcast' | 'audit' | 'tools'>('pending')
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => { if (getAdminToken()) setAuthed(true) }, [])

  const loadAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const [{ threats: t, error: tErr }, s] = await Promise.all([
        fetchAdminPendingThreats(),
        fetchStats(),
      ])
      setFetchError(tErr)
      setThreats(t)
      setStats(s)
      setApproved([])
      setRejected([])
    } finally {
      setLoading(false)
    }
    fetchAuditLog().then(setAudit)
  }, [])

  // Initial load
  useEffect(() => {
    if (!authed) return
    loadAll()
  }, [authed, loadAll])

  // Auto-refresh every 10s for near-real-time pending report updates
  useEffect(() => {
    if (!authed) return
    const id = setInterval(() => loadAll(true), 10000)
    return () => clearInterval(id)
  }, [authed, loadAll])

  const flash = (kind: 'ok' | 'err', text: string, ms = 4000) => {
    setActionMsg({ kind, text })
    setTimeout(() => setActionMsg(null), ms)
  }

  const handleApprove = async (id: number) => {
    try {
      const res = await approveThreat(id)
      setSelectedThreat(null)
      flash('ok', `✅ অনুমোদিত — alert email পাঠানো হয়েছে (${res.severity})`)
      loadAll(true)
    } catch { flash('err', 'অনুমোদন ব্যর্থ — আবার চেষ্টা করুন', 3000) }
  }

  const handleReject = async (id: number) => {
    try {
      await rejectThreat(id)
      setSelectedThreat(null)
      flash('ok', '🚫 প্রত্যাখ্যান করা হয়েছে — reporter-কে email পাঠানো হয়েছে')
      loadAll(true)
    } catch { flash('err', 'প্রত্যাখ্যান ব্যর্থ', 3000) }
  }

  const handleBroadcast = async () => {
    if (!broadcast.title || !broadcast.message) return
    try { await broadcastAlert(broadcast); setSent(true); fetchAuditLog().then(setAudit) }
    catch { flash('err', 'প্রকাশ ব্যর্থ — সার্ভার সংযোগ নেই') }
  }

  const handleLogin = async () => {
    setError(false); setLoggingIn(true)
    try {
      const admin = await adminLogin(loginEmail.trim(), input)
      setAdminName(admin.name); setAuthed(true)
    } catch (e) {
      setErrorMsg(
        e instanceof Error && /invalid/i.test(e.message) ? 'ভুল ইমেইল বা পাসওয়ার্ড'
        : e instanceof Error && /admin access/i.test(e.message) ? 'এই অ্যাকাউন্টের admin অনুমতি নেই'
        : 'সার্ভার সংযোগ নেই — backend চালু করুন'
      )
      setError(true)
    }
    setLoggingIn(false)
  }

  const handleLogout = () => { setAdminToken(null); setAuthed(false); setInput(''); setLoginEmail('') }

  const handleBackup = async () => {
    try {
      const token = getAdminToken()
      const r = await fetch(`${API}/api/admin/backup`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!r.ok) throw new Error('Backup failed')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eprohori-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      flash('ok', 'Backup downloaded')
    } catch { flash('err', 'Backup failed') }
  }

  const pending = threats.filter(t => !approved.includes(t.id) && !rejected.includes(t.id))

  /* ────── LOGIN SCREEN ────── */
  if (!authed) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(255,68,68,0.08) 0%, transparent 60%)',
        }} />
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,68,68,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(0,229,196,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="relative w-full max-w-md z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 relative"
              style={{ background: 'linear-gradient(135deg, rgba(255,68,68,0.15), rgba(255,68,68,0.05))', border: '1px solid rgba(255,68,68,0.25)' }}>
              <span className="text-4xl">🔐</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-white mb-2">Admin Control Center</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Restricted · Authorized personnel only</p>
          </div>

          <div className="rounded-2xl p-7 backdrop-blur-xl"
            style={{ background: 'rgba(13,24,41,0.7)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <Field label="অ্যাডমিন ইমেইল" icon="📧">
              <input type="email" value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setError(false) }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="admin@eprohori.tech"
                className="w-full bg-transparent outline-none text-white placeholder-slate-600 text-sm" />
            </Field>
            <div className="h-4" />
            <Field label="পাসওয়ার্ড" icon="🔑" error={error}>
              <input type="password" value={input}
                onChange={e => { setInput(e.target.value); setError(false) }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••••••"
                className="w-full bg-transparent outline-none text-white placeholder-slate-600 text-sm" />
            </Field>

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff6666' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button onClick={handleLogin} disabled={loggingIn}
              className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00e5c4 0%, #0891b2 100%)', color: '#050810' }}>
              {loggingIn ? 'যাচাই হচ্ছে...' : 'প্রবেশ করুন →'}
            </button>

            <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-slate-600">
              <span>🔒 Server-verified</span>
              <span>•</span>
              <span>JWT 1h</span>
              <span>•</span>
              <span>Auto-logout</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ────── DASHBOARD ────── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,229,196,0.2), rgba(8,145,178,0.1))', border: '1px solid rgba(0,229,196,0.3)' }}>
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-white">Control Center</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                style={{ background: 'rgba(255,68,68,0.15)', color: '#ff6666', border: '1px solid rgba(255,68,68,0.3)' }}>
                ● LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {adminName ? `👤 ${adminName}` : '👤 Admin'} · EProhori Platform Administration
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="text-xs px-4 py-2 rounded-full text-slate-400 hover:text-white hover:border-white/30 transition"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          লগআউট
        </button>
      </div>

      {/* Flash msg */}
      {actionMsg && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{
            background: actionMsg.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(255,68,68,0.1)',
            border: `1px solid ${actionMsg.kind === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(255,68,68,0.3)'}`,
            color: actionMsg.kind === 'ok' ? '#22c55e' : '#ff6666',
          }}>
          {actionMsg.kind === 'ok' ? '✅' : '⚠️'} {actionMsg.text}
        </div>
      )}

      {/* Stat cards — full pilot tracking */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard icon="👥" label="নিবন্ধিত user" value={stats.rangers_count ?? 0} accent="#a78bfa" hint="Total registered" />
          <StatCard icon="📊" label="মোট রিপোর্ট" value={stats.total_threats ?? 0} accent="#00e5c4" hint="All-time reports" />
          <StatCard icon="📥" label="আজকের রিপোর্ট" value={stats.today_reports} accent="#22d3ee" hint="Today" />
          <StatCard icon="🚨" label="যাচাইকৃত হুমকি" value={stats.active_threats} accent="#ef4444" hint="Verified threats" />
          <StatCard icon="🔔" label="সতর্ক মানুষ" value={stats.alerted_people ?? 0} accent="#f59e0b" hint="People alerted" />
          <StatCard icon="🛡️" label="বাঁচানো" value={stats.saved_count ?? 0} accent="#22c55e" hint="'EProhori saved me'" />
          <StatCard icon="⏳" label="পেন্ডিং রিভিউ" value={pending.length} accent="#fb923c" hint="Awaiting decision" />
          <StatCard icon="✓" label="অনুমোদিত (session)" value={approved.length} accent="#4ade80" hint="This session" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: 'pending', label: '⏳ পেন্ডিং', count: pending.length },
          { id: 'broadcast', label: '📢 সতর্কতা প্রচার' },
          { id: 'audit', label: '🧾 Activity Log', count: audit.length },
          { id: 'tools', label: '🛠️ Tools' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition"
            style={{
              background: activeTab === t.id ? 'rgba(0,229,196,0.12)' : 'rgba(13,24,41,0.5)',
              border: `1px solid ${activeTab === t.id ? 'rgba(0,229,196,0.3)' : 'rgba(255,255,255,0.05)'}`,
              color: activeTab === t.id ? '#00e5c4' : '#94a3b8',
            }}>
            {t.label}
            {typeof t.count === 'number' && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'inherit' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pending' && (
        <Panel title="অপেক্ষমাণ রিপোর্ট" subtitle="EProhori-যাচাইকৃত রিপোর্ট — অনুমোদনের অপেক্ষায়">
          {fetchError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              ⚠️ Backend সংযোগ সমস্যা: {fetchError} —{' '}
              <button onClick={() => loadAll()} className="underline">আবার চেষ্টা করুন</button>
            </div>
          )}
          {loading ? <Empty text="লোড হচ্ছে..." />
            : !fetchError && pending.length === 0 ? <Empty text="🎉 সব ক্লিয়ার! কোনো পেন্ডিং রিপোর্ট নেই।" />
            : (
              <div className="grid md:grid-cols-2 gap-3">
                {pending.map(t => {
                  return (
                    <div key={t.id}
                      onClick={() => setSelectedThreat(t)}
                      className="rounded-xl p-4 transition hover:border-white/20 cursor-pointer"
                      style={{ background: 'rgba(6,13,26,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4' }}>{t.type}</span>
                          {t.platform && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,0.12)', color: '#cbd5e1' }}>{t.platform}</span>
                          )}
                          {t.is_campaign && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>🔥 Campaign</span>
                          )}
                        </div>
                        <ConfidenceDot value={t.confidence} />
                      </div>

                      {/* Full report content (scrolls if long) */}
                      <div className="rounded-lg p-3 mb-2 text-sm text-white whitespace-pre-wrap break-words"
                        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', maxHeight: 160, overflowY: 'auto' }}>
                        {t.detail}
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-400 mb-2"><span className="text-slate-500">বিবরণ:</span> {t.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-1 flex-wrap">
                        <span>📍 {t.division}</span>
                        <span>🎯 AI: {t.confidence}%</span>
                        <span>🕐 {new Date(/Z$|[+]/.test(t.created_at) ? t.created_at : t.created_at + 'Z').toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      {t.screenshot && (
                        <a href={t.screenshot} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-400 hover:underline">📎 screenshot দেখুন</a>
                      )}
                      <div className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-2 mb-3"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                        📧 অনুমোদনে alert যাবে
                      </div>
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleApprove(t.id)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold transition hover:brightness-110"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                          ✓ অনুমোদন
                        </button>
                        <button onClick={() => handleReject(t.id)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold transition hover:brightness-110"
                          style={{ background: 'rgba(255,68,68,0.1)', color: '#ff6666', border: '1px solid rgba(255,68,68,0.25)' }}>
                          ✕ প্রত্যাখ্যান
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </Panel>
      )}

      {activeTab === 'broadcast' && (
        <Panel title="সতর্কতা প্রচার" subtitle="সব district user-দের কাছে email alert পাঠান">
          {sent ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📡</div>
              <p className="font-bold text-white text-lg">সতর্কতা প্রকাশিত!</p>
              <p className="text-sm text-slate-400 mt-1">All subscribed users will receive email shortly.</p>
              <button onClick={() => { setSent(false); setBroadcast({ title: '', message: '', severity: 'high' }) }}
                className="mt-5 text-sm px-5 py-2 rounded-full transition hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}>
                + আরেকটা পাঠান
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <Field label="শিরোনাম" icon="📌">
                <input value={broadcast.title} onChange={e => setBroadcast(b => ({ ...b, title: e.target.value }))}
                  placeholder="যেমন: bKash impersonation campaign চলছে"
                  className="w-full bg-transparent outline-none text-white placeholder-slate-600 text-sm" />
              </Field>
              <Field label="বার্তা" icon="✍️">
                <textarea value={broadcast.message} onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
                  rows={5} placeholder="বিস্তারিত বিবরণ ও user-দের কী করা উচিত..."
                  className="w-full bg-transparent outline-none text-white placeholder-slate-600 text-sm resize-none" />
              </Field>
              <Field label="তীব্রতা" icon="🚦">
                <select aria-label="তীব্রতা" value={broadcast.severity} onChange={e => setBroadcast(b => ({ ...b, severity: e.target.value }))}
                  className="w-full bg-transparent outline-none text-white text-sm">
                  <option value="critical" className="bg-slate-900">🚨 জরুরি (Critical)</option>
                  <option value="high" className="bg-slate-900">⚠️ উচ্চ (High)</option>
                  <option value="medium" className="bg-slate-900">📢 মাঝারি (Medium)</option>
                </select>
              </Field>
              <button onClick={handleBroadcast} disabled={!broadcast.title || !broadcast.message}
                className="w-full mt-3 py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #00e5c4 0%, #0891b2 100%)', color: '#050810' }}>
                📡 সতর্কতা প্রকাশ করুন
              </button>
            </div>
          )}
        </Panel>
      )}

      {activeTab === 'audit' && (
        <Panel title="Activity Timeline" subtitle="Multi-admin accountability log">
          {audit.length === 0 ? <Empty text="কোনো কার্যকলাপ এখনো নেই।" /> : (
            <div className="space-y-1.5">
              {audit.map(a => {
                const color = a.action === 'approve' ? '#22c55e' : a.action === 'reject' ? '#ff6666' : a.action === 'broadcast' ? '#f59e0b' : '#00e5c4'
                const icon = a.action === 'approve' ? '✓' : a.action === 'reject' ? '✕' : a.action === 'broadcast' ? '📡' : '🔐'
                return (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition hover:bg-white/[0.03]">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate">{a.target}</div>
                      <div className="text-[10px] text-slate-500">{a.admin_email}</div>
                    </div>
                    <div className="text-[10px] text-slate-600 shrink-0 text-right">
                      {new Date(/Z$|[+]/.test(a.created_at) ? a.created_at : a.created_at + 'Z').toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      )}

      {activeTab === 'tools' && (
        <Panel title="Admin Tools" subtitle="ডাটাবেস ও সিস্টেম management">
          <div className="grid md:grid-cols-2 gap-4">
            <ToolCard icon="💾" title="Database Backup" desc="সব tables-এর JSON dump ডাউনলোড করুন"
              cta="Download backup" onClick={handleBackup} />
            <ToolCard icon="🗺️" title="Live Monitor" desc="Real-time threat map ও alerts"
              cta="Open monitor" onClick={() => window.open('/monitor', '_blank')} />
            <ToolCard icon="🐛" title="Sentry Dashboard" desc="Error tracking ও performance monitoring"
              cta="Open Sentry" onClick={() => window.open('https://sentry.io/issues/', '_blank')} />
          </div>
        </Panel>
      )}

      {/* ── Threat detail modal ── */}
      {selectedThreat && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelectedThreat(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: 'rgba(10,18,34,0.98)', border: '1px solid rgba(0,229,196,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(0,229,196,0.1)', color: '#00e5c4' }}>
                  #{selectedThreat.id} · {selectedThreat.type}
                </span>
                {selectedThreat.is_campaign && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>🔥 Campaign</span>
                )}
                <ConfidenceDot value={selectedThreat.confidence} />
              </div>
              <button
                onClick={() => setSelectedThreat(null)}
                aria-label="বন্ধ করুন"
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xl"
              >×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Main content */}
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">হুমকির বিষয়বস্তু</p>
                <div className="rounded-lg p-4 text-sm text-white whitespace-pre-wrap break-words"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7 }}>
                  {selectedThreat.detail}
                </div>
              </div>

              {/* Additional description */}
              {selectedThreat.description && selectedThreat.description !== selectedThreat.detail && (
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">অতিরিক্ত বিবরণ</p>
                  <p className="text-sm text-slate-300 leading-relaxed" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedThreat.description}
                  </p>
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetaItem label="📍 জেলা/বিভাগ" value={selectedThreat.division || '—'} />
                <MetaItem label="🎯 AI Confidence" value={`${selectedThreat.confidence}%`} accent={selectedThreat.confidence >= 75 ? '#ef4444' : selectedThreat.confidence >= 55 ? '#f59e0b' : '#3b82f6'} />
                <MetaItem label="📱 প্ল্যাটফর্ম" value={selectedThreat.platform || '—'} />
                <MetaItem label="📊 রিপোর্ট সংখ্যা" value={`${(selectedThreat.up_votes ?? 0) + 1}`} />
                <MetaItem label="🕐 সময়" value={new Date(/Z$|[+]/.test(selectedThreat.created_at) ? selectedThreat.created_at : selectedThreat.created_at + 'Z').toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })} />
                {selectedThreat.reporter_email && (
                  <MetaItem label="📧 রিপোর্টার" value={selectedThreat.reporter_email} />
                )}
              </div>

              {/* Screenshot */}
              {selectedThreat.screenshot && (
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">স্ক্রিনশট প্রমাণ</p>
                  <a href={selectedThreat.screenshot} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedThreat.screenshot}
                      alt="screenshot"
                      className="w-full rounded-lg object-contain cursor-zoom-in hover:opacity-90 transition"
                      style={{ maxHeight: 200, border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </a>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => handleApprove(selectedThreat.id)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition hover:brightness-110"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  ✓ অনুমোদন করুন
                </button>
                <button
                  onClick={() => handleReject(selectedThreat.id)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition hover:brightness-110"
                  style={{ background: 'rgba(255,68,68,0.1)', color: '#ff6666', border: '1px solid rgba(255,68,68,0.25)' }}
                >
                  ✕ প্রত্যাখ্যান করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ────── UI primitives ────── */

function Field({ label, icon, error, children }: { label: string; icon?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {icon && <span className="text-sm">{icon}</span>}{label}
      </label>
      <div className="px-4 py-3 rounded-xl transition"
        style={{ background: 'rgba(6,13,26,0.6)', border: `1px solid ${error ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
        {children}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, accent, hint }: { icon: string; label: string; value: number; accent: string; hint: string }) {
  return (
    <div className="relative rounded-2xl p-5 overflow-hidden transition hover:scale-[1.02]"
      style={{ background: 'rgba(13,24,41,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, filter: 'blur(20px)' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">{icon}</span>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
        </div>
        <div className="font-heading text-3xl font-bold mb-1" style={{ color: accent }}>{value}</div>
        <div className="text-xs text-slate-300 font-medium">{label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6"
      style={{ background: 'rgba(13,24,41,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mb-5">
        <h2 className="font-heading text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-slate-500">{text}</div>
}

function ConfidenceDot({ value }: { value: number }) {
  const c = value >= 75 ? '#ef4444' : value >= 55 ? '#f59e0b' : value >= 35 ? '#3b82f6' : '#22c55e'
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      <span className="text-[10px] font-bold" style={{ color: c }}>{value}%</span>
    </div>
  )
}

function ToolCard({ icon, title, desc, cta, onClick }: { icon: string; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-left rounded-xl p-5 transition hover:scale-[1.01] hover:border-cyan-400/30 group"
      style={{ background: 'rgba(6,13,26,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-heading text-base font-semibold text-white mb-1">{title}</div>
      <div className="text-xs text-slate-400 mb-3">{desc}</div>
      <div className="text-xs text-cyan-400 group-hover:underline">{cta} →</div>
    </button>
  )
}

function MetaItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] text-slate-500 mb-1">{label}</p>
      <p className="text-xs font-semibold truncate" style={{ color: accent || '#e2e8f0' }}>{value}</p>
    </div>
  )
}
