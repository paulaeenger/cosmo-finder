"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraState = {
  active: boolean;
  error: string | null;
  requesting: boolean;
};

/**
 * Manages the rear-facing camera stream for AR mode. Requests the camera only
 * when start() is called (never automatically — a surprise permission prompt is
 * hostile), attaches it to the given <video> element, and tears it down cleanly
 * on stop or unmount so the camera light doesn't linger.
 */
export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<CameraState>({
    active: false,
    error: null,
    requesting: false,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setState({ active: false, error: null, requesting: false });
  }, [videoRef]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({ active: false, requesting: false, error: "Camera isn't available on this device or browser." });
      return;
    }
    setState((s) => ({ ...s, requesting: true, error: null }));
    try {
      // Prefer the rear camera. `ideal` (not `exact`) so it still works on
      // laptops/devices that only have a front camera.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS requires playsInline + an explicit play() call.
        await videoRef.current.play().catch(() => {});
      }
      setState({ active: true, requesting: false, error: null });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const msg =
        name === "NotAllowedError"
          ? "Camera access was denied. Enable it in your browser settings to use AR."
          : name === "NotFoundError"
          ? "No camera was found on this device."
          : "Couldn't start the camera.";
      setState({ active: false, requesting: false, error: msg });
    }
  }, [videoRef]);

  // Clean up on unmount.
  useEffect(() => stop, [stop]);

  return { ...state, start, stop };
}
