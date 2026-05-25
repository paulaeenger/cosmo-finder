"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  makeYawOffsetTracker,
  wrap360,
  type YawOffsetTracker,
} from "@/lib/astronomy/fusion";

export type FusedOrientation = {
  /** North-referenced, drift-corrected yaw in the same CCW sense as e.alpha. */
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  ready: boolean;
  /** iOS magnetometer accuracy (deg), passed through for the calibration coach. */
  compassAccuracy: number | null;
};

/**
 * Heading fusion via a scalar yaw-offset complementary filter.
 *
 * iOS already gives a gyro-fused attitude in alpha/beta/gamma — smooth and
 * high-rate — but `alpha`'s zero is arbitrary (not true north) and drifts, while
 * webkitCompassHeading is north-referenced yet coarse and prone to freezing. We
 * keep beta/gamma raw and feed (alpha + offset) where `offset` is slowly nudged
 * toward the compass. Result: pans ride the smooth attitude instantly (no
 * staircase, no lag) while the heading stays locked to true north over time.
 *
 * Pass-through on platforms whose alpha is already absolute (Android's
 * deviceorientationabsolute): no compass heading is present, so the offset stays
 * at zero and the absolute alpha is used directly.
 *
 * @param active gate the listeners (e.g. only in live mode with fusion enabled).
 */
export function useFusedOrientation(active: boolean) {
  const [state, setState] = useState<FusedOrientation>({
    alpha: null,
    beta: null,
    gamma: null,
    ready: false,
    compassAccuracy: null,
  });

  const trackerRef = useRef<YawOffsetTracker | null>(null);
  if (!trackerRef.current) trackerRef.current = makeYawOffsetTracker();
  // Once we've locked onto an absolute/true-north source, drop later
  // relative-only events (Android fires both; their differing yaws would fight).
  const haveAbsoluteRef = useRef(false);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const ev = e as unknown as {
      webkitCompassHeading?: number;
      webkitCompassAccuracy?: number;
    };
    const rawAlpha = e.alpha;
    if (rawAlpha == null || e.beta == null || e.gamma == null) return;

    const hasCompass = typeof ev.webkitCompassHeading === "number";
    const isAbsolute = e.absolute === true || hasCompass;
    // After an absolute reading, ignore relative-only events (drifting yaw).
    if (haveAbsoluteRef.current && !isAbsolute) return;
    if (isAbsolute) haveAbsoluteRef.current = true;

    // North-referenced yaw in the SAME CCW sense as e.alpha. iOS exposes true
    // north via webkitCompassHeading (clockwise), so 360 - heading converts it.
    // null => no magnetometer this frame; tracker holds and we use alpha as-is
    // (correct for Android's already-absolute alpha).
    const alphaTrue = hasCompass
      ? wrap360(360 - (ev.webkitCompassHeading as number))
      : null;

    const tracker = trackerRef.current!;
    let fusedAlpha: number;
    if (alphaTrue == null) {
      fusedAlpha = wrap360(rawAlpha);
    } else {
      const offset = tracker.push(rawAlpha, alphaTrue);
      fusedAlpha = wrap360(rawAlpha + offset);
    }

    setState({
      alpha: fusedAlpha,
      beta: e.beta,
      gamma: e.gamma,
      ready: true,
      compassAccuracy:
        typeof ev.webkitCompassAccuracy === "number"
          ? ev.webkitCompassAccuracy
          : null,
    });
  }, []);

  useEffect(() => {
    if (!active) {
      // Re-prime cleanly next time fusion is enabled.
      trackerRef.current?.reset();
      haveAbsoluteRef.current = false;
      setState((s) => (s.ready ? { ...s, ready: false } : s));
      return;
    }
    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener(
      "deviceorientationabsolute",
      onOrientation as EventListener,
      true
    );
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener(
        "deviceorientationabsolute",
        onOrientation as EventListener,
        true
      );
      trackerRef.current?.reset();
      haveAbsoluteRef.current = false;
    };
  }, [active, onOrientation]);

  return state;
}
