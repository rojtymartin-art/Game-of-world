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
    PIER: 10,
    DESERT: 11,
    DIRT_ROAD: 12,
    TRACK: 13,
    STADIUM: 14,
    PLAZA: 15,
    SHIP_DECK: 16
  };

  const DISTRICTS = {
    DOWNTOWN:   { id: 'DOWNTOWN',   name: 'Downtown',           sub: 'Centrum & Kruhový objazd',   color: '#38bdf8' },
    CANALS:     { id: 'CANALS',     name: 'Palm Bay & Kanály',  sub: 'Art Deco vily & lunapark',   color: '#f472b6' },
    STADIUM:    { id: 'STADIUM',    name: 'Grand Arena',        sub: 'Futbalový štadión',          color: '#4ade80' },
    DOCKS:      { id: 'DOCKS',      name: 'South Docks',        sub: 'Kontajnerový prístav & loď', color: '#94a3b8' },
    DESERT:     { id: 'DESERT',     name: 'Červená púšť',       sub: 'Kaňon, Route 66 & karavany', color: '#f97316' },
    AREA69:     { id: 'AREA69',     name: 'Area 69',            sub: 'ZAKÁZANÁ VOJENSKÁ ZÓNA',     color: '#ef4444' },
    SPEEDWAY:   { id: 'SPEEDWAY',   name: 'Grand Speedway',     sub: 'Pretekársky okruh',          color: '#facc15' },
    FOREST:     { id: 'FOREST',     name: 'Pine Forest',        sub: 'Horský les & serpentíny',    color: '#22c55e' },
    MT_GRAND:   { id: 'MT_GRAND',   name: 'Mount Grand',        sub: 'Vyhliadka & nápis GRAND',    color: '#a3e635' },
    ALCATRAZ:   { id: 'ALCATRAZ',   name: 'Alcatraz',           sub: 'Väzenský ostrov',            color: '#cbd5e1' },
    SMUGGLER:   { id: 'SMUGGLER',   name: 'Ostrov pašerákov',   sub: 'Tropická lagúna & dráha',    color: '#2dd4bf' },
    OCEAN:      { id: 'OCEAN',      name: 'Oceán',              sub: 'Otvorené more',              color: '#0284c7' }
  };

  const PALETTES = {
    DOWNTOWN: [
      { roof: '#1e3a5f', w1: '#155e75', w2: '#0e7490', facade: 'glass' },
      { roof: '#1e293b', w1: '#0f766e', w2: '#115e59', facade: 'glass' },
      { roof: '#57432a', w1: '#854d0e', w2: '#713f12', facade: 'glass' },
      { roof: '#cbd5e1', w1: '#94a3b8', w2: '#64748b', facade: 'glass' },
      { roof: '#312e81', w1: '#3730a3', w2: '#1e1b4b', facade: 'glass' },
      { roof: '#7f1d1d', w1: '#b91c1c', w2: '#991b1b', facade: 'classic' },
      { roof: '#9a3412', w1: '#d97706', w2: '#b45309', facade: 'classic' },
      { roof: '#4c1d95', w1: '#5b21b6', w2: '#2e1065', facade: 'glass' }
    ],
    BEACH: [
      { roof: '#fbcfe8', w1: '#f472b6', w2: '#db2777', facade: 'balcony' },
      { roof: '#cffafe', w1: '#22d3ee', w2: '#0891b2', facade: 'balcony' },
      { roof: '#fef08a', w1: '#facc15', w2: '#ca8a04', facade: 'balcony' },
      { roof: '#f8fafc', w1: '#e2e8f0', w2: '#94a3b8', facade: 'balcony' },
      { roof: '#bbf7d0', w1: '#34d399', w2: '#059669', facade: 'balcony' },
      { roof: '#fed7aa', w1: '#fb923c', w2: '#ea580c', facade: 'balcony' }
    ],
    DESERT: [
      { roof: '#b45309', w1: '#d97706', w2: '#92400e', facade: 'classic' },
      { roof: '#a16207', w1: '#e7e5e4', w2: '#a8a29e', facade: 'classic' },
      { roof: '#9a3412', w1: '#fdba74', w2: '#c2410c', facade: 'classic' },
      { roof: '#78716c', w1: '#d6d3d1', w2: '#78716c', facade: 'industrial' }
    ],
    FOREST: [
      { roof: '#78350f', w1: '#92400e', w2: '#451a03', facade: 'villa' },
      { roof: '#14532d', w1: '#b45309', w2: '#78350f', facade: 'villa' },
      { roof: '#57534e', w1: '#a8a29e', w2: '#57534e', facade: 'villa' }
    ],
    INDUSTRIAL: [
      { roof: '#64748b', w1: '#475569', w2: '#334155', facade: 'industrial' },
      { roof: '#9a3412', w1: '#7c2d12', w2: '#431407', facade: 'industrial' },
      { roof: '#1e3a5f', w1: '#1e40af', w2: '#172554', facade: 'industrial' },
      { roof: '#854d0e', w1: '#a16207', w2: '#713f12', facade: 'industrial' }
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
