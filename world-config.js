window.GTA = window.GTA || {};

window.GTA.Config = (function () {
  const TILE_SIZE = 180;
  const GRID_SIZE = 150;
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
    PIER: 10,
    TRACK: 11,
    STADIUM: 12,
    PLAZA: 13,
    SHIP_DECK: 14,
    DESERT: 15,
    DIRT_ROAD: 16
  };

  const DISTRICTS = {
    DOWNTOWN:   { id: 'DOWNTOWN',   name: 'Grand City – Centrum',    color: '#38bdf8' },
    NORTHWOOD:  { id: 'NORTHWOOD',  name: 'Northwood – Severné mesto',color: '#60a5fa' },
    AIRPORT:    { id: 'AIRPORT',    name: 'North Airfield – Letisko', color: '#facc15' },
    CANALS:     { id: 'CANALS',     name: 'Palm Bay & Kanály',       color: '#f472b6' },
    DOCKS:      { id: 'DOCKS',      name: 'South Docks – Prístav',   color: '#94a3b8' },
    DESERT:     { id: 'DESERT',     name: 'Red Desert & Route 66',   color: '#fb923c' },
    FOREST:     { id: 'FOREST',     name: 'Pine Forest & Hory',      color: '#4ade80' },
    MT_GRAND:   { id: 'MT_GRAND',   name: 'Mount Grand',             color: '#a3e635' },
    AREA69:     { id: 'AREA69',     name: 'Zakázaná Zóna / Základňa',color: '#f87171' },
    ALCATRAZ:   { id: 'ALCATRAZ',   name: 'Ostrov Alcatraz',         color: '#cbd5e1' },
    SMUGGLER:   { id: 'SMUGGLER',   name: 'Ostrov pašerákov',        color: '#2dd4bf' },
    SPEEDWAY:   { id: 'SPEEDWAY',   name: 'Grand Speedway',          color: '#fde047' },
    STADIUM:    { id: 'STADIUM',    name: 'Futbalový štadión',       color: '#4ade80' },
    OCEAN:      { id: 'OCEAN',      name: 'Otvorené more',           color: '#0284c7' }
  };

  const PALETTES = {
    DOWNTOWN: [
      { roof: '#1e293b', w1: '#334155', w2: '#1e293b', facade: 'glass' },
      { roof: '#0f172a', w1: '#1e3a8a', w2: '#172554', facade: 'glass' },
      { roof: '#334155', w1: '#64748b', w2: '#475569', facade: 'classic' },
      { roof: '#1e1b4b', w1: '#312e81', w2: '#1e1b4b', facade: 'balcony' },
      { roof: '#3f3f46', w1: '#71717a', w2: '#52525b', facade: 'classic' }
    ],
    BEACH: [
      { roof: '#f8fafc', w1: '#fef3c7', w2: '#fde68a', facade: 'balcony' },
      { roof: '#0284c7', w1: '#e0f2fe', w2: '#bae6fd', facade: 'balcony' },
      { roof: '#db2777', w1: '#fce7f3', w2: '#fbcfe8', facade: 'balcony' },
      { roof: '#ea580c', w1: '#ffedd5', w2: '#fed7aa', facade: 'classic' }
    ],
    DESERT: [
      { roof: '#9a3412', w1: '#d97706', w2: '#b45309', facade: 'classic' },
      { roof: '#78350f', w1: '#ca8a04', w2: '#a16207', facade: 'classic' },
      { roof: '#57534e', w1: '#a8a29e', w2: '#78716c', facade: 'industrial' }
    ],
    FOREST: [
      { roof: '#78350f', w1: '#92400e', w2: '#451a03', facade: 'classic' },
      { roof: '#3f6212', w1: '#a16207', w2: '#713f12', facade: 'classic' }
    ],
    INDUSTRIAL: [
      { roof: '#334155', w1: '#475569', w2: '#1e293b', facade: 'industrial' },
      { roof: '#7c2d12', w1: '#9a3412', w2: '#431407', facade: 'industrial' }
    ],
    CONTAINERS: [
      { roof: '#b91c1c', w1: '#dc2626', w2: '#7f1d1d' },
      { roof: '#1d4ed8', w1: '#2563eb', w2: '#1e3a8a' },
      { roof: '#15803d', w1: '#16a34a', w2: '#14532d' },
      { roof: '#b45309', w1: '#d97706', w2: '#78350f' }
    ]
  };

  function createRNG(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
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
