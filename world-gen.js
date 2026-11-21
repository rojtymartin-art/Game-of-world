window.GTA = window.GTA || {};

window.GTA.World = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const D = C.DISTRICTS;
  const N = C.GRID_SIZE;
  const TS = C.TILE_SIZE;
  const rand = C.createRNG(88421);

  // Dátové vrstvy sveta
  const tiles = [];        // Typ podkladu [r][c]
  const districts = [];    // Štvrť [r][c]
  const solidGrid = [];    // Pevné 2.5D objekty (budovy, kontajnery) v políčku [r][c]
  const propsGrid = [];    // Dekorácie na zemi (stromy, palmy, bazény, slnečníky) [r][c]

  // Tvar rieky a pobrežia (prirodzené zakrivenie pomocou sínusu)
  function riverCol(r) {
    return 25 + Math.round(Math.sin(r * 0.11) * 1.5);
  }
  function shoreCol(r) {
    return 64 + Math.round(Math.sin(r * 0.13) * 1.5);
  }
  function southBayRow(c) {
    return 65 + Math.round(Math.cos(c * 0.14) * 1.2);
  }

  function isDrivable(t) {
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE || t === T.CONCRETE || t === T.RUNWAY || t === T.PIER;
  }

  function isRoadLike(t) {
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE;
  }

  function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function generate() {
    // 1. Inicializácia polí + základný terén (oceán, rieka, štvrte)
    for (let r = 0; r < N; r++) {
      tiles[r] = [];
      districts[r] = [];
      solidGrid[r] = [];
      propsGrid[r] = [];

      const rc = riverCol(r);
      const sc = shoreCol(r);

      for (let c = 0; c < N; c++) {
        solidGrid[r][c] = [];
        propsGrid[r][c] = [];
        const bayR = southBayRow(c);

        // Voda: východný oceán, južný záliv alebo rieka
        if (c >= sc || r >= bayR || (c >= rc && c <= rc + 1)) {
          tiles[r][c] = T.WATER;
          districts[r][c] = D.OCEAN;
          continue;
        }

        // Severný a západný okraj mapy = hustý horský les (prírodná hranica)
        if (r <= 1 || c <= 1) {
          tiles[r][c] = T.FOREST;
          districts[r][c] = D.SUBURBS;
          continue;
        }

        // Priradenie štvrte podľa polohy voči rieke a pobrežiu
        if (c < rc) {
          // Západná časť (za riekou)
          if (r >= 40) {
            tiles[r][c] = T.GRASS;
            districts[r][c] = D.AIRPORT;
          } else {
            tiles[r][c] = T.GRASS;
            districts[r][c] = D.SUBURBS;
          }
        } else {
          // Východná časť (hlavné mesto)
          if (c >= sc - 2 && r < 52) {
            tiles[r][c] = T.SAND;
            districts[r][c] = D.BEACH;
          } else if (r >= 49) {
            tiles[r][c] = T.CONCRETE;
            districts[r][c] = D.INDUSTRIAL;
          } else if (r < 19) {
            tiles[r][c] = T.SIDEWALK;
            districts[r][c] = D.OLD_TOWN;
          } else {
            tiles[r][c] = T.SIDEWALK;
            districts[r][c] = D.DOWNTOWN;
          }
        }
      }
    }

    // 2. Central Park v srdci Downtownu (s vlastným jazierkom)
    for (let r = 24; r <= 30; r++) {
      for (let c = 35; c <= 40; c++) {
        districts[r][c] = D.PARK;
        if (r >= 26 && r <= 28 && c >= 37 && c <= 38) {
          tiles[r][c] = T.WATER;
        } else {
          tiles[r][c] = T.GRASS;
        }
      }
    }

    // 3. Medzinárodné letisko (asfaltová plocha + obrovská pristávacia dráha)
    for (let r = 42; r <= 55; r++) {
      for (let c = 4; c <= 21; c++) {
        if (tiles[r][c] !== T.WATER) {
          tiles[r][c] = T.CONCRETE;
          districts[r][c] = D.AIRPORT;
        }
      }
    }
    // Pristávacia dráha (šírka 2 štvorce = 360 px, dĺžka 16 štvorcov = 2 880 px!)
    for (let c = 5; c <= 20; c++) {
      tiles[48][c] = T.RUNWAY;
      tiles[49][c] = T.RUNWAY;
    }

    // 4. Prístavné móla v južnom zálive + drevené plážové mólo do oceánu
    const dockCols = [[35, 37], [47, 49]];
    for (let d = 0; d < dockCols.length; d++) {
      for (let r = 62; r <= 68; r++) {
        for (let c = dockCols[d][0]; c <= dockCols[d][1]; c++) {
          tiles[r][c] = T.CONCRETE;
          districts[r][c] = D.INDUSTRIAL;
        }
      }
    }
    // Plážové mólo na úrovni hlavnej triedy (r = 32)
    const pierStart = shoreCol(32);
    for (let c = pierStart - 1; c <= pierStart + 4; c++) {
      if (c < N - 1) {
        tiles[32][c] = T.PIER;
        districts[32][c] = D.BEACH;
      }
    }

    // 5. Sieť ciest, diaľnic a mostov cez rieku
    const mainRows = [12, 32, 58]; // 3 hlavné východo-západné ťahy s mostami
    const mainCols = [12, 42, 56]; // 3 hlavné severo-južné ťahy

    for (let r = 2; r < N - 2; r++) {
      const rc = riverCol(r);
      const sc = shoreCol(r);
      for (let c = 2; c < N - 2; c++) {
        const bayR = southBayRow(c);
        if (c >= sc - 1 || r >= bayR - 1) continue;

        // Nezasahuj do Central Parku ani na dráhu letiska
        const inPark = (r >= 24 && r <= 30 && c >= 35 && c <= 40);
        const inAirportApron = (r >= 42 && r <= 55 && c >= 4 && c <= 21);
        if (inPark || inAirportApron) continue;

        const isMainR = mainRows.includes(r);
        const isMainC = mainCols.includes(c) && !(c === 12 && r > 41); // Západná diaľnica končí pri vstupe na letisko

        // Mosty cez rieku na hlavných ťahoch
        if (c >= rc && c <= rc + 1) {
          if (isMainR) {
            tiles[r][c] = T.BRIDGE;
            districts[r][c] = r === 58 ? D.INDUSTRIAL : D.DOWNTOWN;
          }
          continue;
        }

        if (isMainR || isMainC) {
          tiles[r][c] = T.HIGHWAY;
          continue;
        }

        // Nábrežné cesty pri rieke a hranici letiska
        if (c === rc - 1 || c === rc + 2) {
          if (r >= 4 && r <= 60) tiles[r][c] = T.ROAD;
          continue;
        }

        // Lokálne ulice podľa typu štvrte
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

    // Príjazdová cesta do letiska z diaľnice c=12
    for (let r = 38; r <= 42; r++) tiles[r][12] = T.HIGHWAY;
    // Príjazd na plážovú promenádu k mólu
    for (let c = 56; c < pierStart - 1; c++) tiles[32][c] = T.HIGHWAY;

    // 6. Generovanie 2.5D budov, hangárov, kontajnerov a prírodných prvkov
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const t = tiles[r][c];
        const dist = districts[r][c];
        const wx = c * TS;
        const wy = r * TS;

        // Okrajový les – pevné husté zalesnenie (zabráni nárazu do „ničoho“)
        if (t === T.FOREST) {
          addForestBorder(r, c, wx, wy);
          continue;
        }

        // Prístavné móla – lodné kontajnery po okrajoch
        if (dist === D.INDUSTRIAL && r >= 62 && (c === 35 || c === 49) && r % 2 === 0) {
          addContainers(r, c, wx, wy);
          continue;
        }

        // Letiskové hangáre (severný okraj letiska) a riadiaca veža
        if (dist === D.AIRPORT && r === 42 && (c === 6 || c === 9 || c === 15 || c === 18)) {
          solidGrid[r][c].push({
            x: wx + 12, y: wy + 14, w: TS - 24, h: TS - 28,
            height: 70, roof: '#64748b', w1: '#475569', w2: '#334155',
            style: 'hangar'
          });
          continue;
        }
        if (dist === D.AIRPORT && r === 43 && c === 20) {
          solidGrid[r][c].push({
            x: wx + 46, y: wy + 46, w: TS - 92, h: TS - 92,
            height: 175, roof: '#38bdf8', w1: '#cbd5e1', w2: '#94a3b8',
            neon: '#ef4444', style: 'tower'
          });
          continue;
        }

        // Preskoč cesty, vodu, dráhu a móla
        if (t === T.WATER || isDrivable(t)) continue;

        // Pláž – palmy a farebné slnečníky
        if (t === T.SAND) {
          if (rand() < 0.45) {
            propsGrid[r][c].push({
              type: 'palm',
              x: wx + 35 + rand() * (TS - 70),
              y: wy + 35 + rand() * (TS - 70),
              r: 18 + rand() * 8
            });
          }
          if (rand() < 0.35) {
            propsGrid[r][c].push({
              type: 'umbrella',
              x: wx + 35 + rand() * (TS - 70),
              y: wy + 35 + rand() * (TS - 70),
              color: pick(['#ef4444', '#38bdf8', '#facc15', '#ec4899'])
            });
          }
          continue;
        }

        // Central Park – stromy a zeleň
        if (dist === D.PARK) {
          for (let k = 0; k < 3; k++) {
            propsGrid[r][c].push({
              type: 'tree',
              x: wx + 28 + rand() * (TS - 56),
              y: wy + 28 + rand() * (TS - 56),
              r: 16 + rand() * 12
            });
          }
          continue;
        }

        // Vilová štvrť (Suburbs) – domčeky, záhrady, bazény a stromy
        if (dist === D.SUBURBS) {
          if (rand() < 0.25) {
            // Zalesnený pozemok / parčík
            for (let k = 0; k < 4; k++) {
              propsGrid[r][c].push({
                type: 'tree',
                x: wx + 25 + rand() * (TS - 50),
                y: wy + 25 + rand() * (TS - 50),
                r: 15 + rand() * 11
              });
            }
          } else {
            const pal = pick(C.PALETTES.SUBURBS);
            const bw = 66 + rand() * 28;
            const bh = 62 + rand() * 26;
            const bx = wx + 20 + rand() * (TS - bw - 40);
            const by = wy + 20 + rand() * 22;
            solidGrid[r][c].push({
              x: bx, y: by, w: bw, h: bh,
              height: 32 + rand() * 20,
              roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'villa'
            });
            // Bazén na dvore
            if (rand() < 0.45) {
              propsGrid[r][c].push({
                type: 'pool',
                x: wx + 32, y: by + bh + 12, w: 46, h: 28
              });
            }
            propsGrid[r][c].push({
              type: 'tree', x: wx + TS - 28, y: wy + TS - 28, r: 14
            });
          }
          continue;
        }

        // Letiskový okraj (tráva) – občas stromy ďaleko od dráhy
        if (dist === D.AIRPORT) {
          if (rand() < 0.25) {
            propsGrid[r][c].push({
              type: 'tree', x: wx + TS / 2, y: wy + TS / 2, r: 16
            });
          }
          continue;
        }

        // Priemyselná zóna – sklady alebo kontajnerové dvory
        if (dist === D.INDUSTRIAL) {
          if (rand() < 0.35) {
            addContainers(r, c, wx, wy);
          } else {
            const pal = pick(C.PALETTES.INDUSTRIAL);
            solidGrid[r][c].push({
              x: wx + 18, y: wy + 18, w: TS - 36, h: TS - 36,
              height: 48 + rand() * 28,
              roof: pal.roof, w1: pal.w1, w2: pal.w2, style: 'warehouse'
            });
          }
          continue;
        }

        // Downtown & Staré sídlisko – mestské bloky a mrakodrapy
        if (dist === D.DOWNTOWN || dist === D.OLD_TOWN) {
          const isDT = (dist === D.DOWNTOWN);
          // 10% šanca na malé námestie/parkovisko medzi domami
          if (rand() < 0.10) {
            propsGrid[r][c].push({ type: 'tree', x: wx + 40, y: wy + 40, r: 14 });
            propsGrid[r][c].push({ type: 'tree', x: wx + TS - 40, y: wy + TS - 40, r: 14 });
            continue;
          }

          const pal = pick(isDT ? C.PALETTES.DOWNTOWN : C.PALETTES.OLD_TOWN);
          const margin = isDT ? 16 : 20;
          const height = isDT ? (105 + rand() * 115) : (58 + rand() * 52);
          const hasHelipad = isDT && height > 175 && rand() < 0.4;
          const neon = isDT && rand() < 0.38
            ? pick(['#38bdf8', '#f43f5e', '#a855f7', '#22d3ee'])
            : null;

          solidGrid[r][c].push({
            x: wx + margin, y: wy + margin,
            w: TS - margin * 2, h: TS - margin * 2,
            height, roof: pal.roof, w1: pal.w1, w2: pal.w2,
            neon, helipad: hasHelipad,
            acUnit: !hasHelipad && rand() < 0.65
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

  function addForestBorder(r, c, wx, wy) {
    // Prírodný skalnatý/zalesnený masív na úplnom okraji mapy
    if (r === 0 || c === 0) {
      solidGrid[r][c].push({
        x: wx + 8, y: wy + 8, w: TS - 16, h: TS - 16,
        height: 55 + rand() * 40, roof: '#14532d', w1: '#166534', w2: '#052e16', style: 'hill'
      });
    }
    for (let k = 0; k < 4; k++) {
      propsGrid[r][c].push({
        type: 'tree',
        x: wx + 20 + rand() * (TS - 40),
        y: wy + 20 + rand() * (TS - 40),
        r: 18 + rand() * 14
      });
    }
  }

  // O(1) BLESKOVÁ KOLÍZIA: kontroluje len 3x3 políčka okolo auta!
  function checkCollision(x, y, radius) {
    if (x - radius < 0 || y - radius < 0 || x + radius > C.WORLD_SIZE || y + radius > C.WORLD_SIZE) {
      return true;
    }

    const tc = Math.floor(x / TS);
    const tr = Math.floor(y / TS);

    for (let r = tr - 1; r <= tr + 1; r++) {
      if (r < 0 || r >= N) continue;
      for (let c = tc - 1; c <= tc + 1; c++) {
        if (c < 0 || c >= N) continue;

        // Voda blokuje auto (zároveň automaticky slúži ako zvodidlo na mostoch a mólach!)
        if (tiles[r][c] === T.WATER) {
          if (circleRectHit(x, y, radius, c * TS, r * TS, TS, TS)) return true;
        }

        // Kontrola všetkých budov/kontajnerov v tomto políčku
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
    const dx = cx - nx;
    const dy = cy - ny;
    return (dx * dx + dy * dy) < r * r;
  }

  function getDistrictAt(x, y) {
    const c = Math.max(0, Math.min(N - 1, Math.floor(x / TS)));
    const r = Math.max(0, Math.min(N - 1, Math.floor(y / TS)));
    return districts[r][c];
  }

  generate();

  return {
    tiles, districts, solidGrid, propsGrid,
    isRoadLike, checkCollision, getDistrictAt,
    // Štart na veľkej križovatke v Downtown priamo pri Central Parku
    spawnX: 42 * TS + TS / 2,
    spawnY: 32 * TS + TS / 2
  };
})();
