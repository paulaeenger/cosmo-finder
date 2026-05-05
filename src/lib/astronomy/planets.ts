// Solar system body positions, computed at runtime via astronomy-engine.

import * as Astronomy from "astronomy-engine";
import type { EquatorialCoord } from "./coords";

export type SolarBody = {
  name: string;
  type: "Star" | "Planet" | "Moon";
  ra: number;          // hours
  dec: number;         // degrees
  mag: number;         // apparent magnitude (approximate for planets)
  distAu?: number;     // distance from Earth in AU when relevant
  description: string;
};

const PLANETS: { body: Astronomy.Body; name: string; description: string }[] = [
  { body: Astronomy.Body.Mercury, name: "Mercury", description: "The smallest planet, closest to the Sun. Visible only briefly near sunrise or sunset." },
  { body: Astronomy.Body.Venus,   name: "Venus",   description: "The brightest planet — often called the morning or evening star." },
  { body: Astronomy.Body.Mars,    name: "Mars",    description: "The Red Planet, recognizable by its rusty-orange color." },
  { body: Astronomy.Body.Jupiter, name: "Jupiter", description: "The largest planet in the solar system, with four large moons visible in binoculars." },
  { body: Astronomy.Body.Saturn,  name: "Saturn",  description: "Famous for its rings, visible through even a small telescope." },
  { body: Astronomy.Body.Uranus,  name: "Uranus",  description: "An ice giant, just barely visible to the naked eye in dark skies." },
  { body: Astronomy.Body.Neptune, name: "Neptune", description: "The most distant planet — requires binoculars or a telescope." },
];

// Approximate apparent magnitudes — fine for relative brightness ranking.
const PLANET_MAG: Record<string, number> = {
  Mercury: -0.4,
  Venus: -4.2,
  Mars: 0.5,
  Jupiter: -2.2,
  Saturn: 0.5,
  Uranus: 5.7,
  Neptune: 7.8,
};

function eqOf(body: Astronomy.Body, date: Date): { ra: number; dec: number; distAu: number } {
  const eq = Astronomy.Equator(body, date, /*observer=*/null as unknown as Astronomy.Observer, /*ofdate=*/true, /*aberration=*/true);
  return { ra: eq.ra, dec: eq.dec, distAu: eq.dist };
}

export function getSolarBodies(date: Date): SolarBody[] {
  const bodies: SolarBody[] = [];

  // Sun
  try {
    const sun = eqOf(Astronomy.Body.Sun, date);
    bodies.push({
      name: "Sun",
      type: "Star",
      ra: sun.ra,
      dec: sun.dec,
      mag: -26.7,
      distAu: sun.distAu,
      description: "Our closest star — never look directly at it without a proper solar filter.",
    });
  } catch {}

  // Moon
  try {
    const moon = eqOf(Astronomy.Body.Moon, date);
    bodies.push({
      name: "Moon",
      type: "Moon",
      ra: moon.ra,
      dec: moon.dec,
      mag: -12.7,
      distAu: moon.distAu,
      description: "Earth's only natural satellite, about 384,000 km away.",
    });
  } catch {}

  // Planets
  for (const p of PLANETS) {
    try {
      const eq = eqOf(p.body, date);
      bodies.push({
        name: p.name,
        type: "Planet",
        ra: eq.ra,
        dec: eq.dec,
        mag: PLANET_MAG[p.name] ?? 5.0,
        distAu: eq.distAu,
        description: p.description,
      });
    } catch {}
  }

  return bodies;
}

export function bodyAsEquatorial(body: SolarBody): EquatorialCoord {
  return { ra: body.ra, dec: body.dec };
}
