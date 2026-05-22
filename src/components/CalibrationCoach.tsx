"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Compass } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * iOS magnetometer accuracy in degrees (-1 = invalid). Null when the platform
   * doesn't report it. Used to show a live "looking good" confirmation once the
   * reading improves while the user is waving the phone.
   */
  accuracy: number | null;
};

// A figure-8 is the gesture that re-calibrates a phone's magnetometer: it
// sweeps the sensor through all three axes so the firmware can re-fit its
// offset. We teach it by animating a dot tracing the path.
const FIGURE_EIGHT =
  "M 60 40 C 90 10, 90 70, 60 40 C 30 10, 30 70, 60 40 Z";

export function CalibrationCoach({ open, onClose, accuracy }: Props) {
  // accuracy: -1 means invalid; small positive = good. iOS rarely reports
  // better than ~10–15° right after a fresh calibration.
  const calibrated = accuracy != null && accuracy >= 0 && accuracy <= 20;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-[28px] border border-white/10 bg-gradient-to-b from-[#0a1226] via-[#070a14] to-[#03050b] px-6 pb-8 pt-6 sm:rounded-[28px]"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-400 font-mono">
              <Compass className="h-3.5 w-3.5" />
              Calibrate Compass
            </p>

            <h2 className="mt-3 font-display text-[30px] leading-[1.1] tracking-tight text-white">
              Trace a figure-8 in the air.
            </h2>

            <p className="mt-3 text-[14px] leading-relaxed text-white/65">
              If the sky looks rotated or objects sit a few degrees off, your
              phone&rsquo;s compass needs a quick re-calibration. Hold the phone
              and sweep it slowly through the path below a few times.
            </p>

            {/* Animated figure-8 */}
            <div className="mt-6 flex justify-center">
              <svg viewBox="0 0 120 80" className="h-32 w-48" fill="none">
                <path
                  d={FIGURE_EIGHT}
                  stroke="rgba(232,196,116,0.25)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle r="4.5" fill="#e8c474">
                  <animateMotion
                    dur="2.6s"
                    repeatCount="indefinite"
                    path={FIGURE_EIGHT}
                    rotate="auto"
                  />
                </circle>
                {/* Soft glow trailing the dot */}
                <circle r="9" fill="rgba(232,196,116,0.18)">
                  <animateMotion
                    dur="2.6s"
                    repeatCount="indefinite"
                    path={FIGURE_EIGHT}
                  />
                </circle>
              </svg>
            </div>

            {/* Live status, only meaningful on iOS where accuracy is reported */}
            {accuracy != null ? (
              <div
                className={`mt-5 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-mono transition ${
                  calibrated
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-gold-400/25 bg-gold-400/10 text-gold-200"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    calibrated ? "bg-emerald-400" : "bg-gold-400 animate-pulse"
                  }`}
                />
                {calibrated
                  ? "Compass looks good — you're set."
                  : "Keep tracing until this turns green…"}
              </div>
            ) : (
              <p className="mt-5 text-center text-[12px] text-white/40 font-mono">
                A few slow passes is usually enough.
              </p>
            )}

            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-[12px] uppercase tracking-[0.25em] text-white/70 font-mono transition hover:bg-white/[0.06]"
            >
              {calibrated ? "Done" : "Dismiss"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
