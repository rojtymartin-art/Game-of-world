window.GTA = window.GTA || {};

window.GTA.Traffic = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  // Vzdialenosť stredu pravého jazdného pruhu od stredu vozovky (px)
  const LANE_OFF = 38;

  // 4 smery: 0=Východ, 1=Juh, 2=Západ, 3=Sever
  const DIRS = [
    { dc: 1,  dr: 0,  ang: 0 },
    { dc: 0,  dr: 1,  ang: Math.PI / 2 },
    { dc: -1, dr: 0,  ang: Math.PI },
    { dc: 0,  dr: -1, ang: -Math.PI / 2 }
  ];

  // Cyklus semaforov na hlavných križovatkách (16s celý cyklus)
  let lightClock = 0;

  function getLightPhase() {
    const t = lightClock % 16;
    if (t < 6.5) return { ew: 'green',  ns: 'red' };
    if (t < 8.0) return { ew: 'yellow', ns: 'red' };
    if (t < 14.5) return { ew: 'red',   ns: 'green' };
    return { ew: 'red', ns: 'yellow' };
  }

  function isRoadTile(r, c) {
    if (r < 2 || r >= N - 2 || c < 2 || c >= N - 2) return false;
    const t = W.tiles[r][c];
    return t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE;
  }

  // Semafory sú na veľkých 4-ramenných križovatkách s diaľnicou
  function hasTrafficLight(r, c) {
    if (r < 2 || r >= N - 2 || c < 2 || c >= N - 2) return false;
    if (W.tiles[r][c] !== T.HIGHWAY) return false;
    const horiz = isRoadTile(r, c - 1) && isRoadTile(r, c + 1);
    const vert  = isRoadTile(r - 1, c) && isRoadTile(r + 1, c);
    return horiz && vert;
  }

  // Presné súradnice pravého jazdného pruhu na danom políčku a smere
  function getLanePoint(r, c, dirIdx) {
    const d = DIRS[dirIdx];
    const cx = c * TS + TS / 2;
    const cy = r * TS + TS / 2;
    // Pravá strana od smeru jazdy (fx=dc, fy=dr -> right=(-dr, dc))
    return {
      x: cx + (-d.dr) * LANE_OFF,
      y: cy + (d.dc)  * LANE_OFF
    };
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

  function initVehicleLane(v) {
    const c = Math.max(2, Math.min(N - 3, Math.floor(v.x / TS)));
    const r = Math.max(2, Math.min(N - 3, Math.floor(v.y / TS)));
    let bestDir = 0;
    let bestDiff = 99;
    for (let i = 0; i < 4; i++) {
      const diff = Math.abs(angleDiff(v.angle, DIRS[i].ang));
      if (diff < bestDiff) { bestDiff = diff; bestDir = i; }
    }
    v.aiR = r;
    v.aiC = c;
    v.aiDir = bestDir;
    v.panicTimer = v.panicTimer || 0;
    v.braking = false;
  }

  function chooseNextTile(v) {
    const r = v.aiR;
    const c = v.aiC;
    const curDir = v.aiDir;
    const revDir = (curDir + 2) % 4;

    const valid = [];
    let canStraight = false;

    for (let i = 0; i < 4; i++) {
      if (i === revDir) continue;
      const nr = r + DIRS[i].dr;
      const nc = c + DIRS[i].dc;
      if (isRoadTile(nr, nc)) {
        valid.push(i);
        if (i === curDir) canStraight = true;
      }
    }

    let chosen;
    if (valid.length === 0) {
      // Slepá ulica -> otočenie naspäť
      chosen = revDir;
    } else if (canStraight && Math.random() < 0.68) {
      // Väčšinou pokračuje rovno pre plynulú premávku
      chosen = curDir;
    } else {
      chosen = valid[Math.floor(Math.random() * valid.length)];
    }

    v.aiDir = chosen;
    v.aiR = r + DIRS[chosen].dr;
    v.aiC = c + DIRS[chosen].dc;
  }

  // Spawn auta presne do pravého pruhu
  function trySpawn(px, py, vehicles, spawnVehicleFn) {
    const types = ['sports', 'muscle', 'suv', 'taxi', 'taxi', 'truck', 'ambulance'];
    for (let tries = 0; tries < 7; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 650 + Math.random() * 900;
      const sx = px + Math.cos(ang) * dist;
      const sy = py + Math.sin(ang) * dist;
      const c = Math.floor(sx / TS);
      const r = Math.floor(sy / TS);
      if (!isRoadTile(r, c)) continue;

      const exits = [];
      for (let i = 0; i < 4; i++) {
        if (isRoadTile(r + DIRS[i].dr, c + DIRS[i].dc)) exits.push(i);
      }
      if (!exits.length) continue;

      const dirIdx = exits[Math.floor(Math.random() * exits.length)];
      const lp = getLanePoint(r, c, dirIdx);

      let blocked = false;
      for (let i = 0; i < vehicles.length; i++) {
        if (Math.hypot(vehicles[i].x - lp.x, vehicles[i].y - lp.y) < 155) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const type = types[Math.floor(Math.random() * types.length)];
      const v = spawnVehicleFn(type, lp.x, lp.y, DIRS[dirIdx].ang, { isAI: true });
      v.aiR = r + DIRS[dirIdx].dr;
      v.aiC = c + DIRS[dirIdx].dc;
      v.aiDir = dirIdx;
      v.panicTimer = 0;
      v.braking = false;
      return v;
    }
    return null;
  }

  // Vyvolá paniku u blízkych šoférov (streľba, výbuch)
  function triggerPanic(x, y, radius, vehicles) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.isAI || v.isPolice) continue;
      if (Math.hypot(v.x - x, v.y - y) < radius) {
        v.panicTimer = 6.5;
      }
    }
  }

  // Hlavný update chytrej dopravy
  function update(dt, vehicles, peds, player, wantedLevel, resolveWorldCollisions) {
    const sec = dt / 60;
    lightClock += sec;
    const phase = getLightPhase();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.isAI || v === player.inVehicle) continue;
      // Keď naháňa polícia, riadi ju police.js
      if (v.isPolice && wantedLevel > 0) continue;

      if (v.aiDir === undefined) initVehicleLane(v);
      if (v.panicTimer > 0) v.panicTimer = Math.max(0, v.panicTimer - sec);

      const panicked = v.panicTimer > 0 || v.isCriminal;
      const wp = getLanePoint(v.aiR, v.aiC, v.aiDir);
      const distWp = Math.hypot(wp.x - v.x, wp.y - v.y);

      if (distWp < 46) {
        chooseNextTile(v);
      }

      const target = getLanePoint(v.aiR, v.aiC, v.aiDir);
      const targetAng = Math.atan2(target.y - v.y, target.x - v.x);
      const angDelta = angleDiff(targetAng, v.angle);

      // Plynulé zatáčanie + natáčanie predných kolies
      const turnRate = panicked ? 0.095 : 0.072;
      v.angle = steerTowards(v.angle, targetAng, turnRate * dt);
      v.steerVis = Math.max(-0.45, Math.min(0.45, angDelta * 1.1));

      // Základná cieľová rýchlosť (v zákrute pribrzdí)
      const isHighway = W.tiles[v.aiR] && W.tiles[v.aiR][v.aiC] === T.HIGHWAY;
      let cruise = v.isCriminal
        ? 9.4
        : (isHighway ? Math.min(v.spec.max * 0.56, 7.2) : Math.min(v.spec.max * 0.42, 5.2));
      if (panicked && !v.isCriminal) cruise *= 1.55;

      const curveFactor = Math.max(0.45, 1 - Math.abs(angDelta) * 0.55);
      let desiredSpd = cruise * curveFactor;
      let shouldBrake = false;

      // 1. Kontrola semaforu na najbližšej hlavnej križovatke
      if (!panicked && hasTrafficLight(v.aiR, v.aiC)) {
        const isEW = (v.aiDir === 0 || v.aiDir === 2);
        const myLight = isEW ? phase.ew : phase.ns;
        const curR = Math.floor(v.y / TS);
        const curC = Math.floor(v.x / TS);
        // Zastav iba ak ešte NIE SI priamo vnútri križovatky
        if (myLight !== 'green' && (curR !== v.aiR || curC !== v.aiC)) {
          const dCenter = Math.hypot((v.aiC * TS + TS / 2) - v.x, (v.aiR * TS + TS / 2) - v.y);
          if (dCenter > TS * 0.52 && dCenter < TS * 1.18) {
            desiredSpd = 0;
            shouldBrake = true;
          }
        }
      }

      // 2. Predný senzor (brzdenie pred inými autami vo svojom pruhu)
      const fx = Math.cos(v.angle);
      const fy = Math.sin(v.angle);
      const rx = -fy;
      const ry = fx;

      for (let j = 0; j < vehicles.length; j++) {
        if (i === j) continue;
        const o = vehicles[j];
        if (o.altitude > 0.2) continue;

        const dx = o.x - v.x;
        const dy = o.y - v.y;
        const fwdD = dx * fx + dy * fy;
        if (fwdD <= 4 || fwdD > 135) continue;

        const sideD = Math.abs(dx * rx + dy * ry);
        const safeWidth = (v.radius + o.radius) * 0.85;

        if (sideD < safeWidth) {
          const gap = fwdD - (v.radius + o.radius);
          if (gap < 30) {
            desiredSpd = 0;
            shouldBrake = true;
            break;
          } else if (gap < 85) {
            const oFwd = o.vx * fx + o.vy * fy;
            const limit = Math.max(0, oFwd * 0.85);
            if (limit < desiredSpd) {
              desiredSpd = limit;
              shouldBrake = true;
            }
          }
        }
      }

      // 3. Reakcia na hráča pešo pred nárazníkom
      if (!panicked && !player.inVehicle) {
        const dx = player.x - v.x;
        const dy = player.y - v.y;
        const fwdD = dx * fx + dy * fy;
        const sideD = Math.abs(dx * rx + dy * ry);
        if (fwdD > 8 && fwdD < 82 && sideD < 24) {
          desiredSpd = 0;
          shouldBrake = true;
        }
      }

      // 4. Uhýbanie a pribrzdenie, keď ide za tebou hráč so zapnutou sirénou
      if (!panicked && player.inVehicle && player.inVehicle.sirenOn) {
        const dP = Math.hypot(player.x - v.x, player.y - v.y);
        if (dP < 200) {
          desiredSpd *= 0.35;
          shouldBrake = true;
        }
      }

      // Plynulé zrýchľovanie / brzdenie
      const curSpd = Math.hypot(v.vx, v.vy);
      const accelRate = desiredSpd < curSpd ? 0.22 : 0.085;
      const nextSpd = curSpd + (desiredSpd - curSpd) * accelRate * dt;

      v.braking = shouldBrake || (desiredSpd < curSpd - 0.6);
      v.vx = fx * nextSpd;
      v.vy = fy * nextSpd;
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      if (resolveWorldCollisions(v, v.radius)) {
        v.aiDir = (v.aiDir + 1) % 4;
        v.aiR = Math.max(2, Math.min(N - 3, Math.floor(v.y / TS) + DIRS[v.aiDir].dr));
        v.aiC = Math.max(2, Math.min(N - 3, Math.floor(v.x / TS) + DIRS[v.aiDir].dc));
      }
    }
  }

  return {
    LANE_OFF: LANE_OFF,
    getLightPhase: getLightPhase,
    hasTrafficLight: hasTrafficLight,
    trySpawn: trySpawn,
    triggerPanic: triggerPanic,
    update: update
  };
})();
