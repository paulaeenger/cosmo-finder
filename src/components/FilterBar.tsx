"use client";

import { motion } from "framer-motion";
import {
  Star,
  Globe,
  Sparkles,
  Spline,
  Satellite as SatIcon,
  Eye,
  Binoculars,
  Telescope,
} from "lucide-react";
import type { FilterCategory, FilterState } from "@/hooks/useSkyFilters";
import type { Equipment } from "@/hooks/useEquipment";

type Props = {
  filters: FilterState;
  counts: Record<FilterCategory, number>;
  onToggle: (cat: FilterCategory) => void;
  onReset: () => void;
  allOn: boolean;
  equipment: Equipment;
  onEquipmentChange: (eq: Equipment) => void;
};

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

const EQUIPMENT_OPTIONS: Array<{ id: Equipment; label: string; icon: React.ReactNode; mag: string }> = [
  { id: "eye", label: "Naked eye", icon: <Eye className="h-3.5 w-3.5" />, mag: "≤6" },
  { id: "binoculars", label: "Binoculars", icon: <Binoculars className="h-3.5 w-3.5" />, mag: "≤9.5" },
  { id: "telescope", label: "Telescope", icon: <Telescope className="h-3.5 w-3.5" />, mag: "all" },
];

export function FilterBar({
  filters,
  counts,
  onToggle,
  onReset,
  allOn,
  equipment,
  onEquipmentChange,
}: Props) {
  return (
    <section
      aria-label="Sky filters"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 space-y-2"
    >
      {/* Equipment selector row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <div className="shrink-0 px-2 text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono">
          See with
        </div>
        {EQUIPMENT_OPTIONS.map((opt) => (
          <EquipmentChip
            key={opt.id}
            icon={opt.icon}
            label={opt.label}
            magLabel={opt.mag}
            active={equipment === opt.id}
            onClick={() => onEquipmentChange(opt.id)}
          />
        ))}
      </div>

      {/* Category chips row */}
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
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-mono whitespace-nowrap transition-colors ${
        active
          ? "border-gold-400/40 bg-gold-400/12 text-gold-400"
          : "border-white/10 bg-transparent text-white/35 hover:text-white/60"
      }`}
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

function EquipmentChip({
  icon,
  label,
  magLabel,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  magLabel: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-mono whitespace-nowrap transition-colors ${
        active
          ? "border-emerald-300/40 bg-emerald-300/8 text-emerald-200"
          : "border-white/10 bg-transparent text-white/35 hover:text-white/60"
      }`}
      aria-pressed={active}
    >
      <span className={active ? "" : "opacity-50"}>{icon}</span>
      <span>{label}</span>
      <span className="text-[9px] opacity-60 normal-case tracking-normal">
        {magLabel}
      </span>
    </motion.button>
  );
}
