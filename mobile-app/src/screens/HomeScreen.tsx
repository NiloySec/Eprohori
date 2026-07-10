import React, { useRef, useEffect } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useHistoryStore, useAnalysisStore, useSettingsStore, useSpamNumberStore, type HistoryEntry } from '@stores';
import { categorizeSms } from '@utils';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { DevWarningBanner, NoScansIllustration, Skeleton } from '@components';
import SeniorHomeView from './SeniorHomeView';
import type { HomeScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Sub-components ─────────────────────────────────────────────────────────────

const SecurityStatus = ({ threats }: { threats: number }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const isSafe = threats === 0;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.statusRoot}>
      <Animated.View style={[styles.statusRing, { transform: [{ scale: pulse }], borderColor: isSafe ? Colors.safe : Colors.threat }]} />
      <LinearGradient colors={isSafe ? [Colors.safe, Colors.accentDark] : [Colors.threat, '#b91c1c']} style={styles.statusCircle}>
        <Icon name={isSafe ? 'shield-check' : 'shield-alert'} size={48} color={Colors.primary} />
      </LinearGradient>
      <View style={styles.statusTexts}>
        <Text style={[styles.statusTitle, { color: isSafe ? Colors.safe : Colors.threat }]}>
          {isSafe ? 'আপনার ফোন সুরক্ষিত' : 'বিপদ সনাক্ত হয়েছে!'}
        </Text>
        <Text style={styles.statusSub}>
          {isSafe ? 'কোনো সক্রিয় হুমকি নেই' : `${threats}টি গুরুত্বপূর্ণ হুমকি পাওয়া গেছে`}
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

  return (
    <SafeAreaView style={styles.safe}>
      <DevWarningBanner />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* ── Dashboard Header ── */}
        <LinearGradient colors={['#1a0a1f', '#130818']} style={styles.header}>
          <View style={styles.navRow}>
            <View style={styles.brand}>
              <Text style={styles.brandTitle}>EProhori</Text>
              <View style={styles.liveTag}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.profileBtn}>
              <Icon name="account-circle-outline" size={28} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <SecurityStatus threats={stats.critical} />

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              {refreshing ? <Skeleton width={30} height={24} /> : <Text style={styles.statVal}>{stats.today}</Text>}
              <Text style={styles.statLabel}>আজ স্ক্যান</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              {refreshing ? <Skeleton width={30} height={24} /> : <Text style={[styles.statVal, { color: Colors.threat }]}>{stats.critical}</Text>}
              <Text style={styles.statLabel}>মোট হুমকি</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>নিরাপত্তা টুলস</Text>
          <View style={styles.toolGrid}>
            <ActionCard
              icon="message-processing-outline"
              label="SMS স্ক্যান"
              sub="ইনবক্সের থ্রেট পরীক্ষা করুন"
              color={Colors.accent}
              onPress={() => navigation.navigate('SMSScan')}
            />
            <ActionCard
              icon="phone-check-outline"
              label="নম্বর যাচাই"
              sub="অজানা কলার আইডি খুঁজুন"
              color="#818cf8"
              onPress={() => navigation.navigate('CallerID')}
            />
            <ActionCard
              icon="qrcode-scan"
              label="QR স্ক্যান"
              sub="লিঙ্ক খোলার আগে যাচাই করুন"
              color="#00dd99"
              onPress={() => navigation.navigate('QRScan')}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>সাম্প্রতিক কার্যক্রম</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>সব দেখুন</Text>
            </TouchableOpacity>
          </View>

          {refreshing ? (
            <View style={styles.historyList}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ padding: 14, gap: 8 }}>
                  <Skeleton width="80%" height={16} />
                  <Skeleton width="40%" height={12} />
                </View>
              ))}
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <NoScansIllustration size={80} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>এখনো কোনো স্ক্যান করা হয়নি</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {entries.slice(0, 5).map(e => (
                <HistoryItem key={e.id} entry={e} onPress={() => handleEntryPress(e)} />
              ))}
            </View>
          )}

          {/* AI Analyzer Button */}
          <TouchableOpacity
            style={styles.mainCta}
            onPress={() => navigation.navigate('Analyzer')}
            activeOpacity={0.9}
          >
            <LinearGradient colors={[Colors.accent, '#0891b2']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.ctaGrad}>
              <Icon name="brain" size={24} color={Colors.primary} />
              <Text style={styles.ctaText}>স্মার্ট এনালাইজার শুরু করুন</Text>
              <Icon name="arrow-right" size={20} color={Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
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
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Shadows.medium,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#22c55e', textTransform: 'uppercase' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },

  // Status Circle
  statusRoot: { alignItems: 'center', marginVertical: 10 },
  statusRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, opacity: 0.3,
  },
  statusCircle: {
    width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center',
    ...Shadows.large,
  },
  statusTexts: { alignItems: 'center', marginTop: 15 },
  statusTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.2 },
  statusSub: { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },

  statGrid: {
    flexDirection: 'row', marginTop: 30, marginHorizontal: 40,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 15,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  statLabel: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
  statDivider: { width: 1, height: '70%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

  body: { padding: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 15 },
  seeAll: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  toolGrid: { gap: 12, marginBottom: 25 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#0d1321', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  actionIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  actionSub: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },

  historyList: { backgroundColor: '#0d1321', borderRadius: 24, padding: 8, overflow: 'hidden' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  historyBody: { flex: 1 },
  historyMsg: { fontSize: 14, color: Colors.text.primary, fontWeight: '500' },
  historyMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
  historyConf: { fontSize: 11, fontWeight: '600' },
  historyDate: { fontSize: 11, color: Colors.text.tertiary },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  miniBadgeText: { fontSize: 10, fontWeight: '800' },

  mainCta: { marginTop: 30, borderRadius: 20, overflow: 'hidden', ...Shadows.medium },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  ctaText: { fontSize: 16, fontWeight: '800', color: Colors.primary, flex: 1, marginHorizontal: 15 },

  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: Colors.text.tertiary, fontSize: 13, marginTop: 10 },
});

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
