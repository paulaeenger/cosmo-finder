// Rich, factual content for the detail page. Hand-curated rather than
// AI-generated so we don't hallucinate specs.

export type ObjectFacts = {
  tagline: string;
  overview: string;
  facts: { label: string; value: string }[];
  history?: string;
  viewing?: string;
  funFact?: string;
};

export const PLANET_FACTS: Record<string, ObjectFacts> = {
  Mercury: {
    tagline: "The smallest, fastest planet — closest to the Sun",
    overview:
      "Mercury whips around the Sun every 88 days, moving so fast that ancient Greeks named it after their messenger god. It has almost no atmosphere, so its surface temperature swings from -180°C at night to 430°C in daylight — the most extreme range in the solar system.",
    facts: [
      { label: "Diameter", value: "4,879 km (38% of Earth)" },
      { label: "Mass", value: "0.055 Earth masses" },
      { label: "Day length", value: "176 Earth days" },
      { label: "Year length", value: "88 Earth days" },
      { label: "Distance from Sun", value: "0.39 AU (58 million km)" },
      { label: "Moons", value: "None" },
      { label: "Surface gravity", value: "3.7 m/s² (38% of Earth)" },
    ],
    viewing:
      "Mercury never strays far from the Sun, so it's only visible for ~30 minutes after sunset or before sunrise, and never very high above the horizon. Look for it as a small, steady non-twinkling point.",
    funFact:
      "Mercury has ice. Despite being the closest planet to the Sun, permanently shadowed craters at its poles host frozen water deposits — confirmed by the MESSENGER mission in 2012.",
  },
  Venus: {
    tagline: "The brightest planet — Earth's hellish twin",
    overview:
      "Roughly the size and mass of Earth, Venus is wrapped in a thick CO₂ atmosphere with sulfuric acid clouds that reflect 76% of incoming sunlight. That's what makes it so brilliantly bright. Underneath, the surface is hot enough to melt lead — 465°C, hotter than Mercury's daytime side.",
    facts: [
      { label: "Diameter", value: "12,104 km (95% of Earth)" },
      { label: "Mass", value: "0.815 Earth masses" },
      { label: "Day length", value: "243 Earth days (longer than its year!)" },
      { label: "Year length", value: "225 Earth days" },
      { label: "Distance from Sun", value: "0.72 AU (108 million km)" },
      { label: "Atmosphere", value: "96.5% CO₂, with sulfuric acid clouds" },
      { label: "Surface temperature", value: "465°C" },
    ],
    viewing:
      "Venus is the third-brightest object in our sky after the Sun and Moon. Look for it low in the west after sunset (the 'evening star') or low in the east before sunrise (the 'morning star'). In a small telescope you can watch it go through phases like the Moon.",
    funFact:
      "Venus rotates backwards. While almost every other planet spins west-to-east, Venus turns east-to-west — the Sun rises in the west there. The likely cause: an ancient massive impact.",
  },
  Mars: {
    tagline: "The Red Planet — humanity's next destination",
    overview:
      "Mars is half the diameter of Earth and gets its rusty color from iron oxide dust covering the surface. It has the tallest volcano in the solar system (Olympus Mons, 22 km high) and a canyon system, Valles Marineris, that would stretch from New York to Los Angeles. Polar ice caps and seasonal CO₂ frost give Mars genuine seasons.",
    facts: [
      { label: "Diameter", value: "6,779 km (53% of Earth)" },
      { label: "Mass", value: "0.107 Earth masses" },
      { label: "Day length", value: "24h 37m" },
      { label: "Year length", value: "687 Earth days" },
      { label: "Distance from Sun", value: "1.52 AU (228 million km)" },
      { label: "Moons", value: "2 (Phobos & Deimos)" },
      { label: "Surface gravity", value: "3.7 m/s² (38% of Earth)" },
    ],
    viewing:
      "Mars has a distinctive orange-red tint visible to the naked eye. It's brightest during 'opposition' (every ~26 months) when Earth passes between Mars and the Sun. In a telescope you can see polar caps and dark surface markings.",
    funFact:
      "Mars has had liquid water flowing across it as recently as a few million years ago, and active rovers — Curiosity and Perseverance — are searching for signs that microbial life once thrived there.",
  },
  Jupiter: {
    tagline: "The king of planets — a failed star",
    overview:
      "Jupiter is so massive that it's more than twice the mass of all other planets combined. If it had been about 80 times more massive, it would have ignited as a star. Its swirling cloud bands are made of ammonia and water ice, driven by 600 km/h winds. The Great Red Spot is a storm larger than Earth that has been raging for at least 350 years.",
    facts: [
      { label: "Diameter", value: "139,820 km (11× Earth)" },
      { label: "Mass", value: "318 Earth masses" },
      { label: "Day length", value: "9h 56m (fastest in solar system)" },
      { label: "Year length", value: "11.86 Earth years" },
      { label: "Distance from Sun", value: "5.20 AU (778 million km)" },
      { label: "Known moons", value: "95 (Ganymede, Io, Europa, Callisto largest)" },
      { label: "Composition", value: "90% hydrogen, 10% helium" },
    ],
    viewing:
      "Jupiter is one of the brightest objects in the night sky. Even in cheap binoculars you can see its four largest moons (the Galilean moons) as tiny pinpricks alongside it — and they shift position from night to night.",
    funFact:
      "Jupiter's moon Europa hides a global ocean beneath its icy crust with twice the water of all Earth's oceans combined — and it's one of the most likely places in the solar system to find life.",
  },
  Saturn: {
    tagline: "The jewel of the solar system",
    overview:
      "Saturn's rings span 282,000 km but are only ~10 meters thick — a ratio comparable to a sheet of paper the size of a football field. They're made of countless ice and rock chunks, ranging from grains of sand to house-sized boulders. Saturn itself is so low-density (less than water) that it would float.",
    facts: [
      { label: "Diameter", value: "116,460 km (9.4× Earth)" },
      { label: "Mass", value: "95 Earth masses" },
      { label: "Day length", value: "10h 42m" },
      { label: "Year length", value: "29.5 Earth years" },
      { label: "Distance from Sun", value: "9.58 AU (1.43 billion km)" },
      { label: "Known moons", value: "146 (most of any planet)" },
      { label: "Ring span", value: "282,000 km wide" },
    ],
    viewing:
      "Saturn looks like a slightly dimmer Jupiter to the naked eye, but a small telescope reveals the rings — one of the most jaw-dropping sights in amateur astronomy. The ring tilt changes over years; they appear edge-on (invisible) every ~15 years.",
    funFact:
      "Saturn's moon Titan has lakes and rivers — but of liquid methane and ethane, not water. It's the only place besides Earth in our solar system with stable surface liquid.",
  },
  Uranus: {
    tagline: "The sideways ice giant",
    overview:
      "Uranus rotates on its side — its axis is tilted 98° from vertical, likely the result of a massive collision in its early history. This means each pole spends 42 years in continuous sunlight, then 42 years in darkness. Its pale cyan color comes from methane in the upper atmosphere absorbing red light.",
    facts: [
      { label: "Diameter", value: "50,724 km (4× Earth)" },
      { label: "Mass", value: "14.5 Earth masses" },
      { label: "Day length", value: "17h 14m" },
      { label: "Year length", value: "84 Earth years" },
      { label: "Distance from Sun", value: "19.2 AU (2.87 billion km)" },
      { label: "Axial tilt", value: "97.8° (rotates on its side)" },
      { label: "Known moons", value: "27" },
    ],
    viewing:
      "Uranus is on the edge of naked-eye visibility (mag ~5.7) under very dark skies — most people need binoculars. It looks like a small blue-green dot.",
    funFact:
      "It rains diamonds on Uranus. The pressure deep in its atmosphere is so extreme that carbon atoms get squeezed into diamond crystals that drift down through the planet.",
  },
  Neptune: {
    tagline: "The wind-blasted blue giant on the edge",
    overview:
      "Neptune is the windiest planet in the solar system, with storms reaching 2,100 km/h — faster than the speed of sound on Earth. Its deep blue color comes from methane absorption, similar to Uranus, but Neptune appears richer blue for reasons not fully understood. It was the first planet discovered through mathematical prediction (1846) rather than observation.",
    facts: [
      { label: "Diameter", value: "49,244 km (3.9× Earth)" },
      { label: "Mass", value: "17.1 Earth masses" },
      { label: "Day length", value: "16h 6m" },
      { label: "Year length", value: "165 Earth years" },
      { label: "Distance from Sun", value: "30.05 AU (4.5 billion km)" },
      { label: "Moons", value: "14 (Triton is largest)" },
      { label: "Wind speeds", value: "Up to 2,100 km/h" },
    ],
    viewing:
      "Neptune is too faint to see without optical aid (mag 7.8). In a telescope it appears as a tiny blue disk. Triton, its largest moon, is visible in larger amateur scopes.",
    funFact:
      "Neptune has only completed one full orbit since its 1846 discovery — it returned to its discovery position in 2011, 165 years later.",
  },
  Sun: {
    tagline: "Our star — the engine of everything",
    overview:
      "The Sun contains 99.86% of the mass of the entire solar system. Its core fuses 600 million tons of hydrogen into helium every second at a temperature of 15 million °C. Sunlight you see right now took 8 minutes 20 seconds to reach you — but that same energy spent ~100,000 years bouncing its way out of the Sun's interior before escaping.",
    facts: [
      { label: "Diameter", value: "1,391,400 km (109× Earth)" },
      { label: "Mass", value: "333,000 Earth masses" },
      { label: "Surface temperature", value: "5,500°C" },
      { label: "Core temperature", value: "15,000,000°C" },
      { label: "Age", value: "4.6 billion years" },
      { label: "Composition", value: "73% hydrogen, 25% helium" },
      { label: "Light travel time", value: "8 min 20 sec to Earth" },
    ],
    viewing:
      "Never look at the Sun without proper solar filters or eclipse glasses — even a brief glance through binoculars or a telescope can cause permanent blindness. During a partial or total solar eclipse, certified solar filters are essential.",
    funFact:
      "The Sun is not on fire. Fire requires oxygen and chemical combustion. The Sun is glowing because gravitational pressure is squeezing hydrogen atoms together hard enough to fuse them — a totally different process.",
  },
  Moon: {
    tagline: "Earth's only natural satellite",
    overview:
      "The Moon is the fifth-largest moon in the solar system and unusually large relative to its planet. It's slowly drifting away from Earth at 3.8 cm per year. The same face always points toward us because tidal forces have synchronized its rotation and orbit — but we actually see ~59% of the surface over time due to libration.",
    facts: [
      { label: "Diameter", value: "3,474 km (27% of Earth)" },
      { label: "Mass", value: "0.0123 Earth masses" },
      { label: "Distance", value: "384,400 km average" },
      { label: "Orbital period", value: "27.3 days" },
      { label: "Phase cycle", value: "29.5 days (synodic month)" },
      { label: "Surface gravity", value: "1.62 m/s² (17% of Earth)" },
      { label: "Age", value: "4.5 billion years" },
    ],
    viewing:
      "First-quarter and last-quarter phases offer the best detail through binoculars or a telescope, when long shadows along the terminator (day-night line) bring out crater relief. Full moon is impressive but flat — the lack of shadows washes out detail.",
    funFact:
      "The Moon almost certainly formed from a Mars-sized body, named Theia, slamming into the early Earth ~4.5 billion years ago. The debris coalesced into the Moon within just a few hundred years.",
  },
};

export const STAR_FACTS: Record<string, ObjectFacts> = {
  Sirius: {
    tagline: "The brightest star in the night sky",
    overview:
      "Sirius is twice the mass of the Sun and 25 times more luminous, but it appears so brilliant mainly because it's nearby — only 8.6 light-years away. It's actually a binary system: a tiny white dwarf companion (Sirius B), the first ever discovered, orbits it every 50 years.",
    facts: [
      { label: "Distance", value: "8.6 light-years" },
      { label: "Magnitude", value: "-1.46 (brightest in the sky)" },
      { label: "Spectral type", value: "A1V (hot white-blue)" },
      { label: "Mass", value: "2.06 Suns" },
      { label: "Surface temperature", value: "9,940°C" },
      { label: "Companion", value: "Sirius B (white dwarf)" },
    ],
    viewing:
      "Find Orion's belt and follow it down-left — Sirius is the brilliant blue-white star you'll arrive at. It twinkles dramatically when low to the horizon, often flashing through colors.",
    funFact:
      "The ancient Egyptians used Sirius's first appearance at dawn (its 'heliacal rising') to predict the annual Nile flood. Their calendar was built around this star.",
  },
  Betelgeuse: {
    tagline: "The red supergiant about to explode",
    overview:
      "Betelgeuse is so enormous that if it sat where the Sun is, it would swallow Mercury, Venus, Earth, Mars, and reach near Jupiter's orbit. It's nearing the end of its life and will go supernova — sometime in the next 100,000 years. When it does, it'll briefly outshine the full Moon and be visible in daylight.",
    facts: [
      { label: "Distance", value: "642 light-years" },
      { label: "Magnitude", value: "0.50 (variable)" },
      { label: "Spectral type", value: "M1-2 (red supergiant)" },
      { label: "Diameter", value: "~700× the Sun" },
      { label: "Mass", value: "~17 Suns" },
      { label: "Age", value: "~10 million years" },
    ],
    viewing:
      "The reddish-orange star marking Orion's right shoulder. Compare its color to bluish Rigel at Orion's foot — the contrast is striking.",
    funFact:
      "In late 2019 Betelgeuse mysteriously dimmed by half, sparking speculation that supernova was imminent. Turns out it had ejected a massive cloud of dust that briefly blocked our view.",
  },
  Polaris: {
    tagline: "The North Star — Earth's celestial pole",
    overview:
      "Polaris sits less than 1° from the celestial north pole, which is why it appears nearly stationary as Earth rotates. Every other star in the northern sky wheels around it. It's actually a triple-star system with a yellow supergiant primary that's ~2,000× more luminous than the Sun.",
    facts: [
      { label: "Distance", value: "433 light-years" },
      { label: "Magnitude", value: "1.98 (variable Cepheid)" },
      { label: "Spectral type", value: "F7Ib (yellow supergiant)" },
      { label: "Mass", value: "5.4 Suns" },
      { label: "Diameter", value: "37× the Sun" },
      { label: "Pole distance", value: "0.66°" },
    ],
    viewing:
      "Find the Big Dipper, then follow the line through the two stars at the end of its 'cup' — they point directly at Polaris.",
    funFact:
      "Polaris won't always be the North Star. Earth's axis wobbles over a 26,000-year cycle (precession). In ~13,000 years, Vega will be the pole star instead.",
  },
  Vega: {
    tagline: "The future pole star",
    overview:
      "Vega is one of the most studied stars in the sky after the Sun. It rotates so fast (once every 12.5 hours) that it's noticeably squashed — its equator bulges 19% wider than its poles. A debris disk surrounding it suggests planet formation may be underway.",
    facts: [
      { label: "Distance", value: "25 light-years" },
      { label: "Magnitude", value: "0.03" },
      { label: "Spectral type", value: "A0V (white)" },
      { label: "Mass", value: "2.1 Suns" },
      { label: "Age", value: "455 million years" },
      { label: "Rotation period", value: "12.5 hours" },
    ],
    viewing:
      "The brilliant blue-white star high overhead in summer evenings (Northern Hemisphere). It anchors the Summer Triangle along with Deneb and Altair.",
    funFact:
      "Vega was the first star ever photographed (1850) and the first to have its spectrum recorded — making it the foundational reference for stellar magnitude scales.",
  },
  Arcturus: {
    tagline: "The orange giant racing through our galaxy",
    overview:
      "Arcturus is the brightest star in the northern celestial hemisphere. Unusually for a bright star, it's not part of our galaxy's spiral disk — it's a member of an older 'halo' population, plunging through our region at 122 km/s. In about 4,000 years it will have moved noticeably from its current position.",
    facts: [
      { label: "Distance", value: "36.7 light-years" },
      { label: "Magnitude", value: "-0.05" },
      { label: "Spectral type", value: "K1.5III (orange giant)" },
      { label: "Diameter", value: "25× the Sun" },
      { label: "Age", value: "~7 billion years" },
      { label: "Velocity", value: "122 km/s relative to Sun" },
    ],
    viewing:
      "Follow the curve of the Big Dipper's handle outward — 'arc to Arcturus.' It's the warm orange star at the end of that curve.",
    funFact:
      "Arcturus's light was used to switch on the lights at the 1933 Chicago World's Fair. The star is 37 light-years away — exactly the time since the previous fair in 1893.",
  },
  Rigel: {
    tagline: "Orion's brilliant blue foot",
    overview:
      "Rigel is one of the most luminous stars visible to the naked eye — it puts out 120,000 times the light of our Sun. Despite Betelgeuse being designated 'Alpha Orionis,' Rigel ('Beta') is usually the brighter of the two. It's a multiple-star system with at least four components.",
    facts: [
      { label: "Distance", value: "860 light-years" },
      { label: "Magnitude", value: "0.13" },
      { label: "Spectral type", value: "B8Ia (blue supergiant)" },
      { label: "Mass", value: "21 Suns" },
      { label: "Luminosity", value: "120,000× Sun" },
      { label: "Diameter", value: "78× the Sun" },
    ],
    viewing:
      "The bright blue-white star at the bottom-right of Orion (lower-left in the Southern Hemisphere). The color contrast with Betelgeuse on the opposite corner is striking.",
    funFact:
      "Rigel will end its life as a supernova within the next few million years, leaving behind either a neutron star or a black hole.",
  },
};

export const DEEPSKY_FACTS: Record<string, ObjectFacts> = {
  M31: {
    tagline: "Our nearest large galactic neighbor",
    overview:
      "The Andromeda Galaxy contains roughly a trillion stars — about twice as many as our Milky Way — and spans 220,000 light-years across. It's the most distant object visible to the naked eye, and it's hurtling toward us at 110 km/s. In about 4.5 billion years it will collide and merge with the Milky Way to form a single elliptical galaxy.",
    facts: [
      { label: "Distance", value: "2.5 million light-years" },
      { label: "Magnitude", value: "3.4" },
      { label: "Type", value: "Spiral galaxy (SA(s)b)" },
      { label: "Diameter", value: "220,000 light-years" },
      { label: "Stars", value: "~1 trillion" },
      { label: "Mass", value: "1.5 trillion Suns" },
    ],
    viewing:
      "Look between the constellations Andromeda and Cassiopeia. To the naked eye it's a faint smudge; binoculars show its bright core; a telescope reveals dust lanes and two satellite galaxies (M32 and M110).",
    funFact:
      "The light hitting your eyes from Andromeda right now left the galaxy 2.5 million years ago — when our human ancestors were just beginning to use stone tools.",
  },
  M42: {
    tagline: "A stellar nursery 1,344 light-years away",
    overview:
      "The Orion Nebula is one of the most studied objects in deep-sky astronomy. It's an active stellar nursery where hundreds of new stars are forming inside dense clouds of hydrogen gas, illuminated by the four bright young stars at its heart called the Trapezium. The whole nebula is part of a much larger cloud complex spanning the constellation of Orion.",
    facts: [
      { label: "Distance", value: "1,344 light-years" },
      { label: "Magnitude", value: "4.0" },
      { label: "Type", value: "Emission nebula (H II region)" },
      { label: "Diameter", value: "24 light-years" },
      { label: "Mass", value: "~2,000 Suns of gas" },
      { label: "Age", value: "<1 million years (very young)" },
    ],
    viewing:
      "Visible to the naked eye as the fuzzy 'middle star' of Orion's sword, hanging below his belt. Even small binoculars reveal its glow; a telescope shows the wing-like structure and the four Trapezium stars.",
    funFact:
      "The Orion Nebula has been observed since at least 1610, but ancient stargazers somehow missed mentioning it — Ptolemy and the Maya, both meticulous sky-watchers, never recorded it.",
  },
  M45: {
    tagline: "The Seven Sisters — a young open cluster",
    overview:
      "The Pleiades is one of the closest and most photographed star clusters. It contains over 1,000 confirmed stars, but only the seven brightest are visible to the naked eye. The cluster is just 100 million years old (very young as stars go) and is currently passing through a cloud of interstellar dust that gives the brighter stars a beautiful blue reflection nebula halo.",
    facts: [
      { label: "Distance", value: "444 light-years" },
      { label: "Magnitude", value: "1.6" },
      { label: "Type", value: "Open star cluster" },
      { label: "Stars", value: "~1,000+" },
      { label: "Age", value: "~100 million years" },
      { label: "Diameter", value: "8 light-years" },
    ],
    viewing:
      "A tight, dipper-shaped clump of blue stars northwest of Orion. Most people see 6 stars with the naked eye; sharp eyes see 7-9. Binoculars reveal dozens more.",
    funFact:
      "The Pleiades appears in mythology across nearly every continent — Greek, Maori, Aboriginal Australian, Lakota, Japanese (Subaru), Norse — making it one of the most universally recognized objects in the sky.",
  },
  M1: {
    tagline: "The remnant of a 1054 supernova",
    overview:
      "The Crab Nebula is what's left of a star that Chinese astronomers watched explode in 1054 AD — they recorded a 'guest star' bright enough to be visible in daylight for 23 days. At its center spins a pulsar, the collapsed neutron-star core of the original star, rotating 30 times per second and sweeping radio beams across Earth.",
    facts: [
      { label: "Distance", value: "6,500 light-years" },
      { label: "Magnitude", value: "8.4" },
      { label: "Type", value: "Supernova remnant" },
      { label: "Diameter", value: "11 light-years" },
      { label: "Pulsar period", value: "33 milliseconds" },
      { label: "Expansion rate", value: "1,500 km/s" },
    ],
    viewing:
      "Requires a telescope and dark skies. Look for it near the southern horn of Taurus (Zeta Tauri). At low magnification it's a faint oval smudge.",
    funFact:
      "The Crab pulsar emits more energy in a single second than the Sun does in a year — the leftover rotational kinetic energy of an entire star compressed into a city-sized sphere.",
  },
  M51: {
    tagline: "The Whirlpool — galaxies caught in collision",
    overview:
      "M51 is two galaxies in the act of merging. The larger spiral (NGC 5194) is being distorted by the gravity of its smaller companion (NGC 5195), which is currently passing behind it. The interaction has triggered intense star formation along M51's spiral arms, making them unusually bright and well-defined.",
    facts: [
      { label: "Distance", value: "23 million light-years" },
      { label: "Magnitude", value: "8.4" },
      { label: "Type", value: "Interacting spiral galaxies" },
      { label: "Diameter", value: "60,000 light-years" },
      { label: "Companion", value: "NGC 5195 (smaller dwarf)" },
    ],
    viewing:
      "In the constellation Canes Venatici, just below the Big Dipper's handle. Visible as a fuzzy patch in binoculars; a 6-inch+ telescope reveals the spiral structure.",
    funFact:
      "M51 was the first galaxy in which spiral structure was identified — by Lord Rosse in 1845, using a 72-inch reflector that was the largest telescope in the world for over 70 years.",
  },
};

export const SATELLITE_FACTS: Record<string, ObjectFacts> = {
  "ISS (ZARYA)": {
    tagline: "Humanity's home in space",
    overview:
      "The International Space Station is the largest object humans have ever placed in orbit — about the size of an American football field, including the solar arrays. It's been continuously occupied since November 2000, making it the longest sustained human presence in space. It orbits at ~408 km altitude and circles Earth every 93 minutes, meaning the crew sees 16 sunrises and sunsets every day.",
    facts: [
      { label: "Altitude", value: "~408 km" },
      { label: "Orbital speed", value: "27,600 km/h (7.66 km/s)" },
      { label: "Orbital period", value: "92.9 minutes" },
      { label: "Mass", value: "420,000 kg" },
      { label: "Pressurized volume", value: "916 m³" },
      { label: "Crew size", value: "Typically 7" },
      { label: "Construction started", value: "1998" },
    ],
    viewing:
      "When sunlit and overhead, the ISS appears as a brilliant non-twinkling 'star' moving steadily across the sky in 4-6 minutes. It's the third-brightest object in the sky after the Sun and Moon. Best viewed within 1-2 hours of dawn or dusk, when it's lit but you're in shadow.",
    funFact:
      "The ISS travels so fast that astronauts on board age very slightly slower than people on the ground — about 0.007 seconds per 6-month mission, due to special relativity.",
  },
  TIANGONG: {
    tagline: "China's permanent orbital outpost",
    overview:
      "Tiangong (天宫, 'Heavenly Palace') is China's modular space station, completed in late 2022. It has three modules — Tianhe (core), Wentian, and Mengtian — and houses a crew of three on six-month rotations. It's roughly a fifth the mass of the ISS but designed for a 10-15 year operational life.",
    facts: [
      { label: "Altitude", value: "~390 km" },
      { label: "Orbital speed", value: "~27,500 km/h" },
      { label: "Mass", value: "~100,000 kg" },
      { label: "Modules", value: "3 (Tianhe, Wentian, Mengtian)" },
      { label: "Crew size", value: "3" },
      { label: "First launch", value: "April 2021" },
    ],
    viewing:
      "Visible as a steadily moving point of light, similar to (but dimmer than) the ISS. Track it the same way: look near dawn or dusk passes when it's sunlit against a dark sky.",
    funFact:
      "Tiangong is the third permanently crewed station China has launched; the previous two (Tiangong-1 and Tiangong-2) were prototypes that have since been deorbited.",
  },
  HST: {
    tagline: "The telescope that rewrote astronomy",
    overview:
      "The Hubble Space Telescope was launched in 1990 and has been operating above Earth's atmosphere ever since. By orbiting outside the distortion of our atmosphere, it captures sharper images than any ground-based telescope of its size. Its observations have determined the universe's age, confirmed accelerating expansion, and produced some of the most iconic images in science.",
    facts: [
      { label: "Altitude", value: "~540 km" },
      { label: "Mirror diameter", value: "2.4 m" },
      { label: "Mass", value: "11,110 kg" },
      { label: "Length", value: "13.2 m" },
      { label: "Launched", value: "April 24, 1990" },
      { label: "Servicing missions", value: "5 (last in 2009)" },
    ],
    viewing:
      "Hubble is faint (around magnitude 2-3 at best) and requires you to know exactly where to look — but it does pass overhead and is technically visible to the naked eye. Track its passes via the app's tonight feed.",
    funFact:
      "Hubble's launch mirror was famously flawed — ground polished to the wrong shape — producing blurry images for its first three years until astronauts installed corrective optics on a 1993 spacewalk, a repair often compared to fitting glasses on a telescope.",
  },
};

export function getObjectFacts(name: string, kind: string): ObjectFacts | null {
  if (kind === "planet" || kind === "moon" || kind === "sun") {
    return PLANET_FACTS[name] ?? null;
  }
  if (kind === "star") {
    return STAR_FACTS[name] ?? null;
  }
  if (kind === "deep-sky") {
    // deep-sky names are like "M31 — Andromeda Galaxy" — extract the M-id
    const idMatch = name.match(/^M(\d+)/);
    if (idMatch) {
      const key = `M${idMatch[1]}`;
      return DEEPSKY_FACTS[key] ?? null;
    }
    return null;
  }
  if (kind === "satellite") {
    return SATELLITE_FACTS[name] ?? null;
  }
  return null;
}
