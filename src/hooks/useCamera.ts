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
  // Rough average brightness of the current frame, 0 (black) .. 1 (white).
  // Used for dark-sky blending: when the camera sees almost nothing (deep
  // night), the UI fades the drawn sky back in so it isn't a black void.
  const [brightness, setBrightness] = useState(1);
  const streamRef = useRef<MediaStream | null>(null);
  const sampleRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (sampleRef.current != null) {
      clearInterval(sampleRef.current);
      sampleRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setState({ active: false, error: null, requesting: false });
    setBrightness(1);
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

      // Sample average frame brightness ~twice a second on a tiny offscreen
      // canvas. Cheap, and lets the UI blend the drawn sky in when it's dark.
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 16;
      sampleCanvas.height = 16;
      const sctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
      sampleRef.current = window.setInterval(() => {
        const v = videoRef.current;
        if (!v || !sctx || v.readyState < 2) return;
        try {
          sctx.drawImage(v, 0, 0, 16, 16);
          const { data } = sctx.getImageData(0, 0, 16, 16);
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            // Perceptual luma approximation.
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          const avg = sum / (data.length / 4) / 255;
          setBrightness(avg);
        } catch {
          /* drawImage can throw before the first frame; ignore */
        }
      }, 500);
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

  return { ...state, brightness, start, stop };
}
