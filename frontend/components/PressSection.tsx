import Link from 'next/link'

export default function PressSection() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Open for Partnerships</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-heading">
            একসাথে বাংলাদেশকে নিরাপদ রাখি
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            সরকারি সংস্থা, NGO, সাংবাদিক, গবেষক — Eprohori-র সাথে কাজ করতে চাইলে যোগাযোগ করুন।
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <PartnerCard
            icon="🏛️"
            title="সরকারি সংস্থা"
            desc="BTRC, BD CIRT, পুলিশ সাইবার ইউনিট — threat data sharing, API access"
            cta="Partnership inquiry"
          />
          <PartnerCard
            icon="📰"
            title="সাংবাদিক"
            desc="সাইবার ক্রাইম coverage-এর জন্য data ও expert interview"
            cta="যোগাযোগ করুন"
          />
          <PartnerCard
            icon="🔬"
            title="গবেষক"
            desc="Academic research-এর জন্য anonymized dataset access (signed agreement)"
            cta="Research access"
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/partner"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold transition"
            style={{ border: '1.5px solid rgba(0,229,196,0.4)', color: '#00e5c4', backgroundColor: 'rgba(0,229,196,0.06)' }}
          >
            🤝 যোগাযোগ ফর্ম খুলুন
          </Link>
        </div>
      </div>
    </section>
  )
}

function PartnerCard({ icon, title, desc, cta }: { icon: string; title: string; desc: string; cta: string }) {
  return (
    <Link href="/partner" className="block rounded-2xl p-6 bg-slate-900/40 border border-slate-800 hover:border-cyan-500/30 transition group">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{desc}</p>
      <span className="text-xs text-cyan-400 group-hover:underline">{cta} →</span>
    </Link>
  )
}
