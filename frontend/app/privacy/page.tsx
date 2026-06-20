import type { Metadata } from 'next'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'গোপনীয়তা নীতি — Eprohori',
  description: 'Eprohori-র গোপনীয়তা নীতি ও ব্যবহারকারীর তথ্য সুরক্ষা।',
}

export default function PrivacyPage() {
  return (
    <div>
      <PageHero
        icon="🔐"
        eyebrow="Legal · DPDPA 2023"
        title="গোপনীয়তা নীতি"
        lead="আপনার তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখি — সম্পূর্ণ স্বচ্ছতার সাথে।"
      />
      <div className="max-w-4xl mx-auto px-6 pb-20 text-slate-200">
      <p className="text-sm text-slate-500 mb-10 text-center">সর্বশেষ হালনাগাদ: ১৬ জুন, ২০২৬</p>

      <Section title="১. আমরা কী তথ্য সংগ্রহ করি">
        <p>Eprohori নিম্নলিখিত তথ্য সংগ্রহ করে:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>অ্যাকাউন্ট তথ্য:</strong> ইমেইল ঠিকানা, পাসওয়ার্ড (hash করা), জেলা, প্রদর্শনের নাম</li>
          <li><strong>রিপোর্ট তথ্য:</strong> আপনার জমা দেওয়া হুমকির বিষয়বস্তু, প্ল্যাটফর্ম, ধরন</li>
          <li><strong>প্রযুক্তিগত তথ্য:</strong> IP ঠিকানা (rate limiting-এর জন্য), ব্রাউজার তথ্য</li>
          <li><strong>ব্যবহারের তথ্য:</strong> কোন পেজে কখন এসেছেন (anonymized analytics)</li>
        </ul>
      </Section>

      <Section title="২. কেন সংগ্রহ করি">
        <ul className="list-disc pl-6 space-y-1">
          <li>সাইবার হুমকি যাচাই ও কমিউনিটিকে সতর্ক করা</li>
          <li>AI মডেল উন্নত করা (anonymized data)</li>
          <li>স্প্যাম ও অপব্যবহার প্রতিরোধ</li>
          <li>আইনি কর্তৃপক্ষকে সহায়তা (court order থাকলে)</li>
        </ul>
      </Section>

      <Section title="৩. তথ্য শেয়ার">
        <p>আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না। সীমিত ক্ষেত্রে শেয়ার করতে পারি:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>BTRC, BD CIRT, পুলিশ — বৈধ অনুরোধ থাকলে</li>
          <li>Email পরিষেবা (Resend/Brevo) — শুধু email পাঠাতে</li>
          <li>AI পরিষেবা (Groq/Gemini/Anthropic) — শুধু threat content analyze করতে</li>
        </ul>
      </Section>

      <Section title="৪. আপনার অধিকার (DPDPA 2023 অনুযায়ী)">
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Access:</strong> আপনার ডেটা দেখার অধিকার</li>
          <li><strong>Correction:</strong> ভুল তথ্য সংশোধনের অধিকার</li>
          <li><strong>Deletion:</strong> অ্যাকাউন্ট ও ডেটা মুছে ফেলার অধিকার</li>
          <li><strong>Portability:</strong> আপনার ডেটা export করার অধিকার</li>
          <li><strong>Objection:</strong> প্রক্রিয়াকরণে আপত্তি জানানোর অধিকার</li>
        </ul>
        <p className="mt-3">এসব অধিকার ব্যবহার করতে: <a href="mailto:eprohori.tech@gmail.com" className="text-cyan-400 hover:underline">eprohori.tech@gmail.com</a></p>
      </Section>

      <Section title="৫. ডেটা সংরক্ষণ">
        <ul className="list-disc pl-6 space-y-1">
          <li>অ্যাকাউন্ট সক্রিয় থাকা অবধি ডেটা সংরক্ষিত</li>
          <li>রিপোর্ট ডেটা: ২ বছর (গবেষণার জন্য anonymized আকারে)</li>
          <li>লগ: ৯০ দিন</li>
          <li>OTP: ১০ মিনিট</li>
        </ul>
      </Section>

      <Section title="৬. নিরাপত্তা">
        <p>আমরা ব্যবহার করি: bcrypt পাসওয়ার্ড হ্যাশিং, JWT টোকেন, HTTPS encryption, rate limiting, SQL injection প্রতিরোধ, CORS protection, security headers।</p>
      </Section>

      <Section title="৭. শিশু সুরক্ষা">
        <p>Eprohori ১৩ বছরের কম বয়সীদের জন্য নয়। অভিভাবকের সম্মতি ছাড়া আমরা শিশুদের তথ্য সংগ্রহ করি না।</p>
      </Section>

      <Section title="৮. পরিবর্তন">
        <p>এই নীতিতে পরিবর্তন এলে আমরা ইমেইল ও সাইটে নোটিশ দেব। বড় পরিবর্তনের ৩০ দিন আগে জানাব।</p>
      </Section>

      <Section title="৯. যোগাযোগ">
        <p>প্রশ্ন বা অভিযোগ: <a href="mailto:eprohori.tech@gmail.com" className="text-cyan-400 hover:underline">eprohori.tech@gmail.com</a></p>
        <p className="mt-2">Data Protection Officer: Eprohori Team, Bangladesh</p>
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
