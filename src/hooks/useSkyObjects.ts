"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeStaticSky,
  computeSatelliteObjects,
  type SkyObject,
} from "@/lib/astronomy/matching";
import type { Satellite } from "@/lib/astronomy/satellites";
import type { GeoPosition } from "./useGeolocation";

/**
 * Recomputes the visible-sky catalog on two independent cadences:
 *
 *   - Static catalog (stars, deep-sky, constellations, Sun, Moon, planets)
 *     refreshes every `staticRefreshMs`. These move imperceptibly second to
 *     second, so recomputing a few hundred objects every 2s was wasted work.
 *
 *   - Satellites refresh every `refreshMs`. The ISS crosses ~0.5°/sec, so they
 *     genuinely need a tight cadence.
 *
 * `viewTime`: if non-null, computes the sky for that specific frozen time and
 *             neither clock ticks. If null, both clocks run live.
 *
 * The two pieces are merged (static first, then satellites) to match the order
 * computeVisibleSky used to return.
 */
export function useSkyObjects(
  position: GeoPosition | null,
  satellites: Satellite[] = [],
  viewTime: Date | null = null,
  refreshMs = 2_000,
  staticRefreshMs = 45_000
) {
  // Fast clock — drives satellites (and is the "now" the rest of the app sees).
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  // Slow clock — drives the static catalog. Seeded to the same instant.
  const [staticNow, setStaticNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (viewTime != null) return; // Don't tick when scrubbing
    const fast = setInterval(() => setLiveNow(new Date()), refreshMs);
    const slow = setInterval(() => setStaticNow(new Date()), staticRefreshMs);
    return () => {
      clearInterval(fast);
      clearInterval(slow);
    };
  }, [refreshMs, staticRefreshMs, viewTime]);

  // When scrubbing, both pieces compute for the frozen time. When live, the
  // satellites use the fast clock and the static catalog uses the slow clock.
  const satTime = viewTime ?? liveNow;
  const staticTime = viewTime ?? staticNow;

  const staticSky = useMemo<SkyObject[]>(() => {
    if (!position) return [];
    return computeStaticSky({
      latitude: position.lat,
      longitude: position.lon,
      date: staticTime,
    });
  }, [position, staticTime]);

  const satelliteSky = useMemo<SkyObject[]>(() => {
    if (!position) return [];
    return computeSatelliteObjects(
      {
        latitude: position.lat,
        longitude: position.lon,
        date: satTime,
      },
      satellites
    );
  }, [position, satTime, satellites]);

  const sky = useMemo<SkyObject[]>(
    () => [...staticSky, ...satelliteSky],
    [staticSky, satelliteSky]
  );

  return { sky, now: satTime, liveNow };
}
