import { NativeModules } from 'react-native';
import { useHistoryStore } from '../stores/historyStore';

// S7: pushes today's scan/threat counts to the home-screen widget.
// Null-safe — no-op in Expo Go where the native module isn't linked.

const WidgetStatsNative: {
  updateStats: (scansToday: number, threatsToday: number) => Promise<boolean>;
} | null = NativeModules.WidgetStats ?? null;

export function isWidgetStatsAvailable(): boolean {
  return !!WidgetStatsNative;
}

// Recompute today's counts from history and push them to the widget
export async function syncWidgetStats(): Promise<void> {
  if (!WidgetStatsNative) return;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cutoff = todayStart.getTime();

    const entries = useHistoryStore.getState().entries.filter((e) => e.timestamp >= cutoff);
    const scans   = entries.length;
    const threats = entries.filter((e) => e.result.confidence >= 60).length;

    await WidgetStatsNative.updateStats(scans, threats);
  } catch {}
}
