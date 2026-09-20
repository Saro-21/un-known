/**
 * DrifX (AIDR-X) - Phase 2: Phone-to-Vehicle Alignment & Preprocessing
 *
 * Mathematical Foundations:
 * 1. Gravity Estimation on Stationary Window:
 *    g_b = (1/N) * sum_{k=0}^{N-1} [acc_x, acc_y, acc_z]^T
 *    Pitch: theta = atan2(-g_x, sqrt(g_y^2 + g_z^2))
 *    Roll:  phi   = atan2(g_y, g_z)
 *
 * 2. Forward Axis Alignment:
 *    Using initial vehicle acceleration during launch:
 *    a_launch_level = R_level * (a_b - g_b)
 *    Yaw offset: psi = atan2(a_launch_level_y, a_launch_level_x)
 *
 * 3. Vehicle Frame Transform:
 *    R_v_b = R_z(psi) * R_y(theta) * R_x(phi)
 *    a_veh = R_v_b * (a_phone - bias_a) - [0, 0, g]^T
 *    omega_veh = R_v_b * (omega_phone - bias_g)
 */

import { RawIOVNBDRecord, AlignedIMUData } from '../types/drifx';

export interface AlignmentResult {
  R_vb: number[][]; // 3x3 rotation matrix from phone to vehicle frame
  pitch_deg: number;
  roll_deg: number;
  yaw_offset_deg: number;
  stationary_samples_used: number;
  gyro_bias_init: [number, number, number];
  accel_bias_init: [number, number, number];
}

/**
 * Perform Phase 2 Phone-to-Vehicle Alignment using initial stationary calibration window
 */
export function estimatePhoneVehicleAlignment(
  records: RawIOVNBDRecord[],
  calibDurationS: number = 5.0
): AlignmentResult {
  const maxSamples = Math.min(records.length, Math.floor(calibDurationS * 10));

  let sumAx = 0, sumAy = 0, sumAz = 0;
  let sumGx = 0, sumGy = 0, sumGz = 0;

  for (let i = 0; i < maxSamples; i++) {
    const r = records[i];
    sumAx += r.acc_x;
    sumAy += r.acc_y;
    sumAz += r.acc_z;
    sumGx += r.gyr_x;
    sumGy += r.gyr_y;
    sumGz += r.gyr_z;
  }

  const meanAx = sumAx / maxSamples;
  const meanAy = sumAy / maxSamples;
  const meanAz = sumAz / maxSamples;

  const gyro_bias_init: [number, number, number] = [
    sumGx / maxSamples,
    sumGy / maxSamples,
    sumGz / maxSamples,
  ];

  // Roll and Pitch from gravity vector
  const pitch_rad = Math.atan2(-meanAx, Math.sqrt(meanAy * meanAy + meanAz * meanAz));
  const roll_rad = Math.atan2(meanAy, meanAz);

  // Leveling rotation matrix R_level
  const cr = Math.cos(roll_rad), sr = Math.sin(roll_rad);
  const cp = Math.cos(pitch_rad), sp = Math.sin(pitch_rad);

  const R_level = [
    [cp, sp * sr, sp * cr],
    [0, cr, -sr],
    [-sp, cp * sr, cp * cr],
  ];

  // Inspect first vehicle launch acceleration (between sample 50 and 100) to find forward azimuth
  let sumLaunchAx = 0;
  let sumLaunchAy = 0;
  const launchStart = Math.min(records.length - 1, maxSamples);
  const launchEnd = Math.min(records.length - 1, maxSamples + 30);

  for (let i = launchStart; i < launchEnd; i++) {
    const r = records[i];
    const devAx = r.acc_x - meanAx;
    const devAy = r.acc_y - meanAy;
    const devAz = r.acc_z - meanAz;

    // Project onto leveled horizontal plane
    const lx = R_level[0][0] * devAx + R_level[0][1] * devAy + R_level[0][2] * devAz;
    const ly = R_level[1][0] * devAx + R_level[1][1] * devAy + R_level[1][2] * devAz;

    sumLaunchAx += lx;
    sumLaunchAy += ly;
  }

  let yaw_offset_rad = Math.atan2(sumLaunchAy, sumLaunchAx);
  if (Math.abs(sumLaunchAx) < 0.05 && Math.abs(sumLaunchAy) < 0.05) {
    yaw_offset_rad = 0.0;
  }

  const cy = Math.cos(yaw_offset_rad), sy = Math.sin(yaw_offset_rad);

  // Full R_vb = R_z(yaw) * R_level
  const R_vb = [
    [cy * R_level[0][0] + sy * R_level[1][0], cy * R_level[0][1] + sy * R_level[1][1], cy * R_level[0][2] + sy * R_level[1][2]],
    [-sy * R_level[0][0] + cy * R_level[1][0], -sy * R_level[0][1] + cy * R_level[1][1], -sy * R_level[0][2] + cy * R_level[1][2]],
    [R_level[2][0], R_level[2][1], R_level[2][2]],
  ];

  return {
    R_vb,
    pitch_deg: (pitch_rad * 180) / Math.PI,
    roll_deg: (roll_rad * 180) / Math.PI,
    yaw_offset_deg: (yaw_offset_rad * 180) / Math.PI,
    stationary_samples_used: maxSamples,
    gyro_bias_init,
    accel_bias_init: [0.0, 0.0, 0.0],
  };
}

/**
 * Preprocess raw smartphone IMU records into Vehicle Coordinate Frame
 * (x_v: Forward, y_v: Lateral, z_v: Vertical Up)
 */
export function preprocessAndAlignIMU(
  records: RawIOVNBDRecord[],
  alignment: AlignmentResult
): AlignedIMUData[] {
  const { R_vb, gyro_bias_init } = alignment;
  const aligned: AlignedIMUData[] = [];
  const g = 9.80665;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const dt_s = i === 0 ? 0.1 : (r.timestamp_ms - records[i - 1].timestamp_ms) / 1000;

    // Debias gyro
    const gx_deb = r.gyr_x - gyro_bias_init[0];
    const gy_deb = r.gyr_y - gyro_bias_init[1];
    const gz_deb = r.gyr_z - gyro_bias_init[2];

    // Transform angular rate to vehicle frame
    const gyr_roll = R_vb[0][0] * gx_deb + R_vb[0][1] * gy_deb + R_vb[0][2] * gz_deb;
    const gyr_pitch = R_vb[1][0] * gx_deb + R_vb[1][1] * gy_deb + R_vb[1][2] * gz_deb;
    const gyr_yaw = R_vb[2][0] * gx_deb + R_vb[2][1] * gy_deb + R_vb[2][2] * gz_deb;

    // Transform acceleration to vehicle frame
    const ax_v = R_vb[0][0] * r.acc_x + R_vb[0][1] * r.acc_y + R_vb[0][2] * r.acc_z;
    const ay_v = R_vb[1][0] * r.acc_x + R_vb[1][1] * r.acc_y + R_vb[1][2] * r.acc_z;
    const az_v = R_vb[2][0] * r.acc_x + R_vb[2][1] * r.acc_y + R_vb[2][2] * r.acc_z;

    // Remove gravity from vertical component (assuming FLU frame where vertical is up)
    const acc_forward = ax_v;
    const acc_lateral = ay_v;
    const acc_vertical = az_v + g; // compensated

    // Zero-Velocity Update (ZUPT) detector: low gyro norm and low horizontal acceleration
    const gyroNorm = Math.sqrt(gx_deb * gx_deb + gy_deb * gy_deb + gz_deb * gz_deb);
    const horizAccNorm = Math.sqrt(acc_forward * acc_forward + acc_lateral * acc_lateral);
    const is_stationary = gyroNorm < 0.04 && horizAccNorm < 0.25;

    aligned.push({
      timestamp_ms: r.timestamp_ms,
      dt_s: dt_s > 0 ? dt_s : 0.1,
      acc_forward,
      acc_lateral,
      acc_vertical,
      gyr_roll,
      gyr_pitch,
      gyr_yaw,
      is_stationary,
    });
  }

  return aligned;
}

// ---------------------------------------------------------------------------
// Phase 2 Extension: Raw Gyroscope Heading Stability & Sensor Bias Tracking
// ---------------------------------------------------------------------------

export interface RawGyroSampleInput {
  timestamp_ms: number;
  gyro_z_rad: number; // Yaw angular rate in rad/s
  gyro_x_rad?: number; // Pitch rate
  gyro_y_rad?: number; // Roll rate
  accel_x_mps2?: number;
  accel_y_mps2?: number;
  accel_z_mps2?: number;
}

export interface GyroBiasHistoryPoint {
  timestamp_ms: number;
  bias_deg_s: number;
  stability_pct: number;
}

export interface GyroHeadingStabilityMetrics {
  heading_stability_pct: number;         // 0 - 100% stability score
  estimated_bias_deg_s: number;          // Current estimated gyro bias in deg/s
  estimated_bias_rad_s: number;          // Current estimated gyro bias in rad/s
  bias_drift_rate_deg_min: number;       // Drift rate over time in deg/minute
  angular_random_walk_est: number;       // Allan deviation / noise floor (deg/sqrt(hr))
  stability_grade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'UNSTABLE';
  raw_yaw_rate_deg_s: number;            // Latest instantaneous raw gyro rate
  compensated_yaw_rate_deg_s: number;    // Latest debiased gyro rate
  bias_history: GyroBiasHistoryPoint[];  // Chronological bias evolution for HUD sparkline
  is_stationary: boolean;                // Zero-angular-velocity detection
  advisory_text: string;
}

/**
 * State container for continuous streaming gyro stability estimation
 */
export interface GyroHeadingStabilityState {
  estimated_bias_rad_s: number;
  bias_history: GyroBiasHistoryPoint[];
  last_timestamp_ms: number;
  short_term_rates: number[]; // deg/s
  stationary_counter: number;
}

/**
 * Factory for initial gyro heading stability state
 */
export function createInitialGyroStabilityState(): GyroHeadingStabilityState {
  return {
    estimated_bias_rad_s: 0.0012, // typical smartphone MEMS initial bias
    bias_history: [],
    last_timestamp_ms: 0,
    short_term_rates: [],
    stationary_counter: 0,
  };
}

/**
 * Core utility function to process raw gyroscope data from PhoneSensorHCI module,
 * estimating sensor bias evolution over time and determining heading stability.
 *
 * Mathematical formulation:
 * - Raw rate: omega_z = gyr_z_rad * (180 / pi) [deg/s]
 * - Stationary detection: |omega_z| < 0.02 rad/s & low accel variation
 * - Adaptive Complementary Bias Estimator:
 *   b_k = (1 - alpha) * b_{k-1} + alpha * omega_z
 *   where alpha is high (0.05) when stationary/cruising, and low (0.002) during sharp vehicle yaw
 * - Bias Drift Rate = (Delta b / Delta t) * 60 [deg/min]
 * - Stability Index (%) = 100 - (20 * |b_deg_s| + 15 * |drift_rate| + 35 * sigma_noise)
 *
 * @param sample The raw gyroscope/IMU sample from PhoneSensorHCI
 * @param state The persistent or running state tracking bias history
 * @returns Comprehensive Heading Stability and Sensor Bias metrics
 */
export function processRawGyroscopeData(
  sample: RawGyroSampleInput,
  state: GyroHeadingStabilityState
): GyroHeadingStabilityMetrics {
  const RAD_TO_DEG = 180 / Math.PI;
  const raw_yaw_rate_deg_s = sample.gyro_z_rad * RAD_TO_DEG;
  const now = sample.timestamp_ms || performance.now();

  const dt_s = state.last_timestamp_ms > 0
    ? Math.min(0.5, Math.max(0.01, (now - state.last_timestamp_ms) / 1000))
    : 0.1;
  state.last_timestamp_ms = now;

  // Track short-term rate samples for jitter / variance estimation
  state.short_term_rates.push(raw_yaw_rate_deg_s);
  if (state.short_term_rates.length > 30) {
    state.short_term_rates.shift();
  }

  // Calculate short term standard deviation (noise floor)
  const n = state.short_term_rates.length;
  let meanRate = 0;
  for (let i = 0; i < n; i++) meanRate += state.short_term_rates[i];
  meanRate = n > 0 ? meanRate / n : 0;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = state.short_term_rates[i] - meanRate;
    variance += diff * diff;
  }
  const sigma_deg_s = n > 1 ? Math.sqrt(variance / (n - 1)) : 0.02;

  // Zero-Velocity & Turning Detection
  const is_quiescent = Math.abs(sample.gyro_z_rad) < 0.025; // < ~1.4 deg/s
  const has_accel = sample.accel_x_mps2 !== undefined;
  const is_stationary = is_quiescent && (!has_accel || Math.abs(sample.accel_x_mps2!) < 0.18);

  if (is_stationary) {
    state.stationary_counter = Math.min(200, state.stationary_counter + 1);
  } else {
    state.stationary_counter = Math.max(0, state.stationary_counter - 1);
  }

  // Adaptive bias learning rate
  // When stationary, converge swiftly to true sensor zero-offset;
  // during active turns, adapt very slowly to avoid corrupting bias with vehicle dynamics.
  let alpha = 0.01;
  if (state.stationary_counter > 5) {
    alpha = 0.06; // fast calibration
  } else if (Math.abs(raw_yaw_rate_deg_s) > 4.0) {
    alpha = 0.001; // protect bias during vehicle turns
  }

  state.estimated_bias_rad_s = (1 - alpha) * state.estimated_bias_rad_s + alpha * sample.gyro_z_rad;
  const estimated_bias_deg_s = state.estimated_bias_rad_s * RAD_TO_DEG;

  // Debiased yaw rate
  const compensated_yaw_rate_deg_s = raw_yaw_rate_deg_s - estimated_bias_deg_s;

  // Record history point periodically (every ~200ms or 2 steps)
  const lastHistoryPoint = state.bias_history[state.bias_history.length - 1];
  const shouldRecordHistory = !lastHistoryPoint || (now - lastHistoryPoint.timestamp_ms) >= 200;

  // Calculate drift rate over historical window (deg/minute)
  let bias_drift_rate_deg_min = 0.0;
  if (state.bias_history.length >= 5) {
    const oldest = state.bias_history[0];
    const spanMinutes = (now - oldest.timestamp_ms) / 60000;
    if (spanMinutes > 0.05) {
      bias_drift_rate_deg_min = (estimated_bias_deg_s - oldest.bias_deg_s) / spanMinutes;
    }
  }

  // Calculate Heading Stability Index (0 - 100%)
  // Penalty components:
  // 1. Bias magnitude penalty (0.1 deg/s = 2% penalty, 0.5 deg/s = 10% penalty)
  // 2. Bias drift rate penalty (1.0 deg/min = 15% penalty)
  // 3. Sensor jitter penalty (noise sigma)
  const biasPenalty = Math.min(40, Math.abs(estimated_bias_deg_s) * 22);
  const driftPenalty = Math.min(35, Math.abs(bias_drift_rate_deg_min) * 16);
  const jitterPenalty = Math.min(25, sigma_deg_s * 35);

  const rawScore = 100 - (biasPenalty + driftPenalty + jitterPenalty);
  const heading_stability_pct = Math.max(15, Math.min(99.5, Math.round(rawScore * 10) / 10));

  if (shouldRecordHistory) {
    state.bias_history.push({
      timestamp_ms: now,
      bias_deg_s: Math.round(estimated_bias_deg_s * 1000) / 1000,
      stability_pct: heading_stability_pct,
    });
    // Keep bounded to last 60 points (~12-15 seconds of bias evolution)
    if (state.bias_history.length > 60) {
      state.bias_history.shift();
    }
  }

  // Stability Grade
  let stability_grade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'UNSTABLE';
  let advisory_text: string;

  if (heading_stability_pct >= 88) {
    stability_grade = 'EXCELLENT';
    advisory_text = 'Gyro bias stable. Dead-reckoning heading integration error is well-bounded (<0.5°/min).';
  } else if (heading_stability_pct >= 75) {
    stability_grade = 'GOOD';
    advisory_text = 'Nominal smartphone MEMS performance. AIDR-X neural factor graph compensates residual drift.';
  } else if (heading_stability_pct >= 55) {
    stability_grade = 'MODERATE';
    advisory_text = 'Thermal drift or dynamic vibrations detected. Increased heading uncertainty covariance applied.';
  } else {
    stability_grade = 'UNSTABLE';
    advisory_text = 'High gyro bias drift rate. Relying on map-matching constraints and zero-velocity updates.';
  }

  // Estimated Allan Deviation / Angular Random Walk (deg/sqrt(hr))
  const angular_random_walk_est = Math.round((sigma_deg_s * Math.sqrt(dt_s) * 60) * 100) / 100;

  return {
    heading_stability_pct,
    estimated_bias_deg_s: Math.round(estimated_bias_deg_s * 1000) / 1000,
    estimated_bias_rad_s: state.estimated_bias_rad_s,
    bias_drift_rate_deg_min: Math.round(bias_drift_rate_deg_min * 100) / 100,
    angular_random_walk_est,
    stability_grade,
    raw_yaw_rate_deg_s: Math.round(raw_yaw_rate_deg_s * 100) / 100,
    compensated_yaw_rate_deg_s: Math.round(compensated_yaw_rate_deg_s * 100) / 100,
    bias_history: state.bias_history,
    is_stationary,
    advisory_text,
  };
}
