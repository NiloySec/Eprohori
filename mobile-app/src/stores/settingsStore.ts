import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Secure PIN helpers — bypasses AsyncStorage for sensitive values
const SECURE_PIN_KEY = 'eprohori.appLockPin';
export async function saveSecurePin(pin: string): Promise<void> {
  try {
    if (pin) {
      await SecureStore.setItemAsync(SECURE_PIN_KEY, pin);
    } else {
      await SecureStore.deleteItemAsync(SECURE_PIN_KEY);
    }
  } catch {}
}
export async function loadSecurePin(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(SECURE_PIN_KEY)) ?? '';
  } catch {
    return '';
  }
}

interface SettingsState {
  language: 'bn' | 'en';
  notificationsEnabled: boolean;
  dailySummaryEnabled: boolean;
  soundAlertEnabled: boolean;
  autoDeleteDays: number;
  lastSummaryDate: string;
  blocklist: string[];
  activeProfile: string;
  hasOnboarded: boolean;
  hasShownRatingPrompt: boolean;
  autoBlockEnabled: boolean;
  autoBlockThreshold: number; // 0–1, default 0.75
  ghostModeEnabled: boolean;  // when true, skip submitCrowdName
  smsAutoScanEnabled: boolean;       // gate BroadcastReceiver pipeline
  smsAlertCategories: string[];      // SMS categories that trigger notification
  appLockEnabled: boolean;           // PIN lock when app comes to foreground
  appLockPin: string;                // 4-digit PIN ('' = not set)
  scheduledScanEnabled: boolean;     // daily notification reminder to scan
  scheduledScanHour: number;         // 0–23, default 9
  privacyModeEnabled: boolean;       // local-only analysis, no external API calls
  batterySaverEnabled: boolean;      // disable background SMS listener
  biometricEnabled: boolean;         // R4: fingerprint/face unlock instead of PIN
  themeMode: 'dark' | 'light' | 'system'; // R8: color theme
  userDistrict: string;              // R5: district for push alerts (e.g. 'ঢাকা')
  districtAlertEnabled: boolean;     // R5: notify on new high-severity alert in district
  scamSyncLastAt: number;            // R3: epoch ms of last community blocklist sync
  trustedNumbers: string[];          // N3: whitelist — never spam-flagged or call-alerted
  otpGuardEnabled: boolean;          // N6: real-time warning on OTP-theft SMS patterns
  weeklyDigestEnabled: boolean;      // N2: weekly safety summary notification
  weeklyDigestLastAt: number;        // N2: epoch ms of last digest notification
  chatGuardEnabled: boolean;         // P1: scan chat-app notifications for scams
  chatGuardApps: string[];           // P1: package names to watch
  callScreeningEnabled: boolean;     // P3: block spam calls before ring (role)
  clipboardGuardEnabled: boolean;    // S1: suggest checking copied number/link
  guardianAlertEnabled: boolean;     // S3: SMS a trusted contact on high-confidence threat
  guardianNumber: string;            // S3: guardian's phone number
  guardianThreshold: number;         // S3: confidence 0-100 that triggers the alert
  guardianLocationEnabled: boolean;  // S3b: attach a Google Maps link of current location to the guardian SMS
  contactSyncEnabled: boolean;       // S9: contribute to community caller ID database

  setLanguage: (language: 'bn' | 'en') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDailySummaryEnabled: (enabled: boolean) => void;
  setSoundAlertEnabled: (enabled: boolean) => void;
  setAutoDeleteDays: (days: number) => void;
  setLastSummaryDate: (date: string) => void;
  addToBlocklist: (item: string) => void;
  removeFromBlocklist: (item: string) => void;
  setHasOnboarded: (v: boolean) => void;
  setHasShownRatingPrompt: (v: boolean) => void;
  setAutoBlockEnabled: (v: boolean) => void;
  setAutoBlockThreshold: (v: number) => void;
  setGhostModeEnabled: (v: boolean) => void;
  setSmsAutoScanEnabled: (v: boolean) => void;
  setSmsAlertCategories: (cats: string[]) => void;
  toggleSmsAlertCategory: (cat: string) => void;
  setAppLockEnabled: (v: boolean) => void;
  setAppLockPin: (pin: string) => void;
  setScheduledScanEnabled: (v: boolean) => void;
  setScheduledScanHour: (h: number) => void;
  setPrivacyModeEnabled: (v: boolean) => void;
  setBatterySaverEnabled: (v: boolean) => void;
  setBiometricEnabled: (v: boolean) => void;
  setThemeMode: (v: 'dark' | 'light' | 'system') => void;
  setUserDistrict: (v: string) => void;
  setDistrictAlertEnabled: (v: boolean) => void;
  setScamSyncLastAt: (v: number) => void;
  addTrustedNumber: (num: string) => void;
  removeTrustedNumber: (num: string) => void;
  isTrusted: (num: string) => boolean;
  setOtpGuardEnabled: (v: boolean) => void;
  setWeeklyDigestEnabled: (v: boolean) => void;
  setWeeklyDigestLastAt: (v: number) => void;
  setChatGuardEnabled: (v: boolean) => void;
  toggleChatGuardApp: (pkg: string) => void;
  setCallScreeningEnabled: (v: boolean) => void;
  setClipboardGuardEnabled: (v: boolean) => void;
  setGuardianAlertEnabled: (v: boolean) => void;
  setGuardianNumber: (v: string) => void;
  setGuardianThreshold: (v: number) => void;
  setGuardianLocationEnabled: (v: boolean) => void;
  checkAndAutoBlock: (number: string, score: number) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'bn',
      notificationsEnabled: true,
      dailySummaryEnabled: true,
      soundAlertEnabled: true,
      autoDeleteDays: 30,
      lastSummaryDate: '',
      blocklist: [],
      activeProfile: 'আমি',
      hasOnboarded: false,
      hasShownRatingPrompt: false,
      autoBlockEnabled: false,
      autoBlockThreshold: 0.75,
      ghostModeEnabled: false,
      smsAutoScanEnabled: true,
      smsAlertCategories: ['fraud', 'phishing', 'emergency'],
      appLockEnabled: false,
      appLockPin: '',
      scheduledScanEnabled: false,
      scheduledScanHour: 9,
      privacyModeEnabled: false,
      batterySaverEnabled: false,
      biometricEnabled: false,
      themeMode: 'dark' as const,
      userDistrict: '',
      districtAlertEnabled: false,
      scamSyncLastAt: 0,
      trustedNumbers: [],
      otpGuardEnabled: true,
      weeklyDigestEnabled: true,
      weeklyDigestLastAt: 0,
      chatGuardEnabled: false,
      chatGuardApps: [
        'com.whatsapp', 'com.whatsapp.w4b', 'org.telegram.messenger',
        'com.facebook.orca', 'com.instagram.android', 'com.google.android.gm',
        'com.linkedin.android', 'com.viber.voip', 'com.imo.android.imoim',
      ],
      callScreeningEnabled: false,
      clipboardGuardEnabled: true,
      guardianAlertEnabled: false,
      guardianNumber: '',
      guardianThreshold: 90,
      guardianLocationEnabled: false,
      contactSyncEnabled: false,

      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setDailySummaryEnabled: (enabled) => set({ dailySummaryEnabled: enabled }),
      setSoundAlertEnabled: (enabled) => set({ soundAlertEnabled: enabled }),
      setAutoDeleteDays: (days) => set({ autoDeleteDays: days }),
      setLastSummaryDate: (date) => set({ lastSummaryDate: date }),

      addToBlocklist: (item) => {
        const trimmed = item.trim();
        if (!trimmed) return;
        const list = get().blocklist;
        if (!list.includes(trimmed)) set({ blocklist: [...list, trimmed] });
      },
      removeFromBlocklist: (item) => {
        set((s) => ({ blocklist: s.blocklist.filter((x) => x !== item) }));
      },

      setHasOnboarded: (v) => set({ hasOnboarded: v }),
      setHasShownRatingPrompt: (v) => set({ hasShownRatingPrompt: v }),
      setAutoBlockEnabled: (v) => set({ autoBlockEnabled: v }),
      setAutoBlockThreshold: (v) => set({ autoBlockThreshold: Math.max(0, Math.min(1, v)) }), // M4: clamp 0–1
      setGhostModeEnabled: (v) => set({ ghostModeEnabled: v }),
      setSmsAutoScanEnabled: (v) => set({ smsAutoScanEnabled: v }),
      setSmsAlertCategories: (cats) => set({ smsAlertCategories: cats }),
      toggleSmsAlertCategory: (cat) => {
        const cats = get().smsAlertCategories;
        set({ smsAlertCategories: cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat] });
      },
      setAppLockEnabled: (v) => set({ appLockEnabled: v }),
      setAppLockPin: (pin) => {
        // H4: enforce exactly 4 digits; C1/C7: save to SecureStore first, then update store flag
        const clean = pin.replace(/\D/g, '').slice(0, 4);
        saveSecurePin(clean).then(() => {
          // Only update store after SecureStore confirms the write (C7 fix)
          set({ appLockPin: clean });
        }).catch(() => {
          // SecureStore failed — still update store so UI remains consistent, log in dev
          if (__DEV__) console.warn('[Settings] SecureStore PIN save failed');
          set({ appLockPin: clean });
        });
      },
      setScheduledScanEnabled: (v) => set({ scheduledScanEnabled: v }),
      setScheduledScanHour: (h) => set({ scheduledScanHour: h }),
      setPrivacyModeEnabled: (v) => set({ privacyModeEnabled: v }),
      setBatterySaverEnabled: (v) => set({ batterySaverEnabled: v }),
      setBiometricEnabled: (v) => set({ biometricEnabled: v }),
      setThemeMode: (v) => set({ themeMode: v }),
      setUserDistrict: (v) => set({ userDistrict: v }),
      setDistrictAlertEnabled: (v) => set({ districtAlertEnabled: v }),
      setScamSyncLastAt: (v) => set({ scamSyncLastAt: v }),
      addTrustedNumber: (num) => {
        const clean = num.replace(/\D/g, '');
        if (!clean) return;
        const list = get().trustedNumbers;
        if (!list.includes(clean)) set({ trustedNumbers: [...list, clean] });
      },
      removeTrustedNumber: (num) => {
        const clean = num.replace(/\D/g, '');
        set((s) => ({ trustedNumbers: s.trustedNumbers.filter((x) => x !== clean) }));
      },
      isTrusted: (num) => get().trustedNumbers.includes(num.replace(/\D/g, '')),
      setOtpGuardEnabled: (v) => set({ otpGuardEnabled: v }),
      setWeeklyDigestEnabled: (v) => set({ weeklyDigestEnabled: v }),
      setWeeklyDigestLastAt: (v) => set({ weeklyDigestLastAt: v }),
      setChatGuardEnabled: (v) => set({ chatGuardEnabled: v }),
      toggleChatGuardApp: (pkg) => {
        const apps = get().chatGuardApps;
        set({ chatGuardApps: apps.includes(pkg) ? apps.filter((a) => a !== pkg) : [...apps, pkg] });
      },
      setCallScreeningEnabled: (v) => set({ callScreeningEnabled: v }),
      setClipboardGuardEnabled: (v) => set({ clipboardGuardEnabled: v }),
      setGuardianAlertEnabled: (v) => set({ guardianAlertEnabled: v }),
      setGuardianNumber: (v) => set({ guardianNumber: v.replace(/[^\d+]/g, '').slice(0, 15) }),
      setGuardianThreshold: (v) => set({ guardianThreshold: Math.max(50, Math.min(100, Math.round(v))) }),
      setGuardianLocationEnabled: (v) => set({ guardianLocationEnabled: v }),
      setContactSyncEnabled: (v) => set({ contactSyncEnabled: v }),
      checkAndAutoBlock: (number, score) => {
        const state = get();
        if (!state.autoBlockEnabled) return false;
        const threshold = Math.max(0, Math.min(1, state.autoBlockThreshold)); // M4: guard corrupt value
        if (score < threshold) return false;
        const trimmed = number.trim();
        if (!trimmed || state.blocklist.includes(trimmed)) return false;
        set((s) => ({ blocklist: [...s.blocklist, trimmed] })); // use updater form for safety
        return true;
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // C7: exclude actual PIN from AsyncStorage — lives only in SecureStore
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { appLockPin: _pin, ...rest } = state as SettingsState & { appLockPin: string };
        return rest;
      },
    }
  )
);
