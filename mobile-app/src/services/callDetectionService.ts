import * as Notifications from 'expo-notifications';
import { Platform, PermissionsAndroid, NativeModules, NativeEventEmitter } from 'react-native';
import { useSpamNumberStore, getSpamLabel, SPAM_CATEGORIES } from '../stores/spamNumberStore';
import { useNameTagStore, KNOWN_BD_NUMBERS, KNOWN_TYPE_ICON } from '../stores/nameTagStore';
import { useSettingsStore } from '../stores/settingsStore';
import { analyzePhoneLocally } from '../utils/phoneFeatures';
import { levenshtein } from '../utils/levenshtein'; // L5: shared impl

// Official BD numbers that fraudsters commonly spoof (mirrors CallerIDScreen list)
const OFFICIAL_BD: { number: string; label: string }[] = [
  { number: '10678',       label: 'BTRC' },
  { number: '01320010111', label: 'RAB' },
  { number: '01769693922', label: 'পুলিশ CID' },
  { number: '16236',       label: 'বিকাশ' },
  { number: '16167',       label: 'নগদ' },
  { number: '16123',       label: 'ভোক্তা অধিকার' },
  { number: '999',         label: 'জরুরি সেবা' },
];

// L5: removed local levDist — using shared levenshtein() from utils

function detectSpoofedCall(num: string): string | null {
  const clean = num.replace(/\D/g, '');
  for (const off of OFFICIAL_BD) {
    const offClean = off.number.replace(/\D/g, '');
    if (clean === offClean) return null;
    if (Math.abs(clean.length - offClean.length) <= 1 && levenshtein(clean, offClean) <= 2) {
      return off.label;
    }
  }
  return null;
}

const CALL_NOTIFICATION_ID      = 'eprohori-active-call';
const CALL_CHANNEL_ID           = 'eprohori-calls';
const CALL_CATEGORY_ID          = 'INCOMING_CALL';

// Set up high-priority notification channel + action buttons once at startup
export async function setupCallNotificationChannel(): Promise<void> {
  try {
    // M6: request notification permission here, once — not on every incoming call
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) {
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: false },
      });
    }

    await Notifications.setNotificationChannelAsync(CALL_CHANNEL_ID, {
      name:              'ইনকামিং কল সতর্কতা',
      importance:        Notifications.AndroidImportance.MAX,
      sound:             null,
      vibrationPattern:  [0, 250, 100, 250],
      enableLights:      true,
      lightColor:        '#e63946',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge:         true,
    });

    await Notifications.setNotificationCategoryAsync(CALL_CATEGORY_ID, [
      {
        identifier: 'block',
        buttonTitle: '🚫 ব্লক করুন',
        options: { isDestructive: true, opensAppToForeground: false },
      },
      {
        identifier: 'check',
        buttonTitle: '🔍 বিস্তারিত দেখুন',
        options: { isDestructive: false, opensAppToForeground: true },
      },
    ]);
  } catch {}
}

// Custom native module registered in MainApplication.kt (bare/prebuild workflow only)
const CallDetection: any = NativeModules.CallDetection;

async function requestPhonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title:          'ফোন অবস্থা অনুমতি',
        message:        'কল শনাক্ত করতে EProhori কে ফোন অবস্থা পড়ার অনুমতি দিন।',
        buttonPositive: 'অনুমতি দিন',
        buttonNegative: 'না',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function dismissCallNotification() {
  await Notifications.dismissNotificationAsync(CALL_NOTIFICATION_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(CALL_NOTIFICATION_ID).catch(() => {});
}

async function showCallNotification(phoneNumber: string | null) {
  // M6: permission already requested once in setupCallNotificationChannel()
  let title = '📞 ইনকামিং কল';
  let body  = 'EProhori তে চেক করতে ট্যাপ করুন';

  if (phoneNumber) {
    // N3: trusted whitelist — show a friendly banner instead of any warning
    if (useSettingsStore.getState().isTrusted(phoneNumber)) {
      const trustedName = useNameTagStore.getState().getTag(phoneNumber);
      await Notifications.scheduleNotificationAsync({
        identifier: CALL_NOTIFICATION_ID,
        content: {
          title: `💚 ${trustedName ?? phoneNumber}`,
          body:  'বিশ্বস্ত নম্বর — আপনার তালিকাভুক্ত',
          data:  { phoneNumber, screen: 'CallerID' },
          sticky: true, autoDismiss: false, sound: undefined,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });
      return;
    }
    const features    = analyzePhoneLocally(phoneNumber);
    const tagStore    = useNameTagStore.getState();
    const spamStore   = useSpamNumberStore.getState();
    const callerName  = tagStore.getTag(phoneNumber);
    const tagSource   = tagStore.getTagSource(phoneNumber);
    const spamScore   = spamStore.getSpamScore(phoneNumber);
    const reportCount = spamStore.getReportCount(phoneNumber);
    const topCat      = spamStore.getTopCategory(phoneNumber);
    const spamLabel   = spamScore > 0 ? getSpamLabel(spamScore) : null;

    const knownMeta   = KNOWN_BD_NUMBERS[phoneNumber.replace(/\D/g, '')];
    const typeIcon    = knownMeta ? (KNOWN_TYPE_ICON[knownMeta.type] ?? '📞') : '📞';
    const iconPrefix  = spamScore >= 0.5 ? '⚠️' : tagSource === 'known' ? typeIcon : '📞';

    title = callerName ? `${iconPrefix} ${callerName}` : `${iconPrefix} ${phoneNumber}`;

    const spoofedLabel = detectSpoofedCall(phoneNumber);

    if (spoofedLabel) {
      title = `⚠️ স্পুফড কল সন্দেহ! ${phoneNumber}`;
      body  = `"${spoofedLabel}"-এর নম্বর নকল করা হতে পারে — সাবধান!`;
    } else if (spamLabel && reportCount > 0) {
      const catLabel = topCat ? SPAM_CATEGORIES[topCat].label_bn : '';
      body = `🚨 ${spamLabel.text} · ${reportCount} রিপোর্ট${catLabel ? ` · ${catLabel}` : ''}`;
    } else if (tagSource === 'known') {
      body = `✅ যাচাইকৃত · ${features.operator_bn ?? ''}`.trim();
    } else {
      body = features.operator_bn ? `${features.operator_bn} · রিপোর্ট নেই` : 'EProhori তে চেক করুন';
    }
  }

  await Notifications.scheduleNotificationAsync({
    identifier: CALL_NOTIFICATION_ID,
    content: {
      title,
      body,
      data:               { phoneNumber, screen: 'CallerID' },
      sticky:             true,
      autoDismiss:        false,
      sound:              undefined,
      priority:           Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: CALL_CATEGORY_ID,
    },
    trigger: null,
  });
}

let eventSubscription: any = null;

export async function startCallDetection(): Promise<boolean> {
  if (!CallDetection) {
    // Native module not available — running in Expo Go or managed workflow
    return false;
  }

  await setupCallNotificationChannel();

  const hasPermission = await requestPhonePermission();
  if (!hasPermission) return false;

  if (eventSubscription) return true; // already running

  const emitter = new NativeEventEmitter(CallDetection);
  eventSubscription = emitter.addListener(
    'CallStateChanged',
    (event: { state: string; phoneNumber?: string | null }) => {
      switch (event.state) {
        case 'Ringing':
          showCallNotification(event.phoneNumber ?? null);
          break;
        case 'Connected':
          // Notification stays visible during call
          break;
        case 'Disconnected':
          dismissCallNotification();
          break;
        default:
          break;
      }
    }
  );

  try {
    CallDetection.startCallStateUpdates();
    return true;
  } catch (e) {
    eventSubscription?.remove();
    eventSubscription = null;
    return false;
  }
}

export function stopCallDetection() {
  if (CallDetection) {
    try { CallDetection.stopCallStateUpdates(); } catch {}
  }
  eventSubscription?.remove();
  eventSubscription = null;
  dismissCallNotification();
}

export function isCallDetectionAvailable(): boolean {
  return !!CallDetection;
}
