import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useSettingsStore } from '@stores';
import { useTranslation } from '@hooks';
import { extractPhoneNumbers } from '../utils/phoneFeatures';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

// S1: Clipboard Guard — when the user copies a phone number or a link (from
// WhatsApp, SMS, anywhere), a small dismissible suggestion offers a one-tap
// check. Clipboard is only read when the app returns to foreground — never
// polled continuously, so there's no background privacy concern.

type Kind = 'phone' | 'url';
interface Suggestion { kind: Kind; value: string }

function detect(text: string): Suggestion | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: 'url', value: trimmed };
  }
  const nums = extractPhoneNumbers(trimmed);
  if (nums.length === 1 && trimmed.replace(/[\s\-()]/g, '').length <= 16) {
    return { kind: 'phone', value: nums[0] };
  }
  return null;
}

// Rendered once at the root, as an absolute overlay above whatever screen is
// currently active — that way it works no matter which tab the user returns to.
export const ClipboardGuardBanner = () => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
  const enabled = useSettingsStore((s) => s.clipboardGuardEnabled);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const lastCheckedRef = useRef<string>('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const checkClipboard = async () => {
    if (!enabled) return;
    try {
      const hasUrl = await Clipboard.hasUrlAsync().catch(() => false);
      const text = await Clipboard.getStringAsync();
      if (!text || text === lastCheckedRef.current) return;
      lastCheckedRef.current = text;

      const found = hasUrl && !/^https?:\/\//i.test(text.trim())
        ? null // hasUrlAsync true but string isn't a plain URL — skip ambiguous case
        : detect(text);
      setSuggestion(found);
    } catch {}
  };

  useEffect(() => {
    if (!enabled) { setSuggestion(null); return; }
    checkClipboard();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkClipboard();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled || !suggestion) return null;

  const handlePress = () => {
    setSuggestion(null);
    if (suggestion.kind === 'phone') {
      navigation.navigate('CallerID', { initialNumber: suggestion.value });
    } else {
      navigation.navigate('LinkCheck', { url: suggestion.value.slice(0, 2000) });
    }
  };

  return (
    <View style={[styles.banner, { top: insets.top }]}>
      <Icon name={suggestion.kind === 'phone' ? 'phone-alert-outline' : 'link-variant'} size={16} color={Colors.accent} />
      <Text style={styles.text} numberOfLines={1}>
        {suggestion.kind === 'phone' ? t('clipboard_check_number') : t('clipboard_check_link')} {t('clipboard_verify_suffix')}
      </Text>
      <TouchableOpacity style={styles.checkBtn} onPress={handlePress}>
        <Text style={styles.checkBtnText}>{t('clipboard_check_btn')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSuggestion(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close" size={16} color={Colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  banner: {
    position: 'absolute', left: 0, right: 0, zIndex: 100, elevation: 100,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.secondary, borderBottomWidth: 1, borderBottomColor: Colors.borderAccent,
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  text: { ...TextStyles.caption, color: Colors.text.secondary, flex: 1 },
  checkBtn: {
    backgroundColor: Colors.accent, borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  checkBtnText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
});
styles = makeStyles(Colors);
