/**
 * DrifX (AIDR-X) - Phase 2 / Core Deliverable:
 * Baseline Inertial Navigation System (INS) - Pure Physics Propagation Dashboard
 *
 * NON-NEGOTIABLE ARCHITECTURAL RULE:
 * This baseline uses ONLY physics-based strapdown inertial equations.
 * No AI or learned models at this stage. Takes IMU data as input,
 * integrates position, velocity, and heading, logs trajectory, and
 * calculates drift metrics for test blackout scenarios to establish
 * an empirical performance baseline.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Compass,
  Download,
  AlertTriangle,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  Smartphone,
  Gauge,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import {
  HardwareSensorTarget,
  RawIOVNBDRecord,
  AlignedIMUData,
  BlackoutSpan,
} from '../types/drifx';
import {
  runBaselineINS,
  exportBaselineLogToCSV,
  exportBaselineLogToJSON,
  HARDWARE_SENSOR_PROFILES,
  BaselineINSSummary,
  INSStepResult,
} from '../core/baselineINS';

interface BaselineINSEngineProps {
  rawRecords: RawIOVNBDRecord[];
  alignedIMU: AlignedIMUData[];
  blackoutSpans: BlackoutSpan[];
  driveName: string;
  driveId: string;
}

export const BaselineINSEngine: React.FC<BaselineINSEngineProps> = ({
  rawRecords,
  alignedIMU,
  blackoutSpans,
  driveName,
  driveId,
}) => {
  // Selected Hardware Sensor Target
  const [hardwareTarget, setHardwareTarget] = useState<HardwareSensorTarget>('smartphone_mems');

  // Test Scenario Preset
  const [scenarioMode, setScenarioMode] = useState<'drive' | 'tunnel_50m' | 'tunnel_1km'>('drive');

  // Table filter: all or blackout only
  const [tableFilter, setTableFilter] = useState<'all' | 'blackout'>('blackout');
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);
  const [tablePage, setTablePage] = useState<number>(0);
  const rowsPerPage = 12;

  // Custom blackout spans based on scenario selection
  const activeBlackoutSpans = useMemo(() => {
    if (scenarioMode === 'drive') {
      return blackoutSpans;
    }

    if (rawRecords.length === 0) return [];
    const t0 = rawRecords[0].timestamp_ms;

    if (scenarioMode === 'tunnel_50m') {
      // 50m blackout in ~4 seconds at typical driving speed (~12-15 m/s)
      const startMs = t0 + 20000;
      const endMs = t0 + 24000;
      return [
        {
          id: 'tunnel_50m_test',
          start_ms: startMs,
          end_ms: endMs,
          duration_s: 4.0,
          distance_m: 50,
          type: 'complete_loss' as const,
        },
      ];
    }

    // tunnel_1km: 1km tunnel at 60 km/h (16.67 m/s) = ~60 seconds blackout
    const startMs = t0 + 15000;
    const endMs = t0 + 75000;
    return [
      {
        id: 'tunnel_1km_test',
        start_ms: startMs,
        end_ms: endMs,
        duration_s: 60.0,
        distance_m: 1000,
        type: 'complete_loss' as const,
      },
    ];
  }, [scenarioMode, blackoutSpans, rawRecords]);

  // Execute Pure Physics Baseline INS Engine
  const summary: BaselineINSSummary = useMemo(() => {
    return runBaselineINS(alignedIMU, rawRecords, activeBlackoutSpans, hardwareTarget);
  }, [alignedIMU, rawRecords, activeBlackoutSpans, hardwareTarget]);

  // Filtered trajectory steps for the log table
  const filteredSteps = useMemo(() => {
    if (tableFilter === 'blackout') {
      return summary.trajectory.filter((s) => s.is_blackout);
    }
    return summary.trajectory;
  }, [summary.trajectory, tableFilter]);

  const paginatedSteps = useMemo(() => {
    const start = tablePage * rowsPerPage;
    return filteredSteps.slice(start, start + rowsPerPage);
  }, [filteredSteps, tablePage]);

  const totalPages = Math.ceil(filteredSteps.length / rowsPerPage) || 1;

  // Selected step details
  const selectedStep: INSStepResult | null =
    summary.trajectory[selectedStepIdx] || summary.trajectory[0] || null;

  // Canvas visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 700;
    const height = 340;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // Compute bounding box for ENU positions
    let minE = Infinity;
    let maxE = -Infinity;
    let minN = Infinity;
    let maxN = -Infinity;

    for (const step of summary.trajectory) {
      minE = Math.min(minE, step.pos_enu[0], step.gt_pos_enu[0]);
      maxE = Math.max(maxE, step.pos_enu[0], step.gt_pos_enu[0]);
      minN = Math.min(minN, step.pos_enu[1], step.gt_pos_enu[1]);
      maxN = Math.max(maxN, step.pos_enu[1], step.gt_pos_enu[1]);
    }

    const pad = 40;
    const rangeE = Math.max(10, maxE - minE);
    const rangeN = Math.max(10, maxN - minN);
    const scale = Math.min((width - pad * 2) / rangeE, (height - pad * 2) / rangeN);

    const toScreen = (e: number, n: number): [number, number] => {
      const sx = pad + (e - minE) * scale;
      const sy = height - pad - (n - minN) * scale; // Invert north
      return [sx, sy];
    };

    // Draw Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Ground Truth Path (Solid Emerald Green)
    if (summary.trajectory.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const [x0, y0] = toScreen(summary.trajectory[0].gt_pos_enu[0], summary.trajectory[0].gt_pos_enu[1]);
      ctx.moveTo(x0, y0);
      for (let i = 1; i < summary.trajectory.length; i++) {
        const [xi, yi] = toScreen(summary.trajectory[i].gt_pos_enu[0], summary.trajectory[i].gt_pos_enu[1]);
        ctx.lineTo(xi, yi);
      }
      ctx.stroke();
    }

    // Draw Blackout Spans on Ground Truth (Amber glow)
    for (const span of activeBlackoutSpans) {
      const bSteps = summary.trajectory.filter(
        (s) => s.timestamp_ms >= span.start_ms && s.timestamp_ms <= span.end_ms
      );
      if (bSteps.length > 1) {
        ctx.strokeStyle = 'rgba(242, 125, 38, 0.35)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        const [bx0, by0] = toScreen(bSteps[0].gt_pos_enu[0], bSteps[0].gt_pos_enu[1]);
        ctx.moveTo(bx0, by0);
        for (let j = 1; j < bSteps.length; j++) {
          const [bxi, byi] = toScreen(bSteps[j].gt_pos_enu[0], bSteps[j].gt_pos_enu[1]);
          ctx.lineTo(bxi, byi);
        }
        ctx.stroke();
      }
    }

    // Draw Pure Physics INS Trajectory (Crimson Red, Dashed Error Curve)
    if (summary.trajectory.length > 1) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const [rx0, ry0] = toScreen(summary.trajectory[0].pos_enu[0], summary.trajectory[0].pos_enu[1]);
      ctx.moveTo(rx0, ry0);
      for (let i = 1; i < summary.trajectory.length; i++) {
        const [rxi, ryi] = toScreen(summary.trajectory[i].pos_enu[0], summary.trajectory[i].pos_enu[1]);
        ctx.lineTo(rxi, ryi);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Error Vector Lines during Blackout
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    for (let k = 0; k < summary.trajectory.length; k += 8) {
      const step = summary.trajectory[k];
      if (step.is_blackout) {
        const [px, py] = toScreen(step.pos_enu[0], step.pos_enu[1]);
        const [gx, gy] = toScreen(step.gt_pos_enu[0], step.gt_pos_enu[1]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(gx, gy);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Highlight Selected Step Marker
    if (selectedStep) {
      const [cx, cy] = toScreen(selectedStep.pos_enu[0], selectedStep.pos_enu[1]);
      const [gx, gy] = toScreen(selectedStep.gt_pos_enu[0], selectedStep.gt_pos_enu[1]);

      // Ground truth dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(gx, gy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Estimated INS dot
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Connecting line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
  }, [summary, activeBlackoutSpans, selectedStep]);

  // Export handlers
  const handleDownloadCSV = () => {
    const csvContent = exportBaselineLogToCSV(summary);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseline_ins_trajectory_${hardwareTarget}_${driveId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const jsonContent = exportBaselineLogToJSON(summary);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseline_ins_summary_${hardwareTarget}_${driveId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profile = summary.sensor_profile;

  return (
    <div className="space-y-6">
      {/* 1. Hardware Sensor Target & Presets Bar */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                Zero AI / Physics-Only Baseline
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-neutral-300 border border-white/10">
                Pure Strapdown Mechanization
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-tight mt-1.5 flex items-center gap-2">
              <span>Baseline Inertial Navigation System (INS)</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Evaluates pure double-integration of acceleration and single-integration of yaw rate without neural speed filtering or factor graph fusion.
            </p>
          </div>

          {/* Hardware Sensor Target Toggle */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto font-mono text-xs">
            <span className="text-neutral-400 text-[11px] mr-1 hidden sm:inline">Hardware Target:</span>
            {(
              [
                { id: 'smartphone_mems', label: 'Smartphone MEMS (10 Hz)', icon: Smartphone },
                { id: 'automotive_mems', label: 'Auto MEMS Edge (100 Hz)', icon: Cpu },
                { id: 'tactical_fog', label: 'Tactical FOG Edge (200 Hz)', icon: Gauge },
              ] as const
            ).map((target) => {
              const Icon = target.icon;
              const isSelected = hardwareTarget === target.id;
              return (
                <button
                  key={target.id}
                  onClick={() => setHardwareTarget(target.id)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600/20 text-orange-400 border-orange-500/50 font-bold shadow'
                      : 'bg-[#141414] text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{target.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sensor Noise & Hardware Spec Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="p-2.5 rounded bg-[#141414] border border-white/5">
            <span className="text-neutral-500 block text-[10px] uppercase">Engine Target</span>
            <span className="text-white font-bold block mt-0.5">{profile.category}</span>
          </div>
          <div className="p-2.5 rounded bg-[#141414] border border-white/5">
            <span className="text-neutral-500 block text-[10px] uppercase">Sampling Rate</span>
            <span className="text-cyan-400 font-bold block mt-0.5">{profile.nominal_hz.toFixed(0)} Hz ({1000 / profile.nominal_hz} ms)</span>
          </div>
          <div className="p-2.5 rounded bg-[#141414] border border-white/5">
            <span className="text-neutral-500 block text-[10px] uppercase">Accel Noise / In-Run Bias</span>
            <span className="text-neutral-300 font-bold block mt-0.5">
              {profile.accel_noise_density} m/s² / ±{profile.accel_bias_drift} m/s²
            </span>
          </div>
          <div className="p-2.5 rounded bg-[#141414] border border-white/5">
            <span className="text-neutral-500 block text-[10px] uppercase">Gyro Bias Drift</span>
            <span className="text-amber-400 font-bold block mt-0.5">
              {(profile.gyro_bias_drift * (180 / Math.PI)).toFixed(3)}°/s ({profile.gyro_bias_drift} rad/s)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Benchmark Scenario Selection & Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario Selector Card */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span>Test Blackout Scenarios</span>
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setScenarioMode('drive')}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                scenarioMode === 'drive'
                  ? 'bg-orange-600/15 border-orange-500/50 text-white'
                  : 'bg-[#141414] border-white/5 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>IO-VNBD Active Blackout</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-300">
                  {summary.blackout_duration_s.toFixed(0)}s Outage
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 font-sans">
                Evaluated across the synthetic dropout injected on {driveName}.
              </p>
            </button>

            <button
              onClick={() => setScenarioMode('tunnel_50m')}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                scenarioMode === 'tunnel_50m'
                  ? 'bg-orange-600/15 border-orange-500/50 text-white'
                  : 'bg-[#141414] border-white/5 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Benchmark: 50m Tunnel</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-300">
                  Target &lt; 5m Drift
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 font-sans">
                Short urban overpass / tunnel (&lt;1 min). Required: &lt;5m drift over 50m distance traveled.
              </p>
            </button>

            <button
              onClick={() => setScenarioMode('tunnel_1km')}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                scenarioMode === 'tunnel_1km'
                  ? 'bg-orange-600/15 border-orange-500/50 text-white'
                  : 'bg-[#141414] border-white/5 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Benchmark: 1km Tunnel @ 60km/h</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-300">
                  Target &lt; 100m Drift
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 font-sans">
                Extended underground tunnel / metro at highway speed. Required: &lt;100m drift over 1000m.
              </p>
            </button>
          </div>
        </div>

        {/* Performance Verdict Banner */}
        <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-400" />
                Dead-Reckoning Benchmark Status
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  summary.benchmark_status.criterion_10_percent_passed
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                }`}
              >
                {summary.benchmark_status.criterion_10_percent_passed ? 'BENCHMARK PASSED (<10%)' : 'BENCHMARK FAILED (DRIFT > 10%)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 font-mono">
              <div className="p-3 rounded-lg bg-[#141414] border border-white/5">
                <span className="text-neutral-500 text-[10px] block uppercase">Drift % of Distance</span>
                <span
                  className={`text-lg font-bold block mt-0.5 ${
                    summary.baseline_drift_pct < 10 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summary.baseline_drift_pct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-neutral-500">Benchmark: &lt;10.0%</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-white/5">
                <span className="text-neutral-500 text-[10px] block uppercase">Final Drift Error</span>
                <span className="text-lg font-bold text-rose-400 block mt-0.5">
                  {summary.baseline_final_error_m.toFixed(1)} m
                </span>
                <span className="text-[10px] text-neutral-500">Over {summary.blackout_distance_traveled_m.toFixed(0)}m outage</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-white/5">
                <span className="text-neutral-500 text-[10px] block uppercase">Position RMSE</span>
                <span className="text-lg font-bold text-white block mt-0.5">
                  {summary.baseline_rmse_m.toFixed(1)} m
                </span>
                <span className="text-[10px] text-neutral-500">Peak: {summary.baseline_max_error_m.toFixed(1)}m</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-white/5">
                <span className="text-neutral-500 text-[10px] block uppercase">Heading Drift RMSE</span>
                <span className="text-lg font-bold text-amber-400 block mt-0.5">
                  {summary.heading_rmse_deg.toFixed(1)}&deg;
                </span>
                <span className="text-[10px] text-neutral-500">Vel MAE: {summary.velocity_mae_mps.toFixed(1)} m/s</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[#141414] border border-white/5 font-mono text-xs text-neutral-300 leading-relaxed">
            <span className="text-orange-400 font-bold block mb-0.5">Why the Baseline Fails without AI:</span>
            <p className="text-[11px] text-neutral-400 font-sans">
              {summary.benchmark_status.summary_verdict}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Physics Strapdown Formulation & Error Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strapdown Mechanization Equations */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-xl space-y-3 font-mono text-xs">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span>Pure Physics Mechanization Equations</span>
          </h3>

          <div className="p-3 rounded-lg bg-[#080808] border border-white/10 text-neutral-300 space-y-1.5 text-[11px] leading-relaxed">
            <div className="text-neutral-500">// 1. Attitude Propagation (Heading)</div>
            <div className="text-cyan-400">&psi;_(k) = &psi;_(k-1) + &omega;_yaw &times; &Delta;t</div>

            <div className="text-neutral-500 pt-1">// 2. Accelerometer Frame Rotation (Body to ENU)</div>
            <div className="text-emerald-400">a_east = a_fwd &times; sin(&psi;_(k)) + a_lat &times; cos(&psi;_(k))</div>
            <div className="text-emerald-400">a_north = a_fwd &times; cos(&psi;_(k)) - a_lat &times; sin(&psi;_(k))</div>

            <div className="text-neutral-500 pt-1">// 3. Velocity &amp; Position Double Integration</div>
            <div className="text-amber-400">v_enu_(k) = v_enu_(k-1) + a_enu &times; &Delta;t</div>
            <div className="text-rose-400">p_enu_(k) = p_enu_(k-1) + v_enu_(k) &times; &Delta;t</div>
          </div>
        </div>

        {/* Theoretical Error Growth Law Breakdown */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-xl space-y-3 font-mono text-xs">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
            <span>Inertial Drift Decomposition (Quadratic &amp; Cubic)</span>
          </h3>

          <div className="p-3 rounded-lg bg-[#080808] border border-white/10 text-neutral-300 space-y-2 text-[11px]">
            <div className="text-orange-400 font-bold">
              e_drift(t) &approx; 0.5 &times; b_a &times; t&sup2; + (1/6) &times; g &times; b_g &times; t&sup3;
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
              <div>
                <span className="text-neutral-500 text-[10px] block">Quadratic Accel Bias Error:</span>
                <span className="text-rose-400 font-bold text-sm block">
                  {summary.drift_breakdown.quadratic_accel_drift_m.toFixed(1)} m
                </span>
                <span className="text-[10px] text-neutral-500">0.5 &times; {profile.accel_bias_drift} &times; t&sup2;</span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">Cubic Gyro Bias Tilt Error:</span>
                <span className="text-amber-400 font-bold text-sm block">
                  {summary.drift_breakdown.cubic_gyro_drift_m.toFixed(1)} m
                </span>
                <span className="text-[10px] text-neutral-500">(1/6) &times; 9.81 &times; {profile.gyro_bias_drift} &times; t&sup3;</span>
              </div>
            </div>
            <div className="pt-1 text-[10px] text-neutral-400 border-t border-white/5">
              Theoretical predicted drift: <strong className="text-white">{summary.drift_breakdown.total_theoretical_drift_m.toFixed(1)} m</strong> vs Observed: <strong className="text-rose-400">{summary.drift_breakdown.observed_final_drift_m.toFixed(1)} m</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Canvas Visualizer: Ground Truth vs Pure Physics INS */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>Trajectory Plot: Ground Truth vs Physics Baseline INS</span>
          </h3>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
              <span className="text-neutral-300">Ground Truth (Reference)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 border-dashed inline-block"></span>
              <span className="text-rose-400">Baseline INS (Physics Only)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-orange-500/30 rounded inline-block"></span>
              <span className="text-orange-400">GNSS Blackout Zone</span>
            </div>
          </div>
        </div>

        <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#080808]">
          <canvas ref={canvasRef} className="w-full h-[340px] block" />
        </div>
      </div>

      {/* 5. Trajectory Step Logger & Data Inspector */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
              <span>Step-by-Step Trajectory Log ({filteredSteps.length} records)</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Complete state vector logging: IMU inputs, integrated ENU/Geodetic coordinates, velocity, heading, and instantaneous drift error.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Filter Toggle */}
            <div className="flex items-center bg-[#141414] border border-white/10 rounded p-0.5">
              <button
                onClick={() => {
                  setTableFilter('blackout');
                  setTablePage(0);
                }}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  tableFilter === 'blackout' ? 'bg-orange-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Blackout Only ({summary.blackout_sample_count})
              </button>
              <button
                onClick={() => {
                  setTableFilter('all');
                  setTablePage(0);
                }}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  tableFilter === 'all' ? 'bg-orange-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                All Steps ({summary.total_steps})
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded bg-[#141414] hover:bg-neutral-800 text-neutral-200 border border-white/10 hover:border-white/20 flex items-center gap-1.5 cursor-pointer"
              title="Download full CSV trajectory log"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded bg-[#141414] hover:bg-neutral-800 text-neutral-200 border border-white/10 hover:border-white/20 flex items-center gap-1.5 cursor-pointer"
              title="Download JSON telemetry summary"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Telemetry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 text-[11px]">
                <th className="pb-2.5">Step</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">a_fwd (m/s²)</th>
                <th className="pb-2.5 text-right">a_lat (m/s²)</th>
                <th className="pb-2.5 text-right">&omega;_yaw (rad/s)</th>
                <th className="pb-2.5 text-right">Speed (m/s)</th>
                <th className="pb-2.5 text-right">Heading (°)</th>
                <th className="pb-2.5 text-right">Est East / North</th>
                <th className="pb-2.5 text-right">GT East / North</th>
                <th className="pb-2.5 text-right text-rose-400">Pos Error (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedSteps.map((step) => {
                const isSelected = selectedStep?.step_index === step.step_index;
                return (
                  <tr
                    key={step.step_index}
                    onClick={() => setSelectedStepIdx(step.step_index)}
                    className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      isSelected ? 'bg-white/[0.06] font-semibold' : ''
                    } ${step.is_blackout ? 'text-neutral-200' : 'text-neutral-400'}`}
                  >
                    <td className="py-2.5 text-neutral-500">{step.step_index}</td>
                    <td className="py-2.5">
                      {step.is_blackout ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-400 border border-rose-800/60">
                          BLACKOUT
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          GNSS LOCK
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-neutral-300">
                      {step.input_imu.acc_forward.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-neutral-300">
                      {step.input_imu.acc_lateral.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-neutral-400">
                      {step.input_imu.gyr_yaw.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right text-white font-bold">
                      {step.speed_mps.toFixed(1)}
                    </td>
                    <td className="py-2.5 text-right text-neutral-300">
                      {step.heading_deg.toFixed(1)}°
                    </td>
                    <td className="py-2.5 text-right text-neutral-400 text-[11px]">
                      {step.pos_enu[0].toFixed(1)}, {step.pos_enu[1].toFixed(1)}
                    </td>
                    <td className="py-2.5 text-right text-neutral-500 text-[11px]">
                      {step.gt_pos_enu[0].toFixed(1)}, {step.gt_pos_enu[1].toFixed(1)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-rose-400">
                      {step.error_to_gt_m.toFixed(2)} m
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-xs text-neutral-400">
          <span>
            Page {tablePage + 1} of {totalPages} ({filteredSteps.length} items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              disabled={tablePage === 0}
              className="px-2.5 py-1 rounded bg-[#141414] border border-white/10 hover:border-white/20 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={tablePage >= totalPages - 1}
              className="px-2.5 py-1 rounded bg-[#141414] border border-white/10 hover:border-white/20 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
