"use client";

import { motion } from "framer-motion";
import { Star, Globe, Sparkles, Spline, Satellite as SatIcon } from "lucide-react";
import type { FilterCategory, FilterState } from "@/hooks/useSkyFilters";

type Props = {
  filters: FilterState;
  counts: Record<FilterCategory, number>;
  onToggle: (cat: FilterCategory) => void;
  onReset: () => void;
  allOn: boolean;
};

// Order matters — these are presented left-to-right.
const CATEGORIES: Array<{
  id: FilterCategory;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "planets", label: "Planets", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "stars", label: "Stars", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "deep-sky", label: "Deep-Sky", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "satellites", label: "Satellites", icon: <SatIcon className="h-3.5 w-3.5" /> },
  { id: "constellations", label: "Lines", icon: <Spline className="h-3.5 w-3.5" /> },
];

export function FilterBar({ filters, counts, onToggle, onReset, allOn }: Props) {
  return (
    <section
      aria-label="Sky object filters"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-2"
    >
      {/* Horizontal scroll on narrow screens; flex-wrap on wider */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {CATEGORIES.map((cat) => {
          const on = filters[cat.id];
          const count = counts[cat.id] ?? 0;
          return (
            <FilterChip
              key={cat.id}
              icon={cat.icon}
              label={cat.label}
              count={count}
              active={on}
              onClick={() => onToggle(cat.id)}
            />
          );
        })}

        {/* Reset chip — only visible when at least one filter is off */}
        {!allOn && (
          <motion.button
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onReset}
            className="ml-1 shrink-0 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-400 font-mono whitespace-nowrap hover:bg-gold-400/15"
          >
            Show all
          </motion.button>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`
        flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5
        text-[11px] uppercase tracking-[0.15em] font-mono whitespace-nowrap
        transition-colors
        ${
          active
            ? "border-gold-400/40 bg-gold-400/12 text-gold-400"
            : "border-white/10 bg-transparent text-white/35 hover:text-white/60"
        }
      `}
      aria-pressed={active}
      aria-label={`${active ? "Hide" : "Show"} ${label} (${count} visible)`}
    >
      <span className={active ? "" : "opacity-50"}>{icon}</span>
      <span>{label}</span>
      {active && count > 0 && (
        <span className="text-[9px] opacity-70 normal-case tracking-normal">
          {count}
        </span>
      )}
    </motion.button>
  );
}
