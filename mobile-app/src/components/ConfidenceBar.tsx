import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';
import { useTranslation } from '@hooks';

interface ConfidenceBarProps {
  confidence: number;
  style?: ViewStyle;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ confidence, style }) => {
  const t = useTranslation();

  const getColor = () => {
    if (confidence >= 75) return Colors.threat;
    if (confidence >= 60) return Colors.suspicious;
    return Colors.safe;
  };

  const getLabel = () => {
    if (confidence >= 75) return t('confidence_threat');
    if (confidence >= 60) return t('confidence_suspicious');
    return t('confidence_safe');
  };

  const color = getColor();

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <Text style={[TextStyles.caption, { color: Colors.text.secondary }]}>
          {t('confidence_label')}
        </Text>
        <Text style={[TextStyles.caption, { color, fontWeight: '600' }]}>
          {Math.round(confidence)}% — {getLabel()}
        </Text>
      </View>

      <View style={{
        height: 8,
        backgroundColor: Colors.secondary,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
      }}>
        <View style={{
          height: '100%',
          width: `${Math.min(confidence, 100)}%`,
          backgroundColor: color,
          borderRadius: BorderRadius.full,
        }} />
      </View>
    </View>
  );
};
