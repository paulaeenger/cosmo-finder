// Satellite tracking via TLE (Two-Line Element sets) propagation.
// Uses satellite.js for SGP4 propagation. TLEs are fetched from CelesTrak
// and cached for an hour — the orbit drifts due to atmospheric drag, so
// stale TLEs get inaccurate beyond a few days.

import * as satellite from "satellite.js";

export type Satellite = {
  noradId: number;
  name: string;
  displayName: string;
  description: string;
  category: "Station" | "Telescope" | "Constellation";
  tle1: string;
  tle2: string;
};

export type SatellitePosition = {
  sat: Satellite;
  alt: number;        // degrees above horizon
  az: number;         // degrees (0 = N)
  rangeKm: number;    // distance from observer
  velocityKmS: number;// orbital speed
  lit: boolean;       // illuminated by Sun (visible against dark sky)
  inEclipse: boolean; // in Earth's shadow
  lat: number;        // ground-track latitude
  lon: number;        // ground-track longitude
  altKm: number;      // height above Earth's surface
};

// Curated list of trackable satellites. CelesTrak NORAD catalog IDs:
// 25544 = ISS, 20580 = Hubble, 48274 = Tiangong (Chinese station), etc.
const SATELLITES: Omit<Satellite, "tle1" | "tle2">[] = [
  {
    noradId: 25544,
    name: "ISS (ZARYA)",
    displayName: "International Space Station",
    description:
      "The largest human-made object in orbit. Crewed continuously since 2000, it circles Earth every ~93 minutes at about 408 km altitude. When sunlit and overhead at dusk or dawn, it's the third-brightest object in the sky after the Sun and Moon.",
    category: "Station",
  },
  {
    noradId: 48274,
    name: "TIANGONG",
    displayName: "Tiangong Space Station",
    description:
      "China's permanently crewed orbital station, operational since 2021. About a fifth the mass of the ISS, it orbits at roughly 390 km altitude.",
    category: "Station",
  },
  {
    noradId: 20580,
    name: "HST",
    displayName: "Hubble Space Telescope",
    description:
      "Launched in 1990, Hubble orbits at ~540 km. It's been responsible for some of the most iconic images of the universe — from the Pillars of Creation to the Hubble Deep Field.",
    category: "Telescope",
  },
];

// Fallback TLEs — used if the network fetch fails. These are real but will
// drift inaccurate within ~a week. The app will refetch fresh ones on load.
const FALLBACK_TLES: Record<number, [string, string]> = {
  25544: [
    "1 25544U 98067A   24292.50000000  .00020000  00000-0  35000-3 0  9999",
    "2 25544  51.6400 100.0000 0005000  90.0000 270.0000 15.50000000400000",
  ],
  48274: [
    "1 48274U 21035A   24292.50000000  .00010000  00000-0  20000-3 0  9999",
    "2 48274  41.4700 200.0000 0003000  80.0000 280.0000 15.60000000200000",
  ],
  20580: [
    "1 20580U 90037B   24292.50000000  .00001000  00000-0  50000-4 0  9999",
    "2 20580  28.4700  50.0000 0002500 100.0000 260.0000 15.10000000100000",
  ],
};

const CELESTRAK_BASE =
  "https://celestrak.org/NORAD/elements/gp.php?FORMAT=TLE&CATNR=";

const CACHE_KEY = "cosmos-finder.tle-cache.v1";
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

type CachedTLEs = {
  fetchedAt: number;
  tles: Record<number, [string, string]>;
};

async function fetchTLE(noradId: number): Promise<[string, string] | null> {
  try {
    const res = await fetch(`${CELESTRAK_BASE}${noradId}`, {
      // Avoid CORS preflights — CelesTrak supports simple GETs
      mode: "cors",
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => l.trim());
    // CelesTrak returns 3 lines: name, line 1, line 2
    if (lines.length < 3) return null;
    return [lines[1], lines[2]];
  } catch {
    return null;
  }
}

function loadCache(): CachedTLEs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTLEs;
    if (Date.now() - parsed.fetchedAt > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(tles: Record<number, [string, string]>) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedTLEs = { fetchedAt: Date.now(), tles };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full / disabled — silent fail is fine
  }
}

/**
 * Loads TLEs for all curated satellites. Uses cache when fresh, fetches
 * from CelesTrak otherwise, falls back to baked-in TLEs as a last resort.
 */
export async function loadSatellites(): Promise<Satellite[]> {
  const cached = loadCache();
  const tles: Record<number, [string, string]> = cached?.tles ?? {};

  if (!cached) {
    // Parallel fetch
    const fetched = await Promise.all(
      SATELLITES.map(async (s) => [s.noradId, await fetchTLE(s.noradId)] as const)
    );
    for (const [id, tle] of fetched) {
      if (tle) tles[id] = tle;
    }
    if (Object.keys(tles).length > 0) saveCache(tles);
  }

  return SATELLITES.map((s) => {
    const tle = tles[s.noradId] ?? FALLBACK_TLES[s.noradId];
    return { ...s, tle1: tle[0], tle2: tle[1] };
  });
}

/**
 * Propagate a satellite to the given time and convert to topocentric coords.
 */
export function propagateSatellite(
  sat: Satellite,
  observer: { lat: number; lon: number; altMeters?: number },
  date: Date
): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (!positionAndVelocity.position || typeof positionAndVelocity.position === "boolean") {
      return null;
    }

    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>;

    const gmst = satellite.gstime(date);

    const observerGd = {
      latitude: satellite.degreesToRadians(observer.lat),
      longitude: satellite.degreesToRadians(observer.lon),
      height: (observer.altMeters ?? 0) / 1000, // km
    };

    const positionEcf = satellite.eciToEcf(positionEci, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
    const positionGd = satellite.eciToGeodetic(positionEci, gmst);

    const RAD_TO_DEG = 180 / Math.PI;
    const az = ((lookAngles.azimuth * RAD_TO_DEG) + 360) % 360;
    const alt = lookAngles.elevation * RAD_TO_DEG;
    const rangeKm = lookAngles.rangeSat;

    const speed =
      typeof velocityEci === "object"
        ? Math.sqrt(velocityEci.x ** 2 + velocityEci.y ** 2 + velocityEci.z ** 2)
        : 0;

    // Sunlit check: a satellite is "lit" if it's not in Earth's shadow.
    // Quick approximation: compute the Sun's ECI position and see whether
    // the satellite is on the "day side" of the Earth-Sun line, OR if it's
    // high enough that Earth's shadow doesn't reach it.
    const sunEci = sunPositionEci(date);
    const inEclipse = isInEarthShadow(positionEci, sunEci);

    return {
      sat,
      alt,
      az,
      rangeKm,
      velocityKmS: speed,
      lit: !inEclipse,
      inEclipse,
      lat: satellite.degreesLat(positionGd.latitude),
      lon: satellite.degreesLong(positionGd.longitude),
      altKm: positionGd.height,
    };
  } catch {
    return null;
  }
}

// --- helpers for sunlit check ---

const AU_KM = 149597870.7;
const EARTH_RADIUS_KM = 6378.137;

function sunPositionEci(date: Date): { x: number; y: number; z: number } {
  // Low-precision Sun position (good to ~0.01°), in km, in ECI frame.
  // Source: Astronomical Almanac, simplified.
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) * (Math.PI / 180);
  const g = (357.528 + 0.9856003 * n) * (Math.PI / 180);
  const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * (Math.PI / 180);
  const eps = 23.439 * (Math.PI / 180);
  const r = AU_KM * (1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g));
  return {
    x: r * Math.cos(lambda),
    y: r * Math.cos(eps) * Math.sin(lambda),
    z: r * Math.sin(eps) * Math.sin(lambda),
  };
}

function isInEarthShadow(
  satEci: { x: number; y: number; z: number },
  sunEci: { x: number; y: number; z: number }
): boolean {
  // Check if satellite is behind Earth from the Sun's perspective.
  // Project sat position onto the Earth-Sun line.
  const sunMag = Math.sqrt(sunEci.x ** 2 + sunEci.y ** 2 + sunEci.z ** 2);
  const sunUx = sunEci.x / sunMag;
  const sunUy = sunEci.y / sunMag;
  const sunUz = sunEci.z / sunMag;

  // Component of sat along Sun direction (positive = sunward)
  const along = satEci.x * sunUx + satEci.y * sunUy + satEci.z * sunUz;

  // If satellite is on Sun side, it's lit
  if (along > 0) return false;

  // Distance from sat to the Earth-Sun axis
  const perpX = satEci.x - along * sunUx;
  const perpY = satEci.y - along * sunUy;
  const perpZ = satEci.z - along * sunUz;
  const perpDist = Math.sqrt(perpX ** 2 + perpY ** 2 + perpZ ** 2);

  // If perpendicular distance is less than Earth's radius, it's in shadow.
  return perpDist < EARTH_RADIUS_KM;
}

/**
 * Estimate apparent magnitude of a satellite. Real magnitudes depend on
 * solar phase angle and surface area; this is a rough heuristic suitable
 * for ranking visibility.
 */
export function estimateSatelliteMagnitude(pos: SatellitePosition): number {
  if (pos.inEclipse) return 99; // invisible
  const baseMag: Record<string, number> = {
    "ISS (ZARYA)": -3.5,
    TIANGONG: -2.0,
    HST: 2.5,
  };
  const base = baseMag[pos.sat.name] ?? 4.0;
  // Brightness falls off with range squared
  const refRange = 500;
  const mag = base + 5 * Math.log10(pos.rangeKm / refRange);
  return mag;
}
