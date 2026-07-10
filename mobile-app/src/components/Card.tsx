import React from 'react';
import { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '@theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'safe' | 'suspicious' | 'threat';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const getGradient = (): [string, string] => {
    const gradients: Record<string, [string, string]> = {
      default: [Colors.secondary, Colors.primary],
      safe: Colors.gradient.safe,
      suspicious: Colors.gradient.suspicious,
      threat: Colors.gradient.threat,
    };
    return gradients[variant];
  };

  const cardStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
    ...Shadows.medium,
  };

  return (
    <LinearGradient
      colors={getGradient()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[cardStyle, style]}
    >
      {children}
    </LinearGradient>
  );
};
