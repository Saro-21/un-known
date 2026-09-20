/**
 * DrifX - Live Phone Gyroscope & Actual Car Position HCI Dashboard
 *
 * Implements the HCI Architecture requested:
 * SMARTPHONE (Accelerometer + Gyroscope)
 *   ↓
 * Lightweight AI
 *   ↓
 * Motion / Speed estimate
 *   ↓
 * Dead Reckoning (Estimated Position)
 *   ↓
 * Map Matching
 *   ↓
 * HCI Interface:
 *   🚗 Position
 *   🛰️ GNSS Status
 *   🤖 AI Mode
 *   🟢 Confidence
 *   📉 Drift Percentage (Main Aim)
 *   ↓
 * DRIVER
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Navigation,
  Radio,
  Activity,
  Gauge,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
  RotateCcw,
  Zap,
  TrendingDown,
  Shield,
  Layers,
  ArrowRight,
  Info,
  Car,
  Wifi,
  WifiOff,
  Map,
} from 'lucide-react';
import {
  livePhoneEngine,
  LiveEngineState,
} from '../core/livePhoneSensorEngine';
import { GyroHeadingStabilityMetrics } from '../core/phoneVehicleAlignment';
import { DriftCLITerminal } from './DriftCLITerminal';
import { LiveTrajectoryOSMMap } from './LiveTrajectoryOSMMap';

interface SensorBiasTimelineProps {
  stability: GyroHeadingStabilityMetrics;
}

const SensorBiasTimeline: React.FC<SensorBiasTimelineProps> = ({ stability }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 540;
    const height = 135;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Deep neutral dark canvas
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 52;
    const padRight = 24;
    const padTop = 22;
    const padBottom = 24;
    const plotW = Math.max(10, width - padLeft - padRight);
    const plotH = Math.max(10, height - padTop - padBottom);

    const history = stability.bias_history;

    // Calculate symmetric Y scale range around 0.00 deg/s
    let maxAbsBias = 0.20;
    for (const p of history) {
      if (Math.abs(p.bias_deg_s) > maxAbsBias) {
        maxAbsBias = Math.abs(p.bias_deg_s);
      }
    }
    maxAbsBias = Math.min(1.2, maxAbsBias * 1.35);

    const getY = (val: number) => {
      const norm = val / maxAbsBias; // -1 to +1
      return padTop + plotH / 2 - norm * (plotH / 2);
    };

    // 1. Draw Safe Stability Tolerance Band (-0.10 deg/s to +0.10 deg/s)
    const ySafeTop = getY(Math.min(maxAbsBias, 0.10));
    const ySafeBot = getY(Math.max(-maxAbsBias, -0.10));
    ctx.fillStyle = 'rgba(16, 185, 129, 0.07)';
    ctx.fillRect(padLeft, ySafeTop, plotW, Math.abs(ySafeBot - ySafeTop));

    // 2. Subtle horizontal grid lines & Y labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';

    // Zero-bias reference line (dashed white)
    const yZero = getY(0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yZero);
    ctx.lineTo(width - padRight, yZero);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('0.00°/s', padLeft - 6, yZero + 3);

    // +Max & -Max Y markers
    const yTop = getY(maxAbsBias);
    const yBot = getY(-maxAbsBias);
    ctx.fillText(`+${maxAbsBias.toFixed(2)}°/s`, padLeft - 6, yTop + 3);
    ctx.fillText(`-${maxAbsBias.toFixed(2)}°/s`, padLeft - 6, yBot + 3);

    // Safe Tolerance Zone watermarking
    ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STABILITY TOLERANCE (±0.10°/s)', padLeft + 6, ySafeTop + 9);

    if (history.length < 2) {
      ctx.fillStyle = '#737373';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Gathering continuous gyroscope stream to estimate bias drift profile...',
        padLeft + plotW / 2,
        padTop + plotH / 2
      );
      return;
    }

    const getX = (idx: number) => {
      return padLeft + (idx / (history.length - 1)) * plotW;
    };

    // 3. Shaded bias deviation area towards zero baseline
    ctx.beginPath();
    ctx.moveTo(getX(0), yZero);
    for (let i = 0; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].bias_deg_s));
    }
    ctx.lineTo(getX(history.length - 1), yZero);
    ctx.closePath();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.09)';
    ctx.fill();

    // 4. Trace Sensor Bias Line Curve
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < history.length; i++) {
      const x = getX(i);
      const y = getY(history[i].bias_deg_s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. Highlight Latest Sensor Bias Point with live cursor pulse
    const lastIdx = history.length - 1;
    const lastX = getX(lastIdx);
    const lastY = getY(history[lastIdx].bias_deg_s);

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.fill();

    // Inner marker dot
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Callout badge next to point
    const calloutText = `${history[lastIdx].bias_deg_s > 0 ? '+' : ''}${history[lastIdx].bias_deg_s.toFixed(3)}°/s`;
    ctx.font = '9px JetBrains Mono, monospace';
    const textW = ctx.measureText(calloutText).width;
    const calloutX = Math.min(width - padRight - textW - 8, lastX - textW / 2);
    const calloutY = lastY < padTop + 24 ? lastY + 16 : lastY - 9;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(calloutX - 4, calloutY - 9, textW + 8, 14, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22d3ee';
    ctx.textAlign = 'left';
    ctx.fillText(calloutText, calloutX, calloutY + 2);

    // 6. Time Axis labels
    ctx.fillStyle = '#666';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-12s', padLeft, height - 7);
    ctx.fillText('-6s', padLeft + plotW / 2, height - 7);
    ctx.fillText('Now', width - padRight, height - 7);
  }, [stability.bias_history]);

  return (
    <div className="w-full bg-[#080808] rounded-xl border border-white/10 overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-[135px] block" />
    </div>
  );
};

export const PhoneSensorHCI: React.FC = () => {
  const [engineState, setEngineState] = useState<LiveEngineState>(livePhoneEngine.getState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'both' | 'actual' | 'estimated'>('both');
  const [mapDisplayType, setMapDisplayType] = useState<'osm' | 'canvas'>('osm');

  // Convert ENU trajectories to WGS84 Geodetic coordinates for OpenStreetMap
  const { osmActualPath, osmEstimatedPath, osmRawINSPath, osmActualCarPos, osmEstimatedCarPos } = useMemo(() => {
    const anchor = engineState.anchor_gps || { lat: 37.7749, lon: -122.4194, alt: 15.0 };
    const cosLat = Math.cos((anchor.lat * Math.PI) / 180);

    const actualPts: [number, number][] = engineState.trajectory.actual.map(([x, y]) => [
      anchor.lat + y / 111111,
      anchor.lon + x / (111111 * cosLat),
    ]);

    const estPts: [number, number][] = engineState.trajectory.estimated.map(([x, y]) => [
      anchor.lat + y / 111111,
      anchor.lon + x / (111111 * cosLat),
    ]);

    const rawPts: [number, number][] = engineState.trajectory.raw_ins.map(([x, y]) => [
      anchor.lat + y / 111111,
      anchor.lon + x / (111111 * cosLat),
    ]);

    const actPos: [number, number] | null = engineState.actual_car
      ? [engineState.actual_car.latitude, engineState.actual_car.longitude]
      : actualPts.length > 0
      ? actualPts[actualPts.length - 1]
      : null;

    const estPos: [number, number] | null = engineState.estimated_car?.latitude
      ? [engineState.estimated_car.latitude, engineState.estimated_car.longitude]
      : estPts.length > 0
      ? estPts[estPts.length - 1]
      : null;

    return {
      osmActualPath: actualPts,
      osmEstimatedPath: estPts,
      osmRawINSPath: rawPts,
      osmActualCarPos: actPos,
      osmEstimatedCarPos: estPos,
    };
  }, [engineState.trajectory, engineState.actual_car, engineState.estimated_car, engineState.anchor_gps]);

  useEffect(() => {
    const unsubscribe = livePhoneEngine.subscribe((s) => {
      setEngineState({ ...s });
    });
    return () => unsubscribe();
  }, []);

  // Canvas trajectory renderer
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

    // Dark grid background
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const { actual, estimated, raw_ins } = engineState.trajectory;
    if (actual.length === 0 && estimated.length === 0) {
      ctx.fillStyle = '#737373';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Awaiting Phone Gyroscope & Car GPS telemetry. Tap "Start Tracking" or "Simulate Drive".',
        width / 2,
        height / 2
      );
      return;
    }

    // Determine bounding box across both trajectories
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const allPts = [...actual, ...estimated];
    for (const [x, y] of allPts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const spanX = Math.max(40, maxX - minX);
    const spanY = Math.max(40, maxY - minY);
    const pad = 45;
    const scaleX = (width - pad * 2) / spanX;
    const scaleY = (height - pad * 2) / spanY;
    const scale = Math.min(scaleX, scaleY);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const toScreen = (x: number, y: number): [number, number] => {
      const sx = width / 2 + (x - centerX) * scale;
      const sy = height / 2 - (y - centerY) * scale; // Invert Y for ENU (North is up)
      return [sx, sy];
    };

    // 1. Draw Raw INS Divergence Path (red dashed)
    if (raw_ins.length > 1) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < raw_ins.length; i++) {
        const [sx, sy] = toScreen(raw_ins[i][0], raw_ins[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Draw Actual Car Ground Truth GPS Path (emerald/cyan)
    if (actual.length > 1 && (activeViewMode === 'both' || activeViewMode === 'actual')) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < actual.length; i++) {
        const [sx, sy] = toScreen(actual[i][0], actual[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // 3. Draw AI Dead-Reckoning Estimated Path (orange)
    if (estimated.length > 1 && (activeViewMode === 'both' || activeViewMode === 'estimated')) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < estimated.length; i++) {
        const [sx, sy] = toScreen(estimated[i][0], estimated[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // 4. Draw Drift Deviation Line between Actual and Estimated Car
    if (engineState.actual_car && engineState.estimated_car) {
      const [actSx, actSy] = toScreen(engineState.actual_car.enu_x_m, engineState.actual_car.enu_y_m);
      const [estSx, estSy] = toScreen(engineState.estimated_car.enu_x_m, engineState.estimated_car.enu_y_m);

      // Error connector line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(actSx, actSy);
      ctx.lineTo(estSx, estSy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label error distance along midpoint
      const midX = (actSx + estSx) / 2;
      const midY = (actSy + estSy) / 2;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText(`${engineState.drift.ai_drift_error_m.toFixed(1)}m drift`, midX + 6, midY - 4);

      // 2-Sigma Uncertainty Ellipse around estimated car
      const uncertaintyRadius = Math.max(12, engineState.estimated_car.uncertainty_2sigma_m * scale);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(estSx, estSy, uncertaintyRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Render Estimated Car with Heading Pointer / Arrow (Orange)
      const estHeadRad = (engineState.estimated_car.heading_deg * Math.PI) / 180;
      const estTipX = estSx + Math.sin(estHeadRad) * 20;
      const estTipY = estSy - Math.cos(estHeadRad) * 20;
      const estWingL_X = estTipX + Math.sin(estHeadRad - Math.PI * 0.75) * 8;
      const estWingL_Y = estTipY - Math.cos(estHeadRad - Math.PI * 0.75) * 8;
      const estWingR_X = estTipX + Math.sin(estHeadRad + Math.PI * 0.75) * 8;
      const estWingR_Y = estTipY - Math.cos(estHeadRad + Math.PI * 0.75) * 8;

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(estSx, estSy);
      ctx.lineTo(estTipX, estTipY);
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(estTipX, estTipY);
      ctx.lineTo(estWingL_X, estWingL_Y);
      ctx.lineTo(estTipX - Math.sin(estHeadRad) * 3, estTipY + Math.cos(estHeadRad) * 3);
      ctx.lineTo(estWingR_X, estWingR_Y);
      ctx.closePath();
      ctx.fill();

      // Estimated Car Vehicle Pin
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(estSx, estSy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Render Actual Car with Heading Pointer / Arrow (Emerald)
      const actHeadRad = (engineState.actual_car.heading_deg * Math.PI) / 180;
      const actTipX = actSx + Math.sin(actHeadRad) * 20;
      const actTipY = actSy - Math.cos(actHeadRad) * 20;
      const actWingL_X = actTipX + Math.sin(actHeadRad - Math.PI * 0.75) * 8;
      const actWingL_Y = actTipY - Math.cos(actHeadRad - Math.PI * 0.75) * 8;
      const actWingR_X = actTipX + Math.sin(actHeadRad + Math.PI * 0.75) * 8;
      const actWingR_Y = actTipY - Math.cos(actHeadRad + Math.PI * 0.75) * 8;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(actSx, actSy);
      ctx.lineTo(actTipX, actTipY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(actTipX, actTipY);
      ctx.lineTo(actWingL_X, actWingL_Y);
      ctx.lineTo(actTipX - Math.sin(actHeadRad) * 3, actTipY + Math.cos(actHeadRad) * 3);
      ctx.lineTo(actWingR_X, actWingR_Y);
      ctx.closePath();
      ctx.fill();

      // Actual Car Vehicle Pin
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(actSx, actSy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [engineState.trajectory, engineState.actual_car, engineState.estimated_car, engineState.drift, activeViewMode]);

  const handleStartPhone = () => {
    livePhoneEngine.startLiveTracking();
  };

  const handleStartSim = () => {
    livePhoneEngine.startSimulatedDrive();
  };

  const handleStop = () => {
    livePhoneEngine.stopTracking();
  };

  const handleReset = () => {
    livePhoneEngine.reset();
  };

  const handleToggleBlackout = () => {
    livePhoneEngine.toggleBlackout();
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP RESEARCH CONTEXT & ARCHITECTURE STRIP */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30">
                <Smartphone className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live Smartphone Gyroscope &amp; Car Position Engine
              </h2>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                HCI + AI Uncertainty
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Real-time inertial dead-reckoning fusing phone motion sensors with vehicle GNSS. Computes continuous drift percentage against actual car position.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!engineState.is_running ? (
              <>
                <button
                  onClick={handleStartPhone}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Connect Phone Sensors &amp; GPS</span>
                </button>
                <button
                  onClick={handleStartSim}
                  className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-neutral-800 text-neutral-200 border border-white/15 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  title="Test drive with synthesized gyroscope & car telemetry"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Simulate Road Drive</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStop}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Stream</span>
                </button>
                <button
                  onClick={handleToggleBlackout}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    engineState.is_blackout_active
                      ? 'bg-rose-600 hover:bg-rose-500 text-black ring-2 ring-rose-400 animate-pulse'
                      : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/40'
                  }`}
                  title="Simulate entering a tunnel / GNSS blackout"
                >
                  {engineState.is_blackout_active ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                  <span>{engineState.is_blackout_active ? 'Tunnel Blackout Active' : 'Inject GNSS Blackout'}</span>
                </button>
              </>
            )}

            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-[#141414] hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-white/10 transition-colors cursor-pointer"
              title="Reset metrics and trajectory"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pipeline Diagram (matching the user's uploaded image architecture) */}
        <div className="pt-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[720px] text-xs font-mono">
            {/* Step 1: Smartphone Sensors */}
            <div className="flex-1 bg-[#141414] p-2.5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">1. Smartphone</span>
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Gyro + Accel</span>
              </div>
              <span className="text-[9px] text-cyan-400 block truncate">
                {engineState.sensor_sample_hz > 0 ? `${engineState.sensor_sample_hz} Hz live` : 'Ready'}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />

            {/* Step 2: Lightweight AI */}
            <div className="flex-1 bg-[#141414] p-2.5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">2. Lightweight AI</span>
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Motion / Speed</span>
              </div>
              <span className="text-[9px] text-orange-400 block truncate">
                {engineState.estimated_car ? engineState.estimated_car.motion_class.toUpperCase() : 'Idle'}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />

            {/* Step 3: Dead Reckoning */}
            <div className="flex-1 bg-[#141414] p-2.5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">3. Dead Reckoning</span>
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Est. Position</span>
              </div>
              <span className="text-[9px] text-neutral-400 block truncate">
                {engineState.estimated_car ? `${engineState.estimated_car.speed_mps.toFixed(1)} m/s` : '0.0 m/s'}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />

            {/* Step 4: HCI Interface */}
            <div className="flex-1 bg-orange-600/10 p-2.5 rounded-xl border border-orange-500/30 space-y-1">
              <span className="text-[10px] text-orange-400 font-bold block uppercase">4. HCI Interface</span>
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-orange-400" />
                <span>Drift % + Trust</span>
              </div>
              <span className="text-[9px] text-orange-300 font-bold block truncate">
                {engineState.drift.ai_drift_percentage.toFixed(2)}% Drift
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />

            {/* Step 5: Driver */}
            <div className="flex-1 bg-[#141414] p-2.5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold block uppercase">5. Target</span>
              <div className="text-white font-semibold flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Driver</span>
              </div>
              <span className="text-[9px] text-emerald-400 block truncate">
                {engineState.drift.benchmark_passed ? 'Safe (< 10%)' : 'Caution'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE MAIN AIM: DRIFT PERCENTAGE CENTERPIECE */}
      <div className="bg-gradient-to-br from-[#141108] via-[#0f0f0f] to-[#0a0a0a] border border-orange-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-orange-500/20 text-orange-400">
              <TrendingDown className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Main Aim: Drift Percentage Telemetry</h3>
              <span className="text-[11px] text-neutral-400 font-mono">
                Formula: Drift % = (Position Error [m] / Distance Traveled [m]) &times; 100
              </span>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border font-mono ${
              engineState.drift.benchmark_passed
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : 'bg-rose-950/80 text-rose-400 border-rose-800'
            }`}
          >
            {engineState.drift.benchmark_passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>Industry Benchmark: {engineState.drift.benchmark_passed ? 'PASS (< 10%)' : 'FAIL (> 10%)'}</span>
          </span>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 1. AI Dead Reckoning Drift Percentage */}
          <div className="bg-[#141414] border border-orange-500/40 p-4 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-neutral-400 text-xs font-mono uppercase block">AI Dead-Reckoning Drift</span>
            <div className="flex items-baseline gap-1 mt-1">
              <motion.span
                key={engineState.drift.ai_drift_percentage.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-extrabold text-orange-400 font-mono"
              >
                {engineState.drift.ai_drift_percentage.toFixed(2)}
              </motion.span>
              <span className="text-lg font-bold text-orange-300 font-mono">%</span>
            </div>
            <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
              <span>Error: {engineState.drift.ai_drift_error_m.toFixed(2)} m</span>
              <span className="text-emerald-400 font-semibold">Compensated</span>
            </div>
          </div>

          {/* 2. Raw Uncompensated INS Drift Percentage */}
          <div className="bg-[#141414] border border-white/10 p-4 rounded-xl relative">
            <span className="text-neutral-400 text-xs font-mono uppercase block">Raw Physics INS Drift</span>
            <div className="flex items-baseline gap-1 mt-1">
              <motion.span
                key={engineState.drift.raw_ins_drift_percentage.toFixed(2)}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-extrabold text-rose-400 font-mono"
              >
                {engineState.drift.raw_ins_drift_percentage.toFixed(2)}
              </motion.span>
              <span className="text-lg font-bold text-rose-300 font-mono">%</span>
            </div>
            <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
              <span>Error: {engineState.drift.raw_ins_drift_error_m.toFixed(2)} m</span>
              <span className="text-rose-400 font-semibold">Divergent</span>
            </div>
          </div>

          {/* 3. Distance Traveled Base */}
          <div className="bg-[#141414] border border-white/10 p-4 rounded-xl relative">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-xs font-mono uppercase block">Distance Traveled</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-amber-300/80 font-mono border border-white/5">
                True Path Arc
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono">
                {engineState.drift.distance_traveled_m.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-neutral-400 font-mono">m</span>
              {engineState.drift.distance_traveled_m > 1000 && (
                <span className="text-xs text-neutral-500 font-mono ml-1">
                  ({(engineState.drift.distance_traveled_m / 1000).toFixed(2)} km)
                </span>
              )}
            </div>
            <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
              <span>Straight: {(engineState.drift.straight_line_displacement_m || 0).toFixed(0)}m</span>
              <span>Speed: {(engineState.actual_car?.speed_mps ? engineState.actual_car.speed_mps * 3.6 : (engineState.estimated_car?.speed_mps ? engineState.estimated_car.speed_mps * 3.6 : 0)).toFixed(0)} km/h</span>
            </div>
          </div>

          {/* 4. Drift Reduction Ratio */}
          <div className="bg-[#141414] border border-white/10 p-4 rounded-xl">
            <span className="text-neutral-400 text-xs font-mono uppercase block">AI Drift Elimination</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                {engineState.drift.drift_reduction_factor.toFixed(1)}
              </span>
              <span className="text-lg font-bold text-emerald-300 font-mono">%</span>
            </div>
            <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
              <span>Uncertainty: &plusmn;{engineState.estimated_car?.uncertainty_2sigma_m || 2.5}m</span>
              <span className="text-emerald-400 font-semibold">TCN/GRU Fused</span>
            </div>
          </div>
        </div>

        {/* Visual Drift % Comparison Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-neutral-400">Drift Comparison vs 10% Benchmark Threshold</span>
            <span className="text-orange-400 font-bold">
              AI: {engineState.drift.ai_drift_percentage.toFixed(2)}% vs Raw: {engineState.drift.raw_ins_drift_percentage.toFixed(2)}%
            </span>
          </div>
          <div className="h-3 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden relative">
            {/* 10% Benchmark marker line */}
            <div className="absolute top-0 bottom-0 left-[33.3%] w-0.5 bg-white/40 z-20" title="10% Benchmark Limit" />

            {/* AI Drift Bar */}
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-orange-400 rounded-full"
              initial={false}
              animate={{ width: `${Math.min(100, (engineState.drift.ai_drift_percentage / 30) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono px-0.5">
            <span>0% (Ideal)</span>
            <span className="text-white/60 font-bold">10% (Automotive Safe Benchmark)</span>
            <span>30%+ (Extreme Divergence)</span>
          </div>
        </div>
      </div>

      {/* 3. THE 4 HCI INTERFACE CARDS (MATCHING USER'S FLOWCHART EXACTLY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* CARD 1: 🚗 POSITION */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5 font-sans">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>Position</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800">
              WGS84 / ENU
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">Actual Car GPS Fix</span>
              <div className="text-neutral-200 font-semibold truncate text-[11px]">
                {engineState.actual_car
                  ? `${engineState.actual_car.latitude.toFixed(5)}°, ${engineState.actual_car.longitude.toFixed(5)}°`
                  : 'Searching GPS...'}
              </div>
              <span className="text-[9px] text-neutral-400">
                ENU: [{engineState.actual_car?.enu_x_m != null ? engineState.actual_car.enu_x_m.toFixed(1) : '0.0'}, {engineState.actual_car?.enu_y_m != null ? engineState.actual_car.enu_y_m.toFixed(1) : '0.0'}] m
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">Estimated Dead-Reckoning</span>
              <div className="text-orange-400 font-semibold truncate text-[11px]">
                ENU: [{engineState.estimated_car?.enu_x_m != null ? engineState.estimated_car.enu_x_m.toFixed(1) : '0.0'}, {engineState.estimated_car?.enu_y_m != null ? engineState.estimated_car.enu_y_m.toFixed(1) : '0.0'}] m
              </div>
              <span className="text-[9px] text-neutral-400">
                Heading: {engineState.estimated_car?.heading_deg != null ? engineState.estimated_car.heading_deg.toFixed(1) : '0.0'}&deg;
              </span>
            </div>

            <div className="pt-1 border-t border-white/5 flex justify-between text-[10px]">
              <span className="text-neutral-500">Vector Error:</span>
              <span className="text-amber-400 font-bold">{(engineState.drift?.ai_drift_error_m ?? 0).toFixed(2)} m</span>
            </div>
          </div>
        </div>

        {/* CARD 2: 🛰️ GNSS STATUS */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5 font-sans">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>GNSS Status</span>
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                engineState.is_blackout_active
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              }`}
            >
              {engineState.is_blackout_active ? 'DENIED / BLACKOUT' : 'LOCKED (3D FIX)'}
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">1-&sigma; Horizontal Accuracy</span>
              <div className="flex items-baseline gap-1 text-white font-bold text-base">
                <span>&plusmn;{engineState.actual_car?.accuracy_m != null ? engineState.actual_car.accuracy_m.toFixed(1) : '2.5'}</span>
                <span className="text-xs text-neutral-400">m</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">Signal Fix History</span>
              <div className="text-neutral-300 text-[11px]">
                {engineState.gps_fix_count} GPS epochs tracked
              </div>
            </div>

            <div className="pt-1 border-t border-white/5 flex justify-between text-[10px]">
              <span className="text-neutral-500">Environment:</span>
              <span className={engineState.is_blackout_active ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {engineState.is_blackout_active ? 'Urban Canyon / Tunnel' : 'Clear Sky Open Air'}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: 🤖 AI MODE */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5 font-sans">
              <Activity className="w-4 h-4 text-orange-400" />
              <span>AI Mode</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800 uppercase font-bold">
              {engineState.estimated_car?.motion_class || 'NORMAL'}
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">AI Speed Estimate</span>
              <div className="flex items-baseline gap-1 text-white font-bold text-base">
                <span>{(engineState.estimated_car ? engineState.estimated_car.speed_mps * 3.6 : 0).toFixed(1)}</span>
                <span className="text-xs text-neutral-400">km/h</span>
                <span className="text-[10px] text-neutral-500 ml-1">
                  ({engineState.estimated_car?.speed_mps != null ? engineState.estimated_car.speed_mps.toFixed(1) : '0.0'} m/s)
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">Gyro Yaw Rate (&omega;_z)</span>
              <div className="text-cyan-400 text-[11px] font-bold flex items-center justify-between">
                <span>
                  {engineState.current_sensor
                    ? `${(engineState.current_sensor.gyro_z_rad * (180 / Math.PI)).toFixed(2)} °/s`
                    : '0.00 °/s'}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-mono">
                  {(engineState.heading_stability?.heading_stability_pct ?? 95).toFixed(0)}% Stable
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-white/5 flex justify-between text-[10px]">
              <span className="text-neutral-500">Acceleration a_x:</span>
              <span className="text-neutral-300">
                {engineState.current_sensor ? `${engineState.current_sensor.accel_x_mps2.toFixed(2)} m/s²` : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: 🟢 CONFIDENCE */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5 font-sans">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Confidence</span>
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                (engineState.estimated_car?.confidence_pct || 85) >= 70
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/80 text-amber-400 border-amber-800'
              }`}
            >
              {engineState.estimated_car?.confidence_pct || 85}% TRUST
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">2-&sigma; Uncertainty Radius</span>
              <div className="flex items-baseline gap-1 text-white font-bold text-base">
                <span>&plusmn;{engineState.estimated_car?.uncertainty_2sigma_m != null ? engineState.estimated_car.uncertainty_2sigma_m.toFixed(1) : '2.0'}</span>
                <span className="text-xs text-neutral-400">m</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-neutral-500 block uppercase">Driver Advisory</span>
              <div className="text-neutral-300 text-[11px]">
                {engineState.is_blackout_active
                  ? 'Active Dead-Reckoning. Trust bounds holding.'
                  : 'GNSS Lock active. Fusion stable.'}
              </div>
            </div>

            <div className="pt-1 border-t border-white/5 flex justify-between text-[10px]">
              <span className="text-neutral-500">HCI Status:</span>
              <span className="text-emerald-400 font-semibold">Reliable</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. HEADING STABILITY & SENSOR BIAS OVER TIME HUD */}
      <div className="bg-[#0f0f0f] border border-cyan-500/25 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Heading Stability &amp; Gyroscope Bias HUD</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border uppercase ${
                    engineState.heading_stability.stability_grade === 'EXCELLENT'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : engineState.heading_stability.stability_grade === 'GOOD'
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                      : engineState.heading_stability.stability_grade === 'MODERATE'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
                  }`}
                >
                  {engineState.heading_stability.stability_grade}
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                Real-time MEMS Gyroscope Zero-Offset &amp; Thermal Drift Tracker (&omega;_z &bull; &plusmn;0.10&deg;/s target band)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] border font-semibold flex items-center gap-1.5 ${
                engineState.heading_stability.is_stationary
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                  : 'bg-neutral-900 text-neutral-400 border-white/10'
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>{engineState.heading_stability.is_stationary ? 'ZUPT Stationary Lock' : 'Dynamic Cruise Debiasing'}</span>
            </span>
          </div>
        </div>

        {/* Main Grid: Left Indicator + Right Bias Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column (5 cols): Heading Stability Indicator & Key Metrics */}
          <div className="lg:col-span-5 bg-[#141414] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold">
                  Heading Stability Index
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  Target: &gt; 85%
                </span>
              </div>

              {/* Big Score Counter */}
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={engineState.heading_stability.heading_stability_pct.toFixed(1)}
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 1 }}
                  className={`text-4xl font-extrabold font-mono ${
                    engineState.heading_stability.heading_stability_pct >= 85
                      ? 'text-emerald-400'
                      : engineState.heading_stability.heading_stability_pct >= 70
                      ? 'text-cyan-400'
                      : engineState.heading_stability.heading_stability_pct >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {engineState.heading_stability.heading_stability_pct.toFixed(1)}
                </motion.span>
                <span className="text-xl font-bold text-neutral-400 font-mono">%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden my-2.5">
                <motion.div
                  className={`h-full rounded-full ${
                    engineState.heading_stability.heading_stability_pct >= 85
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                      : engineState.heading_stability.heading_stability_pct >= 70
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      : engineState.heading_stability.heading_stability_pct >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-rose-500'
                  }`}
                  initial={false}
                  animate={{ width: `${engineState.heading_stability.heading_stability_pct}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                />
              </div>
            </div>

            {/* Sub-Metrics 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Estimated Sensor Bias</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {engineState.heading_stability.estimated_bias_deg_s > 0 ? '+' : ''}
                  {engineState.heading_stability.estimated_bias_deg_s.toFixed(3)}&deg;/s
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  ({(engineState.heading_stability.estimated_bias_rad_s * 1000).toFixed(2)} mrad/s)
                </span>
              </div>

              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Bias Drift Rate</span>
                <span className={`font-bold text-sm ${
                  Math.abs(engineState.heading_stability.bias_drift_rate_deg_min) < 0.5
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {engineState.heading_stability.bias_drift_rate_deg_min.toFixed(2)}&deg;/min
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  Limit: &lt;0.50&deg;/min
                </span>
              </div>

              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Yaw Rate Debiasing</span>
                <span className="text-neutral-200 font-bold text-xs">
                  {engineState.heading_stability.raw_yaw_rate_deg_s.toFixed(1)}&deg;/s
                  <span className="text-cyan-400 mx-1">&rarr;</span>
                  {engineState.heading_stability.compensated_yaw_rate_deg_s.toFixed(1)}&deg;/s
                </span>
                <span className="text-[9px] text-neutral-500 block">Raw &rarr; Compensated</span>
              </div>

              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[10px] text-neutral-500 block uppercase">Allan Noise Floor</span>
                <span className="text-purple-300 font-bold text-sm">
                  {engineState.heading_stability.angular_random_walk_est.toFixed(2)}
                </span>
                <span className="text-[9px] text-neutral-500 block">&deg;/&radic;hr (Random Walk)</span>
              </div>
            </div>

            {/* Advisory diagnosis text */}
            <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-200 font-mono">
              {engineState.heading_stability.advisory_text}
            </div>
          </div>

          {/* Right Column (7 cols): Sensor Bias Over Time Visualizer Canvas */}
          <div className="lg:col-span-7 bg-[#141414] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Sensor Bias Over Time (&omega;_z &bull; &deg;/s)
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                Window: 12-15s &bull; Rate: 10 Hz
              </span>
            </div>

            <SensorBiasTimeline stability={engineState.heading_stability} />

            <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 bg-emerald-500/30 border border-emerald-500/60 rounded-xs" />
                  <span>Stability Band (&plusmn;0.10&deg;/s)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
                  <span>Estimated Bias &Delta;b_g</span>
                </span>
              </div>
              <span className="text-cyan-300">
                Current: {engineState.heading_stability.estimated_bias_deg_s > 0 ? '+' : ''}
                {engineState.heading_stability.estimated_bias_deg_s.toFixed(3)}&deg;/s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DUAL-TRAJECTORY LIVE VISUAL MAP CANVAS */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">
              Live Trajectory &amp; Real-time Drift Deviation Map
            </h3>
          </div>

          {/* Map Type Switcher: OpenStreetMap vs Sensor Grid */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setMapDisplayType('osm')}
                className={`px-3 py-1 rounded-md font-bold font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  mapDisplayType === 'osm'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>OpenStreetMap</span>
              </button>
              <button
                onClick={() => setMapDisplayType('canvas')}
                className={`px-3 py-1 rounded-md font-bold font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  mapDisplayType === 'canvas'
                    ? 'bg-white/15 text-white font-extrabold shadow-sm border border-white/15'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Sensor Grid</span>
              </button>
            </div>

            {/* View Filter Buttons (Canvas only) */}
            {mapDisplayType === 'canvas' && (
              <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-white/10 text-xs">
                <button
                  onClick={() => setActiveViewMode('both')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    activeViewMode === 'both' ? 'bg-white/15 text-white font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => setActiveViewMode('actual')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    activeViewMode === 'actual' ? 'bg-emerald-600/30 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Actual
                </button>
                <button
                  onClick={() => setActiveViewMode('estimated')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    activeViewMode === 'estimated' ? 'bg-orange-600/30 text-orange-300 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Dead-Reckoning
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Viewport Rendering */}
        {mapDisplayType === 'osm' ? (
          <LiveTrajectoryOSMMap
            groundTruthPath={osmActualPath}
            fusionPath={osmEstimatedPath}
            rawINSPath={osmRawINSPath}
            actualCarPos={osmActualCarPos}
            actualHeadingDeg={engineState.actual_car?.heading_deg || 0}
            actualSpeedMps={engineState.actual_car?.speed_mps || 0}
            estimatedCarPos={osmEstimatedCarPos}
            estimatedHeadingDeg={engineState.estimated_car?.heading_deg || 0}
            estimatedSpeedMps={engineState.estimated_car?.speed_mps || 0}
            driftErrorM={engineState.drift.ai_drift_error_m}
            isInBlackout={engineState.is_blackout_active}
            uncertaintyRadiusM={Math.max(1.5, engineState.drift.ai_drift_error_m * 0.4)}
            height="360px"
          />
        ) : (
          <>
            {/* Trajectory Canvas */}
            <div className="w-full rounded-xl overflow-hidden border border-white/10 bg-[#080808]">
              <canvas ref={canvasRef} className="w-full h-[340px] block" />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono text-neutral-400 border-t border-white/5">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span>Actual Car Position (GPS Ground Truth)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-orange-500 rounded-full" />
                  <span>AI Dead Reckoning (Gyro + Speed)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-rose-500/60 border-b border-dashed border-rose-500" />
                  <span>Raw INS Divergence</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] text-neutral-500">
                  Drift Vector connects actual car to dead-reckoning position in real time.
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Phone Gyro & Drift CLI Terminal Console */}
      <DriftCLITerminal
        engineState={engineState}
        onSimulateDrive={handleStartSim}
        onInjectBlackout={handleToggleBlackout}
      />
    </div>
  );
};
