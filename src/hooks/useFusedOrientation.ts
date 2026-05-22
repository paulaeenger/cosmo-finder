"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Quat,
  type V3,
  QUAT_IDENTITY,
  quatFromEuler,
  quatIntegrateGyro,
  quatSlerp,
  quatPointing,
  quatAngleDeg,
} from "@/lib/astronomy/fusion";

type FusionState = {
  pointing: V3 | null; // back-of-phone direction, world frame
  ready: boolean;
  compassAccuracy: number | null;
};

/**
 * Fuses the gyroscope (DeviceMotion.rotationRate) with the compass-derived
 * orientation (DeviceOrientation) using a complementary filter on quaternions,
 * the same principle native sky apps use for glassy tracking.
 *
 * - Gyro integrates every animation frame → smooth, fast, no gimbal flip.
 * - Compass gently corrects long-term drift via slerp.
 * The result is a stable, high-rate pointing direction.
 */
export function useFusedOrientation(active: boolean) {
  const [state, setState] = useState<FusionState>({
    pointing: null,
    ready: false,
    compassAccuracy: null,
  });

  // Fused orientation quaternion (device → world).
  const qRef = useRef<Quat>(QUAT_IDENTITY);
  const primedRef = useRef(false);
  // Latest compass quaternion + accuracy from DeviceOrientation.
  const compassQRef = useRef<Quat | null>(null);
  const accuracyRef = useRef<number | null>(null);
  // Latest gyro rates (deg/s), device frame.
  const gyroRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Drift-correction strength (slerp toward compass per frame). Low because the
  // gyro carries the responsiveness; the compass only nudges out slow drift.
  const SLERP = 0.05;

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const ev = e as unknown as { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
    const hasCompass = typeof ev.webkitCompassHeading === "number";
    const alpha = hasCompass ? 360 - (ev.webkitCompassHeading as number) : e.alpha;
    if (alpha == null || e.beta == null || e.gamma == null) return;
    compassQRef.current = quatFromEuler(alpha, e.beta, e.gamma);
    accuracyRef.current =
      typeof ev.webkitCompassAccuracy === "number" ? ev.webkitCompassAccuracy : null;
    // Prime the fused quaternion to the first compass reading.
    if (!primedRef.current && compassQRef.current) {
      qRef.current = compassQRef.current;
      primedRef.current = true;
    }
  }, []);

  const onMotion = useCallback((e: DeviceMotionEvent) => {
    const r = e.rotationRate;
    if (!r) return;
    // iOS rotationRate is in deg/s. Axes: alpha=z, beta=x, gamma=y.
    gyroRef.current = { x: r.beta ?? 0, y: r.gamma ?? 0, z: r.alpha ?? 0 };
  }, []);

  useEffect(() => {
    if (!active) return;
    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener, true);
    window.addEventListener("devicemotion", onMotion, true);

    const loop = (ts: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      if (last != null && primedRef.current) {
        const dt = Math.min(0.05, (ts - last) / 1000); // clamp dt on stalls
        const g = gyroRef.current;
        // 1) Gyro prediction (smooth, fast).
        qRef.current = quatIntegrateGyro(qRef.current, g.x, g.y, g.z, dt);
        // 2) Compass correction (kills drift). Skip if the compass is wildly
        //    far — that's the near-vertical flip; let gyro carry through it.
        const cq = compassQRef.current;
        if (cq) {
          const diff = quatAngleDeg(qRef.current, cq);
          if (diff < 40) {
            qRef.current = quatSlerp(qRef.current, cq, SLERP);
          }
        }
        const p = quatPointing(qRef.current);
        setState({ pointing: p, ready: true, compassAccuracy: accuracyRef.current });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener("deviceorientationabsolute", onOrientation as EventListener, true);
      window.removeEventListener("devicemotion", onMotion, true);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [active, onOrientation, onMotion]);

  return state;
}
