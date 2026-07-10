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
import type { FamilyScreenProps } from '@navigation/types';

const PROFILE_ICONS = ['account', 'account-circle', 'face-man', 'face-woman', 'baby-face', 'account-tie'];

const FamilyScreen = ({ navigation }: FamilyScreenProps) => {
  const [newName, setNewName] = useState('');
  const t = useTranslation();

  const activeProfile    = useSettingsStore((s) => s.activeProfile);
  const familyProfiles   = useSettingsStore((s) => s.familyProfiles);
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile);
  const addFamilyProfile = useSettingsStore((s) => s.addFamilyProfile);
  const removeFamilyProfile = useSettingsStore((s) => s.removeFamilyProfile);
  const language = useSettingsStore((s) => s.language);

  const defaultName = language === 'bn' ? 'আমি' : 'Me';

  const handleAdd = () => {
    const val = newName.trim();
    if (!val) return;
    if (val === defaultName || familyProfiles.includes(val)) {
      Alert.alert('', language === 'bn' ? 'এই নামটি ইতোমধ্যে আছে' : 'This name already exists');
      return;
    }
    addFamilyProfile(val);
    setNewName('');
  };

  const handleRemove = (name: string) => {
    Alert.alert(t('family_delete_confirm'), name, [
      { text: t('history_cancel'), style: 'cancel' },
      { text: t('history_delete'), style: 'destructive', onPress: () => removeFamilyProfile(name) },
    ]);
  };

  const allProfiles = [defaultName, ...familyProfiles];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={Colors.gradient.hero} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="account-group" size={26} color={Colors.accent} />
          </View>
          <Text style={styles.title}>{t('family_title')}</Text>
          <Text style={styles.subtitle}>{t('family_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Active profile banner */}
          <LinearGradient colors={Colors.gradient.accent} style={styles.activeBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Icon name="shield-account" size={22} color={Colors.primary} />
            <View>
              <Text style={styles.activeLabelText}>{t('family_active_profile')}</Text>
              <Text style={styles.activeNameText}>{activeProfile}</Text>
            </View>
          </LinearGradient>

          {/* Hint */}
          <View style={styles.hintBox}>
            <Icon name="information-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.hintText}>{t('family_hint')}</Text>
          </View>

          {/* Profile list */}
          <Text style={styles.sectionLabel}>{t('family_profile_label')}</Text>
          {allProfiles.map((name, i) => {
            const isActive = activeProfile === name;
            const isDefault = name === defaultName;
            const iconName = PROFILE_ICONS[i % PROFILE_ICONS.length] as any;
            return (
              <View key={name} style={[styles.profileCard, isActive && styles.profileCardActive]}>
                <View style={[styles.profileIconBox, { backgroundColor: isActive ? `${Colors.accent}25` : Colors.primary }]}>
                  <Icon name={iconName} size={22} color={isActive ? Colors.accent : Colors.text.tertiary} />
                </View>
                <Text style={[styles.profileName, isActive && { color: Colors.accent }]}>{name}</Text>
                {isActive && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>{t('family_active_badge')}</Text>
                  </View>
                )}
                {!isActive && (
                  <TouchableOpacity
                    style={styles.switchBtn}
                    onPress={() => setActiveProfile(name)}
                  >
                    <Text style={styles.switchBtnText}>{t('family_switch')}</Text>
                  </TouchableOpacity>
                )}
                {!isDefault && (
                  <TouchableOpacity
                    onPress={() => handleRemove(name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginLeft: Spacing.sm }}
                  >
                    <Icon name="close-circle-outline" size={20} color={Colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Add new profile */}
          <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>{t('family_add_btn')}</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder={t('family_add_placeholder')}
              placeholderTextColor={Colors.text.tertiary}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, !newName.trim() && { opacity: 0.4 }]}
              onPress={handleAdd}
              disabled={!newName.trim()}
            >
              <LinearGradient colors={Colors.gradient.accent} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="account-plus" size={20} color={Colors.primary} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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

  body: { padding: Spacing.lg },

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md,
  },
  activeLabelText: { ...TextStyles.caption, color: Colors.primary, opacity: 0.75 },
  activeNameText:  { ...TextStyles.h3, color: Colors.primary },

  hintBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.small,
  },
  hintText: { ...TextStyles.caption, color: Colors.text.tertiary, flex: 1, lineHeight: 20 },

  sectionLabel: { ...TextStyles.caption, color: Colors.text.tertiary, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  profileCardActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}08` },
  profileIconBox:    { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileName:       { ...TextStyles.body, color: Colors.text.primary, flex: 1 },

  activePill: {
    backgroundColor: Colors.accentGlow, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderAccent,
  },
  activePillText: { ...TextStyles.caption, color: Colors.accent, fontWeight: '700' },

  switchBtn: {
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  switchBtnText: { ...TextStyles.caption, color: Colors.text.secondary },

  addRow:     { flexDirection: 'row', gap: Spacing.md },
  addInput: {
    flex: 1, backgroundColor: Colors.secondary, color: Colors.text.primary,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border, fontSize: 15,
    ...Shadows.small,
  },
  addBtn:     { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  addBtnGrad: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
});

export default FamilyScreen;
