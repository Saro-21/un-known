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
} from 'lucide-react';
import { DRIVES_CATALOG } from '../core/iovnbdLoader';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../theme/ThemeContext';
import { pushNotificationService } from '../services/notificationService';

export type ActiveTab =
  | 'home_architecture'
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
}) => {
  const currentDrive = DRIVES_CATALOG.find((d) => d.id === selectedDriveId) || DRIVES_CATALOG[0];
  const { theme, toggleDarkLight, themeMode } = useTheme();
  const [unreadCount, setUnreadCount] = useState<number>(pushNotificationService.getUnreadCount());

  useEffect(() => {
    const unsub = pushNotificationService.subscribeInbox(() => {
      setUnreadCount(pushNotificationService.getUnreadCount());
    });
    return () => unsub();
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
        <div className="flex items-center gap-2">
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
