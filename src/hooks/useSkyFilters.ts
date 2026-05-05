"use client";

import { useCallback, useEffect, useState } from "react";

// User-facing filter categories. Internal SkyObject "kind" values map
// to one of these via categoryFor() below.
export type FilterCategory =
  | "stars"
  | "planets"
  | "deep-sky"
  | "constellations"
  | "satellites";

export type FilterState = Record<FilterCategory, boolean>;

const DEFAULT_FILTERS: FilterState = {
  stars: true,
  planets: true,
  "deep-sky": true,
  constellations: true,
  satellites: true,
};

const STORAGE_KEY = "cosmos-finder.filters.v1";

function loadFilters(): FilterState {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    // Merge with defaults so a future-added category turns on automatically
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveFilters(state: FilterState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or disabled — silent fail
  }
}

export function useSkyFilters() {
  // Start with defaults so SSR/hydration matches; load from storage in effect
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFilters(loadFilters());
    setHydrated(true);
  }, []);

  const toggle = useCallback((category: FilterCategory) => {
    setFilters((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      saveFilters(next);
      return next;
    });
  }, []);

  const setOnly = useCallback((category: FilterCategory) => {
    // Convenience: solo a single category by turning everything else off
    setFilters((prev) => {
      const next: FilterState = {
        stars: false,
        planets: false,
        "deep-sky": false,
        constellations: false,
        satellites: false,
      };
      next[category] = true;
      saveFilters(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    saveFilters(DEFAULT_FILTERS);
  }, []);

  const allOn = Object.values(filters).every(Boolean);
  const anyOn = Object.values(filters).some(Boolean);

  return { filters, toggle, setOnly, reset, allOn, anyOn, hydrated };
}

/**
 * Map a SkyObject's internal "kind" value to a user-facing filter category.
 * Sun and Moon are grouped under "planets" since users think of them all
 * together as "solar system bodies" — the original kind values stay
 * intact, this is purely a UI grouping.
 */
export function categoryFor(kind: string): FilterCategory {
  switch (kind) {
    case "star":
      return "stars";
    case "planet":
    case "sun":
    case "moon":
      return "planets";
    case "deep-sky":
      return "deep-sky";
    case "constellation":
      return "constellations";
    case "satellite":
      return "satellites";
    default:
      return "stars";
  }
}
