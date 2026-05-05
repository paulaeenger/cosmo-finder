"use client";

import { motion } from "framer-motion";
import { Compass, MapPin, Sparkles } from "lucide-react";

type Props = {
  onStart: () => void;
  loading: boolean;
  geoError: string | null;
  orientationError: string | null;
};

export function StartScanner({ onStart, loading, geoError, orientationError }: Props) {
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

        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -1 }}
          onClick={onStart}
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 px-5 py-4 font-medium text-ink-900 shadow-[0_8px_30px_rgba(232,196,116,0.25)] disabled:opacity-50"
          style={{ background: "linear-gradient(180deg, #f0d28b 0%, #d4a84b 100%)" }}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Asking permissions…" : "Begin Sky Scanner"}
        </motion.button>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Hint icon={<MapPin className="h-3.5 w-3.5" />} label="Location" sub="So we know which stars are above you" />
          <Hint icon={<Compass className="h-3.5 w-3.5" />} label="Motion" sub="So we know which way you're pointing" />
        </div>

        {(geoError || orientationError) && (
          <p className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2.5 text-[13px] text-rose-100/90">
            {geoError || orientationError}
          </p>
        )}

        <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-white/30 font-mono">
          v1 · bright stars · planets · 110 messier objects · 88 constellations
        </p>
      </div>
    </section>
  );
}

function Hint({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/80">
        {icon}
        <span className="text-[11px] tracking-widest uppercase font-mono">{label}</span>
      </div>
      <p className="mt-1 text-[12px] text-white/50 leading-snug">{sub}</p>
    </div>
  );
}
