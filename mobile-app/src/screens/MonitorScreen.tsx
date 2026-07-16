import React, { useMemo, useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useHistoryStore, useSettingsStore, useSpamNumberStore, SPAM_CATEGORIES } from '@stores';
import { useTranslation } from '@hooks';
import { threatAnalysisAPI, DistrictStat } from '@api';
import { DistrictSkeleton, RadarEmptyIllustration, CollapsibleSection } from '@components';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { getSyncedNumbers } from '../services/scamSyncService';
import type { MonitorScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

const SummaryCard = ({ value, label, color, icon }: { value: number; label: string; color: string; icon: MCIcon }) => (
  <View style={[styles.summaryCard, { borderColor: `${color}44` }]}>
    <View style={[styles.summaryIcon, { backgroundColor: `${color}18` }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.summaryNum, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const MonitorScreen = ({ navigation }: MonitorScreenProps) => {
  const t = useTranslation();
  const entries = useHistoryStore((s) => s.entries);
  const [districts,     setDistricts]     = useState<DistrictStat[]>([]);
  const [districtError, setDistrictError] = useState(false);
  const [districtLoad,  setDistrictLoad]  = useState(true);

  // R9: Leaderboard — top community-reported numbers
  interface LeaderEntry { number: string; category: string; count: number }
  const spamRecords = useSpamNumberStore((s) => s.records);
  const [syncedNums, setSyncedNums] = useState<LeaderEntry[]>([]);
  useEffect(() => { getSyncedNumbers().then((d) => setSyncedNums(d)); }, []);

  const leaderboard = useMemo((): LeaderEntry[] => {
    // merge local reports with synced community data
    const map = new Map<string, LeaderEntry>();
    Object.entries(spamRecords).forEach(([key, rec]) => {
      const top = Object.entries(
        rec.reports.reduce<Record<string, number>>((acc, r) => {
          acc[r.category] = (acc[r.category] ?? 0) + 1; return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0];
      map.set(key, { number: rec.number, category: top?.[0] ?? 'other', count: rec.reports.length });
    });
    syncedNums.forEach((e) => {
      const key = e.number.replace(/\D/g, '');
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, count: existing.count + e.count });
      } else {
        map.set(key, e);
      }
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [spamRecords, syncedNums]);

  const THREAT_ITEMS = [
    { key: 'phishing', label: t('type_phishing'), color: Colors.threat,    icon: 'fish' as MCIcon },
    { key: 'scam',     label: t('type_scam'),     color: Colors.suspicious, icon: 'currency-usd-off' as MCIcon },
    { key: 'fraud',    label: t('type_fraud'),    color: Colors.threat,    icon: 'alert-octagon' as MCIcon },
    { key: 'malware',  label: t('type_malware'),  color: Colors.suspicious, icon: 'bug' as MCIcon },
    { key: 'safe',     label: t('type_safe'),     color: Colors.safe,      icon: 'check-circle' as MCIcon },
  ] as const;

  const stats = useMemo(() => {
    const counts = { phishing: 0, scam: 0, fraud: 0, malware: 0, safe: 0 };
    entries.forEach((e) => {
      const key = e.result.threat_type as keyof typeof counts;
      if (key in counts) counts[key]++;
    });
    return counts;
  }, [entries]);

  const total     = Object.values(stats).reduce((a, b) => a + b, 0);
  const dangerous = stats.phishing + stats.fraud + stats.malware;

  useEffect(() => {
    threatAnalysisAPI.getDistrictStats()
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.threats - a.threats).slice(0, 10);
        setDistricts(sorted);
        setDistrictError(sorted.length === 0);
      })
      .catch(() => setDistrictError(true))
      .finally(() => setDistrictLoad(false));
  }, []);

  const maxDistrictCount = districts.length > 0 ? Math.max(...districts.map((d) => d.threats)) : 1;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="radar" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('monitor_title')}</Text>
          <Text style={styles.subtitle}>{t('monitor_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Summary cards (profile-scoped personal stats) ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('monitor_my_scans')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard value={total}      label={t('monitor_total')}     color={Colors.accent}    icon="chart-donut" />
            <SummaryCard value={dangerous}  label={t('monitor_dangerous')} color={Colors.threat}    icon="alert-circle" />
            <SummaryCard value={stats.safe} label={t('monitor_safe')}      color={Colors.safe}      icon="shield-check" />
          </View>

          {/* ── Community report CTA ── */}
          <TouchableOpacity
            style={styles.reportCta}
            onPress={() => navigation.navigate('CommunityReport')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[Colors.gradient.threatHero[0], Colors.secondary]} style={styles.reportCtaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="alert-decagram-outline" size={18} color={Colors.threat} />
              <Text style={styles.reportCtaText}>{t('monitor_report_btn')}</Text>
              <Icon name="chevron-right" size={18} color={Colors.text.tertiary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Breakdown chart (profile-scoped) ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('monitor_breakdown')}</Text>
          </View>
          <View style={styles.breakdownCard}>
            {THREAT_ITEMS.map((item) => {
              const count = stats[item.key];
              const pct   = total > 0 ? (count / total) * 100 : 0;
              return (
                <View key={item.key} style={styles.barRow}>
                  <View style={styles.barLabelWrap}>
                    <Icon name={item.icon} size={13} color={item.color} />
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[styles.barCount, { color: item.color }]}>{count}</Text>
                </View>
              );
            })}
          </View>

          {/* ── District stats (community-wide backend data) ── */}
          {districtLoad ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('monitor_districts')}</Text>
                <View style={styles.communityPill}>
                  <Icon name="earth" size={12} color={Colors.safe} />
                  <Text style={styles.communityPillText}>{t('monitor_community_data')}</Text>
                </View>
              </View>
              <DistrictSkeleton />
            </>
          ) : districtError || districts.length === 0 ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('monitor_districts')}</Text>
                <View style={styles.communityPill}>
                  <Icon name="earth" size={12} color={Colors.safe} />
                  <Text style={styles.communityPillText}>{t('monitor_community_data')}</Text>
                </View>
              </View>
              <View style={styles.districtPlaceholder}>
                <Icon name="map-marker-off-outline" size={28} color={Colors.text.tertiary} />
                <Text style={styles.districtHint}>{districtError ? t('monitor_districts_error') : t('monitor_districts_empty')}</Text>
              </View>
            </>
          ) : (
            <View style={{ marginBottom: Spacing.xl }}>
              <CollapsibleSection icon="earth" title={t('monitor_districts')} badge={String(districts.length)}>
                {districts.map((d, i) => {
                  const pct = maxDistrictCount > 0 ? (d.threats / maxDistrictCount) * 100 : 0;
                  const color = pct > 70 ? Colors.threat : pct > 40 ? Colors.suspicious : Colors.safe;
                  return (
                    <View key={d.name} style={[styles.districtRow, i > 0 && { marginTop: Spacing.md }]}>
                      <Text style={styles.districtRank}>{i + 1}</Text>
                      <View style={styles.districtInfo}>
                        <View style={styles.districtTopRow}>
                          <Text style={styles.districtName}>{d.name_bn ?? d.name}</Text>
                          <Text style={[styles.districtCount, { color }]}>{d.threats}</Text>
                        </View>
                        <View style={styles.districtTrack}>
                          <View style={[styles.districtFill, { width: `${Math.max(pct, 3)}%`, backgroundColor: color }]} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </CollapsibleSection>
            </View>
          )}

          {/* ── R9: Scam Number Leaderboard ── */}
          {leaderboard.length > 0 && (
            <View style={{ marginBottom: Spacing.xl }}>
              <CollapsibleSection icon="trophy-outline" title="সর্বাধিক রিপোর্টেড নম্বর" badge={String(leaderboard.length)}>
                {leaderboard.map((item, i) => {
                  const cat   = SPAM_CATEGORIES[item.category as keyof typeof SPAM_CATEGORIES];
                  const color = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : Colors.text.tertiary;
                  return (
                    <View key={item.number} style={[styles.leaderRow, i > 0 && { marginTop: Spacing.md }]}>
                      <Text style={[styles.leaderRank, { color }]}>#{i + 1}</Text>
                      <View style={styles.leaderInfo}>
                        <Text style={styles.leaderNumber}>{item.number}</Text>
                        <Text style={styles.leaderCat}>{cat?.label_bn ?? item.category}</Text>
                      </View>
                      <View style={[styles.leaderBadge, { backgroundColor: `${Colors.threat}18` }]}>
                        <Text style={[styles.leaderCount, { color: Colors.threat }]}>
                          {item.count} রিপোর্ট
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </CollapsibleSection>
            </View>
          )}

          {/* ── Recent detections ── */}
          {entries.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('monitor_recent')}</Text>
              {entries.slice(0, 6).map((entry) => {
                const conf  = entry.result.confidence;
                const color = conf >= 75 ? Colors.threat : conf >= 60 ? Colors.suspicious : Colors.safe;
                return (
                  <View key={entry.id} style={styles.recentCard}>
                    <View style={[styles.recentDot, { backgroundColor: color }]} />
                    <View style={styles.recentBody}>
                      <Text style={styles.recentMsg} numberOfLines={1}>{entry.message}</Text>
                      <View style={styles.recentMeta}>
                        <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
                          <Text style={[styles.badgeText, { color }]}>{entry.result.threat_type}</Text>
                        </View>
                        <Text style={styles.recentPct}>{Math.round(conf)}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {entries.length === 0 && (
            <View style={styles.emptyBox}>
              <RadarEmptyIllustration color={Colors.accent} size={120} />
              <Text style={styles.emptyText}>{t('monitor_empty')}</Text>
              <Text style={styles.emptyHint}>{t('monitor_empty_hint')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'] },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: Spacing.xs },

  body: { padding: Spacing.lg },

  summaryRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, alignItems: 'center', paddingVertical: Spacing.lg, gap: 6,
  },
  summaryIcon:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  summaryNum:   { ...TextStyles.h2 },
  summaryLabel: { ...TextStyles.caption, color: Colors.text.tertiary, textAlign: 'center' },

  reportCta:     { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl },
  reportCtaGrad: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  reportCtaText: { ...TextStyles.bodyMedium, color: Colors.threat, flex: 1 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { ...TextStyles.h3, color: Colors.text.primary },
  profilePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentGlow, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderAccent,
  },
  profilePillText: { fontSize: 10, fontWeight: '700', color: Colors.accent },
  communityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.safe}15`, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: `${Colors.safe}30`,
  },
  communityPillText: { fontSize: 10, fontWeight: '700', color: Colors.safe },

  breakdownCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.xl, gap: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.small,
  },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 120 },
  barLabel:     { ...TextStyles.caption, color: Colors.text.primary },
  barTrack:     { flex: 1, height: 8, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: BorderRadius.full },
  barCount:     { ...TextStyles.caption, fontWeight: '700', width: 24, textAlign: 'right' },

  districtRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  districtRank:    { ...TextStyles.caption, color: Colors.text.tertiary, width: 18, textAlign: 'center' },
  districtInfo:    { flex: 1 },
  districtTopRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  districtName:    { ...TextStyles.caption, color: Colors.text.primary, fontWeight: '600' },
  districtCount:   { ...TextStyles.caption, fontWeight: '700' },
  districtTrack:   { height: 6, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, overflow: 'hidden' },
  districtFill:    { height: '100%', borderRadius: BorderRadius.full },
  districtPlaceholder: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.xl },
  districtHint:    { ...TextStyles.body, color: Colors.text.tertiary },

  recentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  recentDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  recentBody: { flex: 1 },
  recentMsg:  { ...TextStyles.body, color: Colors.text.primary, marginBottom: 5 },
  recentMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  recentPct:  { ...TextStyles.caption, color: Colors.text.tertiary },

  emptyBox:  { alignItems: 'center', paddingVertical: 48, gap: Spacing.md },
  emptyText: { ...TextStyles.h3, color: Colors.text.secondary },
  emptyHint: { ...TextStyles.body, color: Colors.text.tertiary, textAlign: 'center' },

  leaderRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  leaderRank:  { ...TextStyles.bodyMedium, fontWeight: '800', width: 28 },
  leaderInfo:  { flex: 1 },
  leaderNumber:{ ...TextStyles.body, color: Colors.text.primary, fontWeight: '600' },
  leaderCat:   { ...TextStyles.caption, color: Colors.text.tertiary },
  leaderBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  leaderCount: { fontSize: 11, fontWeight: '700' },
});

export default MonitorScreen;
