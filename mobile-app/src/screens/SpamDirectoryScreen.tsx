import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, Share, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { AllSafeIllustration, NoResultsIllustration } from '@components';
import { useSpamNumberStore, SPAM_CATEGORIES, calcSpamScore, getSpamLabel, type SpamCategory } from '@stores';
import { analyzePhoneLocally } from '@utils';
import { threatAnalysisAPI, type CommunitySpamEntry } from '@api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

// M2: cache community numbers in AsyncStorage — avoids network on every mount
const COMMUNITY_CACHE_KEY = 'eprohori.community_spam_v1';
const COMMUNITY_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// H7: wrap AsyncStorage calls in a timeout to prevent UI freeze on slow devices
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function loadCommunityCache(): Promise<{ data: CommunitySpamEntry[]; stale: boolean } | null> {
  try {
    const raw = await withTimeout(AsyncStorage.getItem(COMMUNITY_CACHE_KEY), 2000, null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: CommunitySpamEntry[]; timestamp: number };
    const stale = Date.now() - parsed.timestamp > COMMUNITY_CACHE_TTL;
    return { data: parsed.data, stale };
  } catch {
    return null;
  }
}

async function saveCommunityCache(data: CommunitySpamEntry[]): Promise<void> {
  try {
    await withTimeout(
      AsyncStorage.setItem(COMMUNITY_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })),
      2000,
      undefined
    );
  } catch {}
}

type Props = NativeStackScreenProps<RootStackParamList, 'SpamDirectory'>;

const operatorColor: Record<string, string> = {
  'Grameenphone': '#00A651',
  'Banglalink':   '#E3000B',
  'Robi':         '#E2001A',
  'Airtel/Robi':  '#E2001A',
  'Teletalk':     '#1B4FA8',
};

const SpamDirectoryScreen = ({ navigation }: Props) => {
  const [query, setQuery] = useState('');
  const [communityNums, setCommunityNums] = useState<CommunitySpamEntry[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const { getAllNumbers, removeReports, getTopCategory } = useSpamNumberStore();

  const fetchCommunity = useCallback(async () => {
    // M2: load from cache first for instant display, then refresh if stale
    const cached = await loadCommunityCache();
    if (cached) {
      setCommunityNums(cached.data);
      if (!cached.stale) return; // cache still fresh — skip network
    }

    setLoadingCommunity(true);
    try {
      const data = await threatAnalysisAPI.fetchCommunitySpamNumbers();
      setCommunityNums(data);
      await saveCommunityCache(data);
    } catch {}
    finally { setLoadingCommunity(false); }
  }, []);

  useEffect(() => { fetchCommunity(); }, [fetchCommunity]);

  const localNumbers = getAllNumbers();

  // Merge: local takes priority; community entries not in local are appended
  const allNumbers = useMemo(() => {
    const localSet = new Set(localNumbers.map((r) => r.number.replace(/\D/g, '')));
    const communityOnly = communityNums.filter(
      (c) => !localSet.has(c.number.replace(/\D/g, ''))
    );
    return [
      ...localNumbers.map((r) => ({ ...r, _source: 'local' as const })),
      ...communityOnly.map((c) => ({
        number:   c.number,
        reports:  Array.from({ length: Math.max(c.count, 1) }, () => ({
          category:    c.category as SpamCategory,
          note:        c.note ?? '',
          reported_at: Date.now(),
        })),
        _source: 'community' as const,
      })),
    ];
  }, [localNumbers, communityNums]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allNumbers;
    const q = query.replace(/\D/g, '');
    return allNumbers.filter((r) => r.number.replace(/\D/g, '').includes(q));
  }, [allNumbers, query]);

  const totalReports = allNumbers.reduce((sum, r) => sum + r.reports.length, 0);

  const handleDelete = (number: string) => {
    Alert.alert(
      'রিপোর্ট মুছুন',
      `"${number}" নম্বরের সব রিপোর্ট মুছে ফেলবেন?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছুন', style: 'destructive',
          onPress: () => removeReports(number),
        },
      ]
    );
  };

  const handleCheck = (number: string) => {
    navigation.navigate('CallerID', { initialNumber: number });
  };

  const handleShare = async (number: string, count: number) => {
    const topCat = getTopCategory(number);
    const catInfo = topCat ? SPAM_CATEGORIES[topCat as SpamCategory] : null;
    await Share.share({
      message:
        `⚠️ সতর্কতা! এই নম্বরটি প্রতারণামূলক:\n${number}\n` +
        (catInfo ? `ধরন: ${catInfo.label_bn}\n` : '') +
        `রিপোর্ট: ${count} বার\n\nEProhori অ্যাপ দিয়ে যাচাই করুন।`,
    });
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
          <View style={styles.headerIcon}>
            <Icon name="shield-alert" size={26} color={Colors.accent} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.title}>স্প্যাম নম্বর তালিকা</Text>
            {loadingCommunity
              ? <ActivityIndicator size="small" color={Colors.accent} />
              : communityNums.length > 0 &&
                <View style={styles.communityBadge}>
                  <Icon name="earth" size={12} color="#818cf8" />
                  <Text style={styles.communityBadgeText}>+{communityNums.length}</Text>
                </View>
            }
          </View>
          <Text style={styles.subtitle}>কমিউনিটি রিপোর্ট করা নম্বরসমূহ</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{allNumbers.length}</Text>
              <Text style={styles.statLabel}>নম্বর</Text>
            </View>
            <View style={[styles.statBox, { borderColor: Colors.border }]}>
              <Text style={[styles.statNum, { color: Colors.threat }]}>{totalReports}</Text>
              <Text style={styles.statLabel}>মোট রিপোর্ট</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.suspicious }]}>
                {allNumbers.filter((r) => r.reports.length >= 3).length}
              </Text>
              <Text style={styles.statLabel}>উচ্চ ঝুঁকি</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Icon name="magnify" size={18} color={Colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="নম্বর খুঁজুন..."
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="phone-pad"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Icon name="close-circle" size={18} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Empty state */}
          {allNumbers.length === 0 && (
            <View style={styles.emptyBox}>
              <AllSafeIllustration color={Colors.safe} size={110} />
              <Text style={styles.emptyTitle}>কোনো রিপোর্ট নেই</Text>
              <Text style={styles.emptyText}>
                কোনো স্প্যাম বা প্রতারণার কল পেলে CallerID স্ক্রিন থেকে নম্বরটি রিপোর্ট করুন।
                আপনার রিপোর্ট এখানে সংরক্ষিত থাকবে।
              </Text>
            </View>
          )}

          {/* Number list */}
          {filtered.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                {query ? `"${query}" — ${filtered.length}টি ফলাফল` : 'সর্বোচ্চ রিপোর্ট'}
              </Text>
              {filtered.map((record, idx) => {
                const pf        = analyzePhoneLocally(record.number);
                const topCat    = getTopCategory(record.number)
                                  ?? (record._source === 'community' ? record.reports[0]?.category : undefined);
                const catInfo   = topCat ? SPAM_CATEGORIES[topCat as SpamCategory] : null;
                const count     = record.reports.length;
                const score     = calcSpamScore(record.reports);
                const scoreLbl  = score > 0 ? getSpamLabel(score) : null;
                const opColor   = pf.operator ? (operatorColor[pf.operator] ?? Colors.accent) : Colors.accent;
                const riskColor = count >= 5 ? Colors.threat : count >= 2 ? Colors.suspicious : Colors.text.tertiary;
                const isCommunity = record._source === 'community';

                return (
                  <View key={idx} style={[styles.card, { borderLeftColor: riskColor }]}>
                    <View style={styles.cardTop}>
                      {/* Icon + number */}
                      <View style={[styles.iconWrap, { backgroundColor: `${riskColor}20` }]}>
                        <Icon
                          name={count >= 5 ? 'phone-remove' : 'phone-alert'}
                          size={20} color={riskColor}
                        />
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.numberRow}>
                          <Text style={styles.numberText}>{pf.formatted}</Text>
                          {pf.operator_bn && (
                            <View style={[styles.opBadge, { backgroundColor: `${opColor}20`, borderColor: `${opColor}40` }]}>
                              <Text style={[styles.opBadgeText, { color: opColor }]}>{pf.operator_bn}</Text>
                            </View>
                          )}
                          {isCommunity && (
                            <View style={styles.communityTag}>
                              <Icon name="earth" size={10} color="#818cf8" />
                              <Text style={styles.communityTagText}>কমিউনিটি</Text>
                            </View>
                          )}
                        </View>
                        {catInfo && (
                          <Text style={styles.catText}>{catInfo.label_bn}</Text>
                        )}
                        {scoreLbl && (
                          <View style={styles.scoreRow}>
                            <View style={styles.scoreTrack}>
                              <View style={[styles.scoreFill, { width: `${score * 100}%` as any, backgroundColor: scoreLbl.color }]} />
                            </View>
                            <Text style={[styles.scoreLabel, { color: scoreLbl.color }]}>{scoreLbl.text}</Text>
                          </View>
                        )}
                      </View>
                      {/* Report count badge */}
                      <View style={[styles.countBadge, { backgroundColor: `${riskColor}20`, borderColor: `${riskColor}40` }]}>
                        <Text style={[styles.countNum, { color: riskColor }]}>{count}</Text>
                        <Text style={[styles.countLabel, { color: riskColor }]}>রিপোর্ট</Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleCheck(record.number)}
                      >
                        <Icon name="magnify" size={14} color={Colors.accent} />
                        <Text style={styles.actionBtnText}>বিস্তারিত</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#818cf818', borderColor: '#818cf840' }]}
                        onPress={() => handleShare(record.number, record.reports.length)}
                      >
                        <Icon name="share-variant-outline" size={14} color="#818cf8" />
                        <Text style={[styles.actionBtnText, { color: '#818cf8' }]}>শেয়ার</Text>
                      </TouchableOpacity>
                      {!isCommunity && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDanger]}
                          onPress={() => handleDelete(record.number)}
                        >
                          <Icon name="delete-outline" size={14} color={Colors.threat} />
                          <Text style={[styles.actionBtnText, { color: Colors.threat }]}>মুছুন</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* No search results */}
          {allNumbers.length > 0 && filtered.length === 0 && (
            <View style={styles.emptyBox}>
              <NoResultsIllustration color={Colors.text.tertiary} size={80} />
              <Text style={[styles.emptyTitle, { marginTop: 10 }]}>কোনো মিল পাওয়া যায়নি</Text>
              <Text style={styles.emptyText}>"{query}" নম্বরটি রিপোর্ট তালিকায় নেই।</Text>
            </View>
          )}

          {/* Info box */}
          <View style={styles.infoBox}>
            <Icon name="information-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.infoText}>
              এই তালিকাটি শুধুমাত্র আপনার ডিভাইসে সংরক্ষিত। CallerID স্ক্রিন থেকে নম্বর রিপোর্ট করুন।
            </Text>
          </View>
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
  communityBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#818cf820', borderRadius: 6 },
  communityBadgeText: { fontSize: 11, fontWeight: '700', color: '#818cf8' },
  communityTag:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#818cf815', borderRadius: 4, borderWidth: 1, borderColor: '#818cf830' },
  communityTagText:   { fontSize: 10, fontWeight: '600', color: '#818cf8' },

  body: { padding: Spacing.lg },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statBox: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  statNum:   { ...TextStyles.h2, color: Colors.accent, fontSize: 22 },
  statLabel: { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, gap: 8,
    ...Shadows.small,
  },
  searchIcon:  {},
  searchInput: { flex: 1, ...TextStyles.body, color: Colors.text.primary, padding: 0 },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, marginBottom: Spacing.md,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconWrap:   { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardInfo:   { flex: 1 },
  numberRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  numberText: { ...TextStyles.body, color: Colors.text.primary, fontWeight: '700' },
  opBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  opBadgeText:{ fontSize: 10, fontWeight: '700' },
  catText:    { ...TextStyles.caption, color: Colors.text.secondary },
  scoreRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  scoreTrack: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  scoreFill:  { height: '100%', borderRadius: 2 },
  scoreLabel: { fontSize: 10, fontWeight: '700', minWidth: 90, textAlign: 'right' },

  countBadge: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  countNum:   { fontSize: 18, fontWeight: '800' },
  countLabel: { fontSize: 9, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.accentGlow, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderAccent,
  },
  actionBtnDanger: { backgroundColor: `${Colors.threat}10`, borderColor: `${Colors.threat}30` },
  actionBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '600' },

  emptyBox: {
    alignItems: 'center', padding: Spacing['2xl'],
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  emptyTitle: { ...TextStyles.body, color: Colors.accent, fontWeight: '700', marginBottom: 8 },
  emptyText:  { ...TextStyles.caption, color: Colors.text.secondary, textAlign: 'center', lineHeight: 20 },

  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    padding: Spacing.md, backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    marginTop: Spacing.md,
    ...Shadows.small,
  },
  infoText: { ...TextStyles.caption, color: Colors.text.tertiary, flex: 1, lineHeight: 18 },
});

export default SpamDirectoryScreen;
