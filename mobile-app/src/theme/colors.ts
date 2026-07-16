// L8: WCAG 2.1 contrast ratios against primary bg (#1a0a1f, luminance ~0.006)
// AA requires ≥4.5:1 for normal text, ≥3:1 for large/bold text; AAA requires ≥7:1.
// accent (#00ffcc) ~17:1 — AAA ✓ (headlines, CTAs)
// text.primary (#ffffff) ~19:1 — AAA ✓ (body text)
// text.secondary (#ccbbdd) ~9.5:1 — AAA ✓ (captions)
// text.tertiary (#8877aa) ~3.5:1 — AA large text only; use for decorative/placeholder only
// safe (#00dd99) ~9:1 — AAA ✓; suspicious (#ffb300) ~8:1 — AAA ✓; threat (#ff5555) ~5:1 — AA ✓
export const DarkColors = {
  primary: '#1a0a1f',
  secondary: '#2d1b3d',
  accent: '#00ffcc',
  accentDark: '#00b894',
  safe: '#00dd99',
  suspicious: '#ffb300',
  threat: '#ff5555',
  white: '#ffffff',
  black: '#000000',
  gray: { light: '#f5f5f5', medium: '#aaa', dark: '#666' },

  gradient: {
    primary:    ['#1a0a1f', '#2d1b3d'] as [string, string],
    safe:       ['#00ffcc', '#00dd99'] as [string, string],
    suspicious: ['#ffb300', '#ff9900'] as [string, string],
    threat:     ['#ff5555', '#ff3333'] as [string, string],
    accent:     ['#00ffcc', '#00b894'] as [string, string],
    hero:       ['#2d1b3d', '#1a0a1f'] as [string, string],
    safeHero:       ['#003d22', '#1a0a1f'] as [string, string],
    suspiciousHero: ['#2d1e00', '#1a0a1f'] as [string, string],
    threatHero:     ['#3d0a0a', '#1a0a1f'] as [string, string],
  },

  overlay:      'rgba(0,0,0,0.75)',
  text: {
    primary:   '#ffffff',   // 19:1 on primary — AAA
    secondary: '#ccbbdd',   // 9.5:1 on primary — AAA
    tertiary:  '#8877aa',   // 3.5:1 on primary — decorative/placeholder only
  },
  border:       '#3d2860',
  borderAccent: 'rgba(0,255,204,0.25)',
  safeGlow:        'rgba(0,221,153,0.14)',
  suspiciousGlow:  'rgba(255,179,0,0.14)',
  threatGlow:      'rgba(255,85,85,0.14)',
  accentGlow:      'rgba(0,255,204,0.12)',

  // M25: Glassmorphism and Professional Surfaces
  glass: {
    primary:   'rgba(45, 27, 61, 0.7)',
    secondary: 'rgba(61, 40, 96, 0.4)',
    accent:    'rgba(0, 255, 204, 0.1)',
    threat:    'rgba(255, 85, 85, 0.1)',
    safe:      'rgba(0, 221, 153, 0.1)',
  },
  surface: {
    low:     '#130818',
    medium:  '#1a0a1f',
    high:    '#251230',
    highest: '#2d1b3d',
  }
};

// R8: Light theme — WCAG contrast checked against #f8f9fa bg (~1.0 luminance)
// text.primary (#1a0a1f) ~18:1 — AAA ✓; accent (#00796b) ~4.6:1 — AA ✓
export const LightColors = {
  primary:   '#f8f9fa',
  secondary: '#e9ecef',
  accent:    '#00796b',
  accentDark:'#005a4e',
  safe:      '#00796b',
  suspicious:'#e65100',
  threat:    '#c62828',
  white:     '#ffffff',
  black:     '#000000',
  gray: { light: '#f5f5f5', medium: '#aaa', dark: '#666' },

  gradient: {
    primary:    ['#f8f9fa', '#e9ecef'] as [string, string],
    safe:       ['#00796b', '#005a4e'] as [string, string],
    suspicious: ['#e65100', '#bf360c'] as [string, string],
    threat:     ['#c62828', '#b71c1c'] as [string, string],
    accent:     ['#00796b', '#005a4e'] as [string, string],
    hero:       ['#e9ecef', '#f8f9fa'] as [string, string],
    safeHero:       ['#e0f2f1', '#f8f9fa'] as [string, string],
    suspiciousHero: ['#fff3e0', '#f8f9fa'] as [string, string],
    threatHero:     ['#ffebee', '#f8f9fa'] as [string, string],
  },

  overlay:      'rgba(0,0,0,0.55)',
  text: {
    primary:   '#1a0a1f',   // 18:1 on light bg — AAA
    secondary: '#5a4a6a',   // 5.5:1 — AA ✓
    tertiary:  '#8877aa',   // 3.2:1 — decorative only
  },
  border:       '#d0c8e0',
  borderAccent: 'rgba(0,121,107,0.3)',
  safeGlow:        'rgba(0,121,107,0.10)',
  suspiciousGlow:  'rgba(230,81,0,0.10)',
  threatGlow:      'rgba(198,40,40,0.10)',
  accentGlow:      'rgba(0,121,107,0.08)',

  // M25: Glassmorphism and Professional Surfaces — light equivalents
  glass: {
    primary:   'rgba(255, 255, 255, 0.7)',
    secondary: 'rgba(233, 236, 239, 0.4)',
    accent:    'rgba(0, 121, 107, 0.1)',
    threat:    'rgba(198, 40, 40, 0.1)',
    safe:      'rgba(0, 121, 107, 0.1)',
  },
  surface: {
    low:     '#ffffff',
    medium:  '#f8f9fa',
    high:    '#e9ecef',
    highest: '#dee2e6',
  }
};

export type ThemeColors = typeof DarkColors;

// Default export keeps backward compatibility with existing `import { Colors }` usage
export const Colors = DarkColors;
