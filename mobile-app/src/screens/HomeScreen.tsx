import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useHistoryStore, useAnalysisStore, useSettingsStore, useSpamNumberStore, useAuthStore, type HistoryEntry } from '@stores';
import { categorizeSms } from '@utils';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { DevWarningBanner, DeviceSecurityBanner, NoScansIllustration, Skeleton } from '@components';
import type { HomeScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Security Score Calculator ──────────────────────────────────────────────────

const useSecurityScore = () => {
  const settings = useSettingsStore();
  const entries = useHistoryStore((s) => s.entries);

  return useMemo(() => {
    let score = 30; // base score for installing EProhori

    if (settings.appLockEnabled) score += 20;
    if (settings.notificationsEnabled) score += 10;
    if (settings.callScreeningEnabled) score += 15;
    if (settings.smsAutoScanEnabled) score += 15;
    if (settings.districtAlertEnabled) score += 10;

    // Penalty for unaddressed critical threats in last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentThreats = entries.filter(e => e.timestamp > weekAgo && e.result.confidence >= 75).length;
    score = Math.max(0, score - (recentThreats * 5));

    return Math.min(100, score);
  }, [settings, entries]);
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SecurityGauge = ({ score }: { score: number }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const isOptimal = score >= 90;
  const isGood = score >= 70;
  const color = isOptimal ? Colors.safe : isGood ? Colors.accent : Colors.threat;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.gaugeRoot}>
      <Animated.View style={[styles.gaugeRing, { transform: [{ scale: pulse }], borderColor: `${color}44` }]} />
      <LinearGradient colors={[`${color}44`, 'transparent']} style={styles.gaugeFill}>
        <View style={[styles.gaugeInner, { borderColor: color }]}>
          <Text style={[styles.gaugeScore, { color }]}>{score}%</Text>
          <Text style={styles.gaugeLabel}>সুরক্ষা স্কোর</Text>
        </View>
      </LinearGradient>
      <View style={styles.gaugeStatusBox}>
         <Icon name={isOptimal ? 'shield-check' : 'shield-alert'} size={20} color={color} />
         <Text style={[styles.gaugeStatusText, { color }]}>
           {isOptimal ? 'আপনার ফোন অভেদ্য' : isGood ? 'ফোন সুরক্ষিত আছে' : 'সুরক্ষা বাড়ানো প্রয়োজন'}
         </Text>
      </View>
    </View>
  );
};

const ActionCard = ({ icon, label, sub, color, onPress }: {
  icon: MCIcon; label: string; sub: string; color: string; onPress: () => void;
}) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.actionIconBox, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={24} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </View>
    <Icon name="chevron-right" size={20} color={Colors.text.tertiary} />
  </TouchableOpacity>
);

const ServiceItem = ({ icon, label, color, onPress }: {
  icon: MCIcon; label: string; color: string; onPress: () => void;
}) => (
  <TouchableOpacity style={styles.serviceItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.serviceIconBox, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={24} color={color} />
    </View>
    <Text style={styles.serviceLabel}>{label}</Text>
  </TouchableOpacity>
);

const HistoryItem = ({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) => {
  const conf  = entry.result.confidence;
  const color = conf >= 75 ? Colors.threat : conf >= 60 ? Colors.suspicious : Colors.safe;
  const date  = new Date(entry.timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
  const cat   = categorizeSms(entry.message);

  return (
    <TouchableOpacity style={styles.historyItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.historyDot, { backgroundColor: color }]} />
      <View style={styles.historyBody}>
        <Text style={styles.historyMsg} numberOfLines={1}>{entry.message}</Text>
        <View style={styles.historyMeta}>
          <Text style={[styles.historyConf, { color }]}>{Math.round(conf)}% নিশ্চিত</Text>
          <Text style={styles.historyDate}>{date}</Text>
        </View>
      </View>
      {cat.category !== 'unknown' && (
        <View style={[styles.miniBadge, { backgroundColor: `${cat.color}15` }]}>
          <Text style={[styles.miniBadgeText, { color: cat.color }]}>{cat.label_bn}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const seniorModeEnabled = useSettingsStore((s) => s.seniorModeEnabled);

  const t = useTranslation();
  const activeProfile        = useSettingsStore((s) => s.activeProfile);
  const getEntriesForProfile = useHistoryStore((s) => s.getEntriesForProfile);
  const setCurrentMessage    = useAnalysisStore((s) => s.setMessage);
  const setCurrentResult     = useAnalysisStore((s) => s.setResult);

  const entries = React.useMemo(
    () => getEntriesForProfile(activeProfile),
    [activeProfile, getEntriesForProfile],
  );

  const stats = React.useMemo(() => ({
    today:    entries.filter((e) => e.timestamp >= new Date().setHours(0,0,0,0)).length,
    critical: entries.filter((e) => e.result.confidence >= 75).length,
  }), [entries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const handleEntryPress = (entry: HistoryEntry) => {
    setCurrentMessage(entry.message);
    setCurrentResult(entry.result);
    navigation.navigate('ResultDetail');
  };

  const securityScore = useSecurityScore();

  return (
    <SafeAreaView style={styles.safe}>
      <DevWarningBanner />
      <DeviceSecurityBanner />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* ── Cyber Command Center Header ── */}
        <LinearGradient colors={['#1a0a1f', '#050810']} style={styles.header}>
          <View style={styles.navRow}>
            <View style={styles.brand}>
              <Text style={styles.brandTitle}>EProhori</Text>
              <View style={styles.liveTag}><View style={styles.liveDot} /><Text style={styles.liveText}>Live Intelligence</Text></View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.profileBtn}>
              <Icon name="cog-outline" size={24} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <SecurityGauge score={securityScore} />

          {securityScore < 100 && (
            <TouchableOpacity
              style={styles.recCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="lightbulb-on" size={18} color={Colors.accent} />
              <Text style={styles.recText}>
                {securityScore < 70 ? 'আপনার সুরক্ষা লেভেল অত্যন্ত কম। অ্যাপ লক এবং অটো-স্ক্যান অন করুন।' : 'সুরক্ষা স্কোর ১০০% করতে সব অপশন চালু করুন।'}
              </Text>
              <Icon name="chevron-right" size={16} color={Colors.accent} />
            </TouchableOpacity>
          )}

          <View style={styles.quickStats}>
            <View style={styles.qStat}>
              <Text style={styles.qStatLabel}>আজকের স্ক্যান</Text>
              <Text style={styles.qStatVal}>{stats.today}</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <Text style={styles.qStatLabel}>মোট ঝুঁকি</Text>
              <Text style={[styles.qStatVal, { color: Colors.threat }]}>{stats.critical}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Main Defense Core ── */}
          <Text style={styles.sectionTitle}>মূল প্রতিরক্ষা (Core Defense)</Text>
          <View style={styles.mainTools}>
            <TouchableOpacity
              style={[styles.bigCard, { backgroundColor: '#1e293b' }]}
              onPress={() => navigation.navigate('Analyzer')}
            >
              <LinearGradient colors={['rgba(0, 255, 204, 0.15)', 'transparent']} style={styles.bigCardGrad} />
              <Icon name="shield-search" size={32} color={Colors.accent} />
              <Text style={styles.bigCardTitle}>স্মার্ট এনালাইজার</Text>
              <Text style={styles.bigCardSub}>টেক্সট ও ইমেজ এনালাইসিস</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bigCard, { backgroundColor: '#1e293b' }]}
              onPress={() => navigation.navigate('CallerID')}
            >
              <LinearGradient colors={['rgba(129, 140, 248, 0.15)', 'transparent']} style={styles.bigCardGrad} />
              <Icon name="phone-filter" size={32} color="#818cf8" />
              <Text style={styles.bigCardTitle}>কলার আইডি</Text>
              <Text style={styles.bigCardSub}>স্প্যাম কল ও নম্বর ডিটেকশন</Text>
            </TouchableOpacity>
          </View>

          {/* ── Security Services ── */}
          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>নিরাপত্তা সেবা (Security Services)</Text>
          <View style={styles.serviceGrid}>
            <ServiceItem
              icon="leak"
              label="লিক মনিটর"
              color="#fbbf24"
              onPress={() => navigation.navigate('BreachMonitor')}
            />
            <ServiceItem
              icon="gavel"
              label="আইনি সহায়তা"
              color="#a78bfa"
              onPress={() => navigation.navigate('LegalSupport')}
            />
            <ServiceItem
              icon="bell-ring-outline"
              label="ফ্রড এলার্ট"
              color="#f472b6"
              onPress={() => navigation.navigate('FraudAlerts')}
            />
            <ServiceItem
              icon="database-search"
              label="স্প্যাম ডিরেক্টরি"
              color="#2dd4bf"
              onPress={() => navigation.navigate('SpamDirectory')}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>সাম্প্রতিক কার্যক্রম</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>সব দেখুন →</Text>
            </TouchableOpacity>
          </View>

          {refreshing ? (
            <View style={styles.historyList}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ padding: 18, gap: 10 }}>
                  <Skeleton width="90%" height={18} />
                  <Skeleton width="50%" height={14} />
                </View>
              ))}
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <NoScansIllustration size={100} color="rgba(255,255,255,0.05)" />
              <Text style={styles.emptyText}>সুরক্ষা নিশ্চিত করতে প্রথম স্ক্যানটি করুন</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {entries.slice(0, 5).map(e => (
                <HistoryItem key={e.id} entry={e} onPress={() => handleEntryPress(e)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050810' },
  scroll: { paddingBottom: 40 },

  header: {
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.05)',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.8 },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0, 229, 196, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0, 229, 196, 0.2)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ffcc' },
  liveText: { fontSize: 9, fontWeight: '800', color: '#00ffcc', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 255, 204, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 255, 204, 0.1)' },

  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 40,
    marginTop: 10,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.2)',
    gap: 10,
  },
  recText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 18,
  },

  // Gauge Styles
  gaugeRoot: { alignItems: 'center', marginVertical: 10 },
  gaugeRing: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, opacity: 0.5,
  },
  gaugeFill: {
    width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  gaugeInner: {
    width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#050810', borderWidth: 3,
    ...Shadows.large, shadowColor: Colors.accent,
  },
  gaugeScore: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  gaugeLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '700', textTransform: 'uppercase', marginTop: -2 },
  gaugeStatusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 25,
    backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  gaugeStatusText: { fontSize: 14, fontWeight: '700' },

  quickStats: {
    flexDirection: 'row', marginTop: 35, marginHorizontal: 30,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  qStat: { flex: 1, alignItems: 'center' },
  qStatVal: { fontSize: 24, fontWeight: '900', color: Colors.accent },
  qStatLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 2 },
  qStatDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

  body: { padding: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 15, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, color: Colors.accent, fontWeight: '700' },

  mainTools: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  bigCard: {
    flex: 1,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...Shadows.small,
  },
  bigCardGrad: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bigCardTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 15 },
  bigCardSub: { color: Colors.text.tertiary, fontSize: 11, marginTop: 4, lineHeight: 15 },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  serviceItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0d1321',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  serviceIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  serviceLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  toolGrid: { gap: 15, marginBottom: 30 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#0d1321', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...Shadows.small,
  },
  actionIconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 18 },
  actionLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  actionSub: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },

  historyList: { backgroundColor: '#0d1321', borderRadius: 28, padding: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  historyBody: { flex: 1 },
  historyMsg: { fontSize: 15, color: '#fff', fontWeight: '600' },
  historyMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  historyConf: { fontSize: 11, fontWeight: '700' },
  historyDate: { fontSize: 11, color: Colors.text.tertiary },
  miniBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  miniBadgeText: { fontSize: 10, fontWeight: '900' },

  empty: { alignItems: 'center', paddingVertical: 40, opacity: 0.6 },
  emptyText: { color: Colors.text.tertiary, fontSize: 14, marginTop: 15, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});

export default HomeScreen;
