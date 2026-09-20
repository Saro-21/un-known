/**
 * DrifX (AIDR-X) - Simulation & Trajectory Canvas
 *
 * Visualizes:
 * - Ground Truth trajectory (emerald line)
 * - Raw INS cubic drift trajectory (crimson dashed)
 * - DrifX (AIDR-X) factor-graph fusion trajectory (cyan solid)
 * - 2-sigma Calibrated Uncertainty Ellipse
 * - Offline OSM road corridors & multi-hypothesis snapping
 * - Injected tunnel blackout zones (amber shaded)
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Compass, Layers, Map } from 'lucide-react';
import { NavigationState, RoadHypothesis, RawIOVNBDRecord } from '../types/drifx';
import { OFFLINE_ROAD_GRAPH } from '../core/roadGraph';
import { enuToGeodetic } from '../core/iovnbdLoader';
import { LiveTrajectoryOSMMap } from './LiveTrajectoryOSMMap';

interface SimulationCanvasProps {
  groundTruthPath: [number, number][]; // [east, north]
  rawINSPath: [number, number][];       // [east, north]
  fusionPath: [number, number][];      // [east, north]
  currentState: NavigationState | null;
  currentStepIndex: number;
  totalSteps: number;
  onSeek: (step: number) => void;
  blackoutSegments: { startIdx: number; endIdx: number }[];
  hypotheses: RoadHypothesis[];
  rawRecords?: RawIOVNBDRecord[];
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  groundTruthPath,
  rawINSPath,
  fusionPath,
  currentState,
  currentStepIndex,
  totalSteps,
  onSeek,
  blackoutSegments,
  hypotheses,
  rawRecords = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // View mode: OpenStreetMap Live Trajectory vs Cartesian Canvas
  const [viewMode, setViewMode] = useState<'osm' | 'canvas'>('osm');

  // Convert ENU trajectories to WGS84 Geodetic for OpenStreetMap
  const { groundTruthGeo, fusionGeo, rawINSGeo, currentPosGeo } = useMemo(() => {
    if (!rawRecords || rawRecords.length === 0) {
      const baseLat = 37.7925;
      const baseLon = -122.4014;
      const baseAlt = 15.0;
      const gt = groundTruthPath.map(([e, n]) => {
        const [lat, lon] = enuToGeodetic(e, n, 0, baseLat, baseLon, baseAlt);
        return [lat, lon] as [number, number];
      });
      const fu = fusionPath.map(([e, n]) => {
        const [lat, lon] = enuToGeodetic(e, n, 0, baseLat, baseLon, baseAlt);
        return [lat, lon] as [number, number];
      });
      const raw = rawINSPath.map(([e, n]) => {
        const [lat, lon] = enuToGeodetic(e, n, 0, baseLat, baseLon, baseAlt);
        return [lat, lon] as [number, number];
      });
      const cur = currentState
        ? enuToGeodetic(currentState.position_enu[0], currentState.position_enu[1], 0, baseLat, baseLon, baseAlt)
        : gt[0] || [baseLat, baseLon];
      return {
        groundTruthGeo: gt,
        fusionGeo: fu,
        rawINSGeo: raw,
        currentPosGeo: [cur[0], cur[1]] as [number, number],
      };
    }

    const r0 = rawRecords[0];
    const baseLat = r0.gps_lat;
    const baseLon = r0.gps_lon;
    const baseAlt = r0.gps_alt;

    const gt = rawRecords.map((r) => [r.gps_lat, r.gps_lon] as [number, number]);
    const fu = fusionPath.map(([e, n]) => {
      const [lat, lon] = enuToGeodetic(e, n, 0, baseLat, baseLon, baseAlt);
      return [lat, lon] as [number, number];
    });
    const raw = rawINSPath.map(([e, n]) => {
      const [lat, lon] = enuToGeodetic(e, n, 0, baseLat, baseLon, baseAlt);
      return [lat, lon] as [number, number];
    });

    let cur: [number, number] = [r0.gps_lat, r0.gps_lon];
    if (currentState) {
      const [lat, lon] = enuToGeodetic(currentState.position_enu[0], currentState.position_enu[1], 0, baseLat, baseLon, baseAlt);
      cur = [lat, lon];
    } else if (rawRecords[currentStepIndex]) {
      cur = [rawRecords[currentStepIndex].gps_lat, rawRecords[currentStepIndex].gps_lon];
    }

    return {
      groundTruthGeo: gt,
      fusionGeo: fu,
      rawINSGeo: raw,
      currentPosGeo: cur,
    };
  }, [rawRecords, groundTruthPath, fusionPath, rawINSPath, currentState, currentStepIndex]);

  // Viewport transform state
  const [scale, setScale] = useState<number>(0.12);
  const [panX, setPanX] = useState<number>(250);
  const [panY, setPanY] = useState<number>(300);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showRawINS, setShowRawINS] = useState<boolean>(true);

  // Drag pan
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 480;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Calculate current viewport offset
    let curPanX = panX;
    let curPanY = panY;

    // Auto-center follow vehicle if enabled (without triggering setState loop)
    if (autoFollow && currentState) {
      const vehE = currentState.position_enu[0];
      const vehN = currentState.position_enu[1];
      curPanX = width / 2 - vehE * scale;
      curPanY = height / 2 + vehN * scale; // invert Y for Cartesian North
    }

    // World-to-screen coordinate converter
    const toScreen = (east: number, north: number): [number, number] => {
      const sx = curPanX + east * scale;
      const sy = curPanY - north * scale; // Invert north to screen Y
      return [sx, sy];
    };

    // 1. Clear background (Elegant pitch dark)
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw coordinate grid (Subtle technical crosshairs/lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridStepM = 200;
    const minEast = -1000;
    const maxEast = 6000;
    const minNorth = -1000;
    const maxNorth = 9000;

    for (let e = minEast; e <= maxEast; e += gridStepM) {
      const [sx0, sy0] = toScreen(e, minNorth);
      const [sx1, sy1] = toScreen(e, maxNorth);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
    }
    for (let n = minNorth; n <= maxNorth; n += gridStepM) {
      const [sx0, sy0] = toScreen(minEast, n);
      const [sx1, sy1] = toScreen(maxEast, n);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
    }

    // 3. Draw Offline Road Network Graph (Subdued dark corridors)
    if (showRoads) {
      ctx.strokeStyle = '#1e1e1e';
      ctx.lineWidth = 6 * scale * 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const way of OFFLINE_ROAD_GRAPH.ways) {
        const nodes = way.nodeIds.map((id) => OFFLINE_ROAD_GRAPH.nodes[id]).filter(Boolean);
        if (nodes.length < 2) continue;

        ctx.beginPath();
        const [x0, y0] = toScreen(nodes[0].east, nodes[0].north);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < nodes.length; i++) {
          const [xi, yi] = toScreen(nodes[i].east, nodes[i].north);
          ctx.lineTo(xi, yi);
        }
        ctx.stroke();
      }
    }

    // 4. Draw Blackout / Tunnel Shaded Zones on Trajectory (Technical amber/orange)
    for (const b of blackoutSegments) {
      if (b.startIdx < groundTruthPath.length && b.endIdx < groundTruthPath.length) {
        ctx.strokeStyle = 'rgba(242, 125, 38, 0.25)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        const [sx0, sy0] = toScreen(groundTruthPath[b.startIdx][0], groundTruthPath[b.startIdx][1]);
        ctx.moveTo(sx0, sy0);
        for (let j = b.startIdx + 1; j <= b.endIdx; j++) {
          const [sx, sy] = toScreen(groundTruthPath[j][0], groundTruthPath[j][1]);
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    }

    // 5. Draw Ground Truth Trajectory (Precision Emerald Green)
    if (groundTruthPath.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const [x0, y0] = toScreen(groundTruthPath[0][0], groundTruthPath[0][1]);
      ctx.moveTo(x0, y0);
      for (let i = 1; i < groundTruthPath.length; i++) {
        const [xi, yi] = toScreen(groundTruthPath[i][0], groundTruthPath[i][1]);
        ctx.lineTo(xi, yi);
      }
      ctx.stroke();
    }

    // 6. Draw Raw INS Trajectory (Crimson Red, Dotted Drift)
    if (showRawINS && rawINSPath.length > 1) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const [rx0, ry0] = toScreen(rawINSPath[0][0], rawINSPath[0][1]);
      ctx.moveTo(rx0, ry0);
      for (let i = 1; i < rawINSPath.length; i++) {
        const [rxi, ryi] = toScreen(rawINSPath[i][0], rawINSPath[i][1]);
        ctx.lineTo(rxi, ryi);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 7. Draw DrifX (AIDR-X) Fusion Trajectory (Vivid Technical Orange)
    if (fusionPath.length > 1) {
      ctx.strokeStyle = '#F27D26';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const [fx0, fy0] = toScreen(fusionPath[0][0], fusionPath[0][1]);
      ctx.moveTo(fx0, fy0);
      for (let i = 1; i < fusionPath.length; i++) {
        const [fxi, fyi] = toScreen(fusionPath[i][0], fusionPath[i][1]);
        ctx.lineTo(fxi, fyi);
      }
      ctx.stroke();
    }

    // 8. Draw Multi-Hypothesis Road Particles & Snaps
    for (const hypo of hypotheses) {
      const [px, py] = toScreen(hypo.projected_point[0], hypo.projected_point[1]);
      // Projection marker
      ctx.fillStyle = hypo.is_collapsed ? '#a855f7' : '#6366f1';
      ctx.beginPath();
      ctx.arc(px, py, 4 + hypo.weight * 5, 0, Math.PI * 2);
      ctx.fill();

      // Dashed line from vehicle to road projection
      if (currentState) {
        const [vx, vy] = toScreen(currentState.position_enu[0], currentState.position_enu[1]);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 9. Draw Current Vehicle Marker & Calibrated Uncertainty Ellipse
    if (currentState) {
      const [vx, vy] = toScreen(currentState.position_enu[0], currentState.position_enu[1]);

      // 2-Sigma Uncertainty Ellipse (East Std, North Std)
      const radE = Math.max(8, currentState.pos_std_m[0] * 2 * scale);
      const radN = Math.max(8, currentState.pos_std_m[1] * 2 * scale);

      ctx.fillStyle = currentState.is_in_blackout
        ? 'rgba(242, 125, 38, 0.16)'
        : 'rgba(0, 229, 255, 0.12)';
      ctx.strokeStyle = currentState.is_in_blackout
        ? 'rgba(242, 125, 38, 0.85)'
        : 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.ellipse(vx, vy, radE, radN, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vehicle Directional Heading Arrow & Chevron
      const headingRad = currentState.heading_rad;
      const arrowLen = 24;
      const ax = vx + Math.sin(headingRad) * arrowLen;
      const ay = vy - Math.cos(headingRad) * arrowLen;
      const wingLen = 9;
      const wingAngle = Math.PI * 0.75;
      const wingLx = ax + Math.sin(headingRad - wingAngle) * wingLen;
      const wingLy = ay - Math.cos(headingRad - wingAngle) * wingLen;
      const wingRx = ax + Math.sin(headingRad + wingAngle) * wingLen;
      const wingRy = ay - Math.cos(headingRad + wingAngle) * wingLen;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      ctx.fillStyle = '#F27D26';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(wingLx, wingLy);
      ctx.lineTo(ax - Math.sin(headingRad) * 3.5, ay + Math.cos(headingRad) * 3.5);
      ctx.lineTo(wingRx, wingRy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center vehicle pin (Technical Orange)
      ctx.fillStyle = '#F27D26';
      ctx.beginPath();
      ctx.arc(vx, vy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [
    groundTruthPath,
    rawINSPath,
    fusionPath,
    currentState,
    scale,
    panX,
    panY,
    autoFollow,
    showRoads,
    showRawINS,
    blackoutSegments,
    hypotheses,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (autoFollow && currentState) {
      const canvas = canvasRef.current;
      const width = canvas?.parentElement?.clientWidth || 800;
      const height = 480;
      const vehE = currentState.position_enu[0];
      const vehN = currentState.position_enu[1];
      setPanX(width / 2 - vehE * scale);
      setPanY(height / 2 + vehN * scale);
    }
    setAutoFollow(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setPanX((prev) => prev + dx);
    setPanY((prev) => prev + dy);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col space-y-3 p-4">
      {/* Top View Selector & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#141414] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('osm')}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'osm'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg font-extrabold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>OpenStreetMap Live</span>
          </button>
          <button
            onClick={() => setViewMode('canvas')}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'canvas'
                ? 'bg-white/15 text-white font-extrabold shadow-md border border-white/15'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Cartesian Canvas</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
            <span>Ground Truth</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
            <span>AIDR-X Fusion</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Raw INS Drift</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Blackout Zone</span>
          </div>
        </div>

        {/* Canvas-specific controls (shown in canvas mode) */}
        {viewMode === 'canvas' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowRawINS((v) => !v)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                showRawINS
                  ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                  : 'bg-[#1a1a1a] border-white/10 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Raw INS: {showRawINS ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowRoads((v) => !v)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                showRoads
                  ? 'bg-purple-950/50 border-purple-800 text-purple-300'
                  : 'bg-[#1a1a1a] border-white/10 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Roads: {showRoads ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setAutoFollow((v) => !v)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                autoFollow
                  ? 'bg-orange-950/50 border-orange-800 text-orange-300'
                  : 'bg-[#1a1a1a] border-white/10 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Track: {autoFollow ? 'AUTO' : 'MANUAL'}
            </button>
            <div className="flex items-center bg-[#1a1a1a] rounded p-0.5 border border-white/10">
              <button
                onClick={() => setScale((s) => Math.min(0.5, s * 1.25))}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-300 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setScale((s) => Math.max(0.04, s * 0.8))}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-300 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: OPENSTREETMAP LIVE TRAJECTORY */}
      {viewMode === 'osm' ? (
        <LiveTrajectoryOSMMap
          groundTruthPath={groundTruthGeo}
          fusionPath={fusionGeo}
          rawINSPath={rawINSGeo}
          blackoutSegments={blackoutSegments}
          currentPos={currentPosGeo}
          currentHeadingDeg={currentState?.heading_deg ?? (rawRecords?.[currentStepIndex]?.gps_bearing_deg || 0)}
          currentSpeedMps={currentState?.speed_mps ?? (rawRecords?.[currentStepIndex]?.gps_speed_mps || 0)}
          isInBlackout={currentState?.is_in_blackout ?? false}
          uncertaintyRadiusM={currentState?.uncertainty_envelope?.radius_2sigma_m ?? 2.0}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onSeek={onSeek}
          height="520px"
        />
      ) : (
        /* VIEW MODE 2: CARTESIAN PRECISION CANVAS */
        <div className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#080808]">
          <div
            className="relative w-full h-[480px] cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Live Overlay: Mode Badge */}
            {currentState && (
              <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-xl flex items-center gap-2 border backdrop-blur-md ${
                    currentState.is_in_blackout
                      ? 'bg-[#0f0f0f]/95 text-orange-400 border-orange-500/60 animate-pulse'
                      : currentState.gnss_recovered_recently
                      ? 'bg-[#0f0f0f]/95 text-cyan-400 border-cyan-500/60'
                      : 'bg-[#0f0f0f]/95 text-emerald-400 border-emerald-500/60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>
                    {currentState.is_in_blackout
                      ? 'TUNNEL BLACKOUT: AI DEAD-RECKONING ACTIVE'
                      : currentState.gnss_recovered_recently
                      ? 'GNSS RECOVERY: INNOVATION GATING ACTIVE'
                      : 'GNSS HEALTHY (3D FIX)'}
                  </span>
                </div>

                {currentState.collapsed_road_name && (
                  <div className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#0f0f0f]/95 text-purple-300 border border-purple-800/60 backdrop-blur-md">
                    Map-Matched: {currentState.collapsed_road_name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seek Timeline */}
          <div className="p-3 bg-[#0a0a0a] border-t border-white/10 flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-400 w-16">
              {(currentStepIndex * 0.1).toFixed(1)}s
            </span>
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentStepIndex}
              onChange={(e) => onSeek(parseInt(e.target.value))}
              className="flex-1 accent-orange-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
            <span className="text-xs font-mono text-neutral-400 w-16 text-right">
              {(totalSteps * 0.1).toFixed(1)}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
