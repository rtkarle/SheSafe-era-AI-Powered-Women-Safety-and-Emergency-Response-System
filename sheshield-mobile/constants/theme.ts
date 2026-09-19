/**
 * SheShield Design System Tokens (Mobile — Light Theme)
 */

export const Colors = {
  // Brand
  berry: '#7C3355',
  berryDark: '#5A1F3A',
  berryLight: '#9B4470',
  berryGlow: 'rgba(124,51,85,0.18)',
  berrySubtle: 'rgba(124,51,85,0.08)',

  // Gold
  gold: '#B8892A',
  goldLight: '#D4A843',

  // Emergency
  emergency: '#C62828',
  emergencyDark: '#8B0000',
  emergencyLight: '#E53935',
  emergencyBg: 'rgba(198,40,40,0.08)',
  emergencyBorder: 'rgba(198,40,40,0.25)',

  // Guardian / Success
  guardian: '#2E7D32',
  guardianLight: '#388E3C',
  guardianBg: 'rgba(46,125,50,0.08)',
  guardianBorder: 'rgba(46,125,50,0.25)',

  // Warning
  warning: '#E65100',
  warningBg: 'rgba(230,81,0,0.08)',

  // Backgrounds — LIGHT
  bg: '#F5F5F8',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F0F6',
  surfaceHigh: '#E8E8F0',

  // Borders
  border: 'rgba(0,0,0,0.07)',
  borderLight: 'rgba(0,0,0,0.12)',
  borderFocus: '#7C3355',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#55556A',
  textMuted: '#9999AA',
  textInverse: '#FFFFFF',

  // Status
  online: '#2E7D32',
  offline: '#9999AA',
  error: '#C62828',

  // Overlays
  overlay: 'rgba(0,0,0,0.4)',
  shimmer: 'rgba(0,0,0,0.03)',
};

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 42,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 28,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emergency: {
    shadowColor: '#C62828',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  berry: {
    shadowColor: '#7C3355',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  guardian: {
    shadowColor: '#2E7D32',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};
