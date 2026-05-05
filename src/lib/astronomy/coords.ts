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
