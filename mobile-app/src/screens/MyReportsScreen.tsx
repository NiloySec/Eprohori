import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSpamNumberStore, SPAM_CATEGORIES, calcSpamScore, getSpamLabel, type SpamCategory } from '@stores';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import type { MyReportsScreenProps } from '@navigation/types';
import type { NumberRecord } from '@stores';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// N: local vector-icon mapping for in-app UI — SPAM_CATEGORIES.icon stays emoji since it
// also feeds OS notification text; same mapping used in CallerIDScreen.
const CATEGORY_ICON: Record<SpamCategory, MCIcon> = {
  fraud_call: 'cash-remove', telemarketing: 'bullhorn-outline', otp_abuse: 'key-outline',
  threat: 'alert-outline', robocall: 'robot-outline', silence: 'volume-off', other: 'help-circle-outline',
};

const MyReportsScreen = ({ navigation }: MyReportsScreenProps) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const getAllNumbers = useSpamNumberStore((s) => s.getAllNumbers);
  const removeReports = useSpamNumberStore((s) => s.removeReports);
  const records = getAllNumbers();

  const confirmDelete = (number: string) => {
    Alert.alert(
      'রিপোর্ট মুছুন',
      `${number} নম্বরের সব রিপোর্ট মুছে ফেলা হবে। নিশ্চিত?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        { text: 'মুছুন', style: 'destructive', onPress: () => removeReports(number) },
      ]
    );
  };

  const renderItem = ({ item }: { item: NumberRecord }) => {
    const score  = calcSpamScore(item.reports);
    const label  = getSpamLabel(score);
    const latest = Math.max(...item.reports.map((r) => r.reported_at));

    // Top category by count
    const catCount: Record<string, number> = {};
    for (const r of item.reports) catCount[r.category] = (catCount[r.category] ?? 0) + 1;
    const topCatKey = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const catMeta   = topCatKey ? SPAM_CATEGORIES[topCatKey as keyof typeof SPAM_CATEGORIES] : null;

    const latestDate = new Date(latest).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });

    return (
      <View style={styles.item}>
        <View style={styles.itemInfo}>
          <Text style={styles.number}>{item.number}</Text>
          <View style={styles.badges}>
            {catMeta && topCatKey && (
              <View style={styles.catBadge}>
                <Icon name={CATEGORY_ICON[topCatKey as SpamCategory]} size={11} color={Colors.threat} />
                <Text style={styles.catText}>{catMeta.label_bn}</Text>
              </View>
            )}
            <View style={[styles.scoreBadge, { backgroundColor: `${label.color}18` }]}>
              <Text style={[styles.scoreText, { color: label.color }]}>
                {Math.round(score * 100)}% · {label.text}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {item.reports.length} টি রিপোর্ট · {latestDate}
          </Text>
        </View>
        <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(item.number)}>
          <Icon name="trash-can-outline" size={20} color={Colors.threat} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Icon name="flag-checkered" size={24} color={Colors.accent} />
        </View>
        <Text style={styles.title}>আমার রিপোর্ট</Text>
        <Text style={styles.subtitle}>
          {records.length === 0
            ? 'কোনো রিপোর্ট নেই'
            : `${records.length} টি নম্বর রিপোর্ট করা হয়েছে`}
        </Text>
      </LinearGradient>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="flag-outline" size={56} color={Colors.text.tertiary} />
          <Text style={styles.emptyTitle}>কোনো রিপোর্ট নেই</Text>
          <Text style={styles.emptyDesc}>
            কোনো নম্বর স্প্যাম রিপোর্ট করলে এখানে দেখা যাবে
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.number}
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

  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'],
  },
  back: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  list: { padding: Spacing.lg, paddingBottom: 40 },
  sep:  { height: 1, backgroundColor: Colors.border, marginVertical: 2 },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.md,
  },
  itemInfo: { flex: 1, gap: 5 },
  number:   { ...TextStyles.h3, color: Colors.text.primary },

  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${Colors.threat}18`, borderRadius: BorderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  catText:   { fontSize: 11, color: Colors.threat, fontWeight: '600' },
  scoreBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText:  { fontSize: 11, fontWeight: '600' },

  meta: { ...TextStyles.caption, color: Colors.text.tertiary },

  trashBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${Colors.threat}10`, borderWidth: 1, borderColor: `${Colors.threat}30`,
    justifyContent: 'center', alignItems: 'center',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.md },
  emptyTitle: { ...TextStyles.h3, color: Colors.text.secondary },
  emptyDesc:  { ...TextStyles.body, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 22 },
});

export default MyReportsScreen;
styles = makeStyles(Colors);
