/**
 * DrifX (AIDR-X) - OpenStreetMap Live Trajectory Map Component
 *
 * Renders real OpenStreetMap tiles (Standard OSM, Carto Dark Matter, Voyager)
 * and overlays live kinematic telemetry:
 * - Ground Truth path (Emerald)
 * - AIDR-X Factor Graph / AI Dead Reckoning path (Cyan / Orange)
 * - Raw INS divergence path (Crimson dashed)
 * - Tunnel GNSS blackout zones (Amber highlight corridors)
 * - Live Vehicle marker with orientation arrow and 2-sigma uncertainty circle
 * - Dual-vehicle mode (Actual Car vs AI Dead-Reckoned Car + Drift vector)
 * - Auto-follow tracking, fit route bounds, and map style switcher
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  MapPin,
  AlertTriangle,
  Radio,
  Car,
  Eye,
  EyeOff,
  Navigation,
} from 'lucide-react';

export type OSMMapStyle = 'dark' | 'standard' | 'voyager';

export interface LiveTrajectoryOSMMapProps {
  // Ground truth positions in [lat, lon]
  groundTruthPath?: [number, number][];
  // AIDR-X Fusion / Dead Reckoning positions in [lat, lon]
  fusionPath?: [number, number][];
  // Raw INS divergence positions in [lat, lon]
  rawINSPath?: [number, number][];
  // Blackout spans
  blackoutSegments?: { startIdx: number; endIdx: number }[];
  // Single vehicle state (e.g. Simulation tab)
  currentPos?: [number, number] | null; // [lat, lon]
  currentHeadingDeg?: number;
  currentSpeedMps?: number;
  isInBlackout?: boolean;
  uncertaintyRadiusM?: number;
  // Dual vehicle state (e.g. PhoneSensorHCI tab)
  actualCarPos?: [number, number] | null;
  actualHeadingDeg?: number;
  actualSpeedMps?: number;
  estimatedCarPos?: [number, number] | null;
  estimatedHeadingDeg?: number;
  estimatedSpeedMps?: number;
  driftErrorM?: number;
  // Timeline scrubber
  currentStepIndex?: number;
  totalSteps?: number;
  onSeek?: (step: number) => void;
  // Container styling
  height?: string;
  defaultFollow?: boolean;
}

const TILE_SERVERS: Record<OSMMapStyle, { url: string; attribution: string; subdomains?: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    subdomains: 'abcd',
  },
  standard: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    subdomains: 'abcd',
  },
};

export const LiveTrajectoryOSMMap: React.FC<LiveTrajectoryOSMMapProps> = ({
  groundTruthPath = [],
  fusionPath = [],
  rawINSPath = [],
  blackoutSegments = [],
  currentPos,
  currentHeadingDeg = 0,
  currentSpeedMps = 0,
  isInBlackout = false,
  uncertaintyRadiusM = 2.0,
  actualCarPos,
  actualHeadingDeg = 0,
  actualSpeedMps = 0,
  estimatedCarPos,
  estimatedHeadingDeg = 0,
  estimatedSpeedMps = 0,
  driftErrorM = 0,
  currentStepIndex,
  totalSteps,
  onSeek,
  height = '480px',
  defaultFollow = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups
  const groundTruthLayerRef = useRef<L.Polyline | null>(null);
  const fusionLayerRef = useRef<L.Polyline | null>(null);
  const rawINSLayerRef = useRef<L.Polyline | null>(null);
  const blackoutLayersRef = useRef<L.Polyline[]>([]);
  const driftVectorLineRef = useRef<L.Polyline | null>(null);

  // Markers
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const actualCarMarkerRef = useRef<L.Marker | null>(null);
  const estimatedCarMarkerRef = useRef<L.Marker | null>(null);
  const uncertaintyCircleRef = useRef<L.Circle | null>(null);

  // UI state
  const [mapStyle, setMapStyle] = useState<OSMMapStyle>('dark');
  const [autoFollow, setAutoFollow] = useState<boolean>(defaultFollow);
  const [showGroundTruth, setShowGroundTruth] = useState<boolean>(true);
  const [showFusion, setShowFusion] = useState<boolean>(true);
  const [showRawINS, setShowRawINS] = useState<boolean>(true);
  const [showBlackouts, setShowBlackouts] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [initialBoundsFitted, setInitialBoundsFitted] = useState<boolean>(false);

  // Find an initial center coordinate
  const initialCenter = useMemo<[number, number]>(() => {
    if (currentPos && !isNaN(currentPos[0]) && !isNaN(currentPos[1])) return currentPos;
    if (actualCarPos && !isNaN(actualCarPos[0]) && !isNaN(actualCarPos[1])) return actualCarPos;
    if (estimatedCarPos && !isNaN(estimatedCarPos[0]) && !isNaN(estimatedCarPos[1])) return estimatedCarPos;
    if (groundTruthPath.length > 0) return groundTruthPath[0];
    return [37.7749, -122.4194]; // San Francisco Default
  }, []);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom attribution control in bottom right
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '<span class="text-[10px] text-neutral-400 font-mono">OpenStreetMap</span>',
      })
      .addTo(map);

    // Add Base Tile Layer
    const serverConfig = TILE_SERVERS[mapStyle];
    const tileLayer = L.tileLayer(serverConfig.url, {
      maxZoom: 19,
      attribution: serverConfig.attribution,
      subdomains: serverConfig.subdomains || 'abc',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // Handle initial resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Disable auto-follow when user manually drags or zooms
    map.on('dragstart', () => setAutoFollow(false));

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Handle Map Style Switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const serverConfig = TILE_SERVERS[mapStyle];
    const newTileLayer = L.tileLayer(serverConfig.url, {
      maxZoom: 19,
      attribution: serverConfig.attribution,
      subdomains: serverConfig.subdomains || 'abc',
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [mapStyle]);

  // 3. Handle Container Resizing via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [isFullscreen]);

  // 4. Update Polylines (Ground Truth, Fusion, Raw INS, Blackout zones)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // A. Ground Truth Polyline
    if (groundTruthLayerRef.current) {
      map.removeLayer(groundTruthLayerRef.current);
      groundTruthLayerRef.current = null;
    }
    if (showGroundTruth && groundTruthPath.length > 1) {
      const line = L.polyline(groundTruthPath, {
        color: '#10b981', // Emerald
        weight: 4,
        opacity: 0.85,
        smoothFactor: 1.0,
      }).addTo(map);
      groundTruthLayerRef.current = line;
    }

    // B. AIDR-X Fusion Polyline
    if (fusionLayerRef.current) {
      map.removeLayer(fusionLayerRef.current);
      fusionLayerRef.current = null;
    }
    if (showFusion && fusionPath.length > 1) {
      const line = L.polyline(fusionPath, {
        color: '#06b6d4', // Cyan
        weight: 3.5,
        opacity: 0.9,
        smoothFactor: 1.0,
      }).addTo(map);
      fusionLayerRef.current = line;
    }

    // C. Raw INS Divergence Polyline
    if (rawINSLayerRef.current) {
      map.removeLayer(rawINSLayerRef.current);
      rawINSLayerRef.current = null;
    }
    if (showRawINS && rawINSPath.length > 1) {
      const line = L.polyline(rawINSPath, {
        color: '#ef4444', // Red
        weight: 2.5,
        opacity: 0.65,
        dashArray: '6, 6',
      }).addTo(map);
      rawINSLayerRef.current = line;
    }

    // D. Blackout / Tunnel Zone Highlights
    for (const bLayer of blackoutLayersRef.current) {
      map.removeLayer(bLayer);
    }
    blackoutLayersRef.current = [];

    if (showBlackouts && blackoutSegments.length > 0 && groundTruthPath.length > 0) {
      for (const seg of blackoutSegments) {
        if (seg.startIdx < groundTruthPath.length && seg.endIdx < groundTruthPath.length) {
          const slice = groundTruthPath.slice(seg.startIdx, seg.endIdx + 1);
          if (slice.length > 1) {
            const bLine = L.polyline(slice, {
              color: '#f59e0b',
              weight: 12,
              opacity: 0.35,
              lineCap: 'round',
            }).addTo(map);
            blackoutLayersRef.current.push(bLine);
          }
        }
      }
    }

    // Fit bounds on first load if we have a path
    if (!initialBoundsFitted && groundTruthPath.length > 2) {
      try {
        const bounds = L.latLngBounds(groundTruthPath);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        setInitialBoundsFitted(true);
      } catch (err) {
        // Safe fallback
      }
    }
  }, [groundTruthPath, fusionPath, rawINSPath, blackoutSegments, showGroundTruth, showFusion, showRawINS, showBlackouts]);

  // 5. Update Single Vehicle Marker & Uncertainty Ellipse (Simulation View)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentPos || isNaN(currentPos[0]) || isNaN(currentPos[1])) {
      if (vehicleMarkerRef.current) {
        map.removeLayer(vehicleMarkerRef.current);
        vehicleMarkerRef.current = null;
      }
      if (uncertaintyCircleRef.current) {
        map.removeLayer(uncertaintyCircleRef.current);
        uncertaintyCircleRef.current = null;
      }
      return;
    }

    const heading = currentHeadingDeg;
    const speedKmh = (currentSpeedMps * 3.6).toFixed(0);

    // Custom HTML DivIcon with rotated arrow and pulsing status
    const iconHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 44px; height: 44px;">
        <!-- Pulsing aura ring -->
        <div class="absolute inset-0 rounded-full animate-ping opacity-40 ${
          isInBlackout ? 'bg-amber-500' : 'bg-emerald-500'
        }"></div>
        
        <!-- Outer Halo ring -->
        <div class="absolute inset-1 rounded-full border ${
          isInBlackout
            ? 'border-amber-400/80 bg-amber-950/70'
            : 'border-emerald-400/80 bg-emerald-950/70'
        } shadow-lg backdrop-blur-xs flex items-center justify-center">
          
          <!-- Directional Arrow rotated to heading -->
          <div style="transform: rotate(${heading}deg); transition: transform 0.15s ease-out;" class="flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${
              isInBlackout ? '#fbbf24' : '#34d399'
            }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2" fill="${
                isInBlackout ? '#d97706' : '#059669'
              }" />
            </svg>
          </div>
        </div>

        <!-- Mini Speed Badge -->
        <div class="absolute -bottom-2 bg-black/90 text-white font-mono text-[9px] px-1 py-0.2 rounded border border-white/20 whitespace-nowrap">
          ${speedKmh} km/h
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-osm-vehicle-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (!vehicleMarkerRef.current) {
      const marker = L.marker(currentPos, { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(`
        <div class="font-mono text-xs p-1 space-y-1 text-neutral-200">
          <div class="font-bold text-white flex items-center gap-1.5 border-b border-white/10 pb-1">
            <span class="w-2 h-2 rounded-full ${isInBlackout ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
            <span>${isInBlackout ? 'GNSS Blackout: AI Active' : 'GNSS Fix: Healthy'}</span>
          </div>
          <div>Speed: <strong class="text-white">${speedKmh} km/h</strong> (${currentSpeedMps.toFixed(1)} m/s)</div>
          <div>Heading: <strong class="text-white">${heading.toFixed(1)}&deg;</strong></div>
          <div>Coords: [${currentPos[0].toFixed(5)}, ${currentPos[1].toFixed(5)}]</div>
        </div>
      `, { className: 'custom-osm-dark-popup' });
      vehicleMarkerRef.current = marker;
    } else {
      vehicleMarkerRef.current.setLatLng(currentPos);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    }

    // 2-Sigma Uncertainty Circle
    const radiusM = Math.max(2.5, uncertaintyRadiusM);
    if (!uncertaintyCircleRef.current) {
      const circle = L.circle(currentPos, {
        radius: radiusM,
        color: isInBlackout ? '#f59e0b' : '#06b6d4',
        fillColor: isInBlackout ? '#f59e0b' : '#06b6d4',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);
      uncertaintyCircleRef.current = circle;
    } else {
      uncertaintyCircleRef.current.setLatLng(currentPos);
      uncertaintyCircleRef.current.setRadius(radiusM);
      uncertaintyCircleRef.current.setStyle({
        color: isInBlackout ? '#f59e0b' : '#06b6d4',
        fillColor: isInBlackout ? '#f59e0b' : '#06b6d4',
      });
    }

    // Auto-center pan
    if (autoFollow) {
      map.panTo(currentPos, { animate: true, duration: 0.1 });
    }
  }, [currentPos, currentHeadingDeg, currentSpeedMps, isInBlackout, uncertaintyRadiusM, autoFollow]);

  // 6. Dual-Vehicle Tracking (Actual Car vs AI Dead-Reckoning Car for PhoneSensorHCI)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // A. Actual Car Marker (Emerald)
    if (actualCarPos && !isNaN(actualCarPos[0]) && !isNaN(actualCarPos[1])) {
      const actHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 38px; height: 38px;">
          <div class="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse"></div>
          <div class="absolute inset-1 rounded-full border border-emerald-400 bg-emerald-950/90 shadow-md flex items-center justify-center">
            <div style="transform: rotate(${actualHeadingDeg}deg); transition: transform 0.15s ease-out;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#10b981" stroke="#ffffff" stroke-width="1.5">
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
            </div>
          </div>
          <div class="absolute -bottom-2.5 bg-emerald-900/90 text-emerald-200 border border-emerald-400/50 font-mono text-[8px] font-bold px-1 rounded whitespace-nowrap">
            ACTUAL
          </div>
        </div>
      `;
      const actIcon = L.divIcon({ html: actHtml, className: 'act-car-icon', iconSize: [38, 38], iconAnchor: [19, 19] });
      if (!actualCarMarkerRef.current) {
        actualCarMarkerRef.current = L.marker(actualCarPos, { icon: actIcon, zIndexOffset: 950 }).addTo(map);
      } else {
        actualCarMarkerRef.current.setLatLng(actualCarPos);
        actualCarMarkerRef.current.setIcon(actIcon);
      }
    } else if (actualCarMarkerRef.current) {
      map.removeLayer(actualCarMarkerRef.current);
      actualCarMarkerRef.current = null;
    }

    // B. Estimated Dead-Reckoning Car Marker (Orange)
    if (estimatedCarPos && !isNaN(estimatedCarPos[0]) && !isNaN(estimatedCarPos[1])) {
      const estHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 38px; height: 38px;">
          <div class="absolute inset-0 rounded-full bg-orange-500/30 animate-ping"></div>
          <div class="absolute inset-1 rounded-full border border-orange-400 bg-orange-950/90 shadow-md flex items-center justify-center">
            <div style="transform: rotate(${estimatedHeadingDeg}deg); transition: transform 0.15s ease-out;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#f97316" stroke="#ffffff" stroke-width="1.5">
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
            </div>
          </div>
          <div class="absolute -bottom-2.5 bg-orange-900/90 text-orange-200 border border-orange-400/50 font-mono text-[8px] font-bold px-1 rounded whitespace-nowrap">
            AI DR
          </div>
        </div>
      `;
      const estIcon = L.divIcon({ html: estHtml, className: 'est-car-icon', iconSize: [38, 38], iconAnchor: [19, 19] });
      if (!estimatedCarMarkerRef.current) {
        estimatedCarMarkerRef.current = L.marker(estimatedCarPos, { icon: estIcon, zIndexOffset: 1000 }).addTo(map);
      } else {
        estimatedCarMarkerRef.current.setLatLng(estimatedCarPos);
        estimatedCarMarkerRef.current.setIcon(estIcon);
      }
    } else if (estimatedCarMarkerRef.current) {
      map.removeLayer(estimatedCarMarkerRef.current);
      estimatedCarMarkerRef.current = null;
    }

    // C. Drift Vector connecting Actual and Estimated Car
    if (
      actualCarPos &&
      estimatedCarPos &&
      !isNaN(actualCarPos[0]) &&
      !isNaN(estimatedCarPos[0])
    ) {
      const pts = [actualCarPos, estimatedCarPos];
      if (!driftVectorLineRef.current) {
        driftVectorLineRef.current = L.polyline(pts, {
          color: '#fbbf24',
          weight: 2,
          opacity: 0.9,
          dashArray: '4, 4',
        }).addTo(map);
      } else {
        driftVectorLineRef.current.setLatLngs(pts);
      }

      if (autoFollow) {
        const midLat = (actualCarPos[0] + estimatedCarPos[0]) / 2;
        const midLon = (actualCarPos[1] + estimatedCarPos[1]) / 2;
        map.panTo([midLat, midLon], { animate: true, duration: 0.1 });
      }
    } else if (driftVectorLineRef.current) {
      map.removeLayer(driftVectorLineRef.current);
      driftVectorLineRef.current = null;
    }
  }, [actualCarPos, actualHeadingDeg, estimatedCarPos, estimatedHeadingDeg, autoFollow]);

  // Fit all route bounds
  const handleFitRouteBounds = () => {
    const map = mapRef.current;
    if (!map) return;

    const allPts: [number, number][] = [];
    if (groundTruthPath.length > 0) allPts.push(...groundTruthPath);
    if (fusionPath.length > 0) allPts.push(...fusionPath);
    if (actualCarPos) allPts.push(actualCarPos);
    if (estimatedCarPos) allPts.push(estimatedCarPos);

    if (allPts.length > 0) {
      try {
        const bounds = L.latLngBounds(allPts);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
        setAutoFollow(false);
      } catch (err) {
        // Safe fallback
      }
    }
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const target = currentPos || actualCarPos || estimatedCarPos;
    if (target && !isNaN(target[0])) {
      map.setView(target, 17, { animate: true });
      setAutoFollow(true);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#080808] flex flex-col shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : ''
      }`}
      style={{ height: isFullscreen ? 'auto' : height }}
    >
      {/* 1. TOP FLOATING CONTROL BAR */}
      <div className="absolute top-3 left-3 right-3 z-400 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: OpenStreetMap Branding & Active Status */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-white/15 backdrop-blur-md flex items-center gap-2 shadow-xl">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>OpenStreetMap Live Trajectory</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-white/10 text-cyan-300 border border-white/10 uppercase">
              {mapStyle}
            </span>
          </div>

          {/* Status Chip */}
          {isInBlackout ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-300 text-xs font-mono font-bold backdrop-blur-md shadow-xl animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>TUNNEL BLACKOUT: DEAD RECKONING</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold backdrop-blur-md shadow-xl">
              <Radio className="w-3.5 h-3.5" />
              <span>3D GNSS LOCK</span>
            </div>
          )}
        </div>

        {/* Right: Interactive Toolbar Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-black/85 border border-white/15 p-1 rounded-xl backdrop-blur-md shadow-xl text-xs font-mono">
          {/* Base Layer Switcher */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mapStyle === 'dark' ? 'bg-orange-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Carto Dark OpenStreetMap"
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle('standard')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mapStyle === 'standard' ? 'bg-orange-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Standard OpenStreetMap"
            >
              OSM Standard
            </button>
            <button
              onClick={() => setMapStyle('voyager')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mapStyle === 'voyager' ? 'bg-orange-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Voyager Streets"
            >
              Voyager
            </button>
          </div>

          {/* Auto-Follow / Recenter */}
          <button
            onClick={handleRecenter}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              autoFollow
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
            }`}
            title={autoFollow ? 'Tracking Vehicle (Auto)' : 'Click to Recenter & Auto-Follow'}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Fit Route */}
          <button
            onClick={handleFitRouteBounds}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Fit Entire Route to Screen"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Buttons */}
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. LEAFLET MAP DOM CONTAINER */}
      <div ref={containerRef} className="w-full flex-1 min-h-[300px] z-10" />

      {/* 3. FLOATING TELEMETRY HUD CHIP (BOTTOM-LEFT) */}
      <div className="absolute bottom-14 left-3 z-400 pointer-events-none">
        <div className="bg-black/90 border border-white/15 p-2.5 rounded-xl backdrop-blur-md shadow-2xl flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center gap-3 text-neutral-300">
            <span>
              Speed:{' '}
              <strong className="text-white">
                {((currentSpeedMps || actualSpeedMps || estimatedSpeedMps) * 3.6).toFixed(0)} km/h
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Heading: <strong className="text-cyan-400">{(currentHeadingDeg || actualHeadingDeg || estimatedHeadingDeg).toFixed(0)}&deg;</strong>
            </span>
            {driftErrorM > 0 && (
              <>
                <span>&bull;</span>
                <span className="text-amber-400 font-bold">
                  Drift: {driftErrorM.toFixed(1)}m
                </span>
              </>
            )}
          </div>

          {/* Layer visibility toggles */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[10px] pointer-events-auto">
            <button
              onClick={() => setShowGroundTruth((v) => !v)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                showGroundTruth ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300' : 'bg-black/40 border-white/10 text-neutral-500'
              }`}
            >
              <span className="w-2 h-0.5 bg-emerald-400 rounded-full"></span>
              <span>Truth GPS</span>
            </button>
            <button
              onClick={() => setShowFusion((v) => !v)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                showFusion ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300' : 'bg-black/40 border-white/10 text-neutral-500'
              }`}
            >
              <span className="w-2 h-0.5 bg-cyan-400 rounded-full"></span>
              <span>AIDR-X Path</span>
            </button>
            <button
              onClick={() => setShowRawINS((v) => !v)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                showRawINS ? 'bg-rose-950/70 border-rose-600 text-rose-300' : 'bg-black/40 border-white/10 text-neutral-500'
              }`}
            >
              <span className="w-2 h-0.5 bg-rose-400 border-b border-dashed border-rose-400"></span>
              <span>Raw INS</span>
            </button>
            {blackoutSegments.length > 0 && (
              <button
                onClick={() => setShowBlackouts((v) => !v)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  showBlackouts ? 'bg-amber-950/70 border-amber-600 text-amber-300' : 'bg-black/40 border-white/10 text-neutral-500'
                }`}
              >
                <span className="w-2 h-1 bg-amber-500/40 rounded"></span>
                <span>Tunnels</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. TIMELINE SCRUBBER (WHEN ENABLED) */}
      {totalSteps && totalSteps > 0 && onSeek && currentStepIndex !== undefined && (
        <div className="p-3 bg-[#0a0a0a] border-t border-white/10 flex items-center gap-3 z-400">
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
      )}
    </div>
  );
};
