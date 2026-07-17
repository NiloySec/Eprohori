import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useTranslation } from '@hooks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const PrivacyPolicyScreen = ({ navigation }: Props) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>প্রাইভেসি পলিসি</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>সর্বশেষ আপডেট: জুলাই ২০২৬</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>১. তথ্য সংগ্রহ</Text>
          <Text style={styles.text}>
            EProhori আপনার ব্যক্তিগত তথ্য (যেমন: নাম, ইমেইল) শুধুমাত্র অ্যাকাউন্ট ম্যানেজমেন্ট এবং সার্ভিস প্রদানের জন্য সংগ্রহ করে। আমরা আপনার পাসওয়ার্ড বা পিন কখনো আমাদের সার্ভারে জমা রাখি না।
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>২. SMS এবং কন্টাক্ট ডাটা</Text>
          <Text style={styles.text}>
            আমাদের "Smart Analyzer" ফিচারের জন্য আপনার অনুমতি সাপেক্ষে সন্দেহজনক SMS স্ক্যান করা হয়। এই ডাটাগুলো শুধুমাত্র হুমকি শনাক্তকরণের জন্য ব্যবহৃত হয় এবং কোনো থার্ড-পার্টিকে দেওয়া হয় না। কন্টাক্ট সিঙ্ক ফিচারটি শুধুমাত্র স্প্যাম নম্বর শনাক্ত করতে ব্যবহৃত হয়।
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>৩. ডাটা সিকিউরিটি</Text>
          <Text style={styles.text}>
            আপনার সব ডাটা এন্ড-টু-এন্ড এনক্রিপশনের মাধ্যমে সুরক্ষিত রাখা হয়। আমরা OWASP ২০২৫ সিকিউরিটি স্ট্যান্ডার্ড অনুসরণ করি যাতে আপনার ডাটা সবসময় নিরাপদ থাকে।
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>৪. আপনার নিয়ন্ত্রণ</Text>
          <Text style={styles.text}>
            আপনি যেকোনো সময় আপনার অ্যাকাউন্ট এবং সব ডাটা অ্যাপের সেটিংস থেকে পার্মানেন্টলি ডিলিট করে দিতে পারেন।
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EProhori - বাংলাদেশের সাইবার নিরাপত্তা কবচ।</Text>
          <Text style={styles.supportText}>যোগাযোগ: support@eprohori.tech</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.md },
  title: { ...TextStyles.h3, color: Colors.accent },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  lastUpdated: { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { ...TextStyles.bodyMedium, color: Colors.accent, marginBottom: Spacing.sm, fontWeight: '800' },
  text: { ...TextStyles.body, color: Colors.text.secondary, lineHeight: 22 },
  footer: { marginTop: Spacing.xl, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.secondary, paddingTop: Spacing.xl },
  footerText: { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700' },
  supportText: { ...TextStyles.caption, color: Colors.accent, marginTop: 4 },
});

export default PrivacyPolicyScreen;
styles = makeStyles(Colors);
