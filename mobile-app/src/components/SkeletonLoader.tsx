import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors, DarkColors, type ThemeColors, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 16, borderRadius = BorderRadius.sm, style }: SkeletonProps) => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.bone, { width: width as any, height, borderRadius, opacity }, style]}
    />
  );
};

export const DistrictSkeleton = () => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  return (
  <View style={styles.card}>
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={i} style={styles.row}>
        <Skeleton width={20} height={14} borderRadius={4} />
        <View style={{ flex: 1 }}>
          <Skeleton width="50%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={6} borderRadius={3} />
        </View>
        <Skeleton width={24} height={14} borderRadius={4} />
      </View>
    ))}
  </View>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  bone: { backgroundColor: Colors.secondary },
  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
styles = makeStyles(Colors);
