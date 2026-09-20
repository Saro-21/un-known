/**
 * DrifX (AIDR-X) - Unified Architecture & Mathematical Formulations
 */

import React from 'react';
import {
  Sparkles,
  GitBranch,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Code2,
} from 'lucide-react';

export const ArchitectureExplorer: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Design Law Hero Banner */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2.5 py-1 rounded border border-orange-800/60 flex items-center gap-1.5 w-fit mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Non-Negotiable Design Law</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
            &ldquo;AI never outputs position directly. AI outputs <em>corrections and calibrated uncertainty</em> that feed a physics-based estimator. Physics guarantees continuity; AI reduces drift.&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-3 leading-relaxed">
            This is the core differentiator of DrifX (AIDR-X). Naive dead-reckoning attempts train neural networks to output coordinates directly, resulting in catastrophic discontinuity, physically impossible teleportation, and severe generalization failure. DrifX uses a single multi-task neural network to predict velocity, biases, and calibrated covariance which are solved jointly inside a sliding-window factor graph.
          </p>
        </div>
      </div>

      {/* 6 Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-[#141414] border border-white/5 shadow">
          <div className="w-6 h-6 rounded bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
            1
          </div>
          <h4 className="text-xs font-mono font-bold text-white mb-1">One Network, Three Heads</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Single shared TCN/GRU backbone operating on rolling 1.5s IMU windows. Jointly outputs motion classification, forward velocity, bias vectors, and uncertainty with shared representation learning.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#141414] border border-white/5 shadow">
          <div className="w-6 h-6 rounded bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
            2
          </div>
          <h4 className="text-xs font-mono font-bold text-white mb-1">Learned Covariance (Gaussian NLL)</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The network outputs log-variance per correction. Trained via Gaussian Negative Log-Likelihood loss:
            <span className="font-mono text-orange-400 block mt-1.5 p-1.5 rounded bg-black/40 border border-white/5 text-[11px]">
              L = 0.5 &times; (log &sigma;&sup2; + (y - &ycirc;)&sup2; / &sigma;&sup2;)
            </span>
            Feeds factor graph R/Q directly without hand-tuned heuristics.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#141414] border border-white/5 shadow">
          <div className="w-6 h-6 rounded bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
            3
          </div>
          <h4 className="text-xs font-mono font-bold text-white mb-1">Sliding-Window Factor Graph</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            GNSS observations, IMU preintegration, non-holonomic constraints (NHC), learned error factors, and road geometry are optimized jointly in one graph. Downstream evidence retroactively refines earlier state.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#141414] border border-white/5 shadow">
          <div className="w-6 h-6 rounded bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
            4
          </div>
          <h4 className="text-xs font-mono font-bold text-white mb-1">Multi-Hypothesis Map Matching</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Maintains top-k candidate road segments as weighted particles. Avoids premature collapse at highway exits, parallel frontage corridors, and bifurcations until downstream heading confirms the branch.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#141414] border border-white/5 shadow">
          <div className="w-6 h-6 rounded bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
            5
          </div>
          <h4 className="text-xs font-mono font-bold text-white mb-1">Online Adaptation Loop</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Whenever GNSS is healthy, DrifX computes per-session residual error offsets (&Delta;b_session) to adapt directly to the specific phone mount, vehicle suspension, and road surface conditions.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#141414] border border-white/5 shadow">
          <div className="w-6 h-6 rounded bg-white/5 border border-white/10 text-orange-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
            6
          </div>
          <h4 className="text-xs font-mono font-bold text-white mb-1">Innovation Gated Recovery</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Mahalanobis distance test: &gamma; = r&supT; S&macr;&sup1; r &lt; &chi;&sup2;. Upon tunnel exit, a smooth exponential blending filter prevents discrete position jumps, ensuring smooth navigation continuity.
          </p>
        </div>
      </div>

      {/* Factor Graph Visual Scheme */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-orange-400" />
          <span>Unified Factor Graph Formulation</span>
        </h3>

        <div className="p-4 rounded-lg bg-[#080808] font-mono text-xs text-neutral-300 border border-white/10 leading-relaxed overflow-x-auto space-y-2">
          <div className="text-orange-400 font-bold">// Joint Non-Linear Least Squares Objective Function</div>
          <div>min_(X) &Sigma; [</div>
          <div className="pl-4 text-neutral-300">
            || r_imu(x_k, x_k+1) ||&sup2; (&Sigma;_imu)     <span className="text-neutral-500">// 1. IMU Preintegration Factor</span>
          </div>
          <div className="pl-4 text-emerald-400">
            + &delta;_gnss &times; || r_gnss(x_k, z_gnss) ||&sup2; (R_gnss) <span className="text-neutral-500">// 2. GNSS Observation Factor</span>
          </div>
          <div className="pl-4 text-cyan-400">
            + || r_nhc(x_k) ||&sup2; (R_nhc)                   <span className="text-neutral-500">// 3. Non-Holonomic Constraint (v_lat ~ 0, v_vert ~ 0)</span>
          </div>
          <div className="pl-4 text-amber-400">
            + || r_ai(x_k, v_ai, b_ai) ||&sup2; (&Sigma;_ai)    <span className="text-neutral-500">// 4. Learned Multi-Task AI Velocity &amp; Bias Factor</span>
          </div>
          <div className="pl-4 text-rose-400">
            + || r_road(x_k, road_geom) ||&sup2; (R_road)      <span className="text-neutral-500">// 5. Multi-Hypothesis Road Consistency Factor</span>
          </div>
          <div>]</div>
        </div>
      </div>

      {/* Android JNI & Edge Deployment Architecture (Phase 8 Preview) */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
            <span>Edge Deployment Architecture (Android JNI / C++ Core)</span>
          </h4>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            Budget: &lt;5 ms / 100 ms (10 Hz)
          </span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          DrifX is engineered for on-device inference without cloud dependencies:
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <li className="p-3.5 rounded-lg bg-[#141414] border border-white/5">
            <strong className="text-white block mb-1">C++ Ceres / GTSAM Solver:</strong>
            <span className="text-neutral-400 text-[11px] font-sans">
              Fixed-lag 15-step sliding window factor graph compiled with Android NDK into lightweight native shared library.
            </span>
          </li>
          <li className="p-3.5 rounded-lg bg-[#141414] border border-white/5">
            <strong className="text-white block mb-1">ONNX Runtime Mobile:</strong>
            <span className="text-neutral-400 text-[11px] font-sans">
              Quantized 8-bit TCN/GRU multi-task model running in under 2.2 ms per 10 Hz step on mobile CPU or NNAPI DSP.
            </span>
          </li>
          <li className="p-3.5 rounded-lg bg-[#141414] border border-white/5">
            <strong className="text-white block mb-1">Pre-indexed OSM Protobuf:</strong>
            <span className="text-neutral-400 text-[11px] font-sans">
              Offline road graph cached in local SQLite spatial index. Zero network bandwidth during GNSS-denied tunnels.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
