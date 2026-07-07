import React from 'react';
import { View, ActivityIndicator, ViewStyle, Text } from 'react-native';
import { Colors, TextStyles, Spacing } from '@theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = Colors.accent,
  message,
  style,
}) => {
  return (
    <View
      style={[
        {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: Spacing.xl,
        },
        style,
      ]}
    >
      <ActivityIndicator
        size={size}
        color={color}
      />
      {message && (
        <Text
          style={[
            TextStyles.body,
            {
              marginTop: Spacing.md,
              color: Colors.text.secondary,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};
