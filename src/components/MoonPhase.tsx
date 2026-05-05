"use client";

import * as Astronomy from "astronomy-engine";

/**
 * Compute the Moon's illumination fraction (0 = new, 1 = full) and
 * "phase angle" — the angular separation between the Sun and Moon as seen
 * from Earth. Phase angle determines waxing/waning.
 */
export function moonPhase(date: Date): {
  illumination: number;     // 0..1
  phaseAngle: number;       // 0 (new) → 180 (full) → 360 (next new)
  isWaxing: boolean;
  phaseName: string;
} {
  // astronomy-engine handles all of this for us.
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const phase = Astronomy.MoonPhase(date); // 0..360
  const isWaxing = phase < 180;

  let phaseName = "New Moon";
  if (phase < 22.5) phaseName = "New Moon";
  else if (phase < 67.5) phaseName = "Waxing Crescent";
  else if (phase < 112.5) phaseName = "First Quarter";
  else if (phase < 157.5) phaseName = "Waxing Gibbous";
  else if (phase < 202.5) phaseName = "Full Moon";
  else if (phase < 247.5) phaseName = "Waning Gibbous";
  else if (phase < 292.5) phaseName = "Last Quarter";
  else if (phase < 337.5) phaseName = "Waning Crescent";
  else phaseName = "New Moon";

  return {
    illumination: illum.phase_fraction,
    phaseAngle: phase,
    isWaxing,
    phaseName,
  };
}

type MoonProps = {
  /** Phase angle 0–360 (0 = new, 180 = full) */
  phaseAngle: number;
  size?: number;
};

/**
 * SVG rendering of the Moon at a given phase. The lit portion is rendered
 * as a circle with a "shadow" cap that's elliptical when waxing/waning and
 * fully covers/uncovers at new/full.
 *
 * Math:
 *   Phase 0   → fully shadowed (new moon)
 *   Phase 90  → right half lit (first quarter, Northern Hemisphere POV)
 *   Phase 180 → fully lit (full moon)
 *   Phase 270 → left half lit (last quarter)
 */
export function MoonPhaseIcon({ phaseAngle, size = 48 }: MoonProps) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  // Convert phase angle to cosine — this gives us the terminator's
  // x-axis stretch. cos(0) = 1 (new), cos(90) = 0 (quarter), cos(180) = -1 (full)
  const phaseRad = (phaseAngle * Math.PI) / 180;
  const cosPhase = Math.cos(phaseRad);

  const isWaxing = phaseAngle < 180;
  // The half-disk on the "near" side is always lit. The other half is
  // either lit (gibbous) or shadowed (crescent), and the terminator is
  // the dividing line.
  // For waxing, the right half is the "lit" full half.
  // For waning, the left half is the "lit" full half.

  // The terminator is half an ellipse, with horizontal radius = |cos(phase)| * r
  const ellipseRX = Math.abs(cosPhase) * r;

  // Start with full shadow, then build up the lit part:
  // 1. Always-lit half (right for waxing, left for waning)
  // 2. Terminator ellipse that adds (gibbous) or subtracts (crescent)

  // Build the lit region as an SVG path.
  // Use even-odd fill rule: outer half-circle + inner ellipse, with appropriate
  // direction depending on whether the phase is gibbous or crescent.

  // Simpler approach: render full disk lit, then overlay the shadow as a path.
  // Shadow is always on the "back" side from the Sun.

  // For waxing crescent (phase 0–90): shadow is left half + ellipse on right
  // For first quarter (phase = 90): shadow is exactly left half
  // For waxing gibbous (phase 90–180): shadow is left half MINUS ellipse on left
  // For waning ... mirror.

  // I'll build the shadow path using two arcs:
  //   - The outer half-circle on the dark side (always)
  //   - An elliptical arc that bulges into or out of the lit side

  const isGibbous = phaseAngle > 90 && phaseAngle < 270;

  // Sweep direction for the elliptical terminator
  // For gibbous, the ellipse bulges OUT (away from the dark side)
  // For crescent, the ellipse bulges IN (toward the dark side)
  let shadowPath: string;

  if (phaseAngle < 1 || phaseAngle > 359) {
    // New moon — full shadow
    shadowPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy} Z`;
  } else if (Math.abs(phaseAngle - 180) < 1) {
    // Full moon — no shadow
    shadowPath = "";
  } else {
    // Outer half-circle on the shadow side
    // Waxing → shadow on left, dark-side x = cx - r, lit-side x = cx + r
    // Waning → shadow on right
    const shadowSide = isWaxing ? -1 : 1; // -1 = left, +1 = right
    const outerStartX = cx + shadowSide * r;
    const outerEndX = cx + shadowSide * r;
    const arcX1 = cx;
    const arcY1 = cy - r;
    const arcY2 = cy + r;

    // Outer half-circle from top → outermost shadow point → bottom
    const halfCircle = `M ${arcX1} ${arcY1} A ${r} ${r} 0 0 ${shadowSide < 0 ? 0 : 1} ${arcX1} ${arcY2}`;

    // Terminator ellipse from bottom back to top
    // For gibbous: ellipse bulges outward (large arc, opposite sweep)
    // For crescent: ellipse bulges inward
    const termSweep = isGibbous ? (isWaxing ? 1 : 0) : (isWaxing ? 0 : 1);
    const ellipseArc = `A ${ellipseRX} ${r} 0 0 ${termSweep} ${arcX1} ${arcY1}`;

    shadowPath = `${halfCircle} ${ellipseArc} Z`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="moonSurface" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f5f0e6" />
          <stop offset="60%" stopColor="#dde0e8" />
          <stop offset="100%" stopColor="#a8acba" />
        </radialGradient>
      </defs>
      {/* Moon disk */}
      <circle cx={cx} cy={cy} r={r - 0.5} fill="url(#moonSurface)" />
      {/* Subtle craters via small dim circles */}
      <circle cx={cx - r * 0.3} cy={cy - r * 0.2} r={r * 0.08} fill="rgba(0,0,0,0.08)" />
      <circle cx={cx + r * 0.2} cy={cy + r * 0.3} r={r * 0.06} fill="rgba(0,0,0,0.08)" />
      <circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.04} fill="rgba(0,0,0,0.06)" />
      {/* Shadow overlay */}
      {shadowPath && <path d={shadowPath} fill="rgba(8, 12, 24, 0.92)" />}
      {/* Subtle limb darkening */}
      <circle
        cx={cx}
        cy={cy}
        r={r - 0.5}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
      />
    </svg>
  );
}
