"use client";

import { useMemo } from "react";
import {
  getSkyConditions,
  filterVisibleNow,
  findNextPhaseTransition,
  type SkyConditions,
} from "@/lib/astronomy/sky-conditions";
import { sunAltitude } from "@/lib/astronomy/projection";
import type { SkyObject } from "@/lib/astronomy/matching";
import type { GeoPosition } from "./useGeolocation";

export type SkyConditionsState = {
  conditions: SkyConditions;
  visibleSky: SkyObject[];
  hiddenAboveHorizon: number;
  nextDarkPhase: Date | null;
};

export function useSkyConditions(
  position: GeoPosition | null,
  sky: SkyObject[],
  now: Date
): SkyConditionsState | null {
  return useMemo(() => {
    if (!position) return null;

    const sunAlt = sunAltitude(position.lat, position.lon, now);
    const conditions = getSkyConditions(sunAlt);

    const { visible: visibleSky, hiddenAboveHorizon } = filterVisibleNow(sky, conditions);

    // Compute when full dark / next better phase begins, but only when relevant
    let nextDarkPhase: Date | null = null;
    if (conditions.phase === "day") {
      nextDarkPhase = findNextPhaseTransition(
        position.lat,
        position.lon,
        now,
        "civil",
        sunAltitude
      );
    } else if (conditions.phase === "civil") {
      nextDarkPhase = findNextPhaseTransition(
        position.lat,
        position.lon,
        now,
        "astronomical",
        sunAltitude
      );
    }

    return { conditions, visibleSky, hiddenAboveHorizon, nextDarkPhase };
  }, [position, sky, now]);
}
