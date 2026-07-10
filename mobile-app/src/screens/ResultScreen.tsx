import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Share, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAnalysisStore, useSettingsStore } from '@stores';
import { ConfidenceBar, CollapsibleSection } from '@components';
import { useTranslation } from '@hooks';
import { sendSOSLocationToGuardian } from '../services/familyGuardianService';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import type { ResultDetailScreenProps } from '@navigation/types';

const SOS_THRESHOLD = 90; // confidence % above which the emergency call button appears

type MCIcon = React.ComponentProps<typeof Icon>['name'];

const ResultScreen = ({ navigation }: ResultDetailScreenProps) => {
  const t = useTranslation();
  const { currentMessage, currentResult } = useAnalysisStore();
  const voiceAlertEnabled = useSettingsStore((s) => s.voiceAlertEnabled);
  const language           = useSettingsStore((s) => s.language);
  const guardianNumber     = useSettingsStore((s) => s.guardianNumber);
  const [speaking, setSpeaking] = useState(false);
  const spokenRef = useRef(false);

  // S4: speak the verdict aloud once, in Bengali/English per the app's language
  useEffect(() => {
    if (!voiceAlertEnabled || !currentResult || spokenRef.current) return;
    spokenRef.current = true;
    const conf = currentResult.confidence;
    const isBn = language === 'bn';
    const headline = conf >= 75
      ? (isBn ? 'সতর্কতা, এটি একটি হুমকি বার্তা' : 'Warning, this is a threat message')
      : conf >= 60
      ? (isBn ? 'সতর্কতা, এটি একটি সন্দেহজনক বার্তা' : 'Caution, this message is suspicious')
      : (isBn ? 'এই বার্তাটি নিরাপদ মনে হচ্ছে' : 'This message appears safe');
    const text = `${headline}। ${isBn ? 'নিশ্চয়তা' : 'Confidence'} ${Math.round(conf)} ${isBn ? 'শতাংশ' : 'percent'}।`;
    setSpeaking(true);
    Speech.speak(text, {
      language: isBn ? 'bn-BD' : 'en-US',
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    return () => { Speech.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAlertEnabled, currentResult]);

  const handleSOS = () => {
    const buttons: any[] = [
      { text: t('result_sos_cancel'), style: 'cancel' },
    ];
    if (guardianNumber.trim()) {
      buttons.push({
        text: t('result_sos_guardian'),
        onPress: () => { sendSOSLocationToGuardian(guardianNumber.trim()); },
      });
    }
    buttons.push({ text: t('result_sos_call'), style: 'destructive', onPress: () => Linking.openURL('tel:999').catch(() => {}) });

    Alert.alert(t('result_sos_title'), t('result_sos_confirm'), buttons);
  };

  if (!currentResult) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Icon name="shield-outline" size={64} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>{t('result_no_result')}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{t('result_back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const conf        = currentResult.confidence;
  const isThreat    = conf >= 75;
  const isSuspicious = conf >= 60 && conf < 75;
  const isSafe      = conf < 60;

  const heroGradient = isThreat ? Colors.gradient.threatHero : isSuspicious ? Colors.gradient.suspiciousHero : Colors.gradient.safeHero;
  const statusColor  = isThreat ? Colors.threat : isSuspicious ? Colors.suspicious : Colors.safe;
  const heroIcon: MCIcon = isThreat ? 'alert-circle' : isSuspicious ? 'alert' : 'shield-check';
  const headline     = isThreat ? t('result_threat') : isSuspicious ? t('result_suspicious') : t('result_safe');

  const stepsBg = isThreat ? Colors.threatGlow : isSuspicious ? Colors.suspiciousGlow : Colors.safeGlow;

  const handleShare = async () => {
    const statusEmoji = isThreat ? '🔴' : isSuspicious ? '⚠️' : '✅';
    const preview = currentMessage.length > 120 ? `${currentMessage.slice(0, 120)}...` : currentMessage;
    const body = `${statusEmoji} EProhori বিশ্লেষণ ফলাফল\n\n${headline} · ${Math.round(conf)}% নিশ্চয়তা\n\nবার্তা: "${preview}"\n\nEProhori অ্যাপ দিয়ে সাইবার হুমকি থেকে সুরক্ষিত থাকুন।`;
    await Share.share({ message: body });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient colors={heroGradient as [string, string]} style={styles.hero}>
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
            <Text style={styles.backRowText}>ফিরে যান</Text>
          </TouchableOpacity>

          <View style={[styles.heroIconRing, { borderColor: `${statusColor}55`, backgroundColor: `${statusColor}14` }]}>
            <Icon name={heroIcon} size={52} color={statusColor} />
          </View>
          <Text style={[styles.heroHeadline, { color: statusColor }]}>{headline}</Text>
          <View style={[styles.confBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}55` }]}>
            <Text style={[styles.confNum, { color: statusColor }]}>{Math.round(conf)}%</Text>
            <Text style={styles.confLabel}>নিশ্চয়তা</Text>
          </View>

          {/* S4: replay voice alert */}
          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={() => {
              if (speaking) { Speech.stop(); setSpeaking(false); return; }
              spokenRef.current = false;
              setSpeaking(true);
              const isBn = language === 'bn';
              const text = `${headline}। ${isBn ? 'নিশ্চয়তা' : 'Confidence'} ${Math.round(conf)} ${isBn ? 'শতাংশ' : 'percent'}।`;
              Speech.speak(text, {
                language: isBn ? 'bn-BD' : 'en-US',
                onDone: () => setSpeaking(false),
                onStopped: () => setSpeaking(false),
                onError: () => setSpeaking(false),
              });
            }}
          >
            <Icon name={speaking ? 'volume-mute' : 'volume-high'} size={14} color={Colors.text.tertiary} />
            <Text style={styles.voiceBtnText}>{speaking ? t('result_voice_stop') : t('result_voice_listen')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Confidence bar ── */}
          <View style={styles.card}>
            <ConfidenceBar confidence={conf} />
          </View>

          {/* ── Message ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('result_message_label')}</Text>
            <Text style={styles.cardBody}>{currentMessage}</Text>
          </View>

          {/* ── Steps ── */}
          {currentResult.solution_steps && currentResult.solution_steps.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="clipboard-list-outline" size={18} color={statusColor} />
                <Text style={[styles.sectionTitle, { color: statusColor }]}>{t('result_steps_title')}</Text>
              </View>
              <View style={[styles.stepsBox, { backgroundColor: stepsBg, borderLeftColor: statusColor }]}>
                {currentResult.solution_steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: `${statusColor}25` }]}>
                      <Text style={[styles.stepNumText, { color: statusColor }]}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── URL Analysis ── */}
          {currentResult.url_features?.is_url && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="link-variant" size={18} color={Colors.accent} />
                <Text style={[styles.sectionTitle, { color: Colors.accent }]}>URL বিশ্লেষণ</Text>
              </View>

              {/* Badges row */}
              <View style={styles.urlBadgeRow}>
                {/* SSL */}
                <View style={[
                  styles.urlBadge,
                  currentResult.url_features.has_ssl
                    ? styles.urlBadgeSafe
                    : styles.urlBadgeThreat,
                ]}>
                  <Icon
                    name={currentResult.url_features.has_ssl ? 'lock' : 'lock-open-variant'}
                    size={13}
                    color={currentResult.url_features.has_ssl ? Colors.safe : Colors.threat}
                  />
                  <Text style={[
                    styles.urlBadgeText,
                    { color: currentResult.url_features.has_ssl ? Colors.safe : Colors.threat },
                  ]}>
                    {currentResult.url_features.has_ssl ? 'HTTPS' : 'HTTP'}
                  </Text>
                </View>

                {/* Subdomain */}
                <View style={[
                  styles.urlBadge,
                  currentResult.url_features.subdomain_count >= 2
                    ? styles.urlBadgeThreat
                    : styles.urlBadgeSafe,
                ]}>
                  <Icon
                    name="layers-outline"
                    size={13}
                    color={currentResult.url_features.subdomain_count >= 2 ? Colors.threat : Colors.safe}
                  />
                  <Text style={[
                    styles.urlBadgeText,
                    { color: currentResult.url_features.subdomain_count >= 2 ? Colors.threat : Colors.safe },
                  ]}>
                    {currentResult.url_features.subdomain_count === 0
                      ? 'সাবডোমেইন নেই'
                      : `${currentResult.url_features.subdomain_count}টি সাবডোমেইন`}
                  </Text>
                </View>

                {/* Direct IP */}
                {currentResult.url_features.is_direct_ip && (
                  <View style={[styles.urlBadge, styles.urlBadgeThreat]}>
                    <Icon name="ip-network-outline" size={13} color={Colors.threat} />
                    <Text style={[styles.urlBadgeText, { color: Colors.threat }]}>সরাসরি IP</Text>
                  </View>
                )}

                {/* Domain age */}
                {currentResult.domain_age_days != null && (
                  <View style={[
                    styles.urlBadge,
                    currentResult.domain_age_days < 30
                      ? styles.urlBadgeThreat
                      : currentResult.domain_age_days < 180
                        ? styles.urlBadgeWarn
                        : styles.urlBadgeSafe,
                  ]}>
                    <Icon
                      name="calendar-outline"
                      size={13}
                      color={
                        currentResult.domain_age_days < 30
                          ? Colors.threat
                          : currentResult.domain_age_days < 180
                            ? Colors.suspicious
                            : Colors.safe
                      }
                    />
                    <Text style={[
                      styles.urlBadgeText,
                      {
                        color: currentResult.domain_age_days < 30
                          ? Colors.threat
                          : currentResult.domain_age_days < 180
                            ? Colors.suspicious
                            : Colors.safe,
                      },
                    ]}>
                      {currentResult.domain_age_days < 1
                        ? 'আজই তৈরি'
                        : `${currentResult.domain_age_days} দিন`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Risk signals list — M3: capped at 10 items, 200 chars each */}
              {currentResult.url_features.risk_signals.length > 0 && (
                <View style={styles.urlRiskBox}>
                  {currentResult.url_features.risk_signals.slice(0, 10).map((signal, i) => (
                    <Text key={i} style={styles.urlRiskText} numberOfLines={3}>
                      {String(signal).slice(0, 200)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── 4-Layer AI Defense ── */}
          {(() => {
            const layers = [
              {
                id: '0',
                icon: 'virus-outline' as MCIcon,
                name: 'VirusTotal স্ক্যান',
                desc: 'বৈশ্বিক ম্যালওয়্যার ডেটাবেজ',
                active: !!(currentResult.url_features?.is_url),
                color: '#a78bfa',
              },
              {
                id: '0.5',
                icon: 'calendar-check-outline' as MCIcon,
                name: 'ডোমেইন বয়স যাচাই',
                desc: 'নতুন ডোমেইন = উচ্চ ঝুঁকি',
                active: currentResult.domain_age_days != null,
                color: '#60a5fa',
              },
              {
                id: '1',
                icon: 'brain' as MCIcon,
                name: 'Zero-Shot ML মডেল',
                desc: 'TF-IDF + লজিস্টিক রিগ্রেশন',
                active: true,
                color: Colors.accent,
              },
              {
                id: '2',
                icon: 'robot-outline' as MCIcon,
                name: 'Groq / Gemma-2',
                desc: 'দ্রুত প্রসঙ্গ বিশ্লেষণ',
                active: conf >= 50,
                color: '#34d399',
              },
              {
                id: '3',
                icon: 'google' as MCIcon,
                name: 'Gemini Flash',
                desc: 'উচ্চ-নিশ্চয়তা যাচাইকরণ',
                active: conf >= 70,
                color: '#fbbf24',
              },
              {
                id: '4',
                icon: 'shield-half-full' as MCIcon,
                name: 'ফলব্যাক সুরক্ষা',
                desc: 'স্থানীয় প্যাটার্ন মিলান',
                active: true,
                color: Colors.safe,
              },
            ];
            const activeCount = layers.filter((l) => l.active).length;
            return (
              <CollapsibleSection
                icon="layers-triple"
                title="AI সুরক্ষা স্তর"
                badge={`${activeCount}/${layers.length} সক্রিয়`}
              >
                <View style={styles.layerCard}>
                  {layers.map((layer) => (
                    <View key={layer.id} style={[styles.layerRow, layer.active && styles.layerRowActive]}>
                      <View style={[styles.layerIconWrap, { backgroundColor: layer.active ? `${layer.color}25` : `${Colors.text.tertiary}12` }]}>
                        <Icon name={layer.icon} size={16} color={layer.active ? layer.color : Colors.text.tertiary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.layerName, { color: layer.active ? Colors.text.primary : Colors.text.tertiary }]}>
                          স্তর {layer.id}: {layer.name}
                        </Text>
                        <Text style={styles.layerDesc}>{layer.desc}</Text>
                      </View>
                      <View style={[styles.layerStatus, { backgroundColor: layer.active ? `${layer.color}20` : `${Colors.text.tertiary}12` }]}>
                        <Icon
                          name={layer.active ? 'check-circle' : 'minus-circle-outline'}
                          size={14}
                          color={layer.active ? layer.color : Colors.text.tertiary}
                        />
                        <Text style={[styles.layerStatusText, { color: layer.active ? layer.color : Colors.text.tertiary }]}>
                          {layer.active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </CollapsibleSection>
            );
          })()}

          {/* ── Tips ── */}
          {currentResult.prevention_tips && currentResult.prevention_tips.length > 0 && (
            <CollapsibleSection
              icon="lightbulb-outline"
              title={t('result_tips_title')}
              badge={String(currentResult.prevention_tips.length)}
            >
              {currentResult.prevention_tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </CollapsibleSection>
          )}

          {/* ── S5: Emergency SOS ── */}
          {conf >= SOS_THRESHOLD && (
            <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.85}>
              <Icon name="phone-alert" size={20} color="#fff" />
              <Text style={styles.sosBtnText}>{t('result_sos_btn')}</Text>
            </TouchableOpacity>
          )}

          {/* ── Actions ── */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Icon name="share-variant-outline" size={18} color={Colors.accent} />
            <Text style={styles.shareBtnText}>{t('result_share')}</Text>
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Icon name="arrow-left" size={18} color={Colors.accent} />
              <Text style={styles.btnSecondaryText}>{t('result_back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnWrap} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradient.accent} style={styles.btnPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="plus" size={18} color={Colors.primary} />
                <Text style={styles.btnPrimaryText}>{t('result_new')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#050810' },
  scroll: { paddingBottom: Spacing['3xl'] },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  emptyText: { ...TextStyles.h3, color: Colors.text.secondary },
  backBtn:   { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.secondary },
  backBtnText: { ...TextStyles.button, color: Colors.accent },

  hero: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing['2xl'], alignItems: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', marginBottom: Spacing.xl },
  backRowText: { ...TextStyles.body, color: Colors.text.secondary },

  heroIconRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  heroHeadline: { ...TextStyles.h2, textAlign: 'center', marginBottom: Spacing.md },
  confBadge:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 99, borderWidth: 1 },
  confNum:      { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  confLabel:    { ...TextStyles.body, color: Colors.text.secondary },

  voiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
    borderWidth: 1, borderColor: Colors.border,
  },
  voiceBtnText: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },

  sosBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: '#dc2626', borderRadius: BorderRadius.lg,
    paddingVertical: 15, marginBottom: Spacing.md,
  },
  sosBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  card: { backgroundColor: '#0d1321', borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...Shadows.small },
  cardLabel: { ...TextStyles.bodyMedium, color: Colors.text.tertiary, marginBottom: Spacing.sm },
  cardBody:  { ...TextStyles.body, color: Colors.text.secondary, lineHeight: 24 },

  section:       { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle:  { ...TextStyles.h3 },

  stepsBox:   { padding: Spacing.md, borderRadius: BorderRadius.md, borderLeftWidth: 3, gap: Spacing.md },
  stepRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepNum:    { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText:{ fontSize: 12, fontWeight: '800' },
  stepText:   { ...TextStyles.body, color: Colors.text.primary, flex: 1 },

  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  tipDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 8, flexShrink: 0 },
  tipText: { ...TextStyles.body, color: Colors.text.secondary, flex: 1 },

  layerCard: {
    borderRadius: BorderRadius.md, overflow: 'hidden',
  },
  layerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  layerRowActive: { backgroundColor: `${Colors.accent}06` },
  layerIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  layerName:    { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  layerDesc:    { fontSize: 10, color: Colors.text.tertiary },
  layerStatus:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  layerStatusText: { fontSize: 10, fontWeight: '700' },

  urlBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  urlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  urlBadgeSafe: {
    backgroundColor: 'rgba(0,221,153,0.10)',
    borderColor: 'rgba(0,221,153,0.30)',
  },
  urlBadgeThreat: {
    backgroundColor: 'rgba(255,85,85,0.10)',
    borderColor: 'rgba(255,85,85,0.30)',
  },
  urlBadgeWarn: {
    backgroundColor: 'rgba(255,179,0,0.10)',
    borderColor: 'rgba(255,179,0,0.30)',
  },
  urlBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  urlRiskBox: {
    backgroundColor: 'rgba(255,85,85,0.07)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.threat,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  urlRiskText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: BorderRadius.lg, paddingVertical: 13,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  shareBtnText: { ...TextStyles.bodyMedium, color: Colors.accent },

  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: 0 },
  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: BorderRadius.lg, paddingVertical: 15,
    borderWidth: 1.5, borderColor: Colors.accent,
  },
  btnSecondaryText: { ...TextStyles.button, color: Colors.accent },
  btnWrap:    { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 15 },
  btnPrimaryText: { ...TextStyles.button, color: Colors.primary },
});

export default ResultScreen;
