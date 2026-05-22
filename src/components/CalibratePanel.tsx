"use client";

import { useState } from "react";
import { Crosshair, Check } from "lucide-react";
import type { SkyObject } from "@/lib/astronomy/matching";

type Props = {
  sky: SkyObject[];
  onCalibrate: (obj: SkyObject) => void;
  onReset: () => void;
  calibrated: boolean;
};

/**
 * One-tap calibration. The user physically aims the phone at a bright object
 * they can see and identify (Moon, a planet, a bright star), then taps that
 * object here. We solve the device→sky correction from that single anchor and
 * apply it to the whole sky. This measures the true alignment on the user's
 * hardware instead of assuming a sensor frame.
 */
export function CalibratePanel({ sky, onCalibrate, onReset, calibrated }: Props) {
  const [open, setOpen] = useState(false);
  const [justDid, setJustDid] = useState<string | null>(null);

  // Bright, currently-visible anchors: Moon, planets, and bright named stars.
  const anchors = sky
    .filter(
      (o) =>
        !o.belowHorizon &&
        o.alt > 5 &&
        (o.kind === "moon" ||
          o.kind === "planet" ||
          (o.kind === "star" && o.mag <= 1.6 && !/^(HIP|HD|HR|TYC)\b/i.test(o.name)))
    )
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 8);

  return (
    <div className="rounded-2xl border border-gold-400/25 bg-gold-400/[0.04] p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Crosshair className="h-4 w-4 text-gold-400" />
        <span className="flex-1 text-[12px] uppercase tracking-[0.2em] text-gold-400 font-mono">
          {calibrated ? "Sky aligned ✓ — recalibrate" : "Align the sky (recommended)"}
        </span>
        <span className="text-[10px] text-white/40 font-mono">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[12px] leading-relaxed text-white/60">
            Point your phone right at one of these in the real sky, hold steady,
            then tap it. The whole sky aligns to your phone.
          </p>
          {anchors.length === 0 ? (
            <p className="text-[12px] text-white/45">
              No bright objects are up right now to align with.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {anchors.map((o) => (
                <button
                  key={o.name}
                  onClick={() => {
                    onCalibrate(o);
                    setJustDid(o.name);
                    setTimeout(() => setJustDid(null), 1800);
                  }}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/80 hover:border-gold-400/40 hover:bg-gold-400/10"
                >
                  {justDid === o.name ? (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Check className="h-3 w-3" /> aligned
                    </span>
                  ) : (
                    o.name
                  )}
                </button>
              ))}
            </div>
          )}
          {calibrated && (
            <button
              onClick={onReset}
              className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono"
            >
              reset alignment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
