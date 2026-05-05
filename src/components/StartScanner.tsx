"use client";

import { motion } from "framer-motion";
import { Compass, MapPin, Sparkles, Check, AlertCircle } from "lucide-react";
import { useState } from "react";

type Props = {
  onRequestMotion: () => Promise<boolean>;
  onRequestLocation: () => Promise<unknown>;
  motionGranted: boolean;
  locationGranted: boolean;
  geoError: string | null;
  orientationError: string | null;
  loading: boolean;
};

/**
 * Two-step permission flow optimized for iOS Safari.
 *
 * Why two steps: iOS requires motion permission to be requested from a
 * fresh user gesture (button tap). If we await another permission first,
 * iOS treats the motion request as no longer tied to user activation and
 * silently denies it. So we ask for motion FIRST (the harder one), then
 * location AFTER (the easier one) on a separate tap.
 */
export function StartScanner({
  onRequestMotion,
  onRequestLocation,
  motionGranted,
  locationGranted,
  geoError,
  orientationError,
  loading,
}: Props) {
  const [step, setStep] = useState<"intro" | "motion-asked">("intro");

  async function handleMotionTap() {
    const ok = await onRequestMotion();
    if (ok) setStep("motion-asked");
  }

  function handleLocationTap() {
    onRequestLocation();
  }

  return (
    <section className="relative">
      <div className="grain absolute inset-0 rounded-[28px]" />

      <div className="relative px-6 pt-10 pb-8">
        <p className="text-[10px] tracking-[0.35em] uppercase text-gold-400 font-mono">
          Cosmos Finder
        </p>

        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-tight">
          Point your phone at the sky.
        </h1>

        <p className="mt-4 max-w-md text-white/65 leading-relaxed">
          Identify stars, planets, constellations, the Moon, and deep-sky objects from
          your phone&rsquo;s browser — wherever you happen to be standing.
        </p>

        {/* Two permission cards, one tap each */}
        <div className="mt-7 space-y-3">
          <PermissionCard
            icon={<Compass className="h-4 w-4" />}
            label="Motion & Compass"
            description="So we know which way your phone is pointing"
            granted={motionGranted}
            error={orientationError}
            onTap={handleMotionTap}
            disabled={loading}
            step={1}
          />

          <PermissionCard
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            description="So we know which stars are above you"
            granted={locationGranted}
            error={geoError}
            onTap={handleLocationTap}
            disabled={loading || (!motionGranted && step === "intro")}
            step={2}
          />
        </div>

        {/* iOS hint that appears if motion fails */}
        {orientationError && (
          <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-[13px] text-rose-100/90">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Motion access blocked</p>
                <p className="mt-1.5 text-rose-100/70 leading-snug">
                  On iPhone, check{" "}
                  <span className="font-mono text-rose-100">
                    Settings → Safari → Advanced → Motion &amp; Orientation Access
                  </span>{" "}
                  is on, then close and reopen this page.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-white/30 font-mono">
          v1.2 · bright stars · planets · iss · 110 messier objects · 88 constellations
        </p>
      </div>
    </section>
  );
}

function PermissionCard({
  icon,
  label,
  description,
  granted,
  error,
  onTap,
  disabled,
  step,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  granted: boolean;
  error: string | null;
  onTap: () => void;
  disabled: boolean;
  step: number;
}) {
  if (granted) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
          <Check className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/80 font-mono">
            Step {step} · Granted
          </p>
          <p className="text-sm text-white/85">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/15 to-gold-400/5 px-4 py-3.5 text-left disabled:opacity-40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400/20 text-gold-400">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono">
          Step {step} · Tap to allow
        </p>
        <p className="mt-0.5 font-display text-lg leading-tight text-white">{label}</p>
        <p className="mt-0.5 text-[12px] text-white/50">{description}</p>
      </div>
      <Sparkles className="h-4 w-4 text-gold-400/60 transition group-hover:text-gold-400" />
    </motion.button>
  );
}
