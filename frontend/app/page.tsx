'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchStats, validateText } from '@/lib/api'
import type { Stats, ValidationResult } from '@/lib/api'
import { StatCardSkeleton } from '@/components/Skeleton'
import ConfidenceMeter from '@/components/ConfidenceMeter'
import { useLanguage } from '@/lib/LanguageContext'
import SavedFeedback from '@/components/SavedFeedback'

/* ── Demo fallback data (shown when backend has no records yet) ── */
const TAGLINES = ['ফিশিং থেকে সুরক্ষিত', 'স্ক্যাম চিহ্নিত করুন', 'দেশকে নিরাপদ রাখুন']

/* ── Hooks ─────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const prog    = Math.min(elapsed / duration, 1)
      const ease    = 1 - Math.pow(1 - prog, 3)
      setCount(Math.floor(ease * target))
      if (prog < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [target, duration])
  return count
}

function useTypingEffect(words: string[], speed = 65, pause = 2400) {
  const [display, setDisplay]   = useState('')
  const [wordIdx, setWordIdx]   = useState(0)
  const [charIdx, setCharIdx]   = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const word = words[wordIdx]
    let timeout: ReturnType<typeof setTimeout>
    if (!deleting && charIdx < word.length) {
      timeout = setTimeout(() => setCharIdx(c => c + 1), speed)
    } else if (!deleting && charIdx === word.length) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), speed / 2)
    } else {
      setDeleting(false)
      setWordIdx(i => (i + 1) % words.length)
    }
    setDisplay(word.slice(0, charIdx))
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, wordIdx, words, speed, pause])
  return display
}

function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.1 }
    )
    // Observe all current + future .reveal elements
    // Re-query after data loads (stats/threats/alerts render conditionally)
    const observe = () =>
      document.querySelectorAll<Element>('.reveal:not(.revealed)').forEach(el => io.observe(el))

    observe()
    const t1 = setTimeout(observe, 150)   // after first render
    const t2 = setTimeout(observe, 600)   // after API data arrives
    const t3 = setTimeout(observe, 1400)  // after animations settle

    return () => {
      io.disconnect()
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])
}

/* ── Signal analyser (client-side, no backend call) ────────────── */
interface Signal { label: string; matched: boolean }

function analyzeSignals(text: string): Signal[] {
  const t = text.toLowerCase()
  return [
    {
      label: 'সন্দেহজনক ডোমেইন',
      matched: /\.(tk|xyz|click|ga|ml|cf|gq|pw|top|loan|win|bid)\b|bit\.ly|tinyurl|shorturl/.test(t),
    },
    {
      label: 'জরুরিতার ভাষা',
      matched: /জরুরি|এখনই|বন্ধ হবে|সীমিত|শেষ সুযোগ|urgent|immediately|expire|block|limited/.test(t),
    },
    {
      label: 'আর্থিক প্রলোভন',
      matched: /টাকা|লটারি|জিতেছেন|পুরস্কার|বিনামূল্যে|prize|reward|bonus|free|winner|cash/.test(t),
    },
    {
      label: 'সংবেদনশীল তথ্য চাওয়া',
      matched: /otp|pin|পিন|ওটিপি|পাসওয়ার্ড|password|card.?number|কার্ড নম্বর|account.?number|nid/.test(t),
    },
    {
      label: 'পরিচিত ব্র্যান্ড অনুকরণ',
      matched: /bkash|bikash|b-kash|nagad|surecash|rocket|dutch.?bangla|dbbl|bank.?asia|islami.?bank|sonali.?bank/.test(t),
    },
  ]
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function HomePage() {
  // Slower typing + longer pause so each line finishes fully before the next
  const tagline                         = useTypingEffect(TAGLINES, 90, 3000)
  const { t, lang }                     = useLanguage()
  const [stats, setStats]               = useState<Stats | null>(null)
  const [scanTab, setScanTab]           = useState<'url' | 'sms'>('url')
  const [scanInput, setScanInput]       = useState('')
  const [scanning, setScanning]         = useState(false)
  const [scanResult, setScanResult]     = useState<ValidationResult | null>(null)

  /* Real live values from /api/stats (no demo fallback — keep the numbers honest & dynamic) */
  const D = stats
    ? {
        today_reports:     stats.today_reports     ?? 0,
        active_threats:    stats.active_threats    ?? 0,
        alerted_people:    stats.alerted_people    ?? 0,
        district_coverage: stats.district_coverage ?? 0,
      }
    : { today_reports: 0, active_threats: 0, alerted_people: 0, district_coverage: 0 }

  const today     = useCountUp(D.today_reports)
  const active    = useCountUp(D.active_threats)
  const alerted   = useCountUp(D.alerted_people)
  const districts = useCountUp(D.district_coverage)

  /* Activate scroll reveal */
  useScrollReveal()

  useEffect(() => {
    fetchStats().then(setStats)
  }, [])

  const handleScan = async () => {
    if (!scanInput.trim()) return
    setScanning(true)
    setScanResult(null)
    const res = await validateText(scanInput.trim(), scanTab)
    setScanResult(res)
    setScanning(false)
  }



  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden grid-bg"
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
      >
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,229,196,0.07) 0%, transparent 70%)',
        }} />
        <div className="absolute top-0 left-0 pointer-events-none" style={{
          width: '40vw', height: '40vw', maxWidth: '500px',
          background: 'radial-gradient(circle, rgba(0,229,196,0.05) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
        }} />
        <div className="absolute bottom-0 right-0 pointer-events-none" style={{
          width: '35vw', height: '35vw', maxWidth: '400px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          transform: 'translate(30%, 30%)',
        }} />

        {/* Premium ambient mesh */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none -z-0"
             style={{ width: 800, height: 800, borderRadius: '50%',
                      background: 'rgba(0,229,196,0.15)', filter: 'blur(120px)', opacity: 0.3 }} />

        <div className="relative max-w-4xl mx-auto px-4 text-center py-16 md:py-20 z-10">
          {/* Eyebrow — live crowdsourced badge with rotating tagline */}
          <div className="flex justify-center mb-5 fade-in-up-1">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(0,229,196,0.1)', border: '1px solid rgba(0,229,196,0.3)', color: '#00e5c4' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#00e5c4' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00e5c4' }} />
              </span>
              {tagline}
            </span>
          </div>
          {/* Headline — Bengali needs smaller sizes + looser line-height to avoid overflow */}
          <h1
            className={`font-heading mb-4 gradient-text fade-in-up-1 max-w-5xl mx-auto ${
              lang === 'bn'
                ? 'bn-heading text-3xl md:text-5xl lg:text-6xl font-semibold'
                : 'text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight'
            }`}
            style={
              lang === 'bn'
                ? { lineHeight: 1.4, letterSpacing: 0, wordBreak: 'keep-all' }
                : { lineHeight: '1.05', letterSpacing: '-0.03em' }
            }
          >
            {t('hero_title').split('|').map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>
          <h2
            className="font-heading font-medium mb-8 text-white fade-in-up-2"
            style={{ fontSize: 'clamp(1.05rem,2.4vw,1.5rem)', lineHeight: '1.35', letterSpacing: '-0.015em' }}
          >
            {t('hero_subtitle')}
          </h2>
          {/* CTA Buttons — primary solid, secondary ghost */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 fade-in-up-4">
            <Link
              href="/report"
              className="btn-primary px-8 py-3.5"
              style={{ borderRadius: '14px', fontSize: '1rem', textDecoration: 'none' }}
            >
              {t('report_btn')}
            </Link>
            <button
              onClick={() => document.getElementById('quick-scan')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 rounded-xl font-heading font-bold text-base transition-all"
              style={{ border: '1px solid rgba(148,163,184,0.25)', color: '#cbd5e1', backgroundColor: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,196,0.5)'; e.currentTarget.style.color = '#00e5c4' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.25)'; e.currentTarget.style.color = '#cbd5e1' }}
            >
              {t('validate_btn')}
            </button>
          </div>
        </div>
      </section>

      {/* ── What EProhori detects ─────────────────────────────── */}
      <section className="py-16 px-4" style={{ backgroundColor: '#0d1829' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 fade-in-up">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#00e5c4' }}>
              কী থেকে সুরক্ষা
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-3">
              EProhori যা যা শনাক্ত করে
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              বাংলাদেশে সবচেয়ে বেশি যে সাইবার প্রতারণাগুলো ঘটে — EProhori সেকেন্ডেই যাচাই করে।
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '💬', color: '#00e5c4', title: 'ফিশিং SMS', desc: 'ভুয়া bKash/নগদ পুরস্কার, OTP চাওয়া, অ্যাকাউন্ট বন্ধের হুমকি' },
              { icon: '🔗', color: '#3b82f6', title: 'স্ক্যাম লিংক', desc: 'নকল ব্যাংক/পেমেন্ট সাইট, সন্দেহজনক shortlink, ফিশিং URL' },
              { icon: '👤', color: '#f59e0b', title: 'ভুয়া অফার', desc: 'ভুয়া চাকরি, লোভনীয় investment, online প্রতারণা' },
              { icon: '🎓', color: '#a855f7', title: 'বৃত্তি প্রতারণা', desc: 'ভুয়া scholarship, লটারি জেতার মিথ্যা বার্তা' },
            ].map((c, idx) => (
              <div
                key={c.title}
                className="rounded-2xl p-5 fade-in-up transition hover:border-white/15"
                style={{
                  background: `linear-gradient(135deg, ${c.color}0d 0%, rgba(6,13,26,0.6) 100%)`,
                  border: `1px solid ${c.color}22`,
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ backgroundColor: `${c.color}1a`, border: `1px solid ${c.color}33` }}>
                  {c.icon}
                </div>
                <h3 className="font-heading text-base font-bold text-white mb-1.5">{c.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Scan ────────────────────────────────────────── */}
      <section id="quick-scan" className="py-14 px-4" style={{ backgroundColor: '#060d1a' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 fade-in-up">
            <h2 className="font-heading text-3xl font-bold text-white mb-2">{t('quick_scan_title')}</h2>
            <p className="text-slate-400 text-sm">{t('quick_scan_desc')}</p>
          </div>
          <div
            className={`fade-in-up ${scanning ? 'scan-line-wrap' : ''}`}
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              background: 'rgba(17,31,53,0.8)',
              border: '1px solid rgba(0,229,196,0.18)',
              boxShadow: scanning ? '0 0 40px rgba(0,229,196,0.15)' : '0 4px 24px rgba(0,0,0,0.3)',
              transition: 'box-shadow 0.3s',
            }}
          >
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[{ key: 'url', label: t('scan_url_tab') }, { key: 'sms', label: t('scan_sms_tab') }].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setScanTab(tab.key as 'url' | 'sms'); setScanResult(null); setScanInput('') }}
                  className="flex-1 py-3.5 font-semibold text-sm transition-all"
                  style={{
                    color: scanTab === tab.key ? '#00e5c4' : '#64748b',
                    borderBottom: scanTab === tab.key ? '2px solid #00e5c4' : '2px solid transparent',
                    backgroundColor: scanTab === tab.key ? 'rgba(0,229,196,0.04)' : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              <input
                value={scanInput}
                onChange={e => { setScanInput(e.target.value); setScanResult(null) }}
                placeholder={scanTab === 'url' ? t('scan_url_placeholder') : t('scan_sms_placeholder')}
                className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ backgroundColor: '#060d1a', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,229,196,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,229,196,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') { handleScan() } }}
              />
              <button
                onClick={handleScan}
                disabled={scanning || !scanInput.trim()}
                className="btn-primary w-full py-3.5"
              >
                {scanning ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    {t('scanning_text')}
                  </span>
                ) : t('scan_btn')}
              </button>
            </div>

            {scanResult && (
              <div className="px-6 pb-6 slide-up">
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: scanResult.is_phishing ? 'rgba(255,68,68,0.05)' : 'rgba(34,197,94,0.05)',
                    border: `1px solid ${scanResult.is_phishing ? 'rgba(255,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                  }}
                >
                  <div className="flex items-center gap-6">
                    <ConfidenceMeter value={scanResult.confidence} size={120} />
                    <div className="flex-1">
                      {scanTab === 'url' && scanInput && (
                        <p className="text-xs font-mono mb-2" style={{ color: '#64748b' }}>
                          🔗 {(() => {
                            try { return new URL(scanInput).hostname }
                            catch { return scanInput.replace(/^https?:\/\//, '').split('/')[0].split('?')[0] }
                          })()}
                        </p>
                      )}
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
                        style={{
                          backgroundColor: scanResult.is_phishing ? 'rgba(255,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                          color: scanResult.is_phishing ? '#ff4444' : '#22c55e',
                        }}
                      >
                        {scanResult.is_phishing ? t('result_phishing') : t('result_safe')}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed">{scanResult.reason}</p>
                    </div>
                  </div>

                  {/* Matched signals — always visible, only reasons that fired */}
                  {analyzeSignals(scanInput).some(s => s.matched) && (
                    <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      {analyzeSignals(scanInput).filter(s => s.matched).map(sig => (
                        <span
                          key={sig.label}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: 'rgba(255,68,68,0.12)',
                            border: '1px solid rgba(255,68,68,0.3)',
                            color: '#ff6b6b',
                          }}
                        >
                          🔴 {sig.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {scanResult.is_phishing && (
                  <div className="mt-3 space-y-3">
                    <Link
                      href="/report"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('ep_prefill_report', JSON.stringify({
                            text: scanInput.trim(),
                            type: scanTab === 'url' ? 'website' : 'sms',
                            confidence: scanResult?.confidence ?? null,
                          }))
                        } catch { /* ignore */ }
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition"
                      style={{ background: 'linear-gradient(135deg, #ff4444 0%, #c81e1e 100%)', color: '#fff', textDecoration: 'none' }}
                    >
                      🚨 এটা রিপোর্ট করুন — কমিউনিটিকে সতর্ক করুন
                    </Link>
                    <SavedFeedback source="scan" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Platform Stats ────────────────────────────────────── */}
      <section className="py-14 px-4" style={{ backgroundColor: '#0d1829' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 fade-in-up">
            <h2 className="font-heading text-3xl font-bold text-white mb-2">{t('platform_stats_title')}</h2>
            <p className="text-slate-400 text-sm">{t('platform_stats_desc')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats === null
              ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
              : [
                  { label: t('stat_today'),     value: today,     icon: '📊', color: '#00e5c4', grad: 'rgba(0,229,196,0.08)' },
                  { label: t('stat_threats'),   value: active,    icon: '⚠️', color: '#ff4444', grad: 'rgba(255,68,68,0.07)' },
                  { label: t('stat_alerted'),   value: alerted,   icon: '👥', color: '#22c55e', grad: 'rgba(34,197,94,0.07)'  },
                  { label: t('stat_districts'), value: districts, icon: '🗺️', color: '#3b82f6', grad: 'rgba(59,130,246,0.07)' },
                ].map((s, idx) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-5 hover-reveal fade-in-up"
                    style={{
                      background: `linear-gradient(135deg, ${s.grad} 0%, rgba(13,24,41,0.9) 100%)`,
                      border: `1px solid ${s.color}22`,
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  >
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="font-heading font-bold text-3xl mb-1 count-glow" style={{ color: s.color }}>
                      {s.value.toLocaleString('bn-BD')}
                    </div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
          </div>
        </div>
      </section>
    </div>
  )
}
