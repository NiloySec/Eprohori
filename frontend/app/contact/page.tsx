import type { Metadata } from 'next'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'যোগাযোগ — EProhori',
  description: 'EProhori টিমের সাথে যোগাযোগ করুন।',
}

export default function ContactPage() {
  return (
    <div>
      <PageHero
        icon="✉️"
        eyebrow="Get in touch"
        title="যোগাযোগ"
        lead="প্রশ্ন, পরামর্শ, partnership বা সাহায্য — আমরা শুনতে প্রস্তুত।"
      />
      <div className="max-w-4xl mx-auto px-6 pb-20 text-slate-200">

      <div className="grid md:grid-cols-2 gap-6">
        <ContactCard
          icon="📧"
          title="সাধারণ যোগাযোগ"
          email="eprohori.tech@gmail.com"
          desc="প্রশ্ন, সহযোগিতা, partnership"
        />
        <ContactCard
          icon="🚨"
          title="জরুরি রিপোর্ট"
          email="eprohori.tech@gmail.com"
          desc="চলমান সাইবার আক্রমণ, urgent threat"
        />
        <ContactCard
          icon="🔒"
          title="নিরাপত্তা ত্রুটি"
          email="eprohori.tech@gmail.com"
          desc="Responsible disclosure, bug bounty"
        />
        <ContactCard
          icon="⚖️"
          title="আইনি ও গোপনীয়তা"
          email="eprohori.tech@gmail.com"
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
        <p className="text-slate-400 text-sm mb-4">আপডেট, সতর্কতা ও নিরাপত্তা টিপসের জন্য আমাদের ফলো করুন।</p>
        <div className="flex flex-wrap gap-3">
          {[
            {
              label: 'Facebook',
              href: 'https://www.facebook.com/profile.php?id=61590747195647',
              path: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.92 3.78-3.92 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z',
            },
            {
              label: 'Instagram',
              href: 'https://www.instagram.com/eprohori.tech/',
              path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.62c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17-.21-.55-.47-.94-.88-1.35-.41-.41-.8-.67-1.35-.88-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36Zm5.5-1.4a1.24 1.24 0 1 1 0 2.48 1.24 1.24 0 0 1 0-2.48Z',
            },
            {
              label: 'X (Twitter)',
              href: 'https://x.com/eprohori',
              path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.97 6.817H1.674l7.73-8.835L1.25 2.25h6.83l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z',
            },
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/in/eprohori-bd-761355417/',
              path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
            },
          ].map(({ label, href, path }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={path} />
              </svg>
              {label}
            </a>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-slate-500">
        Response time: সাধারণ প্রশ্নের ২৪-৪৮ ঘণ্টায় উত্তর দিই। জরুরি ক্ষেত্রে দ্রুত যোগাযোগ করি।
      </p>
      </div>
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
