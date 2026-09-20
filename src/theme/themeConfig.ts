/**
 * Centralized Scalable Theme Architecture Configuration
 *
 * Defines design tokens with WCAG AA compliant contrast ratios.
 * All UI components consume tokens from this file or ThemeContext.
 * New themes can be registered without modifying components.
 */

export type ThemeMode = 'system' | 'dark' | 'light' | 'cyber_orange' | 'midnight_blue';

export interface ThemeColors {
  id: ThemeMode;
  name: string;
  isDark: boolean;

  // Background tokens
  bgApp: string;
  bgCard: string;
  bgElevated: string;
  bgSurface: string;
  bgInput: string;
  bgNav: string;

  // Border tokens
  borderSubtle: string;
  borderStrong: string;
  borderAccent: string;

  // Text tokens
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Accent & Brand tokens
  accent: string;
  accentHover: string;
  accentSubtle: string;
  accentText: string;

  // Status tokens
  statusSuccess: string;
  statusSuccessBg: string;
  statusWarning: string;
  statusWarningBg: string;
  statusDanger: string;
  statusDangerBg: string;
  statusInfo: string;
  statusInfoBg: string;

  // Bottom Navigation tokens (matching mobile mockup)
  navItemActive: string;
  navItemInactive: string;
  navIndicator: string;
  homeIndicator: string;
}

export const THEME_DARK: ThemeColors = {
  id: 'dark',
  name: 'OLED Dark (Default)',
  isDark: true,
  bgApp: '#0a0a0a',
  bgCard: '#121212',
  bgElevated: '#1a1a1a',
  bgSurface: '#181818',
  bgInput: '#161616',
  bgNav: '#0f0f0f',

  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  borderAccent: 'rgba(249, 115, 22, 0.35)',

  textPrimary: '#f5f5f5',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  textInverse: '#0a0a0a',

  accent: '#ea580c',
  accentHover: '#f97316',
  accentSubtle: 'rgba(234, 88, 12, 0.14)',
  accentText: '#fb923c',

  statusSuccess: '#10b981',
  statusSuccessBg: 'rgba(16, 185, 129, 0.12)',
  statusWarning: '#f59e0b',
  statusWarningBg: 'rgba(245, 158, 11, 0.12)',
  statusDanger: '#ef4444',
  statusDangerBg: 'rgba(239, 68, 68, 0.14)',
  statusInfo: '#06b6d4',
  statusInfoBg: 'rgba(6, 182, 212, 0.12)',

  navItemActive: '#ea580c',
  navItemInactive: '#737373',
  navIndicator: '#ea580c',
  homeIndicator: '#ffffff',
};

export const THEME_LIGHT: ThemeColors = {
  id: 'light',
  name: 'Clean Light',
  isDark: false,
  bgApp: '#f8fafc',
  bgCard: '#ffffff',
  bgElevated: '#f1f5f9',
  bgSurface: '#e2e8f0',
  bgInput: '#f8fafc',
  bgNav: '#ffffff',

  borderSubtle: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.16)',
  borderAccent: 'rgba(234, 88, 12, 0.4)',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textInverse: '#ffffff',

  accent: '#ea580c',
  accentHover: '#c2410c',
  accentSubtle: 'rgba(234, 88, 12, 0.1)',
  accentText: '#c2410c',

  statusSuccess: '#059669',
  statusSuccessBg: 'rgba(5, 150, 105, 0.12)',
  statusWarning: '#d97706',
  statusWarningBg: 'rgba(217, 119, 6, 0.12)',
  statusDanger: '#dc2626',
  statusDangerBg: 'rgba(220, 38, 38, 0.12)',
  statusInfo: '#0891b2',
  statusInfoBg: 'rgba(8, 145, 178, 0.12)',

  navItemActive: '#ea580c',
  navItemInactive: '#94a3b8',
  navIndicator: '#ea580c',
  homeIndicator: '#0f172a',
};

export const THEME_CYBER_ORANGE: ThemeColors = {
  id: 'cyber_orange',
  name: 'Cyber Cockpit (High Contrast)',
  isDark: true,
  bgApp: '#050505',
  bgCard: '#0d0d0d',
  bgElevated: '#17140f',
  bgSurface: '#1f1911',
  bgInput: '#100e0b',
  bgNav: '#0a0805',

  borderSubtle: 'rgba(249, 115, 22, 0.2)',
  borderStrong: 'rgba(249, 115, 22, 0.45)',
  borderAccent: '#f97316',

  textPrimary: '#ffffff',
  textSecondary: '#fed7aa',
  textMuted: '#9a7b56',
  textInverse: '#000000',

  accent: '#ff6600',
  accentHover: '#ff8533',
  accentSubtle: 'rgba(255, 102, 0, 0.18)',
  accentText: '#ff944d',

  statusSuccess: '#22c55e',
  statusSuccessBg: 'rgba(34, 197, 94, 0.16)',
  statusWarning: '#eab308',
  statusWarningBg: 'rgba(234, 179, 8, 0.16)',
  statusDanger: '#f43f5e',
  statusDangerBg: 'rgba(244, 63, 94, 0.18)',
  statusInfo: '#38bdf8',
  statusInfoBg: 'rgba(56, 189, 248, 0.16)',

  navItemActive: '#ff6600',
  navItemInactive: '#856441',
  navIndicator: '#ff6600',
  homeIndicator: '#ff6600',
};

export const THEME_MIDNIGHT_BLUE: ThemeColors = {
  id: 'midnight_blue',
  name: 'Midnight Avionics',
  isDark: true,
  bgApp: '#030712',
  bgCard: '#0f172a',
  bgElevated: '#1e293b',
  bgSurface: '#1e293b',
  bgInput: '#0b1329',
  bgNav: '#070d1d',

  borderSubtle: 'rgba(56, 189, 248, 0.15)',
  borderStrong: 'rgba(56, 189, 248, 0.3)',
  borderAccent: 'rgba(14, 165, 233, 0.5)',

  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#030712',

  accent: '#0284c7',
  accentHover: '#0ea5e9',
  accentSubtle: 'rgba(2, 132, 199, 0.18)',
  accentText: '#38bdf8',

  statusSuccess: '#10b981',
  statusSuccessBg: 'rgba(16, 185, 129, 0.15)',
  statusWarning: '#f59e0b',
  statusWarningBg: 'rgba(245, 158, 11, 0.15)',
  statusDanger: '#f43f5e',
  statusDangerBg: 'rgba(244, 63, 94, 0.15)',
  statusInfo: '#0ea5e9',
  statusInfoBg: 'rgba(14, 165, 233, 0.15)',

  navItemActive: '#38bdf8',
  navItemInactive: '#64748b',
  navIndicator: '#0284c7',
  homeIndicator: '#38bdf8',
};

export const THEMES: Record<string, ThemeColors> = {
  dark: THEME_DARK,
  light: THEME_LIGHT,
  cyber_orange: THEME_CYBER_ORANGE,
  midnight_blue: THEME_MIDNIGHT_BLUE,
};

/**
 * Apply CSS variables to root element to allow universal token inheritance
 */
export function applyThemeCssVariables(theme: ThemeColors): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--bg-app', theme.bgApp);
  root.style.setProperty('--bg-card', theme.bgCard);
  root.style.setProperty('--bg-elevated', theme.bgElevated);
  root.style.setProperty('--bg-surface', theme.bgSurface);
  root.style.setProperty('--bg-input', theme.bgInput);
  root.style.setProperty('--bg-nav', theme.bgNav);

  root.style.setProperty('--border-subtle', theme.borderSubtle);
  root.style.setProperty('--border-strong', theme.borderStrong);
  root.style.setProperty('--border-accent', theme.borderAccent);

  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--text-inverse', theme.textInverse);

  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
  root.style.setProperty('--accent-subtle', theme.accentSubtle);
  root.style.setProperty('--accent-text', theme.accentText);

  root.style.setProperty('--status-success', theme.statusSuccess);
  root.style.setProperty('--status-warning', theme.statusWarning);
  root.style.setProperty('--status-danger', theme.statusDanger);
  root.style.setProperty('--status-info', theme.statusInfo);

  // Sync html class for Tailwind dark: variants
  if (theme.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}
