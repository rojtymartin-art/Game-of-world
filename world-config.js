window.GTA = window.GTA || {};

window.GTA.Config = (function () {
  const TILE_SIZE = 180;          // 1 štvorec = 180x180 px (široké cesty aj pre budúcu premávku)
  const GRID_SIZE = 72;           // 72x72 štvorcov
  const WORLD_SIZE = TILE_SIZE * GRID_SIZE; // 12 960 x 12 960 px

  // Typy podkladu (terénu)
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

  // Definícia štvrtí (názvy, popisy a štítky pre veľkú mapu)
  const DISTRICTS = {
    DOWNTOWN:   { id: 'DOWNTOWN',   name: 'Downtown',            sub: 'Finančné centrum & mrakodrapy', color: '#38bdf8' },
    OLD_TOWN:   { id: 'OLD_TOWN',   name: 'Northside',           sub: 'Staré sídlisko & bloky',        color: '#f97316' },
    BEACH:      { id: 'BEACH',      name: 'Palm Bay Beach',      sub: 'Pobrežná promenáda & mólo',     color: '#facc15' },
    INDUSTRIAL: { id: 'INDUSTRIAL', name: 'South Docks',         sub: 'Priemyselná zóna & prístav',    color: '#94a3b8' },
    AIRPORT:    { id: 'AIRPORT',    name: 'Grand City Airport',  sub: 'Medzinárodné letisko',          color: '#a855f7' },
    SUBURBS:    { id: 'SUBURBS',    name: 'West Hills',          sub: 'Vilová štvrť & lesy',           color: '#22c55e' },
    PARK:       { id: 'PARK',       name: 'Central Park',        sub: 'Mestský park',                  color: '#4ade80' },
    OCEAN:      { id: 'OCEAN',      name: 'Oceán',               sub: 'Otvorené more',                 color: '#0284c7' }
  };

  // Palety budov podľa štvrte
  const PALETTES = {
    DOWNTOWN: [
      { roof: '#334155', w1: '#1e293b', w2: '#0f172a' },
      { roof: '#475569', w1: '#334155', w2: '#1e293b' },
      { roof: '#2d3b52', w1: '#1c2638', w2: '#111827' },
      { roof: '#3e4c5e', w1: '#283342', w2: '#18202b' }
    ],
    OLD_TOWN: [
      { roof: '#57534e', w1: '#44403c', w2: '#292524' },
      { roof: '#6b5344', w1: '#523e32', w2: '#382a22' },
      { roof: '#52525b', w1: '#3f3f46', w2: '#27272a' },
      { roof: '#645952', w1: '#4c433d', w2: '#332d29' }
    ],
    SUBURBS: [
      { roof: '#9a3412', w1: '#d6d3d1', w2: '#a8a29e' },
      { roof: '#7c2d12', w1: '#e7e5e4', w2: '#b8b2aa' },
      { roof: '#334155', w1: '#cbd5e1', w2: '#94a3b8' },
      { roof: '#475569', w1: '#e2e8f0', w2: '#94a3b8' }
    ],
    INDUSTRIAL: [
      { roof: '#475569', w1: '#334155', w2: '#1e293b' },
      { roof: '#52525b', w1: '#3f3f46', w2: '#27272a' },
      { roof: '#4b5563', w1: '#374151', w2: '#1f2937' }
    ],
    CONTAINERS: [
      { roof: '#dc2626', w1: '#b91c1c', w2: '#7f1d1d' },
      { roof: '#2563eb', w1: '#1d4ed8', w2: '#1e3a8a' },
      { roof: '#d97706', w1: '#b45309', w2: '#78350f' },
      { roof: '#16a34a', w1: '#15803d', w2: '#14532d' }
    ]
  };

  // Predvídateľný generátor náhodných čísel (svet je pri každom spustení rovnaký)
  function createRNG(initialSeed) {
    let s = initialSeed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  return { TILE_SIZE, GRID_SIZE, WORLD_SIZE, TILES, DISTRICTS, PALETTES, createRNG };
})();
