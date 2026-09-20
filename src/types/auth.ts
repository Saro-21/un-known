/**
 * JWT Authentication & High-End Security Permissions Types
 * DrifX Autonomous Navigation & Telematics Platform
 */

export type UserRole =
  | 'FLEET_ADMIN'
  | 'TELEMATICS_ENGINEER'
  | 'VEHICLE_OPERATOR'
  | 'SECURITY_AUDITOR';

export type SecurityPermission =
  | 'drifx:read'              // Read telemetry & trajectory paths
  | 'drifx:simulate'          // Inject synthetic tunnel blackouts and sensor drift
  | 'drifx:sensor_raw'        // Direct raw IMU / Gyroscope / Accel hardware bus access
  | 'drifx:admin'             // High-level engine parameter tuning & factor graph overrides
  | 'gps:high_precision'      // Continuous sub-meter GNSS / device geolocation sensor polling
  | 'gmp:access'              // Access Google Maps Platform rendering & layers
  | 'gmp:settings_modify'     // Modify Google Maps configurations and map styling
  | 'security:audit';         // Inspect cryptographic audit trail and tokens

export interface JWTPayload {
  sub: string;                   // Subject / User ID
  name: string;                  // User Full Name
  email: string;                 // User Email Address
  role: UserRole;                // Role assignment
  permissions: SecurityPermission[]; // Granted granular security permissions
  iat: number;                   // Issued At timestamp (Unix seconds)
  exp: number;                   // Expiration timestamp (Unix seconds)
  jti: string;                   // Unique cryptographic JWT ID nonce
  iss: string;                   // Token Issuer
  aud: string;                   // Audience
  hardwareId?: string;           // Optional paired vehicle or device hardware ID
}

export interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface DecodedJWT {
  rawToken: string;
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  isExpired: boolean;
  isValidSignature: boolean;
  expiresInSeconds: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  decoded: DecodedJWT | null;
  currentUser: JWTPayload | null;
  verificationError: string | null;
}
