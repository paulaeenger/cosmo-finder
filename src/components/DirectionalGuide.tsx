"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { SkyObject } from "@/lib/astronomy/matching";
import { bearingTo } from "@/lib/astronomy/matching";

type Props = {
  pointing: { alt: number; az: number } | null;
  target: SkyObject | null;
  fovDeg?: number;
};

/**
 * Renders an arrow on the edge of the compass pointing toward the target
 * object when it's outside the visible field. When the target is near the
 * crosshair the arrow fades out (the user has found it).
 */
export function DirectionalGuide({ pointing, target, fovDeg = 45 }: Props) {
  if (!pointing || !target) return null;

  const { angleDeg, separation } = bearingTo(pointing, { alt: target.alt, az: target.az });

  // Hide arrow once the target is comfortably inside the field
  const inField = separation < fovDeg - 5;

  return (
    <AnimatePresence>
      {!inField && (
        <motion.div
          key="guide-arrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${angleDeg}deg)` }}
        >
          <div className="flex h-[260px] flex-col items-center justify-start">
            <ArrowMark separation={separation} />
          </div>
        </motion.div>
      )}

      {inField && (
        <motion.div
          key="guide-near"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="rounded-full border-2 border-gold-400/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono text-gold-400 bg-ink-900/60 backdrop-blur-sm">
            on target
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ArrowMark({ separation }: { separation: number }) {
  const urgency = separation > 90 ? "far" : separation > 30 ? "mid" : "near";
  const colors = {
    far: { fill: "#e8c474", glow: "rgba(232,196,116,0.3)" },
    mid: { fill: "#f0d28b", glow: "rgba(232,196,116,0.45)" },
    near: { fill: "#fbe3ae", glow: "rgba(232,196,116,0.6)" },
  }[urgency];

  return (
    <motion.svg
      width="28"
      height="40"
      viewBox="0 0 28 40"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
    >
      <path
        d="M14 0 L26 18 L17 18 L17 38 L11 38 L11 18 L2 18 Z"
        fill={colors.fill}
        stroke="rgba(232,196,116,0.8)"
        strokeWidth="0.8"
      />
    </motion.svg>
  );
}
