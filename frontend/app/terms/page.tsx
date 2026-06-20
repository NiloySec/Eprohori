import type { Metadata } from 'next'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'ব্যবহারের শর্তাবলী — Eprohori',
  description: 'Eprohori পরিষেবা ব্যবহারের শর্ত ও নিয়মাবলী।',
}

export default function TermsPage() {
  return (
    <div>
      <PageHero
        icon="📜"
        eyebrow="Legal"
        title="ব্যবহারের শর্তাবলী"
        lead="Eprohori ব্যবহারের আগে এই শর্তগুলো পড়ে নিন — আপনার ও কমিউনিটির সুরক্ষার জন্য।"
      />
      <div className="max-w-4xl mx-auto px-6 pb-20 text-slate-200">
      <p className="text-sm text-slate-500 mb-10 text-center">সর্বশেষ হালনাগাদ: ১৬ জুন, ২০২৬</p>

      <Section title="১. পরিষেবার পরিচিতি">
        <p>Eprohori একটি ক্রাউডসোর্সড সাইবার থ্রেট রিপোর্টিং প্ল্যাটফর্ম। আমরা AI ব্যবহার করে phishing, scam ও cyber threat যাচাই করি এবং কমিউনিটিকে সতর্ক করি।</p>
      </Section>

      <Section title="২. অ্যাকাউন্ট">
        <ul className="list-disc pl-6 space-y-1">
          <li>সঠিক তথ্য দিয়ে রেজিস্টার করতে হবে</li>
          <li>পাসওয়ার্ড নিজের দায়িত্বে গোপন রাখুন</li>
          <li>এক ব্যক্তি একাধিক অ্যাকাউন্ট তৈরি করতে পারবেন না</li>
          <li>ভুয়া তথ্য দিলে অ্যাকাউন্ট স্থায়ীভাবে বন্ধ হবে</li>
        </ul>
      </Section>

      <Section title="৩. অনুমোদিত ব্যবহার">
        <p>আপনি Eprohori ব্যবহার করতে পারেন:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>সত্যিকারের সাইবার হুমকি রিপোর্ট করতে</li>
          <li>সন্দেহজনক URL/SMS যাচাই করতে</li>
          <li>কমিউনিটিকে সতর্ক রাখতে</li>
        </ul>
      </Section>

      <Section title="৪. নিষিদ্ধ কাজ">
        <p>আপনি করতে পারবেন না:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>ভুয়া রিপোর্ট জমা দেওয়া</li>
          <li>কাউকে হয়রানি, হুমকি বা মানহানি</li>
          <li>স্প্যাম, malware বা ক্ষতিকর content পাঠানো</li>
          <li>সিস্টেম hack বা reverse engineering চেষ্টা</li>
          <li>অন্যের ব্যক্তিগত তথ্য অনুমতি ছাড়া শেয়ার</li>
          <li>প্ল্যাটফর্ম-এর AI বা data automated tool দিয়ে scrape</li>
        </ul>
      </Section>

      <Section title="৫. ভুয়া রিপোর্ট">
        <p>ইচ্ছাকৃত ভুয়া রিপোর্ট জমা দিলে:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>প্রথমবার: warning</li>
          <li>দ্বিতীয়বার: ৩০ দিন suspension</li>
          <li>তৃতীয়বার: স্থায়ী ban</li>
          <li>আইনি ব্যবস্থা: ডিজিটাল নিরাপত্তা আইন ২০২৩ অনুযায়ী</li>
        </ul>
      </Section>

      <Section title="৬. কন্টেন্ট লাইসেন্স">
        <p>আপনি যা রিপোর্ট করেন তার উপর আপনার মালিকানা থাকে। তবে Eprohori-কে limited license দেন:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>কমিউনিটিকে দেখানোর জন্য (anonymized)</li>
          <li>AI মডেল ট্রেইন করার জন্য</li>
          <li>গবেষণার জন্য (anonymized)</li>
        </ul>
      </Section>

      <Section title="৭. দায়বদ্ধতা সীমা">
        <p>Eprohori "as-is" প্রদান করা হয়। আমরা গ্যারান্টি দিই না যে:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>সব হুমকি detect হবে</li>
          <li>AI validation সবসময় সঠিক</li>
          <li>সেবা সবসময় available থাকবে</li>
        </ul>
        <p className="mt-3">আমাদের validation শুধু সহায়ক তথ্য — চূড়ান্ত সিদ্ধান্ত আপনার। কোনো আর্থিক ক্ষতির দায় আমরা নিই না।</p>
      </Section>

      <Section title="৮. পরিষেবা পরিবর্তন">
        <p>আমরা যেকোনো সময় ফিচার যোগ/বাদ দিতে পারি। বড় পরিবর্তন আগে নোটিশ দেওয়া হবে।</p>
      </Section>

      <Section title="৯. অ্যাকাউন্ট বন্ধ">
        <p>আপনি যেকোনো সময় account delete করতে পারেন (Settings &gt; Delete Account)। আমরাও terms লঙ্ঘন হলে account বন্ধ করতে পারি।</p>
      </Section>

      <Section title="১০. আইন ও বিচার">
        <p>এই শর্তাবলী বাংলাদেশের আইন দ্বারা পরিচালিত। কোনো বিরোধ ঢাকা জেলা আদালতের এখতিয়ারভুক্ত।</p>
      </Section>

      <Section title="১১. যোগাযোগ">
        <p><a href="mailto:eprohori.tech@gmail.com" className="text-cyan-400 hover:underline">eprohori.tech@gmail.com</a></p>
      </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="mb-5 rounded-2xl p-6 md:p-8 transition hover:border-cyan-500/20"
      style={{ background: 'rgba(13,24,41,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h2 className="font-heading text-xl md:text-2xl font-semibold mb-3 text-white">{title}</h2>
      <div className="text-slate-300 leading-relaxed text-sm md:text-base">{children}</div>
    </section>
  )
}
