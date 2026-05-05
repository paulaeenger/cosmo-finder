"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { searchSky, type SkyObject } from "@/lib/astronomy/matching";

type Props = {
  sky: SkyObject[];
  onPick: (obj: SkyObject) => void;
};

export function SearchPanel({ sky, onPick }: Props) {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchSky(sky, q), [sky, q]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Mars, Orion, Sirius, Andromeda…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q && (
        <ul className="max-h-72 overflow-y-auto border-t border-white/5 py-1">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-white/40">
              Nothing in your current sky matches that name.
            </li>
          ) : (
            results.map((r) => (
              <li key={r.name}>
                <button
                  onClick={() => {
                    onPick(r);
                    setQ("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm text-white">{r.name}</p>
                    <p className="text-[11px] text-white/40 font-mono">
                      {r.kind} · alt {r.alt.toFixed(0)}° · az {r.az.toFixed(0)}°
                    </p>
                  </div>
                  <span className="text-[11px] uppercase tracking-widest text-gold-400 font-mono">
                    aim
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
