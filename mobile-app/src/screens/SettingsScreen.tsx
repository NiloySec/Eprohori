import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Text, StyleSheet, Switch, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSettingsStore, useHistoryStore, useSpamNumberStore, useAuthStore } from '@stores';
import { CATEGORY_META, exportHistoryCSV } from '@utils';
import { useTranslation } from '@hooks';
import { Colors, Shadows } from '@theme';
import { exportBackup, importBackup } from '../services/backupService';
import { performContactSync } from '../services/contactSyncService';
import {
  isChatGuardAvailable, isChatGuardPermitted, openChatGuardSettings,
} from '../services/notifGuardService';
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

// ── PIN keypad ────────────────────────────────────────────────────────────────
const PIN_ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','✓']];

const PinKeypad = ({ value, onChange, onConfirm }: { value: string; onChange: (v: string) => void; onConfirm: () => void }) => (
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
            {key === '⌫' ? <Icon name="backspace-outline" size={20} color={Colors.text.secondary} /> :
             key === '✓' ? <Icon name="check" size={20} color={Colors.primary} /> :
             <Text style={styles.pinKeyText}>{key}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    ))}
  </View>
);

const ALERT_CATS = ['mfs_fraud', 'otp_theft', 'fraud', 'phishing', 'malware', 'emergency', 'otp'] as const;
const CATEGORY_VECTOR_ICON: Record<(typeof ALERT_CATS)[number], MCIcon> = {
  mfs_fraud: 'credit-card-off-outline', otp_theft: 'lock-alert-outline', fraud: 'alert-outline',
  phishing: 'hook', malware: 'bug-outline', emergency: 'alarm-light-outline', otp: 'key-outline',
};

function hv<T extends (v: boolean) => void>(fn: T): (v: boolean) => void {
  return (v: boolean) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); fn(v); };
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

  const [pinModal,    setPinModal]    = useState<'setup' | 'confirm' | 'verify_disable' | null>(null);
  const [pinStep1,    setPinStep1]    = useState('');
  const [pinEntry,    setPinEntry]    = useState('');
  const [pinError,    setPinError]    = useState('');
  const [pinFailCount, setPinFailCount] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState(0);

  const t = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const {
    language, notificationsEnabled, dailySummaryEnabled,
    soundAlertEnabled, autoDeleteDays, blocklist, activeProfile,
    autoBlockEnabled, autoBlockThreshold, ghostModeEnabled,
    smsAutoScanEnabled, smsAlertCategories, appLockEnabled, appLockPin,
    scheduledScanEnabled, scheduledScanHour, privacyModeEnabled, batterySaverEnabled,
    biometricEnabled, themeMode, userDistrict, districtAlertEnabled,
    otpGuardEnabled, weeklyDigestEnabled, trustedNumbers,
    chatGuardEnabled,
    clipboardGuardEnabled, contactSyncEnabled,
    guardianAlertEnabled, guardianNumber, guardianThreshold, guardianLocationEnabled, voiceAlertEnabled,
    setOtpGuardEnabled, setWeeklyDigestEnabled, setContactSyncEnabled,
    setChatGuardEnabled,
    setClipboardGuardEnabled,
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

  const monthStart    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthEntries  = entries.filter((e) => e.timestamp >= monthStart);
  const monthThreats  = monthEntries.filter((e) => e.result?.confidence >= 60).length;

  const AUTO_DELETE_OPTIONS = [
    { label: t('delete_7'),     value: 7 }, { label: t('delete_15'),    value: 15 },
    { label: t('delete_30'),    value: 30 }, { label: t('delete_never'), value: 365 },
  ];
  const autoDeleteLabel = AUTO_DELETE_OPTIONS.find((o) => o.value === autoDeleteDays)?.label ?? `${autoDeleteDays}`;

  const handleExport = async () => {
    if (entries.length === 0) { Alert.alert('', t('settings_export_empty')); return; }
    setExporting(true);
    try { const ok = await exportHistoryCSV(entries, language); if (ok) Alert.alert('', t('settings_export_ok')); }
    catch { Alert.alert('', t('community_error')); } finally { setExporting(false); }
  };

  const handleBackupExport = async () => {
    setBackupBusy(true);
    try { const ok = await exportBackup(); if (!ok) Alert.alert('', 'ব্যাকআপ ব্যর্থ হয়েছে'); } finally { setBackupBusy(false); }
  };

  const handleBackupImport = async () => {
    setBackupBusy(true);
    try {
      const { imported, error } = await importBackup();
      if (error) Alert.alert('ত্রুটি', error);
      else Alert.alert('সফল', `${imported} টি নতুন এন্ট্রি আমদানি করা হয়েছে`);
    } finally { setBackupBusy(false); }
  };

  const handleChatGuardToggle = async (v: boolean) => {
    if (!v) { setChatGuardEnabled(false); return; }
    if (!isChatGuardAvailable()) { Alert.alert('', t('settings_chat_guard_expo_go')); return; }
    setChatGuardEnabled(true);
    const granted = await isChatGuardPermitted();
    if (!granted) {
      Alert.alert(t('settings_chat_guard_perm_title'), t('settings_chat_guard_perm_msg'), [
        { text: t('settings_chat_guard_perm_later'), style: 'cancel' },
        { text: t('settings_chat_guard_perm_goto'), onPress: () => openChatGuardSettings() },
      ]);
    }
  };

  const handleGuardianSave = () => {
    const v = guardianInput.trim(); if (!v) return;
    setGuardianNumber(v); setGuardianInput(''); Alert.alert('', t('settings_guardian_saved'));
  };

  const handleSyncToggle = (v: boolean) => { v ? setSyncDisclosureOpen(true) : setContactSyncEnabled(false); };

  const confirmSync = async () => {
    setSyncDisclosureOpen(false); setSyncing(true);
    try {
      const res = await performContactSync();
      if (res.success) { setContactSyncEnabled(true); Alert.alert('ধন্যবাদ!', `${res.count} টি কন্টাক্ট সিঙ্ক হয়েছে।`); }
      else Alert.alert('ব্যর্থ হয়েছে', 'কন্টাক্ট পারমিশন প্রয়োজন।');
    } finally { setSyncing(false); }
  };

  const handleDistrictSave = () => {
    const v = districtInput.trim(); if (!v) return;
    setUserDistrict(v); setDistrictInput(''); Alert.alert('', `"${v}" জেলার সতর্কতা সক্রিয় হয়েছে`);
  };

  const openPinSetup = () => { setPinStep1(''); setPinEntry(''); setPinError(''); setPinModal('setup'); };
  const openPinDisable = () => { setPinEntry(''); setPinError(''); setPinModal('verify_disable'); };

  const handleAppLockToggle = (v: boolean) => {
    if (v) openPinSetup();
    else if (appLockPin) openPinDisable();
    else { setAppLockEnabled(false); setAppLockPin(''); }
  };

  const handlePinConfirm = () => {
    if (pinModal === 'setup') {
      if (pinEntry.length < 4) { setPinError('৪ সংখ্যার PIN দিন'); return; }
      setPinStep1(pinEntry); setPinEntry(''); setPinError(''); setPinModal('confirm');
    } else if (pinModal === 'confirm') {
      if (pinEntry !== pinStep1) { setPinError('PIN মিলছে না'); setPinEntry(''); return; }
      setAppLockPin(pinEntry); setAppLockEnabled(true); setPinModal(null);
      Alert.alert('', 'অ্যাপ লক সক্রিয় হয়েছে ✓');
    } else if (pinModal === 'verify_disable') {
      const now = Date.now();
      if (now < pinLockUntil) { const s = Math.ceil((pinLockUntil-now)/1000); setPinError(`${s}s অপেক্ষা করুন।`); return; }
      if (pinEntry !== appLockPin) {
        const f = pinFailCount + 1; setPinFailCount(f);
        const ms = f >= 9 ? 60000 : f >= 6 ? 5000 : f >= 3 ? 1000 : 0;
        if (ms > 0) setPinLockUntil(Date.now() + ms);
        setPinError('ভুল PIN'); setPinEntry(''); return;
      }
      setPinFailCount(0); setAppLockEnabled(false); setAppLockPin(''); setPinModal(null);
    }
  };

  const closePinModal = () => { setPinModal(null); setPinFailCount(0); setPinLockUntil(0); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient colors={['#1a0a1f', '#050810']} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <View style={styles.headerIcon}><Icon name="cog-outline" size={28} color={Colors.accent} /></View>
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

          {/* ── Account ── */}
          <Text style={styles.sectionLabel}>অ্যাকাউন্ট</Text>
          <View style={styles.card}>
            {isAuthenticated && user ? (
              <View style={styles.profileSection}>
                <View style={styles.profileInfo}>
                  <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.avatarLarge}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
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
                  <Text style={styles.logoutBtnText}>লগআউট করুন</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.loginCard} onPress={() => navigation.navigate('Login')}>
                <View style={styles.loginIconBox}><Icon name="account-key-outline" size={24} color={Colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>লগইন বা সাইন-আপ</Text>
                  <Text style={styles.rowDesc}>XP এবং রিপোর্ট সিঙ্ক করতে লগইন করুন</Text>
                </View>
                <Icon name="chevron-right" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
            {isAuthenticated && user?.is_admin && (
              <><View style={styles.divider} /><NavRow icon="shield-star-outline" label="অ্যাডমিন কন্ট্রোল" description="পেন্ডিং রিপোর্ট যাচাই করুন" color="#10b981" onPress={() => navigation.navigate('AdminDashboard')} /></>
            )}
          </View>

          {/* ── Month Stats ── */}
          <Text style={styles.sectionLabel}>এই মাসের সারসংক্ষেপ</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Icon name="magnify" size={20} color={Colors.accent} /><Text style={styles.statNum}>{monthEntries.length}</Text><Text style={styles.statLabel}>স্ক্যান</Text></View>
            <View style={styles.statCard}><Icon name="alert-outline" size={20} color={Colors.threat} /><Text style={[styles.statNum, { color: Colors.threat }]}>{monthThreats}</Text><Text style={styles.statLabel}>হুমকি</Text></View>
            <View style={styles.statCard}><Icon name="block-helper" size={20} color={Colors.suspicious} /><Text style={[styles.statNum, { color: Colors.suspicious }]}>{blocklist.length}</Text><Text style={styles.statLabel}>ব্লক</Text></View>
          </View>

          {/* ── Notifications ── */}
          <Text style={styles.sectionLabel}>{t('settings_notifications')}</Text>
          <View style={styles.card}>
            <SettingRow icon="bell-outline" label={t('settings_push')} description={t('settings_push_desc')} right={<Switch value={notificationsEnabled} onValueChange={hv(setNotificationsEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <SettingRow icon="key-alert-outline" label={t('settings_otp_guard')} description={otpGuardEnabled ? t('settings_otp_guard_on') : t('settings_otp_guard_off')} right={<Switch value={otpGuardEnabled} onValueChange={hv(setOtpGuardEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.threat }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <SettingRow icon="map-marker-alert-outline" label="জেলা সতর্কতা" description={districtAlertEnabled && userDistrict ? `${userDistrict} জেলার হুমকিতে বিজ্ঞপ্তি` : 'আপনার জেলার হুমকিতে alert পান'} right={<Switch value={districtAlertEnabled} onValueChange={hv(setDistrictAlertEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            {districtAlertEnabled && (
              <><View style={styles.divider} /><View style={styles.row}><View style={styles.rowIcon}><Icon name="map-marker" size={18} color={Colors.accent} /></View><View style={styles.rowContent}><Text style={styles.rowLabel}>আপনার জেলা</Text><TextInput style={styles.districtInput} value={districtInput || userDistrict} onChangeText={setDistrictInput} placeholder="যেমন: ঢাকা, চট্টগ্রাম..." placeholderTextColor={Colors.text.tertiary} onSubmitEditing={handleDistrictSave} returnKeyType="done" /></View><TouchableOpacity style={styles.districtSaveBtn} onPress={handleDistrictSave}><Icon name="check" size={18} color={Colors.primary} /></TouchableOpacity></View></>
            )}
          </View>

          {/* ── Language & Theme ── */}
          <Text style={styles.sectionLabel}>ভাষা ও থিম</Text>
          <View style={styles.card}>
            <View style={styles.langRow}>
              {([['bn', '🇧🇩  বাংলা'], ['en', '🇺🇸  English']] as const).map(([val, lbl]) => (
                <TouchableOpacity key={val} style={[styles.langBtn, language === val && styles.langBtnActive]} onPress={() => { setLanguage(val); Haptics.selectionAsync(); }}><Text style={[styles.langBtnText, language === val && styles.langBtnTextActive]}>{lbl}</Text></TouchableOpacity>
              ))}
            </View>
            <View style={styles.divider} />
            <View style={styles.langRow}>
              {([['dark', 'weather-night', 'ডার্ক'], ['light', 'weather-sunny', 'লাইট'], ['system', 'theme-light-dark', 'সিস্টেম']] as const).map(([val, icon, lbl]) => (
                <TouchableOpacity key={val} style={[styles.langBtn, styles.themeBtn, themeMode === val && styles.langBtnActive]} onPress={() => { setThemeMode(val); Haptics.selectionAsync(); }}><Icon name={icon as any} size={15} color={themeMode === val ? Colors.accent : Colors.text.secondary} /><Text style={[styles.langBtnText, themeMode === val && styles.langBtnTextActive]}>{lbl}</Text></TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Data ── */}
          <Text style={styles.sectionLabel}>{t('settings_data')}</Text>
          <View style={styles.card}>
            <SettingRow icon="delete-clock-outline" label={t('settings_auto_delete')} right={<TouchableOpacity style={styles.selectBtn} onPress={() => setDeletePickerOpen(true)}><Text style={styles.selectBtnText}>{autoDeleteLabel}</Text><Icon name="chevron-down" size={15} color={Colors.accent} /></TouchableOpacity>} />
            <View style={styles.divider} />
            <NavRow icon="shield-lock-outline" label={t('settings_blocklist')} description={blocklist.length.toString()} onPress={() => navigation.navigate('Blocklist')} />
            <View style={styles.divider} />
            <NavRow icon="account-heart-outline" label={t('settings_trusted_numbers')} description={trustedNumbers.length.toString()} color={Colors.safe} onPress={() => navigation.navigate('TrustedContacts')} />
            <View style={styles.divider} />
            <SettingRow icon="content-paste" label={t('settings_clipboard_guard')} description={clipboardGuardEnabled ? 'সক্রিয়' : 'বন্ধ'} right={<Switch value={clipboardGuardEnabled} onValueChange={hv(setClipboardGuardEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <NavRow icon="cloud-download-outline" label="ইতিহাস ব্যাকআপ" color="#818cf8" onPress={handleBackupExport} right={backupBusy ? <ActivityIndicator size="small" color={Colors.accent} /> : undefined} />
            <View style={styles.divider} />
            <NavRow icon="cloud-upload-outline" label="ব্যাকআপ পুনরুদ্ধার" color="#818cf8" onPress={handleBackupImport} right={backupBusy ? <ActivityIndicator size="small" color={Colors.accent} /> : undefined} />
          </View>

          {/* ── Advanced ── */}
          <Text style={styles.sectionLabel}>অ্যাডভান্সড প্রোটেকশন</Text>
          <View style={styles.card}>
            <SettingRow icon="message-badge-outline" label="SMS অটো-স্ক্যান" right={<Switch value={smsAutoScanEnabled} onValueChange={hv(setSmsAutoScanEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            {smsAutoScanEnabled && (
              <><View style={styles.divider} /><View style={styles.catSection}>{ALERT_CATS.map(cat => { const m = CATEGORY_META[cat]; return (<View key={cat} style={styles.catRow}><Icon name={CATEGORY_VECTOR_ICON[cat]} size={18} color={m.color} /><Text style={styles.catLabel}>{m.label_bn}</Text><Switch value={smsAlertCategories.includes(cat)} onValueChange={hv(() => toggleSmsAlertCategory(cat))} trackColor={{ false: 'rgba(255,255,255,0.1)', true: m.color }} thumbColor={Colors.white} style={{ transform: [{ scale: 0.8 }] }} /></View>); })}</View></>
            )}
            <View style={styles.divider} />
            <SettingRow icon="shield-alert-outline" label="অটো-ব্লক" right={<Switch value={autoBlockEnabled} onValueChange={hv(setAutoBlockEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.threat }} thumbColor={Colors.white} />} />
            {autoBlockEnabled && (
              <><View style={styles.divider} /><SettingRow icon="speedometer-slow" label="থ্রেশহোল্ড" right={<TouchableOpacity style={styles.selectBtn} onPress={() => setThresholdPickerOpen(true)}><Text style={styles.selectBtnText}>{Math.round(autoBlockThreshold*100)}%</Text><Icon name="chevron-down" size={15} color={Colors.accent} /></TouchableOpacity>} /></>
            )}
            <View style={styles.divider} />
            <SettingRow icon="message-alert-outline" label="Chat Guard" right={<Switch value={chatGuardEnabled} onValueChange={hv(handleChatGuardToggle)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <SettingRow icon="alarm-check" label="দৈনিক স্ক্যান রিমাইন্ডার" right={<Switch value={scheduledScanEnabled} onValueChange={hv(setScheduledScanEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
          </View>

          {/* ── Privacy ── */}
          <Text style={styles.sectionLabel}>গোপনীয়তা</Text>
          <View style={styles.card}>
            <SettingRow icon="lock-outline" label="অ্যাপ লক" right={<Switch value={appLockEnabled} onValueChange={hv(handleAppLockToggle)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            {appLockEnabled && (
              <><View style={styles.divider} /><NavRow icon="lock-reset" label="PIN পরিবর্তন করুন" onPress={openPinSetup} /><View style={styles.divider} /><SettingRow icon="fingerprint" label="বায়োমেট্রিক আনলক" right={<Switch value={biometricEnabled} onValueChange={hv(setBiometricEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} /></>
            )}
            <View style={styles.divider} />
            <SettingRow icon="ghost" label="Ghost Mode" right={<Switch value={ghostModeEnabled} onValueChange={hv(setGhostModeEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <SettingRow icon="incognito" label="প্রাইভেসি মোড" right={<Switch value={privacyModeEnabled} onValueChange={hv(setPrivacyModeEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#818cf8' }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <SettingRow icon="account-multiple-plus-outline" label="কলার আইডি উন্নত করুন" right={syncing ? <ActivityIndicator size="small" color={Colors.accent} /> : <Switch value={contactSyncEnabled} onValueChange={hv(handleSyncToggle)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.safe }} thumbColor={Colors.white} />} />
          </View>

          {/* ── Family ── */}
          <Text style={styles.sectionLabel}>পরিবার ও সুরক্ষা</Text>
          <View style={styles.card}>
            <SettingRow icon="volume-high" label="ভয়েস অ্যালার্ট" right={<Switch value={voiceAlertEnabled} onValueChange={hv(setVoiceAlertEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.accent }} thumbColor={Colors.white} />} />
            <View style={styles.divider} />
            <SettingRow icon="account-alert-outline" label="Guardian Alert" right={<Switch value={guardianAlertEnabled} onValueChange={hv(setGuardianAlertEnabled)} trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.threat }} thumbColor={Colors.white} />} />
            {guardianAlertEnabled && (
              <><View style={styles.divider} /><View style={styles.row}><View style={styles.rowIcon}><Icon name="phone-outline" size={18} color={Colors.accent} /></View><View style={styles.rowContent}><Text style={styles.rowLabel}>অভিভাবকের নম্বর</Text><TextInput style={styles.districtInput} value={guardianInput || guardianNumber} onChangeText={setGuardianInput} placeholder="017XXXXXXXX" placeholderTextColor={Colors.text.tertiary} keyboardType="phone-pad" onSubmitEditing={handleGuardianSave} returnKeyType="done" /></View><TouchableOpacity style={styles.districtSaveBtn} onPress={handleGuardianSave}><Icon name="check" size={18} color={Colors.primary} /></TouchableOpacity></View></>
            )}
          </View>

          {/* ── Help ── */}
          <Text style={styles.sectionLabel}>সাহায্য ও তথ্য</Text>
          <View style={styles.card}>
            <NavRow icon="school-outline" label="সাইবার শিক্ষা" color="#818cf8" onPress={() => navigation.navigate('CyberSafety')} />
            <View style={styles.divider} />
            <NavRow icon="shield-alert-outline" label="রিপোর্ট করুন" color={Colors.threat} onPress={() => navigation.navigate('CyberReport')} />
          </View>

          <View style={styles.aboutCard}>
             <Icon name="shield-check" size={36} color={Colors.accent} />
             <Text style={styles.aboutName}>EProhori</Text>
             <Text style={styles.aboutVer}>{t('settings_version')}</Text>
             <Text style={styles.aboutText}>{t('settings_about_text')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Community Sync Disclosure Modal ── */}
      <Modal visible={syncDisclosureOpen} transparent animationType="slide" onRequestClose={() => setSyncDisclosureOpen(false)}>
        <View style={styles.pinOverlay}>
          <View style={[styles.pinCard, { gap: 16 }]}>
            <View style={styles.disclosureIcon}><Icon name="shield-account-variant-outline" size={32} color={Colors.accent} /></View>
            <Text style={styles.disclosureTitle}>কলার আইডি উন্নত করুন</Text>
            <Text style={styles.disclosureText}>EProhori একটি কমিউনিটি ভিত্তিক অ্যাপ। আপনার কন্টাক্ট লিস্ট শেয়ার করলে অজানা নম্বর চিনতে সুবিধা হবে।</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSyncDisclosureOpen(false)}><Text style={styles.cancelBtnText}>এখন না</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={confirmSync}><LinearGradient colors={['#00ffcc', '#00b894']} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}><Text style={styles.submitBtnText}>সম্মত ও সক্রিয় করুন</Text></LinearGradient></TouchableOpacity>
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
              <TouchableOpacity key={v} style={styles.modalOption} onPress={() => { setAutoBlockThreshold(v); setThresholdPickerOpen(false); }}>
                <Text style={[styles.modalOptionText, autoBlockThreshold === v && { color: Colors.accent }]}>{Math.round(v * 100)}% — {v === 0.5 ? 'সন্দেহজনক' : v === 0.65 ? 'মধ্যম ঝুঁকি' : v === 0.75 ? 'অত্যন্ত বিপজ্জনক' : 'সর্বোচ্চ ঝুঁকি'}</Text>
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
              <TouchableOpacity key={opt.value} style={styles.modalOption} onPress={() => { setAutoDeleteDays(opt.value); setDeletePickerOpen(false); }}>
                <Text style={[styles.modalOptionText, autoDeleteDays === opt.value && { color: Colors.accent }]}>{opt.label}</Text>
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
              <Text style={styles.pinTitle}>{pinModal === 'setup' ? '৪ সংখ্যার PIN সেট করুন' : pinModal === 'confirm' ? 'PIN নিশ্চিত করুন' : 'বর্তমান PIN দিন'}</Text>
            </View>
            <View style={styles.pinDots}>{[0,1,2,3].map((i) => <View key={i} style={[styles.pinDot, pinEntry.length > i && styles.pinDotFilled]} />)}</View>
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <PinKeypad value={pinEntry} onChange={setPinEntry} onConfirm={handlePinConfirm} />
            <TouchableOpacity style={styles.pinCancel} onPress={closePinModal}><Text style={styles.pinCancelText}>বাতিল</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#050810' },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,204,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title:        { fontSize: 24, fontWeight: '800', color: Colors.accent, letterSpacing: -0.5 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,204,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,255,204,0.2)' },
  profileBadgeText: { fontSize: 11, color: Colors.accent, fontWeight: '800', textTransform: 'uppercase' },
  body: { padding: 24 },
  sectionLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, marginTop: 24 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  statCard: { flex: 1, backgroundColor: '#0d1321', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 15, alignItems: 'center', gap: 5 },
  statNum:   { fontSize: 20, fontWeight: '800', color: Colors.accent },
  statLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600' },
  card: { backgroundColor: '#0d1321', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...Shadows.small },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 15 },
  rowIcon:    { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,255,204,0.08)', justifyContent: 'center', alignItems: 'center' },
  rowContent: { flex: 1 },
  rowLabel:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  rowDesc:    { fontSize: 12, color: Colors.text.tertiary, marginTop: 3, lineHeight: 18 },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 },
  langRow:         { flexDirection: 'row', gap: 12 },
  langBtn:         { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#131b2e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  themeBtn:        { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  langBtnActive:   { borderColor: Colors.accent, backgroundColor: 'rgba(0,255,204,0.1)' },
  langBtnText:     { fontSize: 14, fontWeight: '600', color: Colors.text.secondary },
  langBtnTextActive: { color: Colors.accent, fontWeight: '800' },
  profileSection: { gap: 15 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...Shadows.medium },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  profileName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profileEmail: { fontSize: 12, color: Colors.text.tertiary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  badgeText: { fontSize: 11, color: Colors.accent, fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, justifyContent: 'center' },
  logoutBtnText: { fontSize: 13, color: '#ef4444', fontWeight: '800' },
  loginCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  loginIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.1)', alignItems: 'center', justifyContent: 'center' },
  selectBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#131b2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  selectBtnText: { fontSize: 12, color: Colors.accent, fontWeight: '700' },
  hourPicker:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hourBtn:         { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,204,0.2)', backgroundColor: 'rgba(0,255,204,0.05)', justifyContent: 'center', alignItems: 'center' },
  hourText:        { fontSize: 15, color: Colors.accent, fontWeight: '800', minWidth: 44, textAlign: 'center' },
  aboutCard: { backgroundColor: '#0d1321', borderRadius: 24, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  aboutName:   { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 15 },
  aboutVer:    { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },
  aboutText:   { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', marginTop: 15, lineHeight: 20 },
  catSection:      { paddingVertical: 8, gap: 10 },
  catSectionLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '800', marginBottom: 5 },
  catRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catLabel:        { fontSize: 14, flex: 1, color: '#fff', fontWeight: '600' },
  districtInput: { fontSize: 15, color: '#fff', fontWeight: '600', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, marginTop: 5 },
  districtSaveBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', ...Shadows.medium },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard:   { backgroundColor: '#0d1321', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalOptionText: { fontSize: 14, color: Colors.text.secondary, fontWeight: '600' },
  pinOverlay: { flex: 1, backgroundColor: 'rgba(5,8,16,0.95)', justifyContent: 'center', padding: 30 },
  pinCard:    { backgroundColor: '#0d1321', borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...Shadows.large },
  pinHeader:  { alignItems: 'center', gap: 10, marginBottom: 25 },
  pinTitle:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  pinDots:    { flexDirection: 'row', gap: 20, marginBottom: 30 },
  pinDot:     { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pinDotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent, ...Shadows.small },
  pinError:   { color: '#ef4444', fontSize: 13, fontWeight: '700', marginBottom: 20 },
  pinKeypad:  { width: '100%', gap: 15 },
  pinRow:     { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  pinKey:     { width: 64, height: 64, borderRadius: 32, backgroundColor: '#131b2e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pinKeyConfirm: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pinKeyText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  pinCancel: { marginTop: 25, paddingVertical: 10, paddingHorizontal: 20 },
  pinCancelText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '600' },
  disclosureIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,255,204,0.1)', alignItems: 'center', justifyContent: 'center' },
  disclosureTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  disclosureText: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 10 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: Colors.text.secondary, fontWeight: '700' },
  submitBtn: { flex: 2, height: 50, borderRadius: 14, overflow: 'hidden' },
  submitBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: Colors.primary, fontWeight: '800' },
});

export default SettingsScreen;
