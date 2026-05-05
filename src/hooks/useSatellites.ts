"use client";

import { useEffect, useState } from "react";
import { loadSatellites, type Satellite } from "@/lib/astronomy/satellites";

/**
 * Loads satellites once on mount, then refreshes when the browser
 * transitions back online. This is the cruise-mode optimization: while
 * offline we use whatever TLEs are cached; the moment we hit Wi-Fi,
 * fresh data updates the cache (which the service worker also persists)
 * so the next offline window starts with current data.
 */
export function useSatellites() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const sats = await loadSatellites();
        if (!cancelled) {
          setSatellites(sats);
          setLoaded(true);
        }
      } catch {
        // Network error during refresh — keep existing data
        if (!cancelled) setLoaded(true);
      }
    };

    refresh();

    // When the browser regains network, immediately refresh TLEs so the
    // cache updates. The service worker also caches this response so
    // future offline sessions start with fresh data.
    const onOnline = () => refresh();
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
    };
  }, []);

  return { satellites, loaded };
}
