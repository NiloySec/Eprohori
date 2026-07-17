import { NativeModules, NativeEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../stores/settingsStore';
import { threatAnalysisAPI } from '../api/threatAnalysis';

// P1: Chat Guard — receives chat-app notification text from the native
// NotificationListenerService and runs the on-device scam engine on it.
// Everything stays local: notification text is never sent to any server.

const NotifListenerNative: {
  getPendingNotification: () => Promise<ChatNotif | null>;
  isPermissionGranted: () => Promise<boolean>;
  openNotificationAccessSettings: () => void;
  addListener: (e: string) => void;
  removeListeners: (c: number) => void;
} | null = NativeModules.NotifListener ?? null;

export interface ChatNotif {
  package: string;
  app: string;
  title: string;
  text: string;
}

// Human-readable names for the settings platform chips
export const CHAT_GUARD_APPS: { pkg: string; name: string; icon: string }[] = [
  { pkg: 'com.whatsapp',           name: 'WhatsApp',  icon: '🟢' },
  { pkg: 'com.whatsapp.w4b',       name: 'WhatsApp Biz', icon: '🏪' },
  { pkg: 'org.telegram.messenger', name: 'Telegram',  icon: '✈️' },
  { pkg: 'com.facebook.orca',      name: 'Messenger', icon: '📘' },
  { pkg: 'com.facebook.katana',    name: 'Facebook',  icon: '📘' },
  { pkg: 'com.instagram.android',  name: 'Instagram', icon: '📸' },
  { pkg: 'com.google.android.gm',  name: 'Gmail',     icon: '📧' },
  { pkg: 'com.linkedin.android',   name: 'LinkedIn',  icon: '💼' },
  { pkg: 'com.viber.voip',         name: 'Viber',     icon: '💜' },
  { pkg: 'com.imo.android.imoim',  name: 'imo',       icon: '🔵' },
];

let subscription: { remove: () => void } | null = null;

// True when running in a build that includes the native NotificationListener
// module (false in Expo Go).
export function isChatGuardAvailable(): boolean {
  return NotifListenerNative != null;
}

export async function isChatGuardPermitted(): Promise<boolean> {
  if (!NotifListenerNative) return false;
  try {
    return await NotifListenerNative.isPermissionGranted();
  } catch {
    return false;
  }
}

export function openChatGuardSettings(): void {
  NotifListenerNative?.openNotificationAccessSettings();
}

async function handleChatNotif(notif: ChatNotif): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.chatGuardEnabled) return;

  // H7: support both WhatsApp standard and Business
  const isWhatsApp = notif.package === 'com.whatsapp' || notif.package === 'com.whatsapp.w4b';
  const isSelected = settings.chatGuardApps.includes(notif.package) ||
                    (isWhatsApp && settings.chatGuardApps.includes('com.whatsapp'));

  if (!isSelected) return;

  // P1: Use the same analysis logic as manual scan for consistency.
  // By default, analyzeThreat will use local analysis if offline or privacy mode is on.
  try {
    const result = await threatAnalysisAPI.analyzeThreat(notif.text, settings.language);

    // Alert if confidence >= 60% (suspicious or threat)
    if (result.confidence >= 60) {
      const isThreat = result.confidence >= 75;
      const title = isThreat
        ? `🔴 ${notif.app}-এ সরাসরি হুমকি সনাক্ত!`
        : `⚠️ ${notif.app}-এ সন্দেহজনক মেসেজ`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body:  `${result.threat_type === 'phishing' ? '🎣 ফিশিং' : '⚠️ প্রতারণা'} সনাক্ত — "${notif.text.slice(0, 80)}..."`,
          data:  { screen: 'Analyzer', sharedText: notif.text.slice(0, 1500) },
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'CHAT_GUARD_ALERT',
        },
        trigger: null,
      });
    }
  } catch (err) {
    if (__DEV__) console.warn('[ChatGuard] analysis failed', err);
  }
}

async function setupNotifGuardChannel(): Promise<void> {
  try {
    await Notifications.setNotificationChannelAsync('chat-guard', {
      name:              'চ্যাট গার্ড সতর্কতা',
      importance:        Notifications.AndroidImportance.MAX,
      vibrationPattern:  [0, 250, 100, 250],
      lightColor:        '#ff5555',
    });

    await Notifications.setNotificationCategoryAsync('CHAT_GUARD_ALERT', [
      {
        identifier: 'check',
        buttonTitle: '🔍 যাচাই করুন',
        options: { opensAppToForeground: true },
      },
    ]);
  } catch {}
}

// Start listening for chat notifications (call once from App.tsx)
export function startChatGuard(): void {
  if (!NotifListenerNative || subscription) return;

  setupNotifGuardChannel();

  // Drain any notification that arrived before the JS bridge was ready
  NotifListenerNative.getPendingNotification()
    .then((pending) => { if (pending) handleChatNotif(pending); })
    .catch(() => {});

  const emitter = new NativeEventEmitter(NotifListenerNative as any);
  subscription = emitter.addListener('ChatNotifReceived', (notif: ChatNotif) => {
    if (notif?.text) handleChatNotif(notif);
  });
}

export function stopChatGuard(): void {
  subscription?.remove();
  subscription = null;
}
