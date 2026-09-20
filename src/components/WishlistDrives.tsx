/**
 * Wishlist Drives & Benchmark Routes Component
 * Persists favorite benchmark runs, drive scenarios, and blackout test routines
 * using AsyncStorage.
 */

import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ArrowRight, Bookmark, MapPin, Gauge, Shield, Play } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { AsyncStorage } from '../theme/asyncStorage';

export interface WishlistItem {
  id: string;
  name: string;
  routeType: string;
  durationSeconds: number;
  blackoutLengthM: number;
  expectedDriftReduction: string;
  addedAt: number;
}

const WISHLIST_STORAGE_KEY = 'drifx_wishlist_routes';

const DEFAULT_WISHLIST: WishlistItem[] = [
  {
    id: 'route_f_full',
    name: 'IO-VNBD Route F: Urban Expressway',
    routeType: 'Highway + Urban Underpass',
    durationSeconds: 215,
    blackoutLengthM: 450,
    expectedDriftReduction: '8.4x',
    addedAt: Date.now() - 86400000,
  },
  {
    id: 'route_a_tunnel',
    name: 'Downtown Sub-Level GPS Blackout',
    routeType: 'Subterranean Double Turn',
    durationSeconds: 120,
    blackoutLengthM: 320,
    expectedDriftReduction: '11.2x',
    addedAt: Date.now() - 43200000,
  },
  {
    id: 'phone_gyro_benchmark',
    name: 'Consumer Smartphone Pocket IMU Verification',
    routeType: 'Unconstrained Phone Attitude',
    durationSeconds: 95,
    blackoutLengthM: 200,
    expectedDriftReduction: '6.8x',
    addedAt: Date.now() - 10000000,
  },
];

interface WishlistDrivesProps {
  onLaunchRoute: (routeId: string) => void;
}

export const WishlistDrives: React.FC<WishlistDrivesProps> = ({ onLaunchRoute }) => {
  const { theme } = useTheme();
  const [items, setItems] = useState<WishlistItem[]>(DEFAULT_WISHLIST);

  useEffect(() => {
    async function loadWishlist() {
      try {
        const stored = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(DEFAULT_WISHLIST));
        }
      } catch (err) {
        console.warn('Failed to load wishlist:', err);
      }
    }
    loadWishlist();
  }, []);

  const handleRemove = async (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddCustom = async () => {
    const newItem: WishlistItem = {
      id: `custom_${Date.now()}`,
      name: `Custom Simulated Blackout Run #${items.length + 1}`,
      routeType: 'Synthetic GPS Denial',
      durationSeconds: 180,
      blackoutLengthM: 500,
      expectedDriftReduction: '9.5x',
      addedAt: Date.now(),
    };
    const updated = [newItem, ...items];
    setItems(updated);
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div
        className="rounded-2xl p-6 border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="p-3 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              borderColor: 'rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
            }}
          >
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: theme.textPrimary }}>
              Wishlist &amp; Bookmarked Drives
            </h2>
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
              Saved trajectory evaluations and blackout stress tests persisted in AsyncStorage.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddCustom}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm border"
          style={{
            backgroundColor: theme.accent,
            color: theme.textInverse,
            borderColor: theme.accentHover,
          }}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Bookmark Current Setup</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div
            className="p-12 rounded-2xl text-center border"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <Heart className="w-8 h-8 mx-auto opacity-30 mb-2" style={{ color: theme.textSecondary }} />
            <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
              Your wishlist is empty
            </h3>
            <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
              Bookmark routes to launch fast comparative evaluations anytime.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.borderSubtle,
              }}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                    {item.name}
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                    style={{
                      backgroundColor: theme.bgElevated,
                      color: theme.accentText,
                    }}
                  >
                    {item.expectedDriftReduction} Drift Drop
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono" style={{ color: theme.textSecondary }}>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-neutral-400" />
                    {item.routeType}
                  </span>
                  <span>&bull;</span>
                  <span>{item.durationSeconds}s duration</span>
                  <span>&bull;</span>
                  <span>{item.blackoutLengthM}m blackout</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLaunchRoute(item.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: theme.bgElevated,
                    color: theme.accentText,
                    border: `1px solid ${theme.borderAccent}`,
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Route</span>
                </button>

                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
