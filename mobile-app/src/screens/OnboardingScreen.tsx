import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '@stores';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import {
  WelcomeIllustration, AnalyzeIllustration, CommunityIllustration, AlertIllustration,
} from '@components';
import type { OnboardingScreenProps } from '@navigation/types';

type MCIcon = React.ComponentProps<typeof Icon>['name'];
type IllustrationComp = React.ComponentType<{ color: string; size?: number }>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: MCIcon;
  Illustration: IllustrationComp;
  color: string;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  isPermissionSlide?: boolean;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'shield-check',
    Illustration: WelcomeIllustration,
    color: Colors.accent,
    titleBn: 'EProhori-তে স্বাগতম',
    titleEn: 'Welcome to EProhori',
    descBn: 'বাংলাদেশের প্রথম AI-চালিত সাইবার হুমকি সনাক্তকারী অ্যাপ। SMS, ফোন কল এবং অনলাইন স্ক্যাম থেকে নিজেকে রক্ষা করুন।',
    descEn: 'Bangladesh\'s first AI-powered cyber threat detector. Protect yourself from SMS scams, phishing calls, and online fraud.',
  },
  {
    key: 'analyze',
    icon: 'magnify-scan',
    Illustration: AnalyzeIllustration,
    color: Colors.suspicious,
    titleBn: 'তাৎক্ষণিক বিশ্লেষণ',
    titleEn: 'Instant Analysis',
    descBn: 'সন্দেহজনক SMS বা ফোন নম্বর পেস্ট করুন। আমাদের ML মডেল ১ সেকেন্ডে হুমকি সনাক্ত করে এবং সমাধান দেয়।',
    descEn: 'Paste a suspicious SMS or phone number. Our ML model detects threats in under a second and tells you exactly what to do.',
  },
  {
    key: 'community',
    icon: 'account-group',
    Illustration: CommunityIllustration,
    color: Colors.safe,
    titleBn: 'সামাজিক সুরক্ষা',
    titleEn: 'Community Protection',
    descBn: 'হুমকি রিপোর্ট করুন এবং ৬৪ জেলার হুমকির মানচিত্র দেখুন। আপনার রিপোর্ট অন্যদের সুরক্ষিত রাখে।',
    descEn: 'Report threats and view live threat maps across all 64 districts. Your reports protect the entire community.',
  },
  {
    key: 'notifications',
    icon: 'bell-ring',
    Illustration: AlertIllustration,
    color: Colors.accent,
    titleBn: 'সতর্ক থাকুন',
    titleEn: 'Stay Protected',
    descBn: 'হুমকি সনাক্ত হলে তাৎক্ষণিক বিজ্ঞপ্তি পান। বাংলাদেশের সাইবার হুমকি সম্পর্কে সর্বদা আপডেট থাকুন।',
    descEn: 'Get instant alerts when threats are detected. Stay updated on cyber threats across Bangladesh.',
    isPermissionSlide: true,
  },
];

const OnboardingScreen = ({ navigation }: OnboardingScreenProps) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const [current, setCurrent] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const setHasOnboarded = useSettingsStore((s) => s.setHasOnboarded);
  const language = useSettingsStore((s) => s.language);
  const isBn = language === 'bn';

  const finish = () => {
    setHasOnboarded(true);
    navigation.replace('MainTabs');
  };

  const requestAndFinish = async () => {
    try { await Notifications.requestPermissionsAsync(); } catch {}
    finish();
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: current + 1, animated: true });
      setCurrent(current + 1);
    } else {
      finish();
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.slideInner}>
        <View style={styles.illustrationWrap}>
          <item.Illustration color={item.color} size={200} />
        </View>
        <Text style={[styles.slideTitle, { color: item.color }]}>
          {isBn ? item.titleBn : item.titleEn}
        </Text>
        <Text style={styles.slideDesc}>
          {isBn ? item.descBn : item.descEn}
        </Text>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>{isBn ? 'এড়িয়ে যান' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>

        {SLIDES[current].isPermissionSlide ? (
          <>
            <TouchableOpacity onPress={requestAndFinish} activeOpacity={0.85} style={styles.btnWrap}>
              <LinearGradient colors={Colors.gradient.accent} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="bell-ring" size={20} color={Colors.primary} />
                <Text style={styles.btnText}>{isBn ? 'বিজ্ঞপ্তি সক্রিয় করুন' : 'Enable Notifications'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={finish} style={styles.skipNotifBtn}>
              <Text style={styles.skipNotifText}>{isBn ? 'এখন না' : 'Not Now'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={next} activeOpacity={0.85} style={styles.btnWrap}>
            <LinearGradient colors={Colors.gradient.accent} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.btnText}>
                {isBn ? 'পরবর্তী' : 'Next'}
              </Text>
              <Icon name="arrow-right" size={20} color={Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  skipRow: { alignItems: 'flex-end', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  skipText: { ...TextStyles.body, color: Colors.text.tertiary },

  slide:      { width: SCREEN_WIDTH, flex: 1 },
  slideInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },

  illustrationWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'] },
  slideTitle: { ...TextStyles.h1, textAlign: 'center', marginBottom: Spacing.lg },
  slideDesc:  { ...TextStyles.body, color: Colors.text.secondary, textAlign: 'center', lineHeight: 26 },

  footer: { padding: Spacing.lg, gap: Spacing.lg },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: { width: 24, backgroundColor: Colors.accent },

  btnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 17 },
  btnText: { ...TextStyles.button, color: Colors.primary },

  skipNotifBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  skipNotifText: { ...TextStyles.body, color: Colors.text.tertiary },
});

export default OnboardingScreen;
styles = makeStyles(Colors);
