"use client";

import { motion } from "framer-motion";
import type { SkyObject } from "@/lib/astronomy/matching";
import { DirectionalGuide } from "./DirectionalGuide";

type Props = {
  pointing: { alt: number; az: number } | null;
  sky: SkyObject[];
  trackedTarget?: SkyObject | null;
  onObjectTap?: (obj: SkyObject) => void;
  fovDeg?: number;
};

/**
 * A circular "telrad-style" view of the sky around the phone's pointing
 * direction. Renders bright objects projected onto a flat disk where the
 * center is exactly where the phone is aimed.
 */
export function SkyCompass({
  pointing,
  sky,
  trackedTarget,
  onObjectTap,
  fovDeg = 45,
}: Props) {
  const size = 320;
  const r = size / 2;

  function project(obj: SkyObject) {
    if (!pointing) return null;
    let dAz = obj.az - pointing.az;
    while (dAz > 180) dAz -= 360;
    while (dAz < -180) dAz += 360;

    const dAlt = obj.alt - pointing.alt;
    if (Math.abs(dAz) > fovDeg || Math.abs(dAlt) > fovDeg) return null;

    const x = r + (dAz / fovDeg) * (r - 16);
    const y = r - (dAlt / fovDeg) * (r - 16);
    return { x, y };
  }

  const visible = pointing
    ? sky
        .filter((o) => o.kind !== "constellation")
        .map((o) => ({ obj: o, p: project(o) }))
        .filter((e): e is { obj: SkyObject; p: { x: number; y: number } } => e.p != null)
    : [];

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1226" />
            <stop offset="100%" stopColor="#03050b" />
          </radialGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(232,196,116,0.18)" />
            <stop offset="100%" stopColor="rgba(232,196,116,0)" />
          </radialGradient>
          <radialGradient id="satGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,180,80,0.6)" />
            <stop offset="100%" stopColor="rgba(255,180,80,0)" />
          </radialGradient>
        </defs>

        <circle cx={r} cy={r} r={r - 1} fill="url(#bg)" stroke="rgba(232,196,116,0.25)" />
        <circle cx={r} cy={r} r={r - 1} fill="url(#glow)" />

        {/* Concentric guides at 15° and 30° */}
        <circle cx={r} cy={r} r={(r - 16) * (15 / fovDeg)} fill="none" stroke="rgba(232,196,116,0.15)" strokeDasharray="2 4" />
        <circle cx={r} cy={r} r={(r - 16) * (30 / fovDeg)} fill="none" stroke="rgba(232,196,116,0.12)" strokeDasharray="2 4" />

        {/* Cardinals — rotate as the phone turns */}
        {[
          { label: "N", angle: 0 },
          { label: "E", angle: 90 },
          { label: "S", angle: 180 },
          { label: "W", angle: 270 },
        ].map((c) => {
          const a = ((c.angle - (pointing?.az ?? 0)) * Math.PI) / 180;
          const x = r + Math.sin(a) * (r - 6);
          const y = r - Math.cos(a) * (r - 6);
          return (
            <text
              key={c.label}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(232,196,116,0.7)"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {c.label}
            </text>
          );
        })}

        {/* Crosshair */}
        <line x1={r - 14} y1={r} x2={r - 4} y2={r} stroke="rgba(232,196,116,0.7)" />
        <line x1={r + 4} y1={r} x2={r + 14} y2={r} stroke="rgba(232,196,116,0.7)" />
        <line x1={r} y1={r - 14} x2={r} y2={r - 4} stroke="rgba(232,196,116,0.7)" />
        <line x1={r} y1={r + 4} x2={r} y2={r + 14} stroke="rgba(232,196,116,0.7)" />
        <circle cx={r} cy={r} r={2} fill="#e8c474" className="pulse-soft" />

        {/* Plotted objects */}
        {visible.map(({ obj, p }, i) => {
          const dot = dotForObject(obj);
          const isSat = obj.kind === "satellite";
          const isTracked = trackedTarget?.name === obj.name;

          return (
            <g
              key={`${obj.name}-${i}`}
              onClick={() => onObjectTap?.(obj)}
              style={{ cursor: onObjectTap ? "pointer" : "default" }}
            >
              {/* Tap target — invisible but larger for fingers */}
              <circle cx={p.x} cy={p.y} r={Math.max(dot.r + 8, 14)} fill="transparent" />

              {/* Glow */}
              <circle
                cx={p.x}
                cy={p.y}
                r={dot.r + (isSat ? 6 : 3)}
                fill={isSat ? "url(#satGlow)" : dot.glow}
                opacity={isSat ? 0.7 : 0.4}
              />

              {/* Tracked highlight ring */}
              {isTracked && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={dot.r + 6}
                  fill="none"
                  stroke="#e8c474"
                  strokeWidth="1.2"
                  className="pulse-soft"
                />
              )}

              {/* Main marker */}
              {isSat ? (
                // Diamond shape for satellites — distinguishes from stars
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
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={dot.r}
                  fill={dot.fill}
                  stroke={dot.stroke}
                  strokeWidth="0.5"
                />
              )}

              {/* Label for prominent objects */}
              {(dot.r > 3 || isSat) && (
                <text
                  x={p.x + (isSat ? 8 : dot.r + 3)}
                  y={p.y + 3}
                  fontSize="9"
                  fill={isSat ? "#ffd09e" : "rgba(255,255,255,0.85)"}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {shortName(obj.name)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Sweep — rotating ambient gradient */}
      {pointing && (
        <motion.div className="absolute inset-0 sweep pointer-events-none" aria-hidden>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            <defs>
              <linearGradient id="sweepGrad" x1="50%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(232,196,116,0.0)" />
                <stop offset="100%" stopColor="rgba(232,196,116,0.18)" />
              </linearGradient>
            </defs>
            <path
              d={`M ${r} ${r} L ${size - 4} ${r} A ${r - 4} ${r - 4} 0 0 0 ${
                r + (r - 4) * Math.cos(-0.6)
              } ${r + (r - 4) * Math.sin(-0.6)} Z`}
              fill="url(#sweepGrad)"
            />
          </svg>
        </motion.div>
      )}

      {/* Directional guide arrow — appears for tracked off-screen objects */}
      <DirectionalGuide pointing={pointing} target={trackedTarget ?? null} fovDeg={fovDeg} />

      {/* FOV label */}
      <div className="absolute bottom-2 right-2 text-[10px] tracking-widest uppercase text-white/40 font-mono">
        {fovDeg * 2}° FOV
      </div>
    </div>
  );
}

function dotForObject(obj: SkyObject) {
  if (obj.kind === "sun") return { r: 7, fill: "#ffd76a", stroke: "#ffe9a8", glow: "#ffd76a" };
  if (obj.kind === "moon") return { r: 6, fill: "#dde3ee", stroke: "#ffffff", glow: "#dde3ee" };
  if (obj.kind === "planet") return { r: 4, fill: "#f59e63", stroke: "#fbd0ad", glow: "#f59e63" };
  if (obj.kind === "deep-sky") return { r: 3, fill: "#9bb7ff", stroke: "#cdd9ff", glow: "#9bb7ff" };
  if (obj.kind === "satellite") return { r: 4, fill: "#ffb45a", stroke: "#fff2dc", glow: "#ffb45a" };
  const mag = obj.mag ?? 3;
  const r = Math.max(1, 4.5 - mag * 0.7);
  return { r, fill: "#ffffff", stroke: "rgba(255,255,255,0.6)", glow: "#ffffff" };
}

function shortName(name: string): string {
  if (name.length <= 10) return name;
  if (name.startsWith("M") && name.includes("—")) return name.split("—")[0].trim();
  if (name.includes("(")) return name.split(" ")[0];
  return name.slice(0, 9) + "…";
}
