/**
 * DrifX (AIDR-X) - Phone Gyro & Drift CLI Terminal
 * Interactive command-line interface & developer scripts for phone gyroscope
 * data streaming, bias calibration, and dead-reckoning drift calculations.
 */

import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Code2,
  Sparkles,
  Smartphone,
  Cpu,
  Radio,
  Download,
} from 'lucide-react';
import { LiveEngineState } from '../core/livePhoneSensorEngine';

interface DriftCLITerminalProps {
  engineState: LiveEngineState;
  onSimulateDrive?: () => void;
  onInjectBlackout?: () => void;
}

export const DriftCLITerminal: React.FC<DriftCLITerminalProps> = ({
  engineState,
  onSimulateDrive,
  onInjectBlackout,
}) => {
  const [commandInput, setCommandInput] = useState<string>('drifx drift-stats');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; output: string }>>([
    {
      cmd: 'drifx version',
      output: 'DrifX (AIDR-X) Navigation CLI v2.4.0 [10.0 Hz Core, Factor Graph Optimizer]',
    },
    {
      cmd: 'drifx status',
      output: JSON.stringify(
        {
          mode: 'NEURAL_DEAD_RECKONING',
          gyro_connected: engineState?.is_running ?? false,
          sample_rate_hz: engineState?.sensor_sample_hz ?? 10.0,
          gnss_blackout: engineState?.is_blackout_active ?? false,
          current_drift_pct: Number((engineState?.drift?.ai_drift_percentage ?? 0).toFixed(2)),
          heading_stability: engineState?.heading_stability?.stability_grade ?? 'EXCELLENT',
          estimated_bias_deg_s: Number((engineState?.heading_stability?.estimated_bias_deg_s ?? 0.069).toFixed(3)),
        },
        null,
        2
      ),
    },
  ]);

  const copySnippet = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleExecuteCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    let output = '';
    const lower = cmd.toLowerCase();

    if (lower === 'clear' || lower === 'cls') {
      setTerminalHistory([]);
      setCommandInput('');
      return;
    } else if (lower.includes('status')) {
      output = JSON.stringify(
        {
          timestamp: Date.now(),
          status: engineState?.is_running ? 'STREAMING_ACTIVE' : 'IDLE',
          gnss_signal: engineState?.is_blackout_active ? 'DENIED_BLACKOUT' : 'LOCKED_FIX',
          position_drift_meters: Number((engineState?.drift?.ai_drift_error_m ?? 0).toFixed(2)),
          drift_pct: Number((engineState?.drift?.ai_drift_percentage ?? 0).toFixed(2)),
          speed_mps: Number((engineState?.estimated_car?.speed_mps ?? 0).toFixed(2)),
          gyro_yaw_rate: Number((engineState?.heading_stability?.raw_yaw_rate_deg_s ?? 0).toFixed(2)),
          gyro_bias_deg_s: Number((engineState?.heading_stability?.estimated_bias_deg_s ?? 0.069).toFixed(3)),
        },
        null,
        2
      );
    } else if (lower.includes('drift') || lower.includes('stats')) {
      const distTraveled = engineState?.drift?.distance_traveled_m ?? 0;
      const driftErr = engineState?.drift?.ai_drift_error_m ?? 0;
      const driftPct = engineState?.drift?.ai_drift_percentage ?? 0;
      const headingStab = engineState?.heading_stability?.heading_stability_pct ?? 95.0;
      const estBias = engineState?.heading_stability?.estimated_bias_deg_s ?? 0.069;
      output = `[DRIFT ANALYSIS]\n` +
        `  Actual Distance Traveled: ${distTraveled.toFixed(1)} m\n` +
        `  Current Drift Deviation:  ${driftErr.toFixed(2)} m\n` +
        `  Accumulated Drift %:      ${driftPct.toFixed(2)}% (Limit: < 2.00%)\n` +
        `  Heading Residual:         ${headingStab.toFixed(1)}% stability\n` +
        `  Estimated Sensor Bias:    ${estBias.toFixed(3)} deg/s\n` +
        `  Status:                   ${driftPct < 2.0 ? 'NOMINAL (AI Calibrated)' : 'HIGH DIVERGENCE'}`;
    } else if (lower.includes('blackout') || lower.includes('tunnel')) {
      if (onInjectBlackout) onInjectBlackout();
      output = `[COMMAND EXECUTED] Synthetic GNSS Blackout toggled. State: ${!engineState?.is_blackout_active ? 'BLACKOUT_ACTIVE' : 'GNSS_RESTORED'}`;
    } else if (lower.includes('simulate') || lower.includes('start')) {
      if (onSimulateDrive) onSimulateDrive();
      output = `[COMMAND EXECUTED] Smartphone sensor simulation started at 10.0 Hz.`;
    } else if (lower.includes('help')) {
      output = `Available DrifX CLI Commands:\n` +
        `  drifx status             - Display live phone gyro & vehicle tracking status\n` +
        `  drifx drift-stats        - Print drift percentage, distance, and stability\n` +
        `  drifx blackout           - Toggle synthetic GNSS blackout / tunnel scenario\n` +
        `  drifx simulate           - Start virtual road drive replay\n` +
        `  drifx bias-calib         - Inspect MEMS gyroscope zero-rate offset\n` +
        `  clear                    - Clear terminal output window`;
    } else {
      output = `drifx: command not recognized: "${cmd}". Type "drifx help" for command catalog.`;
    }

    setTerminalHistory((prev) => [...prev, { cmd, output }]);
    setCommandInput('');
  };

  const curlSnippet = `curl -X POST http://localhost:3000/api/sensor/phone-gyro \\
  -H "Content-Type: application/json" \\
  -d '{
    "timestamp_ms": ${Date.now()},
    "gyro_x_radps": 0.0012,
    "gyro_y_radps": -0.0008,
    "gyro_z_radps": 0.0345,
    "accel_x_mps2": 0.45,
    "accel_y_mps2": -0.12,
    "speed_mps": 14.2
  }'`;

  const pythonCliSnippet = `import time, requests, math

# Stream smartphone gyroscope & vehicle speed to DrifX Engine
API_URL = "http://localhost:3000/api/sensor/phone-gyro"
rate_hz = 10.0

print("[DrifX CLI] Streaming phone gyroscope telemetry...")
while True:
    payload = {
        "timestamp_ms": int(time.time() * 1000),
        "gyro_z_radps": 0.025 * math.sin(time.time()),
        "accel_x_mps2": 0.32,
        "speed_mps": 13.8,
    }
    # requests.post(API_URL, json=payload)
    time.sleep(1.0 / rate_hz)`;

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* CLI Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/10 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-950/60 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span>Phone Gyro &amp; Drift CLI Terminal</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-orange-400 border border-white/10">
                drifx-cli 2.4
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive terminal console &amp; telemetry streaming scripts for phone MEMS gyroscopes.
            </p>
          </div>
        </div>

        {/* Quick Command Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => {
              setCommandInput('drifx drift-stats');
              setTimeout(() => handleExecuteCommand(), 50);
            }}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 cursor-pointer transition-colors"
          >
            drift-stats
          </button>
          <button
            onClick={() => {
              setCommandInput('drifx status');
              setTimeout(() => handleExecuteCommand(), 50);
            }}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 cursor-pointer transition-colors"
          >
            status
          </button>
          <button
            onClick={() => {
              setCommandInput('drifx blackout');
              setTimeout(() => handleExecuteCommand(), 50);
            }}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-orange-400 border border-white/10 cursor-pointer transition-colors"
          >
            toggle-blackout
          </button>
          <button
            onClick={() => setTerminalHistory([])}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-neutral-300 border border-white/10 cursor-pointer transition-colors"
          >
            clear
          </button>
        </div>
      </div>

      {/* Interactive Terminal Window */}
      <div className="rounded-xl bg-[#060606] border border-white/15 overflow-hidden shadow-inner font-mono text-xs">
        {/* Terminal Title Bar */}
        <div className="bg-[#121212] px-3.5 py-2 border-b border-white/10 flex items-center justify-between text-neutral-400 text-[11px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-neutral-300 font-semibold ml-2">bash &mdash; drifx@client:~</span>
          </div>
          <span className="text-[10px] text-neutral-500">10.0 Hz Core Stream Ready</span>
        </div>

        {/* Terminal Output Log */}
        <div className="p-4 max-h-64 overflow-y-auto space-y-3 select-text">
          {terminalHistory.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <span className="text-neutral-500">$</span>
                <span>{item.cmd}</span>
              </div>
              <pre className="text-neutral-300 text-[11px] whitespace-pre-wrap pl-3 leading-relaxed border-l border-white/10">
                {item.output}
              </pre>
            </div>
          ))}

          {/* Active prompt row */}
          <form onSubmit={handleExecuteCommand} className="flex items-center gap-2 pt-1">
            <span className="text-neutral-500">$</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Type command (e.g. drifx status, drifx drift-stats, drifx help)..."
              className="flex-1 bg-transparent text-emerald-400 focus:outline-none placeholder:text-neutral-600 font-mono text-xs"
            />
            <button
              type="submit"
              className="px-2.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[11px] font-semibold border border-emerald-500/40"
            >
              Run
            </button>
          </form>
        </div>
      </div>

      {/* Developer CLI Integration Snippets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* Python Streamer Script */}
        <div className="p-3.5 rounded-xl bg-[#141414] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Python Gyro Streamer CLI</span>
            </span>
            <button
              onClick={() => copySnippet(pythonCliSnippet, 'py')}
              className="p-1 rounded text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              title="Copy Python script"
            >
              {copiedKey === 'py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[10px] text-neutral-300 overflow-x-auto leading-relaxed">
            {pythonCliSnippet}
          </pre>
        </div>

        {/* cURL Sensor Ingestion Endpoint */}
        <div className="p-3.5 rounded-xl bg-[#141414] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-orange-400" />
              <span>cURL Sensor Endpoint</span>
            </span>
            <button
              onClick={() => copySnippet(curlSnippet, 'curl')}
              className="p-1 rounded text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              title="Copy cURL command"
            >
              {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[10px] text-neutral-300 overflow-x-auto leading-relaxed">
            {curlSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
