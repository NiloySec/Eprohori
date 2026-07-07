import { NativeModules, NativeEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../stores/settingsStore';
import { categorizeSms } from '../utils/smsCategories';

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
  { pkg: 'org.telegram.messenger', name: 'Telegram',  icon: '✈️' },
  { pkg: 'com.facebook.orca',      name: 'Messenger', icon: '📘' },
  { pkg: 'com.instagram.android',  name: 'Instagram', icon: '📸' },
  { pkg: 'com.google.android.gm',  name: 'Gmail',     icon: '📧' },
  { pkg: 'com.linkedin.android',   name: 'LinkedIn',  icon: '💼' },
  { pkg: 'com.viber.voip',         name: 'Viber',     icon: '💜' },
  { pkg: 'com.imo.android.imoim',  name: 'imo',       icon: '🔵' },
];

// Threat categories that trigger an instant warning
const ALERT_CATS = new Set(['otp_theft', 'mfs_fraud', 'fraud', 'phishing', 'malware']);

let subscription: { remove: () => void } | null = null;

export function isChatGuardAvailable(): boolean {
  return !!NotifListenerNative;
}

export async function isChatGuardPermitted(): Promise<boolean> {
  if (!NotifListenerNative) return false;
  try { return await NotifListenerNative.isPermissionGranted(); } catch { return false; }
}

export function openChatGuardSettings(): void {
  NotifListenerNative?.openNotificationAccessSettings();
}

async function handleChatNotif(notif: ChatNotif): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.chatGuardEnabled) return;
  if (!settings.chatGuardApps.includes(notif.package)) return;

  const cat = categorizeSms(notif.text);
  if (!ALERT_CATS.has(cat.category)) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 ${notif.app}-এ সন্দেহজনক মেসেজ!`,
      body:  `${cat.icon} ${cat.label_bn} সনাক্ত — "${notif.text.slice(0, 80)}..."`,
      data:  { screen: 'Analyzer', sharedText: notif.text.slice(0, 1500) },
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  }).catch(() => {});
}

// Start listening for chat notifications (call once from App.tsx)
export function startChatGuard(): void {
  if (!NotifListenerNative || subscription) return;

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
