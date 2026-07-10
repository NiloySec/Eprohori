import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useHistoryStore, useAnalysisStore, useSettingsStore, useSpamNumberStore, useAuthStore, type HistoryEntry } from '@stores';
import { categorizeSms } from '@utils';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { DevWarningBanner, NoScansIllustration, Skeleton } from '@components';
import SeniorHomeView from './SeniorHomeView';
import type { HomeScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Security Score Calculator ──────────────────────────────────────────────────

const useSecurityScore = () => {
  const settings = useSettingsStore();
  const entries = useHistoryStore((s) => s.entries);

  return useMemo(() => {
    let score = 30; // base score for installing EProhori

    if (settings.appLockEnabled) score += 20;
    if (settings.notificationsEnabled) score += 10;
    if (settings.callScreeningEnabled) score += 15;
    if (settings.smsAutoScanEnabled) score += 15;
    if (settings.districtAlertEnabled) score += 10;

    // Penalty for unaddressed critical threats in last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentThreats = entries.filter(e => e.timestamp > weekAgo && e.result.confidence >= 75).length;
    score = Math.max(0, score - (recentThreats * 5));

    return Math.min(100, score);
  }, [settings, entries]);
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SecurityGauge = ({ score }: { score: number }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const isOptimal = score >= 90;
  const isGood = score >= 70;
  const color = isOptimal ? Colors.safe : isGood ? Colors.accent : Colors.threat;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.gaugeRoot}>
      <Animated.View style={[styles.gaugeRing, { transform: [{ scale: pulse }], borderColor: `${color}44` }]} />
      <LinearGradient colors={[`${color}44`, 'transparent']} style={styles.gaugeFill}>
        <View style={[styles.gaugeInner, { borderColor: color }]}>
          <Text style={[styles.gaugeScore, { color }]}>{score}%</Text>
          <Text style={styles.gaugeLabel}>সুরক্ষা স্কোর</Text>
        </View>
      </LinearGradient>
      <View style={styles.gaugeStatusBox}>
         <Icon name={isOptimal ? 'shield-check' : 'shield-alert'} size={20} color={color} />
         <Text style={[styles.gaugeStatusText, { color }]}>
           {isOptimal ? 'আপনার ফোন অভেদ্য' : isGood ? 'ফোন সুরক্ষিত আছে' : 'সুরক্ষা বাড়ানো প্রয়োজন'}
         </Text>
      </View>
    </View>
  );
};

const ActionCard = ({ icon, label, sub, color, onPress }: {
  icon: MCIcon; label: string; sub: string; color: string; onPress: () => void;
}) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.actionIconBox, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={24} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </View>
    <Icon name="chevron-right" size={20} color={Colors.text.tertiary} />
  </TouchableOpacity>
);

const HistoryItem = ({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) => {
  const conf  = entry.result.confidence;
  const color = conf >= 75 ? Colors.threat : conf >= 60 ? Colors.suspicious : Colors.safe;
  const date  = new Date(entry.timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
  const cat   = categorizeSms(entry.message);

  return (
    <TouchableOpacity style={styles.historyItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.historyDot, { backgroundColor: color }]} />
      <View style={styles.historyBody}>
        <Text style={styles.historyMsg} numberOfLines={1}>{entry.message}</Text>
        <View style={styles.historyMeta}>
          <Text style={[styles.historyConf, { color }]}>{Math.round(conf)}% নিশ্চিত</Text>
          <Text style={styles.historyDate}>{date}</Text>
        </View>
      </View>
      {cat.category !== 'unknown' && (
        <View style={[styles.miniBadge, { backgroundColor: `${cat.color}15` }]}>
          <Text style={[styles.miniBadgeText, { color: cat.color }]}>{cat.label_bn}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const seniorModeEnabled = useSettingsStore((s) => s.seniorModeEnabled);

  const t = useTranslation();
  const activeProfile        = useSettingsStore((s) => s.activeProfile);
  const getEntriesForProfile = useHistoryStore((s) => s.getEntriesForProfile);
  const setCurrentMessage    = useAnalysisStore((s) => s.setMessage);
  const setCurrentResult     = useAnalysisStore((s) => s.setResult);

  const entries = React.useMemo(
    () => getEntriesForProfile(activeProfile),
    [activeProfile, getEntriesForProfile],
  );

  const stats = React.useMemo(() => ({
    today:    entries.filter((e) => e.timestamp >= new Date().setHours(0,0,0,0)).length,
    critical: entries.filter((e) => e.result.confidence >= 75).length,
  }), [entries]);

  if (seniorModeEnabled) return <SeniorHomeView navigation={navigation} />;

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const handleEntryPress = (entry: HistoryEntry) => {
    setCurrentMessage(entry.message);
    setCurrentResult(entry.result);
    navigation.navigate('ResultDetail');
  };

  const securityScore = useSecurityScore();

  return (
    <SafeAreaView style={styles.safe}>
      <DevWarningBanner />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* ── Cyber Command Center Header ── */}
        <LinearGradient colors={['#1a0a1f', '#050810']} style={styles.header}>
          <View style={styles.navRow}>
            <View style={styles.brand}>
              <Text style={styles.brandTitle}>EProhori</Text>
              <View style={styles.liveTag}><View style={styles.liveDot} /><Text style={styles.liveText}>Live Intelligence</Text></View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.profileBtn}>
              <Icon name="cog-outline" size={24} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <SecurityGauge score={securityScore} />

          {securityScore < 100 && (
            <TouchableOpacity
              style={styles.recCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="lightbulb-on" size={18} color={Colors.accent} />
              <Text style={styles.recText}>
                {securityScore < 70 ? 'আপনার সুরক্ষা লেভেল অত্যন্ত কম। অ্যাপ লক এবং অটো-স্ক্যান অন করুন।' : 'সুরক্ষা স্কোর ১০০% করতে সব অপশন চালু করুন।'}
              </Text>
              <Icon name="chevron-right" size={16} color={Colors.accent} />
            </TouchableOpacity>
          )}

          <View style={styles.quickStats}>
            <View style={styles.qStat}>
              <Text style={styles.qStatLabel}>আজকের স্ক্যান</Text>
              <Text style={styles.qStatVal}>{stats.today}</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <Text style={styles.qStatLabel}>মোট ঝুঁকি</Text>
              <Text style={[styles.qStatVal, { color: Colors.threat }]}>{stats.critical}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>নিরাপত্তা প্রোটেকশন</Text>
          <View style={styles.toolGrid}>
            <ActionCard
              icon="shield-search"
              label="স্মার্ট এনালাইজার"
              sub="AI ভিত্তিক থ্রেট ডিটেকশন"
              color={Colors.accent}
              onPress={() => navigation.navigate('Analyzer')}
            />
            <ActionCard
              icon="message-text-lock-outline"
              label="SMS স্ক্যানার"
              sub="ইনবক্সের লিংক যাচাই করুন"
              color="#818cf8"
              onPress={() => navigation.navigate('SMSScan')}
            />
            <ActionCard
              icon="phone-filter"
              label="কলার আইডি"
              sub="স্প্যাম নম্বর ব্লক করুন"
              color="#00dd99"
              onPress={() => navigation.navigate('CallerID')}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>সাম্প্রতিক কার্যক্রম</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>হিস্ট্রি দেখুন →</Text>
            </TouchableOpacity>
          </View>

          {refreshing ? (
            <View style={styles.historyList}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ padding: 18, gap: 10 }}>
                  <Skeleton width="90%" height={18} />
                  <Skeleton width="50%" height={14} />
                </View>
              ))}
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <NoScansIllustration size={100} color="rgba(255,255,255,0.05)" />
              <Text style={styles.emptyText}>সুরক্ষা নিশ্চিত করতে প্রথম স্ক্যানটি করুন</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {entries.slice(0, 5).map(e => (
                <HistoryItem key={e.id} entry={e} onPress={() => handleEntryPress(e)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050810' },
  scroll: { paddingBottom: 40 },

  header: {
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.05)',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.8 },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0, 229, 196, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0, 229, 196, 0.2)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ffcc' },
  liveText: { fontSize: 9, fontWeight: '800', color: '#00ffcc', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 255, 204, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 255, 204, 0.1)' },

  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 40,
    marginTop: 10,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.2)',
    gap: 10,
  },
  recText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 18,
  },

  // Gauge Styles
  gaugeRoot: { alignItems: 'center', marginVertical: 10 },
  gaugeRing: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, opacity: 0.5,
  },
  gaugeFill: {
    width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  gaugeInner: {
    width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#050810', borderWidth: 3,
    ...Shadows.large, shadowColor: Colors.accent,
  },
  gaugeScore: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  gaugeLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '700', textTransform: 'uppercase', marginTop: -2 },
  gaugeStatusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 25,
    backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  gaugeStatusText: { fontSize: 14, fontWeight: '700' },

  quickStats: {
    flexDirection: 'row', marginTop: 35, marginHorizontal: 30,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  qStat: { flex: 1, alignItems: 'center' },
  qStatVal: { fontSize: 24, fontWeight: '900', color: Colors.accent },
  qStatLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 2 },
  qStatDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

  body: { padding: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 15, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, color: Colors.accent, fontWeight: '700' },

  toolGrid: { gap: 15, marginBottom: 30 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#0d1321', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...Shadows.small,
  },
  actionIconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 18 },
  actionLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  actionSub: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },

  historyList: { backgroundColor: '#0d1321', borderRadius: 28, padding: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  historyBody: { flex: 1 },
  historyMsg: { fontSize: 15, color: '#fff', fontWeight: '600' },
  historyMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  historyConf: { fontSize: 11, fontWeight: '700' },
  historyDate: { fontSize: 11, color: Colors.text.tertiary },
  miniBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  miniBadgeText: { fontSize: 10, fontWeight: '900' },

  empty: { alignItems: 'center', paddingVertical: 40, opacity: 0.6 },
  emptyText: { color: Colors.text.tertiary, fontSize: 14, marginTop: 15, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});

export default HomeScreen;

export default HomeScreen;

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },

  // Hero
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  heroBrand:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  shieldBadge:{
    width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    ...Shadows.small, shadowColor: Colors.accent, shadowOpacity: 0.4,
  },
  heroTitle:  { ...TextStyles.h2, color: Colors.accent },
  heroSub:    { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2 },
  heroDivider:{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#07301a', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#16a34a44',
  },
  liveDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e' },
  liveText: { ...TextStyles.caption, color: '#22c55e', fontWeight: '700' },

  todayRow: { flexDirection: 'row', gap: Spacing.sm },
  todayStat: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    padding: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  todayNum:   { ...TextStyles.h3, color: Colors.accent, fontSize: 20 },
  todayLabel: { fontSize: 10, color: Colors.text.tertiary, marginTop: 2 },

  // Critical widget
  critWidget: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2d1111', borderWidth: 1, borderColor: '#7f1d1d',
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md,
    ...Shadows.medium, shadowColor: Colors.threat,
  },
  critWidgetLeft:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  critWidgetTitle:  { ...TextStyles.body, color: '#f87171', fontWeight: '700' },
  critWidgetSub:    { ...TextStyles.caption, color: '#fca5a5', marginTop: 2 },
  critWidgetBtn:    { backgroundColor: '#ef4444', borderRadius: BorderRadius.md, paddingVertical: 7, paddingHorizontal: 12 },
  critWidgetBtnText:{ ...TextStyles.caption, color: '#fff', fontWeight: '700' },

  // Sections
  section:    { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...TextStyles.h3, color: Colors.text.primary },
  seeAll:       { ...TextStyles.caption, color: Colors.accent, fontWeight: '600' },

  // Quick actions
  qaRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  moreToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: Spacing.sm,
  },
  moreToggleText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },
  qaCard: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.sm, alignItems: 'center', gap: 6,
  },
  qaIcon:  { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 10, color: Colors.text.secondary, textAlign: 'center', fontWeight: '600' },

  // Alert teaser
  alertTeaser: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.borderAccent,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md,
  },
  alertTeaserLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  alertTeaserTitle: { ...TextStyles.body, color: Colors.accent, fontWeight: '700' },
  alertTeaserSub:   { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2 },

  // Stats grid
  trustStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
  },
  trustBadge: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  trustBadgeIcon:  { marginBottom: 2 },
  trustBadgeLabel: { fontSize: 10, fontWeight: '800', color: Colors.accent },
  trustBadgeSub:   { fontSize: 9, color: Colors.text.tertiary, marginTop: 1 },

  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statMini: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, padding: Spacing.sm, alignItems: 'center', gap: 4,
  },
  statMiniNum:   { ...TextStyles.h3, fontSize: 18 },
  statMiniLabel: { ...TextStyles.caption, color: Colors.text.tertiary, fontSize: 10 },

  // CTA
  ctaWrap: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    ...Shadows.medium, shadowColor: Colors.accent, shadowOpacity: 0.35,
  },
  cta:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: 17,
    borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  ctaText: { ...TextStyles.button, color: Colors.primary, flex: 1, textAlign: 'center' },

  // Empty
  emptyBox: {
    alignItems: 'center', paddingVertical: 40,
    paddingHorizontal: Spacing.xl, gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  emptyTitle: { ...TextStyles.h3, color: Colors.text.secondary },
  emptyHint:  { ...TextStyles.body, color: Colors.text.tertiary, textAlign: 'center' },

  // Latest threat
  latestThreat: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: `${Colors.threat}10`, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: `${Colors.threat}30`,
    padding: Spacing.md,
  },
  latestThreatLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  latestThreatLabel: { ...TextStyles.caption, color: Colors.threat, fontWeight: '700' },
  latestThreatMsg:   { ...TextStyles.caption, color: Colors.text.secondary },

  // Entry rows
  entryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  entryIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  entryBody:    { flex: 1, gap: 5 },
  entryMsg:     { ...TextStyles.body, color: Colors.text.primary },
  entryMeta:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1,
  },
  catChipIcon: { fontSize: 10 },
  catChipText: { fontSize: 10, fontWeight: '700' },
  confText:    { fontSize: 11, fontWeight: '700' },
  entryDate:   { ...TextStyles.caption, color: Colors.text.tertiary },
});

export default HomeScreen;
