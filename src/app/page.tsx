"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapPin, Compass, Clock } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { useSkyObjects } from "@/hooks/useSkyObjects";
import { useSatellites } from "@/hooks/useSatellites";
import { useSkyFilters, categoryFor, type FilterCategory } from "@/hooks/useSkyFilters";
import { useEquipment } from "@/hooks/useEquipment";
import { useSkyConditions } from "@/hooks/useSkyConditions";
import {
  findClosestObject,
  type SkyObject,
  type MatchResult,
} from "@/lib/astronomy/matching";
import {
  deviceToHorizontalFull,
  makeOrientationSmoother,
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
import { TimeScrubber } from "@/components/TimeScrubber";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { CalibrationCoach } from "@/components/CalibrationCoach";
import { ConditionsTimeline } from "@/components/ConditionsTimeline";
import { TrackingGuide } from "@/components/TrackingGuide";
export default function HomePage() {
  const { position, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  const { orientation, granted, error: orientationError, requestOrientation } = useDeviceOrientation();
  const { satellites } = useSatellites();
  const [viewTime, setViewTime] = useState<Date | null>(null);
  const { sky, now } = useSkyObjects(position, satellites, viewTime);
  const { filters, toggle, reset, allOn } = useSkyFilters();
  const { equipment, setEquipment, magLimit } = useEquipment();
  // FIRST: filter by what's physically visible right now (sky conditions).
  // Physics doesn't care about user preferences — daytime stars aren't
  // visible no matter how much the user wants them to be.
  const skyConditions = useSkyConditions(position, sky, now);
  const physicallyVisibleSky = skyConditions?.visibleSky ?? sky;
  // SECOND: apply the equipment magnitude limit. Only stars and deep-sky
  // objects are filtered — solar system bodies and satellites stay visible
  // regardless of equipment because users care about them by category, not
  // by brightness, and bright planets remain naked-eye anyway.
  const equipmentFilteredSky = useMemo(
    () =>
      physicallyVisibleSky.filter((o) => {
        if (o.kind !== "star" && o.kind !== "deep-sky") return true;
        return o.mag <= magLimit;
      }),
    [physicallyVisibleSky, magLimit]
  );
  // THIRD: apply the user's category preferences. The Filter chip counts
  // reflect what's physically visible AT current equipment level so the
  // user sees "Stars 30" with binoculars rather than "Stars 138" of which
  // they can't see any.
  // NOTE: the "constellations" filter is applied to the SkyView render
  // (lines + labels) instead of being filtered out of the catalog here,
  // because constellation objects in the catalog don't carry the lines.
  const filteredSky = useMemo(
    () =>
      equipmentFilteredSky.filter((o) => {
        const cat = categoryFor(o.kind);
        if (cat === "constellations") return true; // SkyView decides via showConstellations
        return filters[cat];
      }),
    [equipmentFilteredSky, filters]
  );
  // Counts per category — based on equipment-filtered sky, so chip counts
  // are honest about what's actually available to see right now.
  const counts = useMemo(() => {
    const c: Record<FilterCategory, number> = {
      stars: 0,
      planets: 0,
      "deep-sky": 0,
      constellations: 0,
      satellites: 0,
    };
    for (const o of equipmentFilteredSky) c[categoryFor(o.kind)]++;
    return c;
  }, [equipmentFilteredSky]);
  const [tracked, setTracked] = useState<SkyObject | null>(null);
  const [detail, setDetail] = useState<SkyObject | null>(null);
  const [viewMode, setViewMode] = useState<"panoramic" | "instrument">("panoramic");
  // Live vs Manual: in manual the gyroscope is paused and touch drives the view.
  const [skyMode, setSkyMode] = useState<"live" | "manual">("live");
  // The user-controlled view in manual mode. Null in live mode. Seeded from the
  // gyro pointing at the instant the user switches to manual, then mutated by
  // drag deltas. While this is non-null the gyro is effectively frozen — the
  // view no longer drifts with small hand movements.
  const [manualView, setManualView] = useState<{ alt: number; az: number } | null>(null);
  // Stateful smoother — persists across renders so the view glides instead of
  // jittering frame to frame. Created once.
  const smootherRef = useRef(makeOrientationSmoother(0.25));
  const pointing = useMemo(() => {
    const raw = deviceToHorizontalFull(
      orientation.alpha,
      orientation.beta,
      orientation.gamma,
      orientation.screenAngle
    );
    if (!raw) {
      smootherRef.current.reset();
      return null;
    }
    return smootherRef.current.push(raw);
  }, [
    orientation.alpha,
    orientation.beta,
    orientation.gamma,
    orientation.screenAngle,
  ]);
  // On entering manual, snapshot the current pointing so the view starts where
  // the user was already looking. On returning to live, clear it so the gyro
  // takes back over cleanly.
  useEffect(() => {
    if (skyMode === "manual") {
      setManualView(pointing ? { alt: pointing.alt, az: pointing.az } : { alt: 20, az: 0 });
    } else {
      setManualView(null);
    }
    // Intentionally only re-run on mode change — we snapshot pointing once at
    // switch time and must NOT re-seed on every gyro update (that would refreeze
    // the view to the gyro and undo the user's drags).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skyMode]);
  // Apply a single drag's incremental delta functionally so fast move events
  // never overwrite each other.
  const handlePan = useCallback((delta: { dAlt: number; dAz: number }) => {
    setManualView((v) => {
      if (!v) return v;
      return {
        alt: Math.max(-89, Math.min(89, v.alt + delta.dAlt)),
        az: ((v.az + delta.dAz) % 360 + 360) % 360,
      };
    });
  }, []);
  // The direction SkyView renders: gyro in live mode, user view in manual.
  const skyViewDir = skyMode === "manual" ? manualView : pointing;
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
  // Compass calibration coach. iOS reports webkitCompassAccuracy in degrees
  // (-1 = invalid). When it indicates drift we surface the figure-8 coach once
  // per session; the user can also open it manually anytime from the header.
  const [showCalibration, setShowCalibration] = useState(false);
  const autoPromptedRef = useRef(false);
  useEffect(() => {
    if (!ready || autoPromptedRef.current) return;
    const acc = orientation.compassAccuracy;
    // Only auto-surface when we have a real iOS reading that looks bad:
    // -1 (invalid heading) or a large error (> 25°). Null = platform doesn't
    // report it, so we never auto-nag there.
    if (acc != null && (acc < 0 || acc > 25)) {
      autoPromptedRef.current = true;
      setShowCalibration(true);
    }
  }, [ready, orientation.compassAccuracy]);
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
            <button
              onClick={() => setShowCalibration(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white/45 font-mono transition hover:text-white/70"
            >
              <Compass className="h-3 w-3" />
              {orientation.compassAccuracy != null &&
              (orientation.compassAccuracy < 0 || orientation.compassAccuracy > 25)
                ? "Compass may be off · calibrate"
                : "Calibrate compass"}
            </button>
            <OfflineIndicator />
            {skyConditions && (
              <SkyConditionsBanner
                conditions={skyConditions.conditions}
                nextDarkPhase={skyConditions.nextDarkPhase}
                hiddenCount={skyConditions.hiddenAboveHorizon}
              />
            )}
            {skyConditions && (
              <ConditionsTimeline timeline={skyConditions.timeline} />
            )}
            <TimeScrubber
              viewTime={now}
              isLive={viewTime == null}
              onChange={setViewTime}
            />
            <SatelliteAlert
              sky={filteredSky}
              isLive={viewTime == null}
              viewTime={now}
              onPick={(o) => setDetail(o)}
            />
            <FilterBar
              filters={filters}
              counts={counts}
              onToggle={toggle}
              onReset={reset}
              allOn={allOn}
            />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            {viewMode === "panoramic" && (
              <SkyModeToggle mode={skyMode} onChange={setSkyMode} />
            )}
            {viewMode === "panoramic" && position ? (
              <div className="relative">
                <SkyView
                  view={skyViewDir}
                  sky={filteredSky}
                  trackedTarget={liveTracked}
                  onObjectTap={(o) => setDetail(o)}
                  observerLat={position.lat}
                  observerLon={position.lon}
                  now={now}
                  showConstellations={filters.constellations}
                  mode={skyMode}
                  onPan={handlePan}
                />
                {tracked && liveTracked && (
                  <div className="pointer-events-none absolute inset-x-3 top-3 z-20">
                    <div className="pointer-events-auto">
                      <TrackingGuide
                        target={liveTracked}
                        pointing={pointing}
                        onStop={() => setTracked(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
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
            <Footer satCount={satellites.length} />
          </>
        )}
      </div>
      {/* Detail modal — overlays everything */}
      <ObjectDetail
        object={detail}
        observerLat={position?.lat ?? null}
        observerLon={position?.lon ?? null}
        now={now}
        satellites={satellites}
        onClose={() => setDetail(null)}
        onTrack={(o) => {
          setTracked(o);
          setDetail(null);
        }}
      />
      <CalibrationCoach
        open={showCalibration}
        onClose={() => setShowCalibration(false)}
        accuracy={orientation.compassAccuracy}
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
function SkyModeToggle({
  mode,
  onChange,
}: {
  mode: "live" | "manual";
  onChange: (m: "live" | "manual") => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      <ToggleOption
        active={mode === "live"}
        onClick={() => onChange("live")}
        label="Live"
        sub="Follows phone"
      />
      <ToggleOption
        active={mode === "manual"}
        onClick={() => onChange("manual")}
        label="Manual"
        sub="Drag to look"
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
