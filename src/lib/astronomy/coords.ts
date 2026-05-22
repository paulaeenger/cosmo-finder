// Astronomical coordinate conversions.
// All angles are in degrees on the public surface; we use radians internally.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type EquatorialCoord = {
  ra: number;  // hours (0..24)
  dec: number; // degrees (-90..+90)
};

export type HorizontalCoord = {
  alt: number; // altitude in degrees (-90..+90; > 0 means above horizon)
  az: number;  // azimuth in degrees, measured clockwise from North (0..360)
};

/**
 * Calculate the Greenwich Mean Sidereal Time (GMST) in hours for a given Date.
 * Based on the IAU 1982 formula; accurate enough for visual identification.
 */
export function gmstHours(date: Date): number {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst / 15; // convert degrees to hours
}

export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Local Sidereal Time (hours) for a given longitude (degrees, east positive).
 */
export function localSiderealTime(date: Date, longitudeDeg: number): number {
  const lst = gmstHours(date) + longitudeDeg / 15;
  return ((lst % 24) + 24) % 24;
}

/**
 * Convert equatorial coordinates (RA in hours, Dec in degrees) to
 * horizontal coordinates (Alt/Az) for an observer at lat/lon and time.
 */
export function equatorialToHorizontal(
  eq: EquatorialCoord,
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date
): HorizontalCoord {
  const lst = localSiderealTime(date, longitudeDeg); // hours
  const haHours = lst - eq.ra; // hour angle in hours
  const ha = haHours * 15 * DEG; // radians
  const dec = eq.dec * DEG;
  const lat = latitudeDeg * DEG;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) /
    (Math.cos(alt) * Math.cos(lat));
  const sinAz = -Math.sin(ha) * Math.cos(dec) / Math.cos(alt);

  let az = Math.atan2(sinAz, cosAz);
  if (az < 0) az += 2 * Math.PI;

  return { alt: alt * RAD, az: az * RAD };
}

/**
 * Angular distance (degrees) between two horizontal coordinates.
 * Uses the spherical law of cosines, clamped against floating-point error.
 */
export function angularDistance(a: HorizontalCoord, b: HorizontalCoord): number {
  const alt1 = a.alt * DEG;
  const alt2 = b.alt * DEG;
  const dAz = (a.az - b.az) * DEG;

  const cosD =
    Math.sin(alt1) * Math.sin(alt2) +
    Math.cos(alt1) * Math.cos(alt2) * Math.cos(dAz);

  return Math.acos(Math.max(-1, Math.min(1, cosD))) * RAD;
}

/**
 * Convert a magnetic compass heading + tilt into a sky-pointing alt/az.
 *
 * alpha: compass direction the device is facing (0 = north, 90 = east)
 * beta:  front/back tilt around X. When phone is held vertically pointing
 *        forward, beta ≈ 90°; when flat face-up, beta ≈ 0°.
 *
 * We approximate altitude as (beta - 90), clamped to [-90, 90].
 * For a more accurate model you'd need to fuse alpha/beta/gamma with a
 * device orientation matrix, but this is good enough for a visual MVP.
 */
export function deviceToHorizontal(
  alpha: number | null,
  beta: number | null
): HorizontalCoord | null {
  if (alpha == null || beta == null) return null;
  const az = ((alpha % 360) + 360) % 360;
  let alt = beta - 90;
  if (alt > 90) alt = 90;
  if (alt < -90) alt = -90;
  // When beta is small/negative, the phone is tilted away from "up" — that
  // means it's pointing down toward the ground. We invert when the user
  // is holding the phone overhead vs. flat. Most "point at sky" usage
  // produces beta in 30–90° range, so the simple subtraction works.
  return { alt, az };
}

// ============================================================================
// Full 3-axis device orientation → sky pointing.
//
// The legacy deviceToHorizontal() above uses only alpha + beta and is correct
// only when the phone is held near-vertical in portrait. This version uses all
// three Euler angles plus the screen rotation, so the pointing stays locked to
// the real sky in any posture (portrait, landscape, rolled, tilted).
//
// The browser reports orientation as an intrinsic Tait-Bryan rotation in the
// Z-X'-Y'' convention (alpha about Z, then beta about the new X, then gamma
// about the new Y). We rebuild that rotation matrix, optionally apply the
// screen's own rotation, then ask: in world space, which way is the back of
// the phone pointing? That vector, converted to alt/az, is where the user is
// aiming. Reference: W3C DeviceOrientation Event spec, "deviceorientation".
// ============================================================================

type Vec3 = { x: number; y: number; z: number };
type Mat3 = [number, number, number, number, number, number, number, number, number];

/**
 * Rotation matrix from device orientation Euler angles (degrees).
 * Z-X'-Y'' intrinsic order, matching the DeviceOrientation spec.
 */
function eulerToMatrix(alphaDeg: number, betaDeg: number, gammaDeg: number): Mat3 {
  const a = alphaDeg * DEG;
  const b = betaDeg * DEG;
  const g = gammaDeg * DEG;

  const cA = Math.cos(a), sA = Math.sin(a);
  const cB = Math.cos(b), sB = Math.sin(b);
  const cG = Math.cos(g), sG = Math.sin(g);

  // R = Rz(alpha) · Rx(beta) · Ry(gamma), expanded.
  // (Same expansion the W3C spec publishes for getRotationMatrix.)
  const m11 = cA * cG - sA * sB * sG;
  const m12 = -cB * sA;
  const m13 = cG * sA * sB + cA * sG;

  const m21 = cG * sA + cA * sB * sG;
  const m22 = cA * cB;
  const m23 = sA * sG - cA * cG * sB;

  const m31 = -cB * sG;
  const m32 = sB;
  const m33 = cB * cG;

  return [m11, m12, m13, m21, m22, m23, m31, m32, m33];
}

function matVec(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 {
  const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

/**
 * Convert full device orientation to a sky-pointing alt/az.
 *
 * @param alpha   compass rotation about Z (deg, 0 = north). On iOS, pass the
 *                value already corrected via webkitCompassHeading.
 * @param beta    front/back tilt about X (deg)
 * @param gamma   left/right roll about Y (deg)
 * @param screenAngle  screen.orientation.angle (0 | 90 | 180 | 270). Accounts
 *                for the OS having rotated the UI into landscape.
 *
 * Returns alt/az for the direction the BACK of the phone points — i.e. where
 * the user aims the device at the sky. Null if alpha/beta/gamma unavailable.
 */
/**
 * Like deviceToHorizontalFull, but returns the raw world-space pointing VECTOR
 * (x=east, y=north, z=up) instead of alt/az. Smoothing a vector avoids the
 * azimuth blow-up that happens near the zenith, so this is what we smooth.
 */
export function deviceToVector(
  alpha: number | null,
  beta: number | null,
  gamma: number | null
): Vec3 | null {
  if (alpha == null || beta == null || gamma == null) return null;
  const m = eulerToMatrix(alpha, beta, gamma);
  return matVec(m, { x: 0, y: 0, z: -1 });
}

/** Convert a world pointing vector (x=east, y=north, z=up) to alt/az degrees. */
export function vectorToHorizontal(v: Vec3): HorizontalCoord {
  const horiz = Math.sqrt(v.x * v.x + v.y * v.y);
  const altRad = Math.atan2(v.z, horiz);
  const azRad = Math.atan2(-v.x, v.y);
  let az = azRad * RAD;
  az = ((az % 360) + 360) % 360;
  return { alt: altRad * RAD, az };
}

/** Unit-vector for an alt/az direction (world frame x=east, y=north, z=up). */
export function horizontalToVector(alt: number, az: number): Vec3 {
  const a = alt * DEG, z = az * DEG;
  const c = Math.cos(a);
  // Inverse of vectorToHorizontal: az measured clockwise from north via
  // atan2(-x, y), so x = -sin(az)cos(alt), y = cos(az)cos(alt), z = sin(alt).
  return { x: -Math.sin(z) * c, y: Math.cos(z) * c, z: Math.sin(a) };
}

// ============================================================================
// Calibration. The raw device→sky mapping can be off by a fixed rotation on a
// given phone (compass bias, frame convention quirks). Rather than guess the
// convention, we MEASURE it: the user points at one known object, and we solve
// the rotation that maps the measured pointing vector onto the object's true
// direction, then apply it to every subsequent reading. One good anchor fixes
// the whole sky when the error is a constant rotation, which is the usual case.
// ============================================================================

export type Calibration = Mat3; // a rotation matrix applied to raw vectors

/** Identity (no correction). */
export const IDENTITY_CALIBRATION: Calibration = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * Solve the shortest-arc rotation matrix R such that R·measured ≈ trueDir.
 * Both inputs are (not necessarily unit) world vectors. Aligning the look
 * direction is what places objects correctly; the residual roll about that
 * axis is left unconstrained (it only affects image roll, not where objects
 * land), so we use the minimal rotation.
 */
export function solveCalibration(measured: Vec3, trueDir: Vec3): Calibration {
  const a = normalize(measured);
  const b = normalize(trueDir);
  const d = dot(a, b);
  // Already aligned.
  if (d > 0.99999) return IDENTITY_CALIBRATION;
  // Opposite: rotate 180° about any axis perpendicular to a.
  if (d < -0.99999) {
    // Pick an arbitrary perpendicular axis.
    const axis = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const p = normalize(cross(a, axis));
    return rotationFromAxisAngle(p, Math.PI);
  }
  const axis = normalize(cross(a, b));
  const angle = Math.acos(Math.max(-1, Math.min(1, d)));
  return rotationFromAxisAngle(axis, angle);
}

/** Apply a calibration rotation to a raw pointing vector. */
export function applyCalibration(cal: Calibration, v: Vec3): Vec3 {
  return matVec(cal, v);
}

function rotationFromAxisAngle(axis: Vec3, angle: number): Mat3 {
  const { x, y, z } = axis;
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

export function deviceToHorizontalFull(
  alpha: number | null,
  beta: number | null,
  gamma: number | null,
  screenAngle = 0
): HorizontalCoord | null {
  if (alpha == null || beta == null || gamma == null) return null;

  const m = eulerToMatrix(alpha, beta, gamma);

  // The device-frame axis that points OUT THE BACK of the phone (away from the
  // screen) is -Z in the spec's device coordinate system. We rotate that axis
  // into world space. World frame: X=east, Y=north, Z=up.
  // The raw orientation matrix maps device→world with Y=north, Z=up, X=east
  // once we interpret the spec's axes, so the back-of-phone direction is the
  // matrix applied to (0, 0, -1).
  let pointing = matVec(m, { x: 0, y: 0, z: -1 });

  // Apply the screen rotation (portrait vs landscape). The OS rotates the UI
  // about the viewing axis, so we counter-rotate the pointing vector in the
  // device's screen plane before reading it out. For the back-pointing axis a
  // screen rotation about Z in the device frame is equivalent to rotating the
  // resulting world vector's interpretation; we handle it by rotating the
  // device "up" reference, but since we only need the look direction (not the
  // roll of the rendered image yet), screenAngle mainly matters when we later
  // derive an "up" vector. For the look direction itself it's a no-op, so we
  // keep the hook plumbing but leave the vector unchanged here.
  void screenAngle;

  // Convert world vector → alt/az.
  // World axes: x = east, y = north, z = up.
  const { x, y, z } = pointing;
  const horiz = Math.sqrt(x * x + y * y);
  const altRad = Math.atan2(z, horiz);
  // Azimuth measured clockwise from north (0..360). Negate the east component
  // so rotation runs the correct way (verified east→90, west→270).
  const azRad = Math.atan2(-x, y);
  let az = azRad * RAD;
  az = ((az % 360) + 360) % 360;

  return { alt: altRad * RAD, az };
}

// ============================================================================
// Orientation smoothing.
//
// Raw sensor output jitters frame to frame, and near the beta=90 gimbal
// singularity the azimuth can twitch. A light exponential low-pass filter
// makes the rendered sky glide ("serenely still") instead of trembling.
//
// Altitude smooths linearly. Azimuth must smooth ON THE UNIT CIRCLE, otherwise
// the 0/360 wrap produces wild swings (blending 359° and 1° must give 0°, not
// 180°). We keep the smoothed azimuth as a vector and read its angle back.
// ============================================================================

export type OrientationSmoother = {
  /** Push a raw pointing VECTOR; get back smoothed alt/az. */
  push: (v: Vec3) => HorizontalCoord;
  reset: () => void;
};

/**
 * Stateful smoother that operates on the 3D pointing VECTOR rather than alt/az
 * angles. This is the key to stability when pointing near straight up: azimuth
 * becomes hypersensitive near the zenith (a tiny wobble swings it wildly), but
 * the direction vector moves smoothly everywhere. We low-pass the vector, then
 * convert to alt/az only at the very end.
 *
 * @param factor  0..1 base blend when nearly still. Lower = steadier.
 */
export function makeOrientationSmoother(factor = 0.12): OrientationSmoother {
  let sx = 0, sy = 0, sz = 0;
  let primed = false;
  // Candidate tracking: a large jump is only accepted once a NEW orientation is
  // confirmed by several consecutive, mutually-consistent readings.
  let candX = 0, candY = 0, candZ = 0, candCount = 0;
  const JUMP_LIMIT_DEG = 35;

  return {
    push(v: Vec3): HorizontalCoord {
      const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
      const nx = v.x / l, ny = v.y / l, nz = v.z / l;
      if (!primed) {
        sx = nx; sy = ny; sz = nz;
        primed = true;
        candX = nx; candY = ny; candZ = nz; candCount = 0;
        return vectorToHorizontal({ x: sx, y: sy, z: sz });
      }

      const dotp = Math.max(-1, Math.min(1, sx * nx + sy * ny + sz * nz));
      const errDeg = Math.acos(dotp) * RAD;

      if (errDeg > JUMP_LIMIT_DEG) {
        // Impossible single-frame jump → almost certainly the iOS steep-tilt
        // azimuth flip. We do NOT follow it. But to avoid freezing forever if
        // the device has genuinely settled at a new orientation, we require the
        // new position to be CONFIRMED by ~12 consecutive, mutually-consistent
        // readings before re-priming. A flip that merely oscillates back and
        // forth never builds that agreement, so it stays rejected; a real abrupt
        // reorientation does, and we snap to it (~0.2s later).
        const cdot = Math.max(-1, Math.min(1, candX * nx + candY * ny + candZ * nz));
        const candErr = Math.acos(cdot) * RAD;
        if (candErr < 10) {
          candCount++;
        } else {
          candX = nx; candY = ny; candZ = nz; candCount = 1;
        }
        if (candCount >= 12) {
          sx = nx; sy = ny; sz = nz;
          candCount = 0;
          return vectorToHorizontal({ x: sx, y: sy, z: sz });
        }
        return vectorToHorizontal({ x: sx, y: sy, z: sz });
      }

      // Normal in-range update. Keep the candidate tracking the live reading so
      // a later flip is measured against where we actually are.
      candX = nx; candY = ny; candZ = nz; candCount = 0;
      const adaptive = Math.min(0.6, factor + (errDeg / 25) * (0.6 - factor));
      sx += (nx - sx) * adaptive;
      sy += (ny - sy) * adaptive;
      sz += (nz - sz) * adaptive;
      const sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
      sx /= sl; sy /= sl; sz /= sl;
      return vectorToHorizontal({ x: sx, y: sy, z: sz });
    },
    reset() {
      sx = 0; sy = 0; sz = 0;
      primed = false;
      candX = 0; candY = 0; candZ = 0; candCount = 0;
    },
  };
}

// ============================================================================
// Tracking guidance — turn a "where I'm pointing" vs "where the target is"
// comparison into human instructions ("turn left, tilt up").
// ============================================================================

export type GuidanceArrow = "up" | "down" | "left" | "right" | "on-target";

export type TrackingGuidance = {
  /** Total angular separation in degrees. */
  separation: number;
  /** Horizontal instruction: turn left/right (or none when aligned). */
  turn: "left" | "right" | null;
  /** Vertical instruction: tilt up/down (or none when aligned). */
  tilt: "up" | "down" | null;
  /** The single most important arrow to show prominently. */
  primary: GuidanceArrow;
  /** True once the phone is aimed within the on-target threshold. */
  onTarget: boolean;
  /** Short human phrase, e.g. "Turn left and tilt up". */
  text: string;
};

/**
 * Compute how the user should move the phone to bring `target` to the center
 * of view from their current `pointing` direction.
 *
 * Azimuth wrap is handled so "turn left vs right" always takes the short way
 * around. `onTargetDeg` is the cone (radius, degrees) counted as "aimed".
 */
export function computeTrackingGuidance(
  pointing: HorizontalCoord,
  target: HorizontalCoord,
  onTargetDeg = 4
): TrackingGuidance {
  const separation = angularDistance(pointing, target);

  // Azimuth error, normalized to [-180, 180]. Positive = target is clockwise
  // (to the right) of where we're pointing.
  let dAz = target.az - pointing.az;
  dAz = ((dAz + 540) % 360) - 180;
  // Altitude error. Positive = target is higher than where we're pointing.
  const dAlt = target.alt - pointing.alt;

  const onTarget = separation <= onTargetDeg;

  // Dead-zone each axis a bit so we don't nag about a degree of jitter.
  const AXIS_DEADZONE = 3;
  const turn: "left" | "right" | null = onTarget
    ? null
    : Math.abs(dAz) < AXIS_DEADZONE
    ? null
    : dAz > 0
    ? "right"
    : "left";
  const tilt: "up" | "down" | null = onTarget
    ? null
    : Math.abs(dAlt) < AXIS_DEADZONE
    ? null
    : dAlt > 0
    ? "up"
    : "down";

  // Primary arrow = whichever axis is more wrong, so the big hint points the
  // most useful way.
  let primary: GuidanceArrow = "on-target";
  if (!onTarget) {
    if (Math.abs(dAz) >= Math.abs(dAlt)) {
      primary = dAz > 0 ? "right" : "left";
    } else {
      primary = dAlt > 0 ? "up" : "down";
    }
  }

  let text: string;
  if (onTarget) {
    text = "You're on it";
  } else {
    const parts: string[] = [];
    if (turn) parts.push(`Turn ${turn}`);
    if (tilt) parts.push(parts.length ? `tilt ${tilt}` : `Tilt ${tilt}`);
    text = parts.length ? parts.join(" and ") : "Almost there";
  }

  return { separation, turn, tilt, primary, onTarget, text };
}
