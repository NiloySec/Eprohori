import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { analyzeCallScript, type CallScriptResult } from '../utils/callScriptDetector';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CallScriptCheck'>;
type MCIcon = React.ComponentProps<typeof Icon>['name'];

const levelColor = (level: CallScriptResult['level']) =>
  level === 'danger' ? Colors.threat : level === 'caution' ? Colors.suspicious : Colors.safe;

// N: local vector-icon mapping for in-app UI, keyed by the emoji callScriptDetector
// returns — analyzeCallScript() itself is untouched (pure detection logic).
const SCRIPT_ICON: Record<string, MCIcon> = {
  '🔑': 'key-outline', '🎭': 'drama-masks', '🚫': 'block-helper', '🎰': 'slot-machine',
  '⏰': 'clock-alert-outline', '💸': 'cash-remove', '👮': 'police-badge',
  '↩️': 'undo-variant', '🪪': 'card-account-details-outline', '🤫': 'eye-off-outline',
};

// N8: user types what the caller said — local fraud-script pattern matching
const CallScriptCheckScreen = ({ navigation }: Props) => {
  const t = useTranslation();
  const [text, setText]     = useState('');
  const [result, setResult] = useState<CallScriptResult | null>(null);

  const handleCheck = () => {
    const trimmed = text.trim();
    if (trimmed.length < 5) return;
    Keyboard.dismiss();
    const res = analyzeCallScript(trimmed);
    setResult(res);
    Haptics.notificationAsync(
      res.level === 'danger'
        ? Haptics.NotificationFeedbackType.Error
        : res.level === 'caution'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  };

  const canCheck = text.trim().length >= 5;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="microphone-outline" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('callscript_title')}</Text>
          <Text style={styles.subtitle}>
            {t('callscript_subtitle')}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.label}>{t('callscript_label')}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(v) => { setText(v.slice(0, 3000)); }}
            placeholder={t('callscript_placeholder')}
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <TouchableOpacity
            onPress={handleCheck}
            disabled={!canCheck}
            activeOpacity={0.85}
            style={[styles.btnWrap, !canCheck && { opacity: 0.45 }]}
          >
            <LinearGradient colors={Colors.gradient.accent} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="shield-search" size={20} color={Colors.primary} />
              <Text style={styles.btnText}>{t('callscript_check_btn')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {result && (
            <View style={[styles.resultCard, { borderColor: `${levelColor(result.level)}50` }]}>
              <Text style={[styles.resultLevel, { color: levelColor(result.level) }]}>
                {result.level_bn}
              </Text>

              {/* Risk meter */}
              <View style={styles.meterRow}>
                <View style={styles.meterTrack}>
                  <View style={[
                    styles.meterFill,
                    { width: `${result.score}%` as any, backgroundColor: levelColor(result.level) },
                  ]} />
                </View>
                <Text style={[styles.meterLabel, { color: levelColor(result.level) }]}>
                  {result.score}%
                </Text>
              </View>

              {/* Matched patterns */}
              {result.matches.length > 0 && (
                <View style={styles.matchesBox}>
                  <Text style={styles.matchesTitle}>{t('callscript_matched_title')}</Text>
                  {result.matches.map((m, i) => (
                    <View key={i} style={styles.matchRow}>
                      <Icon name={SCRIPT_ICON[m.icon] ?? 'alert-circle-outline'} size={16} color={Colors.text.secondary} />
                      <Text style={styles.matchLabel}>{m.label_bn}</Text>
                      {m.weight === 3 && (
                        <View style={styles.weightChip}>
                          <Text style={styles.weightChipText}>{t('callscript_strong_signal')}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Advice */}
              <View style={styles.adviceBox}>
                {result.advice_bn.map((adv, i) => (
                  <Text key={i} style={styles.adviceText}>{adv}</Text>
                ))}
              </View>

              {result.level !== 'safe' && (
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => navigation.navigate('CallerID')}
                >
                  <Icon name="phone-alert" size={16} color={Colors.threat} />
                  <Text style={styles.reportBtnText}>{t('callscript_verify_report')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Common script examples */}
          {!result && (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>{t('callscript_examples_title')}</Text>
              {[
                '"বিকাশ হেড অফিস থেকে বলছি — একাউন্ট ভেরিফাই করতে OTP দিন"',
                '"আপনি ২৫ লাখ টাকার লটারি জিতেছেন — রেজিস্ট্রেশন ফি পাঠান"',
                '"আমি ভুলে আপনার নম্বরে টাকা পাঠিয়েছি — ফেরত দিন"',
                '"থানা থেকে বলছি — মামলা থেকে বাঁচতে টাকা পাঠান"',
              ].map((ex, i) => (
                <TouchableOpacity key={i} onPress={() => setText(ex.replace(/^"|"$/g, ''))}>
                  <Text style={styles.exampleText}>{ex}</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.exampleHint}>{t('callscript_examples_hint')}</Text>
            </View>
          )}
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
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },

  body:  { padding: Spacing.lg },
  label: { ...TextStyles.bodyMedium, color: Colors.text.secondary, marginBottom: Spacing.sm },

  input: {
    backgroundColor: Colors.secondary, color: Colors.text.primary,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    minHeight: 120, fontSize: 15, lineHeight: 24,
    ...Shadows.small,
  },

  btnWrap: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16 },
  btnText: { ...TextStyles.button, color: Colors.primary },

  resultCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, padding: Spacing.lg, marginTop: Spacing.lg,
    ...Shadows.small,
  },
  resultLevel: { ...TextStyles.h3, textAlign: 'center', marginBottom: Spacing.md },

  meterRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  meterTrack: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  meterFill:  { height: '100%', borderRadius: 4 },
  meterLabel: { fontSize: 13, fontWeight: '800', minWidth: 42, textAlign: 'right' },

  matchesBox:   { marginBottom: Spacing.md },
  matchesTitle: { ...TextStyles.bodyMedium, color: Colors.text.primary, marginBottom: Spacing.sm },
  matchRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, flexWrap: 'wrap' },
  matchLabel:   { ...TextStyles.caption, color: Colors.text.secondary, flex: 1 },
  weightChip:   { backgroundColor: `${Colors.threat}18`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  weightChipText: { fontSize: 9, color: Colors.threat, fontWeight: '800' },

  adviceBox:  { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 6 },
  adviceText: { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 20 },

  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.md, paddingVertical: 11,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: `${Colors.threat}35`,
    backgroundColor: `${Colors.threat}10`,
  },
  reportBtnText: { ...TextStyles.caption, color: Colors.threat, fontWeight: '700' },

  exampleBox: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginTop: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.small,
  },
  exampleTitle: { ...TextStyles.bodyMedium, color: Colors.accent, marginBottom: Spacing.sm },
  exampleText:  {
    ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 20,
    paddingVertical: 6, fontStyle: 'italic',
  },
  exampleHint: { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: Spacing.sm },
});

export default CallScriptCheckScreen;
