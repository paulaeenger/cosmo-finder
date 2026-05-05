"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Satellite as SatIcon } from "lucide-react";
import type { SkyObject } from "@/lib/astronomy/matching";

type Props = {
  sky: SkyObject[];
  isLive?: boolean;
  viewTime?: Date;
  onPick?: (obj: SkyObject) => void;
};

/**
 * Highlights any tracked satellite that is currently visible (above
 * horizon AND sunlit). When the user has scrubbed to a non-live time,
 * the wording adapts: "would be visible" rather than "is visible now."
 */
export function SatelliteAlert({ sky, isLive = true, viewTime, onPick }: Props) {
  const visible = sky.filter(
    (o) => o.kind === "satellite" && o.satellite?.lit && o.alt > 5
  );

  if (visible.length === 0) return null;

  const headlinePrefix = isLive ? "Visible right now" : "Visible at this time";
  const headline =
    visible.length === 1
      ? `${friendlyName(visible[0].name)} ${isLive ? "is overhead" : "would be overhead"}`
      : `${visible.length} satellites ${isLive ? "are passing overhead" : "would be passing overhead"}`;
  const subtext = isLive
    ? "Sunlit and above the horizon. Look up — you can see them with your eyes."
    : `Sunlit and above the horizon at ${viewTime?.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) ?? "this time"}.`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="overflow-hidden rounded-2xl border border-gold-400/30 bg-gradient-to-r from-gold-400/15 via-gold-400/5 to-transparent p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400/20">
            <SatIcon className="h-4 w-4 text-gold-400" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-mono">
              {headlinePrefix}
            </p>
            <p className="mt-1 font-display text-lg text-white">{headline}</p>
            <p className="mt-1 text-[12px] text-white/60">{subtext}</p>

            <div className="mt-3 space-y-1.5">
              {visible.map((s) => (
                <button
                  key={s.name}
                  onClick={() => onPick?.(s)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06] transition"
                >
                  <div>
                    <p className="text-[13px] text-white">{friendlyName(s.name)}</p>
                    <p className="text-[10px] font-mono text-white/45">
                      alt {s.alt.toFixed(0)}° · {cardinal(s.az)} · {Math.round(s.satellite!.altKm)} km up
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-gold-400 font-mono">
                    track
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function friendlyName(name: string): string {
  if (name === "ISS (ZARYA)") return "ISS";
  if (name === "TIANGONG") return "Tiangong";
  if (name === "HST") return "Hubble";
  return name;
}

function cardinal(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((az % 360) / 45) % 8];
}
