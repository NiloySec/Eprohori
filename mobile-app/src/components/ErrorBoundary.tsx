import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';
import { Sentry } from '../services/sentry';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    Sentry.captureException(error);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Icon name="alert-circle-outline" size={52} color={Colors.threat} />
        </View>
        <Text style={styles.title}>কিছু একটা ভুল হয়েছে</Text>
        <Text style={styles.subtitle}>Something went wrong</Text>
        <Text style={styles.detail} numberOfLines={3}>{this.state.message}</Text>
        <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.8}>
          <Text style={styles.btnText}>আবার চেষ্টা করুন · Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'],
  },
  iconBox: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: Colors.threatGlow, borderWidth: 1, borderColor: `${Colors.threat}40`,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
  },
  title:    { ...TextStyles.h2, color: Colors.threat, marginBottom: Spacing.xs },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary, marginBottom: Spacing.lg },
  detail: {
    ...TextStyles.caption, color: Colors.text.tertiary,
    textAlign: 'center', marginBottom: Spacing['2xl'], lineHeight: 18,
  },
  btn: {
    backgroundColor: Colors.secondary, paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  btnText: { ...TextStyles.bodyMedium, color: Colors.accent },
});
