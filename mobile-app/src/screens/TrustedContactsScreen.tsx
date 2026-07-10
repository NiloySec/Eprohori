import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { useTranslation } from '@hooks';
import { useSettingsStore } from '@stores';
import { NoContactsIllustration } from '@components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TrustedContacts'>;

// N3: trusted whitelist — numbers here are never spam-flagged or call-alerted
const TrustedContactsScreen = ({ navigation }: Props) => {
  const t = useTranslation();
  const [input, setInput] = useState('');
  const trustedNumbers      = useSettingsStore((s) => s.trustedNumbers);
  const addTrustedNumber    = useSettingsStore((s) => s.addTrustedNumber);
  const removeTrustedNumber = useSettingsStore((s) => s.removeTrustedNumber);

  const handleAdd = () => {
    const clean = input.replace(/\D/g, '');
    if (clean.length < 3) {
      Alert.alert('', t('trusted_invalid'));
      return;
    }
    addTrustedNumber(clean);
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleRemove = (num: string) => {
    Alert.alert(t('trusted_remove_title'), num, [
      { text: t('trusted_remove_cancel'), style: 'cancel' },
      { text: t('trusted_remove_confirm'), style: 'destructive', onPress: () => removeTrustedNumber(num) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Icon name="account-heart-outline" size={26} color={Colors.accent} />
        </View>
        <Text style={styles.title}>{t('trusted_title')}</Text>
        <Text style={styles.subtitle}>
          {t('trusted_subtitle')}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t('trusted_placeholder')}
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="phone-pad"
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
              <LinearGradient colors={Colors.gradient.accent} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="plus" size={20} color={Colors.primary} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={trustedNumbers}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <NoContactsIllustration color={Colors.accent} size={110} />
              <Text style={styles.emptyText}>{t('trusted_empty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.numRow}>
              <View style={styles.numIcon}>
                <Icon name="shield-check" size={18} color={Colors.safe} />
              </View>
              <Text style={styles.numText}>{item}</Text>
              <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle-outline" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
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
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: 4, lineHeight: 20 },

  body: { flex: 1, padding: Spacing.lg },

  inputCard: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    ...TextStyles.body, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBtn:     { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnGrad: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },

  numRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: `${Colors.safe}25`,
  },
  numIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: `${Colors.safe}15`,
    justifyContent: 'center', alignItems: 'center',
  },
  numText: { ...TextStyles.body, color: Colors.text.primary, flex: 1, fontWeight: '600' },

  emptyBox:  { alignItems: 'center', paddingVertical: 48, gap: Spacing.md },
  emptyText: { ...TextStyles.body, color: Colors.text.tertiary },
});

export default TrustedContactsScreen;
