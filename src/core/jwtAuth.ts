/**
 * Cryptographic JWT Authentication Engine
 * Implements HMAC-SHA256 signing and verification using Web Crypto API.
 */

import { JWTPayload, JWTHeader, DecodedJWT, SecurityPermission, UserRole } from '../types/auth';

// Standard secret key used for client HMAC-SHA256 signature verification in DrifX
const JWT_SECRET_KEY = 'drifx-telematics-super-secure-hmac-sha256-key-v2';
const TOKEN_STORAGE_KEY = 'drifx_telematics_jwt_token';

// Preset profiles for instant testing & high-end security demonstration
export const PRESET_USER_PROFILES: Record<UserRole, {
  name: string;
  email: string;
  sub: string;
  role: UserRole;
  permissions: SecurityPermission[];
  description: string;
}> = {
  FLEET_ADMIN: {
    sub: 'usr_admin_9921',
    name: 'Sarabhoji (Fleet Admin)',
    email: 'sarabhoji21@gmail.com',
    role: 'FLEET_ADMIN',
    permissions: [
      'drifx:read',
      'drifx:simulate',
      'drifx:sensor_raw',
      'drifx:admin',
      'gps:high_precision',
      'gmp:access',
      'gmp:settings_modify',
      'security:audit',
    ],
    description: 'Unrestricted Master Clearance: Google Maps full controls, device GPS, blackout injection, and raw telemetry.',
  },
  TELEMATICS_ENGINEER: {
    sub: 'usr_eng_4412',
    name: 'Elena Rostova',
    email: 'elena.rostova@drifx.ai',
    role: 'TELEMATICS_ENGINEER',
    permissions: [
      'drifx:read',
      'drifx:simulate',
      'drifx:sensor_raw',
      'gps:high_precision',
      'gmp:access',
      'gmp:settings_modify',
    ],
    description: 'Engineering Clearance: Factor graph tuning, synthetic drift injection, device GPS, and Google Maps.',
  },
  VEHICLE_OPERATOR: {
    sub: 'usr_op_1087',
    name: 'Marcus Vance',
    email: 'marcus.vance@drifx-fleet.com',
    role: 'VEHICLE_OPERATOR',
    permissions: [
      'drifx:read',
      'gps:high_precision',
      'gmp:access',
    ],
    description: 'Field Vehicle Operator: Live HUD navigation, device location tracking, and Google Maps display.',
  },
  SECURITY_AUDITOR: {
    sub: 'usr_aud_8820',
    name: 'Dr. Arthur Sterling',
    email: 'arthur.sterling@security-compliance.gov',
    role: 'SECURITY_AUDITOR',
    permissions: [
      'drifx:read',
      'security:audit',
    ],
    description: 'Read-Only Security Inspector: Cryptographic audit verification and telemetry logs inspection.',
  },
};

// Base64URL Helpers
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate Cryptographic HMAC Key
async function getCryptoKey(secret: string = JWT_SECRET_KEY): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a payload and create a compliant JSON Web Token (JWT)
 */
export async function createJWT(
  payloadData: Omit<JWTPayload, 'iat' | 'exp' | 'jti' | 'iss' | 'aud'> & {
    expiresInSeconds?: number;
  },
  secret: string = JWT_SECRET_KEY
): Promise<string> {
  const header: JWTHeader = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (payloadData.expiresInSeconds || 3600 * 4); // default 4 hours

  const payload: JWTPayload = {
    ...payloadData,
    iat: now,
    exp,
    jti: 'jwt_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
    iss: 'drifx-telematics-auth-service',
    aud: 'drifx-autonomous-navigation-client',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const key = await getCryptoKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const encodedSignature = arrayBufferToBase64Url(signatureBuffer);

  return `${message}.${encodedSignature}`;
}

/**
 * Verify and decode a JWT string
 */
export async function verifyJWT(token: string, secret: string = JWT_SECRET_KEY): Promise<DecodedJWT> {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: Token must consist of 3 parts (header.payload.signature)');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  let header: JWTHeader;
  let payload: JWTPayload;

  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
  } catch {
    throw new Error('Malformed JWT Header');
  }

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Malformed JWT Payload');
  }

  // Verify HMAC-SHA256 Signature
  const key = await getCryptoKey(secret);
  const enc = new TextEncoder();
  const message = `${encodedHeader}.${encodedPayload}`;

  // Decode signature to ArrayBuffer
  let base64Sig = signature.replace(/-/g, '+').replace(/_/g, '/');
  while (base64Sig.length % 4) {
    base64Sig += '=';
  }
  const binarySig = atob(base64Sig);
  const sigBytes = new Uint8Array(binarySig.length);
  for (let i = 0; i < binarySig.length; i++) {
    sigBytes[i] = binarySig.charCodeAt(i);
  }

  const isValidSignature = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    enc.encode(message)
  );

  const now = Math.floor(Date.now() / 1000);
  const isExpired = payload.exp ? now > payload.exp : false;
  const expiresInSeconds = payload.exp ? Math.max(0, payload.exp - now) : 0;

  return {
    rawToken: token,
    header,
    payload,
    signature,
    isExpired,
    isValidSignature,
    expiresInSeconds,
  };
}

/**
 * Global Auth Manager class with event subscription
 */
class JWTAuthManager {
  private token: string | null = null;
  private decoded: DecodedJWT | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      try {
        const decoded = await verifyJWT(saved);
        if (!decoded.isExpired && decoded.isValidSignature) {
          this.token = saved;
          this.decoded = decoded;
          this.notify();
          return;
        }
      } catch (err) {
        console.warn('Saved JWT token invalid or expired:', err);
      }
    }

    // Default to Fleet Super-Admin profile
    await this.switchProfile('FLEET_ADMIN');
  }

  public async switchProfile(role: UserRole) {
    const profile = PRESET_USER_PROFILES[role];
    const newToken = await createJWT({
      sub: profile.sub,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      permissions: profile.permissions,
      expiresInSeconds: 3600 * 8, // 8 hours
    });

    await this.setToken(newToken);
  }

  public async setToken(tokenStr: string) {
    try {
      const decoded = await verifyJWT(tokenStr);
      this.token = tokenStr;
      this.decoded = decoded;
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenStr);
      this.notify();
      return decoded;
    } catch (e: any) {
      this.token = null;
      this.decoded = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      this.notify();
      throw e;
    }
  }

  public logout() {
    this.token = null;
    this.decoded = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.notify();
  }

  public getToken(): string | null {
    return this.token;
  }

  public getDecoded(): DecodedJWT | null {
    return this.decoded;
  }

  public getCurrentUser(): JWTPayload | null {
    return this.decoded?.payload || null;
  }

  public hasPermission(permission: SecurityPermission): boolean {
    if (!this.decoded || this.decoded.isExpired || !this.decoded.isValidSignature) {
      return false;
    }
    return this.decoded.payload.permissions.includes(permission);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const jwtAuth = new JWTAuthManager();
