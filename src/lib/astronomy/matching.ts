// The matching engine: given an observer location, time, and phone-pointing
// direction, return the most likely object the user is looking at.
import {
  equatorialToHorizontal,
  angularDistance,
  type HorizontalCoord,
} from "./coords";
import { getSolarBodies } from "./planets";
import {
  estimateSatelliteMagnitude,
  propagateSatellite,
  type Satellite,
  type SatellitePosition,
} from "./satellites";
import brightStars from "../data/bright-stars.json";
import extendedStars from "../data/extended-stars.json";
import messier from "../data/messier.json";
import constellations from "../data/constellations.json";
export type SkyObjectKind =
  | "star"
  | "planet"
  | "moon"
  | "sun"
  | "deep-sky"
  | "constellation"
  | "satellite";
export type SkyObject = {
  name: string;
  kind: SkyObjectKind;
  ra: number;
  dec: number;
  mag: number;
  alt: number;
  az: number;
  belowHorizon?: boolean;
  constellation?: string;
  type?: string;
  distLy?: number;
  distAu?: number;
  bayer?: string;
  description?: string;
  // Satellite-only fields
  satellite?: SatellitePosition;
};
export type MatchResult = {
  object: SkyObject;
  separation: number; // degrees
};
export type Observer = {
  latitude: number;
  longitude: number;
  date: Date;
};
/**
 * Compute the alt/az of every object in the catalog for the given observer.
 *
 * Named objects (planets, Sun, Moon, named bright stars, Messier objects,
 * constellations) are always included with a `belowHorizon: true` flag when
 * they're under the horizon, so search can find them. Faint extended stars
 * and satellites are excluded when below the horizon (they would be noise).
 */
export function computeVisibleSky(
  observer: Observer,
  satellites: Satellite[] = [],
  horizonMargin = -5
): SkyObject[] {
  const result: SkyObject[] = [];
  // Always include named objects, even when below the horizon.
  // The `belowHorizon` flag lets consumers (search, TonightHighlights) decide
  // whether to show or filter.
  const pushAlways = (raw: Omit<SkyObject, "alt" | "az" | "belowHorizon">) => {
    const h = equatorialToHorizontal(
      { ra: raw.ra, dec: raw.dec },
      observer.latitude,
      observer.longitude,
      observer.date
    );
    result.push({
      ...raw,
      alt: h.alt,
      az: h.az,
      belowHorizon: h.alt <= horizonMargin,
    });
  };
  // Only include if visible. Used for the dense extended-stars catalog
  // where we don't want hundreds of invisible faint stars in search.
  const pushIfVisible = (raw: Omit<SkyObject, "alt" | "az" | "belowHorizon">) => {
    const h = equatorialToHorizontal(
      { ra: raw.ra, dec: raw.dec },
      observer.latitude,
      observer.longitude,
      observer.date
    );
    if (h.alt > horizonMargin) {
      result.push({ ...raw, alt: h.alt, az: h.az, belowHorizon: false });
    }
  };
  // Bright stars — always included (named, useful for search)
  for (const s of brightStars as Array<{
    name: string;
    bayer: string;
    ra: number;
    dec: number;
    mag: number;
    distLy: number;
    constellation: string;
  }>) {
    pushAlways({
      name: s.name,
      kind: "star",
      ra: s.ra,
      dec: s.dec,
      mag: s.mag,
      bayer: s.bayer,
      constellation: s.constellation,
      distLy: s.distLy,
      description: `${s.bayer} — a star in ${s.constellation}.`,
    });
  }
  // Extended stars — only when visible (too many to clutter search)
  for (const s of extendedStars as Array<{
    name: string;
    ra: number;
    dec: number;
    mag: number;
    constellation: string;
  }>) {
    pushIfVisible({
      name: s.name,
      kind: "star",
      ra: s.ra,
      dec: s.dec,
      mag: s.mag,
      constellation: s.constellation,
      description: `A star in ${s.constellation}.`,
    });
  }
  // Messier deep-sky objects — always included
  for (const m of messier as Array<{
    id: string;
    name: string;
    type: string;
    ra: number;
    dec: number;
    mag: number;
    constellation: string;
  }>) {
    pushAlways({
      name: `${m.id} — ${m.name}`,
      kind: "deep-sky",
      ra: m.ra,
      dec: m.dec,
      mag: m.mag,
      type: m.type,
      constellation: m.constellation,
      description: `${m.type} in ${m.constellation}.`,
    });
  }
  // Constellations — always included
  for (const c of constellations as Array<{
    name: string;
    abbr: string;
    ra: number;
    dec: number;
    meaning: string;
    hemisphere: string;
  }>) {
    pushAlways({
      name: c.name,
      kind: "constellation",
      ra: c.ra,
      dec: c.dec,
      mag: 6,
      type: c.meaning,
      description: `${c.meaning} — a ${c.hemisphere.toLowerCase()} constellation.`,
    });
  }
  // Sun, Moon, planets — always included
  const bodies = getSolarBodies(observer.date);
  for (const b of bodies) {
    const kind: SkyObject["kind"] =
      b.type === "Planet" ? "planet" : b.type === "Moon" ? "moon" : "sun";
    pushAlways({
      name: b.name,
      kind,
      ra: b.ra,
      dec: b.dec,
      mag: b.mag,
      distAu: b.distAu,
      description: b.description,
    });
  }
  // Satellites — propagated live, only if above the horizon
  for (const sat of satellites) {
    const pos = propagateSatellite(
      sat,
      { lat: observer.latitude, lon: observer.longitude },
      observer.date
    );
    if (!pos || pos.alt < horizonMargin) continue;
    result.push({
      name: sat.name,
      kind: "satellite",
      ra: 0,
      dec: 0,
      alt: pos.alt,
      az: pos.az,
      belowHorizon: false,
      mag: estimateSatelliteMagnitude(pos),
      description: sat.description,
      type: sat.category,
      satellite: pos,
    });
  }
  return result;
}
/**
 * Find the closest object to a given pointing direction.
 * Skips below-horizon objects, since the user can't aim at them.
 */
export function findClosestObject(
  pointing: HorizontalCoord,
  sky: SkyObject[],
  options: { maxSeparation?: number } = {}
): MatchResult | null {
  const maxSep = options.maxSeparation ?? 180;
  let best: MatchResult | null = null;
  for (const obj of sky) {
    if (obj.belowHorizon) continue;
    const sep = angularDistance(pointing, { alt: obj.alt, az: obj.az });
    if (sep > maxSep) continue;
    // Slight bias toward brighter / more interesting objects
    let score = sep + Math.max(0, obj.mag) * 0.2;
    if (obj.kind === "satellite" && obj.satellite?.lit) score -= 2;
    if (obj.kind === "planet") score -= 0.5;
    if (!best || score < best.separation) {
      best = { object: obj, separation: sep };
    }
  }
  return best;
}
export function rankTonight(sky: SkyObject[], limit = 8): SkyObject[] {
  return [...sky]
    .filter((o) => !o.belowHorizon && o.alt > 10)
    .filter((o) => o.kind !== "constellation")
    .filter((o) => o.kind !== "satellite" || o.satellite?.lit)
    .map((o) => ({
      o,
      score:
        -o.mag +
        o.alt / 30 +
        (o.kind === "planet" ? 2 : 0) +
        (o.kind === "moon" ? 3 : 0) +
        (o.kind === "satellite" ? 4 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ o }) => o);
}
export function searchSky(sky: SkyObject[], query: string): SkyObject[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return sky
    .filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.constellation ?? "").toLowerCase().includes(q) ||
        (o.bayer ?? "").toLowerCase().includes(q)
    )
    .sort((a, b) => {
      // Visible first; among same visibility, brighter first
      if (!!a.belowHorizon !== !!b.belowHorizon) {
        return a.belowHorizon ? 1 : -1;
      }
      return a.mag - b.mag;
    })
    .slice(0, 12);
}
/**
 * Compute the heading (in degrees) from one alt/az to another.
 * Used by the directional-arrow guide for off-screen objects.
 * Returns angle on the SkyCompass: 0 = up, 90 = right, 180 = down, -90 = left.
 */
export function bearingTo(
  from: HorizontalCoord,
  to: HorizontalCoord
): { angleDeg: number; separation: number } {
  let dAz = to.az - from.az;
  while (dAz > 180) dAz -= 360;
  while (dAz < -180) dAz += 360;
  const dAlt = to.alt - from.alt;
  const angleRad = Math.atan2(dAz, dAlt);
  return {
    angleDeg: angleRad * (180 / Math.PI),
    separation: angularDistance(from, to),
  };
}
