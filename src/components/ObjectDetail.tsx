"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Compass,
  Bookmark,
  Share2,
  Eye,
  Binoculars,
  Telescope,
} from "lucide-react";
import type { SkyObject } from "@/lib/astronomy/matching";
import type { Satellite } from "@/lib/astronomy/satellites";
import { getObjectFacts } from "@/lib/data/object-facts";
import {
  computeRiseSetStatic,
  computeRiseSetSolarBody,
  sampleAltitudeCurve,
  sampleAltitudeCurveSolarBody,
} from "@/lib/astronomy/rise-set";
import { predictPasses, azToCardinal } from "@/lib/astronomy/passes";
import { AltitudeChart } from "./AltitudeChart";
import { MoonPhaseIcon, moonPhase } from "./MoonPhase";

type Props = {
  object: SkyObject | null;
  observerLat: number | null;
  observerLon: number | null;
  now: Date;
  satellites?: Satellite[];
  onClose: () => void;
  onTrack?: (obj: SkyObject) => void;
};

type Tab = "info" | "figures" | "events";

export function ObjectDetail({
  object,
  observerLat,
  observerLon,
  now,
  satellites,
  onClose,
  onTrack,
}: Props) {
  const [tab, setTab] = useState<Tab>("info");

  return (
    <AnimatePresence>
      {object && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-gradient-to-b from-[#0a1226] via-[#070a14] to-[#03050b]"
          >
            <DetailContent
              object={object}
              tab={tab}
              setTab={setTab}
              observerLat={observerLat}
              observerLon={observerLon}
              now={now}
              satellites={satellites}
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
  observerLat,
  observerLon,
  now,
  satellites,
  onClose,
  onTrack,
}: {
  object: SkyObject;
  tab: Tab;
  setTab: (t: Tab) => void;
  observerLat: number | null;
  observerLon: number | null;
  now: Date;
  satellites?: Satellite[];
  onClose: () => void;
  onTrack?: (obj: SkyObject) => void;
}) {
  const facts = getObjectFacts(object.name, object.kind);

  return (
    <div className="relative pb-8">
      {/* Drag handle */}
      <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-[#0a1226] to-transparent pt-3 pb-2">
        <div className="h-1 w-10 rounded-full bg-white/20" />
      </div>

      {/* Header — compact, info-dense, no hero image */}
      <header className="px-6 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[36px] leading-[1.0] tracking-tight">
              {object.name}
            </h2>
            <p className="mt-1.5 text-[15px] text-white/55">
              {kindLabel(object.kind)}
              {object.constellation && (
                <>
                  <span className="mx-1.5 text-white/30">·</span>
                  {object.constellation}
                </>
              )}
              {object.mag < 99 && (
                <>
                  <span className="mx-1.5 text-white/30">·</span>
                  mag {object.mag.toFixed(1)}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <VisibilityIndicator mag={object.mag} />
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action row — Track button is the primary CTA, kept inline */}
        {onTrack && (
          <button
            onClick={() => {
              onTrack(object);
              onClose();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm font-medium text-gold-400"
          >
            <Compass className="h-4 w-4" />
            Guide me to {shortName(object.name)}
          </button>
        )}

        {/* Tab bar */}
        <nav className="mt-5 flex border-b border-white/10 text-[12px] uppercase tracking-[0.18em] font-mono">
          <TabButton active={tab === "info"} onClick={() => setTab("info")}>
            Info
          </TabButton>
          <TabButton active={tab === "figures"} onClick={() => setTab("figures")}>
            Figures
          </TabButton>
          <TabButton active={tab === "events"} onClick={() => setTab("events")}>
            Events
          </TabButton>
        </nav>
      </header>

      {/* Tab content */}
      <div className="px-6 mt-5">
        {tab === "info" && <InfoPane object={object} now={now} />}
        {tab === "figures" && (
          <FiguresPane
            object={object}
            observerLat={observerLat}
            observerLon={observerLon}
            now={now}
          />
        )}
        {tab === "events" && (
          <EventsPane
            object={object}
            observerLat={observerLat}
            observerLon={observerLon}
            now={now}
            satellites={satellites}
          />
        )}
      </div>
    </div>
  );
}

// ============ Info pane (prose) ============

function InfoPane({ object, now }: { object: SkyObject; now: Date }) {
  const facts = getObjectFacts(object.name, object.kind);
  const isMoon = object.kind === "moon";
  const moonInfo = isMoon ? moonPhase(now) : null;

  if (!facts) {
    // Lightweight fallback that doesn't shame the absence of content
    return (
      <div className="space-y-4">
        <p className="text-[15px] leading-relaxed text-white/75">
          {object.description ?? `A ${kindLabel(object.kind).toLowerCase()} currently above your horizon.`}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {object.constellation && (
            <DataCell label="Constellation" value={object.constellation} />
          )}
          {object.distLy != null && (
            <DataCell label="Distance" value={`${formatLy(object.distLy)} light-years`} />
          )}
          {object.distAu != null && object.kind !== "moon" && (
            <DataCell label="Distance" value={`${object.distAu.toFixed(2)} AU`} />
          )}
        </div>
      </div>
    );
  }

  return (
    <article className="space-y-5">
      {/* Moon phase block — Moon-only */}
      {isMoon && moonInfo && (
        <section className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <MoonPhaseIcon phaseAngle={moonInfo.phaseAngle} size={68} />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-mono">
              Tonight
            </p>
            <p className="mt-0.5 text-[18px] font-display tracking-tight text-white">
              {moonInfo.phaseName}
            </p>
            <p className="mt-1 text-[12px] font-mono text-white/55">
              {Math.round(moonInfo.illumination * 100)}% illuminated · {moonInfo.isWaxing ? "waxing" : "waning"}
            </p>
          </div>
        </section>
      )}

      {/* Tagline as italic intro */}
      <p className="text-[15px] italic text-white/55 leading-relaxed">
        {facts.tagline}
      </p>

      {/* Overview prose */}
      <p className="text-[15px] leading-relaxed text-white/85">
        {facts.overview}
      </p>

      {/* Significance — substantive, not a "fun fact" */}
      {(facts.significance ?? facts.funFact) && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono mb-2">
            Significance
          </h3>
          <p className="text-[15px] leading-relaxed text-white/80">
            {facts.significance ?? facts.funFact}
          </p>
        </section>
      )}

      {/* Viewing notes */}
      {facts.viewing && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono mb-2">
            How to find it
          </h3>
          <p className="text-[15px] leading-relaxed text-white/80">
            {facts.viewing}
          </p>
        </section>
      )}
    </article>
  );
}

// ============ Figures pane (chart + raw coordinates) ============

function FiguresPane({
  object,
  observerLat,
  observerLon,
  now,
}: {
  object: SkyObject;
  observerLat: number | null;
  observerLon: number | null;
  now: Date;
}) {
  const samples = useMemo(() => {
    if (observerLat == null || observerLon == null) return [];
    const isSolarBody =
      object.kind === "sun" || object.kind === "moon" || object.kind === "planet";
    if (isSolarBody) {
      return (
        sampleAltitudeCurveSolarBody(object.name, observerLat, observerLon, now) ?? []
      );
    }
    if (object.kind === "satellite") return []; // satellites move too fast for static curve
    return sampleAltitudeCurve(
      { ra: object.ra, dec: object.dec },
      observerLat,
      observerLon,
      now
    );
  }, [object, observerLat, observerLon, now]);

  const events = useMemo(() => {
    if (observerLat == null || observerLon == null) return null;
    const isSolarBody =
      object.kind === "sun" || object.kind === "moon" || object.kind === "planet";
    if (isSolarBody) {
      return computeRiseSetSolarBody(object.name, observerLat, observerLon, now);
    }
    if (object.kind === "satellite") return null;
    return computeRiseSetStatic(
      { ra: object.ra, dec: object.dec },
      observerLat,
      observerLon,
      now
    );
  }, [object, observerLat, observerLon, now]);

  return (
    <div className="space-y-5">
      {/* Altitude curve */}
      {samples.length > 0 && events && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono mb-2">
            Altitude · today
          </h3>
          <AltitudeChart
            samples={samples}
            rise={events.rise}
            transit={events.transit}
            set={events.set}
            currentTime={now}
          />
        </section>
      )}

      {object.kind === "satellite" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[13px] text-white/60 leading-relaxed">
            Satellites complete a full orbit in 90–95 minutes, so 24-hour altitude curves are not meaningful. See <span className="text-gold-400">Events</span> for upcoming visible passes.
          </p>
        </section>
      )}

      {/* Raw coordinates */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono mb-2">
          Position now
        </h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {object.kind !== "satellite" && (
            <>
              <DataCell label="RA" value={formatRA(object.ra)} mono />
              <DataCell label="Dec" value={formatDec(object.dec)} mono />
            </>
          )}
          <DataCell label="Altitude" value={`${object.alt.toFixed(1)}°`} mono />
          <DataCell label="Azimuth" value={`${object.az.toFixed(1)}°`} mono />
          {object.mag < 99 && (
            <DataCell label="Magnitude" value={object.mag.toFixed(2)} mono />
          )}
          {object.distLy != null && (
            <DataCell label="Distance" value={`${formatLy(object.distLy)} ly`} mono />
          )}
          {object.distAu != null && object.kind !== "moon" && (
            <DataCell label="Distance" value={`${object.distAu.toFixed(3)} AU`} mono />
          )}
          {object.satellite && (
            <>
              <DataCell label="Altitude (km)" value={`${Math.round(object.satellite.altKm)}`} mono />
              <DataCell label="Speed" value={`${(object.satellite.velocityKmS * 3600).toFixed(0)} km/h`} mono />
              <DataCell
                label="Ground track"
                value={`${object.satellite.lat.toFixed(1)}, ${object.satellite.lon.toFixed(1)}`}
                mono
              />
              <DataCell
                label="Range"
                value={`${Math.round(object.satellite.rangeKm).toLocaleString()} km`}
                mono
              />
            </>
          )}
        </dl>
      </section>
    </div>
  );
}

// ============ Events pane ============

function EventsPane({
  object,
  observerLat,
  observerLon,
  now,
  satellites,
}: {
  object: SkyObject;
  observerLat: number | null;
  observerLon: number | null;
  now: Date;
  satellites?: Satellite[];
}) {
  // ── Satellite passes ──────────────────────────────────────────────────
  const passes = useMemo(() => {
    if (object.kind !== "satellite") return null;
    if (observerLat == null || observerLon == null) return null;
    const sat = satellites?.find((s) => s.name === object.name);
    if (!sat) return null;
    return predictPasses(
      sat,
      { lat: observerLat, lon: observerLon },
      now,
      5,   // 5 days ahead
      8    // up to 8 passes
    );
  }, [object, observerLat, observerLon, now, satellites]);

  // ── Static + solar-body rise/transit/set ──────────────────────────────
  const eventsByDay = useMemo(() => {
    if (object.kind === "satellite") return [];
    if (observerLat == null || observerLon == null) return [];
    const out: Array<{
      label: string;
      rise: Date | null;
      transit: Date | null;
      set: Date | null;
      alwaysUp: boolean;
      alwaysDown: boolean;
      maxAlt: number;
    }> = [];

    const days = ["Today", "Tomorrow", "In 2 days"];
    for (let i = 0; i < days.length; i++) {
      const target = new Date(now);
      target.setDate(target.getDate() + i);
      const isSolarBody =
        object.kind === "sun" || object.kind === "moon" || object.kind === "planet";
      const events = isSolarBody
        ? computeRiseSetSolarBody(object.name, observerLat, observerLon, target)
        : computeRiseSetStatic(
            { ra: object.ra, dec: object.dec },
            observerLat,
            observerLon,
            target
          );
      if (!events) continue;
      out.push({
        label: days[i],
        rise: events.rise,
        transit: events.transit,
        set: events.set,
        alwaysUp: events.alwaysUp,
        alwaysDown: events.alwaysDown,
        maxAlt: events.maxAlt,
      });
    }
    return out;
  }, [object, observerLat, observerLon, now]);

  // ── Satellite branch ──────────────────────────────────────────────────
  if (object.kind === "satellite") {
    if (!passes) {
      return (
        <p className="text-[14px] text-white/50">
          Location unavailable — passes cannot be computed.
        </p>
      );
    }
    if (passes.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="text-[13px] text-white/60 leading-relaxed">
            No visible passes in the next 5 days.
          </p>
          <p className="mt-2 text-[11px] text-white/40 leading-relaxed">
            A pass is "visible" when the satellite is sunlit, your sky is dark, and it climbs above 10° altitude.
          </p>
        </div>
      );
    }
    return (
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono mb-2">
          Visible passes
        </h3>
        <p className="text-[12px] text-white/45 leading-relaxed mb-3">
          Times the satellite will be sunlit, above 10° altitude, and the sky is dark enough to see it.
        </p>
        <div className="space-y-2">
          {passes.map((p, i) => (
            <PassRow key={i} pass={p} now={now} />
          ))}
        </div>
      </section>
    );
  }

  // ── Static + solar-body branch ────────────────────────────────────────
  if (eventsByDay.length === 0) {
    return (
      <p className="text-[14px] text-white/50">
        Location unavailable — events cannot be computed.
      </p>
    );
  }

  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-mono mb-3">
        Rise · Transit · Set
      </h3>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-[10px] uppercase tracking-[0.15em] text-white/40 font-mono">
              <th className="py-2 px-3 text-left font-normal">Day</th>
              <th className="py-2 px-2 text-right font-normal">Rise</th>
              <th className="py-2 px-2 text-right font-normal">Transit</th>
              <th className="py-2 px-2 text-right font-normal">Set</th>
              <th className="py-2 px-3 text-right font-normal">Peak</th>
            </tr>
          </thead>
          <tbody>
            {eventsByDay.map((e, i) => (
              <tr
                key={i}
                className={`${
                  i > 0 ? "border-t border-white/5" : ""
                } text-white/80`}
              >
                <td className="py-2.5 px-3 text-[12px]">{e.label}</td>
                {e.alwaysUp ? (
                  <td colSpan={3} className="py-2.5 text-center text-[12px] text-emerald-300/80">
                    Circumpolar — never sets
                  </td>
                ) : e.alwaysDown ? (
                  <td colSpan={3} className="py-2.5 text-center text-[12px] text-white/40">
                    Below horizon all day
                  </td>
                ) : (
                  <>
                    <td className="py-2.5 px-2 text-right text-[12px] font-mono text-white/70">
                      {formatTimeShort(e.rise)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[12px] font-mono text-gold-400">
                      {formatTimeShort(e.transit)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[12px] font-mono text-white/70">
                      {formatTimeShort(e.set)}
                    </td>
                  </>
                )}
                <td className="py-2.5 px-3 text-right text-[12px] font-mono text-white/60">
                  {e.maxAlt.toFixed(0)}°
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PassRow({
  pass,
  now,
}: {
  pass: ReturnType<typeof predictPasses>[number];
  now: Date;
}) {
  const isToday = isSameDay(pass.start, now);
  const dayLabel = isToday
    ? "Today"
    : isSameDay(pass.start, new Date(now.getTime() + 24 * 3600 * 1000))
    ? "Tomorrow"
    : pass.start.toLocaleDateString([], { weekday: "long" });

  // Brightness shading: brighter passes get a stronger gold tone
  const brightness =
    pass.peakMagnitude < -2 ? "bright" : pass.peakMagnitude < 0 ? "good" : "faint";
  const accent =
    brightness === "bright"
      ? "border-gold-400/40 bg-gold-400/8"
      : brightness === "good"
      ? "border-white/15 bg-white/[0.04]"
      : "border-white/10 bg-white/[0.02]";

  return (
    <div className={`rounded-xl border ${accent} p-3.5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">
            {dayLabel} · {pass.start.toLocaleDateString([], { month: "short", day: "numeric" })}
          </p>
          <p className="mt-0.5 text-[16px] font-display tracking-tight text-white">
            {formatTimeShort(pass.start)} → {formatTimeShort(pass.end)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-mono">
            Peak
          </p>
          <p
            className={`mt-0.5 text-[16px] font-mono ${
              brightness === "bright" ? "text-gold-400" : "text-white/85"
            }`}
          >
            mag {pass.peakMagnitude.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-mono text-white/65">
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-[0.18em]">Rises</p>
          <p className="mt-0.5">
            {azToCardinal(pass.startAz)} <span className="text-white/40">10°</span>
          </p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-[0.18em]">Peak</p>
          <p className="mt-0.5">
            {azToCardinal(pass.peakAz)} <span className="text-white/40">{pass.peakAlt.toFixed(0)}°</span>
          </p>
        </div>
        <div>
          <p className="text-white/40 text-[9px] uppercase tracking-[0.18em]">Sets</p>
          <p className="mt-0.5">
            {azToCardinal(pass.endAz)} <span className="text-white/40">10°</span>
          </p>
        </div>
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/35 font-mono">
        Duration {Math.round(pass.duration / 60)}m {Math.round(pass.duration % 60)}s
      </p>
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ============ Helpers ============

function VisibilityIndicator({ mag }: { mag: number }) {
  // Naked eye: mag <= 6, binoculars: mag <= 10, telescope: mag > 10
  const level = mag <= 6 ? "eye" : mag <= 10 ? "binoculars" : "telescope";
  const Icon =
    level === "eye" ? Eye : level === "binoculars" ? Binoculars : Telescope;
  const label =
    level === "eye"
      ? "Naked eye"
      : level === "binoculars"
      ? "Binoculars"
      : "Telescope";
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/60 font-mono"
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-3 transition ${
        active
          ? "border-b-2 border-gold-400 text-gold-400"
          : "border-b-2 border-transparent text-white/40 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function DataCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono">
        {label}
      </p>
      <p className={`mt-0.5 text-[13px] text-white/85 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "star":
      return "Star";
    case "planet":
      return "Planet";
    case "moon":
      return "Natural Satellite";
    case "sun":
      return "Star · Sun";
    case "deep-sky":
      return "Deep-Sky Object";
    case "constellation":
      return "Constellation";
    case "satellite":
      return "Artificial Satellite";
    default:
      return kind;
  }
}

function shortName(name: string): string {
  if (name.length <= 14) return name;
  if (name.includes("—")) return name.split("—")[0].trim();
  if (name.includes("(")) return name.split(" ")[0];
  return name.slice(0, 13) + "…";
}

function formatLy(ly: number): string {
  if (ly < 100) return ly.toFixed(1);
  if (ly < 1000) return Math.round(ly).toString();
  return Math.round(ly).toLocaleString();
}

function formatRA(ra: number): string {
  // ra is in hours
  const h = Math.floor(ra);
  const m = Math.floor((ra - h) * 60);
  const s = ((ra - h) * 60 - m) * 60;
  return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toFixed(1)}s`;
}

function formatDec(dec: number): string {
  const sign = dec >= 0 ? "+" : "-";
  const abs = Math.abs(dec);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${d}° ${m.toString().padStart(2, "0")}' ${s.toFixed(1)}"`;
}

function formatTimeShort(t: Date | null): string {
  if (!t) return "—";
  return t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
