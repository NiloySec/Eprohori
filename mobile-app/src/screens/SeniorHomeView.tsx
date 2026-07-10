import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@theme';
import { useSettingsStore } from '@stores';
import { useTranslation } from '@hooks';
import type { HomeScreenProps } from '@navigation/types';

interface Props { navigation: HomeScreenProps['navigation'] }

// S2: senior mode — large buttons, minimal text, one tap per action.
// Designed for elderly parents/relatives who are the most common scam targets.
const SeniorHomeView = ({ navigation }: Props) => {
  const t = useTranslation();
  const setSeniorModeEnabled = useSettingsStore((s) => s.setSeniorModeEnabled);

  const handleSOS = () => {
    Alert.alert(t('senior_sos_confirm_title'), '', [
      { text: t('senior_sos_no'), style: 'cancel' },
      { text: t('senior_sos_yes'), style: 'destructive', onPress: () => Linking.openURL('tel:999').catch(() => {}) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.shield}>
          <Icon name="shield-check" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.title}>EProhori</Text>
        <Text style={styles.subtitle}>{t('senior_subtitle')}</Text>
      </View>

      <TouchableOpacity
        style={[styles.bigBtn, { backgroundColor: Colors.accent }]}
        onPress={() => navigation.navigate('Analyzer')}
        activeOpacity={0.8}
      >
        <Icon name="message-text" size={36} color={Colors.primary} />
        <Text style={styles.bigBtnText}>{t('senior_msg_check')}</Text>
        <Text style={styles.bigBtnSub}>{t('senior_msg_check_sub')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bigBtn, { backgroundColor: '#818cf8' }]}
        onPress={() => navigation.navigate('CallerID')}
        activeOpacity={0.8}
      >
        <Icon name="phone-check" size={36} color={Colors.white} />
        <Text style={[styles.bigBtnText, { color: Colors.white }]}>{t('senior_number_check')}</Text>
        <Text style={[styles.bigBtnSub, { color: `${Colors.white}cc` }]}>{t('senior_number_check_sub')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bigBtn, { backgroundColor: Colors.suspicious }]}
        onPress={() => navigation.navigate('LiveCallListen')}
        activeOpacity={0.8}
      >
        <Icon name="microphone" size={36} color={Colors.primary} />
        <Text style={styles.bigBtnText}>কলের কথা শুনুন</Text>
        <Text style={styles.bigBtnSub}>কল স্পিকারে দিয়ে চালু করুন</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.8}>
        <Icon name="phone-alert" size={36} color={Colors.white} />
        <Text style={[styles.bigBtnText, { color: Colors.white }]}>{t('senior_sos')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.exitBtn} onPress={() => setSeniorModeEnabled(false)}>
        <Text style={styles.exitBtnText}>{t('senior_exit')}</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  wrap: { flex: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.lg },

  header: { alignItems: 'center', marginBottom: Spacing.lg },
  shield: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  title:    { fontSize: 32, fontWeight: '800', color: Colors.accent },
  subtitle: { fontSize: 18, color: Colors.text.secondary, marginTop: 4 },

  bigBtn: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: 8,
  },
  bigBtnText: { fontSize: 22, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  bigBtnSub:  { fontSize: 14, color: `${Colors.primary}cc`, textAlign: 'center' },

  sosBtn: {
    backgroundColor: Colors.threat, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: 8,
  },

  exitBtn: { alignItems: 'center', paddingVertical: Spacing.lg },
  exitBtnText: { fontSize: 15, color: Colors.text.tertiary, textDecorationLine: 'underline' },
});

export default SeniorHomeView;
