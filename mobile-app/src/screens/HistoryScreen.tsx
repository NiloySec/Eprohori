import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useHistoryStore, useAnalysisStore, useSettingsStore } from '@stores';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { NoHistoryIllustration } from '@components';
import type { HistoryScreenProps } from '@navigation/types';

const HistoryScreen = ({ navigation }: HistoryScreenProps) => {
  const [filter, setFilter] = useState<string | null>(null);
  const t = useTranslation();
  const activeProfile      = useSettingsStore((s) => s.activeProfile);
  const getFilteredEntries = useHistoryStore((s) => s.getFilteredEntries);
  const removeEntry        = useHistoryStore((s) => s.removeEntry);
  const clearHistory       = useHistoryStore((s) => s.clearHistory);
  const setAnalysisMessage = useAnalysisStore((s) => s.setMessage);
  const setResult          = useAnalysisStore((s) => s.setResult);

  const entries = useMemo(
    () => getFilteredEntries(filter ?? undefined, activeProfile),
    [filter, activeProfile, getFilteredEntries]
  );

  const FILTERS = [
    { key: null,        label: t('tab_history'),   icon: 'history' },
    { key: 'phishing',  label: t('type_phishing'), icon: 'fish' },
    { key: 'scam',      label: t('type_scam'),     icon: 'currency-usd-off' },
    { key: 'fraud',     label: t('type_fraud'),    icon: 'alert-octagon' },
    { key: 'malware',   label: t('type_malware'),  icon: 'bug' },
    { key: 'safe',      label: t('type_safe'),     icon: 'check-circle' },
  ] as const;

  const handleClear = () => {
    Alert.alert(t('history_confirm_title'), t('history_confirm_msg'), [
      { text: t('history_cancel'), style: 'cancel' },
      { text: t('history_delete'), style: 'destructive', onPress: () => clearHistory(activeProfile) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ── */}
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="history" size={26} color={Colors.accent} />
        </View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t('history_title')}</Text>
            <Text style={styles.subtitle}>{entries.length} টি রেকর্ড</Text>
          </View>
          {entries.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Icon name="delete-sweep-outline" size={22} color={Colors.threat} />
            </TouchableOpacity>
          )}
        </View>
        {activeProfile !== 'আমি' && (
          <View style={styles.profileBanner}>
            <Icon name="account-circle" size={14} color={Colors.accent} />
            <Text style={styles.profileBannerText}>{activeProfile} এর ইতিহাস</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count  = f.key === null
            ? entries.length
            : entries.filter((e) => e.result.threat_type === f.key).length;
          return (
            <TouchableOpacity
              key={String(f.key)}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Icon name={f.icon as any} size={13} color={active ? Colors.primary : Colors.text.tertiary} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <NoHistoryIllustration color={Colors.accent} size={120} />
            <Text style={styles.emptyTitle}>{t('history_empty')}</Text>
            <Text style={styles.emptyHint}>বিশ্লেষণ করুন এবং এখানে দেখুন</Text>
          </View>
        ) : (
          entries.map((entry) => {
            const conf  = entry.result.confidence;
            const color = conf >= 75 ? Colors.threat : conf >= 60 ? Colors.suspicious : Colors.safe;
            const icon  = conf >= 75 ? 'alert-circle' : conf >= 60 ? 'alert' : 'check-circle';
            const date  = new Date(entry.timestamp).toLocaleDateString('bn-BD', {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => {
                  setAnalysisMessage(entry.message);
                  setResult(entry.result);
                  navigation.navigate('ResultDetail');
                }}
              >
                <View style={[styles.cardAccent, { backgroundColor: color }]} />
                <View style={[styles.cardIconBox, { backgroundColor: `${color}18` }]}>
                  <Icon name={icon as any} size={18} color={color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardMsg} numberOfLines={2}>{entry.message}</Text>
                  <View style={styles.cardMeta}>
                    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.badgeText, { color }]}>{entry.result.threat_type} · {Math.round(conf)}%</Text>
                    </View>
                    <Text style={styles.cardDate}>{date}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => removeEntry(entry.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={16} color={Colors.text.tertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:     { ...TextStyles.h2, color: Colors.accent },
  subtitle:  { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2 },
  clearBtn:  { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.threatGlow, justifyContent: 'center', alignItems: 'center' },
  profileBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm,
    backgroundColor: Colors.accentGlow, alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderAccent,
  },
  profileBannerText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },

  filterScroll: { flexGrow: 0 },
  filterRow:    { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: BorderRadius.full, backgroundColor: Colors.secondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:       { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },

  emptyBox:    { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { ...TextStyles.h3, color: Colors.text.secondary },
  emptyHint:  { ...TextStyles.body, color: Colors.text.tertiary },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  cardAccent:  { width: 4, alignSelf: 'stretch' },
  cardIconBox: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm },
  cardBody:    { flex: 1, padding: Spacing.md },
  cardMsg:     { ...TextStyles.body, color: Colors.text.primary, marginBottom: 6 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  cardDate:    { ...TextStyles.caption, color: Colors.text.tertiary },
  deleteBtn:   { padding: Spacing.md },
});

export default HistoryScreen;
