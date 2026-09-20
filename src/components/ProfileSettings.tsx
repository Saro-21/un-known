/**
 * Profile & Centralized Theme Settings Component
 *
 * Implements:
 * 1. Scalable Theme and Dark Mode Architecture controls.
 * 2. Automatic system appearance detection & manual switching.
 * 3. AsyncStorage persistence inspection and cache clearing.
 * 4. Device push notification credential audit.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Palette,
  Sun,
  Moon,
  Monitor,
  Database,
  Trash2,
  ShieldCheck,
  Smartphone,
  Cpu,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { ThemeMode } from '../theme/themeConfig';
import { AsyncStorage } from '../theme/asyncStorage';
import { pushNotificationService } from '../services/notificationService';

export const ProfileSettings: React.FC = () => {
  const { theme, themeMode, setThemeMode, availableThemes, systemDarkDetected } = useTheme();
  const [asyncKeys, setAsyncKeys] = useState<string[]>([]);
  const [clearedMsg, setClearedMsg] = useState(false);
  const activeToken = pushNotificationService.getActiveToken();

  useEffect(() => {
    async function loadKeys() {
      const keys = await AsyncStorage.getAllKeys();
      setAsyncKeys(keys);
    }
    loadKeys();
  }, [clearedMsg]);

  const handleClearAsyncStorage = async () => {
    await AsyncStorage.clear();
    setClearedMsg(true);
    setTimeout(() => setClearedMsg(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* User / Engineer Header */}
      <div
        className="rounded-2xl p-6 border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner font-bold text-xl"
            style={{
              backgroundColor: theme.accentSubtle,
              borderColor: theme.borderAccent,
              color: theme.accentText,
            }}
          >
            DX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>
                Avionics Navigation Specialist
              </h2>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 font-bold">
                VERIFIED
              </span>
            </div>
            <p className="text-xs font-mono mt-0.5" style={{ color: theme.textSecondary }}>
              sarabhoji21@gmail.com &bull; Device Node #AIDR-094
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-xl text-xs font-mono font-bold"
            style={{
              backgroundColor: theme.bgElevated,
              color: theme.accentText,
            }}
          >
            {theme.name}
          </span>
        </div>
      </div>

      {/* Scalable Theme Architecture Selector */}
      <div
        className="rounded-2xl p-6 border shadow-xl space-y-4"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5" style={{ color: theme.accentText }} />
            <div>
              <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>
                Scalable Theme &amp; Appearance Architecture
              </h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>
                Centralized token configuration. Auto-detects device dark/light settings on first launch.
              </p>
            </div>
          </div>

          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded border"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
              color: theme.textSecondary,
            }}
          >
            WCAG AA Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {availableThemes.map((item) => {
            const isSelected = themeMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setThemeMode(item.id)}
                className="p-4 rounded-xl border text-left transition-all relative group cursor-pointer hover:scale-[1.01]"
                style={{
                  backgroundColor: isSelected ? theme.bgElevated : 'transparent',
                  borderColor: isSelected ? theme.borderAccent : theme.borderSubtle,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs" style={{ color: theme.textPrimary }}>
                    {item.id === 'system' ? (
                      <Monitor className="w-4 h-4" />
                    ) : item.isDark ? (
                      <Moon className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{item.name}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>

                <div className="text-[11px] mt-2 font-mono" style={{ color: theme.textSecondary }}>
                  {item.id === 'system'
                    ? `Detects OS appearance (Currently: ${systemDarkDetected ? 'Dark' : 'Light'})`
                    : item.isDark
                    ? 'Dark background with tuned contrast'
                    : 'High-contrast light surfaces'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AsyncStorage Persistence Status */}
      <div
        className="rounded-2xl p-6 border shadow-xl space-y-4"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>
                AsyncStorage Storage Engine
              </h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>
                Cross-platform persistence layer saving theme choices, push tokens, and wishlist items.
              </p>
            </div>
          </div>

          <button
            onClick={handleClearAsyncStorage}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear AsyncStorage Cache</span>
          </button>
        </div>

        {clearedMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            AsyncStorage cache wiped successfully.
          </div>
        )}

        <div
          className="p-4 rounded-xl border text-xs font-mono space-y-2"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="text-neutral-400 text-[11px] uppercase tracking-wider">Active Keys in AsyncStorage:</div>
          <div className="flex flex-wrap gap-2">
            {asyncKeys.length > 0 ? (
              asyncKeys.map((key) => (
                <span
                  key={key}
                  className="px-2 py-1 rounded bg-black/40 border border-white/10 text-neutral-300"
                >
                  {key}
                </span>
              ))
            ) : (
              <span className="text-neutral-500">No keys stored yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Hardware & Push Security Specs */}
      <div
        className="rounded-2xl p-6 border shadow-xl space-y-3"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" style={{ color: theme.accentText }} />
          <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>
            Device Push Security Token
          </h3>
        </div>

        <div className="p-3.5 rounded-xl border font-mono text-xs break-all" style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}>
          <span className="text-[10px] uppercase text-neutral-400 block mb-1">Active Push Identifier</span>
          <span className="text-cyan-400">{activeToken?.token || 'None registered'}</span>
        </div>
      </div>
    </div>
  );
};
