import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KNOWN_BD_NUMBERS: Record<string, { name: string; type: 'bank' | 'operator' | 'service' | 'emergency' | 'commerce' | 'health' }> = {
  // ── Emergency ──────────────────────────────────────────────────────────────
  '999':   { name: 'জরুরি সেবা (National Emergency)',   type: 'emergency' },
  '100':   { name: 'পুলিশ হেল্পলাইন',                  type: 'emergency' },
  '199':   { name: 'ফায়ার সার্ভিস / অ্যাম্বুলেন্স',   type: 'emergency' },
  '1090':  { name: 'র‍্যাব হেল্পলাইন',                  type: 'emergency' },
  '16123': { name: 'ভোক্তা অধিকার হেল্পলাইন',          type: 'emergency' },
  '16000': { name: 'স্বাস্থ্য বাতায়ন (Health Hotline)', type: 'health' },

  // ── Mobile Operators ───────────────────────────────────────────────────────
  '121':   { name: 'অপারেটর হেল্পলাইন (GP/BL/TT)',      type: 'operator' },
  '123':   { name: 'Robi / Airtel হেল্পলাইন',           type: 'operator' },
  '16430': { name: 'BTCL হেল্পলাইন',                    type: 'operator' },

  // ── MFS / Mobile Banking ───────────────────────────────────────────────────
  '16247': { name: 'bKash কাস্টমার কেয়ার',              type: 'bank' },
  '16167': { name: 'Nagad কাস্টমার কেয়ার',              type: 'bank' },
  '16216': { name: 'Dutch-Bangla Bank / Rocket',          type: 'bank' },
  '16374': { name: 'Upay কাস্টমার কেয়ার',               type: 'bank' },
  '16322': { name: 'SureCash হেল্পলাইন',                 type: 'bank' },

  // ── State-Owned Banks ──────────────────────────────────────────────────────
  '16202': { name: 'Sonali Bank হেল্পলাইন',             type: 'bank' },
  '16455': { name: 'Janata Bank হেল্পলাইন',             type: 'bank' },
  '16400': { name: 'Agrani Bank হেল্পলাইন',             type: 'bank' },
  '16168': { name: 'Rupali Bank হেল্পলাইন',             type: 'bank' },
  '16600': { name: 'বাংলাদেশ ব্যাংক হেল্পলাইন',         type: 'bank' },

  // ── Private Banks ──────────────────────────────────────────────────────────
  '16221': { name: 'BRAC Bank হেল্পলাইন',               type: 'bank' },
  '16259': { name: 'Islami Bank হেল্পলাইন',             type: 'bank' },
  '16288': { name: 'City Bank হেল্পলাইন',               type: 'bank' },
  '16236': { name: 'Standard Chartered Bank',            type: 'bank' },
  '16230': { name: 'AB Bank হেল্পলাইন',                 type: 'bank' },
  '16229': { name: 'Eastern Bank (EBL) হেল্পলাইন',      type: 'bank' },
  '16256': { name: 'Dhaka Bank হেল্পলাইন',              type: 'bank' },
  '16232': { name: 'Southeast Bank হেল্পলাইন',          type: 'bank' },
  '16444': { name: 'Mutual Trust Bank (MTB)',            type: 'bank' },
  '16538': { name: 'Mercantile Bank হেল্পলাইন',         type: 'bank' },
  '16223': { name: 'Trust Bank হেল্পলাইন',              type: 'bank' },
  '16318': { name: 'One Bank হেল্পলাইন',                type: 'bank' },
  '16225': { name: 'NCC Bank হেল্পলাইন',                type: 'bank' },
  '16218': { name: 'Exim Bank হেল্পলাইন',               type: 'bank' },
  '16345': { name: 'Shahjalal Islami Bank',              type: 'bank' },
  '16278': { name: 'First Security Islami Bank (FSIBL)',type: 'bank' },
  '16419': { name: 'Bank Asia হেল্পলাইন',               type: 'bank' },
  '16268': { name: 'Prime Bank হেল্পলাইন',              type: 'bank' },
  '16238': { name: 'United Commercial Bank (UCB)',       type: 'bank' },
  '16648': { name: 'HSBC Bangladesh',                    type: 'bank' },
  '16516': { name: 'Social Islami Bank (SIBL)',          type: 'bank' },

  // ── Government Services ────────────────────────────────────────────────────
  '105':   { name: 'NID হেল্পলাইন (জাতীয় পরিচয়পত্র)', type: 'service' },
  '333':   { name: 'সরকারি তথ্য সেবা (a2i)',             type: 'service' },
  '16126': { name: 'BRTA হেল্পলাইন',                    type: 'service' },
  '10611': { name: 'NBR ট্যাক্স হেল্পলাইন',             type: 'service' },
  '16580': { name: 'NBR ভ্যাট হেল্পলাইন',               type: 'service' },
  '16162': { name: 'ই-পাসপোর্ট হেল্পলাইন',              type: 'service' },
  '10655': { name: 'বাংলাদেশ রেলওয়ে',                   type: 'service' },
  '16339': { name: 'BIDA (বিনিয়োগ উন্নয়ন কর্তৃপক্ষ)',  type: 'service' },
  '16777': { name: 'জাতীয় পরিচয় নিবন্ধন',             type: 'service' },
  '10678': { name: 'BTRC হেল্পলাইন',                    type: 'service' },

  // ── Utilities ──────────────────────────────────────────────────────────────
  '16990': { name: 'DPDC (ঢাকা বিদ্যুৎ উত্তর)',        type: 'service' },
  '16116': { name: 'DESCO (ঢাকা বিদ্যুৎ দক্ষিণ)',       type: 'service' },
  '16260': { name: 'Titas গ্যাস হেল্পলাইন',             type: 'service' },
  '16560': { name: 'BPDB (পল্লী বিদ্যুৎ)',              type: 'service' },
  '16300': { name: 'WASA হেল্পলাইন (পানি সরবরাহ)',       type: 'service' },

  // ── E-Commerce / Food / Courier ────────────────────────────────────────────
  '16752': { name: 'Daraz Customer Care',                type: 'commerce' },
  '16388': { name: 'Foodpanda বাংলাদেশ',                 type: 'commerce' },
  '09678016345': { name: 'Chaldal গ্রাহক সেবা',         type: 'commerce' },
  '09678016888': { name: 'Shajgoj গ্রাহক সেবা',         type: 'commerce' },
  '16549': { name: 'Shohoz রাইড / ফুড',                 type: 'commerce' },
  '16789': { name: 'Pathao গ্রাহক সেবা',                 type: 'commerce' },
  '16570': { name: 'Paperfly কুরিয়ার',                  type: 'commerce' },
  '16445': { name: 'eCourier গ্রাহক সেবা',              type: 'commerce' },
  '16769': { name: 'RedX কুরিয়ার',                       type: 'commerce' },
  '16700': { name: 'Sundarban Courier',                  type: 'commerce' },

  // ── Healthcare ─────────────────────────────────────────────────────────────
  '10652': { name: 'National Heart Foundation',          type: 'health' },
  '16477': { name: 'DGHS স্বাস্থ্য হেল্পলাইন',           type: 'health' },
};

export const KNOWN_TYPE_ICON: Record<string, string> = {
  bank:      '🏦',
  operator:  '📡',
  service:   '🏛️',
  emergency: '🚨',
  commerce:  '🛒',
  health:    '🏥',
};

function normalizeKey(num: string): string {
  return num.replace(/\D/g, '');
}

export type TagSource = 'known' | 'user';

// User-corrected operators for ported numbers: normalizedNumber → operator_bn
export const BD_OPERATORS: { label: string; value: string }[] = [
  { label: 'গ্রামীণফোন (GP)',  value: 'গ্রামীণফোন' },
  { label: 'বাংলালিংক (BL)',   value: 'বাংলালিংক' },
  { label: 'রবি (Robi)',       value: 'রবি' },
  { label: 'এয়ারটেল/রবি',     value: 'এয়ারটেল/রবি' },
  { label: 'টেলিটক (TT)',      value: 'টেলিটক' },
];

interface NameTagState {
  userTags:        Record<string, string>;
  portedOperators: Record<string, string>; // number → corrected operator_bn

  setTag:               (number: string, name: string)     => void;
  removeTag:            (number: string)                   => void;
  getTag:               (number: string)                   => string | null;
  getTagSource:         (number: string)                   => TagSource | null;
  isKnown:              (number: string)                   => boolean;
  setPortedOperator:    (number: string, op_bn: string)    => void;
  clearPortedOperator:  (number: string)                   => void;
  getEffectiveOperator: (number: string, detected: string | null) => { op_bn: string | null; ported: boolean };
}

export const useNameTagStore = create<NameTagState>()(
  persist(
    (set, get) => ({
      userTags: {},
      portedOperators: {},

      setTag: (number, name) => {
        const key = normalizeKey(number);
        if (!key || !name.trim()) return;
        set((s) => ({ userTags: { ...s.userTags, [key]: name.trim() } }));
      },

      removeTag: (number) => {
        const key = normalizeKey(number);
        set((s) => { const next = { ...s.userTags }; delete next[key]; return { userTags: next }; });
      },

      getTag: (number) => {
        const key = normalizeKey(number);
        return KNOWN_BD_NUMBERS[key]?.name ?? get().userTags[key] ?? null;
      },

      getTagSource: (number) => {
        const key = normalizeKey(number);
        if (KNOWN_BD_NUMBERS[key]) return 'known';
        if (get().userTags[key])   return 'user';
        return null;
      },

      isKnown: (number) => {
        const key = normalizeKey(number);
        return key in KNOWN_BD_NUMBERS || key in get().userTags;
      },

      setPortedOperator: (number, op_bn) => {
        const key = normalizeKey(number);
        if (!key) return;
        set((s) => ({ portedOperators: { ...s.portedOperators, [key]: op_bn } }));
      },

      clearPortedOperator: (number) => {
        const key = normalizeKey(number);
        set((s) => { const next = { ...s.portedOperators }; delete next[key]; return { portedOperators: next }; });
      },

      getEffectiveOperator: (number, detected) => {
        const key = normalizeKey(number);
        const corrected = get().portedOperators[key];
        if (corrected) return { op_bn: corrected, ported: true };
        return { op_bn: detected, ported: false };
      },
    }),
    { name: 'name-tag-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
