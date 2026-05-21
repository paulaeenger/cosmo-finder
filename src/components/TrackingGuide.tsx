"use client";

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { computeTrackingGuidance, type HorizontalCoord } from "@/lib/astronomy/coords";
import type { SkyObject } from "@/lib/astronomy/matching";

type Props = {
  target: SkyObject;
  pointing: HorizontalCoord | null;
  onStop: () => void;
};

function shortName(name: string): string {
  if (name.length <= 16) return name;
  if (name.includes("—")) return name.split("—")[0].trim();
  if (name.includes("(")) return name.split(" ")[0];
  return name.slice(0, 15) + "…";
}

/**
 * Live "guide me to this object" card. Compares where the phone is pointing to
 * the target's position and tells the user how to move ("Turn left, tilt up"),
 * turning green when they're aimed at it. Tapping the card stops tracking.
 */
export function TrackingGuide({ target, pointing, onStop }: Props) {
  // Below the horizon: can't aim at it, so guide differently.
  const belowHorizon = target.alt < -1;

  const guidance =
    pointing && !belowHorizon
      ? computeTrackingGuidance(pointing, { alt: target.alt, az: target.az })
      : null;

  const onTarget = guidance?.onTarget ?? false;

  const Arrow =
    guidance?.primary === "up"
      ? ArrowUp
      : guidance?.primary === "down"
      ? ArrowDown
      : guidance?.primary === "left"
      ? ArrowLeft
      : guidance?.primary === "right"
      ? ArrowRight
      : Check;

  return (
    <button
      onClick={onStop}
      className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
        onTarget
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-gold-400/30 bg-gold-400/[0.07]"
      }`}
    >
      {/* Big directional cue */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
          onTarget ? "bg-emerald-400/20 text-emerald-300" : "bg-gold-400/15 text-gold-400"
        }`}
      >
        <Arrow className="h-6 w-6" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[10px] uppercase tracking-[0.25em] font-mono ${
            onTarget ? "text-emerald-300/80" : "text-gold-400/80"
          }`}
        >
          Guiding to {shortName(target.name)}
        </p>

        {belowHorizon ? (
          <p className="mt-0.5 text-[13px] text-white/65">
            Below the horizon right now — it isn&rsquo;t in the sky yet.
          </p>
        ) : !pointing ? (
          <p className="mt-0.5 text-[13px] text-white/65">Waiting for compass…</p>
        ) : (
          <p className="mt-0.5 text-[15px] leading-tight text-white">
            {guidance!.text}
            {!onTarget && (
              <span className="ml-2 text-[12px] font-mono text-white/45">
                {guidance!.separation.toFixed(0)}° off
              </span>
            )}
          </p>
        )}
      </div>

      {/* Stop affordance */}
      <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
        <X className="h-3.5 w-3.5" />
        stop
      </span>
    </button>
  );
}
