import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { analyzeQrContent, type QrAnalysis } from '../utils/qrAnalyzer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QRScan'>;

const riskColor = (risk: QrAnalysis['risk']) =>
  risk === 'danger' ? Colors.threat : risk === 'suspicious' ? Colors.suspicious : Colors.safe;

const QRScanScreen = ({ navigation }: Props) => {
  const t = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<QrAnalysis | null>(null);
  const scannedRef = useRef(false); // guard: onBarcodeScanned fires repeatedly

  const handleScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || !data) return;
    scannedRef.current = true;
    const analysis = analyzeQrContent(data);
    setResult(analysis);
    Haptics.notificationAsync(
      analysis.risk === 'danger'
        ? Haptics.NotificationFeedbackType.Error
        : analysis.risk === 'suspicious'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  };

  const rescan = () => {
    scannedRef.current = false;
    setResult(null);
  };

  const openUrlWithWarning = (url: string) => {
    Alert.alert(
      t('qr_open_warning_title'),
      t('qr_open_warning_msg'),
      [
        { text: t('qr_open_cancel'), style: 'cancel' },
        { text: t('qr_open_confirm'), onPress: () => Linking.openURL(url).catch(() => {}) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Icon name="qrcode-scan" size={26} color={Colors.accent} />
        </View>
        <Text style={styles.title}>{t('qr_title')}</Text>
        <Text style={styles.subtitle}>{t('qr_subtitle')}</Text>
      </LinearGradient>

      {!permission?.granted ? (
        <View style={styles.permBox}>
          <Icon name="camera-off" size={48} color={Colors.text.tertiary} />
          <Text style={styles.permText}>{t('qr_perm_text')}</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <LinearGradient colors={Colors.gradient.accent} style={styles.permBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.permBtnText}>{t('qr_perm_btn')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : result ? (
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={[styles.resultCard, { borderColor: `${riskColor(result.risk)}50` }]}>
            <View style={[styles.riskBadge, { backgroundColor: `${riskColor(result.risk)}18` }]}>
              <Icon
                name={result.risk === 'danger' ? 'alert-octagon' : result.risk === 'suspicious' ? 'alert' : 'check-circle'}
                size={40} color={riskColor(result.risk)}
              />
            </View>
            <Text style={[styles.riskTitle, { color: riskColor(result.risk) }]}>{result.risk_bn}</Text>
            <Text style={styles.kindLabel}>{result.kind_bn}</Text>

            <View style={styles.payloadBox}>
              <Text style={styles.payloadText} numberOfLines={4}>{result.payload}</Text>
            </View>

            {result.signals.length > 0 && (
              <View style={styles.signalsBox}>
                {result.signals.map((sig, i) => (
                  <Text key={i} style={styles.signalText}>{sig}</Text>
                ))}
              </View>
            )}

            {/* Action row */}
            <View style={styles.actionRow}>
              {result.kind === 'phone' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('CallerID', { initialNumber: result.payload })}
                >
                  <Icon name="phone-check" size={16} color={Colors.accent} />
                  <Text style={styles.actionBtnText}>{t('qr_action_check_number')}</Text>
                </TouchableOpacity>
              )}
              {result.kind === 'url' && result.risk === 'safe' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => openUrlWithWarning(result.payload)}>
                  <Icon name="open-in-new" size={16} color={Colors.accent} />
                  <Text style={styles.actionBtnText}>{t('qr_action_open_link')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.rescanBtn} onPress={rescan} activeOpacity={0.8}>
            <LinearGradient colors={Colors.gradient.accent} style={styles.rescanGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="qrcode-scan" size={18} color={Colors.primary} />
              <Text style={styles.rescanText}>{t('qr_rescan')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScanned}
          />
          <View style={styles.scanFrame} pointerEvents="none">
            <View style={styles.frameCorner} />
          </View>
          <Text style={styles.scanHint}>{t('qr_scan_hint')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4 },

  permBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  permText: { ...TextStyles.body, color: Colors.text.secondary, textAlign: 'center' },
  permBtn:  { borderRadius: BorderRadius.md, overflow: 'hidden' },
  permBtnGrad: { paddingVertical: 13, paddingHorizontal: 32 },
  permBtnText: { ...TextStyles.button, color: Colors.primary },

  cameraWrap: { flex: 1, margin: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  camera:     { flex: 1 },
  scanFrame:  {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  frameCorner: {
    width: 220, height: 220, borderWidth: 3, borderColor: Colors.accent,
    borderRadius: 20, backgroundColor: 'transparent',
  },
  scanHint: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    ...TextStyles.body, color: '#fff', backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden',
  },

  resultScroll: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
  resultCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, padding: Spacing.lg, alignItems: 'center',
    ...Shadows.small,
  },
  riskBadge: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  riskTitle: { ...TextStyles.h3, textAlign: 'center' },
  kindLabel: { ...TextStyles.caption, color: Colors.text.tertiary, marginTop: 4 },

  payloadBox: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.md, alignSelf: 'stretch',
    borderWidth: 1, borderColor: Colors.border,
  },
  payloadText: { ...TextStyles.caption, color: Colors.text.secondary, fontFamily: 'monospace' },

  signalsBox: { alignSelf: 'stretch', marginTop: Spacing.md, gap: 6 },
  signalText: { ...TextStyles.caption, color: Colors.text.secondary, lineHeight: 19 },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.borderAccent,
    backgroundColor: Colors.accentGlow,
  },
  actionBtnText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },

  rescanBtn:  { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  rescanGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  rescanText: { ...TextStyles.button, color: Colors.primary },
});

export default QRScanScreen;
