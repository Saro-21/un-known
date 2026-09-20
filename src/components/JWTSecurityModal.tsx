/**
 * JWT Authentication & High-End Security Modal
 * DrifX Autonomous Navigation & Telematics Platform
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  UserCheck,
  Clock,
  Fingerprint,
  FileCode,
  X,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { jwtAuth, PRESET_USER_PROFILES, createJWT } from '../core/jwtAuth';
import { DecodedJWT, UserRole, SecurityPermission } from '../types/auth';

interface JWTSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JWTSecurityModal: React.FC<JWTSecurityModalProps> = ({ isOpen, onClose }) => {
  const [decoded, setDecoded] = useState<DecodedJWT | null>(jwtAuth.getDecoded());
  const [rawToken, setRawToken] = useState<string>(jwtAuth.getToken() || '');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'profiles' | 'custom' | 'permissions'>('status');
  const [customRole, setCustomRole] = useState<UserRole>('FLEET_ADMIN');
  const [customName, setCustomName] = useState('Sarabhoji (Lead)');
  const [customEmail, setCustomEmail] = useState('sarabhoji21@gmail.com');
  const [customExpiryHours, setCustomExpiryHours] = useState(8);
  const [selectedPermissions, setSelectedPermissions] = useState<SecurityPermission[]>([
    'drifx:read',
    'drifx:simulate',
    'drifx:sensor_raw',
    'drifx:admin',
    'gps:high_precision',
    'gmp:access',
    'gmp:settings_modify',
    'security:audit',
  ]);
  const [tamperAlert, setTamperAlert] = useState<string | null>(null);

  useEffect(() => {
    const unsub = jwtAuth.subscribe(() => {
      setDecoded(jwtAuth.getDecoded());
      setRawToken(jwtAuth.getToken() || '');
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchProfile = async (role: UserRole) => {
    try {
      await jwtAuth.switchProfile(role);
      setTamperAlert(null);
    } catch (e: any) {
      alert('Failed to switch profile: ' + e.message);
    }
  };

  const handleGenerateCustom = async () => {
    try {
      const token = await createJWT({
        sub: 'usr_custom_' + Math.random().toString(36).substring(2, 7),
        name: customName,
        email: customEmail,
        role: customRole,
        permissions: selectedPermissions,
        expiresInSeconds: customExpiryHours * 3600,
      });
      await jwtAuth.setToken(token);
      setTamperAlert(null);
      setActiveTab('status');
    } catch (e: any) {
      alert('Error creating token: ' + e.message);
    }
  };

  const handleSimulateTamper = async () => {
    if (!rawToken) return;
    const parts = rawToken.split('.');
    if (parts.length === 3) {
      // Tamper by altering one character of the signature
      const tamperedSig = parts[2].substring(0, parts[2].length - 4) + 'XXXX';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;
      try {
        await jwtAuth.setToken(tamperedToken);
      } catch (e: any) {
        setTamperAlert('CRYPTOGRAPHIC TAMPER DETECTED: Signature mismatch! Access privileges revoked.');
      }
    }
  };

  const allAvailablePermissions: { id: SecurityPermission; label: string; desc: string }[] = [
    { id: 'drifx:read', label: 'DrifX Telemetry Read', desc: 'Allows viewing live vehicle trajectories and sensor states' },
    { id: 'drifx:simulate', label: 'Blackout & Drift Injection', desc: 'Permits synthetic tunnel blackouts and sensor drift perturbations' },
    { id: 'drifx:sensor_raw', label: 'Raw IMU / Gyro Bus Access', desc: 'Direct high-rate hardware IMU polling & uncalibrated streams' },
    { id: 'drifx:admin', label: 'Telematics Fleet Admin', desc: 'Engine tuning, factor graph covariance adjustments, and overrides' },
    { id: 'gps:high_precision', label: 'High Precision Device GPS', desc: 'Continuous sub-meter hardware GPS sensor location polling' },
    { id: 'gmp:access', label: 'Google Maps Platform Access', desc: 'Live vector rendering, satellite view, and traffic tile streaming' },
    { id: 'gmp:settings_modify', label: 'Google Maps Settings Control', desc: 'Modify Google Maps themes, 3D tilt angles, and navigation layers' },
    { id: 'security:audit', label: 'Cryptographic Security Audit', desc: 'Inspect token signatures, claims, nonces, and security posture' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e1217] border border-cyan-500/30 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-cyan-950/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-tight">
                  JWT SECURITY &amp; RBAC PERMISSIONS
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
                  HMAC-SHA256
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Autonomous Telematics Cryptographic Identity &amp; High-End Security Enclave
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

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#12161d] px-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'status'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            Active Token Claims
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'profiles'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            RBAC Clearance Profiles
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Permissions Matrix
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'custom'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Custom Token Generator
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-neutral-300 text-xs">
          {tamperAlert && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500 text-rose-200 flex items-start gap-3 animate-bounce">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold font-mono text-xs">{tamperAlert}</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  The signature verification algorithm confirmed that the payload or signature token segment was modified in transit.
                </p>
                <button
                  onClick={() => handleSwitchProfile('FLEET_ADMIN')}
                  className="mt-2 text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white font-bold transition-colors"
                >
                  Restore Valid Key
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: ACTIVE TOKEN CLAIMS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {decoded && decoded.isValidSignature && !decoded.isExpired ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                    <div>
                      <span className="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wide">
                        AUTHENTICATED &bull; {decoded.payload.role}
                      </span>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        Cryptographically Valid &bull; Subject: {decoded.payload.sub} ({decoded.payload.email})
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Expires in: {Math.floor(decoded.expiresInSeconds / 60)}m {decoded.expiresInSeconds % 60}s
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold font-mono text-rose-300">
                      TOKEN INVALID OR EXPIRED
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Please select a verified profile or generate a signed token.
                    </p>
                  </div>
                </div>
              )}

              {/* Decoded Claims Grid */}
              {decoded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase">Subject / Identity</span>
                    <p className="text-neutral-200 font-bold text-xs">{decoded.payload.name}</p>
                    <p className="text-[11px] text-cyan-400">{decoded.payload.email}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase">Cryptographic Nonce (JTI)</span>
                    <p className="text-neutral-300 text-[11px] truncate">{decoded.payload.jti}</p>
                    <p className="text-[10px] text-neutral-500">Issuer: {decoded.payload.iss}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase">Security Clearance Level</span>
                    <p className="text-emerald-400 font-bold text-xs">{decoded.payload.role}</p>
                    <p className="text-[10px] text-neutral-400">{decoded.payload.permissions.length} active permissions granted</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141820] border border-white/5 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase">Signature Verification</span>
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      HMAC-SHA256 Verified
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">Sig: {decoded.signature.substring(0, 24)}...</p>
                  </div>
                </div>
              )}

              {/* Raw Compact JWT View */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    Encoded RFC-7519 Compact Serialization
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSimulateTamper}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/40 text-rose-300 border border-rose-800 hover:bg-rose-900/60 transition-colors"
                      title="Test Tamper Detection by corrupting signature"
                    >
                      Simulate Tamper Attack
                    </button>
                    <button
                      onClick={handleCopy}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#090c10] border border-white/10 font-mono text-[11px] break-all leading-relaxed max-h-24 overflow-y-auto">
                  {rawToken ? (
                    <>
                      <span className="text-rose-400">{rawToken.split('.')[0]}</span>
                      <span className="text-neutral-500">.</span>
                      <span className="text-purple-400">{rawToken.split('.')[1]}</span>
                      <span className="text-neutral-500">.</span>
                      <span className="text-cyan-400">{rawToken.split('.')[2]}</span>
                    </>
                  ) : (
                    <span className="text-neutral-600">No token loaded</span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 flex gap-4 font-mono">
                  <span className="text-rose-400">&bull; Header (Base64URL)</span>
                  <span className="text-purple-400">&bull; Payload Claims (Base64URL)</span>
                  <span className="text-cyan-400">&bull; HMAC-SHA256 Signature</span>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC PROFILES */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Switch between pre-configured enterprise role clearances to test role-based feature gating:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.keys(PRESET_USER_PROFILES) as UserRole[]).map((roleKey) => {
                  const p = PRESET_USER_PROFILES[roleKey];
                  const isCurrent = decoded?.payload.role === roleKey;
                  return (
                    <div
                      key={roleKey}
                      onClick={() => handleSwitchProfile(roleKey)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-cyan-950/20 border-cyan-400 shadow-md shadow-cyan-500/10'
                          : 'bg-[#141820] border-white/5 hover:border-white/20 hover:bg-[#1a202c]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs font-mono text-white flex items-center gap-1.5">
                            {roleKey}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-cyan-300 font-medium">{p.name}</p>
                        <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{p.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                        <span>{p.permissions.length} Permissions</span>
                        <span className="text-cyan-400 underline">Select Profile &rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PERMISSIONS MATRIX */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Granular security clearances enforced throughout DrifX:
              </p>
              <div className="space-y-2">
                {allAvailablePermissions.map((perm) => {
                  const isGranted = decoded?.payload.permissions.includes(perm.id) || false;
                  return (
                    <div
                      key={perm.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isGranted
                          ? 'bg-emerald-950/15 border-emerald-500/30 text-neutral-200'
                          : 'bg-neutral-900/30 border-white/5 text-neutral-500 opacity-60'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{perm.label}</span>
                          <code className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-neutral-400 font-mono">
                            {perm.id}
                          </code>
                        </div>
                        <p className="text-[11px] text-neutral-400">{perm.desc}</p>
                      </div>
                      <div>
                        {isGranted ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3" /> GRANTED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-400 border border-white/5">
                            RESTRICTED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM TOKEN GENERATOR */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                Issue a custom cryptographically signed JWT token with tailored claims:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-neutral-400">Identity Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141820] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-neutral-400">Email Address</label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141820] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-neutral-400">Role</label>
                  <select
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141820] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="FLEET_ADMIN">FLEET_ADMIN</option>
                    <option value="TELEMATICS_ENGINEER">TELEMATICS_ENGINEER</option>
                    <option value="VEHICLE_OPERATOR">VEHICLE_OPERATOR</option>
                    <option value="SECURITY_AUDITOR">SECURITY_AUDITOR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-neutral-400">Expiry (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={customExpiryHours}
                    onChange={(e) => setCustomExpiryHours(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141820] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-neutral-400">Select Granular Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allAvailablePermissions.map((p) => {
                    const isChecked = selectedPermissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#141820] border border-white/5 cursor-pointer hover:border-white/20 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, p.id]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter((x) => x !== p.id));
                            }
                          }}
                          className="accent-cyan-500"
                        />
                        <span className="font-mono text-[11px] text-neutral-200">{p.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleGenerateCustom}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all shadow-lg shadow-cyan-600/20 cursor-pointer"
              >
                Issue Signed JWT &amp; Activate Clearance
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090c10] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Encrypted Token Storage: Local Enclave</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
