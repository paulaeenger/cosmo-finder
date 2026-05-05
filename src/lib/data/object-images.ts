// Image lookup for sky objects. Strategy: every object has a Wikipedia
// article. The MediaWiki REST API exposes a page summary that includes a
// thumbnail URL — and serves it with permissive CORS, so we can use it
// directly from the browser. No API key, no rate limit issues for this
// scale of use.
//
// We hand-map our internal object names to the correct Wikipedia article
// titles for the marquee objects (where exact match isn't guaranteed) and
// fall back to the object name itself for everything else.

// Maps internal object name → Wikipedia article title.
// Only includes cases where the article title differs from our display name.
const WIKI_TITLE_OVERRIDES: Record<string, string> = {
  // Solar system
  Sun: "Sun",
  Moon: "Moon",
  Mercury: "Mercury (planet)",
  Venus: "Venus",
  Earth: "Earth",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
  Uranus: "Uranus",
  Neptune: "Neptune",

  // Satellites
  "ISS (ZARYA)": "International Space Station",
  TIANGONG: "Tiangong space station",
  HST: "Hubble Space Telescope",

  // Stars
  Sirius: "Sirius",
  Canopus: "Canopus",
  Arcturus: "Arcturus",
  "Rigil Kentaurus": "Alpha Centauri",
  Vega: "Vega",
  Capella: "Capella",
  Rigel: "Rigel",
  Procyon: "Procyon",
  Achernar: "Achernar",
  Betelgeuse: "Betelgeuse",
  Altair: "Altair",
  Aldebaran: "Aldebaran",
  Antares: "Antares",
  Spica: "Spica",
  Pollux: "Pollux (star)",
  Fomalhaut: "Fomalhaut",
  Deneb: "Deneb",
  Regulus: "Regulus",
  Castor: "Castor (star)",
  Polaris: "Polaris",
  Algol: "Algol",
  Hamal: "Hamal",
  Alphard: "Alphard",
  Mizar: "Mizar",
  Albireo: "Albireo",
  Mira: "Mira",
};

// Messier objects: build the lookup from "M31 — Andromeda Galaxy" → "Messier 31"
function messierTitle(name: string): string | null {
  const match = name.match(/^M(\d+)/);
  if (!match) return null;
  return `Messier ${match[1]}`;
}

// Constellations: append " (constellation)" to disambiguate (e.g. "Orion" vs "Orion (constellation)")
function constellationTitle(name: string): string {
  // The IAU constellation names are the same as Wikipedia article titles
  // for most cases. Cassiopeia, Cygnus, etc. get "(constellation)" appended.
  const NEEDS_DISAMBIG = new Set([
    "Andromeda", "Aquila", "Cassiopeia", "Centaurus", "Cetus",
    "Cygnus", "Hercules", "Hydra", "Leo", "Lyra",
    "Orion", "Pegasus", "Perseus", "Phoenix", "Sagittarius",
    "Scorpius", "Serpens", "Taurus", "Triangulum", "Virgo",
  ]);
  return NEEDS_DISAMBIG.has(name) ? `${name} (constellation)` : name;
}

export function wikiTitleFor(name: string, kind: string): string | null {
  // Direct override
  if (WIKI_TITLE_OVERRIDES[name]) return WIKI_TITLE_OVERRIDES[name];

  if (kind === "deep-sky") return messierTitle(name);
  if (kind === "constellation") return constellationTitle(name);

  // For un-overridden stars, just try the name as-is
  if (kind === "star") return name;

  return null;
}

// Cache fetched URLs in localStorage so repeated views are instant.
const CACHE_KEY = "cosmos-finder.images.v1";
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ImageCacheEntry = {
  url: string | null;     // null = no image found (cache the negative too)
  attribution: string | null;
  fetchedAt: number;
};

type ImageCache = Record<string, ImageCacheEntry>;

function loadCache(): ImageCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ImageCache) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: ImageCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full / disabled
  }
}

export type ObjectImage = {
  url: string;
  attribution: string | null;
};

/**
 * Fetch the lead image for a sky object. Returns null if unavailable.
 * Result is cached per-object for 30 days.
 */
export async function fetchObjectImage(
  name: string,
  kind: string
): Promise<ObjectImage | null> {
  const title = wikiTitleFor(name, kind);
  if (!title) return null;

  const cacheKey = `${kind}:${name}`;
  const cache = loadCache();
  const cached = cache[cacheKey];

  if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS) {
    if (!cached.url) return null;
    return { url: cached.url, attribution: cached.attribution };
  }

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      // Cache the negative result so we don't keep retrying
      cache[cacheKey] = { url: null, attribution: null, fetchedAt: Date.now() };
      saveCache(cache);
      return null;
    }
    const data = await res.json();

    // Prefer the larger "originalimage" if available; fall back to thumbnail
    const imageUrl: string | null =
      data.originalimage?.source ?? data.thumbnail?.source ?? null;

    const entry: ImageCacheEntry = {
      url: imageUrl,
      attribution: "Wikimedia Commons",
      fetchedAt: Date.now(),
    };
    cache[cacheKey] = entry;
    saveCache(cache);

    if (!imageUrl) return null;
    return { url: imageUrl, attribution: entry.attribution };
  } catch {
    return null;
  }
}
