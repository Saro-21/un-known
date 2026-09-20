/**
 * DrifX (AIDR-X) - Adaptive Intelligent Dead-Reckoning & GNSS Fusion Engine
 * Core TypeScript Types and Data Contracts
 *
 * NON-NEGOTIABLE DESIGN LAW:
 * AI never outputs position directly. AI outputs corrections and calibrated uncertainty
 * that feed a physics-based estimator. Physics guarantees continuity; AI reduces drift.
 */

// Coordinate Frame Definitions:
// 1. Phone Body Frame: Smartphone IMU axes (X_p right, Y_p top, Z_p screen out)
// 2. Vehicle Body Frame: Forward-Right-Down (FRD) or Forward-Left-Up (FLU)
// 3. Local Navigation Frame: East-North-Up (ENU) Cartesian meters relative to initial GNSS fix
// 4. Geodetic Frame: WGS84 Latitude, Longitude, Altitude (WGS84 ellipsoidal)

export type CoordinateFrame = 'phone_body' | 'vehicle_body' | 'local_enu' | 'wgs84';

export type HardwareSensorTarget = 'smartphone_mems' | 'automotive_mems' | 'tactical_fog';

export interface HardwareSensorProfile {
  id: HardwareSensorTarget;
  name: string;
  category: 'Mobile Application' | 'Edge Deployable Engine';
  nominal_hz: number;
  accel_noise_density: number; // m/s^2 / sqrt(Hz)
  accel_bias_drift: number;    // m/s^2
  gyro_noise_density: number;  // rad/s / sqrt(Hz)
  gyro_bias_drift: number;     // rad/s
  description: string;
}

export type MotionClass = 'normal' | 'brake' | 'turn' | 'pothole' | 'bump' | 'vibration';

export interface RawIOVNBDRecord {
  timestamp_ms: number;       // Milliseconds since epoch or drive start
  acc_x: number;              // Raw Accelerometer X (m/s^2)
  acc_y: number;              // Raw Accelerometer Y (m/s^2)
  acc_z: number;              // Raw Accelerometer Z (m/s^2)
  gyr_x: number;              // Raw Gyroscope X (rad/s)
  gyr_y: number;              // Raw Gyroscope Y (rad/s)
  gyr_z: number;              // Raw Gyroscope Z (rad/s)
  mag_x: number;              // Magnetometer X (microTesla)
  mag_y: number;              // Magnetometer Y (microTesla)
  mag_z: number;              // Magnetometer Z (microTesla)
  gps_lat: number;            // GNSS Latitude (deg)
  gps_lon: number;            // GNSS Longitude (deg)
  gps_alt: number;            // GNSS Altitude (m)
  gps_speed_mps: number;      // GNSS Ground Speed (m/s)
  gps_bearing_deg: number;    // GNSS Ground Course / Bearing (deg)
  gps_accuracy_m: number;     // GNSS Reported Horizontal Accuracy 1-sigma (m)
  obd_speed_mps?: number;     // Optional CAN/OBD Vehicle Forward Speed Ground Truth (m/s)
}

export interface AlignedIMUData {
  timestamp_ms: number;
  dt_s: number;
  // Vehicle frame aligned: x=forward, y=lateral, z=vertical
  acc_forward: number;        // m/s^2
  acc_lateral: number;        // m/s^2
  acc_vertical: number;       // m/s^2 (gravity removed)
  gyr_roll: number;           // rad/s (roll rate around forward axis)
  gyr_pitch: number;          // rad/s (pitch rate around lateral axis)
  gyr_yaw: number;            // rad/s (yaw rate around vertical axis)
  is_stationary: boolean;     // Detected via Zero-Velocity Update (ZUPT) detector
}

export interface DriveMetadata {
  id: string;
  name: string;
  driver: string;
  split: 'train' | 'val' | 'test';
  duration_s: number;
  sample_count: number;
  nominal_hz: number;
  total_distance_m: number;
  description: string;
  has_tunnels: boolean;
  has_urban_canyon: boolean;
  stationary_segments: { start_s: number; end_s: number }[];
}

export interface SyntheticBlackoutConfig {
  mode: 'duration' | 'distance';
  duration_s: 30 | 60 | 120;
  distance_m: 50 | 100 | 250 | 500 | 1000;
  interval_type: 'fixed' | 'random';
  interval_s?: number;
  seed: number;
  blackout_type: 'complete_loss' | 'multipath_degraded' | 'jamming';
}

export interface BlackoutSpan {
  id: string;
  start_ms: number;
  end_ms: number;
  duration_s: number;
  distance_m: number;
  type: 'complete_loss' | 'multipath_degraded' | 'jamming';
}

export interface MultiTaskNetworkOutput {
  motion_class: MotionClass;
  motion_probs: Record<MotionClass, number>;
  forward_velocity: number;            // Predicted forward speed (m/s)
  forward_velocity_log_var: number;    // Learned log-variance (NLL loss)
  forward_velocity_std: number;        // sqrt(exp(log_var)) (m/s)
  bias_correction: [number, number, number]; // [acc_bias_fwd, acc_bias_lat, gyr_bias_yaw]
  bias_log_var: [number, number, number];    // Learned log-variances for bias corrections
  inference_latency_ms: number;
}

export interface FactorGraphResiduals {
  imu_preintegration_norm: number;
  gnss_residual_m: number;
  nhc_lateral_residual_mps: number;
  nhc_vertical_residual_mps: number;
  ai_velocity_residual_mps: number;
  road_cross_track_residual_m: number;
  total_chi2: number;
  iterations: number;
}

export interface RoadHypothesis {
  road_id: string;
  road_name: string;
  projected_point: [number, number]; // [east, north]
  cross_track_distance_m: number;
  heading_difference_deg: number;
  weight: number;                    // Bayesian posterior probability (0..1)
  is_collapsed: boolean;
}

export interface NavigationState {
  timestamp_ms: number;
  // Local ENU coordinates (m)
  position_enu: [number, number, number]; // [east, north, up]
  // Velocity in vehicle frame (m/s)
  velocity_veh: [number, number, number]; // [forward, lateral, vertical]
  // Attitude (rad and deg)
  heading_rad: number;
  heading_deg: number;
  pitch_rad: number;
  roll_rad: number;
  // Sensor biases
  accel_bias: [number, number, number];
  gyro_bias: [number, number, number];
  // Calibrated Uncertainty (Covariance standard deviations in m and deg)
  pos_std_m: [number, number, number]; // [east_std, north_std, up_std]
  heading_std_deg: number;
  // GNSS Status & Transition Telemetry
  gnss_available: boolean;
  is_in_blackout: boolean;
  gnss_recovered_recently: boolean;
  innovation_gated: boolean;
  gnss_innovation_m?: number;
  gnss_innovation_sigma_m?: number;
  gnss_nis?: number;
  gnss_recovery_alpha?: number;
  gnss_recovery_step?: number;
  // Road Map Matching
  hypotheses: RoadHypothesis[];
  collapsed_road_name: string | null;
  // AI Diagnostics
  motion_class: MotionClass;
  ai_velocity_mps: number;
  ai_confidence_std_mps: number;
  // Computation
  solve_latency_ms: number;
}

export interface EvaluationMetrics {
  run_name: string;
  algorithm_stage: string;
  total_samples: number;
  blackout_duration_s: number;
  blackout_distance_m: number;
  pos_rmse_m: number;
  pos_p95_error_m: number;
  pos_max_error_m: number;
  drift_percentage: number; // (final_error / distance_traveled) * 100
  velocity_mae_mps: number;
  heading_rmse_deg: number;
  gnss_recovery_time_s: number;
  mean_latency_ms: number;
  p99_latency_ms: number;
}

export interface AblationRow {
  stage_id: number;
  name: string;
  description: string;
  components: {
    ins_physics: boolean;
    factor_graph: boolean;
    ai_velocity: boolean;
    learned_covariance: boolean;
    nhc: boolean;
    map_matching: boolean;
    online_adaptation: boolean;
  };
  pos_rmse_m: number;
  p95_error_m: number;
  max_error_m: number;
  drift_pct: number;
  velocity_mae_mps: number;
  heading_rmse_deg: number;
  recovery_time_s: number;
  latency_ms: number;
}
