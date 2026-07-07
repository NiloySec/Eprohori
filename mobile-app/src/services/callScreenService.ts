import { NativeModules } from 'react-native';

// P3: call-screening role — blocks blocklisted numbers before the phone
// rings. Blocklist snapshot lives in native SharedPreferences so the
// screening service works even when JS isn't running.

const CallScreenNative: {
  isSupported: () => Promise<boolean>;
  isRoleHeld: () => Promise<boolean>;
  requestRole: () => Promise<boolean>;
  updateBlocklist: (numbers: string[]) => Promise<number>;
} | null = NativeModules.CallScreen ?? null;

export function isCallScreeningAvailable(): boolean {
  return !!CallScreenNative;
}

export async function isCallScreeningSupported(): Promise<boolean> {
  if (!CallScreenNative) return false;
  try { return await CallScreenNative.isSupported(); } catch { return false; }
}

export async function isCallScreeningRoleHeld(): Promise<boolean> {
  if (!CallScreenNative) return false;
  try { return await CallScreenNative.isRoleHeld(); } catch { return false; }
}

// Shows the Android system dialog asking to make EProhori the screening app
export async function requestCallScreeningRole(): Promise<boolean> {
  if (!CallScreenNative) return false;
  try { return await CallScreenNative.requestRole(); } catch { return false; }
}

// The user's blocklist (Settings → Blocklist) accepts arbitrary free-text
// keywords, not just phone numbers — e.g. "লটারি" or a scam URL fragment.
// Only entries that are shaped like an actual phone number may reach the
// native call-screening list; a keyword containing 3+ digits (a URL like
// "site123.com") must never turn into a digit-blocklist entry that could
// silently reject a legitimate call sharing those digits.
function looksLikePhoneNumber(entry: string): boolean {
  const stripped = entry.trim().replace(/[\s\-()]/g, '');
  const digitsOnly = stripped.replace(/^\+/, '');
  return /^\d{7,15}$/.test(digitsOnly);
}

// Push the current blocklist into native storage (call whenever it changes)
export async function syncBlocklistToNative(numbers: string[]): Promise<void> {
  if (!CallScreenNative) return;
  const phoneEntries = numbers.filter(looksLikePhoneNumber);
  try { await CallScreenNative.updateBlocklist(phoneEntries); } catch {}
}
