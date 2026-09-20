/**
 * DrifX (AIDR-X) - Vehicle Telemetry, Multi-Task Neural Heads, Factor Graph HUD,
 * and Dedicated Post-Blackout GNSS Innovation Sequence Visualizer
 *
 * Dedicated GNSS Innovation Sequence:
 * Visualizes the residual error r_k = z_gnss - h(x_prior), innovation uncertainty sqrt(S_k),
 * Normalized Innovation Squared (NIS / Mahalanobis distance), and the gradual exponential
 * transition factor alpha (0.15 -> 1.0) when GNSS signals return after a blackout.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gauge,
  Cpu,
  GitBranch,
  Radio,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  ShieldCheck,
  FastForward,
  Layers,
  Activity,
  BarChart3,
} from 'lucide-react';
import { NavigationState, FactorGraphResiduals, MotionClass } from '../types/drifx';

interface VehicleHUDProps {
  state: NavigationState | null;
  residuals: FactorGraphResiduals | null;
  groundTruthSpeed: number;
  trajectoryHistory?: NavigationState[];
  currentStepIndex?: number;
  onSeekStep?: (idx: number) => void;
}

export const VehicleHUD: React.FC<VehicleHUDProps> = ({
  state,
  residuals,
  groundTruthSpeed,
  trajectoryHistory = [],
  currentStepIndex = 0,
  onSeekStep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(600);
  const [manualEpisodeId, setManualEpisodeId] = useState<number | null>(null);

  // Monitor container width dynamically so the canvas renders with pixel-perfect sharpness
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCanvasWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!state) return null;

  const fwdSpeedMps = state.velocity_veh[0];
  const speedKmh = Math.round(fwdSpeedMps * 3.6);
  const headingDeg = Math.round(state.heading_deg);

  // Motion class badge styling
  const motionBadgeColor: Record<MotionClass, string> = {
    normal: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60',
    brake: 'bg-rose-950/50 text-rose-300 border-rose-800/60',
    turn: 'bg-orange-950/50 text-orange-300 border-orange-800/60',
    pothole: 'bg-amber-950/50 text-amber-300 border-amber-800/60',
    bump: 'bg-amber-950/50 text-amber-300 border-amber-800/60',
    vibration: 'bg-purple-950/50 text-purple-300 border-purple-800/60',
  };

  // Find nearest post-blackout transition event in the trajectory for quick jumping
  const transitionEvents = useMemo(() => {
    const events: { stepIndex: number; desc: string }[] = [];
    for (let i = 1; i < trajectoryHistory.length; i++) {
      const prev = trajectoryHistory[i - 1];
      const cur = trajectoryHistory[i];
      // Detected transition: was in blackout, now GNSS is available / recovering
      if (prev.is_in_blackout && !cur.is_in_blackout) {
        events.push({
          stepIndex: i,
          desc: `Blackout Exit @ ${(i * 0.1).toFixed(1)}s (Step ${i})`,
        });
      }
    }
    return events;
  }, [trajectoryHistory]);

  // Window of states for innovation waveform plot (centered around currentStepIndex)
  const windowHalfSize = 25;
  const startIndex = Math.max(0, currentStepIndex - windowHalfSize);
  const endIndex = Math.min(trajectoryHistory.length, currentStepIndex + windowHalfSize + 1);
  const windowStates = useMemo(() => {
    return trajectoryHistory.slice(startIndex, endIndex);
  }, [trajectoryHistory, startIndex, endIndex]);

  // Render dedicated innovation sequence plot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvasWidth || canvas.parentElement?.clientWidth || 600;
    const height = 190;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Dark background
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    if (windowStates.length === 0) return;

    const padLeft = 44;
    const padRight = 16;
    const padTop = 24;
    const padBottom = 26;
    const plotW = Math.max(10, width - padLeft - padRight);
    const plotH = Math.max(10, height - padTop - padBottom);

    // Find max residual/uncertainty in the window for vertical scaling
    let maxVal = 8.0;
    for (const s of windowStates) {
      const inn = s.gnss_innovation_m || 0;
      const sig = (s.gnss_innovation_sigma_m || 2) * 2;
      maxVal = Math.max(maxVal, inn, sig);
    }
    maxVal = Math.min(60, maxVal * 1.15); // Cap scale at 60m

    const getX = (idxInWindow: number) => {
      if (windowStates.length <= 1) return padLeft;
      return padLeft + (idxInWindow / (windowStates.length - 1)) * plotW;
    };

    const getY = (val: number) => {
      const clamped = Math.max(0, Math.min(maxVal, val));
      return padTop + plotH - (clamped / maxVal) * plotH;
    };

    // 1. Draw horizontal grid lines & Y-axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const v = (maxVal / ySteps) * i;
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(`${v.toFixed(0)}m`, padLeft - 6, y + 3);
    }

    // 2. Highlight Blackout & Transition Zones
    for (let i = 0; i < windowStates.length; i++) {
      const s = windowStates[i];
      const x = getX(i);
      const stepWidth = plotW / Math.max(1, windowStates.length - 1);

      if (s.is_in_blackout) {
        // Blackout shaded strip
        ctx.fillStyle = 'rgba(244, 63, 94, 0.09)';
        ctx.fillRect(x - stepWidth / 2, padTop, stepWidth, plotH);
      } else if (s.gnss_recovered_recently) {
        // Transition recovery strip
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.fillRect(x - stepWidth / 2, padTop, stepWidth, plotH);
      }
    }

    // 3. Draw Innovation Uncertainty 2-Sigma Envelope (+/- 2*sigma_S)
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(0));
    for (let i = 0; i < windowStates.length; i++) {
      const s = windowStates[i];
      const sigma2 = (s.gnss_innovation_sigma_m || 1.5) * 2;
      ctx.lineTo(getX(i), getY(sigma2));
    }
    for (let i = windowStates.length - 1; i >= 0; i--) {
      ctx.lineTo(getX(i), getY(0));
    }
    ctx.closePath();
    ctx.fill();

    // Draw upper 2-sigma envelope dashed line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i < windowStates.length; i++) {
      const s = windowStates[i];
      const sigma2 = (s.gnss_innovation_sigma_m || 1.5) * 2;
      if (i === 0) ctx.moveTo(getX(i), getY(sigma2));
      else ctx.lineTo(getX(i), getY(sigma2));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw Chi-Square Gating Threshold Line (sqrt(5.99) * sigma_S ~ 2.45 sigma)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < windowStates.length; i++) {
      const s = windowStates[i];
      const gateThreshold = (s.gnss_innovation_sigma_m || 1.5) * Math.sqrt(5.99);
      if (i === 0) ctx.moveTo(getX(i), getY(gateThreshold));
      else ctx.lineTo(getX(i), getY(gateThreshold));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw Innovation Residual Sequence Curve (||r_k|| in meters)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let hasStarted = false;

    for (let i = 0; i < windowStates.length; i++) {
      const s = windowStates[i];
      if (!s.is_in_blackout) {
        const inn = s.gnss_innovation_m || 0;
        const x = getX(i);
        const y = getY(inn);
        if (!hasStarted) {
          ctx.moveTo(x, y);
          hasStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        hasStarted = false;
      }
    }
    ctx.stroke();

    // 6. Draw step dots on the curve
    for (let i = 0; i < windowStates.length; i++) {
      const s = windowStates[i];
      if (!s.is_in_blackout) {
        const inn = s.gnss_innovation_m || 0;
        const x = getX(i);
        const y = getY(inn);

        // Color depends on status:
        // Orange = in recovery transition, Emerald = steady lock, Rose = gated outlier
        ctx.fillStyle = s.innovation_gated
          ? '#ef4444'
          : s.gnss_recovered_recently
          ? '#f59e0b'
          : '#10b981';

        ctx.beginPath();
        ctx.arc(x, y, s.gnss_recovered_recently ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Draw Current Step Cursor (Playhead)
    const currentWindowIdx = currentStepIndex - startIndex;
    if (currentWindowIdx >= 0 && currentWindowIdx < windowStates.length) {
      const cursorX = getX(currentWindowIdx);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(cursorX, padTop);
      ctx.lineTo(cursorX, height - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Step Dot
      const currentInn = state.is_in_blackout ? 0 : state.gnss_innovation_m || 0;
      const cursorY = getY(currentInn);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state.is_in_blackout ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Step Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Step ${currentStepIndex} (${(currentStepIndex * 0.1).toFixed(1)}s)`, cursorX, height - 8);
    }
  }, [windowStates, currentStepIndex, state, canvasWidth]);

  // Reset manual blackout episode selection if dataset changes
  useEffect(() => {
    setManualEpisodeId(null);
  }, [trajectoryHistory.length]);

  // Detect all blackout episodes in the trajectory
  const blackoutEpisodes = useMemo(() => {
    const episodes: {
      id: number;
      startStep: number;
      exitStep: number;
      recoveryEndStep: number;
      windowStart: number;
      windowEnd: number;
      label: string;
      durationSec: number;
    }[] = [];

    let inB = false;
    let bStart = 0;
    let count = 0;

    for (let i = 0; i < trajectoryHistory.length; i++) {
      const s = trajectoryHistory[i];
      if (s.is_in_blackout && !inB) {
        inB = true;
        bStart = i;
      } else if (!s.is_in_blackout && inB) {
        inB = false;
        const exitStep = i;
        let recEnd = exitStep;
        while (
          recEnd < trajectoryHistory.length &&
          (trajectoryHistory[recEnd].gnss_recovered_recently || recEnd - exitStep < 25) &&
          !trajectoryHistory[recEnd].is_in_blackout
        ) {
          recEnd++;
        }
        count++;
        const durationSec = (exitStep - bStart) * 0.1;
        episodes.push({
          id: count,
          startStep: bStart,
          exitStep,
          recoveryEndStep: recEnd,
          windowStart: Math.max(0, bStart - 5),
          windowEnd: Math.min(trajectoryHistory.length, recEnd + 10),
          label: `BO #${count} (${durationSec.toFixed(1)}s)`,
          durationSec,
        });
      }
    }
    return episodes;
  }, [trajectoryHistory]);

  // Active blackout episode for histogram
  const activeEpisode = useMemo(() => {
    if (blackoutEpisodes.length === 0) return null;
    if (manualEpisodeId !== null) {
      const found = blackoutEpisodes.find((ep) => ep.id === manualEpisodeId);
      if (found) return found;
    }
    const matched = blackoutEpisodes.find(
      (ep) => currentStepIndex >= ep.windowStart && currentStepIndex <= ep.windowEnd
    );
    if (matched) return matched;

    let closest = blackoutEpisodes[0];
    let minD = Math.abs(currentStepIndex - closest.startStep);
    for (let i = 1; i < blackoutEpisodes.length; i++) {
      const d = Math.abs(currentStepIndex - blackoutEpisodes[i].startStep);
      if (d < minD) {
        minD = d;
        closest = blackoutEpisodes[i];
      }
    }
    return closest;
  }, [blackoutEpisodes, currentStepIndex, manualEpisodeId]);

  // Window info for histogram
  const histogramWindowInfo = useMemo(() => {
    if (activeEpisode) {
      return {
        title: `${activeEpisode.label} Recovery Sequence`,
        subtitle: `Steps ${activeEpisode.exitStep} to ${activeEpisode.recoveryEndStep} (${(activeEpisode.exitStep * 0.1).toFixed(1)}s–${(activeEpisode.recoveryEndStep * 0.1).toFixed(1)}s)`,
        start: activeEpisode.exitStep,
        end: activeEpisode.recoveryEndStep,
        episode: activeEpisode,
      };
    }
    return {
      title: `Local Window`,
      subtitle: `Steps ${startIndex} to ${endIndex - 1}`,
      start: startIndex,
      end: endIndex,
      episode: null,
    };
  }, [activeEpisode, startIndex, endIndex]);

  // Compute histogram data across the selected blackout recovery window
  const histogramData = useMemo(() => {
    const { start, end } = histogramWindowInfo;
    const statesInWin = trajectoryHistory.slice(start, end);

    const residuals: number[] = [];
    for (const s of statesInWin) {
      if (!s.is_in_blackout && s.gnss_innovation_m !== undefined && !isNaN(s.gnss_innovation_m)) {
        residuals.push(s.gnss_innovation_m);
      }
    }

    if (residuals.length === 0) {
      return {
        residuals: [],
        bins: [],
        mean: 0,
        std: 0,
        max: 0,
        min: 0,
        stabilityRate: 0,
        activeBinIndex: -1,
        totalCount: 0,
      };
    }

    const sum = residuals.reduce((a, b) => a + b, 0);
    const mean = sum / residuals.length;
    const variance = residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / residuals.length;
    const std = Math.sqrt(variance);
    const max = Math.max(...residuals);
    const min = Math.min(...residuals);

    // Stability rate: percentage of samples where residual is <= 3.0m (within standard 2-DOF gate)
    const stableCount = residuals.filter((r) => r <= 3.0).length;
    const stabilityRate = (stableCount / residuals.length) * 100;

    const binCount = 6;
    const upperLimit = Math.max(3.0, Math.ceil(max * 1.05));
    const binWidth = upperLimit / binCount;

    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const bMin = i * binWidth;
      const bMax = (i + 1) * binWidth;
      bins.push({
        index: i,
        rangeLabel: `${bMin.toFixed(1)}–${bMax.toFixed(1)}m`,
        min: bMin,
        max: bMax,
        count: 0,
        pct: 0,
      });
    }

    for (const r of residuals) {
      let bIdx = Math.floor(r / binWidth);
      if (bIdx >= binCount) bIdx = binCount - 1;
      if (bIdx < 0) bIdx = 0;
      bins[bIdx].count++;
    }

    for (const b of bins) {
      b.pct = (b.count / residuals.length) * 100;
    }

    // Active bin index for current vehicle state
    let activeBinIndex = -1;
    if (!state.is_in_blackout && state.gnss_innovation_m !== undefined && !isNaN(state.gnss_innovation_m)) {
      const curR = state.gnss_innovation_m;
      activeBinIndex = Math.min(binCount - 1, Math.max(0, Math.floor(curR / binWidth)));
    }

    return {
      residuals,
      bins,
      mean,
      std,
      max,
      min,
      stabilityRate,
      activeBinIndex,
      totalCount: residuals.length,
    };
  }, [histogramWindowInfo, trajectoryHistory, state]);

  // Innovation metrics for current step
  const currentInnovation = state.gnss_innovation_m ?? (residuals ? residuals.gnss_residual_m : 0);
  const currentSigma = state.gnss_innovation_sigma_m ?? state.pos_std_m[0];
  const currentNIS = state.gnss_nis ?? ((currentInnovation * currentInnovation) / Math.max(1, currentSigma * currentSigma));
  const currentAlpha = state.gnss_recovery_alpha ?? (state.gnss_recovered_recently ? 0.45 : 1.0);
  const recoveryStep = state.gnss_recovery_step ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-sans items-start">
      {/* COLUMN 1 (LEFT): PRIMARY STATE METRICS */}
      <div className="space-y-4">
        {/* Section Header for Left Column */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-orange-950/60 text-orange-400 border border-orange-800/40">
              <Activity className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
              Primary State Telemetry &amp; Models
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500">
            Real-Time Estimator &bull; 10 Hz
          </span>
        </div>

        {/* CARD 1: Vehicle Kinematics HUD */}
        <motion.div
          whileHover={{ borderColor: 'rgba(255, 255, 255, 0.18)' }}
          transition={{ duration: 0.2 }}
          className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 shadow-xl flex flex-col justify-between transition-colors duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                <Gauge className="w-3.5 h-3.5 text-orange-400" />
                <span>Vehicle Dynamics (FLU Body Frame)</span>
              </h4>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/50 transition-colors duration-200">
                Latency: {state.solve_latency_ms} ms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Speedometer */}
              <motion.div
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15 }}
                className="p-3 rounded-lg bg-[#141414] border border-white/5 hover:border-white/10 transition-colors duration-200"
              >
                <span className="text-[10px] text-neutral-400 font-mono block mb-0.5">Forward Velocity</span>
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    key={fwdSpeedMps.toFixed(1)}
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="text-2xl font-bold text-white font-mono"
                  >
                    {fwdSpeedMps.toFixed(1)}
                  </motion.span>
                  <span className="text-xs text-neutral-500 font-mono">m/s</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 block mt-1 transition-colors duration-200">
                  {speedKmh} km/h (GT: {(groundTruthSpeed * 3.6).toFixed(0)})
                </span>
              </motion.div>

              {/* Heading Compass */}
              <motion.div
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15 }}
                className="p-3 rounded-lg bg-[#141414] border border-white/5 hover:border-white/10 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-neutral-400 font-mono block">True Heading</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      state.heading_std_deg <= 1.5
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                        : state.heading_std_deg <= 3.5
                        ? 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
                        : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                    }`}
                  >
                    {Math.max(40, Math.min(99, Math.round(100 - (state.heading_std_deg * 6 + Math.abs(state.gyro_bias[2]) * 150))))}% Stability
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    key={headingDeg}
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="text-2xl font-bold text-white font-mono"
                  >
                    {headingDeg}&deg;
                  </motion.span>
                  <span className="text-xs text-neutral-500 font-mono">&plusmn;{state.heading_std_deg}&deg;</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                  <span className="text-cyan-400 transition-colors duration-200">Azimuth N-E-S-W</span>
                  <span className="text-neutral-500">Bias: &plusmn;{(Math.abs(state.gyro_bias[2]) * 57.2958).toFixed(2)}&deg;/s</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Uncertainty 2-Sigma Radius */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">2&sigma; Confidence Radius:</span>
            <span className="text-cyan-400 font-semibold transition-colors duration-200">
              &plusmn;{(state.pos_std_m[0] * 2).toFixed(2)} m (Horizontal)
            </span>
          </div>
        </motion.div>

        {/* CARD 2: Multi-Task Neural Error Model Output */}
        <motion.div
          whileHover={{ borderColor: 'rgba(255, 255, 255, 0.18)' }}
          transition={{ duration: 0.2 }}
          className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 shadow-xl flex flex-col justify-between transition-colors duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Multi-Task Neural Heads</span>
              </h4>
              <AnimatePresence mode="wait">
                <motion.span
                  key={state.motion_class}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className={`text-[10px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded border transition-colors duration-200 ${
                    motionBadgeColor[state.motion_class] || 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {state.motion_class}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {/* Velocity Head */}
              <div className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/10 transition-colors duration-200 flex justify-between items-center">
                <span className="text-neutral-400 text-[11px]">Learned Velocity (Head 2):</span>
                <span className="text-purple-300 font-bold transition-colors duration-200">
                  {state.ai_velocity_mps.toFixed(1)} m/s (&sigma;: &plusmn;{state.ai_confidence_std_mps.toFixed(2)})
                </span>
              </div>

              {/* Bias Correction Head */}
              <div className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/10 transition-colors duration-200 flex justify-between items-center">
                <span className="text-neutral-400 text-[11px]">Bias Corrections (Head 3):</span>
                <span className="text-cyan-300 font-mono transition-colors duration-200">
                  &Delta;b_a: {state.accel_bias[0].toFixed(3)} m/s&sup2;
                </span>
              </div>

              {/* Calibrated Log-Variance */}
              <div className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/10 transition-colors duration-200 flex justify-between items-center">
                <span className="text-neutral-400 text-[11px]">Calibrated Covariance (Head 4):</span>
                <span className="text-emerald-400 font-mono transition-colors duration-200">R_ai &prop; exp(log &sigma;&sup2;)</span>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-neutral-500 font-mono italic">
            *AI outputs corrections &amp; log-variance only — never direct position.
          </div>
        </motion.div>

        {/* CARD 3: Sliding-Window Factor Graph & Road Matching */}
        <motion.div
          whileHover={{ borderColor: 'rgba(255, 255, 255, 0.18)' }}
          transition={{ duration: 0.2 }}
          className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 shadow-xl flex flex-col justify-between transition-colors duration-300"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                <span>Factor Graph &amp; Road Hypotheses</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                Joint Window: 15 Steps
              </span>
            </div>

            {/* Hypotheses List */}
            <div className="space-y-1.5">
              {state.hypotheses.slice(0, 2).map((hypo, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-[#141414] border border-white/5 flex items-center justify-between text-xs font-mono relative overflow-hidden group hover:border-white/10 transition-colors duration-200"
                >
                  {/* Subtle progress background for hypothesis weight */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-white/[0.03] pointer-events-none"
                    initial={false}
                    animate={{ width: `${hypo.weight * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  />

                  <div className="truncate max-w-[200px] relative z-10">
                    <span className="text-neutral-200 block truncate font-medium">{hypo.road_name}</span>
                    <span className="text-[10px] text-neutral-500">
                      d_perp: {hypo.cross_track_distance_m}m | &Delta;&psi;: {hypo.heading_difference_deg}&deg;
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0 relative z-10">
                    <span
                      className={`font-bold transition-colors duration-200 ${
                        hypo.is_collapsed ? 'text-purple-400' : 'text-neutral-300'
                      }`}
                    >
                      {(hypo.weight * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] block text-neutral-500">
                      {hypo.is_collapsed ? 'LOCKED' : 'CANDIDATE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Residuals */}
          {residuals && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span>NHC: {residuals.nhc_lateral_residual_mps} m/s</span>
              <span>Road: {residuals.road_cross_track_residual_m} m</span>
              <span className="text-orange-400 font-semibold">&chi;&sup2;: {residuals.total_chi2}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* COLUMN 2 (RIGHT): DEDICATED POST-BLACKOUT GNSS INNOVATION SEQUENCE VISUALIZER */}
      <div
        ref={containerRef}
        className={`border rounded-xl p-5 shadow-2xl space-y-4 transition-all duration-500 ease-out ${
          state.is_in_blackout
            ? 'bg-[#120a0c] border-rose-900/60 shadow-rose-950/20'
            : state.gnss_recovered_recently
            ? 'bg-[#141108] border-amber-800/70 shadow-amber-950/30'
            : 'bg-[#0f0f0f] border-white/10 shadow-black/40'
        }`}
      >
        {/* Top Header & Status Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-950/60 text-orange-400 border border-orange-800/60 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-orange-400" />
                GNSS Innovation Chart
              </span>
              <span className="text-xs text-neutral-500 font-sans hidden sm:inline">&bull;</span>
              <span className="text-xs text-neutral-400 font-sans hidden sm:inline">
                Blackout Correlation
              </span>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Residual Waveform r_k = z_gnss - h(x_prior)</span>
            </h3>
          </div>

          {/* State Badges & Transition Recovery Info */}
          <div className="flex items-center gap-2 text-xs">
            <AnimatePresence mode="wait">
              {state.is_in_blackout ? (
                <motion.span
                  key="blackout"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="px-2.5 py-1 rounded bg-rose-950/80 text-rose-400 border border-rose-800/80 flex items-center gap-1.5 font-bold"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>GNSS DENIED (BLACKOUT)</span>
                </motion.span>
              ) : state.gnss_recovered_recently ? (
                <motion.span
                  key="recovery"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1.5 font-bold animate-pulse"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>TRANSITION ACTIVE: &alpha; = {(currentAlpha * 100).toFixed(0)}%</span>
                </motion.span>
              ) : (
                <motion.span
                  key="steady"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5 font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>STEADY-STATE GNSS LOCK</span>
                </motion.span>
              )}
            </AnimatePresence>

            {/* Quick jump to post-blackout transition */}
            {transitionEvents.length > 0 && onSeekStep && (
              <button
                onClick={() => onSeekStep(transitionEvents[0].stepIndex)}
                className="px-2.5 py-1 rounded bg-[#181818] hover:bg-neutral-800 text-neutral-300 border border-white/10 hover:border-white/20 flex items-center gap-1 cursor-pointer transition-colors"
                title="Jump directly to the first post-blackout GNSS re-acquisition event"
              >
                <FastForward className="w-3 h-3 text-orange-400" />
                <span className="text-[11px]">Transition</span>
              </button>
            )}
          </div>
        </div>

        {/* Transition Smoothing Progress Bar (Alpha: 0.15 -> 1.0) */}
        <div className="bg-[#141414] border border-white/5 rounded-lg p-3 space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Continuous Transition Factor (&alpha;):</span>
            </span>
            <span className="text-white font-bold">
              {state.is_in_blackout
                ? '0.00 (Signal Blocked)'
                : `${(currentAlpha * 100).toFixed(0)}% (${state.gnss_recovered_recently ? `Smoothing Step ${recoveryStep}` : 'Fully Fused'})`}
            </span>
          </div>

          <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
            <motion.div
              className={`h-full ${
                state.is_in_blackout
                  ? 'bg-rose-500/50'
                  : state.gnss_recovered_recently
                  ? 'bg-gradient-to-r from-amber-500 to-cyan-400'
                  : 'bg-emerald-500'
              }`}
              initial={false}
              animate={{ width: `${state.is_in_blackout ? 0 : Math.max(5, currentAlpha * 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
            <span>&alpha; = 0.15 (Soft pull on exit)</span>
            <span className="text-center font-sans hidden sm:inline">&bull; C1 Continuity &bull; Zero Map Jump</span>
            <span>&alpha; = 1.0 (Full Fusion)</span>
          </div>
        </div>

        {/* Canvas: Time-Series Innovation Sequence & Gating Envelope */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
                <span className="text-neutral-300">Residual ||r_k|| (m)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-cyan-500/20 border border-cyan-500/40 rounded-sm inline-block"></span>
                <span className="text-cyan-400">&plusmn;2&sigma; Uncertainty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-500 inline-block"></span>
                <span className="text-rose-400">&chi;&sup2; Gate</span>
              </div>
            </div>

            <span className="text-neutral-500 text-[10px]">
              Window: {startIndex} to {endIndex - 1} (&plusmn;2.5s)
            </span>
          </div>

          <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#080808]">
            <canvas ref={canvasRef} className="w-full h-[190px] block" />
          </div>
        </div>

        {/* GNSS Residual Distribution Histogram (Blackout Recovery Stability) */}
        <div className="bg-[#121212] border border-white/10 rounded-lg p-3 space-y-2 font-mono">
          {/* Header & Window Status */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-orange-950/70 text-orange-400 border border-orange-800/50">
                <BarChart3 className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Residual Distribution
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    &bull; {histogramWindowInfo.title}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 block">
                  Distribution of residuals during blackout re-acquisition sequence
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {blackoutEpisodes.length > 1 && (
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-white/10 text-[10px]">
                  {blackoutEpisodes.map((ep) => {
                    const isSelected = activeEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => {
                          setManualEpisodeId(ep.id);
                          if (onSeekStep) onSeekStep(ep.exitStep);
                        }}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 shadow-sm shadow-orange-500/10'
                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={`Focus ${ep.label} at Step ${ep.exitStep}`}
                      >
                        BO #{ep.id}
                      </button>
                    );
                  })}
                </div>
              )}

              <motion.span
                layout
                className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 transition-colors duration-300 ${
                  histogramData.stabilityRate >= 80
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : histogramData.stabilityRate >= 50
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                    : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Stability: {histogramData.stabilityRate.toFixed(0)}% &le; 3m</span>
              </motion.span>
            </div>
          </div>

          {/* Quick Statistics Strip */}
          <div className="grid grid-cols-4 gap-2 text-[10px] bg-black/40 p-2 rounded border border-white/5">
            <div>
              <span className="text-neutral-500 block uppercase">Mean &mu;</span>
              <motion.span
                key={histogramData.mean.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-white font-bold block"
              >
                {histogramData.mean.toFixed(2)} m
              </motion.span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase">Dispersion &sigma;</span>
              <motion.span
                key={histogramData.std.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-cyan-400 font-bold block"
              >
                &plusmn;{histogramData.std.toFixed(2)} m
              </motion.span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase">Peak Exit Drift</span>
              <motion.span
                key={histogramData.max.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-amber-400 font-bold block"
              >
                {histogramData.max.toFixed(2)} m
              </motion.span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase">Window Fixes</span>
              <span className="text-neutral-300 font-bold block">
                {histogramData.totalCount} samples
              </span>
            </div>
          </div>

          {/* Framer Motion Spring Bar Chart for GNSS Residual Distribution */}
          <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#080808] p-3 pt-4">
            {histogramData.residuals.length === 0 ? (
              <div className="h-[95px] flex flex-col items-center justify-center text-neutral-500 text-xs gap-1.5 font-sans">
                <AlertTriangle className="w-4 h-4 text-rose-400/80" />
                <span>No GNSS fixes in this window (GNSS Denied / Blackout Active)</span>
              </div>
            ) : (
              <div className="relative h-[95px] flex flex-col justify-end">
                {/* Horizontal Guide Lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pb-6">
                  <div className="border-b border-white/[0.04] w-full flex items-center justify-between text-[8px] text-neutral-600">
                    <span>Peak ({Math.max(1, ...histogramData.bins.map((b) => b.count))})</span>
                  </div>
                  <div className="border-b border-dashed border-white/[0.04] w-full"></div>
                  <div className="border-b border-white/[0.12] w-full"></div>
                </div>

                {/* Bars Container */}
                <div className="relative z-10 grid grid-cols-6 gap-2 items-end h-[72px] pb-1">
                  {(() => {
                    const maxCount = Math.max(1, ...histogramData.bins.map((b) => b.count));
                    return histogramData.bins.map((bin, idx) => {
                      const isActive = idx === histogramData.activeBinIndex;
                      const heightPercent = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
                      const isGood = idx <= 1;
                      const isFair = idx <= 3;

                      return (
                        <div
                          key={bin.rangeLabel}
                          className="flex flex-col items-center h-full justify-end group relative"
                        >
                          {/* Active Indicator Pin */}
                          {isActive && (
                            <motion.div
                              layoutId="active-hist-pin"
                              className="absolute -top-3 flex flex-col items-center z-20"
                              initial={false}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            >
                              <div className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.9)] animate-ping absolute" />
                              <div className="w-2 h-2 rounded-full bg-white border border-cyan-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                            </motion.div>
                          )}

                          {/* Bin Count Label */}
                          <motion.span
                            initial={false}
                            animate={{
                              scale: isActive ? 1.1 : 1,
                              color: isActive ? '#ffffff' : bin.count > 0 ? '#9ca3af' : '#404040',
                            }}
                            transition={{ duration: 0.15 }}
                            className="text-[9px] font-mono mb-1 font-bold select-none"
                          >
                            {bin.count}
                          </motion.span>

                          {/* Spring Animated Bar */}
                          <div className="w-full bg-white/[0.02] rounded-t flex items-end h-full overflow-hidden">
                            <motion.div
                              className={`w-full rounded-t transition-colors duration-200 ${
                                isGood
                                  ? isActive
                                    ? 'bg-gradient-to-t from-emerald-600 via-emerald-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                    : 'bg-gradient-to-t from-emerald-950 via-emerald-700/80 to-emerald-500'
                                  : isFair
                                  ? isActive
                                    ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                                    : 'bg-gradient-to-t from-amber-950 via-amber-700/80 to-amber-500'
                                  : isActive
                                  ? 'bg-gradient-to-t from-rose-600 via-rose-400 to-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                                  : 'bg-gradient-to-t from-rose-950 via-rose-700/80 to-rose-500'
                              }`}
                              initial={false}
                              animate={{
                                height: `${Math.max(bin.count > 0 ? 8 : 2, heightPercent)}%`,
                              }}
                              transition={{
                                type: 'spring',
                                stiffness: 220,
                                damping: 22,
                              }}
                            />
                          </div>

                          {/* Range Label */}
                          <span
                            className={`text-[8px] font-mono mt-1 transition-colors duration-150 whitespace-nowrap ${
                              isActive
                                ? 'text-cyan-400 font-bold'
                                : 'text-neutral-500 group-hover:text-neutral-300'
                            }`}
                          >
                            {bin.rangeLabel}
                          </span>

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-12 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                            <div className="bg-neutral-900 text-white border border-white/20 px-2 py-1 rounded text-[9px] shadow-lg whitespace-nowrap font-mono">
                              <span className="font-bold">{bin.rangeLabel}:</span> {bin.count} fixes (
                              {histogramData.totalCount > 0
                                ? ((bin.count / histogramData.totalCount) * 100).toFixed(1)
                                : '0'}
                              %)
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Real-time sync indicator */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <motion.span
                className={`w-1.5 h-1.5 rounded-full ${
                  state.is_in_blackout
                    ? 'bg-rose-500'
                    : state.gnss_recovered_recently
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                animate={{
                  scale: state.gnss_recovered_recently ? [1, 1.4, 1] : 1,
                  opacity: state.gnss_recovered_recently ? [1, 0.6, 1] : 1,
                }}
                transition={{
                  repeat: state.gnss_recovered_recently ? Infinity : 0,
                  duration: 1.2,
                }}
              />
              <span>
                {state.is_in_blackout
                  ? 'Current: GNSS Denied (Dead-Reckoning Active)'
                  : `Current Residual: ${currentInnovation.toFixed(2)}m (${
                      histogramData.activeBinIndex >= 0 && histogramData.bins[histogramData.activeBinIndex]
                        ? `Bin ${histogramData.bins[histogramData.activeBinIndex].rangeLabel}`
                        : 'Active'
                    })`}
              </span>
            </span>

            {activeEpisode && onSeekStep && (
              <button
                onClick={() => onSeekStep(activeEpisode.exitStep)}
                className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer transition-colors"
              >
                Jump to Re-acquisition (Step {activeEpisode.exitStep})
              </button>
            )}
          </div>
        </div>

        {/* Real-time Innovation Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs pt-1">
          {/* Current Residual */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/20 transition-colors"
          >
            <span className="text-neutral-500 text-[10px] block uppercase">Current ||r_k||</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <motion.span
                key={state.is_in_blackout ? 'na' : currentInnovation.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className={`text-base font-bold transition-colors duration-200 ${
                  state.is_in_blackout
                    ? 'text-neutral-500'
                    : currentInnovation < 3
                    ? 'text-emerald-400'
                    : currentInnovation < 10
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {state.is_in_blackout ? 'N/A' : `${currentInnovation.toFixed(2)}`}
              </motion.span>
              {!state.is_in_blackout && <span className="text-xs text-neutral-400">m</span>}
            </div>
            <span className="text-[9px] text-neutral-500 block mt-0.5 truncate">
              {state.is_in_blackout ? 'GNSS Denied' : 'Position Residual'}
            </span>
          </motion.div>

          {/* Innovation Uncertainty */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/20 transition-colors"
          >
            <span className="text-neutral-500 text-[10px] block uppercase">&sigma;_S Uncertainty</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <motion.span
                key={currentSigma.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-base font-bold text-cyan-400"
              >
                &plusmn;{currentSigma.toFixed(2)}
              </motion.span>
              <span className="text-xs text-neutral-400">m</span>
            </div>
            <span className="text-[9px] text-neutral-500 block mt-0.5 truncate">
              &radic;(R_gnss + P_prior)
            </span>
          </motion.div>

          {/* Normalized Innovation Squared (NIS / Mahalanobis) */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/20 transition-colors"
          >
            <span className="text-neutral-500 text-[10px] block uppercase">Mahalanobis NIS</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <motion.span
                key={state.is_in_blackout ? 'bo' : currentNIS.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className={`text-base font-bold transition-colors duration-200 ${
                  currentNIS > 9.0 ? 'text-rose-400' : currentNIS > 5.99 ? 'text-amber-400' : 'text-white'
                }`}
              >
                {state.is_in_blackout ? '0.00' : currentNIS.toFixed(2)}
              </motion.span>
              <span className="text-[9px] text-neutral-500">/ 5.99</span>
            </div>
            <span className="text-[9px] text-neutral-500 block mt-0.5 truncate">
              95% &chi;&sup2; 2-DOF
            </span>
          </motion.div>

          {/* Gating Verdict */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-2.5 rounded-lg bg-[#141414] border border-white/5 hover:border-white/20 transition-colors"
          >
            <span className="text-neutral-500 text-[10px] block uppercase">Gating Verdict</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={
                  state.is_in_blackout
                    ? 'blackout'
                    : state.innovation_gated
                    ? 'gated'
                    : state.gnss_recovered_recently
                    ? 'recovery'
                    : 'fused'
                }
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className={`text-[11px] font-bold block mt-1 truncate ${
                  state.is_in_blackout
                    ? 'text-neutral-500'
                    : state.innovation_gated
                    ? 'text-rose-400'
                    : state.gnss_recovered_recently
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {state.is_in_blackout
                  ? 'DEAD-RECKONING'
                  : state.innovation_gated
                  ? 'OUTLIER GATED'
                  : state.gnss_recovered_recently
                  ? 'RECOVERY SMOOTH'
                  : 'FUSED IN GRAPH'}
              </motion.span>
            </AnimatePresence>
            <span className="text-[9px] text-neutral-500 block mt-0.5 truncate">
              {state.gnss_recovered_recently ? 'Zero-Jump Mode' : 'Passed Chi-Square'}
            </span>
          </motion.div>
        </div>

        {/* Blackout Transition Correlation Explanation Banner */}
        <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span>
            <span className="text-neutral-300">Blackout Transition Correlation:</span>
          </div>
          <span className="text-neutral-400 text-[10px] truncate max-w-[280px] sm:max-w-none">
            {state.is_in_blackout
              ? 'IMU + AI velocity model active • GNSS residual disabled'
              : state.gnss_recovered_recently
              ? `Softening step ${recoveryStep} • Residual bounded by 2σ confidence`
              : 'Continuous Kalman tracking • Chi-Square gating verified'}
          </span>
        </div>
      </div>
    </div>
  );
};
