import React, { useState } from 'react';
import {
  View, ScrollView, Text, TextInput, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSettingsStore } from '@stores';
import { useTranslation } from '@hooks';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';
import { NoBlockedIllustration } from '@components';
import type { BlocklistScreenProps } from '@navigation/types';

const BlocklistScreen = ({ navigation }: BlocklistScreenProps) => {
  const [input, setInput] = useState('');
  const t = useTranslation();
  const blocklist         = useSettingsStore((s) => s.blocklist);
  const addToBlocklist    = useSettingsStore((s) => s.addToBlocklist);
  const removeFromBlocklist = useSettingsStore((s) => s.removeFromBlocklist);

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    if (blocklist.includes(val)) {
      Alert.alert('', t('blocklist_add') + ' — ইতোমধ্যে আছে');
      return;
    }
    addToBlocklist(val);
    setInput('');
  };

  const handleRemove = (item: string) => {
    Alert.alert('', `"${item}" মুছে ফেলবেন?`, [
      { text: t('history_cancel'), style: 'cancel' },
      { text: t('history_delete'), style: 'destructive', onPress: () => removeFromBlocklist(item) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Icon name="shield-lock" size={26} color={Colors.accent} />
        </View>
        <Text style={styles.title}>{t('blocklist_title')}</Text>
        <Text style={styles.subtitle}>{t('blocklist_desc')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Add row */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder={t('blocklist_placeholder')}
            placeholderTextColor={Colors.text.tertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.addBtn, !input.trim() && { opacity: 0.4 }]}
            onPress={handleAdd}
            disabled={!input.trim()}
          >
            <LinearGradient colors={Colors.gradient.accent} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="plus" size={20} color={Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>{t('blocklist_hint')}</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {blocklist.length === 0 ? (
            <View style={styles.emptyBox}>
              <NoBlockedIllustration color={Colors.accent} size={110} />
              <Text style={styles.emptyText}>{t('blocklist_empty')}</Text>
            </View>
          ) : (
            blocklist.map((item, i) => (
              <View key={`${item}-${i}`} style={styles.chip}>
                <View style={styles.chipLeft}>
                  <View style={styles.chipDot} />
                  <Text style={styles.chipText}>{item}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="close-circle" size={20} color={Colors.threat} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {blocklist.length > 0 && (
          <View style={styles.countBadge}>
            <Icon name="shield-check" size={14} color={Colors.accent} />
            <Text style={styles.countText}>{blocklist.length} টি কীওয়ার্ড সক্রিয়</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['2xl'] },
  backBtn: { marginBottom: Spacing.lg },
  headerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.borderAccent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title:    { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginTop: Spacing.xs },

  body:  { flex: 1, padding: Spacing.lg },

  addRow:  { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  addInput: {
    flex: 1, backgroundColor: Colors.secondary, color: Colors.text.primary,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border, fontSize: 15,
    ...Shadows.small,
  },
  addBtn:     { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  addBtnGrad: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },

  hint: { ...TextStyles.caption, color: Colors.text.tertiary, marginBottom: Spacing.xl },

  listContent: { paddingBottom: Spacing['3xl'] },

  emptyBox:    { alignItems: 'center', paddingTop: 40, gap: Spacing.md },
  emptyText: { ...TextStyles.h3, color: Colors.text.secondary },

  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  chipLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  chipDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.threat },
  chipText: { ...TextStyles.body, color: Colors.text.primary, flex: 1 },

  countBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, backgroundColor: Colors.accentGlow,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderAccent, marginTop: Spacing.md,
  },
  countText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },
});

export default BlocklistScreen;
