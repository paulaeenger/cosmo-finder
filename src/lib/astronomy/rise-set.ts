// Compute rise, transit, and set times for a sky object on a given date.
//
// Method: sample altitude at fine intervals through the date and find
// horizon crossings (alt = 0) and the local maximum (transit). This is
// less elegant than analytical methods but works uniformly for stars,
// planets, the Sun, and the Moon, and avoids subtle bugs that come up
// with the cleaner formulas at extreme latitudes.

import { equatorialToHorizontal } from "@/lib/astronomy/coords";
import { getSolarBodies } from "@/lib/astronomy/planets";

export type RiseSetEvents = {
  rise: Date | null;     // first time the object crosses the horizon going up
  transit: Date | null;  // local maximum altitude (highest point)
  set: Date | null;      // last time it crosses the horizon going down
  alwaysUp: boolean;     // circumpolar — never sets
  alwaysDown: boolean;   // never rises (e.g. southern stars from far north)
  maxAlt: number;        // peak altitude in degrees
};

type StaticObject = {
  ra: number;  // hours
  dec: number; // degrees
};

/**
 * Compute rise/transit/set for a static-position object (star or DSO).
 * The position is treated as constant over the day — fine for everything
 * except solar system bodies.
 */
export function computeRiseSetStatic(
  obj: StaticObject,
  observerLat: number,
  observerLon: number,
  date: Date
): RiseSetEvents {
  // Sample every 5 minutes over a 24-hour window starting at local midnight
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const samples: Array<{ time: Date; alt: number }> = [];
  for (let m = 0; m <= 24 * 60; m += 5) {
    const t = new Date(start.getTime() + m * 60_000);
    const h = equatorialToHorizontal(
      { ra: obj.ra, dec: obj.dec },
      observerLat,
      observerLon,
      t
    );
    samples.push({ time: t, alt: h.alt });
  }

  return analyzeAltitudeSamples(samples);
}

/**
 * Compute rise/transit/set for a solar system body. Position is recomputed
 * at each sample because Sun, Moon, and planets move noticeably over a day.
 */
export function computeRiseSetSolarBody(
  bodyName: string,
  observerLat: number,
  observerLon: number,
  date: Date
): RiseSetEvents | null {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const samples: Array<{ time: Date; alt: number }> = [];
  for (let m = 0; m <= 24 * 60; m += 10) {
    const t = new Date(start.getTime() + m * 60_000);
    const bodies = getSolarBodies(t);
    const body = bodies.find((b) => b.name === bodyName);
    if (!body) return null;
    const h = equatorialToHorizontal(
      { ra: body.ra, dec: body.dec },
      observerLat,
      observerLon,
      t
    );
    samples.push({ time: t, alt: h.alt });
  }

  return analyzeAltitudeSamples(samples);
}

function analyzeAltitudeSamples(
  samples: Array<{ time: Date; alt: number }>
): RiseSetEvents {
  let rise: Date | null = null;
  let setT: Date | null = null;
  let maxIdx = 0;

  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].alt;
    const b = samples[i].alt;
    // Crossing zero?
    if (a < 0 && b >= 0 && rise == null) {
      // Linear interpolate to find approximate crossing time
      const frac = -a / (b - a);
      rise = new Date(
        samples[i - 1].time.getTime() +
          frac * (samples[i].time.getTime() - samples[i - 1].time.getTime())
      );
    }
    if (a > 0 && b <= 0) {
      const frac = a / (a - b);
      setT = new Date(
        samples[i - 1].time.getTime() +
          frac * (samples[i].time.getTime() - samples[i - 1].time.getTime())
      );
    }
    if (samples[i].alt > samples[maxIdx].alt) maxIdx = i;
  }

  const allAbove = samples.every((s) => s.alt > 0);
  const allBelow = samples.every((s) => s.alt < 0);

  return {
    rise,
    transit: samples[maxIdx].time,
    set: setT,
    alwaysUp: allAbove,
    alwaysDown: allBelow,
    maxAlt: samples[maxIdx].alt,
  };
}

/**
 * Sample altitude over a 24-hour window for plotting.
 * Returns alt at 5-minute intervals from local midnight to local midnight.
 */
export function sampleAltitudeCurve(
  obj: StaticObject,
  observerLat: number,
  observerLon: number,
  date: Date
): Array<{ time: Date; alt: number; az: number }> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const out: Array<{ time: Date; alt: number; az: number }> = [];
  for (let m = 0; m <= 24 * 60; m += 10) {
    const t = new Date(start.getTime() + m * 60_000);
    const h = equatorialToHorizontal(
      { ra: obj.ra, dec: obj.dec },
      observerLat,
      observerLon,
      t
    );
    out.push({ time: t, alt: h.alt, az: h.az });
  }
  return out;
}

export function sampleAltitudeCurveSolarBody(
  bodyName: string,
  observerLat: number,
  observerLon: number,
  date: Date
): Array<{ time: Date; alt: number; az: number }> | null {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const out: Array<{ time: Date; alt: number; az: number }> = [];
  for (let m = 0; m <= 24 * 60; m += 15) {
    const t = new Date(start.getTime() + m * 60_000);
    const bodies = getSolarBodies(t);
    const body = bodies.find((b) => b.name === bodyName);
    if (!body) return null;
    const h = equatorialToHorizontal(
      { ra: body.ra, dec: body.dec },
      observerLat,
      observerLon,
      t
    );
    out.push({ time: t, alt: h.alt, az: h.az });
  }
  return out;
}
