import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SpeechRecognition, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { threatAnalysisAPI } from '@api';
import { categorizeSms } from '@utils';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveCallListen'>;

// S8: Live Call Listening Mode — uses STT to listen to calls on speaker
// and detects scam patterns in real-time using local + AI analysis.
const LiveCallListenScreen = ({ navigation }: Props) => {
  const t = useTranslation();
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState<{ type: string; confidence: number; label: string } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Speech Recognition Events ──────────────────────────────────────────────

  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => setRecognizing(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    if (text) {
      setTranscript(text);
      debouncedAnalysis(text);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    console.error('[STT] error', event.error);
    setRecognizing(false);
    if (event.error === 'not-allowed') {
      Alert.alert('Microphone Needed', 'Please allow microphone access to listen to calls.');
    }
  });

  // ── Animation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (recognizing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recognizing]);

  // ── Analysis Logic ─────────────────────────────────────────────────────────

  const debouncedAnalysis = (text: string) => {
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = setTimeout(() => {
      performRealtimeCheck(text);
    }, 1500); // Check every 1.5s of silence/new text
  };

  const performRealtimeCheck = async (text: string) => {
    if (!text || text.length < 10) return;

    // 1. Instant local pattern check for common Bengali scam keywords
    const localCat = categorizeSms(text);
    if (localCat.category !== 'unknown' && localCat.confidence > 0.4) {
      updateVerdict(localCat.category, localCat.confidence * 100, localCat.label_bn);
      return;
    }

    // 2. Deep AI analysis (async)
    setAnalyzing(true);
    try {
      const res = await threatAnalysisAPI.analyzeThreat(text, 'bn', 1, false);
      if (res.confidence >= 60) {
        updateVerdict(res.threat_type, res.confidence, res.threat_type === 'phishing' ? 'ফিশিং' : 'প্রতারণা');
      }
    } catch {
      // ignore network errors in live mode
    } finally {
      setAnalyzing(false);
    }
  };

  const updateVerdict = (type: string, conf: number, label: string) => {
    setVerdict({ type, confidence: conf, label });
    if (conf >= 75) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (conf >= 60) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const startListening = async () => {
    const result = await SpeechRecognition.requestPermissionAsync();
    if (!result.granted) return;

    setTranscript('');
    setVerdict(null);
    try {
      await SpeechRecognition.start({
        lang: 'bn-BD',
        interimResults: true,
        continuous: true,
      });
    } catch (e) {
      console.error('[STT] start failed', e);
    }
  };

  const stopListening = async () => {
    await SpeechRecognition.stop();
    setRecognizing(false);
  };

  // ── Auto-start if navigated from call notification ──
  useEffect(() => {
    const timer = setTimeout(() => {
      startListening();
    }, 1000); // Give user 1s to put on speaker
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Icon name="microphone-message" size={26} color={Colors.accent} />
        </View>
        <Text style={styles.title}>লাইভ কল প্রোটেকশন</Text>
        <Text style={styles.subtitle}>কলটি স্পিকারে দিন — EProhori কথা শুনে সতর্ক করবে</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.visualizerWrap}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: recognizing ? 0.3 : 0 }]} />
          <TouchableOpacity
            style={[styles.micBtn, recognizing && styles.micBtnActive]}
            onPress={recognizing ? stopListening : startListening}
            activeOpacity={0.8}
          >
            <Icon name={recognizing ? 'stop' : 'microphone'} size={40} color={recognizing ? Colors.threat : Colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.statusText, recognizing && { color: Colors.accent }]}>
            {recognizing ? 'শুনছি...' : 'শুরু করতে চাপুন'}
          </Text>
        </View>

        {/* ── Real-time Alert ── */}
        {verdict && (
          <View style={[styles.alertCard, verdict.confidence >= 75 ? styles.alertDanger : styles.alertWarn]}>
            <Icon
              name={verdict.confidence >= 75 ? 'shield-alert' : 'alert'}
              size={24} color="#fff"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>
                {verdict.confidence >= 75 ? '🔴 সরাসরি হুমকি সনাক্ত!' : '⚠️ সন্দেহজনক কথাবার্তা'}
              </Text>
              <Text style={styles.alertSub}>
                ধরন: {verdict.label} · নিশ্চয়তা: {Math.round(verdict.confidence)}%
              </Text>
            </View>
          </View>
        )}

        {/* ── Live Transcript ── */}
        <View style={styles.transcriptCard}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptLabel}>লাইভ টেক্সট:</Text>
            {analyzing && <ActivityIndicator size="small" color={Colors.accent} />}
          </View>
          <ScrollView style={styles.transcriptScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.transcriptText}>
              {transcript || 'কলের কথাগুলো এখানে দেখা যাবে...'}
            </Text>
          </ScrollView>
        </View>

        {/* ── Tips ── */}
        <View style={styles.tipBox}>
          <Icon name="information-outline" size={16} color={Colors.text.tertiary} />
          <Text style={styles.tipText}>
            সন্দেহজনক কল আসলে <Text style={{fontWeight: '700'}}>স্পিকারে দিয়ে</Text> এটি চালু করুন। শুধু বাংলা ভাষা সাপোর্ট করে।
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },

  body: { flex: 1, padding: Spacing.lg, alignItems: 'center' },

  visualizerWrap: { marginVertical: 40, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.accent,
  },
  micBtn: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.secondary, borderWidth: 2, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.medium, shadowColor: Colors.accent,
  },
  micBtnActive: { borderColor: Colors.threat, shadowColor: Colors.threat },
  statusText: { ...TextStyles.bodyMedium, color: Colors.text.tertiary, marginTop: 16, fontWeight: '700' },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: BorderRadius.lg, marginBottom: 20,
    alignSelf: 'stretch', ...Shadows.medium,
  },
  alertDanger: { backgroundColor: Colors.threat },
  alertWarn:   { backgroundColor: Colors.suspicious },
  alertTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  alertSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  transcriptCard: {
    flex: 1, alignSelf: 'stretch', backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: 16, ...Shadows.small,
  },
  transcriptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  transcriptLabel:  { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700' },
  transcriptScroll: { flex: 1 },
  transcriptText:   { ...TextStyles.body, color: Colors.text.primary, lineHeight: 24, fontStyle: 'italic' },

  tipBox: {
    flexDirection: 'row', gap: 8, marginTop: 20, padding: 12,
    backgroundColor: Colors.secondary, borderRadius: 10,
  },
  tipText: { fontSize: 11, color: Colors.text.tertiary, flex: 1, lineHeight: 16 },
});

export default LiveCallListenScreen;
