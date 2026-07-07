import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { analyzeQrContent, type QrAnalysis } from '../utils/qrAnalyzer';
import { threatAnalysisAPI, type ThreatAnalysisResponse } from '@api';
import { useSettingsStore } from '@stores';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkCheck'>;

const riskColor = (risk: QrAnalysis['risk']) =>
  risk === 'danger' ? Colors.threat : risk === 'suspicious' ? Colors.suspicious : Colors.safe;

// P2: link interceptor — every http/https link opened with EProhori lands
// here, gets checked locally (instant) + optionally with backend AI, then
// the user decides whether to continue to the browser.
const LinkCheckScreen = ({ navigation, route }: Props) => {
  const t = useTranslation();
  const url = route.params?.url ?? '';

  const [local, setLocal]         = useState<QrAnalysis | null>(null);
  const [deep, setDeep]           = useState<ThreatAnalysisResponse | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const privacyModeEnabled = useSettingsStore((s) => s.privacyModeEnabled);

  // Instant local verdict (domain fakes, shorteners, APK links, SSL, IP…)
  useEffect(() => {
    if (!url) return;
    const analysis = analyzeQrContent(url);
    setLocal(analysis);
    Haptics.notificationAsync(
      analysis.risk === 'danger'
        ? Haptics.NotificationFeedbackType.Error
        : analysis.risk === 'suspicious'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  }, [url]);

  const runDeepScan = async () => {
    setDeepLoading(true);
    try {
      const result = await threatAnalysisAPI.analyzeThreat(url, 'bn', 2, privacyModeEnabled);
      setDeep(result);
    } catch {} finally {
      setDeepLoading(false);
    }
  };

  const openSafely = async () => {
    // Custom Tab — does not loop back into our own http intent-filter
    await WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const deepIsThreat = deep ? deep.confidence >= 60 : false;
  const overallDanger = local?.risk === 'danger' || deepIsThreat;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="link-lock" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('linkcheck_title')}</Text>
          <Text style={styles.subtitle}>{t('linkcheck_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* The URL being checked */}
          <View style={styles.urlBox}>
            <Icon name="link-variant" size={16} color={Colors.text.tertiary} />
            <Text style={styles.urlText} numberOfLines={3}>{url}</Text>
          </View>

          {/* Local verdict */}
          {local && (
            <View style={[styles.verdictCard, { borderColor: `${riskColor(local.risk)}50` }]}>
              <Icon
                name={local.risk === 'danger' ? 'alert-octagon' : local.risk === 'suspicious' ? 'alert' : 'check-circle'}
                size={40} color={riskColor(local.risk)}
              />
              <Text style={[styles.verdictTitle, { color: riskColor(local.risk) }]}>
                {local.risk_bn}
              </Text>
              {local.signals.length > 0 && (
                <View style={styles.signalsBox}>
                  {local.signals.map((sig, i) => (
                    <Text key={i} style={styles.signalText}>{sig}</Text>
                  ))}
                </View>
              )}
              <Text style={styles.localNote}>{t('linkcheck_local_note')}</Text>
            </View>
          )}

          {/* Deep AI scan */}
          {!deep ? (
            <TouchableOpacity
              style={[styles.deepBtn, deepLoading && { opacity: 0.6 }]}
              onPress={runDeepScan}
              disabled={deepLoading}
            >
              {deepLoading
                ? <ActivityIndicator size="small" color={Colors.accent} />
                : <Icon name="robot-outline" size={18} color={Colors.accent} />}
              <Text style={styles.deepBtnText}>
                {deepLoading ? t('linkcheck_deep_scan_loading') : t('linkcheck_deep_scan_btn')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[
              styles.deepResult,
              deepIsThreat
                ? { borderColor: `${Colors.threat}40`, backgroundColor: `${Colors.threat}0d` }
                : { borderColor: `${Colors.safe}40`, backgroundColor: `${Colors.safe}0d` },
            ]}>
              <Text style={[styles.deepResultTitle, { color: deepIsThreat ? Colors.threat : Colors.safe }]}>
                {deepIsThreat
                  ? `${t('linkcheck_ai_prefix')}: ${deep.threat_type} — ${Math.round(deep.confidence)}% ${t('linkcheck_confidence_label')}`
                  : `${t('linkcheck_ai_safe_prefix')} (${Math.round(deep.confidence)}%)`}
              </Text>
              {deep.message ? <Text style={styles.deepResultMsg}>{deep.message}</Text> : null}
            </View>
          )}

          {/* Action buttons */}
          {overallDanger ? (
            <>
              <View style={styles.dangerWarn}>
                <Icon name="hand-back-left" size={20} color={Colors.threat} />
                <Text style={styles.dangerWarnText}>
                  {t('linkcheck_danger_warning')}
                </Text>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Icon name="shield-check-outline" size={16} color={Colors.accent} />
                <Text style={styles.cancelBtnText}>{t('linkcheck_go_back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.riskyOpenBtn} onPress={openSafely}>
                <Text style={styles.riskyOpenText}>{t('linkcheck_open_anyway')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.openBtn} onPress={openSafely} activeOpacity={0.85}>
                <LinearGradient colors={Colors.gradient.accent} style={styles.openBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Icon name="open-in-new" size={18} color={Colors.primary} />
                  <Text style={styles.openBtnText}>{t('linkcheck_open_browser')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtnText}>{t('linkcheck_cancel')}</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.hint}>
            {t('linkcheck_hint')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  body: { padding: Spacing.lg },

  urlBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.md,
    ...Shadows.small,
  },
  urlText: { ...TextStyles.caption, color: Colors.text.secondary, flex: 1, fontFamily: 'monospace' },

  verdictCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
    ...Shadows.small,
  },
  verdictTitle: { ...TextStyles.h3, textAlign: 'center' },
  signalsBox:   { alignSelf: 'stretch', gap: 5, marginTop: 4 },
  signalText:   { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 19 },
  localNote:    { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 4 },

  deepBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderAccent,
    backgroundColor: Colors.accentGlow, paddingVertical: 13, marginTop: Spacing.md,
  },
  deepBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },

  deepResult: {
    borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  deepResultTitle: { ...TextStyles.body, fontWeight: '700' },
  deepResultMsg:   { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 6, lineHeight: 18 },

  dangerWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: `${Colors.threat}20`, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: `${Colors.threat}50`,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  dangerWarnText: { fontSize: 12, color: Colors.threat, flex: 1, lineHeight: 18, fontWeight: '600' },

  openBtn:     { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.lg },
  openBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  openBtnText: { ...TextStyles.button, color: Colors.primary },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, marginTop: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.accent,
  },
  cancelBtnText: { ...TextStyles.button, color: Colors.accent },

  riskyOpenBtn:  { alignItems: 'center', paddingVertical: 12, marginTop: Spacing.sm },
  riskyOpenText: { ...TextStyles.caption, color: Colors.text.tertiary, textDecorationLine: 'underline' },

  hint: { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: Spacing.lg, lineHeight: 19 },
});

export default LinkCheckScreen;
