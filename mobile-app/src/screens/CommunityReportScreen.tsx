import React, { useState } from 'react';
import {
  View, ScrollView, Text, TextInput, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { threatAnalysisAPI, CommunityReportRequest } from '@api';
import { useTranslation } from '@hooks';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import type { TKeys } from '@utils';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import type { CommunityReportScreenProps } from '@navigation/types';

type Platform = CommunityReportRequest['platform'];
type ThreatType = CommunityReportRequest['threat_type'];

const PLATFORMS: { key: Platform; label: string; labelKey?: TKeys; icon: string }[] = [
  { key: 'SMS',      label: 'SMS',       icon: 'message-text' },
  { key: 'WhatsApp', label: 'WhatsApp',  icon: 'whatsapp' },
  { key: 'Telegram', label: 'Telegram',  icon: 'telegram' },
  { key: 'Email',    label: 'Email',     labelKey: 'community_platform_email', icon: 'email' },
  { key: 'Call',     label: 'Call',      labelKey: 'community_platform_call',  icon: 'phone' },
  { key: 'Other',    label: 'Other',     labelKey: 'community_platform_other', icon: 'dots-horizontal' },
];

const THREAT_TYPES: { key: ThreatType; label: string; labelKey: TKeys; color: string }[] = [
  { key: 'phishing', label: 'Phishing',  labelKey: 'community_cat_phishing', color: Colors.threat },
  { key: 'scam',     label: 'Scam',      labelKey: 'community_cat_scam',     color: Colors.suspicious },
  { key: 'fraud',    label: 'Fraud',     labelKey: 'community_cat_fraud',    color: Colors.threat },
  { key: 'spam',     label: 'Spam',      labelKey: 'community_cat_spam',     color: Colors.suspicious },
  { key: 'other',    label: 'Other',     labelKey: 'community_cat_other',    color: Colors.text.tertiary },
];

const CommunityReportScreen = ({ navigation }: CommunityReportScreenProps) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
  const [platform,   setPlatform]   = useState<Platform>('SMS');
  const [threatType, setThreatType] = useState<ThreatType>('phishing');
  const [content,    setContent]    = useState('');
  const [district,   setDistrict]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) { setError(t('community_required')); return; }
    setLoading(true);
    setError(null);
    try {
      await threatAnalysisAPI.communityReport({
        content: content.trim(),
        platform,
        threat_type: threatType,
        district: district.trim() || undefined,
        reporter_type: 'mobile',
      });
      Alert.alert(t('community_success_title'), t('community_success_msg'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setError(t('community_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="alert-decagram" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('community_title')}</Text>
          <Text style={styles.subtitle}>{t('community_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Platform */}
          <Text style={styles.label}>{t('community_platform_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PLATFORMS.map((p) => {
              const active = platform === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.platformChip, active && styles.platformChipActive]}
                  onPress={() => setPlatform(p.key)}
                >
                  <Icon name={p.icon as any} size={15} color={active ? Colors.primary : Colors.text.tertiary} />
                  <Text style={[styles.platformChipText, active && styles.platformChipTextActive]}>{p.labelKey ? t(p.labelKey) : p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Threat type */}
          <Text style={styles.label}>{t('community_type_label')}</Text>
          <View style={styles.typeRow}>
            {THREAT_TYPES.map((tt) => {
              const active = threatType === tt.key;
              return (
                <TouchableOpacity
                  key={tt.key}
                  style={[styles.typeChip, active && { backgroundColor: `${tt.color}25`, borderColor: tt.color }]}
                  onPress={() => setThreatType(tt.key)}
                >
                  <Text style={[styles.typeChipText, active && { color: tt.color, fontWeight: '700' }]}>{t(tt.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          <Text style={styles.label}>{t('community_msg_label')}</Text>
          <TextInput
            style={[styles.input, error && !content.trim() && styles.inputError]}
            placeholder={t('community_msg_placeholder')}
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={content}
            onChangeText={(v) => { setContent(v); setError(null); }}
          />

          {/* District */}
          <Text style={styles.label}>{t('community_district_label')}</Text>
          <TextInput
            style={styles.inputSingle}
            placeholder={t('community_district_placeholder')}
            placeholderTextColor={Colors.text.tertiary}
            value={district}
            onChangeText={setDistrict}
          />

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Icon name="alert-circle" size={16} color={Colors.threat} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitWrap, (loading || !content.trim()) && { opacity: 0.45 }]}
            onPress={handleSubmit}
            disabled={loading || !content.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient colors={Colors.gradient.accent} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.submitText}>{t('community_submitting')}</Text>
                </>
              ) : (
                <>
                  <Icon name="send" size={18} color={Colors.primary} />
                  <Text style={styles.submitText}>{t('community_submit')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.primary },
  scroll: { paddingBottom: Spacing['3xl'] },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'] },
  backBtn: { marginBottom: Spacing.lg },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: Spacing.xs },

  body:  { padding: Spacing.lg },
  label: { ...TextStyles.bodyMedium, color: Colors.text.secondary, marginBottom: Spacing.sm, marginTop: Spacing.lg },

  chipRow: { gap: Spacing.sm, paddingBottom: 4 },
  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.secondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  platformChipActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  platformChipText:       { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '600' },
  platformChipTextActive: { color: Colors.primary },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: BorderRadius.full, backgroundColor: Colors.secondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeChipText: { ...TextStyles.caption, color: Colors.text.tertiary },

  input: {
    backgroundColor: Colors.secondary, color: Colors.text.primary,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    minHeight: 120, fontSize: 15, lineHeight: 24,
    ...Shadows.small,
  },
  inputSingle: {
    backgroundColor: Colors.secondary, color: Colors.text.primary,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border, fontSize: 15,
    ...Shadows.small,
  },
  inputError: { borderColor: Colors.threat },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.threatGlow, borderLeftWidth: 3, borderLeftColor: Colors.threat,
    padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.lg,
  },
  errorText: { ...TextStyles.body, color: Colors.threat, flex: 1 },

  submitWrap: { marginTop: Spacing.xl, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 17 },
  submitText: { ...TextStyles.button, color: Colors.primary },
});

export default CommunityReportScreen;
styles = makeStyles(Colors);
