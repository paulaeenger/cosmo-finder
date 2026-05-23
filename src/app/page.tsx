"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapPin, Compass, Clock, Activity } from "lucide-react";
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
  deviceToVector,
  deviceUpVector,
  makeOrientationSmoother,
  angularDistance,
  applyCalibration,
  solveCalibration,
  horizontalToVector,
  IDENTITY_CALIBRATION,
  type Calibration,
} from "@/lib/astronomy/coords";
import { CalibratePanel } from "@/components/CalibratePanel";
import { StartScanner } from "@/components/StartScanner";
import { SkyCompass } from "@/components/SkyCompass";
import { SkyView } from "@/components/SkyView";
import { ObjectCard } from "@/components/ObjectCard";
import { SearchPanel } from "@/components/SearchPanel";
import { TonightHighlights } from "@/components/TonightHighlights";
import { ObjectDetail } from "@/components/ObjectDetail";
import { SatelliteAlert } from "@/components/SatelliteAlert";
import { FilterBar } from "@/components/FilterBar";
import { CategoryListSheet } from "@/components/CategoryListSheet";
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
    for (const o of equipmentFilteredSky) {
      if (o.kind === "sun") continue; // lighting engine, not a browsable target
      c[categoryFor(o.kind)]++;
    }
    return c;
  }, [equipmentFilteredSky]);
  const [tracked, setTracked] = useState<SkyObject | null>(null);
  // Which category list sheet is open (tap a filter chip to view its objects).
  const [openCategory, setOpenCategory] = useState<FilterCategory | null>(null);
  // Objects belonging to the open category. For stars we show only the bright
  // NAMED ones (a raw list of dozens of catalog stars isn't scannable); other
  // categories show everything.
  const categoryObjects = useMemo(() => {
    if (!openCategory) return [];
    const inCat = equipmentFilteredSky.filter(
      (o) => categoryFor(o.kind) === openCategory && o.kind !== "sun"
    );
    if (openCategory === "stars") {
      return inCat.filter(
        (o) => o.mag <= 2.2 && !/^(HIP|HD|HR|TYC|Gliese|GJ)\b/i.test(o.name)
      );
    }
    return inCat;
  }, [openCategory, equipmentFilteredSky]);
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
  // jittering frame to frame. Smooths the 3D pointing VECTOR (stable near the
  // zenith) and returns alt/az. Created once.
  const smootherRef = useRef(makeOrientationSmoother(0.08));
  // Device calibration: solved when the user aligns to a known object.
  const [calibration, setCalibration] = useState<Calibration>(IDENTITY_CALIBRATION);
  const rawVecRef = useRef<{ x: number; y: number; z: number } | null>(null);
  // The immediate sensor pointing (calibrated). Used for logic (matching, the
  // manual snapshot). The smoother here is light; the RENDER LOOP below does the
  // visual smoothing at a steady 60fps.
  const targetVecRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const pointing = useMemo(() => {
    const vec = deviceToVector(orientation.alpha, orientation.beta, orientation.gamma);
    if (!vec) {
      smootherRef.current.reset();
      rawVecRef.current = null;
      targetVecRef.current = null;
      return null;
    }
    rawVecRef.current = vec;
    const corrected = applyCalibration(calibration, vec);
    // Feed the render loop's target (raw calibrated vector — the loop smooths).
    if (
      Number.isFinite(corrected.x) &&
      Number.isFinite(corrected.y) &&
      Number.isFinite(corrected.z)
    ) {
      targetVecRef.current = corrected;
    }
    return smootherRef.current.push(corrected);
  }, [orientation.alpha, orientation.beta, orientation.gamma, calibration]);

  // RENDER-LOOP INTERPOLATION. Rendering runs on its own steady 60fps loop that
  // eases a display vector toward the latest sensor target. This decouples the
  // visual motion from the irregular, jittery sensor update rate, so the sky
  // glides continuously instead of stepping. The sensor math is untouched.
  const [liveView, setLiveView] = useState<{ alt: number; az: number } | null>(null);
  const dispVecRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const candVecRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const candCountRef = useRef(0);
  useEffect(() => {
    if (skyMode !== "live") return; // manual mode is touch-driven, not animated
    let raf = 0;
    const EASE = 0.18; // per-frame catch-up; smooth but responsive at 60fps
    const angleBetween = (a: typeof dispVecRef.current, b: typeof dispVecRef.current) => {
      if (!a || !b) return 0;
      const d = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      return Math.acos(d) * (180 / Math.PI);
    };
    const valid = (v: typeof dispVecRef.current) =>
      !!v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
    const loop = () => {
      const target = targetVecRef.current;
      if (valid(target)) {
        const disp = dispVecRef.current;
        if (!disp) {
          dispVecRef.current = { ...target! };
        } else {
          const a = angleBetween(disp, target);
          if (a > 40) {
            // Likely the iOS near-vertical flip. Hold, unless a far target
            // persists (real reorientation) for ~12 frames, then snap.
            const cand = candVecRef.current;
            if (cand && angleBetween(cand, target) < 10) {
              candCountRef.current++;
            } else {
              candVecRef.current = { ...target! };
              candCountRef.current = 1;
            }
            if (candCountRef.current >= 12) {
              dispVecRef.current = { ...target! };
              candCountRef.current = 0;
            }
          } else {
            candCountRef.current = 0;
            const nx = disp.x + (target!.x - disp.x) * EASE;
            const ny = disp.y + (target!.y - disp.y) * EASE;
            const nz = disp.z + (target!.z - disp.z) * EASE;
            const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (Number.isFinite(l) && l > 0) {
              dispVecRef.current = { x: nx / l, y: ny / l, z: nz / l };
            }
          }
        }
        const d = dispVecRef.current;
        if (d) {
          const horiz = Math.sqrt(d.x * d.x + d.y * d.y);
          const alt = Math.atan2(d.z, horiz) * (180 / Math.PI);
          let az = Math.atan2(-d.x, d.y) * (180 / Math.PI);
          az = ((az % 360) + 360) % 360;
          setLiveView((prev) =>
            // Skip the state update when essentially unchanged to avoid needless
            // re-renders when the phone is still.
            prev && Math.abs(prev.alt - alt) < 0.03 && Math.abs(prev.az - az) < 0.03
              ? prev
              : { alt, az }
          );
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // Reset the display so re-entering live re-primes cleanly.
      dispVecRef.current = null;
      candVecRef.current = null;
      candCountRef.current = 0;
    };
  }, [skyMode]);
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
  // The direction SkyView renders: smooth animated view in live mode (falls
  // back to immediate pointing until the loop primes), user view in manual.
  const skyViewDir = skyMode === "manual" ? manualView : liveView ?? pointing;
  // The phone's own up axis, used by the renderer as the screen-roll reference
  // so the view follows the device's roll and stays stable through the zenith
  // (world-up-derived roll spins ~180° at the pole). Calibrated with the same
  // rotation as the look direction, then converted from coords' world frame
  // (x=east, y=north, z=up) to the projection frame (x=east, y=up, z=north).
  // Null in manual mode — SkyView synthesizes an upright reference there.
  const viewUp = useMemo(() => {
    if (skyMode !== "live") return null;
    const u = deviceUpVector(orientation.alpha, orientation.beta, orientation.gamma);
    if (!u) return null;
    const c = applyCalibration(calibration, u);
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.z)) return null;
    // Convert coords world frame (x=east, y=north, z=up) -> projection frame
    // (x=east, y=up, z=north), AND negate. On-device (portrait) the un-negated
    // device +Y reference rendered the whole sky rotated 180° (Sun appeared
    // upper-left where geometry puts it lower-right): in the projection basis,
    // with its flipped screen-y, device +Y maps to screen-DOWN. Negating the
    // reference flips both screen axes, which is exactly the 180° correction.
    // This sets ROLL only — the look direction and its smoothing are unaffected,
    // so live tracking quality is unchanged. Manual mode uses worldRefUp, not
    // this value, so it is unaffected too. (Landscape screenAngle still TBD.)
    return { x: -c.x, y: -c.z, z: -c.y };
  }, [orientation.alpha, orientation.beta, orientation.gamma, calibration, skyMode]);
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
            {/* Sensor diagnostic instrument. Full navigation (not client-side)
                so a stale service worker can't trap you on the cached shell. */}
            <a
              href="/diag"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-300/70 font-mono transition hover:text-amber-200"
            >
              <Activity className="h-3 w-3" />
              Sensor diagnostics
            </a>
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
              onOpenCategory={(cat) => setOpenCategory(cat)}
              onReset={reset}
              allOn={allOn}
            />
            {/* Calibration: point at a known object, tap it, align the sky. */}
            <CalibratePanel
              sky={filteredSky}
              onCalibrate={(obj) => {
                const raw = rawVecRef.current;
                if (!raw) return;
                const trueDir = horizontalToVector(obj.alt, obj.az);
                setCalibration(solveCalibration(raw, trueDir));
                smootherRef.current.reset();
              }}
              onReset={() => setCalibration(IDENTITY_CALIBRATION)}
              calibrated={calibration !== IDENTITY_CALIBRATION}
            />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            {viewMode === "panoramic" && (
              <SkyModeToggle mode={skyMode} onChange={setSkyMode} />
            )}
            {viewMode === "panoramic" && position ? (
              <div className="relative">
                <SkyView
                  view={skyViewDir}
                  viewUp={viewUp}
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
      <CategoryListSheet
        open={openCategory !== null}
        category={openCategory}
        label={
          openCategory === "planets"
            ? "Solar System"
            : openCategory === "stars"
            ? "Bright stars"
            : openCategory === "deep-sky"
            ? "Deep-sky objects"
            : openCategory === "satellites"
            ? "Satellites"
            : ""
        }
        objects={categoryObjects}
        visible={openCategory ? filters[openCategory] : true}
        onToggleVisible={() => openCategory && toggle(openCategory)}
        onPick={(o) => {
          setOpenCategory(null);
          setDetail(o);
        }}
        onClose={() => setOpenCategory(null)}
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
