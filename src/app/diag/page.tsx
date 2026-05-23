"use client";
/**
 * /diag — on-device orientation diagnostic instrument.
 *
 * A standalone route (touches no other file) for capturing the truth about the
 * sensor pipeline on a real phone. It subscribes to BOTH deviceorientation and
 * devicemotion, runs a rAF loop to measure frame timing, derives the same
 * alt/az + up-axis the app uses (via the real coords functions), and records
 * everything to a ring buffer you can export as CSV.
 *
 * The point: separate the three suspects we keep conflating —
 *   (1) sensor drift   (orientation changes while the gyro reads ~0 = magnetometer/fusion drift)
 *   (2) sensor rate    (how fast/regular deviceorientation & devicemotion actually fire here)
 *   (3) render jank     (rAF frame dt spikes, independent of the sensors)
 *
 * Visit cosmo-finder.vercel.app/diag on the iPhone, Enable sensors, run the
 * capture protocol shown on screen, Export, and send the CSV back.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deviceToVector,
  deviceUpVector,
  vectorToHorizontal,
} from "@/lib/astronomy/coords";

type Row = {
  t: number;
  label: string;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: 0 | 1;
  compassHeading: number | null;
  compassAccuracy: number | null;
  rotA: number | null;
  rotB: number | null;
  rotG: number | null;
  accX: number | null;
  accY: number | null;
  accZ: number | null;
  motionInterval: number | null;
  screenAngle: number;
  viewAlt: number | null;
  viewAz: number | null;
  upX: number | null;
  upY: number | null;
  upZ: number | null;
  oriDt: number; // ms since previous orientation event
  frameDtMax: number; // worst rAF frame dt since previous orientation event (ms)
};

const MAX_ROWS = 24000; // ~6 min at 60 Hz
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const f1 = (v: number | null) => (v == null ? "—" : v.toFixed(1));
const f2 = (v: number | null) => (v == null ? "—" : v.toFixed(2));

function getScreenAngle(): number {
  if (typeof window === "undefined") return 0;
  const so = (window.screen as Screen & { orientation?: { angle?: number } })
    ?.orientation;
  if (so && typeof so.angle === "number") return so.angle;
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

export default function DiagPage() {
  const [enabled, setEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [permMsg, setPermMsg] = useState("");
  const [label, setLabel] = useState("");
  const [csv, setCsv] = useState("");

  // Live display snapshot (updated ~10 Hz, not every event, to avoid re-render storms)
  const [live, setLive] = useState({
    oriHz: 0,
    motHz: 0,
    fps: 0,
    jankPct: 0,
    gyroMag: 0,
    still: false,
    gyroPresent: false,
    absolute: false,
    rows: 0,
    durS: 0,
    alpha: null as number | null,
    beta: null as number | null,
    gamma: null as number | null,
    heading: null as number | null,
    accuracy: null as number | null,
    viewAlt: null as number | null,
    viewAz: null as number | null,
    screenAngle: 0,
  });

  // --- refs (hot path; no re-render) ---
  const rows = useRef<Row[]>([]);
  const t0 = useRef(0);
  const labelRef = useRef("");
  const recordingRef = useRef(false);

  const lastMotion = useRef<{
    rotA: number | null;
    rotB: number | null;
    rotG: number | null;
    accX: number | null;
    accY: number | null;
    accZ: number | null;
    interval: number | null;
  }>({ rotA: null, rotB: null, rotG: null, accX: null, accY: null, accZ: null, interval: null });

  const lastOriT = useRef(0);
  const frameDtMaxSinceOri = useRef(0);

  // rate / jank counters
  const oriStamps = useRef<number[]>([]);
  const motStamps = useRef<number[]>([]);
  const frameStamps = useRef<number[]>([]);
  const jankFrames = useRef(0);
  const totalFrames = useRef(0);
  const gyroEverNonZero = useRef(false);

  const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const pushStamp = (arr: React.MutableRefObject<number[]>, t: number) => {
    arr.current.push(t);
    const cutoff = t - 1000;
    while (arr.current.length && arr.current[0] < cutoff) arr.current.shift();
  };

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const t = now();
    pushStamp(oriStamps, t);
    const ev = e as DeviceOrientationEvent & {
      webkitCompassHeading?: number;
      webkitCompassAccuracy?: number;
    };
    const alpha = num(e.alpha);
    const beta = num(e.beta);
    const gamma = num(e.gamma);
    const heading = num(ev.webkitCompassHeading);
    const accuracy = num(ev.webkitCompassAccuracy);
    const screenAngle = getScreenAngle();

    let viewAlt: number | null = null;
    let viewAz: number | null = null;
    let upX: number | null = null;
    let upY: number | null = null;
    let upZ: number | null = null;
    try {
      const v = deviceToVector(alpha, beta, gamma);
      if (v) {
        const h = vectorToHorizontal(v);
        viewAlt = h.alt;
        viewAz = h.az;
      }
      const u = deviceUpVector(alpha, beta, gamma);
      if (u) {
        upX = u.x;
        upY = u.y;
        upZ = u.z;
      }
    } catch {
      /* leave nulls */
    }

    const oriDt = lastOriT.current ? t - lastOriT.current : 0;
    lastOriT.current = t;
    const frameDtMax = frameDtMaxSinceOri.current;
    frameDtMaxSinceOri.current = 0;

    if (recordingRef.current) {
      const m = lastMotion.current;
      rows.current.push({
        t: t - t0.current,
        label: labelRef.current,
        alpha,
        beta,
        gamma,
        absolute: e.absolute ? 1 : 0,
        compassHeading: heading,
        compassAccuracy: accuracy,
        rotA: m.rotA,
        rotB: m.rotB,
        rotG: m.rotG,
        accX: m.accX,
        accY: m.accY,
        accZ: m.accZ,
        motionInterval: m.interval,
        screenAngle,
        viewAlt,
        viewAz,
        upX,
        upY,
        upZ,
        oriDt,
        frameDtMax,
      });
      if (rows.current.length > MAX_ROWS) rows.current.shift();
    }
  }, []);

  const onMotion = useCallback((e: DeviceMotionEvent) => {
    const t = now();
    pushStamp(motStamps, t);
    const r = e.rotationRate;
    const a = e.accelerationIncludingGravity;
    const rotA = num(r?.alpha);
    const rotB = num(r?.beta);
    const rotG = num(r?.gamma);
    if ((rotA && Math.abs(rotA) > 0.5) || (rotB && Math.abs(rotB) > 0.5) || (rotG && Math.abs(rotG) > 0.5)) {
      gyroEverNonZero.current = true;
    }
    lastMotion.current = {
      rotA,
      rotB,
      rotG,
      accX: num(a?.x),
      accY: num(a?.y),
      accZ: num(a?.z),
      interval: num(e.interval) != null ? (e.interval as number) * 1000 : null,
    };
  }, []);

  // rAF frame-timing loop + ~10 Hz live snapshot
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let lastFrame = now();
    let lastSnap = 0;
    const tick = () => {
      const t = now();
      const dt = t - lastFrame;
      lastFrame = t;
      pushStamp(frameStamps, t);
      totalFrames.current += 1;
      if (dt > frameDtMaxSinceOri.current) frameDtMaxSinceOri.current = dt;
      if (dt > 20) jankFrames.current += 1; // >20ms ≈ dropped frame at 60fps

      if (t - lastSnap > 100) {
        lastSnap = t;
        const m = lastMotion.current;
        const gyroMag = Math.hypot(m.rotA ?? 0, m.rotB ?? 0, m.rotG ?? 0);
        const jankPct =
          totalFrames.current > 0
            ? (jankFrames.current / totalFrames.current) * 100
            : 0;
        const last = rows.current[rows.current.length - 1];
        setLive({
          oriHz: oriStamps.current.length,
          motHz: motStamps.current.length,
          fps: frameStamps.current.length,
          jankPct,
          gyroMag,
          still: gyroMag < 3,
          gyroPresent: gyroEverNonZero.current,
          absolute: last ? last.absolute === 1 : false,
          rows: rows.current.length,
          durS: rows.current.length
            ? (rows.current[rows.current.length - 1].t -
                rows.current[0].t) /
              1000
            : 0,
          alpha: last?.alpha ?? null,
          beta: last?.beta ?? null,
          gamma: last?.gamma ?? null,
          heading: last?.compassHeading ?? null,
          accuracy: last?.compassAccuracy ?? null,
          viewAlt: last?.viewAlt ?? null,
          viewAz: last?.viewAz ?? null,
          screenAngle: last?.screenAngle ?? 0,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  // subscribe to sensors once enabled
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("deviceorientation", onOrientation, true);
    // Prefer the absolute (true-heading) stream if the device emits it.
    window.addEventListener(
      "deviceorientationabsolute",
      onOrientation as EventListener,
      true
    );
    window.addEventListener("devicemotion", onMotion, true);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener(
        "deviceorientationabsolute",
        onOrientation as EventListener,
        true
      );
      window.removeEventListener("devicemotion", onMotion, true);
    };
  }, [enabled, onOrientation, onMotion]);

  const enableSensors = async () => {
    setPermMsg("requesting…");
    try {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      const DME = window.DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      let ok = true;
      if (typeof DOE?.requestPermission === "function") {
        ok = (await DOE.requestPermission()) === "granted" && ok;
      }
      if (typeof DME?.requestPermission === "function") {
        ok = (await DME.requestPermission()) === "granted" && ok;
      }
      if (!ok) {
        setPermMsg("permission denied — reload and allow Motion & Orientation");
        return;
      }
      setPermMsg("");
      setEnabled(true);
    } catch (err) {
      setPermMsg("error: " + String(err));
    }
  };

  const mark = (text: string) => {
    labelRef.current = text;
    setLabel(text);
    if (recordingRef.current) {
      // Drop a zero-width marker row so the label boundary is unambiguous.
      const last = rows.current[rows.current.length - 1];
      if (last) rows.current.push({ ...last, label: `__MARK__:${text}` });
    }
  };

  const start = () => {
    rows.current = [];
    t0.current = now();
    lastOriT.current = 0;
    jankFrames.current = 0;
    totalFrames.current = 0;
    recordingRef.current = true;
    setRecording(true);
  };
  const stop = () => {
    recordingRef.current = false;
    setRecording(false);
  };

  const buildCsv = () => {
    const cols = [
      "t_ms","label","alpha","beta","gamma","absolute","compassHeading",
      "compassAccuracy","rotA","rotB","rotG","accX","accY","accZ",
      "motionInterval","screenAngle","viewAlt","viewAz","upX","upY","upZ",
      "oriDt","frameDtMax",
    ];
    const line = (r: Row) =>
      [
        r.t.toFixed(1), r.label, r.alpha, r.beta, r.gamma, r.absolute,
        r.compassHeading, r.compassAccuracy, r.rotA, r.rotB, r.rotG,
        r.accX, r.accY, r.accZ, r.motionInterval, r.screenAngle,
        r.viewAlt, r.viewAz, r.upX, r.upY, r.upZ, r.oriDt, r.frameDtMax,
      ]
        .map((v) =>
          v == null ? "" : typeof v === "number" ? +v.toFixed(3) : v
        )
        .join(",");
    const text = [cols.join(","), ...rows.current.map(line)].join("\n");
    setCsv(text);
    return text;
  };

  const copyCsv = async () => {
    const text = buildCsv();
    try {
      await navigator.clipboard.writeText(text);
      setPermMsg("copied to clipboard");
      setTimeout(() => setPermMsg(""), 1500);
    } catch {
      setPermMsg("clipboard blocked — use the text box below");
    }
  };

  const shareCsv = async () => {
    const text = buildCsv();
    const nav = navigator as Navigator & {
      share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
    };
    try {
      if (nav.share) {
        const file = new File([text], "cosmos-diag.csv", { type: "text/csv" });
        await nav.share({ files: [file], title: "cosmos-diag.csv" });
      } else {
        await copyCsv();
      }
    } catch {
      /* user cancelled */
    }
  };

  const downloadCsv = () => {
    const text = buildCsv();
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cosmos-diag.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- styles (inline; night-vision red on black, no external CSS deps) ---
  const wrap: React.CSSProperties = {
    minHeight: "100dvh", background: "#000", color: "#ff5a4d",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    padding: "16px", fontSize: 14, lineHeight: 1.5,
    WebkitUserSelect: "text", userSelect: "text",
  };
  const btn: React.CSSProperties = {
    background: "#1a0604", color: "#ff7a6d", border: "1px solid #ff5a4d",
    borderRadius: 8, padding: "12px 14px", fontSize: 15, fontWeight: 600,
    margin: "4px 6px 4px 0", minWidth: 92, touchAction: "manipulation",
  };
  const markBtn: React.CSSProperties = { ...btn, background: "#04140a", color: "#5dff9b", borderColor: "#2e8b57" };
  const cell: React.CSSProperties = { padding: "2px 0" };
  const big = (ok: boolean): React.CSSProperties => ({
    fontSize: 22, fontWeight: 700, color: ok ? "#5dff9b" : "#ff5a4d",
  });

  if (!enabled) {
    return (
      <div style={wrap}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Cosmos Finder · Sensor Diagnostic</h1>
        <p style={{ maxWidth: 520 }}>
          This page records the raw orientation + gyro streams and frame timing
          so we can see exactly where the smoothness problem lives. Nothing here
          touches the rest of the app.
        </p>
        <button style={{ ...btn, fontSize: 17, padding: "16px 20px" }} onClick={enableSensors}>
          Enable sensors
        </button>
        <div style={{ marginTop: 8, color: "#ffae47" }}>{permMsg}</div>
        <p style={{ marginTop: 16, color: "#c4524a" }}>
          On iOS this must be tapped (permission requires a gesture). Use the
          deployed HTTPS URL, not localhost.
        </p>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: 18, marginBottom: 6 }}>Cosmos Finder · Sensor Diagnostic</h1>

      {/* live rates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <div>orientation</div>
          <div style={big(live.oriHz >= 30)}>{live.oriHz} Hz</div>
        </div>
        <div>
          <div>devicemotion</div>
          <div style={big(live.motHz >= 30)}>{live.motHz} Hz</div>
        </div>
        <div>
          <div>render</div>
          <div style={big(live.fps >= 50)}>{live.fps} fps</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <div>gyro present?</div>
          <div style={big(live.gyroPresent)}>{live.gyroPresent ? "YES" : "NO / ZERO"}</div>
        </div>
        <div>
          <div>holding still?</div>
          <div style={big(live.still)}>{live.still ? "STILL" : `MOVING ${live.gyroMag.toFixed(0)}°/s`}</div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #401510", paddingTop: 8, marginBottom: 10 }}>
        <div style={cell}>α {f1(live.alpha)}  β {f1(live.beta)}  γ {f1(live.gamma)}  (abs: {live.absolute ? "y" : "n"})</div>
        <div style={cell}>compass {f1(live.heading)}°  ±{f1(live.accuracy)}°  screen {live.screenAngle}°</div>
        <div style={cell}>view alt {f1(live.viewAlt)}  az {f1(live.viewAz)}</div>
        <div style={cell}>jank (frames &gt;20ms): <span style={{ color: live.jankPct > 5 ? "#ff5a4d" : "#5dff9b" }}>{live.jankPct.toFixed(1)}%</span></div>
        <div style={cell}>rows {live.rows}  ·  {live.durS.toFixed(0)}s  ·  rec: <span style={{ color: recording ? "#5dff9b" : "#ff5a4d" }}>{recording ? "ON" : "off"}</span>{label ? `  ·  label: ${label}` : ""}</div>
      </div>

      {/* capture controls */}
      <div>
        {!recording ? (
          <button style={{ ...btn, background: "#04140a", color: "#5dff9b", borderColor: "#2e8b57" }} onClick={start}>● Start</button>
        ) : (
          <button style={btn} onClick={stop}>■ Stop</button>
        )}
        <button style={btn} onClick={() => { buildCsv(); }}>Build CSV</button>
      </div>

      {/* segment markers */}
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 4 }}>tap to label what you’re doing:</div>
        {["STILL", "SLOW PAN", "FAST PAN", "ZENITH", "JANK NOW"].map((m) => (
          <button key={m} style={markBtn} onClick={() => mark(m)}>{m}</button>
        ))}
      </div>

      {/* export */}
      <div style={{ marginTop: 12 }}>
        <button style={btn} onClick={copyCsv}>Copy CSV</button>
        <button style={btn} onClick={shareCsv}>Share</button>
        <button style={btn} onClick={downloadCsv}>Download</button>
      </div>
      <div style={{ color: "#ffae47", minHeight: 18 }}>{permMsg}</div>

      {/* fallback selectable text */}
      {csv && (
        <textarea
          readOnly
          value={csv}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            width: "100%", height: 160, marginTop: 8, background: "#0a0302",
            color: "#ff7a6d", border: "1px solid #401510", borderRadius: 8,
            fontFamily: "inherit", fontSize: 11, padding: 8,
          }}
        />
      )}

      {/* protocol */}
      <div style={{ marginTop: 16, color: "#c98", fontSize: 13, borderTop: "1px solid #401510", paddingTop: 8 }}>
        <strong style={{ color: "#ffae47" }}>Capture protocol</strong>
        <ol style={{ paddingLeft: 18, marginTop: 4 }}>
          <li>Tap <b>Start</b>.</li>
          <li>Lay phone flat & still on a table ~20s → tap <b>STILL</b>.</li>
          <li>Pick up, pan slowly & smoothly across the sky ~15s → tap <b>SLOW PAN</b>.</li>
          <li>Pan quickly side to side ~10s → tap <b>FAST PAN</b>.</li>
          <li>Sweep up through straight-overhead a few times → tap <b>ZENITH</b>.</li>
          <li>Reproduce whatever feels wrong → tap <b>JANK NOW</b>.</li>
          <li>Tap <b>Stop</b>, then <b>Copy</b>/<b>Share</b>/<b>Download</b> and send me the CSV.</li>
        </ol>
      </div>
    </div>
  );
}
