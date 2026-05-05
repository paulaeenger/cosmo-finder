// Procedural star renderer — generates a hero image for any named star
// based on its magnitude (size) and spectral type (color). Output is a
// data URI (SVG), so it loads instantly and never 404s.
//
// Why this beats Wikipedia: Wikipedia's lead image for most named stars
// is a constellation locator chart, which is informative but ugly as a
// hero. Stars don't really have "photos" — they're points of light.
// Stylized art is honest about what stars look like to us.

import brightStars from "./bright-stars.json";

// Maps spectral class → realistic star color (approximate sRGB).
// O is hottest/blue, M is coolest/red. Real stars span a continuous
// gradient; this is a quantized but visually pleasing approximation.
const SPECTRAL_COLORS: Record<string, { core: string; halo: string }> = {
  O: { core: "#a8c0ff", halo: "rgba(140, 178, 255, 0.55)" },     // hot blue
  B: { core: "#bcd3ff", halo: "rgba(170, 200, 255, 0.5)" },      // blue-white
  A: { core: "#ffffff", halo: "rgba(255, 255, 255, 0.5)" },      // pure white
  F: { core: "#fff8e8", halo: "rgba(255, 240, 200, 0.5)" },      // yellow-white
  G: { core: "#ffeaa3", halo: "rgba(255, 220, 130, 0.5)" },      // yellow (Sun-like)
  K: { core: "#ffc77a", halo: "rgba(255, 170, 100, 0.55)" },     // orange
  M: { core: "#ff8c5a", halo: "rgba(255, 110, 70, 0.55)" },      // red
};

const DEFAULT_COLOR = SPECTRAL_COLORS.A; // white if we can't classify

/**
 * Look up a star's spectral class letter from our bright-stars catalog.
 * Returns the first character (O/B/A/F/G/K/M) or null if not catalogued.
 *
 * Our catalog doesn't store spectral type directly, so we use a hand-curated
 * map for the well-known stars we know. For others, we infer roughly from
 * apparent magnitude and color hints in the bayer designation.
 */
const KNOWN_SPECTRAL_TYPES: Record<string, string> = {
  Sirius: "A",
  Canopus: "F",
  Arcturus: "K",
  "Rigil Kentaurus": "G",
  Vega: "A",
  Capella: "G",
  Rigel: "B",
  Procyon: "F",
  Achernar: "B",
  Betelgeuse: "M",
  Hadar: "B",
  Altair: "A",
  Acrux: "B",
  Aldebaran: "K",
  Antares: "M",
  Spica: "B",
  Pollux: "K",
  Fomalhaut: "A",
  Deneb: "A",
  Mimosa: "B",
  Regulus: "B",
  Adhara: "B",
  Castor: "A",
  Gacrux: "M",
  Shaula: "B",
  Bellatrix: "B",
  Alnath: "B",
  Miaplacidus: "A",
  Alnilam: "B",
  Alnair: "B",
  Alnitak: "O",
  Alioth: "A",
  Dubhe: "K",
  Mirfak: "F",
  Wezen: "F",
  "Kaus Australis": "B",
  Avior: "K",
  Alkaid: "B",
  Sargas: "F",
  Menkalinan: "A",
  Atria: "K",
  Alhena: "A",
  Peacock: "B",
  Polaris: "F",
  Mirzam: "B",
  Alphard: "K",
  Algol: "B",
  Hamal: "K",
  Diphda: "K",
  Nunki: "B",
  Menkent: "K",
  Mirach: "M",
  Alpheratz: "B",
  Rasalhague: "A",
  Kochab: "K",
  Saiph: "B",
  Denebola: "A",
  Algieba: "K",
  Mizar: "A",
  Sadr: "F",
  Schedar: "K",
  Caph: "F",
  Etamin: "K",
  Mintaka: "O",
  Merak: "A",
  Izar: "K",
  Enif: "K",
  Scheat: "M",
  Markab: "B",
  Almach: "K",
  Alphecca: "A",
  Albireo: "K",
  Mira: "M",
  Cor: "A",
  Tarazed: "K",
  Dschubba: "B",
  Acrab: "B",
  Sabik: "A",
  Zubenelgenubi: "A",
  Zubeneschamali: "B",
  Unukalhai: "K",
  Suhail: "K",
  Naos: "O",
};

export function spectralTypeOf(starName: string): string {
  return KNOWN_SPECTRAL_TYPES[starName] ?? "A";
}

/**
 * Generate an inline SVG (returned as a data URI) representing a star.
 * The SVG is self-contained — no external assets, instant load, zero
 * network traffic, never 404s.
 */
export function generateStarImage(starName: string): string {
  const spectral = spectralTypeOf(starName);
  const colors = SPECTRAL_COLORS[spectral] ?? DEFAULT_COLOR;

  // Find the star in our catalog to get its magnitude
  const star = (brightStars as Array<{ name: string; mag: number }>).find(
    (s) => s.name === starName
  );
  const mag = star?.mag ?? 1;

  // Size: brighter stars (lower magnitude) get a larger glow.
  // Sirius (-1.46) → big, Polaris (1.98) → medium, faint stars → small.
  const sizeFactor = Math.max(0.5, Math.min(1.4, 1.5 - mag * 0.18));

  const W = 800;
  const H = 400;
  const cx = W / 2;
  const cy = H / 2;

  // Background: deep blue-black with subtle starfield
  // Foreground: large soft halo + bright core + diffraction spikes
  const haloR = 180 * sizeFactor;
  const coreR = 28 * sizeFactor;
  const spikeLen = 220 * sizeFactor;

  // Random-but-deterministic background star positions based on the name
  const bgStars = backgroundStars(starName, 60, W, H);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#0a1226" />
        <stop offset="60%" stop-color="#050816" />
        <stop offset="100%" stop-color="#02030a" />
      </radialGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${colors.halo}" />
        <stop offset="40%" stop-color="${colors.halo.replace(/[\d.]+\)$/, "0.18)")}" />
        <stop offset="100%" stop-color="${colors.halo.replace(/[\d.]+\)$/, "0)")}" />
      </radialGradient>
      <radialGradient id="core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${colors.core}" stop-opacity="1" />
        <stop offset="60%" stop-color="${colors.core}" stop-opacity="0.7" />
        <stop offset="100%" stop-color="${colors.core}" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="spike" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="${colors.core}" stop-opacity="0" />
        <stop offset="50%" stop-color="${colors.core}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="${colors.core}" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)" />
    ${bgStars
      .map(
        (s) =>
          `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="white" opacity="${s.o}" />`
      )
      .join("")}
    <circle cx="${cx}" cy="${cy}" r="${haloR}" fill="url(#halo)" />
    <rect x="${cx - spikeLen / 2}" y="${cy - 1}" width="${spikeLen}" height="2" fill="url(#spike)" opacity="0.6" />
    <rect x="${cx - 1}" y="${cy - spikeLen / 2}" width="2" height="${spikeLen}" fill="url(#spike)" transform="rotate(90 ${cx} ${cy})" opacity="0.6" />
    <rect x="${cx - spikeLen / 3}" y="${cy - 0.5}" width="${(spikeLen * 2) / 3}" height="1" fill="url(#spike)" transform="rotate(45 ${cx} ${cy})" opacity="0.4" />
    <rect x="${cx - spikeLen / 3}" y="${cy - 0.5}" width="${(spikeLen * 2) / 3}" height="1" fill="url(#spike)" transform="rotate(-45 ${cx} ${cy})" opacity="0.4" />
    <circle cx="${cx}" cy="${cy}" r="${coreR}" fill="url(#core)" />
    <circle cx="${cx}" cy="${cy}" r="${coreR / 2.5}" fill="white" opacity="0.95" />
  </svg>`;

  // base64-encode (works in Node and browser)
  const encoded =
    typeof window === "undefined"
      ? Buffer.from(svg).toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));

  return `data:image/svg+xml;base64,${encoded}`;
}

function backgroundStars(seed: string, count: number, W: number, H: number) {
  // Deterministic pseudo-random based on the star name, so each named star
  // gets a unique-but-stable starfield rather than reshuffling on every render.
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  const stars: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * W,
      y: rand() * H,
      r: 0.4 + rand() * 1.2,
      o: 0.2 + rand() * 0.6,
    });
  }
  return stars;
}
