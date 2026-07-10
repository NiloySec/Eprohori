import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Text, StyleSheet, Switch, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, Platform, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSettingsStore, useHistoryStore, useSpamNumberStore, useAuthStore } from '@stores';
import { CATEGORY_META, exportHistoryCSV } from '@utils';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { exportBackup, importBackup } from '../services/backupService';
import { performContactSync } from '../services/contactSyncService';
import {
  isChatGuardAvailable, isChatGuardPermitted, openChatGuardSettings, CHAT_GUARD_APPS,
} from '../services/notifGuardService';
import {
  isCallScreeningAvailable, isCallScreeningSupported, isCallScreeningRoleHeld, requestCallScreeningRole,
} from '../services/callScreenService';
import type { SettingsScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Reusable row components ───────────────────────────────────────────────────

const SettingRow = ({ icon, label, description, right }: {
  icon: MCIcon; label: string; description?: string; right: React.ReactNode;
}) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Icon name={icon} size={18} color={Colors.accent} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowLabel}>{label}</Text>
      {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
    </View>
    {right}
  </View>
);

const NavRow = ({ icon, label, description, onPress, color, right }: {
  icon: MCIcon; label: string; description?: string; onPress: () => void; color?: string; right?: React.ReactNode;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.rowIcon, color ? { backgroundColor: `${color}18` } : undefined]}>
      <Icon name={icon} size={18} color={color ?? Colors.accent} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowLabel}>{label}</Text>
      {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
    </View>
    {right ?? <Icon name="chevron-right" size={20} color={Colors.text.tertiary} />}
  </TouchableOpacity>
);

// ── PIN keypad rows ───────────────────────────────────────────────────────────
const PIN_ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','✓']];

const PinKeypad = ({
  value, onChange, onConfirm,
}: { value: string; onChange: (v: string) => void; onConfirm: () => void }) => (
  <View style={styles.pinKeypad}>
    {PIN_ROWS.map((row, ri) => (
      <View key={ri} style={styles.pinRow}>
        {row.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.pinKey, key === '✓' && styles.pinKeyConfirm]}
            onPress={() => {
              if (key === '⌫') { onChange(value.slice(0, -1)); return; }
              if (key === '✓') { onConfirm(); return; }
              if (value.length < 4) onChange(value + key);
            }}
            activeOpacity={0.65}
          >
            {key === '⌫' ? (
              <Icon name="backspace-outline" size={20} color={Colors.text.secondary} />
            ) : key === '✓' ? (
              <Icon name="check" size={20} color={Colors.primary} />
            ) : (
              <Text style={styles.pinKeyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    ))}
  </View>
);

// ── SMS categories shown in alert toggles ─────────────────────────────────────
const ALERT_CATS = ['mfs_fraud', 'otp_theft', 'fraud', 'phishing', 'malware', 'emergency', 'otp'] as const;

// N: local vector-icon mapping for in-app UI — CATEGORY_META.icon stays emoji since it
// also feeds notification text; same mapping used in InboxScanScreen for consistency.
const CATEGORY_VECTOR_ICON: Record<(typeof ALERT_CATS)[number], MCIcon> = {
  mfs_fraud: 'credit-card-off-outline',
  otp_theft: 'lock-alert-outline',
  fraud: 'alert-outline',
  phishing: 'hook',
  malware: 'bug-outline',
  emergency: 'alarm-light-outline',
  otp: 'key-outline',
};

// ── Main screen ───────────────────────────────────────────────────────────────

// Light tactile tick on every settings toggle — wraps any onValueChange handler.
function hv<T extends (v: boolean) => void>(fn: T): (v: boolean) => void {
  return (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn(v);
  };
}

const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const [deletePickerOpen,    setDeletePickerOpen]    = useState(false);
  const [thresholdPickerOpen, setThresholdPickerOpen] = useState(false);
  const [exporting,           setExporting]           = useState(false);
  const [backupBusy,          setBackupBusy]          = useState(false);
  const [districtInput,       setDistrictInput]       = useState('');
  const [guardianInput,       setGuardianInput]       = useState('');
  const [syncDisclosureOpen,  setSyncDisclosureOpen]  = useState(false);
  const [syncing,             setSyncing]             = useState(false);

  // PIN modal state: null | 'setup' | 'confirm' | 'verify_disable'
  const [pinModal,    setPinModal]    = useState<'setup' | 'confirm' | 'verify_disable' | null>(null);
  const [pinStep1,    setPinStep1]    = useState('');  // first entry (setup)
  const [pinEntry,    setPinEntry]    = useState('');  // current keypad digits
  const [pinError,    setPinError]    = useState('');
  // M15: brute-force throttle — exponential backoff after repeated failures
  const [pinFailCount, setPinFailCount] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState(0);

  const t = useTranslation();

  const { user, isAuthenticated, logout } = useAuthStore();

  const {
    language, notificationsEnabled, dailySummaryEnabled,
    soundAlertEnabled, autoDeleteDays, blocklist, activeProfile,
    autoBlockEnabled, autoBlockThreshold, ghostModeEnabled,
    smsAutoScanEnabled, smsAlertCategories,
    appLockEnabled, appLockPin,
    scheduledScanEnabled, scheduledScanHour,
    privacyModeEnabled, batterySaverEnabled,
    biometricEnabled, themeMode, userDistrict, districtAlertEnabled,
    otpGuardEnabled, weeklyDigestEnabled, trustedNumbers,
    chatGuardEnabled, chatGuardApps, callScreeningEnabled,
    clipboardGuardEnabled, seniorModeEnabled, contactSyncEnabled,
    guardianAlertEnabled, guardianNumber, guardianThreshold, guardianLocationEnabled, voiceAlertEnabled,
    setOtpGuardEnabled, setWeeklyDigestEnabled, setContactSyncEnabled,
    setChatGuardEnabled, toggleChatGuardApp, setCallScreeningEnabled,
    setClipboardGuardEnabled, setSeniorModeEnabled,
    setGuardianAlertEnabled, setGuardianNumber, setGuardianThreshold, setGuardianLocationEnabled, setVoiceAlertEnabled,
    setLanguage, setNotificationsEnabled, setDailySummaryEnabled,
    setSoundAlertEnabled, setAutoDeleteDays, setAutoBlockEnabled, setAutoBlockThreshold,
    setGhostModeEnabled, setSmsAutoScanEnabled, toggleSmsAlertCategory,
    setAppLockEnabled, setAppLockPin,
    setScheduledScanEnabled, setScheduledScanHour,
    setPrivacyModeEnabled, setBatterySaverEnabled,
    setBiometricEnabled, setThemeMode, setUserDistrict, setDistrictAlertEnabled,
  } = useSettingsStore();

  const getEntriesForProfile = useHistoryStore((s) => s.getEntriesForProfile);
  const entries = getEntriesForProfile(activeProfile);

  const getAllNumbers  = useSpamNumberStore((s) => s.getAllNumbers);
  const spamRecords   = getAllNumbers();
  const totalReports  = spamRecords.reduce((s, n) => s + n.reports.length, 0);

  // Month stats
  const monthStart    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthEntries  = entries.filter((e) => e.timestamp >= monthStart);
  const monthThreats  = monthEntries.filter((e) => e.result?.confidence >= 60).length;

  const AUTO_DELETE_OPTIONS = [
    { label: t('delete_7'),     value: 7 },
    { label: t('delete_15'),    value: 15 },
    { label: t('delete_30'),    value: 30 },
    { label: t('delete_never'), value: 365 },
  ];
  const autoDeleteLabel = AUTO_DELETE_OPTIONS.find((o) => o.value === autoDeleteDays)?.label ?? `${autoDeleteDays}`;

  const handleExport = async () => {
    if (entries.length === 0) { Alert.alert('', t('settings_export_empty')); return; }
    setExporting(true);
    try {
      const ok = await exportHistoryCSV(entries, language);
      if (ok) Alert.alert('', t('settings_export_ok'));
    } catch {
      Alert.alert('', t('community_error'));
    } finally {
      setExporting(false);
    }
  };

  // R7: JSON backup export
  const handleBackupExport = async () => {
    setBackupBusy(true);
    try {
      const ok = await exportBackup();
      if (!ok) Alert.alert('', 'ব্যাকআপ ব্যর্থ হয়েছে');
    } finally { setBackupBusy(false); }
  };

  // R7: JSON backup import
  const handleBackupImport = async () => {
    setBackupBusy(true);
    try {
      const { imported, error } = await importBackup();
      if (error) Alert.alert('ত্রুটি', error);
      else Alert.alert('সফল', `${imported} টি নতুন এন্ট্রি আমদানি করা হয়েছে`);
    } finally { setBackupBusy(false); }
  };

  // P1: chat guard toggle — needs system Notification Access permission
  const handleChatGuardToggle = async (v: boolean) => {
    if (!v) { setChatGuardEnabled(false); return; }
    if (!isChatGuardAvailable()) {
      Alert.alert('', t('settings_chat_guard_expo_go'));
      return;
    }
    setChatGuardEnabled(true);
    const granted = await isChatGuardPermitted();
    if (!granted) {
      Alert.alert(
        t('settings_chat_guard_perm_title'),
        t('settings_chat_guard_perm_msg'),
        [
          { text: t('settings_chat_guard_perm_later'), style: 'cancel' },
          { text: t('settings_chat_guard_perm_goto'), onPress: () => openChatGuardSettings() },
        ]
      );
    }
  };

  // P3: call screening toggle — needs the Android call-screening role.
  // App.tsx's effect reacts to callScreeningEnabled and syncs/clears the
  // native blocklist accordingly, so this handler only needs to flip state.
  const handleCallScreeningToggle = async (v: boolean) => {
    if (!v) { setCallScreeningEnabled(false); return; }
    if (!isCallScreeningAvailable()) {
      Alert.alert('', t('settings_call_screening_expo_go'));
      return;
    }
    const supported = await isCallScreeningSupported();
    if (!supported) {
      Alert.alert('', t('settings_call_screening_unsupported'));
      return;
    }
    setCallScreeningEnabled(true);
    await requestCallScreeningRole();
  };

  // S3: save guardian number
  const handleGuardianSave = () => {
    const v = guardianInput.trim();
    if (!v) return;
    setGuardianNumber(v);
    setGuardianInput('');
    Alert.alert('', t('settings_guardian_saved'));
  };

  // S9: Handle community contact sync with disclosure
  const handleSyncToggle = (v: boolean) => {
    if (v) {
      setSyncDisclosureOpen(true);
    } else {
      setContactSyncEnabled(false);
    }
  };

  const confirmSync = async () => {
    setSyncDisclosureOpen(false);
    setSyncing(true);
    try {
      const res = await performContactSync();
      if (res.success) {
        setContactSyncEnabled(true);
        Alert.alert('ধন্যবাদ!', `${res.count} টি কন্টাক্ট সিঙ্ক হয়েছে। এখন আপনি উন্নত কলার আইডি সুবিধা পাবেন।`);
      } else {
        Alert.alert('ব্যর্থ হয়েছে', 'কন্টাক্ট পারমিশন প্রয়োজন।');
      }
    } finally {
      setSyncing(false);
    }
  };

  // R5: save district preference
  const handleDistrictSave = () => {
    const v = districtInput.trim();
    if (!v) return;
    setUserDistrict(v);
    setDistrictInput('');
    Alert.alert('', `"${v}" জেলার জন্য সতর্কতা সক্রিয় হয়েছে`);
  };

  // P3: the system role-request dialog result isn't observable directly from
  // JS, so verify the actual OS state whenever the app returns to foreground
  // (which happens right after the dialog closes) and correct the toggle if
  // the user declined it. Deliberately NOT re-run on every callScreeningEnabled
  // change — checking immediately after the toggle would race the still-open
  // system dialog and instantly flip it back off.
  useEffect(() => {
    if (!isCallScreeningAvailable()) return;
    const verify = async () => {
      if (!useSettingsStore.getState().callScreeningEnabled) return;
      const held = await isCallScreeningRoleHeld();
      if (!held) setCallScreeningEnabled(false);
    };
    verify(); // catches the role being revoked via system settings between sessions
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') verify();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PIN handlers ────────────────────────────────────────────────────────────

  const openPinSetup = () => {
    setPinStep1(''); setPinEntry(''); setPinError('');
    setPinModal('setup');
  };

  const openPinDisable = () => {
    setPinEntry(''); setPinError('');
    setPinModal('verify_disable');
  };

  const handleAppLockToggle = (v: boolean) => {
    if (v) {
      openPinSetup();
    } else {
      if (appLockPin) openPinDisable();
      else { setAppLockEnabled(false); setAppLockPin(''); }
    }
  };

  const handlePinConfirm = () => {
    if (pinModal === 'setup') {
      if (pinEntry.length < 4) { setPinError('৪ সংখ্যার PIN দিন'); return; }
      setPinStep1(pinEntry); setPinEntry(''); setPinError('');
      setPinModal('confirm');
    } else if (pinModal === 'confirm') {
      if (pinEntry !== pinStep1) {
        setPinError('PIN মিলছে না'); setPinEntry(''); return;
      }
      setAppLockPin(pinEntry);
      setAppLockEnabled(true);
      setPinModal(null); setPinEntry(''); setPinStep1(''); setPinError('');
      Alert.alert('', 'অ্যাপ লক সক্রিয় হয়েছে ✓');
    } else if (pinModal === 'verify_disable') {
      // M15: reject if locked out
      const now = Date.now();
      if (now < pinLockUntil) {
        const secs = Math.ceil((pinLockUntil - now) / 1000);
        setPinError(`অনেকবার ভুল হয়েছে। ${secs}s অপেক্ষা করুন।`);
        setPinEntry('');
        return;
      }
      if (pinEntry !== appLockPin) {
        const fails = pinFailCount + 1;
        setPinFailCount(fails);
        // 3 fails → 1s, 6 fails → 5s, 9+ fails → 60s lockout
        const lockMs = fails >= 9 ? 60000 : fails >= 6 ? 5000 : fails >= 3 ? 1000 : 0;
        if (lockMs > 0) setPinLockUntil(Date.now() + lockMs);
        setPinError('ভুল PIN'); setPinEntry(''); return;
      }
      setPinFailCount(0); setPinLockUntil(0);
      setAppLockEnabled(false); setAppLockPin('');
      setPinModal(null); setPinEntry(''); setPinError('');
    }
  };

  const closePinModal = () => {
    setPinModal(null); setPinStep1(''); setPinEntry(''); setPinError('');
    setPinFailCount(0); setPinLockUntil(0); // M15: reset throttle on modal close
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <View style={styles.headerIcon}>
                <Icon name="cog" size={26} color={Colors.accent} />
              </View>
              <Text style={styles.title}>{t('settings_title')}</Text>
            </View>
            {activeProfile !== 'আমি' && (
              <View style={styles.profileBadge}>
                <Icon name="account-circle" size={14} color={Colors.accent} />
                <Text style={styles.profileBadgeText}>{activeProfile}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── User Authentication / Profile ── */}
          <Text style={styles.sectionLabel}>অ্যাকাউন্ট</Text>
          <View style={styles.card}>
            {isAuthenticated && user ? (
              <View style={styles.profileSection}>
                <View style={styles.profileInfo}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.profileName}>{user.name}</Text>
                    <Text style={styles.profileEmail}>{user.email}</Text>
                    <View style={styles.badgeRow}>
                      <Icon name="medal" size={14} color={Colors.accent} />
                      <Text style={styles.badgeText}>{user.badge} · {user.xp} XP</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); Alert.alert('সফল', 'লগআউট করা হয়েছে'); }}>
                  <Icon name="logout" size={18} color="#ef4444" />
                  <Text style={styles.logoutBtnText}>লগআউট</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.loginCard} onPress={() => navigation.navigate('Login')}>
                <View style={styles.loginIconBox}>
                  <Icon name="account-key-outline" size={24} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>লগইন বা সাইন-আপ</Text>
                  <Text style={styles.rowDesc}>XP সিঙ্ক এবং রিপোর্ট ট্র্যাক করতে লগইন করুন</Text>
                </View>
                <Icon name="chevron-right" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}

            {isAuthenticated && user?.is_admin && (
              <>
                <View style={styles.divider} />
                <NavRow
                  icon="shield-star-outline"
                  label="অ্যাডমিন কন্ট্রোল"
                  description="পেন্ডিং রিপোর্ট যাচাই করুন"
                  color="#10b981"
                  onPress={() => navigation.navigate('AdminDashboard')}
                />
              </>
            )}
          </View>

          {/* ── Stats ── */}
          <Text style={styles.sectionLabel}>এই মাসের সারসংক্ষেপ</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="magnify" size={20} color={Colors.accent} />
              <Text style={styles.statNum}>{monthEntries.length}</Text>
              <Text style={styles.statLabel}>স্ক্যান</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="alert-outline" size={20} color={Colors.threat} />
              <Text style={[styles.statNum, { color: Colors.threat }]}>{monthThreats}</Text>
              <Text style={styles.statLabel}>হুমকি</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="block-helper" size={20} color={Colors.suspicious} />
              <Text style={[styles.statNum, { color: Colors.suspicious }]}>{blocklist.length}</Text>
              <Text style={styles.statLabel}>ব্লক</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="flag-outline" size={20} color="#818cf8" />
              <Text style={[styles.statNum, { color: '#818cf8' }]}>{spamRecords.length}</Text>
              <Text style={styles.statLabel}>রিপোর্ট</Text>
            </View>
          </View>

          {/* ── Notifications ── */}
          <Text style={styles.sectionLabel}>{t('settings_notifications')}</Text>
          <View style={styles.card}>
            <SettingRow
              icon="bell-outline" label={t('settings_push')} description={t('settings_push_desc')}
              right={<Switch value={notificationsEnabled} onValueChange={hv(setNotificationsEnabled)} trackColor={{ false: Colors.border, true: Colors.accent }} thumbColor={Colors.white} />}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="bell-badge-outline" label={t('settings_daily')} description={t('settings_daily_desc')}
              right={<Switch value={dailySummaryEnabled} onValueChange={hv(setDailySummaryEnabled)} trackColor={{ false: Colors.border, true: Colors.accent }} thumbColor={Colors.white} />}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="vibrate" label={t('settings_sound')} description={t('settings_sound_desc')}
              right={<Switch value={soundAlertEnabled} onValueChange={hv(setSoundAlertEnabled)} trackColor={{ false: Colors.border, true: Colors.accent }} thumbColor={Colors.white} />}
            />
            <View style={styles.divider} />
            {/* N6: OTP guard */}
            <SettingRow
              icon="key-alert"
              label={t('settings_otp_guard')}
              description={otpGuardEnabled ? t('settings_otp_guard_on') : t('settings_otp_guard_off')}
              right={
                <Switch
                  value={otpGuardEnabled}
                  onValueChange={hv(setOtpGuardEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.threat }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            {/* N2: weekly digest */}
            <SettingRow
              icon="calendar-week"
              label={t('settings_weekly_digest')}
              description={weeklyDigestEnabled ? t('settings_weekly_digest_on') : t('settings_weekly_digest_off')}
              right={
                <Switch
                  value={weeklyDigestEnabled}
                  onValueChange={hv(setWeeklyDigestEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            {/* R5: District alert toggle */}
            <SettingRow
              icon="map-marker-alert"
              label="জেলা সতর্কতা"
              description={districtAlertEnabled && userDistrict ? `${userDistrict} জেলার নতুন হুমকিতে বিজ্ঞপ্তি` : 'আপনার জেলার নতুন হুমকিতে alert পান'}
              right={
                <Switch
                  value={districtAlertEnabled}
                  onValueChange={hv(setDistrictAlertEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            {districtAlertEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Icon name="map-marker" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>আপনার জেলা</Text>
                    <TextInput
                      style={styles.districtInput}
                      value={districtInput || userDistrict}
                      onChangeText={setDistrictInput}
                      placeholder="যেমন: ঢাকা, চট্টগ্রাম..."
                      placeholderTextColor={Colors.text.tertiary}
                      onSubmitEditing={handleDistrictSave}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity style={styles.districtSaveBtn} onPress={handleDistrictSave}>
                    <Icon name="check" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* ── Language ── */}
          <Text style={styles.sectionLabel}>{t('settings_lang_section')}</Text>
          <View style={styles.card}>
            <Text style={styles.rowLabel}>{t('settings_lang_label')}</Text>
            <View style={styles.langRow}>
              {([['bn', '🇧🇩  বাংলা'], ['en', '🇺🇸  English']] as const).map(([val, lbl]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.langBtn, language === val && styles.langBtnActive]}
                  onPress={() => setLanguage(val)}
                >
                  <Text style={[styles.langBtnText, language === val && styles.langBtnTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── R8: Theme ── */}
          <Text style={styles.sectionLabel}>থিম</Text>
          <View style={styles.card}>
            <Text style={styles.rowDesc}>রঙের থিম নির্বাচন করুন</Text>
            <View style={styles.langRow}>
              {([
                ['dark',   'weather-night',    'ডার্ক'],
                ['light',  'weather-sunny',    'লাইট'],
                ['system', 'theme-light-dark', 'সিস্টেম'],
              ] as const).map(([val, icon, lbl]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.langBtn, styles.themeBtn, themeMode === val && styles.langBtnActive]}
                  onPress={() => setThemeMode(val)}
                >
                  <Icon name={icon} size={15} color={themeMode === val ? Colors.accent : Colors.text.secondary} />
                  <Text style={[styles.langBtnText, themeMode === val && styles.langBtnTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Data ── */}
          <Text style={styles.sectionLabel}>{t('settings_data')}</Text>
          <View style={styles.card}>
            <SettingRow
              icon="delete-clock-outline" label={t('settings_auto_delete')}
              right={
                <TouchableOpacity style={styles.selectBtn} onPress={() => setDeletePickerOpen(true)}>
                  <Text style={styles.selectBtnText}>{autoDeleteLabel}</Text>
                  <Icon name="chevron-down" size={15} color={Colors.accent} />
                </TouchableOpacity>
              }
            />
            <View style={styles.divider} />
            <NavRow
              icon="shield-lock" label={t('settings_blocklist')}
              description={`${t('settings_blocklist_desc')} (${blocklist.length})`}
              onPress={() => navigation.navigate('Blocklist')}
            />
            <View style={styles.divider} />
            {/* N3: trusted whitelist */}
            <NavRow
              icon="account-heart" label={t('settings_trusted_numbers')}
              description={`${t('settings_trusted_numbers_desc')} (${trustedNumbers.length})`}
              color={Colors.safe}
              onPress={() => navigation.navigate('TrustedContacts')}
            />
            <View style={styles.divider} />
            {/* S1: clipboard guard */}
            <SettingRow
              icon="content-paste"
              label={t('settings_clipboard_guard')}
              description={clipboardGuardEnabled ? t('settings_clipboard_guard_on') : t('settings_clipboard_guard_off')}
              right={
                <Switch
                  value={clipboardGuardEnabled}
                  onValueChange={hv(setClipboardGuardEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            <NavRow
              icon="account-group" label={t('settings_family')}
              description={t('settings_family_desc')}
              onPress={() => navigation.navigate('Family')}
            />
            <View style={styles.divider} />
            <NavRow
              icon="export-variant" label={t('settings_export')}
              description={t('settings_export_desc')}
              color={Colors.safe}
              onPress={handleExport}
              right={exporting ? <ActivityIndicator size="small" color={Colors.accent} /> : undefined}
            />
            <View style={styles.divider} />
            {/* R7: JSON backup export */}
            <NavRow
              icon="cloud-download-outline"
              label="ইতিহাস ব্যাকআপ"
              description="সম্পূর্ণ ইতিহাস JSON ফাইলে সংরক্ষণ করুন"
              color="#818cf8"
              onPress={handleBackupExport}
              right={backupBusy ? <ActivityIndicator size="small" color={Colors.accent} /> : undefined}
            />
            <View style={styles.divider} />
            {/* R7: JSON backup import */}
            <NavRow
              icon="cloud-upload-outline"
              label="ব্যাকআপ পুনরুদ্ধার"
              description="আগের ব্যাকআপ ফাইল থেকে ইতিহাস ফিরিয়ে আনুন"
              color="#818cf8"
              onPress={handleBackupImport}
              right={backupBusy ? <ActivityIndicator size="small" color={Colors.accent} /> : undefined}
            />
          </View>

          {/* ── Advanced Protection ── */}
          <Text style={styles.sectionLabel}>{t('settings_advanced')}</Text>
          <View style={styles.card}>
            <NavRow
              icon="phone-check"
              label={t('settings_call_screen')}
              description={t('settings_call_screen_desc')}
              color={Colors.accent}
              onPress={() => navigation.navigate('CallerID')}
            />
            <View style={styles.divider} />
            <NavRow
              icon="phone-log"
              label="কল লগ"
              description="স্প্যাম স্কোরসহ সাম্প্রতিক কল"
              color={Colors.accent}
              onPress={() => navigation.navigate('CallLog')}
            />
            <View style={styles.divider} />
            <NavRow
              icon="message-processing"
              label={t('settings_sms_scan')}
              description={t('settings_sms_scan_desc')}
              color={Colors.accent}
              onPress={() => navigation.navigate('SMSScan')}
            />
            <View style={styles.divider} />

            {/* SMS Auto-scan toggle */}
            <SettingRow
              icon="message-badge-outline"
              label="SMS অটো-স্ক্যান"
              description={smsAutoScanEnabled ? 'নতুন SMS স্বয়ংক্রিয়ভাবে বিশ্লেষণ হয়' : 'SMS অটো-স্ক্যান বন্ধ'}
              right={
                <Switch
                  value={smsAutoScanEnabled}
                  onValueChange={hv(setSmsAutoScanEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />

            {/* SMS Alert Category toggles */}
            {smsAutoScanEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.catSection}>
                  <Text style={styles.catSectionLabel}>বিজ্ঞপ্তি পাঠাবে যখন:</Text>
                  {ALERT_CATS.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <View key={cat} style={styles.catRow}>
                        <Icon name={CATEGORY_VECTOR_ICON[cat]} size={18} color={meta.color} style={styles.catIcon} />
                        <Text style={styles.catLabel}>{meta.label_bn}</Text>
                        <Switch
                          value={smsAlertCategories.includes(cat)}
                          onValueChange={hv(() => toggleSmsAlertCategory(cat))}
                          trackColor={{ false: Colors.border, true: meta.color }}
                          thumbColor={Colors.white}
                          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                        />
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.divider} />
            <SettingRow
              icon="shield-alert"
              label="অটো-ব্লক"
              description="উচ্চ স্প্যাম স্কোরের নম্বর স্বয়ংক্রিয়ভাবে ব্লক"
              right={
                <Switch
                  value={autoBlockEnabled}
                  onValueChange={hv(setAutoBlockEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.threat }}
                  thumbColor={Colors.white}
                />
              }
            />
            {autoBlockEnabled && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="speedometer"
                  label="ব্লক থ্রেশহোল্ড"
                  description={`স্কোর ≥ ${Math.round(autoBlockThreshold * 100)}% হলে ব্লক`}
                  right={
                    <TouchableOpacity style={styles.selectBtn} onPress={() => setThresholdPickerOpen(true)}>
                      <Text style={styles.selectBtnText}>{Math.round(autoBlockThreshold * 100)}%</Text>
                      <Icon name="chevron-down" size={15} color={Colors.accent} />
                    </TouchableOpacity>
                  }
                />
              </>
            )}

            <View style={styles.divider} />
            {/* P1: Chat Guard — WhatsApp/Telegram notification scanning */}
            <SettingRow
              icon="message-alert-outline"
              label={t('settings_chat_guard')}
              description={chatGuardEnabled ? t('settings_chat_guard_on') : t('settings_chat_guard_off')}
              right={
                <Switch
                  value={chatGuardEnabled}
                  onValueChange={hv(handleChatGuardToggle)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            {chatGuardEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.catSection}>
                  <View style={styles.muteHintBox}>
                    <Icon name="information-outline" size={16} color="#818cf8" />
                    <Text style={styles.muteHintText}>
                      টিপ: চ্যাট অ্যাপে নোটিফিকেশন <Text style={{fontWeight: '800', color: '#fff'}}>Silent বা Mute</Text> করে রাখলেও EProhori ক্ষতিকর মেসেজ সনাক্ত করতে পারবে।
                    </Text>
                  </View>
                  <Text style={styles.catSectionLabel}>{t('settings_chat_guard_apps_label')}</Text>
                  <View style={styles.chipWrap}>
                    {CHAT_GUARD_APPS.map((app) => {
                      const active = chatGuardApps.includes(app.pkg);
                      return (
                        <TouchableOpacity
                          key={app.pkg}
                          style={[styles.appChip, active && styles.appChipActive]}
                          onPress={() => toggleChatGuardApp(app.pkg)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.appChipIcon}>{app.icon}</Text>
                          <Text style={[styles.appChipText, active && styles.appChipTextActive]}>
                            {app.name}
                          </Text>
                          {active && <Icon name="check" size={12} color={Colors.accent} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity style={styles.permBtn} onPress={() => openChatGuardSettings()}>
                    <Icon name="bell-cog-outline" size={14} color={Colors.accent} />
                    <Text style={styles.permBtnText}>{t('settings_chat_guard_perm_btn')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <View style={styles.divider} />
            {/* P3: Call screening role */}
            <SettingRow
              icon="phone-cancel"
              label={t('settings_call_screening')}
              description={callScreeningEnabled ? t('settings_call_screening_on') : t('settings_call_screening_off')}
              right={
                <Switch
                  value={callScreeningEnabled}
                  onValueChange={hv(handleCallScreeningToggle)}
                  trackColor={{ false: Colors.border, true: Colors.threat }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            {/* Scheduled daily SMS scan */}
            <SettingRow
              icon="alarm-check"
              label="দৈনিক SMS স্ক্যান রিমাইন্ডার"
              description={scheduledScanEnabled ? `প্রতিদিন সকাল ${scheduledScanHour}টায় মনে করিয়ে দেবে` : 'নির্ধারিত স্ক্যান বন্ধ'}
              right={
                <Switch
                  value={scheduledScanEnabled}
                  onValueChange={hv(setScheduledScanEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            {scheduledScanEnabled && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="clock-outline"
                  label="স্ক্যান সময়"
                  description="কয়টায় মনে করিয়ে দেবে"
                  right={
                    <View style={styles.hourPicker}>
                      <TouchableOpacity
                        style={styles.hourBtn}
                        onPress={() => setScheduledScanHour(Math.max(0, scheduledScanHour - 1))}
                      >
                        <Icon name="minus" size={14} color={Colors.accent} />
                      </TouchableOpacity>
                      <Text style={styles.hourText}>{scheduledScanHour}:00</Text>
                      <TouchableOpacity
                        style={styles.hourBtn}
                        onPress={() => setScheduledScanHour(Math.min(23, scheduledScanHour + 1))}
                      >
                        <Icon name="plus" size={14} color={Colors.accent} />
                      </TouchableOpacity>
                    </View>
                  }
                />
              </>
            )}
          </View>

          {/* ── Privacy ── */}
          <Text style={styles.sectionLabel}>গোপনীয়তা</Text>
          <View style={styles.card}>
            {/* App Lock */}
            <SettingRow
              icon="lock-outline"
              label="অ্যাপ লক"
              description={
                appLockEnabled
                  ? 'PIN দিয়ে সুরক্ষিত — ব্যাকগ্রাউন্ডে গেলে লক হবে'
                  : 'ব্যক্তিগত তথ্য PIN দিয়ে সুরক্ষিত করুন'
              }
              right={
                <Switch
                  value={appLockEnabled}
                  onValueChange={hv(handleAppLockToggle)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            {appLockEnabled && (
              <>
                <View style={styles.divider} />
                <NavRow
                  icon="lock-reset"
                  label="PIN পরিবর্তন করুন"
                  description="নতুন ৪-সংখ্যার PIN সেট করুন"
                  onPress={openPinSetup}
                />
                <View style={styles.divider} />
                {/* R4: Biometric toggle */}
                <SettingRow
                  icon="fingerprint"
                  label="ফিঙ্গারপ্রিন্ট আনলক"
                  description={biometricEnabled ? 'PIN-এর পরিবর্তে ফিঙ্গারপ্রিন্ট ব্যবহার করুন' : 'ফিঙ্গারপ্রিন্ট দিয়ে দ্রুত আনলক করুন'}
                  right={
                    <Switch
                      value={biometricEnabled}
                      onValueChange={hv(setBiometricEnabled)}
                      trackColor={{ false: Colors.border, true: Colors.accent }}
                      thumbColor={Colors.white}
                    />
                  }
                />
              </>
            )}
            <View style={styles.divider} />

            {/* Ghost Mode */}
            <SettingRow
              icon="ghost"
              label="Ghost Mode"
              description={ghostModeEnabled
                ? 'আপনার নাম-ট্যাগ কমিউনিটিতে শেয়ার হবে না'
                : 'নাম-ট্যাগ কমিউনিটিতে শেয়ার হয় (ডিফল্ট)'}
              right={
                <Switch
                  value={ghostModeEnabled}
                  onValueChange={hv(setGhostModeEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />

            {/* Privacy Mode */}
            <SettingRow
              icon="incognito"
              label="প্রাইভেসি মোড"
              description={privacyModeEnabled
                ? 'শুধু স্থানীয় বিশ্লেষণ — কোনো ডেটা বাইরে যায় না'
                : 'AI বিশ্লেষণে VirusTotal/Groq/Gemini ব্যবহার হয়'}
              right={
                <Switch
                  value={privacyModeEnabled}
                  onValueChange={hv(setPrivacyModeEnabled)}
                  trackColor={{ false: Colors.border, true: '#818cf8' }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />

            {/* Battery Saver */}
            <SettingRow
              icon="battery-charging-low"
              label="ব্যাটারি সেভার"
              description={batterySaverEnabled
                ? 'পটভূমি SMS শ্রোতা বন্ধ — কম ব্যাটারি খরচ'
                : 'পটভূমিতে SMS স্বয়ংক্রিয়ভাবে পর্যবেক্ষণ হয়'}
              right={
                <Switch
                  value={batterySaverEnabled}
                  onValueChange={hv(setBatterySaverEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.safe }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />

            {/* My Reports */}
            <NavRow
              icon="flag-checkered"
              label="আমার রিপোর্ট"
              description={
                spamRecords.length === 0
                  ? 'কোনো নম্বর রিপোর্ট করা হয়নি'
                  : `${spamRecords.length} টি নম্বর · ${totalReports} টি রিপোর্ট`
              }
              onPress={() => navigation.navigate('MyReports')}
            />
            <View style={styles.divider} />

            {/* S9: Contact Contribution */}
            <SettingRow
              icon="account-multiple-plus-outline"
              label="কলার আইডি উন্নত করুন"
              description={contactSyncEnabled ? 'কমিউনিটি কন্ট্রিবিউশন সক্রিয়' : 'আপনার কন্টাক্ট শেয়ার করে সাহায্য করুন'}
              right={
                syncing ? <ActivityIndicator size="small" color={Colors.accent} /> :
                <Switch
                  value={contactSyncEnabled}
                  onValueChange={hv(handleSyncToggle)}
                  trackColor={{ false: Colors.border, true: Colors.safe }}
                  thumbColor={Colors.white}
                />
              }
            />
          </View>

          {/* ── S2/S3/S4: Family & Senior Protection ── */}
          <Text style={styles.sectionLabel}>{t('settings_family_senior_section')}</Text>
          <View style={styles.card}>
            {/* S2: senior mode */}
            <SettingRow
              icon="account-supervisor-circle-outline"
              label={t('settings_senior_mode')}
              description={seniorModeEnabled ? t('settings_senior_mode_on') : t('settings_senior_mode_off')}
              right={
                <Switch
                  value={seniorModeEnabled}
                  onValueChange={hv(setSeniorModeEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            {/* S4: voice alert TTS */}
            <SettingRow
              icon="volume-high"
              label={t('settings_voice_alert')}
              description={voiceAlertEnabled ? t('settings_voice_alert_on') : t('settings_voice_alert_off')}
              right={
                <Switch
                  value={voiceAlertEnabled}
                  onValueChange={hv(setVoiceAlertEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.white}
                />
              }
            />
            <View style={styles.divider} />
            {/* S3: family guardian alert */}
            <SettingRow
              icon="account-alert-outline"
              label={t('settings_guardian_alert')}
              description={guardianAlertEnabled && guardianNumber
                ? t('settings_guardian_alert_on_template')
                    .replace('{threshold}', String(guardianThreshold))
                    .replace('{number}', guardianNumber)
                : t('settings_guardian_alert_off')}
              right={
                <Switch
                  value={guardianAlertEnabled}
                  onValueChange={hv(setGuardianAlertEnabled)}
                  trackColor={{ false: Colors.border, true: Colors.threat }}
                  thumbColor={Colors.white}
                />
              }
            />
            {guardianAlertEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Icon name="phone-outline" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{t('settings_guardian_number_label')}</Text>
                    <TextInput
                      style={styles.districtInput}
                      value={guardianInput || guardianNumber}
                      onChangeText={setGuardianInput}
                      placeholder={t('trusted_placeholder')}
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="phone-pad"
                      onSubmitEditing={handleGuardianSave}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity style={styles.districtSaveBtn} onPress={handleGuardianSave}>
                    <Icon name="check" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Icon name="speedometer" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{t('settings_guardian_threshold_label')}</Text>
                    <Text style={styles.rowDesc}>{t('settings_guardian_threshold_desc_template').replace('{threshold}', String(guardianThreshold))}</Text>
                  </View>
                  <View style={styles.hourPicker}>
                    <TouchableOpacity
                      style={styles.hourBtn}
                      onPress={() => setGuardianThreshold(guardianThreshold - 5)}
                    >
                      <Icon name="minus" size={14} color={Colors.accent} />
                    </TouchableOpacity>
                    <Text style={styles.hourText}>{guardianThreshold}%</Text>
                    <TouchableOpacity
                      style={styles.hourBtn}
                      onPress={() => setGuardianThreshold(guardianThreshold + 5)}
                    >
                      <Icon name="plus" size={14} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.divider} />
                <SettingRow
                  icon="map-marker-radius-outline"
                  label={t('settings_guardian_location')}
                  description={guardianLocationEnabled ? t('settings_guardian_location_on') : t('settings_guardian_location_off')}
                  right={
                    <Switch
                      value={guardianLocationEnabled}
                      onValueChange={hv(setGuardianLocationEnabled)}
                      trackColor={{ false: Colors.border, true: Colors.threat }}
                      thumbColor={Colors.white}
                    />
                  }
                />
              </>
            )}
          </View>

          {/* ── Help & Report ── */}
          <Text style={styles.sectionLabel}>সাহায্য ও সুরক্ষা</Text>
          <View style={styles.card}>
            <NavRow
              icon="school-outline"
              label="সাইবার নিরাপত্তা শিক্ষা"
              description="প্রতারণার ধরন চিনুন, নিরাপদ থাকুন"
              color="#818cf8"
              onPress={() => navigation.navigate('CyberSafety')}
            />
            <View style={styles.divider} />
            <NavRow
              icon="shield-alert"
              label="সাইবার ক্রাইম রিপোর্ট"
              description="BTRC, পুলিশ, RAB — কোথায় রিপোর্ট করবেন"
              color={Colors.threat}
              onPress={() => navigation.navigate('CyberReport')}
            />
          </View>

          {/* ── About ── */}
          <Text style={styles.sectionLabel}>{t('settings_about')}</Text>
          <View style={styles.card}>
            <View style={styles.aboutBrand}>
              <LinearGradient colors={Colors.gradient.accent} style={styles.aboutBadge}>
                <Icon name="shield-check" size={22} color={Colors.primary} />
              </LinearGradient>
              <View>
                <Text style={styles.aboutName}>EProhori</Text>
                <Text style={styles.aboutVer}>{t('settings_version')}</Text>
              </View>
            </View>
            <Text style={styles.aboutText}>{t('settings_about_text')}</Text>
            <TouchableOpacity style={styles.linkBtn}>
              <LinearGradient colors={Colors.gradient.accent} style={styles.linkBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="web" size={16} color={Colors.primary} />
                <Text style={styles.linkBtnText}>{t('settings_website')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtnOutline}>
              <Icon name="email-outline" size={16} color={Colors.accent} />
              <Text style={styles.linkBtnOutlineText}>{t('settings_support')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Community Sync Disclosure Modal ── */}
      <Modal visible={syncDisclosureOpen} transparent animationType="slide" onRequestClose={() => setSyncDisclosureOpen(false)}>
        <View style={styles.pinOverlay}>
          <View style={[styles.pinCard, { gap: 16 }]}>
            <View style={styles.disclosureIcon}>
              <Icon name="shield-account-variant-outline" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.disclosureTitle}>কলার আইডি উন্নত করতে সাহায্য করুন</Text>
            <Text style={styles.disclosureText}>
              EProhori একটি কমিউনিটি ভিত্তিক অ্যাপ। আপনি যদি আপনার কন্টাক্ট লিস্টের নাম ও নম্বর আমাদের সুরক্ষিত সার্ভারে শেয়ার করেন, তবে আপনি এবং অন্য ইউজাররা অজানা নম্বরগুলো আরও সহজে চিনতে পারবেন (যেমন ট্রু-কলার)।
            </Text>
            <View style={styles.disclosureBulletBox}>
              <Text style={styles.disclosureBullet}>• শুধু নাম ও নম্বর সংগ্রহ করা হয়।</Text>
              <Text style={styles.disclosureBullet}>• কোনো ব্যক্তিগত মেসেজ বা ফাইল দেখা হয় না।</Text>
              <Text style={styles.disclosureBullet}>• আপনি চাইলে যেকোনো সময় এটি বন্ধ করতে পারেন।</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSyncDisclosureOpen(false)}>
                <Text style={styles.cancelBtnText}>এখন না</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={confirmSync}>
                <LinearGradient colors={Colors.gradient.accent} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.submitBtnText}>সম্মত ও সক্রিয় করুন</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Auto-block threshold modal ── */}
      <Modal visible={thresholdPickerOpen} transparent animationType="fade" onRequestClose={() => setThresholdPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setThresholdPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ব্লক থ্রেশহোল্ড</Text>
            {([0.5, 0.65, 0.75, 0.9] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={styles.modalOption}
                onPress={() => { setAutoBlockThreshold(v); setThresholdPickerOpen(false); }}
              >
                <Text style={[styles.modalOptionText, autoBlockThreshold === v && { color: Colors.accent }]}>
                  {Math.round(v * 100)}% —{' '}
                  {v === 0.5 ? 'সন্দেহজনক ও উপরে' :
                   v === 0.65 ? 'মধ্যম ঝুঁকি' :
                   v === 0.75 ? 'অত্যন্ত বিপজ্জনক (প্রস্তাবিত)' :
                   'শুধু সর্বোচ্চ ঝুঁকি'}
                </Text>
                {autoBlockThreshold === v && <Icon name="check-circle" size={18} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Auto-delete modal ── */}
      <Modal visible={deletePickerOpen} transparent animationType="fade" onRequestClose={() => setDeletePickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDeletePickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings_delete_modal_title')}</Text>
            {AUTO_DELETE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.modalOption}
                onPress={() => { setAutoDeleteDays(opt.value); setDeletePickerOpen(false); }}
              >
                <Text style={[styles.modalOptionText, autoDeleteDays === opt.value && { color: Colors.accent }]}>
                  {opt.label}
                </Text>
                {autoDeleteDays === opt.value && <Icon name="check-circle" size={18} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── PIN setup / verify modal ── */}
      <Modal visible={pinModal !== null} transparent animationType="slide" onRequestClose={closePinModal}>
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <Icon name="lock-outline" size={28} color={Colors.accent} />
              <Text style={styles.pinTitle}>
                {pinModal === 'setup'          ? '৪ সংখ্যার PIN সেট করুন' :
                 pinModal === 'confirm'        ? 'PIN নিশ্চিত করুন' :
                                                'বর্তমান PIN দিন'}
              </Text>
            </View>

            <View style={styles.pinDots}>
              {[0,1,2,3].map((i) => (
                <View
                  key={i}
                  style={[styles.pinDot, pinEntry.length > i && styles.pinDotFilled]}
                />
              ))}
            </View>

            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}

            <PinKeypad value={pinEntry} onChange={setPinEntry} onConfirm={handlePinConfirm} />

            <TouchableOpacity style={styles.pinCancel} onPress={closePinModal}>
              <Text style={styles.pinCancelText}>বাতিল</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },

  header:     { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'] },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:        { ...TextStyles.h2, color: Colors.accent },
  profileBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentGlow, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.borderAccent,
  },
  profileBadgeText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },

  // Auth styles
  profileSection: { gap: 12 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarLarge: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.accentGlow, borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: Colors.accent },
  profileName: { ...TextStyles.body, fontWeight: 'bold', color: Colors.text.primary },
  profileEmail: { ...TextStyles.caption, color: Colors.text.tertiary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  badgeText: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  logoutBtnText: { ...TextStyles.caption, color: '#ef4444', fontWeight: 'bold' },
  loginCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  loginIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center',
  },

  body: { padding: Spacing.lg },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },

  // ── Stats grid ──
  statsGrid: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: 2,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center', gap: 3,
  },
  statNum:   { ...TextStyles.h2, color: Colors.accent },
  statLabel: { ...TextStyles.caption, color: Colors.text.tertiary, fontSize: 10 },

  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: 2,
    ...Shadows.small,
  },

  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowIcon:    { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.accentGlow, justifyContent: 'center', alignItems: 'center' },
  rowContent: { flex: 1 },
  rowLabel:   { ...TextStyles.body, color: Colors.text.primary },
  rowDesc:    { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },
  divider:    { height: 1, backgroundColor: Colors.border, marginVertical: 2 },

  langRow:         { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  langBtn:         { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  themeBtn:        { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  langBtnActive:   { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  langBtnText:     { ...TextStyles.body, color: Colors.text.secondary },
  langBtnTextActive: { color: Colors.accent, fontWeight: '700' },

  selectBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  selectBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '600' },

  // ── SMS category alert toggles ──
  catSection:      { paddingVertical: Spacing.sm, gap: 8 },
  catSectionLabel: { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  catRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  catIcon:         { width: 28 },
  catLabel:        { ...TextStyles.body, flex: 1, color: Colors.text.primary },

  // P1: chat guard app chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  appChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.primary,
  },
  appChipActive:     { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  appChipIcon:       { fontSize: 12 },
  appChipText:       { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  appChipTextActive: { color: Colors.accent },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.sm, paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderAccent,
    backgroundColor: Colors.accentGlow,
  },
  permBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },

  muteHintBox: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#818cf815', borderRadius: 10,
    borderWidth: 1, borderColor: '#818cf830',
    marginBottom: 12,
  },
  muteHintText: { fontSize: 11, color: Colors.text.secondary, flex: 1, lineHeight: 16 },

  hourPicker:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hourBtn:         {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderAccent,
    backgroundColor: Colors.accentGlow, justifyContent: 'center', alignItems: 'center',
  },
  hourText:        { ...TextStyles.body, color: Colors.accent, fontWeight: '700', minWidth: 44, textAlign: 'center' },

  aboutBrand:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  aboutBadge:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aboutName:   { ...TextStyles.h3, color: Colors.accent },
  aboutVer:    { ...TextStyles.caption, color: Colors.text.tertiary },
  aboutText:   { ...TextStyles.body, color: Colors.text.secondary, marginBottom: Spacing.lg, lineHeight: 22 },

  linkBtn:     { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.sm },
  linkBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  linkBtnText: { ...TextStyles.button, color: Colors.primary },

  linkBtnOutline:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.accent,
  },
  linkBtnOutlineText: { ...TextStyles.button, color: Colors.accent },

  overlay:         { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  modalCard:       { width: '100%', backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  modalTitle:      { ...TextStyles.h3, color: Colors.accent, marginBottom: Spacing.lg },
  modalOption:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalOptionText: { ...TextStyles.body, color: Colors.text.primary },

  // ── PIN modal ──
  pinOverlay: {
    flex: 1, backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  pinCard: {
    backgroundColor: Colors.secondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing['2xl'], borderWidth: 1, borderColor: Colors.border, borderBottomWidth: 0,
    alignItems: 'center', gap: Spacing.lg,
  },
  pinHeader:  { alignItems: 'center', gap: Spacing.sm },
  pinTitle:   { ...TextStyles.h3, color: Colors.text.primary },
  pinDots:    { flexDirection: 'row', gap: 16 },
  pinDot:     { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.border },
  pinDotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pinError:   { ...TextStyles.caption, color: Colors.threat },

  pinKeypad: { gap: Spacing.sm, width: '100%', paddingHorizontal: Spacing.lg },
  pinRow:    { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  pinKey: {
    width: 76, height: 64, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pinKeyConfirm: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pinKeyText:    { ...TextStyles.h3, color: Colors.text.primary },

  pinCancel:     { paddingVertical: Spacing.sm, paddingHorizontal: Spacing['2xl'] },
  pinCancelText: { ...TextStyles.body, color: Colors.text.tertiary },

  // R5: district alert input
  districtInput: {
    ...TextStyles.body, color: Colors.text.primary,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 4, marginTop: 4,
  },
  districtSaveBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
  },

  disclosureIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.accentGlow, justifyContent: 'center', alignItems: 'center',
  },
  disclosureTitle: { ...TextStyles.h3, color: Colors.accent, textAlign: 'center' },
  disclosureText: { ...TextStyles.body, color: Colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  disclosureBulletBox: { alignSelf: 'stretch', gap: 6, marginVertical: 8 },
  disclosureBullet: { fontSize: 12, color: Colors.text.tertiary },
});

export default SettingsScreen;
