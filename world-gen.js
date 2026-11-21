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

  // 4 výbušné benzínky pri diaľniciach a v púšti
  const gasStations = [
    { id: 'gs_dt',     r: 40, c: 44, name: 'Benzínka Downtown' },
    { id: 'gs_desert', r: 15, c: 34, name: 'Route 66 Gas' },
    { id: 'gs_forest', r: 45, c: 23, name: 'Pine Fuel Stop' },
    { id: 'gs_docks',  r: 54, c: 36, name: 'Port Fuel' }
  ];
  gasStations.forEach(g => {
    g.x = g.c * TS + TS / 2;
    g.y = g.r * TS + TS / 2;
    g.destroyedTimer = 0;
  });

  // Hranice Mega-lokácií (využíva world-render aj Časť 2)
  const megaZones = {
    area69: { x1: 44 * TS, y1: 7 * TS, x2: 58 * TS, y2: 18 * TS },
    speedway: {
      x1: 26 * TS, y1: 20 * TS, x2: 41 * TS, y2: 28 * TS,
      startX: 33 * TS + TS / 2, startY: 26 * TS + TS / 2
    },
    stadium: { x: 48 * TS, y: 32 * TS, w: 6 * TS, h: 5 * TS },
    cargoShip: { x: 33 * TS, y: 62 * TS, w: 9 * TS, h: 3 * TS },
    ferrisWheel: { x: 65 * TS + 90, y: 43 * TS + 180 },
    crane: { x: 31 * TS + 90, y: 47 * TS + 90 },
    grandSign: { x: 11 * TS + 20, y: 19 * TS + 90 },
    ufo: { x: 35 * TS + 90, y: 11 * TS + 90 },
    fountain: { x: 37 * TS + 90, y: 43 * TS + 90 }
  };

  // Uzavretý okruh železnice okolo celej pevniny (pre jazdiaci vlak v Časti 2)
  const railPath = [
    { x: 21.5 * TS, y: 5.5 * TS },
    { x: 60.5 * TS, y: 5.5 * TS },
    { x: 60.5 * TS, y: 28.5 * TS },
    { x: 55.5 * TS, y: 28.5 * TS },
    { x: 55.5 * TS, y: 56.5 * TS },
    { x: 21.5 * TS, y: 56.5 * TS }
  ];

  function isRailCorridor(r, c) {
    if (r === 5 && c >= 21 && c <= 60) return true;
    if (c === 60 && r >= 5 && r <= 28) return true;
    if (r === 28 && c >= 55 && c <= 60) return true;
    if (c === 55 && r >= 28 && r <= 56) return true;
    if (r === 56 && c >= 21 && c <= 55) return true;
    if (c === 21 && r >= 5 && r <= 56) return true;
    return false;
  }

  // 7 unikátnych budov (5 vstupných interiérov + LSPD + Nemocnica) priamo na hlavných bulvároch
  const LANDMARK_DEFS = [
    { id: 'ammu',     r: 42, c: 40, doorSide: 'S', label: 'AMMU',     name: 'Ammu-Nation',       icon: '🔫', roof: '#14532d', w1: '#166534', w2: '#052e16', neon: '#ef4444', height: 72,  facade: 'classic', enterable: true },
    { id: 'burger',   r: 44, c: 40, doorSide: 'N', label: 'BURGER',   name: 'Burger Shot',       icon: '🍔', roof: '#c2410c', w1: '#ea580c', w2: '#9a3412', neon: '#facc15', height: 58,  facade: 'balcony', enterable: true },
    { id: 'home',     r: 44, c: 42, doorSide: 'N', label: 'HOME',     name: 'Tvoj Byt',          icon: '🏠', roof: '#0369a1', w1: '#e2e8f0', w2: '#94a3b8', neon: '#38bdf8', height: 88,  facade: 'balcony', enterable: true },
    { id: 'bank',     r: 42, c: 43, doorSide: 'S', label: 'BANK',     name: 'Grand Bank',        icon: '🏦', roof: '#e2e8f0', w1: '#cbd5e1', w2: '#94a3b8', neon: '#facc15', height: 120, facade: 'marble',  enterable: true },
    { id: 'casino',   r: 42, c: 52, doorSide: 'S', label: 'CASINO',   name: 'Royal Casino',      icon: '🎰', roof: '#581c87', w1: '#7e22ce', w2: '#3b0764', neon: '#facc15', height: 128, facade: 'balcony', enterable: true },
    { id: 'police',   r: 42, c: 34, doorSide: 'S', label: 'LSPD',     name: 'Policajná stanica', icon: '🛡', roof: '#1e3a8a', w1: '#1d4ed8', w2: '#172554', neon: '#38bdf8', height: 92,  facade: 'marble',  enterable: false },
    { id: 'hospital', r: 35, c: 38, doorSide: 'W', label: 'HOSPITAL', name: 'Nemocnica',         icon: '✚',  roof: '#f8fafc', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#ef4444', height: 102, facade: 'marble',  enterable: false }
  ];

  const landmarkMap = {};
  for (let i = 0; i < LANDMARK_DEFS.length; i++) {
    landmarkMap[LANDMARK_DEFS[i].r + ',' + LANDMARK_DEFS[i].c] = LANDMARK_DEFS[i];
  }

  function isRoadLike(t) {
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE || t === T.DIRT_ROAD;
  }
  function isDrivable(t) {
    return isRoadLike(t) || t === T.CONCRETE || t === T.RUNWAY || t === T.PIER || t === T.TRACK || t === T.STADIUM || t === T.PLAZA || t === T.SHIP_DECK;
  }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

  // Organický tvar hlavného ostrova (žiadny nudný štvorec!)
  function isMainland(r, c) {
    const northEdge = 4 + Math.round(Math.sin(c * 0.16) * 1.3);
    if (r < northEdge) return false;

    // Severozápadný záliv pre ostrov Alcatraz
    if (r < 17 && c < 18) return false;

    const westEdge = (r < 18 ? 18 : 5 + Math.round(Math.sin(r * 0.14) * 1.4));
    if (c < westEdge) return false;

    // Juhovýchodný záliv pre Tropický ostrov pašerákov
    if (r > 52 && c > 51) return false;
    if (r > 54 && c < 20) return false;

    const eastEdge = (r < 32 ? 64 : 60) + Math.round(Math.cos(r * 0.15) * 1.6);
    if (c > eastEdge) return false;

    const southEdge = (c >= 23 && c <= 48 ? 60 : 54) + Math.round(Math.sin(c * 0.18) * 1.2);
    if (r > southEdge) return false;

    return true;
  }

  function generate() {
    // 1. Základ: Oceán + Organická pevnina so 4 biómami + 2 samostatné ostrovy
    for (let r = 0; r < N; r++) {
      tiles[r] = []; districts[r] = []; solidGrid[r] = []; propsGrid[r] = [];
      for (let c = 0; c < N; c++) {
        solidGrid[r][c] = []; propsGrid[r][c] = [];

        // Ostrov 1: ALCATRAZ (Severozápad)
        if (r >= 5 && r <= 12 && c >= 5 && c <= 12) {
          const isRim = (r === 5 || r === 12 || c === 5 || c === 12);
          tiles[r][c] = isRim ? T.SAND : T.CONCRETE;
          districts[r][c] = D.ALCATRAZ;
          continue;
        }

        // Ostrov 2: OSTROV PAŠERÁKOV (Juhovýchod)
        const dSmug = Math.hypot((r - 61.5) * 1.05, (c - 61.5) * 1.05);
        if (dSmug <= 5.4) {
          tiles[r][c] = dSmug > 3.7 ? T.SAND : T.GRASS;
          districts[r][c] = D.SMUGGLER;
          continue;
        }

        if (!isMainland(r, c)) {
          tiles[r][c] = T.WATER;
          districts[r][c] = D.OCEAN;
          continue;
        }

        // Priradenie 4 úplne odlišných biómov na pevnine!
        if (r < 28 && c >= 22) {
          // BIÓM 1: ČERVENÁ PÚŠŤ (Sever)
          tiles[r][c] = T.DESERT;
          districts[r][c] = D.DESERT;
        } else if (c < 24) {
          // BIÓM 2: HORSKÝ LES & MOUNT GRAND (Západ)
          tiles[r][c] = (c <= 9 || r <= 22 || rand() < 0.45) ? T.FOREST : T.GRASS;
          districts[r][c] = (r >= 17 && r <= 23 && c >= 10 && c <= 18) ? D.MT_GRAND : D.FOREST;
        } else if (r >= 54) {
          // SOUTH DOCKS (Prístav na juhu)
          tiles[r][c] = T.CONCRETE;
          districts[r][c] = D.DOCKS;
        } else if (c >= 47 && r >= 38) {
          // MIAMI KANÁLY & PALM BAY (Východné pobrežie)
          const eastLim = 60 + Math.round(Math.cos(r * 0.15) * 1.6);
          tiles[r][c] = (c >= eastLim - 2) ? T.SAND : T.SIDEWALK;
          districts[r][c] = D.CANALS;
        } else {
          // DOWNTOWN (Veľkomesto)
          tiles[r][c] = T.SIDEWALK;
          districts[r][c] = D.DOWNTOWN;
        }
      }
    }

    // 2. Horské jazero v Pine Forest s ostrovčekom uprostred!
    for (let r = 32; r <= 41; r++) {
      for (let c = 10; c <= 16; c++) {
        const dLake = Math.hypot((r - 36.5) / 4.5, (c - 13) / 3.4);
        if (dLake <= 1.0) {
          if (r >= 36 && r <= 37 && c >= 12 && c <= 13) {
            tiles[r][c] = T.GRASS; // Zelený ostrovček s chatou!
          } else {
            tiles[r][c] = T.WATER;
          }
          districts[r][c] = D.FOREST;
        }
      }
    }

    // 3. Tajná poľná dráha na Ostrove pašerákov
    for (let c = 59; c <= 64; c++) tiles[62][c] = T.DIRT_ROAD;
    tiles[61][57] = T.PIER; // Malé mólo pre čln pašerákov

    // 4. MIAMI VODNÉ KANÁLY medzi luxusnými vilami (pre člny!)
    const canalRows = [40, 46, 50];
    for (let k = 0; k < canalRows.length; k++) {
      const cr = canalRows[k];
      for (let c = 51; c <= 63; c++) {
        tiles[cr][c] = T.WATER;
        districts[cr][c] = D.CANALS;
      }
    }

    // 5. PLÁŽOVÉ MÓLO S LUNAPARKOM A RUSKÝM KOLESOM (Palm Bay)
    for (let r = 43; r <= 44; r++) {
      for (let c = 58; c <= 66; c++) {
        tiles[r][c] = T.PIER;
        districts[r][c] = D.CANALS;
      }
    }

    // 6. MEGA-LOKÁCIA: VOJENSKÁ ZÁKLADŇA AREA 69 (Červená púšť)
    for (let r = 7; r <= 17; r++) {
      for (let c = 44; c <= 57; c++) {
        tiles[r][c] = T.CONCRETE;
        districts[r][c] = D.AREA69;
      }
    }
    for (let c = 46; c <= 56; c++) {
      tiles[9][c] = T.RUNWAY;
      tiles[10][c] = T.RUNWAY;
    }

    // 7. MEGA-LOKÁCIA: PRETEKÁRSKY OKRUH GRAND SPEEDWAY
    for (let r = 20; r <= 27; r++) {
      for (let c = 26; c <= 40; c++) {
        tiles[r][c] = T.GRASS;
        districts[r][c] = D.SPEEDWAY;
      }
    }
    for (let c = 27; c <= 39; c++) { tiles[21][c] = T.TRACK; tiles[26][c] = T.TRACK; }
    for (let r = 21; r <= 26; r++) { tiles[r][27] = T.TRACK; tiles[r][39] = T.TRACK; }
    // Príjazd na okruh z okružnej diaľnice
    tiles[27][33] = T.CONCRETE; tiles[28][33] = T.CONCRETE;

    // 8. MEGA-LOKÁCIA: VEĽKÝ FUTBALOVÝ ŠTADIÓN + PARKOVISKO
    for (let r = 31; r <= 37; r++) {
      for (let c = 47; c <= 53; c++) {
        districts[r][c] = D.STADIUM;
        if (r >= 32 && r <= 36 && c >= 48 && c <= 52) tiles[r][c] = T.STADIUM;
        else tiles[r][c] = T.CONCRETE; // Parkovisko okolo štadióna
      }
    }

    // 9. MEGA-LOKÁCIA: STAVENISKO MRAKODRAPU (Downtown)
    for (let r = 46; r <= 49; r++) {
      for (let c = 30; c <= 32; c++) {
        tiles[r][c] = T.DESERT; // Otvorená hlinená jama staveniska
        districts[r][c] = D.DOWNTOWN;
      }
    }

    // 10. MEGA-LOKÁCIA: NÁKLADNÁ LOĎ V PRÍSTAVE SOUTH DOCKS
    for (let r = 61; r <= 66; r++) {
      for (let c = 31; c <= 44; c++) {
        tiles[r][c] = T.WATER;
        districts[r][c] = D.DOCKS;
      }
    }
    // Paluba obrovskej nákladnej lode (dá sa na ňu vyjsť cez mólo!)
    for (let r = 62; r <= 64; r++) {
      for (let c = 34; c <= 40; c++) {
        tiles[r][c] = T.SHIP_DECK;
        districts[r][c] = D.DOCKS;
      }
    }
    tiles[61][36] = T.PIER; tiles[61][37] = T.PIER; // Nájazdová rampa na loď!

    // 11. CESTNÁ SIEŤ (Ring Highway + Route 66 + Organické ulice + Horské serpentíny!)
    // Hlavné diaľnice
    for (let c = 19; c <= 44; c++) if (tiles[14][c] !== T.WATER) tiles[14][c] = T.HIGHWAY; // Route 66 -> Area 69
    for (let c = 23; c <= 56; c++) if (tiles[29][c] !== T.WATER) tiles[29][c] = T.HIGHWAY; // Severný okruh mesta
    for (let c = 24; c <= 57; c++) tiles[43][c] = T.HIGHWAY;                               // Hlavný bulvár -> Mólo
    for (let c = 23; c <= 50; c++) if (tiles[55][c] !== T.WATER) tiles[55][c] = T.HIGHWAY; // Južný okruh prístavu

    for (let r = 14; r <= 55; r++) if (tiles[r][24] !== T.WATER) tiles[r][24] = T.HIGHWAY; // Západný okruh
    for (let r = 29; r <= 55; r++) tiles[r][37] = T.HIGHWAY;                               // Centrálna trieda
    for (let r = 14; r <= 55; r++) if (tiles[r][45] !== T.WATER) tiles[r][45] = T.HIGHWAY; // Východná trieda -> Púšť
    for (let r = 29; r <= 52; r++) {
      // Pobrežná trieda s MOSTAMI ponad Miami vodné kanály!
      tiles[r][54] = (tiles[r][54] === T.WATER) ? T.BRIDGE : T.HIGHWAY;
    }
    // Spojka od Area 69 južnej brány na východnú diaľnicu
    for (let r = 17; r <= 29; r++) tiles[r][51] = T.ROAD;

    // VEĽKÝ KRUHOVÝ OBJAZD S FONTÁNOU uprostred Downtownu (r=42..44, c=36..38)
    for (let r = 42; r <= 44; r++) {
      for (let c = 36; c <= 38; c++) {
        tiles[r][c] = (r === 43 && c === 37) ? T.PLAZA : T.HIGHWAY;
      }
    }

    // Nepravidelné mestské ulice v Downtown a Kanáloch (rozbíjajú nudnú šachovnicu!)
    const cityRows = [34, 38, 48, 51];
    for (let k = 0; k < cityRows.length; k++) {
      const rr = cityRows[k];
      for (let c = 24; c <= 54; c++) {
        if (tiles[rr][c] === T.STADIUM || tiles[rr][c] === T.WATER) continue;
        if (rr === 48 && c >= 30 && c <= 32) continue; // Obíde jamu staveniska
        if (tiles[rr][c] !== T.HIGHWAY && tiles[rr][c] !== T.BRIDGE) tiles[rr][c] = T.ROAD;
      }
    }
    const cityCols = [29, 33, 41, 50];
    for (let k = 0; k < cityCols.length; k++) {
      const cc = cityCols[k];
      for (let r = 29; r <= 55; r++) {
        if (tiles[r][cc] === T.STADIUM) continue;
        if (cc === 50 && r >= 31 && r <= 37) continue;
        if (tiles[r][cc] === T.WATER) tiles[r][cc] = T.BRIDGE;
        else if (tiles[r][cc] !== T.HIGHWAY && tiles[r][cc] !== T.PLAZA) tiles[r][cc] = T.ROAD;
      }
    }

    // Kľukaté horské serpentíny v Pine Forest (žiadna mriežka!)
    for (let r = 14; r <= 24; r++) tiles[r][19] = T.ROAD;
    for (let c = 8; c <= 19; c++) tiles[24][c] = T.ROAD;
    for (let r = 24; r <= 47; r++) tiles[r][8] = T.ROAD;
    for (let c = 8; c <= 24; c++) tiles[47][c] = T.ROAD;
    // Odbočka hore k nápisu GRAND a k jazeru
    for (let c = 12; c <= 19; c++) tiles[21][c] = T.DIRT_ROAD;
    for (let c = 17; c <= 24; c++) tiles[36][c] = T.DIRT_ROAD;

    // Púštna poľná cesta k UFO a karavanovému mestečku
    for (let r = 8; r <= 14; r++) tiles[r][31] = T.DIRT_ROAD;
    for (let c = 26; c <= 40; c++) tiles[9][c] = T.DIRT_ROAD;

    // Vyčistenie podkladu pre 4 benzínky
    for (let i = 0; i < gasStations.length; i++) {
      tiles[gasStations[i].r][gasStations[i].c] = T.CONCRETE;
    }

    // 12. Výpočet plytkej tyrkysovej vody (shallowGrid) pri brehoch, kanáloch a ostrovoch
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

    // 13. Generovanie 2.5D budov, Mega-lokácií, landmarkov a prírody!
    const gsKeys = {};
    gasStations.forEach(g => { gsKeys[g.r + ',' + g.c] = g; });

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const t = tiles[r][c];
        const dist = districts[r][c];
        const wx = c * TS, wy = r * TS;

        // KRUHOVÝ OBJAZD – Centrálna fontána
        if (r === 43 && c === 37) {
          solidGrid[r][c].push({
            x: wx + 46, y: wy + 46, w: 88, h: 88,
            height: 26, roof: '#38bdf8', w1: '#cbd5e1', w2: '#94a3b8', style: 'fountain'
          });
          continue;
        }

        // 7 HLAVNÝCH BUDOV (LANDMARKS)
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

        // 4 BENZÍNKY (strecha so stojanmi)
        if (gsKeys[r + ',' + c]) {
          solidGrid[r][c].push({
            x: wx + 20, y: wy + 20, w: 58, h: 46,
            height: 36, roof: '#dc2626', w1: '#f8fafc', w2: '#cbd5e1', neon: '#facc15',
            style: 'gas_shop', facade: 'classic'
          });
          continue;
        }

        // Nezasahuj budovami do železničnej trate ani do nápisu GRAND / UFO!
        if (isRailCorridor(r, c)) continue;
        if (r === 19 && c >= 10 && c <= 17) continue; // Nápis GRAND
        if (r === 11 && c === 35) continue;           // Spadnuté UFO

        // ALCATRAZ VÄZNICA (pevnosť + strážne veže)
        if (dist === D.ALCATRAZ) {
          if (r === 8 && c >= 7 && c <= 10) {
            solidGrid[r][c].push({
              x: wx + 10, y: wy + 16, w: TS - 20, h: TS - 32,
              height: 85, roof: '#475569', w1: '#64748b', w2: '#334155',
              style: 'classic', facade: 'classic', helipad: (c === 9)
            });
          } else if ((r === 6 || r === 11) && (c === 6 || c === 11)) {
            solidGrid[r][c].push({
              x: wx + 52, y: wy + 52, w: 76, h: 76,
              height: 120, roof: '#334155', w1: '#94a3b8', w2: '#475569', neon: '#ef4444', style: 'tower'
            });
          }
          continue;
        }

        // AREA 69 (oplotenie, bunkre, hangáre, radar)
        if (dist === D.AREA69) {
          const isGate = (r === 14 && c === 44) || (r === 17 && c === 51);
          const isPerim = (r === 7 || r === 17 || c === 44 || c === 57);
          if (isPerim && !isGate) {
            solidGrid[r][c].push({
              x: wx + (c === 57 ? TS - 24 : 8),
              y: wy + (r === 17 ? TS - 24 : 8),
              w: (c === 44 || c === 57) ? 20 : TS - 16,
              h: (r === 7 || r === 17) ? 20 : TS - 16,
              height: 40, roof: '#475569', w1: '#334155', w2: '#1e293b', style: 'wall'
            });
          } else if (r === 12 && (c === 47 || c === 50 || c === 53)) {
            solidGrid[r][c].push({
              x: wx + 14, y: wy + 18, w: TS - 28, h: TS - 36,
              height: 68, roof: '#3f4d36', w1: '#4d5d43', w2: '#2d3826', style: 'hangar', facade: 'industrial'
            });
          } else if (r === 14 && c === 55) {
            solidGrid[r][c].push({
              x: wx + 45, y: wy + 45, w: 90, h: 90,
              height: 155, roof: '#94a3b8', w1: '#cbd5e1', w2: '#64748b', neon: '#ef4444', style: 'tower', facade: 'glass'
            });
          }
          continue;
        }

        // GRAND SPEEDWAY tribúny
        if (dist === D.SPEEDWAY) {
          if (r === 20 && c >= 29 && c <= 37) {
            solidGrid[r][c].push({
              x: wx + 10, y: wy + 18, w: TS - 20, h: 86,
              height: 62, roof: '#dc2626', w1: '#e2e8f0', w2: '#94a3b8', style: 'warehouse'
            });
          }
          continue;
        }

        // FUTBALOVÝ ŠTADIÓN – severná a južná tribúna (východ a západ sú otvorené pre vjazd na trávnik!)
        if (dist === D.STADIUM) {
          if ((r === 32 || r === 36) && c >= 48 && c <= 52) {
            solidGrid[r][c].push({
              x: wx + 8, y: wy + (r === 32 ? 8 : TS - 56), w: TS - 16, h: 48,
              height: 92, roof: '#f8fafc', w1: '#1e3a8a', w2: '#0f172a', neon: '#38bdf8', style: 'classic'
            });
          }
          continue;
        }

        // STAVENISKO – rozostavaná oceľová veža
        if (r >= 46 && r <= 49 && c >= 30 && c <= 32) {
          if (r === 47 && c === 31) {
            solidGrid[r][c].push({
              x: wx + 22, y: wy + 22, w: TS - 44, h: TS - 44,
              height: 110, roof: '#f97316', w1: '#78716c', w2: '#44403c', style: 'construction'
            });
          }
          continue;
        }

        // NÁKLADNÁ LOĎ – kapitánsky mostík na korme + kontajnery na palube
        if (t === T.SHIP_DECK) {
          if (c === 34 && r === 63) {
            solidGrid[r][c].push({
              x: wx + 14, y: wy + 10, w: 92, h: TS - 20,
              height: 125, roof: '#f8fafc', w1: '#e2e8f0', w2: '#94a3b8', neon: '#38bdf8', style: 'classic', facade: 'glass'
            });
          } else if ((c === 37 || c === 39) && (r === 62 || r === 64)) {
            addContainers(r, c, wx, wy);
          }
          continue;
        }

        // OSTROV PAŠERÁKOV – palmy a tajná chata
        if (dist === D.SMUGGLER) {
          if (t === T.DIRT_ROAD || t === T.PIER) continue;
          if (r === 60 && c === 61) {
            solidGrid[r][c].push({
              x: wx + 36, y: wy + 36, w: 94, h: 72,
              height: 40, roof: '#78350f', w1: '#d97706', w2: '#92400e', style: 'villa'
            });
          } else if (rand() < 0.65) {
            propsGrid[r][c].push({ type: 'palm', x: wx + 32 + rand() * 116, y: wy + 32 + rand() * 116, r: 19 + rand() * 9 });
          }
          continue;
        }

        if (t === T.WATER || isDrivable(t)) continue;

        // PLÁŽ
        if (t === T.SAND) {
          if (rand() < 0.45) propsGrid[r][c].push({ type: 'palm', x: wx + 35 + rand() * 110, y: wy + 35 + rand() * 110, r: 18 + rand() * 8 });
          if (rand() < 0.32) propsGrid[r][c].push({ type: 'umbrella', x: wx + 35 + rand() * 110, y: wy + 35 + rand() * 110, color: pick(['#ef4444', '#38bdf8', '#facc15', '#ec4899']) });
          continue;
        }

        // BIÓM: ČERVENÁ PÚŠŤ (skaly, kaktusy a karavanové mestečko pri c=26..38, r=12..17)
        if (dist === D.DESERT) {
          const isVillage = (r >= 11 && r <= 17 && c >= 26 && c <= 33);
          if (isVillage && rand() < 0.55) {
            const pal = pick(C.PALETTES.DESERT);
            solidGrid[r][c].push({
              x: wx + 26, y: wy + 32, w: 98, h: 52, height: 30,
              roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'trailer', facade: pal.facade
            });
          } else if (rand() < 0.14) {
            // Červený skalný kaňon / stolová hora
            solidGrid[r][c].push({
              x: wx + 18, y: wy + 18, w: TS - 36, h: TS - 36,
              height: 55 + rand() * 60, roof: '#c2410c', w1: '#9a3412', w2: '#7c2d12', style: 'mesa'
            });
          } else {
            for (let k = 0; k < 2; k++) {
              if (rand() < 0.55) propsGrid[r][c].push({ type: 'cactus', x: wx + 30 + rand() * 120, y: wy + 30 + rand() * 120 });
            }
          }
          continue;
        }

        // BIÓM: HORSKÝ LES (husté ihličnany, drevené chaty, chata na ostrove v jazere)
        if (dist === D.FOREST || dist === D.MT_GRAND) {
          if (r === 36 && c === 12) {
            solidGrid[r][c].push({ x: wx + 38, y: wy + 38, w: 82, h: 64, height: 38, roof: '#78350f', w1: '#b45309', w2: '#7c2d12', style: 'villa' });
          } else if (rand() < 0.14) {
            const pal = pick(C.PALETTES.FOREST);
            solidGrid[r][c].push({ x: wx + 32, y: wy + 32, w: 86, h: 66, height: 34, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa' });
          } else {
            const cnt = t === T.FOREST ? 4 : 2;
            for (let k = 0; k < cnt; k++) {
              propsGrid[r][c].push({ type: 'pine', x: wx + 22 + rand() * 136, y: wy + 22 + rand() * 136, r: 16 + rand() * 11 });
            }
          }
          continue;
        }

        // SOUTH DOCKS (sklady, kontajnery, okrúhle silá)
        if (dist === D.DOCKS) {
          const roll = rand();
          if (roll < 0.38) addContainers(r, c, wx, wy);
          else if (roll < 0.56) {
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({ x: wx + 22, y: wy + 24, w: 62, h: 62, height: 74, roof: '#cbd5e1', w1: pal.w1, w2: pal.w2, style: 'silo' });
            solidGrid[r][c].push({ x: wx + 96, y: wy + 94, w: 62, h: 62, height: 64, roof: '#cbd5e1', w1: pal.w1, w2: pal.w2, style: 'silo' });
          } else {
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({ x: wx + 16, y: wy + 16, w: TS - 32, h: TS - 32, height: 48 + rand() * 30, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'warehouse', facade: 'industrial' });
          }
          continue;
        }

        // DOWNTOWN & MIAMI KANÁLY (pestré mrakodrapy, Art Deco vily, bazény, dvojdomy)
        const isMiami = (dist === D.CANALS);
        const pool = isMiami ? C.PALETTES.BEACH : C.PALETTES.DOWNTOWN;
        if (rand() < 0.1) {
          propsGrid[r][c].push({ type: isMiami ? 'palm' : 'tree', x: wx + 46, y: wy + 46, r: 16 });
          propsGrid[r][c].push({ type: isMiami ? 'palm' : 'tree', x: wx + 134, y: wy + 134, r: 16 });
          continue;
        }

        const shape = rand();
        if (shape < 0.36) {
          const p1 = pick(pool), p2 = pick(pool);
          solidGrid[r][c].push({
            x: wx + 14, y: wy + 16, w: 72, h: TS - 32,
            height: isMiami ? (52 + rand() * 55) : (78 + rand() * 95),
            roof: p1.roof, w1: p1.w1, w2: p1.w2, facade: p1.facade,
            neon: isMiami && rand() < 0.5 ? pick(['#f472b6', '#22d3ee', '#facc15']) : null
          });
          solidGrid[r][c].push({
            x: wx + 94, y: wy + 20, w: 70, h: TS - 40,
            height: isMiami ? (42 + rand() * 48) : (95 + rand() * 105),
            roof: p2.roof, w1: p2.w1, w2: p2.w2, facade: p2.facade, acUnit: true
          });
        } else {
          const pal = pick(pool);
          const height = isMiami ? (55 + rand() * 75) : (105 + rand() * 120);
          const hasHeli = !isMiami && height > 180 && rand() < 0.35;
          const hasPool = !hasHeli && (isMiami || rand() < 0.24);
          solidGrid[r][c].push({
            x: wx + 16, y: wy + 16, w: TS - 32, h: TS - 32,
            height: height, roof: pal.roof, w1: pal.w1, w2: pal.w2, facade: pal.facade,
            neon: rand() < 0.42 ? pick(['#38bdf8', '#f43f5e', '#a855f7', '#22d3ee', '#facc15']) : null,
            helipad: hasHeli, roofPool: hasPool, acUnit: !hasHeli && !hasPool,
            sign: !hasHeli && rand() < 0.24 ? pick(['HOTEL', 'CLUB', 'VIP', 'PLAZA', 'TOWER']) : null
          });
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
    isRoadLike: isRoadLike, checkCollision: checkCollision, getDistrictAt: getDistrictAt,
    // Štart priamo pri veľkom Kruhovom objazde s fontánou v centre Downtownu!
    spawnX: 39 * TS + TS / 2,
    spawnY: 43 * TS + TS / 2
  };
})();
