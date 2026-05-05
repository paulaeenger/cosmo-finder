"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Compass, Satellite as SatIcon, Globe, Eye, Sparkles, BookOpen } from "lucide-react";
import { useState } from "react";
import type { SkyObject } from "@/lib/astronomy/matching";
import { getObjectFacts } from "@/lib/data/object-facts";
import { ObjectImageHero } from "./ObjectImageHero";

type Props = {
  object: SkyObject | null;
  onClose: () => void;
  onTrack?: (obj: SkyObject) => void;
};

export function ObjectDetail({ object, onClose, onTrack }: Props) {
  const [tab, setTab] = useState<"overview" | "data" | "viewing" | "fact">("overview");

  return (
    <AnimatePresence>
      {object && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-gradient-to-b from-[#0a1226] via-[#070a14] to-[#03050b] grain"
          >
            <DetailContent
              object={object}
              tab={tab}
              setTab={setTab}
              onClose={onClose}
              onTrack={onTrack}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailContent({
  object,
  tab,
  setTab,
  onClose,
  onTrack,
}: {
  object: SkyObject;
  tab: "overview" | "data" | "viewing" | "fact";
  setTab: (t: "overview" | "data" | "viewing" | "fact") => void;
  onClose: () => void;
  onTrack?: (obj: SkyObject) => void;
}) {
  const facts = getObjectFacts(object.name, object.kind);
  const isSat = object.kind === "satellite";

  return (
    <div className="relative">
      {/* Drag handle */}
      <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-[#0a1226] to-transparent pt-3 pb-2">
        <div className="h-1 w-10 rounded-full bg-white/20" />
      </div>

      <div className="px-6 pb-6">
        {/* Hero image */}
        <ObjectImageHero name={object.name} kind={object.kind} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-white/15 bg-black/50 p-2 text-white/85 backdrop-blur-sm hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400 font-mono">
          {kindLabel(object.kind)}
        </p>
        <h2 className="mt-1.5 font-display text-[34px] leading-[1.05] tracking-tight">
          {object.name}
        </h2>
        {facts?.tagline && (
          <p className="mt-1.5 italic text-white/55 text-[15px] leading-snug">
            {facts.tagline}
          </p>
        )}
        {object.bayer && !facts?.tagline && (
          <p className="mt-1 italic text-white/55 text-sm">{object.bayer}</p>
        )}

        {/* Live position chips */}
        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-mono">
          <Chip>alt {object.alt.toFixed(1)}°</Chip>
          <Chip>az {object.az.toFixed(1)}°</Chip>
          {object.constellation && <Chip>{object.constellation}</Chip>}
          {object.mag < 99 && <Chip>mag {object.mag.toFixed(1)}</Chip>}
          {isSat && object.satellite?.altKm && (
            <Chip>{Math.round(object.satellite.altKm)} km up</Chip>
          )}
          {isSat && object.satellite?.velocityKmS && (
            <Chip>{(object.satellite.velocityKmS * 3600).toFixed(0)} km/h</Chip>
          )}
          {isSat && object.satellite?.lit && <Chip tone="gold">☀ sunlit</Chip>}
          {isSat && object.satellite?.inEclipse && <Chip tone="dim">🌑 in shadow</Chip>}
        </div>

        {/* Track button */}
        {onTrack && (
          <button
            onClick={() => {
              onTrack(object);
              onClose();
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm font-medium text-gold-400"
          >
            <Compass className="h-4 w-4" />
            Guide me to {shortName(object.name)}
          </button>
        )}

        {/* Tabs */}
        {facts && (
          <div className="mt-6 flex gap-1 border-b border-white/10 text-[11px] uppercase tracking-[0.15em] font-mono">
            <Tab active={tab === "overview"} onClick={() => setTab("overview")} icon={<BookOpen className="h-3 w-3" />}>
              Overview
            </Tab>
            <Tab active={tab === "data"} onClick={() => setTab("data")} icon={isSat ? <SatIcon className="h-3 w-3" /> : <Globe className="h-3 w-3" />}>
              Data
            </Tab>
            <Tab active={tab === "viewing"} onClick={() => setTab("viewing")} icon={<Eye className="h-3 w-3" />}>
              Viewing
            </Tab>
            {(facts.significance || facts.funFact) && (
              <Tab active={tab === "fact"} onClick={() => setTab("fact")} icon={<Sparkles className="h-3 w-3" />}>
                Significance
              </Tab>
            )}
          </div>
        )}

        {/* Tab content */}
        <div className="mt-5">
          {!facts && (
            <FallbackContent object={object} />
          )}

          {facts && tab === "overview" && (
            <p className="text-[15px] leading-relaxed text-white/80">{facts.overview}</p>
          )}

          {facts && tab === "data" && (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {facts.facts.map((f) => (
                <div key={f.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <dt className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono">
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-white/85">{f.value}</dd>
                </div>
              ))}
              {/* Live satellite ground-track */}
              {isSat && object.satellite && (
                <>
                  <div className="rounded-xl border border-gold-400/20 bg-gold-400/5 p-3">
                    <dt className="text-[10px] tracking-[0.2em] uppercase text-gold-400 font-mono">
                      Now over (lat, lon)
                    </dt>
                    <dd className="mt-1 text-white/85 font-mono">
                      {object.satellite.lat.toFixed(2)}, {object.satellite.lon.toFixed(2)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gold-400/20 bg-gold-400/5 p-3">
                    <dt className="text-[10px] tracking-[0.2em] uppercase text-gold-400 font-mono">
                      Range from you
                    </dt>
                    <dd className="mt-1 text-white/85 font-mono">
                      {Math.round(object.satellite.rangeKm).toLocaleString()} km
                    </dd>
                  </div>
                </>
              )}
            </dl>
          )}

          {facts && tab === "viewing" && (
            <p className="text-[15px] leading-relaxed text-white/80">
              {facts.viewing ?? "No specific viewing notes for this object."}
            </p>
          )}

          {facts && tab === "fact" && (facts.significance || facts.funFact) && (
            <div className="rounded-2xl border border-gold-400/20 bg-gradient-to-br from-gold-400/10 to-transparent p-5">
              <Sparkles className="h-5 w-5 text-gold-400" />
              <p className="mt-3 text-[15px] leading-relaxed text-white/85">
                {facts.significance ?? facts.funFact}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FallbackContent({ object }: { object: SkyObject }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-white/80">
        {object.description ?? "An object in the sky above you right now."}
      </p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {object.constellation && (
          <DataCell label="Constellation" value={object.constellation} />
        )}
        {object.type && <DataCell label="Type" value={object.type} />}
        {object.distLy != null && (
          <DataCell label="Distance" value={`${formatLy(object.distLy)} ly`} />
        )}
        {object.distAu != null && object.kind !== "moon" && (
          <DataCell label="Distance" value={`${object.distAu.toFixed(2)} AU`} />
        )}
        {object.kind === "moon" && object.distAu != null && (
          <DataCell
            label="Distance"
            value={`${Math.round(object.distAu * 149597.9).toLocaleString()} km`}
          />
        )}
      </div>

      <p className="text-[12px] text-white/40 italic">
        Detailed write-up not yet available for this object — basic data only.
      </p>
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono">{label}</p>
      <p className="mt-1 text-white/85">{value}</p>
    </div>
  );
}

function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "gold" | "dim" }) {
  const cls =
    tone === "gold"
      ? "border-gold-400/40 bg-gold-400/10 text-gold-400"
      : tone === "dim"
      ? "border-white/10 bg-white/[0.02] text-white/40"
      : "border-white/10 bg-white/[0.04] text-white/70";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 ${cls}`}>{children}</span>
  );
}

function Tab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 transition ${
        active
          ? "border-b-2 border-gold-400 text-gold-400"
          : "border-b-2 border-transparent text-white/40 hover:text-white/70"
      }`}
    >
      {icon}
      {children}
    </button>
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

function shortName(name: string) {
  if (name.length <= 14) return name;
  if (name.includes("—")) return name.split("—")[0].trim();
  return name.slice(0, 13) + "…";
}

function formatLy(ly: number) {
  if (ly < 100) return ly.toFixed(1);
  return Math.round(ly).toLocaleString();
}
