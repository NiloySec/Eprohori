import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useTranslation } from '@hooks';
import {
  useSettingsStore,
  useSpamNumberStore, SPAM_CATEGORIES, getSpamLabel, type SpamCategory,
  useNameTagStore, KNOWN_BD_NUMBERS, BD_OPERATORS,
} from '@stores';
import { threatAnalysisAPI, ThreatAnalysisResponse, nameTagAPI, type CrowdName } from '@api';
import { analyzePhoneLocally, levenshtein, type PhoneFeatures } from '@utils';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

interface LookupEntry {
  number: string;
  phoneFeatures: PhoneFeatures;
  result: ThreatAnalysisResponse;
  timestamp: number;
}

type Props = NativeStackScreenProps<RootStackParamList, 'CallerID'>;

const threatColor = (type: string) => {
  if (type === 'safe') return Colors.safe;
  if (type === 'phishing' || type === 'malware') return Colors.threat;
  return Colors.suspicious;
};

const threatIcon = (type: string): MCIcon => {
  if (type === 'safe') return 'check-circle';
  if (type === 'phishing') return 'fish';
  if (type === 'malware') return 'bug';
  return 'alert-circle';
};

// N: local vector-icon mappings for in-app UI — store-level emoji (SPAM_CATEGORIES,
// KNOWN_TYPE_ICON) stay as-is since they also feed OS notification text.
const CATEGORY_ICON: Record<SpamCategory, MCIcon> = {
  fraud_call:    'cash-remove',
  telemarketing: 'bullhorn-outline',
  otp_abuse:     'key-outline',
  threat:        'alert-outline',
  robocall:      'robot-outline',
  silence:       'volume-off',
  other:         'help-circle-outline',
};
const KNOWN_TYPE_VECTOR_ICON: Record<string, MCIcon> = {
  bank:      'bank-outline',
  operator:  'radio-tower',
  service:   'domain',
  emergency: 'alarm-light-outline',
  commerce:  'cart-outline',
  health:    'hospital-box-outline',
};

const OPERATOR_COLOR: Record<string, string> = {
  'Grameenphone': '#00A651',
  'Banglalink':   '#E3000B',
  'Robi':         '#E2001A',
  'Airtel/Robi':  '#E2001A',
  'Teletalk':     '#1B4FA8',
};

const CATEGORY_LIST = Object.entries(SPAM_CATEGORIES) as [SpamCategory, typeof SPAM_CATEGORIES[SpamCategory]][];

// ── Spoofed number detection ──────────────────────────────────────────────────
const OFFICIAL_BD_NUMBERS: { number: string; label: string }[] = [
  { number: '10678',          label: 'BTRC হেল্পলাইন' },
  { number: '01320010111',    label: 'RAB' },
  { number: '01769693922',    label: 'পুলিশ CID' },
  { number: '16236',          label: 'বিকাশ কাস্টমার কেয়ার' },
  { number: '16167',          label: 'নগদ কাস্টমার কেয়ার' },
  { number: '16123',          label: 'ভোক্তা অধিকার সংরক্ষণ' },
  { number: '999',            label: 'জরুরি সেবা (পুলিশ)' },
  { number: '01320-010113',   label: 'র‍্যাব মিডিয়া' },
  { number: '16190',          label: 'ডাক বিভাগ' },
  { number: '01313888888',    label: 'বিমান বাংলাদেশ' },
];
// L5/M5: levenshtein imported from shared util (null-safe)

function checkSpoofed(num: string): { spoofed: true; label: string } | null {
  const clean = num.replace(/\D/g, '');
  for (const off of OFFICIAL_BD_NUMBERS) {
    const offClean = off.number.replace(/\D/g, '');
    if (clean === offClean) return null; // exact match = legitimate
    // Flag only if lengths are similar and edit distance ≤ 2
    if (Math.abs(clean.length - offClean.length) <= 1 && levenshtein(clean, offClean) <= 2) {
      return { spoofed: true, label: off.label };
    }
  }
  return null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
  }),
});

async function sendCallerNotification(
  number: string,
  name: string | null,
  operator: string | null,
  spamCount: number,
  threatType: string,
) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const isSafe   = threatType === 'safe';
    const icon     = spamCount > 0 ? '🚨' : isSafe ? '✅' : '⚠️';
    const title    = name ? `${icon} ${name}` : `${icon} ${number}`;
    const opPart   = operator ? `${operator} · ` : '';
    const spamPart = spamCount > 0 ? `${spamCount} জন স্প্যাম রিপোর্ট করেছেন` : isSafe ? 'নিরাপদ নম্বর' : 'সন্দেহজনক';

    // Cancel previous caller notification before sending new one
    await Notifications.dismissAllNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body:       `${opPart}${spamPart}`,
        data:       { number },
        categoryIdentifier: 'CALLER_INFO',
      },
      trigger: null,
    });
  } catch {
    // Notification failure is non-critical
  }
}

const CallerIDScreen = ({ navigation, route }: Props) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const initialNumber = (route.params as { initialNumber?: string } | undefined)?.initialNumber ?? '';

  const [number, setNumber]   = useState(initialNumber);
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<LookupEntry[]>([]);

  // Crowd names cache: number → CrowdName
  const [crowdNames, setCrowdNames] = useState<Record<string, CrowdName>>({});

  // Operator correction modal
  const [opModal, setOpModal]       = useState(false);
  const [opTarget, setOpTarget]     = useState('');

  // Report modal
  const [reportTarget, setReportTarget]   = useState('');
  const [reportModal, setReportModal]     = useState(false);
  const [selectedCat, setSelectedCat]     = useState<SpamCategory>('fraud_call');
  const [reportNote, setReportNote]       = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const lastReportTimeRef = useRef<Record<string, number>>({}); // M9: throttle per number

  // Name tag modal
  const [nameModal, setNameModal]         = useState(false);
  const [nameTarget, setNameTarget]       = useState('');
  const [nameInput, setNameInput]         = useState('');

  // H8: track which number was auto-checked (not just a boolean) so revisits with
  // a NEW initialNumber still trigger the check, while the same number doesn't repeat
  const didAutoCheck = useRef<string | null>(null);

  const t = useTranslation();
  const { language, blocklist, addToBlocklist, checkAndAutoBlock, ghostModeEnabled, trustedNumbers, addTrustedNumber, removeTrustedNumber } = useSettingsStore();
  const { reportNumber, getReportCount, getSpamScore, getTopCategory, isReported, toggleSafeMark, isSafeMarked } = useSpamNumberStore();
  const { getTag, getTagSource, setTag, removeTag, setPortedOperator, clearPortedOperator, getEffectiveOperator } = useNameTagStore();

  useEffect(() => {
    if (initialNumber && didAutoCheck.current !== initialNumber) {
      didAutoCheck.current = initialNumber; // H8: track number, not just a flag
      handleCheck(initialNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNumber]);

  // H2/M16: exact digit-match only — suffix matching was too broad (could block entire operators)
  const isBlocked = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    return blocklist.some((b) => {
      const cleanB = b.replace(/\D/g, '');
      if (!cleanB) return false;
      return cleanNum === cleanB;
    });
  };

  const handleCheck = async (target?: string) => {
    const trimmed = (target ?? number).trim();
    if (!trimmed) { Alert.alert('', t('callerid_required')); return; }

    const phoneFeatures = analyzePhoneLocally(trimmed);

    if (isBlocked(trimmed)) {
      const entry: LookupEntry = {
        number: trimmed, phoneFeatures,
        result: {
          // ThreatAnalysisResponse.confidence is 0-100, not 0-1 (see threatAnalysis.ts)
          threat_type: 'scam', confidence: 100,
          message: t('analyzer_blocklisted_msg'),
          solution_steps: [], prevention_tips: [],
        },
        timestamp: Date.now(),
      };
      setLookups((prev) => [entry, ...prev.slice(0, 9)]);
      if (!target) setNumber('');
      return;
    }

    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await threatAnalysisAPI.analyzeThreat(trimmed, language);
      const entry: LookupEntry = { number: trimmed, phoneFeatures, result, timestamp: Date.now() };
      setLookups((prev) => [entry, ...prev.slice(0, 9)]);
      if (!target) setNumber('');

      // Fetch crowd-sourced name (fire-and-forget, graceful fail)
      nameTagAPI.fetchCrowdName(trimmed).then((crowd) => {
        if (crowd) setCrowdNames((prev) => ({ ...prev, [trimmed]: crowd }));
      }).catch((err) => {
        if (__DEV__) console.warn('[CallerID] fetchCrowdName failed:', err); // H9: log in dev
      });

      // Auto-block if spam score crosses user threshold
      const scoreNow = getSpamScore(trimmed);
      const didAutoBlock = checkAndAutoBlock(trimmed, scoreNow);
      if (didAutoBlock) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('🚫 স্বয়ংক্রিয় ব্লক', `"${trimmed}" স্প্যাম স্কোর বেশি (${Math.round(scoreNow * 100)}%) — ব্লকলিস্টে যোগ হয়েছে।`);
      }

      // Send persistent notification (overlay substitute)
      const name      = getTag(trimmed);
      const spamCount = getReportCount(trimmed);
      await sendCallerNotification(trimmed, name, phoneFeatures.operator, spamCount, result.threat_type);
    } catch {
      Alert.alert('', t('analyzer_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = (num: string) => {
    Alert.alert(t('callerid_block_title'), `${t('callerid_block_msg')} "${num}"?`, [
      { text: t('history_cancel'), style: 'cancel' },
      {
        text: t('callerid_block_confirm'), style: 'destructive',
        onPress: () => { addToBlocklist(num); Alert.alert('', t('callerid_block_ok')); },
      },
    ]);
  };

  // ── Report modal ──
  const openReportModal = (num: string) => {
    setReportTarget(num);
    setSelectedCat('fraud_call');
    setReportNote('');
    setReportModal(true);
  };

  const submitReport = async () => {
    // M9: prevent spam — 10 s throttle per number
    const now = Date.now();
    if (lastReportTimeRef.current[reportTarget] && now - lastReportTimeRef.current[reportTarget] < 10_000) {
      Alert.alert('', 'একটু অপেক্ষা করুন — আবার রিপোর্ট করার আগে ১০ সেকেন্ড থামুন।');
      return;
    }
    lastReportTimeRef.current[reportTarget] = now;
    setSubmitting(true);
    try {
      reportNumber(reportTarget, selectedCat, reportNote.trim());
      const catInfo = SPAM_CATEGORIES[selectedCat];
      // Submit to both community report endpoint AND spam number DB
      await Promise.allSettled([
        threatAnalysisAPI.communityReport({
          content:       `স্প্যাম নম্বর রিপোর্ট: ${reportTarget}. কারণ: ${catInfo.label_bn}. ${reportNote}`,
          platform:      'Call',
          threat_type:   selectedCat === 'fraud_call' || selectedCat === 'threat' ? 'fraud' : 'spam',
          reporter_type: 'mobile',
        }),
        threatAnalysisAPI.submitSpamNumberReport({
          number:   reportTarget,
          category: selectedCat,
          note:     reportNote.trim(),
        }),
      ]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Re-check auto-block after new report changes the score
      const updatedScore = getSpamScore(reportTarget);
      checkAndAutoBlock(reportTarget, updatedScore);
      setReportModal(false);
      Alert.alert('✅ রিপোর্ট সফল', `"${reportTarget}" স্প্যাম হিসেবে রিপোর্ট করা হয়েছে।`);
    } catch {
      setReportModal(false);
      Alert.alert('✅ সংরক্ষিত', 'রিপোর্টটি আপনার ডিভাইসে সংরক্ষিত হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Name tag modal ──
  const openNameModal = (num: string) => {
    setNameTarget(num);
    setNameInput(getTag(num) ?? '');
    setNameModal(true);
  };

  const submitName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      removeTag(nameTarget);
    } else {
      setTag(nameTarget, trimmed);
      // Submit to community unless Ghost Mode is on
      if (!ghostModeEnabled) {
        nameTagAPI.submitCrowdName(nameTarget, trimmed).catch(() => {});
      }
    }
    setNameModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

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
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Icon name="phone-check" size={26} color={Colors.accent} />
            </View>
            <TouchableOpacity
              style={styles.directoryBtn}
              onPress={() => navigation.navigate('SpamDirectory')}
            >
              <Icon name="shield-alert" size={16} color={Colors.accent} />
              <Text style={styles.directoryBtnText}>স্প্যাম তালিকা</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{t('callerid_title')}</Text>
          <Text style={styles.subtitle}>{t('callerid_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Input */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>{t('callerid_input_label')}</Text>
            <View style={styles.inputRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>🇧🇩 +880</Text>
              </View>
              <TextInput
                style={styles.input}
                value={number}
                onChangeText={setNumber}
                placeholder={t('callerid_placeholder')}
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
                returnKeyType="search"
                onSubmitEditing={() => handleCheck()}
                maxLength={15}
              />
            </View>
            <TouchableOpacity
              style={[styles.checkBtn, loading && { opacity: 0.6 }]}
              onPress={() => handleCheck()}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={Colors.gradient.accent}
                style={styles.checkBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : (
                    <>
                      <Icon name="magnify" size={18} color={Colors.primary} />
                      <Text style={styles.checkBtnText}>{t('callerid_btn')}</Text>
                    </>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.notifHint}>
              <Icon name="bell-outline" size={12} color={Colors.text.tertiary} />
              <Text style={styles.notifHintText}>
                চেক করার পর notification-এ caller info দেখাবে — call-এর সময় কাজে আসবে
              </Text>
            </View>
          </View>

          {/* Tips (empty state) */}
          {lookups.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.tipsTitle}>{t('callerid_tips_title')}</Text>
              {([t('callerid_tip1'), t('callerid_tip2'), t('callerid_tip3')] as string[]).map((tip, i) => (
                <Text key={i} style={styles.tipText}>{tip}</Text>
              ))}
            </View>
          )}

          {/* Results */}
          {lookups.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('callerid_recent')}</Text>
              {lookups.map((entry, idx) => {
                const color    = threatColor(entry.result.threat_type);
                const isSafe   = entry.result.threat_type === 'safe';
                const already  = blocklist.includes(entry.number);
                const pf       = entry.phoneFeatures;
                const opColor  = pf.operator ? (OPERATOR_COLOR[pf.operator] ?? Colors.accent) : Colors.accent;
                const display  = pf.formatted !== entry.number ? pf.formatted : entry.number;
                const repCount  = getReportCount(entry.number);
                const spamScore = getSpamScore(entry.number);
                const spamLbl   = spamScore > 0 ? getSpamLabel(spamScore) : null;
                const topCat    = getTopCategory(entry.number);
                const catInfo   = topCat ? SPAM_CATEGORIES[topCat] : null;
                const reported  = isReported(entry.number);
                const savedName   = getTag(entry.number);
                const tagSource   = getTagSource(entry.number);
                const knownMeta   = KNOWN_BD_NUMBERS[entry.number.replace(/\D/g, '')];
                const crowdName   = !savedName ? crowdNames[entry.number] : null;
                const division    = entry.phoneFeatures.division_bn;
                const { op_bn: effectiveOp, ported } = getEffectiveOperator(entry.number, pf.operator_bn);

                const spoofed = checkSpoofed(entry.number);

                // N9: verified-safe badge — official directory or user safe-mark
                const isOfficial  = !!knownMeta;
                const safeMarked  = isSafeMarked(entry.number);
                const showSafeBadge = isOfficial || (safeMarked && repCount === 0);
                // N3: trusted whitelist state
                const trusted = trustedNumbers.includes(entry.number.replace(/\D/g, ''));

                return (
                  <View key={idx} style={[styles.resultCard, { borderLeftColor: color }]}>
                    {/* ── Spoofed number warning ── */}
                    {spoofed && (
                      <View style={styles.spoofWarn}>
                        <Icon name="phone-alert" size={18} color="#fff" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.spoofTitle}>স্পুফড নম্বর সন্দেহ!</Text>
                          <Text style={styles.spoofText}>
                            এই নম্বরটি "{spoofed.label}"-এর সাথে মিল আছে। প্রতারক আসল নম্বর নকল করতে পারে।
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* ── N9: verified-safe badge ── */}
                    {showSafeBadge && !spoofed && (
                      <View style={styles.verifiedBadge}>
                        <Icon name="check-decagram" size={16} color={Colors.safe} />
                        <Text style={styles.verifiedBadgeText}>
                          {isOfficial ? 'ভেরিফাইড অফিসিয়াল নম্বর' : 'নিরাপদ চিহ্নিত নম্বর'}
                        </Text>
                      </View>
                    )}

                    {/* ── Crowd name (community-sourced, shown when no personal tag) ── */}
                    {crowdName && (
                      <View style={[styles.callerNameRow, { backgroundColor: `${Colors.accent}08`, borderColor: `${Colors.accent}20` }]}>
                        <Icon name="account-group-outline" size={20} color={Colors.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.callerName, { color: Colors.accent }]}>{crowdName?.name}</Text>
                          <Text style={styles.callerNameSub}>
                            কমিউনিটি নাম · {crowdName?.count ?? 0} জন দিয়েছেন
                            {crowdName?.verified ? ' · যাচাইকৃত' : ''}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* ── Caller name (TrueCaller-style) ── */}
                    {savedName && (
                      <View style={[
                        styles.callerNameRow,
                        tagSource === 'known'
                          ? { backgroundColor: `${Colors.safe}12`, borderColor: `${Colors.safe}30` }
                          : { backgroundColor: `${Colors.accent}10`, borderColor: `${Colors.accent}25` },
                      ]}>
                        <Icon
                          name={knownMeta ? KNOWN_TYPE_VECTOR_ICON[knownMeta.type] ?? 'domain' : 'account-outline'}
                          size={20}
                          color={tagSource === 'known' ? Colors.safe : Colors.accent}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.callerName,
                            { color: tagSource === 'known' ? Colors.safe : Colors.accent },
                          ]}>
                            {savedName}
                          </Text>
                          {tagSource === 'known' && (
                            <Text style={styles.callerNameSub}>যাচাইকৃত পরিচিতি</Text>
                          )}
                        </View>
                        {tagSource === 'user' && (
                          <TouchableOpacity onPress={() => openNameModal(entry.number)}>
                            <Icon name="pencil-outline" size={16} color={Colors.text.tertiary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    <View style={styles.resultRow}>
                      <View style={[styles.resultIconWrap, { backgroundColor: `${color}20` }]}>
                        <Icon name={threatIcon(entry.result.threat_type)} size={22} color={color} />
                      </View>
                      <View style={styles.resultInfo}>
                        <View style={styles.numberRow}>
                          <Text style={styles.resultNumber}>{display}</Text>
                          {effectiveOp && (
                            <TouchableOpacity
                              style={[styles.opBadge, { backgroundColor: `${opColor}20`, borderColor: `${opColor}40` }]}
                              onPress={() => { setOpTarget(entry.number); setOpModal(true); }}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.opBadgeText, { color: opColor }]}>
                                {!ported ? '~' : ''}{effectiveOp}
                              </Text>
                              <Icon name="pencil" size={9} color={opColor} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
                          )}
                          {pf.number_type === 'international' && (
                            <View style={[styles.opBadge, { backgroundColor: `${Colors.suspicious}20`, borderColor: `${Colors.suspicious}40` }]}>
                              <Text style={[styles.opBadgeText, { color: Colors.suspicious }]}>আন্তর্জাতিক</Text>
                            </View>
                          )}
                          {division && (
                            <View style={[styles.opBadge, { backgroundColor: `${Colors.text.tertiary}15`, borderColor: `${Colors.text.tertiary}30` }]}>
                              <Text style={[styles.opBadgeText, { color: Colors.text.secondary }]}>{division}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.resultStatus, { color }]}>
                          {isSafe ? t('callerid_status_safe') : t('callerid_status_spam')}
                          {' · '}{Math.round(entry.result.confidence)}%
                        </Text>

                        {repCount > 0 && (
                          <View style={styles.communityBadge}>
                            <Icon name="account-group" size={12} color={Colors.threat} />
                            <Text style={styles.communityBadgeText}>
                              {repCount} জন রিপোর্ট করেছেন
                              {catInfo ? ` · ${catInfo.label_bn}` : ''}
                            </Text>
                          </View>
                        )}

                        {spamLbl && (
                          <View style={styles.scoreRow}>
                            <View style={styles.scoreTrack}>
                              <View style={[styles.scoreFill, { width: `${spamScore * 100}%` as any, backgroundColor: spamLbl.color }]} />
                            </View>
                            <Text style={[styles.scoreLabel, { color: spamLbl.color }]}>{spamLbl.text}</Text>
                          </View>
                        )}

                        <Text style={styles.resultTime}>{formatTime(entry.timestamp)}</Text>
                      </View>

                      {!isSafe && !already && (
                        <TouchableOpacity style={styles.blockBtn} onPress={() => handleBlock(entry.number)}>
                          <Icon name="block-helper" size={15} color={Colors.threat} />
                          <Text style={styles.blockBtnText}>{t('callerid_block_btn')}</Text>
                        </TouchableOpacity>
                      )}
                      {already && (
                        <View style={[styles.blockBtn, { borderColor: Colors.border, backgroundColor: 'transparent' }]}>
                          <Icon name="check" size={15} color={Colors.text.tertiary} />
                          <Text style={[styles.blockBtnText, { color: Colors.text.tertiary }]}>
                            {t('callerid_blocked_badge')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isSafe && entry.result.message ? (
                      <Text style={styles.resultMsg}>{entry.result.message}</Text>
                    ) : null}

                    {pf.risk_signals.length > 0 && (
                      <View style={styles.riskBox}>
                        {pf.risk_signals.map((sig, si) => (
                          <Text key={si} style={styles.riskText}>{sig}</Text>
                        ))}
                      </View>
                    )}

                    {/* Action bar */}
                    <View style={styles.actionBar}>
                      {/* Name tag button */}
                      {tagSource !== 'known' && (
                        <TouchableOpacity
                          style={styles.actionBarBtn}
                          onPress={() => openNameModal(entry.number)}
                        >
                          <Icon name={savedName ? 'account-edit' : 'account-plus-outline'} size={14} color={Colors.accent} />
                          <Text style={styles.actionBarBtnText}>
                            {savedName ? 'নাম পরিবর্তন' : 'নাম দিন'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Report button */}
                      <TouchableOpacity
                        style={[styles.actionBarBtn, reported && styles.actionBarBtnDone]}
                        onPress={() => openReportModal(entry.number)}
                      >
                        <Icon
                          name={reported ? 'flag-checkered' : 'flag-outline'}
                          size={14}
                          color={reported ? Colors.suspicious : Colors.text.tertiary}
                        />
                        <Text style={[styles.actionBarBtnText, reported && { color: Colors.suspicious }]}>
                          {reported ? 'রিপোর্ট হয়েছে' : 'স্প্যাম রিপোর্ট'}
                        </Text>
                      </TouchableOpacity>

                      {/* N9: safe-mark toggle (hidden for official numbers — already verified) */}
                      {!isOfficial && (
                        <TouchableOpacity
                          style={[styles.actionBarBtn, safeMarked && { borderColor: `${Colors.safe}40`, backgroundColor: `${Colors.safe}08` }]}
                          onPress={() => {
                            toggleSafeMark(entry.number);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          }}
                        >
                          <Icon
                            name={safeMarked ? 'check-decagram' : 'check-decagram-outline'}
                            size={14}
                            color={safeMarked ? Colors.safe : Colors.text.tertiary}
                          />
                          <Text style={[styles.actionBarBtnText, safeMarked && { color: Colors.safe }]}>
                            {safeMarked ? 'নিরাপদ চিহ্নিত' : 'নিরাপদ চিহ্নিত করুন'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* N3: trusted whitelist toggle */}
                      <TouchableOpacity
                        style={[styles.actionBarBtn, trusted && { borderColor: `${Colors.safe}40`, backgroundColor: `${Colors.safe}08` }]}
                        onPress={() => {
                          if (trusted) removeTrustedNumber(entry.number);
                          else addTrustedNumber(entry.number);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                      >
                        <Icon
                          name={trusted ? 'heart' : 'heart-outline'}
                          size={14}
                          color={trusted ? Colors.safe : Colors.text.tertiary}
                        />
                        <Text style={[styles.actionBarBtnText, trusted && { color: Colors.safe }]}>
                          {trusted ? 'বিশ্বস্ত' : 'বিশ্বস্ত তালিকায়'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Cyber report CTA — shown when any result is not safe */}
          {lookups.some((e) => e.result.threat_type !== 'safe') && (
            <TouchableOpacity
              style={styles.cyberReportBtn}
              onPress={() => navigation.navigate('CyberReport')}
              activeOpacity={0.8}
            >
              <Icon name="shield-alert" size={20} color={Colors.threat} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cyberReportTitle}>প্রতারণামূলক নম্বর সনাক্ত</Text>
                <Text style={styles.cyberReportSub}>BTRC / পুলিশ / RAB-এ রিপোর্ট করুন →</Text>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.threat} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Report Modal ── */}
      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Icon name="flag-outline" size={18} color={Colors.accent} />
              <Text style={styles.modalTitle}>স্প্যাম নম্বর রিপোর্ট</Text>
            </View>
            <Text style={styles.modalNumber}>{reportTarget}</Text>
            <Text style={styles.modalSectionLabel}>কারণ নির্বাচন করুন</Text>
            {CATEGORY_LIST.map(([key, cat]) => (
              <TouchableOpacity
                key={key}
                style={[styles.catRow, selectedCat === key && styles.catRowSelected]}
                onPress={() => setSelectedCat(key)}
                activeOpacity={0.7}
              >
                <Icon name={CATEGORY_ICON[key]} size={18} color={Colors.text.secondary} style={styles.catIcon} />
                <Text style={[styles.catLabel, selectedCat === key && styles.catLabelSelected]}>
                  {cat.label_bn}
                </Text>
                <View style={[styles.radio, selectedCat === key && styles.radioSelected]}>
                  {selectedCat === key && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.modalSectionLabel}>বিস্তারিত (ঐচ্ছিক)</Text>
            <TextInput
              style={styles.noteInput}
              value={reportNote}
              onChangeText={setReportNote}
              placeholder="কী বলেছিল? কোনো বিশেষ তথ্য..."
              placeholderTextColor={Colors.text.tertiary}
              multiline numberOfLines={2} maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReportModal(false)} disabled={submitting}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={submitReport} disabled={submitting} activeOpacity={0.8}
              >
                <LinearGradient colors={Colors.gradient.accent} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {submitting
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={styles.submitBtnText}>রিপোর্ট করুন</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Operator Correction Modal ── */}
      <Modal visible={opModal} transparent animationType="slide" onRequestClose={() => setOpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Icon name="radio-tower" size={18} color={Colors.accent} />
              <Text style={styles.modalTitle}>অপারেটর সংশোধন</Text>
            </View>
            <Text style={styles.modalNumber}>{opTarget}</Text>
            <Text style={styles.modalSectionLabel}>
              প্রিফিক্স থেকে অনুমানিত অপারেটর ভুল হলে সঠিকটি বেছে নিন
            </Text>
            {BD_OPERATORS.map((op) => (
              <TouchableOpacity
                key={op.value}
                style={styles.catRow}
                onPress={() => {
                  setPortedOperator(opTarget, op.value);
                  setOpModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.catLabel, { paddingLeft: 4 }]}>{op.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.catRow, { marginTop: 4 }]}
              onPress={() => { clearPortedOperator(opTarget); setOpModal(false); }}
            >
              <Text style={[styles.catLabel, { color: Colors.text.tertiary, paddingLeft: 4 }]}>
                প্রিফিক্স অনুমানে ফিরে যান
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setOpModal(false)}>
              <Text style={styles.cancelBtnText}>বাতিল</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Name Tag Modal ── */}
      <Modal visible={nameModal} transparent animationType="slide" onRequestClose={() => setNameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Icon name="account-outline" size={18} color={Colors.accent} />
              <Text style={styles.modalTitle}>নাম সংরক্ষণ করুন</Text>
            </View>
            <Text style={styles.modalNumber}>{nameTarget}</Text>
            <Text style={styles.modalSectionLabel}>এই নম্বরটি কার?</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="যেমন: রহিম ভাই, অফিস, বাড়িওয়ালা..."
              placeholderTextColor={Colors.text.tertiary}
              maxLength={60}
              autoFocus
            />
            <Text style={styles.nameTip}>
              পরবর্তীতে এই নম্বর থেকে call আসলে এই নামটি দেখাবে।
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNameModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitName} activeOpacity={0.8}>
                <LinearGradient colors={Colors.gradient.accent} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.submitBtnText}>সংরক্ষণ করুন</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'] },
  backBtn: { marginBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center',
  },
  directoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentGlow, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.borderAccent,
  },
  directoryBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  body: { padding: Spacing.lg },

  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  inputLabel: { ...TextStyles.caption, color: Colors.text.secondary, marginBottom: Spacing.md, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 8 },
  prefix: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  prefixText: { ...TextStyles.body, color: Colors.accent, fontWeight: '600' },
  input: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...TextStyles.body, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.border,
  },
  checkBtn: { marginBottom: Spacing.sm, ...Shadows.medium, shadowColor: Colors.accent, shadowOpacity: 0.35 },
  checkBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
    borderRadius: BorderRadius.md, overflow: 'hidden',
  },
  checkBtnText: { ...TextStyles.button, color: Colors.primary },
  notifHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  notifHintText: { ...TextStyles.caption, color: Colors.text.tertiary, flex: 1, lineHeight: 16 },

  tipsTitle: { ...TextStyles.body, color: Colors.accent, fontWeight: '700', marginBottom: Spacing.md },
  tipText:   { ...TextStyles.caption, color: Colors.text.secondary, marginBottom: 6, lineHeight: 20 },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm,
  },

  resultCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, marginBottom: Spacing.md,
  },

  // N9: verified-safe badge
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${Colors.safe}12`, borderRadius: 8,
    borderWidth: 1, borderColor: `${Colors.safe}30`,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.safe },

  // Caller name (TrueCaller-style)
  callerNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.sm, borderRadius: 10, borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  callerName:    { ...TextStyles.body, fontWeight: '800', fontSize: 16 },
  callerNameSub: { ...TextStyles.caption, color: Colors.safe, marginTop: 1 },

  resultRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  resultIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resultInfo:     { flex: 1 },
  numberRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  resultNumber:   { ...TextStyles.body, color: Colors.text.primary, fontWeight: '700' },
  opBadge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  opBadgeText:    { fontSize: 10, fontWeight: '700' },
  resultStatus:   { ...TextStyles.caption, fontWeight: '600', marginTop: 3 },
  communityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  communityBadgeText: { fontSize: 10, color: Colors.threat, fontWeight: '600' },
  scoreRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  scoreTrack: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  scoreFill:  { height: '100%', borderRadius: 2 },
  scoreLabel: { fontSize: 10, fontWeight: '700', minWidth: 90, textAlign: 'right' },
  resultTime:     { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },
  resultMsg:      { ...TextStyles.caption, color: Colors.text.secondary, marginTop: Spacing.sm, lineHeight: 18 },
  riskBox:        { marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: `${Colors.suspicious}10`, borderRadius: 8 },
  riskText:       { ...TextStyles.caption, color: Colors.suspicious, lineHeight: 18 },

  spoofWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.threat, borderRadius: 10,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  spoofTitle: { fontSize: 13, fontWeight: '800', color: Colors.text.primary, marginBottom: 2 },
  spoofText:  { fontSize: 11, color: '#fecaca', lineHeight: 16 },

  cyberReportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: `${Colors.threat}12`, borderWidth: 1, borderColor: `${Colors.threat}35`,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.sm,
  },
  cyberReportTitle: { ...TextStyles.body, color: Colors.threat, fontWeight: '700' },
  cyberReportSub:   { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2 },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.threat}15`, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: `${Colors.threat}30`,
  },
  blockBtnText: { fontSize: 11, color: Colors.threat, fontWeight: '700' },

  actionBar: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  actionBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.primary,
  },
  actionBarBtnDone: { borderColor: `${Colors.suspicious}40`, backgroundColor: `${Colors.suspicious}08` },
  actionBarBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '600' },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.secondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 36,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalTitle:        { ...TextStyles.h3, color: Colors.accent },
  modalNumber:       { ...TextStyles.body, color: Colors.text.secondary, marginBottom: Spacing.lg, fontFamily: 'monospace' },
  modalSectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 0.8, marginBottom: Spacing.sm,
  },

  catRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: Spacing.sm, borderRadius: 10, marginBottom: 4 },
  catRowSelected: { backgroundColor: `${Colors.accent}10` },
  catIcon:        { width: 24, textAlign: 'center' },
  catLabel:       { ...TextStyles.body, color: Colors.text.secondary, flex: 1 },
  catLabelSelected:{ color: Colors.accent, fontWeight: '600' },
  radio:          { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioSelected:  { borderColor: Colors.accent },
  radioDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },

  noteInput: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...TextStyles.body, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.border,
    minHeight: 60, marginBottom: Spacing.lg, textAlignVertical: 'top',
  },
  nameInput: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...TextStyles.body, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.borderAccent,
    marginBottom: Spacing.sm, fontSize: 16,
  },
  nameTip: { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: Spacing.lg, lineHeight: 18 },

  modalActions: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText:{ ...TextStyles.button, color: Colors.text.secondary },
  submitBtn:    { flex: 2, borderRadius: BorderRadius.md, overflow: 'hidden' },
  submitBtnGrad:{ paddingVertical: 13, alignItems: 'center' },
  submitBtnText:{ ...TextStyles.button, color: Colors.primary },
});

export default CallerIDScreen;
styles = makeStyles(Colors);
