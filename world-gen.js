window.GTA = window.GTA || {};

window.GTA.World = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const D = C.DISTRICTS;
  const N = C.GRID_SIZE;
  const TS = C.TILE_SIZE;
  const rand = C.createRNG(99247);

  const tiles = [];
  const districts = [];
  const solidGrid = [];
  const propsGrid = [];
  const shallowGrid = new Uint8Array(N * N);
  const landmarks = [];

  const gasStations = [
    { id: 'gs_dt',     r: 92,  c: 82,  name: 'Benzínka Grand City' },
    { id: 'gs_north',  r: 44,  c: 80,  name: 'Northwood Fuel' },
    { id: 'gs_desert', r: 62,  c: 112, name: 'Route 66 Gas' },
    { id: 'gs_forest', r: 96,  c: 44,  name: 'Pine Fuel Stop' },
    { id: 'gs_docks',  r: 122, c: 76,  name: 'Port Fuel' }
  ];
  gasStations.forEach(g => {
    g.x = g.c * TS + TS / 2;
    g.y = g.r * TS + TS / 2;
    g.destroyedTimer = 0;
  });

  const megaZones = {
    area69: { x1: 104 * TS, y1: 52 * TS, x2: 124 * TS, y2: 66 * TS },
    militaryBase: { x1: 52 * TS, y1: 18 * TS, x2: 74 * TS, y2: 28 * TS },
    speedway: {
      x1: 68 * TS, y1: 64 * TS, x2: 92 * TS, y2: 76 * TS,
      startX: 80 * TS + TS / 2, startY: 75 * TS + TS / 2
    },
    stadium: { x: 102 * TS, y: 80 * TS, w: 12 * TS, h: 10 * TS },
    cargoShip: { x: 68 * TS, y: 132 * TS, w: 16 * TS, h: 5 * TS },
    ferrisWheel: { x: 128 * TS + 90, y: 96 * TS + 180 },
    crane: { x: 66 * TS + 90, y: 108 * TS + 90 },
    grandSign: { x: 24 * TS + 20, y: 54 * TS + 90 },
    ufo: { x: 112 * TS + 90, y: 58 * TS + 90 },
    fountain: { x: 76 * TS + 90, y: 96 * TS + 90 }
  };

  const railPath = [
    { x: 46.5 * TS, y: 16.5 * TS },
    { x: 126.5 * TS, y: 16.5 * TS },
    { x: 126.5 * TS, y: 74.5 * TS },
    { x: 118.5 * TS, y: 74.5 * TS },
    { x: 118.5 * TS, y: 124.5 * TS },
    { x: 46.5 * TS, y: 124.5 * TS }
  ];

  function isRailCorridor(r, c) {
    if (r === 16 && c >= 46 && c <= 126) return true;
    if (c === 126 && r >= 16 && r <= 74) return true;
    if (r === 74 && c >= 118 && c <= 126) return true;
    if (c === 118 && r >= 74 && r <= 124) return true;
    if (r === 124 && c >= 46 && c <= 118) return true;
    if (c === 46 && r >= 16 && r <= 124) return true;
    return false;
  }

  // 70 znaciek rozhadzanych po celej mape, s roznymi velkostami a typmi budov
  // spanC / spanR = kolko polickok budova zabera (napr. IKEA/Walmart/Costco/Amazon su obrovske)
  const BRAND_DEFS = [
    // Tech & Cloud
    { id: 'b1_apple',     r: 86,  c: 74,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'APPLE',      name: 'Apple Flagship',       icon: '🍎', roof: '#cbd5e1', w1: '#f8fafc', w2: '#94a3b8', neon: '#38bdf8', height: 118, enterable: false },
    { id: 'b1_apple_2',   r: 40,  c: 68,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'APPLE',      name: 'Apple Northwood',      icon: '🍎', roof: '#e2e8f0', w1: '#f8fafc', w2: '#94a3b8', neon: '#38bdf8', height: 108, enterable: false },
    { id: 'b2_google',    r: 78,  c: 90,  spanC: 2, spanR: 1, arch: 'campus',       label: 'GOOGLE',     name: 'Google Campus',        icon: '🔎', roof: '#1d4ed8', w1: '#f8fafc', w2: '#cbd5e1', neon: '#38bdf8', height: 136, enterable: false },
    { id: 'b3_ms',        r: 42,  c: 88,  spanC: 2, spanR: 1, arch: 'campus',       label: 'MICROSOFT',  name: 'Microsoft Center',     icon: '🪟', roof: '#0284c7', w1: '#38bdf8', w2: '#0369a1', neon: '#38bdf8', height: 142, enterable: false },
    { id: 'b4_nvidia',    r: 60,  c: 100, spanC: 1, spanR: 1, arch: 'glass_store',  label: 'NVIDIA',     name: 'NVIDIA AI Lab',        icon: '💚', roof: '#14532d', w1: '#166534', w2: '#052e16', neon: '#4ade80', height: 124, enterable: false },
    { id: 'b5_aws',       r: 114, c: 92,  spanC: 2, spanR: 1, arch: 'warehouse',    label: 'AWS CLOUD',  name: 'Amazon AWS Hub',       icon: '☁️', roof: '#1e293b', w1: '#334155', w2: '#0f172a', neon: '#facc15', height: 126, enterable: false },
    { id: 'b6_meta',      r: 88,  c: 92,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'META',       name: 'Meta Studio',          icon: '♾️', roof: '#1d4ed8', w1: '#2563eb', w2: '#1e3a8a', neon: '#60a5fa', height: 120, enterable: false },
    { id: 'b7_samsung',   r: 92,  c: 102, spanC: 1, spanR: 1, arch: 'glass_store',  label: 'SAMSUNG',    name: 'Samsung Store',        icon: '📱', roof: '#1e3a8a', w1: '#f8fafc', w2: '#cbd5e1', neon: '#60a5fa', height: 112, enterable: false },
    { id: 'b8_tsmc',      r: 50,  c: 106, spanC: 2, spanR: 1, arch: 'warehouse',    label: 'TSMC',       name: 'TSMC Chip Plant',      icon: '🔬', roof: '#334155', w1: '#64748b', w2: '#475569', neon: '#38bdf8', height: 108, enterable: false },
    { id: 'b9_tiktok',    r: 102, c: 72,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'TIKTOK',     name: 'TikTok Creator Hub',   icon: '🎵', roof: '#09090b', w1: '#18181b', w2: '#09090b', neon: '#f43f5e', height: 102, enterable: false },
    { id: 'b10_intel',    r: 34,  c: 76,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'INTEL',      name: 'Intel Lab',            icon: '⚡', roof: '#0369a1', w1: '#0284c7', w2: '#075985', neon: '#38bdf8', height: 104, enterable: false },
    { id: 'b11_ibm',      r: 82,  c: 88,  spanC: 1, spanR: 1, arch: 'tower',        label: 'IBM',        name: 'IBM Tower',            icon: '💻', roof: '#1e3a8a', w1: '#cbd5e1', w2: '#94a3b8', neon: '#60a5fa', height: 168, enterable: false },
    { id: 'b12_oracle',   r: 112, c: 58,  spanC: 1, spanR: 1, arch: 'warehouse',    label: 'ORACLE',     name: 'Oracle Data Center',   icon: '🗄️', roof: '#7f1d1d', w1: '#991b1b', w2: '#450a0a', neon: '#ef4444', height: 98,  enterable: false },
    { id: 'b13_cisco',    r: 68,  c: 62,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'CISCO',      name: 'Cisco Tech',           icon: '🌐', roof: '#0f766e', w1: '#0d9488', w2: '#115e59', neon: '#2dd4bf', height: 96,  enterable: false },
    { id: 'b14_sony',     r: 106, c: 90,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'SONY',       name: 'Sony Entertainment',   icon: '🎧', roof: '#0f172a', w1: '#1e293b', w2: '#09090b', neon: '#f8fafc', height: 114, enterable: false },

    // Obrovske obchody & haly (IKEA, Walmart, Costco, Amazon, Home Depot...)
    { id: 'b19_ikea',     r: 40,  c: 58,  spanC: 3, spanR: 2, arch: 'megastore',    label: 'IKEA',       name: 'IKEA Mega Obchod',      icon: '🛋️', roof: '#1d4ed8', w1: '#facc15', w2: '#2563eb', neon: '#facc15', height: 96,  enterable: false },
    { id: 'b19_ikea_2',   r: 114, c: 78,  spanC: 2, spanR: 2, arch: 'megastore',    label: 'IKEA',       name: 'IKEA Docks Hall',      icon: '🛋️', roof: '#1d4ed8', w1: '#facc15', w2: '#2563eb', neon: '#facc15', height: 92,  enterable: false },
    { id: 'b15_walmart',  r: 48,  c: 88,  spanC: 2, spanR: 2, arch: 'megastore',    label: 'WALMART',    name: 'Walmart Supercenter',  icon: '🛒', roof: '#1d4ed8', w1: '#facc15', w2: '#2563eb', neon: '#facc15', height: 92,  enterable: false },
    { id: 'b16_amazon',   r: 114, c: 62,  spanC: 2, spanR: 2, arch: 'warehouse',    label: 'AMAZON',     name: 'Amazon Mega Sklad',    icon: '📦', roof: '#0f172a', w1: '#334155', w2: '#1e293b', neon: '#facc15', height: 104, enterable: false },
    { id: 'b17_costco',   r: 86,  c: 58,  spanC: 2, spanR: 1, arch: 'megastore',    label: 'COSTCO',     name: 'Costco Wholesale',     icon: '🏬', roof: '#b91c1c', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#ef4444', height: 88,  enterable: false },
    { id: 'b18_homedepot',r: 102, c: 58,  spanC: 2, spanR: 1, arch: 'warehouse',    label: 'HOME DEPOT', name: 'The Home Depot',       icon: '🔨', roof: '#c2410c', w1: '#ea580c', w2: '#9a3412', neon: '#fb923c', height: 86,  enterable: false },
    { id: 'b20_alibaba',  r: 114, c: 102, spanC: 2, spanR: 1, arch: 'warehouse',    label: 'ALIBABA',    name: 'Alibaba Cargo Hub',    icon: '🏮', roof: '#c2410c', w1: '#ea580c', w2: '#9a3412', neon: '#facc15', height: 96,  enterable: false },
    { id: 'b21_target',   r: 76,  c: 68,  spanC: 2, spanR: 1, arch: 'megastore',    label: 'TARGET',     name: 'Target Obchod',        icon: '🎯', roof: '#dc2626', w1: '#f8fafc', w2: '#e2e8f0', neon: '#ef4444', height: 86,  enterable: false },
    { id: 'b22_lidl',     r: 90,  c: 68,  spanC: 1, spanR: 1, arch: 'shop',         label: 'LIDL',       name: 'Lidl Supermarket',     icon: '🛍️', roof: '#1d4ed8', w1: '#facc15', w2: '#dc2626', neon: '#facc15', height: 78,  enterable: false },
    { id: 'b22_lidl_2',   r: 48,  c: 74,  spanC: 1, spanR: 1, arch: 'shop',         label: 'LIDL',       name: 'Lidl Northwood',       icon: '🛍️', roof: '#1d4ed8', w1: '#facc15', w2: '#dc2626', neon: '#facc15', height: 78,  enterable: false },

    // Auta & mobilita
    { id: 'b23_toyota',   r: 82,  c: 62,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'TOYOTA',     name: 'Toyota Autosalon',     icon: '🚗', roof: '#b91c1c', w1: '#f8fafc', w2: '#cbd5e1', neon: '#ef4444', height: 84,  enterable: false },
    { id: 'b24_tesla',    r: 76,  c: 84,  spanC: 2, spanR: 1, arch: 'showroom',     label: 'TESLA',      name: 'Tesla Superstore',     icon: '⚡', roof: '#991b1b', w1: '#f8fafc', w2: '#e2e8f0', neon: '#ef4444', height: 96,  enterable: false },
    { id: 'b24_tesla_2',  r: 48,  c: 62,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'TESLA',      name: 'Tesla North',          icon: '⚡', roof: '#991b1b', w1: '#f8fafc', w2: '#e2e8f0', neon: '#ef4444', height: 92,  enterable: false },
    { id: 'b25_vw',       r: 34,  c: 62,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'VOLKSWAGEN', name: 'Volkswagen Salon',     icon: '🚘', roof: '#1e3a8a', w1: '#38bdf8', w2: '#1d4ed8', neon: '#38bdf8', height: 82,  enterable: false },
    { id: 'b26_porsche',  r: 86,  c: 106, spanC: 1, spanR: 1, arch: 'showroom',     label: 'PORSCHE',    name: 'Porsche Centrum',      icon: '🏎️', roof: '#18181b', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#f8fafc', height: 96,  enterable: false },
    { id: 'b27_mercedes', r: 90,  c: 58,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'MERCEDES',   name: 'Mercedes-Benz Salon',  icon: '🚙', roof: '#0f172a', w1: '#cbd5e1', w2: '#94a3b8', neon: '#38bdf8', height: 94,  enterable: false },
    { id: 'b28_bmw',      r: 102, c: 68,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'BMW',        name: 'BMW M Salon',          icon: '🏁', roof: '#1e3a8a', w1: '#38bdf8', w2: '#0284c7', neon: '#38bdf8', height: 92,  enterable: false },
    { id: 'b29_ford',     r: 64,  c: 112, spanC: 1, spanR: 1, arch: 'showroom',     label: 'FORD',       name: 'Ford Route 66',        icon: '🛻', roof: '#1d4ed8', w1: '#2563eb', w2: '#1e3a8a', neon: '#60a5fa', height: 80,  enterable: false },
    { id: 'b30_honda',    r: 106, c: 62,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'HONDA',      name: 'Honda Motors',         icon: '🏍️', roof: '#991b1b', w1: '#f8fafc', w2: '#cbd5e1', neon: '#ef4444', height: 80,  enterable: false },
    { id: 'b31_hyundai',  r: 34,  c: 84,  spanC: 1, spanR: 1, arch: 'showroom',     label: 'HYUNDAI',    name: 'Hyundai Salon',        icon: '🔋', roof: '#0f172a', w1: '#38bdf8', w2: '#1e293b', neon: '#38bdf8', height: 82,  enterable: false },
    { id: 'b32_ferrari',  r: 86,  c: 110, spanC: 1, spanR: 1, arch: 'showroom',     label: 'FERRARI',    name: 'Ferrari Showroom',     icon: '🐎', roof: '#991b1b', w1: '#dc2626', w2: '#7f1d1d', neon: '#facc15', height: 100, enterable: false },

    // Financie & veze
    { id: 'b33_visa',     r: 82,  c: 90,  spanC: 1, spanR: 1, arch: 'tower',        label: 'VISA',       name: 'Visa Tower',           icon: '💳', roof: '#1e3a8a', w1: '#facc15', w2: '#1d4ed8', neon: '#facc15', height: 158, enterable: false },
    { id: 'b34_mc',       r: 82,  c: 92,  spanC: 1, spanR: 1, arch: 'tower',        label: 'MASTERCARD', name: 'Mastercard Tower',     icon: '🔴', roof: '#7f1d1d', w1: '#ea580c', w2: '#facc15', neon: '#facc15', height: 154, enterable: false },
    { id: 'b35_jpm',      r: 86,  c: 86,  spanC: 1, spanR: 1, arch: 'tower',        label: 'JPMORGAN',   name: 'JPMorgan HQ',          icon: '🏦', roof: '#1e293b', w1: '#cbd5e1', w2: '#94a3b8', neon: '#facc15', height: 185, enterable: false },
    { id: 'b36_bofa',     r: 90,  c: 86,  spanC: 1, spanR: 1, arch: 'tower',        label: 'BOFA',       name: 'Bank of America',      icon: '🏛️', roof: '#7f1d1d', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#ef4444', height: 165, enterable: false },
    { id: 'b37_icbc',     r: 86,  c: 88,  spanC: 1, spanR: 1, arch: 'tower',        label: 'ICBC',       name: 'ICBC Bank Tower',      icon: '💹', roof: '#991b1b', w1: '#dc2626', w2: '#7f1d1d', neon: '#facc15', height: 162, enterable: false },
    { id: 'b38_amex',     r: 90,  c: 88,  spanC: 1, spanR: 1, arch: 'tower',        label: 'AMEX',       name: 'American Express',     icon: '💎', roof: '#0369a1', w1: '#38bdf8', w2: '#0284c7', neon: '#38bdf8', height: 148, enterable: false },
    { id: 'b39_paypal',   r: 92,  c: 86,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'PAYPAL',     name: 'PayPal FinTech',       icon: '💸', roof: '#1e3a8a', w1: '#0284c7', w2: '#38bdf8', neon: '#38bdf8', height: 122, enterable: false },
    { id: 'b40_allianz',  r: 92,  c: 88,  spanC: 1, spanR: 1, arch: 'tower',        label: 'ALLIANZ',    name: 'Allianz Tower',        icon: '🛡️', roof: '#1e3a8a', w1: '#cbd5e1', w2: '#94a3b8', neon: '#38bdf8', height: 146, enterable: false },

    // Jedlo & napoje (mensie prevadzky + bistro/kaviarne)
    { id: 'b41_coke',     r: 94,  c: 104, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'COCA-COLA',  name: 'Coca-Cola Bistro',     icon: '🥤', roof: '#991b1b', w1: '#dc2626', w2: '#f8fafc', neon: '#ef4444', height: 72,  enterable: false },
    { id: 'b41_coke_2',   r: 48,  c: 68,  spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'COCA-COLA',  name: 'Coca-Cola North',      icon: '🥤', roof: '#991b1b', w1: '#dc2626', w2: '#f8fafc', neon: '#ef4444', height: 70,  enterable: false },
    { id: 'b42_mcd',      r: 94,  c: 108, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'MCDONALDS',  name: 'McDonald’s Palm Bay',  icon: '🍟', roof: '#991b1b', w1: '#facc15', w2: '#dc2626', neon: '#facc15', height: 74,  enterable: false },
    { id: 'b42_mcd_2',    r: 48,  c: 78,  spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'MCDONALDS',  name: 'McDonald’s Northwood', icon: '🍟', roof: '#991b1b', w1: '#facc15', w2: '#dc2626', neon: '#facc15', height: 74,  enterable: false },
    { id: 'b43_pepsi',    r: 98,  c: 104, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'PEPSI',      name: 'Pepsi Lounge',         icon: '🫧', roof: '#1e3a8a', w1: '#2563eb', w2: '#ef4444', neon: '#38bdf8', height: 72,  enterable: false },
    { id: 'b44_starbucks',r: 98,  c: 108, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'STARBUCKS',  name: 'Starbucks Café',       icon: '☕', roof: '#14532d', w1: '#15803d', w2: '#052e16', neon: '#4ade80', height: 74,  enterable: false },
    { id: 'b45_kfc',      r: 100, c: 104, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'KFC',        name: 'KFC Drive-In',         icon: '🍗', roof: '#7f1d1d', w1: '#dc2626', w2: '#f8fafc', neon: '#f87171', height: 70,  enterable: false },
    { id: 'b46_redbull',  r: 100, c: 108, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'RED BULL',   name: 'Red Bull Bar',         icon: '🐂', roof: '#1e3a8a', w1: '#facc15', w2: '#dc2626', neon: '#facc15', height: 78,  enterable: false },
    { id: 'b47_nestle',   r: 114, c: 72,  spanC: 1, spanR: 1, arch: 'warehouse',    label: 'NESTLE',     name: 'Nestlé Factory',       icon: '🍫', roof: '#1e3a8a', w1: '#f8fafc', w2: '#cbd5e1', neon: '#38bdf8', height: 88,  enterable: false },
    { id: 'b48_subway',   r: 104, c: 104, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'SUBWAY',     name: 'Subway Express',       icon: '🥪', roof: '#14532d', w1: '#facc15', w2: '#15803d', neon: '#facc15', height: 68,  enterable: false },
    { id: 'b49_bk',       r: 104, c: 108, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'BURGER KING',name: 'Burger King Grill',    icon: '🍔', roof: '#7c2d12', w1: '#ea580c', w2: '#facc15', neon: '#fb923c', height: 72,  enterable: false },
    { id: 'b50_heineken', r: 106, c: 104, spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'HEINEKEN',   name: 'Heineken Pub',         icon: '🍺', roof: '#14532d', w1: '#16a34a', w2: '#052e16', neon: '#4ade80', height: 76,  enterable: false },

    // Moda, luxus & sport
    { id: 'b51_nike',     r: 98,  c: 86,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'NIKE',       name: 'Nike Flagship',        icon: '✔️', roof: '#09090b', w1: '#f8fafc', w2: '#18181b', neon: '#f8fafc', height: 104, enterable: false },
    { id: 'b51_nike_2',   r: 48,  c: 84,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'NIKE',       name: 'Nike North',           icon: '✔️', roof: '#09090b', w1: '#f8fafc', w2: '#18181b', neon: '#f8fafc', height: 98,  enterable: false },
    { id: 'b52_lv',       r: 98,  c: 88,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'LOUIS V.',   name: 'Louis Vuitton',        icon: '👜', roof: '#451a03', w1: '#78350f', w2: '#92400e', neon: '#facc15', height: 118, enterable: false },
    { id: 'b53_adidas',   r: 98,  c: 90,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'ADIDAS',     name: 'Adidas Store',         icon: '👟', roof: '#0f172a', w1: '#e2e8f0', w2: '#334155', neon: '#38bdf8', height: 102, enterable: false },
    { id: 'b54_chanel',   r: 100, c: 86,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'CHANEL',     name: 'Chanel Boutique',      icon: '✨', roof: '#09090b', w1: '#f8fafc', w2: '#18181b', neon: '#f8fafc', height: 116, enterable: false },
    { id: 'b55_hermes',   r: 100, c: 88,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'HERMES',     name: 'Hermès Salon',         icon: '🧡', roof: '#7c2d12', w1: '#ea580c', w2: '#9a3412', neon: '#fb923c', height: 114, enterable: false },
    { id: 'b56_gucci',    r: 100, c: 90,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'GUCCI',      name: 'Gucci Luxury',         icon: '🐍', roof: '#14532d', w1: '#991b1b', w2: '#15803d', neon: '#facc15', height: 118, enterable: false },
    { id: 'b57_zara',     r: 102, c: 86,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'ZARA',       name: 'Zara Fashion',         icon: '👗', roof: '#09090b', w1: '#f8fafc', w2: '#cbd5e1', neon: '#f8fafc', height: 100, enterable: false },
    { id: 'b58_dior',     r: 102, c: 88,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'DIOR',       name: 'Dior Couture',         icon: '🌹', roof: '#1e293b', w1: '#f8fafc', w2: '#cbd5e1', neon: '#f472b6', height: 116, enterable: false },
    { id: 'b59_puma',     r: 102, c: 90,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'PUMA',       name: 'Puma Sport',           icon: '🐆', roof: '#18181b', w1: '#dc2626', w2: '#18181b', neon: '#f87171', height: 96,  enterable: false },
    { id: 'b60_cartier',  r: 106, c: 108, spanC: 1, spanR: 1, arch: 'boutique',     label: 'CARTIER',    name: 'Cartier Jewelry',      icon: '💍', roof: '#7f1d1d', w1: '#dc2626', w2: '#facc15', neon: '#facc15', height: 112, enterable: false },
    { id: 'b61_rolex',    r: 86,  c: 90,  spanC: 1, spanR: 1, arch: 'tower',        label: 'ROLEX',      name: 'Rolex Tower',          icon: '⌚', roof: '#14532d', w1: '#15803d', w2: '#facc15', neon: '#facc15', height: 144, enterable: false },
    { id: 'b62_loreal',   r: 86,  c: 92,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'LOREAL',     name: 'L’Oréal Studio',       icon: '💄', roof: '#09090b', w1: '#f8fafc', w2: '#e2e8f0', neon: '#f472b6', height: 112, enterable: false },

    // Media, zabava & telekomunikacie
    { id: 'b63_disney',   r: 102, c: 110, spanC: 2, spanR: 1, arch: 'campus',       label: 'DISNEY',     name: 'Disney Plaza',         icon: '🏰', roof: '#1d4ed8', w1: '#38bdf8', w2: '#f8fafc', neon: '#38bdf8', height: 110, enterable: false },
    { id: 'b64_netflix',  r: 102, c: 106, spanC: 1, spanR: 1, arch: 'boutique',     label: 'NETFLIX',    name: 'Netflix Cinema',       icon: '🎬', roof: '#450a0a', w1: '#dc2626', w2: '#09090b', neon: '#ef4444', height: 106, enterable: false },
    { id: 'b65_youtube',  r: 112, c: 88,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'YOUTUBE',    name: 'YouTube Hub',          icon: '▶️', roof: '#7f1d1d', w1: '#dc2626', w2: '#f8fafc', neon: '#ef4444', height: 104, enterable: false },
    { id: 'b66_ps',       r: 112, c: 90,  spanC: 1, spanR: 1, arch: 'glass_store',  label: 'PLAYSTATION',name: 'PlayStation Arena',    icon: '🎮', roof: '#1e3a8a', w1: '#2563eb', w2: '#38bdf8', neon: '#38bdf8', height: 110, enterable: false },
    { id: 'b67_nintendo', r: 112, c: 92,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'NINTENDO',   name: 'Nintendo World',       icon: '🕹️', roof: '#991b1b', w1: '#dc2626', w2: '#f8fafc', neon: '#ef4444', height: 102, enterable: false },
    { id: 'b68_verizon',  r: 88,  c: 106, spanC: 1, spanR: 1, arch: 'tower',        label: 'VERIZON',    name: 'Verizon 5G Tower',     icon: '📡', roof: '#09090b', w1: '#dc2626', w2: '#18181b', neon: '#ef4444', height: 152, enterable: false },
    { id: 'b69_dt',       r: 88,  c: 108, spanC: 1, spanR: 1, arch: 'tower',        label: 'TELEKOM',    name: 'Deutsche Telekom HQ',  icon: '📶', roof: '#831843', w1: '#ec4899', w2: '#f8fafc', neon: '#f472b6', height: 148, enterable: false },
    { id: 'b70_espn',     r: 84,  c: 104, spanC: 1, spanR: 1, arch: 'glass_store',  label: 'ESPN',       name: 'ESPN Sports',          icon: '🏆', roof: '#7f1d1d', w1: '#dc2626', w2: '#1e293b', neon: '#ef4444', height: 114, enterable: false }
  ];

  const LANDMARK_DEFS = [
    { id: 'ammu',     r: 92,  c: 78,  spanC: 1, spanR: 1, arch: 'shop',         label: 'AMMU',     name: 'Ammu-Nation',       icon: '🔫', roof: '#14532d', w1: '#166534', w2: '#052e16', neon: '#ef4444', height: 104, enterable: true },
    { id: 'burger',   r: 99,  c: 78,  spanC: 1, spanR: 1, arch: 'kiosk_bistro', label: 'BURGER',   name: 'Burger Shot',       icon: '🍔', roof: '#c2410c', w1: '#ea580c', w2: '#9a3412', neon: '#facc15', height: 88,  enterable: true },
    { id: 'home',     r: 99,  c: 82,  spanC: 1, spanR: 1, arch: 'boutique',     label: 'HOME',     name: 'Tvoj Byt',          icon: '🏠', roof: '#0369a1', w1: '#e2e8f0', w2: '#94a3b8', neon: '#38bdf8', height: 126, enterable: true },
    { id: 'bank',     r: 92,  c: 84,  spanC: 1, spanR: 1, arch: 'tower',        label: 'BANK',     name: 'Grand Bank',        icon: '🏦', roof: '#e2e8f0', w1: '#cbd5e1', w2: '#94a3b8', neon: '#facc15', height: 175, enterable: true },
    { id: 'casino',   r: 90,  c: 104, spanC: 1, spanR: 1, arch: 'campus',       label: 'CASINO',   name: 'Royal Casino',      icon: '🎰', roof: '#581c87', w1: '#7e22ce', w2: '#3b0764', neon: '#facc15', height: 185, enterable: true },
    { id: 'area51',   r: 56,  c: 116, spanC: 1, spanR: 1, arch: 'warehouse',    label: 'AREA 51',  name: 'Area 51 Lab',       icon: '👽', roof: '#14532d', w1: '#1e293b', w2: '#0f172a', neon: '#4ade80', height: 138, enterable: true },
    { id: 'police',   r: 92,  c: 70,  spanC: 1, spanR: 1, arch: 'tower',        label: 'LSPD',     name: 'Policajná stanica', icon: '🛡', roof: '#1e3a8a', w1: '#1d4ed8', w2: '#172554', neon: '#38bdf8', height: 132, enterable: false },
    { id: 'hospital', r: 84,  c: 74,  spanC: 1, spanR: 1, arch: 'campus',       label: 'HOSPITAL', name: 'Nemocnica',         icon: '✚',  roof: '#f8fafc', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#ef4444', height: 146, enterable: false }
  ];

  const ALL_BUILDINGS = LANDMARK_DEFS.concat(BRAND_DEFS);
  const landmarkMap = {};
  for (let i = 0; i < ALL_BUILDINGS.length; i++) {
    landmarkMap[ALL_BUILDINGS[i].r + ',' + ALL_BUILDINGS[i].c] = ALL_BUILDINGS[i];
  }

  function isRoadLike(t) {
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE || t === T.DIRT_ROAD;
  }
  function isDrivable(t) {
    return isRoadLike(t) || t === T.CONCRETE || t === T.RUNWAY || t === T.PIER || t === T.TRACK || t === T.STADIUM || t === T.PLAZA || t === T.SHIP_DECK;
  }
  function isNearRoadOrHighway(r, c) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        if (isRoadLike(tiles[rr][cc])) return true;
      }
    }
    return false;
  }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

  function widenRoad(r, c, tileType) {
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 1 || rr >= N - 1 || cc < 1 || cc >= N - 1) continue;
        if (tiles[rr][cc] === T.WATER) continue;
        if (tiles[rr][cc] === T.STADIUM || tiles[rr][cc] === T.RUNWAY) continue;
        tiles[rr][cc] = tileType;
      }
    }
  }

  function isMainland(r, c) {
    const northEdge = 10 + Math.round(Math.sin(c * 0.08) * 2.0);
    if (r < northEdge) return false;
    if (r < 34 && c < 36) return false;

    const westEdge = (r < 36 ? 36 : 12 + Math.round(Math.sin(r * 0.07) * 2.5));
    if (c < westEdge) return false;

    if (r > 122 && c > 118) return false;
    if (r > 124 && c < 42) return false;

    const eastEdge = (r < 75 ? 134 : 126) + Math.round(Math.cos(r * 0.08) * 2.5);
    if (c > eastEdge) return false;

    const southEdge = (c >= 48 && c <= 108 ? 128 : 118) + Math.round(Math.sin(c * 0.09) * 2.2);
    if (r > southEdge) return false;

    return true;
  }

  function generate() {
    for (let r = 0; r < N; r++) {
      tiles[r] = []; districts[r] = []; solidGrid[r] = []; propsGrid[r] = [];
      for (let c = 0; c < N; c++) {
        solidGrid[r][c] = []; propsGrid[r][c] = [];

        if (r >= 12 && r <= 24 && c >= 12 && c <= 24) {
          const isRim = (r === 12 || r === 24 || c === 12 || c === 24);
          tiles[r][c] = isRim ? T.SAND : T.CONCRETE;
          districts[r][c] = D.ALCATRAZ;
          continue;
        }

        const dSmug = Math.hypot((r - 132) * 1.0, (c - 132) * 1.0);
        if (dSmug <= 9.5) {
          tiles[r][c] = dSmug > 6.8 ? T.SAND : T.GRASS;
          districts[r][c] = D.SMUGGLER;
          continue;
        }

        if (!isMainland(r, c)) {
          tiles[r][c] = T.WATER;
          districts[r][c] = D.OCEAN;
          continue;
        }

        if (r >= 32 && r <= 56 && c >= 58 && c <= 112) {
          if (c >= 86 && c <= 108 && r >= 35 && r <= 44) {
            tiles[r][c] = T.CONCRETE;
            districts[r][c] = D.AIRPORT;
          } else {
            tiles[r][c] = T.SIDEWALK;
            districts[r][c] = D.NORTHWOOD;
          }
        } else if (r < 72 && c >= 50) {
          tiles[r][c] = T.DESERT;
          districts[r][c] = D.DESERT;
        } else if (c < 50) {
          tiles[r][c] = (c <= 22 || r <= 54 || rand() < 0.45) ? T.FOREST : T.GRASS;
          districts[r][c] = (r >= 44 && r <= 58 && c >= 22 && c <= 38) ? D.MT_GRAND : D.FOREST;
        } else if (r >= 116) {
          tiles[r][c] = T.CONCRETE;
          districts[r][c] = D.DOCKS;
        } else if (c >= 102 && r >= 88) {
          const eastLim = 126 + Math.round(Math.cos(r * 0.08) * 2.5);
          tiles[r][c] = (c >= eastLim - 3) ? T.SAND : T.SIDEWALK;
          districts[r][c] = D.CANALS;
        } else {
          tiles[r][c] = T.SIDEWALK;
          districts[r][c] = D.DOWNTOWN;
        }
      }
    }

    for (let c = 88; c <= 106; c++) { tiles[38][c] = T.RUNWAY; tiles[39][c] = T.RUNWAY; }

    for (let r = 74; r <= 90; r++) {
      for (let c = 22; c <= 34; c++) {
        const dLake = Math.hypot((r - 82) / 8, (c - 28) / 6);
        if (dLake <= 1.0) {
          tiles[r][c] = (r >= 81 && r <= 83 && c >= 27 && c <= 29) ? T.GRASS : T.WATER;
          districts[r][c] = D.FOREST;
        }
      }
    }

    for (let c = 128; c <= 136; c++) tiles[132][c] = T.DIRT_ROAD;
    tiles[131][124] = T.PIER;

    const canalRows = [92, 102, 110];
    for (let k = 0; k < canalRows.length; k++) {
      const cr = canalRows[k];
      for (let c = 112; c <= 132; c++) {
        tiles[cr][c] = T.WATER;
        districts[cr][c] = D.CANALS;
      }
    }

    for (let r = 96; r <= 97; r++) {
      for (let c = 124; c <= 138; c++) {
        tiles[r][c] = T.PIER;
        districts[r][c] = D.CANALS;
      }
    }

    for (let r = 18; r <= 27; r++) {
      for (let c = 52; c <= 73; c++) {
        tiles[r][c] = T.CONCRETE;
        districts[r][c] = D.AREA69;
      }
    }
    for (let c = 55; c <= 70; c++) tiles[20][c] = T.RUNWAY;

    for (let r = 52; r <= 65; r++) {
      for (let c = 104; c <= 123; c++) {
        tiles[r][c] = T.CONCRETE;
        districts[r][c] = D.AREA69;
      }
    }

    for (let r = 64; r <= 75; r++) {
      for (let c = 68; c <= 91; c++) {
        tiles[r][c] = T.GRASS;
        districts[r][c] = D.SPEEDWAY;
      }
    }
    for (let c = 70; c <= 89; c++) { tiles[66][c] = T.TRACK; tiles[75][c] = T.TRACK; }
    for (let r = 66; r <= 75; r++) { tiles[r][70] = T.TRACK; tiles[r][89] = T.TRACK; }

    for (let r = 79; r <= 90; r++) {
      for (let c = 101; c <= 113; c++) {
        districts[r][c] = D.STADIUM;
        tiles[r][c] = (r >= 81 && r <= 88 && c >= 103 && c <= 111) ? T.STADIUM : T.CONCRETE;
      }
    }

    for (let r = 130; r <= 138; r++) {
      for (let c = 66; c <= 86; c++) {
        tiles[r][c] = T.WATER;
        districts[r][c] = D.DOCKS;
      }
    }
    for (let r = 132; r <= 135; r++) {
      for (let c = 70; c <= 81; c++) {
        tiles[r][c] = T.SHIP_DECK;
        districts[r][c] = D.DOCKS;
      }
    }
    tiles[131][74] = T.PIER; tiles[131][75] = T.PIER;

    for (let r = 34; r <= 120; r += 2) widenRoad(r, 56, T.HIGHWAY);
    for (let r = 56; r <= 120; r += 2) widenRoad(r, 96, T.HIGHWAY);
    for (let c = 44; c <= 122; c += 2) widenRoad(62, c, T.HIGHWAY);
    for (let c = 50; c <= 122; c += 2) widenRoad(96, c, T.HIGHWAY);
    for (let c = 50; c <= 114; c += 2) widenRoad(120, c, T.HIGHWAY);

    for (let r = 95; r <= 97; r++) {
      for (let c = 75; c <= 77; c++) {
        tiles[r][c] = (r === 96 && c === 76) ? T.PLAZA : T.HIGHWAY;
      }
    }

    const roadRows = [36, 46, 80, 108];
    for (let k = 0; k < roadRows.length; k++) {
      const rr = roadRows[k];
      for (let c = 56; c <= 114; c += 2) {
        if (tiles[rr][c] === T.STADIUM || tiles[rr][c] === T.WATER || tiles[rr][c] === T.RUNWAY) continue;
        widenRoad(rr, c, T.ROAD);
      }
    }
    const roadCols = [66, 84, 108];
    for (let k = 0; k < roadCols.length; k++) {
      const cc = roadCols[k];
      for (let r = 34; r <= 118; r += 2) {
        if (tiles[r][cc] === T.STADIUM || tiles[r][cc] === T.RUNWAY) continue;
        widenRoad(r, cc, tiles[r][cc] === T.WATER ? T.BRIDGE : T.ROAD);
      }
    }

    for (let r = 34; r <= 62; r++) tiles[r][42] = T.ROAD;
    for (let c = 18; c <= 42; c++) tiles[62][c] = T.ROAD;
    for (let r = 62; r <= 104; r++) tiles[r][18] = T.ROAD;
    for (let c = 18; c <= 56; c++) tiles[104][c] = T.ROAD;
    for (let c = 26; c <= 42; c++) tiles[54][c] = T.DIRT_ROAD;
    for (let r = 28; r <= 62; r++) tiles[r][78] = T.DIRT_ROAD;

    for (let i = 0; i < gasStations.length; i++) {
      tiles[gasStations[i].r][gasStations[i].c] = T.CONCRETE;
    }

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (tiles[r][c] !== T.WATER) continue;
        let nearLand = false;
        for (let dr = -2; dr <= 2 && !nearLand; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && tiles[nr][nc] !== T.WATER) {
              nearLand = true; break;
            }
          }
        }
        if (nearLand) shallowGrid[r * N + c] = 1;
      }
    }

    // Najprv uvolnime a vycistime priestor pre velke viacblokove znacky (IKEA, Walmart, Amazon, Costco...)
    const reserved = new Set();
    for (let i = 0; i < ALL_BUILDINGS.length; i++) {
      const b = ALL_BUILDINGS[i];
      const sc = b.spanC || 1;
      const sr = b.spanR || 1;
      for (let dr = 0; dr < sr; dr++) {
        for (let dc = 0; dc < sc; dc++) {
          const rr = b.r + dr, cc = b.c + dc;
          if (rr > 1 && rr < N - 2 && cc > 1 && cc < N - 2) {
            if (!isRoadLike(tiles[rr][cc]) && tiles[rr][cc] !== T.WATER) {
              tiles[rr][cc] = T.CONCRETE;
            }
            if (dr > 0 || dc > 0) reserved.add(rr + ',' + cc);
          }
        }
      }
    }

    const gsKeys = {};
    gasStations.forEach(g => { gsKeys[g.r + ',' + g.c] = g; });

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (reserved.has(r + ',' + c)) continue;

        const t = tiles[r][c];
        const dist = districts[r][c];
        const wx = c * TS, wy = r * TS;

        if (isRoadLike(t) || isDrivable(t) || t === T.WATER) continue;
        if (isRailCorridor(r, c)) continue;

        if (r === 96 && c === 76) {
          solidGrid[r][c].push({
            x: wx + 38, y: wy + 38, w: 104, h: 104,
            height: 32, roof: '#38bdf8', w1: '#cbd5e1', w2: '#94a3b8', style: 'fountain'
          });
          continue;
        }

        const lm = landmarkMap[r + ',' + c];
        if (lm) {
          const sc = lm.spanC || 1;
          const sr = lm.spanR || 1;
          const fullW = sc * TS;
          const fullH = sr * TS;

          // Mensie stanky/bistra su uzsie, obrovske haly zaberaju vacsiu plochu s odstupom od cesty
          let padX = 16, padY = 16, padW = 16, padH = 16;
          if (lm.arch === 'kiosk_bistro') {
            padX = 36; padW = 36; padY = 42; padH = 42;
          } else if (sc > 1 || sr > 1 || lm.arch === 'megastore') {
            padX = 14; padW = 14; padY = 14; padH = 14;
          }

          const bx = wx + padX;
          const by = wy + padY;
          const bw = Math.max(76, fullW - padX - padW);
          const bh = Math.max(76, fullH - padY - padH);

          solidGrid[r][c].push({
            x: bx, y: by, w: bw, h: bh,
            height: lm.height, roof: lm.roof, w1: lm.w1, w2: lm.w2,
            neon: lm.neon, arch: lm.arch || 'classic',
            style: 'landmark',
            landmarkLabel: lm.label, landmarkIcon: lm.icon
          });

          landmarks.push({
            id: lm.id, name: lm.name, label: lm.label, icon: lm.icon,
            color: lm.neon, x: bx + bw / 2, y: by + bh + 6, enterable: !!lm.enterable
          });
          continue;
        }

        if (gsKeys[r + ',' + c]) {
          solidGrid[r][c].push({
            x: wx + 22, y: wy + 22, w: 68, h: 54,
            height: 42, roof: '#dc2626', w1: '#f8fafc', w2: '#cbd5e1', neon: '#facc15',
            style: 'gas_shop', arch: 'shop'
          });
          continue;
        }

        if (r === 54 && c >= 22 && c <= 38) continue;
        if (r === 58 && c === 112) continue;

        if (dist === D.ALCATRAZ) {
          if (r === 18 && c >= 16 && c <= 20) {
            solidGrid[r][c].push({
              x: wx + 16, y: wy + 18, w: TS - 32, h: TS - 36,
              height: 102, roof: '#475569', w1: '#64748b', w2: '#334155',
              style: 'classic', arch: 'classic', helipad: (c === 18)
            });
          } else if ((r === 14 || r === 22) && (c === 14 || c === 22)) {
            solidGrid[r][c].push({
              x: wx + 40, y: wy + 40, w: 100, h: 100,
              height: 150, roof: '#334155', w1: '#94a3b8', w2: '#475569', neon: '#ef4444', style: 'tower', arch: 'tower'
            });
          }
          continue;
        }

        if (r >= 18 && r <= 27 && c >= 52 && c <= 73) {
          const isGate = (r === 27 && c === 62);
          const isPerim = (r === 18 || r === 27 || c === 52 || c === 73);
          if (isPerim && !isGate) {
            solidGrid[r][c].push({
              x: wx + (c === 73 ? TS - 20 : 6),
              y: wy + (r === 27 ? TS - 20 : 6),
              w: (c === 52 || c === 73) ? 14 : TS - 12,
              h: (r === 18 || r === 27) ? 14 : TS - 12,
              height: 46, roof: '#3f4d36', w1: '#334155', w2: '#1e293b', style: 'wall', arch: 'wall'
            });
          } else if (r === 23 && (c === 56 || c === 66)) {
            solidGrid[r][c].push({
              x: wx + 18, y: wy + 22, w: TS - 36, h: TS - 44,
              height: 84, roof: '#3f4d36', w1: '#4d5d43', w2: '#2d3826', style: 'hangar', arch: 'warehouse'
            });
          }
          continue;
        }

        if (r >= 52 && r <= 65 && c >= 104 && c <= 123) {
          const isGate = (r === 65 && c === 116);
          const isPerim = (r === 52 || r === 65 || c === 104 || c === 123);
          if (isPerim && !isGate) {
            solidGrid[r][c].push({
              x: wx + (c === 123 ? TS - 20 : 6),
              y: wy + (r === 65 ? TS - 20 : 6),
              w: (c === 104 || c === 123) ? 14 : TS - 12,
              h: (r === 52 || r === 65) ? 14 : TS - 12,
              height: 42, roof: '#14532d', w1: '#1e293b', w2: '#0f172a', style: 'wall', arch: 'wall'
            });
          }
          continue;
        }

        if (dist === D.SPEEDWAY) {
          if (r === 64 && c >= 74 && c <= 86 && c % 2 === 0) {
            solidGrid[r][c].push({
              x: wx + 16, y: wy + 20, w: TS - 32, h: 92,
              height: 78, roof: '#dc2626', w1: '#e2e8f0', w2: '#94a3b8', style: 'warehouse', arch: 'warehouse'
            });
          }
          continue;
        }

        if (dist === D.STADIUM) {
          if ((r === 81 || r === 88) && c >= 103 && c <= 111 && c % 2 === 1) {
            solidGrid[r][c].push({
              x: wx + 14, y: wy + (r === 81 ? 12 : TS - 66), w: TS - 28, h: 54,
              height: 115, roof: '#f8fafc', w1: '#1e3a8a', w2: '#0f172a', neon: '#38bdf8', style: 'classic', arch: 'tower'
            });
          }
          continue;
        }

        if (t === T.SAND) {
          if (rand() < 0.25) propsGrid[r][c].push({ type: 'palm', x: wx + 55 + rand() * 70, y: wy + 55 + rand() * 70, r: 22 + rand() * 8 });
          continue;
        }

        if (dist === D.DESERT) {
          if (rand() < 0.05) {
            solidGrid[r][c].push({
              x: wx + 22, y: wy + 22, w: TS - 44, h: TS - 44,
              height: 76 + rand() * 72, roof: '#c2410c', w1: '#9a3412', w2: '#7c2d12', style: 'mesa', arch: 'mesa'
            });
          } else if (rand() < 0.35) {
            propsGrid[r][c].push({ type: 'cactus', x: wx + 40 + rand() * 100, y: wy + 40 + rand() * 100 });
          }
          continue;
        }

        if (dist === D.FOREST || dist === D.MT_GRAND) {
          if (rand() < 0.05) {
            const pal = pick(C.PALETTES.FOREST);
            solidGrid[r][c].push({ x: wx + 28, y: wy + 28, w: 124, h: 112, height: 50, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa', arch: 'boutique' });
          } else {
            const cnt = t === T.FOREST ? 2 : 1;
            for (let k = 0; k < cnt; k++) {
              propsGrid[r][c].push({ type: 'pine', x: wx + 35 + rand() * 110, y: wy + 35 + rand() * 110, r: 20 + rand() * 10 });
            }
          }
          continue;
        }

        if (dist === D.DOCKS) {
          if (rand() < 0.14) {
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({ x: wx + 20, y: wy + 20, w: TS - 40, h: TS - 40, height: 70 + rand() * 42, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'warehouse', arch: 'warehouse' });
          }
          continue;
        }

        if (rand() > 0.22) {
          if (rand() < 0.35) {
            propsGrid[r][c].push({ type: dist === D.CANALS ? 'palm' : 'tree', x: wx + 55, y: wy + 55, r: 18 });
            propsGrid[r][c].push({ type: 'bench', x: wx + 115, y: wy + 40 });
          }
          continue;
        }

        const padX = (c > 0 && isRoadLike(tiles[r][c - 1])) ? 26 : 16;
        const padW = (c < N - 1 && isRoadLike(tiles[r][c + 1])) ? 26 : 16;
        const padY = (r > 0 && isRoadLike(tiles[r - 1][c])) ? 26 : 16;
        const padH = (r < N - 1 && isRoadLike(tiles[r + 1][c])) ? 26 : 16;

        const isMiami = (dist === D.CANALS);
        const pool = isMiami ? C.PALETTES.BEACH : C.PALETTES.DOWNTOWN;
        const pal = pick(pool);
        const height = isMiami ? (86 + rand() * 92) : (152 + rand() * 155);
        const hasHeli = !isMiami && height > 215 && rand() < 0.45;
        const hasPool = !hasHeli && (isMiami || rand() < 0.32);

        solidGrid[r][c].push({
          x: wx + padX, y: wy + padY,
          w: Math.max(70, TS - padX - padW),
          h: Math.max(70, TS - padY - padH),
          height: height, roof: pal.roof, w1: pal.w1, w2: pal.w2, arch: 'tower',
          neon: rand() < 0.5 ? pick(['#38bdf8', '#f43f5e', '#a855f7', '#22d3ee', '#facc15']) : null,
          helipad: hasHeli, roofPool: hasPool, acUnit: !hasHeli && !hasPool, antenna: rand() < 0.45,
          sign: !hasHeli && rand() < 0.35 ? pick(['GRAND TOWER', 'ROYAL CLUB', 'VIP LOFT', 'APEX PLAZA', 'NORTH HOTEL']) : null
        });
      }
    }
  }

  function checkCollision(x, y, radius) {
    if (x - radius < 0 || y - radius < 0 || x + radius > C.WORLD_SIZE || y + radius > C.WORLD_SIZE) return true;
    const tc = Math.floor(x / TS), tr = Math.floor(y / TS);
    for (let r = tr - 1; r <= tr + 1; r++) {
      if (r < 0 || r >= N) continue;
      for (let c = tc - 1; c <= tc + 1; c++) {
        if (c < 0 || c >= N) continue;
        if (tiles[r][c] === T.WATER && circleRectHit(x, y, radius, c * TS, r * TS, TS, TS)) return true;
        const objs = solidGrid[r][c];
        for (let i = 0; i < objs.length; i++) {
          const b = objs[i];
          if (circleRectHit(x, y, radius, b.x, b.y, b.w, b.h)) return true;
        }
      }
    }
    return false;
  }

  function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
  }

  function getDistrictAt(x, y) {
    const c = Math.max(0, Math.min(N - 1, Math.floor(x / TS)));
    const r = Math.max(0, Math.min(N - 1, Math.floor(y / TS)));
    return districts[r][c];
  }

  generate();

  return {
    tiles: tiles, districts: districts, solidGrid: solidGrid, propsGrid: propsGrid,
    shallowGrid: shallowGrid, landmarks: landmarks, gasStations: gasStations,
    megaZones: megaZones, railPath: railPath,
    isRoadLike: isRoadLike, isNearRoadOrHighway: isNearRoadOrHighway,
    checkCollision: checkCollision, getDistrictAt: getDistrictAt,
    spawnX: 78 * TS + TS / 2,
    spawnY: 96 * TS + TS / 2
  };
})();
