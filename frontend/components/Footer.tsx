import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0d1829', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-heading text-xl font-bold text-white mb-3">
              <span style={{ color: '#00e5c4' }}>E</span>prohori
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              বাংলাদেশের সাইবার সুরক্ষা — আপনার হাতে।
              একসাথে আমরা বাংলাদেশকে সাইবার অপরাধমুক্ত করব।
            </p>
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
              <li>📧 admin@eprohori.tech</li>
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
          <p>© ২০২৬ Eprohori. সর্বস্বত্ব সংরক্ষিত।</p>
          <p className="mt-2 sm:mt-0">বাংলাদেশের সাইবার সুরক্ষা — আপনার হাতে</p>
        </div>
      </div>
    </footer>
  )
}
