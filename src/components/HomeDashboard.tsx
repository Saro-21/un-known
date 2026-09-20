/**
 * Home Dashboard Component
 * Clean, mobile-adapted home page interface reflecting the layout style
 * and responsive aesthetic requested in the reference image,
 * with full dynamic theme color adaptation.
 */

import React, { useState } from 'react';
import {
  Navigation,
  FileCheck2,
  Terminal,
  Bell,
  Heart,
  TrendingDown,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Database,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { pushNotificationService } from '../services/notificationService';

interface HomeDashboardProps {
  onNavigateTab?: (tab: string) => void;
  onNavigateToView?: (view: string) => void;
  onOpenNotifications?: () => void;
  onOpenWishlist?: () => void;
  onOpenProfile?: () => void;
  currentDriveName?: string;
  isTunnelActive?: boolean;
  onToggleTunnel?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigateTab,
  onNavigateToView,
  onOpenNotifications,
  onOpenWishlist,
  onOpenProfile,
  currentDriveName = 'Route F (Drive #6)',
  isTunnelActive = false,
  onToggleTunnel,
}) => {
  const { theme, themeMode, toggleDarkLight } = useTheme();
  const [toastSent, setToastSent] = useState<string | null>(null);

  const navigateTo = (tabKey: string) => {
    if (onNavigateTab) {
      onNavigateTab(tabKey);
    } else if (onNavigateToView) {
      onNavigateToView(tabKey);
    }
  };

  const handleOpenNotifications = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
    } else if (onNavigateTab) {
      onNavigateTab('notifications');
    }
  };

  const handleQuickAlert = async () => {
    await pushNotificationService.sendNotification({
      title: '🚨 Rapid Drift Warning Dispatched',
      body: 'Inertial divergence alert sent via Expo/Web background queue.',
      category: 'safety',
      priority: 'high',
    });
    setToastSent('Real-time push alert queued!');
    setTimeout(() => setToastSent(null), 3000);
  };

  const handleQuickSchedule = async () => {
    await pushNotificationService.sendNotification({
      title: '⏰ Scheduled Calibration (5s)',
      body: 'Recalibrating phone IMU zero-velocity stationary biases.',
      category: 'scheduled',
      delaySeconds: 5,
    });
    setToastSent('Notification scheduled for 5 seconds!');
    setTimeout(() => setToastSent(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Toast Confirmation */}
      {toastSent && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderAccent,
            color: theme.accentText,
          }}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>{toastSent}</span>
        </div>
      )}

      {/* Hero Welcome Card with Color Adaptation */}
      <div
        className="rounded-3xl p-6 md:p-8 border shadow-xl relative overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: theme.accentSubtle,
                  color: theme.accentText,
                  borderColor: theme.borderAccent,
                }}
              >
                Adaptive Dead-Reckoning v2.4
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: theme.statusSuccessBg,
                  color: theme.statusSuccess,
                }}
              >
                ● 10.0 Hz Fusion Online
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
              Intelligent Inertial Navigation
            </h1>

            <p className="text-xs md:text-sm max-w-xl leading-relaxed" style={{ color: theme.textSecondary }}>
              Bridging GNSS blackouts with multi-task uncertainty factor graphs and consumer smartphone MEMS
              dead-reckoning. Fully adapted for dynamic themes and real-time push alerts.
            </p>
          </div>

          {/* Quick Metrics Capsule */}
          <div
            className="p-4 rounded-2xl border flex md:flex-col gap-3 justify-around md:justify-center shrink-0 min-w-[170px]"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
            }}
          >
            <div>
              <span className="text-[10px] uppercase font-mono block" style={{ color: theme.textMuted }}>
                Benchmark Drift
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">&lt; 3.2%</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono block" style={{ color: theme.textMuted }}>
                Theme Active
              </span>
              <span className="text-xs font-bold capitalize font-mono" style={{ color: theme.accentText }}>
                {theme.name}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons on Hero */}
        <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t" style={{ borderColor: theme.borderSubtle }}>
          <button
            onClick={() => navigateTo('google_maps')}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:scale-[1.02] cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500 text-black border border-orange-400 font-mono"
            title="Open Google Maps & Live Device GPS Tracker"
          >
            <MapPin className="w-3.5 h-3.5 text-black" />
            <span>Google Maps &amp; GPS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
          </button>

          <button
            onClick={() => navigateTo('supabase_hub')}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:scale-[1.02] cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 text-black border border-emerald-400 font-mono"
            title="Open Supabase Cloud Database & Auth Engine"
          >
            <Database className="w-3.5 h-3.5 text-black" />
            <span>Supabase DB &amp; Auth</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-950" />
          </button>

          <button
            onClick={() => navigateTo('live_nav')}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:scale-[1.02] cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: theme.textInverse,
            }}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Launch Live Navigation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleQuickAlert}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border hover:scale-[1.02] cursor-pointer"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <Bell className="w-3.5 h-3.5 text-rose-400" />
            <span>Trigger Push Alert</span>
          </button>

          <button
            onClick={handleQuickSchedule}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border hover:scale-[1.02] cursor-pointer"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Schedule 5s Reminder</span>
          </button>
        </div>
      </div>

      {/* Navigation Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Phase 1 & 2 */}
        <div
          onClick={() => navigateTo('phase1_2')}
          className="p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer group shadow-sm flex flex-col justify-between"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="space-y-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
                color: theme.accentText,
              }}
            >
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                Phase 1 &amp; 2 Results
              </h3>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
                Data contract audits, IO-VNBD schema check, and uncompensated strapdown INS divergence.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold mt-4" style={{ color: theme.accentText }}>
            <span>View Results</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Card 2: Push Notifications Center (Swapped from Card 4) */}
        <div
          onClick={handleOpenNotifications}
          className="p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer group shadow-sm flex flex-col justify-between"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="space-y-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: theme.statusWarningBg,
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: theme.statusWarning,
              }}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                Push Notifications
              </h3>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
                Event-driven push engine, background delivery retry queues, rate limits, and token security.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold mt-4" style={{ color: theme.statusWarning }}>
            <span>Notification Hub</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Card 3: Phone Gyro & CLI */}
        <div
          onClick={() => navigateTo('phone_cli')}
          className="p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer group shadow-sm flex flex-col justify-between"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="space-y-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
                color: theme.statusInfo,
              }}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                Phone Gyro &amp; CLI
              </h3>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
                Device motion hardware streams, vehicle orientation calibration, and interactive terminal commands.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold mt-4" style={{ color: theme.statusInfo }}>
            <span>Open Terminal</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Card 4: Live Navigation (Swapped from Card 2) */}
        <div
          onClick={() => navigateTo('live_nav')}
          className="p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer group shadow-sm flex flex-col justify-between"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderSubtle,
          }}
        >
          <div className="space-y-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: theme.statusSuccessBg,
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: theme.statusSuccess,
              }}
            >
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                Live Navigation
              </h3>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
                Interactive trajectory map, blackout injection controls, and factor graph uncertainty estimation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold mt-4" style={{ color: theme.statusSuccess }}>
            <span>Run Navigation</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* Live Inertial Physics Overview Widget */}
      <div
        className="rounded-2xl p-6 border shadow-lg space-y-4"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
              Real-Time Sensor &amp; Dead-Reckoning Diagnostics
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
            HEALTHY
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div
            className="p-3 rounded-xl border"
            style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
          >
            <span className="text-[10px] block" style={{ color: theme.textMuted }}>
              Zero-Velocity (ZUPT)
            </span>
            <span className="font-bold text-emerald-400 text-sm mt-0.5 block">ACTIVE</span>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
          >
            <span className="text-[10px] block" style={{ color: theme.textMuted }}>
              Gyro Bias Stability
            </span>
            <span className="font-bold text-cyan-400 text-sm mt-0.5 block">&plusmn;0.008 rad/s</span>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
          >
            <span className="text-[10px] block" style={{ color: theme.textMuted }}>
              Factor Graph Nodes
            </span>
            <span className="font-bold text-sm mt-0.5 block" style={{ color: theme.textPrimary }}>
              24 Fixed-Lag
            </span>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
          >
            <span className="text-[10px] block" style={{ color: theme.textMuted }}>
              Push Queue State
            </span>
            <span className="font-bold text-sm mt-0.5 block text-amber-400">
              0 Pending / Idle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
