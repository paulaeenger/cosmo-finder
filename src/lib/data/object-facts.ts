// Hand-curated content for the detail page. Written in a substantive,
// informational register — closer to a planetarium guide or a Patrick
// Moore astronomy book than a Buzzfeed listicle.
//
// Voice notes:
//   - Declarative, factual, specific
//   - Lead with what something IS, not with a rhetorical hook
//   - "Significance" replaces the old "Fun Fact" — surfaces historical,
//     scientific, or cultural importance rather than trivia
//   - Numbers cited where they sharpen meaning, omitted where they don't

export type ObjectFacts = {
  tagline: string;
  overview: string;
  facts: { label: string; value: string }[];
  history?: string;
  viewing?: string;
  /** Historical, scientific, or cultural importance. */
  significance?: string;
  /** Backward compatibility alias. Components should prefer significance. */
  funFact?: string;
};

export const PLANET_FACTS: Record<string, ObjectFacts> = {
  Mercury: {
    tagline: "The innermost planet of the solar system",
    overview:
      "Mercury orbits closer to the Sun than any other planet, completing one revolution every 88 Earth days. It has only a tenuous exosphere of atoms knocked from its surface by solar radiation, so heat is not retained between day and night. Surface temperatures swing from approximately 430°C on the sunlit side to -180°C in shadow — the largest diurnal range of any planet. Its surface, photographed in detail by NASA's MESSENGER mission, is heavily cratered and resembles the Moon.",
    facts: [
      { label: "Diameter", value: "4,879 km (38% of Earth)" },
      { label: "Mass", value: "0.055 Earth masses" },
      { label: "Mean distance from Sun", value: "0.39 AU (57.9 million km)" },
      { label: "Orbital period", value: "88 Earth days" },
      { label: "Rotational period", value: "58.6 Earth days" },
      { label: "Solar day length", value: "176 Earth days" },
      { label: "Surface gravity", value: "3.7 m/s² (0.38 g)" },
      { label: "Moons", value: "None" },
    ],
    viewing:
      "Mercury is visible only briefly near the horizon at dusk or dawn, never appearing more than 28° from the Sun. Eastern elongations (evening apparitions) and western elongations (morning apparitions) occur three to four times each year and last about two weeks. Mercury appears as a steady, non-twinkling point of moderate brightness.",
    significance:
      "Permanently shadowed craters at Mercury's poles preserve water ice despite the planet's proximity to the Sun. The MESSENGER mission, which orbited Mercury from 2011 to 2015, confirmed deposits of frozen water and complex organic compounds at both poles, expanding the known range of environments where water can persist in the inner solar system.",
  },

  Venus: {
    tagline: "The second planet from the Sun",
    overview:
      "Venus is comparable to Earth in mass and diameter but the two planets evolved very differently. A dense atmosphere of carbon dioxide, ninety times the surface pressure of Earth's, drives a runaway greenhouse effect that holds the surface at 465°C — hotter than Mercury's daylit side. Sulfuric acid clouds reflect three-quarters of incoming sunlight, which is what makes Venus appear so bright in our sky. The Soviet Venera landers in the 1970s and 1980s remain the only spacecraft to have transmitted images from the surface; each survived less than two hours in the heat and pressure.",
    facts: [
      { label: "Diameter", value: "12,104 km (95% of Earth)" },
      { label: "Mass", value: "0.815 Earth masses" },
      { label: "Mean distance from Sun", value: "0.72 AU (108 million km)" },
      { label: "Orbital period", value: "224.7 Earth days" },
      { label: "Rotational period", value: "243 Earth days (retrograde)" },
      { label: "Surface temperature", value: "465°C (uniform day and night)" },
      { label: "Surface pressure", value: "92 bar" },
      { label: "Atmosphere", value: "96.5% CO₂, 3.5% N₂" },
    ],
    viewing:
      "Venus is the third-brightest object in the sky after the Sun and Moon, and is conspicuous low in the west after sunset (the 'evening star') or low in the east before sunrise (the 'morning star'). A small telescope reveals phases analogous to those of the Moon — Galileo's observation of these phases in 1610 was a pivotal proof that the planets orbit the Sun rather than the Earth.",
    significance:
      "Venus rotates retrograde — opposite to its orbital direction and to nearly every other body in the solar system. The most likely explanation is a major impact early in its history, though tidal interaction with its dense atmosphere may also have contributed. Its rotation is so slow that a Venusian solar day is shorter than its sidereal day, making it the only planet where the Sun rises in the west.",
  },

  Mars: {
    tagline: "The fourth planet from the Sun",
    overview:
      "Mars has roughly half Earth's diameter and a tenth its mass. Its thin atmosphere — primarily carbon dioxide at less than one percent of Earth's surface pressure — supports seasonal CO₂ frost at the poles and global dust storms that occasionally envelop the entire planet. The reddish surface color comes from iron oxide. Mars hosts the largest volcano in the solar system, Olympus Mons (22 km tall, 600 km wide), and Valles Marineris, a canyon system 4,000 km long. Active rover missions have confirmed that liquid water once flowed across the surface.",
    facts: [
      { label: "Diameter", value: "6,779 km (53% of Earth)" },
      { label: "Mass", value: "0.107 Earth masses" },
      { label: "Mean distance from Sun", value: "1.52 AU (228 million km)" },
      { label: "Orbital period", value: "687 Earth days" },
      { label: "Rotational period", value: "24h 37m" },
      { label: "Axial tilt", value: "25.2° (similar to Earth's)" },
      { label: "Surface gravity", value: "3.7 m/s² (0.38 g)" },
      { label: "Moons", value: "Phobos and Deimos" },
    ],
    viewing:
      "Mars is brightest during opposition, when Earth passes between Mars and the Sun, occurring approximately every 26 months. At opposition, Mars can be the brightest planet aside from Venus. Color is visibly orange-red even to the naked eye. Telescopic observation reveals polar ice caps and dark surface markings; Syrtis Major was the first surface feature ever recorded on another planet, by Christiaan Huygens in 1659.",
    significance:
      "Mars is the most thoroughly explored planet besides Earth. The Curiosity and Perseverance rovers have confirmed that the Gale and Jezero craters were once hospitable lake environments, and Perseverance is currently caching rock samples for a planned return-to-Earth mission. If life ever existed on Mars, the evidence is most likely preserved in the sediments these rovers are sampling.",
  },

  Jupiter: {
    tagline: "The largest planet in the solar system",
    overview:
      "Jupiter contains more than twice the mass of all other planets combined. It is composed primarily of hydrogen and helium, with no defined surface — atmospheric pressure increases continuously with depth until hydrogen transitions to a metallic liquid state thousands of kilometers down. The visible cloud bands are driven by 600 km/h winds and powerful Coriolis forces from Jupiter's rapid 10-hour rotation. The Great Red Spot, a high-pressure storm larger than Earth, has been continuously observed since at least the 1830s.",
    facts: [
      { label: "Diameter", value: "139,820 km (11.2× Earth)" },
      { label: "Mass", value: "318 Earth masses" },
      { label: "Mean distance from Sun", value: "5.20 AU (778 million km)" },
      { label: "Orbital period", value: "11.86 Earth years" },
      { label: "Rotational period", value: "9h 56m (fastest in solar system)" },
      { label: "Composition", value: "~90% hydrogen, ~10% helium" },
      { label: "Confirmed moons", value: "95" },
      { label: "Ring system", value: "Faint, primarily dust" },
    ],
    viewing:
      "Jupiter is among the brightest objects in the night sky and is unmistakable when above the horizon. Binoculars resolve the four Galilean moons — Io, Europa, Ganymede, and Callisto — as small points of light flanking the planet, with their positions visibly changing from night to night. A modest telescope reveals the equatorial cloud bands and, when oriented correctly, the Great Red Spot.",
    significance:
      "Jupiter's gravitational influence shapes the architecture of the solar system. It is large enough to perturb the orbits of comets and asteroids, and many planetary scientists argue that Jupiter has historically deflected impactors away from the inner planets, though the protective effect is contested. Beneath the icy crust of its moon Europa lies a global liquid-water ocean estimated to contain twice the volume of all Earth's oceans, making it among the most promising sites in the solar system to search for extant life.",
  },

  Saturn: {
    tagline: "The sixth planet from the Sun",
    overview:
      "Saturn is the second-largest planet and the only one whose mean density (0.69 g/cm³) is less than that of water. Its ring system spans 282,000 km in width but is generally less than 100 meters thick — composed of countless particles of water ice and rock ranging from dust grains to boulders. The rings are believed to be young in geological terms, perhaps less than 100 million years old, and may be the debris of a disrupted moon. The Cassini spacecraft, in orbit from 2004 to 2017, transformed our understanding of the Saturnian system before plunging into the planet at the end of its mission.",
    facts: [
      { label: "Diameter", value: "116,460 km (9.4× Earth)" },
      { label: "Mass", value: "95 Earth masses" },
      { label: "Mean distance from Sun", value: "9.58 AU (1.43 billion km)" },
      { label: "Orbital period", value: "29.5 Earth years" },
      { label: "Rotational period", value: "10h 42m" },
      { label: "Ring span", value: "282,000 km wide, ~10–100 m thick" },
      { label: "Confirmed moons", value: "146 (most of any planet)" },
      { label: "Mean density", value: "0.69 g/cm³ (less than water)" },
    ],
    viewing:
      "Saturn appears to the naked eye as a steady, yellowish point similar in brightness to the brighter stars. Even a small telescope reveals the rings as a clearly separated ellipse around the planet — one of the most striking sights in amateur astronomy. The ring tilt varies over Saturn's 29.5-year orbit, appearing edge-on (and effectively invisible) approximately every 15 years.",
    significance:
      "Saturn's moon Titan is the only world besides Earth known to host stable surface liquids. Lakes and rivers of liquid methane and ethane cover Titan's polar regions, and a complex hydrocarbon weather cycle drives precipitation, erosion, and seasonal change. A second moon, Enceladus, vents plumes of water ice from a subsurface ocean, making it another leading candidate in the search for extraterrestrial life.",
  },

  Uranus: {
    tagline: "The seventh planet from the Sun",
    overview:
      "Uranus is an ice giant — primarily composed of water, methane, and ammonia ices surrounding a small rocky core, distinguishing it from the gas giants Jupiter and Saturn. Its axis is tilted 97.8° from vertical, meaning the planet rotates on its side; this likely results from a large impact early in its history. As a consequence, each pole experiences continuous sunlight for 42 years followed by 42 years of darkness. The pale cyan color is produced by methane in the upper atmosphere absorbing red wavelengths of sunlight.",
    facts: [
      { label: "Diameter", value: "50,724 km (4× Earth)" },
      { label: "Mass", value: "14.5 Earth masses" },
      { label: "Mean distance from Sun", value: "19.2 AU (2.87 billion km)" },
      { label: "Orbital period", value: "84 Earth years" },
      { label: "Rotational period", value: "17h 14m (retrograde)" },
      { label: "Axial tilt", value: "97.8°" },
      { label: "Confirmed moons", value: "27" },
      { label: "Discovered", value: "1781 by William Herschel" },
    ],
    viewing:
      "Uranus is at the threshold of naked-eye visibility under genuinely dark skies (magnitude 5.7). It appears as a pale blue-green dot in binoculars; a telescope reveals only a small disc with little surface detail visible from Earth. It was the first planet discovered with a telescope, and the first not known to ancient astronomers.",
    significance:
      "Uranus and Neptune are the only major planets in the solar system that have not been studied by a dedicated orbital mission. Voyager 2's brief 1986 flyby remains the source of most of what is known about Uranus up close. The 2023 Planetary Science Decadal Survey identified a Uranus orbiter and probe as the highest-priority flagship mission for the coming decade — a launch is targeted for the early 2030s.",
  },

  Neptune: {
    tagline: "The eighth and outermost planet",
    overview:
      "Neptune is the most distant of the major planets, similar in size and composition to Uranus but slightly more massive. Its deep blue color exceeds what methane absorption alone would predict and remains incompletely explained. Atmospheric winds reach 2,100 km/h, the fastest measured on any planet, despite Neptune receiving only 0.1% the solar energy that reaches Earth. Neptune was the first planet discovered through mathematical prediction: irregularities in Uranus's orbit led astronomers to calculate the position of an unseen perturbing body, which was then confirmed observationally in 1846.",
    facts: [
      { label: "Diameter", value: "49,244 km (3.9× Earth)" },
      { label: "Mass", value: "17.1 Earth masses" },
      { label: "Mean distance from Sun", value: "30.05 AU (4.5 billion km)" },
      { label: "Orbital period", value: "164.8 Earth years" },
      { label: "Rotational period", value: "16h 6m" },
      { label: "Wind speeds", value: "Up to 2,100 km/h" },
      { label: "Confirmed moons", value: "14" },
      { label: "Discovered", value: "1846 (Le Verrier, Galle, Adams)" },
    ],
    viewing:
      "Neptune is too faint to observe with the unaided eye, requiring binoculars or a telescope. Through a small telescope it appears as a tiny blue disc, distinguishable from a star primarily by its color and slight non-stellar appearance at high magnification. Its largest moon, Triton, is visible in larger amateur instruments.",
    significance:
      "Neptune has completed only one full orbit since its discovery — it returned to its 1846 discovery position in 2011. Its largest moon, Triton, orbits in retrograde and is almost certainly a captured Kuiper Belt object similar to Pluto. Triton is geologically active, with cryovolcanoes erupting nitrogen ice, and was photographed up close only once, by Voyager 2 in 1989.",
  },

  Sun: {
    tagline: "The star at the center of the solar system",
    overview:
      "The Sun is a G-type main-sequence star approximately 4.6 billion years old and roughly halfway through its hydrogen-fusion lifetime. It contains 99.86% of the total mass of the solar system. In its core, hydrogen is fused into helium at a rate of approximately 600 million tons per second, releasing the energy that sustains every form of life on Earth. The light that reaches Earth from the Sun's surface left it 8 minutes and 20 seconds earlier, but the energy in that light spent on the order of 100,000 years diffusing outward from the core.",
    facts: [
      { label: "Diameter", value: "1,391,400 km (109× Earth)" },
      { label: "Mass", value: "1.989 × 10³⁰ kg (333,000 Earth masses)" },
      { label: "Surface temperature", value: "5,500°C (photosphere)" },
      { label: "Core temperature", value: "15,000,000°C" },
      { label: "Composition", value: "73% hydrogen, 25% helium, 2% heavier" },
      { label: "Spectral class", value: "G2V (yellow main sequence)" },
      { label: "Age", value: "4.6 billion years" },
      { label: "Light-time to Earth", value: "8 min 20 sec" },
    ],
    viewing:
      "The Sun must never be observed directly without certified solar filters. Brief unaided viewing causes permanent retinal damage; observation through unfiltered binoculars or a telescope causes immediate blindness. Eclipse glasses certified to ISO 12312-2, or properly filtered solar telescopes, are essential. Sunspots, prominences, and the corona during total eclipses are among the most dramatic sights in observational astronomy when proper precautions are taken.",
    significance:
      "The Sun's energy output has increased approximately 30% since the formation of the solar system and will continue to brighten as it consumes its hydrogen fuel. In roughly 5 billion years it will exhaust core hydrogen, expand into a red giant large enough to engulf Mercury and possibly Earth, and ultimately shed its outer layers to leave behind a slowly cooling white dwarf about the size of Earth. The carbon and oxygen in your body were forged in earlier-generation stars that lived and died before the Sun ever formed.",
  },

  Moon: {
    tagline: "Earth's only natural satellite",
    overview:
      "The Moon is the fifth-largest natural satellite in the solar system and is unusually large relative to its parent planet — approximately 27% of Earth's diameter. Its rotation period equals its orbital period, a state called tidal locking, which is why the same hemisphere always faces Earth. The lunar surface preserves an extraordinary record of the early solar system because, unlike Earth, it has neither plate tectonics nor weather to erase impact craters. The Apollo program returned 382 kg of lunar samples between 1969 and 1972, transforming planetary science.",
    facts: [
      { label: "Diameter", value: "3,474 km (27% of Earth)" },
      { label: "Mass", value: "7.342 × 10²² kg (1.2% of Earth)" },
      { label: "Mean distance from Earth", value: "384,400 km" },
      { label: "Orbital period", value: "27.3 days (sidereal)" },
      { label: "Phase cycle", value: "29.5 days (synodic)" },
      { label: "Surface gravity", value: "1.62 m/s² (0.165 g)" },
      { label: "Surface temperature", value: "-173°C to 127°C" },
      { label: "Recession rate", value: "3.8 cm per year" },
    ],
    viewing:
      "The Moon is best observed at first or last quarter, when shadows along the terminator (the day-night boundary) reveal crater relief in three dimensions. Full Moon, although bright, is visually flat — the lack of shadow obscures topography. Binoculars are sufficient to study major craters, lunar maria (the dark plains of solidified lava), and mountain ranges like the Apennines.",
    significance:
      "The Moon is believed to have formed approximately 4.5 billion years ago when a Mars-sized body, named Theia, struck the proto-Earth a glancing blow. Debris from the collision coalesced in orbit within decades to centuries. Without the Moon, Earth's axial tilt would vary chaotically over geological time, making the climate far less stable; the Moon's gravitational influence stabilizes the seasons that allowed complex life to evolve.",
  },
};

export const STAR_FACTS: Record<string, ObjectFacts> = {
  Sirius: {
    tagline: "The brightest star in Earth's night sky",
    overview:
      "Sirius is an A-type main-sequence star approximately twice the mass of the Sun and 25 times more luminous. Its apparent brilliance is the result of a fortunate combination — moderately high intrinsic luminosity and very close proximity, only 8.6 light-years from Earth. Sirius is in fact a binary system: the primary, Sirius A, is orbited every 50 years by Sirius B, a white dwarf with the mass of the Sun compressed into a body the size of Earth. Sirius B was the first white dwarf ever discovered, providing crucial evidence for the existence of degenerate matter.",
    facts: [
      { label: "Distance", value: "8.6 light-years" },
      { label: "Apparent magnitude", value: "-1.46 (brightest in the sky)" },
      { label: "Spectral type", value: "A1V (Sirius A)" },
      { label: "Mass", value: "2.06 solar masses" },
      { label: "Surface temperature", value: "9,940 K" },
      { label: "Companion", value: "Sirius B (white dwarf, 1 solar mass)" },
      { label: "Constellation", value: "Canis Major" },
    ],
    viewing:
      "Sirius is unmistakable in winter skies (Northern Hemisphere) — extending Orion's belt downward and to the left points directly at it. When low to the horizon, atmospheric turbulence causes Sirius to flash dramatically through different colors, an effect called scintillation that is more pronounced in bright stars.",
    significance:
      "Ancient Egyptian civilization organized its calendar around Sirius's heliacal rising — the morning each summer when the star first becomes visible after a 70-day period of conjunction with the Sun. This event coincided with the annual flooding of the Nile, the foundation of Egyptian agriculture, and is considered one of the earliest applications of precise astronomical observation to civic life.",
  },

  Betelgeuse: {
    tagline: "A red supergiant near the end of its life",
    overview:
      "Betelgeuse is one of the largest stars visible to the naked eye. If placed at the position of the Sun, its surface would extend past the orbit of Mars and possibly to Jupiter. Despite a mass only 17 times that of the Sun, it has expanded to enormous size as it nears the end of its hydrogen-fusion phase. Betelgeuse is a known semi-regular variable, brightening and dimming over periods of months to years as its outer layers pulsate. It will end its life as a Type II supernova, an event that will briefly outshine the full Moon and remain visible in daylight for weeks.",
    facts: [
      { label: "Distance", value: "~642 light-years" },
      { label: "Apparent magnitude", value: "0.0 to 1.6 (variable)" },
      { label: "Spectral type", value: "M1-2 Iab (red supergiant)" },
      { label: "Mass", value: "~17 solar masses" },
      { label: "Diameter", value: "~700× the Sun" },
      { label: "Age", value: "~10 million years" },
      { label: "Constellation", value: "Orion" },
    ],
    viewing:
      "Betelgeuse marks the right shoulder of Orion (left as we view it from the Northern Hemisphere) and is one of the few stars whose distinctly orange-red color is obvious to the unaided eye. Comparing Betelgeuse to bluish Rigel at the opposite corner of Orion is a clear demonstration that stars come in different colors corresponding to different surface temperatures.",
    significance:
      "When Betelgeuse explodes — likely within the next 100,000 years, though it could be tomorrow — it will be the closest supernova in recorded history. From 642 light-years away the radiation poses no danger to Earth, but the visual spectacle will be without precedent in human civilization. In late 2019 Betelgeuse dimmed by half over several months, prompting speculation that the explosion was imminent. The dimming was eventually attributed to a large dust cloud the star had ejected, which had temporarily obscured part of its visible surface.",
  },

  Polaris: {
    tagline: "The current North Star",
    overview:
      "Polaris is positioned within 0.7° of the celestial north pole, making it appear nearly stationary as Earth rotates while every other star in the northern sky wheels around it. This positioning is coincidental and temporary — Earth's rotational axis precesses (wobbles slowly) over a 26,000-year cycle, and Polaris has only been close to the pole for the last few thousand years. Polaris is itself a Cepheid variable, pulsing slightly in brightness over a period of 4 days, and is the closest Cepheid to Earth, which has made it a critical calibrator for the cosmic distance ladder.",
    facts: [
      { label: "Distance", value: "433 light-years" },
      { label: "Apparent magnitude", value: "1.98 (slightly variable)" },
      { label: "Spectral type", value: "F7Ib (yellow supergiant)" },
      { label: "Mass", value: "5.4 solar masses" },
      { label: "Luminosity", value: "~2,000× the Sun" },
      { label: "Distance from pole", value: "0.66°" },
      { label: "Constellation", value: "Ursa Minor" },
    ],
    viewing:
      "Polaris is found by following the line through the two outer stars of the Big Dipper's bowl, Dubhe and Merak, extending it about five times that distance. Because Polaris remains at a fixed altitude equal to the observer's latitude, it has been the principal navigational star of the Northern Hemisphere for centuries.",
    significance:
      "Earth's axial precession means the identity of the pole star changes on geological timescales. Around 3000 BC, Thuban (Alpha Draconis) marked north — the alignment shafts of the Egyptian pyramids point toward Thuban, not Polaris. Vega, the brightest star in Lyra, will become the pole star around the year 14,000 AD as the precession cycle continues.",
  },

  Vega: {
    tagline: "A reference star of stellar physics",
    overview:
      "Vega is among the most thoroughly studied stars after the Sun. It served as the original photometric reference for the magnitude scale — its brightness was defined as magnitude 0 at all wavelengths — though more precise modern systems have refined this calibration. Vega rotates so rapidly, completing one rotation every 12.5 hours, that its equatorial diameter exceeds its polar diameter by 19%, producing measurable temperature variations between equator and poles. A debris disk surrounding the star, discovered in 1983, provided the first observational evidence that planet-formation processes occur around stars besides the Sun.",
    facts: [
      { label: "Distance", value: "25 light-years" },
      { label: "Apparent magnitude", value: "0.03" },
      { label: "Spectral type", value: "A0V (white main sequence)" },
      { label: "Mass", value: "2.1 solar masses" },
      { label: "Luminosity", value: "40× the Sun" },
      { label: "Rotation period", value: "12.5 hours" },
      { label: "Age", value: "455 million years" },
      { label: "Constellation", value: "Lyra" },
    ],
    viewing:
      "Vega is overhead during summer evenings in the Northern Hemisphere and is one of the brightest stars visible. With Deneb (in Cygnus) and Altair (in Aquila), it forms the Summer Triangle — three stars far apart in the sky but bright enough to dominate the northern summer night.",
    significance:
      "Vega was the first star besides the Sun to be photographed (1850) and the first to have its spectrum recorded (1872). Its position has made it a central reference point for stellar astronomy for nearly two centuries. Earth's precession will make Vega the pole star approximately 12,000 years from now, just as it was approximately 12,000 BC.",
  },

  Arcturus: {
    tagline: "The brightest star in the northern sky",
    overview:
      "Arcturus is a K-type giant star, having exhausted hydrogen in its core and expanded to roughly 25 times the Sun's diameter. Unlike most bright stars in our region, which belong to the disk population of relatively young stars, Arcturus is a member of the older halo population — its orbit is tilted relative to the galactic plane and carries it through our region at high velocity. Within a few thousand years it will have moved a noticeable distance from its current position, eventually receding from our vicinity entirely.",
    facts: [
      { label: "Distance", value: "36.7 light-years" },
      { label: "Apparent magnitude", value: "-0.05" },
      { label: "Spectral type", value: "K1.5III (orange giant)" },
      { label: "Diameter", value: "25× the Sun" },
      { label: "Mass", value: "~1.1 solar masses" },
      { label: "Velocity", value: "122 km/s relative to the Sun" },
      { label: "Age", value: "~7 billion years" },
      { label: "Constellation", value: "Boötes" },
    ],
    viewing:
      "Arcturus is found by following the curve of the Big Dipper's handle outward — a mnemonic captured in the phrase 'arc to Arcturus.' Its distinctly warm color is visible without optical aid. In late spring and summer evenings it dominates the southwestern sky from northern latitudes.",
    significance:
      "Light from Arcturus was used to switch on the floodlights at the opening of the 1933 Chicago World's Fair. The star is approximately 37 light-years away, almost exactly the time elapsed since the previous Chicago fair in 1893 — a poetic coincidence the organizers exploited. The light captured by photoelectric cells that night had begun its journey across interstellar space when the previous fair was being constructed.",
  },

  Rigel: {
    tagline: "A blue supergiant in Orion",
    overview:
      "Rigel is a B-type blue supergiant approximately 21 times the mass of the Sun and 120,000 times its luminosity — among the most luminous stars visible to the naked eye. Although designated Beta Orionis, Rigel typically outshines Alpha Orionis (Betelgeuse), a designation inconsistency that pre-dates standardized stellar nomenclature. Rigel is in fact a multiple-star system with at least four components, though only the primary is visible without a telescope.",
    facts: [
      { label: "Distance", value: "~860 light-years" },
      { label: "Apparent magnitude", value: "0.13" },
      { label: "Spectral type", value: "B8Ia (blue supergiant)" },
      { label: "Mass", value: "21 solar masses" },
      { label: "Luminosity", value: "120,000× the Sun" },
      { label: "Diameter", value: "78× the Sun" },
      { label: "Constellation", value: "Orion" },
    ],
    viewing:
      "Rigel marks the lower right corner of Orion as seen from the Northern Hemisphere (lower left from the Southern Hemisphere). Its blue-white color contrasts dramatically with red Betelgeuse at the opposite corner, providing an immediate visual demonstration of stellar temperature variation.",
    significance:
      "Like Betelgeuse, Rigel is massive enough to end its life as a supernova, though estimates of its remaining lifetime range from a few million to ten million years. Its eventual collapse will leave behind either a neutron star or a black hole, depending on the precise final mass after the explosion ejects its outer layers.",
  },
};

export const DEEPSKY_FACTS: Record<string, ObjectFacts> = {
  M31: {
    tagline: "The nearest large galaxy to the Milky Way",
    overview:
      "The Andromeda Galaxy is a barred spiral galaxy approximately 2.5 million light-years from Earth, the nearest major galaxy to the Milky Way and a member of the same Local Group of galaxies. Recent measurements estimate it contains about 1 trillion stars — roughly twice the Milky Way's stellar population — and spans 220,000 light-years across, more than twice the Milky Way's diameter. Andromeda is the most distant object readily visible to the unaided eye, and the only large galaxy whose individual structures (dust lanes, satellite galaxies, even individual variable stars) can be resolved by amateur instruments.",
    facts: [
      { label: "Distance", value: "2.537 million light-years" },
      { label: "Apparent magnitude", value: "3.4" },
      { label: "Type", value: "Barred spiral galaxy (SA(s)b)" },
      { label: "Diameter", value: "220,000 light-years" },
      { label: "Stars", value: "~1 trillion" },
      { label: "Mass", value: "~1.5 trillion solar masses" },
      { label: "Approach velocity", value: "110 km/s toward Milky Way" },
    ],
    viewing:
      "Andromeda is found between the constellations Andromeda and Cassiopeia and is visible to the unaided eye as a faint, elongated smudge in dark skies. Binoculars reveal a clear oval glow with a brighter core; modest telescopes show its dust lanes and the two prominent satellite galaxies M32 and M110. Most of the galaxy is too faint to see in any single observation — what most people perceive is only the bright central bulge.",
    significance:
      "Andromeda and the Milky Way are on a collision course and will merge in approximately 4.5 billion years, eventually forming a single elliptical galaxy that astronomers have informally named 'Milkomeda.' Stellar collisions during the merger will be vanishingly rare due to the immense distances between stars within each galaxy, but the gravitational reorganization will radically reshape both galaxies. The light reaching Earth from Andromeda today left the galaxy 2.5 million years ago — when the human genus Homo had only just emerged in East Africa.",
  },

  M42: {
    tagline: "The nearest active region of star formation",
    overview:
      "The Orion Nebula is an emission nebula 1,344 light-years from Earth — among the closest stellar nurseries to our solar system. It is part of the much larger Orion Molecular Cloud Complex, which extends across most of the constellation. Within the visible nebula, hundreds of new stars are forming inside dense pockets of hydrogen gas, illuminated and ionized by the four hot young stars at its center known collectively as the Trapezium. The nebula is one of the most studied objects in astronomy because its proximity allows detailed observation of every stage of stellar birth.",
    facts: [
      { label: "Distance", value: "1,344 light-years" },
      { label: "Apparent magnitude", value: "4.0" },
      { label: "Type", value: "H II region (emission nebula)" },
      { label: "Diameter", value: "24 light-years" },
      { label: "Mass", value: "~2,000 solar masses of gas" },
      { label: "Age", value: "<1 million years" },
      { label: "Constellation", value: "Orion" },
    ],
    viewing:
      "The Orion Nebula appears as the fuzzy 'middle star' of Orion's sword, hanging below the three stars of his belt. It is visible without optical aid as a clearly non-stellar smudge. Binoculars reveal a wing-shaped glowing region; a small telescope shows the four bright Trapezium stars at its center along with intricate filaments of gas.",
    significance:
      "Despite being prominent and observable from antiquity, the Orion Nebula is conspicuously absent from ancient records. Ptolemy, the Maya, and Chinese astronomers all maintained meticulous catalogs of celestial objects but none of them mentioned a fuzzy patch where we see one today. This has led to speculation that the nebula may have brightened significantly within historical times — perhaps as one of the embedded young stars cleared away obscuring dust — though the matter remains unresolved.",
  },

  M45: {
    tagline: "An open cluster of young, hot stars",
    overview:
      "The Pleiades is one of the closest open star clusters to Earth and one of the most prominent. The cluster contains over 1,000 confirmed members, though only the seven brightest are typically visible to the unaided eye. The cluster is approximately 100 million years old — extremely young by stellar standards — and its hottest stars are still surrounded by reflective veils of interstellar dust the cluster is currently passing through, producing the distinctive blue nebulosity visible in long-exposure photographs.",
    facts: [
      { label: "Distance", value: "444 light-years" },
      { label: "Apparent magnitude", value: "1.6 (collective)" },
      { label: "Type", value: "Open cluster" },
      { label: "Member stars", value: "~1,000+" },
      { label: "Age", value: "~100 million years" },
      { label: "Diameter", value: "8 light-years (cluster core)" },
      { label: "Constellation", value: "Taurus" },
    ],
    viewing:
      "The Pleiades is unmistakable as a tight clump of bluish stars northwest of Orion, approximately the apparent size of the full Moon. Most observers count six naked-eye stars, though seven or more are visible to those with sharp eyesight under dark skies. Binoculars reveal dozens of additional cluster members. The reflection nebulosity is detectable only in long-exposure photographs.",
    significance:
      "The Pleiades is among the most universally recognized celestial objects. Ancient and modern cultures across Europe, North and South America, Australia, Polynesia, China, and Japan all developed independent mythologies for the cluster — typically involving seven women, sisters, or lost children. The Japanese name Subaru, retained as an automotive brand, is one example. Bronze Age cultures used the Pleiades' annual heliacal rising to mark the beginning of the agricultural year.",
  },

  M1: {
    tagline: "A supernova remnant from 1054",
    overview:
      "The Crab Nebula is the expanding debris cloud of a star whose explosion was witnessed and recorded by Chinese astronomers in 1054 AD. The 'guest star' was bright enough to remain visible in daylight for 23 days and observable at night for nearly two years before fading. At the center of the nebula spins the Crab Pulsar — the collapsed neutron-star core of the original star, rotating 30 times per second and emitting beams of radio, optical, X-ray, and gamma-ray radiation that sweep across Earth like a lighthouse.",
    facts: [
      { label: "Distance", value: "~6,500 light-years" },
      { label: "Apparent magnitude", value: "8.4" },
      { label: "Type", value: "Supernova remnant" },
      { label: "Diameter", value: "~11 light-years" },
      { label: "Pulsar period", value: "33 milliseconds" },
      { label: "Expansion rate", value: "1,500 km/s" },
      { label: "Constellation", value: "Taurus" },
    ],
    viewing:
      "The Crab Nebula requires a telescope and dark skies. It lies near Zeta Tauri, the southern horn of Taurus. Through small telescopes it appears as a faint oval smudge; larger amateur instruments under good conditions can reveal hints of internal structure. Photographically, the nebula's filamentary structure and bluish synchrotron core are striking.",
    significance:
      "The Crab Pulsar is among the most studied objects in high-energy astrophysics. Its rotational kinetic energy, gradually decreasing as the pulsar slows, powers the entire nebula's continued radiation across all wavelengths — the pulsar emits more energy each second than the Sun produces in a full year, all from the leftover spin energy of a stellar core compressed into a sphere only 20 km across.",
  },

  M51: {
    tagline: "A pair of interacting galaxies",
    overview:
      "The Whirlpool is a pair of gravitationally interacting galaxies. The larger spiral, NGC 5194, is being distorted by the smaller companion NGC 5195, which is currently passing behind it on a complex orbit. The interaction has triggered intense star formation along the spiral arms, making them unusually bright and well-defined. The pair offers one of the clearest views available of the dynamical processes that shape galaxy evolution, and is a textbook example used in undergraduate astronomy.",
    facts: [
      { label: "Distance", value: "~23 million light-years" },
      { label: "Apparent magnitude", value: "8.4" },
      { label: "Type", value: "Interacting spiral pair" },
      { label: "Diameter", value: "~60,000 light-years" },
      { label: "Companion", value: "NGC 5195" },
      { label: "Constellation", value: "Canes Venatici" },
    ],
    viewing:
      "The Whirlpool lies just south of the end of the Big Dipper's handle. It is visible as a faint patch in binoculars under dark skies; a telescope of 6 inches or larger reveals the dual-nucleus structure and hints of spiral arms. Photographically it is among the most rewarding deep-sky targets for amateur astrophotographers.",
    significance:
      "M51 was the first galaxy in which spiral structure was identified, by William Parsons (Lord Rosse) in 1845. Parsons used the 72-inch Leviathan of Parsonstown — the largest telescope in the world for over 70 years — and his careful sketches showed clearly resolved arms decades before photography could capture them. The recognition that 'spiral nebulae' were actually distant galaxies rather than nearby gas clouds had to wait until Edwin Hubble's distance measurements in 1924.",
  },
};

export const SATELLITE_FACTS: Record<string, ObjectFacts> = {
  "ISS (ZARYA)": {
    tagline: "The largest human-made object in orbit",
    overview:
      "The International Space Station is approximately the size of an American football field including its solar arrays — the largest structure ever placed in orbit by human beings. Construction began in 1998 with the Russian-built Zarya module, and the station has been continuously occupied since November 2000, now representing the longest continuous human presence in space. It orbits at approximately 408 km altitude and circles Earth every 92.9 minutes; its crew sees 16 sunrises and 16 sunsets each day.",
    facts: [
      { label: "Mean altitude", value: "~408 km" },
      { label: "Orbital speed", value: "27,600 km/h (7.66 km/s)" },
      { label: "Orbital period", value: "92.9 minutes" },
      { label: "Mass", value: "~420,000 kg" },
      { label: "Pressurized volume", value: "916 m³" },
      { label: "Typical crew", value: "7" },
      { label: "Continuous occupation since", value: "November 2000" },
    ],
    viewing:
      "When sunlit and overhead, the ISS appears as a brilliant non-twinkling point of light moving steadily across the sky in 4 to 6 minutes. It is the third-brightest object in the sky after the Sun and Moon, easily exceeding any star or planet at peak brightness. Best viewing is within 1 to 2 hours of dawn or dusk, when the station is in sunlight while the observer remains in Earth's shadow.",
    significance:
      "The ISS is the most expensive single object ever constructed, with cumulative costs across all partner agencies estimated above $150 billion. Its scientific output includes thousands of microgravity experiments spanning materials science, biology, medicine, and fundamental physics. The station's construction required over 40 assembly missions and is the longest-running international cooperative project in human history, involving the United States, Russia, the European Space Agency, Japan, and Canada continuously since the late 1990s — including periods of significant geopolitical tension between member states.",
  },

  TIANGONG: {
    tagline: "China's permanent orbital outpost",
    overview:
      "Tiangong (天宫, 'Heavenly Palace') is China's modular space station, completed in late 2022 and operating with continuous three-person crews on six-month rotations. It consists of three primary modules — the Tianhe core module and the Wentian and Mengtian laboratory modules — and represents China's third generation of crewed space stations following the experimental Tiangong-1 and Tiangong-2 prototypes. Although smaller than the ISS, Tiangong is designed for an operational lifespan of 10 to 15 years and supports a comparable range of scientific research.",
    facts: [
      { label: "Mean altitude", value: "~390 km" },
      { label: "Orbital period", value: "~92 minutes" },
      { label: "Mass", value: "~100,000 kg" },
      { label: "Modules", value: "Tianhe, Wentian, Mengtian" },
      { label: "Crew capacity", value: "3 (rotating)" },
      { label: "First module launch", value: "April 2021" },
      { label: "Construction completed", value: "November 2022" },
    ],
    viewing:
      "Tiangong appears similar to the ISS in flight characteristics — a steady non-blinking point of light crossing the sky in several minutes — but is dimmer due to its smaller size. Pass predictions are available from the same tracking sources as the ISS. Like all low-Earth-orbit satellites, it is visible only when sunlit against a darkened sky, generally during twilight.",
    significance:
      "Tiangong's existence is a direct consequence of the 2011 Wolf Amendment, a U.S. law prohibiting NASA from bilateral cooperation with the Chinese space program. Excluded from ISS partnership, China developed independent crewed-spaceflight capability, and now operates the only space station outside the ISS partnership. As of late 2024, Tiangong has hosted international experiments from over a dozen countries, establishing China as a parallel pole of human spaceflight.",
  },

  HST: {
    tagline: "An optical observatory in low Earth orbit",
    overview:
      "The Hubble Space Telescope was launched in April 1990 and has been operating in low Earth orbit ever since, longer than any other major space observatory. By orbiting above the atmosphere, Hubble avoids the optical distortion that limits ground-based telescopes, achieving image resolution that for decades was unmatched by any larger ground-based instrument. Its observations established the age of the universe, confirmed the existence of dark energy through measurement of accelerating cosmic expansion, and produced many of the most-reproduced images in the history of science, including the Hubble Deep Field and the Pillars of Creation.",
    facts: [
      { label: "Mean altitude", value: "~540 km" },
      { label: "Primary mirror", value: "2.4 m diameter" },
      { label: "Mass", value: "11,110 kg" },
      { label: "Length", value: "13.2 m" },
      { label: "Launched", value: "April 24, 1990 (STS-31)" },
      { label: "Servicing missions", value: "5 (final in 2009)" },
      { label: "Wavelengths", value: "Ultraviolet, visible, near-infrared" },
    ],
    viewing:
      "Hubble passes overhead and is technically observable at peak brightness around magnitude 2 to 3, comparable to a moderate star. However, predicting and locating Hubble passes is more difficult than for the ISS or Tiangong because of its smaller size and lower brightness. The app surfaces visible passes when they occur.",
    significance:
      "Hubble's primary mirror was launched with a manufacturing flaw — incorrectly polished by approximately 2 microns at the edges — producing blurry images for the telescope's first three years of operation. The 1993 servicing mission installed corrective optics, an achievement frequently compared to fitting the telescope with eyeglasses. The successful repair preserved a $4.7 billion observatory and demonstrated the value of in-orbit servicing, lessons that have since been applied to satellite design and mission planning across the industry.",
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
