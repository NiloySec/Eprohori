import { Platform } from 'react-native';

const sizes = {
  xs: 11,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 32,
};

export const Typography = {
  fontFamily: {
    regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
    semiBold: Platform.OS === 'ios' ? 'System' : 'Roboto',
    bold: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sizes,
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

export const TextStyles = {
  h1: {
    fontSize: sizes['3xl'],
    fontWeight: '700' as const,
    lineHeight: Math.round(sizes['3xl'] * 1.25),
  },
  h2: {
    fontSize: sizes['2xl'],
    fontWeight: '700' as const,
    lineHeight: Math.round(sizes['2xl'] * 1.25),
  },
  h3: {
    fontSize: sizes.xl,
    fontWeight: '600' as const,
    lineHeight: Math.round(sizes.xl * 1.3),
  },
  body: {
    fontSize: sizes.base,
    fontWeight: '400' as const,
    lineHeight: Math.round(sizes.base * 1.6),
  },
  bodyMedium: {
    fontSize: sizes.base,
    fontWeight: '500' as const,
    lineHeight: Math.round(sizes.base * 1.6),
  },
  caption: {
    fontSize: sizes.sm,
    fontWeight: '400' as const,
    lineHeight: Math.round(sizes.sm * 1.5),
  },
  button: {
    fontSize: sizes.lg,
    fontWeight: '600' as const,
    lineHeight: Math.round(sizes.lg * 1.4),
  },
};
