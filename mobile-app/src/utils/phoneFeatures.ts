import { getDivision } from './phonePrefix';

export interface PhoneFeatures {
  is_bd_number: boolean;
  operator: string | null;
  operator_bn: string | null;
  division_bn: string | null;  // approximate geographic origin
  number_type: 'mobile' | 'landline' | 'short_code' | 'international' | 'unknown';
  formatted: string;
  risk_signals: string[];
  risk_level: 'safe' | 'warn' | 'threat';
}

const OPERATORS: Record<string, { name: string; name_bn: string }> = {
  '013': { name: 'Grameenphone', name_bn: 'গ্রামীণফোন' },
  '017': { name: 'Grameenphone', name_bn: 'গ্রামীণফোন' },
  '014': { name: 'Banglalink',   name_bn: 'বাংলালিংক' },
  '019': { name: 'Banglalink',   name_bn: 'বাংলালিংক' },
  '015': { name: 'Teletalk',     name_bn: 'টেলিটক' },
  '016': { name: 'Airtel/Robi',  name_bn: 'এয়ারটেল/রবি' },
  '018': { name: 'Robi',         name_bn: 'রবি' },
};

const INTL_ORIGINS: Record<string, string> = {
  '44':  'যুক্তরাজ্য (UK)',
  '91':  'ভারত (India)',
  '92':  'পাকিস্তান',
  '1':   'USA/Canada',
  '86':  'চীন (China)',
  '7':   'রাশিয়া (Russia)',
};

function normalizeNumber(input: string): string {
  let n = input.replace(/[\s\-().]/g, '');
  if (n.startsWith('+880'))      n = '0' + n.slice(4);
  else if (n.startsWith('880'))  n = '0' + n.slice(3);
  return n;
}

export function analyzePhoneLocally(input: string): PhoneFeatures {
  const raw = input.trim();
  const risk_signals: string[] = [];

  // International (non-BD)
  if (raw.startsWith('+') && !raw.startsWith('+880')) {
    const digits = raw.slice(1);
    const origin =
      INTL_ORIGINS[digits.slice(0, 2)] ??
      INTL_ORIGINS[digits.slice(0, 1)] ??
      `+${digits.slice(0, 3)}`;
    risk_signals.push(`⚠️ আন্তর্জাতিক নম্বর — ${origin} — প্রতারণার সম্ভাবনা বেশি`);
    return {
      is_bd_number: false, operator: null, operator_bn: null, division_bn: null,
      number_type: 'international', formatted: raw,
      risk_signals, risk_level: 'warn',
    };
  }

  const normalized = normalizeNumber(raw);

  // Short codes (bank, operator short numbers 3–6 digits)
  if (/^\d{3,6}$/.test(normalized)) {
    return {
      is_bd_number: true, operator: 'Short Code', operator_bn: 'শর্ট কোড', division_bn: null,
      number_type: 'short_code', formatted: normalized,
      risk_signals: [], risk_level: 'safe',
    };
  }

  // BD mobile: 01[3-9]XXXXXXXX
  if (/^01[3-9]\d{8}$/.test(normalized)) {
    const prefix = normalized.slice(0, 3);
    const op     = OPERATORS[prefix];
    const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 7)}-${normalized.slice(7)}`;
    return {
      is_bd_number: true,
      operator:    op?.name    ?? null,
      operator_bn: op?.name_bn ?? null,
      division_bn: getDivision(normalized),
      number_type: 'mobile',
      formatted,
      risk_signals,
      risk_level: 'safe',
    };
  }

  // BD landline: 02XXXXXXXX or 0XX-XXXXXX
  if (/^0[2-9]\d{7,8}$/.test(normalized)) {
    return {
      is_bd_number: true, operator: 'Landline', operator_bn: 'ল্যান্ডলাইন', division_bn: null,
      number_type: 'landline', formatted: normalized,
      risk_signals: [], risk_level: 'safe',
    };
  }

  risk_signals.push('⚠️ অপরিচিত নম্বর ফরম্যাট — সতর্কতার সাথে যোগাযোগ করুন');
  return {
    is_bd_number: false, operator: null, operator_bn: null, division_bn: null,
    number_type: 'unknown', formatted: raw,
    risk_signals, risk_level: 'warn',
  };
}

// Extract BD or international phone numbers embedded in SMS text
export function extractPhoneNumbers(text: string): string[] {
  const patterns = [
    /(?:\+?880|0)1[3-9]\d{8}/g,
    /\+[1-9]\d{6,14}/g,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    for (const m of text.match(re) ?? []) {
      found.add(m.replace(/\s/g, ''));
    }
  }
  return Array.from(found);
}
