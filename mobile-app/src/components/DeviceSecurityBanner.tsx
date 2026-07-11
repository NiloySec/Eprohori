import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Device from 'expo-device';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';

export const DeviceSecurityBanner = () => {
  const [isRooted, setIsRooted] = useState(false);

  useEffect(() => {
    Device.isRootedExperimentalAsync().then(setIsRooted).catch(() => {});
  }, []);

  if (!isRooted) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Icon name="alert-decagram" size={20} color={Colors.white} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>ডিভাইস নিরাপত্তা সতর্কতা</Text>
        <Text style={styles.text}>
          আপনার ডিভাইসটি Rooted/Jailbroken মনে হচ্ছে। এটি আপনার ব্যক্তিগত ডাটার জন্য ঝুঁকিপূর্ণ হতে পারে।
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '800', color: Colors.white },
  text: { fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 16, marginTop: 2 },
});
