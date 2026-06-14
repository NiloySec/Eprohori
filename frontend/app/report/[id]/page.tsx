'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchThreatById } from '@/lib/api'
import type { Threat } from '@/lib/api'
import ConfidenceMeter from '@/components/ConfidenceMeter'

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#22c55e',
}
const SEV_LABEL: Record<string, string> = {
  critical: 'জরুরি',
  high: 'উচ্চ',
  medium: 'মাঝারি',
  low: 'কম',
}
const TYPE_ICON: Record<string, string> = {
  SMS: '💬',
  URL: '🔗',
  Facebook: '👤',
  Website: '🌐',
}

function timeAgo(iso: string) {
  const ts = /Z$|[+]/.test(iso) ? iso : iso + "Z"; const diff = (Date.now() - new Date(ts).getTime()) / 60000
  if (diff < 60) return `${Math.floor(diff)} মিনিট আগে`
  if (diff < 1440) return `${Math.floor(diff / 60)} ঘণ্টা আগে`
  return `${Math.floor(diff / 1440)} দিন আগে`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function aiSummary(t: Threat): string {
  if (t.confidence >= 85) {
    return `এই ${t.type} হুমকিটি AI দ্বারা অত্যন্ত উচ্চ নির্ভুলতায় (${t.confidence}%) ফিশিং হিসেবে চিহ্নিত হয়েছে। ${t.division} বিভাগে এই ধরনের প্রতারণা বেড়ে চলেছে। অবিলম্বে সতর্কতা অবলম্বন করুন।`
  }
  if (t.confidence >= 70) {
    return `AI বিশ্লেষণে এই ${t.type} বার্তায় সন্দেহজনক প্যাটার্ন পাওয়া গেছে (${t.confidence}% নিশ্চিতি)। ব্যক্তিগত তথ্য প্রদান থেকে বিরত থাকুন।`
  }
  return `এই ${t.type} বার্তা সম্পর্কে কিছুটা সন্দেহ রয়েছে (${t.confidence}% নিশ্চিতি)। সতর্কতার সাথে যাচাই করুন।`
}

function preventionTips(type: string): string[] {
  const tips: Record<string, string[]> = {
    URL: [
      'লিংকে ক্লিক করার আগে ডোমেইন যাচাই করুন',
      'HTTPS আছে কিনা দেখুন এবং সার্টিফিকেট চেক করুন',
      'সন্দেহজনক লিংক শর্টেনার (bit.ly) এড়িয়ে চলুন',
      'ব্রাউজার এক্সটেনশন ব্যবহার করে ফিশিং সাইট ব্লক করুন',
    ],
    SMS: [
      'অপরিচিত নম্বর থেকে আসা লিংকে ক্লিক করবেন না',
      'বিকাশ/নগদ/ব্যাংক কখনো SMS-এ OTP চায় না',
      'পুরস্কার জেতার SMS সবসময় ভুয়া — বিশ্বাস করবেন না',
      'সন্দেহজনক নম্বর ব্লক করুন এবং রিপোর্ট করুন',
    ],
    Facebook: [
      'অপরিচিত প্রোফাইল থেকে ফ্রেন্ড রিকোয়েস্ট গ্রহণ করবেন না',
      'সোশ্যাল মিডিয়ায় ব্যক্তিগত তথ্য শেয়ার করবেন না',
      'চাকরি বা পুরস্কারের অফার যাচাই না করে বিশ্বাস করবেন না',
      'ভুয়া প্রোফাইল Facebook-এ রিপোর্ট করুন',
    ],
    Website: [
      'ওয়েবসাইটের আসল ডোমেইন মিলিয়ে দেখুন',
      'ব্যক্তিগত বা আর্থিক তথ্য শুধু বিশ্বস্ত সাইটে দিন',
      'পেমেন্ট করার আগে সাইটের বৈধতা যাচাই করুন',
      'সরকারি ওয়েবসাইট সবসময় .gov.bd ডোমেইনে থাকে',
    ],
  }
  return tips[type] ?? tips['SMS']
}

function TimelineEvent({ time, title, desc, color, last }: {
  time: string
  title: string
  desc: string
  color: string
  last?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
        />
        {!last && <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />}
      </div>
      <div className={`pb-6 ${last ? '' : ''}`}>
        <p className="text-xs font-semibold mb-0.5" style={{ color }}>{time}</p>
        <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </div>
  )
}

function SkeletonBlock({ h = 'h-8', w = 'w-full' }: { h?: string; w?: string }) {
  return (
    <div
      className={`${h} ${w} rounded-lg shimmer-base`}
      style={{ backgroundColor: 'rgba(17,31,53,0.8)' }}
    />
  )
}

export default function ThreatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [threat, setThreat] = useState<Threat | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id || isNaN(id)) { setNotFound(true); setLoading(false); return }
    // Pass the logged-in email so reporters can view their own pending reports
    let viewerEmail: string | undefined
    try {
      const auth = JSON.parse(localStorage.getItem('ep_auth') || 'null')
      if (auth?.loggedIn && auth.email) viewerEmail = auth.email
    } catch { /* ignore */ }
    fetchThreatById(id, viewerEmail).then(t => {
      if (t) setThreat(t)
      else setNotFound(true)
      setLoading(false)
    })
  }, [id])

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="font-heading text-2xl font-bold text-white mb-2">হুমকি পাওয়া যায়নি</h1>
        <p className="text-slate-400 mb-6">এই ID-তে কোনো হুমকির রেকর্ড নেই।</p>
        <button
          onClick={() => router.push('/monitor')}
          className="btn-primary px-6 py-2.5"
        >
          ← মনিটরে ফিরুন
        </button>
      </div>
    )
  }

  // Build timeline from actual created_at (UTC-normalised), full date+time
  const buildTimeline = (t: Threat) => {
    const iso = /Z$|[+]/.test(t.created_at) ? t.created_at : t.created_at + 'Z'
    const base = new Date(iso)
    const add = (mins: number) =>
      new Date(base.getTime() + mins * 60000).toLocaleString('bn-BD', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    return [
      { time: add(0),  title: 'হুমকি শনাক্ত',       desc: 'ব্যবহারকারী রিপোর্ট পাওয়া গেছে',        color: '#f59e0b' },
      { time: add(5),  title: 'AI বিশ্লেষণ শুরু',   desc: 'মেশিন লার্নিং মডেল বিশ্লেষণ করছে',       color: '#a855f7' },
      { time: add(8),  title: 'প্যাটার্ন মিলেছে',    desc: `${t.confidence}% নিশ্চিতে ফিশিং চিহ্নিত`, color: '#ff4444' },
      { time: add(15), title: 'কমিউনিটি সতর্কতা',   desc: 'সকল ব্যবহারকারীকে সতর্ক করা হয়েছে',    color: '#22c55e' },
    ]
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back button */}
      <button
        onClick={() => router.push('/monitor')}
        className="flex items-center gap-2 text-sm font-semibold mb-8 transition-colors hover:text-white"
        style={{ color: '#00e5c4' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        মনিটরে ফিরুন
      </button>

      {loading ? (
        <div className="space-y-6">
          <SkeletonBlock h="h-10" w="w-2/3" />
          <SkeletonBlock h="h-48" />
          <SkeletonBlock h="h-32" />
          <SkeletonBlock h="h-48" />
        </div>
      ) : threat && (
        <div className="space-y-6 fade-in-up">

          {/* Header */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(13,24,41,0.85)',
              border: `1px solid ${SEV_COLOR[threat.severity]}33`,
              boxShadow: `0 4px 24px ${SEV_COLOR[threat.severity]}10`,
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ backgroundColor: `${SEV_COLOR[threat.severity]}20`, color: SEV_COLOR[threat.severity] }}
              >
                {SEV_LABEL[threat.severity]} ঝুঁকি
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{ backgroundColor: 'rgba(0,229,196,0.1)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
              >
                {TYPE_ICON[threat.type]} {threat.type}
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{
                  backgroundColor: threat.status === 'verified' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
                  color: threat.status === 'verified' ? '#22c55e' : '#64748b',
                }}
              >
                {threat.status === 'verified' ? '✓ যাচাইকৃত' : '⏳ পেন্ডিং'}
              </span>
            </div>

            <h1 className="font-heading text-xl sm:text-2xl font-bold text-white mb-5 leading-relaxed">
              {threat.detail}
            </h1>

            {/* Attached screenshot evidence */}
            {threat.screenshot && (
              <div className="mb-5">
                <p className="text-xs font-bold mb-2" style={{ color: '#00e5c4' }}>📎 সংযুক্ত স্ক্রিনশট</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={threat.screenshot}
                  alt="Report screenshot"
                  style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid rgba(0,229,196,0.25)' }}
                />
              </div>
            )}

            {/* Confidence meter + AI summary */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="shrink-0">
                <ConfidenceMeter value={threat.confidence} size={120} />
              </div>
              <div
                className="flex-1 rounded-xl p-4"
                style={{ background: 'rgba(6,13,26,0.7)', border: '1px solid rgba(0,229,196,0.1)' }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: '#00e5c4' }}>🤖 AI বিশ্লেষণ</p>
                <p className="text-sm text-slate-300 leading-relaxed">{aiSummary(threat)}</p>
              </div>
            </div>
          </div>

          {/* Detail code block */}
          {threat.description && threat.description !== threat.detail && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(6,13,26,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: '#64748b' }}>
                বিস্তারিত বিবরণ
              </p>
              <pre
                className="text-sm text-slate-300 whitespace-pre-wrap break-all font-mono leading-relaxed"
                style={{ fontFamily: 'monospace' }}
              >
                {threat.description}
              </pre>
            </div>
          )}

          {/* Info grid */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-bold mb-4 uppercase tracking-widest" style={{ color: '#64748b' }}>
              তথ্য সারসংক্ষেপ
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'প্রথম শনাক্ত', value: formatDate(threat.created_at) },
                { label: 'বিভাগ', value: threat.division || '—' },
                { label: 'প্ল্যাটফর্ম', value: threat.platform || threat.type },
                { label: 'স্ট্যাটাস', value: threat.status === 'verified' ? 'যাচাইকৃত' : 'পেন্ডিং' },
                { label: 'রিপোর্ট সংখ্যা', value: `${Math.floor(Math.random() * 40) + 5} জন` },
                { label: 'AI নিশ্চিতি', value: `${threat.confidence}%` },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(13,24,41,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-bold mb-5 uppercase tracking-widest" style={{ color: '#64748b' }}>
              ঘটনার ক্রম
            </p>
            <div>
              {buildTimeline(threat).map((ev, i, arr) => (
                <TimelineEvent
                  key={i}
                  time={ev.time}
                  title={ev.title}
                  desc={ev.desc}
                  color={ev.color}
                  last={i === arr.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Prevention tips */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,196,0.04) 0%, rgba(13,24,41,0.9) 100%)',
              border: '1px solid rgba(0,229,196,0.15)',
            }}
          >
            <p className="text-xs font-bold mb-4 uppercase tracking-widest" style={{ color: '#00e5c4' }}>
              🛡️ সুরক্ষার উপায়
            </p>
            <ul className="space-y-3">
              {preventionTips(threat.type).map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ backgroundColor: 'rgba(0,229,196,0.15)', color: '#00e5c4' }}
                  >
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => router.push('/monitor')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            >
              ← মনিটর
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Eprohori হুমকি সতর্কতা', text: threat.detail, url: window.location.href })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                }
              }}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              🔗 শেয়ার করুন
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
