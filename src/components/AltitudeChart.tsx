"use client";

import { useMemo } from "react";

type Sample = { time: Date; alt: number };

type Props = {
  samples: Sample[];
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  currentTime: Date;
  /** Altitude of Sun at each sample time, for shading day/night regions */
  sunAltSamples?: Sample[];
};

/**
 * 24-hour altitude curve. Time on X axis, altitude on Y axis. Shows when
 * the object is above the horizon (the area under the curve where alt > 0)
 * and where rise/transit/set happen.
 */
export function AltitudeChart({
  samples,
  rise,
  transit,
  set,
  currentTime,
  sunAltSamples,
}: Props) {
  const W = 320;
  const H = 180;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const dayStart = useMemo(() => {
    if (samples.length === 0) return new Date();
    const d = new Date(samples[0].time);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [samples]);

  function xForTime(t: Date): number {
    const ms = t.getTime() - dayStart.getTime();
    const frac = ms / (24 * 3600 * 1000);
    return PAD_L + frac * innerW;
  }

  function yForAlt(alt: number): number {
    // alt range: -90 to +90 → map to innerH..0
    const frac = (alt + 90) / 180;
    return PAD_T + (1 - frac) * innerH;
  }

  // Build paths
  const curvePoints = samples.map((s) => `${xForTime(s.time)},${yForAlt(s.alt)}`).join(" ");

  // "Above horizon" filled region (clipped to alt > 0)
  const horizonY = yForAlt(0);
  const fillPoints: string[] = [];
  let inAir = false;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.alt > 0 && !inAir) {
      // Find horizon crossing between i-1 and i
      if (i > 0) {
        const prev = samples[i - 1];
        const frac = -prev.alt / (s.alt - prev.alt);
        const t = new Date(
          prev.time.getTime() + frac * (s.time.getTime() - prev.time.getTime())
        );
        fillPoints.push(`${xForTime(t)},${horizonY}`);
      } else {
        fillPoints.push(`${xForTime(s.time)},${horizonY}`);
      }
      inAir = true;
    }
    if (s.alt > 0 && inAir) {
      fillPoints.push(`${xForTime(s.time)},${yForAlt(s.alt)}`);
    }
    if (s.alt <= 0 && inAir) {
      const prev = samples[i - 1];
      const frac = prev.alt / (prev.alt - s.alt);
      const t = new Date(
        prev.time.getTime() + frac * (s.time.getTime() - prev.time.getTime())
      );
      fillPoints.push(`${xForTime(t)},${horizonY}`);
      inAir = false;
    }
  }
  if (inAir) {
    const last = samples[samples.length - 1];
    fillPoints.push(`${xForTime(last.time)},${horizonY}`);
  }

  // Day/night shading from sun altitude
  const nightRegions: Array<{ x1: number; x2: number }> = [];
  if (sunAltSamples) {
    let nightStart: Date | null = null;
    for (let i = 0; i < sunAltSamples.length; i++) {
      const s = sunAltSamples[i];
      const isNight = s.alt < -6; // civil dusk
      if (isNight && nightStart == null) nightStart = s.time;
      if (!isNight && nightStart != null) {
        nightRegions.push({
          x1: xForTime(nightStart),
          x2: xForTime(s.time),
        });
        nightStart = null;
      }
    }
    if (nightStart) {
      nightRegions.push({
        x1: xForTime(nightStart),
        x2: xForTime(sunAltSamples[sunAltSamples.length - 1].time),
      });
    }
  }

  const currentX = xForTime(currentTime);

  // Hour ticks every 6 hours
  const hourTicks = [0, 6, 12, 18, 24].map((h) => ({
    x: PAD_L + (h / 24) * innerW,
    label:
      h === 0 || h === 24 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`,
  }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Night shading */}
        {nightRegions.map((r, i) => (
          <rect
            key={i}
            x={r.x1}
            y={PAD_T}
            width={r.x2 - r.x1}
            height={innerH}
            fill="rgba(20, 30, 60, 0.4)"
          />
        ))}

        {/* Horizon line */}
        <line
          x1={PAD_L}
          y1={horizonY}
          x2={W - PAD_R}
          y2={horizonY}
          stroke="rgba(232,196,116,0.3)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />

        {/* "Above horizon" fill */}
        {fillPoints.length > 1 && (
          <polygon
            points={fillPoints.join(" ")}
            fill="rgba(232,196,116,0.12)"
            stroke="none"
          />
        )}

        {/* Curve */}
        <polyline
          points={curvePoints}
          fill="none"
          stroke="rgba(232,196,116,0.85)"
          strokeWidth="1.4"
        />

        {/* Rise / Transit / Set markers */}
        {rise && (
          <Marker
            x={xForTime(rise)}
            y={horizonY}
            label="Rise"
            time={rise}
            color="rgba(232,196,116,0.7)"
          />
        )}
        {transit && (
          <Marker
            x={xForTime(transit)}
            y={yForAlt(getAltAt(samples, transit))}
            label="Transit"
            time={transit}
            color="rgba(232,196,116,0.95)"
          />
        )}
        {set && (
          <Marker
            x={xForTime(set)}
            y={horizonY}
            label="Set"
            time={set}
            color="rgba(232,196,116,0.7)"
          />
        )}

        {/* Now indicator */}
        <line
          x1={currentX}
          y1={PAD_T}
          x2={currentX}
          y2={H - PAD_B}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.8"
        />
        <circle cx={currentX} cy={yForAlt(getAltAt(samples, currentTime))} r={3} fill="white" />

        {/* Y axis labels */}
        <text
          x={PAD_L - 4}
          y={yForAlt(90) + 4}
          textAnchor="end"
          fontSize="9"
          fill="rgba(255,255,255,0.4)"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          90°
        </text>
        <text
          x={PAD_L - 4}
          y={horizonY + 3}
          textAnchor="end"
          fontSize="9"
          fill="rgba(255,255,255,0.4)"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          0°
        </text>

        {/* X axis labels */}
        {hourTicks.map((t) => (
          <text
            key={t.label}
            x={t.x}
            y={H - 6}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.4)"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Marker({
  x,
  y,
  label,
  time,
  color,
}: {
  x: number;
  y: number;
  label: string;
  time: Date;
  color: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={2.5} fill={color} />
      <text
        x={x}
        y={y - 6}
        textAnchor="middle"
        fontSize="8"
        fill="rgba(255,255,255,0.7)"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {formatTime(time)}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fontSize="7.5"
        fill="rgba(232,196,116,0.7)"
        letterSpacing="1"
        style={{
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </text>
    </g>
  );
}

function getAltAt(samples: Sample[], t: Date): number {
  // Linear interpolate
  const tt = t.getTime();
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].time.getTime() >= tt) {
      const a = samples[i - 1];
      const b = samples[i];
      const frac =
        (tt - a.time.getTime()) / (b.time.getTime() - a.time.getTime());
      return a.alt + frac * (b.alt - a.alt);
    }
  }
  return samples[samples.length - 1]?.alt ?? 0;
}

function formatTime(t: Date): string {
  return t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
