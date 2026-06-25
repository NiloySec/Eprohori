'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchAlerts, fetchDivisions, fetchDistricts, fetchThreats, fetchActivity } from '@/lib/api'
import type { Alert, DivisionData, DistrictData, Threat, ActivityItem } from '@/lib/api'
import { AlertCardSkeleton, ThreatCardSkeleton } from '@/components/Skeleton'
import { useLanguage } from '@/lib/LanguageContext'
import { timeAgo } from '@/lib/format'

const Map = dynamic(() => import('@/components/BangladeshDivisionMap'), { ssr: false })

type AlertFilter = 'all' | 'critical' | 'high' | 'medium'
type TimeFilter  = '24h' | '3d' | '7d' | '15d' | '30d'
type CatFilter   = 'all' | 'sms' | 'email' | 'messenger' | 'whatsapp' | 'telegram' | 'website' | 'other'

const SEV_COLOR: Record<string, string> = { critical: '#ff4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e' }
const SEV_ICON:  Record<string, string> = { critical: '🚨', high: '⚠️', medium: '📢' }
const SEV_LABEL: Record<string, string> = { critical: 'জরুরি', high: 'উচ্চ', medium: 'মাঝারি', low: 'কম' }

const CAT_TYPE: Partial<Record<CatFilter, string>> = {
  sms: 'sms', email: 'email', messenger: 'messenger', whatsapp: 'whatsapp',
  telegram: 'telegram', website: 'website', other: 'other',
}
const PLATFORM_LABEL: Record<CatFilter, string> = {
  all: 'সব প্ল্যাটফর্ম', sms: 'এসএমএস', email: 'ই-মেইল', messenger: 'মেসেঞ্জার',
  whatsapp: 'হোয়াটসঅ্যাপ', telegram: 'টেলিগ্রাম', website: 'ওয়েবসাইট', other: 'অন্যান্য',
}

export default function MonitorPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const TIME_LABELS: Record<TimeFilter, string> = {
    '24h': '২৪ ঘণ্টা', '3d': '৩ দিন', '7d': '৭ দিন', '15d': '১৫ দিন', '30d': '৩০ দিন',
  }
  const CAT_LABEL = PLATFORM_LABEL
  const sevLabelT: Record<string, string> = {
    critical: t('severity_critical'), high: t('severity_high'), medium: t('severity_medium'),
  }

  // ── Alerts state ──
  const [alerts, setAlerts]             = useState<Alert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertFilter, setAlertFilter]   = useState<AlertFilter>('all')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  // ── Map / threat state ──
  const [divisions, setDivisions]   = useState<DivisionData[]>([])
  const [districts, setDistricts]   = useState<DistrictData[]>([])
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d')
  const [catFilter, setCatFilter]   = useState<CatFilter>('all')
  const [threats, setThreats]       = useState<Threat[]>([])
  const [threatsLoading, setThreatsLoading] = useState(false)

  // ── Live activity state ──
  const [activity, setActivity]     = useState<ActivityItem[]>([])

  // ── Threat list filters ──
  const [search, setSearch]             = useState('')

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadAlerts = useCallback(() => {
    fetchAlerts().then(d => {
      setAlerts(d)
      setAlertsLoading(false)
      setLastUpdated(new Date())
    })
  }, [])

  const loadDivisions = useCallback(() => {
    fetchDivisions(timeFilter).then(d => {
      setDivisions(d)
      setLastUpdated(new Date())
    })
  }, [timeFilter])

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    loadAlerts()
    const id = setInterval(loadAlerts, 60000)
    return () => clearInterval(id)
  }, [loadAlerts])

  useEffect(() => {
    loadDivisions()
    const id = setInterval(loadDivisions, 60000)
    return () => clearInterval(id)
  }, [loadDivisions])

  // District circles — refetch on time/category change
  useEffect(() => {
    fetchDistricts(timeFilter, catFilter !== 'all' ? CAT_TYPE[catFilter] : undefined)
      .then(setDistricts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, catFilter])

  // Live activity feed — auto-refresh every 30s
  useEffect(() => {
    const load = () => fetchActivity(10).then(d => {
      setActivity(d)
      setLastUpdated(new Date())
    })
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  // Threat list — refetch on time/category change, filter by division client-side
  useEffect(() => {
    setThreatsLoading(true)
    const params: Parameters<typeof fetchThreats>[0] = { limit: 20, timeframe: timeFilter }
    if (catFilter !== 'all') params.type = CAT_TYPE[catFilter]
    fetchThreats(params)
      .then(setThreats)
      .finally(() => setThreatsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, catFilter])

  // ── Derived data ──
  const critical      = alerts.filter(a => a.severity === 'critical')
  const filteredAlerts = alertFilter === 'all' ? alerts : alerts.filter(a => a.severity === alertFilter)

  const filteredDivisions = divisions.map(d => {
    if (catFilter === 'all') return d
    return { ...d, threat_count: d.categories[catFilter] ?? 0 }
  })
  const sortedDistricts = [...districts].sort((a, b) => b.threats - a.threats)
  const total  = filteredDivisions.reduce((sum, d) => sum + d.threat_count, 0)
  const catTotals = divisions.reduce((acc, d) => {
    Object.entries(d.categories).forEach(([cat, count]) => { acc[cat] = (acc[cat] || 0) + count })
    return acc
  }, {} as Record<string, number>)
  const topType = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Threat type distribution for the activity chart
  const typeDist = (() => {
    const counts: Record<string, number> = {}
    activity.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1 })
    const totalAct = activity.length || 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, pct: Math.round((count / totalAct) * 100) }))
  })()
  const distColors = ['#00e5c4', '#f59e0b', '#a855f7', '#3b82f6', '#ff4444', '#22c55e']

  // The threat list is INDEPENDENT of the map selection (only search filters it).
  const listedThreats = threats.filter(th => {
    if (search && !th.detail.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* ── Premium hero header ── */}
      <section className="relative overflow-hidden grid-bg">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(255,68,68,0.08) 0%, transparent 70%)' }} />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ width: 600, height: 380, borderRadius: '50%', background: 'rgba(0,229,196,0.10)', filter: 'blur(120px)', opacity: 0.4 }} />

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-8 z-10">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 fade-in-up"
              style={{ backgroundColor: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6666' }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              LIVE MONITORING
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3 gradient-text fade-in-up-1 leading-tight">
              {t('monitor_title')}
            </h1>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto fade-in-up-2">
              {t('monitor_subtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7 fade-in-up-3">
              <Link href="/report" className="btn-primary px-7 py-3" style={{ borderRadius: '12px' }}>
                🚨 {t('report_btn')}
              </Link>
              {lastUpdated && (
                <span className="text-xs text-slate-500">
                  {t('last_updated')}: <span style={{ color: '#00e5c4' }}>{lastUpdated.toLocaleTimeString()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-16 pt-4">

      {/* ── Section 2: Active Alerts ── */}
      <section className="mb-14">
        <h2 className="font-heading text-2xl font-bold text-white mb-5">{t('active_alerts')}</h2>

        {/* Critical banner */}
        {critical.length > 0 && !bannerDismissed && (
          <div
            className="rounded-xl p-4 mb-6 flex items-start gap-3 fade-in-up danger-pulse"
            style={{
              background: 'rgba(255,68,68,0.07)',
              border: '1px solid rgba(255,68,68,0.35)',
              borderLeft: '4px solid #ff4444',
            }}
          >
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <p className="font-bold text-white">{critical.length}টি জরুরি সতর্কতা সক্রিয়</p>
              <p className="text-sm mt-0.5" style={{ color: '#ff6666' }}>{critical[0].title}</p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg shrink-0"
              aria-label="Dismiss"
            >×</button>
          </div>
        )}

        {/* Severity filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(['all', 'critical', 'high', 'medium'] as AlertFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setAlertFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: alertFilter === f ? '#00e5c4' : 'rgba(255,255,255,0.05)',
                color: alertFilter === f ? '#060d1a' : '#94a3b8',
                boxShadow: alertFilter === f ? '0 0 12px rgba(0,229,196,0.3)' : 'none',
              }}
            >
              {f === 'all' ? t('filter_all') : sevLabelT[f]}
              {f !== 'all' && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: alertFilter === f ? 'rgba(6,13,26,0.3)' : `${SEV_COLOR[f]}20`,
                    color: alertFilter === f ? '#060d1a' : SEV_COLOR[f],
                  }}
                >
                  {alerts.filter(a => a.severity === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alert cards — 2-col grid */}
        {alertsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <AlertCardSkeleton key={i} />)}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: 'rgba(13,24,41,0.7)', border: '1px dashed rgba(0,229,196,0.2)' }}
          >
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm text-slate-400">{t('no_alerts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAlerts.map((a, idx) => (
              <div
                key={a.id}
                onClick={() => setSelectedAlert(a)}
                className="rounded-xl p-5 hover-reveal fade-in-up cursor-pointer"
                style={{
                  background: 'rgba(13,24,41,0.8)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `4px solid ${SEV_COLOR[a.severity]}`,
                  animationDelay: `${idx * 0.06}s`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{SEV_ICON[a.severity]}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: `${SEV_COLOR[a.severity]}20`, color: SEV_COLOR[a.severity] }}
                  >
                    {sevLabelT[a.severity] ?? a.severity}
                  </span>
                  {a.severity === 'critical' && (
                    <span className="w-2 h-2 rounded-full sev-blink" style={{ backgroundColor: '#ff4444' }} />
                  )}
                </div>
                <h3 className="font-semibold text-white mb-1">{a.title}</h3>
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">{a.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>📍 {a.area}</span>
                  <span>🕐 {timeAgo(a.created_at)}</span>
                  <span>📊 {a.report_count} রিপোর্ট</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Threat type distribution ── */}
      {typeDist.length > 0 && (
        <section className="mb-14">
          <h2 className="font-heading text-2xl font-bold text-white mb-5">{t('threat_types_today')}</h2>
          <div className="glass-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {typeDist.map((s, i) => (
              <div key={s.type}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-300">{s.type}</span>
                  <span className="font-semibold" style={{ color: distColors[i % distColors.length] }}>{s.pct}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(30,58,95,0.6)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${s.pct}%`,
                      background: `linear-gradient(90deg, ${distColors[i % distColors.length]}88, ${distColors[i % distColors.length]})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 4: Threat Map ── */}
      <section className="mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          <h2 className="font-heading text-2xl font-bold text-white">{t('threat_map')}</h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map — 65% */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              flex: '1 1 65%',
              minHeight: '420px',
              position: 'relative',
              border: '1px solid rgba(0,229,196,0.12)',
              boxShadow: 'inset 0 0 40px rgba(0,229,196,0.04)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,196,0.5), transparent)' }}
            />
            <Map
              divisions={filteredDivisions}
              districts={districts}
              onSelectDivision={() => {}}
              onSelectDistrict={setSelectedDistrict}
            />
          </div>

          {/* Filters + stats — 35% */}
          <div className="space-y-4" style={{ flex: '1 1 35%' }}>
            {/* Selected district card — driven by the map / high-risk click only */}
            {selectedDistrict ? (
              <div
                className="rounded-xl p-4 slide-down"
                style={{ background: 'rgba(17,31,53,0.9)', border: `1px solid ${selectedDistrict.color}55` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-lg font-bold gradient-text">
                    {selectedDistrict.name_bn || selectedDistrict.name}
                  </h3>
                  <button
                    onClick={() => setSelectedDistrict(null)}
                    aria-label="নির্বাচন বন্ধ করুন"
                    className="w-6 h-6 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-all text-sm"
                  >✕</button>
                </div>
                <p className="text-4xl font-bold mb-1" style={{ color: selectedDistrict.color }}>
                  {selectedDistrict.threats}
                </p>
                <p className="text-xs text-slate-400 mb-3">{t('total_threats_label')} ({TIME_LABELS[timeFilter]})</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>🗺️ বিভাগ:</span>
                  <span className="text-white font-semibold">{selectedDistrict.division}</span>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: 'rgba(17,31,53,0.7)', border: '1px dashed rgba(0,229,196,0.2)' }}
              >
                <p className="text-3xl mb-2">🗺️</p>
                <p className="text-sm text-slate-400">মানচিত্রে একটি জেলায় ক্লিক করুন</p>
              </div>
            )}

            {/* Stats panel */}
            <div
              className="rounded-xl p-4 space-y-4"
              style={{ background: 'rgba(17,31,53,0.9)', border: '1px solid rgba(0,229,196,0.18)' }}
            >
              <div>
                <p className="text-xs text-slate-400 mb-1">{t('total_threats_national')} ({TIME_LABELS[timeFilter]})</p>
                <p className="font-heading text-3xl font-bold gradient-text">{total}</p>
              </div>
              <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-slate-400 mb-1">{t('most_affected')}</p>
                <p className="font-semibold text-white">{sortedDistricts[0]?.name_bn || sortedDistricts[0]?.name || '—'}</p>
              </div>
              <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-slate-400 mb-1">{t('top_threat_type')}</p>
                <p className="font-semibold text-white">{topType}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#00e5c4' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#00e5c4' }} />
                </span>
                <span className="text-xs text-slate-500">{t('live_data')}</span>
              </div>
            </div>

            {/* High risk areas */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(17,31,53,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <h3 className="font-semibold text-white text-sm mb-3">উচ্চ ঝুঁকির জেলা</h3>
              <div className="space-y-2">
                {sortedDistricts.slice(0, 5).map((d, i) => (
                  <button
                    key={d.name}
                    onClick={() => setSelectedDistrict(d)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all hover:bg-white/5"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: i < 3 ? 'rgba(255,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: i < 3 ? '#ff4444' : '#f59e0b',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-white font-medium">{d.name_bn || d.name}</span>
                    <span style={{ color: '#00e5c4', fontWeight: 700, fontSize: '0.85rem' }}>{d.threats}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Threat List ── */}
      <section>
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <h2 className="font-heading text-2xl font-bold text-white">
            {t('all_threats_title')}
          </h2>
          {catFilter !== 'all' && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,229,196,0.12)', color: '#00e5c4' }}>
              {CAT_LABEL[catFilter]}
            </span>
          )}
        </div>

        {/* Search + filters */}
        <div className="space-y-3 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 হুমকি খুঁজুন..."
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
            style={{ backgroundColor: '#060d1a', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <div className="flex gap-3 flex-wrap">
            {/* Public list is verified-only; pending reports are admin-side */}
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              ✓ শুধুমাত্র যাচাইকৃত হুমকি
            </span>
            {/* Platform filter */}
            <select
              aria-label="প্ল্যাটফর্ম ফিল্টার"
              value={catFilter}
              onChange={e => setCatFilter(e.target.value as CatFilter)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8' }}
            >
              {(['all', 'sms', 'email', 'messenger', 'whatsapp', 'telegram', 'website', 'other'] as CatFilter[]).map(c => (
                <option key={c} value={c}>{PLATFORM_LABEL[c]}</option>
              ))}
            </select>
            {/* Time filter (same state as the map) */}
            {(['24h', '3d', '7d', '15d', '30d'] as TimeFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: timeFilter === f ? '#00e5c4' : 'rgba(255,255,255,0.05)',
                  color: timeFilter === f ? '#060d1a' : '#94a3b8',
                  border: timeFilter === f ? '1px solid #00e5c4' : '1px solid transparent',
                }}
              >
                {TIME_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {threatsLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <ThreatCardSkeleton key={i} />)}
          </div>
        ) : listedThreats.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{t('no_threats_found')}</p>
        ) : (
          <div className="space-y-3">
            {listedThreats.map((th, idx) => {
              const isSafe = th.status === 'rejected'
              const accent = isSafe ? '#22c55e' : SEV_COLOR[th.severity]
              return (
              <button
                key={th.id}
                onClick={() => router.push('/report/' + th.id)}
                className="w-full text-left rounded-xl p-4 hover-reveal fade-in-up"
                style={{
                  backgroundColor: '#0d1829',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${accent}`,
                  animationDelay: `${idx * 0.04}s`,
                }}
              >
                {/* Line 1: Detail (left) | Severity (right) */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm text-slate-300 flex-1">{th.detail}</p>
                  <div className="flex-shrink-0">
                    {isSafe ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                      >
                        ✅ যাচাইকৃত নিরাপদ
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: `${SEV_COLOR[th.severity]}20`, color: SEV_COLOR[th.severity] }}
                      >
                        {SEV_LABEL[th.severity]}
                      </span>
                    )}
                  </div>
                </div>
                {/* Line 2: Alert badge (right) */}
                {!isSafe && th.alerted && (
                  <div className="flex justify-end text-xs mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: 'rgba(0,229,196,0.15)', color: '#00e5c4' }}
                    >
                      🔔 সতর্কতা জারি
                    </span>
                  </div>
                )}
                {/* Line 3: Metadata (left) | Confidence % (right) */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>📍 {th.division}</span>
                    <span>•</span>
                    <span>{timeAgo(th.created_at)}</span>
                    <span>•</span>
                    <span>{th.type}</span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: 'rgba(0,229,196,0.08)', color: '#00e5c4' }}
                  >
                    EProhori: {th.confidence}%
                  </span>
                </div>
              </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Alert detail modal ── */}
      {selectedAlert && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 fade-in-up"
            style={{
              background: 'rgba(13,24,41,0.97)',
              border: `1px solid ${SEV_COLOR[selectedAlert.severity]}44`,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SEV_ICON[selectedAlert.severity]}</span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ backgroundColor: `${SEV_COLOR[selectedAlert.severity]}20`, color: SEV_COLOR[selectedAlert.severity] }}
                >
                  {sevLabelT[selectedAlert.severity] ?? selectedAlert.severity}
                </span>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                aria-label="অ্যালার্ট বন্ধ করুন"
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xl"
              >×</button>
            </div>
            <h3 className="font-heading text-xl font-bold text-white mb-3">{selectedAlert.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">{selectedAlert.description}</p>
            <div className="space-y-2 text-sm rounded-xl p-4" style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between">
                <span className="text-slate-500">📍 এলাকা</span>
                <span className="text-white">{selectedAlert.area}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">🕐 সময়</span>
                <span className="text-white">{timeAgo(selectedAlert.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">📊 সংশ্লিষ্ট রিপোর্ট</span>
                <span style={{ color: '#00e5c4', fontWeight: 700 }}>{selectedAlert.report_count}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedAlert(null)}
              className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
