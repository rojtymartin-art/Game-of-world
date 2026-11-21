window.GTA = window.GTA || {};

window.GTA.GPS = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  let waypoint = null;
  let routePath = [];
  let recalcTimer = 0;

  function isNavigable(r, c) {
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    const t = W.tiles[r][c];
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE || t === T.DIRT_ROAD ||
           t === T.CONCRETE || t === T.RUNWAY || t === T.PIER || t === T.TRACK || t === T.PLAZA || t === T.SIDEWALK;
  }

  function stepCost(r, c) {
    const t = W.tiles[r][c];
    if (t === T.HIGHWAY) return 0.72;
    if (t === T.ROAD || t === T.BRIDGE) return 1.0;
    if (t === T.DIRT_ROAD || t === T.TRACK || t === T.RUNWAY) return 1.25;
    if (t === T.CONCRETE || t === T.PLAZA || t === T.PIER || t === T.SIDEWALK) return 1.45;
    return 2.0;
  }

  function findNearestNavTile(wx, wy) {
    const sc = Math.max(0, Math.min(N - 1, Math.floor(wx / TS)));
    const sr = Math.max(0, Math.min(N - 1, Math.floor(wy / TS)));
    if (isNavigable(sr, sc)) return { r: sr, c: sc };

    for (let rad = 1; rad <= 12; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const rr = sr + dr, cc = sc + dc;
          if (isNavigable(rr, cc)) return { r: rr, c: cc };
        }
      }
    }
    return { r: sr, c: sc };
  }

  function computePath(fromX, fromY, toX, toY) {
    const start = findNearestNavTile(fromX, fromY);
    const goal = findNearestNavTile(toX, toY);
    const goalWorld = { x: toX, y: toY };

    if (start.r === goal.r && start.c === goal.c) {
      return [{ x: fromX, y: fromY }, goalWorld];
    }

    const total = N * N;
    const gScore = new Float32Array(total);
    gScore.fill(1e9);
    const cameFrom = new Int32Array(total);
    cameFrom.fill(-1);
    const closed = new Uint8Array(total);

    const startIdx = start.r * N + start.c;
    const goalIdx = goal.r * N + goal.c;
    gScore[startIdx] = 0;

    const open = [{ idx: startIdx, f: Math.hypot(goal.c - start.c, goal.r - start.r) }];
    const dirs = [
      { dr: -1, dc: 0, d: 1 }, { dr: 1, dc: 0, d: 1 },
      { dr: 0, dc: -1, d: 1 }, { dr: 0, dc: 1, d: 1 }
    ];

    let steps = 0, bestIdx = startIdx, bestH = Math.hypot(goal.c - start.c, goal.r - start.r);

    while (open.length > 0 && steps < 12000) {
      steps++;
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestPos].f) bestPos = i;
      }
      const cur = open[bestPos];
      open[bestPos] = open[open.length - 1];
      open.pop();

      const curIdx = cur.idx;
      if (closed[curIdx]) continue;
      closed[curIdx] = 1;

      if (curIdx === goalIdx) { bestIdx = curIdx; break; }

      const cr = Math.floor(curIdx / N), cc = curIdx % N;
      const hCur = Math.hypot(goal.c - cc, goal.r - cr);
      if (hCur < bestH) { bestH = hCur; bestIdx = curIdx; }

      for (let k = 0; k < dirs.length; k++) {
        const nr = cr + dirs[k].dr, nc = cc + dirs[k].dc;
        if (!isNavigable(nr, nc)) continue;
        const nIdx = nr * N + nc;
        if (closed[nIdx]) continue;

        const tentativeG = gScore[curIdx] + dirs[k].d * stepCost(nr, nc);
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = curIdx;
          gScore[nIdx] = tentativeG;
          const h = Math.hypot(goal.c - nc, goal.r - nr);
          open.push({ idx: nIdx, f: tentativeG + h * 1.15 });
        }
      }
    }

    const pts = [];
    let trace = bestIdx;
    while (trace !== -1 && pts.length < 400) {
      const tr = Math.floor(trace / N), tc = trace % N;
      pts.push({ x: tc * TS + TS / 2, y: tr * TS + TS / 2 });
      trace = cameFrom[trace];
    }
    pts.reverse();
    if (pts.length === 0) pts.push({ x: fromX, y: fromY });
    else pts[0] = { x: fromX, y: fromY };
    pts.push(goalWorld);
    return pts;
  }

  function setWaypoint(x, y, label, fromX, fromY) {
    waypoint = { x: x, y: y, label: label || 'Cieľ' };
    recalcTimer = 0;
    if (typeof fromX === 'number' && typeof fromY === 'number') {
      routePath = computePath(fromX, fromY, x, y);
    } else {
      routePath = [];
    }
  }

  function clear() { waypoint = null; routePath = []; recalcTimer = 0; }
  function hasWaypoint() { return waypoint !== null; }
  function getWaypoint() { return waypoint; }
  function getPath() { return routePath; }

  function getDistanceMeters(px, py) {
    if (!waypoint) return 0;
    return Math.round(Math.hypot(waypoint.x - px, waypoint.y - py) / 10);
  }

  function update(dt, px, py, onArrive) {
    if (!waypoint) return;
    const dist = Math.hypot(waypoint.x - px, waypoint.y - py);
    if (dist < 65) {
      const reached = waypoint;
      clear();
      if (onArrive) onArrive(reached);
      return;
    }

    recalcTimer -= dt / 60;
    if (recalcTimer <= 0) {
      recalcTimer = 0.85;
      routePath = computePath(px, py, waypoint.x, waypoint.y);
    }
  }

  function drawWorldRoute(ctx, time) {
    if (!waypoint || routePath.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < routePath.length; i++) {
      if (i === 0) ctx.moveTo(routePath[i].x, routePath[i].y);
      else ctx.lineTo(routePath[i].x, routePath[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 8;
    ctx.setLineDash([22, 14]); ctx.lineDashOffset = -(time * 0.06);
    ctx.stroke();
    ctx.setLineDash([]);

    const pulse = 1 + Math.sin(time * 0.008) * 0.22;
    ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
    ctx.beginPath(); ctx.arc(waypoint.x, waypoint.y, 34 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(waypoint.x, waypoint.y, 24 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  return {
    setWaypoint: setWaypoint, clear: clear, hasWaypoint: hasWaypoint,
    getWaypoint: getWaypoint, getPath: getPath, getDistanceMeters: getDistanceMeters,
    update: update, drawWorldRoute: drawWorldRoute
  };
})();
