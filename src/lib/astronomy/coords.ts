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
  push: (h: HorizontalCoord) => HorizontalCoord;
  reset: () => void;
};

/**
 * Create a stateful exponential smoother for alt/az.
 *
 * @param factor  0..1 — fraction of the NEW reading blended in each update.
 *                Lower = smoother but laggier. ~0.25 is a good phone default.
 */
export function makeOrientationSmoother(factor = 0.25): OrientationSmoother {
  let alt: number | null = null;
  // Azimuth carried as a 2D unit-ish vector to survive the 0/360 wrap.
  let ax = 0;
  let ay = 0;
  let primed = false;

  return {
    push(h: HorizontalCoord): HorizontalCoord {
      const azRad = h.az * DEG;
      const nx = Math.sin(azRad);
      const ny = Math.cos(azRad);
      if (!primed) {
        alt = h.alt;
        ax = nx;
        ay = ny;
        primed = true;
      } else {
        alt = alt! + (h.alt - alt!) * factor;
        ax = ax + (nx - ax) * factor;
        ay = ay + (ny - ay) * factor;
      }
      let az = Math.atan2(ax, ay) * RAD;
      az = ((az % 360) + 360) % 360;
      return { alt: alt!, az };
    },
    reset() {
      alt = null;
      ax = 0;
      ay = 0;
      primed = false;
    },
  };
}
