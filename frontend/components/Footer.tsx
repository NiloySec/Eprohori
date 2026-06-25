import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0d1829', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image
              src="/logo.png"
              alt="EProhori"
              width={150}
              height={47}
              className="mb-3"
              style={{ objectFit: 'contain', height: 'auto' }}
            />
            <p className="text-slate-400 text-sm leading-relaxed">
              বাংলাদেশের সাইবার সুরক্ষা — আপনার হাতে।
              একসাথে আমরা বাংলাদেশকে সাইবার অপরাধমুক্ত করব।
            </p>
            <div className="flex items-center gap-3 mt-4">
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
                  label: 'X',
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
                  aria-label={label}
                  className="ep-social flex items-center justify-center"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
            <style>{`
              .ep-social {
                width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px;
                color: #94a3b8;
                background-color: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                transition: color .15s, background-color .15s, border-color .15s;
              }
              .ep-social:hover {
                color: #00e5c4;
                background-color: rgba(0,229,196,0.08);
                border-color: rgba(0,229,196,0.4);
              }
              .ep-attribution {
                font-size: 11px;
                color: rgba(148,163,184,0.45);
              }
              .ep-vt-link {
                color: rgba(148,163,184,0.55);
                text-decoration: none;
                transition: color .15s;
              }
              .ep-vt-link:hover { color: #94a3b8; }
            `}</style>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">পেইজ</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {[
                ['/', 'হোম'],
                ['/report', 'Report'],
                ['/monitor', 'Monitor'],
                ['/account', 'অ্যাকাউন্ট'],
                ['/about', 'About'],
                ['/contact', 'যোগাযোগ'],
                ['/privacy', 'গোপনীয়তা'],
                ['/terms', 'শর্তাবলী'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors" style={{ color: 'inherit' }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">যোগাযোগ</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>📧 eprohori.tech@gmail.com</li>
              <li>🇧🇩 বাংলাদেশ</li>
              <li className="pt-2">
                <span style={{ color: '#00e5c4' }}>সাইবার অপরাধের শিকার হলে</span>
                <br />
                জাতীয় হেল্পলাইন: <strong className="text-white">999</strong>
              </li>
            </ul>
          </div>
        </div>
        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p>© ২০২৬ EProhori. সর্বস্বত্ব সংরক্ষিত।</p>
          <p className="mt-2 sm:mt-0">বাংলাদেশের সাইবার সুরক্ষা — আপনার হাতে</p>
        </div>
        <div className="mt-3 text-center ep-attribution">
          Powered by EProhori AI · URL scanning data by{' '}
          <a
            href="https://www.virustotal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ep-vt-link"
          >
            VirusTotal
          </a>
        </div>
      </div>
    </footer>
  )
}
