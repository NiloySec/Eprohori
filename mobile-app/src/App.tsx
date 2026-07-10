import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, NativeModules, NativeEventEmitter } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { RootNavigator, navigationRef } from '@navigation';
import { Colors, ThemeProvider } from '@theme';
import { useHistoryStore, useSettingsStore, useAnalysisStore } from '@stores';
import { ErrorBoundary, AppLockOverlay } from '@components';
import { categorizeSms } from '@utils';
import { startCallDetection, stopCallDetection } from './services/callDetectionService';
import { runScamSync } from './services/scamSyncService';
import { checkDistrictAlerts } from './services/districtAlertService';
import { checkWeeklyDigest } from './services/weeklyDigestService';
import { startChatGuard, stopChatGuard } from './services/notifGuardService';
import { syncBlocklistToNative } from './services/callScreenService';
import { maybeAlertGuardian } from './services/familyGuardianService';
import { syncWidgetStats } from './services/widgetStatsService';
import { loadSecurePin } from './stores/settingsStore';
import { initSentry, Sentry } from './services/sentry';

initSentry();

// Native modules — only present after expo prebuild; null-safe in Expo Go.
const ShareIntentNative  = NativeModules.ShareIntent  ?? null;
const SmsListenerNative  = NativeModules.SmsListener  ?? null;

// Navigate once the container is ready — deep links and notification taps
// can arrive before React Navigation mounts (cold start)
function navigateWhenReady(go: () => void, attempt = 0) {
  if (navigationRef.isReady()) { go(); return; }
  if (attempt < 10) setTimeout(() => navigateWhenReady(go, attempt + 1), 300);
}

// Handles both the custom URL scheme (eprohori://analyze?text=...) and
// the raw Android ACTION_SEND share payload.
function extractSharedText(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    if (parsed.path === 'analyze' && typeof parsed.queryParams?.text === 'string') {
      const raw = parsed.queryParams.text;
      // C8: reject oversized raw query params before URI decoding (DoS guard)
      if (raw.length > 5000) return null;
      // C4: sanitize — strip control chars, limit length, reject HTML tags
      let text = decodeURIComponent(raw);
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 1500);
      if (text.length >= 3 && !/<[a-z!/?]/i.test(text)) return text;
    }
  } catch {}
  return null;
}

function App() {
  const cleanupOldEntries   = useHistoryStore((s) => s.cleanupOldEntries);
  const entries             = useHistoryStore((s) => s.entries);
  const autoDeleteDays      = useSettingsStore((s) => s.autoDeleteDays);
  const dailySummaryEnabled = useSettingsStore((s) => s.dailySummaryEnabled);
  const lastSummaryDate     = useSettingsStore((s) => s.lastSummaryDate);
  const setLastSummaryDate  = useSettingsStore((s) => s.setLastSummaryDate);
  const language            = useSettingsStore((s) => s.language);
  const smsAutoScanEnabled    = useSettingsStore((s) => s.smsAutoScanEnabled);
  const smsAlertCategories    = useSettingsStore((s) => s.smsAlertCategories);
  const appLockEnabled        = useSettingsStore((s) => s.appLockEnabled);
  const appLockPin            = useSettingsStore((s) => s.appLockPin);
  const biometricEnabled      = useSettingsStore((s) => s.biometricEnabled);
  const scheduledScanEnabled  = useSettingsStore((s) => s.scheduledScanEnabled);
  const scheduledScanHour     = useSettingsStore((s) => s.scheduledScanHour);
  const batterySaverEnabled   = useSettingsStore((s) => s.batterySaverEnabled);
  const otpGuardEnabled       = useSettingsStore((s) => s.otpGuardEnabled);
  const chatGuardEnabled      = useSettingsStore((s) => s.chatGuardEnabled);
  const callScreeningEnabled  = useSettingsStore((s) => s.callScreeningEnabled);
  const blocklist             = useSettingsStore((s) => s.blocklist);
  const setSharedText       = useAnalysisStore((s) => s.setSharedText);
  const setPendingSmsText   = useAnalysisStore((s) => s.setPendingSmsText);

  const setAppLockPin = useSettingsStore((s) => s.setAppLockPin);
  const [isLocked, setIsLocked] = useState(false);

  // C7: load PIN from SecureStore on startup (PIN is not persisted in AsyncStorage)
  useEffect(() => {
    loadSecurePin().then((pin) => {
      if (pin) setAppLockPin(pin);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSharedRef           = useRef(setSharedText);
  const setPendingSmsRef       = useRef(setPendingSmsText);
  const smsAlertCategoriesRef  = useRef(smsAlertCategories);
  const otpGuardEnabledRef     = useRef(otpGuardEnabled);
  setSharedRef.current          = setSharedText;
  setPendingSmsRef.current      = setPendingSmsText;
  smsAlertCategoriesRef.current = smsAlertCategories;
  otpGuardEnabledRef.current    = otpGuardEnabled;

  useEffect(() => {
    cleanupOldEntries(autoDeleteDays);

    if (!dailySummaryEnabled) return;
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      if (lastSummaryDate === today || entries.length === 0) return;

      const todayEntries = entries.filter(
        (e) => new Date(e.timestamp).toISOString().split('T')[0] === today
      );
      const threats = todayEntries.filter((e) => e.result.confidence >= 60).length;
      const safe    = todayEntries.filter((e) => e.result.confidence < 60).length;

      const isBn = language === 'bn';
      Alert.alert(
        isBn ? '📊 দৈনিক সারসংক্ষেপ' : '📊 Daily Summary',
        isBn
          ? `আজকের বিশ্লেষণ:\n• মোট স্ক্যান: ${todayEntries.length} টি\n• হুমকি: ${threats} টি\n• নিরাপদ: ${safe} টি\n\nমোট ইতিহাস: ${entries.length} টি`
          : `Today's scans: ${todayEntries.length}\n• Threats: ${threats}\n• Safe: ${safe}\n\nTotal history: ${entries.length}`,
        [{ text: isBn ? 'ঠিক আছে' : 'OK', onPress: () => setLastSummaryDate(today) }]
      );
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // OTA update check
  useEffect(() => {
    (async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    })();
  }, []);

  // Deep links + Expo URL scheme share intent + P2 link interceptor
  useEffect(() => {
    const handleUrl = (url: string) => {
      // P2: http/https link tapped in another app and opened with EProhori
      if (/^https?:\/\//i.test(url)) {
        const safe = url.slice(0, 2000);
        navigateWhenReady(() => navigationRef.navigate('LinkCheck', { url: safe }));
        return;
      }
      const text = extractSharedText(url);
      if (text) setSharedRef.current(text);
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Android ACTION_SEND share intent (SMS forwarded from Messages app).
  // Uses our custom native ShareIntent module — only active in bare/prebuild workflow.
  useEffect(() => {
    if (!ShareIntentNative) return;

    // Cold-start: text set in MainActivity.onCreate before JS bridge was ready
    ShareIntentNative.getSharedText()
      .then((text: string | null) => { if (text) setSharedRef.current(text); })
      .catch(() => {});

    // Warm-start: text emitted from MainActivity.onNewIntent while app was running
    const emitter = new NativeEventEmitter(ShareIntentNative);
    const sub = emitter.addListener('SharedTextReceived', (text: string) => {
      if (text) setSharedRef.current(text);
    });

    return () => sub.remove();
  }, []);

  // Incoming SMS auto-route — gated on smsAutoScanEnabled + batterySaverEnabled.
  // Re-runs when toggles change so the listener is cleanly removed/re-added.
  useEffect(() => {
    if (!SmsListenerNative || !smsAutoScanEnabled || batterySaverEnabled) return;

    SmsListenerNative.getIncomingSms()
      .then((text: string | null) => { if (text) setPendingSmsRef.current(text); })
      .catch(() => {});

    const emitter = new NativeEventEmitter(SmsListenerNative);
    const sub = emitter.addListener('SmsReceived', async (text: string) => {
      if (!text) return;
      setPendingSmsRef.current(text);

      try {
        const lang = useSettingsStore.getState().language;
        // P1: Robust analysis for background SMS too
        const result = await threatAnalysisAPI.analyzeThreat(text, lang);
        const cat = categorizeSms(text); // still use local cat for icon/label fallback

        // N6: OTP guard — always fire a MAX-priority warning on high-confidence threats
        if (otpGuardEnabledRef.current && (result.confidence >= 80 || cat.category === 'otp_theft' || cat.category === 'mfs_fraud')) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🚨 সরাসরি সাইবার হুমকি সনাক্ত!',
              body:  'বিকাশ/নগদ/ব্যাংক কখনো OTP বা পিন চায় না। কাউকে কোড দেবেন না!',
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: { screen: 'Analyzer', sharedText: text.slice(0, 1500) },
            },
            trigger: null,
          }).catch(() => {});
          // S3: background-detected high-confidence threat — also warn the guardian
          maybeAlertGuardian(result.confidence, result.threat_type === 'phishing' ? 'ফিশিং' : 'প্রতারণা').catch(() => {});
        } else if (result.confidence >= 60) {
          // Fire local notification if confidence is high enough
          Notifications.scheduleNotificationAsync({
            content: {
              title: result.confidence >= 75 ? '🔴 হুমকি সনাক্ত হয়েছে' : '⚠️ সন্দেহজনক SMS',
              body: text.slice(0, 120),
              data: { screen: 'Analyzer', sharedText: text.slice(0, 1500) },
            },
            trigger: null,
          }).catch(() => {});
        }
      } catch {}
    });

    return () => sub.remove();
  }, [smsAutoScanEnabled, batterySaverEnabled]);

  // App lock — activate when app goes to background, show overlay on return.
  useEffect(() => {
    if (!appLockEnabled || !appLockPin) { setIsLocked(false); return; }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') setIsLocked(true);
    });
    return () => sub.remove();
  }, [appLockEnabled, appLockPin]);

  // Scheduled daily SMS scan reminder notification
  useEffect(() => {
    const SCAN_NOTIF_ID = 'scheduled-scan-daily';
    if (!scheduledScanEnabled) {
      Notifications.cancelScheduledNotificationAsync(SCAN_NOTIF_ID).catch(() => {});
      return;
    }
    Notifications.cancelScheduledNotificationAsync(SCAN_NOTIF_ID).then(() => {
      Notifications.scheduleNotificationAsync({
        identifier: SCAN_NOTIF_ID,
        content: {
          title: '🔍 দৈনিক SMS নিরাপত্তা স্ক্যান',
          body:  'আজকের SMS স্ক্যান করুন — প্রতারণামূলক বার্তা শনাক্ত করুন।',
          data:  { action: 'inbox_scan' },
        },
        trigger: { hour: scheduledScanHour, minute: 0, repeats: true } as any,
      }).catch(() => {});
    }).catch(() => {});
  }, [scheduledScanEnabled, scheduledScanHour]);

  // Notification action responses (e.g. "ব্লক করুন" from call overlay) +
  // tap-to-navigate for notifications that carry a target screen/action
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const actionId = response.actionIdentifier;
      const data     = response.notification.request.content.data as {
        phoneNumber?: string; screen?: string; action?: string; sharedText?: string;
      };
      const num = data?.phoneNumber;

      if (actionId === 'block' && num) {
        // L3: use already-imported useSettingsStore directly via getState()
        useSettingsStore.getState().addToBlocklist(num);
        return;
      }

      // Default tap or specific action -> route to the target screen
      navigateWhenReady(() => {
        if (actionId === 'live_check') {
          navigationRef.navigate('LiveCallListen');
        } else if (data?.action === 'inbox_scan') {
          navigationRef.navigate('InboxScan');
        } else if (data?.screen === 'Analyzer' && data?.sharedText) {
          // P1: chat-guard warning tapped — prefill the analyzer with the message
          setSharedRef.current(data.sharedText);
          navigationRef.navigate('MainTabs', { screen: 'Analyzer' });
        } else if (data?.screen === 'CallerID') {
          navigationRef.navigate('CallerID', num ? { initialNumber: num } : undefined);
        } else if (data?.screen === 'FraudAlerts') {
          navigationRef.navigate('FraudAlerts');
        } else if (data?.screen === 'History') {
          navigationRef.navigate('MainTabs', { screen: 'History' });
        }
      });
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    // Cold start: the tap that launched the app arrives before the listener mounts
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => { if (resp) handleResponse(resp); })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  // R3: community scam number sync — runs once on startup, respects 24h TTL
  useEffect(() => { runScamSync().catch(() => {}); }, []);

  // N2: weekly safety digest — throttled to once per week internally
  useEffect(() => { checkWeeklyDigest().catch(() => {}); }, []);

  // S7: push today's scan/threat counts to the home widget — on startup and
  // whenever history changes (new scan, deletion, cleanup)
  useEffect(() => {
    syncWidgetStats().catch(() => {});
    const unsub = useHistoryStore.subscribe(() => { syncWidgetStats().catch(() => {}); });
    return unsub;
  }, []);

  // R5: district alert check — runs on startup + every hour via AppState resume
  useEffect(() => {
    checkDistrictAlerts().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDistrictAlerts().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Call detection — runs silently; no-op until expo prebuild completes.
  useEffect(() => {
    startCallDetection().catch(() => {});
    return () => stopCallDetection();
  }, []);

  // P1: chat guard — listen for chat-app notifications when enabled
  useEffect(() => {
    if (!chatGuardEnabled) { stopChatGuard(); return; }
    startChatGuard();
    return () => stopChatGuard();
  }, [chatGuardEnabled]);

  // P3: keep the native call-screening blocklist in sync. Android has no API
  // to force-revoke the screening role once granted, so clear the native list
  // on disable too — otherwise a still-held role keeps blocking silently.
  useEffect(() => {
    syncBlocklistToNative(callScreeningEnabled ? blocklist : []);
  }, [callScreeningEnabled, blocklist]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <SafeAreaProvider>
          <RootNavigator />
          {isLocked && appLockEnabled && appLockPin ? (
            <AppLockOverlay
              pin={appLockPin}
              onUnlock={() => setIsLocked(false)}
              biometricEnabled={biometricEnabled}
            />
          ) : null}
        </SafeAreaProvider>
      </GestureHandlerRootView>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);
