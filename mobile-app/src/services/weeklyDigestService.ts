import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../stores/settingsStore';
import { useHistoryStore } from '../stores/historyStore';
import { useSpamNumberStore } from '../stores/spamNumberStore';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// N2: weekly safety digest — fires a local notification summarizing the past
// 7 days of protection activity. Called on app startup; throttled to once/week.
export async function checkWeeklyDigest(): Promise<void> {
  const settings = useSettingsStore.getState();
  if (!settings.weeklyDigestEnabled) return;

  const last = settings.weeklyDigestLastAt;
  const now  = Date.now();
  if (last && now - last < WEEK_MS) return;

  // First run: don't fire immediately on fresh install — start the clock instead
  if (!last) {
    settings.setWeeklyDigestLastAt(now);
    return;
  }

  const entries = useHistoryStore.getState().entries;
  const weekAgo = now - WEEK_MS;
  const weekEntries = entries.filter((e) => e.timestamp >= weekAgo);

  const threats  = weekEntries.filter((e) => e.result.confidence >= 60).length;
  const safe     = weekEntries.filter((e) => e.result.confidence < 60).length;
  const reports  = Object.values(useSpamNumberStore.getState().records)
    .reduce((sum, r) => sum + r.reports.filter((rep) => rep.reported_at >= weekAgo).length, 0);
  const blocked  = settings.blocklist.length;

  settings.setWeeklyDigestLastAt(now);

  // Nothing happened this week — skip the notification, don't spam the user
  if (weekEntries.length === 0 && reports === 0) return;

  const parts: string[] = [];
  if (threats > 0)  parts.push(`${threats}টি হুমকি সনাক্ত`);
  if (safe > 0)     parts.push(`${safe}টি নিরাপদ`);
  if (reports > 0)  parts.push(`${reports}টি স্প্যাম রিপোর্ট`);
  if (blocked > 0)  parts.push(`${blocked}টি নম্বর ব্লকে`);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🛡️ সাপ্তাহিক নিরাপত্তা সারসংক্ষেপ',
      body:  `এই সপ্তাহে: ${parts.join(' · ')} — EProhori আপনাকে সুরক্ষিত রেখেছে!`,
      data:  { screen: 'History' },
    },
    trigger: null,
  }).catch(() => {});
}
