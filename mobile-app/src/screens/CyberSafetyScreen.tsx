import React, { useState } from 'react';
import {
  View, ScrollView, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';
import { CollapsibleSection } from '@components';
import type { CyberSafetyScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// ── Data ─────────────────────────────────────────────────────────────────────

interface FraudType {
  id: string;
  icon: MCIcon;
  title: string;
  subtitle: string;
  color: string;
  examples: string[];
  signals: string[];
  defense: string[];
}

const FRAUD_TYPES: FraudType[] = [
  {
    id: 'mfs_fraud',
    icon: 'credit-card-off-outline',
    title: 'বিকাশ / নগদ প্রতারণা',
    subtitle: 'মোবাইল ব্যাংকিং অ্যাকাউন্ট টার্গেট',
    color: Colors.threat,
    examples: [
      '"আপনার বিকাশ অ্যাকাউন্ট বন্ধ হয়ে যাবে — এখনই PIN দিন"',
      '"আমি বিকাশ এজেন্ট, ভুলক্রমে আপনার নম্বরে টাকা গেছে, ফেরত দিন"',
      '"KYC আপডেট করতে OTP দিন"',
    ],
    signals: [
      'বিকাশ/নগদ PIN বা পাসওয়ার্ড চাওয়া',
      'অ্যাকাউন্ট বন্ধ বা ব্লকের হুমকি',
      'ভুল ট্রান্সফারের গল্প বলে ফেরত চাওয়া',
      'KYC বা যাচাই নামে OTP চাওয়া',
    ],
    defense: [
      'বিকাশ/নগদ কখনো PIN বা OTP ফোনে চায় না',
      'শুধু অফিসিয়াল অ্যাপে লগিন করুন',
      'অপরিচিত ক্যাশ-আউট রিকোয়েস্ট করবেন না',
    ],
  },
  {
    id: 'otp_theft',
    icon: 'lock-alert-outline',
    title: 'OTP চুরির চেষ্টা',
    subtitle: 'কোড শেয়ার করিয়ে অ্যাকাউন্ট দখল',
    color: Colors.threat,
    examples: [
      '"আমি কাস্টমার কেয়ার, অ্যাকাউন্ট যাচাই করতে OTP দিন"',
      '"আপনার ফোনে একটি কোড গেছে, আমাকে বলুন"',
      '"Facebook/Google লক হয়েছে, কোড দিলে খুলবে"',
    ],
    signals: [
      'ফোনে কোড/OTP শেয়ার করতে বলা',
      'অফিসিয়াল সার্ভিসের নামে ফোন করা',
      'তাড়াহুড়ো দেখানো — "এখনই দিন"',
      'SMS পাওয়ার সাথে সাথে ফোন আসা',
    ],
    defense: [
      'OTP কাউকে বলবেন না — কখনো না',
      'ব্যাংক/অ্যাপ কখনো OTP চায় না',
      'সন্দেহ হলে সরাসরি অফিসিয়াল নম্বরে ফোন করুন',
    ],
  },
  {
    id: 'lottery',
    icon: 'trophy-outline',
    title: 'লটারি / পুরস্কার স্ক্যাম',
    subtitle: 'নকল পুরস্কার দিয়ে টাকা হাতিয়ে নেওয়া',
    color: Colors.suspicious,
    examples: [
      '"আপনি ১০ লাখ টাকা জিতেছেন! ট্যাক্স হিসেবে ৫,০০০ টাকা পাঠান"',
      '"Grameenphone লটারিতে আপনার নম্বর বিজয়ী"',
      '"অভিনন্দন! iPhone জিতেছেন, ডেলিভারি চার্জ দিন"',
    ],
    signals: [
      'কোনো প্রতিযোগিতায় অংশ না নিয়েও জয়ের খবর',
      'পুরস্কার পেতে আগে টাকা পাঠাতে বলা',
      'WhatsApp/SMS-এ অদ্ভুত লিংক',
    ],
    defense: [
      'না খেললে পুরস্কার হয় না',
      'টাকা না পাঠালে পুরস্কার দেবে না — এটাই স্ক্যাম',
      'লিংকে ক্লিক করবেন না, মেসেজ ডিলিট করুন',
    ],
  },
  {
    id: 'romance',
    icon: 'heart-broken-outline',
    title: 'রোমান্স / প্রেম প্রতারণা',
    subtitle: 'বিশ্বাস তৈরি করে টাকা নেওয়া',
    color: '#818cf8',
    examples: [
      'বিদেশি পরিচয় দিয়ে মাসের পর মাস কথা',
      '"বিপদে পড়েছি, একটু টাকা পাঠাও"',
      '"বাংলাদেশে আসব, উপহার পাঠাচ্ছি — কাস্টমস ফি দাও"',
    ],
    signals: [
      'সোশ্যাল মিডিয়ায় অপরিচিত বিদেশি',
      'কখনো ভিডিও কলে আসে না',
      'দ্রুত প্রেমের সম্পর্ক তৈরি করে',
      'টাকার কথা আসে অনেক পরে',
    ],
    defense: [
      'অপরিচিতকে টাকা পাঠাবেন না',
      'ভিডিও কলে না এলে বিশ্বাস করবেন না',
      'পরিবার বা বন্ধুর সাথে পরামর্শ করুন',
    ],
  },
  {
    id: 'investment',
    icon: 'chart-line',
    title: 'ভুয়া বিনিয়োগ স্ক্যাম',
    subtitle: 'গ্যারান্টি মুনাফার লোভ দেখানো',
    color: Colors.suspicious,
    examples: [
      '"প্রতিদিন ১০% মুনাফা! এখনই বিনিয়োগ করুন"',
      '"Crypto trading-এ ৩ দিনে দ্বিগুণ"',
      '"MLM অ্যাপে রেফার করলে কমিশন পাবেন"',
    ],
    signals: [
      'অবিশ্বাস্য রিটার্নের প্রতিশ্রুতি',
      'রেজিস্ট্রেশন ফি বা প্রথম বিনিয়োগ চাওয়া',
      'বাংলাদেশ ব্যাংকের অনুমোদন নেই',
    ],
    defense: [
      'গ্যারান্টি মুনাফা বলে কিছু নেই',
      'BB-অনুমোদিত প্রতিষ্ঠানেই বিনিয়োগ করুন',
      'লোভ দেখালেই সন্দেহ করুন',
    ],
  },
  {
    id: 'phishing',
    icon: 'hook',
    title: 'ফিশিং লিংক',
    subtitle: 'নকল ওয়েবসাইটে ব্যক্তিগত তথ্য চুরি',
    color: Colors.threat,
    examples: [
      '"আপনার NID যাচাই করতে এই লিংকে যান: bit.ly/xxxx"',
      '"ব্যাংক অ্যাকাউন্ট আপডেট করতে ক্লিক করুন"',
      '"বিনামূল্যে ডেটা পেতে এখানে ক্লিক করুন"',
    ],
    signals: [
      'অদ্ভুত ছোট URL (bit.ly, tinyurl)',
      'অফিসিয়াল দেখতে কিন্তু ভুল ডোমেইন',
      'তথ্য দিতে তাড়া দেওয়া',
    ],
    defense: [
      'অচেনা লিংকে ক্লিক করবেন না',
      'URL টি সরাসরি ব্রাউজারে টাইপ করুন',
      'HTTPS আর সঠিক ডোমেইন চেক করুন',
    ],
  },
];

const SAFETY_RULES = [
  { icon: 'camera', text: 'প্রমাণ সংগ্রহ করুন: স্ক্রিনশট নিন, নম্বর সেভ করুন' },
  { icon: 'phone-off', text: 'সন্দেহ হলে সাথে সাথে ফোন কেটে দিন' },
  { icon: 'lock', text: 'PIN, OTP, পাসওয়ার্ড কাউকে বলবেন না — কখনোই না' },
  { icon: 'bank-transfer', text: 'চাপে পড়ে কখনো টাকা পাঠাবেন না' },
  { icon: 'link-off', text: 'অচেনা লিংক বা QR কোড স্ক্যান করবেন না' },
  { icon: 'account-voice', text: 'পরিচিত মানুষকে জানান — সতর্ক করুন' },
  { icon: 'shield-alert', text: 'প্রতারণার শিকার হলে BTRC (10678) বা পুলিশে রিপোর্ট করুন' },
];

// ── Components ────────────────────────────────────────────────────────────────

const FraudCard = ({ item }: { item: FraudType }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.fraudCard, { borderLeftColor: item.color }]}>
      <TouchableOpacity
        style={styles.fraudHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <View style={styles.fraudHeaderLeft}>
          <View style={[styles.fraudIconBox, { backgroundColor: `${item.color}18` }]}>
            <Icon name={item.icon} size={20} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fraudTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={styles.fraudSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.text.tertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.fraudBody}>

          <View style={styles.fraudSectionTitleRow}>
            <Icon name="alert-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.fraudSectionTitle} numberOfLines={1} ellipsizeMode="tail">উদাহরণ</Text>
          </View>
          {item.examples.map((ex, i) => (
            <View key={i} style={styles.exampleRow}>
              <Icon name="message-alert-outline" size={14} color={item.color} style={{ marginTop: 2 }} />
              <Text style={styles.exampleText}>{ex}</Text>
            </View>
          ))}

          <View style={[styles.fraudSectionTitleRow, { marginTop: 12 }]}>
            <Icon name="magnify" size={14} color={Colors.text.secondary} />
            <Text style={styles.fraudSectionTitle} numberOfLines={1} ellipsizeMode="tail">সনাক্তের উপায়</Text>
          </View>
          {item.signals.map((sig, i) => (
            <View key={i} style={styles.signalRow}>
              <View style={[styles.bullet, { backgroundColor: item.color }]} />
              <Text style={styles.signalText}>{sig}</Text>
            </View>
          ))}

          <View style={[styles.defenseBox, { borderColor: item.color + '44' }]}>
            <View style={styles.fraudSectionTitleRow}>
              <Icon name="check-circle-outline" size={14} color={item.color} />
              <Text style={[styles.defenseTitleText, { color: item.color }]} numberOfLines={1} ellipsizeMode="tail">করণীয়</Text>
            </View>
            {item.defense.map((d, i) => (
              <View key={i} style={styles.defenseRow}>
                <Icon name="check-circle-outline" size={14} color={item.color} style={{ marginTop: 2 }} />
                <Text style={styles.defenseText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

const CyberSafetyScreen = ({ navigation }: CyberSafetyScreenProps) => {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="school-outline" size={28} color={Colors.accent} />
          </View>
          <Text style={styles.headerTitle}>সাইবার নিরাপত্তা শিক্ষা</Text>
          <Text style={styles.headerSub}>বাংলাদেশে প্রচলিত প্রতারণার ধরন ও সুরক্ষার উপায়</Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* Intro banner */}
          <View style={styles.introBanner}>
            <Icon name="information-outline" size={20} color="#60a5fa" />
            <Text style={styles.introText}>
              প্রতিটি কার্ডে ট্যাপ করুন — উদাহরণ, সনাক্তের উপায় এবং করণীয় দেখুন
            </Text>
          </View>

          {/* S6: Quiz CTA */}
          <TouchableOpacity
            style={styles.quizCta}
            onPress={() => navigation.navigate('CyberQuiz')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={Colors.gradient.accent} style={styles.quizCtaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="brain" size={26} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.quizCtaTitle}>এটা কি স্ক্যাম? কুইজ খেলুন</Text>
                <Text style={styles.quizCtaSub}>শিখুন, যাচাই করুন, নিজেকে পরীক্ষা করুন</Text>
              </View>
              <Icon name="arrow-right" size={20} color={Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Fraud types */}
          <Text style={styles.sectionLabel}>প্রতারণার ধরনসমূহ</Text>
          {FRAUD_TYPES.map((item) => (
            <FraudCard key={item.id} item={item} />
          ))}

          {/* Safety rules */}
          <View style={{ marginTop: Spacing.xl }}>
            <CollapsibleSection icon="shield-star-outline" title="সর্বদা মনে রাখুন" badge={String(SAFETY_RULES.length)}>
              {SAFETY_RULES.map((rule, i) => (
                <View key={i} style={[styles.ruleRow, i > 0 && styles.ruleDivider]}>
                  <View style={styles.ruleIconBox}>
                    <Icon name={rule.icon as MCIcon} size={18} color={Colors.accent} />
                  </View>
                  <Text style={styles.ruleText}>{rule.text}</Text>
                </View>
              ))}
            </CollapsibleSection>
          </View>

          {/* Emergency contact strip */}
          <View style={styles.emergencyStrip}>
            <Icon name="phone-alert" size={22} color="#f87171" />
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>প্রতারণার শিকার হলে?</Text>
              <Text style={styles.emergencySub}>BTRC: 10678  ·  পুলিশ: 999  ·  সাইবার ক্রাইম: 01769693922</Text>
            </View>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => navigation.navigate('CyberReport')}
              activeOpacity={0.8}
            >
              <Text style={styles.reportBtnText}>রিপোর্ট করুন</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: 40 },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  headerTitle: { ...TextStyles.h2, color: Colors.accent, marginBottom: 4 },
  headerSub:   { ...TextStyles.body, color: Colors.text.secondary },

  body: { padding: Spacing.lg },

  introBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: '#1e3a5f', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: '#3b82f640',
  },
  introText: { ...TextStyles.caption, color: '#93c5fd', flex: 1, lineHeight: 18 },

  quizCta:     { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  quizCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  quizCtaTitle:{ ...TextStyles.body, color: Colors.primary, fontWeight: '800' },
  quizCtaSub:  { ...TextStyles.caption, color: `${Colors.primary}cc`, marginTop: 2 },

  sectionLabel: {
    ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  // ── Fraud cards ──
  fraudCard: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  fraudHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  fraudHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  fraudIconBox:    { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fraudTitle:      { ...TextStyles.bodyMedium, fontWeight: '700', fontSize: 15 },
  fraudSubtitle:   { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 2 },

  fraudBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

  fraudSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fraudSectionTitle: { ...TextStyles.caption, color: Colors.text.secondary, fontWeight: '700', flexShrink: 1 },

  exampleRow: { flexDirection: 'row', gap: 8, marginBottom: 5, alignItems: 'flex-start' },
  exampleText: {
    ...TextStyles.caption, color: Colors.text.secondary,
    fontStyle: 'italic', flex: 1, lineHeight: 18,
  },

  signalRow: { flexDirection: 'row', gap: 8, marginBottom: 4, alignItems: 'flex-start' },
  bullet:    { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  signalText: { ...TextStyles.caption, color: Colors.text.secondary, flex: 1, lineHeight: 18 },

  defenseBox: {
    marginTop: 12, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1,
  },
  defenseTitleText: { ...TextStyles.caption, fontWeight: '800', flexShrink: 1 },
  defenseRow: { flexDirection: 'row', gap: 8, marginBottom: 4, alignItems: 'flex-start' },
  defenseText: { ...TextStyles.caption, color: Colors.text.primary, flex: 1, lineHeight: 18 },

  // ── Safety rules ──
  ruleRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  ruleDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  ruleIconBox: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.accentGlow, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  ruleText: { ...TextStyles.caption, color: Colors.text.primary, flex: 1, lineHeight: 18, marginTop: 8 },

  // ── Emergency strip ──
  emergencyStrip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#2d1111', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: '#7f1d1d',
    padding: Spacing.md, marginTop: Spacing.xl,
  },
  emergencyTitle: { ...TextStyles.bodyMedium, color: '#f87171', fontWeight: '700' },
  emergencySub:   { ...TextStyles.caption, color: '#fca5a5', marginTop: 2 },

  reportBtn: {
    backgroundColor: Colors.threat, borderRadius: BorderRadius.md,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  reportBtnText: { ...TextStyles.caption, color: '#fff', fontWeight: '700' },
});

export default CyberSafetyScreen;
