// ============================================================================
// Orientation fusion math (quaternions).
//
// Why this exists: reading only the compass-derived orientation (alpha/beta/
// gamma) gives jittery, low-rate, and near-vertical-unstable pointing. Native
// sky apps feel glassy because they FUSE the gyroscope (smooth, fast, but
// drifts) with the magnetometer/compass (stable, but noisy). This module does
// the same with a complementary filter on quaternions:
//   - integrate the gyro each frame  → smooth, responsive motion
//   - slerp gently toward the compass → kills long-term drift
// Quaternions are used (not Euler angles) because they have no gimbal-flip,
// which is exactly the near-vertical instability we kept fighting.
// ============================================================================

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type Quat = { w: number; x: number; y: number; z: number };
export type V3 = { x: number; y: number; z: number };

export const QUAT_IDENTITY: Quat = { w: 1, x: 0, y: 0, z: 0 };

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

/**
 * Quaternion from the W3C device orientation Euler angles, matching the
 * R = Rz(alpha)·Rx(beta)·Ry(gamma) convention used elsewhere. Built by
 * composing the three axis quaternions in that order.
 */
export function quatFromEuler(alphaDeg: number, betaDeg: number, gammaDeg: number): Quat {
  const a = alphaDeg * DEG, b = betaDeg * DEG, g = gammaDeg * DEG;
  const cz = Math.cos(a / 2), sz = Math.sin(a / 2); // Z (alpha)
  const cx = Math.cos(b / 2), sx = Math.sin(b / 2); // X (beta)
  const cy = Math.cos(g / 2), sy = Math.sin(g / 2); // Y (gamma)
  const qz: Quat = { w: cz, x: 0, y: 0, z: sz };
  const qx: Quat = { w: cx, x: sx, y: 0, z: 0 };
  const qy: Quat = { w: cy, x: 0, y: sy, z: 0 };
  return quatNormalize(quatMultiply(quatMultiply(qz, qx), qy));
}

/** Rotate a vector by a quaternion (q · v · q⁻¹). */
export function quatRotate(q: Quat, v: V3): V3 {
  // t = 2 * cross(q.xyz, v); v' = v + q.w*t + cross(q.xyz, t)
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** The back-of-phone pointing direction in world space for this orientation. */
export function quatPointing(q: Quat): V3 {
  return quatRotate(q, { x: 0, y: 0, z: -1 });
}

/**
 * Integrate a device-frame angular velocity (deg/s) over dt seconds into the
 * orientation quaternion. The rotation happens in the device's own frame, so
 * we right-multiply: q' = q · dq.
 */
export function quatIntegrateGyro(
  q: Quat,
  rateXdeg: number,
  rateYdeg: number,
  rateZdeg: number,
  dt: number
): Quat {
  const wx = rateXdeg * DEG, wy = rateYdeg * DEG, wz = rateZdeg * DEG;
  const theta = Math.hypot(wx, wy, wz) * dt;
  if (theta < 1e-9) return q;
  const axisX = wx / (theta / dt), axisY = wy / (theta / dt), axisZ = wz / (theta / dt);
  const half = theta / 2;
  const s = Math.sin(half);
  const dq: Quat = { w: Math.cos(half), x: axisX * s, y: axisY * s, z: axisZ * s };
  return quatNormalize(quatMultiply(q, dq));
}

/** Spherical-linear interpolation from a toward b by t (0..1). */
export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
  // Take the shorter path.
  let bb = b;
  if (dot < 0) {
    bb = { w: -b.w, x: -b.x, y: -b.y, z: -b.z };
    dot = -dot;
  }
  if (dot > 0.9995) {
    // Very close — linear interp + normalize avoids div-by-zero.
    return quatNormalize({
      w: a.w + (bb.w - a.w) * t,
      x: a.x + (bb.x - a.x) * t,
      y: a.y + (bb.y - a.y) * t,
      z: a.z + (bb.z - a.z) * t,
    });
  }
  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);
  const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
  const s1 = sinTheta / sinTheta0;
  return {
    w: a.w * s0 + bb.w * s1,
    x: a.x * s0 + bb.x * s1,
    y: a.y * s0 + bb.y * s1,
    z: a.z * s0 + bb.z * s1,
  };
}

/** Angular distance between two quaternions, in degrees. */
export function quatAngleDeg(a: Quat, b: Quat): number {
  let dot = Math.abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z);
  dot = Math.min(1, dot);
  return 2 * Math.acos(dot) * RAD;
}

// ============================================================================
// Scalar yaw-offset complementary fusion (the path actually wired into the app).
//
// WHY THIS, NOT THE QUATERNION GYRO INTEGRATION ABOVE
// iOS already hands us a gyro-fused device attitude in alpha/beta/gamma (smooth,
// 60Hz, no integration needed). Its ONLY defect is that `alpha`'s zero is an
// arbitrary yaw set when listening began, so it is not north-referenced and it
// slowly drifts. webkitCompassHeading IS north-referenced but is coarse
// (~1deg quantized), low-rate, and frequently FREEZES for seconds.
//
// So instead of re-deriving attitude from rotationRate (which needs a fragile
// gyro axis/sign mapping that bit earlier attempts), we keep beta/gamma raw and
// correct ONLY the yaw: maintain a slowly-varying `offset` that nudges
// (alpha + offset) toward the compass heading. Because the offset moves slowly:
//   - a real pan rides `alpha` instantly (no lag, glassy)        -> smooth
//   - slow alpha drift is cancelled by the offset                -> no drift
//   - compass quantization/noise is averaged out by the slow gain -> no staircase
//   - a frozen compass just means "no new correction this frame"  -> pan unaffected
// This is the complementary filter, reduced to the one degree of freedom that
// is actually broken on iOS.
// ============================================================================

/** Smallest signed difference a-b on a circle, in degrees, range (-180, 180]. */
export function angleDiffDeg(a: number, b: number): number {
  let d = (((a - b) % 360) + 540) % 360 - 180;
  if (d <= -180) d += 360;
  return d;
}

/** Wrap an angle into [0, 360). */
export function wrap360(a: number): number {
  return ((a % 360) + 360) % 360;
}

export interface YawOffsetTracker {
  /**
   * Feed the raw (smooth, gyro-fused) device yaw and the north-referenced yaw
   * derived from the compass (same CCW sense as `e.alpha`, i.e. 360 - heading).
   * Pass `null` for `alphaTrueDeg` when no compass reading is available this
   * frame; the offset is then held (the platform's alpha is used as-is). Returns
   * the current yaw offset in degrees.
   */
  push(rawAlphaDeg: number, alphaTrueDeg: number | null): number;
  /** Forget state so the next push re-primes (e.g. when leaving live mode). */
  reset(): void;
  /** Current offset, for diagnostics. */
  offset(): number;
}

/**
 * @param gain per-sample correction toward the compass. At ~60Hz, 0.02 gives a
 * ~0.8s drift-correction time constant: slow enough to ignore compass jitter and
 * never lag a pan, fast enough to hold true north. Lower = steadier but slower to
 * recover from drift; higher = chases the (noisy) compass harder.
 */
export function makeYawOffsetTracker(gain = 0.02): YawOffsetTracker {
  let off = 0;
  let primed = false;
  return {
    push(rawAlphaDeg: number, alphaTrueDeg: number | null): number {
      if (!Number.isFinite(rawAlphaDeg)) return off;
      if (alphaTrueDeg == null || !Number.isFinite(alphaTrueDeg)) {
        // No compass reference this frame: hold the last offset.
        return off;
      }
      const target = wrap360(alphaTrueDeg - rawAlphaDeg);
      if (!primed) {
        // Lock onto the first compass reading instantly; track slowly after.
        off = target;
        primed = true;
        return off;
      }
      off = wrap360(off + gain * angleDiffDeg(target, off));
      return off;
    },
    reset() {
      off = 0;
      primed = false;
    },
    offset() {
      return off;
    },
  };
}
