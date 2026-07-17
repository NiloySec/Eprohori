import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeModules } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;

const isExpoGo = !NativeModules.CallDetection && !NativeModules.SmsListener;

export const DevWarningBanner = () => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const [dismissed, setDismissed] = useState(false);

  if (!isExpoGo || dismissed) return null;

  return (
    <View style={styles.banner}>
      <Icon name="information-outline" size={14} color="#fbbf24" />
      <Text style={styles.text}>
        Expo Go মোড — কল ডিটেকশন ও SMS স্ক্যান সীমিত
      </Text>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close" size={14} color="#fbbf24" />
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  banner: {
    backgroundColor: '#78350f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 5,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#d97706',
  },
  text: { ...TextStyles.caption, color: '#fde68a', flex: 1, fontWeight: '600' },
});
styles = makeStyles(Colors);
