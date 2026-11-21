window.GTA = window.GTA || {};

window.GTA.World = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const D = C.DISTRICTS;
  const N = C.GRID_SIZE;
  const TS = C.TILE_SIZE;
  const rand = C.createRNG(88421);

  const tiles = [];
  const districts = [];
  const solidGrid = [];
  const propsGrid = [];
  const landmarks = [];

  function riverCol(r) { return 25 + Math.round(Math.sin(r * 0.11) * 1.5); }
  function shoreCol(r) { return 64 + Math.round(Math.sin(r * 0.13) * 1.5); }
  function southBayRow(c) { return 65 + Math.round(Math.cos(c * 0.14) * 1.2); }

  function isDrivable(t) {
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE || t === T.CONCRETE || t === T.RUNWAY || t === T.PIER;
  }
  function isRoadLike(t) {
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE;
  }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

  // 7 unikátnych hlavných budov na pevných blokoch priamo pri hlavných uliciach
  const LANDMARK_DEFS = [
    { id: 'ammu',     r: 31, c: 43, doorSide: 'S', label: 'AMMU',     name: 'Ammu-Nation',      icon: '🔫', roof: '#14532d', w1: '#166534', w2: '#052e16', neon: '#ef4444', height: 68,  facade: 'classic', enterable: true },
    { id: 'burger',   r: 33, c: 43, doorSide: 'N', label: 'BURGER',   name: 'Burger Shot',      icon: '🍔', roof: '#c2410c', w1: '#ea580c', w2: '#9a3412', neon: '#facc15', height: 55,  facade: 'balcony', enterable: true },
    { id: 'home',     r: 33, c: 45, doorSide: 'N', label: 'HOME',     name: 'Tvoj Byt',         icon: '🏠', roof: '#0369a1', w1: '#e2e8f0', w2: '#94a3b8', neon: '#38bdf8', height: 85,  facade: 'balcony', enterable: true },
    { id: 'bank',     r: 31, c: 48, doorSide: 'S', label: 'BANK',     name: 'Grand Bank',       icon: '🏦', roof: '#e2e8f0', w1: '#cbd5e1', w2: '#94a3b8', neon: '#facc15', height: 115, facade: 'marble',  enterable: true },
    { id: 'casino',   r: 31, c: 55, doorSide: 'S', label: 'CASINO',   name: 'Royal Casino',     icon: '🎰', roof: '#581c87', w1: '#7e22ce', w2: '#3b0764', neon: '#facc15', height: 125, facade: 'balcony', enterable: true },
    { id: 'police',   r: 31, c: 39, doorSide: 'S', label: 'LSPD',     name: 'Policajná stanica',icon: '🛡', roof: '#1e3a8a', w1: '#1d4ed8', w2: '#172554', neon: '#38bdf8', height: 90,  facade: 'marble',  enterable: false },
    { id: 'hospital', r: 19, c: 43, doorSide: 'W', label: 'HOSPITAL', name: 'Nemocnica',        icon: '✚',  roof: '#f8fafc', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#ef4444', height: 100, facade: 'marble',  enterable: false }
  ];

  const landmarkMap = {};
  for (let i = 0; i < LANDMARK_DEFS.length; i++) {
    landmarkMap[LANDMARK_DEFS[i].r + ',' + LANDMARK_DEFS[i].c] = LANDMARK_DEFS[i];
  }

  function generate() {
    // 1. Terén a štvrte
    for (let r = 0; r < N; r++) {
      tiles[r] = []; districts[r] = []; solidGrid[r] = []; propsGrid[r] = [];
      const rc = riverCol(r), sc = shoreCol(r);

      for (let c = 0; c < N; c++) {
        solidGrid[r][c] = []; propsGrid[r][c] = [];
        const bayR = southBayRow(c);

        if (c >= sc || r >= bayR || (c >= rc && c <= rc + 1)) {
          tiles[r][c] = T.WATER; districts[r][c] = D.OCEAN; continue;
        }
        if (r <= 1 || c <= 1) {
          tiles[r][c] = T.FOREST; districts[r][c] = D.SUBURBS; continue;
        }

        if (c < rc) {
          tiles[r][c] = T.GRASS;
          districts[r][c] = r >= 40 ? D.AIRPORT : D.SUBURBS;
        } else {
          if (c >= sc - 2 && r < 52) {
            tiles[r][c] = T.SAND; districts[r][c] = D.BEACH;
          } else if (r >= 49) {
            tiles[r][c] = T.CONCRETE; districts[r][c] = D.INDUSTRIAL;
          } else if (r < 19) {
            tiles[r][c] = T.SIDEWALK; districts[r][c] = D.OLD_TOWN;
          } else {
            tiles[r][c] = T.SIDEWALK; districts[r][c] = D.DOWNTOWN;
          }
        }
      }
    }

    // 2. Central Park
    for (let r = 24; r <= 30; r++) {
      for (let c = 35; c <= 40; c++) {
        districts[r][c] = D.PARK;
        tiles[r][c] = (r >= 26 && r <= 28 && c >= 37 && c <= 38) ? T.WATER : T.GRASS;
      }
    }

    // 3. Letisko + dráha
    for (let r = 42; r <= 55; r++) {
      for (let c = 4; c <= 21; c++) {
        if (tiles[r][c] !== T.WATER) { tiles[r][c] = T.CONCRETE; districts[r][c] = D.AIRPORT; }
      }
    }
    for (let c = 5; c <= 20; c++) { tiles[48][c] = T.RUNWAY; tiles[49][c] = T.RUNWAY; }

    // 4. Prístavné móla + plážové mólo
    const dockCols = [[35, 37], [47, 49]];
    for (let d = 0; d < dockCols.length; d++) {
      for (let r = 62; r <= 68; r++) {
        for (let c = dockCols[d][0]; c <= dockCols[d][1]; c++) {
          tiles[r][c] = T.CONCRETE; districts[r][c] = D.INDUSTRIAL;
        }
      }
    }
    const pierStart = shoreCol(32);
    for (let c = pierStart - 1; c <= pierStart + 4; c++) {
      if (c < N - 1) { tiles[32][c] = T.PIER; districts[32][c] = D.BEACH; }
    }

    // 5. Cesty, diaľnice a mosty
    const mainRows = [12, 32, 58];
    const mainCols = [12, 42, 56];

    for (let r = 2; r < N - 2; r++) {
      const rc = riverCol(r), sc = shoreCol(r);
      for (let c = 2; c < N - 2; c++) {
        const bayR = southBayRow(c);
        if (c >= sc - 1 || r >= bayR - 1) continue;
        if ((r >= 24 && r <= 30 && c >= 35 && c <= 40) || (r >= 42 && r <= 55 && c >= 4 && c <= 21)) continue;

        const isMainR = mainRows.includes(r);
        const isMainC = mainCols.includes(c) && !(c === 12 && r > 41);

        if (c >= rc && c <= rc + 1) {
          if (isMainR) { tiles[r][c] = T.BRIDGE; districts[r][c] = r === 58 ? D.INDUSTRIAL : D.DOWNTOWN; }
          continue;
        }
        if (isMainR || isMainC) { tiles[r][c] = T.HIGHWAY; continue; }
        if (c === rc - 1 || c === rc + 2) { if (r >= 4 && r <= 60) tiles[r][c] = T.ROAD; continue; }

        const dist = districts[r][c];
        if (dist === D.DOWNTOWN || dist === D.OLD_TOWN) {
          if (r % 3 === 2 || c % 3 === 2) tiles[r][c] = T.ROAD;
        } else if (dist === D.SUBURBS) {
          if (r % 4 === 0 || c % 4 === 0) tiles[r][c] = T.ROAD;
        } else if (dist === D.INDUSTRIAL) {
          if (r % 4 === 2 || c % 4 === 2) tiles[r][c] = T.ROAD;
        }
      }
    }
    for (let r = 38; r <= 42; r++) tiles[r][12] = T.HIGHWAY;
    for (let c = 56; c < pierStart - 1; c++) tiles[32][c] = T.HIGHWAY;

    // 6. Generovanie rôznorodých budov, landmarkov a prírody
    for (let r = 0; r < N; r++) {
      const sc = shoreCol(r);
      for (let c = 0; c < N; c++) {
        const t = tiles[r][c];
        const dist = districts[r][c];
        const wx = c * TS, wy = r * TS;

        // Špeciálna hlavná budova (Landmark)?
        const lm = landmarkMap[r + ',' + c];
        if (lm) {
          tiles[r][c] = T.SIDEWALK;
          const m = 18;
          solidGrid[r][c].push({
            x: wx + m, y: wy + m, w: TS - m * 2, h: TS - m * 2,
            height: lm.height, roof: lm.roof, w1: lm.w1, w2: lm.w2,
            neon: lm.neon, facade: lm.facade, style: 'landmark',
            landmarkLabel: lm.label, landmarkIcon: lm.icon
          });
          // Pozícia svietiacich vstupných dverí na chodníku pred budovou
          let dx = wx + TS / 2, dy = wy + TS - 9;
          if (lm.doorSide === 'N') dy = wy + 9;
          else if (lm.doorSide === 'W') { dx = wx + 9; dy = wy + TS / 2; }
          else if (lm.doorSide === 'E') { dx = wx + TS - 9; dy = wy + TS / 2; }
          landmarks.push({
            id: lm.id, name: lm.name, label: lm.label, icon: lm.icon,
            color: lm.neon, x: dx, y: dy, enterable: lm.enterable
          });
          continue;
        }

        if (t === T.FOREST) { addForestBorder(r, c, wx, wy); continue; }

        if (dist === D.INDUSTRIAL && r >= 62 && (c === 35 || c === 49) && r % 2 === 0) {
          addContainers(r, c, wx, wy); continue;
        }

        // Letiskové hangáre a veža
        if (dist === D.AIRPORT && r === 42 && (c === 6 || c === 9 || c === 15 || c === 18)) {
          solidGrid[r][c].push({
            x: wx + 12, y: wy + 14, w: TS - 24, h: TS - 28,
            height: 70, roof: '#64748b', w1: '#475569', w2: '#334155',
            style: 'hangar', facade: 'industrial'
          });
          continue;
        }
        if (dist === D.AIRPORT && r === 43 && c === 20) {
          solidGrid[r][c].push({
            x: wx + 46, y: wy + 46, w: TS - 92, h: TS - 92,
            height: 175, roof: '#38bdf8', w1: '#cbd5e1', w2: '#94a3b8',
            neon: '#ef4444', style: 'tower', facade: 'glass'
          });
          continue;
        }

        if (t === T.WATER || isDrivable(t)) continue;

        // Pláž
        if (t === T.SAND) {
          if (rand() < 0.48) propsGrid[r][c].push({ type: 'palm', x: wx + 35 + rand() * (TS - 70), y: wy + 35 + rand() * (TS - 70), r: 18 + rand() * 8 });
          if (rand() < 0.36) propsGrid[r][c].push({ type: 'umbrella', x: wx + 35 + rand() * (TS - 70), y: wy + 35 + rand() * (TS - 70), color: pick(['#ef4444', '#38bdf8', '#facc15', '#ec4899', '#22c55e']) });
          continue;
        }

        // Central Park
        if (dist === D.PARK) {
          for (let k = 0; k < 3; k++) propsGrid[r][c].push({ type: 'tree', x: wx + 28 + rand() * (TS - 56), y: wy + 28 + rand() * (TS - 56), r: 16 + rand() * 12 });
          continue;
        }

        // Vilová štvrť (rôzne tvary víl, moderné domy, L-tvary, bazény)
        if (dist === D.SUBURBS) {
          if (rand() < 0.24) {
            for (let k = 0; k < 4; k++) propsGrid[r][c].push({ type: 'tree', x: wx + 25 + rand() * (TS - 50), y: wy + 25 + rand() * (TS - 50), r: 15 + rand() * 11 });
          } else {
            const pal = pick(C.PALETTES.SUBURBS);
            const variant = rand();
            if (variant < 0.35) {
              // Moderná biela vila s plochou strechou a bazénom
              solidGrid[r][c].push({
                x: wx + 24, y: wy + 22, w: 96, h: 66, height: 42,
                roof: '#f1f5f9', w1: '#e2e8f0', w2: '#cbd5e1',
                style: 'modern_villa', facade: 'glass'
              });
              propsGrid[r][c].push({ type: 'pool', x: wx + 34, y: wy + 104, w: 68, h: 34 });
            } else if (variant < 0.65) {
              // L-ková vila (dve krídla)
              solidGrid[r][c].push({
                x: wx + 22, y: wy + 22, w: 112, h: 52, height: 36,
                roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa', facade: 'villa'
              });
              solidGrid[r][c].push({
                x: wx + 22, y: wy + 72, w: 52, h: 62, height: 32,
                roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa', facade: 'villa'
              });
              if (rand() < 0.6) propsGrid[r][c].push({ type: 'pool', x: wx + 86, y: wy + 92, w: 50, h: 36 });
            } else {
              const bw = 68 + rand() * 34, bh = 58 + rand() * 28;
              const bx = wx + 20 + rand() * (TS - bw - 40), by = wy + 20 + rand() * 24;
              solidGrid[r][c].push({
                x: bx, y: by, w: bw, h: bh, height: 34 + rand() * 20,
                roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa', facade: 'villa'
              });
              if (rand() < 0.45) propsGrid[r][c].push({ type: 'pool', x: wx + 30, y: by + bh + 12, w: 48, h: 28 });
            }
            propsGrid[r][c].push({ type: 'tree', x: wx + TS - 26, y: wy + TS - 26, r: 14 });
          }
          continue;
        }

        if (dist === D.AIRPORT) {
          if (rand() < 0.25) propsGrid[r][c].push({ type: 'tree', x: wx + TS / 2, y: wy + TS / 2, r: 16 });
          continue;
        }

        // Priemyselná zóna – sklady, farebné kontajnery alebo okrúhle silá!
        if (dist === D.INDUSTRIAL) {
          const v = rand();
          if (v < 0.32) {
            addContainers(r, c, wx, wy);
          } else if (v < 0.52) {
            // Dvojica okrúhlych síl / nádrží
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({ x: wx + 22, y: wy + 24, w: 62, h: 62, height: 74, roof: '#cbd5e1', w1: pal.w1, w2: pal.w2, style: 'silo' });
            solidGrid[r][c].push({ x: wx + 96, y: wy + 94, w: 62, h: 62, height: 64, roof: '#cbd5e1', w1: pal.w1, w2: pal.w2, style: 'silo' });
          } else {
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({
              x: wx + 16, y: wy + 16, w: TS - 32, h: TS - 32,
              height: 46 + rand() * 34, roof: pal.roof, w1: pal.w1, w2: pal.w2,
              style: 'warehouse', facade: 'industrial'
            });
          }
          continue;
        }

        // MESTSKÉ BLOKY (Downtown, Northside, Miami Art Deco pobrežie)
        if (dist === D.DOWNTOWN || dist === D.OLD_TOWN) {
          const isCoast = (c >= sc - 6 && r >= 10 && r <= 48);
          const isDT = (dist === D.DOWNTOWN);

          // Malé mestské parčíky medzi budovami
          if (rand() < 0.09) {
            propsGrid[r][c].push({ type: 'tree', x: wx + 42, y: wy + 42, r: 15 });
            propsGrid[r][c].push({ type: 'tree', x: wx + TS - 42, y: wy + TS - 42, r: 15 });
            continue;
          }

          const pool = isCoast ? C.PALETTES.BEACH : (isDT ? C.PALETTES.DOWNTOWN : C.PALETTES.OLD_TOWN);
          const shapeRoll = rand();

          if (shapeRoll < 0.38) {
            // DVOJICA ODLIŠNÝCH DOMOV NA JEDNOM BLOKU (rôzna farba aj výška!)
            const p1 = pick(pool), p2 = pick(pool);
            const splitVert = rand() < 0.5;
            if (splitVert) {
              solidGrid[r][c].push({
                x: wx + 14, y: wy + 16, w: 72, h: TS - 32,
                height: isDT ? (70 + rand() * 85) : (48 + rand() * 44),
                roof: p1.roof, w1: p1.w1, w2: p1.w2, facade: p1.facade,
                neon: isCoast && rand() < 0.5 ? pick(['#f472b6', '#22d3ee', '#facc15']) : null,
                waterTower: !isDT && rand() < 0.35
              });
              solidGrid[r][c].push({
                x: wx + 94, y: wy + 22, w: 70, h: TS - 42,
                height: isDT ? (95 + rand() * 95) : (58 + rand() * 52),
                roof: p2.roof, w1: p2.w1, w2: p2.w2, facade: p2.facade,
                acUnit: true
              });
            } else {
              solidGrid[r][c].push({
                x: wx + 16, y: wy + 14, w: TS - 32, h: 72,
                height: isDT ? (85 + rand() * 90) : (52 + rand() * 48),
                roof: p1.roof, w1: p1.w1, w2: p1.w2, facade: p1.facade,
                acUnit: true
              });
              solidGrid[r][c].push({
                x: wx + 22, y: wy + 94, w: TS - 42, h: 70,
                height: isDT ? (65 + rand() * 75) : (44 + rand() * 40),
                roof: p2.roof, w1: p2.w1, w2: p2.w2, facade: p2.facade,
                waterTower: !isDT && rand() < 0.4
              });
            }
          } else if (shapeRoll < 0.62) {
            // ROHOVÁ VEŽA + MALÝ DVOR SO STROMAMI
            const pal = pick(pool);
            solidGrid[r][c].push({
              x: wx + 16, y: wy + 16, w: 108, h: 112,
              height: isDT ? (120 + rand() * 105) : (64 + rand() * 48),
              roof: pal.roof, w1: pal.w1, w2: pal.w2, facade: pal.facade,
              neon: (isDT || isCoast) && rand() < 0.45 ? pick(['#38bdf8', '#f43f5e', '#a855f7', '#facc15', '#22d3ee']) : null,
              roofPool: (isCoast || isDT) && rand() < 0.35,
              sign: rand() < 0.28 ? pick(['HOTEL', 'CLUB', 'CAFE', 'VIP', 'TECH', 'GYM']) : null
            });
            propsGrid[r][c].push({ type: isCoast ? 'palm' : 'tree', x: wx + 150, y: wy + 148, r: 15 });
          } else {
            // HLAVNÁ VEŽA / MRAKODRAP S BOHATÝMI DETAILMI NA STRECHE
            const pal = pick(pool);
            const m = isDT ? 16 : 20;
            const height = isDT ? (110 + rand() * 115) : (56 + rand() * 54);
            const hasHelipad = isDT && height > 175 && rand() < 0.35;
            const hasPool = !hasHelipad && (isCoast || (isDT && rand() < 0.22));

            solidGrid[r][c].push({
              x: wx + m, y: wy + m, w: TS - m * 2, h: TS - m * 2,
              height: height, roof: pal.roof, w1: pal.w1, w2: pal.w2, facade: pal.facade,
              neon: (isDT || isCoast) && rand() < 0.42 ? pick(['#38bdf8', '#f43f5e', '#a855f7', '#22d3ee', '#facc15']) : null,
              helipad: hasHelipad,
              roofPool: hasPool,
              waterTower: !isDT && !isCoast && rand() < 0.45,
              acUnit: !hasHelipad && !hasPool && rand() < 0.65,
              sign: !hasHelipad && rand() < 0.22 ? pick(['HOTEL', 'PLAZA', 'LOUNGE', 'TOWER', 'SHOP']) : null
            });
          }
        }
      }
    }
  }

  function addContainers(r, c, wx, wy) {
    for (let i = 0; i < 2; i++) {
      const pal = pick(C.PALETTES.CONTAINERS);
      solidGrid[r][c].push({
        x: wx + 22, y: wy + 24 + i * 74, w: TS - 44, h: 48,
        height: 28, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'container'
      });
    }
  }

  function addForestBorder(r, c, wx, wy) {
    if (r === 0 || c === 0) {
      solidGrid[r][c].push({
        x: wx + 8, y: wy + 8, w: TS - 16, h: TS - 16,
        height: 55 + rand() * 40, roof: '#14532d', w1: '#166534', w2: '#052e16', style: 'hill'
      });
    }
    for (let k = 0; k < 4; k++) {
      propsGrid[r][c].push({ type: 'tree', x: wx + 20 + rand() * (TS - 40), y: wy + 20 + rand() * (TS - 40), r: 18 + rand() * 14 });
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
    tiles: tiles,
    districts: districts,
    solidGrid: solidGrid,
    propsGrid: propsGrid,
    landmarks: landmarks,
    isRoadLike: isRoadLike,
    checkCollision: checkCollision,
    getDistrictAt: getDistrictAt,
    spawnX: 42 * TS + TS / 2,
    spawnY: 32 * TS + TS / 2
  };
})();
