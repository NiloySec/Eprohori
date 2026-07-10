import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import { useSettingsStore } from '../stores/settingsStore';

// S3: Family Guardian Alert — when a high-confidence threat is detected, the
// device opens the SMS compose screen pre-filled with a warning message to a
// trusted contact (e.g. an adult child). The user must tap send — this
// deliberately avoids silent background SMS sending, which requires the
// sensitive SEND_SMS permission and is heavily restricted by Play Store
// policy for apps that aren't the default SMS handler.

const THROTTLE_MS = 10 * 60 * 1000; // don't re-prompt more than once per 10 min
let lastPromptAt = 0;

// S3b: best-effort, one-shot foreground location fetch — never blocks or
// fails the alert itself. Only ever called when the user has opted in via
// the guardianLocationEnabled setting, and only requests foreground
// permission (no background tracking, nothing periodic).
async function tryGetLocationLink(): Promise<string | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const req = await Location.requestForegroundPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (!granted) return null;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = pos.coords;
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  } catch {
    return null;
  }
}

export async function maybeAlertGuardian(confidencePercent: number, contextLabel: string): Promise<void> {
  const s = useSettingsStore.getState();
  if (!s.guardianAlertEnabled) return;
  const guardianNumber = s.guardianNumber.trim();
  if (!guardianNumber) return;
  if (confidencePercent < s.guardianThreshold) return;

  const now = Date.now();
  if (now - lastPromptAt < THROTTLE_MS) return;
  lastPromptAt = now;

  try {
    const available = await SMS.isAvailableAsync();
    if (!available) return;

    let body =
      `🚨 EProhori সতর্কতা: আমার ফোনে একটি উচ্চ-ঝুঁকির প্রতারণা (${contextLabel}) সনাক্ত হয়েছে ` +
      `(${Math.round(confidencePercent)}% নিশ্চয়তা)। একটু খোঁজ নিও, আমি ঠিক আছি কিনা।`;

    if (s.guardianLocationEnabled) {
      const link = await tryGetLocationLink();
      if (link) body += `\n📍 আমার বর্তমান অবস্থান: ${link}`;
    }

    await SMS.sendSMSAsync([guardianNumber], body);
  } catch {}
}

// S5: used by the SOS button on ResultScreen — sends the guardian a location
// link immediately, regardless of the confidence threshold/throttle above,
// since the user explicitly asked for help right now.
export async function sendSOSLocationToGuardian(guardianNumber: string): Promise<boolean> {
  try {
    const available = await SMS.isAvailableAsync();
    if (!available) return false;

    const link = await tryGetLocationLink();
    const body = link
      ? `🆘 আমি বিপদে আছি! আমার বর্তমান অবস্থান: ${link}`
      : `🆘 আমি বিপদে আছি! দয়া করে যোগাযোগ করো।`;

    await SMS.sendSMSAsync([guardianNumber], body);
    return true;
  } catch {
    return false;
  }
}
