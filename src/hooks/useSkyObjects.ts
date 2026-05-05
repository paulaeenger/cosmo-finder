"use client";

import { useEffect, useMemo, useState } from "react";
import { computeVisibleSky, type SkyObject } from "@/lib/astronomy/matching";
import type { Satellite } from "@/lib/astronomy/satellites";
import type { GeoPosition } from "./useGeolocation";

/**
 * Recomputes the visible-sky catalog whenever location changes or when the
 * tick advances. We use a fast tick (2s) because satellites move quickly —
 * the ISS crosses ~0.5° per second. Stars/planets recompute too but their
 * positions barely change at this scale; the cost is negligible.
 */
export function useSkyObjects(
  position: GeoPosition | null,
  satellites: Satellite[] = [],
  refreshMs = 2_000
) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  const sky = useMemo<SkyObject[]>(() => {
    if (!position) return [];
    return computeVisibleSky(
      {
        latitude: position.lat,
        longitude: position.lon,
        date: now,
      },
      satellites
    );
  }, [position, now, satellites]);

  return { sky, now };
}
