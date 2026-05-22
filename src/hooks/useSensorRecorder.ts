"use client";

import { useCallback, useRef, useState } from "react";

export type SensorFrame = {
  t: number; // ms since record start
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  // Computed view after smoothing/rejection:
  viewAlt: number | null;
  viewAz: number | null;
};

/**
 * Records raw device-orientation angles + the computed view for a few seconds,
 * purely for diagnostics. Produces a compact text block the user can copy and
 * paste so the raw sensor stream can be replayed and analyzed offline.
 */
export function useSensorRecorder() {
  const [recording, setRecording] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const framesRef = useRef<SensorFrame[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const start = useCallback((durationMs = 8000) => {
    framesRef.current = [];
    startRef.current = performance.now();
    setLog(null);
    setRecording(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setRecording(false);
      // Build a compact text log: header + one line per frame.
      const lines = framesRef.current.map(
        (f) =>
          `${f.t.toFixed(0)},${fmt(f.alpha)},${fmt(f.beta)},${fmt(f.gamma)},${fmt(
            f.viewAlt
          )},${fmt(f.viewAz)}`
      );
      const header = "t_ms,alpha,beta,gamma,viewAlt,viewAz";
      setLog([header, ...lines].join("\n"));
    }, durationMs);
  }, []);

  // Called every frame while recording to capture a sample.
  const capture = useCallback(
    (
      alpha: number | null,
      beta: number | null,
      gamma: number | null,
      viewAlt: number | null,
      viewAz: number | null
    ) => {
      if (!recording) return;
      framesRef.current.push({
        t: performance.now() - startRef.current,
        alpha,
        beta,
        gamma,
        viewAlt,
        viewAz,
      });
    },
    [recording]
  );

  const clear = useCallback(() => setLog(null), []);

  return { recording, log, start, capture, clear };
}

function fmt(n: number | null): string {
  return n == null ? "" : n.toFixed(1);
}
