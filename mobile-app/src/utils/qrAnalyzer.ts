// N1: QR content fraud analyzer — classifies scanned QR data and flags
// Bangladesh payment-fraud patterns. Pure local analysis.

import { analyzeUrlLocally } from './urlFeatures';
import { analyzePhoneLocally } from './phoneFeatures';

export type QrKind = 'url' | 'payment' | 'phone' | 'wifi' | 'text';
export type QrRisk = 'safe' | 'suspicious' | 'danger';

export interface QrAnalysis {
  kind: QrKind;
  kind_bn: string;
  risk: QrRisk;
  risk_bn: string;
  signals: string[]; // Bengali human-readable findings
  payload: string;   // the raw QR data (truncated)
}

// Official BD payment/bank domains — anything ELSE claiming to be them is fraud
const OFFICIAL_PAYMENT_DOMAINS = [
  'bkash.com', 'nagad.com.bd', 'rocket.com.bd', 'dutchbanglabank.com',
  'upaybd.com', 'sslcommerz.com', 'shurjopay.com.bd', 'bangladeshbank.org.bd',
];

const SHORTENER_RE = /bit\.ly|tinyurl|t\.co|goo\.gl|cutt\.ly|rb\.gy|is\.gd|tiny\.cc/i;
const BRAND_RE     = /bkash|bikash|nagad|rocket|upay|dbbl|bank/i;
const APK_RE       = /\.apk(\?|$)/i;

function isOfficialDomain(domain: string): boolean {
  return OFFICIAL_PAYMENT_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
}

export function analyzeQrContent(rawData: string): QrAnalysis {
  const data = rawData.slice(0, 2000);
  const signals: string[] = [];

  // ── URL QR ──────────────────────────────────────────────────────────────
  if (/^https?:\/\//i.test(data)) {
    const url = analyzeUrlLocally(data);
    signals.push(...url.risk_signals);

    let risk: QrRisk = 'safe';

    if (APK_RE.test(data)) {
      signals.push('🔴 APK ফাইল ডাউনলোড লিংক — ম্যালওয়্যার ঝুঁকি!');
      risk = 'danger';
    }
    if (SHORTENER_RE.test(data)) {
      signals.push('⚠️ শর্ট লিংক — আসল গন্তব্য লুকানো');
      risk = risk === 'danger' ? 'danger' : 'suspicious';
    }
    // Brand name in URL but NOT the official domain → phishing
    if (BRAND_RE.test(data) && url.domain && !isOfficialDomain(url.domain)) {
      signals.push(`🔴 "${url.domain}" — বিকাশ/নগদ/ব্যাংকের নামে ভুয়া ডোমেইন!`);
      risk = 'danger';
    }
    if (url.domain && isOfficialDomain(url.domain)) {
      signals.push('✅ অফিসিয়াল পেমেন্ট ডোমেইন');
    } else if (risk === 'safe' && (url.is_direct_ip || !url.has_ssl || url.subdomain_count >= 2)) {
      risk = 'suspicious';
    }

    return {
      kind: 'url', kind_bn: '🔗 ওয়েব লিংক',
      risk,
      risk_bn: risk === 'danger' ? 'বিপজ্জনক লিংক!' : risk === 'suspicious' ? 'সন্দেহজনক লিংক' : 'লিংক নিরাপদ মনে হচ্ছে',
      signals, payload: data,
    };
  }

  // ── bKash/Nagad merchant payment QR (EMVCo format starts with "000201") ──
  if (/^000201/.test(data)) {
    const hasBkash = /bkash/i.test(data);
    const hasNagad = /nagad/i.test(data);
    signals.push('💳 EMVCo পেমেন্ট QR ফরম্যাট');
    if (hasBkash) signals.push('✅ bKash মার্চেন্ট QR শনাক্ত');
    if (hasNagad) signals.push('✅ Nagad মার্চেন্ট QR শনাক্ত');
    signals.push('💡 পেমেন্টের আগে মার্চেন্টের নাম অ্যাপে যাচাই করুন');
    return {
      kind: 'payment', kind_bn: '💳 পেমেন্ট QR',
      risk: 'safe',
      risk_bn: 'বৈধ পেমেন্ট ফরম্যাট — নাম যাচাই করুন',
      signals, payload: data,
    };
  }

  // ── Phone number QR (tel: URI or bare number) ────────────────────────────
  const telMatch = data.match(/^tel:(\+?[\d\s-]{5,15})$/i);
  const bareNum  = /^\+?[\d\s-]{5,15}$/.test(data) ? data : null;
  const numStr   = telMatch?.[1] ?? bareNum;
  if (numStr) {
    const pf = analyzePhoneLocally(numStr.trim());
    signals.push(...pf.risk_signals);
    if (pf.operator_bn) signals.push(`📡 অপারেটর: ${pf.operator_bn}`);
    const risk: QrRisk = pf.risk_signals.length > 0 ? 'suspicious' : 'safe';
    return {
      kind: 'phone', kind_bn: '📞 ফোন নম্বর',
      risk,
      risk_bn: risk === 'suspicious' ? 'সন্দেহজনক নম্বর' : 'নম্বর — EProhori-তে যাচাই করুন',
      signals, payload: numStr.trim(),
    };
  }

  // ── WiFi QR ───────────────────────────────────────────────────────────────
  if (/^WIFI:/i.test(data)) {
    signals.push('⚠️ অচেনা WiFi-তে যুক্ত হলে আপনার তথ্য চুরি হতে পারে');
    return {
      kind: 'wifi', kind_bn: '📶 WiFi নেটওয়ার্ক',
      risk: 'suspicious',
      risk_bn: 'অচেনা WiFi — সাবধান',
      signals, payload: data,
    };
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  return {
    kind: 'text', kind_bn: '📝 সাধারণ টেক্সট',
    risk: 'safe',
    risk_bn: 'টেক্সট — বার্তা বিশ্লেষণে পরীক্ষা করুন',
    signals, payload: data,
  };
}
