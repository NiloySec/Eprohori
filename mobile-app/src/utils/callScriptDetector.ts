// N8: scam call script detector — matches what a caller SAID against known
// Bangladesh fraud call scripts. Pure local analysis, no API.

export interface ScriptMatch {
  label_bn: string;
  icon: string;
  weight: number; // 1–3, higher = stronger fraud signal
}

export interface CallScriptResult {
  score: number;           // 0–100
  level: 'safe' | 'caution' | 'danger';
  level_bn: string;
  matches: ScriptMatch[];
  advice_bn: string[];
}

interface ScriptPattern extends ScriptMatch {
  patterns: RegExp[];
}

const SCRIPT_PATTERNS: ScriptPattern[] = [
  {
    label_bn: 'OTP/পিন/কোড চাওয়া হয়েছে', icon: '🔑', weight: 3,
    patterns: [
      /otp|ওটিপি/i, /পিন.*(দিন|বলুন|পাঠান|লাগবে)/, /কোড.*(দিন|বলুন|পাঠান|আসবে|এসেছে)/,
      /pin.*(দিন|বলুন|number)/i, /verification.*code/i, /যাচাই.*কোড/,
    ],
  },
  {
    label_bn: 'নিজেকে বিকাশ/নগদ/ব্যাংক কর্মকর্তা দাবি', icon: '🎭', weight: 3,
    patterns: [
      /বিকাশ.*(অফিস|কর্মকর্তা|এজেন্ট|হেড.?অফিস|কাস্টমার)/,
      /নগদ.*(অফিস|কর্মকর্তা|এজেন্ট|হেড.?অফিস|কাস্টমার)/,
      /ব্যাংক.*(থেকে|অফিসার|ম্যানেজার).*(বলছি|ফোন)/,
      /bkash.*(office|officer|agent|head)/i, /nagad.*(office|officer|agent)/i,
      /কাস্টমার.?কেয়ার.*থেকে.*বলছি/,
    ],
  },
  {
    label_bn: 'অ্যাকাউন্ট বন্ধ/ব্লকের হুমকি', icon: '🚫', weight: 3,
    patterns: [
      /(একাউন্ট|অ্যাকাউন্ট).*(বন্ধ|ব্লক|স্থগিত|সাসপেন্ড)/,
      /account.*(block|suspend|close|deactivate)/i,
      /সিম.*(বন্ধ|ব্লক)/, /নম্বর.*বন্ধ.*হয়ে.*যাবে/,
    ],
  },
  {
    label_bn: 'লটারি/পুরস্কার/অফারের প্রলোভন', icon: '🎰', weight: 3,
    patterns: [
      /লটারি|পুরস্কার|জিতেছেন|বিজয়ী/, /lottery|prize|winner|congratulation/i,
      /কোটি.*টাকা|লাখ.*টাকা.*(জিতে|পুরস্কার|পেয়েছেন)/,
      /ফ্রি.*(অফার|উপহার|গিফট)/, /gift.*(পাঠাবো|পেয়েছেন)/i,
    ],
  },
  {
    label_bn: 'জরুরি/চাপ প্রয়োগ ("এখনই করুন")', icon: '⏰', weight: 2,
    patterns: [
      /এখনই|তাড়াতাড়ি|জরুরি|অবিলম্বে|দ্রুত.*(করুন|দিন|পাঠান)/,
      /urgent|immediately|right now|hurry/i,
      /সময়.*(নেই|শেষ)|শেষ.*সুযোগ/, /৫.*মিনিট|১০.*মিনিট.*মধ্যে/,
    ],
  },
  {
    label_bn: 'টাকা পাঠাতে/রিচার্জ করতে বলা', icon: '💸', weight: 3,
    patterns: [
      /টাকা.*(পাঠান|পাঠাতে|দিন|সেন্ড)/, /send.*money|cash.?out/i,
      /রিচার্জ.*(করুন|করতে|করে)/, /ফি.*(দিতে|পাঠাতে|জমা)/,
      /(রেজিস্ট্রেশন|প্রসেসিং|ডেলিভারি).*(ফি|চার্জ|খরচ)/,
      /বিকাশে.*পাঠা|নগদে.*পাঠা/,
    ],
  },
  {
    label_bn: 'পুলিশ/র‍্যাব/মামলার ভয় দেখানো', icon: '👮', weight: 3,
    patterns: [
      /পুলিশ|র‍্যাব|মামলা|গ্রেফতার|ওয়ারেন্ট|থানা/,
      /police|arrest|warrant|case.*file/i,
      /আইনি.*ব্যবস্থা|কোর্ট|আদালত/,
    ],
  },
  {
    label_bn: 'ভুলে টাকা পাঠানোর দাবি', icon: '↩️', weight: 3,
    patterns: [
      /ভুলে.*(টাকা|পাঠিয়ে)/, /ভুল.*নম্বরে.*(টাকা|গেছে)/,
      /ফেরত.*(দিন|পাঠান|চাই)/, /wrong.*number.*money|sent.*by.*mistake/i,
    ],
  },
  {
    label_bn: 'ব্যক্তিগত তথ্য চাওয়া (NID/জন্মতারিখ)', icon: '🪪', weight: 2,
    patterns: [
      /এনআইডি|nid|জাতীয়.*পরিচয়/i, /জন্ম.*তারিখ|birth.*date/i,
      /মায়ের.*নাম|বাবার.*নাম/, /ঠিকানা.*(বলুন|দিন|জানান)/,
      /কার্ড.*নম্বর|card.*number/i,
    ],
  },
  {
    label_bn: 'গোপন রাখতে বলা', icon: '🤫', weight: 2,
    patterns: [
      /কাউকে.*(বলবেন|জানাবেন).*না/, /গোপন.*(রাখুন|রাখবেন)/,
      /don.?t.*tell.*anyone|keep.*secret/i, /পরিবারকে.*জানাবেন.*না/,
    ],
  },
];

const ADVICE: Record<CallScriptResult['level'], string[]> = {
  danger: [
    '🚫 এই কল প্রতারণামূলক — সাথে সাথে কেটে দিন',
    '🔑 কখনো OTP, পিন বা পাসওয়ার্ড ফোনে বলবেন না — বিকাশ/নগদ/ব্যাংক কখনো এসব চায় না',
    '📞 সন্দেহ হলে অফিসিয়াল নম্বরে নিজে কল করুন (বিকাশ: ১৬২৪৭, নগদ: ১৬১৬৭)',
    '🚨 নম্বরটি EProhori-তে রিপোর্ট করুন এবং ব্লক করুন',
  ],
  caution: [
    '⚠️ সতর্ক থাকুন — কিছু সন্দেহজনক লক্ষণ পাওয়া গেছে',
    '❌ কোনো ব্যক্তিগত তথ্য বা টাকা দেবেন না',
    '📞 প্রতিষ্ঠানের অফিসিয়াল নম্বরে যাচাই করুন',
  ],
  safe: [
    '✅ পরিচিত প্রতারণার ধরন পাওয়া যায়নি',
    '💡 তবুও সতর্ক থাকুন — OTP/পিন কাউকে দেবেন না',
  ],
};

export function analyzeCallScript(rawText: string): CallScriptResult {
  const text = rawText.slice(0, 3000); // ReDoS guard, same as categorizeSms

  const matches: ScriptMatch[] = [];
  let totalWeight = 0;

  for (const sp of SCRIPT_PATTERNS) {
    if (sp.patterns.some((p) => p.test(text))) {
      matches.push({ label_bn: sp.label_bn, icon: sp.icon, weight: sp.weight });
      totalWeight += sp.weight;
    }
  }

  // Max realistic weight ~12; scale to 0–100
  const score = Math.min(Math.round((totalWeight / 9) * 100), 100);

  let level: CallScriptResult['level'];
  if (score >= 55 || matches.some((m) => m.weight === 3 && matches.length >= 2)) level = 'danger';
  else if (score >= 20) level = 'caution';
  else level = 'safe';

  const level_bn =
    level === 'danger' ? '🔴 প্রতারণা কল — বিপজ্জনক!'
    : level === 'caution' ? '🟡 সন্দেহজনক — সতর্ক থাকুন'
    : '🟢 পরিচিত স্ক্যাম প্যাটার্ন নেই';

  return { score, level, level_bn, matches, advice_bn: ADVICE[level] };
}
