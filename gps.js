window.GTA = window.GTA || {};

window.GTA.GPS = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const visited = new Uint8Array(N * N);
  const parent = new Int32Array(N * N);
  const queue = new Int32Array(N * N);

  let waypoint = null;
  let path = [];
  let recalcTimer = 0;
  let lastStartTile = -1;

  function idx(r, c) { return r * N + c; }

  function isNavTile(r, c) {
    if (r < 1 || r >= N - 1 || c < 1 || c >= N - 1) return false;
    const t = W.tiles[r][c];
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE ||
      t === T.DIRT_ROAD || t === T.CONCRETE || t === T.TRACK ||
      t === T.PLAZA || t === T.PIER || t === T.RUNWAY;
  }

  function findNearestNavTile(wx, wy) {
    const sc = Math.max(1, Math.min(N - 2, Math.floor(wx / TS)));
    const sr = Math.max(1, Math.min(N - 2, Math.floor(wy / TS)));
    if (isNavTile(sr, sc)) return { r: sr, c: sc };
    for (let rad = 1; rad <= 10; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
          const r = sr + dr, c = sc + dc;
          if (isNavTile(r, c)) return { r: r, c: c };
        }
      }
    }
    return null;
  }

  function computePath(px, py) {
    if (!waypoint) { path = []; return; }

    const sTile = findNearestNavTile(px, py);
    const gTile = findNearestNavTile(waypoint.x, waypoint.y);

    if (!sTile || !gTile) {
      path = [{ x: px, y: py }, { x: waypoint.x, y: waypoint.y }];
      return;
    }

    const startId = idx(sTile.r, sTile.c);
    const goalId = idx(gTile.r, gTile.c);
    lastStartTile = startId;

    if (startId === goalId) {
      path = [{ x: px, y: py }, { x: waypoint.x, y: waypoint.y }];
      return;
    }

    visited.fill(0);
    parent.fill(-1);
    let head = 0, tail = 0;
    visited[startId] = 1;
    queue[tail++] = startId;

    let found = false;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (head < tail) {
      const cur = queue[head++];
      if (cur === goalId) { found = true; break; }
      const cr = Math.floor(cur / N), cc = cur % N;

      for (let k = 0; k < 4; k++) {
        const nr = cr + dirs[k][0], nc = cc + dirs[k][1];
        if (nr < 1 || nr >= N - 1 || nc < 1 || nc >= N - 1) continue;
        const nid = idx(nr, nc);
        if (visited[nid]) continue;
        if (isNavTile(nr, nc)) {
          visited[nid] = 1;
          parent[nid] = cur;
          queue[tail++] = nid;
        }
      }
    }

    if (!found) {
      path = [{ x: px, y: py }, { x: waypoint.x, y: waypoint.y }];
      return;
    }

    const rev = [];
    let cur = goalId, guard = 0;
    while (cur !== -1 && guard++ < 400) {
      const r = Math.floor(cur / N), c = cur % N;
      rev.push({ x: c * TS + TS / 2, y: r * TS + TS / 2 });
      cur = parent[cur];
    }
    rev.reverse();
    rev[0] = { x: px, y: py };
    rev.push({ x: waypoint.x, y: waypoint.y });
    path = rev;
  }

  function setWaypoint(wx, wy, label, px, py) {
    waypoint = {
      x: Math.max(60, Math.min(C.WORLD_SIZE - 60, wx)),
      y: Math.max(60, Math.min(C.WORLD_SIZE - 60, wy)),
      label: label || 'Zvolený bod'
    };
    recalcTimer = 0;
    computePath(px, py);
  }

  function clear() {
    waypoint = null;
    path = [];
    lastStartTile = -1;
  }

  function update(dt, px, py, onArrived) {
    if (!waypoint) return;
    if (Math.hypot(px - waypoint.x, py - waypoint.y) < 125) {
      const done = waypoint;
      clear();
      if (onArrived) onArrived(done);
      return;
    }

    recalcTimer -= dt / 60;
    const c = Math.max(1, Math.min(N - 2, Math.floor(px / TS)));
    const r = Math.max(1, Math.min(N - 2, Math.floor(py / TS)));
    const curId = idx(r, c);

    if (recalcTimer <= 0 || curId !== lastStartTile) {
      computePath(px, py);
      recalcTimer = 0.45;
    } else if (path.length > 0) {
      path[0].x = px;
      path[0].y = py;
    }
  }

  function getDistanceMeters(px, py) {
    if (!waypoint) return 0;
    return Math.max(1, Math.round(Math.hypot(waypoint.x - px, waypoint.y - py) / 10));
  }

  function drawWorldRoute(ctx, time) {
    if (!waypoint || path.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.32)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      if (i === 0) ctx.moveTo(path[i].x, path[i].y);
      else ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#d8b4fe';
    ctx.lineWidth = 6;
    ctx.setLineDash([22, 16]);
    ctx.lineDashOffset = -(time * 0.08);
    ctx.stroke();
    ctx.setLineDash([]);

    const pulse = 0.85 + Math.sin(time * 0.007) * 0.15;
    ctx.fillStyle = 'rgba(168, 85, 247, 0.28)';
    ctx.beginPath(); ctx.arc(waypoint.x, waypoint.y, 44 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(waypoint.x, waypoint.y, 44 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  return {
    setWaypoint: setWaypoint,
    clear: clear,
    update: update,
    getWaypoint: function () { return waypoint; },
    getPath: function () { return path; },
    hasWaypoint: function () { return waypoint !== null; },
    getDistanceMeters: getDistanceMeters,
    drawWorldRoute: drawWorldRoute
  };
})();
