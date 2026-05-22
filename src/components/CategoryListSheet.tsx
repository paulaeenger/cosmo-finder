"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff, Star } from "lucide-react";
import type { SkyObject } from "@/lib/astronomy/matching";
import type { FilterCategory } from "@/hooks/useSkyFilters";

type Props = {
  open: boolean;
  category: FilterCategory | null;
  label: string;
  objects: SkyObject[];
  visible: boolean;
  onToggleVisible: () => void;
  onPick: (obj: SkyObject) => void;
  onClose: () => void;
};

const COMPASS_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function whereToLook(obj: SkyObject): string {
  if (obj.alt < -1) return "below the horizon";
  const dir = COMPASS_8[Math.round(obj.az / 45) % 8];
  const height =
    obj.alt >= 70 ? "near overhead" : obj.alt >= 35 ? "high" : obj.alt >= 12 ? "mid-sky" : "low";
  return `${dir} · ${height} (${obj.alt.toFixed(0)}°)`;
}

function iconClass(o: SkyObject): string {
  if (o.kind === "moon") return "h-4 w-4 text-white";
  if (o.kind === "planet") return "h-4 w-4 text-orange-300";
  if (o.kind === "deep-sky") return "h-4 w-4 text-sky-300";
  if (o.kind === "satellite") return "h-4 w-4 text-emerald-300";
  return "h-4 w-4 text-gold-400";
}

/**
 * Slide-up sheet listing the objects in a tapped category, sorted by how high
 * they are now. Each row says where to look and opens full detail on tap. The
 * show/hide filter toggle lives in the header.
 */
export function CategoryListSheet({
  open,
  label,
  objects,
  visible,
  onToggleVisible,
  onPick,
  onClose,
}: Props) {
  // Above-horizon first, then by altitude (highest first).
  const sorted = [...objects]
    .filter((o) => o.kind !== "satellite" || o.alt > -1)
    .sort((a, b) => b.alt - a.alt);

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
            className="relative max-h-[75vh] w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/10 bg-gradient-to-b from-[#0a1226] via-[#070a14] to-[#03050b] sm:rounded-[28px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl text-white">{label}</h2>
                <p className="text-[11px] font-mono text-white/40">
                  {sorted.length} {sorted.length === 1 ? "object" : "objects"} up now
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleVisible}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-mono transition ${
                    visible
                      ? "border-gold-400/40 bg-gold-400/12 text-gold-400"
                      : "border-white/15 text-white/45"
                  }`}
                >
                  {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {visible ? "Shown" : "Hidden"}
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[58vh] overflow-y-auto px-4 py-3">
              {sorted.length === 0 ? (
                <p className="px-2 py-8 text-center text-[13px] text-white/45">
                  None of these are above the horizon right now.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sorted.map((o, i) => (
                    <li key={`${o.name}-${i}`}>
                      <button
                        onClick={() => onPick(o)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:border-gold-400/30 hover:bg-white/[0.04]"
                      >
                        <Star className={iconClass(o)} />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm text-white">{o.name}</p>
                          <p className="text-[11px] font-mono text-white/40">
                            {whereToLook(o)}
                            {Number.isFinite(o.mag) && ` · mag ${o.mag.toFixed(1)}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] uppercase tracking-widest text-gold-400/70 font-mono opacity-0 transition group-hover:opacity-100">
                          view
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
