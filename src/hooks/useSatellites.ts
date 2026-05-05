"use client";

import { useEffect, useState } from "react";
import { loadSatellites, type Satellite } from "@/lib/astronomy/satellites";

export function useSatellites() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSatellites().then((sats) => {
      if (cancelled) return;
      setSatellites(sats);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { satellites, loaded };
}
