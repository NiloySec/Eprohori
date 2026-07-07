import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../stores/settingsStore';

const API_BASE       = 'https://eprohori-production.up.railway.app';
const SEEN_KEY       = 'eprohori.district_alert_seen_ids_v2';
const CHECK_TTL      = 60 * 60 * 1000; // 1 hour between checks
const LAST_CHECK_KEY = 'eprohori.district_alert_last_check';

// Real backend shapes (verified against production API):
// /api/alerts  → { id, title, message, severity, created_at }  (national alerts)
// /api/threats → { id, content, type, district, region, confidence, status, ... }
interface NationalAlert { id: number | string; title?: string; message?: string; severity?: string }
interface ThreatItem {
  id: number | string;
  content?: string;
  type?: string;
  district?: string | null;
  region?: string | null;
  confidence?: number;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EProhori-Mobile/1.x' },
    });
    clearTimeout(abort);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// R5: notify on new high-severity national alerts + new threats in user's district
export async function checkDistrictAlerts(): Promise<void> {
  const store = useSettingsStore.getState();
  if (!store.districtAlertEnabled || !store.userDistrict.trim()) return;

  // Throttle: don't check more than once per hour
  const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => null);
  if (lastCheck && Date.now() - parseInt(lastCheck, 10) < CHECK_TTL) return;
  await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(() => {});

  const seenRaw = await AsyncStorage.getItem(SEEN_KEY).catch(() => null);
  const seenIds = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
  const district = store.userDistrict.trim().toLowerCase();

  let notifTitle: string | null = null;
  let notifBody:  string | null = null;

  // ── 1. National alerts (critical/high) ──────────────────────────────────
  const alerts = await fetchJson<NationalAlert[]>('/api/alerts');
  if (Array.isArray(alerts)) {
    const fresh = alerts.filter(
      (a) => !seenIds.has(`a:${a.id}`) && (a.severity === 'critical' || a.severity === 'high')
    );
    fresh.forEach((a) => seenIds.add(`a:${a.id}`));
    if (fresh.length > 0) {
      notifTitle = '🚨 নতুন জাতীয় সতর্কতা';
      notifBody  = fresh[0].title ?? fresh[0].message ?? 'নতুন হুমকি সনাক্ত হয়েছে';
    }
  }

  // ── 2. District-specific verified threats ───────────────────────────────
  const threats = await fetchJson<ThreatItem[]>('/api/threats?limit=50');
  if (Array.isArray(threats)) {
    const inDistrict = threats.filter((t) => {
      if (seenIds.has(`t:${t.id}`)) return false;
      if ((t.confidence ?? 0) < 0.75) return false;
      const loc = `${t.district ?? ''} ${t.region ?? ''}`.toLowerCase();
      return loc.includes(district);
    });
    inDistrict.forEach((t) => seenIds.add(`t:${t.id}`));
    if (inDistrict.length > 0) {
      // District threat is more relevant to the user — takes priority
      notifTitle = `🚨 ${store.userDistrict} জেলায় নতুন হুমকি`;
      notifBody  = (inDistrict[0].content ?? 'নতুন প্রতারণা রিপোর্ট হয়েছে').slice(0, 120);
    }
  }

  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seenIds].slice(-500))).catch(() => {});

  if (!notifTitle) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notifTitle,
      body:  notifBody ?? '',
      data:  { screen: 'FraudAlerts' },
      sound: undefined,
    },
    trigger: null,
  }).catch(() => {});
}
