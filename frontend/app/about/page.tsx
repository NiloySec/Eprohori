'use client'
import { useEffect, useRef, useState } from 'react'
import { fetchStats } from '@/lib/api'
import type { Stats } from '@/lib/api'
import PressSection from '@/components/PressSection'

function useCountUp(target: number, start: boolean, duration = 1800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || target === 0) return
    const t0 = Date.now()
    const frame = () => {
      const prog = Math.min((Date.now() - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - prog, 3)
      setCount(Math.floor(ease * target))
      if (prog < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [target, start, duration])
  return count
}

function ImpactStats({ stats }: { stats: Stats | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect() } },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const totalReports = useCountUp(stats?.total_threats ?? 0, visible)
  const neutralized  = useCountUp(stats?.active_threats ?? 0, visible)
  const members      = useCountUp(stats?.rangers_count ?? 0, visible, 1500)
  const districts    = useCountUp(64, visible, 1200)

  const cards = [
    { label: 'মোট রিপোর্ট',          value: totalReports, icon: '📊', color: '#00e5c4' },
    { label: 'নিষ্ক্রিয় করা হুমকি',  value: neutralized,  icon: '🛡️', color: '#ff4444' },
    { label: 'কমিউনিটি সদস্য',       value: members,      icon: '👥', color: '#f59e0b' },
    { label: 'জেলা কভারেজ',          value: districts,    icon: '🗺️', color: '#3b82f6' },
  ]

  return (
    <div ref={ref}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {cards.map(s => (
          <div
            key={s.label}
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: '#0d1829', border: `1px solid ${s.color}33` }}
          >
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="font-heading text-3xl font-bold mb-1 count-glow" style={{ color: s.color }}>
              {s.value.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-slate-400 text-sm">
        প্রতিটি রিপোর্ট বাংলাদেশকে আরো নিরাপদ করে। <span style={{ color: '#00e5c4' }}>Every report makes Bangladesh safer.</span>
      </p>
    </div>
  )
}

export default function AboutPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetchStats().then(setStats)
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">

      {/* ── 1. Hero ── */}
      <div className="text-center mb-16">
        <h1 className="font-heading text-4xl font-bold mb-4" style={{ color: '#00e5c4' }}>
          About Eprohori
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          বাংলাদেশে প্রতিদিন লক্ষ লক্ষ মানুষ সাইবার প্রতারণার শিকার হচ্ছেন। Eprohori হলো বাংলাদেশের প্রথম ক্রাউডসোর্সড সাইবার থ্রেট প্ল্যাটফর্ম — যেখানে সাধারণ মানুষ মিলে দেশকে নিরাপদ রাখে।
        </p>
      </div>

      {/* ── 2. Our Vision ── */}
      <section className="mb-16">
        <h2 className="font-heading text-2xl font-bold text-white mb-6">🎯 Our Vision</h2>
        <div
          className="rounded-xl p-6 mb-6 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,196,0.07) 0%, rgba(59,130,246,0.05) 100%)',
            border: '1px solid rgba(0,229,196,0.2)',
          }}
        >
          <p className="text-lg text-slate-200 leading-relaxed italic">
            &ldquo;A Bangladesh where every citizen can protect themselves and others from cyber threats through collective intelligence.&rdquo;
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🤝', title: 'Community-Powered',    desc: 'Citizens report threats' },
            { icon: '🛡️', title: 'Eprohori-Verified',      desc: 'Platform verifies every report' },
            { icon: '🇧🇩', title: 'Nationally Protected', desc: 'Everyone stays safe' },
          ].map(c => (
            <div
              key={c.title}
              className="text-center p-5 rounded-xl"
              style={{ backgroundColor: '#0d1829', border: '1px solid rgba(0,229,196,0.1)' }}
            >
              <div className="text-3xl mb-2">{c.icon}</div>
              <p className="font-semibold text-white text-sm mb-1">{c.title}</p>
              <p className="text-xs text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Our Solution ── */}
      <section className="mb-16">
        <h2 className="font-heading text-2xl font-bold text-white mb-6">💡 Our Solution</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📡', title: 'Crowdsourced Intelligence', desc: '5,772+ real Bengali phishing samples' },
            { icon: '🛡️', title: 'Eprohori Detection',          desc: 'Trained on real Bangladesh data' },
            { icon: '⚡', title: 'Real-time Alerts',           desc: 'Instant community notifications' },
          ].map(c => (
            <div
              key={c.title}
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="text-3xl mb-3">{c.icon}</div>
              <p className="font-semibold text-white mb-2">{c.title}</p>
              <p className="text-sm text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Collective Impact ── */}
      <section className="mb-16">
        <h2 className="font-heading text-2xl font-bold text-white mb-6">🌍 Collective Impact</h2>
        <ImpactStats stats={stats} />
      </section>

      {/* ── 5. Contact ── */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-white mb-6">📬 যোগাযোগ</h2>
        <div className="rounded-xl p-6" style={{ backgroundColor: '#0d1829', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              💻 GitHub:{' '}
              <a href="https://github.com/eprohori" target="_blank" rel="noopener noreferrer" style={{ color: '#00e5c4' }}>
                github.com/eprohori
              </a>
            </p>
            <p>
              🏛️ CIRT Bangladesh:{' '}
              <a href="https://www.cirt.gov.bd" target="_blank" rel="noopener noreferrer" style={{ color: '#00e5c4' }}>
                cirt.gov.bd
              </a>
            </p>
            <p>📧 <a href="mailto:eprohori.tech@gmail.com" style={{ color: '#00e5c4' }}>eprohori.tech@gmail.com</a></p>
            <p>🆘 সাইবার অপরাধ হেল্পলাইন: <strong className="text-white">999</strong></p>
          </div>
        </div>
      </section>

      {/* ── 6. Partnerships ── */}
      <PressSection />
    </div>
  )
}
