"use client";

import { Sparkles } from "lucide-react";
import { rankPicks, cardinalName, type SkyObject } from "@/lib/astronomy/matching";

type Props = {
  sky: SkyObject[];
  onPick?: (obj: SkyObject) => void;
};

// The directional guidance line. Built entirely from the object's OWN absolute
// alt/az (computed by astronomy-engine), never from the phone's heading — so it
// stays correct even when the compass is untrustworthy. This is the whole point
// of the pivot: tell the user where to look, don't rely on live AR tracking.
function guidance(o: SkyObject): string {
  const alt = Math.round(o.alt);
  const dir = cardinalName(o.az);
  if (alt > 70) return `Nearly overhead · ~${alt}° up`;
  if (alt < 20) return `Low in the ${dir.toLowerCase()} · ~${alt}° up`;
  return `${dir} · ~${alt}° up`;
}

// A short, human label for what kind of thing this is.
function kindLabel(o: SkyObject): string {
  switch (o.kind) {
    case "moon":
      return "The Moon";
    case "planet":
      return "Planet";
    case "satellite":
      return "Passing over now";
    case "deep-sky":
      return o.type ?? "Deep sky";
    case "star":
      return o.constellation ? `Star · ${o.constellation}` : "Star";
    default:
      return o.kind;
  }
}

export function TonightPicks({ sky, onPick }: Props) {
  const picks = rankPicks(sky, 4);

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0f1c]/80 to-[#070a14]/80 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-400" />
        <h2 className="font-display text-2xl">Worth looking at tonight</h2>
      </div>

      {picks.length === 0 ? (
        <p className="mt-3 text-[13px] text-white/45">
          Not much above the horizon right now — check back after dark.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {picks.map((o) => (
            <li key={o.name}>
              <button
                onClick={() => onPick?.(o)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition hover:border-gold-400/30 hover:bg-white/[0.04]"
              >
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base text-white">{o.name}</p>
                    <span className="shrink-0 text-[10px] uppercase tracking-widest text-white/35 font-mono">
                      {kindLabel(o)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-gold-400/80 font-mono">
                    {guidance(o)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
