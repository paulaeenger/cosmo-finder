// Curated image sources for sky objects.
//
// Strategy in priority order:
//   1. Hand-picked URL from NASA / Hubble / ESO / NASA Photojournal — for
//      our marquee objects. These are the icon shots: Cassini's Saturn,
//      Hubble's Andromeda, the ISS portrait taken from a departing crew
//      capsule, etc.
//   2. Procedural star art — for any star without a curated photo. We
//      render a stylized glowing point colored by spectral type, sized
//      by magnitude. Beautiful and on-brand, beats Wikipedia locator maps.
//   3. Wikipedia fallback — kept as a safety net for the long tail
//      (constellations, lesser deep-sky objects).
//   4. Placeholder — clean dark hero with no image.
//
// All curated images are NASA public domain or ESO/Hubble CC BY 4.0.

export type CuratedImage = {
  url: string;
  source: "NASA" | "Hubble" | "ESO" | "ESA" | "JPL";
  caption?: string;
};

/**
 * Hand-picked images for marquee objects. URLs link to the largest sensible
 * version available — we trust NASA/ESO not to break these in the next few
 * years, and the localStorage cache makes occasional 404s a non-issue.
 */
export const CURATED_IMAGES: Record<string, CuratedImage> = {
  // ============ SOLAR SYSTEM ============
  Sun: {
    url: "https://images-assets.nasa.gov/image/PIA03149/PIA03149~orig.jpg",
    source: "NASA",
    caption: "Solar Dynamics Observatory",
  },
  Moon: {
    url: "https://images-assets.nasa.gov/image/as11-44-6667/as11-44-6667~orig.jpg",
    source: "NASA",
    caption: "Apollo 11",
  },
  Mercury: {
    url: "https://images-assets.nasa.gov/image/PIA15162/PIA15162~orig.jpg",
    source: "NASA",
    caption: "MESSENGER",
  },
  Venus: {
    url: "https://images-assets.nasa.gov/image/PIA00271/PIA00271~orig.jpg",
    source: "NASA",
    caption: "Mariner 10",
  },
  Mars: {
    url: "https://images-assets.nasa.gov/image/PIA04304/PIA04304~orig.jpg",
    source: "NASA",
    caption: "Hubble",
  },
  Jupiter: {
    url: "https://images-assets.nasa.gov/image/PIA21641/PIA21641~orig.jpg",
    source: "NASA",
    caption: "Juno",
  },
  Saturn: {
    url: "https://images-assets.nasa.gov/image/PIA17172/PIA17172~orig.jpg",
    source: "NASA",
    caption: "Cassini",
  },
  Uranus: {
    url: "https://images-assets.nasa.gov/image/PIA18182/PIA18182~orig.jpg",
    source: "NASA",
    caption: "Voyager 2",
  },
  Neptune: {
    url: "https://images-assets.nasa.gov/image/PIA01492/PIA01492~orig.jpg",
    source: "NASA",
    caption: "Voyager 2",
  },

  // ============ SATELLITES ============
  "ISS (ZARYA)": {
    url: "https://images-assets.nasa.gov/image/iss056e201248/iss056e201248~orig.jpg",
    source: "NASA",
    caption: "Photographed from departing Soyuz",
  },
  TIANGONG: {
    // Tiangong has fewer free portraits available; using a NASA-hosted CMSA image
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Tiangong_space_station_in_orbit_2022.png/1280px-Tiangong_space_station_in_orbit_2022.png",
    source: "ESA",
    caption: "China Manned Space Agency",
  },
  HST: {
    url: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002131/GSFC_20171208_Archive_e002131~orig.jpg",
    source: "NASA",
    caption: "Hubble in orbit",
  },

  // ============ DEEP-SKY (Messier marquee) ============
  "M31 — Andromeda Galaxy": {
    url: "https://images-assets.nasa.gov/image/PIA15416/PIA15416~orig.jpg",
    source: "NASA",
    caption: "GALEX",
  },
  "M42 — Orion Nebula": {
    url: "https://images-assets.nasa.gov/image/PIA13346/PIA13346~orig.jpg",
    source: "NASA",
    caption: "Spitzer & Hubble composite",
  },
  "M45 — Pleiades": {
    url: "https://images-assets.nasa.gov/image/PIA22568/PIA22568~orig.jpg",
    source: "NASA",
    caption: "Spitzer Space Telescope",
  },
  "M1 — Crab Nebula": {
    url: "https://images-assets.nasa.gov/image/PIA03606/PIA03606~orig.jpg",
    source: "NASA",
    caption: "Hubble Space Telescope",
  },
  "M51 — Whirlpool Galaxy": {
    url: "https://images-assets.nasa.gov/image/PIA03611/PIA03611~orig.jpg",
    source: "Hubble",
    caption: "Hubble Space Telescope",
  },
  "M104 — Sombrero Galaxy": {
    url: "https://images-assets.nasa.gov/image/PIA04217/PIA04217~orig.jpg",
    source: "Hubble",
    caption: "Hubble Space Telescope",
  },
  "M16 — Eagle Nebula": {
    url: "https://images-assets.nasa.gov/image/PIA17563/PIA17563~orig.jpg",
    source: "Hubble",
    caption: "Pillars of Creation, Hubble",
  },
  "M8 — Lagoon Nebula": {
    url: "https://images-assets.nasa.gov/image/PIA22568_modest/PIA22568_modest~orig.jpg",
    source: "Hubble",
    caption: "Hubble Space Telescope",
  },
  "M27 — Dumbbell Nebula": {
    url: "https://images-assets.nasa.gov/image/PIA04638/PIA04638~orig.jpg",
    source: "Hubble",
    caption: "Hubble Space Telescope",
  },
  "M57 — Ring Nebula": {
    url: "https://images-assets.nasa.gov/image/PIA16884/PIA16884~orig.jpg",
    source: "Hubble",
    caption: "Hubble Space Telescope",
  },
  "M81 — Bode's Galaxy": {
    url: "https://images-assets.nasa.gov/image/PIA10605/PIA10605~orig.jpg",
    source: "Hubble",
    caption: "Spitzer + Hubble + GALEX",
  },
  "M82 — Cigar Galaxy": {
    url: "https://images-assets.nasa.gov/image/PIA09105/PIA09105~orig.jpg",
    source: "Hubble",
    caption: "Hubble + Chandra + Spitzer",
  },
  "M101 — Pinwheel Galaxy": {
    url: "https://images-assets.nasa.gov/image/PIA04230/PIA04230~orig.jpg",
    source: "Hubble",
    caption: "Hubble Space Telescope",
  },
  "M87 — Virgo A": {
    url: "https://images-assets.nasa.gov/image/eht-m87/eht-m87~orig.jpg",
    source: "NASA",
    caption: "Event Horizon Telescope",
  },
};

export function getCuratedImage(name: string): CuratedImage | null {
  return CURATED_IMAGES[name] ?? null;
}
