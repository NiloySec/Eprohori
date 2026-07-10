'use client'
import { useState } from 'react'
import { analyzeIncident, ChatbotAnalysis } from '@/lib/api'

export default function ChatbotPage() {
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState<'bn' | 'en'>('bn')
  const [analysis, setAnalysis] = useState<ChatbotAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError('')
    try {
      const result = await analyzeIncident(message, language)
      setAnalysis(result)
    } catch (err) {
      setError('বিশ্লেষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।')
    } finally {
      setLoading(false)
    }
  }

  const severityColor = {
    'Critical': '#ff4444',
    'High': '#f59e0b',
    'Medium': '#3b82f6',
    'Low': '#22c55e',
    'গুরুতর': '#ff4444',
    'উচ্চ': '#f59e0b',
    'মাঝারি': '#3b82f6',
    'কম': '#22c55e',
  } as Record<string, string>

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#050810' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">🤖 EProhori সহায়ক</h1>
          <p className="text-slate-400">আপনার সাইবার হুমকি বর্ণনা করুন, আমরা সমাধান দেব</p>
        </div>

        <div
          className="rounded-xl p-6 mb-8"
          style={{
            background: 'rgba(17,31,53,0.8)',
            border: '1px solid rgba(0,229,196,0.18)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  language === 'bn'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-700/30 text-slate-400 border border-slate-700/50'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  language === 'en'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-700/30 text-slate-400 border border-slate-700/50'
                }`}
              >
                English
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'আপনার সাইবার ঘটনা বর্ণনা করুন... (উদাহরণ: আমি একটি ফিশিং SMS পেয়েছি যাতে bKash লগইন লিঙ্ক ছিল)'
                  : 'Describe your cyber incident... (Example: I received a suspicious email asking for my bank details)'
              }
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
              style={{
                backgroundColor: '#060d1a',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: '120px',
                resize: 'vertical',
              }}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '🔍 বিশ্লেষণ করছে...' : language === 'bn' ? '📊 বিশ্লেষণ করুন' : '📊 Analyze'}
            </button>
          </form>
        </div>

        {error && (
          <div
            className="rounded-xl p-4 mb-8"
            style={{
              backgroundColor: 'rgba(255,68,68,0.1)',
              border: '1px solid rgba(255,68,68,0.3)',
              color: '#ff4444',
            }}
          >
            {error}
          </div>
        )}

        {analysis && (
          <div
            className="rounded-xl p-6 space-y-6"
            style={{
              background: 'rgba(17,31,53,0.8)',
              border: '1px solid rgba(0,229,196,0.18)',
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">হুমকির ধরন</p>
                <p className="text-lg font-bold text-white">{analysis.threat_type}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">গুরুত্ব</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: severityColor[analysis.severity] || '#3b82f6' }}
                  />
                  <p className="text-lg font-bold text-white">{analysis.severity}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-slate-400 text-sm mb-2">আত্মবিশ্বাস</p>
              <div className="w-full bg-slate-700/30 rounded-lg h-3 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${analysis.confidence * 100}%`,
                    backgroundColor: '#00e5c4',
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{Math.round(analysis.confidence * 100)}%</p>
            </div>

            <div>
              <p className="text-slate-400 text-sm mb-2">বর্ণনা</p>
              <p className="text-slate-300">{analysis.description}</p>
            </div>

            <div>
              <p className="text-slate-400 text-sm mb-3 font-semibold">সমাধানের ধাপগুলি:</p>
              <ol className="space-y-2">
                {analysis.solution_steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: '#00e5c4', color: '#050810' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-slate-300 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {analysis.prevention_tips.length > 0 && (
              <div>
                <p className="text-slate-400 text-sm mb-3 font-semibold">💡 প্রতিরোধ টিপস:</p>
                <ul className="space-y-2">
                  {analysis.prevention_tips.map((tip, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span className="text-slate-300">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-slate-700/50">
              <a
                href="/report"
                className="btn-primary w-full text-center py-3 inline-block"
              >
                📋 এটি রিপোর্ট করুন
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
