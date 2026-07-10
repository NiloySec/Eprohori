'use client'
import { useState } from 'react'
import PageHero from '@/components/PageHero'
import Card from '@/components/Card'

interface FraudType {
  id: string
  icon: string
  title: string
  subtitle: string
  color: string
  examples: string[]
  signals: string[]
  defense: string[]
}

const FRAUD_TYPES: FraudType[] = [
  {
    id: 'mfs_fraud',
    icon: '💳',
    title: 'বিকাশ / নগদ প্রতারণা',
    subtitle: 'মোবাইল ব্যাংকিং অ্যাকাউন্ট টার্গেট',
    color: '#ff4444',
    examples: [
      '"আপনার বিকাশ অ্যাকাউন্ট বন্ধ হয়ে যাবে — এখনই PIN দিন"',
      '"আমি বিকাশ এজেন্ট, ভুলক্রমে আপনার নম্বরে টাকা গেছে, ফেরত দিন"',
      '"KYC আপডেট করতে OTP দিন"',
    ],
    signals: [
      'বিকাশ/নগদ PIN বা পাসওয়ার্ড চাওয়া',
      'অ্যাকাউন্ট বন্ধ বা ব্লকের হুমকি',
      'ভুল ট্রান্সফারের গল্প বলে ফেরত চাওয়া',
      'KYC বা যাচাই নামে OTP চাওয়া',
    ],
    defense: [
      'বিকাশ/নগদ কখনো PIN বা OTP ফোনে চায় না',
      'শুধু অফিসিয়াল অ্যাপে লগিন করুন',
      'অপরিচিত ক্যাশ-আউট রিকোয়েস্ট করবেন না',
    ],
  },
  {
    id: 'otp_theft',
    icon: '🔐',
    title: 'OTP চুরির চেষ্টা',
    subtitle: 'কোড শেয়ার করিয়ে অ্যাকাউন্ট দখল',
    color: '#ff4444',
    examples: [
      '"আমি কাস্টমার কেয়ার, অ্যাকাউন্ট যাচাই করতে OTP দিন"',
      '"আপনার ফোনে একটি কোড গেছে, আমাকে বলুন"',
      '"Facebook/Google লক হয়েছে, কোড দিলে খুলবে"',
    ],
    signals: [
      'ফোনে কোড/OTP শেয়ার করতে বলা',
      'অফিসিয়াল সার্ভিসের নামে ফোন করা',
      'তাড়াহুড়ো দেখানো — "এখনই দিন"',
      'SMS পাওয়ার সাথে সাথে ফোন আসা',
    ],
    defense: [
      'OTP কাউকে বলবেন না — কখনো না',
      'ব্যাংক/অ্যাপ কখনো OTP চায় না',
      'সন্দেহ হলে সরাসরি অফিসিয়াল নম্বরে ফোন করুন',
    ],
  },
  {
    id: 'lottery',
    icon: '🏆',
    title: 'লটারি / পুরস্কার স্ক্যাম',
    subtitle: 'নকল পুরস্কার দিয়ে টাকা হাতিয়ে নেওয়া',
    color: '#f59e0b',
    examples: [
      '"আপনি ১০ লাখ টাকা জিতেছেন! ট্যাক্স হিসেবে ৫,০০০ টাকা পাঠান"',
      '"Grameenphone লটারিতে আপনার নম্বর বিজয়ী"',
      '"অভিনন্দন! iPhone জিতেছেন, ডেলিভারি চার্জ দিন"',
    ],
    signals: [
      'কোনো প্রতিযোগিতায় অংশ না নিয়েও জয়ের খবর',
      'পুরস্কার পেতে আগে টাকা পাঠাতে বলা',
      'WhatsApp/SMS-এ অদ্ভুত লিংক',
    ],
    defense: [
      'না খেললে পুরস্কার হয় না',
      'টাকা না পাঠালে পুরস্কার দেবে না — এটাই স্ক্যাম',
      'লিংকে ক্লিক করবেন না, মেসেজ ডিলিট করুন',
    ],
  },
  {
    id: 'romance',
    icon: '💔',
    title: 'রোমান্স / প্রেম প্রতারণা',
    subtitle: 'বিশ্বাস তৈরি করে টাকা নেওয়া',
    color: '#3b82f6',
    examples: [
      'বিদেশি পরিচয় দিয়ে মাসের পর মাস কথা',
      '"বিপদে পড়েছি, একটু টাকা পাঠাও"',
      '"বাংলাদেশে আসব, উপহার পাঠাচ্ছি — কাস্টমস ফি দাও"',
    ],
    signals: [
      'সোশ্যাল মিডিয়ায় অপরিচিত বিদেশি',
      'কখনো ভিডিও কলে আসে না',
      'দ্রুত প্রেমের সম্পর্ক তৈরি করে',
      'টাকার কথা আসে অনেক পরে',
    ],
    defense: [
      'অপরিচিতকে টাকা পাঠাবেন না',
      'ভিডিও কলে না এলে বিশ্বাস করবেন না',
      'পরিবার বা বন্ধুর সাথে পরামর্শ করুন',
    ],
  },
  {
    id: 'investment',
    icon: '📈',
    title: 'ভুয়া বিনিয়োগ স্ক্যাম',
    subtitle: 'গ্যারান্টি মুনাফার লোভ দেখানো',
    color: '#f59e0b',
    examples: [
      '"প্রতিদিন ১০% মুনাফা! এখনই বিনিয়োগ করুন"',
      '"Crypto trading-এ ৩ দিনে দ্বিগুণ"',
      '"MLM অ্যাপে রেফার করলে কমিশন পাবেন"',
    ],
    signals: [
      'অবিশ্বাস্য রিটার্নের প্রতিশ্রুতি',
      'রেজিস্ট্রেশন ফি বা প্রথম বিনিয়োগ চাওয়া',
      'বাংলাদেশ ব্যাংকের অনুমোদন নেই',
    ],
    defense: [
      'গ্যারান্টি মুনাফা বলে কিছু নেই',
      'BB-অনুমোদিত প্রতিষ্ঠানেই বিনিয়োগ করুন',
      'লোভ দেখালেই সন্দেহ করুন',
    ],
  },
  {
    id: 'phishing',
    icon: '🎣',
    title: 'ফিশিং লিংক',
    subtitle: 'নকল ওয়েবসাইটে ব্যক্তিগত তথ্য চুরি',
    color: '#ff4444',
    examples: [
      '"আপনার NID যাচাই করতে এই লিংকে যান: bit.ly/xxxx"',
      '"ব্যাংক অ্যাকাউন্ট আপডেট করতে ক্লিক করুন"',
      '"বিনামূল্যে ডেটা পেতে এখানে ক্লিক করুন"',
    ],
    signals: [
      'অদ্ভুত ছোট URL (bit.ly, tinyurl)',
      'অফিসিয়াল দেখতে কিন্তু ভুল ডোমেইন',
      'তথ্য দিতে তাড়া দেওয়া',
    ],
    defense: [
      'অচেনা লিংকে ক্লিক করবেন না',
      'URL টি সরাসরি ব্রাউজারে টাইপ করুন',
      'HTTPS আর সঠিক ডোমেইন চেক করুন',
    ],
  },
]

const SAFETY_RULES = [
  { icon: '📸', text: 'প্রমাণ সংগ্রহ করুন: স্ক্রিনশট নিন, নম্বর সেভ করুন' },
  { icon: '📵', text: 'সন্দেহ হলে সাথে সাথে ফোন কেটে দিন' },
  { icon: '🔒', text: 'PIN, OTP, পাসওয়ার্ড কাউকে বলবেন না — কখনোই না' },
  { icon: '🏦', text: 'চাপে পড়ে কখনো টাকা পাঠাবেন না' },
  { icon: '🔗', text: 'অচেনা লিংক বা QR কোড স্ক্যান করবেন না' },
  { icon: '🗣️', text: 'পরিচিত মানুষকে জানান — সতর্ক করুন' },
  { icon: '🛡️', text: 'প্রতারণার শিকার হলে BTRC (10678) বা পুলিশে রিপোর্ট করুন' },
]

function FraudCard({ item }: { item: FraudType }) {
  const [open, setOpen] = useState(false)

  return (
    <Card hover={false} className="!p-0 overflow-hidden" style={{ borderLeft: `3px solid ${item.color}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-5 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span className="text-3xl">{item.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-white">{item.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
        </div>
        <span className="text-slate-500 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 text-sm">
          <div>
            <p className="font-semibold mb-2" style={{ color: item.color }}>উদাহরণ</p>
            {item.examples.map((ex, i) => (
              <p key={i} className="text-slate-300 italic mb-1 leading-relaxed">{ex}</p>
            ))}
          </div>
          <div>
            <p className="font-semibold mb-2" style={{ color: item.color }}>সনাক্তের উপায়</p>
            {item.signals.map((s, i) => (
              <p key={i} className="text-slate-400 mb-1 leading-relaxed">• {s}</p>
            ))}
          </div>
          <div>
            <p className="font-semibold mb-2 text-[#22c55e]">করণীয়</p>
            {item.defense.map((d, i) => (
              <p key={i} className="text-slate-400 mb-1 leading-relaxed">• {d}</p>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function CyberSafetyPage() {
  return (
    <div>
      <PageHero
        icon="🛡️"
        eyebrow="সাইবার নিরাপত্তা শিক্ষা"
        title="প্রতারণার ধরন চিনুন, নিজেকে রক্ষা করুন"
        lead="বাংলাদেশে সবচেয়ে বেশি ঘটে যাওয়া ৬ ধরনের সাইবার প্রতারণা — উদাহরণ, চেনার উপায় ও করণীয় একসাথে।"
      />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-4">
        {FRAUD_TYPES.map(item => (
          <FraudCard key={item.id} item={item} />
        ))}

        <section className="mt-12">
          <h2 className="font-heading text-2xl font-bold text-white mb-6 text-center">সাধারণ নিরাপত্তা নিয়ম</h2>
          <Card>
            <div className="space-y-4">
              {SAFETY_RULES.map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl">{rule.icon}</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{rule.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
