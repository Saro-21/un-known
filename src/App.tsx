/**
 * DrifX (AIDR-X) - Master Implementation Application
 * Adaptive Intelligent Dead-Reckoning & GNSS Fusion Engine
 *
 * Architecture Highlights:
 * 1. Event-Driven Push Notification System (Expo / Web Push, Background Job Queue, Token Pruning)
 * 2. Scalable Theme and Dark Mode Architecture (Auto system detection, AsyncStorage persistence, CSS Variables)
 * 3. Mobile-Responsive 5-Tab Navigation (Home, Wishlist, Notification, Promo, Profile)
 * 4. IO-VNBD Factor Graph Kinematic Fusion Pipeline
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { Phase1DataAudit } from './components/Phase1DataAudit';
import { SimulationCanvas } from './components/SimulationCanvas';
import { VehicleHUD } from './components/VehicleHUD';
import { AblationStudyPanel } from './components/AblationStudyPanel';
import { ArchitectureExplorer } from './components/ArchitectureModal';
import { BaselineINSEngine } from './components/BaselineINSEngine';
import { PhoneSensorHCI } from './components/PhoneSensorHCI';
import { Phase1And2Results } from './components/Phase1And2Results';
import { BenchmarkDatasetDownload } from './components/BenchmarkDatasetDownload';
import { HomeDashboard } from './components/HomeDashboard';
import { BottomNavigationBar, BottomNavTab } from './components/BottomNavigationBar';
import { WishlistDrives } from './components/WishlistDrives';
import { ProfileSettings } from './components/ProfileSettings';
import { PromoBenchmarks } from './components/PromoBenchmarks';
import { NotificationCenter } from './components/NotificationCenter';
import { ForegroundNotificationToast } from './components/ForegroundNotificationToast';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import {
  generateIOVNBDDriveData,
  injectSyntheticBlackouts,
  geodeticToENU,
  DRIVES_CATALOG,
} from './core/iovnbdLoader';
import {
  estimatePhoneVehicleAlignment,
  preprocessAndAlignIMU,
} from './core/phoneVehicleAlignment';
import { MultiTaskInertialNetwork } from './core/multiTaskNetwork';
import { MultiHypothesisMapMatcher } from './core/roadGraph';
import {
  SlidingWindowFactorGraphSolver,
  FactorGraphOptions,
} from './core/factorGraphSolver';
import { runBaselineINS } from './core/baselineINS';
import {
  RawIOVNBDRecord,
  AlignedIMUData,
  NavigationState,
  FactorGraphResiduals,
  SyntheticBlackoutConfig,
  BlackoutSpan,
} from './types/drifx';
import { Radio, AlertCircle, ShieldCheck, Compass, Zap, Database, RefreshCw } from 'lucide-react';
import {
  getTrajectoryCacheKey,
  cacheProcessedFusionTrajectory,
  getCachedProcessedFusionTrajectory,
  clearFusionTrajectoryCache,
  ProcessedFusionData,
} from './core/trajectoryCache';
import { OfflineIndicator } from './components/OfflineIndicator';
import { GoogleMapsDeviceTracker } from './components/GoogleMapsDeviceTracker';
import { GoogleMapsSettingsModal } from './components/GoogleMapsSettingsModal';
import { JWTSecurityModal } from './components/JWTSecurityModal';
import { SupabaseAuthDatabaseView } from './components/SupabaseAuthDatabaseView';
import { GoogleMapsSettings, DEFAULT_GOOGLE_MAPS_SETTINGS } from './types/googleMapsSettings';

function DrifXInnerApp() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home_architecture');
  const [selectedDriveId, setSelectedDriveId] = useState<string>('route_f');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isManualTunnelActive, setIsManualTunnelActive] = useState<boolean>(false);
  const [manualTunnelStartStep, setManualTunnelStartStep] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [forceRecomputeCounter, setForceRecomputeCounter] = useState<number>(0);
  const [googleMapsSettings, setGoogleMapsSettings] = useState<GoogleMapsSettings>(DEFAULT_GOOGLE_MAPS_SETTINGS);
  const [isMapsSettingsOpen, setIsMapsSettingsOpen] = useState<boolean>(false);
  const [isJwtModalOpen, setIsJwtModalOpen] = useState<boolean>(false);
  const [cacheStatus, setCacheStatus] = useState<{
    isCached: boolean;
    source: 'computed' | 'local_storage';
    latencyMs: number;
    key: string;
  }>({
    isCached: false,
    source: 'computed',
    latencyMs: 0,
    key: '',
  });

  // Blackout injector configuration
  const [blackoutConfig, setBlackoutConfig] = useState<SyntheticBlackoutConfig>({
    mode: 'duration',
    duration_s: 60,
    distance_m: 500,
    interval_type: 'random',
    seed: 42,
    blackout_type: 'complete_loss',
  });

  // 1. Generate Raw IO-VNBD Telemetry for selected drive
  const rawRecords = useMemo(() => {
    return generateIOVNBDDriveData(selectedDriveId);
  }, [selectedDriveId]);

  // 2. Apply Synthetic Blackout Injection
  const { modifiedRecords, blackoutSpans } = useMemo(() => {
    return injectSyntheticBlackouts(rawRecords, blackoutConfig);
  }, [rawRecords, blackoutConfig]);

  // 3. Phase 2: Phone-to-Vehicle Alignment & Preprocessing
  const { alignment, alignedIMU } = useMemo(() => {
    const align = estimatePhoneVehicleAlignment(modifiedRecords, 6.0);
    const preprocessed = preprocessAndAlignIMU(modifiedRecords, align);
    return { alignment: align, alignedIMU: preprocessed };
  }, [modifiedRecords]);

  // 4. Phase 3: Baseline INS Run
  const baselineINSResult = useMemo(() => {
    return runBaselineINS(alignedIMU, rawRecords, blackoutSpans);
  }, [alignedIMU, rawRecords, blackoutSpans]);

  // Engines instances
  const networkRef = useRef<MultiTaskInertialNetwork>(new MultiTaskInertialNetwork());
  const mapMatcherRef = useRef<MultiHypothesisMapMatcher>(new MultiHypothesisMapMatcher());
  const solverRef = useRef<SlidingWindowFactorGraphSolver>(new SlidingWindowFactorGraphSolver());

  // Cached Full DrifX Trajectory & States
  const [fusionTrajectory, setFusionTrajectory] = useState<{
    states: NavigationState[];
    residuals: FactorGraphResiduals[];
    fusionPoints: [number, number][];
  }>({ states: [], residuals: [], fusionPoints: [] });

  // Deterministic cache key based on drive ID and blackout parameters
  const trajectoryCacheKey = useMemo(() => {
    return getTrajectoryCacheKey(
      selectedDriveId,
      blackoutConfig,
      isManualTunnelActive,
      manualTunnelStartStep
    );
  }, [selectedDriveId, blackoutConfig, isManualTunnelActive, manualTunnelStartStep]);

  // Compute or restore complete DrifX pipeline (using LocalStorage cache when available)
  useEffect(() => {
    const t0 = performance.now();

    const cached = getCachedProcessedFusionTrajectory(trajectoryCacheKey);
    if (cached && cached.states && cached.states.length === alignedIMU.length) {
      setFusionTrajectory({
        states: cached.states,
        residuals: cached.residuals,
        fusionPoints: cached.fusionPoints,
      });
      setCacheStatus({
        isCached: true,
        source: 'local_storage',
        latencyMs: Math.max(1, Math.round(performance.now() - t0)),
        key: trajectoryCacheKey,
      });
      return;
    }

    const network = networkRef.current;
    const mapMatcher = mapMatcherRef.current;
    const solver = solverRef.current;

    network.reset();
    mapMatcher.reset();

    const refLat = rawRecords[0].gps_lat;
    const refLon = rawRecords[0].gps_lon;
    const refAlt = rawRecords[0].gps_alt;

    solver.reset(0, 0, rawRecords[0].gps_bearing_deg);

    const states: NavigationState[] = [];
    const residuals: FactorGraphResiduals[] = [];
    const fusionPoints: [number, number][] = [];

    const options: FactorGraphOptions = {
      enableFactorGraph: true,
      enableAIVelocity: true,
      enableLearnedCovariance: true,
      enableNHC: true,
      enableRoadGraph: true,
      enableOnlineAdaptation: true,
    };

    for (let i = 0; i < alignedIMU.length; i++) {
      const imu = alignedIMU[i];
      let rawGNSS = modifiedRecords[i];

      if (isManualTunnelActive && manualTunnelStartStep !== null && i >= manualTunnelStartStep) {
        rawGNSS = {
          ...rawGNSS,
          gps_lat: NaN,
          gps_lon: NaN,
          gps_accuracy_m: 999.0,
        };
      }

      const aiOutput = network.step(imu);

      const curPos = states.length > 0 ? states[states.length - 1].position_enu : [0, 0, 0];
      const curHead = states.length > 0 ? states[states.length - 1].heading_deg : rawRecords[0].gps_bearing_deg;

      const roadResult = mapMatcher.update(curPos[0], curPos[1], curHead);

      const res = solver.solveStep(
        imu,
        rawGNSS,
        { lat: refLat, lon: refLon, alt: refAlt },
        aiOutput,
        roadResult.hypotheses,
        roadResult.bestProjectedPoint,
        options
      );

      states.push(res.state);
      residuals.push(res.residuals);
      fusionPoints.push([res.state.position_enu[0], res.state.position_enu[1]]);
    }

    cacheProcessedFusionTrajectory(trajectoryCacheKey, {
      states,
      residuals,
      fusionPoints,
      driveId: selectedDriveId,
    });

    setFusionTrajectory({ states, residuals, fusionPoints });
    setCacheStatus({
      isCached: true,
      source: 'computed',
      latencyMs: Math.max(1, Math.round(performance.now() - t0)),
      key: trajectoryCacheKey,
    });
  }, [
    trajectoryCacheKey,
    alignedIMU,
    modifiedRecords,
    rawRecords,
    isManualTunnelActive,
    manualTunnelStartStep,
    selectedDriveId,
    forceRecomputeCounter,
  ]);

  // Reset index when drive changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsSimulating(false);
    setIsManualTunnelActive(false);
    setManualTunnelStartStep(null);
  }, [selectedDriveId]);

  // Real-time 10 Hz Simulation Playback Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= alignedIMU.length - 1) {
          setIsSimulating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating, alignedIMU.length]);

  // Ground truth ENU path
  const groundTruthPath: [number, number][] = useMemo(() => {
    const refLat = rawRecords[0].gps_lat;
    const refLon = rawRecords[0].gps_lon;
    const refAlt = rawRecords[0].gps_alt;
    return rawRecords.map((r) => {
      const enu = geodeticToENU(r.gps_lat, r.gps_lon, r.gps_alt, refLat, refLon, refAlt);
      return [enu[0], enu[1]];
    });
  }, [rawRecords]);

  // Raw INS Path
  const rawINSPath: [number, number][] = useMemo(() => {
    return baselineINSResult.trajectory.map((t) => [t.pos_enu[0], t.pos_enu[1]]);
  }, [baselineINSResult]);

  // Blackout segments in terms of index
  const blackoutSegments = useMemo(() => {
    const segs: { startIdx: number; endIdx: number }[] = [];
    for (const span of blackoutSpans) {
      const startIdx = Math.max(
        0,
        Math.floor((span.start_ms - rawRecords[0].timestamp_ms) / 100)
      );
      const endIdx = Math.min(
        rawRecords.length - 1,
        Math.floor((span.end_ms - rawRecords[0].timestamp_ms) / 100)
      );
      segs.push({ startIdx, endIdx });
    }
    return segs;
  }, [blackoutSpans, rawRecords]);

  const currentState = fusionTrajectory.states[currentStepIndex] || null;
  const currentResiduals = fusionTrajectory.residuals[currentStepIndex] || null;
  const currentTrueSpeed = rawRecords[currentStepIndex]?.gps_speed_mps || 0;
  const currentDriveMeta = DRIVES_CATALOG.find((d) => d.id === selectedDriveId) || DRIVES_CATALOG[0];

  return (
    <div
      className="min-h-screen flex flex-col font-sans selection:bg-orange-500 selection:text-black transition-colors duration-200"
      style={{
        backgroundColor: theme.bgApp,
        color: theme.textPrimary,
      }}
    >
      {/* Foreground Notification Push Toast banner */}
      <ForegroundNotificationToast onOpenNotificationCenter={() => setActiveTab('notifications')} />

      {/* Global Header with Theme Switcher and Notification Hub */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDriveId={selectedDriveId}
        setSelectedDriveId={setSelectedDriveId}
        isSimulating={isSimulating}
        onToggleSimulate={() => setIsSimulating((v) => !v)}
        onResetSimulate={() => {
          setCurrentStepIndex(0);
          setIsSimulating(false);
        }}
        isTunnelActive={isManualTunnelActive}
        onToggleTunnel={() => {
          setIsManualTunnelActive((prev) => {
            const next = !prev;
            setManualTunnelStartStep(next ? currentStepIndex : null);
            return next;
          });
        }}
        currentHz={10.0}
        onOpenMapsSettings={() => setIsMapsSettingsOpen(true)}
        onOpenJwtModal={() => setIsJwtModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Drive Info Sub-header Bar (when on core trajectory/simulation views) */}
        {(activeTab === 'home_architecture' || activeTab === 'phase1_2' || activeTab === 'live_nav') && (
          <div
            className="border rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg transition-colors"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-1 rounded font-bold uppercase tracking-wider border font-mono text-[10px]"
                style={{
                  backgroundColor: theme.accentSubtle,
                  color: theme.accentText,
                  borderColor: theme.borderAccent,
                }}
              >
                {currentDriveMeta.split.toUpperCase()} SPLIT
              </span>
              <span className="font-medium" style={{ color: theme.textPrimary }}>
                {currentDriveMeta.name}
              </span>
              <span className="hidden sm:inline font-mono" style={{ color: theme.textSecondary }}>
                ({currentDriveMeta.driver})
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-3 font-mono text-xs" style={{ color: theme.textSecondary }}>
              <span>Duration: <strong style={{ color: theme.textPrimary }}>{currentDriveMeta.duration_s}s</strong></span>
              <span>Dist: <strong style={{ color: theme.textPrimary }}>{(currentDriveMeta.total_distance_m / 1000).toFixed(1)} km</strong></span>
              <span
                className="font-semibold px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: theme.accentSubtle,
                  color: theme.accentText,
                  borderColor: theme.borderAccent,
                }}
              >
                Step: {currentStepIndex}/{rawRecords.length - 1} ({(currentStepIndex * 0.1).toFixed(1)}s)
              </span>

              {/* LocalStorage Factor Graph Cache Status */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px]"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                {cacheStatus.source === 'local_storage' ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Cache: Hit ({cacheStatus.latencyMs}ms)</span>
                  </span>
                ) : (
                  <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                    <Database className="w-3 h-3 text-cyan-400" />
                    <span>Solved ({cacheStatus.latencyMs}ms)</span>
                  </span>
                )}
                <button
                  onClick={() => {
                    clearFusionTrajectoryCache(trajectoryCacheKey);
                    setForceRecomputeCounter((c) => c + 1);
                  }}
                  title="Purge LocalStorage cache and force re-solve factor graph"
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px] opacity-75 hover:opacity-100 flex items-center gap-1 transition-colors"
                  style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }}
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Recompute</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SYNCHRONIZED NAVIGATION VIEWS: TOP & BOTTOM BAR IDENTICAL     */}
        {/* ------------------------------------------------------------- */}

        {/* 1. HOME (Architecture) */}
        {activeTab === 'home_architecture' && (
          <HomeDashboard
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
            currentDriveName={currentDriveMeta.name}
            isTunnelActive={isManualTunnelActive}
            onToggleTunnel={() => {
              setIsManualTunnelActive((prev) => {
                const next = !prev;
                setManualTunnelStartStep(next ? currentStepIndex : null);
                return next;
              });
            }}
          />
        )}

        {/* GOOGLE MAPS & LIVE ACCURATE DEVICE GPS */}
        {activeTab === 'google_maps' && (
          <GoogleMapsDeviceTracker
            settings={googleMapsSettings}
            onOpenSettings={() => setIsMapsSettingsOpen(true)}
            onOpenSecurityModal={() => setIsJwtModalOpen(true)}
          />
        )}

        {/* SUPABASE AUTHENTICATION & DATABASE ENGINE */}
        {activeTab === 'supabase_hub' && (
          <SupabaseAuthDatabaseView />
        )}

        {/* 2. Phase 1 & 2 Results */}
        {activeTab === 'phase1_2' && (
          <Phase1And2Results
            rawRecords={rawRecords}
            alignedIMU={alignedIMU}
            blackoutConfig={blackoutConfig}
            setBlackoutConfig={setBlackoutConfig}
            blackoutSpans={blackoutSpans}
            driveName={currentDriveMeta.name}
            driveId={currentDriveMeta.id}
            onProceedToLiveNav={() => setActiveTab('live_nav')}
          />
        )}

        {/* 3. Live Navigation */}
        {activeTab === 'live_nav' && (
          <div className="space-y-5">
            <SimulationCanvas
              groundTruthPath={groundTruthPath}
              rawINSPath={rawINSPath}
              fusionPath={fusionTrajectory.fusionPoints}
              currentState={currentState}
              currentStepIndex={currentStepIndex}
              totalSteps={rawRecords.length}
              onSeek={(idx) => setCurrentStepIndex(idx)}
              blackoutSegments={blackoutSegments}
              hypotheses={currentState?.hypotheses || []}
              rawRecords={rawRecords}
            />
            <VehicleHUD
              state={currentState}
              residuals={currentResiduals}
              groundTruthSpeed={currentTrueSpeed}
              trajectoryHistory={fusionTrajectory.states}
              currentStepIndex={currentStepIndex}
              onSeekStep={(idx) => setCurrentStepIndex(idx)}
            />
          </div>
        )}

        {/* 4. Phone Gyro & Drift CLI */}
        {activeTab === 'phone_cli' && <PhoneSensorHCI />}

        {/* 5. Download Dataset */}
        {activeTab === 'benchmark_download' && (
          <BenchmarkDatasetDownload
            currentDriveId={selectedDriveId}
            rawRecords={rawRecords}
          />
        )}

        {/* Supplementary Views Accessible via Dashboard & Header */}
        {activeTab === 'wishlist' && (
          <WishlistDrives
            onLaunchRoute={(routeId) => {
              setSelectedDriveId('route_f');
              setActiveTab('live_nav');
            }}
          />
        )}

        {activeTab === 'notifications' && <NotificationCenter />}

        {activeTab === 'profile' && <ProfileSettings />}
      </main>

      {/* Global Status Footer */}
      <footer
        className="border-t text-xs py-3.5 px-4 sm:px-6 mb-16 md:mb-0 transition-colors"
        style={{
          backgroundColor: theme.bgNav,
          borderColor: theme.borderSubtle,
          color: theme.textSecondary,
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>DrifX Engine Active</span>
            </span>
            <span>&bull;</span>
            <span className="font-mono" style={{ color: theme.textSecondary }}>IO-VNBD Benchmark (10.0 Hz)</span>
            <span>&bull;</span>
            <span className="font-mono" style={{ color: theme.statusInfo }}>Sliding-Window Factor Graph</span>
          </div>

          <div className="font-mono text-[11px] flex items-center gap-2" style={{ color: theme.textSecondary }}>
            <span>Theme: {theme.name}</span>
            <span>&bull;</span>
            <span>Push: Ready</span>
            <span>&bull;</span>
            <span>Constraint: OSM Graph</span>
          </div>
        </div>
      </footer>

      {/* 5-Tab Accessible Bottom Navigation Bar: Assigned top home functions with identical names */}
      <BottomNavigationBar activeTab={activeTab} onChangeTab={(tab) => setActiveTab(tab as ActiveTab)} />

      {/* Real-time PWA Offline & Connectivity Banner */}
      <OfflineIndicator />

      {/* Google Maps Settings Modal */}
      <GoogleMapsSettingsModal
        isOpen={isMapsSettingsOpen}
        onClose={() => setIsMapsSettingsOpen(false)}
        settings={googleMapsSettings}
        onUpdateSettings={(newVals) =>
          setGoogleMapsSettings((prev) => ({ ...prev, ...newVals }))
        }
      />

      {/* JWT Authentication & Permissions Modal */}
      <JWTSecurityModal
        isOpen={isJwtModalOpen}
        onClose={() => setIsJwtModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DrifXInnerApp />
    </ThemeProvider>
  );
}
