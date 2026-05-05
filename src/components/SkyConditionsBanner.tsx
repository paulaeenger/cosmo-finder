"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sun, Sunrise, Moon, Star } from "lucide-react";
import type { SkyConditions, SkyPhase } from "@/lib/astronomy/sky-conditions";

type Props = {
  conditions: SkyConditions;
  /** Time until full dark / when stars become visible (next phase). */
  nextDarkPhase?: Date | null;
  /** Number of objects above horizon but not visible due to sky conditions. */
  hiddenCount: number;
};

const PHASE_THEMES: Record<SkyPhase, { icon: React.ReactNode; tone: string }> = {
  day: {
    icon: <Sun className="h-4 w-4" />,
    tone: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  },
  civil: {
    icon: <Sunrise className="h-4 w-4" />,
    tone: "border-orange-300/30 bg-orange-300/10 text-orange-200",
  },
  nautical: {
    icon: <Sunrise className="h-4 w-4" />,
    tone: "border-indigo-300/30 bg-indigo-300/10 text-indigo-200",
  },
  astronomical: {
    icon: <Star className="h-4 w-4" />,
    tone: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  },
  night: {
    icon: <Moon className="h-4 w-4" />,
    tone: "border-gold-400/30 bg-gold-400/10 text-gold-400",
  },
};

export function SkyConditionsBanner({ conditions, nextDarkPhase, hiddenCount }: Props) {
  const theme = PHASE_THEMES[conditions.phase];
  const isDark = conditions.phase === "night" || conditions.phase === "astronomical";

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={conditions.phase}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`overflow-hidden rounded-2xl border ${theme.tone}`}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            {theme.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-[10px] uppercase tracking-[0.3em] font-mono opacity-80">
                {conditions.label}
              </p>
              <p className="text-[10px] font-mono opacity-50">
                Sun {conditions.sunAlt > 0 ? "+" : ""}{conditions.sunAlt.toFixed(1)}°
              </p>
            </div>

            <p className="mt-1.5 text-[14px] leading-snug text-white/85">
              {conditions.description}
            </p>

            {/* Day-time messaging: tell the user when stars become visible */}
            {!isDark && nextDarkPhase && (
              <p className="mt-2 text-[12px] text-white/55">
                Stars become visible after{" "}
                <span className="font-mono text-white/80">
                  {formatTime(nextDarkPhase)}
                </span>
                {hiddenCount > 0 && (
                  <>
                    {" "}— {hiddenCount} object{hiddenCount === 1 ? " is" : "s are"} above your
                    horizon but washed out by daylight.
                  </>
                )}
              </p>
            )}

            {/* Twilight messaging: hint at improving conditions */}
            {conditions.phase === "civil" && nextDarkPhase && (
              <p className="mt-2 text-[12px] text-white/55">
                Full dark sky after{" "}
                <span className="font-mono text-white/80">
                  {formatTime(nextDarkPhase)}
                </span>.
              </p>
            )}

            {conditions.phase === "nautical" && (
              <p className="mt-2 text-[12px] text-white/55">
                Stars down to magnitude {conditions.magLimit.toFixed(1)} are visible.
              </p>
            )}
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
