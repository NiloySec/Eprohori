import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpamCategory =
  | 'fraud_call'
  | 'telemarketing'
  | 'otp_abuse'
  | 'threat'
  | 'robocall'
  | 'silence'
  | 'other';

export const SPAM_CATEGORIES: Record<SpamCategory, { label: string; label_bn: string; icon: string }> = {
  fraud_call:    { label: 'Fraud Call',    label_bn: 'প্রতারণা কল',        icon: '💰' },
  telemarketing: { label: 'Telemarketing', label_bn: 'মার্কেটিং/বিজ্ঞাপন', icon: '📢' },
  otp_abuse:     { label: 'OTP Abuse',     label_bn: 'OTP/পিন চাওয়া',      icon: '🔑' },
  threat:        { label: 'Threat',        label_bn: 'হুমকি/ব্ল্যাকমেইল',   icon: '⚠️' },
  robocall:      { label: 'Robocall',      label_bn: 'অটো রেকর্ডেড কল',    icon: '🤖' },
  silence:       { label: 'Silent Call',   label_bn: 'নীরব কল',             icon: '🔇' },
  other:         { label: 'Other',         label_bn: 'অন্যান্য',             icon: '❓' },
};

// Higher = more dangerous
const CATEGORY_SEVERITY: Record<SpamCategory, number> = {
  threat:        1.0,
  fraud_call:    0.9,
  otp_abuse:     0.75,
  robocall:      0.55,
  other:         0.5,
  telemarketing: 0.35,
  silence:       0.2,
};

export interface SpamReport {
  category: SpamCategory;
  note: string;
  reported_at: number;
}

export interface NumberRecord {
  number: string;
  reports: SpamReport[];
}

// Pure function — no store state needed
export function calcSpamScore(reports: SpamReport[]): number {
  if (reports.length === 0) return 0;
  // M1: only count reports from the last 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recent = reports.filter((r) => r.reported_at > cutoff);
  if (recent.length === 0) return 0;
  const count       = recent.length;
  const countScore  = Math.min(count / 10, 1.0);
  const avgSeverity = recent.reduce((s, r) => s + (CATEGORY_SEVERITY[r.category] ?? 0.5), 0) / count;
  const uniqueCats  = new Set(recent.map((r) => r.category)).size;
  const divScore    = Math.min(uniqueCats / 3, 1.0);
  // Weights: 0.5 + 0.35 + 0.15 = 1.0
  return Math.round(Math.min(countScore * 0.5 + avgSeverity * 0.35 + divScore * 0.15, 1.0) * 100) / 100;
}

export function getSpamLabel(score: number): { text: string; color: string } {
  if (score >= 0.75) return { text: 'অত্যন্ত বিপজ্জনক', color: '#ef4444' };
  if (score >= 0.5)  return { text: 'সন্দেহজনক',         color: '#f97316' };
  if (score >= 0.25) return { text: 'সতর্ক থাকুন',       color: '#fbbf24' };
  return                    { text: 'কম ঝুঁকি',           color: '#4ade80' };
}

interface SpamNumberState {
  records: Record<string, NumberRecord>;
  safeMarks: string[]; // N9: numbers the user marked as verified-safe
  reportNumber:   (number: string, category: SpamCategory, note?: string) => void;
  getReports:     (number: string) => SpamReport[];
  getReportCount: (number: string) => number;
  getSpamScore:   (number: string) => number;
  getTopCategory: (number: string) => SpamCategory | null;
  getAllNumbers:   () => NumberRecord[];
  removeReports:  (number: string) => void;
  isReported:     (number: string) => boolean;
  toggleSafeMark: (number: string) => void;
  isSafeMarked:   (number: string) => boolean;
}

export const useSpamNumberStore = create<SpamNumberState>()(
  persist(
    (set, get) => ({
      records: {},
      safeMarks: [],

      reportNumber: (number, category, note = '') => {
        // M17: coerce unknown category to 'other' rather than let invalid value propagate
        const safeCategory: SpamCategory = SPAM_CATEGORIES[category] ? category : 'other';
        const key = number.replace(/\D/g, '');
        const now = Date.now();
        set((s) => {
          const existing = s.records[key] ?? { number, reports: [] };
          // H10: deduplicate — ignore if same category was reported in last 60 s (concurrent tap guard)
          const isDuplicate = existing.reports.some(
            (r) => r.category === safeCategory && now - r.reported_at < 60_000
          );
          if (isDuplicate) return s;
          return {
            records: {
              ...s.records,
              [key]: {
                ...existing,
                reports: [...existing.reports, { category: safeCategory, note, reported_at: now }],
              },
            },
          };
        });
      },

      getReports: (number) => {
        const key = number.replace(/\D/g, '');
        return get().records[key]?.reports ?? [];
      },

      getReportCount: (number) => {
        const key = number.replace(/\D/g, '');
        return get().records[key]?.reports.length ?? 0;
      },

      getSpamScore: (number) => {
        const key = number.replace(/\D/g, '');
        return calcSpamScore(get().records[key]?.reports ?? []);
      },

      getTopCategory: (number) => {
        const key     = number.replace(/\D/g, '');
        const reports = get().records[key]?.reports ?? [];
        if (reports.length === 0) return null;
        const counts: Partial<Record<SpamCategory, number>> = {};
        for (const r of reports) counts[r.category] = (counts[r.category] ?? 0) + 1;
        return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as SpamCategory) ?? null;
      },

      getAllNumbers: () =>
        Object.values(get().records)
          .filter((r) => r.reports.length > 0)
          .sort((a, b) => calcSpamScore(b.reports) - calcSpamScore(a.reports)),

      removeReports: (number) => {
        const key = number.replace(/\D/g, '');
        set((s) => { const next = { ...s.records }; delete next[key]; return { records: next }; });
      },

      isReported: (number) => {
        const key = number.replace(/\D/g, '');
        return (get().records[key]?.reports.length ?? 0) > 0;
      },

      // N9: user-side verified-safe mark (badge shown when no spam reports exist)
      toggleSafeMark: (number) => {
        const key = number.replace(/\D/g, '');
        if (!key) return;
        set((s) => ({
          safeMarks: s.safeMarks.includes(key)
            ? s.safeMarks.filter((x) => x !== key)
            : [...s.safeMarks, key],
        }));
      },
      isSafeMarked: (number) => get().safeMarks.includes(number.replace(/\D/g, '')),
    }),
    { name: 'spam-number-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
