'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchTrending, reportThreat, validateText, checkPhone } from '@/lib/api'
import type { TrendingScam, ValidationResult } from '@/lib/api'
import ConfidenceMeter from '@/components/ConfidenceMeter'
import DistrictSelect, { DISTRICT_TO_DIVISION } from '@/components/DistrictSelect'
import { useLanguage } from '@/lib/LanguageContext'

type ThreatType = '' | 'url' | 'sms' | 'facebook' | 'website' | 'call' | 'other'

const THREAT_TYPES: { value: Exclude<ThreatType, ''>; label: string }[] = [
  { value: 'url',      label: '🔗 Phishing URL' },
  { value: 'sms',      label: '💬 Scam SMS' },
  { value: 'facebook', label: '👤 Facebook Page/Profile' },
  { value: 'website',  label: '🌐 Fraud Website' },
  { value: 'call',     label: '📞 Fraud Call/Number' },
  { value: 'other',    label: '⚠️ Other' },
]

const TYPE_PLACEHOLDER: Record<Exclude<ThreatType, ''>, string> = {
  url:      'https://suspicious-link.com',
  sms:      'Paste the suspicious SMS text...',
  facebook: 'Facebook page URL or profile link...',
  website:  'Fraud website URL...',
  call:     'Phone number e.g. 01XXXXXXXXX',
  other:    'Describe the threat...',
}

export default function ThreatsPage() {
  const { t } = useLanguage()

  const [threatType, setThreatType] = useState<ThreatType>('')
  const [form, setForm]             = useState({ detail: '', district: 'Dhaka', platform: '', description: '' })
  const [submitting, setSubmitting]     = useState(false)
  const [submitResult, setSubmitResult] = useState<ValidationResult | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [trending, setTrending]     = useState<TrendingScam[]>([])
  const [trendLoading, setTrendLoading] = useState(true)

  useEffect(() => {
    fetchTrending().then(d => { setTrending(d); setTrendLoading(false) })
  }, [])

  const handleSubmit = async () => {
    if (!threatType || !form.detail.trim()) return
    setSubmitting(true)
    setSubmitResult(null)

    // Save the report and run type-specific AI validation in parallel.
    // The district maps to its parent division so the heat map keeps working.
    const savePromise = reportThreat({
      type: threatType,
      detail: form.detail,
      division: DISTRICT_TO_DIVISION[form.district] || form.district,
      platform: form.platform,
      description: form.description,
    })
    let res: ValidationResult
    if (threatType === 'call') {
      const phone = await checkPhone(form.detail)
      res = {
        is_phishing: phone.is_scam,
        confidence: phone.is_scam ? 90 : 15,
        reason: phone.message,
        risk_level: phone.is_scam ? 'high' : 'safe',
        actions: phone.is_scam
          ? ['এই নম্বরে সাড়া দেবেন না', 'নম্বরটি ব্লক করুন', 'পরিচিতদের সতর্ক করুন']
          : ['সতর্ক থাকুন', 'অপরিচিত নম্বরে ব্যক্তিগত তথ্য দেবেন না'],
      }
    } else {
      const vtype = threatType === 'url' || threatType === 'website' ? 'url' : 'sms'
      res = await validateText(form.detail, vtype)
    }
    await savePromise

    setSubmitResult(res)
    setSubmitting(false)
    setSubmitSuccess(true)

    // Save to localStorage for profile history
    try {
      const saved = JSON.parse(localStorage.getItem('eprohori_reports') || '[]')
      saved.unshift({
        detail: form.detail,
        type: threatType,
        confidence: res.confidence,
        isPhishing: res.is_phishing,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem('eprohori_reports', JSON.stringify(saved.slice(0, 50)))

      const profileRaw = localStorage.getItem('eprohori_profile')
      if (profileRaw) {
        const profile = JSON.parse(profileRaw)
        profile.xp = (profile.xp || 0) + 10
        profile.reports = (profile.reports || 0) + 1
        if (res.is_phishing) profile.verified = (profile.verified || 0) + 1
        localStorage.setItem('eprohori_profile', JSON.stringify(profile))
      }
    } catch { /* ignore localStorage errors */ }
  }

  const inputStyle = {
    backgroundColor: '#060d1a',
    border: '1px solid rgba(255,255,255,0.08)',
    outline: 'none',
    transition: 'border-color 0.22s, box-shadow 0.22s',
  }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'rgba(0,229,196,0.5)'
    e.target.style.boxShadow = '0 0 0 3px rgba(0,229,196,0.12)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div>
      {/* ── Premium hero header ── */}
      <section className="relative overflow-hidden grid-bg">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(0,229,196,0.10) 0%, transparent 70%)' }} />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ width: 600, height: 380, borderRadius: '50%', background: 'rgba(0,229,196,0.12)', filter: 'blur(120px)', opacity: 0.4 }} />
        <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-8 text-center z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 fade-in-up"
            style={{ background: 'rgba(0,229,196,0.08)', border: '1px solid rgba(0,229,196,0.25)' }}>
            <span className="text-3xl">🚨</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3 gradient-text fade-in-up-1 leading-tight">
            {t('threats_page_title')}
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-xl mx-auto fade-in-up-2">
            {t('threats_page_subtitle')}
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16 pt-4">

      {/* ── Report Form ── */}
      <section className="mb-10">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(15,22,38,0.6) 0%, rgba(10,15,28,0.85) 100%)',
            border: '1px solid rgba(148,163,184,0.08)',
            boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6)',
          }}
        >
          <div className="p-6 md:p-10 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                {t('form_type_label')} *
              </label>
              <select
                value={threatType}
                onChange={e => { setThreatType(e.target.value as ThreatType); setSubmitResult(null); setSubmitSuccess(false) }}
                className="w-full px-4 py-3 rounded-xl text-sm text-white"
                style={inputStyle}
                onFocus={inputFocus as React.FocusEventHandler<HTMLSelectElement>}
                onBlur={inputBlur as React.FocusEventHandler<HTMLSelectElement>}
              >
                <option value="">Select threat type...</option>
                {THREAT_TYPES.map(tt => (
                  <option key={tt.value} value={tt.value}>{tt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                {t('form_detail_label')} *
              </label>
              <input
                value={form.detail}
                onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                placeholder={threatType ? TYPE_PLACEHOLDER[threatType] : t('form_detail_label')}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500"
                style={inputStyle}
                onFocus={inputFocus as React.FocusEventHandler<HTMLInputElement>}
                onBlur={inputBlur as React.FocusEventHandler<HTMLInputElement>}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">{t('form_district_label')}</label>
                <DistrictSelect
                  value={form.district}
                  onChange={d => setForm(f => ({ ...f, district: d }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">প্ল্যাটফর্ম</label>
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white"
                  style={inputStyle}
                  onFocus={inputFocus as React.FocusEventHandler<HTMLSelectElement>}
                  onBlur={inputBlur as React.FocusEventHandler<HTMLSelectElement>}
                >
                  <option value="">নির্বাচন করুন</option>
                  <option>বিকাশ</option>
                  <option>নগদ</option>
                  <option>Facebook</option>
                  <option>WhatsApp</option>
                  <option>Email</option>
                  <option>ওয়েবসাইট</option>
                  <option>অন্যান্য</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">বিবরণ</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="কীভাবে প্রতারণার চেষ্টা করা হয়েছে তা বর্ণনা করুন..."
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 resize-none"
                style={inputStyle}
                onFocus={inputFocus as React.FocusEventHandler<HTMLTextAreaElement>}
                onBlur={inputBlur as React.FocusEventHandler<HTMLTextAreaElement>}
              />
            </div>

            {submitSuccess && submitResult ? (
              <div
                className="rounded-xl p-5 slide-up"
                style={{
                  background: submitResult.is_phishing ? 'rgba(255,68,68,0.05)' : 'rgba(34,197,94,0.05)',
                  border: `1px solid ${submitResult.is_phishing ? 'rgba(255,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                }}
              >
                <p className="font-bold text-white mb-3 flex items-center gap-2">
                  <span style={{ color: '#22c55e' }}>✅</span> রিপোর্ট সফলভাবে জমা হয়েছে!
                </p>
                <div className="flex items-center gap-6">
                  <ConfidenceMeter value={submitResult.confidence} size={120} />
                  <div className="flex-1">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                      style={{
                        backgroundColor: submitResult.is_phishing ? 'rgba(255,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: submitResult.is_phishing ? '#ff4444' : '#22c55e',
                      }}
                    >
                      {submitResult.is_phishing ? '⚠️ ফিশিং চিহ্নিত' : '✅ নিরাপদ'}
                    </span>
                    <p className="text-sm text-slate-300">{submitResult.reason}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  {[
                    {
                      label: 'Threat Type',
                      value: THREAT_TYPES.find(tt => tt.value === threatType)?.label ?? '—',
                      color: '#00e5c4',
                    },
                    {
                      label: 'Risk Score',
                      value: submitResult.risk_level === 'critical' ? 'Critical'
                           : submitResult.risk_level === 'high'     ? 'High'
                           : submitResult.risk_level === 'medium'   ? 'Medium' : 'Safe',
                      color: submitResult.risk_level === 'critical' ? '#ff4444'
                           : submitResult.risk_level === 'high'     ? '#f59e0b'
                           : submitResult.risk_level === 'medium'   ? '#3b82f6' : '#22c55e',
                    },
                    {
                      label: 'AI Confidence',
                      value: `${submitResult.confidence}%`,
                      color: '#00e5c4',
                    },
                    {
                      label: 'Source Match',
                      value: submitResult.is_phishing ? 'Pattern matched' : 'No match',
                      color: submitResult.is_phishing ? '#ff4444' : '#22c55e',
                    },
                  ].map(s => (
                    <div
                      key={s.label}
                      className="rounded-lg p-3 text-center"
                      style={{ backgroundColor: 'rgba(6,13,26,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    className="text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                    onClick={() => { setSubmitSuccess(false); setThreatType(''); setForm({ detail: '', district: 'Dhaka', platform: '', description: '' }) }}
                  >
                    আরো রিপোর্ট করুন
                  </button>
                  <Link
                    href="/monitor"
                    className="text-sm px-4 py-2 rounded-full font-semibold transition-all hover:scale-105"
                    style={{ border: '1px solid rgba(0,229,196,0.4)', color: '#00e5c4', backgroundColor: 'rgba(0,229,196,0.06)' }}
                  >
                    {t('view_in_monitor')}
                  </Link>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !threatType || !form.detail.trim()}
                className="btn-primary w-full py-3.5"
              >
                {submitting ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    {t('submitting_text')}
                  </span>
                ) : `${t('submit_report_btn')} →`}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Top Scams This Week (context, below the form) ── */}
      <section>
        <h2 className="font-heading text-xl font-bold text-white mb-4">🔥 {t('trending_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {trendLoading
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-28 rounded-xl shimmer-base" style={{ backgroundColor: 'rgba(13,24,41,0.8)' }} />
              ))
            : trending.slice(0, 3).map((tr, i) => (
                <div
                  key={tr.id}
                  className="rounded-xl p-5 hover-reveal fade-in-up"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(13,24,41,0.9) 100%)'
                      : i === 1
                      ? 'linear-gradient(135deg, rgba(148,163,184,0.06) 0%, rgba(13,24,41,0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(205,124,59,0.06) 0%, rgba(13,24,41,0.9) 100%)',
                    border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.2)' : i === 1 ? 'rgba(148,163,184,0.15)' : 'rgba(205,124,59,0.15)'}`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="font-heading font-bold text-3xl"
                      style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7c3b' }}
                    >
                      #{i + 1}
                    </span>
                    <span className="text-2xl">
                      {tr.category === 'SMS' ? '💬' : tr.category === 'URL' ? '🔗' : tr.category === 'Facebook' ? '👤' : '🌐'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-2">{tr.title}</p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{tr.division}</span>
                    <span style={{ color: '#ff4444', fontWeight: 700 }}>{tr.count} রিপোর্ট</span>
                  </div>
                </div>
              ))}
        </div>
      </section>
      </div>
    </div>
  )
}
