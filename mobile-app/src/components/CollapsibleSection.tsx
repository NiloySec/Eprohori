import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TextStyles, Spacing, BorderRadius, Shadows } from '@theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MCIcon = React.ComponentProps<typeof Icon>['name'];

interface Props {
  icon: MCIcon;
  iconColor?: string;
  title: string;
  titleColor?: string;
  badge?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

// Reusable accordion card — used across screens to keep secondary/detail
// content (breakdowns, tips, layer lists) collapsed by default so primary
// content isn't buried under a wall of text.
export const CollapsibleSection = ({
  icon, iconColor = Colors.accent, title, titleColor, badge, defaultExpanded = false, children,
}: Props) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
          <View style={styles.headerLeft}>
            <Icon name={icon} size={18} color={iconColor} />
            <Text
              style={[styles.title, titleColor ? { color: titleColor } : null]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: `${iconColor}20` }]}>
                <Text style={[styles.badgeText, { color: iconColor }]}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.text.tertiary} />
        </TouchableOpacity>
        {expanded && <View style={styles.content}>{children}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md, ...Shadows.small },
  card: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  title: { ...TextStyles.h3, fontSize: 15, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
});
