"use client";

import { useEffect, useMemo, useState } from "react";
import { computeVisibleSky, type SkyObject } from "@/lib/astronomy/matching";
import type { Satellite } from "@/lib/astronomy/satellites";
import type { GeoPosition } from "./useGeolocation";

/**
 * Recomputes the visible-sky catalog whenever location changes, time advances,
 * or the user scrubs to a different time.
 *
 * `viewTime`: if non-null, computes sky for that specific time (frozen).
 *             if null, ticks live every `refreshMs`.
 *
 * Why 2s tick: satellites move quickly — the ISS crosses ~0.5°/sec. Stars
 * and planets recompute too but barely change at that cadence.
 */
export function useSkyObjects(
  position: GeoPosition | null,
  satellites: Satellite[] = [],
  viewTime: Date | null = null,
  refreshMs = 2_000
) {
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (viewTime != null) return; // Don't tick when scrubbing
    const id = setInterval(() => setLiveNow(new Date()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, viewTime]);

  const effectiveTime = viewTime ?? liveNow;

  const sky = useMemo<SkyObject[]>(() => {
    if (!position) return [];
    return computeVisibleSky(
      {
        latitude: position.lat,
        longitude: position.lon,
        date: effectiveTime,
      },
      satellites
    );
  }, [position, effectiveTime, satellites]);

  return { sky, now: effectiveTime, liveNow };
}
