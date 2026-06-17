'use client'
import { useEffect, useState } from 'react'
import { fetchStats } from '@/lib/api'
import type { Stats } from '@/lib/api'
import PageHero from '@/components/PageHero'

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
    const id = setInterval(() => fetchStats().then(setStats).catch(() => {}), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <PageHero
        icon="📊"
        eyebrow="Live · প্রতি ৩০ সেকেন্ডে আপডেট"
        title="পরিসংখ্যান"
        lead="Eprohori platform জুড়ে real-time সাইবার থ্রেট ডেটা — সম্পূর্ণ স্বচ্ছ ও public।"
      />
      <div className="max-w-7xl mx-auto px-6 pb-20 text-slate-200">

      {loading && <div className="text-center text-slate-500 py-10">Loading...</div>}

      {stats && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <Stat label="মোট রিপোর্ট" value={stats.total_threats ?? 0} accent="#00e5c4" />
            <Stat label="আজ" value={stats.today_reports ?? 0} accent="#fbbf24" />
            <Stat label="যাচাইকৃত হুমকি" value={stats.active_threats ?? 0} accent="#ef4444" />
            <Stat label="সতর্ক হওয়া মানুষ" value={stats.alerted_people ?? 0} accent="#8b5cf6" />
          </section>

          <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <Stat label="জেলা কভারেজ" value={stats.district_coverage ?? 0} suffix=" / 64" accent="#22d3ee" />
            <Stat label="অপেক্ষমাণ পর্যালোচনা" value={stats.pending_count ?? 0} accent="#fb923c" />
            <Stat label="সক্রিয় Rangers" value={stats.rangers_count ?? 0} accent="#a78bfa" />
          </section>

          <section className="rounded-2xl p-8 bg-slate-900/40 border border-slate-800 mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">প্ল্যাটফর্ম স্বাস্থ্য</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Metric title="AI Detection Rate" value="৯৪%" hint="phishing/scam validation accuracy" />
              <Metric title="Avg Response Time" value="&lt; ৩ সে" hint="API latency" />
              <Metric title="Uptime (30 din)" value="৯৯.৯%" hint="service availability" />
            </div>
          </section>

          <section className="rounded-2xl p-8 bg-gradient-to-br from-cyan-900/20 to-slate-900/40 border border-cyan-500/20 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">সাহায্য করতে চান?</h2>
            <p className="text-slate-300 mb-6">আপনার সন্দেহজনক SMS, ইমেইল বা URL রিপোর্ট করে কমিউনিটিকে সুরক্ষিত রাখুন।</p>
            <a href="/report" className="inline-block px-8 py-3 rounded-full font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition">
              রিপোর্ট করুন
            </a>
          </section>
        </>
      )}
      </div>
    </div>
  )
}

function Stat({ label, value, accent, suffix = '' }: { label: string; value: number; accent: string; suffix?: string }) {
  return (
    <div className="rounded-2xl p-6 bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition">
      <div className="text-3xl font-bold mb-1" style={{ color: accent }}>{value.toLocaleString('bn-BD')}{suffix}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  )
}

function Metric({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-3xl font-bold text-white mb-1" dangerouslySetInnerHTML={{ __html: value }} />
      <div className="text-xs text-slate-500">{hint}</div>
    </div>
  )
}
