import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useTranslation } from '@hooks';
import { AlertIllustration, CollapsibleSection } from '@components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScamNews'>;

const API_BASE = 'https://eprohori-production.up.railway.app';

// Real backend shape (verified): /api/alerts → { id, title, message, severity, created_at }
interface AlertItem {
  id: number | string;
  title: string;
  message?: string;
  severity?: string;
  created_at?: string;
}

type MCIcon = React.ComponentProps<typeof Icon>['name'];

// N4: official BD anti-fraud sources — curated, opens externally
const OFFICIAL_SOURCES: { icon: MCIcon; name: string; desc: string; url: string; hotline: string }[] = [
  {
    icon: 'bank', name: 'BTRC', desc: 'টেলিকম নিয়ন্ত্রক সংস্থার নোটিশ ও সতর্কতা',
    url: 'http://www.btrc.gov.bd', hotline: '১০০',
  },
  {
    icon: 'bank-outline', name: 'বাংলাদেশ ব্যাংক', desc: 'ব্যাংকিং প্রতারণা সতর্কতা ও সার্কুলার',
    url: 'https://www.bb.org.bd', hotline: '১৬২৩৬',
  },
  {
    icon: 'police-badge-outline', name: 'পুলিশ সাইবার সাপোর্ট', desc: 'সাইবার অপরাধ রিপোর্ট ও পরামর্শ',
    url: 'https://www.facebook.com/cybersupport.women', hotline: '৯৯৯',
  },
  {
    icon: 'magnify-scan', name: 'CID সাইবার পুলিশ', desc: 'সাইবার অপরাধ তদন্ত বিভাগ',
    url: 'https://www.facebook.com/cpccidbdpolice', hotline: '০১৩২০-০১০১৪৮',
  },
  {
    icon: 'scale-balance', name: 'ভোক্তা অধিকার', desc: 'অনলাইন কেনাকাটা প্রতারণার অভিযোগ',
    url: 'https://dncrp.portal.gov.bd', hotline: '১৬১২১',
  },
];

const sevColor = (sev?: string) =>
  sev === 'critical' ? Colors.threat : sev === 'high' ? Colors.suspicious : sev === 'medium' ? '#818cf8' : Colors.accent;

const ScamNewsScreen = ({ navigation }: Props) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
  const [alerts, setAlerts]   = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
    try {
      const controller = new AbortController();
      const abort = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/api/alerts`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'EProhori-Mobile/1.x' },
      });
      clearTimeout(abort);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAlerts(data.slice(0, 20));
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAlerts(); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="newspaper-variant-outline" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('scamnews_title')}</Text>
          <Text style={styles.subtitle}>{t('scamnews_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Latest alerts from EProhori network ── */}
          <Text style={styles.sectionTitle}>{t('scamnews_latest_alerts')}</Text>
          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing.xl }} />
          ) : alerts.length === 0 ? (
            <View style={styles.emptyBox}>
              <AlertIllustration color={Colors.accent} size={100} />
              <Text style={styles.emptyText}>{t('scamnews_no_alerts')}</Text>
            </View>
          ) : (
            alerts.map((a) => (
              <View key={a.id} style={[styles.alertCard, { borderLeftColor: sevColor(a.severity) }]}>
                <View style={styles.alertHead}>
                  <View style={[styles.sevBadge, { backgroundColor: `${sevColor(a.severity)}18` }]}>
                    <Text style={[styles.sevText, { color: sevColor(a.severity) }]}>
                      {a.severity === 'critical' ? t('scamnews_sev_critical') : a.severity === 'high' ? t('scamnews_sev_high') : t('scamnews_sev_alert')}
                    </Text>
                  </View>
                  {a.created_at ? (
                    <Text style={styles.alertDate}>
                      {new Date(a.created_at).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.alertTitle}>{a.title}</Text>
                {a.message ? <Text style={styles.alertBody} numberOfLines={3}>{a.message}</Text> : null}
              </View>
            ))
          )}

          {/* ── Official sources ── */}
          <View style={{ marginTop: Spacing.lg }}>
            <CollapsibleSection
              icon="bank-outline"
              title={t('scamnews_official_sources')}
              badge={String(OFFICIAL_SOURCES.length)}
            >
              {OFFICIAL_SOURCES.map((src, i) => (
                <TouchableOpacity
                  key={src.name}
                  style={[styles.srcCard, i > 0 && styles.srcDivider]}
                  onPress={() => Linking.openURL(src.url).catch(() => {})}
                  activeOpacity={0.75}
                >
                  <View style={styles.srcIconBox}>
                    <Icon name={src.icon} size={20} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.srcName}>{src.name}</Text>
                    <Text style={styles.srcDesc}>{src.desc}</Text>
                    <Text style={styles.srcHotline}>{t('scamnews_hotline')} {src.hotline}</Text>
                  </View>
                  <Icon name="open-in-new" size={16} color={Colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </CollapsibleSection>
          </View>

          {/* ── Report CTA ── */}
          <TouchableOpacity
            style={styles.reportCta}
            onPress={() => navigation.navigate('CyberReport')}
            activeOpacity={0.8}
          >
            <Icon name="shield-alert" size={20} color={Colors.threat} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reportCtaTitle}>{t('scamnews_victim_title')}</Text>
              <Text style={styles.reportCtaSub}>{t('scamnews_victim_sub')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  body: { padding: Spacing.lg },
  sectionTitle: { ...TextStyles.h3, color: Colors.text.primary, marginBottom: Spacing.md },

  alertCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  alertHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sevBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevText:   { fontSize: 10, fontWeight: '800' },
  alertDate: { ...TextStyles.caption, color: Colors.text.tertiary },
  alertTitle:{ ...TextStyles.body, color: Colors.text.primary, fontWeight: '700' },
  alertBody: { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 4, lineHeight: 18 },

  emptyBox:  { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  emptyText: { ...TextStyles.body, color: Colors.text.tertiary },

  srcCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  srcDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  srcIconBox: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.accentGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  srcName:    { ...TextStyles.body, color: Colors.accent, fontWeight: '700' },
  srcDesc:    { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2, lineHeight: 17 },
  srcHotline: { ...TextStyles.caption, color: Colors.safe, marginTop: 3, fontWeight: '600' },

  reportCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: `${Colors.threat}12`, borderWidth: 1, borderColor: `${Colors.threat}35`,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.lg,
  },
  reportCtaTitle: { ...TextStyles.body, color: Colors.threat, fontWeight: '700' },
  reportCtaSub:   { ...TextStyles.caption, color: Colors.text.secondary, marginTop: 2 },
});

export default ScamNewsScreen;
styles = makeStyles(Colors);
