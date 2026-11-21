window.GTA = window.GTA || {};

window.GTA.GPS = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  let waypoint = null; // { x, y, label }
  let path = [];       // [{ x, y }, ...]
  let recomputeTimer = 0;

  const visited = new Uint8Array(N * N);
  const parent = new Int32Array(N * N);
  const queue = new Int32Array(N * N);

  function idx(r, c) { return r * N + c; }

  function isRoadNav(r, c) {
    if (r < 1 || r >= N - 1 || c < 1 || c >= N - 1) return false;
    const t = W.tiles[r][c];
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE ||
      t === T.DIRT_ROAD || t === T.CONCRETE || t === T.TRACK ||
      t === T.RUNWAY || t === T.PIER || t === T.PLAZA;
  }

  function findNearestDrivable(wx, wy) {
    const sc = Math.max(1, Math.min(N - 2, Math.floor(wx / TS)));
    const sr = Math.max(1, Math.min(N - 2, Math.floor(wy / TS)));
    if (isRoadNav(sr, sc)) return { r: sr, c: sc };
    for (let rad = 1; rad <= 10; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
          const r = sr + dr, c = sc + dc;
          if (isRoadNav(r, c)) return { r: r, c: c };
        }
      }
    }
    return { r: sr, c: sc };
  }

  // Zoznam prehľadných ikon pre veľkú mapu (s možnosťou ťuknúť na ne!)
  function getMapIcons() {
    const icons = [];

    if (W.landmarks) {
      for (let i = 0; i < W.landmarks.length; i++) {
        const lm = W.landmarks[i];
        icons.push({ x: lm.x, y: lm.y, icon: lm.icon, name: lm.name, color: lm.color });
      }
    }

    if (W.gasStations) {
      for (let i = 0; i < W.gasStations.length; i++) {
        const g = W.gasStations[i];
        icons.push({ x: g.x, y: g.y, icon: '⛽', name: g.name, color: '#ef4444' });
      }
    }

    // Mega-lokácie na novej mape
    icons.push({ x: 33 * TS + 90, y: 26 * TS + 90, icon: '🏁', name: 'Grand Speedway',      color: '#facc15' });
    icons.push({ x: 50 * TS + 90, y: 34 * TS + 90, icon: '🏟️', name: 'Grand Arena Štadión', color: '#4ade80' });
    icons.push({ x: 51 * TS + 90, y: 12 * TS + 90, icon: '👽', name: 'Area 69',             color: '#ef4444' });
    icons.push({ x: 9  * TS + 90, y: 9  * TS + 90, icon: '🔒', name: 'Väzenie Alcatraz',    color: '#cbd5e1' });
    icons.push({ x: 61 * TS + 90, y: 61 * TS + 90, icon: '🏝️', name: 'Ostrov pašerákov',    color: '#2dd4bf' });
    icons.push({ x: 37 * TS + 90, y: 63 * TS + 90, icon: '🚢', name: 'Nákladná loď',        color: '#f97316' });
    icons.push({ x: 65 * TS + 90, y: 43 * TS + 90, icon: '🎡', name: 'Lunapark Mólo',       color: '#f472b6' });
    icons.push({ x: 31 * TS + 90, y: 47 * TS + 90, icon: '🏗️', name: 'Stavenisko',          color: '#fb923c' });
    icons.push({ x: 14 * TS + 90, y: 21 * TS + 90, icon: '🎬', name: 'Vyhliadka GRAND',     color: '#a3e635' });
    icons.push({ x: 42 * TS + 90, y: 27 * TS + 90, icon: '🔧', name: 'Garáž & Tuning',      color: '#facc15' });
    icons.push({ x: 48 * TS + 90, y: 58 * TS + 90, icon: '🔩', name: 'Chop Shop',           color: '#f97316' });

    return icons;
  }

  // Výpočet najkratšej cesty po uliciach (BFS)
  function computePath(fromX, fromY) {
    path = [];
    if (!waypoint) return;

    const start = findNearestDrivable(fromX, fromY);
    const goal = findNearestDrivable(waypoint.x, waypoint.y);
    const sId = idx(start.r, start.c);
    const gId = idx(goal.r, goal.c);

    if (sId === gId) {
      path = [{ x: fromX, y: fromY }, { x: waypoint.x, y: waypoint.y }];
      return;
    }

    visited.fill(0);
    parent.fill(-1);
    visited[sId] = 1;

    let head = 0, tail = 0;
    queue[tail++] = sId;
    let found = false;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (head < tail) {
      const cur = queue[head++];
      if (cur === gId) { found = true; break; }
      const cr = Math.floor(cur / N), cc = cur % N;

      for (let k = 0; k < 4; k++) {
        const nr = cr + dirs[k][0], nc = cc + dirs[k][1];
        if (nr < 1 || nr >= N - 1 || nc < 1 || nc >= N - 1) continue;
        const nid = idx(nr, nc);
        if (visited[nid]) continue;
        if (isRoadNav(nr, nc)) {
          visited[nid] = 1;
          parent[nid] = cur;
          queue[tail++] = nid;
        }
      }
    }

    if (!found) {
      // Napr. cieľ je na ostrove (Alcatraz / Pašeráci) -> priama trasa cez more/vzduch!
      path = [{ x: fromX, y: fromY }, { x: waypoint.x, y: waypoint.y }];
      return;
    }

    const rev = [];
    let cur = gId, guard = 0;
    while (cur !== -1 && guard++ < 500) {
      const r = Math.floor(cur / N), c = cur % N;
      rev.push({ x: c * TS + TS / 2, y: r * TS + TS / 2 });
      cur = parent[cur];
    }
    rev.reverse();

    path = [{ x: fromX, y: fromY }];
    for (let i = 0; i < rev.length; i++) path.push(rev[i]);
    path.push({ x: waypoint.x, y: waypoint.y });
  }

  // Nastavenie trasy kliknutím na veľkú mapu (automaticky prichytí blízku ikonu!)
  function setWaypointFromMap(wx, wy, playerX, playerY, notify) {
    const icons = getMapIcons();
    let snapped = null, bestD = 540;
    for (let i = 0; i < icons.length; i++) {
      const d = Math.hypot(icons[i].x - wx, icons[i].y - wy);
      if (d < bestD) { bestD = d; snapped = icons[i]; }
    }

    if (snapped) {
      waypoint = { x: snapped.x, y: snapped.y, label: snapped.icon + ' ' + snapped.name };
    } else {
      waypoint = { x: wx, y: wy, label: '📍 Vlastný cieľ' };
    }

    computePath(playerX, playerY);
    recomputeTimer = 0.5;
    if (window.GTA.Audio) window.GTA.Audio.playCash();
    if (notify) notify(`📍 GPS nastavené: ${waypoint.label}`, '#c084fc');
  }

  function clearWaypoint(notify) {
    waypoint = null;
    path = [];
    if (notify) notify('GPS trasa zrušená', '#94a3b8');
  }

  function update(dt, player, notify) {
    if (!waypoint) return;
    const dist = Math.hypot(waypoint.x - player.x, waypoint.y - player.y);
    if (dist < 120) {
      const reachedName = waypoint.label;
      waypoint = null;
      path = [];
      if (window.GTA.Audio) window.GTA.Audio.playSuccess();
      if (notify) notify(`🏁 Dorazil si do cieľa: ${reachedName}`, '#4ade80');
      return;
    }

    recomputeTimer -= dt / 60;
    if (recomputeTimer <= 0) {
      computePath(player.x, player.y);
      recomputeTimer = 0.55;
    } else if (path.length > 0) {
      // Plynule drží začiatok čiary pri hráčovi medzi prepočtami
      path[0].x = player.x;
      path[0].y = player.y;
    }
  }

  return {
    get waypoint() { return waypoint; },
    get path() { return path; },
    getMapIcons: getMapIcons,
    setWaypointFromMap: setWaypointFromMap,
    clearWaypoint: clearWaypoint,
    update: update
  };
})();
