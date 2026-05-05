"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Compass, Clock } from "lucide-react";

import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { useSkyObjects } from "@/hooks/useSkyObjects";
import { useSatellites } from "@/hooks/useSatellites";
import { useSkyFilters, categoryFor, type FilterCategory } from "@/hooks/useSkyFilters";
import { useSkyConditions } from "@/hooks/useSkyConditions";

import {
  findClosestObject,
  type SkyObject,
  type MatchResult,
} from "@/lib/astronomy/matching";
import {
  deviceToHorizontal,
  angularDistance,
} from "@/lib/astronomy/coords";

import { StartScanner } from "@/components/StartScanner";
import { SkyCompass } from "@/components/SkyCompass";
import { SkyView } from "@/components/SkyView";
import { ObjectCard } from "@/components/ObjectCard";
import { SearchPanel } from "@/components/SearchPanel";
import { TonightHighlights } from "@/components/TonightHighlights";
import { ObjectDetail } from "@/components/ObjectDetail";
import { SatelliteAlert } from "@/components/SatelliteAlert";
import { FilterBar } from "@/components/FilterBar";
import { SkyConditionsBanner } from "@/components/SkyConditionsBanner";

export default function HomePage() {
  const { position, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  const { orientation, granted, error: orientationError, requestOrientation } = useDeviceOrientation();
  const { satellites } = useSatellites();
  const { sky, now } = useSkyObjects(position, satellites);
  const { filters, toggle, reset, allOn } = useSkyFilters();

  // FIRST: filter by what's physically visible right now (sky conditions).
  // Physics doesn't care about user preferences — daytime stars aren't
  // visible no matter how much the user wants them to be.
  const skyConditions = useSkyConditions(position, sky, now);
  const physicallyVisibleSky = skyConditions?.visibleSky ?? sky;

  // SECOND: apply the user's category preferences on top of physical visibility.
  // The Filter chip counts also reflect what's physically visible so the user
  // sees "Stars 0" during the day rather than "Stars 138" of invisible stars.
  const filteredSky = useMemo(
    () => physicallyVisibleSky.filter((o) => filters[categoryFor(o.kind)]),
    [physicallyVisibleSky, filters]
  );

  // Counts per category — based on physically visible sky, so chip counts
  // are honest about what's actually available to toggle on right now.
  const counts = useMemo(() => {
    const c: Record<FilterCategory, number> = {
      stars: 0,
      planets: 0,
      "deep-sky": 0,
      constellations: 0,
      satellites: 0,
    };
    for (const o of physicallyVisibleSky) c[categoryFor(o.kind)]++;
    return c;
  }, [physicallyVisibleSky]);

  const [tracked, setTracked] = useState<SkyObject | null>(null);
  const [detail, setDetail] = useState<SkyObject | null>(null);
  const [viewMode, setViewMode] = useState<"panoramic" | "instrument">("panoramic");

  const pointing = useMemo(
    () => deviceToHorizontal(orientation.alpha, orientation.beta),
    [orientation.alpha, orientation.beta]
  );

  // Match: closest object to phone direction, using the FILTERED sky so
  // turning off "stars" makes the app identify planets/satellites instead.
  // If user is tracking something explicit, resolve to its live alt/az from
  // the unfiltered catalog (because satellites move and tracking should
  // never be silently broken by a filter toggle).
  const match = useMemo<MatchResult | null>(() => {
    if (!pointing) return null;
    if (tracked) {
      const live = sky.find((o) => o.name === tracked.name) ?? tracked;
      const sep = angularDistance(pointing, { alt: live.alt, az: live.az });
      return { object: live, separation: sep };
    }
    if (filteredSky.length === 0) return null;
    return findClosestObject(pointing, filteredSky, { maxSeparation: 25 });
  }, [pointing, sky, filteredSky, tracked]);

  // Auto-clear tracking if user gives up trying to find it
  useEffect(() => {
    if (tracked && match && match.separation > 60) {
      // Don't auto-clear — let the user manually dismiss. Tracking should be sticky.
    }
  }, [tracked, match]);

  // Live-update the tracked object reference so the detail modal stays current
  const liveTracked = useMemo(() => {
    if (!tracked) return null;
    return sky.find((o) => o.name === tracked.name) ?? tracked;
  }, [tracked, sky]);

  const ready = position && granted;

  return (
    <main className="min-h-screen text-white px-4 py-5 pb-12">
      <div className="mx-auto max-w-md space-y-5">
        {!ready ? (
          <StartScanner
            onRequestMotion={requestOrientation}
            onRequestLocation={requestLocation}
            motionGranted={granted}
            locationGranted={!!position}
            loading={geoLoading}
            geoError={geoError}
            orientationError={orientationError}
          />
        ) : (
          <>
            <Header position={position} now={now} pointing={pointing} />

            {skyConditions && (
              <SkyConditionsBanner
                conditions={skyConditions.conditions}
                nextDarkPhase={skyConditions.nextDarkPhase}
                hiddenCount={skyConditions.hiddenAboveHorizon}
              />
            )}

            <SatelliteAlert sky={filteredSky} onPick={(o) => setDetail(o)} />

            <FilterBar
              filters={filters}
              counts={counts}
              onToggle={toggle}
              onReset={reset}
              allOn={allOn}
            />

            <ViewToggle mode={viewMode} onChange={setViewMode} />

            {viewMode === "panoramic" && position ? (
              <SkyView
                pointing={pointing}
                sky={filteredSky}
                trackedTarget={liveTracked}
                onObjectTap={(o) => setDetail(o)}
                observerLat={position.lat}
                observerLon={position.lon}
                now={now}
              />
            ) : (
              <SkyCompass
                pointing={pointing}
                sky={filteredSky}
                trackedTarget={liveTracked}
                onObjectTap={(o) => setDetail(o)}
              />
            )}

            <ObjectCard match={match} onOpenDetail={(o) => setDetail(o)} />

            {/* Search uses unfiltered sky — if you type "Saturn" you should
                find it even when the planets filter is off. */}
            <SearchPanel sky={sky} onPick={(o) => setDetail(o)} />

            <TonightHighlights sky={filteredSky} onPick={(o) => setDetail(o)} />

            {tracked && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setTracked(null)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] uppercase tracking-[0.25em] text-white/60 font-mono"
              >
                Stop guiding to {shortName(tracked.name)} · resume auto-detect
              </motion.button>
            )}

            <Footer satCount={satellites.length} />
          </>
        )}
      </div>

      {/* Detail modal — overlays everything */}
      <ObjectDetail
        object={detail}
        onClose={() => setDetail(null)}
        onTrack={(o) => {
          setTracked(o);
          setDetail(null);
        }}
      />
    </main>
  );
}

function Header({
  position,
  now,
  pointing,
}: {
  position: { lat: number; lon: number } | null;
  now: Date;
  pointing: { alt: number; az: number } | null;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">
        <span>Cosmos Finder</span>
        <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono">
        <Stat
          icon={<MapPin className="h-3 w-3" />}
          value={position ? `${position.lat.toFixed(2)}, ${position.lon.toFixed(2)}` : "—"}
        />
        <Stat
          icon={<Compass className="h-3 w-3" />}
          value={pointing ? `${cardinal(pointing.az)} ${pointing.az.toFixed(0)}°` : "—"}
        />
        <Stat
          icon={<Clock className="h-3 w-3" />}
          value={pointing ? `alt ${pointing.alt.toFixed(0)}°` : "—"}
        />
      </div>
    </section>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/70">
      <span className="text-gold-400">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function cardinal(az: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((az % 360) / 45)) % 8];
}

function shortName(name: string) {
  if (name.length <= 14) return name;
  if (name.includes("—")) return name.split("—")[0].trim();
  if (name.includes("(")) return name.split(" ")[0];
  return name.slice(0, 13) + "…";
}

function Footer({ satCount }: { satCount: number }) {
  return (
    <p className="pt-2 text-center text-[10px] uppercase tracking-[0.3em] text-white/25 font-mono">
      {satCount > 0 ? `tracking ${satCount} satellites · ` : ""}made for stargazers · v2.0
    </p>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: "panoramic" | "instrument";
  onChange: (m: "panoramic" | "instrument") => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      <ToggleOption
        active={mode === "panoramic"}
        onClick={() => onChange("panoramic")}
        label="Sky View"
        sub="Panoramic"
      />
      <ToggleOption
        active={mode === "instrument"}
        onClick={() => onChange("instrument")}
        label="Compass"
        sub="Precision"
      />
    </div>
  );
}

function ToggleOption({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-2 text-center transition ${
        active
          ? "bg-gold-400/15 text-gold-400"
          : "text-white/50 hover:text-white/80"
      }`}
    >
      <p className="text-[12px] font-medium">{label}</p>
      <p className="text-[9px] uppercase tracking-[0.2em] font-mono opacity-70">
        {sub}
      </p>
    </button>
  );
}
