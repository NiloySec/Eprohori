import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';
import { CollapsibleSection } from '@components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CyberReport'>;
type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Authority data ────────────────────────────────────────────────────────────
// N: colors limited to the app's 4-tone system palette for visual restraint
const ORG_TEAL = Colors.accent;
const ORG_RED = Colors.threat;
const ORG_INDIGO = '#818cf8';
const ORG_GREEN = Colors.safe;

const AUTHORITIES: {
  id: string; icon: MCIcon; name: string; org: string; desc: string;
  phone?: string; url?: string; color: string; type: 'call' | 'web';
}[] = [
  {
    id: 'btrc',
    icon:  'radio-tower',
    name:  'BTRC হেল্পলাইন',
    org:   'বাংলাদেশ টেলিযোগাযোগ নিয়ন্ত্রণ কমিশন',
    desc:  'ফোন কল বা SMS-এ প্রতারণা, অবৈধ SIM, স্প্যাম কল রিপোর্ট করুন',
    phone: '10678',
    color: ORG_TEAL,
    type:  'call',
  },
  {
    id: 'police',
    icon:  'police-badge',
    name:  'পুলিশ সাইবার ক্রাইম',
    org:   'CID Cyber Crime Investigation Division',
    desc:  'অনলাইন প্রতারণা, ডিজিটাল আর্থিক জালিয়াতি রিপোর্ট করুন',
    phone: '01769693922',
    color: ORG_INDIGO,
    type:  'call',
  },
  {
    id: 'rab',
    icon:  'flash-outline',
    name:  'RAB সাইবার ক্রাইম',
    org:   'র‍্যাপিড অ্যাকশন ব্যাটালিয়ন',
    desc:  'সাইবার অপরাধ, ব্ল্যাকমেইল, হুমকি রিপোর্ট করুন',
    phone: '01320010111',
    color: ORG_RED,
    type:  'call',
  },
  {
    id: 'cirt',
    icon:  'shield-lock-outline',
    name:  'BGD e-GOV CIRT',
    org:   'জাতীয় সাইবার নিরাপত্তা এজেন্সি',
    desc:  'ফিশিং লিংক, ম্যালওয়্যার, ডেটা চুরি রিপোর্ট করুন',
    url:   'https://www.cirt.gov.bd',
    color: ORG_TEAL,
    type:  'web',
  },
  {
    id: 'consumer',
    icon:  'account-group-outline',
    name:  'ভোক্তা অধিকার',
    org:   'ভোক্তা অধিকার সংরক্ষণ অধিদপ্তর',
    desc:  'পণ্য বা সেবায় প্রতারণা, মিথ্যা বিজ্ঞাপন রিপোর্ট করুন',
    phone: '16123',
    color: ORG_GREEN,
    type:  'call',
  },
  {
    id: 'emergency',
    icon:  'alarm-light-outline',
    name:  'জাতীয় জরুরি সেবা',
    org:   'Bangladesh National Emergency Service',
    desc:  'তাৎক্ষণিক বিপদে পুলিশ / অ্যাম্বুলেন্স / ফায়ার সার্ভিস',
    phone: '999',
    color: ORG_RED,
    type:  'call',
  },
];

// ── Safety tips ───────────────────────────────────────────────────────────────

const TIPS: { icon: MCIcon; text: string }[] = [
  { icon: 'camera-outline',  text: 'স্ক্রিনশট ও চ্যাটের ছবি সংরক্ষণ করুন — এটি প্রমাণ হিসেবে কাজ করবে' },
  { icon: 'numeric',         text: 'প্রতারকের নম্বর ও বার্তা সংরক্ষণ করুন, মুছবেন না' },
  { icon: 'key-outline',     text: 'কাউকে OTP, PIN বা পাসওয়ার্ড দেবেন না — কোনো প্রকৃত সংস্থা চায় না' },
  { icon: 'cash-remove',     text: 'যে কোনো অপরিচিত নম্বরে টাকা পাঠানোর আগে যাচাই করুন' },
  { icon: 'link-off',        text: 'অজানা লিংকে ক্লিক করবেন না — আগে URL দেখুন' },
];

// ── Component ─────────────────────────────────────────────────────────────────

const CyberReportScreen = ({ navigation }: Props) => {

  const callAuthority = async (phone: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert(name, `নম্বর: ${phone}`);
    }
  };

  const openWeb = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
  };

  const shareEvidence = async () => {
    try {
      await Share.share({
        message:
          'আমি একটি সাইবার প্রতারণার শিকার হয়েছি। EProhori অ্যাপ দিয়ে বিশ্লেষণ করেছি।\n\n' +
          'রিপোর্ট করুন:\n' +
          '• BTRC: 10678\n' +
          '• পুলিশ সাইবার ক্রাইম: 01769-693922\n' +
          '• জরুরি: 999',
        title: 'সাইবার প্রতারণা রিপোর্ট',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient colors={['#1a0a2e', '#0f0f0f']} style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="shield-alert" size={28} color={Colors.threat} />
          </View>
          <Text style={styles.title}>সাইবার ক্রাইম রিপোর্ট</Text>
          <Text style={styles.subtitle}>প্রতারণার শিকার হলে কোথায় জানাবেন</Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── Urgent warning ── */}
          <View style={styles.urgentBox}>
            <Icon name="alert" size={18} color={Colors.threat} />
            <Text style={styles.urgentText}>
              আর্থিক ক্ষতি হলে <Text style={{ fontWeight: '800' }}>যত দ্রুত সম্ভব</Text> রিপোর্ট করুন
            </Text>
          </View>

          {/* ── Authorities ── */}
          <Text style={styles.sectionLabel}>কর্তৃপক্ষ</Text>
          {AUTHORITIES.map((auth) => (
            <View key={auth.id} style={[styles.card, { borderLeftColor: auth.color }]}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: `${auth.color}18` }]}>
                  <Icon name={auth.icon} size={20} color={auth.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: auth.color }]}>{auth.name}</Text>
                  <Text style={styles.cardOrg}>{auth.org}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{auth.desc}</Text>

              {auth.type === 'call' ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${auth.color}18`, borderColor: `${auth.color}40` }]}
                  onPress={() => callAuthority(auth.phone!, auth.name)}
                  activeOpacity={0.7}
                >
                  <Icon name="phone" size={15} color={auth.color} />
                  <Text style={[styles.actionBtnText, { color: auth.color }]}>
                    {auth.phone} — কল করুন
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${auth.color}18`, borderColor: `${auth.color}40` }]}
                  onPress={() => openWeb(auth.url!)}
                  activeOpacity={0.7}
                >
                  <Icon name="web" size={15} color={auth.color} />
                  <Text style={[styles.actionBtnText, { color: auth.color }]}>
                    ওয়েবসাইটে রিপোর্ট করুন
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* ── What to do tips ── */}
          <View style={{ marginTop: Spacing.md }}>
            <CollapsibleSection icon="lightbulb-outline" title="প্রতারণা হলে কী করবেন" badge={String(TIPS.length)}>
              {TIPS.map((tip, i) => (
                <View key={i} style={[styles.tipRow, i > 0 && styles.tipDivider]}>
                  <Icon name={tip.icon} size={18} color={Colors.text.secondary} style={styles.tipIcon} />
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </CollapsibleSection>
          </View>

          {/* ── Share evidence button ── */}
          <TouchableOpacity style={styles.shareBtn} onPress={shareEvidence} activeOpacity={0.8}>
            <Icon name="share-variant" size={18} color={Colors.primary} />
            <Text style={styles.shareBtnText}>রিপোর্ট তথ্য শেয়ার করুন</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: 48 },

  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'],
  },
  back: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: `${Colors.threat}18`, borderWidth: 1, borderColor: `${Colors.threat}40`,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.threat },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  body: { padding: Spacing.lg },

  urgentBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: `${Colors.threat}14`, borderWidth: 1, borderColor: `${Colors.threat}30`,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  urgentText: { ...TextStyles.body, color: Colors.threat, flex: 1, lineHeight: 22 },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: Spacing.sm, marginTop: Spacing.md,
  },

  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardIcon:     { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardInfo:     { flex: 1 },
  cardName:     { ...TextStyles.body, fontWeight: '700' },
  cardOrg:      { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },
  cardDesc:     { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 18 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  actionBtnText: { ...TextStyles.body, fontWeight: '700' },

  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  tipDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  tipIcon: { width: 22, marginTop: 2 },
  tipText: { ...TextStyles.body, color: Colors.text.secondary, flex: 1, lineHeight: 22 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg, paddingVertical: 14,
  },
  shareBtnText: { ...TextStyles.button, color: Colors.primary },
});

export default CyberReportScreen;
