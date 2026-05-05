"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RotateCcw, ChevronDown } from "lucide-react";

type Props = {
  /** The currently displayed time. */
  viewTime: Date;
  /** True when viewTime is tracking real time. */
  isLive: boolean;
  /** Set a specific time. Pass null to return to "live". */
  onChange: (date: Date | null) => void;
};

/**
 * Time scrubber. Compact when collapsed; expands to a slider when tapped.
 *
 * Range: ±48 hours from "now" — deliberately limited because (a) wider
 * ranges make the slider less precise, and (b) most useful stargazing
 * questions are within the next 24 hours.
 */
export function TimeScrubber({ viewTime, isLive, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Keep "now" baseline updated for accurate offset calculations
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Slider value: hours offset from now, range -48 to +48
  const offsetHours = (viewTime.getTime() - now.getTime()) / 3_600_000;
  const offsetClamped = Math.max(-48, Math.min(48, offsetHours));

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const offset = parseFloat(e.target.value);
    if (Math.abs(offset) < 0.05) {
      onChange(null); // snap to live
      return;
    }
    onChange(new Date(now.getTime() + offset * 3_600_000));
  }

  function handlePreset(offsetHours: number) {
    if (offsetHours === 0) {
      onChange(null);
    } else {
      onChange(new Date(now.getTime() + offsetHours * 3_600_000));
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* Collapsed bar: always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-gold-400/80" />
          <p className="text-[12px] font-mono text-white/85">
            {isLive ? (
              <>
                <span className="text-white/85">{formatLive(viewTime)}</span>
                <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
                  · live
                </span>
              </>
            ) : (
              <>
                <span className="text-gold-400">{formatScrubbed(viewTime, now)}</span>
                <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-gold-400/60">
                  · {humanOffset(offsetHours)}
                </span>
              </>
            )}
          </p>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-white/40 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-3.5 pt-1 border-t border-white/5">
              {/* Slider */}
              <div className="relative">
                <input
                  type="range"
                  min={-48}
                  max={48}
                  step={0.25}
                  value={offsetClamped}
                  onChange={handleSliderChange}
                  className="w-full accent-gold-400"
                />
                <div className="mt-0.5 flex justify-between text-[9px] uppercase tracking-[0.15em] text-white/35 font-mono">
                  <span>−48h</span>
                  <span>now</span>
                  <span>+48h</span>
                </div>
              </div>

              {/* Quick presets */}
              <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-none">
                <PresetChip onClick={() => handlePreset(-12)}>−12h</PresetChip>
                <PresetChip onClick={() => handlePreset(-3)}>−3h</PresetChip>
                <PresetChip onClick={() => handlePreset(-1)}>−1h</PresetChip>
                <PresetChip onClick={() => handlePreset(0)} primary>
                  <RotateCcw className="h-3 w-3" />
                  Live
                </PresetChip>
                <PresetChip onClick={() => handlePreset(1)}>+1h</PresetChip>
                <PresetChip onClick={() => handlePreset(3)}>+3h</PresetChip>
                <PresetChip onClick={() => handlePreset(6)}>+6h</PresetChip>
                <PresetChip onClick={() => handlePreset(12)}>+12h</PresetChip>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PresetChip({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-mono whitespace-nowrap transition ${
        primary
          ? "border-gold-400/40 bg-gold-400/10 text-gold-400"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function formatLive(t: Date): string {
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatScrubbed(t: Date, now: Date): string {
  const sameDay =
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate();
  if (sameDay) {
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return t.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanOffset(hours: number): string {
  const abs = Math.abs(hours);
  const sign = hours >= 0 ? "+" : "−";
  if (abs < 1) {
    const m = Math.round(abs * 60);
    return `${sign}${m}m`;
  }
  if (abs < 24) return `${sign}${abs.toFixed(1)}h`;
  const d = Math.round(abs / 24);
  return `${sign}${d}d`;
}
