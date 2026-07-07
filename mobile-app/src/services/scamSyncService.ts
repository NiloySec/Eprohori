import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../stores/settingsStore';
import { extractPhoneNumbers } from '../utils/phoneFeatures';

const API_BASE  = 'https://eprohori-production.up.railway.app';
const CACHE_KEY = 'eprohori.scam_sync_numbers_v2';
const SYNC_TTL  = 24 * 60 * 60 * 1000; // 24 hours

export interface SyncedNumber { number: string; category: string; count: number }

// Real backend shape (verified): /api/threats → { content, type, confidence, status, ... }
interface ThreatItem {
  content?: string;
  type?: string;
  confidence?: number;
  status?: string;
}

// R3: build a community scam-number list by extracting phone numbers from
// verified community threat reports. (/api/spam-numbers does not exist on the
// backend — numbers live inside threat report content.)
export async function runScamSync(): Promise<void> {
  const store = useSettingsStore.getState();
  const lastSync = store.scamSyncLastAt;
  if (Date.now() - lastSync < SYNC_TTL) return; // still fresh

  try {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE}/api/threats?limit=200`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EProhori-Mobile/1.x' },
    });
    clearTimeout(abort);
    if (!res.ok) return;

    const raw: unknown = await res.json();
    if (!Array.isArray(raw)) return;

    // Count how many separate reports mention each number
    const tally = new Map<string, { count: number; category: string; verified: number }>();
    for (const t of raw as ThreatItem[]) {
      if (!t.content) continue;
      const nums = extractPhoneNumbers(t.content);
      for (const num of nums) {
        const key = num.replace(/\D/g, '');
        if (key.length < 5) continue;
        const cur = tally.get(key) ?? { count: 0, category: t.type ?? 'other', verified: 0 };
        cur.count += 1;
        if (t.status === 'verified' || (t.confidence ?? 0) >= 0.75) cur.verified += 1;
        tally.set(key, cur);
      }
    }

    const entries: SyncedNumber[] = [...tally.entries()]
      .filter(([, v]) => v.count >= 1)
      .map(([number, v]) => ({ number, category: v.category, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 200);

    // Persist for offline reference (leaderboard, CallerID hints)
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries)).catch(() => {});

    // Auto-blocklist only high-confidence numbers: mentioned in ≥3 reports
    // with at least 2 of them verified — conservative to avoid false blocks
    for (const [number, v] of tally.entries()) {
      if (v.count >= 3 && v.verified >= 2) store.addToBlocklist(number);
    }

    store.setScamSyncLastAt(Date.now());
  } catch {}
}

export async function getSyncedNumbers(): Promise<SyncedNumber[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SyncedNumber[]) : [];
  } catch {
    return [];
  }
}
