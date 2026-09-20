/**
 * DrifX (AIDR-X) - Header & Global Navigation
 */

import React, { useEffect, useState } from 'react';
import {
  Compass,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  Bell,
  MapPin,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Database,
} from 'lucide-react';
import { DRIVES_CATALOG } from '../core/iovnbdLoader';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../theme/ThemeContext';
import { pushNotificationService } from '../services/notificationService';
import { jwtAuth } from '../core/jwtAuth';

export type ActiveTab =
  | 'home_architecture'
  | 'google_maps'
  | 'supabase_hub'
  | 'phase1_2'
  | 'live_nav'
  | 'phone_cli'
  | 'benchmark_download'
  | 'notifications'
  | 'wishlist'
  | 'profile';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedDriveId: string;
  setSelectedDriveId: (id: string) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onResetSimulate: () => void;
  isTunnelActive: boolean;
  onToggleTunnel: () => void;
  currentHz: number;
  onOpenMapsSettings?: () => void;
  onOpenJwtModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedDriveId,
  setSelectedDriveId,
  isSimulating,
  onToggleSimulate,
  onResetSimulate,
  isTunnelActive,
  onToggleTunnel,
  currentHz,
  onOpenMapsSettings,
  onOpenJwtModal,
}) => {
  const currentDrive = DRIVES_CATALOG.find((d) => d.id === selectedDriveId) || DRIVES_CATALOG[0];
  const { theme, toggleDarkLight, themeMode } = useTheme();
  const [unreadCount, setUnreadCount] = useState<number>(pushNotificationService.getUnreadCount());
  const [currentRole, setCurrentRole] = useState<string>(jwtAuth.getCurrentUser()?.role || 'FLEET_ADMIN');
  const [isTokenValid, setIsTokenValid] = useState<boolean>(true);

  useEffect(() => {
    const unsubAuth = jwtAuth.subscribe(() => {
      const decoded = jwtAuth.getDecoded();
      if (decoded && decoded.isValidSignature && !decoded.isExpired) {
        setCurrentRole(decoded.payload.role);
        setIsTokenValid(true);
      } else {
        setIsTokenValid(false);
      }
    });

    const unsub = pushNotificationService.subscribeInbox(() => {
      setUnreadCount(pushNotificationService.getUnreadCount());
    });

    return () => {
      unsubAuth();
      unsub();
    };
  }, []);

  return (
    <header
      className="backdrop-blur-md sticky top-0 z-40 shadow-xl transition-colors duration-200"
      style={{
        backgroundColor: theme.bgNav,
        borderBottom: `1px solid ${theme.borderSubtle}`,
        color: theme.textPrimary,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Mission */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home_architecture')}>
          <div
            className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-md transition-colors"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderAccent,
              color: theme.accentText,
            }}
          >
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
                DrifX
              </h1>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono tracking-wider border flex items-center gap-1.5"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                  color: theme.statusInfo,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                {currentHz.toFixed(1)} Hz Core
              </span>
            </div>
            <p className="text-[11px] hidden sm:block font-normal" style={{ color: theme.textSecondary }}>
              Adaptive Intelligent Dead-Reckoning &amp; GNSS Fusion Engine
            </p>
          </div>
        </div>

        {/* Global Controls & Theme & Notifications */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Direct Google Maps & Device Location Tab Button */}
          <button
            onClick={() => setActiveTab('google_maps')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              activeTab === 'google_maps'
                ? 'bg-orange-500 text-black border-orange-400 shadow-orange-500/20'
                : 'hover:border-orange-500/50'
            }`}
            style={{
              backgroundColor: activeTab === 'google_maps' ? undefined : theme.bgElevated,
              borderColor: activeTab === 'google_maps' ? undefined : theme.borderSubtle,
              color: activeTab === 'google_maps' ? undefined : theme.textPrimary,
            }}
            title="Open Google Maps & Live Device GPS Tracker"
          >
            <MapPin className={`w-3.5 h-3.5 ${activeTab === 'google_maps' ? 'text-black' : 'text-orange-400'}`} />
            <span>Google Maps</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Direct Supabase Database & Auth Hub Tab Button */}
          <button
            onClick={() => setActiveTab('supabase_hub')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              activeTab === 'supabase_hub'
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/20'
                : 'hover:border-emerald-500/50'
            }`}
            style={{
              backgroundColor: activeTab === 'supabase_hub' ? undefined : theme.bgElevated,
              borderColor: activeTab === 'supabase_hub' ? undefined : theme.borderSubtle,
              color: activeTab === 'supabase_hub' ? undefined : theme.textPrimary,
            }}
            title="Open Supabase Cloud Database & Authentication Hub"
          >
            <Database className={`w-3.5 h-3.5 ${activeTab === 'supabase_hub' ? 'text-black' : 'text-emerald-400'}`} />
            <span>Supabase</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </button>

          {/* Quick Map Settings Modal Trigger */}
          {onOpenMapsSettings && (
            <button
              onClick={onOpenMapsSettings}
              className="p-2 rounded-xl border transition-all cursor-pointer hover:border-orange-500/50"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
                color: theme.textSecondary,
              }}
              title="Configure Google Maps Platform Settings (Themes, 3D, Traffic)"
            >
              <Settings className="w-4 h-4 text-orange-400" />
            </button>
          )}

          {/* JWT Security Badge / Modal Trigger */}
          {onOpenJwtModal && (
            <button
              onClick={onOpenJwtModal}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer hover:border-cyan-400"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: isTokenValid ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.5)',
                color: isTokenValid ? '#22d3ee' : '#f87171',
              }}
              title="High-End JWT Authentication & RBAC Permissions"
            >
              {isTokenValid ? (
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="font-bold text-[11px] hidden sm:inline">{currentRole}</span>
              <span className="text-[10px] opacity-75 hidden md:inline">
                [{isTokenValid ? 'JWT OK' : 'EXPIRED'}]
              </span>
            </button>
          )}

          {/* Quick Notification Button */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="p-2 rounded-xl border transition-all relative cursor-pointer"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: activeTab === 'notifications' ? theme.borderAccent : theme.borderSubtle,
              color: activeTab === 'notifications' ? theme.accentText : theme.textSecondary,
            }}
            title="Push Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono animate-pulse"
                style={{ backgroundColor: theme.accent, color: theme.textInverse }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleDarkLight}
            className="p-2 rounded-xl border transition-all cursor-pointer"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
              color: theme.textSecondary,
            }}
            title={`Current: ${theme.name}. Click to toggle dark/light mode.`}
          >
            {theme.isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
          </button>

          {/* Global Tunnel / Jamming Instant Simulator Toggle */}
          <button
            onClick={onToggleTunnel}
            id="tunnel-simulator-toggle-btn"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer border ${
              isTunnelActive
                ? 'font-bold'
                : ''
            }`}
            style={{
              backgroundColor: isTunnelActive ? theme.accent : theme.bgElevated,
              borderColor: isTunnelActive ? theme.accentHover : theme.borderSubtle,
              color: isTunnelActive ? theme.textInverse : theme.textPrimary,
            }}
            title="Inject real-time GNSS blackout to trigger AI dead-reckoning"
          >
            <Radio className={`w-3.5 h-3.5 ${isTunnelActive ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isTunnelActive ? 'Tunnel Active' : 'Simulate Tunnel'}</span>
          </button>

          {/* Simulation Controls */}
          <div
            className="flex items-center border rounded-xl p-0.5"
            style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
          >
            <button
              onClick={onToggleSimulate}
              className="p-1.5 hover:opacity-80 rounded-lg transition-colors cursor-pointer"
              title={isSimulating ? 'Pause Replay' : 'Start 10 Hz Replay'}
            >
              {isSimulating ? <Pause className="w-4 h-4 text-orange-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onResetSimulate}
              className="p-1.5 hover:opacity-80 rounded-lg transition-colors cursor-pointer text-neutral-400 hover:text-white"
              title="Reset to origin"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Drive Selector */}
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="border rounded-xl text-xs px-2.5 py-1.5 focus:outline-none font-mono cursor-pointer"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            {DRIVES_CATALOG.map((d) => (
              <option key={d.id} value={d.id} style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}>
                [{d.split.toUpperCase()}] {d.name}
              </option>
            ))}
          </select>

          {/* Offline PWA Install Action */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
