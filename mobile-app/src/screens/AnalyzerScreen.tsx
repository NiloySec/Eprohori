import React, { useState, useCallback, useRef } from 'react';
import {
  View, ScrollView, Text, TextInput, StyleSheet,
  TouchableOpacity, Keyboard, Vibration, ActivityIndicator, Alert,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { threatAnalysisAPI, ThreatAnalysisResponse } from '@api';
import { pickAndExtractText, isOcrAvailable } from '../services/ocrService';
import { useAnalysisStore, useHistoryStore, useSettingsStore } from '@stores';
import { useTranslation } from '@hooks';
import { OfflineBanner, CollapsibleSection } from '@components';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import type { AnalyzerScreenProps } from '@navigation/types';

import * as ImagePicker from 'expo-image-picker';

type InputMode = 'text' | 'phone' | 'vision';

const AnalyzerScreen = ({ navigation }: AnalyzerScreenProps) => {
  const [message,      setMessage]      = useState('');
  const [lang,         setLang]         = useState<'bn' | 'en'>('bn');
  const [loading,      setLoading]      = useState(false);
  const [focused,      setFocused]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [inputMode,    setInputMode]    = useState<InputMode>('text');
  const [waTutorialOpen, setWaTutorialOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false); // N5: screenshot OCR in progress
  const lastAnalyzeRef = useRef(0); // M8: debounce — prevent rapid fire

  // Micro-interaction: Scale animation for analyze button
  const btnScale = useRef(new Animated.Value(1)).current;

  const t = useTranslation();
  const setAnalysisMessage   = useAnalysisStore((s) => s.setMessage);
  const setResult            = useAnalysisStore((s) => s.setResult);
  const consumeSharedText    = useAnalysisStore((s) => s.consumeSharedText);
  const addHistory           = useHistoryStore((s) => s.addEntry);
  const soundAlertEnabled        = useSettingsStore((s) => s.soundAlertEnabled);
  const notificationsEnabled     = useSettingsStore((s) => s.notificationsEnabled);
  const blocklist                = useSettingsStore((s) => s.blocklist);
  const hasShownRatingPrompt     = useSettingsStore((s) => s.hasShownRatingPrompt);
  const setHasShownRatingPrompt  = useSettingsStore((s) => s.setHasShownRatingPrompt);
  const privacyModeEnabled       = useSettingsStore((s) => s.privacyModeEnabled);

  // Pre-fill from Android share intent / deep link
  useFocusEffect(
    React.useCallback(() => {
      const shared = consumeSharedText();
      if (shared) {
        setMessage(shared);
        setInputMode('text');
      }
    }, [consumeSharedText])
  );

  const isBlocklisted = (text: string) =>
    blocklist.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('গ্যালারি এক্সেস প্রয়োজন');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleVisionAnalysis(result.assets[0].uri);
    }
  };

  const handleVisionAnalysis = async (uri: string) => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, use the actual API URL.
      const API_BASE_URL = 'https://eprohori-production.up.railway.app';

      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri,
        name: 'screenshot.png',
        type: 'image/png',
      });

      // Using fetch instead of axios for simplicity in React Native if axios not configured
      const response = await fetch(`${API_BASE_URL}/api/validate/screenshot`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();

      setAnalysisMessage('Vision Analysis Result');
      setResult({
        threat_type: data.threat_type,
        confidence: data.confidence * 100,
        message: data.description,
        solution_steps: data.indicators || [],
        prevention_tips: [],
      });
      navigation.navigate('ResultDetail');
    } catch (err) {
      setError('ভিশন এনালাইসিস ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    // M8: 800 ms debounce — prevents API quota exhaustion from rapid taps
    const now = Date.now();
    if (now - lastAnalyzeRef.current < 800) return;
    lastAnalyzeRef.current = now;

    const text = message.trim();
    if (!text) { setError(t('analyzer_required')); return; }
    Keyboard.dismiss();

    // Micro-interaction: button press feel
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Blocklist fast-path — no API call needed
    if (isBlocklisted(text)) {
      Alert.alert(t('analyzer_blocklisted_title'), t('analyzer_blocklisted_msg'));
      const blockResult: ThreatAnalysisResponse = {
        threat_type: 'phishing',
        confidence: 95,
        message: t('analyzer_blocklisted_msg'),
        solution_steps: [t('analyzer_blocklisted_msg')],
        prevention_tips: [],
      };
      setAnalysisMessage(text);
      setResult(blockResult);
      addHistory(text, blockResult);
      navigation.navigate('ResultDetail');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = inputMode === 'phone' ? `ফোন নম্বর চেক করুন: ${text}` : text;
      setAnalysisMessage(text);
      const result = await threatAnalysisAPI.analyzeThreat(query, lang, 3, privacyModeEnabled);
      setResult(result);
      addHistory(text, result);

      // Rating prompt after 5th scan (shown once, native throttling prevents abuse)
      if (!hasShownRatingPrompt) {
        const count = useHistoryStore.getState().entries.length;
        if (count === 5) {
          setHasShownRatingPrompt(true);
          StoreReview.hasAction().then((can) => { if (can) StoreReview.requestReview(); });
        }
      }

      const isThreat = result.confidence >= 60;
      if (isThreat && soundAlertEnabled) {
        Haptics.notificationAsync(
          result.confidence >= 75
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning
        ).catch(() => Vibration.vibrate([0, 200, 100, 200]));
      }
      if (isThreat && notificationsEnabled) {
        const title = result.confidence >= 75 ? '🔴 হুমকি সনাক্ত হয়েছে!' : '⚠️ সন্দেহজনক বার্তা';
        Alert.alert(title, `ধরন: ${result.threat_type} · নিশ্চয়তা: ${Math.round(result.confidence)}%`, [{ text: 'ঠিক আছে' }]);
      }
      navigation.navigate('ResultDetail');
    } catch (err: unknown) {
      // H1: structured error handling — never let loading stay stuck
      const code = (err as { code?: string })?.code ?? '';
      const msg  = (err as { message?: string })?.message ?? '';
      if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || msg.includes('Network')) {
        setError(t('analyzer_offline'));
      } else if (code === 'RATE_LIMITED') {
        setError('অনুরোধ সীমা শেষ — কিছুক্ষণ পর আবার চেষ্টা করুন।');
      } else {
        setError(t('analyzer_failed'));
      }
    } finally {
      setLoading(false); // H1: always runs — loading never gets stuck
    }
  };

  // N5: pick a screenshot → OCR → fill the input with extracted text
  const handleScreenshotScan = async () => {
    if (ocrBusy) return;
    setOcrBusy(true);
    setError(null);
    try {
      const res = await pickAndExtractText();
      if (res.error === 'unavailable') {
        Alert.alert('', 'স্ক্রিনশট স্ক্যান শুধু ইনস্টল করা অ্যাপে কাজ করে (Expo Go-তে নয়)।');
      } else if (res.error === 'no_text') {
        Alert.alert('', 'ছবিতে কোনো লেখা পাওয়া যায়নি — পরিষ্কার স্ক্রিনশট ব্যবহার করুন।');
      } else if (res.error === 'failed') {
        Alert.alert('', 'ছবি থেকে লেখা বের করা যায়নি — আবার চেষ্টা করুন।');
      } else if (res.text) {
        setMessage(res.text.slice(0, 5000));
        setInputMode('text');
      }
    } finally {
      setOcrBusy(false);
    }
  };

  const canAnalyze = message.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient colors={['#1a0a1f', '#050810']} style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="brain" size={32} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('analyzer_title')}</Text>
          <Text style={styles.subtitle}>{t('analyzer_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Mode tabs ── */}
          <View style={styles.tabContainer}>
            <View style={styles.tabBg}>
              <Animated.View style={[styles.tabSlider, {
                width: '50%',
                left: inputMode === 'text' ? 0 : '50%',
                backgroundColor: Colors.accent
              }]} />
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => { setInputMode('text'); setMessage(''); setError(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Icon name="text-search" size={18} color={inputMode === 'text' ? Colors.primary : Colors.text.tertiary} />
                <Text style={[styles.tabBtnText, inputMode === 'text' && styles.tabBtnTextActive]}>{t('analyzer_tab_text')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => { setInputMode('phone'); setMessage(''); setError(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Icon name="phone-check" size={18} color={inputMode === 'phone' ? Colors.primary : Colors.text.tertiary} />
                <Text style={[styles.tabBtnText, inputMode === 'phone' && styles.tabBtnTextActive]}>{t('analyzer_tab_phone')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Multi-source hint (text mode) ── */}
          {inputMode === 'text' && (
            <>
              <View style={styles.sourceRow}>
                <Text style={styles.sourceLabel}>যেকোনো অ্যাপ থেকে কপি করুন:</Text>
                <View style={styles.sourceChips}>
                  {[
                    { icon: 'message-text-outline' as const, color: Colors.accent, name: 'SMS' },
                    { icon: 'whatsapp' as const, color: '#4ade80', name: 'WhatsApp' },
                    { icon: 'send-outline' as const, color: '#38bdf8', name: 'Telegram' },
                    { icon: 'facebook-messenger' as const, color: '#818cf8', name: 'Messenger' },
                    { icon: 'email-outline' as const, color: Colors.text.tertiary, name: 'Email' },
                  ].map((s) => (
                    <View key={s.name} style={styles.sourceChip}>
                      <Icon name={s.icon} size={13} color={s.color} />
                      <Text style={styles.sourceChipText}>{s.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── N5: Screenshot OCR ── */}
              {isOcrAvailable() && (
                <TouchableOpacity
                  style={[styles.ocrBtn, ocrBusy && { opacity: 0.6 }]}
                  onPress={handleScreenshotScan}
                  disabled={ocrBusy || loading}
                  activeOpacity={0.8}
                >
                  {ocrBusy
                    ? <ActivityIndicator size="small" color="#22d3ee" />
                    : <Icon name="image-search-outline" size={18} color="#22d3ee" />}
                  <Text style={styles.ocrBtnText}>
                    {ocrBusy ? 'লেখা বের করা হচ্ছে...' : 'স্ক্রিনশট থেকে স্ক্যান করুন'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* ── WhatsApp Tutorial Card ── */}
              <TouchableOpacity
                style={styles.waTutCard}
                onPress={() => setWaTutorialOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={styles.waTutHeader}>
                  <View style={styles.waTutTitleRow}>
                    <Icon name="whatsapp" size={15} color="#4ade80" />
                    <Text style={styles.waTutTitle}>WhatsApp বার্তা কিভাবে স্ক্যান করবেন?</Text>
                  </View>
                  <Icon
                    name={waTutorialOpen ? 'chevron-up' : 'chevron-down'}
                    size={16} color="#4ade80"
                  />
                </View>
                {waTutorialOpen && (
                  <View style={styles.waTutSteps}>
                    {[
                      { num: '১', text: 'WhatsApp বার্তাটি খুলুন → বার্তার উপর চাপ ধরুন' },
                      { num: '২', text: '"কপি" বা "Copy" বাটনে চাপুন' },
                      { num: '৩', text: 'EProhori-এ ফিরে আসুন → এখানে পেস্ট করুন → বিশ্লেষণ করুন' },
                    ].map((step) => (
                      <View key={step.num} style={styles.waTutStep}>
                        <View style={styles.waTutNum}>
                          <Text style={styles.waTutNumText}>{step.num}</Text>
                        </View>
                        <Text style={styles.waTutStepText}>{step.text}</Text>
                      </View>
                    ))}
                    <Text style={styles.waTutTip}>
                      টিপ: WhatsApp → বার্তায় হোল্ড → শেয়ার → EProhori ব্যবহার করলে স্বয়ংক্রিয়ভাবে পাঠানো যায়
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── Input ── */}
          <Text style={styles.label}>
            {inputMode === 'text' ? t('analyzer_input_label') : t('analyzer_phone_label')}
          </Text>
          <TextInput
            style={[
              styles.input,
              inputMode === 'phone' && styles.inputPhone,
              focused && styles.inputFocused,
              loading && { opacity: 0.5 },
            ]}
            placeholder={inputMode === 'text' ? t('analyzer_placeholder') : t('analyzer_phone_placeholder')}
            placeholderTextColor={Colors.text.tertiary}
            multiline={inputMode === 'text'}
            numberOfLines={inputMode === 'text' ? 6 : 1}
            textAlignVertical={inputMode === 'text' ? 'top' : 'center'}
            keyboardType={inputMode === 'phone' ? 'phone-pad' : 'default'}
            value={message}
            onChangeText={(v) => { setMessage(v.slice(0, 5000)); setError(null); }} // M11: 5KB paste limit
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={!loading}
          />
          {message.length > 0 && (
            <TouchableOpacity style={styles.clearRow} onPress={() => { setMessage(''); setError(null); }}>
              <Icon name="close-circle" size={16} color={Colors.text.tertiary} />
              <Text style={styles.clearText}>{t('analyzer_clear')}</Text>
            </TouchableOpacity>
          )}

          {/* ── Language (text mode only) ── */}
          {inputMode === 'text' && (
            <>
              <Text style={styles.label}>{t('analyzer_lang_label')}</Text>
              <View style={styles.langRow}>
                {([['bn', '🇧🇩  বাংলা'], ['en', '🇺🇸  English']] as const).map(([val, lbl]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.langBtn, lang === val && styles.langBtnActive]}
                    onPress={() => setLang(val)}
                    disabled={loading}
                  >
                    <Text style={[styles.langBtnText, lang === val && styles.langBtnTextActive]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Error ── */}
          {error && (
            <View style={styles.errorBox}>
              <Icon name={error.includes('ইন্টারনেট') || error.includes('No internet') ? 'wifi-off' : 'alert-circle'} size={16} color={Colors.threat} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Analyze button ── */}
          <Animated.View style={[styles.btnWrap, { transform: [{ scale: btnScale }] }, !canAnalyze && { opacity: 0.45 }]}>
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={!canAnalyze}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[Colors.accent, '#0891b2']} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.btnText}>{t('analyzer_loading')}</Text>
                  </>
                ) : (
                  <>
                    <Icon name={inputMode === 'phone' ? 'phone-check' : 'shield-search'} size={20} color={Colors.primary} />
                    <Text style={styles.btnText}>{t('analyzer_btn')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Tips ── */}
          <View style={{ marginTop: Spacing['2xl'] }}>
            <CollapsibleSection icon="lightbulb-outline" title={t('analyzer_tips_title')}>
              {[t('analyzer_tip1'), t('analyzer_tip2'), t('analyzer_tip3')].map((tip, i) => (
                <Text key={i} style={styles.tipText}>{tip}</Text>
              ))}
            </CollapsibleSection>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#050810' },
  scroll: { paddingBottom: Spacing['3xl'] },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(0,255,204,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,255,204,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title:    { fontSize: 28, fontWeight: '800', color: Colors.accent, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.text.secondary, marginTop: 4, lineHeight: 22 },

  body: { padding: 24 },

  tabContainer: { marginBottom: 30 },
  tabBg: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#0d1321',
    borderRadius: 28,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabSlider: {
    position: 'absolute',
    height: 48,
    top: 4,
    borderRadius: 24,
    ...Shadows.small,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: Colors.text.tertiary },
  tabBtnTextActive: { color: Colors.primary },

  visionBox: {
    backgroundColor: '#0d1321',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: 20,
  },
  visionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 15 },
  visionSub: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 8 },
  uploadBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 25,
  },
  uploadBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  label: { fontSize: 14, fontWeight: '700', color: Colors.text.secondary, marginBottom: 12, marginTop: 24, textTransform: 'uppercase', letterSpacing: 1 },

  input: {
    backgroundColor: '#0d1321', color: Colors.text.primary,
    padding: 20, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 160, fontSize: 16, lineHeight: 26,
  },
  inputPhone:   { minHeight: 64, lineHeight: 22 },
  inputFocused: { borderColor: Colors.accent, backgroundColor: '#131b2e' },

  clearRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm, alignSelf: 'flex-end' },
  clearText: { ...TextStyles.caption, color: Colors.text.tertiary },

  sourceRow:       { marginBottom: Spacing.sm },
  sourceLabel:     { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: 6 },
  sourceChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sourceChip:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: Colors.secondary, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  sourceChipText:  { fontSize: 11, color: Colors.text.secondary, fontWeight: '600' },

  ocrBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#164e6320', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#22d3ee35',
    paddingVertical: 12, marginBottom: Spacing.md,
  },
  ocrBtnText: { fontSize: 13, fontWeight: '700', color: '#22d3ee' },

  waTutCard: {
    backgroundColor: '#064e3b20', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#22c55e30',
    marginBottom: Spacing.md, padding: Spacing.md,
  },
  waTutHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waTutTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  waTutTitle:    { fontSize: 12, fontWeight: '700', color: '#4ade80', flex: 1 },
  waTutSteps:  { marginTop: Spacing.md, gap: Spacing.sm },
  waTutStep:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  waTutNum:    { width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e30', justifyContent: 'center', alignItems: 'center' },
  waTutNumText:{ fontSize: 10, fontWeight: '700', color: '#4ade80' },
  waTutStepText:{ ...TextStyles.caption, color: Colors.text.secondary, flex: 1, lineHeight: 18 },
  waTutTip:    { ...TextStyles.caption, color: '#86efac', fontStyle: 'italic', marginTop: 4, lineHeight: 17 },

  langRow: { flexDirection: 'row', gap: Spacing.md },
  langBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  langBtnActive:     { borderColor: Colors.accent, backgroundColor: `${Colors.accent}18` },
  langBtnText:       { ...TextStyles.body, color: Colors.text.secondary },
  langBtnTextActive: { color: Colors.accent, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.threatGlow, borderLeftWidth: 3, borderLeftColor: Colors.threat,
    padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.lg,
  },
  errorText: { ...TextStyles.body, color: Colors.threat, flex: 1 },

  btnWrap: {
    marginTop: 32,
    borderRadius: 20,
    ...Shadows.large,
    shadowColor: Colors.accent,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20,
    borderRadius: 20,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: Colors.primary },

  tipText: { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 22, marginBottom: 4 },
});

export default AnalyzerScreen;
