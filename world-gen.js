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

  const LANDMARK_DEFS = [
    { id: 'ammu',     r: 94,  c: 78,  doorSide: 'S', label: 'AMMU',     name: 'Ammu-Nation',       icon: '🔫', roof: '#14532d', w1: '#166534', w2: '#052e16', neon: '#ef4444', height: 78,  facade: 'classic', enterable: true },
    { id: 'burger',   r: 98,  c: 78,  doorSide: 'N', label: 'BURGER',   name: 'Burger Shot',       icon: '🍔', roof: '#c2410c', w1: '#ea580c', w2: '#9a3412', neon: '#facc15', height: 64,  facade: 'balcony', enterable: true },
    { id: 'home',     r: 98,  c: 82,  doorSide: 'N', label: 'HOME',     name: 'Tvoj Byt',          icon: '🏠', roof: '#0369a1', w1: '#e2e8f0', w2: '#94a3b8', neon: '#38bdf8', height: 96,  facade: 'balcony', enterable: true },
    { id: 'bank',     r: 94,  c: 84,  doorSide: 'S', label: 'BANK',     name: 'Grand Bank',        icon: '🏦', roof: '#e2e8f0', w1: '#cbd5e1', w2: '#94a3b8', neon: '#facc15', height: 132, facade: 'marble',  enterable: true },
    { id: 'casino',   r: 92,  c: 104, doorSide: 'S', label: 'CASINO',   name: 'Royal Casino',      icon: '🎰', roof: '#581c87', w1: '#7e22ce', w2: '#3b0764', neon: '#facc15', height: 140, facade: 'balcony', enterable: true },
    { id: 'area51',   r: 56,  c: 116, doorSide: 'S', label: 'AREA 51',  name: 'Area 51 Lab',       icon: '👽', roof: '#14532d', w1: '#1e293b', w2: '#0f172a', neon: '#4ade80', height: 106, facade: 'glass',   enterable: true },
    { id: 'police',   r: 94,  c: 70,  doorSide: 'S', label: 'LSPD',     name: 'Policajná stanica', icon: '🛡', roof: '#1e3a8a', w1: '#1d4ed8', w2: '#172554', neon: '#38bdf8', height: 100, facade: 'marble',  enterable: false },
    { id: 'hospital', r: 84,  c: 76,  doorSide: 'W', label: 'HOSPITAL', name: 'Nemocnica',         icon: '✚',  roof: '#f8fafc', w1: '#e2e8f0', w2: '#cbd5e1', neon: '#ef4444', height: 112, facade: 'marble',  enterable: false }
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

  // Obrovský pevninský celok (150x150) s dvoma mestami, zátokami a ostrovmi
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

        // Ostrov Alcatraz na severozápade
        if (r >= 12 && r <= 24 && c >= 12 && c <= 24) {
          const isRim = (r === 12 || r === 24 || c === 12 || c === 24);
          tiles[r][c] = isRim ? T.SAND : T.CONCRETE;
          districts[r][c] = D.ALCATRAZ;
          continue;
        }

        // Ostrov pašerákov na juhovýchode
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

        // Severné mesto Northwood + Letisko (r=32..56, c=58..112)
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

    // Pristávacia dráha na letisku North Airfield
    for (let c = 88; c <= 106; c++) tiles[38][c] = T.RUNWAY;

    // Horské jazero
    for (let r = 74; r <= 90; r++) {
      for (let c = 22; c <= 34; c++) {
        const dLake = Math.hypot((r - 82) / 8, (c - 28) / 6);
        if (dLake <= 1.0) {
          tiles[r][c] = (r >= 81 && r <= 83 && c >= 27 && c <= 29) ? T.GRASS : T.WATER;
          districts[r][c] = D.FOREST;
        }
      }
    }

    // Ostrov pašerákov
    for (let c = 128; c <= 136; c++) tiles[132][c] = T.DIRT_ROAD;
    tiles[131][124] = T.PIER;

    // Kanály
    const canalRows = [92, 102, 110];
    for (let k = 0; k < canalRows.length; k++) {
      const cr = canalRows[k];
      for (let c = 112; c <= 132; c++) {
        tiles[cr][c] = T.WATER;
        districts[cr][c] = D.CANALS;
      }
    }

    // Mólo
    for (let r = 96; r <= 97; r++) {
      for (let c = 124; c <= 138; c++) {
        tiles[r][c] = T.PIER;
        districts[r][c] = D.CANALS;
      }
    }

    // Vojenská základňa na severe (r=18..27, c=52..73)
    for (let r = 18; r <= 27; r++) {
      for (let c = 52; c <= 73; c++) {
        tiles[r][c] = T.CONCRETE;
        districts[r][c] = D.AREA69;
      }
    }
    for (let c = 55; c <= 70; c++) tiles[20][c] = T.RUNWAY;

    // Area 51 v púšti (r=52..65, c=104..123)
    for (let r = 52; r <= 65; r++) {
      for (let c = 104; c <= 123; c++) {
        tiles[r][c] = T.CONCRETE;
        districts[r][c] = D.AREA69;
      }
    }

    // Grand Speedway
    for (let r = 64; r <= 75; r++) {
      for (let c = 68; c <= 91; c++) {
        tiles[r][c] = T.GRASS;
        districts[r][c] = D.SPEEDWAY;
      }
    }
    for (let c = 70; c <= 89; c++) { tiles[66][c] = T.TRACK; tiles[75][c] = T.TRACK; }
    for (let r = 66; r <= 75; r++) { tiles[r][70] = T.TRACK; tiles[r][89] = T.TRACK; }

    // Štadión
    for (let r = 79; r <= 90; r++) {
      for (let c = 101; c <= 113; c++) {
        districts[r][c] = D.STADIUM;
        tiles[r][c] = (r >= 81 && r <= 88 && c >= 103 && c <= 111) ? T.STADIUM : T.CONCRETE;
      }
    }

    // Nákladná loď
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

    // Hlavná diaľnica sever–juh a východ–západ
    for (let r = 34; r <= 122; r++) if (tiles[r][56] !== T.WATER) tiles[r][56] = T.HIGHWAY;
    for (let r = 56; r <= 122; r++) if (tiles[r][96] !== T.WATER) tiles[r][96] = T.HIGHWAY;
    for (let c = 44; c <= 124; c++) if (tiles[62][c] !== T.WATER) tiles[62][c] = T.HIGHWAY;
    for (let c = 50; c <= 124; c++) if (tiles[96][c] !== T.WATER) tiles[96][c] = T.HIGHWAY;
    for (let c = 50; c <= 116; c++) if (tiles[120][c] !== T.WATER) tiles[120][c] = T.HIGHWAY;

    // Kruhový objazd v Grand City
    for (let r = 95; r <= 97; r++) {
      for (let c = 75; c <= 77; c++) {
        tiles[r][c] = (r === 96 && c === 76) ? T.PLAZA : T.HIGHWAY;
      }
    }

    // Ulice v Northwood a Grand City
    const roadRows = [36, 44, 52, 80, 88, 106, 114];
    for (let k = 0; k < roadRows.length; k++) {
      const rr = roadRows[k];
      for (let c = 56; c <= 116; c++) {
        if (tiles[rr][c] === T.STADIUM || tiles[rr][c] === T.WATER || tiles[rr][c] === T.RUNWAY) continue;
        if (tiles[rr][c] !== T.HIGHWAY && tiles[rr][c] !== T.BRIDGE) tiles[rr][c] = T.ROAD;
      }
    }
    const roadCols = [64, 72, 80, 88, 108];
    for (let k = 0; k < roadCols.length; k++) {
      const cc = roadCols[k];
      for (let r = 34; r <= 120; r++) {
        if (tiles[r][cc] === T.STADIUM || tiles[r][cc] === T.RUNWAY) continue;
        if (tiles[r][cc] === T.WATER) tiles[r][cc] = T.BRIDGE;
        else if (tiles[r][cc] !== T.HIGHWAY && tiles[r][cc] !== T.PLAZA) tiles[r][cc] = T.ROAD;
      }
    }

    // Horské a púštne cesty
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

    const gsKeys = {};
    gasStations.forEach(g => { gsKeys[g.r + ',' + g.c] = g; });

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const t = tiles[r][c];
        const dist = districts[r][c];
        const wx = c * TS, wy = r * TS;

        if (r === 96 && c === 76) {
          solidGrid[r][c].push({
            x: wx + 46, y: wy + 46, w: 88, h: 88,
            height: 26, roof: '#38bdf8', w1: '#cbd5e1', w2: '#94a3b8', style: 'fountain'
          });
          continue;
        }

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

        if (gsKeys[r + ',' + c]) {
          solidGrid[r][c].push({
            x: wx + 20, y: wy + 20, w: 58, h: 46,
            height: 36, roof: '#dc2626', w1: '#f8fafc', w2: '#cbd5e1', neon: '#facc15',
            style: 'gas_shop', facade: 'classic'
          });
          continue;
        }

        if (isRailCorridor(r, c)) continue;
        if (r === 54 && c >= 22 && c <= 38) continue;
        if (r === 58 && c === 112) continue;

        if (dist === D.ALCATRAZ) {
          if (r === 18 && c >= 16 && c <= 20) {
            solidGrid[r][c].push({
              x: wx + 10, y: wy + 16, w: TS - 20, h: TS - 32,
              height: 88, roof: '#475569', w1: '#64748b', w2: '#334155',
              style: 'classic', facade: 'classic', helipad: (c === 18)
            });
          } else if ((r === 14 || r === 22) && (c === 14 || c === 22)) {
            solidGrid[r][c].push({
              x: wx + 52, y: wy + 52, w: 76, h: 76,
              height: 124, roof: '#334155', w1: '#94a3b8', w2: '#475569', neon: '#ef4444', style: 'tower'
            });
          }
          continue;
        }

        if (r >= 18 && r <= 27 && c >= 52 && c <= 73) {
          const isGate = (r === 27 && c === 62);
          const isPerim = (r === 18 || r === 27 || c === 52 || c === 73);
          if (isPerim && !isGate) {
            solidGrid[r][c].push({
              x: wx + (c === 73 ? TS - 22 : 6),
              y: wy + (r === 27 ? TS - 22 : 6),
              w: (c === 52 || c === 73) ? 18 : TS - 12,
              h: (r === 18 || r === 27) ? 18 : TS - 12,
              height: 44, roof: '#3f4d36', w1: '#334155', w2: '#1e293b', style: 'wall'
            });
          } else if (r === 23 && (c === 56 || c === 60 || c === 66)) {
            solidGrid[r][c].push({
              x: wx + 14, y: wy + 18, w: TS - 28, h: TS - 36,
              height: 70, roof: '#3f4d36', w1: '#4d5d43', w2: '#2d3826', style: 'hangar', facade: 'industrial'
            });
          }
          continue;
        }

        if (r >= 52 && r <= 65 && c >= 104 && c <= 123) {
          const isGate = (r === 65 && c === 116);
          const isPerim = (r === 52 || r === 65 || c === 104 || c === 123);
          if (isPerim && !isGate) {
            solidGrid[r][c].push({
              x: wx + (c === 123 ? TS - 22 : 6),
              y: wy + (r === 65 ? TS - 22 : 6),
              w: (c === 104 || c === 123) ? 18 : TS - 12,
              h: (r === 52 || r === 65) ? 18 : TS - 12,
              height: 38, roof: '#14532d', w1: '#1e293b', w2: '#0f172a', style: 'wall'
            });
          }
          continue;
        }

        if (dist === D.SPEEDWAY) {
          if (r === 64 && c >= 74 && c <= 86) {
            solidGrid[r][c].push({
              x: wx + 10, y: wy + 18, w: TS - 20, h: 86,
              height: 64, roof: '#dc2626', w1: '#e2e8f0', w2: '#94a3b8', style: 'warehouse'
            });
          }
          continue;
        }

        if (dist === D.STADIUM) {
          if ((r === 81 || r === 88) && c >= 103 && c <= 111) {
            solidGrid[r][c].push({
              x: wx + 8, y: wy + (r === 81 ? 8 : TS - 56), w: TS - 16, h: 48,
              height: 96, roof: '#f8fafc', w1: '#1e3a8a', w2: '#0f172a', neon: '#38bdf8', style: 'classic'
            });
          }
          continue;
        }

        if (t === T.SHIP_DECK) {
          if (c === 70 && r === 133) {
            solidGrid[r][c].push({
              x: wx + 14, y: wy + 10, w: 92, h: TS - 20,
              height: 128, roof: '#f8fafc', w1: '#e2e8f0', w2: '#94a3b8', neon: '#38bdf8', style: 'classic', facade: 'glass'
            });
          } else if ((c === 74 || c === 78) && (r === 132 || r === 134)) {
            addContainers(r, c, wx, wy);
          }
          continue;
        }

        if (t === T.WATER || isDrivable(t)) continue;

        if (t === T.SAND) {
          if (rand() < 0.42) propsGrid[r][c].push({ type: 'palm', x: wx + 35 + rand() * 110, y: wy + 35 + rand() * 110, r: 18 + rand() * 8 });
          if (rand() < 0.3) propsGrid[r][c].push({ type: 'umbrella', x: wx + 35 + rand() * 110, y: wy + 35 + rand() * 110, color: pick(['#ef4444', '#38bdf8', '#facc15', '#ec4899']) });
          continue;
        }

        if (dist === D.DESERT) {
          if (rand() < 0.12) {
            solidGrid[r][c].push({
              x: wx + 16, y: wy + 16, w: TS - 32, h: TS - 32,
              height: 58 + rand() * 64, roof: '#c2410c', w1: '#9a3412', w2: '#7c2d12', style: 'mesa'
            });
          } else {
            if (rand() < 0.55) propsGrid[r][c].push({ type: 'cactus', x: wx + 30 + rand() * 120, y: wy + 30 + rand() * 120 });
            if (rand() < 0.32) propsGrid[r][c].push({ type: 'rock', x: wx + 30 + rand() * 120, y: wy + 30 + rand() * 120, r: 9 + rand() * 7 });
          }
          continue;
        }

        if (dist === D.FOREST || dist === D.MT_GRAND) {
          if (rand() < 0.11) {
            const pal = pick(C.PALETTES.FOREST);
            solidGrid[r][c].push({ x: wx + 30, y: wy + 30, w: 90, h: 70, height: 36, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa' });
          } else {
            const cnt = t === T.FOREST ? 3 : 2;
            for (let k = 0; k < cnt; k++) {
              propsGrid[r][c].push({ type: 'pine', x: wx + 22 + rand() * 136, y: wy + 22 + rand() * 136, r: 16 + rand() * 11 });
            }
          }
          continue;
        }

        if (dist === D.DOCKS) {
          if (rand() < 0.36) addContainers(r, c, wx, wy);
          else {
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({ x: wx + 16, y: wy + 16, w: TS - 32, h: TS - 32, height: 50 + rand() * 32, roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'warehouse', facade: 'industrial' });
          }
          continue;
        }

        const isMiami = (dist === D.CANALS);
        const pool = isMiami ? C.PALETTES.BEACH : C.PALETTES.DOWNTOWN;
        if (rand() < 0.14) {
          propsGrid[r][c].push({ type: isMiami ? 'palm' : 'tree', x: wx + 42, y: wy + 42, r: 16 });
          propsGrid[r][c].push({ type: isMiami ? 'palm' : 'tree', x: wx + 138, y: wy + 138, r: 16 });
          propsGrid[r][c].push({ type: 'bench', x: wx + 90, y: wy + 24 });
          propsGrid[r][c].push({ type: 'lamp', x: wx + 22, y: wy + 90 });
          continue;
        }

        const shape = rand();
        if (shape < 0.34) {
          const p1 = pick(pool), p2 = pick(pool);
          solidGrid[r][c].push({
            x: wx + 14, y: wy + 16, w: 72, h: TS - 32,
            height: isMiami ? (56 + rand() * 58) : (84 + rand() * 98),
            roof: p1.roof, w1: p1.w1, w2: p1.w2, facade: p1.facade,
            neon: isMiami && rand() < 0.5 ? pick(['#f472b6', '#22d3ee', '#facc15']) : null
          });
          solidGrid[r][c].push({
            x: wx + 94, y: wy + 20, w: 70, h: TS - 40,
            height: isMiami ? (46 + rand() * 50) : (102 + rand() * 112),
            roof: p2.roof, w1: p2.w1, w2: p2.w2, facade: p2.facade, acUnit: true, antenna: rand() < 0.4
          });
        } else if (shape < 0.56) {
          const pal = pick(pool);
          const hMain = isMiami ? (62 + rand() * 68) : (115 + rand() * 110);
          solidGrid[r][c].push({
            x: wx + 16, y: wy + 16, w: TS - 32, h: 72,
            height: hMain, roof: pal.roof, w1: pal.w1, w2: pal.w2, facade: pal.facade,
            neon: rand() < 0.35 ? pick(['#38bdf8', '#f472b6', '#facc15']) : null
          });
          solidGrid[r][c].push({
            x: wx + 16, y: wy + 88, w: 68, h: 76,
            height: Math.max(45, hMain * 0.65), roof: pal.roof, w1: pal.w1, w2: pal.w2, facade: pal.facade, acUnit: true
          });
        } else {
          const pal = pick(pool);
          const height = isMiami ? (58 + rand() * 78) : (112 + rand() * 128);
          const hasHeli = !isMiami && height > 180 && rand() < 0.35;
          const hasPool = !hasHeli && (isMiami || rand() < 0.24);
          solidGrid[r][c].push({
            x: wx + 16, y: wy + 16, w: TS - 32, h: TS - 32,
            height: height, roof: pal.roof, w1: pal.w1, w2: pal.w2, facade: pal.facade,
            neon: rand() < 0.44 ? pick(['#38bdf8', '#f43f5e', '#a855f7', '#22d3ee', '#facc15']) : null,
            helipad: hasHeli, roofPool: hasPool, acUnit: !hasHeli && !hasPool, antenna: rand() < 0.35,
            sign: !hasHeli && rand() < 0.26 ? pick(['HOTEL', 'CLUB', 'VIP', 'PLAZA', 'TOWER', 'LOFT']) : null
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
    spawnX: 78 * TS + TS / 2,
    spawnY: 96 * TS + TS / 2
  };
})();
