import React, { useRef } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useHistoryStore, useAnalysisStore, useSettingsStore, useSpamNumberStore, type HistoryEntry } from '@stores';
import { categorizeSms } from '@utils';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { DevWarningBanner, NoScansIllustration } from '@components';
import SeniorHomeView from './SeniorHomeView';
import type { HomeScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Sub-components ─────────────────────────────────────────────────────────────

const QuickAction = ({ icon, label, color, onPress }: {
  icon: MCIcon; label: string; color: string; onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 30 }).start();
  };
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  return (
    <TouchableOpacity
      style={styles.qaCard} onPress={onPress}
      activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <View style={[styles.qaIcon, { backgroundColor: `${color}18` }]}>
          <Icon name={icon} size={22} color={color} />
        </View>
        <Text style={styles.qaLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const EntryRow = ({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) => {
  const conf  = entry.result.confidence;
  const color = conf >= 75 ? Colors.threat : conf >= 60 ? Colors.suspicious : Colors.safe;
  const icon: MCIcon = conf >= 75 ? 'alert-circle' : conf >= 60 ? 'alert' : 'check-circle';
  const date  = new Date(entry.timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
  const cat   = categorizeSms(entry.message);

  return (
    <TouchableOpacity style={styles.entryCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.entryIconBox, { backgroundColor: `${color}18` }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.entryBody}>
        <Text style={styles.entryMsg} numberOfLines={1}>{entry.message}</Text>
        <View style={styles.entryMeta}>
          {cat.category !== 'unknown' && (
            <View style={[styles.catChip, { backgroundColor: `${cat.color}18`, borderColor: `${cat.color}40` }]}>
              <Text style={styles.catChipIcon}>{cat.icon}</Text>
              <Text style={[styles.catChipText, { color: cat.color }]}>{cat.label_bn}</Text>
            </View>
          )}
          <Text style={[styles.confText, { color }]}>
            {entry.result.threat_type} · {Math.round(conf)}%
          </Text>
          <Text style={styles.entryDate}>{date}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={Colors.text.tertiary} />
    </TouchableOpacity>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [showMoreActions, setShowMoreActions] = React.useState(false);
  const seniorModeEnabled = useSettingsStore((s) => s.seniorModeEnabled);

  const t = useTranslation();
  const activeProfile        = useSettingsStore((s) => s.activeProfile);
  const getEntriesForProfile = useHistoryStore((s) => s.getEntriesForProfile);
  const setCurrentMessage    = useAnalysisStore((s) => s.setMessage);
  const setCurrentResult     = useAnalysisStore((s) => s.setResult);
  const getAllNumbers         = useSpamNumberStore((s) => s.getAllNumbers);

  const entries = React.useMemo(
    () => getEntriesForProfile(activeProfile),
    [activeProfile, getEntriesForProfile],
  );

  const todayStart = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);

  const stats = React.useMemo(() => {
    const today    = entries.filter((e) => e.timestamp >= todayStart);
    const enriched = entries.map((e) => categorizeSms(e.message));
    return {
      today:      today.length,
      critical:   entries.filter((e) => e.result.confidence >= 75).length,
      suspicious: entries.filter((e) => e.result.confidence >= 60 && e.result.confidence < 75).length,
      safe:       entries.filter((e) => e.result.confidence < 60).length,
      mfsFraud:   enriched.filter((c) => c.category === 'mfs_fraud').length,
      otpTheft:   enriched.filter((c) => c.category === 'otp_theft').length,
      spamNums:   getAllNumbers().length,
    };
  }, [entries, todayStart, getAllNumbers]);

  // Latest threat entry (for the alert widget)
  const latestThreat = React.useMemo(
    () => entries.slice().reverse().find((e) => e.result.confidence >= 60),
    [entries],
  );

  // S2: senior mode — simplified large-button view instead of the full dashboard
  if (seniorModeEnabled) {
    return <SeniorHomeView navigation={navigation} />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  };

  const handleEntryPress = (entry: HistoryEntry) => {
    setCurrentMessage(entry.message);
    setCurrentResult(entry.result);
    navigation.navigate('ResultDetail');
  };

  const hasCriticalActivity = stats.mfsFraud > 0 || stats.otpTheft > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <DevWarningBanner />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* ── Hero ── */}
        <LinearGradient colors={Colors.gradient.hero} style={styles.hero}>
          <View style={styles.heroBrand}>
            <LinearGradient colors={Colors.gradient.accent} style={styles.shieldBadge}>
              <Icon name="shield-check" size={26} color={Colors.primary} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>EProhori</Text>
              <Text style={styles.heroSub}>{t('home_subtitle')}</Text>
            </View>
            {/* Live badge */}
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          {/* Today's summary */}
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={styles.todayNum}>{stats.today}</Text>
              <Text style={styles.todayLabel}>আজ স্ক্যান</Text>
            </View>
            <View style={[styles.todayStat, { borderColor: `${Colors.threat}44` }]}>
              <Text style={[styles.todayNum, { color: Colors.threat }]}>{stats.critical}</Text>
              <Text style={styles.todayLabel}>মোট হুমকি</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={[styles.todayNum, { color: '#a78bfa' }]}>{stats.spamNums}</Text>
              <Text style={styles.todayLabel}>রিপোর্ট নম্বর</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Critical alert widget (shown only when critical patterns detected) ── */}
        {hasCriticalActivity && (
          <View style={styles.critWidget}>
            <View style={styles.critWidgetLeft}>
              <Icon name="shield-alert" size={22} color="#f87171" />
              <View style={{ flex: 1 }}>
                <Text style={styles.critWidgetTitle}>সক্রিয় প্রতারণা সনাক্ত!</Text>
                <Text style={styles.critWidgetSub}>
                  {stats.mfsFraud > 0 ? `${stats.mfsFraud}টি বিকাশ/নগদ` : ''}
                  {stats.mfsFraud > 0 && stats.otpTheft > 0 ? ' · ' : ''}
                  {stats.otpTheft > 0 ? `${stats.otpTheft}টি OTP চুরি` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.critWidgetBtn}
              onPress={() => navigation.navigate('InboxScan')}
            >
              <Text style={styles.critWidgetBtnText}>দেখুন</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Government / Trust badges ── */}
        <View style={styles.trustStrip}>
          {([
            { icon: 'bank', label: 'BTRC', sub: 'সহযোগী লক্ষ্য' },
            { icon: 'police-badge', label: 'পুলিশ', sub: 'রিপোর্টিং' },
            { icon: 'shield-check-outline', label: 'র‍্যাব', sub: 'সচেতনতা' },
            { icon: 'scale-balance', label: 'ভোক্তা', sub: 'সুরক্ষা' },
          ] as { icon: MCIcon; label: string; sub: string }[]).map((badge) => (
            <View key={badge.label} style={styles.trustBadge}>
              <Icon name={badge.icon} size={20} color={Colors.accent} style={styles.trustBadgeIcon} />
              <Text style={styles.trustBadgeLabel}>{badge.label}</Text>
              <Text style={styles.trustBadgeSub}>{badge.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>দ্রুত অ্যাকশন</Text>
          <View style={styles.qaRow}>
            <QuickAction
              icon="message-processing"
              label="SMS স্ক্যান"
              color={Colors.accent}
              onPress={() => navigation.navigate('SMSScan')}
            />
            <QuickAction
              icon="phone-check"
              label="নম্বর যাচাই"
              color={Colors.accent}
              onPress={() => navigation.navigate('CallerID')}
            />
            <QuickAction
              icon="qrcode-scan"
              label={t('home_qa_qr')}
              color={Colors.accent}
              onPress={() => navigation.navigate('QRScan')}
            />
            <QuickAction
              icon="microphone-message"
              label="লাইভ কল চেক"
              color={Colors.accent}
              onPress={() => navigation.navigate('LiveCallListen')}
            />
          </View>

          {showMoreActions && (
            <>
              <View style={styles.qaRow}>
                <QuickAction
                  icon="message-text-outline"
                  label="ইনবক্স"
                  color={Colors.accent}
                  onPress={() => navigation.navigate('InboxScan')}
                />
                <QuickAction
                  icon="newspaper-variant-outline"
                  label="সতর্কতা"
                  color="#818cf8"
                  onPress={() => navigation.navigate('FraudAlerts')}
                />
                <QuickAction
                  icon="school-outline"
                  label="সাইবার শিক্ষা"
                  color="#818cf8"
                  onPress={() => navigation.navigate('CyberSafety')}
                />
                <QuickAction
                  icon="shield-alert"
                  label="রিপোর্ট"
                  color={Colors.threat}
                  onPress={() => navigation.navigate('CyberReport')}
                />
              </View>
              <View style={styles.qaRow}>
                <QuickAction
                  icon="shield-account"
                  label="স্প্যাম লিস্ট"
                  color="#818cf8"
                  onPress={() => navigation.navigate('SpamDirectory')}
                />
                <QuickAction
                  icon="history"
                  label="ইতিহাস"
                  color="#818cf8"
                  onPress={() => navigation.navigate('History')}
                />
                <QuickAction
                  icon="cellphone-remove"
                  label={t('home_qa_fakeapp')}
                  color={Colors.accent}
                  onPress={() => navigation.navigate('FakeAppScan')}
                />
                <QuickAction
                  icon="newspaper"
                  label={t('home_qa_scamnews')}
                  color="#818cf8"
                  onPress={() => navigation.navigate('ScamNews')}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.moreToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowMoreActions((v) => !v);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.moreToggleText}>
              {showMoreActions ? t('home_qa_less') : t('home_qa_more')}
            </Text>
            <Icon name={showMoreActions ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* ── Fraud alert teaser ── */}
        <TouchableOpacity
          style={styles.alertTeaser}
          onPress={() => navigation.navigate('FraudAlerts')}
          activeOpacity={0.8}
        >
          <View style={styles.alertTeaserLeft}>
            <Icon name="bullhorn-outline" size={22} color={Colors.accent} />
            <View>
              <Text style={styles.alertTeaserTitle}>সর্বশেষ সতর্কতা</Text>
              <Text style={styles.alertTeaserSub}>বিকাশ এজেন্ট প্রতারণা নতুনভাবে সক্রিয়</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={18} color={Colors.accent} />
        </TouchableOpacity>

        {/* ── Overall stats ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('home_recent')}</Text>
            {entries.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.seeAll}>সব দেখুন →</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statMini, { borderColor: `${Colors.threat}44` }]}>
              <Icon name="alert-circle" size={16} color={Colors.threat} />
              <Text style={[styles.statMiniNum, { color: Colors.threat }]}>{stats.critical}</Text>
              <Text style={styles.statMiniLabel}>{t('home_critical')}</Text>
            </View>
            <View style={[styles.statMini, { borderColor: `${Colors.suspicious}44` }]}>
              <Icon name="alert" size={16} color={Colors.suspicious} />
              <Text style={[styles.statMiniNum, { color: Colors.suspicious }]}>{stats.suspicious}</Text>
              <Text style={styles.statMiniLabel}>{t('home_suspicious')}</Text>
            </View>
            <View style={[styles.statMini, { borderColor: `${Colors.safe}44` }]}>
              <Icon name="check-circle" size={16} color={Colors.safe} />
              <Text style={[styles.statMiniNum, { color: Colors.safe }]}>{stats.safe}</Text>
              <Text style={styles.statMiniLabel}>{t('home_safe')}</Text>
            </View>
          </View>
        </View>

        {/* ── Main CTA ── */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            navigation.navigate('Analyzer');
          }}
          activeOpacity={0.85}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={Colors.gradient.accent}
            style={styles.cta}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Icon name="shield-search" size={22} color={Colors.primary} />
            <Text style={styles.ctaText}>{t('home_cta')}</Text>
            <Icon name="arrow-right" size={20} color={Colors.primary} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Recent entries ── */}
        {entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <NoScansIllustration color={Colors.accent} size={120} />
            <Text style={styles.emptyTitle}>{t('home_empty')}</Text>
            <Text style={styles.emptyHint}>{t('home_empty_hint')}</Text>
          </View>
        ) : (
          <>
            {latestThreat && (
              <View style={styles.latestThreat}>
                <View style={styles.latestThreatLeft}>
                  <Icon name="alert-circle" size={16} color={Colors.threat} />
                  <Text style={styles.latestThreatLabel}>সর্বশেষ হুমকি</Text>
                </View>
                <Text style={styles.latestThreatMsg} numberOfLines={1}>{latestThreat.message}</Text>
              </View>
            )}
            {entries.slice(0, 6).map((entry) => (
              <EntryRow key={entry.id} entry={entry} onPress={() => handleEntryPress(entry)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
