"use client";

import { Sunset, Sunrise } from "lucide-react";
import type { TimelineHour } from "@/lib/astronomy/sky-conditions";

type Props = {
  timeline: TimelineHour[];
};

// Single gold-on-ink hue. Opacity (and bar height) carry viewing quality, so
// the strip reads as one calm gradient rather than a row of competing colors.
function barOpacity(q: number): number {
  return 0.14 + q * 0.74; // 0.14 (daylight) → 0.88 (astronomical night)
}

function hourLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric" }).replace(" ", "").toLowerCase();
}

/**
 * Hour-by-hour viewing-quality strip — the local, astronomy-only analogue of a
 * cloud-cover forecast: at a glance, which hours tonight are dark enough to be
 * worth looking up. Taller, brighter bars = darker, better sky. Sunset and
 * sunrise are marked since those are the moments a stargazer plans around.
 */
export function ConditionsTimeline({ timeline }: Props) {
  if (timeline.length === 0) return null;

  const firstNight = timeline.find((h) => h.phase === "night");

  // Detect the sunset / sunrise crossings (sun altitude passing through 0).
  let sunsetIdx = -1;
  let sunriseIdx = -1;
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1].sunAlt;
    const cur = timeline[i].sunAlt;
    if (sunsetIdx === -1 && prev > 0 && cur <= 0) sunsetIdx = i;
    if (sunriseIdx === -1 && prev <= 0 && cur > 0) sunriseIdx = i;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-3 pt-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 font-mono">
          Tonight&rsquo;s sky
        </p>
        {firstNight && (
          <p className="text-[10px] font-mono text-white/40">
            darkest from{" "}
            <span className="text-gold-400">{hourLabel(firstNight.time)}</span>
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="mt-4 flex h-20 items-end gap-[2px]">
        {timeline.map((h, i) => {
          // Height floor keeps daytime as a low sliver rather than nothing.
          const heightPct = 12 + h.quality * 88;
          const op = barOpacity(h.quality);
          return (
            <div key={i} className="relative flex h-full flex-1 items-end">
              {/* "now" glow halo behind the bar */}
              {h.isNow && (
                <div
                  className="pointer-events-none absolute inset-x-[-2px] bottom-0 rounded-t-[3px]"
                  style={{
                    height: `${heightPct}%`,
                    boxShadow: "0 0 12px 2px rgba(232,196,116,0.45)",
                  }}
                />
              )}
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  height: `${heightPct}%`,
                  background: h.isNow
                    ? "rgba(232,196,116,0.95)"
                    : `rgba(232,196,116,${op})`,
                  border: h.isNow
                    ? "1px solid rgba(255,255,255,0.85)"
                    : "1px solid transparent",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Grounding baseline */}
      <div
        className="mt-[-1px] h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(232,196,116,0.35), transparent)",
        }}
      />

      {/* Axis: time ticks + sunset/sunrise + now */}
      <div className="mt-1.5 flex gap-[2px]">
        {timeline.map((h, i) => {
          const isSunset = i === sunsetIdx;
          const isSunrise = i === sunriseIdx;
          const showHour = i % 4 === 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
              {(isSunset || isSunrise) && (
                <span className="text-gold-400/70">
                  {isSunset ? (
                    <Sunset className="h-3 w-3" />
                  ) : (
                    <Sunrise className="h-3 w-3" />
                  )}
                </span>
              )}
              {h.isNow ? (
                <span className="text-[9px] font-mono leading-none text-gold-400">
                  now
                </span>
              ) : showHour && !isSunset && !isSunrise ? (
                <span className="text-[9px] font-mono leading-none text-white/35">
                  {hourLabel(h.time)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
