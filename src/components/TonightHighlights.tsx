"use client";

import { Star, Telescope } from "lucide-react";
import { rankTonight, type SkyObject } from "@/lib/astronomy/matching";

type Props = {
  sky: SkyObject[];
  onPick?: (obj: SkyObject) => void;
};

export function TonightHighlights({ sky, onPick }: Props) {
  const highlights = rankTonight(sky, 6);

  if (highlights.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0f1c]/70 to-[#070a14]/70 p-5">
      <div className="flex items-center gap-2">
        <Telescope className="h-4 w-4 text-gold-400" />
        <h3 className="font-display text-xl">Tonight, above you</h3>
      </div>
      <p className="mt-1 text-[13px] text-white/45">
        Ranked by brightness and how high they are right now.
      </p>

      <ul className="mt-4 space-y-2">
        {highlights.map((h) => (
          <li key={h.name}>
            <button
              onClick={() => onPick?.(h)}
              className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:border-gold-400/30 hover:bg-white/[0.04] transition"
            >
              <Star className={iconClass(h)} />
              <div className="flex-1 text-left">
                <p className="text-sm text-white">{h.name}</p>
                <p className="text-[11px] text-white/40 font-mono">
                  {h.kind} · mag {h.mag.toFixed(1)} · alt {h.alt.toFixed(0)}°
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gold-400/70 font-mono opacity-0 group-hover:opacity-100 transition">
                view
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function iconClass(o: SkyObject) {
  if (o.kind === "moon") return "h-4 w-4 text-white";
  if (o.kind === "planet") return "h-4 w-4 text-orange-300";
  if (o.kind === "deep-sky") return "h-4 w-4 text-sky-300";
  return "h-4 w-4 text-gold-400";
}
