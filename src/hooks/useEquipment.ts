"use client";

import { useCallback, useEffect, useState } from "react";

export type Equipment = "eye" | "binoculars" | "telescope";

const MAG_LIMITS: Record<Equipment, number> = {
  eye: 6.0,           // typical naked-eye limit in dark skies
  binoculars: 9.5,    // 7x50 binoculars
  telescope: 99,      // effectively no limit
};

const STORAGE_KEY = "cosmos-finder.equipment.v1";

function load(): Equipment {
  if (typeof window === "undefined") return "eye";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "eye" || raw === "binoculars" || raw === "telescope") {
      return raw;
    }
  } catch {}
  return "eye";
}

function save(eq: Equipment) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, eq);
  } catch {}
}

export function useEquipment() {
  const [equipment, setEquipmentState] = useState<Equipment>("eye");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEquipmentState(load());
    setHydrated(true);
  }, []);

  const setEquipment = useCallback((eq: Equipment) => {
    setEquipmentState(eq);
    save(eq);
  }, []);

  const magLimit = MAG_LIMITS[equipment];

  return { equipment, setEquipment, magLimit, hydrated };
}
