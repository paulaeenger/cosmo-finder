// ============================================================================
// Heading stabilizer — azimuth-only.
//
// WHY THIS EXISTS
// On iOS the live view azimuth slides sideways while the phone is held still,
// worst when the phone is near-vertical (beta ~ 90°), where the Euler->azimuth
// mapping amplifies sensor noise and the webkitCompassHeading frequently freezes
// (no absolute anchor pulling heading back). Diagnostic captures showed azimuth
// creeping ~4–5°/s while the phone was effectively motionless.
//
// A plain low-pass on azimuth cannot fix this: to a smoother, a slow magnetometer
// drift and a slow intentional pan look identical, so any smoothing strong enough
// to kill the drift also lags real pans.
//
// THE DISCRIMINATOR is the gyro ENERGY (|rotationRate|), used as a sign-free
// magnitude only — so this deliberately avoids the gyro axis/sign mapping that
// has bitten earlier fusion attempts. A real pan (even a slow one) carries
// sustained gyro energy; magnetometer drift while still carries ~none. So:
//   - low gyro energy  -> phone is still  -> freeze azimuth (reject the drift)
//   - high gyro energy -> real pan        -> follow the measured azimuth
// with a smooth ramp between. Altitude and roll are NOT touched here.
//
// This is intentionally a small 1-D complementary filter on the azimuth angle,
// run once per render frame (the render loop is a steady ~60fps by design, so
// the gains are expressed per-frame and no dt bookkeeping is needed).
// ============================================================================

export interface HeadingStabilizerConfig {
  /** Below this |gyro| (deg/s) the phone is treated as still -> heavy freeze. */
  tremorFloorDegPerSec: number;
  /** At/above this |gyro| (deg/s) we follow the measurement at full gain. */
  panFloorDegPerSec: number;
  /** Per-frame correction gain when still. Tiny -> drift is rejected. */
  freezeGain: number;
  /** Per-frame correction gain during a clear pan. */
  followGain: number;
  /**
   * Gyro energy assumed before the first devicemotion sample arrives (or if the
   * device never delivers rotationRate). High so we "fail open" to follow-mode
   * and never silently freeze a view we can't verify is still.
   */
  defaultEnergyDegPerSec: number;
}

export const DEFAULT_HEADING_STABILIZER_CONFIG: HeadingStabilizerConfig = {
  // Captured hand-tremor-while-still measured ~5–6 deg/s; deliberate pans run
  // well above. These are the on-device tuning knobs.
  tremorFloorDegPerSec: 7,
  panFloorDegPerSec: 22,
  freezeGain: 0.006,
  followGain: 0.5,
  defaultEnergyDegPerSec: 999,
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Smallest signed difference a-b on a circle, in degrees, range (-180, 180]. */
export function angleDiffDeg(a: number, b: number): number {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  // Normalize the boundary so exactly -180 reads as +180 (cosmetic, stable).
  if (d <= -180) d += 360;
  return d;
}

/** Wrap an angle into [0, 360). */
export function wrap360(a: number): number {
  return ((a % 360) + 360) % 360;
}

export interface HeadingStabilizer {
  /**
   * Feed the latest measured azimuth (deg) and the current gyro energy
   * (|rotationRate| magnitude in deg/s) and get back the stabilized azimuth.
   * Call once per render frame.
   */
  push(measuredAzDeg: number, gyroEnergyDegPerSec: number): number;
  /** Forget state (e.g. when leaving live mode) so the next push re-primes. */
  reset(): void;
  /** Current gain in [freezeGain, followGain], for diagnostics. */
  lastGain(): number;
}

export function createHeadingStabilizer(
  config: Partial<HeadingStabilizerConfig> = {}
): HeadingStabilizer {
  const cfg = { ...DEFAULT_HEADING_STABILIZER_CONFIG, ...config };
  let azHat: number | null = null;
  let lastGain = cfg.followGain;

  return {
    push(measuredAzDeg: number, gyroEnergyDegPerSec: number): number {
      if (!Number.isFinite(measuredAzDeg)) {
        return azHat ?? 0;
      }
      // First sample (or after reset): adopt the measurement exactly.
      if (azHat == null) {
        azHat = wrap360(measuredAzDeg);
        return azHat;
      }
      const energy = Number.isFinite(gyroEnergyDegPerSec)
        ? gyroEnergyDegPerSec
        : cfg.defaultEnergyDegPerSec;
      // Ramp the correction gain from freeze->follow across the tremor->pan band.
      const t = clamp01(
        (energy - cfg.tremorFloorDegPerSec) /
          Math.max(1e-6, cfg.panFloorDegPerSec - cfg.tremorFloorDegPerSec)
      );
      const gain = cfg.freezeGain + (cfg.followGain - cfg.freezeGain) * t;
      lastGain = gain;
      const diff = angleDiffDeg(measuredAzDeg, azHat);
      azHat = wrap360(azHat + gain * diff);
      return azHat;
    },
    reset() {
      azHat = null;
      lastGain = cfg.followGain;
    },
    lastGain() {
      return lastGain;
    },
  };
}
