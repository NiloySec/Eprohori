import AsyncStorage from '@react-native-async-storage/async-storage';

// Local crash log — a fallback for when Sentry has no DSN configured (see
// sentry.ts). Keeps the last few crashes on-device so at least *something*
// is inspectable/shareable, even with zero external crash-reporting setup.

const STORAGE_KEY = 'eprohori.crash_log';
const MAX_ENTRIES = 20;

export interface CrashLogEntry {
  timestamp: number;
  message: string;
  stack?: string;
  componentStack?: string;
}

export async function logCrash(error: Error, componentStack?: string): Promise<void> {
  try {
    const entry: CrashLogEntry = {
      timestamp: Date.now(),
      message: error.message ?? 'Unknown error',
      stack: error.stack,
      componentStack,
    };
    const existing = await getCrashLogs();
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Logging a crash must never itself throw.
  }
}

export async function getCrashLogs(): Promise<CrashLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearCrashLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function formatCrashLogForSharing(entries: CrashLogEntry[]): string {
  if (entries.length === 0) return 'কোনো ক্র্যাশ লগ নেই।';
  return entries
    .map((e, i) => {
      const date = new Date(e.timestamp).toLocaleString('bn-BD');
      return `#${i + 1} — ${date}\n${e.message}\n${e.stack ?? ''}`.trim();
    })
    .join('\n\n---\n\n');
}
