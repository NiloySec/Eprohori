export type SmsCategory =
  | 'otp'
  | 'otp_theft'
  | 'bank_transaction'
  | 'mfs'
  | 'mfs_fraud'
  | 'fraud'
  | 'phishing'
  | 'malware'
  | 'promotional'
  | 'emergency'
  | 'unknown';

export interface SmsCategoryInfo {
  category: SmsCategory;
  label_bn: string;
  icon: string;
  color: string;
  confidence: number; // 0–1
}

// ── Pattern sets ─────────────────────────────────────────────────────────────

const OTP_PATTERNS = [
  /\bOTP\b/i,
  /\bone.?time.?pass/i,
  /\bverif(y|ication|ied)\b/i,
  /\bcode\s+is\s+\d{4,8}\b/i,
  /\bপিন\b|\bকোড\b/,
  /\bআপনার কোড\b/,
  /\b\d{4,8}\s+(is your|হলো আপনার)/i,
  /do not share.*OTP/i,
  /কাউকে জানাবেন না/,
  // BD-specific OTP legit senders
  /bkash.*otp|nagad.*otp|dutch.?bangla.*otp/i,
  /verification.*code.*\d{4,8}/i,
  /আপনার.*\d{4,8}.*কোড/,
  /কোড.*মেয়াদ|কোড.*expire/i,
  /\d{4,8}.*পিন.*রিসেট/,
];

// Social-engineering: asking the user to SHARE their OTP/PIN/code
const OTP_THEFT_PATTERNS = [
  /share.*\b(otp|code|pin)\b/i,
  /\b(otp|code|pin)\b.*share/i,
  /otp.*দিন|otp.*পাঠান/i,
  /কোড.*দিন|কোড.*পাঠান|কোড.*বলুন/,
  /পিন.*দিন|পিন.*পাঠান|পিন.*বলুন/,
  /আমাদের.*জানান|আমাদের.*দিন/,
  /নিরাপত্তা.*কোড.*দিন/,
  /verify.*করতে.*কোড.*দিন/,
  /agent.*otp|executive.*otp/i,
  /কাস্টমার কেয়ার.*কোড/,
  /helpline.*pin|helpline.*otp/i,
  // BD-specific OTP theft patterns
  /কোড.*এজেন্ট|এজেন্ট.*কোড/,
  /নম্বর.*থেকে.*কোড.*আসবে/,
  /একটি কোড পাবেন.*দিন/,
  /verification.*করতে.*কোড/,
  /account.*update.*otp/i,
  /কোড না দিলে.*একাউন্ট/,
  /urgent.*otp.*required/i,
  /customer.*otp.*share/i,
];

const BANK_TXN_PATTERNS = [
  /debit(ed|ing)?\s+(tk|bdt|৳)/i,
  /credit(ed|ing)?\s+(tk|bdt|৳)/i,
  /balance.*\b(tk|bdt|৳)/i,
  /\b(tk|bdt|৳)\s*[\d,]+/i,
  /transaction\s*(id|no|ref)/i,
  /account.*debited/i,
  /account.*credited/i,
  /available balance/i,
  /আপনার একাউন্ট/,
  /ডেবিট|ক্রেডিট|ব্যালেন্স/,
  // BD banks
  /dutch.?bangla|dbbl/i,
  /islami\s*bank|isbl/i,
  /brac\s*bank|brbl/i,
  /sonali\s*bank/i,
  /janata\s*bank/i,
  /city\s*bank|citybank/i,
  /southeast\s*bank/i,
  /তৈরি হয়েছে.*টাকা|টাকা.*পাঠানো হয়েছে/,
  /\bTrx\b|\bRef no\b/i,
];

const MFS_PATTERNS = [
  /bkash/i,
  /nagad/i,
  /rocket\s*(mobile|account)/i,
  /upay/i,
  /surecash/i,
  /\bcash.?out\b/i,
  /\bsend.?money\b/i,
  /mobile\s*(banking|recharge)/i,
  /বিকাশ|নগদ|রকেট|উপায়/,
  /ক্যাশ আউট|পাঠান/,
  /add.*money.*bkash|bkash.*add.*money/i,
  /bkash.*merchant|merchant.*bkash/i,
  /বিকাশ.*মার্চেন্ট|বিকাশ.*পেমেন্ট/,
  /নগদ.*পেমেন্ট|নগদ.*মার্চেন্ট/,
];

// Fake bKash/Nagad social engineering: credential theft + account threat
const MFS_FRAUD_PATTERNS = [
  /bkash.*(pin|password|pass)/i,
  /nagad.*(pin|password|pass)/i,
  /(pin|password).*bkash/i,
  /(pin|password).*nagad/i,
  /বিকাশ.*পিন|বিকাশ.*পাসওয়ার্ড/,
  /নগদ.*পিন|নগদ.*পাসওয়ার্ড/,
  /বিকাশ.*(বন্ধ|ব্লক|স্থগিত)/,
  /নগদ.*(বন্ধ|ব্লক|স্থগিত)/,
  /bkash.*(block|suspend|close)/i,
  /nagad.*(block|suspend|close)/i,
  /fake.*agent|agent.*bkash/i,
  /এজেন্ট.*বিকাশ|বিকাশ.*এজেন্ট/,
  /bkash.*verify.*now/i,
  /বিকাশ.*যাচাই.*এখনই/,
  /আপনার (বিকাশ|নগদ|রকেট) একাউন্ট (বন্ধ|ব্লক)/,
  /mobile.?banking.*(suspend|block|close)/i,
  // More BD MFS fraud patterns
  /বিকাশ.*16247|বিকাশ.*01/,
  /নগদ.*সার্ভিস.*সমস্যা/,
  /আপনার বিকাশ.*সীমিত/,
  /bkash.*limit.*exceed/i,
  /nagad.*limit.*exceed/i,
  /ভুলে পাঠিয়েছি.*ফেরত/,
  /ফেরত দিন.*বিকাশ|বিকাশ.*ফেরত দিন/,
  /এজেন্ট.*ভুল.*নম্বর/,
  /ক্যাশ আউট.*সমস্যা.*পিন/,
  /rocket.*(pin|pass|block)/i,
  /রকেট.*(পিন|পাসওয়ার্ড|বন্ধ)/,
];

const FRAUD_PATTERNS = [
  /lottery/i,
  /you.?have.?won/i,
  /congratulation/i,
  /prize/i,
  /claim.?your/i,
  /লটারি|পুরস্কার|জিতেছেন/,
  /police\s*(case|report)/i,
  /arrest\s*warrant/i,
  /গ্রেফতার|মামলা/,
  /\bfbi\b|\bcbi\b|\brac\b/i,
  /অ্যাকাউন্ট ব্লক|বন্ধ হয়ে যাবে/,
  /your account (will be|has been) (blocked|suspend)/i,
  /verify (your|ur) account immediately/i,
  /blacklist/i,
  /রোমান্স|প্রেম.*টাকা|বিদেশ.*পাঠাও/,
  /investment.*guaranteed/i,
  /profit.*guaranteed/i,
  /বিনিয়োগ.*গ্যারান্টি/,
  // BD job scam
  /part.?time.*\d+.*ঘণ্টা|ঘরে বসে.*আয়/,
  /data.*entry.*\d+.*টাকা|ডেটা এন্ট্রি.*আয়/,
  /registration.*fee.*job|চাকরি.*রেজিস্ট্রেশন.*ফি/i,
  /কাজ.*\d+.*টাকা.*ঘণ্টা/,
  // BD romance scam
  /usa.*বাংলাদেশি|uk.*বাংলাদেশি/i,
  /বিদেশ.*বন্ধু.*টাকা|বিদেশে.*আটকা/,
  /custom.*hold.*parcel.*pay/i,
  /customs.*clearance.*fee/i,
  // BD crypto/investment scam
  /crypto.*daily.*%|daily.*profit.*%/i,
  /telegram.*invest.*group/i,
  /binance.*signal|signal.*group.*profit/i,
  /বিনিয়োগ.*প্রতিদিন.*মুনাফা/,
  // RAB/police impersonation
  /র‍্যাব.*টাকা|পুলিশ.*টাকা/,
  /মামলা.*থেকে.*বাঁচতে.*টাকা/,
  /গ্রেফতার.*এড়াতে/,
  /detective.*branch.*case/i,
  // GP/Robi prize scam
  /grameenphone.*বছর.*পুরস্কার/i,
  /robi.*winner|gp.*winner/i,
  /সিমকার্ড.*লটারি/,
];

const PHISHING_PATTERNS = [
  /https?:\/\/(?!bkash\.com|nagad\.com\.bd|dutchbanglabank\.com|bangladeshbank\.org\.bd|sslcommerz\.com|shurjopay\.com)[^\s]{10,}/i,
  /bit\.ly|tinyurl|t\.co|goo\.gl|cutt\.ly|rb\.gy|is\.gd|tiny\.cc/i,
  /click here.*link/i,
  /verify.*account.*link/i,
  /আপনার তথ্য যাচাই/,
  /এখনই ক্লিক করুন/,
  /লিংকে ক্লিক/,
  /তাৎক্ষণিক|অবিলম্বে ক্লিক/,
  /login.*immediately/i,
  /account.*expire/i,
  // BD-specific phishing
  /bkash-bd\.|bkash\.com\.[^b]/i,
  /nagad-bd\.|nagad\.com\.[^b]/i,
  /bangladeshbank\.gov|bd-bank\./i,
  /nid.*verify.*link/i,
  /election.*commission.*link/i,
  /সরকারি.*সুবিধা.*লিংক/,
  /স্মার্ট কার্ড.*আবেদন.*লিংক/,
  /ভিসা.*আবেদন.*লিংক/,
  /nid.*update.*online.*link/i,
  /birth.*certificate.*link/i,
];

const PROMO_PATTERNS = [
  /\boffer\b/i,
  /\bdiscount\b/i,
  /\bfree\b.*\b(mb|gb|min|sms)\b/i,
  /\b(call|sms)\s*rate\b/i,
  /\brecharge\b.*bonus/i,
  /আজই নিন|সীমিত সময়/,
  /অফার|ছাড়|বোনাস|রিচার্জ/,
  /validity.*days/i,
  /pack (activated|subscribe)/i,
  /grameenphone.*offer|gp.*mb|gp.*internet/i,
  /robi.*offer|airtel.*offer/i,
  /banglalink.*mb|bl.*offer/i,
  /teletalk.*offer/i,
  /বৈধতা.*দিন|মেয়াদ.*দিন/,
];

const MALWARE_PATTERNS = [
  /download.*\.apk/i,
  /install.*free.*app/i,
  /\.apk.*link/i,
  /free.*download.*app/i,
  /mod.*apk/i,
  /cracked.*app|hack.*app/i,
  /premium.*free.*download/i,
  /virus.*remov.*download/i,
  /speed.*boost.*download/i,
  /click.*install.*now/i,
  /ডাউনলোড.*করুন.*apk/i,
  /ফ্রি.*ইনস্টল/,
  /apk.*ডাউনলোড/,
  // BD-specific malware
  /bkash.*app.*update.*link/i,
  /nagad.*app.*download.*link/i,
  /নতুন.*বিকাশ.*অ্যাপ.*ডাউনলোড/,
  /security.*update.*apk/i,
  /banking.*app.*link.*click/i,
  /play.?store.*bypass.*apk/i,
  /free.*fire.*mod|pubg.*mod.*apk/i,
];

const EMERGENCY_PATTERNS = [
  /flood|cyclone|earthquake/i,
  /disaster\s*alert/i,
  /বন্যা|ঘূর্ণিঝড়|ভূমিকম্প/,
  /দুর্যোগ|জরুরি সতর্কতা/,
  /evacuat/i,
  /১০৯৯|ত্রাণ/,
  /alert.*BTRC|BTRC.*alert/i,
  /RED ALERT|orange alert/i,
  /নিরাপদ স্থানে যান|সরে যান/,
  /ঝড়ের সতর্কতা|সংকেত/,
];

// ── Scorer ───────────────────────────────────────────────────────────────────

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

export function categorizeSms(rawText: string): SmsCategoryInfo {
  // C3: Limit input to 2 KB before running regex — prevents ReDoS on crafted strings
  const t = rawText.slice(0, 2000);

  const otpHits      = countMatches(t, OTP_PATTERNS);
  const mfsHits      = countMatches(t, MFS_PATTERNS);
  const otpTheftHits = countMatches(t, OTP_THEFT_PATTERNS);
  const mfsFraudHits = countMatches(t, MFS_FRAUD_PATTERNS);

  // Compound: OTP present + theft attempt — highest priority
  const otpTheftScore = otpHits > 0 && otpTheftHits > 0
    ? (otpHits + otpTheftHits) * 3
    : 0;

  // Compound: MFS brand present + social engineering
  const mfsFraudScore = mfsHits > 0 && mfsFraudHits > 0
    ? (mfsHits + mfsFraudHits) * 3
    : 0;

  const scores: Record<SmsCategory, number> = {
    otp_theft:        otpTheftScore,
    mfs_fraud:        mfsFraudScore,
    otp:              otpHits * 2,
    bank_transaction: countMatches(t, BANK_TXN_PATTERNS),
    mfs:              mfsHits,
    fraud:            countMatches(t, FRAUD_PATTERNS)     * 2,
    phishing:         countMatches(t, PHISHING_PATTERNS)  * 2,
    malware:          countMatches(t, MALWARE_PATTERNS)   * 2,
    promotional:      countMatches(t, PROMO_PATTERNS),
    emergency:        countMatches(t, EMERGENCY_PATTERNS) * 3,
    unknown:          0,
  };

  let best: SmsCategory = 'unknown';
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores) as [SmsCategory, number][]) {
    if (score > bestScore) { bestScore = score; best = cat; }
  }

  // Scale confidence: higher-weighted categories need fewer hits to be confident
  const HIGH_WEIGHT_CATS: SmsCategory[] = ['otp_theft', 'mfs_fraud', 'emergency'];
  const divisor = HIGH_WEIGHT_CATS.includes(best) ? 4 : 8;
  const rawConf = Math.min(bestScore / divisor, 1.0);
  // Floor: if any match at all, minimum 0.35 for threat cats, 0.25 for others
  const THREAT_CATS: SmsCategory[] = ['otp_theft', 'mfs_fraud', 'fraud', 'phishing', 'malware'];
  const minConf = THREAT_CATS.includes(best) && bestScore > 0 ? 0.35 : 0.25;
  const confidence = best === 'unknown' ? 0 : Math.max(rawConf, minConf);
  return { ...CATEGORY_META[best], confidence };
}

// ── Metadata ─────────────────────────────────────────────────────────────────

// N: color field limited to the app's 4-tone system palette (theme's threat/suspicious/
// safe + one neutral indigo) for cross-screen visual consistency. `icon` stays emoji —
// it also feeds OS notification text (notifGuardService/callDetectionService) where
// custom vector icons can't render.
const CATEGORY_META: Record<SmsCategory, Omit<SmsCategoryInfo, 'confidence'>> = {
  otp_theft:        { category: 'otp_theft',        icon: '🔓', label_bn: 'OTP চুরির চেষ্টা',        color: '#ff5555' },
  mfs_fraud:        { category: 'mfs_fraud',        icon: '💳', label_bn: 'বিকাশ/নগদ প্রতারণা',      color: '#ff5555' },
  otp:              { category: 'otp',              icon: '🔑', label_bn: 'OTP / যাচাই কোড',          color: '#818cf8' },
  bank_transaction: { category: 'bank_transaction', icon: '🏦', label_bn: 'ব্যাংক লেনদেন',            color: '#818cf8' },
  mfs:              { category: 'mfs',              icon: '💸', label_bn: 'মোবাইল ব্যাংকিং',          color: '#818cf8' },
  fraud:            { category: 'fraud',            icon: '⚠️', label_bn: 'প্রতারণা / স্ক্যাম',       color: '#ff5555' },
  phishing:         { category: 'phishing',         icon: '🎣', label_bn: 'ফিশিং লিংক',               color: '#ff5555' },
  malware:          { category: 'malware',          icon: '🦠', label_bn: 'ম্যালওয়্যার লিংক',          color: '#ff5555' },
  promotional:      { category: 'promotional',      icon: '📢', label_bn: 'বিজ্ঞাপন / অফার',          color: '#00dd99' },
  emergency:        { category: 'emergency',        icon: '🚨', label_bn: 'জরুরি সতর্কতা',            color: '#ffb300' },
  unknown:          { category: 'unknown',          icon: '💬', label_bn: 'সাধারণ বার্তা',             color: '#8877aa' },
};

export { CATEGORY_META };
