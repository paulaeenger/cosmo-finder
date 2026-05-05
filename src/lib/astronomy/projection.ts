// Stereographic projection — the lens through which we render a panoramic
// sky. Maps points on the celestial sphere (alt/az) to flat screen
// coordinates relative to the phone's current pointing direction.
//
// Why stereographic? It preserves angles locally — star patterns near the
// center of the screen look "correct" (Orion looks like Orion). It also
// elegantly maps the entire visible hemisphere to a finite area, so we
// can show "the whole sky around the user" without weird wrapping.
//
// Reference: https://en.wikipedia.org/wiki/Stereographic_projection
//
// Conceptually: imagine a sphere with the user at the center. Place the
// "screen" tangent to the sphere at the point the phone is pointing.
// For any other point on the sphere, draw a line from the antipode of
// the pointing direction through that point — wherever it hits the
// screen plane is the projected coordinate.

const DEG = Math.PI / 180;

export type ScreenPoint = { x: number; y: number; visible: boolean };

/**
 * Project a sky point onto a flat screen.
 *
 * @param objAlt   altitude of the object (degrees, -90..+90)
 * @param objAz    azimuth of the object (degrees, 0..360, 0=N, 90=E)
 * @param phoneAlt altitude phone is pointed at
 * @param phoneAz  azimuth phone is pointed at
 * @param fovDeg   how many degrees of sky should fit in the smaller screen dim
 * @param screenW  screen width in px
 * @param screenH  screen height in px
 * @returns screen coords; `visible` is false if the object is on the back hemisphere
 */
export function project(
  objAlt: number,
  objAz: number,
  phoneAlt: number,
  phoneAz: number,
  fovDeg: number,
  screenW: number,
  screenH: number
): ScreenPoint {
  const cx = screenW / 2;
  const cy = screenH / 2;

  // Convert sky coords to a 3D unit vector. Standard convention:
  //   x = east-west axis,  y = up,  z = north-south
  const objVec = altAzToVec3(objAlt, objAz);

  // Build a basis aligned with the phone's pointing direction.
  // - "forward" = where the phone is aimed (becomes screen Z, into the page)
  // - "right"   = screen +X axis at the pointing direction
  // - "up"      = screen +Y axis (toward sky-up)
  const forward = altAzToVec3(phoneAlt, phoneAz);
  const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(forward, worldUp));
  const up = cross(right, forward);

  // Project objVec into camera space
  const camX = dot(objVec, right);
  const camY = dot(objVec, up);
  const camZ = dot(objVec, forward);

  // If the object is behind the phone (camZ < 0), it's not visible.
  // (We allow camZ slightly negative so things at the edge of the FOV
  // can still be partially drawn instead of popping in/out.)
  if (camZ < -0.05) {
    return { x: 0, y: 0, visible: false };
  }

  // Stereographic mapping: r = 2 * tan(angle/2)
  // angle = arccos(camZ), so tan(angle/2) = sin(angle) / (1 + cos(angle))
  // and we have sin(angle) = sqrt(camX^2 + camY^2) (length of projection on screen plane).
  const denom = 1 + camZ;
  if (Math.abs(denom) < 1e-6) {
    return { x: 0, y: 0, visible: false };
  }
  const k = 2 / denom;
  const projX = camX * k;
  const projY = camY * k;

  // Scale: at the chosen FOV, an object 'fovDeg/2' from center should land
  // at radius = min(screenW, screenH) / 2.
  const halfFov = (fovDeg / 2) * DEG;
  const refRadius = 2 * Math.tan(halfFov / 2);
  const screenScale = Math.min(screenW, screenH) / 2 / refRadius;

  return {
    x: cx + projX * screenScale,
    y: cy - projY * screenScale, // flip Y because screen Y grows downward
    visible: true,
  };
}

// --- helpers ---

type Vec3 = { x: number; y: number; z: number };

function altAzToVec3(altDeg: number, azDeg: number): Vec3 {
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const cosAlt = Math.cos(alt);
  return {
    x: cosAlt * Math.sin(az),  // east component
    y: Math.sin(alt),           // up component
    z: cosAlt * Math.cos(az),   // north component
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
  const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return m > 1e-9 ? { x: v.x / m, y: v.y / m, z: v.z / m } : { x: 0, y: 0, z: 1 };
}

/**
 * Compute the sun's altitude given an observer location and time. Used
 * to drive the sky's color gradient (twilight, day, night).
 *
 * Returns degrees: positive = above horizon, negative = below.
 */
export function sunAltitude(
  latDeg: number,
  lonDeg: number,
  date: Date
): number {
  // Low-precision solar position, accurate to ~0.5° — fine for sky colors.
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) * DEG;
  const g = (357.528 + 0.9856003 * n) * DEG;
  const lambda =
    L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
  const eps = 23.439 * DEG;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));

  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = ((gmst + lonDeg / 15) % 24 + 24) % 24;
  const ha = (lst * 15 * DEG) - ra;

  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) +
    Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
}
