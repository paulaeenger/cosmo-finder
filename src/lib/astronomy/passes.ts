// Satellite pass prediction.
//
// A "visible pass" is a window during which a satellite is:
//   1. Above the observer's horizon (alt > horizonThreshold)
//   2. Sunlit (in direct sunlight, not in Earth's shadow)
//   3. The observer is in twilight or darker (sky is dark enough to see it)
//
// Method: forward-step the SGP4 propagator at 30-second intervals through
// the prediction window. Detect rise/set crossings at the threshold.
// Within each pass, find peak altitude, peak azimuth, brightness estimate.

import { propagateSatellite, type Satellite, type SatellitePosition } from "./satellites";

export type SatellitePass = {
  satellite: Satellite;
  start: Date;
  end: Date;
  peakTime: Date;
  peakAlt: number;
  startAz: number;
  endAz: number;
  peakAz: number;
  /** Estimated peak magnitude (lower = brighter) */
  peakMagnitude: number;
  duration: number; // seconds
};

const HORIZON_THRESHOLD_DEG = 10; // ignore passes that don't get above this

/**
 * Compute the Sun's altitude — used to gate "is the sky dark enough" check.
 * We accept passes where the observer is in at least civil twilight.
 */
function sunAltitude(lat: number, lon: number, date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) % 360) * (Math.PI / 180);
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180);
  const eps = 23.439 * (Math.PI / 180);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));

  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = (gmst + lon) * (Math.PI / 180);
  const ha = lst - ra;

  const latRad = lat * (Math.PI / 180);
  const sinAlt =
    Math.sin(dec) * Math.sin(latRad) +
    Math.cos(dec) * Math.cos(latRad) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);
}

/**
 * Predict visible passes for a satellite over the next `days` days from `from`.
 * Returns up to `maxResults` passes, sorted chronologically.
 */
export function predictPasses(
  satellite: Satellite,
  observer: { lat: number; lon: number },
  from: Date,
  days = 5,
  maxResults = 10
): SatellitePass[] {
  const stepMs = 30_000; // 30s
  const endTime = from.getTime() + days * 24 * 3600 * 1000;
  const passes: SatellitePass[] = [];

  let currentPass: {
    start: Date;
    samples: Array<{ time: Date; pos: SatellitePosition }>;
  } | null = null;

  for (let t = from.getTime(); t < endTime; t += stepMs) {
    const time = new Date(t);
    const pos = propagateSatellite(satellite, observer, time);
    if (!pos) continue;

    const skyDarkEnough = sunAltitude(observer.lat, observer.lon, time) < -3;
    const aboveThreshold = pos.alt >= HORIZON_THRESHOLD_DEG;
    const isVisible = aboveThreshold && pos.lit && skyDarkEnough;

    if (isVisible) {
      if (!currentPass) {
        currentPass = { start: time, samples: [] };
      }
      currentPass.samples.push({ time, pos });
    } else if (currentPass && currentPass.samples.length > 0) {
      // Pass just ended — record it
      const samples = currentPass.samples;
      let peakIdx = 0;
      for (let i = 1; i < samples.length; i++) {
        if (samples[i].pos.alt > samples[peakIdx].pos.alt) peakIdx = i;
      }
      const start = samples[0];
      const end = samples[samples.length - 1];
      const peak = samples[peakIdx];

      // Use the brightest sample's range for peak magnitude estimate
      const peakMag = estimatePassMagnitude(satellite.name, peak.pos.rangeKm);

      passes.push({
        satellite,
        start: start.time,
        end: end.time,
        peakTime: peak.time,
        peakAlt: peak.pos.alt,
        startAz: start.pos.az,
        endAz: end.pos.az,
        peakAz: peak.pos.az,
        peakMagnitude: peakMag,
        duration: (end.time.getTime() - start.time.getTime()) / 1000,
      });

      currentPass = null;

      if (passes.length >= maxResults) break;
    }
  }

  return passes;
}

function estimatePassMagnitude(name: string, rangeKm: number): number {
  const baseMag: Record<string, number> = {
    "ISS (ZARYA)": -3.5,
    TIANGONG: -2.0,
    HST: 2.5,
  };
  const base = baseMag[name] ?? 4.0;
  // Brightness falls off with range squared
  return base + 5 * Math.log10(rangeKm / 500);
}

/**
 * Convert azimuth degrees to a cardinal-direction string.
 */
export function azToCardinal(az: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((az % 360) / 22.5)) % 16];
}
