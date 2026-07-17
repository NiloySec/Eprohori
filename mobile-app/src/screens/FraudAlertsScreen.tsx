import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { CollapsibleSection } from '@components';
import { threatAnalysisAPI, type FraudAlertItem } from '@api';
import type { FraudAlertsScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];
type FraudAlert = FraudAlertItem;

// L1: dynamic relative dates — fallback alerts show age, not stale absolute date
function daysAgo(n: number): string {
  if (n === 0) return 'আজ';
  if (n === 1) return 'গতকাল';
  return `${n} দিন আগে`;
}
const D = (n: number) => daysAgo(n);

// M20: function (not constant) so dates recompute on each call, not at module load
function buildFallbackAlerts(): FraudAlert[] {
  return [
  {
    id: 'a1',
    date: D(1),
    category: 'বিকাশ প্রতারণা',
    categoryColor: Colors.threat,
    categoryIcon: 'credit-card-off-outline',
    severity: 'critical',
    title: 'নতুন "বিকাশ এজেন্ট" প্রতারণা',
    body: 'প্রতারকরা বিকাশ এজেন্ট পরিচয় দিয়ে ফোন করছে এবং "ভুলে টাকা পাঠিয়েছি" বলে ক্যাশব্যাক চাইছে। সত্যিকার বিকাশ এজেন্ট কখনো আপনাকে টাকা ফেরত দিতে বলে না।',
    tags: ['বিকাশ', 'ক্যাশব্যাক', 'এজেন্ট'],
  },
  {
    id: 'a2',
    date: D(2),
    category: 'OTP চুরি',
    categoryColor: Colors.threat,
    categoryIcon: 'lock-alert-outline',
    severity: 'critical',
    title: 'Nagad PIN রিসেট স্ক্যাম',
    body: 'নগদের নামে SMS পাঠিয়ে OTP নেওয়ার ঘটনা বাড়ছে। বার্তায় লেখা থাকে: "নিরাপত্তার জন্য PIN রিসেট করুন"। নগদ কখনো SMS-এ PIN চায় না।',
    tags: ['নগদ', 'OTP', 'PIN রিসেট'],
  },
  {
    id: 'a3',
    date: D(3),
    category: 'ফিশিং',
    categoryColor: Colors.threat,
    categoryIcon: 'hook',
    severity: 'high',
    title: 'নকল "বাংলাদেশ ব্যাংক" পোর্টাল',
    body: 'বাংলাদেশ ব্যাংকের নকল ওয়েবসাইট ছড়িয়ে পড়েছে যেখানে NID ও ব্যাংক তথ্য চাওয়া হচ্ছে। অফিসিয়াল ওয়েবসাইট: bangladeshbank.org.bd',
    tags: ['বাংলাদেশ ব্যাংক', 'ফিশিং', 'NID'],
  },
  {
    id: 'a4',
    date: D(5),
    category: 'লটারি স্ক্যাম',
    categoryColor: Colors.suspicious,
    categoryIcon: 'trophy-outline',
    severity: 'high',
    title: 'Grameenphone পুরস্কার জালিয়াতি',
    body: '"আপনি Grameenphone ২৫ বছরপূর্তি অফারে iPhone 16 জিতেছেন" — এই ধরনের SMS ভুয়া। Grameenphone এভাবে পুরস্কার দেয় না।',
    tags: ['GP', 'লটারি', 'iPhone'],
  },
  {
    id: 'a5',
    date: D(7),
    category: 'রোমান্স স্ক্যাম',
    categoryColor: '#818cf8',
    categoryIcon: 'heart-broken-outline',
    severity: 'high',
    title: 'ফেসবুকে বিদেশি পরিচয়ের ফাঁদ',
    body: 'USA/UK থেকে বাংলাদেশি পরিচয়ে মেসেজ দিয়ে বিশ্বাস অর্জন করছে। মাসখানেক পরে "বিপদে পড়েছি, টাকা পাঠাও" বলছে। বিদেশে পরিচিত না হলে অনলাইনে টাকা পাঠাবেন না।',
    tags: ['ফেসবুক', 'রোমান্স', 'বিদেশি'],
  },
  {
    id: 'a6',
    date: D(9),
    category: 'চাকরি প্রতারণা',
    categoryColor: '#818cf8',
    categoryIcon: 'briefcase-outline',
    severity: 'medium',
    title: '"ঘরে বসে আয়" চাকরির ফাঁদ',
    body: 'WhatsApp-এ "পার্ট-টাইম ডেটা এন্ট্রি, ৳৫০০/ঘণ্টা" অফার আসছে। রেজিস্ট্রেশন ফি নেওয়ার পর প্রতারকরা সম্পর্ক ছিন্ন করছে।',
    tags: ['চাকরি', 'WhatsApp', 'ডেটা এন্ট্রি'],
  },
  {
    id: 'a7',
    date: D(11),
    category: 'বিনিয়োগ স্ক্যাম',
    categoryColor: Colors.suspicious,
    categoryIcon: 'chart-line',
    severity: 'medium',
    title: 'Crypto "Bot Trading" স্ক্যাম',
    body: 'Telegram গ্রুপে "AI বট দিয়ে প্রতিদিন ৩০% লাভ" দাবি করা হচ্ছে। প্রথমে ছোট লাভ দেখিয়ে বড় বিনিয়োগ করিয়ে পলায়ন করে।',
    tags: ['Crypto', 'Telegram', 'বট'],
  },
  {
    id: 'a8',
    date: D(13),
    category: 'পুলিশ জাল',
    categoryColor: Colors.threat,
    categoryIcon: 'police-badge-outline',
    severity: 'high',
    title: '"র‍্যাব অফিসার" পরিচয়ে ভয় দেখানো',
    body: 'র‍্যাব/পুলিশ পরিচয় দিয়ে "মামলা থেকে বাঁচাতে টাকা দিন" বলে ভয় দেখানো হচ্ছে। র‍্যাব বা পুলিশ কখনো ফোনে টাকা চায় না।',
    tags: ['র‍্যাব', 'পুলিশ', 'ভয় দেখানো'],
  },
  ];
}

const TIPS = [
  { icon: 'phone-off' as MCIcon,         text: 'অপরিচিত নম্বর থেকে আসা টাকার অনুরোধ এড়িয়ে চলুন' },
  { icon: 'shield-check' as MCIcon,      text: 'সরকারি সংস্থা কখনো ফোনে টাকা চায় না' },
  { icon: 'lock' as MCIcon,              text: 'PIN, OTP বা পাসওয়ার্ড কারো সাথে শেয়ার করবেন না' },
  { icon: 'alert-circle-outline' as MCIcon, text: 'লোভনীয় অফার সবসময় সন্দেহজনক' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const SeverityBadge = ({ sev }: { sev: FraudAlert['severity'] }) => {
  const map = {
    critical: { label: 'জরুরি',    bg: '#450a0a', text: '#f87171' },
    high:     { label: 'উচ্চ ঝুঁকি', bg: '#1c1917', text: '#fb923c' },
    medium:   { label: 'মাঝারি',   bg: '#1e1b4b', text: '#a5b4fc' },
  };
  const s = map[sev];
  return (
    <View style={[styles.sevBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.sevText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
};

const AlertCard = ({ item }: { item: FraudAlert }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.alertCard, { borderLeftColor: item.categoryColor }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.alertTop}>
        <View style={[styles.alertIconBox, { backgroundColor: `${item.categoryColor}18` }]}>
          <Icon name={item.categoryIcon as MCIcon} size={18} color={item.categoryColor} />
        </View>
        <View style={styles.alertMeta}>
          <View style={styles.alertMetaRow}>
            <Text style={[styles.alertCat, { color: item.categoryColor }]}>{item.category}</Text>
            <SeverityBadge sev={item.severity} />
          </View>
          <Text style={styles.alertDate}>{item.date}</Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18} color={Colors.text.tertiary}
        />
      </View>

      <Text style={styles.alertTitle}>{item.title}</Text>

      {expanded && (
        <>
          <Text style={styles.alertBody}>{item.body}</Text>
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

const FraudAlertsScreen = ({ navigation }: FraudAlertsScreenProps) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const [filter, setFilter]       = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [alerts, setAlerts]       = useState<FraudAlert[]>(() => buildFallbackAlerts()); // M20: lazy init = runtime date
  const [loading, setLoading]     = useState(false);
  const [fromApi, setFromApi]     = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await threatAnalysisAPI.fetchFraudAlerts();
      if (result.alerts.length > 0) {
        setAlerts(result.alerts);
        setFromApi(!result.fromCache);
        setFromCache(result.fromCache);
        setLastUpdated(result.lastUpdated);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const cacheAgeText = (() => {
    if (!lastUpdated) return null;
    const mins = Math.round((Date.now() - lastUpdated) / 60000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} ঘণ্টা আগে`;
  })();

  const filtered  = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);
  const critCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAlerts} tintColor={Colors.accent} />
        }
      >

        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="newspaper-variant-outline" size={28} color={Colors.accent} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.headerTitle}>প্রতারণা সতর্কতা ফিড</Text>
            {loading
              ? <ActivityIndicator size="small" color={Colors.accent} />
              : fromApi
                ? <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● লাইভ</Text></View>
                : fromCache
                  ? <View style={[styles.liveBadge, { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${Colors.suspicious}20` }]}>
                      <Icon name="archive-outline" size={11} color={Colors.suspicious} />
                      <Text style={[styles.liveBadgeText, { color: Colors.suspicious }]}>
                        ক্যাশ{cacheAgeText ? ` · ${cacheAgeText}` : ''}
                      </Text>
                    </View>
                  : <View style={styles.liveBadge}><Text style={[styles.liveBadgeText, { color: Colors.text.tertiary }]}>অফলাইন</Text></View>
            }
          </View>
          <Text style={styles.headerSub}>বাংলাদেশে সক্রিয় সাইবার প্রতারণার আপডেট</Text>

          {/* Alert stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#f87171' }]}>{critCount}</Text>
              <Text style={styles.statLabel}>জরুরি</Text>
            </View>
            <View style={[styles.statBox, { borderColor: '#fb923c44' }]}>
              <Text style={[styles.statNum, { color: '#fb923c' }]}>{highCount}</Text>
              <Text style={styles.statLabel}>উচ্চ ঝুঁকি</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.accent }]}>{alerts.length}</Text>
              <Text style={styles.statLabel}>মোট সতর্কতা</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* Tips strip */}
          <CollapsibleSection icon="lightbulb-outline" title="প্রতারণা হলে কী করবেন" badge={String(TIPS.length)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tipsScroll}
            >
              {TIPS.map((tip, i) => (
                <View key={i} style={styles.tipCard}>
                  <Icon name={tip.icon} size={18} color={Colors.accent} />
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </ScrollView>
          </CollapsibleSection>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {([
              { key: 'all',      label: 'সব' },
              { key: 'critical', label: 'জরুরি' },
              { key: 'high',     label: 'উচ্চ ঝুঁকি' },
              { key: 'medium',   label: 'মাঝারি' },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
                onPress={() => setFilter(key)}
              >
                <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Alert cards */}
          <Text style={styles.sectionLabel}>{filtered.length}টি সতর্কতা</Text>
          {filtered.map((item) => (
            <AlertCard key={item.id} item={item} />
          ))}

          {/* Report link */}
          <TouchableOpacity
            style={styles.reportLink}
            onPress={() => navigation.navigate('CyberReport')}
            activeOpacity={0.8}
          >
            <Icon name="shield-alert" size={20} color={Colors.threat} />
            <Text style={styles.reportLinkText}>প্রতারণার শিকার হলে — রিপোর্ট করুন</Text>
            <Icon name="chevron-right" size={18} color={Colors.threat} />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  headerTitle: { ...TextStyles.h2, color: Colors.accent },
  headerSub:   { ...TextStyles.body, color: Colors.text.secondary, marginBottom: Spacing.lg },
  liveBadge:     { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#16a34a20', borderRadius: 6 },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: '#4ade80' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  statNum:   { ...TextStyles.h2, fontSize: 22 },
  statLabel: { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },

  body: { padding: Spacing.lg },

  tipsScroll:  { gap: Spacing.sm, paddingBottom: Spacing.md },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderAccent,
    padding: Spacing.md, width: 220,
  },
  tipText: { ...TextStyles.caption, color: Colors.text.secondary, flex: 1, lineHeight: 18 },

  filterRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  filterBtn: {
    flex: 1, paddingVertical: 8, borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  filterBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  filterText:      { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '600' },
  filterTextActive:{ color: Colors.accent },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm,
  },

  alertCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alertTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  alertIconBox: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  alertMeta:    { flex: 1 },
  alertMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  alertCat:     { ...TextStyles.caption, fontWeight: '700' },
  alertDate:    { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },
  alertTitle:   { ...TextStyles.body, color: Colors.text.primary, fontWeight: '700', lineHeight: 22 },
  alertBody:    {
    ...TextStyles.caption, color: Colors.text.secondary,
    lineHeight: 19, marginTop: Spacing.sm,
  },

  sevBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  sevText:  { fontSize: 10, fontWeight: '700' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  tag:     { backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  tagText: { ...TextStyles.caption, color: Colors.text.tertiary, fontSize: 10 },

  reportLink: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: `${Colors.threat}12`, borderWidth: 1, borderColor: `${Colors.threat}35`,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.lg,
  },
  reportLinkText: { ...TextStyles.body, color: Colors.threat, fontWeight: '700', flex: 1 },
});

export default FraudAlertsScreen;
styles = makeStyles(Colors);
