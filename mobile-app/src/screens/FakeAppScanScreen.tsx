import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';
import { useTranslation } from '@hooks';
import { NoAppsIllustration, CollapsibleSection } from '@components';
import {
  scanForFakeApps, isFakeAppScanAvailable, type FakeAppScanResult,
} from '../services/fakeAppService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FakeAppScan'>;

// N7: scan installed apps for fake bKash/Nagad/bank lookalikes
const FakeAppScanScreen = ({ navigation }: Props) => {
  const t = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [result, setResult]     = useState<FakeAppScanResult | null>(null);

  const available = isFakeAppScanAvailable();

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await scanForFakeApps();
      setResult(res);
      Haptics.notificationAsync(
        res.suspicious.length > 0
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    } catch {
      setResult({ available: true, totalScanned: 0, officialFound: [], suspicious: [] });
    } finally {
      setScanning(false);
    }
  };

  const openAppSettings = (pkg: string) => {
    // RN Linking can't deep-link to another app's info page — guide the user
    Alert.alert(
      t('fakeapp_uninstall_alert_title'),
      `${t('fakeapp_uninstall_alert_msg')}\n\n${pkg}`,
      [
        { text: t('fakeapp_cancel'), style: 'cancel' },
        { text: t('fakeapp_go_settings'), onPress: () => Linking.openSettings().catch(() => {}) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="shield-search" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('fakeapp_title')}</Text>
          <Text style={styles.subtitle}>
            {t('fakeapp_subtitle')}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          {!available ? (
            <View style={styles.emptyBox}>
              <NoAppsIllustration color={Colors.text.tertiary} size={110} />
              <Text style={styles.emptyText}>
                {t('fakeapp_unavailable')}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.scanBtn, scanning && { opacity: 0.6 }]}
                onPress={handleScan}
                disabled={scanning}
                activeOpacity={0.8}
              >
                <LinearGradient colors={Colors.gradient.accent} style={styles.scanBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {scanning ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.scanBtnText}>{t('fakeapp_scanning')}</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="magnify-scan" size={20} color={Colors.primary} />
                      <Text style={styles.scanBtnText}>{t('fakeapp_scan_now')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {result && (
                <>
                  {/* Verdict */}
                  <View style={[
                    styles.verdictCard,
                    result.suspicious.length > 0
                      ? { borderColor: `${Colors.threat}50`, backgroundColor: `${Colors.threat}0d` }
                      : { borderColor: `${Colors.safe}50`, backgroundColor: `${Colors.safe}0d` },
                  ]}>
                    <Icon
                      name={result.suspicious.length > 0 ? 'alert-octagon' : 'shield-check'}
                      size={36}
                      color={result.suspicious.length > 0 ? Colors.threat : Colors.safe}
                    />
                    <Text style={[
                      styles.verdictTitle,
                      { color: result.suspicious.length > 0 ? Colors.threat : Colors.safe },
                    ]}>
                      {result.suspicious.length > 0
                        ? `${result.suspicious.length}${t('fakeapp_found_suspicious_suffix')}`
                        : t('fakeapp_none_found')}
                    </Text>
                    <Text style={styles.verdictSub}>
                      {result.totalScanned}{t('fakeapp_scanned_count_suffix')}
                    </Text>
                  </View>

                  {/* Suspicious apps */}
                  {result.suspicious.map((app) => (
                    <View key={app.packageName} style={styles.suspCard}>
                      <View style={styles.suspHead}>
                        <Icon
                          name="alert-circle"
                          size={20}
                          color={app.severity === 'high' ? Colors.threat : Colors.suspicious}
                        />
                        <Text style={styles.suspName}>{app.appName}</Text>
                        <View style={[
                          styles.sevChip,
                          { backgroundColor: app.severity === 'high' ? `${Colors.threat}18` : `${Colors.suspicious}18` },
                        ]}>
                          <Text style={[
                            styles.sevChipText,
                            { color: app.severity === 'high' ? Colors.threat : Colors.suspicious },
                          ]}>
                            {app.severity === 'high' ? t('fakeapp_high_risk') : t('fakeapp_suspicious_label')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.suspPkg}>{app.packageName}</Text>
                      <Text style={styles.suspReason}>{app.reason_bn}</Text>
                      <TouchableOpacity style={styles.uninstallBtn} onPress={() => openAppSettings(app.packageName)}>
                        <Icon name="delete-outline" size={15} color={Colors.threat} />
                        <Text style={styles.uninstallText}>{t('fakeapp_uninstall_hint')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Official apps found */}
                  {result.officialFound.length > 0 && (
                    <View style={styles.officialBox}>
                      <Text style={styles.officialTitle}>{t('fakeapp_official_found')}</Text>
                      {result.officialFound.map((name) => (
                        <Text key={name} style={styles.officialItem}>• {name}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Tips */}
              <View style={{ marginTop: Spacing.lg }}>
                <CollapsibleSection icon="lightbulb-outline" title={t('fakeapp_tips_title')}>
                  {([
                    t('fakeapp_tip1'), t('fakeapp_tip2'), t('fakeapp_tip3'), t('fakeapp_tip4'),
                  ] as string[]).map((tip, i) => (
                    <Text key={i} style={styles.tipText}>{tip}</Text>
                  ))}
                </CollapsibleSection>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },

  body: { padding: Spacing.lg },

  scanBtn:     { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  scanBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  scanBtnText: { ...TextStyles.button, color: Colors.primary },

  verdictCard: {
    alignItems: 'center', gap: 6,
    borderRadius: BorderRadius.lg, borderWidth: 1.5,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  verdictTitle: { ...TextStyles.h3, textAlign: 'center' },
  verdictSub:   { ...TextStyles.caption, color: Colors.text.tertiary },

  suspCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: `${Colors.threat}35`,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  suspHead:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suspName:   { ...TextStyles.body, color: Colors.text.primary, fontWeight: '700', flex: 1 },
  sevChip:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevChipText:{ fontSize: 10, fontWeight: '800' },
  suspPkg:    { ...TextStyles.caption, color: Colors.text.tertiary, fontFamily: 'monospace', marginTop: 4 },
  suspReason: { ...TextStyles.caption, color: Colors.suspicious, marginTop: 6, lineHeight: 18 },
  uninstallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm,
    alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, borderColor: `${Colors.threat}35`,
    backgroundColor: `${Colors.threat}10`,
  },
  uninstallText: { fontSize: 11, color: Colors.threat, fontWeight: '700' },

  officialBox: {
    backgroundColor: `${Colors.safe}0d`, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: `${Colors.safe}30`,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  officialTitle: { ...TextStyles.body, color: Colors.safe, fontWeight: '700', marginBottom: 6 },
  officialItem:  { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 20 },

  tipText:   { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.xs },

  emptyBox:  { alignItems: 'center', paddingVertical: 48, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyText: { ...TextStyles.body, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 22 },
});

export default FakeAppScanScreen;
