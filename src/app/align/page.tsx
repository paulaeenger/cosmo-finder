"use client";

/**
 * /align — registration diagnostic.
 *
 * The purpose: measure the GAP between where the app thinks the phone is
 * pointing and where a known bright object TRULY is, so the positioning bug
 * can be diagnosed from numbers instead of guesswork.
 *
 * You point the phone at a real object (Moon, a planet, the Sun by day),
 * tap its button, and it records:
 *   - the object's true alt/az (astronomy-engine, from your location + now)
 *   - the app's derived pointing alt/az (same deviceToVector pipeline as live)
 *   - the deltas (view - true)
 *
 * Capture 2-3 objects in different parts of the sky. The pattern of deltas is
 * the fingerprint:
 *   - all deltas ~equal           -> constant heading offset (compass); Calibrate cures
 *   - delta_az flips E vs W        -> azimuth handedness/sign bug
 *   - delta_alt flips up vs down   -> altitude handedness/sign bug
 *   - delta grows with angle        -> scale/projection issue
 *
 * Self-contained: imports only the shared pointing math; renders nothing from
 * the main app and cannot affect it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { deviceToVector, vectorToHorizontal } from "@/lib/astronomy/coords";

type Target = { name: string; body: Astronomy.Body };
const TARGETS: Target[] = [
  { name: "Moon", body: Astronomy.Body.Moon },
  { name: "Sun", body: Astronomy.Body.Sun },
  { name: "Venus", body: Astronomy.Body.Venus },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Mars", body: Astronomy.Body.Mars },
  { name: "Saturn", body: Astronomy.Body.Saturn },
  { name: "Mercury", body: Astronomy.Body.Mercury },
];

type TruePos = { name: string; alt: number; az: number };
type Capture = {
  target: string;
  trueAlt: number;
  trueAz: number;
  viewAlt: number;
  viewAz: number;
  dAlt: number;
  dAz: number;
  alpha: number;
  beta: number;
  gamma: number;
};

// signed az difference in (-180, 180]
function dAzWrap(a: number, b: number): number {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  if (d <= -180) d += 360;
  return d;
}

export default function AlignPage() {
  const [enabled, setEnabled] = useState(false);
  const [permMsg, setPermMsg] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [view, setView] = useState<{ alt: number; az: number } | null>(null);
  const [truths, setTruths] = useState<TruePos[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);

  const abgRef = useRef({ a: 0, b: 0, g: 0 });
  const viewRef = useRef<{ alt: number; az: number } | null>(null);

  // --- location ---
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermMsg("No geolocation available; enter lat/lon manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude);
        setLon(p.coords.longitude);
      },
      () => setPermMsg("Location denied; enter lat/lon manually below."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // --- recompute true positions every 5s and on location change ---
  useEffect(() => {
    if (lat == null || lon == null) return;
    const compute = () => {
      const now = new Date();
      const obs = new Astronomy.Observer(lat, lon, 0);
      const out: TruePos[] = [];
      for (const t of TARGETS) {
        try {
          const eq = Astronomy.Equator(t.body, now, obs, true, true);
          const h = Astronomy.Horizon(now, obs, eq.ra, eq.dec, "normal");
          out.push({ name: t.name, alt: h.altitude, az: h.azimuth });
        } catch {
          /* skip a body that fails */
        }
      }
      setTruths(out);
    };
    compute();
    const id = setInterval(compute, 5000);
    return () => clearInterval(id);
  }, [lat, lon]);

  // --- orientation ---
  const enable = useCallback(async () => {
    try {
      const anyDOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof anyDOE.requestPermission === "function") {
        const res = await anyDOE.requestPermission();
        if (res !== "granted") {
          setPermMsg("Orientation permission denied.");
          return;
        }
      }
      setEnabled(true);
      setPermMsg("");
    } catch {
      setPermMsg("Could not request orientation permission.");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onOri = (e: DeviceOrientationEvent) => {
      const a = e.alpha ?? 0;
      const b = e.beta ?? 0;
      const g = e.gamma ?? 0;
      abgRef.current = { a, b, g };
      const v = deviceToVector(a, b, g);
      if (v) {
        const h = vectorToHorizontal(v);
        viewRef.current = { alt: h.alt, az: h.az };
      }
    };
    window.addEventListener("deviceorientation", onOri, true);
    const id = setInterval(() => setView(viewRef.current), 100);
    return () => {
      window.removeEventListener("deviceorientation", onOri, true);
      clearInterval(id);
    };
  }, [enabled]);

  const capture = useCallback(
    (t: TruePos) => {
      const v = viewRef.current;
      if (!v) return;
      const { a, b, g } = abgRef.current;
      const dAlt = v.alt - t.alt;
      const dAz = dAzWrap(v.az, t.az);
      setCaptures((prev) => [
        {
          target: t.name,
          trueAlt: t.alt,
          trueAz: t.az,
          viewAlt: v.alt,
          viewAz: v.az,
          dAlt,
          dAz,
          alpha: a,
          beta: b,
          gamma: g,
        },
        ...prev,
      ]);
    },
    []
  );

  const csv = useCallback(() => {
    const head =
      "target,trueAlt,trueAz,viewAlt,viewAz,dAlt,dAz,alpha,beta,gamma";
    const rows = captures
      .slice()
      .reverse()
      .map((c) =>
        [
          c.target,
          c.trueAlt.toFixed(2),
          c.trueAz.toFixed(2),
          c.viewAlt.toFixed(2),
          c.viewAz.toFixed(2),
          c.dAlt.toFixed(2),
          c.dAz.toFixed(2),
          c.alpha.toFixed(2),
          c.beta.toFixed(2),
          c.gamma.toFixed(2),
        ].join(",")
      );
    const text = [head, ...rows].join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
    return text;
  }, [captures]);

  // crude live interpretation
  let hint = "";
  if (captures.length >= 2) {
    const azs = captures.map((c) => c.dAz);
    const range = Math.max(...azs) - Math.min(...azs);
    const mean = azs.reduce((s, x) => s + x, 0) / azs.length;
    if (range < 8) {
      hint = `Azimuth error looks CONSTANT (~${mean.toFixed(
        0
      )}deg). That's a heading/north offset — Calibrate should fix it.`;
    } else if (Math.max(...azs) > 5 && Math.min(...azs) < -5) {
      hint =
        "Azimuth error CHANGES SIGN across targets — likely a handedness/sign bug, not just north.";
    } else {
      hint = `Azimuth error varies by ${range.toFixed(
        0
      )}deg across the sky — possible scale/projection issue.`;
    }
  }

  const above = truths.filter((t) => t.alt > -2);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#c8f7c8",
        fontFamily: "ui-monospace, monospace",
        padding: 16,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 16, color: "#9effa0" }}>Alignment check</h1>
      <p style={{ opacity: 0.8 }}>
        Point the phone right at a real object, then tap its button. Do 2-3 in
        different parts of the sky. Then tap “Copy CSV” and send it.
      </p>

      {!enabled && (
        <button
          onClick={enable}
          style={{
            margin: "8px 0",
            padding: "10px 16px",
            background: "#0a2",
            color: "#000",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          Enable sensors
        </button>
      )}
      {permMsg && <p style={{ color: "#ff8" }}>{permMsg}</p>}

      <div style={{ margin: "8px 0", opacity: 0.85 }}>
        Location:{" "}
        {lat != null && lon != null
          ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
          : "—"}
        {(lat == null || lon == null) && (
          <div style={{ marginTop: 4 }}>
            <input
              placeholder="lat"
              inputMode="decimal"
              onChange={(e) => setLat(parseFloat(e.target.value))}
              style={{ width: 90, marginRight: 6 }}
            />
            <input
              placeholder="lon"
              inputMode="decimal"
              onChange={(e) => setLon(parseFloat(e.target.value))}
              style={{ width: 90 }}
            />
          </div>
        )}
      </div>

      <div style={{ margin: "8px 0" }}>
        Pointing now:{" "}
        {view ? `alt ${view.alt.toFixed(1)}  az ${view.az.toFixed(1)}` : "—"}
      </div>

      <div style={{ margin: "12px 0" }}>
        <div style={{ opacity: 0.8, marginBottom: 4 }}>
          Tap the one you’re aimed at:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {above.length === 0 && (
            <span style={{ opacity: 0.6 }}>
              (no targets above horizon, or location not set)
            </span>
          )}
          {above.map((t) => (
            <button
              key={t.name}
              disabled={!enabled || !view}
              onClick={() => capture(t)}
              style={{
                padding: "10px 14px",
                background: enabled && view ? "#063" : "#222",
                color: "#cffccf",
                border: "1px solid #0a4",
                borderRadius: 8,
              }}
            >
              {t.name}
              <br />
              <span style={{ fontSize: 11, opacity: 0.8 }}>
                alt {t.alt.toFixed(0)} az {t.az.toFixed(0)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {hint && (
        <p
          style={{
            background: "#031a03",
            border: "1px solid #0a4",
            borderRadius: 8,
            padding: 10,
            color: "#aeffae",
          }}
        >
          {hint}
        </p>
      )}

      {captures.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
            <button
              onClick={csv}
              style={{
                padding: "10px 16px",
                background: "#0a2",
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              Copy CSV
            </button>
            <button
              onClick={() => setCaptures([])}
              style={{
                padding: "10px 16px",
                background: "#400",
                color: "#fcc",
                border: "1px solid #800",
                borderRadius: 8,
              }}
            >
              Clear
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th>obj</th>
                <th>dAz</th>
                <th>dAlt</th>
                <th>true az/alt</th>
                <th>view az/alt</th>
              </tr>
            </thead>
            <tbody>
              {captures.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #042" }}>
                  <td>{c.target}</td>
                  <td
                    style={{
                      color: Math.abs(c.dAz) > 5 ? "#ff8" : "#9effa0",
                    }}
                  >
                    {c.dAz.toFixed(1)}
                  </td>
                  <td
                    style={{
                      color: Math.abs(c.dAlt) > 5 ? "#ff8" : "#9effa0",
                    }}
                  >
                    {c.dAlt.toFixed(1)}
                  </td>
                  <td style={{ opacity: 0.7 }}>
                    {c.trueAz.toFixed(0)}/{c.trueAlt.toFixed(0)}
                  </td>
                  <td style={{ opacity: 0.7 }}>
                    {c.viewAz.toFixed(0)}/{c.viewAlt.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
