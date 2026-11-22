window.GTA = window.GTA || {};

window.GTA.Traffic = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const STREET_TYPES = ['taxi', 'sports', 'muscle', 'suv', 'ambulance', 'truck', 'scooter', 'dirtbike', 'drift', 'limo'];
  const LANE_OFF = 24;
  let lightTimer = 0;

  function getLightPhase() {
    const cycle = lightTimer % 12;
    if (cycle < 5) return { ns: 'green', ew: 'red' };
    if (cycle < 6) return { ns: 'yellow', ew: 'red' };
    if (cycle < 11) return { ns: 'red', ew: 'green' };
    return { ns: 'red', ew: 'yellow' };
  }

  function hasTrafficLight(r, c) {
    return ((r + c) % 2 === 0);
  }

  function getRoadDirs(r, c) {
    const dirs = [];
    if (c < N - 1 && W.isRoadLike(W.tiles[r][c + 1])) dirs.push({ angle: 0, dx: 1, dy: 0 });
    if (c > 0 && W.isRoadLike(W.tiles[r][c - 1])) dirs.push({ angle: Math.PI, dx: -1, dy: 0 });
    if (r < N - 1 && W.isRoadLike(W.tiles[r + 1][c])) dirs.push({ angle: Math.PI / 2, dx: 0, dy: 1 });
    if (r > 0 && W.isRoadLike(W.tiles[r - 1][c])) dirs.push({ angle: -Math.PI / 2, dx: 0, dy: -1 });
    return dirs;
  }

  function lanePosFor(r, c, angle) {
    const cx = c * TS + TS / 2;
    const cy = r * TS + TS / 2;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    return { x: cx + nx * LANE_OFF, y: cy + ny * LANE_OFF };
  }

  function trySpawn(px, py, vehicles, spawnFn) {
    // Menej áut okolo hráča pre čistejšie a voľnejšie cesty
    let aiTotal = 0;
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].isAI && !vehicles[i].isPolice) aiTotal++;
    }
    if (aiTotal >= 10) return false;

    for (let tries = 0; tries < 6; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 540 + Math.random() * 680;
      const sx = px + Math.cos(ang) * dist;
      const sy = py + Math.sin(ang) * dist;
      const c = Math.floor(sx / TS);
      const r = Math.floor(sy / TS);
      if (r < 2 || r >= N - 2 || c < 2 || c >= N - 2) continue;
      if (!W.isRoadLike(W.tiles[r][c])) continue;

      const dirs = getRoadDirs(r, c);
      if (!dirs.length) continue;
      const chosen = dirs[Math.floor(Math.random() * dirs.length)];
      const pos = lanePosFor(r, c, chosen.angle);

      let blocked = false;
      for (let i = 0; i < vehicles.length; i++) {
        if (Math.hypot(vehicles[i].x - pos.x, vehicles[i].y - pos.y) < 175) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const isHwy = W.tiles[r][c] === T.HIGHWAY;
      const type = isHwy
        ? (Math.random() < 0.65 ? (Math.random() < 0.5 ? 'sports' : 'drift') : 'truck')
        : STREET_TYPES[Math.floor(Math.random() * STREET_TYPES.length)];

      const v = spawnFn(type, pos.x, pos.y, chosen.angle, { isAI: true });
      if (v) {
        v.aiSpeed = v.spec.max * (isHwy ? (0.52 + Math.random() * 0.22) : (0.34 + Math.random() * 0.18));
        return true;
      }
    }
    return false;
  }

  function triggerPanic(x, y, radius, vehicles) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.isAI || v.isPolice) continue;
      if (Math.hypot(v.x - x, v.y - y) < radius) {
        v.panicTimer = 240;
      }
    }
  }

  function update(dt, vehicles, peds, player, wantedLevel, resolveWorldCollisions) {
    lightTimer += dt / 60;
    const phase = getLightPhase();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.isAI || v.isPolice || v.isCriminal || v === player.inVehicle) continue;
      if (v.spec.isHeli || v.spec.isAircraft || v.spec.isBoat) continue;

      if (v.panicTimer > 0) v.panicTimer -= dt;

      const c = Math.max(1, Math.min(N - 2, Math.floor(v.x / TS)));
      const r = Math.max(1, Math.min(N - 2, Math.floor(v.y / TS)));
      const dirs = getRoadDirs(r, c);

      let targetAngle = v.angle;
      let speedMult = v.panicTimer > 0 ? 1.45 : 1.0;

      if (dirs.length > 0) {
        const isVert = Math.abs(Math.sin(v.angle)) > 0.7;
        const lightCol = isVert ? phase.ns : phase.ew;
        const cx = c * TS + TS / 2;
        const cy = r * TS + TS / 2;
        const distCenter = Math.hypot(v.x - cx, v.y - cy);

        if (v.panicTimer <= 0 && hasTrafficLight(r, c) && lightCol === 'red' && distCenter > 36 && distCenter < 76) {
          speedMult = 0;
        } else if (distCenter < 26 && v.turnCooldown <= 0) {
          const valid = dirs.filter(d => Math.abs(Math.atan2(Math.sin(d.angle - v.angle), Math.cos(d.angle - v.angle))) < Math.PI * 0.85);
          if (valid.length > 0) {
            const pickDir = valid[Math.floor(Math.random() * valid.length)];
            targetAngle = pickDir.angle;
            v.turnCooldown = 45;
          }
        }
      }

      if (v.turnCooldown > 0) v.turnCooldown -= dt;

      let diff = Math.atan2(Math.sin(targetAngle - v.angle), Math.cos(targetAngle - v.angle));
      v.angle += diff * 0.12 * dt;
      v.steerVis = Math.max(-0.4, Math.min(0.4, diff * 1.5));

      for (let j = 0; j < vehicles.length; j++) {
        if (i === j) continue;
        const o = vehicles[j];
        const dx = o.x - v.x, dy = o.y - v.y;
        const d = Math.hypot(dx, dy);
        if (d < 88 && d > 1) {
          const forwardDot = (dx / d) * Math.cos(v.angle) + (dy / d) * Math.sin(v.angle);
          if (forwardDot > 0.55) speedMult = Math.min(speedMult, 0.15);
        }
      }

      const spd = (v.aiSpeed || 5) * speedMult;
      v.vx = Math.cos(v.angle) * spd;
      v.vy = Math.sin(v.angle) * spd;
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      if (resolveWorldCollisions(v, v.radius, 'land')) {
        v.angle += Math.PI / 2;
      }
    }
  }

  return {
    getLightPhase: getLightPhase,
    hasTrafficLight: hasTrafficLight,
    trySpawn: trySpawn,
    triggerPanic: triggerPanic,
    update: update
  };
})();
