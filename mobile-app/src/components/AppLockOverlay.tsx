import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;

interface Props {
  pin: string;
  onUnlock: () => void;
  biometricEnabled?: boolean;
}

const ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','✓']];

export const AppLockOverlay = ({ pin, onUnlock, biometricEnabled = false }: Props) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  // M19: store actual PIN input in a ref, not state — avoids DevTools/memory-dump exposure
  const inputRef = React.useRef('');
  const [inputLen,   setInputLen]   = useState(0);
  const [shake,      setShake]      = useState(false);
  const [bioSupport, setBioSupport] = useState(false);

  // R4: check if biometric hardware is available and enrolled
  useEffect(() => {
    if (!biometricEnabled) return;
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (!has) return;
      LocalAuthentication.isEnrolledAsync().then((enrolled) => setBioSupport(enrolled));
    });
  }, [biometricEnabled]);

  // R4: auto-trigger biometric prompt on mount if enabled
  useEffect(() => {
    if (biometricEnabled && bioSupport) triggerBiometric();
  }, [bioSupport]);

  const triggerBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'EProhori আনলক করুন',
        cancelLabel:   'PIN ব্যবহার করুন',
        fallbackLabel: 'PIN ব্যবহার করুন',
        disableDeviceFallback: true,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    } catch {}
  };

  const handleKey = (key: string) => {
    if (key === '⌫') {
      inputRef.current = inputRef.current.slice(0, -1);
      setInputLen(inputRef.current.length);
      return;
    }
    if (key === '✓') { verify(inputRef.current); return; }
    if (inputRef.current.length < 4) {
      inputRef.current = inputRef.current + key;
      setInputLen(inputRef.current.length);
      if (inputRef.current.length === 4) setTimeout(() => verify(inputRef.current), 80);
    }
  };

  const verify = (val: string) => {
    if (val === pin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      inputRef.current = '';
      setInputLen(0);
      onUnlock();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShake(true);
      setTimeout(() => {
        inputRef.current = '';
        setInputLen(0);
        setShake(false);
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <Icon name="shield-lock" size={52} color={Colors.accent} />
      <Text style={styles.title}>EProhori লক</Text>
      <Text style={styles.sub}>PIN দিয়ে আনলক করুন</Text>

      <View style={styles.dots}>
        {[0,1,2,3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              inputLen > i && styles.dotFilled,
              shake        && styles.dotError,
            ]}
          />
        ))}
      </View>

      {shake && <Text style={styles.errText}>ভুল PIN, আবার চেষ্টা করুন</Text>}

      <View style={styles.keypad}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  key === '✓' && styles.keyConfirm,
                  key === '⌫' && styles.keyBack,
                ]}
                onPress={() => handleKey(key)}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel={key === '⌫' ? 'মুছুন' : key === '✓' ? 'নিশ্চিত করুন' : `সংখ্যা ${key}`}
              >
                {key === '⌫' ? (
                  <Icon name="backspace-outline" size={22} color={Colors.text.secondary} />
                ) : key === '✓' ? (
                  <Icon name="check" size={22} color={Colors.primary} />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* R4: fingerprint button — only shown when hardware available */}
      {biometricEnabled && bioSupport && (
        <TouchableOpacity
          style={styles.bioBtn}
          onPress={triggerBiometric}
          accessibilityRole="button"
          accessibilityLabel="ফিঙ্গারপ্রিন্ট দিয়ে আনলক করুন"
        >
          <Icon name="fingerprint" size={32} color={Colors.accent} />
          <Text style={styles.bioText}>ফিঙ্গারপ্রিন্ট ব্যবহার করুন</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    gap: Spacing.md,
  },
  title:  { ...TextStyles.h2, color: Colors.accent, marginTop: Spacing.md },
  sub:    { ...TextStyles.body, color: Colors.text.secondary },
  errText:{ ...TextStyles.caption, color: '#ef4444', marginTop: 4 },

  dots: { flexDirection: 'row', gap: 16, marginVertical: Spacing.lg },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dotError:  { borderColor: '#ef4444', backgroundColor: '#ef4444' },

  keypad: { gap: Spacing.md, marginTop: Spacing.md },
  row:    { flexDirection: 'row', gap: Spacing.md },
  key: {
    width: 72, height: 72, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText:    { ...TextStyles.h2, color: Colors.text.primary },
  keyConfirm: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  keyBack:    { backgroundColor: Colors.primary },

  bioBtn: { alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  bioText: { ...TextStyles.caption, color: Colors.accent },
});
styles = makeStyles(Colors);
