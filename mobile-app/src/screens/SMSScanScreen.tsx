import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { CollapsibleSection } from '@components';
import { useSettingsStore, useHistoryStore, useAnalysisStore } from '@stores';
import { threatAnalysisAPI, ThreatAnalysisResponse } from '@api';
import { extractPhoneNumbers, analyzePhoneLocally, categorizeSms } from '@utils';
import type { SmsCategory } from '@utils';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

interface ScanResult {
  message: string;
  result: ThreatAnalysisResponse;
}

type Props = NativeStackScreenProps<RootStackParamList, 'SMSScan'>;
type MCIcon = React.ComponentProps<typeof Icon>['name'];

// N: local vector-icon mapping for in-app UI — CATEGORY_META.icon stays emoji since it
// also feeds notification text; same mapping used in InboxScanScreen/SettingsScreen.
const CATEGORY_VECTOR_ICON: Record<SmsCategory, MCIcon> = {
  mfs_fraud: 'credit-card-off-outline', otp_theft: 'lock-alert-outline', otp: 'key-outline',
  bank_transaction: 'bank-outline', mfs: 'cellphone-message', fraud: 'alert-outline',
  phishing: 'hook', malware: 'bug-outline', promotional: 'bullhorn-outline',
  emergency: 'alarm-light-outline', unknown: 'help-circle-outline',
};

const threatColor = (type: string) => {
  if (type === 'safe') return Colors.safe;
  if (type === 'phishing' || type === 'malware') return Colors.threat;
  return Colors.suspicious;
};

const SMSScanScreen = ({ navigation }: Props) => {
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [total, setTotal]         = useState(0);
  const [results, setResults]     = useState<ScanResult[]>([]);
  const autoScanRef               = useRef(false);
  const t = useTranslation();
  const { language, blocklist } = useSettingsStore();
  const addEntry = useHistoryStore((s) => s.addEntry);
  const activeProfile = useSettingsStore((s) => s.activeProfile);
  const consumePendingSmsText = useAnalysisStore((s) => s.consumePendingSmsText);
  const pendingSmsText        = useAnalysisStore((s) => s.pendingSmsText);

  // Auto-fill + auto-scan when an incoming SMS is routed here from BroadcastReceiver
  useEffect(() => {
    if (!pendingSmsText || autoScanRef.current) return;
    autoScanRef.current = true;
    const smsText = consumePendingSmsText();
    setText(smsText);
    // Small delay so the text renders before scan begins
    setTimeout(() => {
      autoScanRef.current = false;
    }, 100);
  }, [pendingSmsText]);

  const parseMessages = (raw: string): string[] =>
    raw
      .split(/\n{2,}|---+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

  const isBlocked = (msg: string) =>
    blocklist.some((b) => msg.toLowerCase().includes(b.toLowerCase()));

  const handleScan = async () => {
    const trimmed = text.trim();
    if (!trimmed) { Alert.alert('', t('sms_scan_required')); return; }

    const messages = parseMessages(trimmed);
    if (messages.length === 0) { Alert.alert('', t('sms_scan_required')); return; }

    setLoading(true);
    setResults([]);
    setTotal(messages.length);
    setProgress(0);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const scanned: ScanResult[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (isBlocked(msg)) {
        // ThreatAnalysisResponse.confidence is 0-100, not 0-1 (see threatAnalysis.ts)
        const blockedResult: ThreatAnalysisResponse = {
          threat_type: 'scam', confidence: 100,
          message: t('analyzer_blocklisted_msg'),
          solution_steps: [], prevention_tips: [],
        };
        scanned.push({ message: msg, result: blockedResult });
        addEntry(msg, blockedResult, activeProfile);
      } else {
        try {
          const result = await threatAnalysisAPI.analyzeThreat(msg, language);
          scanned.push({ message: msg, result });
          addEntry(msg, result, activeProfile);
        } catch {
          const errResult: ThreatAnalysisResponse = {
            threat_type: 'safe', confidence: 0,
            message: t('analyzer_failed'),
            solution_steps: [], prevention_tips: [],
          };
          scanned.push({ message: msg, result: errResult });
        }
      }

      setProgress(i + 1);
      setResults([...scanned]);
    }

    setLoading(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const safeCount    = results.filter((r) => r.result.threat_type === 'safe').length;
  const threatCount  = results.filter((r) => r.result.threat_type !== 'safe').length;
  const pct          = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="message-processing" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('sms_scan_title')}</Text>
          <Text style={styles.subtitle}>{t('sms_scan_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Input card */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>{t('sms_scan_input_label')}</Text>
            <TextInput
              style={styles.textArea}
              value={text}
              onChangeText={setText}
              placeholder={t('sms_scan_placeholder')}
              placeholderTextColor={Colors.text.tertiary}
              multiline
              textAlignVertical="top"
              numberOfLines={6}
              editable={!loading}
            />
            <Text style={styles.tipHint}>{t('sms_scan_tip')}</Text>
            <View style={styles.actionRow}>
              {text.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setText(''); setResults([]); }}
                  disabled={loading}
                >
                  <Icon name="close-circle-outline" size={16} color={Colors.text.tertiary} />
                  <Text style={styles.clearBtnText}>{t('sms_scan_clear')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.scanBtn, (loading || !text.trim()) && { opacity: 0.5 }]}
                onPress={handleScan}
                disabled={loading || !text.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={Colors.gradient.accent}
                  style={styles.scanBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {loading
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : (
                      <>
                        <Icon name="shield-search" size={17} color={Colors.primary} />
                        <Text style={styles.scanBtnText}>{t('sms_scan_btn')}</Text>
                      </>
                    )
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress bar */}
          {loading && total > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>{t('sms_scan_scanning')}</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressCount}>{progress} / {total}</Text>
            </View>
          )}

          {/* Summary chips */}
          {results.length > 0 && !loading && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryChip, { backgroundColor: `${Colors.safe}20`, borderColor: `${Colors.safe}40` }]}>
                <Icon name="check-circle" size={16} color={Colors.safe} />
                <Text style={[styles.summaryText, { color: Colors.safe }]}>
                  {safeCount} {t('sms_scan_safe_count')}
                </Text>
              </View>
              {threatCount > 0 && (
                <View style={[styles.summaryChip, { backgroundColor: `${Colors.threat}20`, borderColor: `${Colors.threat}40` }]}>
                  <Icon name="alert-circle" size={16} color={Colors.threat} />
                  <Text style={[styles.summaryText, { color: Colors.threat }]}>
                    {threatCount} {t('sms_scan_threat_count')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('sms_scan_results')}</Text>
              {results.map((item, idx) => {
                const color  = threatColor(item.result.threat_type);
                const isSafe = item.result.threat_type === 'safe';
                return (
                  <View key={idx} style={[styles.resultCard, { borderLeftColor: color }]}>
                    <View style={styles.resultHeader}>
                      <View style={[styles.resultBadge, { backgroundColor: `${color}20` }]}>
                        <Icon
                          name={isSafe ? 'check-circle' : 'alert-circle'}
                          size={14} color={color}
                        />
                        <Text style={[styles.resultBadgeText, { color }]}>
                          {Math.round(item.result.confidence)}%
                        </Text>
                      </View>
                      <Text style={[styles.resultType, { color }]}>
                        {item.result.threat_type.toUpperCase()}
                      </Text>
                      {/* SMS category badge */}
                      {(() => {
                        const cat = categorizeSms(item.message);
                        if (cat.category === 'unknown') return null;
                        return (
                          <View style={[styles.catBadge, { backgroundColor: `${cat.color}18`, borderColor: `${cat.color}40` }]}>
                            <Icon name={CATEGORY_VECTOR_ICON[cat.category]} size={11} color={cat.color} />
                            <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label_bn}</Text>
                          </View>
                        );
                      })()}
                    </View>
                    <Text style={styles.resultMsg} numberOfLines={3}>{item.message}</Text>
                    {!isSafe && item.result.message ? (
                      <Text style={styles.resultDetail}>{item.result.message}</Text>
                    ) : null}
                    {/* Critical category warnings */}
                    {(() => {
                      const cat = categorizeSms(item.message);
                      if (cat.category === 'otp_theft') {
                        return (
                          <View style={styles.criticalWarn}>
                            <Icon name="lock-alert-outline" size={18} color={Colors.threat} style={styles.criticalIcon} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.criticalTitle}>OTP চুরির চেষ্টা!</Text>
                              <Text style={styles.criticalText}>
                                কেউ আপনার OTP/PIN নিতে চাইছে। কোনো কোড কাউকে বলবেন না — ব্যাংক বা বিকাশ কখনো কোড চায় না।
                              </Text>
                            </View>
                          </View>
                        );
                      }
                      if (cat.category === 'mfs_fraud') {
                        return (
                          <View style={styles.criticalWarn}>
                            <Icon name="credit-card-off-outline" size={18} color={Colors.threat} style={styles.criticalIcon} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.criticalTitle}>বিকাশ/নগদ প্রতারণা!</Text>
                              <Text style={styles.criticalText}>
                                এটি একটি ভুয়া বিকাশ/নগদ বার্তা। কোনো তথ্য দেবেন না, কোনো লিংকে যাবেন না।
                              </Text>
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })()}
                    {/* Embedded phone numbers in threat SMS */}
                    {!isSafe && (() => {
                      const nums = extractPhoneNumbers(item.message);
                      if (nums.length === 0) return null;
                      return (
                        <View style={styles.numBox}>
                          <View style={styles.numBoxTitleRow}>
                            <Icon name="phone-outline" size={12} color={Colors.suspicious} />
                            <Text style={styles.numBoxTitle}>মেসেজে পাওয়া নম্বর</Text>
                          </View>
                          {nums.map((n, ni) => {
                            const pf = analyzePhoneLocally(n);
                            return (
                              <View key={ni} style={styles.numRow}>
                                <Icon name="phone-alert" size={13} color={Colors.suspicious} />
                                <Text style={styles.numText}>{pf.formatted}</Text>
                                {pf.operator_bn && (
                                  <Text style={styles.numOp}>{pf.operator_bn}</Text>
                                )}
                                {pf.number_type === 'international' && (
                                  <Text style={styles.numOp}>আন্তর্জাতিক</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
            </>
          )}

          {/* Cyber report CTA — shown when any threat is detected */}
          {threatCount > 0 && !loading && (
            <TouchableOpacity
              style={styles.cyberReportBtn}
              onPress={() => navigation.navigate('CyberReport')}
              activeOpacity={0.8}
            >
              <View style={styles.cyberReportLeft}>
                <Icon name="shield-alert" size={22} color={Colors.threat} />
                <View>
                  <Text style={styles.cyberReportTitle}>প্রতারণা সনাক্ত হয়েছে</Text>
                  <Text style={styles.cyberReportSub}>কর্তৃপক্ষে রিপোর্ট করুন →</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.threat} />
            </TouchableOpacity>
          )}

          {/* How-to tips (empty state) */}
          {results.length === 0 && !loading && (
            <CollapsibleSection icon="lightbulb-outline" title={t('sms_scan_how_title')}>
              {([t('sms_scan_how1'), t('sms_scan_how2'), t('sms_scan_how3')] as string[]).map((tip, i) => (
                <Text key={i} style={styles.tipText}>{tip}</Text>
              ))}
            </CollapsibleSection>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'] },
  backBtn: { marginBottom: Spacing.md },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  body: { padding: Spacing.lg },

  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  inputLabel: { ...TextStyles.caption, color: Colors.text.secondary, marginBottom: Spacing.sm, fontWeight: '600' },
  textArea: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...TextStyles.body, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.border,
    minHeight: 130, marginBottom: Spacing.sm,
  },
  tipHint:   { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: Spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  clearBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
  },
  clearBtnText: { ...TextStyles.caption, color: Colors.text.tertiary },
  scanBtn:      { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  scanBtnGrad:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 7,
  },
  scanBtnText: { ...TextStyles.button, color: Colors.primary },

  progressCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressLabel: { ...TextStyles.body, color: Colors.accent, fontWeight: '600' },
  progressPct:   { ...TextStyles.body, color: Colors.accent },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: Colors.primary,
    overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  progressCount: { ...TextStyles.caption, color: Colors.text.tertiary, textAlign: 'right' },

  summaryRow:  { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  summaryText: { ...TextStyles.body, fontWeight: '700' },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm,
  },

  resultCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, marginBottom: Spacing.md,
  },
  resultHeader:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6, flexWrap: 'wrap' },
  resultBadge:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  resultBadgeText: { fontSize: 11, fontWeight: '700' },
  resultType:      { ...TextStyles.caption, fontWeight: '700', letterSpacing: 0.5 },
  resultMsg:       { ...TextStyles.body, color: Colors.text.secondary, lineHeight: 20 },
  resultDetail:    { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 6, lineHeight: 18 },

  tipText:   { ...TextStyles.caption, color: Colors.text.secondary, marginBottom: 6, lineHeight: 20 },

  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  catLabel: { fontSize: 10, fontWeight: '700' },

  cyberReportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: `${Colors.threat}12`, borderWidth: 1, borderColor: `${Colors.threat}35`,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  cyberReportLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cyberReportTitle: { ...TextStyles.body, color: Colors.threat, fontWeight: '700' },
  cyberReportSub:   { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2 },

  criticalWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: Spacing.sm, padding: Spacing.sm,
    backgroundColor: `${Colors.threat}18`, borderRadius: 8,
    borderWidth: 1, borderColor: `${Colors.threat}60`,
  },
  criticalIcon:  { flexShrink: 0, marginTop: 1 },
  criticalTitle: { ...TextStyles.caption, color: Colors.threat, fontWeight: '800', marginBottom: 3 },
  criticalText:  { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 17 },

  numBox:         { marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: `${Colors.suspicious}10`, borderRadius: 8 },
  numBoxTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  numBoxTitle:    { fontSize: 11, color: Colors.suspicious, fontWeight: '700' },
  numRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  numText:     { fontSize: 12, color: Colors.text.primary, fontWeight: '600', fontFamily: 'monospace' },
  numOp:       { fontSize: 10, color: Colors.text.tertiary, fontWeight: '500' },
});

export default SMSScanScreen;
