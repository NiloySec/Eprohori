import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  PermissionsAndroid, NativeModules, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';
import { useTranslation } from '@hooks';

type TFunc = ReturnType<typeof useTranslation>;

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useNameTagStore, useSpamNumberStore } from '@stores';
import { calcSpamScore, getSpamLabel } from '@stores';
import { getDivision } from '@utils';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

const CallLogReader = NativeModules.CallLogReader ?? null;

interface CallEntry {
  number:   string;
  type:     'incoming' | 'outgoing' | 'missed' | 'rejected' | 'blocked' | 'unknown';
  date:     number;
  duration: number;
  name:     string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'CallLog'>;

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  incoming: { icon: 'phone-incoming', color: Colors.safe },
  outgoing: { icon: 'phone-outgoing', color: '#818cf8' },
  missed:   { icon: 'phone-missed',   color: Colors.threat },
  rejected: { icon: 'phone-cancel',   color: Colors.suspicious },
  blocked:  { icon: 'phone-off',      color: Colors.text.tertiary },
  unknown:  { icon: 'phone',          color: Colors.text.tertiary },
};

function fmtDuration(sec: number, t: TFunc): string {
  if (sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}${t('calllog_min_short')} ${s}${t('calllog_sec_short')}` : `${s}${t('calllog_sec_short')}`;
}

function fmtDate(ts: number, t: TFunc): string {
  const d  = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH  = diffMs / 3600000;
  if (diffH < 1)  return `${Math.floor(diffMs / 60000)} ${t('calllog_min_ago')}`;
  if (diffH < 24) return `${Math.floor(diffH)} ${t('calllog_hour_ago')}`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return t('calllog_yesterday');
  if (diffD < 7)   return `${diffD} ${t('calllog_day_ago')}`;
  return d.toLocaleDateString('bn-BD');
}

const CallLogScreen = ({ navigation }: Props) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
  const [calls, setCalls]       = useState<CallEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [hasPermission, setPerm] = useState<boolean | null>(null);

  const getTag     = useNameTagStore((s) => s.getTag);
  const getReports = useSpamNumberStore((s) => s.getReports);

  const requestAndLoad = useCallback(async () => {
    setLoading(true);
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title:   t('calllog_perm_title'),
          message: t('calllog_perm_msg'),
          buttonPositive: t('calllog_perm_grant'),
        }
      );
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      setPerm(ok);
      if (!ok) { setLoading(false); return; }

      if (!CallLogReader) {
        Alert.alert('', t('calllog_native_unavailable'));
        setLoading(false);
        return;
      }
      const data: CallEntry[] = await CallLogReader.getRecentCalls(100);
      setCalls(data);
    } catch (e: any) {
      Alert.alert(t('calllog_err_title'), e?.message ?? t('calllog_load_failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { requestAndLoad(); }, [requestAndLoad]);

  const renderItem = ({ item }: { item: CallEntry }) => {
    const meta     = TYPE_ICON[item.type] ?? TYPE_ICON.unknown;
    const tagName  = getTag(item.number);
    const displayName = item.name || tagName || item.number;
    const isKnownTag  = !!tagName && !item.name;
    const records  = getReports(item.number);
    const score    = calcSpamScore(records);
    const division = /^01[3-9]\d{8}$/.test(item.number.replace(/\D/g, ''))
      ? getDivision(item.number.replace(/\D/g, ''))
      : null;
    const lbl         = score > 0 ? getSpamLabel(score) : null;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={async () => {
          await Haptics.selectionAsync();
          navigation.navigate('CallerID', { initialNumber: item.number });
        }}
      >
        {/* Type icon */}
        <View style={[styles.typeIcon, { backgroundColor: `${meta.color}18` }]}>
          <Icon name={meta.icon as any} size={18} color={meta.color} />
        </View>

        {/* Main info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {isKnownTag && (
              <View style={styles.knownBadge}>
                <Icon name="check-circle" size={10} color={Colors.safe} />
                <Text style={styles.knownBadgeText}>{t('calllog_known')}</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.typeLabel, { color: meta.color }]}>
              {item.type === 'incoming' ? t('calllog_type_incoming') :
               item.type === 'outgoing' ? t('calllog_type_outgoing') :
               item.type === 'missed'   ? t('calllog_type_missed') :
               item.type === 'rejected' ? t('calllog_type_rejected') :
               item.type === 'blocked'  ? t('calllog_type_blocked') : t('calllog_type_unknown')}
            </Text>
            {item.duration > 0 && (
              <Text style={styles.duration}> · {fmtDuration(item.duration, t)}</Text>
            )}
            {division && (
              <Text style={styles.division}> · {division}</Text>
            )}
          </View>
          {lbl && (
            <View style={[styles.scoreBar]}>
              <View style={styles.scoreTrack}>
                <View style={[styles.scoreFill, { width: `${score * 100}%` as any, backgroundColor: lbl.color }]} />
              </View>
              <Text style={[styles.scoreLabel, { color: lbl.color }]}>{lbl.text}</Text>
            </View>
          )}
        </View>

        {/* Time */}
        <Text style={styles.time}>{fmtDate(item.date, t)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Icon name="phone-log" size={24} color={Colors.accent} />
          </View>
          <View>
            <Text style={styles.title}>{t('calllog_title')}</Text>
            <Text style={styles.subtitle}>{t('calllog_subtitle')}</Text>
          </View>
        </View>
      </LinearGradient>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>{t('calllog_loading')}</Text>
        </View>
      )}

      {!loading && hasPermission === false && (
        <View style={styles.center}>
          <Icon name="phone-lock" size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('calllog_perm_needed')}</Text>
          <Text style={styles.emptyText}>{t('calllog_perm_needed_desc')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={requestAndLoad}>
            <Text style={styles.retryText}>{t('calllog_retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && hasPermission && calls.length === 0 && (
        <View style={styles.center}>
          <Icon name="phone-off" size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('calllog_no_calls')}</Text>
          <Text style={styles.emptyText}>{t('calllog_no_calls_desc')}</Text>
        </View>
      )}

      {!loading && calls.length > 0 && (
        <FlatList
          data={calls}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center',
  },
  title:    { ...TextStyles.h3, color: Colors.accent },
  subtitle: { ...TextStyles.caption, color: Colors.text.secondary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  loadingText: { ...TextStyles.body, color: Colors.text.secondary, marginTop: Spacing.md },
  emptyTitle:  { ...TextStyles.h3, color: Colors.text.primary, marginTop: Spacing.lg },
  emptyText:   { ...TextStyles.body, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm },
  retryBtn: {
    marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: Colors.accentGlow, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderAccent,
  },
  retryText: { ...TextStyles.button, color: Colors.accent },

  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing['3xl'] },
  sep:  { height: 1, backgroundColor: Colors.border, marginLeft: 66 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.md,
  },
  typeIcon: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, flexShrink: 0,
  },
  info: { flex: 1, marginRight: Spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  name: { ...TextStyles.body, color: Colors.text.primary, fontWeight: '600', flexShrink: 1 },
  knownBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${Colors.safe}20`, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  knownBadgeText: { fontSize: 10, color: Colors.safe, fontWeight: '700' },

  metaRow:   { flexDirection: 'row', alignItems: 'center' },
  typeLabel: { fontSize: 12, fontWeight: '500' },
  duration:  { ...TextStyles.caption, color: Colors.text.tertiary },
  division:  { ...TextStyles.caption, color: Colors.text.tertiary },

  scoreBar:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  scoreTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden',
  },
  scoreFill: { height: '100%', borderRadius: 2 },
  scoreLabel: { fontSize: 11, fontWeight: '700', minWidth: 80 },

  time: { ...TextStyles.caption, color: Colors.text.tertiary, flexShrink: 0, marginTop: 3 },
});

export default CallLogScreen;
styles = makeStyles(Colors);
