"use client";

import type { TimelineHour } from "@/lib/astronomy/sky-conditions";

type Props = {
  timeline: TimelineHour[];
};

// Map a 0..1 viewing-quality score to a fill. Daylight reads warm and pale;
// full astronomical night reads deep gold-on-ink, matching the app palette.
function qualityFill(q: number): string {
  if (q === 0) return "rgba(134,177,214,0.30)"; // day — pale blue
  if (q <= 0.25) return "rgba(232,150,90,0.40)"; // civil — warm dusk
  if (q <= 0.55) return "rgba(120,110,180,0.50)"; // nautical — indigo
  if (q <= 0.8) return "rgba(150,120,200,0.60)"; // astronomical — violet
  return "rgba(232,196,116,0.75)"; // night — gold
}

function hourLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric" }).replace(" ", "").toLowerCase();
}

/**
 * Hour-by-hour viewing-quality strip — the local, astronomy-only analogue of a
 * cloud-cover forecast: at a glance, which hours tonight are dark enough to be
 * worth looking up. Taller, brighter bars = darker, better sky.
 */
export function ConditionsTimeline({ timeline }: Props) {
  if (timeline.length === 0) return null;

  // Find the darkest contiguous stretch to surface as a one-line summary.
  const best = timeline.reduce(
    (acc, h) => (h.quality > acc.quality ? h : acc),
    timeline[0]
  );
  const firstNight = timeline.find((h) => h.phase === "night");

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 font-mono">
          Tonight&rsquo;s sky
        </p>
        {firstNight && (
          <p className="text-[10px] font-mono text-white/40">
            darkest from{" "}
            <span className="text-gold-400/80">{hourLabel(firstNight.time)}</span>
          </p>
        )}
      </div>

      <div className="mt-3 flex items-end gap-[3px]">
        {timeline.map((h, i) => {
          // Bar height tracks quality with a visible floor so daytime still
          // shows a sliver rather than nothing.
          const heightPct = 18 + h.quality * 82;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${heightPct}%`,
                    background: qualityFill(h.quality),
                    outline: h.isNow ? "1.5px solid rgba(255,255,255,0.85)" : "none",
                    outlineOffset: h.isNow ? "1px" : "0",
                  }}
                />
              </div>
              {/* Label every 3rd hour to avoid clutter; always label "now". */}
              {(i % 3 === 0 || h.isNow) && (
                <span
                  className={`text-[8px] font-mono leading-none ${
                    h.isNow ? "text-white/90" : "text-white/35"
                  }`}
                >
                  {h.isNow ? "now" : hourLabel(h.time)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
