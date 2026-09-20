/**
 * Supabase Client & Telematics Database Engine
 * DrifX Autonomous Navigation & Telematics Platform
 *
 * Provides:
 * - Supabase Authentication (Email/Password, Magic Link, Session Sync)
 * - Persistent Cloud Database for Vehicle Telemetry & Drive Records
 * - Real-time Channel Subscriptions for Multi-client Live GPS & Telematics
 * - High-precision drift error & factor graph event logging
 * - Graceful fallback to local cache when offline or prior to DB migration
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { jwtAuth } from '../core/jwtAuth';

// Configured Supabase Credentials provided by user
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://yrrmpfpxhyknnjwwzppu.supabase.co',
  publishableKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tz1zA7rWT4iPR3v02cUb8w_5KtRBVVk',
  jwksUrl: 'https://yrrmpfpxhyknnjwwzppu.supabase.co/auth/v1/.well-known/jwks.json',
};

// Database Schema Interfaces
export interface SupabaseTelemetryLog {
  id?: string;
  created_at?: string;
  user_id?: string;
  user_email?: string;
  drive_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_deg: number;
  drift_error_m: number;
  is_blackout: boolean;
  device_type: 'device_gps' | 'factor_graph_sim' | 'phone_cli' | 'manual';
  metadata?: Record<string, unknown>;
}

export interface SupabaseFleetDrive {
  id: string;
  name: string;
  description: string;
  created_at?: string;
  user_id?: string;
  user_email?: string;
  total_distance_km: number;
  points_count: number;
  tunnel_length_m: number;
  max_drift_m: number;
  is_custom: boolean;
}

export interface SupabaseHealthStatus {
  isConfigured: boolean;
  isReachable: boolean;
  latencyMs: number | null;
  lastChecked: string | null;
  error: string | null;
}

// Local fallback storage keys
const LOCAL_TELEMETRY_KEY = 'drifx_supabase_telemetry_cache';
const LOCAL_DRIVES_KEY = 'drifx_supabase_drives_cache';

// Initialize Supabase Client with persistent local session storage
export const supabase: SupabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.publishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'drifx_supabase_auth_session',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

class SupabaseService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private authSubscribers: Array<(user: User | null, session: Session | null) => void> = [];

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        this.currentSession = data.session;
        this.currentUser = data.session.user;
        this.syncWithJwtAuth(data.session.user);
      }

      // Listen for auth transitions (sign in, sign out, token refresh)
      supabase.auth.onAuthStateChange(async (event, session) => {
        this.currentSession = session;
        this.currentUser = session?.user || null;

        if (session?.user) {
          this.syncWithJwtAuth(session.user);
        }

        this.notifyAuthSubscribers();
      });
    } catch (err) {
      console.warn('Supabase auth initialization non-fatal warning:', err);
    }
  }

  /**
   * Automatically synchronizes Supabase logged-in user with DrifX JWT Auth engine
   */
  private syncWithJwtAuth(user: User) {
    const email = user.email || 'user@supabase.local';
    const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0];
    const role = (user.user_metadata?.role as any) || (email.includes('admin') || email === 'sarabhoji21@gmail.com' ? 'FLEET_ADMIN' : 'TELEMATICS_ENGINEER');

    jwtAuth.loginWithCustomProfile({
      sub: `sb_${user.id.slice(0, 8)}`,
      name: `${name} (Supabase)`,
      email,
      role,
      permissions: [
        'drifx:read',
        'drifx:simulate',
        'drifx:sensor_raw',
        'gps:high_precision',
        'gmp:access',
        'gmp:settings_modify',
        ...(role === 'FLEET_ADMIN' ? (['drifx:admin', 'security:audit'] as const) : []),
      ],
      description: `Authenticated via Supabase Auth (${user.id})`,
    });
  }

  // --- AUTH METHODS ---

  public async signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error: error.message };
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'Failed to sign in' };
    }
  }

  public async signUpWithEmail(email: string, password: string, name?: string): Promise<{ user: User | null; error: string | null; message?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            role: email === 'sarabhoji21@gmail.com' ? 'FLEET_ADMIN' : 'TELEMATICS_ENGINEER',
          },
        },
      });
      if (error) return { user: null, error: error.message };
      return {
        user: data.user,
        error: null,
        message: data.session ? 'Sign up successful and session active!' : 'Sign up initiated. Check email for confirmation if required.',
      };
    } catch (err: any) {
      return { user: null, error: err.message || 'Failed to sign up' };
    }
  }

  public async signInWithMagicLink(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to send magic link' };
    }
  }

  public async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      this.currentUser = null;
      this.currentSession = null;
      this.notifyAuthSubscribers();
      return { error: error ? error.message : null };
    } catch (err: any) {
      return { error: err.message || 'Failed to sign out' };
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  public subscribeAuth(callback: (user: User | null, session: Session | null) => void): () => void {
    this.authSubscribers.push(callback);
    callback(this.currentUser, this.currentSession);
    return () => {
      this.authSubscribers = this.authSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifyAuthSubscribers() {
    this.authSubscribers.forEach((cb) => cb(this.currentUser, this.currentSession));
  }

  // --- HEALTH & CONNECTIVITY ---

  public async checkHealth(): Promise<SupabaseHealthStatus> {
    const startTime = performance.now();
    try {
      // Ping Supabase auth health or rest root
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/health`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_CONFIG.publishableKey,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        isConfigured: true,
        isReachable: response.ok || response.status < 500,
        latencyMs,
        lastChecked: new Date().toLocaleTimeString(),
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        isReachable: false,
        latencyMs: null,
        lastChecked: new Date().toLocaleTimeString(),
        error: err.message || 'Connection failed',
      };
    }
  }

  // --- DATABASE: TELEMETRY LOGS ---

  public async logTelemetry(entry: SupabaseTelemetryLog): Promise<{ success: boolean; id?: string; source: 'supabase' | 'local_fallback'; error?: string }> {
    const payload: SupabaseTelemetryLog = {
      ...entry,
      user_id: entry.user_id || this.currentUser?.id,
      user_email: entry.user_email || this.currentUser?.email || undefined,
      created_at: entry.created_at || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('telemetry_logs')
        .insert([payload])
        .select('id')
        .single();

      if (!error && data) {
        return { success: true, id: data.id, source: 'supabase' };
      }

      // If table does not exist or network fails, fallback to local storage
      this.saveLocalTelemetry(payload);
      return {
        success: true,
        source: 'local_fallback',
        error: error ? error.message : undefined,
      };
    } catch (err: any) {
      this.saveLocalTelemetry(payload);
      return { success: true, source: 'local_fallback', error: err.message };
    }
  }

  public async getRecentTelemetry(limit = 50): Promise<{ data: SupabaseTelemetryLog[]; source: 'supabase' | 'local_fallback' }> {
    try {
      const { data, error } = await supabase
        .from('telemetry_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return { data: data as SupabaseTelemetryLog[], source: 'supabase' };
      }

      // Fallback
      return { data: this.getLocalTelemetry().slice(0, limit), source: 'local_fallback' };
    } catch {
      return { data: this.getLocalTelemetry().slice(0, limit), source: 'local_fallback' };
    }
  }

  private saveLocalTelemetry(entry: SupabaseTelemetryLog) {
    try {
      const list = this.getLocalTelemetry();
      list.unshift({ ...entry, id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` });
      // Keep up to 200 items in local cache
      const trimmed = list.slice(0, 200);
      localStorage.setItem(LOCAL_TELEMETRY_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Failed saving local telemetry cache', err);
    }
  }

  public getLocalTelemetry(): SupabaseTelemetryLog[] {
    try {
      const raw = localStorage.getItem(LOCAL_TELEMETRY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public clearLocalTelemetry() {
    localStorage.removeItem(LOCAL_TELEMETRY_KEY);
  }

  // --- DATABASE: FLEET DRIVES ---

  public async saveFleetDrive(drive: SupabaseFleetDrive): Promise<{ success: boolean; source: 'supabase' | 'local_fallback'; error?: string }> {
    const payload = {
      ...drive,
      user_id: drive.user_id || this.currentUser?.id,
      user_email: drive.user_email || this.currentUser?.email || undefined,
      created_at: drive.created_at || new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('fleet_drives')
        .upsert([payload], { onConflict: 'id' });

      if (!error) {
        return { success: true, source: 'supabase' };
      }

      this.saveLocalDrive(payload);
      return { success: true, source: 'local_fallback', error: error.message };
    } catch (err: any) {
      this.saveLocalDrive(payload);
      return { success: true, source: 'local_fallback', error: err.message };
    }
  }

  public async getFleetDrives(): Promise<{ data: SupabaseFleetDrive[]; source: 'supabase' | 'local_fallback' }> {
    try {
      const { data, error } = await supabase
        .from('fleet_drives')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return { data: data as SupabaseFleetDrive[], source: 'supabase' };
      }

      return { data: this.getLocalDrives(), source: 'local_fallback' };
    } catch {
      return { data: this.getLocalDrives(), source: 'local_fallback' };
    }
  }

  private saveLocalDrive(drive: SupabaseFleetDrive) {
    try {
      const drives = this.getLocalDrives();
      const idx = drives.findIndex((d) => d.id === drive.id);
      if (idx >= 0) {
        drives[idx] = drive;
      } else {
        drives.unshift(drive);
      }
      localStorage.setItem(LOCAL_DRIVES_KEY, JSON.stringify(drives));
    } catch (err) {
      console.warn('Failed saving local drive cache', err);
    }
  }

  public getLocalDrives(): SupabaseFleetDrive[] {
    try {
      const raw = localStorage.getItem(LOCAL_DRIVES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // --- REAL-TIME TELEMETRY SUBSCRIPTION ---

  public subscribeToRealtimeTelemetry(onInsert: (payload: SupabaseTelemetryLog) => void) {
    const channel = supabase
      .channel('drifx_telemetry_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetry_logs' },
        (payload) => {
          if (payload.new) {
            onInsert(payload.new as SupabaseTelemetryLog);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // --- SQL SCHEMA MIGRATION SNIPPET ---

  public getSqlMigrationSnippet(): string {
    return `-- =======================================================
-- DrifX Autonomous Navigation & Telematics Database Schema
-- Run this in your Supabase SQL Editor: ${SUPABASE_CONFIG.url}
-- =======================================================

-- 1. Create Telemetry Logs Table
CREATE TABLE IF NOT EXISTS public.telemetry_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    drive_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh REAL DEFAULT 0,
    heading_deg REAL DEFAULT 0,
    drift_error_m REAL DEFAULT 0,
    is_blackout BOOLEAN DEFAULT false,
    device_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Create Fleet Drives Catalog Table
CREATE TABLE IF NOT EXISTS public.fleet_drives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    total_distance_km REAL DEFAULT 0,
    points_count INTEGER DEFAULT 0,
    tunnel_length_m REAL DEFAULT 0,
    max_drift_m REAL DEFAULT 0,
    is_custom BOOLEAN DEFAULT false
);

-- 3. Create Indexes for High-Frequency Geospatial & Timestamp Lookups
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.telemetry_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_drive_id ON public.telemetry_logs (drive_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_coords ON public.telemetry_logs (latitude, longitude);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_drives ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies (Read for all, Insert for authenticated & public client)
CREATE POLICY "Allow public read for telemetry"
    ON public.telemetry_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow insert for telemetry"
    ON public.telemetry_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read for drives"
    ON public.fleet_drives FOR SELECT
    USING (true);

CREATE POLICY "Allow upsert for drives"
    ON public.fleet_drives FOR ALL
    USING (true);

-- 6. Enable Realtime on Telemetry Logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_logs;
`;
  }
}

export const supabaseService = new SupabaseService();
