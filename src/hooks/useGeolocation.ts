"use client";

import { useCallback, useState } from "react";

export type GeoPosition = {
  lat: number;
  lon: number;
  accuracy?: number;
};

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    setLoading(true);
    setError(null);

    return new Promise<GeoPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next: GeoPosition = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(next);
          setLoading(false);
          resolve(next);
        },
        (err) => {
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Enable it in your browser settings to identify objects in your sky."
              : "Could not determine location. Try again outdoors with a clear view of the sky."
          );
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return { position, error, loading, requestLocation };
}
