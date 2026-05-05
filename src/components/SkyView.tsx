"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SkyObject } from "@/lib/astronomy/matching";
import { project, sunAltitude } from "@/lib/astronomy/projection";
import constellationLines from "@/lib/data/constellation-lines.json";

type Props = {
  pointing: { alt: number; az: number } | null;
  sky: SkyObject[];
  trackedTarget?: SkyObject | null;
  onObjectTap?: (obj: SkyObject) => void;
  observerLat: number;
  observerLon: number;
  now: Date;
  fovDeg?: number;
};

/**
 * Full-screen panoramic sky renderer. Uses stereographic projection so
 * star patterns look correct near the center of the screen and the entire
 * visible hemisphere maps to a finite area.
 *
 * Renders, from back to front:
 *   1. Sky-color gradient (driven by sun altitude — twilight, day, night)
 *   2. Horizon line + cardinal direction markers
 *   3. Ecliptic line (the path the Sun and planets follow)
 *   4. Constellation stick-figure lines
 *   5. Star points (sized by magnitude, colored by spectral hint)
 *   6. Solar system bodies (sun, moon, planets) with labels
 *   7. Satellites (diamond markers, sunlit)
 *   8. Constellation name labels
 *   9. Tracked-target highlight
 */
export function SkyView({
  pointing,
  sky,
  trackedTarget,
  onObjectTap,
  observerLat,
  observerLon,
  now,
  fovDeg = 90,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 360, h: 600 });

  // Track container size for responsive rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sun altitude controls the sky color
  const sunAlt = useMemo(
    () => sunAltitude(observerLat, observerLon, now),
    [observerLat, observerLon, now]
  );

  const skyGradient = useMemo(() => skyColors(sunAlt), [sunAlt]);

  // Build a quick lookup so constellation lines can resolve star names → coords
  const starByName = useMemo(() => {
    const m = new Map<string, SkyObject>();
    for (const o of sky) if (o.kind === "star") m.set(o.name, o);
    return m;
  }, [sky]);

  if (!pointing) {
    return (
      <div
        ref={containerRef}
        className="relative h-[60vh] w-full overflow-hidden rounded-3xl border border-white/10 bg-ink-900"
      >
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <p className="text-[11px] uppercase tracking-[0.3em] font-mono">
            calibrating compass…
          </p>
        </div>
      </div>
    );
  }

  // Project all visible objects
  type Projected = {
    obj: SkyObject;
    x: number;
    y: number;
  };
  const projected: Projected[] = [];
  for (const obj of sky) {
    if (obj.alt < -2) continue; // skip well-below-horizon
    const p = project(obj.alt, obj.az, pointing.alt, pointing.az, fovDeg, size.w, size.h);
    if (!p.visible) continue;
    if (
      p.x < -50 ||
      p.x > size.w + 50 ||
      p.y < -50 ||
      p.y > size.h + 50
    )
      continue;
    projected.push({ obj, x: p.x, y: p.y });
  }

  // Project constellation line endpoints
  const lineSegments: Array<{
    a: { x: number; y: number };
    b: { x: number; y: number };
  }> = [];

  for (const c of constellationLines as Array<{
    constellation: string;
    lines: [string, string][];
  }>) {
    for (const [aName, bName] of c.lines) {
      const a = starByName.get(aName);
      const b = starByName.get(bName);
      if (!a || !b) continue;
      if (a.alt < -2 || b.alt < -2) continue;
      const pa = project(a.alt, a.az, pointing.alt, pointing.az, fovDeg, size.w, size.h);
      const pb = project(b.alt, b.az, pointing.alt, pointing.az, fovDeg, size.w, size.h);
      if (!pa.visible || !pb.visible) continue;
      lineSegments.push({ a: { x: pa.x, y: pa.y }, b: { x: pb.x, y: pb.y } });
    }
  }

  // Horizon line points — sample around the full azimuth at alt=0
  const horizonPoints: Array<{ x: number; y: number; visible: boolean }> = [];
  for (let az = 0; az < 360; az += 3) {
    const p = project(0, az, pointing.alt, pointing.az, fovDeg, size.w, size.h);
    horizonPoints.push(p);
  }

  // Cardinal direction markers
  const cardinals = [
    { label: "N", az: 0 },
    { label: "E", az: 90 },
    { label: "S", az: 180 },
    { label: "W", az: 270 },
  ].map((c) => ({
    label: c.label,
    p: project(0, c.az, pointing.alt, pointing.az, fovDeg, size.w, size.h),
  }));

  return (
    <div
      ref={containerRef}
      className="relative h-[60vh] w-full overflow-hidden rounded-3xl border border-white/10"
      style={{
        background: `linear-gradient(180deg, ${skyGradient.top} 0%, ${skyGradient.middle} 60%, ${skyGradient.bottom} 100%)`,
      }}
    >
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Soft halo for bright stars */}
          <radialGradient id="starGlowWhite" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,180,100,0.6)" />
            <stop offset="100%" stopColor="rgba(255,180,100,0)" />
          </radialGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(220,230,250,0.7)" />
            <stop offset="100%" stopColor="rgba(220,230,250,0)" />
          </radialGradient>
          <radialGradient id="satGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,200,100,0.7)" />
            <stop offset="100%" stopColor="rgba(255,200,100,0)" />
          </radialGradient>
        </defs>

        {/* Background starfield ambient (subtle dots in random positions) */}
        <BackgroundStarfield width={size.w} height={size.h} sunAlt={sunAlt} />

        {/* Constellation lines */}
        <g opacity={sunAlt > -6 ? 0.18 : 0.4} stroke="#7a8db4" strokeWidth="0.8" fill="none">
          {lineSegments.map((seg, i) => (
            <line
              key={i}
              x1={seg.a.x}
              y1={seg.a.y}
              x2={seg.b.x}
              y2={seg.b.y}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Horizon line */}
        <HorizonPath points={horizonPoints} />

        {/* Cardinal labels (slightly above the horizon) */}
        {cardinals.map(
          (c) =>
            c.p.visible &&
            c.p.x > 0 &&
            c.p.x < size.w && (
              <g key={c.label}>
                <text
                  x={c.p.x}
                  y={c.p.y + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(232,196,116,0.75)"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {c.label}
                </text>
              </g>
            )
        )}

        {/* Stars */}
        {projected
          .filter((p) => p.obj.kind === "star")
          .map((p, i) => {
            const r = sizeForStar(p.obj.mag);
            const isTracked = trackedTarget?.name === p.obj.name;
            const showLabel = p.obj.mag < 1.3 || isTracked;
            return (
              <g
                key={`star-${p.obj.name}-${i}`}
                onClick={() => onObjectTap?.(p.obj)}
                style={{ cursor: onObjectTap ? "pointer" : "default" }}
              >
                <circle cx={p.x} cy={p.y} r={Math.max(8, r * 4)} fill="transparent" />
                {r > 1.2 && (
                  <circle cx={p.x} cy={p.y} r={r * 2.5} fill="url(#starGlowWhite)" opacity={0.6} />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={starColor(p.obj.name, p.obj.mag)}
                  stroke={isTracked ? "#e8c474" : "transparent"}
                  strokeWidth={isTracked ? 1 : 0}
                />
                {isTracked && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 8}
                    fill="none"
                    stroke="#e8c474"
                    strokeWidth="1.2"
                    className="pulse-soft"
                  />
                )}
                {showLabel && (
                  <text
                    x={p.x + r + 4}
                    y={p.y + 3}
                    fontSize="10"
                    fill="rgba(255,255,255,0.85)"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {p.obj.name}
                  </text>
                )}
              </g>
            );
          })}

        {/* Sun, Moon, Planets */}
        {projected
          .filter((p) => p.obj.kind === "sun" || p.obj.kind === "moon" || p.obj.kind === "planet")
          .map((p, i) => {
            const isTracked = trackedTarget?.name === p.obj.name;
            const r =
              p.obj.kind === "sun" ? 12 : p.obj.kind === "moon" ? 10 : 5;
            const fill =
              p.obj.kind === "sun" ? "#ffd76a" :
              p.obj.kind === "moon" ? "#dde3ee" :
              "#f59e63";
            const glow =
              p.obj.kind === "sun" ? "url(#planetGlow)" :
              p.obj.kind === "moon" ? "url(#moonGlow)" :
              "url(#planetGlow)";
            return (
              <g
                key={`body-${p.obj.name}-${i}`}
                onClick={() => onObjectTap?.(p.obj)}
                style={{ cursor: onObjectTap ? "pointer" : "default" }}
              >
                <circle cx={p.x} cy={p.y} r={Math.max(20, r * 3)} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={r * 2.5} fill={glow} opacity={0.7} />
                <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                {isTracked && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 10}
                    fill="none"
                    stroke="#e8c474"
                    strokeWidth="1.2"
                    className="pulse-soft"
                  />
                )}
                <text
                  x={p.x + r + 5}
                  y={p.y + 4}
                  fontSize="11"
                  fill="rgba(255,255,255,0.95)"
                  style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
                >
                  {p.obj.name}
                </text>
              </g>
            );
          })}

        {/* Satellites */}
        {projected
          .filter((p) => p.obj.kind === "satellite" && p.obj.satellite?.lit)
          .map((p, i) => {
            const isTracked = trackedTarget?.name === p.obj.name;
            return (
              <g
                key={`sat-${p.obj.name}-${i}`}
                onClick={() => onObjectTap?.(p.obj)}
                style={{ cursor: onObjectTap ? "pointer" : "default" }}
              >
                <circle cx={p.x} cy={p.y} r={20} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={10} fill="url(#satGlow)" opacity={0.8} />
                <g transform={`translate(${p.x},${p.y}) rotate(45)`}>
                  <rect
                    x={-4}
                    y={-4}
                    width={8}
                    height={8}
                    fill="#ffb45a"
                    stroke="#fff2dc"
                    strokeWidth="0.6"
                  />
                </g>
                {isTracked && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={14}
                    fill="none"
                    stroke="#e8c474"
                    strokeWidth="1.2"
                    className="pulse-soft"
                  />
                )}
                <text
                  x={p.x + 8}
                  y={p.y + 4}
                  fontSize="10"
                  fill="#ffd09e"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {satShortName(p.obj.name)}
                </text>
              </g>
            );
          })}

        {/* Constellation labels — placed at the centroid of their visible stars */}
        {constellationLabels(projected, lineSegments, sky).map((lbl, i) => (
          <text
            key={`con-${i}`}
            x={lbl.x}
            y={lbl.y}
            textAnchor="middle"
            fontSize="11"
            fill="rgba(160,180,220,0.65)"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              letterSpacing: "0.15em",
            }}
          >
            {lbl.name.toUpperCase()}
          </text>
        ))}
      </svg>

      {/* Pointing indicator overlay (a small crosshair where the phone aims) */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div className="rounded-full border border-gold-400/30 p-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-gold-400/70" />
        </div>
      </div>

      {/* HUD: alt/az readout */}
      <div className="pointer-events-none absolute top-3 left-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 font-mono backdrop-blur-sm">
        {pointing ? `${cardinal(pointing.az)} ${pointing.az.toFixed(0)}° · alt ${pointing.alt.toFixed(0)}°` : ""}
      </div>

      {/* HUD: time-of-day */}
      <div className="pointer-events-none absolute top-3 right-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 font-mono backdrop-blur-sm">
        {timeOfDayLabel(sunAlt)}
      </div>
    </div>
  );
}

// ============ helpers ============

function sizeForStar(mag: number): number {
  // Brighter (lower mag) → larger dot
  if (mag < 0) return 3.5;
  if (mag < 1) return 2.8;
  if (mag < 2) return 2.2;
  if (mag < 3) return 1.6;
  if (mag < 4) return 1.1;
  return 0.7;
}

function starColor(name: string, mag: number): string {
  // Use spectral type if we know it, else brightness-tinted white
  const SPECTRAL: Record<string, string> = {
    Sirius: "#cfd9ff", Vega: "#ffffff", Rigel: "#bcd3ff", Spica: "#bcd3ff",
    Betelgeuse: "#ff8c5a", Antares: "#ff8c5a", Aldebaran: "#ffc77a",
    Arcturus: "#ffc77a", Capella: "#ffeaa3", Pollux: "#ffc77a",
    Polaris: "#fff8e8", Procyon: "#fff8e8", Altair: "#ffffff",
    Deneb: "#ffffff", Castor: "#ffffff", Regulus: "#bcd3ff",
    Mintaka: "#a8c0ff", Alnitak: "#a8c0ff", Alnilam: "#bcd3ff",
    Saiph: "#bcd3ff", Bellatrix: "#bcd3ff", Mira: "#ff8c5a",
    Mirach: "#ff8c5a", Scheat: "#ff8c5a", Gacrux: "#ff8c5a",
  };
  return SPECTRAL[name] ?? "#ffffff";
}

function cardinal(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((az % 360) / 45) % 8];
}

function satShortName(name: string): string {
  if (name === "ISS (ZARYA)") return "ISS";
  if (name === "TIANGONG") return "Tiangong";
  if (name === "HST") return "Hubble";
  return name;
}

/**
 * Compute a sky color gradient based on the sun's altitude.
 * - Sun > 0°    : daytime (bright blue)
 * - 0° to -6°   : civil twilight (orange/pink)
 * - -6° to -12° : nautical twilight (deep blue)
 * - -12° to -18°: astronomical twilight (very dark blue)
 * - < -18°      : true night (near-black)
 */
function skyColors(sunAlt: number): { top: string; middle: string; bottom: string } {
  if (sunAlt > 5) {
    // Day
    return {
      top: "#5b8ec9",
      middle: "#86b1d6",
      bottom: "#bdd5ea",
    };
  }
  if (sunAlt > 0) {
    // Sunrise/sunset
    return {
      top: "#2c4a78",
      middle: "#a06b6e",
      bottom: "#d49b6c",
    };
  }
  if (sunAlt > -6) {
    // Civil twilight
    return {
      top: "#0f1d3a",
      middle: "#36476f",
      bottom: "#7c5e6a",
    };
  }
  if (sunAlt > -12) {
    // Nautical twilight
    return {
      top: "#070d22",
      middle: "#161e3d",
      bottom: "#283150",
    };
  }
  if (sunAlt > -18) {
    // Astronomical twilight
    return {
      top: "#03050f",
      middle: "#080d1d",
      bottom: "#0e1426",
    };
  }
  // True night
  return {
    top: "#02030a",
    middle: "#040611",
    bottom: "#070a18",
  };
}

function timeOfDayLabel(sunAlt: number): string {
  if (sunAlt > 5) return "day";
  if (sunAlt > 0) return "sunrise/sunset";
  if (sunAlt > -6) return "civil twilight";
  if (sunAlt > -12) return "nautical twilight";
  if (sunAlt > -18) return "astro twilight";
  return "night";
}

// ============ subcomponents ============

function HorizonPath({ points }: { points: Array<{ x: number; y: number; visible: boolean }> }) {
  // Build a connected path of horizon points, breaking when they go off-screen
  let d = "";
  let drawing = false;
  for (const p of points) {
    if (!p.visible) {
      drawing = false;
      continue;
    }
    if (!drawing) {
      d += ` M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      drawing = true;
    } else {
      d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
  }
  return (
    <path
      d={d}
      stroke="rgba(232,196,116,0.45)"
      strokeWidth="1"
      strokeDasharray="3 4"
      fill="none"
    />
  );
}

function BackgroundStarfield({
  width,
  height,
  sunAlt,
}: {
  width: number;
  height: number;
  sunAlt: number;
}) {
  // Faint random sparkles to give the sky some texture even where we
  // don't have catalog stars. Hidden during full daylight.
  const opacity = sunAlt > 0 ? 0 : Math.min(1, (-sunAlt) / 10);
  const stars = useMemo(() => {
    const s: Array<{ x: number; y: number; r: number; o: number }> = [];
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < 80; i++) {
      s.push({
        x: rand() * width,
        y: rand() * height,
        r: 0.3 + rand() * 0.7,
        o: 0.2 + rand() * 0.5,
      });
    }
    return s;
  }, [width, height]);

  if (opacity === 0) return null;
  return (
    <g opacity={opacity}>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
      ))}
    </g>
  );
}

/**
 * Pick a label position for each constellation by averaging the screen
 * positions of its named stars. Skips constellations that don't have
 * enough visible stars to label sensibly.
 */
function constellationLabels(
  projected: Array<{ obj: SkyObject; x: number; y: number }>,
  _segments: Array<unknown>,
  sky: SkyObject[]
): Array<{ name: string; x: number; y: number }> {
  void _segments;
  void sky;
  const groups = new Map<string, Array<{ x: number; y: number }>>();
  for (const p of projected) {
    if (p.obj.kind !== "star") continue;
    const c = p.obj.constellation;
    if (!c) continue;
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c)!.push({ x: p.x, y: p.y });
  }

  const labels: Array<{ name: string; x: number; y: number }> = [];
  for (const [name, points] of groups) {
    if (points.length < 3) continue;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    labels.push({ name, x: cx, y: cy });
  }
  return labels;
}
