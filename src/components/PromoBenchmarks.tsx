/**
 * Promo & Benchmark Performance Showcase Component
 * Highlights the DrifX benchmark credentials, dataset downloads,
 * and edge navigation specifications.
 */

import React from 'react';
import { Tag, Download, Award, ShieldCheck, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { BenchmarkDatasetDownload } from './BenchmarkDatasetDownload';

interface PromoBenchmarksProps {
  onNavigateToDatasetDownload?: () => void;
}

export const PromoBenchmarks: React.FC<PromoBenchmarksProps> = () => {
  const { theme } = useTheme();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Promo Banner Header */}
      <div
        className="rounded-3xl p-6 md:p-8 border shadow-xl relative overflow-hidden"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'rgba(234, 88, 12, 0.15)',
                  color: theme.accentText,
                  border: `1px solid ${theme.borderAccent}`,
                }}
              >
                PROMO &bull; BENCHMARK VERIFIED
              </span>
              <span className="text-xs text-neutral-400 font-mono">100% Edge Autonomous</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary }}>
              State-of-the-Art Inertial Precision
            </h2>

            <p className="text-xs md:text-sm max-w-xl leading-relaxed" style={{ color: theme.textSecondary }}>
              DrifX achieves an 8.4x reduction in consumer phone IMU drift during total GNSS blackouts, meeting the
              strict &lt;10% cumulative drift industry specification.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border text-center shrink-0 min-w-[160px]"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderAccent,
            }}
          >
            <span className="text-[10px] uppercase font-mono block text-neutral-400">Drift Benchmark</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5 block">2.8%</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">Target: &lt;10.0%</span>
          </div>
        </div>

        {/* Badge list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t" style={{ borderColor: theme.borderSubtle }}>
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span style={{ color: theme.textPrimary }}>Zero Telemetry Leaks (Local)</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span style={{ color: theme.textPrimary }}>10.0 Hz Real-Time Loop</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <Award className="w-4 h-4 text-cyan-400 shrink-0" />
            <span style={{ color: theme.textPrimary }}>IO-VNBD Verified Splits</span>
          </div>
        </div>
      </div>

      {/* Dataset Download Section */}
      <BenchmarkDatasetDownload />
    </div>
  );
};
