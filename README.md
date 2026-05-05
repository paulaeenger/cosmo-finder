# Cosmos Finder

> Point your phone at the sky. The browser tells you what you're looking at.

A mobile-first sky identifier built with Next.js 14, TypeScript, Tailwind, Framer Motion, `astronomy-engine`, and `satellite.js`. No backend required — everything (catalog math, alt/az conversion, satellite propagation, matching) runs in the browser.

## What v1.1 ships with

### Core sky catalog
- **Bright stars** — ~95 named naked-eye stars with magnitudes/distances
- **Planets** — Mercury through Neptune, computed live from Earth's position
- **Sun & Moon** — including geometric distance and current phase data
- **Messier catalog** — all 110 deep-sky objects (galaxies, nebulae, clusters)
- **Constellations** — all 88 IAU constellations

### Live satellite tracking 🛰️
- **ISS** — updated every 2 seconds, including ground-track lat/lon and altitude
- **Tiangong** — China's space station
- **Hubble** — the telescope itself, visible from the ground
- **TLE auto-refresh** from CelesTrak with localStorage caching (1-hour TTL)
- **Sunlit detection** — only surfaces satellites you can actually see (not in Earth's shadow)
- **Visible-now banner** — when a tracked satellite is overhead AND illuminated, it's promoted to the top of the screen

### Identification & guidance
- **Point-to-identify** — closest match within 25° of phone direction
- **Directional arrow** — animated guide pointing to off-screen tracked objects
- **Tracked-object highlight** — pulsing ring on the SkyCompass
- **"On target"** confirmation when you've successfully aimed at a pinned object
- **Tonight highlights** — ranked by brightness × altitude × interest
- **Search** — by name, Bayer designation, or constellation

### Rich object detail pages
Tap any object — in the SkyCompass, search results, or tonight's highlights — to open a full-screen detail modal with:
- **Hero image** — auto-fetched from Wikipedia/Wikimedia Commons (free, public-domain), cached for 30 days in localStorage
- **Tagline** — one-line poetic description
- **Overview tab** — multi-paragraph context, history, and significance
- **Data tab** — physical properties (mass, diameter, distance, age, etc.)
- **Viewing tab** — practical advice for finding/observing it
- **Fun fact tab** — a single surprising thing per object
- **Live position chips** — current alt/az, brightness, status
- **"Guide me to" button** — engages the directional arrow

Detail pages are populated for: all 8 planets, the Sun, the Moon, marquee stars (Sirius, Betelgeuse, Polaris, Vega, Arcturus, Rigel), iconic deep-sky objects (M31 Andromeda, M42 Orion, M45 Pleiades, M1 Crab, M51 Whirlpool), and all three tracked satellites. Other objects fall back to a clean basic-info card.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on your phone (use your local network IP — geolocation + motion APIs need real device sensors). For production motion permissions on iOS, you'll need HTTPS — deploy to Vercel, or use `ngrok` for local testing.

## Deploy

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cosmos-finder.git
git branch -M main
git push -u origin main
```

### Deploy to Vercel (free, ~90 seconds)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub
2. Click "Add New → Project," select `cosmos-finder`
3. Click Deploy. Defaults are correct.

You'll get a `https://cosmos-finder-xxx.vercel.app` URL that works on iOS with full sensor access.

## Architecture

```
src/
├── app/
│   ├── page.tsx           ← main shell, wires hooks + components
│   ├── layout.tsx
│   └── globals.css        ← Cormorant Garamond + Inter + JetBrains Mono
├── components/
│   ├── StartScanner.tsx       ← permission-gate hero
│   ├── SkyCompass.tsx         ← live circular sky map (SVG)
│   ├── ObjectCard.tsx         ← match details + "Tap for details"
│   ├── ObjectDetail.tsx       ← full-screen modal with rich content
│   ├── DirectionalGuide.tsx   ← animated arrow for off-screen targets
│   ├── SatelliteAlert.tsx     ← top-of-screen visible-now banner
│   ├── SearchPanel.tsx
│   └── TonightHighlights.tsx
├── hooks/
│   ├── useGeolocation.ts
│   ├── useDeviceOrientation.ts ← handles iOS requestPermission + webkitCompassHeading
│   ├── useSatellites.ts        ← loads TLEs once on mount
│   └── useSkyObjects.ts        ← recomputes catalog every 2s (for satellites)
└── lib/
    ├── astronomy/
    │   ├── coords.ts       ← GMST, RA/Dec → Alt/Az, angular distance
    │   ├── planets.ts      ← astronomy-engine wrapper
    │   ├── satellites.ts   ← satellite.js wrapper, TLE fetch, sunlit check
    │   └── matching.ts     ← ranking + closest-object engine + bearingTo
    └── data/
        ├── bright-stars.json
        ├── messier.json
        ├── constellations.json
        └── object-facts.ts  ← rich content for the detail page
```

### How identification works

1. **Geolocation** gives latitude/longitude
2. **DeviceOrientationEvent** gives compass heading (alpha) and tilt (beta)
3. **Stars/planets/deep-sky** are converted from equatorial (RA/Dec) → horizontal (Alt/Az) for the observer's exact location and time
4. **Satellites** are propagated from TLEs using SGP4 (via satellite.js), giving ECI coordinates that we transform to topocentric Alt/Az
5. We compute angular distance from the phone's pointing direction to every object and return the closest match

The math lives in `src/lib/astronomy/coords.ts`:
- `gmstHours(date)` — Greenwich Mean Sidereal Time (IAU 1982)
- `localSiderealTime(date, lon)` — observer's local sidereal time
- `equatorialToHorizontal(eq, lat, lon, date)` — RA/Dec → Alt/Az
- `angularDistance(a, b)` — spherical law of cosines

### Why these choices

- **No NASA APIs in v1.** NASA is great for imagery (APOD, mission photos) but not for live positional data. Astronomy Engine and satellite.js handle the math entirely client-side.
- **No Gaia.** Gaia DR3 has ~1.8 billion sources — too large for the browser. The 95 named stars cover everything visible to the naked eye in light-polluted skies.
- **CelesTrak for TLEs.** It's the canonical free source, has a CORS-friendly endpoint, and updates every few hours.
- **localStorage cache.** TLEs are valid for ~1 week but accuracy degrades after a few days. We cache for 1 hour and refetch — fresh enough for visual identification.

## iOS gotchas

- `DeviceOrientationEvent.requestPermission()` must be called from a user gesture (the "Begin Sky Scanner" button does this).
- iOS Safari fires `webkitCompassHeading` instead of using `alpha` for true north — the hook handles both.
- HTTPS is required for sensor APIs in production.
- If the compass feels off, the user may need to do the figure-8 calibration motion in the Compass app first.

## Roadmap (v2+)

- **Camera passthrough** — overlay labels on a live camera view (use `getUserMedia` + canvas)
- **Pass predictions** — "ISS will pass at 9:42 PM, 75° altitude, NW→SE" — needs a forward propagation loop, ~50 lines
- **More satellites** — bulk fetch the CelesTrak "visible" group (~150 satellites bright enough to see)
- **Starlink trains** — they're a separate CelesTrak group; flag freshly-launched batches that are still bunched together
- **More stars** — extend from 95 → ~3,000 (Yale Bright Star Catalog) by lazy-loading a binary blob
- **Constellation lines** — draw the stick-figure asterisms on the SkyCompass
- **Backend Gaia queries** — for "tap any random patch of sky" deep-zoom mode
- **Offline mode** — service worker + IndexedDB for the catalog
- **Sound design** — subtle audio when an object centers in the crosshair

## License

Yours to do whatever you want with. Star catalogs are public domain (Yale BSC, Messier, IAU). TLEs are public data via CelesTrak.
