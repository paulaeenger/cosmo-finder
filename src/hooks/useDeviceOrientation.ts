"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Orientation = {
  alpha: number | null; // compass direction (0 = north)
  beta: number | null;  // front/back tilt
  gamma: number | null; // side tilt
  absolute: boolean;
};

type DeviceOrientationEventStatic = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<Orientation>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
  });
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const requestOrientation = useCallback(async () => {
    if (typeof window === "undefined") return false;

    setError(null);

    const Static = window.DeviceOrientationEvent as DeviceOrientationEventStatic | undefined;

    if (!Static) {
      setError("Your device does not expose orientation sensors.");
      return false;
    }

    try {
      if (typeof Static.requestPermission === "function") {
        const permission = await Static.requestPermission();
        if (permission !== "granted") {
          setError("Motion permission was denied. Tap the button again or enable it in Settings → Safari.");
          return false;
        }
      }

      // Some browsers fire `deviceorientationabsolute` for true compass heading.
      const handler = (e: DeviceOrientationEvent) => {
        // webkitCompassHeading exists on iOS Safari and is more reliable than alpha.
        const compass = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
        const alpha = compass != null ? 360 - compass : e.alpha;
        setOrientation({
          alpha: alpha ?? null,
          beta: e.beta ?? null,
          gamma: e.gamma ?? null,
          absolute: e.absolute === true,
        });
      };

      handlerRef.current = handler;
      // Prefer the absolute event when available
      window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.addEventListener("deviceorientation", handler, true);
      setGranted(true);
      return true;
    } catch (err) {
      setError("Unable to access device orientation.");
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      const h = handlerRef.current;
      if (h && typeof window !== "undefined") {
        window.removeEventListener("deviceorientationabsolute", h as EventListener, true);
        window.removeEventListener("deviceorientation", h, true);
      }
    };
  }, []);

  return { orientation, granted, error, requestOrientation };
}
