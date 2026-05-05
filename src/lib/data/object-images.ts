// Image lookup orchestrator. Priority chain:
//   1. Hand-curated NASA/Hubble/ESO photos for marquee objects
//   2. Procedural SVG art for stars without curated photos
//   3. Wikipedia/Wikimedia REST API as a long-tail fallback
//   4. null → component renders a clean dark placeholder

import { getCuratedImage } from "./curated-images";
import { generateStarImage } from "./star-art";

export type ObjectImage = {
  url: string;
  attribution: string | null;
};

// Wikipedia title overrides for the fallback path. We only hit Wikipedia
// when curated and procedural paths don't apply, so this is the small
// tail (mostly constellations and lesser deep-sky objects).
const WIKI_TITLE_OVERRIDES: Record<string, string> = {
  // Star names that need disambiguation when we DO go to Wikipedia
  // (most of these will get procedural art instead, but kept as backup)
  "Pollux": "Pollux (star)",
  "Castor": "Castor (star)",
};

function messierTitle(name: string): string | null {
  const match = name.match(/^M(\d+)/);
  if (!match) return null;
  return `Messier ${match[1]}`;
}

function constellationTitle(name: string): string {
  const NEEDS_DISAMBIG = new Set([
    "Andromeda", "Aquila", "Cassiopeia", "Centaurus", "Cetus",
    "Cygnus", "Hercules", "Hydra", "Leo", "Lyra",
    "Orion", "Pegasus", "Perseus", "Phoenix", "Sagittarius",
    "Scorpius", "Serpens", "Taurus", "Triangulum", "Virgo",
  ]);
  return NEEDS_DISAMBIG.has(name) ? `${name} (constellation)` : name;
}

function wikiTitleFor(name: string, kind: string): string | null {
  if (WIKI_TITLE_OVERRIDES[name]) return WIKI_TITLE_OVERRIDES[name];
  if (kind === "deep-sky") return messierTitle(name);
  if (kind === "constellation") return constellationTitle(name);
  return null;
}

// localStorage cache for Wikipedia results only — curated and procedural
// are instant and don't need caching.
const CACHE_KEY = "cosmos-finder.images.v2";
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ImageCacheEntry = {
  url: string | null;
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
    // localStorage full / disabled — silently skip
  }
}

async function fetchWikipediaImage(
  title: string,
  cacheKey: string
): Promise<ObjectImage | null> {
  const cache = loadCache();
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS) {
    if (!cached.url) return null;
    return { url: cached.url, attribution: cached.attribution };
  }

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      cache[cacheKey] = { url: null, attribution: null, fetchedAt: Date.now() };
      saveCache(cache);
      return null;
    }
    const data = await res.json();
    const imageUrl: string | null =
      data.originalimage?.source ?? data.thumbnail?.source ?? null;

    const entry: ImageCacheEntry = {
      url: imageUrl,
      attribution: imageUrl ? "Wikimedia Commons" : null,
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

/**
 * Resolve an image for a sky object, walking the priority chain.
 *
 * For curated and procedural results, this is synchronous (instant).
 * Wikipedia path is async but cached for 30 days after first fetch.
 */
export async function fetchObjectImage(
  name: string,
  kind: string
): Promise<ObjectImage | null> {
  // 1. Curated NASA/Hubble/ESO photo
  const curated = getCuratedImage(name);
  if (curated) {
    return { url: curated.url, attribution: curated.source };
  }

  // 2. Procedural star art for stars without curated photos
  if (kind === "star") {
    return {
      url: generateStarImage(name),
      attribution: "Stylized rendering",
    };
  }

  // 3. Wikipedia fallback for the long tail (constellations, lesser deep-sky)
  const wikiTitle = wikiTitleFor(name, kind);
  if (wikiTitle) {
    const wikiResult = await fetchWikipediaImage(wikiTitle, `${kind}:${name}`);
    if (wikiResult) return wikiResult;
  }

  // 4. No image available — component shows placeholder
  return null;
}
