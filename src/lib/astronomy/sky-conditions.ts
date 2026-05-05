// Sky condition logic — answers "what would I actually see if I looked up
// right now?" based on the Sun's altitude.
//
// The sky transitions through five phases as the Sun moves:
//   day              — Sun above horizon, only Sun + Moon + brightest planets visible
//   civil twilight   — Sun 0° to -6° below horizon, brightest stars/planets emerge
//   nautical twilight— Sun -6° to -12°, most navigation stars visible
//   astronomical tw. — Sun -12° to -18°, most stars visible, sky still slightly bright
//   night            — Sun below -18°, full sky visible including faint deep-sky
//
// Object visibility is filtered by phase: during civil twilight, only objects
// brighter than ~mag 1.5 are realistically visible to a naked-eye observer.

import type { SkyObject } from "./matching";

export type SkyPhase = "day" | "civil" | "nautical" | "astronomical" | "night";

export type SkyConditions = {
  sunAlt: number;
  phase: SkyPhase;
  /** Magnitude limit for naked-eye visibility in current conditions. */
  magLimit: number;
  /** Human-readable phase name for the UI. */
  label: string;
  /** Brief description of viewing conditions. */
  description: string;
};

export function getSkyConditions(sunAlt: number): SkyConditions {
  if (sunAlt > 0) {
    return {
      sunAlt,
      phase: "day",
      magLimit: -3, // only Sun, Moon, Venus near greatest brilliancy
      label: "Day",
      description: "Stars are not visible during daylight hours.",
    };
  }
  if (sunAlt > -6) {
    return {
      sunAlt,
      phase: "civil",
      magLimit: 1.5,
      label: "Civil twilight",
      description: "The brightest planets and stars are emerging.",
    };
  }
  if (sunAlt > -12) {
    return {
      sunAlt,
      phase: "nautical",
      magLimit: 3.0,
      label: "Nautical twilight",
      description: "Most bright stars are now visible.",
    };
  }
  if (sunAlt > -18) {
    return {
      sunAlt,
      phase: "astronomical",
      magLimit: 4.5,
      label: "Astronomical twilight",
      description: "Faint stars are emerging; deep-sky objects still washed out.",
    };
  }
  return {
    sunAlt,
    phase: "night",
    magLimit: 6.5,
    label: "Night",
    description: "Full naked-eye sky is visible.",
  };
}

/**
 * Decide whether an object is realistically visible to a naked-eye observer
 * given current sky conditions. This is independent of category filters —
 * filters are about user preference, visibility is about physics.
 */
export function isVisibleNow(obj: SkyObject, conditions: SkyConditions): boolean {
  // Sun and Moon are always visible when above the horizon, regardless of phase
  if (obj.kind === "sun" || obj.kind === "moon") {
    return obj.alt > -1; // small horizon-margin for refraction
  }

  // Below horizon — never "visible" regardless of phase
  if (obj.alt < -1) return false;

  // Constellations are abstract regions, not objects to "see" — show them
  // whenever any of their member stars would be visible (we approximate by
  // showing them whenever stars are visible at all)
  if (obj.kind === "constellation") {
    return conditions.phase !== "day";
  }

  // Satellites: only visible when sunlit AND sky is dark enough for them
  // to stand out. Best viewing is during twilight when satellite is in
  // sunlight but observer is in shadow.
  if (obj.kind === "satellite") {
    if (!obj.satellite?.lit) return false;
    // In full daylight, even sunlit satellites are washed out
    if (conditions.phase === "day") return false;
    return true;
  }

  // For stars, planets, deep-sky: filter by magnitude vs current sky limit
  return obj.mag <= conditions.magLimit;
}

/**
 * Filter a sky array to only objects realistically visible right now.
 * Returns a tuple [visible, hiddenCount] so the UI can communicate when
 * the sky has been pruned.
 */
export function filterVisibleNow(
  sky: SkyObject[],
  conditions: SkyConditions
): { visible: SkyObject[]; hiddenAboveHorizon: number } {
  const visible: SkyObject[] = [];
  let hiddenAboveHorizon = 0;
  for (const o of sky) {
    if (isVisibleNow(o, conditions)) {
      visible.push(o);
    } else if (o.alt > 0 && o.kind !== "constellation") {
      // It's "up there" but not visible to the naked eye right now
      hiddenAboveHorizon++;
    }
  }
  return { visible, hiddenAboveHorizon };
}

/**
 * Given current conditions and an observer's location, estimate when the
 * sky will next reach a given phase. Returns a Date or null if the phase
 * doesn't transition within the next 24 hours.
 *
 * Used for "Stars become visible after 8:23 PM tonight" messaging.
 */
export function findNextPhaseTransition(
  observerLat: number,
  observerLon: number,
  fromDate: Date,
  targetPhase: SkyPhase,
  sunAltitudeFn: (lat: number, lon: number, date: Date) => number
): Date | null {
  // Target Sun altitude bounds for each phase
  const PHASE_BOUNDS: Record<SkyPhase, { upper: number; lower: number }> = {
    day: { upper: 90, lower: 0 },
    civil: { upper: 0, lower: -6 },
    nautical: { upper: -6, lower: -12 },
    astronomical: { upper: -12, lower: -18 },
    night: { upper: -18, lower: -90 },
  };

  const target = PHASE_BOUNDS[targetPhase];

  // Sample sun altitude every 5 minutes for the next 24 hours
  const STEP_MIN = 5;
  const STEPS = (24 * 60) / STEP_MIN;
  for (let i = 1; i <= STEPS; i++) {
    const t = new Date(fromDate.getTime() + i * STEP_MIN * 60_000);
    const alt = sunAltitudeFn(observerLat, observerLon, t);
    if (alt < target.upper && alt >= target.lower) {
      return t;
    }
  }
  return null;
}
