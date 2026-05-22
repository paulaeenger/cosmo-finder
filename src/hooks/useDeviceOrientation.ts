"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Orientation = {
  alpha: number | null; // compass direction (0 = north)
  beta: number | null;  // front/back tilt
  gamma: number | null; // side tilt
  absolute: boolean;
  screenAngle: number;  // screen.orientation.angle (0|90|180|270)
  /**
   * iOS-only magnetometer accuracy in degrees (max heading error). -1 when the
   * heading is invalid and calibration is needed; null on platforms that don't
   * report it (e.g. most Android browsers).
   */
  compassAccuracy: number | null;
};

type DeviceOrientationEventStatic = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** Read the screen's rotation (0|90|180|270), with a fallback for old iOS. */
function readScreenAngle(): number {
  if (typeof window === "undefined") return 0;
  const a = window.screen?.orientation?.angle;
  if (typeof a === "number") return a;
  // Deprecated but still present on older iOS Safari.
  const legacy = (window as unknown as { orientation?: number }).orientation;
  if (typeof legacy === "number") return ((legacy % 360) + 360) % 360;
  return 0;
}

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<Orientation>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
    screenAngle: 0,
    compassAccuracy: null,
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

      // The gyroscope (DeviceMotion) is gated separately on iOS. Request it too
      // so orientation fusion has the gyro for smooth tracking. Non-fatal if it
      // fails — we fall back to compass-only.
      const MotionStatic = window.DeviceMotionEvent as
        | { requestPermission?: () => Promise<string> }
        | undefined;
      if (MotionStatic && typeof MotionStatic.requestPermission === "function") {
        try {
          await MotionStatic.requestPermission();
        } catch {
          /* gyro optional */
        }
      }

      // Two events can fire — `deviceorientationabsolute` (true-north heading)
      // and plain `deviceorientation` (often a relative/arbitrary heading).
      // Listening to both lets their differing headings fight each other and
      // makes the sky jump. So once we've locked onto an absolute source, we
      // ignore the relative one. iOS exposes true heading via
      // webkitCompassHeading on the plain event, which also counts as absolute.
      let haveAbsolute = false;
      const handler = (e: DeviceOrientationEvent) => {
        const ev = e as unknown as {
          webkitCompassHeading?: number;
          webkitCompassAccuracy?: number;
        };
        const hasCompass = typeof ev.webkitCompassHeading === "number";
        const isAbsolute = e.absolute === true || hasCompass;

        // Once we've seen an absolute reading, drop any later relative-only
        // events (they carry a different, drifting heading).
        if (haveAbsolute && !isAbsolute) return;
        if (isAbsolute) haveAbsolute = true;

        // webkitCompassHeading (iOS) is the most reliable true-north source.
        const alpha = hasCompass ? 360 - (ev.webkitCompassHeading as number) : e.alpha;
        setOrientation({
          alpha: alpha ?? null,
          beta: e.beta ?? null,
          gamma: e.gamma ?? null,
          absolute: isAbsolute,
          screenAngle: readScreenAngle(),
          compassAccuracy:
            typeof ev.webkitCompassAccuracy === "number"
              ? ev.webkitCompassAccuracy
              : null,
        });
      };

      handlerRef.current = handler;
      // Prefer the absolute event when available
      window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.addEventListener("deviceorientation", handler, true);
      setGranted(true);
      return true;
    } catch (err) {
      // On iOS, requestPermission() throws when "Motion & Orientation Access"
      // is disabled in Safari settings. The thrown error message varies, so
      // we surface the actionable fix instead of the technical message.
      setError(
        "Motion access blocked by iOS. Open Settings → Safari → Advanced → Motion & Orientation Access and turn it on, then close and reopen this page."
      );
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
