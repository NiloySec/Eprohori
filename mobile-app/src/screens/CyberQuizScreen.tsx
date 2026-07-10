import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { useQuizStore, QUIZ_QUESTIONS } from '@stores';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CyberQuiz'>;
type MCIcon = React.ComponentProps<typeof Icon>['name'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// S6: cyber safety quiz — "is this a scam?" true/false, local content, scored
const CyberQuizScreen = ({ navigation }: Props) => {
  const t = useTranslation();
  const questions = useMemo(() => shuffle(QUIZ_QUESTIONS), []);
  const [index, setIndex]     = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null); // null = not answered
  const [score, setScore]     = useState(0);
  const [finished, setFinished] = useState(false);

  const bestScore    = useQuizStore((s) => s.bestScore);
  const setResult     = useQuizStore((s) => s.setResult);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  const handleAnswer = (userSaysScam: boolean) => {
    if (answered !== null) return;
    const correct = userSaysScam === q.isScam;
    setAnswered(correct);
    if (correct) setScore((s) => s + 1);
    Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
  };

  const handleNext = () => {
    if (isLast) {
      setResult(score, questions.length);
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
  };

  const restart = () => {
    setIndex(0); setAnswered(null); setScore(0); setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const grade =
      pct >= 90 ? { icon: 'trophy-variant' as MCIcon, color: Colors.suspicious, label: t('quiz_grade_expert') } :
      pct >= 70 ? { icon: 'shield-check' as MCIcon,   color: Colors.safe,       label: t('quiz_grade_good') } :
      pct >= 50 ? { icon: 'book-open-variant' as MCIcon, color: Colors.accent, label: t('quiz_grade_learn') } :
                  { icon: 'alert' as MCIcon,           color: Colors.threat,    label: t('quiz_grade_careful') };

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.finishWrap}>
          <View style={[styles.finishIconBox, { backgroundColor: `${grade.color}18` }]}>
            <Icon name={grade.icon} size={40} color={grade.color} />
          </View>
          <Text style={styles.finishGrade}>{grade.label}</Text>
          <Text style={styles.finishScore}>{score} / {questions.length}</Text>
          <Text style={styles.finishSub}>{t('quiz_best_score')} {bestScore} / {QUIZ_QUESTIONS.length}</Text>

          <TouchableOpacity style={styles.retryBtn} onPress={restart} activeOpacity={0.85}>
            <LinearGradient colors={Colors.gradient.accent} style={styles.retryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="refresh" size={18} color={Colors.primary} />
              <Text style={styles.retryBtnText}>{t('quiz_retry')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>{t('quiz_done')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="brain" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('quiz_title')}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((index) / questions.length) * 100}%` as any }]} />
            </View>
            <Text style={styles.progressText}>{index + 1}/{questions.length}</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.scenarioCard}>
            <Text style={styles.scenarioLabel}>{t('quiz_scenario_label')}</Text>
            <Text style={styles.scenarioText}>{q.scenario}</Text>
          </View>

          {answered === null ? (
            <View style={styles.answerRow}>
              <TouchableOpacity style={[styles.answerBtn, styles.scamBtn]} onPress={() => handleAnswer(true)}>
                <Icon name="alert-octagon" size={22} color="#fff" />
                <Text style={styles.answerBtnText}>{t('quiz_answer_scam')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.answerBtn, styles.safeBtn]} onPress={() => handleAnswer(false)}>
                <Icon name="check-circle" size={22} color="#fff" />
                <Text style={styles.answerBtnText}>{t('quiz_answer_safe')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[
              styles.resultCard,
              { borderColor: answered ? `${Colors.safe}50` : `${Colors.threat}50` },
            ]}>
              <Text style={[styles.resultTitle, { color: answered ? Colors.safe : Colors.threat }]}>
                {answered ? t('quiz_correct') : t('quiz_wrong')}
              </Text>
              <Text style={styles.resultVerdict}>
                {q.isScam ? t('quiz_correct_answer_scam') : t('quiz_correct_answer_safe')}
              </Text>
              <Text style={styles.resultExplanation}>{q.explanation}</Text>

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <LinearGradient colors={Colors.gradient.accent} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.nextBtnText}>{isLast ? t('quiz_see_results') : t('quiz_next')}</Text>
                  <Icon name="arrow-right" size={18} color={Colors.primary} />
                </LinearGradient>
              </TouchableOpacity>
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
  title:    { ...TextStyles.h2, color: Colors.accent, marginBottom: Spacing.md },

  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  progressText:  { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700' },

  body: { padding: Spacing.lg },

  scenarioCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.lg,
    minHeight: 140, justifyContent: 'center',
    ...Shadows.small,
  },
  scenarioLabel: { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: Spacing.sm, fontWeight: '700' },
  scenarioText:  { ...TextStyles.body, color: Colors.text.primary, lineHeight: 24, fontStyle: 'italic' },

  answerRow: { flexDirection: 'row', gap: Spacing.md },
  answerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 20, borderRadius: BorderRadius.lg,
  },
  scamBtn: { backgroundColor: Colors.threat },
  safeBtn: { backgroundColor: Colors.safe },
  answerBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  resultCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, padding: Spacing.lg,
    ...Shadows.small,
  },
  resultTitle:       { ...TextStyles.h3, marginBottom: Spacing.sm },
  resultVerdict:     { ...TextStyles.bodyMedium, color: Colors.text.primary, marginBottom: Spacing.sm },
  resultExplanation: { ...TextStyles.body, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.lg },

  nextBtn:     { borderRadius: BorderRadius.md, overflow: 'hidden' },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  nextBtnText: { ...TextStyles.button, color: Colors.primary },

  finishWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  finishIconBox: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  finishGrade: { ...TextStyles.h2, color: Colors.accent, marginTop: Spacing.md },
  finishScore: { fontSize: 40, fontWeight: '800', color: Colors.text.primary, marginTop: Spacing.sm },
  finishSub:   { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: Spacing.xl },

  retryBtn:     { borderRadius: BorderRadius.lg, overflow: 'hidden', width: '100%', marginTop: Spacing.lg },
  retryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  retryBtnText: { ...TextStyles.button, color: Colors.primary },
  doneBtn:      { paddingVertical: Spacing.md },
  doneBtnText:  { ...TextStyles.body, color: Colors.text.tertiary },
});

export default CyberQuizScreen;
