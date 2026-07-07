import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useHistoryStore, useSettingsStore, useAnalysisStore } from '@stores';
import { categorizeSms, CATEGORY_META } from '@utils';
import { threatAnalysisAPI } from '@api';
import { NoHistoryIllustration, NoResultsIllustration } from '@components';
import type { InboxScanScreenProps } from '@navigation/types';
import type { SmsCategory } from '@utils';

type Filter = 'all' | 'threats' | 'mfs_fraud' | 'otp_theft' | 'otp';

// N: local vector-icon mapping for category badges — CATEGORY_META.icon stays emoji
// since it also feeds OS notification text (see notifGuardService/callDetectionService).
type MCIcon = React.ComponentProps<typeof Icon>['name'];
const CATEGORY_VECTOR_ICON: Record<SmsCategory, MCIcon> = {
  mfs_fraud:        'credit-card-off-outline',
  otp_theft:        'lock-alert-outline',
  otp:              'key-outline',
  bank_transaction: 'bank-outline',
  mfs:              'cellphone-message',
  fraud:            'alert-outline',
  phishing:         'hook',
  malware:          'bug-outline',
  promotional:      'bullhorn-outline',
  emergency:        'alarm-light-outline',
  unknown:          'help-circle-outline',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const threatColor = (confidence: number) =>
  confidence >= 75 ? Colors.threat : confidence >= 60 ? Colors.suspicious : Colors.safe;

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - ts) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'গতকাল';
  if (diffDays < 7)  return `${diffDays} দিন আগে`;
  return d.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
};

// ── Screen ────────────────────────────────────────────────────────────────────

const InboxScanScreen = ({ navigation }: InboxScanScreenProps) => {
  const [filter,      setFilter]      = useState<Filter>('all');
  const [batchText,   setBatchText]   = useState('');
  const [batchMode,   setBatchMode]   = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [query,       setQuery]       = useState('');

  const activeProfile      = useSettingsStore((s) => s.activeProfile);
  const language           = useSettingsStore((s) => s.language);
  const getEntriesForProfile = useHistoryStore((s) => s.getEntriesForProfile);
  const addEntry           = useHistoryStore((s) => s.addEntry);
  const setCurrentMessage  = useAnalysisStore((s) => s.setMessage);
  const setCurrentResult   = useAnalysisStore((s) => s.setResult);

  const allEntries = useMemo(
    () => getEntriesForProfile(activeProfile).slice().reverse(),
    [activeProfile, getEntriesForProfile],
  );

  // Categorize each entry on the fly
  const enriched = useMemo(
    () => allEntries.map((e) => ({ ...e, smscat: categorizeSms(e.message) })),
    [allEntries],
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter === 'threats')   list = list.filter((e) => e.result.confidence >= 60);
    if (filter === 'mfs_fraud') list = list.filter((e) => e.smscat.category === 'mfs_fraud');
    if (filter === 'otp_theft') list = list.filter((e) => e.smscat.category === 'otp_theft');
    if (filter === 'otp')       list = list.filter((e) => e.smscat.category === 'otp');
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.message.toLowerCase().includes(q));
    }
    return list;
  }, [enriched, filter, query]);

  // Stats
  const todayStart  = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCount  = allEntries.filter((e) => e.timestamp >= todayStart.getTime()).length;
  const threatCount = allEntries.filter((e) => e.result.confidence >= 60).length;
  const mfsFraudCount = enriched.filter((e) => e.smscat.category === 'mfs_fraud').length;
  const otpTheftCount = enriched.filter((e) => e.smscat.category === 'otp_theft').length;

  // Batch scan handler
  const handleBatchScan = async () => {
    const raw = batchText.trim();
    if (!raw) { Alert.alert('', 'কিছু লিখুন বা পেস্ট করুন'); return; }

    const messages = raw
      .split(/\n{2,}|---+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (messages.length === 0) { Alert.alert('', 'কমপক্ষে একটি বার্তা দিন'); return; }

    setScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    for (const msg of messages) {
      try {
        const result = await threatAnalysisAPI.analyzeThreat(msg, language);
        addEntry(msg, result, activeProfile);
      } catch {
        // silently skip
      }
    }

    setBatchText('');
    setBatchMode(false);
    setScanning(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('', `${messages.length}টি বার্তা স্ক্যান সম্পন্ন`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="message-text-outline" size={28} color={Colors.accent} />
          </View>
          <Text style={styles.headerTitle}>SMS ইনবক্স স্ক্যান</Text>
          <Text style={styles.headerSub}>স্বয়ংক্রিয় স্ক্যান ইতিহাস ও নতুন বার্তা বিশ্লেষণ</Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{allEntries.length}</Text>
              <Text style={styles.statLabel}>মোট স্ক্যান</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.threat }]}>{threatCount}</Text>
              <Text style={styles.statLabel}>হুমকি</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.threat }]}>{mfsFraudCount + otpTheftCount}</Text>
              <Text style={styles.statLabel}>সক্রিয় প্রতারণা</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.accent }]}>{todayCount}</Text>
              <Text style={styles.statLabel}>আজকে</Text>
            </View>
          </View>

          {/* Critical warnings */}
          {(mfsFraudCount > 0 || otpTheftCount > 0) && (
            <View style={styles.critBanner}>
              <Icon name="shield-alert" size={20} color={Colors.threat} />
              <Text style={styles.critBannerText}>
                {mfsFraudCount > 0 && `${mfsFraudCount}টি বিকাশ/নগদ প্রতারণার SMS`}
                {mfsFraudCount > 0 && otpTheftCount > 0 && ' · '}
                {otpTheftCount > 0 && `${otpTheftCount}টি OTP চুরির চেষ্টা`}
                {' সনাক্ত হয়েছে'}
              </Text>
            </View>
          )}

          {/* Batch scan toggle */}
          <TouchableOpacity
            style={styles.batchToggle}
            onPress={() => setBatchMode((v) => !v)}
            activeOpacity={0.8}
          >
            <Icon
              name={batchMode ? 'chevron-up' : 'message-plus-outline'}
              size={18} color={Colors.accent}
            />
            <Text style={styles.batchToggleText}>
              {batchMode ? 'বন্ধ করুন' : 'নতুন SMS পেস্ট করে স্ক্যান করুন'}
            </Text>
          </TouchableOpacity>

          {batchMode && (
            <View style={styles.batchCard}>
              <Text style={styles.batchLabel}>
                SMS বার্তা পেস্ট করুন (একাধিক হলে ফাঁকা লাইন দিয়ে আলাদা করুন)
              </Text>
              <TextInput
                style={styles.batchInput}
                value={batchText}
                onChangeText={setBatchText}
                placeholder="এখানে SMS টেক্সট পেস্ট করুন..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                textAlignVertical="top"
                numberOfLines={5}
                editable={!scanning}
              />
              <TouchableOpacity
                style={[styles.scanBtn, (!batchText.trim() || scanning) && { opacity: 0.5 }]}
                onPress={handleBatchScan}
                disabled={!batchText.trim() || scanning}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={Colors.gradient.accent}
                  style={styles.scanBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {scanning
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : (
                      <>
                        <Icon name="shield-search" size={16} color={Colors.primary} />
                        <Text style={styles.scanBtnText}>স্ক্যান করুন</Text>
                      </>
                    )
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Search */}
          <View style={styles.searchRow}>
            <Icon name="magnify" size={16} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="বার্তার মধ্যে খুঁজুন..."
              placeholderTextColor={Colors.text.tertiary}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Icon name="close-circle" size={16} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {([
              { key: 'all',       label: 'সব',           icon: null, color: Colors.accent },
              { key: 'threats',   label: 'হুমকি',        icon: 'alert-outline' as MCIcon, color: Colors.threat },
              { key: 'mfs_fraud', label: 'বিকাশ/নগদ',    icon: 'credit-card-off-outline' as MCIcon, color: Colors.threat },
              { key: 'otp_theft', label: 'OTP চুরি',     icon: 'lock-alert-outline' as MCIcon, color: Colors.threat },
              { key: 'otp',       label: 'OTP কোড',      icon: 'key-outline' as MCIcon, color: '#818cf8' },
            ] as const).map(({ key, label, icon, color }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  filter === key && { backgroundColor: `${color}20`, borderColor: `${color}55` },
                ]}
                onPress={() => setFilter(key)}
              >
                {icon && <Icon name={icon} size={13} color={filter === key ? color : Colors.text.secondary} />}
                <Text style={[styles.chipText, filter === key && { color }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Results */}
          {allEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <NoHistoryIllustration color={Colors.accent} size={110} />
              <Text style={[styles.emptyTitle, { marginTop: 12 }]}>কোনো স্ক্যান ইতিহাস নেই</Text>
              <Text style={styles.emptyText}>
                SMS Auto-scan চালু থাকলে নতুন SMS এলে এখানে দেখাবে।
                উপরে "নতুন SMS পেস্ট" বোতামে ম্যানুয়ালি স্ক্যান করতে পারেন।
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                {filtered.length}টি বার্তা
                {filter !== 'all' ? ` (ফিল্টার: ${filter})` : ''}
              </Text>
              {filtered.length === 0 && (
                <View style={styles.emptyBox}>
                  <NoResultsIllustration color={Colors.text.tertiary} size={80} />
                  <Text style={[styles.emptyTitle, { marginTop: 10 }]}>কোনো মিল নেই</Text>
                </View>
              )}
              {filtered.map((item) => {
                const conf   = item.result.confidence;
                const color  = threatColor(conf);
                const isSafe = item.result.threat_type === 'safe';
                const cat    = item.smscat;
                const isCritical = cat.category === 'mfs_fraud' || cat.category === 'otp_theft';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.entryCard,
                      { borderLeftColor: isCritical ? cat.color : color },
                    ]}
                    onPress={() => {
                      setCurrentMessage(item.message);
                      setCurrentResult(item.result);
                      navigation.navigate('ResultDetail');
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.entryTop}>
                      {/* Category badge */}
                      {cat.category !== 'unknown' && (
                        <View style={[styles.catBadge, { backgroundColor: `${cat.color}18`, borderColor: `${cat.color}40` }]}>
                          <Icon name={CATEGORY_VECTOR_ICON[cat.category]} size={11} color={cat.color} />
                          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label_bn}</Text>
                        </View>
                      )}
                      <View style={styles.entryMeta}>
                        <View style={[styles.confBadge, { backgroundColor: `${color}18` }]}>
                          <Icon
                            name={isSafe ? 'check-circle' : 'alert-circle'}
                            size={12} color={color}
                          />
                          <Text style={[styles.confText, { color }]}>
                            {Math.round(conf)}%
                          </Text>
                        </View>
                        <Text style={styles.entryTime}>{formatTime(item.timestamp)}</Text>
                      </View>
                    </View>

                    <Text style={styles.entryMsg} numberOfLines={2}>{item.message}</Text>

                    {isCritical && (
                      <View style={[styles.critTag, { borderColor: cat.color + '44', backgroundColor: cat.color + '12' }]}>
                        <Text style={[styles.critTagText, { color: cat.color }]}>
                          {cat.category === 'mfs_fraud' ? 'বিকাশ/নগদ প্রতারণা সনাক্ত' : 'OTP চুরির চেষ্টা সনাক্ত'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: 40 },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: { ...TextStyles.h2, color: Colors.accent, marginBottom: 4 },
  headerSub:   { ...TextStyles.body, color: Colors.text.secondary },

  body: { padding: Spacing.lg },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    padding: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  statNum:   { ...TextStyles.h3, color: Colors.accent, fontSize: 18 },
  statLabel: { fontSize: 9, color: Colors.text.tertiary, marginTop: 2, textAlign: 'center' },

  critBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: `${Colors.threat}14`, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: `${Colors.threat}44`,
  },
  critBannerText: { ...TextStyles.caption, color: Colors.threat, flex: 1, fontWeight: '700' },

  batchToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderAccent,
    padding: Spacing.md, marginBottom: Spacing.md,
    ...Shadows.small,
  },
  batchToggleText: { ...TextStyles.body, color: Colors.accent, fontWeight: '600' },

  batchCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
    ...Shadows.small,
  },
  batchLabel: { ...TextStyles.caption, color: Colors.text.secondary, marginBottom: 4 },
  batchInput: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...TextStyles.body, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.border,
    minHeight: 110,
  },
  scanBtn:     { borderRadius: BorderRadius.md, overflow: 'hidden' },
  scanBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, gap: 7,
  },
  scanBtnText: { ...TextStyles.button, color: Colors.primary },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  searchInput: { flex: 1, ...TextStyles.body, color: Colors.text.primary, padding: 0 },

  filterScroll: { gap: Spacing.sm, paddingBottom: Spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipText: { ...TextStyles.caption, color: Colors.text.secondary, fontWeight: '600' },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm,
  },

  emptyBox: {
    alignItems: 'center', padding: Spacing['2xl'],
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.small,
  },
  emptyTitle: { ...TextStyles.body, color: Colors.text.secondary, fontWeight: '700', marginBottom: 8 },
  emptyText:  { ...TextStyles.caption, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 18 },

  entryCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  entryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  catLabel: { fontSize: 10, fontWeight: '700' },

  confBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  confText: { fontSize: 10, fontWeight: '700' },

  entryTime: { ...TextStyles.caption, color: Colors.text.tertiary, fontSize: 10 },
  entryMsg:  { ...TextStyles.body, color: Colors.text.primary, lineHeight: 20 },

  critTag: {
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start',
  },
  critTagText: { fontSize: 11, fontWeight: '700' },
});

export default InboxScanScreen;
