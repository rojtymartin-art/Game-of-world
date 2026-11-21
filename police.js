window.GTA = window.GTA || {};

window.GTA.Police = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const POLICE_STATION = { x: 39 * TS + 90, y: 32 * TS + 90, name: 'Policajná stanica Downtown' };
  const HOSPITAL       = { x: 42 * TS + 90, y: 20 * TS + 90, name: 'Nemocnica Grand City' };

  const cops = [];
  const copBullets = [];

  const flowDist = new Int32Array(N * N);
  const bfsQueue = new Int32Array(N * N);
  let flowTimer = 0;
  let lastFlowTile = -1;
  let roadblockCooldown = 0;
  let tasedTimer = 0;

  function idx(r, c) {
    return r * N + c;
  }

  function isNavRoad(r, c) {
    if (r < 1 || r >= N - 1 || c < 1 || c >= N - 1) return false;
    const t = W.tiles[r][c];
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE || t === T.CONCRETE || t === T.RUNWAY;
  }

  function pointInBuilding(x, y) {
    if (x < 0 || y < 0 || x >= C.WORLD_SIZE || y >= C.WORLD_SIZE) return true;
    const c = Math.floor(x / TS);
    const r = Math.floor(y / TS);
    const objs = W.solidGrid[r][c];
    for (let i = 0; i < objs.length; i++) {
      const b = objs[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }

  function hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist < 24) return true;
    const steps = Math.ceil(dist / 26);
    const sx = dx / steps;
    const sy = dy / steps;
    let cx = x1 + sx;
    let cy = y1 + sy;
    for (let i = 1; i < steps; i++) {
      if (pointInBuilding(cx, cy)) return false;
      cx += sx;
      cy += sy;
    }
    return true;
  }

  function findNearestRoadTile(wx, wy) {
    const sc = Math.max(1, Math.min(N - 2, Math.floor(wx / TS)));
    const sr = Math.max(1, Math.min(N - 2, Math.floor(wy / TS)));
    if (isNavRoad(sr, sc)) return { r: sr, c: sc };
    for (let rad = 1; rad <= 7; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
          const r = sr + dr;
          const c = sc + dc;
          if (isNavRoad(r, c)) return { r: r, c: c };
        }
      }
    }
    return { r: sr, c: sc };
  }

  function buildFlowField(targetX, targetY) {
    const start = findNearestRoadTile(targetX, targetY);
    const startId = idx(start.r, start.c);
    flowDist.fill(-1);
    flowDist[startId] = 0;

    let head = 0;
    let tail = 0;
    bfsQueue[tail++] = startId;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (head < tail) {
      const cur = bfsQueue[head++];
      const cr = Math.floor(cur / N);
      const cc = cur % N;
      const nextD = flowDist[cur] + 1;
      if (nextD > 36) continue;

      for (let k = 0; k < 4; k++) {
        const nr = cr + dirs[k][0];
        const nc = cc + dirs[k][1];
        if (nr < 1 || nr >= N - 1 || nc < 1 || nc >= N - 1) continue;
        const nid = idx(nr, nc);
        if (flowDist[nid] !== -1) continue;
        if (isNavRoad(nr, nc)) {
          flowDist[nid] = nextD;
          bfsQueue[tail++] = nid;
        }
      }
    }
    lastFlowTile = startId;
  }

  function getFlowWaypoint(wx, wy, fallbackX, fallbackY) {
    const c = Math.max(1, Math.min(N - 2, Math.floor(wx / TS)));
    const r = Math.max(1, Math.min(N - 2, Math.floor(wy / TS)));
    const curD = flowDist[idx(r, c)];

    let bestR = r;
    let bestC = c;
    let bestD = (curD >= 0 ? curD : 9999);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let k = 0; k < 4; k++) {
      const nr = r + dirs[k][0];
      const nc = c + dirs[k][1];
      if (nr < 1 || nr >= N - 1 || nc < 1 || nc >= N - 1) continue;
      const d = flowDist[idx(nr, nc)];
      if (d >= 0 && d < bestD) {
        bestD = d;
        bestR = nr;
        bestC = nc;
      }
    }

    if (bestR !== r || bestC !== c) {
      return { x: bestC * TS + TS / 2, y: bestR * TS + TS / 2 };
    }
    return { x: fallbackX, y: fallbackY };
  }

  function init() {
    cops.length = 0;
    copBullets.length = 0;
    tasedTimer = 0;
    roadblockCooldown = 0;
  }

  function addWanted(stars) {
    const E = window.GTA.Entities;
    const prev = E.wanted.level;
    E.wanted.level = Math.min(5, Math.max(E.wanted.level, stars));
    E.wanted.seen = true;
    E.wanted.lastKnownX = E.player.x;
    E.wanted.lastKnownY = E.player.y;
    E.wanted.searchTimer = 11 + E.wanted.level * 2;
    if (E.wanted.level > prev && window.GTA.Audio) window.GTA.Audio.playAlert();
  }

  function clearWanted() {
    const E = window.GTA.Entities;
    E.wanted.level = 0;
    E.wanted.seen = false;
    E.wanted.searchTimer = 0;
    E.wanted.bustedTimer = 0;
    E.wanted.bustedProgress = 0;
    tasedTimer = 0;
    cops.length = 0;
    copBullets.length = 0;
    for (let i = 0; i < E.vehicles.length; i++) {
      if (E.vehicles[i].isPolice && E.vehicles[i] !== E.player.inVehicle) {
        E.vehicles[i].sirenOn = false;
      }
    }
  }

  function deployCopsFromVehicle(v, wantedLevel) {
    const E = window.GTA.Entities;
    const maxCops = Math.min(10, 2 + wantedLevel * 2);
    const count = v.crew || 0;
    if (count <= 0 || cops.length >= maxCops) return;

    const kind = (v.type === 'swat' || wantedLevel >= 4)
      ? 'swat'
      : (wantedLevel >= 3 ? 'shotgun' : 'cop');

    for (let k = 0; k < count && cops.length < maxCops; k++) {
      const side = (k % 2 === 0 ? -1 : 1);
      const sx = v.x + Math.cos(v.angle + side * Math.PI / 2) * (v.radius + 14) + (Math.random() - 0.5) * 14;
      const sy = v.y + Math.sin(v.angle + side * Math.PI / 2) * (v.radius + 14) + (Math.random() - 0.5) * 14;
      const cop = {
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        angle: Math.atan2(E.player.y - sy, E.player.x - sx),
        radius: 9.5,
        kind: kind,
        hp: kind === 'swat' ? 110 : (kind === 'shotgun' ? 75 : 55),
        maxHp: kind === 'swat' ? 110 : (kind === 'shotgun' ? 75 : 55),
        speed: kind === 'swat' ? 3.55 : 3.35,
        fireCD: 24 + Math.random() * 20,
        taseCD: 15,
        walkAnim: Math.random() * 6
      };
      E.resolveWorldCollisions(cop, cop.radius);
      cops.push(cop);
    }
    v.crew = 0;
  }

  function trySpawnRoadblock() {
    const E = window.GTA.Entities;
    const pv = E.player.inVehicle;
    if (!pv || pv.altitude > 0.2 || Math.hypot(pv.vx, pv.vy) < 4) return;
    const fx = Math.cos(pv.angle);
    const fy = Math.sin(pv.angle);
    const tx = pv.x + fx * 820;
    const ty = pv.y + fy * 820;
    const c = Math.floor(tx / TS);
    const r = Math.floor(ty / TS);
    if (!isNavRoad(r, c)) return;

    const cx = c * TS + TS / 2;
    const cy = r * TS + TS / 2;
    const perp = pv.angle + Math.PI / 2;
    const vType = E.wanted.level >= 4 ? 'swat' : 'police';
    for (let s = -1; s <= 1; s += 2) {
      const bx = cx + Math.cos(perp) * 34 * s;
      const by = cy + Math.sin(perp) * 34 * s;
      const car = E.spawnVehicle(vType, bx, by, perp, {
        isAI: true,
        isPolice: true,
        sirenOn: true
      });
      car.crew = vType === 'swat' ? 2 : 1;
      deployCopsFromVehicle(car, E.wanted.level);
    }
    roadblockCooldown = 19;
  }

  function damageCop(cop, dmg, callbacks) {
    const E = window.GTA.Entities;
    cop.hp -= dmg;
    E.spawnParticles(cop.x, cop.y, '#ef4444', 5, 2.8, 3);
    if (cop.hp <= 0) {
      const idxC = cops.indexOf(cop);
      if (idxC >= 0) cops.splice(idxC, 1);
      E.spawnParticles(cop.x, cop.y, '#dc2626', 10, 3.6, 4);
      if (E.wanted.level < 3) addWanted(E.wanted.level + 1);
      if (callbacks && callbacks.onCopDown) callbacks.onCopDown();
    }
  }

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function steerTowards(cur, target, step) {
    const diff = angleDiff(target, cur);
    if (Math.abs(diff) <= step) return target;
    return cur + Math.sign(diff) * step;
  }

  function isPlayerTased() {
    return tasedTimer > 0;
  }

  function update(dt, callbacks) {
    const E = window.GTA.Entities;
    const p = E.player;
    const w = E.wanted;
    const sec = dt / 60;

    if (tasedTimer > 0) tasedTimer = Math.max(0, tasedTimer - sec);
    if (roadblockCooldown > 0) roadblockCooldown -= sec;

    if (w.level <= 0) {
      updateCopBullets(dt, callbacks);
      w.bustedProgress = 0;
      w.seen = false;
      return;
    }

    const inAir = p.inVehicle && p.inVehicle.altitude > 0.25;

    let spottedNow = false;
    let nearestThreatDist = 9999;
    let nearestCopDist = 9999;

    for (let i = 0; i < E.vehicles.length; i++) {
      const v = E.vehicles[i];
      if (!v.isPolice || v === p.inVehicle) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < nearestThreatDist) nearestThreatDist = d;

      const sightRange = inAir ? 360 : 540;
      if (d < sightRange && hasLineOfSight(v.x, v.y, p.x, p.y)) {
        const angToP = Math.atan2(p.y - v.y, p.x - v.x);
        if (w.seen || d < 140 || Math.abs(angleDiff(angToP, v.angle)) < 1.08) {
          spottedNow = true;
        }
      }
    }

    for (let i = 0; i < cops.length; i++) {
      const cp = cops[i];
      const d = Math.hypot(cp.x - p.x, cp.y - p.y);
      if (d < nearestCopDist) nearestCopDist = d;
      if (d < nearestThreatDist) nearestThreatDist = d;

      if (d < 430 && hasLineOfSight(cp.x, cp.y, p.x, p.y)) {
        const angToP = Math.atan2(p.y - cp.y, p.x - cp.x);
        if (w.seen || d < 110 || Math.abs(angleDiff(angToP, cp.angle)) < 1.15) {
          spottedNow = true;
        }
      }
    }

    if (spottedNow) {
      w.seen = true;
      w.lastKnownX = p.x;
      w.lastKnownY = p.y;
      w.searchTimer = 11 + w.level * 2.2;
    } else {
      w.seen = false;
      w.searchTimer -= sec;
      if (w.searchTimer <= 0) {
        clearWanted();
        if (callbacks && callbacks.onEscaped) callbacks.onEscaped();
        return;
      }
    }

    flowTimer -= sec;
    const goalX = w.seen ? p.x : w.lastKnownX;
    const goalY = w.seen ? p.y : w.lastKnownY;
    const goalTile = idx(
      Math.max(0, Math.min(N - 1, Math.floor(goalY / TS))),
      Math.max(0, Math.min(N - 1, Math.floor(goalX / TS)))
    );
    if (flowTimer <= 0 || goalTile !== lastFlowTile) {
      buildFlowField(goalX, goalY);
      flowTimer = 0.35;
    }

    if (w.level >= 3 && w.seen && roadblockCooldown <= 0 && p.inVehicle) {
      trySpawnRoadblock();
    }

    // Riadenie policajných vozidiel
    for (let i = 0; i < E.vehicles.length; i++) {
      const v = E.vehicles[i];
      if (!v.isPolice || !v.isAI || v === p.inVehicle) continue;

      v.sirenOn = true;
      const distP = Math.hypot(v.x - p.x, v.y - p.y);
      const distGoal = Math.hypot(v.x - goalX, v.y - goalY);

      if (!p.inVehicle && distP < 250 && v.crew > 0 && hasLineOfSight(v.x, v.y, p.x, p.y)) {
        v.vx *= 0.85;
        v.vy *= 0.85;
        deployCopsFromVehicle(v, w.level);
        continue;
      }

      if (p.inVehicle && distP < 125 && Math.hypot(p.inVehicle.vx, p.inVehicle.vy) < 2.2 && v.crew > 0) {
        deployCopsFromVehicle(v, w.level);
      }

      if (v.crew <= 0 && v.type !== 'tank') {
        v.vx *= 0.9;
        v.vy *= 0.9;
        continue;
      }

      if (v.type === 'tank') {
        v.tankCD = (v.tankCD || 90) - dt;
        if (w.seen && distP < 480 && v.tankCD <= 0 && hasLineOfSight(v.x, v.y, p.x, p.y)) {
          const ang = Math.atan2(p.y - v.y, p.x - v.x);
          copBullets.push({
            type: 'shell',
            x: v.x + Math.cos(ang) * 32,
            y: v.y + Math.sin(ang) * 32,
            vx: Math.cos(ang) * 12.5,
            vy: Math.sin(ang) * 12.5,
            angle: ang,
            dmg: 35,
            life: 60
          });
          v.tankCD = 135;
          if (window.GTA.Audio) window.GTA.Audio.playRocket();
        }
      }

      if (v.reverseTimer > 0) {
        v.reverseTimer -= sec;
        v.angle += (v.reverseDir || 1) * 0.055 * dt;
        const revSpd = -4.2;
        v.vx += (Math.cos(v.angle) * revSpd - v.vx) * 0.2 * dt;
        v.vy += (Math.sin(v.angle) * revSpd - v.vy) * 0.2 * dt;
      } else {
        let aimX;
        let aimY;
        if (w.seen && distP < 420 && hasLineOfSight(v.x, v.y, p.x, p.y)) {
          const lead = p.inVehicle ? 14 : 4;
          aimX = p.x + (p.inVehicle ? p.inVehicle.vx * lead : 0);
          aimY = p.y + (p.inVehicle ? p.inVehicle.vy * lead : 0);
        } else if (!w.seen && distGoal < 160) {
          v.searchWander = (v.searchWander || 0) - sec;
          if (v.searchWander <= 0) {
            v.wanderAng = Math.random() * Math.PI * 2;
            v.searchWander = 2.5;
          }
          aimX = v.x + Math.cos(v.wanderAng || 0) * 180;
          aimY = v.y + Math.sin(v.wanderAng || 0) * 180;
        } else {
          const wp = getFlowWaypoint(v.x, v.y, goalX, goalY);
          aimX = wp.x;
          aimY = wp.y;
        }

        const targetAng = Math.atan2(aimY - v.y, aimX - v.x);
        const turnRate = v.type === 'tank' ? 0.036 : 0.082;
        v.angle = steerTowards(v.angle, targetAng, turnRate * dt);

        const baseSpd = v.type === 'tank'
          ? 6.5
          : (v.type === 'swat' ? 9.8 : Math.min(12.6, 8.6 + w.level * 0.85));
        const turnSlow = Math.max(0.45, 1 - Math.abs(angleDiff(targetAng, v.angle)) * 0.45);
        const desiredSpd = (w.seen ? baseSpd : baseSpd * 0.62) * turnSlow;

        v.vx += (Math.cos(v.angle) * desiredSpd - v.vx) * 0.14 * dt;
        v.vy += (Math.sin(v.angle) * desiredSpd - v.vy) * 0.14 * dt;
      }

      v.x += v.vx * dt;
      v.y += v.vy * dt;
      const wHit = E.resolveWorldCollisions(v, v.radius);
      if (wHit) {
        const vn = v.vx * wHit.nx + v.vy * wHit.ny;
        if (vn < 0) {
          v.vx -= 1.3 * vn * wHit.nx;
          v.vy -= 1.3 * vn * wHit.ny;
        }
        if (Math.hypot(v.vx, v.vy) < 2.2 && (!v.reverseTimer || v.reverseTimer <= 0)) {
          v.reverseTimer = 0.65;
          v.reverseDir = Math.random() < 0.5 ? 1 : -1;
        }
      }
    }

    // Posily peších policajtov za rohom
    if (!p.inVehicle && cops.length < Math.min(6, w.level + 1) && Math.random() < 0.015 * dt) {
      const ang = Math.random() * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * 440;
      const sy = p.y + Math.sin(ang) * 440;
      if (!W.checkCollision(sx, sy, 12)) {
        const kind = w.level >= 4 ? 'swat' : (w.level >= 3 ? 'shotgun' : 'cop');
        cops.push({
          x: sx,
          y: sy,
          vx: 0,
          vy: 0,
          angle: Math.atan2(p.y - sy, p.x - sx),
          radius: 9.5,
          kind: kind,
          hp: kind === 'swat' ? 110 : 60,
          maxHp: kind === 'swat' ? 110 : 60,
          speed: kind === 'swat' ? 3.55 : 3.35,
          fireCD: 30,
          taseCD: 20,
          walkAnim: 0
        });
      }
    }

    // Pohyb a streľba peších policajtov
    for (let i = cops.length - 1; i >= 0; i--) {
      const cp = cops[i];
      const distP = Math.hypot(cp.x - p.x, cp.y - p.y);
      if (distP > 1400) {
        cops.splice(i, 1);
        continue;
      }

      const canSee = !inAir && distP < 420 && hasLineOfSight(cp.x, cp.y, p.x, p.y);
      let tx = goalX;
      let ty = goalY;
      if (!canSee && Math.hypot(cp.x - goalX, cp.y - goalY) > 130) {
        const wp = getFlowWaypoint(cp.x, cp.y, goalX, goalY);
        tx = wp.x;
        ty = wp.y;
      }

      const desiredAng = Math.atan2(ty - cp.y, tx - cp.x);
      cp.angle = steerTowards(cp.angle, desiredAng, 0.16 * dt);

      const stopDist = (w.level === 1 || !p.inVehicle) ? 26 : 110;
      const moveSpd = (canSee && distP < stopDist)
        ? cp.speed * 0.25
        : (w.seen ? cp.speed : cp.speed * 0.65);

      cp.vx = Math.cos(cp.angle) * moveSpd;
      cp.vy = Math.sin(cp.angle) * moveSpd;
      cp.x += cp.vx * dt;
      cp.y += cp.vy * dt;
      cp.walkAnim += (moveSpd * 0.08) * dt;

      const hitWall = E.resolveWorldCollisions(cp, cp.radius);
      if (hitWall) {
        const tangentX = -hitWall.ny;
        const tangentY = hitWall.nx;
        const dot = tangentX * (tx - cp.x) + tangentY * (ty - cp.y);
        const sign = dot >= 0 ? 1 : -1;
        cp.x += tangentX * sign * cp.speed * 0.7 * dt;
        cp.y += tangentY * sign * cp.speed * 0.7 * dt;
        E.resolveWorldCollisions(cp, cp.radius);
      }

      if (p.inVehicle && p.inVehicle.altitude < 0.18 && p.inVehicle.jumpZ < 8) {
        const pv = p.inVehicle;
        const dCar = Math.hypot(cp.x - pv.x, cp.y - pv.y);
        if (dCar < pv.radius + cp.radius) {
          const carSpd = Math.hypot(pv.vx, pv.vy);
          if (carSpd > 3.8) {
            damageCop(cp, carSpd * 14, callbacks);
            if (cp.hp <= 0) continue;
          } else {
            const aOut = Math.atan2(cp.y - pv.y, cp.x - pv.x);
            cp.x = pv.x + Math.cos(aOut) * (pv.radius + cp.radius + 2);
            cp.y = pv.y + Math.sin(aOut) * (pv.radius + cp.radius + 2);
          }
        }
      }

      cp.fireCD -= dt;
      cp.taseCD -= dt;
      if (canSee && w.seen) {
        const aimAng = Math.atan2(p.y - cp.y, p.x - cp.x);
        if (w.level === 1 && !p.inVehicle && distP < 120 && cp.taseCD <= 0) {
          copBullets.push({
            type: 'taser',
            x: cp.x + Math.cos(aimAng) * 12,
            y: cp.y + Math.sin(aimAng) * 12,
            vx: Math.cos(aimAng) * 11,
            vy: Math.sin(aimAng) * 11,
            angle: aimAng,
            dmg: 2,
            life: 16
          });
          cp.taseCD = 190;
          if (window.GTA.Audio) window.GTA.Audio.playAlert();
        } else if (w.level >= 2 && cp.fireCD <= 0 && distP < 360) {
          if (cp.kind === 'shotgun') {
            for (let s = -1; s <= 1; s++) {
              const a = aimAng + s * 0.12 + (Math.random() - 0.5) * 0.04;
              copBullets.push({
                type: 'bullet',
                x: cp.x + Math.cos(a) * 14,
                y: cp.y + Math.sin(a) * 14,
                vx: Math.cos(a) * 15,
                vy: Math.sin(a) * 15,
                angle: a,
                dmg: 6,
                life: 24
              });
            }
            cp.fireCD = 68;
          } else if (cp.kind === 'swat') {
            const a = aimAng + (Math.random() - 0.5) * 0.09;
            copBullets.push({
              type: 'bullet',
              x: cp.x + Math.cos(a) * 14,
              y: cp.y + Math.sin(a) * 14,
              vx: Math.cos(a) * 17,
              vy: Math.sin(a) * 17,
              angle: a,
              dmg: 7,
              life: 28
            });
            cp.fireCD = 22;
          } else {
            const a = aimAng + (Math.random() - 0.5) * 0.1;
            copBullets.push({
              type: 'bullet',
              x: cp.x + Math.cos(a) * 14,
              y: cp.y + Math.sin(a) * 14,
              vx: Math.cos(a) * 15.5,
              vy: Math.sin(a) * 15.5,
              angle: a,
              dmg: 6,
              life: 28
            });
            cp.fireCD = 52;
          }
          if (window.GTA.Audio) window.GTA.Audio.playShot();
        }
      }
    }

    updateCopBullets(dt, callbacks);

    // Zatýkanie (BUSTED) pešo aj v aute
    let arresting = false;
    let arrestTime = 2.0;

    if (!inAir && w.seen) {
      if (!p.inVehicle) {
        if (nearestCopDist < 46) {
          arresting = true;
          arrestTime = 1.7;
        }
      } else {
        const carSpd = Math.hypot(p.inVehicle.vx, p.inVehicle.vy);
        if (carSpd < 2.5 && (nearestCopDist < 62 || nearestThreatDist < 68)) {
          arresting = true;
          arrestTime = 2.2;
        }
      }
    }

    if (arresting) {
      w.bustedTimer += sec;
      w.bustedProgress = Math.min(1, w.bustedTimer / arrestTime);
      if (w.bustedTimer >= arrestTime) {
        const starsAtArrest = w.level;
        clearWanted();
        if (callbacks && callbacks.onBusted) callbacks.onBusted(starsAtArrest);
      }
    } else {
      w.bustedTimer = Math.max(0, w.bustedTimer - sec * 1.4);
      w.bustedProgress = Math.min(1, w.bustedTimer / arrestTime);
    }
  }

  function updateCopBullets(dt, callbacks) {
    const E = window.GTA.Entities;
    const p = E.player;

    for (let i = copBullets.length - 1; i >= 0; i--) {
      const b = copBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      let hit = false;
      if (pointInBuilding(b.x, b.y)) {
        hit = true;
        E.spawnParticles(b.x, b.y, '#cbd5e1', 3, 2, 2);
      } else {
        const targetR = p.inVehicle ? p.inVehicle.radius + 3 : p.radius + 5;
        if (Math.hypot(b.x - p.x, b.y - p.y) < targetR) {
          hit = true;
          if (b.type === 'taser') {
            tasedTimer = 1.35;
            E.spawnParticles(p.x, p.y, '#38bdf8', 10, 3.5, 3);
            if (callbacks && callbacks.onNotify) callbacks.onNotify('⚡ Zasiahol ťa Taser! Spomalený!', '#38bdf8');
          } else if (b.type === 'shell') {
            E.triggerExplosion(b.x, b.y, 130, callbacks);
            E.damagePlayer(b.dmg, callbacks);
          } else {
            if (p.inVehicle) {
              p.inVehicle.hp -= b.dmg * 0.85;
              E.damagePlayer(b.dmg * 0.25, callbacks);
            } else {
              E.damagePlayer(b.dmg, callbacks);
            }
            E.spawnParticles(b.x, b.y, '#ef4444', 4, 2.5, 2.5);
          }
        }
      }

      if (hit || b.life <= 0) {
        if (b.type === 'shell' && hit) E.triggerExplosion(b.x, b.y, 130, callbacks);
        copBullets.splice(i, 1);
      }
    }
  }

  function drawCops(ctx, cam, vw, vh, zoom, time) {
    const halfW = (vw / 2) / zoom + 120;
    const halfH = (vh / 2) / zoom + 120;

    for (let i = 0; i < cops.length; i++) {
      const cp = cops[i];
      if (Math.abs(cp.x - cam.x) > halfW || Math.abs(cp.y - cam.y) > halfH) continue;

      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(cp.angle);

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(2, 3, 8.5, 0, Math.PI * 2);
      ctx.fill();

      const swing = Math.sin(cp.walkAnim) * 2.2;
      ctx.fillStyle = cp.kind === 'swat' ? '#0f172a' : '#1d4ed8';
      ctx.beginPath();
      ctx.ellipse(swing * 0.35, 0, 6.5, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cp.kind === 'swat' ? '#334155' : '#facc15';
      ctx.fillRect(-2, -4, 4, 8);

      ctx.fillStyle = '#020617';
      ctx.fillRect(4, 3, cp.kind === 'shotgun' || cp.kind === 'swat' ? 12 : 8, 3);

      ctx.fillStyle = cp.kind === 'swat' ? '#1e293b' : '#1e3a8a';
      ctx.beginPath();
      ctx.arc(1.5, 0, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cp.kind === 'swat' ? '#38bdf8' : '#0f172a';
      ctx.fillRect(4.5, -3.5, 2.5, 7);

      ctx.restore();
    }

    for (let i = 0; i < copBullets.length; i++) {
      const b = copBullets[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      if (b.type === 'taser') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-7, -2, 14, 4);
      } else if (b.type === 'shell') {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(-6, -1.2, 12, 2.4);
      }
      ctx.restore();
    }
  }

  function drawArrestOverlay(ctx, player, wanted, time) {
    if (wanted.bustedProgress <= 0.02) return;
    const rad = player.inVehicle ? 36 : 24;
    const flash = Math.floor(time / 120) % 2 === 0;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = flash ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wanted.bustedProgress);
    ctx.stroke();
    ctx.restore();
  }

  function getRadarBlips() {
    const blips = [
      { x: POLICE_STATION.x, y: POLICE_STATION.y, color: '#3b82f6', size: 4.5, label: '🛡' },
      { x: HOSPITAL.x,       y: HOSPITAL.y,       color: '#f8fafc', size: 4.5, label: '✚' }
    ];
    for (let i = 0; i < cops.length; i++) {
      blips.push({ x: cops[i].x, y: cops[i].y, color: '#ef4444', size: 3.2, pulse: true });
    }
    return blips;
  }

  function getVisionCones() {
    const E = window.GTA.Entities;
    if (E.wanted.level <= 0 || E.wanted.seen) return [];
    const cones = [];
    for (let i = 0; i < E.vehicles.length; i++) {
      const v = E.vehicles[i];
      if (v.isPolice && v !== E.player.inVehicle) {
        cones.push({ x: v.x, y: v.y, angle: v.angle, range: 520 });
      }
    }
    for (let i = 0; i < cops.length; i++) {
      cones.push({ x: cops[i].x, y: cops[i].y, angle: cops[i].angle, range: 380 });
    }
    return cones;
  }

  return {
    POLICE_STATION: POLICE_STATION,
    HOSPITAL: HOSPITAL,
    cops: cops,
    init: init,
    addWanted: addWanted,
    clearWanted: clearWanted,
    hasLineOfSight: hasLineOfSight,
    damageCop: damageCop,
    isPlayerTased: isPlayerTased,
    update: update,
    drawCops: drawCops,
    drawArrestOverlay: drawArrestOverlay,
    getRadarBlips: getRadarBlips,
    getVisionCones: getVisionCones
  };
})();
