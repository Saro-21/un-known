/**
 * Supabase Auth & Telematics Database Hub
 * DrifX Autonomous Navigation & Telematics Platform
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  Lock,
  Radio,
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  LogOut,
  LogIn,
  UserPlus,
  Send,
  Trash2,
  PlusCircle,
  ExternalLink,
  Table,
  Check,
} from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';
import { useTheme } from '../theme/ThemeContext';
import {
  supabaseService,
  SUPABASE_CONFIG,
  SupabaseTelemetryLog,
  SupabaseFleetDrive,
  SupabaseHealthStatus,
} from '../services/supabaseClient';
import { DRIVES_CATALOG } from '../core/iovnbdLoader';

export const SupabaseAuthDatabaseView: React.FC = () => {
  const { theme } = useTheme();

  // Connection & Health state
  const [health, setHealth] = useState<SupabaseHealthStatus>({
    isConfigured: true,
    isReachable: false,
    latencyMs: null,
    lastChecked: null,
    error: null,
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(supabaseService.getCurrentUser());
  const [currentSession, setCurrentSession] = useState<Session | null>(supabaseService.getCurrentSession());
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [authEmail, setAuthEmail] = useState('sarabhoji21@gmail.com');
  const [authPassword, setAuthPassword] = useState('drifxSecure2026!');
  const [authName, setAuthName] = useState('Sarabhoji Admin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database viewer state
  const [activeDbTab, setActiveDbTab] = useState<'telemetry' | 'drives' | 'sql'>('telemetry');
  const [telemetryLogs, setTelemetryLogs] = useState<SupabaseTelemetryLog[]>([]);
  const [fleetDrives, setFleetDrives] = useState<SupabaseFleetDrive[]>([]);
  const [dbSource, setDbSource] = useState<'supabase' | 'local_fallback'>('local_fallback');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(false);

  // Check health on mount & subscribe to auth & realtime
  useEffect(() => {
    checkHealth();

    const unsubAuth = supabaseService.subscribeAuth((user, session) => {
      setCurrentUser(user);
      setCurrentSession(session);
    });

    loadTelemetry();
    loadDrives();

    // Subscribe to realtime changes
    const unsubRealtime = supabaseService.subscribeToRealtimeTelemetry((newLog) => {
      setRealtimePulse(true);
      setTimeout(() => setRealtimePulse(false), 1500);
      setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubAuth();
      unsubRealtime();
    };
  }, []);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    const res = await supabaseService.checkHealth();
    setHealth(res);
    setIsCheckingHealth(false);
  };

  const loadTelemetry = async () => {
    setIsLoadingLogs(true);
    const res = await supabaseService.getRecentTelemetry(30);
    setTelemetryLogs(res.data);
    setDbSource(res.source);
    setIsLoadingLogs(false);
  };

  const loadDrives = async () => {
    const res = await supabaseService.getFleetDrives();
    setFleetDrives(res.data);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    const res = await supabaseService.signInWithEmail(authEmail, authPassword);
    setAuthLoading(false);
    if (res.error) {
      setAuthMessage({ type: 'error', text: res.error });
    } else {
      setAuthMessage({ type: 'success', text: `Signed in successfully as ${res.user?.email}` });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    const res = await supabaseService.signUpWithEmail(authEmail, authPassword, authName);
    setAuthLoading(false);
    if (res.error) {
      setAuthMessage({ type: 'error', text: res.error });
    } else {
      setAuthMessage({ type: 'success', text: res.message || 'Account created!' });
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    const res = await supabaseService.signInWithMagicLink(authEmail);
    setAuthLoading(false);
    if (res.error) {
      setAuthMessage({ type: 'error', text: res.error });
    } else {
      setAuthMessage({ type: 'success', text: `Magic link dispatched to ${authEmail}` });
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await supabaseService.signOut();
    setAuthLoading(false);
    setAuthMessage({ type: 'success', text: 'Signed out from Supabase' });
  };

  const handleInsertSampleTelemetry = async () => {
    setIsLoadingLogs(true);
    const sampleLog: SupabaseTelemetryLog = {
      drive_id: 'drive_tunnel_blackout_01',
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
      speed_kmh: Math.round(45 + Math.random() * 20),
      heading_deg: Math.round(Math.random() * 360),
      drift_error_m: Number((0.2 + Math.random() * 0.8).toFixed(2)),
      is_blackout: Math.random() > 0.6,
      device_type: 'factor_graph_sim',
      metadata: {
        gnss_satellites: Math.floor(Math.random() * 12) + 4,
        battery_level: 94,
        engine_temp_c: 88,
      },
    };

    const res = await supabaseService.logTelemetry(sampleLog);
    await loadTelemetry();
    setIsLoadingLogs(false);
    if (res.source === 'supabase') {
      setAuthMessage({ type: 'success', text: 'Saved live telemetry record to Supabase Cloud!' });
    } else {
      setAuthMessage({
        type: 'success',
        text: 'Saved to local cache fallback (Run SQL migration in Supabase to sync remote table)',
      });
    }
  };

  const handleSyncAllDrivesToSupabase = async () => {
    let count = 0;
    for (const drive of DRIVES_CATALOG) {
      await supabaseService.saveFleetDrive({
        id: drive.id,
        name: drive.name,
        description: drive.description,
        total_distance_km: Math.round((drive.total_distance_m / 1000) * 10) / 10,
        points_count: drive.sample_count,
        tunnel_length_m: drive.has_tunnels ? 500 : 0,
        max_drift_m: 0.85,
        is_custom: false,
      });
      count++;
    }
    await loadDrives();
    setAuthMessage({ type: 'success', text: `Synchronized ${count} catalog drives to Supabase database!` });
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(supabaseService.getSqlMigrationSnippet());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero */}
      <div
        className="p-6 rounded-2xl border relative overflow-hidden"
        style={{
          backgroundColor: theme.bgSurface,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold font-mono tracking-tight" style={{ color: theme.textPrimary }}>
                  Supabase Cloud Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  DATABASE &amp; AUTH
                </span>
                {realtimePulse && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse">
                    REALTIME WS ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs font-mono mt-1" style={{ color: theme.textSecondary }}>
                Real-time Postgres database, JWT user authentication, telematics logs &amp; fleet sync
              </p>
            </div>
          </div>

          {/* Quick Health Status & Ping */}
          <div className="flex items-center gap-2">
            <button
              onClick={checkHealth}
              disabled={isCheckingHealth}
              className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-500"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Ping Server</span>
            </button>

            <div
              className="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: health.isReachable ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                color: health.isReachable ? '#34d399' : '#fbbf24',
              }}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health.isReachable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold">
                {health.isReachable ? 'CONNECTED' : 'DISCONNECTED / CHECKING'}
              </span>
              {health.latencyMs !== null && (
                <span className="text-[11px] opacity-80">({health.latencyMs}ms)</span>
              )}
            </div>
          </div>
        </div>

        {/* Supabase Endpoint Specs Strip */}
        <div
          className="mt-5 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono"
          style={{ borderColor: theme.borderSubtle }}
        >
          <div className="p-2.5 rounded-lg border bg-black/20" style={{ borderColor: theme.borderSubtle }}>
            <span className="text-[10px] text-gray-400 block">SUPABASE_URL</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-emerald-400 truncate select-all">{SUPABASE_CONFIG.url}</span>
              <a
                href={SUPABASE_CONFIG.url}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-emerald-400 ml-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-black/20" style={{ borderColor: theme.borderSubtle }}>
            <span className="text-[10px] text-gray-400 block">PUBLISHABLE ANON KEY</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-amber-400 font-mono text-[11px] truncate">
                {SUPABASE_CONFIG.publishableKey.substring(0, 18)}...
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300">
                ACTIVE
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-black/20" style={{ borderColor: theme.borderSubtle }}>
            <span className="text-[10px] text-gray-400 block">SUPABASE JWKS ENDPOINT</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-cyan-400 font-mono text-[11px] truncate">
                /auth/v1/.well-known/jwks.json
              </span>
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Auth Message Banner if present */}
      {authMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
            authMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {authMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{authMessage.text}</span>
          </div>
          <button
            onClick={() => setAuthMessage(null)}
            className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Auth Station (Left) & Database Explorer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Supabase Authentication Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className="p-5 rounded-2xl border"
            style={{
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.borderSubtle }}>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                  Supabase Authentication
                </h2>
              </div>
              {currentUser ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  AUTHENTICATED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-gray-500/15 text-gray-400 border border-gray-500/30">
                  GUEST SESSION
                </span>
              )}
            </div>

            {currentUser ? (
              /* User Profile & Active Session State */
              <div className="mt-4 space-y-4">
                <div
                  className="p-4 rounded-xl border bg-black/20 space-y-3 font-mono text-xs"
                  style={{ borderColor: theme.borderSubtle }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">User Email:</span>
                    <span className="font-bold text-emerald-400">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Supabase User UID:</span>
                    <span className="font-mono text-[11px] text-gray-300 truncate max-w-[170px]" title={currentUser.id}>
                      {currentUser.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">DrifX Synced Role:</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[11px]">
                      {currentUser.user_metadata?.role || (currentUser.email === 'sarabhoji21@gmail.com' ? 'FLEET_ADMIN' : 'TELEMATICS_ENGINEER')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Auth Method:</span>
                    <span className="text-gray-300">
                      {currentUser.app_metadata?.provider || 'email'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Last Sign-In:</span>
                    <span className="text-gray-300">
                      {currentUser.last_sign_in_at
                        ? new Date(currentUser.last_sign_in_at).toLocaleTimeString()
                        : 'Active now'}
                    </span>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl border bg-emerald-950/20 border-emerald-500/30 text-xs font-mono flex items-start gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-300 block">
                      Cryptographic JWT Session Active
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      All vehicle telemetry, Google Maps commands, and drift calculations are signed with your Supabase credentials.
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-rose-500/10 hover:border-rose-500/50 hover:text-rose-400"
                  style={{
                    backgroundColor: theme.bgElevated,
                    borderColor: theme.borderSubtle,
                    color: theme.textSecondary,
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out from Supabase</span>
                </button>
              </div>
            ) : (
              /* Sign In / Sign Up Form */
              <div className="mt-4 space-y-4">
                {/* Auth Mode Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/20 border" style={{ borderColor: theme.borderSubtle }}>
                  <button
                    onClick={() => setAuthTab('signin')}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      authTab === 'signin'
                        ? 'bg-emerald-500 text-black shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthTab('signup')}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      authTab === 'signup'
                        ? 'bg-emerald-500 text-black shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => setAuthTab('magic')}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      authTab === 'magic'
                        ? 'bg-emerald-500 text-black shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Magic Link
                  </button>
                </div>

                {/* Form Fields */}
                <form
                  onSubmit={
                    authTab === 'signin'
                      ? handleSignIn
                      : authTab === 'signup'
                      ? handleSignUp
                      : handleMagicLink
                  }
                  className="space-y-3"
                >
                  {authTab === 'signup' && (
                    <div>
                      <label className="text-[11px] font-mono text-gray-400 block mb-1">
                        Full Name / Operator Alias
                      </label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-black/30 outline-none focus:border-emerald-500"
                        style={{
                          borderColor: theme.borderSubtle,
                          color: theme.textPrimary,
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-black/30 outline-none focus:border-emerald-500"
                      style={{
                        borderColor: theme.borderSubtle,
                        color: theme.textPrimary,
                      }}
                    />
                  </div>

                  {authTab !== 'magic' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-mono text-gray-400">
                          Password
                        </label>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Min 6 chars
                        </span>
                      </div>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-black/30 outline-none focus:border-emerald-500"
                        style={{
                          borderColor: theme.borderSubtle,
                          color: theme.textPrimary,
                        }}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all bg-gradient-to-r from-emerald-500 to-teal-600 text-black hover:opacity-95 shadow-md shadow-emerald-500/20 mt-2"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : authTab === 'signin' ? (
                      <LogIn className="w-4 h-4" />
                    ) : authTab === 'signup' ? (
                      <UserPlus className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {authLoading
                        ? 'Connecting...'
                        : authTab === 'signin'
                        ? 'Sign In to Supabase'
                        : authTab === 'signup'
                        ? 'Create Supabase User'
                        : 'Send Magic Link'}
                    </span>
                  </button>
                </form>

                {/* Quick Presets for Demo / sarabhoji21 */}
                <div className="pt-3 border-t" style={{ borderColor: theme.borderSubtle }}>
                  <span className="text-[10px] font-mono text-gray-400 block mb-2">
                    Quick Preset Email:
                  </span>
                  <button
                    onClick={() => {
                      setAuthEmail('sarabhoji21@gmail.com');
                      setAuthPassword('drifxSecure2026!');
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border text-left text-xs font-mono flex items-center justify-between cursor-pointer hover:border-emerald-500/50"
                    style={{
                      backgroundColor: theme.bgElevated,
                      borderColor: theme.borderSubtle,
                      color: theme.textPrimary,
                    }}
                  >
                    <span className="text-emerald-400">sarabhoji21@gmail.com</span>
                    <span className="text-[10px] text-gray-400">(Admin)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Realtime Subscription Status Box */}
          <div
            className="p-4 rounded-2xl border flex items-center gap-3 font-mono text-xs"
            style={{
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold block" style={{ color: theme.textPrimary }}>
                Supabase Realtime Channel
              </span>
              <span className="text-gray-400 text-[11px]">
                Listening to <code className="text-cyan-400">public:telemetry_logs</code> for instant multi-device telematics sync.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Database Explorer & SQL Migration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="p-5 rounded-2xl border"
            style={{
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
            }}
          >
            {/* Database Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: theme.borderSubtle }}>
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                  Postgres Database Explorer
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/30 border text-gray-400" style={{ borderColor: theme.borderSubtle }}>
                  Source: <span className={dbSource === 'supabase' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{dbSource}</span>
                </span>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveDbTab('telemetry')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeDbTab === 'telemetry'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'hover:text-white text-gray-400'
                  }`}
                >
                  telemetry_logs ({telemetryLogs.length})
                </button>
                <button
                  onClick={() => setActiveDbTab('drives')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeDbTab === 'drives'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'hover:text-white text-gray-400'
                  }`}
                >
                  fleet_drives ({fleetDrives.length})
                </button>
                <button
                  onClick={() => setActiveDbTab('sql')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeDbTab === 'sql'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'hover:text-white text-gray-400'
                  }`}
                >
                  SQL DDL Script
                </button>
              </div>
            </div>

            {/* Sub-tab 1: Telemetry Logs Table */}
            {activeDbTab === 'telemetry' && (
              <div className="mt-4 space-y-3">
                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInsertSampleTelemetry}
                      disabled={isLoadingLogs}
                      className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log Sample Telemetry Point</span>
                    </button>

                    <button
                      onClick={loadTelemetry}
                      disabled={isLoadingLogs}
                      className="px-2.5 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer hover:border-gray-500 transition-all"
                      style={{
                        backgroundColor: theme.bgElevated,
                        borderColor: theme.borderSubtle,
                        color: theme.textSecondary,
                      }}
                      title="Refresh rows"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      supabaseService.clearLocalTelemetry();
                      loadTelemetry();
                    }}
                    className="text-[11px] font-mono text-gray-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Cache</span>
                  </button>
                </div>

                {/* Table of Records */}
                <div
                  className="rounded-xl border overflow-hidden max-h-[360px] overflow-y-auto"
                  style={{ borderColor: theme.borderSubtle, backgroundColor: 'rgba(0,0,0,0.25)' }}
                >
                  {telemetryLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-gray-400">
                      No telemetry logs recorded yet. Click "Log Sample Telemetry Point" above to write your first record!
                    </div>
                  ) : (
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="sticky top-0 bg-black/60 backdrop-blur border-b" style={{ borderColor: theme.borderSubtle }}>
                        <tr className="text-gray-400">
                          <th className="p-2 font-normal">Timestamp</th>
                          <th className="p-2 font-normal">Drive ID</th>
                          <th className="p-2 font-normal">Coordinates</th>
                          <th className="p-2 font-normal">Speed</th>
                          <th className="p-2 font-normal">Drift</th>
                          <th className="p-2 font-normal">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: theme.borderSubtle }}>
                        {telemetryLogs.map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-2 text-gray-300">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'now'}
                            </td>
                            <td className="p-2 text-emerald-400 font-bold truncate max-w-[100px]">
                              {log.drive_id}
                            </td>
                            <td className="p-2 text-gray-300">
                              {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                            </td>
                            <td className="p-2 text-cyan-300">
                              {log.speed_kmh} km/h
                            </td>
                            <td className="p-2">
                              <span className={log.drift_error_m > 1.0 ? 'text-rose-400' : 'text-emerald-400'}>
                                {log.drift_error_m}m
                              </span>
                            </td>
                            <td className="p-2">
                              {log.is_blackout ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                                  BLACKOUT
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                  GPS OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 2: Fleet Drives Catalog */}
            {activeDbTab === 'drives' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-400">
                    Preloaded standard drives from catalog:
                  </span>
                  <button
                    onClick={handleSyncAllDrivesToSupabase}
                    className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Sync All Catalog Drives to Supabase</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto">
                  {DRIVES_CATALOG.map((drive) => (
                    <div
                      key={drive.id}
                      className="p-3.5 rounded-xl border bg-black/20 space-y-1.5 font-mono text-xs"
                      style={{ borderColor: theme.borderSubtle }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400">{drive.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                          {drive.has_tunnels ? 'Tunnel Track' : 'Surface Highway'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{drive.description}</p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400 border-t" style={{ borderColor: theme.borderSubtle }}>
                        <span>Dist: {(drive.total_distance_m / 1000).toFixed(1)}km</span>
                        <span>Pts: {drive.sample_count}</span>
                        <span className="text-amber-400">{drive.split.toUpperCase()} split</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 3: SQL Schema Migration Guide */}
            {activeDbTab === 'sql' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-gray-400">
                    Paste this DDL into your Supabase project's SQL Editor to instantiate the database tables and Row Level Security:
                  </p>
                  <button
                    onClick={copySqlToClipboard}
                    className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-500 text-black hover:opacity-90 transition-all"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
                  </button>
                </div>

                <pre
                  className="p-3.5 rounded-xl border text-[11px] font-mono text-emerald-300 bg-black/50 overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed select-all"
                  style={{ borderColor: theme.borderSubtle }}
                >
                  {supabaseService.getSqlMigrationSnippet()}
                </pre>
              </div>
            )}
          </div>

          {/* Supabase Platform Quick Features Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="p-3.5 rounded-xl border space-y-1"
              style={{ backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                <Database className="w-4 h-4" />
                <span>Postgres Tables</span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Indexed coordinates and timestamps for high-frequency GNSS/IMU queries.
              </p>
            </div>

            <div
              className="p-3.5 rounded-xl border space-y-1"
              style={{ backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold">
                <Radio className="w-4 h-4" />
                <span>Realtime Sync</span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                WebSocket CDC (Change Data Capture) publishes live telemetry to all connected fleet clients.
              </p>
            </div>

            <div
              className="p-3.5 rounded-xl border space-y-1"
              style={{ backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }}
            >
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold">
                <Lock className="w-4 h-4" />
                <span>JWT Auth &amp; RLS</span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Row Level Security policies safeguard fleet coordinates while allowing public sensor logging.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
