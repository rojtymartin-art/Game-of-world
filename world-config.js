window.GTA = window.GTA || {};

window.GTA.Config = (function () {
  const TILE_SIZE = 180;
  const GRID_SIZE = 72;
  const WORLD_SIZE = TILE_SIZE * GRID_SIZE;

  const TILES = {
    WATER: 0,
    SAND: 1,
    GRASS: 2,
    FOREST: 3,
    SIDEWALK: 4,
    ROAD: 5,
    HIGHWAY: 6,
    BRIDGE: 7,
    CONCRETE: 8,
    RUNWAY: 9,
    PIER: 10
  };

  const DISTRICTS = {
    DOWNTOWN:   { id: 'DOWNTOWN',   name: 'Downtown',            sub: 'Finančné centrum & mrakodrapy', color: '#38bdf8' },
    OLD_TOWN:   { id: 'OLD_TOWN',   name: 'Northside',           sub: 'Farebné staré mesto & bloky',   color: '#f97316' },
    BEACH:      { id: 'BEACH',      name: 'Palm Bay Beach',      sub: 'Art Deco pobrežie & mólo',      color: '#facc15' },
    INDUSTRIAL: { id: 'INDUSTRIAL', name: 'South Docks',         sub: 'Priemyselná zóna & prístav',    color: '#94a3b8' },
    AIRPORT:    { id: 'AIRPORT',    name: 'Grand City Airport',  sub: 'Medzinárodné letisko',          color: '#a855f7' },
    SUBURBS:    { id: 'SUBURBS',    name: 'West Hills',          sub: 'Vilová štvrť & lesy',           color: '#22c55e' },
    PARK:       { id: 'PARK',       name: 'Central Park',        sub: 'Mestský park',                  color: '#4ade80' },
    OCEAN:      { id: 'OCEAN',      name: 'Oceán',               sub: 'Otvorené more',                 color: '#0284c7' }
  };

  // Pestré architektonické palety pre rôznorodé mesto!
  const PALETTES = {
    DOWNTOWN: [
      { roof: '#1e3a5f', w1: '#155e75', w2: '#0e7490', facade: 'glass' },    // Azúrové sklo
      { roof: '#1e293b', w1: '#0f766e', w2: '#115e59', facade: 'glass' },    // Smaragdové sklo
      { roof: '#57432a', w1: '#854d0e', w2: '#713f12', facade: 'glass' },    // Zlato-bronzová veža
      { roof: '#cbd5e1', w1: '#94a3b8', w2: '#64748b', facade: 'glass' },    // Bielo-strieborný modern
      { roof: '#312e81', w1: '#3730a3', w2: '#1e1b4b', facade: 'glass' },    // Polnočný kobalt
      { roof: '#334155', w1: '#1e293b', w2: '#0f172a', facade: 'classic' },  // Obsidian veža
      { roof: '#52525b', w1: '#71717a', w2: '#3f3f46', facade: 'classic' },  // Oceľová klasika
      { roof: '#4c1d95', w1: '#5b21b6', w2: '#2e1065', facade: 'glass' }     // Fialový modern
    ],
    OLD_TOWN: [
      { roof: '#7c2d12', w1: '#b45309', w2: '#92400e', facade: 'classic' },  // Teplá okrová
      { roof: '#7f1d1d', w1: '#b91c1c', w2: '#991b1b', facade: 'classic' },  // Tehlová červená
      { roof: '#3f6212', w1: '#4d7c0f', w2: '#365314', facade: 'classic' },  // Šalviová zelená
      { roof: '#9a3412', w1: '#d97706', w2: '#b45309', facade: 'classic' },  // Medená / horčicová
      { roof: '#881337', w1: '#be185d', w2: '#9d174d', facade: 'classic' },  // Staroružová / bordová
      { roof: '#78716c', w1: '#d6d3d1', w2: '#a8a29e', facade: 'classic' },  // Krémová omietka
      { roof: '#1e3a8a', w1: '#2563eb', w2: '#1d4ed8', facade: 'classic' },  // Modrý mestský dom
      { roof: '#57534e', w1: '#a16207', w2: '#713f12', facade: 'classic' }   // Pieskovcová
    ],
    BEACH: [
      { roof: '#fbcfe8', w1: '#f472b6', w2: '#db2777', facade: 'balcony' },  // Miami koralová ružová
      { roof: '#cffafe', w1: '#22d3ee', w2: '#0891b2', facade: 'balcony' },  // Tyrkysový hotel
      { roof: '#fef08a', w1: '#facc15', w2: '#ca8a04', facade: 'balcony' },  // Slnečná žltá
      { roof: '#f8fafc', w1: '#e2e8f0', w2: '#94a3b8', facade: 'balcony' },  // Biely Art Deco
      { roof: '#bbf7d0', w1: '#34d399', w2: '#059669', facade: 'balcony' },  // Mätový rezort
      { roof: '#fed7aa', w1: '#fb923c', w2: '#ea580c', facade: 'balcony' }   // Broskyňová
    ],
    SUBURBS: [
      { roof: '#9a3412', w1: '#fef3c7', w2: '#fde68a', facade: 'villa' },
      { roof: '#7c2d12', w1: '#f5f5f4', w2: '#d6d3d1', facade: 'villa' },
      { roof: '#1e3a8a', w1: '#f1f5f9', w2: '#cbd5e1', facade: 'villa' },
      { roof: '#14532d', w1: '#fef9c3', w2: '#e7e5e4', facade: 'villa' },
      { roof: '#475569', w1: '#ffedd5', w2: '#fed7aa', facade: 'villa' },
      { roof: '#881337', w1: '#fafaf9', w2: '#d6d3d1', facade: 'villa' }
    ],
    INDUSTRIAL: [
      { roof: '#64748b', w1: '#475569', w2: '#334155', facade: 'industrial' },
      { roof: '#9a3412', w1: '#7c2d12', w2: '#431407', facade: 'industrial' }, // Hrdzavá hala
      { roof: '#1e3a5f', w1: '#1e40af', w2: '#172554', facade: 'industrial' }, // Modrý plech
      { roof: '#854d0e', w1: '#a16207', w2: '#713f12', facade: 'industrial' }, // Žltý sklad
      { roof: '#3f6212', w1: '#4d7c0f', w2: '#365314', facade: 'industrial' }  // Olivová hala
    ],
    CONTAINERS: [
      { roof: '#dc2626', w1: '#b91c1c', w2: '#7f1d1d' },
      { roof: '#2563eb', w1: '#1d4ed8', w2: '#1e3a8a' },
      { roof: '#d97706', w1: '#b45309', w2: '#78350f' },
      { roof: '#16a34a', w1: '#15803d', w2: '#14532d' },
      { roof: '#9333ea', w1: '#7e22ce', w2: '#581c87' }
    ]
  };

  function createRNG(initialSeed) {
    let s = initialSeed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  return {
    TILE_SIZE: TILE_SIZE,
    GRID_SIZE: GRID_SIZE,
    WORLD_SIZE: WORLD_SIZE,
    TILES: TILES,
    DISTRICTS: DISTRICTS,
    PALETTES: PALETTES,
    createRNG: createRNG
  };
})();
