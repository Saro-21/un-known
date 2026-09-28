/**
 * Google Maps Settings Modal
 * DrifX Autonomous Navigation & Telematics Platform
 */

import React from 'react';
import {
  Map,
  Settings,
  Layers,
  Compass,
  Gauge,
  Eye,
  Check,
  X,
  ShieldCheck,
  ExternalLink,
  Car,
  RotateCw,
} from 'lucide-react';
import {
  GoogleMapsSettings,
  GoogleMapType,
  MapNavigationTheme,
} from '../types/googleMapsSettings';

interface GoogleMapsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GoogleMapsSettings;
  onUpdateSettings: (newSettings: Partial<GoogleMapsSettings>) => void;
}

export const GoogleMapsSettingsModal: React.FC<GoogleMapsSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const mapTypes: { id: GoogleMapType; label: string; desc: string }[] = [
    { id: 'roadmap', label: 'Vector Roadmap', desc: 'Standard high-definition vector street network' },
    { id: 'satellite', label: 'Satellite Imagery', desc: 'Photorealistic high-resolution orbital imagery' },
    { id: 'hybrid', label: 'Hybrid Satellite', desc: 'Satellite imagery overlaid with street names & borders' },
    { id: 'terrain', label: 'Topographic Terrain', desc: 'Elevation contours and natural physical relief' },
  ];

  const themes: { id: MapNavigationTheme; label: string; desc: string; color: string }[] = [
    { id: 'dark_cyberpunk', label: 'Dark Cockpit (Cyberpunk)', desc: 'Night HUD with glowing roads & dark waters', color: '#0d1117' },
    { id: 'midnight_blue', label: 'Midnight Ocean Blue', desc: 'Deep navy aesthetic optimized for reduced eye strain', color: '#0e1626' },
    { id: 'silver_high_contrast', label: 'Silver High-Contrast', desc: 'Monochrome minimal vector theme', color: '#dadada' },
    { id: 'google_standard', label: 'Google Maps Default', desc: 'Classic official Google Maps daytime palette', color: '#ffffff' },
    { id: 'retro_nav', label: 'Retro Warm Cartography', desc: 'Warm parchment sepia navigation theme', color: '#ebe3cd' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e1217] border border-orange-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-tight">
                  GOOGLE MAPS PLATFORM SETTINGS
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED API
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Configure Vector Rendering, Live Layers, Geolocation Sensors, and Map Theming
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-neutral-300 text-xs font-sans">
          {/* Section 1: Map Base Type */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-bold font-mono">
              <Map className="w-4 h-4 text-orange-400" />
              <span>Base Map Layer Type</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mapTypes.map((mt) => {
                const isSelected = settings.mapType === mt.id;
                return (
                  <button
                    key={mt.id}
                    onClick={() => onUpdateSettings({ mapType: mt.id })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-orange-950/30 border-orange-500 text-white font-bold shadow-md shadow-orange-500/10'
                        : 'bg-[#141820] border-white/5 hover:border-white/20 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="font-mono text-xs">{mt.label}</span>
                    <span className="text-[10px] text-neutral-500 mt-1">{mt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Navigation Color Themes (for Roadmap) */}
          {settings.mapType === 'roadmap' && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-white font-bold font-mono">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Vector Styling &amp; Navigation Themes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {themes.map((th) => {
                  const isSelected = settings.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => onUpdateSettings({ theme: th.id })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/25 border-cyan-400 text-white font-bold'
                          : 'bg-[#141820] border-white/5 hover:border-white/20 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: th.color }}
                        />
                        <div>
                          <p className="font-mono text-xs">{th.label}</p>
                          <p className="text-[10px] text-neutral-500">{th.desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Live Overlays & Layers */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-bold font-mono">
              <Car className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Geographic Overlays</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">Live Traffic</p>
                  <p className="text-[10px] text-neutral-400">Google real-time traffic speeds</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTraffic}
                  onChange={(e) => onUpdateSettings({ showTraffic: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">Transit Layer</p>
                  <p className="text-[10px] text-neutral-400">Subway &amp; rail lines</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTransit}
                  onChange={(e) => onUpdateSettings({ showTransit: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">Bicycling Paths</p>
                  <p className="text-[10px] text-neutral-400">Designated bike lanes</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showBicycling}
                  onChange={(e) => onUpdateSettings({ showBicycling: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Device Location & Accuracy Settings */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-bold font-mono">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Device Location &amp; Sensor Calibration</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">High Accuracy (GPS)</p>
                  <p className="text-[10px] text-neutral-400">Forces hardware GNSS satellite reception</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableHighAccuracy}
                  onChange={(e) => onUpdateSettings({ enableHighAccuracy: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">Auto-Follow Car</p>
                  <p className="text-[10px] text-neutral-400">Keep viewport centered on current location</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoCenterOnMove}
                  onChange={(e) => onUpdateSettings({ autoCenterOnMove: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">Show Accuracy Circle</p>
                  <p className="text-[10px] text-neutral-400">Horizontal uncertainty radius envelope</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showAccuracyCircle}
                  onChange={(e) => onUpdateSettings({ showAccuracyCircle: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20">
                <div>
                  <p className="font-mono text-xs text-white">Heading Orientation Cone</p>
                  <p className="text-[10px] text-neutral-400">Google Maps style directional headlight beam</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showHeadingCone}
                  onChange={(e) => onUpdateSettings({ showHeadingCone: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </label>
            </div>
          </div>

          {/* Section 5: Units & 3D Perspective */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-bold font-mono">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span>3D Tilt &amp; Telemetry Units</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white">3D Cockpit Tilt</span>
                  <span className="font-mono text-[11px] text-amber-400">{settings.tiltAngle}&deg;</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="65"
                  step="5"
                  value={settings.tiltAngle}
                  onChange={(e) => onUpdateSettings({ tiltAngle: parseInt(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-500">Angle 0&deg; is flat 2D top-down, 45&deg;-65&deg; is 3D driving perspective</p>
              </div>

              <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-2">
                <span className="font-mono text-xs text-white">Speed &amp; Distance Units</span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onUpdateSettings({ speedUnit: 'kmh', distanceUnit: 'metric' })}
                    className={`py-1.5 px-3 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      settings.speedUnit === 'kmh'
                        ? 'bg-orange-500 text-black font-bold'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    Metric (km/h, m)
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ speedUnit: 'mph', distanceUnit: 'imperial' })}
                    className={`py-1.5 px-3 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      settings.speedUnit === 'mph'
                        ? 'bg-orange-500 text-black font-bold'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    Imperial (mph, ft)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Cloud Map ID for Advanced Markers */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-white font-bold font-mono">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-cyan-400" />
                <span>Google Maps Vector Map ID</span>
              </div>
              <span className="text-[10px] font-normal text-neutral-400 font-mono">Required for Advanced Markers</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.mapId || 'DEMO_MAP_ID'}
                  onChange={(e) => onUpdateSettings({ mapId: e.target.value.trim() || 'DEMO_MAP_ID' })}
                  placeholder="DEMO_MAP_ID or your Cloud Console Map ID"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => onUpdateSettings({ mapId: 'DEMO_MAP_ID' })}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-mono text-xs whitespace-nowrap cursor-pointer"
                  title="Reset to default DEMO_MAP_ID"
                >
                  Reset Demo
                </button>
              </div>
              <p className="text-[10px] text-neutral-400">
                A valid Map ID activates the Vector Map renderer and AdvancedMarkerElement with sub-pixel device location precision. Defaults to <code className="text-cyan-300">DEMO_MAP_ID</code>.
              </p>
            </div>
          </div>

          {/* Section 6: Compliance, Legal Terms & API Notice */}
          <div className="p-3.5 rounded-xl bg-[#090c10] border border-white/10 space-y-2 text-[11px] text-neutral-400">
            <div className="flex items-center justify-between text-neutral-300 font-mono text-xs">
              <span className="flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Google Maps Platform Terms &amp; Compliance
              </span>
              <span className="text-[10px] text-neutral-500">Attribution: gmp_mcp_codeassist_v1_aistudio</span>
            </div>
            <p className="leading-relaxed">
              Utilizing Google Maps Platform services may incur costs against your Google Cloud billing account once moving to production.
              Use of generated code is subject to the{' '}
              <a
                href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline hover:text-orange-300 inline-flex items-center gap-0.5"
              >
                Google Maps Platform Terms of Service
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
              .
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090c10] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span>Settings applied immediately to all Google Maps views</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold transition-colors cursor-pointer shadow-md shadow-orange-500/20"
          >
            Apply &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
};
