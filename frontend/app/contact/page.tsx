import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'যোগাযোগ — Eprohori',
  description: 'Eprohori টিমের সাথে যোগাযোগ করুন।',
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-slate-200">
      <h1 className="text-4xl font-bold mb-3 text-white">যোগাযোগ</h1>
      <p className="text-slate-400 mb-10">প্রশ্ন, পরামর্শ বা সাহায্যের জন্য আমাদের জানান।</p>

      <div className="grid md:grid-cols-2 gap-6">
        <ContactCard
          icon="📧"
          title="সাধারণ যোগাযোগ"
          email="admin@eprohori.tech"
          desc="প্রশ্ন, সহযোগিতা, partnership"
        />
        <ContactCard
          icon="🚨"
          title="জরুরি রিপোর্ট"
          email="admin@eprohori.tech"
          desc="চলমান সাইবার আক্রমণ, urgent threat"
        />
        <ContactCard
          icon="🔒"
          title="নিরাপত্তা ত্রুটি"
          email="admin@eprohori.tech"
          desc="Responsible disclosure, bug bounty"
        />
        <ContactCard
          icon="⚖️"
          title="আইনি ও গোপনীয়তা"
          email="admin@eprohori.tech"
          desc="DPDPA requests, court orders, takedown"
        />
      </div>

      <section className="mt-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-xl font-semibold mb-3 text-white">জরুরি হটলাইন</h2>
        <ul className="space-y-2 text-slate-300">
          <li>🇧🇩 BD CIRT: <strong>+880-2-9612345</strong></li>
          <li>👮 জাতীয় জরুরি: <strong>৯৯৯</strong></li>
          <li>🛡️ সাইবার পুলিশ: <strong>+880-1320-000888</strong></li>
        </ul>
      </section>

      <section className="mt-8 p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-xl font-semibold mb-3 text-white">সামাজিক মাধ্যম</h2>
        <p className="text-slate-300">শীঘ্রই আসছে — Facebook, Twitter, LinkedIn pages</p>
      </section>

      <p className="mt-10 text-sm text-slate-500">
        Response time: সাধারণ প্রশ্নের ২৪-৪৮ ঘণ্টায় উত্তর দিই। জরুরি ক্ষেত্রে দ্রুত যোগাযোগ করি।
      </p>
    </div>
  )
}

function ContactCard({ icon, title, email, desc }: { icon: string; title: string; email: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-3">{desc}</p>
      <a href={`mailto:${email}`} className="text-cyan-400 hover:underline text-sm">{email}</a>
    </div>
  )
}
