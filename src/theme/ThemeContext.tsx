/**
 * Theme Context & Provider
 * Manages theme state, system appearance auto-detection on first launch,
 * and persistence using AsyncStorage.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ThemeMode,
  ThemeColors,
  THEMES,
  THEME_DARK,
  THEME_LIGHT,
  applyThemeCssVariables,
} from './themeConfig';
import { AsyncStorage } from './asyncStorage';

const THEME_STORAGE_KEY = 'drifx_app_theme_mode';

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleDarkLight: () => Promise<void>;
  isSystem: boolean;
  systemDarkDetected: boolean;
  availableThemes: Array<{ id: ThemeMode; name: string; isDark: boolean }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // 1. Detect System Appearance on Mount & Subscribe to Changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 2. Load Persisted Theme from AsyncStorage or Default to 'system'
  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'system' || stored in THEMES)) {
          setThemeModeState(stored as ThemeMode);
        } else {
          // First launch: default to 'system' (which auto-detects device appearance)
          setThemeModeState('system');
        }
      } catch (err) {
        console.warn('[ThemeContext] Could not load stored theme:', err);
        setThemeModeState('system');
      } finally {
        setIsInitialized(true);
      }
    }

    loadStoredTheme();
  }, []);

  // 3. Resolve Current Active Theme Token Object
  const resolvedTheme: ThemeColors = React.useMemo(() => {
    if (themeMode === 'system') {
      return systemIsDark ? THEME_DARK : THEME_LIGHT;
    }
    return THEMES[themeMode] || THEME_DARK;
  }, [themeMode, systemIsDark]);

  // 4. Synchronize CSS Custom Properties and HTML tag
  useEffect(() => {
    applyThemeCssVariables(resolvedTheme);
  }, [resolvedTheme]);

  // 5. Change Theme Function & Persist
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('[ThemeContext] Failed to persist theme:', err);
    }
  };

  const toggleDarkLight = async () => {
    if (resolvedTheme.isDark) {
      await setThemeMode('light');
    } else {
      await setThemeMode('dark');
    }
  };

  const availableThemes = [
    { id: 'system' as ThemeMode, name: 'Auto (System Appearance)', isDark: systemIsDark },
    { id: 'dark' as ThemeMode, name: 'OLED Dark (Standard)', isDark: true },
    { id: 'light' as ThemeMode, name: 'Pure Light (High Contrast)', isDark: false },
    { id: 'cyber_orange' as ThemeMode, name: 'Cyber Cockpit (Orange/Neon)', isDark: true },
    { id: 'midnight_blue' as ThemeMode, name: 'Midnight Avionics (Indigo)', isDark: true },
  ];

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        theme: resolvedTheme,
        setThemeMode,
        toggleDarkLight,
        isSystem: themeMode === 'system',
        systemDarkDetected: systemIsDark,
        availableThemes,
      }}
    >
      <div
        style={{
          backgroundColor: resolvedTheme.bgApp,
          color: resolvedTheme.textPrimary,
          minHeight: '100vh',
          transition: 'background-color 0.25s ease, color 0.25s ease',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
