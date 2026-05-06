// Cosmos Finder service worker
//
// Strategy:
//   1. App shell (HTML, JS, CSS, fonts) — cache-first, stale-while-revalidate
//   2. Catalog data (JSON) — cache-first
//   3. NASA / Wikipedia images — cache-on-demand + pre-cache marquee set
//   4. CelesTrak TLEs — network-first, fall back to cache, 1-week max age
//
// On install, we pre-fetch the marquee object images so even your first
// offline session has rich content for the famous objects (Saturn, Andromeda,
// Orion Nebula, etc.).

const VERSION = "v2";
const APP_SHELL_CACHE = `cosmos-shell-${VERSION}`;
const CATALOG_CACHE = `cosmos-catalog-${VERSION}`;
const IMAGES_CACHE = `cosmos-images-${VERSION}`;
const TLE_CACHE = `cosmos-tle-${VERSION}`;

// Pre-cached medium-resolution variants of the marquee NASA images.
// Using ~medium (vs ~orig) keeps the install bundle small (~10-15 MB total).
const MARQUEE_IMAGES = [
  // Planets (Mercury → Neptune)
  "https://images-assets.nasa.gov/image/PIA15162/PIA15162~medium.jpg",   // Mercury
  "https://images-assets.nasa.gov/image/PIA00271/PIA00271~medium.jpg",   // Venus
  "https://images-assets.nasa.gov/image/PIA04304/PIA04304~medium.jpg",   // Earth
  "https://images-assets.nasa.gov/image/PIA21641/PIA21641~medium.jpg",   // Mars
  "https://images-assets.nasa.gov/image/PIA22568/PIA22568~medium.jpg",   // Jupiter
  "https://images-assets.nasa.gov/image/PIA17172/PIA17172~medium.jpg",   // Saturn
  "https://images-assets.nasa.gov/image/PIA18182/PIA18182~medium.jpg",   // Uranus
  "https://images-assets.nasa.gov/image/PIA01492/PIA01492~medium.jpg",   // Neptune
  // Sun + Moon
  "https://images-assets.nasa.gov/image/PIA03149/PIA03149~medium.jpg",   // Sun
  "https://images-assets.nasa.gov/image/as11-44-6667/as11-44-6667~medium.jpg", // Moon
  // Deep-sky marquee
  "https://images-assets.nasa.gov/image/PIA15416/PIA15416~medium.jpg",   // Andromeda
  "https://images-assets.nasa.gov/image/PIA13346/PIA13346~medium.jpg",   // Orion Nebula
  "https://images-assets.nasa.gov/image/PIA03606/PIA03606~medium.jpg",   // Pleiades
  "https://images-assets.nasa.gov/image/PIA03611/PIA03611~medium.jpg",   // Crab Nebula
  "https://images-assets.nasa.gov/image/PIA04217/PIA04217~medium.jpg",   // Whirlpool
  // Satellites
  "https://images-assets.nasa.gov/image/iss056e201248/iss056e201248~medium.jpg", // ISS
  "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002131/GSFC_20171208_Archive_e002131~medium.jpg", // Hubble
];

// ============ Install ============

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Pre-cache marquee images. Use individual fetches with no-cors so a
      // single failure doesn't abort the whole install.
      const cache = await caches.open(IMAGES_CACHE);
      await Promise.allSettled(
        MARQUEE_IMAGES.map(async (url) => {
          try {
            const res = await fetch(url, { mode: "no-cors" });
            await cache.put(url, res);
          } catch {
            // swallow — image will be re-fetched on demand later
          }
        })
      );
      // Force the new SW to take over immediately on next page load
      self.skipWaiting();
    })()
  );
});

// ============ Activate ============

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old version caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("cosmos-") &&
              !k.endsWith(`-${VERSION}`)
          )
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ============ Fetch ============

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // ── NASA / Wikipedia images: cache-first, fall back to network, save to cache
  if (
    url.hostname === "images-assets.nasa.gov" ||
    url.hostname === "upload.wikimedia.org" ||
    url.hostname === "en.wikipedia.org" ||
    url.hostname === "commons.wikimedia.org"
  ) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
    return;
  }

  // ── CelesTrak TLEs: network-first, cache fallback (1 week max stale)
  if (url.hostname === "celestrak.org" || url.hostname === "celestrak.com") {
    event.respondWith(networkFirstWithStaleFallback(request, TLE_CACHE));
    return;
  }

  // ── Same-origin: app shell + catalog data
  if (url.origin === self.location.origin) {
    // Static catalog JSON files baked into /_next/
    if (url.pathname.includes("/_next/static/")) {
      event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
      return;
    }
    // App pages (HTML)
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
    return;
  }

  // ── Everything else: just network, no caching
});

// ============ Caching strategies ============

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Offline AND not in cache. Return a 503-ish synthetic response.
    return new Response("Offline and resource not cached.", {
      status: 503,
      statusText: "Service Unavailable (offline)",
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // If we have a cached version, return it immediately. Otherwise wait
  // for the network.
  return cached ?? (await networkPromise) ??
    new Response("Offline.", { status: 503 });
}

async function networkFirstWithStaleFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Offline and TLE not cached.", { status: 503 });
  }
}
