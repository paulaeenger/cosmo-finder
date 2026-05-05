"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { MatchResult, SkyObject } from "@/lib/astronomy/matching";

type Props = {
  match: MatchResult | null;
  onOpenDetail?: (obj: SkyObject) => void;
};

export function ObjectCard({ match, onOpenDetail }: Props) {
  return (
    <AnimatePresence mode="wait">
      {match ? (
        <motion.div
          key={match.object.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c111f] to-[#070a14] p-6 grain"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold-400 font-mono">
                {kindLabel(match.object.kind)}
              </p>
              <h2 className="mt-1.5 text-3xl font-display font-medium leading-tight">
                {match.object.name}
              </h2>
              {match.object.bayer && (
                <p className="mt-0.5 italic text-white/50 text-sm">{match.object.bayer}</p>
              )}
            </div>
            <Separation deg={match.separation} />
          </div>

          <div className="hairline my-5" />

          {match.object.description && (
            <p className="text-white/70 leading-relaxed text-[15px]">
              {match.object.description}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {match.object.constellation && (
              <Row label="Constellation" value={match.object.constellation} />
            )}
            {match.object.type && <Row label="Type" value={match.object.type} />}
            {match.object.mag < 99 && (
              <Row label="Magnitude" value={match.object.mag.toFixed(2)} mono />
            )}
            <Row label="Altitude" value={`${match.object.alt.toFixed(1)}°`} mono />
            <Row label="Azimuth" value={`${match.object.az.toFixed(1)}°`} mono />
            {match.object.distLy != null && (
              <Row label="Distance" value={`${formatDistance(match.object.distLy)} ly`} mono />
            )}
            {match.object.distAu != null && match.object.kind !== "moon" && (
              <Row label="Distance" value={`${match.object.distAu.toFixed(2)} AU`} mono />
            )}
            {match.object.kind === "moon" && match.object.distAu != null && (
              <Row label="Distance" value={`${Math.round(match.object.distAu * 149597.9).toLocaleString()} km`} mono />
            )}
            {match.object.kind === "satellite" && match.object.satellite && (
              <>
                <Row label="Altitude (km)" value={`${Math.round(match.object.satellite.altKm)} km`} mono />
                <Row label="Speed" value={`${(match.object.satellite.velocityKmS * 3600).toFixed(0)} km/h`} mono />
              </>
            )}
          </dl>

          {onOpenDetail && (
            <button
              onClick={() => onOpenDetail(match.object)}
              className="mt-5 flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/85 hover:bg-white/[0.06] transition"
            >
              <span className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gold-400 font-mono">
                  Tap for
                </span>
                <span>Full details, history & viewing tips</span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center"
        >
          <p className="font-display text-xl text-white/60">Aim your phone at the sky</p>
          <p className="mt-1 text-sm text-white/40">
            Move slowly. Objects within view will appear here.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Separation({ deg }: { deg: number }) {
  const tone = deg < 3 ? "text-gold-400" : deg < 8 ? "text-white/70" : "text-white/40";
  return (
    <div className="text-right shrink-0">
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono">Separation</p>
      <p className={`mt-1 text-2xl font-mono ${tone}`}>{deg.toFixed(1)}°</p>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono">{label}</dt>
      <dd className={`mt-0.5 text-white/85 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function kindLabel(kind: string) {
  switch (kind) {
    case "star": return "Star";
    case "planet": return "Planet";
    case "moon": return "Natural Satellite";
    case "sun": return "Star · Sun";
    case "deep-sky": return "Deep-Sky Object";
    case "constellation": return "Constellation";
    case "satellite": return "Artificial Satellite";
    default: return kind;
  }
}

function formatDistance(ly: number) {
  if (ly < 100) return ly.toFixed(1);
  if (ly < 1000) return Math.round(ly).toString();
  return `${Math.round(ly).toLocaleString()}`;
}
