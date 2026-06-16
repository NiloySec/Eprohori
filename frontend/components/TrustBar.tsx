export default function TrustBar() {
  const items = [
    { icon: '🇧🇩', label: 'Made in Bangladesh', sub: 'Local-first platform' },
    { icon: '🛡️', label: 'DPDPA 2023', sub: 'Privacy compliant' },
    { icon: '🔒', label: 'JWT + 2FA', sub: 'Bank-grade auth' },
    { icon: '🤖', label: 'Multi-AI', sub: 'Groq · Gemini · Claude' },
    { icon: '⚡', label: 'PostgreSQL', sub: 'Production database' },
    { icon: '📊', label: 'Sentry', sub: 'Real-time monitoring' },
  ]
  return (
    <section className="py-10 px-6 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(13,24,41,0.4)' }}>
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-xs uppercase tracking-widest text-slate-500 mb-6">
          Trusted Infrastructure
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {items.map((it) => (
            <div key={it.label} className="text-center">
              <div className="text-3xl mb-2">{it.icon}</div>
              <div className="text-sm font-semibold text-white">{it.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{it.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
