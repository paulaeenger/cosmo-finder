"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SkyObject } from "@/lib/astronomy/matching";
import { project } from "@/lib/astronomy/projection";
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
 * Full-screen panoramic sky renderer (v2).
 *
 * Render order, back to front:
 *   1. Sky-color gradient (driven by sun altitude)
 *   2. Milky Way diffuse band (faint cloud, only at night)
 *   3. Background micro-starfield (atmospheric texture, only at night)
 *   4. Altitude rings + ecliptic (subtle reference grid)
 *   5. Constellation lines (taper-glow, only when dark enough to see them)
 *   6. Stars — color from spectral type, size from magnitude, soft glow
 *   7. Solar system bodies (Sun, Moon, planets) with labels
 *   8. Satellites (animated diamond markers)
 *   9. Constellation name labels
 *  10. Horizon (soft fade rather than hard line)
 *  11. Cardinal direction markers
 *  12. Tracked-target highlight ring + on-screen label
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

  // Twinkle phase advances every 2s — slow enough that motion is gentle
  // but fast enough that the sky feels alive.
  const [twinklePhase, setTwinklePhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTwinklePhase((p) => p + 1), 2000);
    return () => clearInterval(id);
  }, []);

  // Track container size for responsive rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sunAlt = useMemo(
    () => sunAltitude(observerLat, observerLon, now),
    [observerLat, observerLon, now]
  );

  const skyGradient = useMemo(() => skyColors(sunAlt), [sunAlt]);
  // Visibility coefficient — fades stars/lines/MW out during the day
  const darkness = useMemo(() => darknessOf(sunAlt), [sunAlt]);

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
  type Projected = { obj: SkyObject; x: number; y: number };
  const projected: Projected[] = [];
  for (const obj of sky) {
    if (obj.alt < -2) continue;
    const p = project(obj.alt, obj.az, pointing.alt, pointing.az, fovDeg, size.w, size.h);
    if (!p.visible) continue;
    if (p.x < -50 || p.x > size.w + 50 || p.y < -50 || p.y > size.h + 50) continue;
    projected.push({ obj, x: p.x, y: p.y });
  }

  // Project constellation line endpoints
  const lineSegments: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }> = [];
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

  // Horizon points (sample every 2°)
  const horizonPoints: Array<{ x: number; y: number; visible: boolean }> = [];
  for (let az = 0; az < 360; az += 2) {
    horizonPoints.push(project(0, az, pointing.alt, pointing.az, fovDeg, size.w, size.h));
  }

  const cardinals = [
    { label: "N", az: 0 },
    { label: "E", az: 90 },
    { label: "S", az: 180 },
    { label: "W", az: 270 },
  ].map((c) => ({
    label: c.label,
    p: project(0, c.az, pointing.alt, pointing.az, fovDeg, size.w, size.h),
  }));

  // Altitude rings (every 30°: 30, 60, zenith)
  const altRings: Array<Array<{ x: number; y: number; visible: boolean }>> = [];
  for (const ringAlt of [30, 60]) {
    const pts: Array<{ x: number; y: number; visible: boolean }> = [];
    for (let az = 0; az < 360; az += 4) {
      pts.push(project(ringAlt, az, pointing.alt, pointing.az, fovDeg, size.w, size.h));
    }
    altRings.push(pts);
  }

  // Ecliptic line (sample at multiple RAs converted to alt/az for current time)
  const ecliptic = computeEclipticPath(observerLat, observerLon, now, pointing, fovDeg, size.w, size.h);

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
          {/* Per-spectral-type star halos */}
          <radialGradient id="haloBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(170,200,255,0.55)" />
            <stop offset="100%" stopColor="rgba(170,200,255,0)" />
          </radialGradient>
          <radialGradient id="haloWhite" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="haloYellow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,230,150,0.6)" />
            <stop offset="100%" stopColor="rgba(255,230,150,0)" />
          </radialGradient>
          <radialGradient id="haloOrange" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,180,110,0.6)" />
            <stop offset="100%" stopColor="rgba(255,180,110,0)" />
          </radialGradient>
          <radialGradient id="haloRed" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,140,90,0.65)" />
            <stop offset="100%" stopColor="rgba(255,140,90,0)" />
          </radialGradient>
          <radialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,180,100,0.7)" />
            <stop offset="100%" stopColor="rgba(255,180,100,0)" />
          </radialGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(220,230,250,0.75)" />
            <stop offset="100%" stopColor="rgba(220,230,250,0)" />
          </radialGradient>
          <radialGradient id="satGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,200,100,0.75)" />
            <stop offset="100%" stopColor="rgba(255,200,100,0)" />
          </radialGradient>

          {/* Milky Way diffuse glow */}
          <radialGradient id="milkyWayCloud" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,250,240,0.18)" />
            <stop offset="60%" stopColor="rgba(220,210,230,0.06)" />
            <stop offset="100%" stopColor="rgba(220,210,230,0)" />
          </radialGradient>

          {/* Soft horizon fade — used as a mask gradient for ground silhouette */}
          <linearGradient id="horizonFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </linearGradient>

          {/* Glow filter for constellation lines */}
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="0.7" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Milky Way — only when sky is dark enough */}
        {darkness > 0.4 && (
          <MilkyWayBand
            observerLat={observerLat}
            observerLon={observerLon}
            now={now}
            pointing={pointing}
            fovDeg={fovDeg}
            screenW={size.w}
            screenH={size.h}
            opacity={darkness}
          />
        )}

        {/* Atmospheric background starfield (faint, fixed positions per session) */}
        {darkness > 0.35 && (
          <BackgroundStarfield width={size.w} height={size.h} opacity={darkness * 0.7} />
        )}

        {/* Altitude reference rings */}
        <g opacity={0.18} stroke="rgba(232,196,116,0.5)" strokeWidth="0.4" strokeDasharray="3 5" fill="none">
          {altRings.map((ring, i) => (
            <ReferenceRing key={i} points={ring} />
          ))}
        </g>

        {/* Ecliptic line */}
        {ecliptic.length > 1 && (
          <polyline
            points={ecliptic.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(232,196,116,0.22)"
            strokeWidth="0.6"
            strokeDasharray="2 4"
          />
        )}

        {/* Constellation lines — only visible at night */}
        <g
          opacity={Math.max(0, (darkness - 0.3) * 1.4)}
          stroke="#9bb1d8"
          strokeWidth="0.7"
          fill="none"
          filter="url(#lineGlow)"
        >
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

        {/* Horizon — soft band rather than hard line */}
        <HorizonBand points={horizonPoints} screenH={size.h} />

        {/* Cardinal direction labels */}
        {cardinals.map(
          (c) =>
            c.p.visible && c.p.x > 0 && c.p.x < size.w && (
              <g key={c.label}>
                <text
                  x={c.p.x}
                  y={c.p.y + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill="rgba(232,196,116,0.85)"
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
            const meta = starMetaFor(p.obj.name, p.obj.mag);
            const isTracked = trackedTarget?.name === p.obj.name;
            const labelable = p.obj.mag < 1.5 || isTracked;
            // Twinkle: phase derived from name + global phase
            const twinkle = twinkleAmount(p.obj.name, twinklePhase, p.obj.mag);
            const radius = meta.r * twinkle.scale;

            return (
              <g
                key={`star-${p.obj.name}-${i}`}
                onClick={() => onObjectTap?.(p.obj)}
                style={{ cursor: onObjectTap ? "pointer" : "default" }}
              >
                {/* Tap target — generous hit area */}
                <circle cx={p.x} cy={p.y} r={Math.max(12, radius * 6)} fill="transparent" />

                {/* Soft halo for naked-eye-bright stars */}
                {meta.r > 1.2 && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={meta.r * 4}
                    fill={`url(#halo${meta.haloKey})`}
                    opacity={twinkle.glow * darkness}
                  />
                )}

                {/* Tracked highlight ring */}
                {isTracked && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={meta.r * 3 + 3}
                    fill="none"
                    stroke="#e8c474"
                    strokeWidth="1"
                    opacity={0.9}
                  />
                )}

                {/* Diffraction spike for very bright stars only */}
                {meta.r >= 2.5 && darkness > 0.5 && (
                  <g opacity={twinkle.glow * 0.5}>
                    <line
                      x1={p.x - meta.r * 4}
                      y1={p.y}
                      x2={p.x + meta.r * 4}
                      y2={p.y}
                      stroke={meta.color}
                      strokeWidth="0.4"
                    />
                    <line
                      x1={p.x}
                      y1={p.y - meta.r * 4}
                      x2={p.x}
                      y2={p.y + meta.r * 4}
                      stroke={meta.color}
                      strokeWidth="0.4"
                    />
                  </g>
                )}

                {/* The star itself */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius}
                  fill={meta.color}
                  opacity={Math.min(1, darkness * 1.2 + 0.05)}
                />

                {/* Bright inner core */}
                {meta.r > 1.5 && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius * 0.4}
                    fill="white"
                    opacity={0.85 * darkness}
                  />
                )}

                {/* Label */}
                {labelable && darkness > 0.3 && (
                  <text
                    x={p.x + meta.r * 2 + 4}
                    y={p.y + 3}
                    fontSize="10"
                    fill="rgba(255,255,255,0.7)"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {p.obj.name}
                  </text>
                )}
              </g>
            );
          })}

        {/* Sun, Moon, planets */}
        {projected
          .filter(
            (p) =>
              p.obj.kind === "sun" ||
              p.obj.kind === "moon" ||
              p.obj.kind === "planet"
          )
          .map((p, i) => {
            const isSun = p.obj.kind === "sun";
            const isMoon = p.obj.kind === "moon";
            const r = isSun ? 9 : isMoon ? 8 : 4.5;
            const fill = isSun ? "#ffd76a" : isMoon ? "#dde3ee" : "#f59e63";
            const glowId = isSun ? "moonGlow" : isMoon ? "moonGlow" : "planetGlow";

            return (
              <g
                key={`body-${p.obj.name}-${i}`}
                onClick={() => onObjectTap?.(p.obj)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={p.x} cy={p.y} r={Math.max(14, r * 3)} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={r * 3.5} fill={`url(#${glowId})`} opacity={0.6} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={fill}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="0.4"
                />
                <text
                  x={p.x + r + 5}
                  y={p.y + 3}
                  fontSize="11"
                  fontWeight="500"
                  fill={isSun ? "#ffd76a" : "rgba(255,255,255,0.9)"}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {p.obj.name}
                </text>
              </g>
            );
          })}

        {/* Satellites */}
        {projected
          .filter((p) => p.obj.kind === "satellite")
          .map((p, i) => {
            const lit = p.obj.satellite?.lit;
            const isTracked = trackedTarget?.name === p.obj.name;
            return (
              <g
                key={`sat-${p.obj.name}-${i}`}
                onClick={() => onObjectTap?.(p.obj)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                {lit && (
                  <circle cx={p.x} cy={p.y} r={9} fill="url(#satGlow)" opacity={0.7} />
                )}
                {isTracked && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11}
                    fill="none"
                    stroke="#e8c474"
                    strokeWidth="1.2"
                  />
                )}
                <g transform={`translate(${p.x},${p.y}) rotate(45)`}>
                  <rect
                    x={-3.5}
                    y={-3.5}
                    width={7}
                    height={7}
                    fill={lit ? "#ffd9a8" : "#7a8db4"}
                    stroke="white"
                    strokeWidth="0.6"
                  />
                </g>
                <text
                  x={p.x + 10}
                  y={p.y + 3}
                  fontSize="10"
                  fontWeight="500"
                  fill={lit ? "#ffd9a8" : "rgba(255,255,255,0.6)"}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {satShortName(p.obj.name)}
                </text>
              </g>
            );
          })}

        {/* Deep-sky tagged with small markers (only when their constellation is up) */}
        {projected
          .filter((p) => p.obj.kind === "deep-sky")
          .map((p, i) => (
            <g
              key={`ds-${p.obj.name}-${i}`}
              onClick={() => onObjectTap?.(p.obj)}
              style={{ cursor: "pointer" }}
              opacity={darkness}
            >
              <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={3.2} fill="none" stroke="rgba(155,180,255,0.7)" strokeWidth="0.7" strokeDasharray="1.5 1.5" />
            </g>
          ))}

        {/* Constellation name labels — placed at constellation centroids */}
        <ConstellationLabels
          starByName={starByName}
          pointing={pointing}
          fovDeg={fovDeg}
          screenW={size.w}
          screenH={size.h}
          darkness={darkness}
        />
      </svg>

      {/* Compass + day/night status pill */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="rounded-full bg-black/35 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-mono text-white/80">
          {cardinal(pointing.az)} {pointing.az.toFixed(0)}°
          <span className="text-white/40 mx-1.5">·</span>
          alt {pointing.alt.toFixed(0)}°
        </div>
        <div className="rounded-full bg-black/35 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-mono text-white/80">
          {phaseLabel(sunAlt)}
        </div>
      </div>
    </div>
  );
}

// ============ Star metadata (color + size + halo) ============

type StarMeta = {
  color: string;
  haloKey: "Blue" | "White" | "Yellow" | "Orange" | "Red";
  r: number; // base radius
};

const SPECTRAL_TYPES: Record<string, "O" | "B" | "A" | "F" | "G" | "K" | "M"> = {
  Sirius: "A", Vega: "A", Rigel: "B", Spica: "B",
  Betelgeuse: "M", Antares: "M", Aldebaran: "K",
  Arcturus: "K", Capella: "G", Pollux: "K", Polaris: "F",
  Procyon: "F", Altair: "A", Deneb: "A", Castor: "A",
  Regulus: "B", Mintaka: "O", Alnitak: "O", Alnilam: "B",
  Saiph: "B", Bellatrix: "B", Mira: "M", Mirach: "M",
  Scheat: "M", Gacrux: "M", Canopus: "F", Achernar: "B",
  Hadar: "B", Acrux: "B", Mimosa: "B", Adhara: "B",
  Shaula: "B", Wezen: "F", Kaus: "B", Mirfak: "F",
  "Rigil Kentaurus": "G", Fomalhaut: "A",
};

const SPECTRAL_COLORS: Record<string, { color: string; haloKey: StarMeta["haloKey"] }> = {
  O: { color: "#a8c0ff", haloKey: "Blue" },
  B: { color: "#bcd3ff", haloKey: "Blue" },
  A: { color: "#ffffff", haloKey: "White" },
  F: { color: "#fff8e8", haloKey: "White" },
  G: { color: "#ffeaa3", haloKey: "Yellow" },
  K: { color: "#ffc77a", haloKey: "Orange" },
  M: { color: "#ff8c5a", haloKey: "Red" },
};

function starMetaFor(name: string, mag: number): StarMeta {
  const spectral = SPECTRAL_TYPES[name] ?? "A";
  const palette = SPECTRAL_COLORS[spectral];
  // Smooth size by magnitude (continuous, not bucketed)
  // Sirius (-1.46) → ~3.6, Polaris (1.98) → ~1.8, mag 4 → ~0.8
  const r = Math.max(0.6, 3.4 - mag * 0.6);
  return { ...palette, r };
}

// Twinkle: deterministic per-star "sparkle" that varies subtly with the
// global phase counter. Brighter stars twinkle more (lower-altitude effect).
function twinkleAmount(name: string, phase: number, mag: number): { scale: number; glow: number } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const seed = (h + phase * 1664525) >>> 0;
  // Small pseudo-random in [-1, 1]
  const wob = ((seed % 1000) / 1000) * 2 - 1;
  const intensity = mag < 1 ? 0.06 : mag < 2.5 ? 0.04 : 0.02;
  return { scale: 1 + wob * intensity, glow: 0.5 + wob * 0.15 + 0.45 };
}

// ============ Sky color & darkness ============

function skyColors(sunAlt: number): { top: string; middle: string; bottom: string } {
  if (sunAlt > 5) {
    return { top: "#5b8ec9", middle: "#86b1d6", bottom: "#bdd5ea" };
  }
  if (sunAlt > 0) {
    return { top: "#3a5a8a", middle: "#7a98ba", bottom: "#d8b89e" };
  }
  if (sunAlt > -6) {
    return { top: "#1f2c50", middle: "#5c5680", bottom: "#c08570" };
  }
  if (sunAlt > -12) {
    return { top: "#0a1228", middle: "#1a2148", bottom: "#322a55" };
  }
  if (sunAlt > -18) {
    return { top: "#040816", middle: "#0a1128", bottom: "#101830" };
  }
  return { top: "#02030a", middle: "#03050d", bottom: "#050810" };
}

/** Returns a 0..1 darkness coefficient. 0 = midday, 1 = astronomical night. */
function darknessOf(sunAlt: number): number {
  if (sunAlt > 0) return 0.05;
  if (sunAlt > -6) return 0.15 + ((-sunAlt) / 6) * 0.25; // civil twilight: 0.15 → 0.40
  if (sunAlt > -12) return 0.40 + ((-sunAlt - 6) / 6) * 0.30; // nautical: 0.40 → 0.70
  if (sunAlt > -18) return 0.70 + ((-sunAlt - 12) / 6) * 0.25; // astronomical: 0.70 → 0.95
  return 1.0;
}

function phaseLabel(sunAlt: number): string {
  if (sunAlt > 5) return "Day";
  if (sunAlt > 0) return "Setting";
  if (sunAlt > -6) return "Twilight";
  if (sunAlt > -12) return "Dusk";
  if (sunAlt > -18) return "Late Twilight";
  return "Night";
}

function sunAltitude(lat: number, lon: number, date: Date): number {
  // Low-precision Sun position; good enough for sky-color shading.
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) % 360) * (Math.PI / 180);
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180);
  const eps = 23.439 * (Math.PI / 180);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));

  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = (gmst + lon) * (Math.PI / 180);
  const ha = lst - ra;

  const latRad = lat * (Math.PI / 180);
  const sinAlt = Math.sin(dec) * Math.sin(latRad) + Math.cos(dec) * Math.cos(latRad) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);
}

// ============ Misc helpers ============

function cardinal(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((az % 360) / 45)) % 8];
}

function satShortName(name: string): string {
  if (name === "ISS (ZARYA)") return "ISS";
  if (name === "TIANGONG") return "Tiangong";
  if (name === "HST") return "Hubble";
  return name;
}

// ============ Sub-components ============

function HorizonBand({
  points,
  screenH,
}: {
  points: Array<{ x: number; y: number; visible: boolean }>;
  screenH: number;
}) {
  // Build a polygon from the horizon path down to the bottom of the screen,
  // filled with a soft fade to suggest "ground."
  const visible = points.filter((p) => p.visible);
  if (visible.length < 2) return null;
  const pathPoints = visible.map((p) => `${p.x},${p.y}`).join(" ");
  const last = visible[visible.length - 1];
  const first = visible[0];
  const closed = `${pathPoints} ${last.x},${screenH + 10} ${first.x},${screenH + 10}`;
  return (
    <g>
      <polygon points={closed} fill="url(#horizonFade)" opacity={0.7} />
      <polyline
        points={pathPoints}
        fill="none"
        stroke="rgba(232,196,116,0.35)"
        strokeWidth="0.6"
      />
    </g>
  );
}

function ReferenceRing({
  points,
}: {
  points: Array<{ x: number; y: number; visible: boolean }>;
}) {
  // Build a polyline from contiguous visible runs.
  const segments: string[] = [];
  let current: Array<{ x: number; y: number }> = [];
  for (const p of points) {
    if (p.visible) {
      current.push({ x: p.x, y: p.y });
    } else if (current.length > 1) {
      segments.push(current.map((q) => `${q.x},${q.y}`).join(" "));
      current = [];
    }
  }
  if (current.length > 1) {
    segments.push(current.map((q) => `${q.x},${q.y}`).join(" "));
  }
  return (
    <>
      {segments.map((s, i) => (
        <polyline key={i} points={s} fill="none" />
      ))}
    </>
  );
}

function MilkyWayBand({
  observerLat,
  observerLon,
  now,
  pointing,
  fovDeg,
  screenW,
  screenH,
  opacity,
}: {
  observerLat: number;
  observerLon: number;
  now: Date;
  pointing: { alt: number; az: number };
  fovDeg: number;
  screenW: number;
  screenH: number;
  opacity: number;
}) {
  // The Milky Way's galactic center is approximately at:
  //   RA  17h 45m, Dec -29° (in Sagittarius)
  // The galactic plane is inclined ~63° to the celestial equator.
  // We render a rough band as a series of fuzzy circles along the plane.
  // This is a visual approximation — not scientifically precise placement,
  // but accurate enough to give the right impression in the right region.

  // Sample points along the galactic plane in equatorial coords, then
  // convert each to alt/az via the same machinery the real catalog uses.
  // For simplicity we approximate the band by sampling RA from 0 to 24h
  // and computing a Dec from the inclination.
  const points: Array<{ x: number; y: number; alpha: number }> = [];

  const galacticPoleRA = 12.86; // hours
  const galacticPoleDec = 27.13; // degrees
  for (let l = 0; l < 360; l += 8) {
    // Galactic longitude → equatorial coords (approximate)
    const lRad = l * (Math.PI / 180);
    const decGalPole = galacticPoleDec * (Math.PI / 180);
    const raGalPole = galacticPoleRA * 15 * (Math.PI / 180);

    // For points on galactic equator (b=0)
    const sinDec = -Math.cos(decGalPole) * Math.cos(lRad - 0); // simplified
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
    const ra = raGalPole + Math.atan2(Math.sin(lRad), Math.cos(lRad) * Math.sin(decGalPole));

    // Equatorial → horizontal
    const altAz = eqToAltAz(
      ra * (12 / Math.PI),
      dec * (180 / Math.PI),
      observerLat,
      observerLon,
      now
    );
    if (altAz.alt < -5) continue;

    const p = project(altAz.alt, altAz.az, pointing.alt, pointing.az, fovDeg, screenW, screenH);
    if (!p.visible) continue;
    if (p.x < -100 || p.x > screenW + 100 || p.y < -100 || p.y > screenH + 100) continue;
    // Brighter near galactic center (Sagittarius region, l ≈ 0)
    const distFromCenter = Math.min(l, 360 - l);
    const alpha = Math.max(0.2, 1 - distFromCenter / 90);
    points.push({ x: p.x, y: p.y, alpha });
  }

  return (
    <g opacity={opacity}>
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={45}
          fill="url(#milkyWayCloud)"
          opacity={p.alpha * 0.7}
        />
      ))}
    </g>
  );
}

function BackgroundStarfield({
  width,
  height,
  opacity,
}: {
  width: number;
  height: number;
  opacity: number;
}) {
  // Deterministic field — stable across re-renders within a session
  const stars = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    let s = 12345;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    for (let i = 0; i < 200; i++) {
      out.push({
        x: rand() * width,
        y: rand() * height,
        r: 0.3 + rand() * 0.6,
        o: 0.2 + rand() * 0.5,
      });
    }
    return out;
  }, [width, height]);

  return (
    <g opacity={opacity}>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
      ))}
    </g>
  );
}

function ConstellationLabels({
  starByName,
  pointing,
  fovDeg,
  screenW,
  screenH,
  darkness,
}: {
  starByName: Map<string, SkyObject>;
  pointing: { alt: number; az: number };
  fovDeg: number;
  screenW: number;
  screenH: number;
  darkness: number;
}) {
  if (darkness < 0.4) return null;
  // Place constellation name near the centroid of its stars
  const labels: Array<{ name: string; x: number; y: number }> = [];
  for (const c of constellationLines as Array<{ constellation: string; lines: [string, string][] }>) {
    const stars = new Set<string>();
    for (const [a, b] of c.lines) {
      stars.add(a);
      stars.add(b);
    }
    const points: Array<{ x: number; y: number }> = [];
    for (const name of stars) {
      const s = starByName.get(name);
      if (!s || s.alt < 0) continue;
      const p = project(s.alt, s.az, pointing.alt, pointing.az, fovDeg, screenW, screenH);
      if (!p.visible) continue;
      points.push({ x: p.x, y: p.y });
    }
    if (points.length < 3) continue;
    const cx = points.reduce((a, p) => a + p.x, 0) / points.length;
    const cy = points.reduce((a, p) => a + p.y, 0) / points.length;
    labels.push({ name: c.constellation, x: cx, y: cy });
  }

  return (
    <g opacity={darkness * 0.5}>
      {labels.map((l) => (
        <text
          key={l.name}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fontSize="10"
          letterSpacing="2"
          fill="rgba(155,177,216,0.55)"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            textTransform: "uppercase",
          }}
        >
          {l.name}
        </text>
      ))}
    </g>
  );
}

// ============ Equatorial → horizontal helper ============

function eqToAltAz(
  raHours: number,
  decDeg: number,
  lat: number,
  lon: number,
  date: Date
): { alt: number; az: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = (gmst + lon) / 15;
  const ha = (lst - raHours) * 15 * (Math.PI / 180);
  const dec = decDeg * (Math.PI / 180);
  const latR = lat * (Math.PI / 180);
  const sinAlt =
    Math.sin(dec) * Math.sin(latR) + Math.cos(dec) * Math.cos(latR) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);
  const cosAz =
    (Math.sin(dec) - Math.sin(alt * (Math.PI / 180)) * Math.sin(latR)) /
    (Math.cos(alt * (Math.PI / 180)) * Math.cos(latR));
  const sinAz = -Math.sin(ha) * Math.cos(dec) / Math.cos(alt * (Math.PI / 180));
  let az = Math.atan2(sinAz, cosAz) * (180 / Math.PI);
  if (az < 0) az += 360;
  return { alt, az };
}

function computeEclipticPath(
  lat: number,
  lon: number,
  now: Date,
  pointing: { alt: number; az: number },
  fovDeg: number,
  screenW: number,
  screenH: number
): Array<{ x: number; y: number }> {
  // The ecliptic is the plane of Earth's orbit. In equatorial coords,
  // it's approximately a great circle inclined 23.44° to the equator.
  const eps = 23.44 * (Math.PI / 180);
  const out: Array<{ x: number; y: number }> = [];
  for (let lambda = 0; lambda < 360; lambda += 5) {
    const L = lambda * (Math.PI / 180);
    const ra = Math.atan2(Math.cos(eps) * Math.sin(L), Math.cos(L)) * (12 / Math.PI);
    const raHrs = (ra + 24) % 24;
    const dec = Math.asin(Math.sin(eps) * Math.sin(L)) * (180 / Math.PI);
    const altAz = eqToAltAz(raHrs, dec, lat, lon, now);
    if (altAz.alt < -5) continue;
    const p = project(altAz.alt, altAz.az, pointing.alt, pointing.az, fovDeg, screenW, screenH);
    if (!p.visible) continue;
    if (p.x < -100 || p.x > screenW + 100 || p.y < -100 || p.y > screenH + 100) continue;
    out.push({ x: p.x, y: p.y });
  }
  return out;
}
