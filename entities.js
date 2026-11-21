window.GTA = window.GTA || {};

window.GTA.Entities = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const VEH_TYPES = {
    sports:    { name: 'Viper GT',        w: 46, h: 22, accel: 0.44, max: 13.8, nitro: 20.0, grip: 0.84, hp: 115, price: 3500,  colors: ['#e11d48', '#2563eb', '#f59e0b', '#10b981'] },
    hyper:     { name: 'Neon Apex',       w: 48, h: 23, accel: 0.58, max: 16.8, nitro: 24.0, grip: 0.87, hp: 125, price: 14000, colors: ['#a855f7', '#06b6d4', '#f43f5e', '#facc15'] },
    muscle:    { name: 'V8 Fury',         w: 46, h: 23, accel: 0.46, max: 13.0, nitro: 19.0, grip: 0.90, hp: 145, price: 4500,  colors: ['#ea580c', '#18181b', '#dc2626', '#16a34a'] },
    suv:       { name: 'G-Titan 4x4',     w: 50, h: 26, accel: 0.35, max: 11.0, nitro: 15.5, grip: 0.82, hp: 200, price: 5000,  colors: ['#334155', '#f8fafc', '#1e293b', '#3f6212'] },
    taxi:      { name: 'City Cab',        w: 44, h: 22, accel: 0.37, max: 11.6, nitro: 16.2, grip: 0.83, hp: 120, price: 2500,  colors: ['#facc15'] },
    truck:     { name: 'Cargo Hauler',    w: 64, h: 28, accel: 0.25, max: 9.0,  nitro: 12.5, grip: 0.80, hp: 280, price: 7000,  colors: ['#64748b', '#b91c1c', '#1d4ed8'] },
    police:    { name: 'PD Interceptor',  w: 46, h: 22, accel: 0.48, max: 14.5, nitro: 20.5, grip: 0.85, hp: 140, price: 9500,  colors: ['#0f172a'], isPoliceModel: true },
    ambulance: { name: 'EMS Rescue',      w: 54, h: 26, accel: 0.35, max: 11.4, nitro: 15.2, grip: 0.82, hp: 180, price: 6000,  colors: ['#f8fafc'], isEMS: true },
    jet:       { name: 'F-99 Skyhawk',    w: 60, h: 54, accel: 0.54, max: 22.5, nitro: 28.5, grip: 0.92, hp: 200, price: 28000, colors: ['#94a3b8'], isAircraft: true }
  };

  const player = {
    x: W.spawnX, y: W.spawnY,
    vx: 0, vy: 0,
    angle: 0,
    radius: 10,
    hp: 100, maxHp: 100,
    inVehicle: null,
    walkAnim: 0,
    weapon: 'smg',     // 'smg' | 'rpg'
    rockets: 6,
    rocketRegen: 0,
    fireCooldown: 0
  };

  let nextId = 1;
  const vehicles = [];
  const peds = [];
  const skids = [];
  const scorchMarks = [];
  const particles = [];
  const projectiles = [];
  const explosions = [];

  const wanted = {
    level: 0,
    cooldown: 0,
    bustedTimer: 0,
    bustedProgress: 0
  };

  let targetCriminalVeh = null;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // =========================================================================
  // NEPRIESTRELNÝ ANTI-STUCK KOLÍZNY SYSTÉM (nikdy ťa nezasekne do budovy!)
  // =========================================================================
  function pushCircleOutOfRect(ent, r, rx, ry, rw, rh) {
    const cx = Math.max(rx, Math.min(ent.x, rx + rw));
    const cy = Math.max(ry, Math.min(ent.y, ry + rh));
    const dx = ent.x - cx;
    const dy = ent.y - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq >= r * r) return null;

    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const pen = (r - dist) + 0.35;
      const nx = dx / dist;
      const ny = dy / dist;
      ent.x += nx * pen;
      ent.y += ny * pen;
      return { nx, ny };
    } else {
      // Stred sa dostal dovnútra objektu -> okamžité vytlačenie von najbližšou stranou!
      const dL = ent.x - rx;
      const dR = (rx + rw) - ent.x;
      const dT = ent.y - ry;
      const dB = (ry + rh) - ent.y;
      const m = Math.min(dL, dR, dT, dB);
      if (m === dL) { ent.x = rx - r - 1; return { nx: -1, ny: 0 }; }
      if (m === dR) { ent.x = rx + rw + r + 1; return { nx: 1, ny: 0 }; }
      if (m === dT) { ent.y = ry - r - 1; return { nx: 0, ny: -1 }; }
      ent.y = ry + rh + r + 1; return { nx: 0, ny: 1 };
    }
  }

  function resolveWorldCollisions(ent, r) {
    let hit = false;
    let sumNx = 0, sumNy = 0;

    if (ent.x < r + 8) { ent.x = r + 8; sumNx += 1; hit = true; }
    if (ent.y < r + 8) { ent.y = r + 8; sumNy += 1; hit = true; }
    if (ent.x > C.WORLD_SIZE - r - 8) { ent.x = C.WORLD_SIZE - r - 8; sumNx -= 1; hit = true; }
    if (ent.y > C.WORLD_SIZE - r - 8) { ent.y = C.WORLD_SIZE - r - 8; sumNy -= 1; hit = true; }

    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const tc = Math.floor(ent.x / TS);
      const tr = Math.floor(ent.y / TS);

      for (let rr = tr - 1; rr <= tr + 1; rr++) {
        if (rr < 0 || rr >= N) continue;
        for (let cc = tc - 1; cc <= tc + 1; cc++) {
          if (cc < 0 || cc >= N) continue;

          if (W.tiles[rr][cc] === T.WATER) {
            const res = pushCircleOutOfRect(ent, r, cc * TS, rr * TS, TS, TS);
            if (res) { hit = true; moved = true; sumNx += res.nx; sumNy += res.ny; }
          }

          const objs = W.solidGrid[rr][cc];
          for (let i = 0; i < objs.length; i++) {
            const b = objs[i];
            const res = pushCircleOutOfRect(ent, r, b.x, b.y, b.w, b.h);
            if (res) { hit = true; moved = true; sumNx += res.nx; sumNy += res.ny; }
          }
        }
      }
      if (!moved) break;
    }

    if (!hit) return null;
    const len = Math.hypot(sumNx, sumNy) || 1;
    return { nx: sumNx / len, ny: sumNy / len };
  }

  function spawnVehicle(typeKey, x, y, angle, opts) {
    opts = opts || {};
    const spec = VEH_TYPES[typeKey] || VEH_TYPES.sports;
    const v = {
      id: nextId++,
      type: typeKey,
      spec,
      x, y,
      vx: 0, vy: 0,
      angle: angle || 0,
      steerVis: 0,
      radius: spec.isAircraft ? 20 : Math.max(14, spec.h * 0.68),
      hp: spec.hp,
      maxHp: spec.hp,
      color: opts.color || pick(spec.colors),
      underglow: opts.underglow || null,
      isAI: !!opts.isAI,
      isPolice: !!opts.isPolice,
      isCriminal: !!opts.isCriminal,
      isPersistent: !!opts.isPersistent,
      sirenOn: !!opts.sirenOn,
      aiSpeed: spec.max * (0.36 + Math.random() * 0.24),
      aiTurnCooldown: 0,
      aiStuckTimer: 0,
      jumpZ: 0,
      jumpVz: 0,
      altitude: 0
    };
    resolveWorldCollisions(v, v.radius);
    vehicles.push(v);
    return v;
  }

  function init() {
    vehicles.length = 0;
    peds.length = 0;
    skids.length = 0;
    scorchMarks.length = 0;
    particles.length = 0;
    projectiles.length = 0;
    explosions.length = 0;

    const starter = spawnVehicle('sports', W.spawnX, W.spawnY, 0, { color: '#e11d48', underglow: '#38bdf8', isPersistent: true });
    player.inVehicle = starter;
    player.x = starter.x;
    player.y = starter.y;

    // Špeciálne zaparkované vozidlá
    spawnVehicle('taxi', W.spawnX + 120, W.spawnY - 45, 0, { isPersistent: true });
    spawnVehicle('police', W.spawnX - 160, W.spawnY + 45, Math.PI, { isPersistent: true });
    spawnVehicle('hyper', 64 * TS + 90, 32 * TS + 90, Math.PI, { color: '#06b6d4', underglow: '#38bdf8', isPersistent: true });
    spawnVehicle('suv', 12 * TS + 90, 16 * TS + 90, Math.PI / 2, { color: '#f8fafc', isPersistent: true });
    spawnVehicle('truck', 42 * TS + 90, 58 * TS + 120, 0, { isPersistent: true });
    spawnVehicle('jet', 6 * TS + 90, 48 * TS + TS, 0, { isPersistent: true });
    spawnVehicle('jet', 7 * TS + 90, 45 * TS + 90, Math.PI / 2, { color: '#e2e8f0', isPersistent: true });
  }

  function addWanted(stars) {
    const prev = wanted.level;
    wanted.level = Math.min(5, Math.max(wanted.level, stars));
    wanted.cooldown = 12 + wanted.level * 3;
    if (wanted.level > prev && window.GTA.Audio) window.GTA.Audio.playAlert();
  }

  function clearWanted() {
    wanted.level = 0;
    wanted.cooldown = 0;
    wanted.bustedTimer = 0;
    wanted.bustedProgress = 0;
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].isPolice && vehicles[i] !== player.inVehicle) vehicles[i].sirenOn = false;
    }
  }

  function switchWeapon(notify) {
    player.weapon = player.weapon === 'smg' ? 'rpg' : 'smg';
    if (notify) {
      notify(
        player.weapon === 'rpg'
          ? `🚀 Raketomet RPG (${player.rockets} rakiet)`
          : '🔫 SMG Samopal (neobmedzená munícia)',
        '#facc15'
      );
    }
  }

  function toggleVehicle(notify) {
    if (player.inVehicle) {
      const v = player.inVehicle;
      if (v.altitude > 0.18 || v.jumpZ > 8) {
        if (notify) notify('Najskôr pristaň na zemi!', '#f59e0b');
        return false;
      }
      player.x = v.x + Math.cos(v.angle - Math.PI / 2) * (v.radius + 16);
      player.y = v.y + Math.sin(v.angle - Math.PI / 2) * (v.radius + 16);
      resolveWorldCollisions(player, player.radius);
      player.angle = v.angle;
      v.isAI = false;
      player.inVehicle = null;
      return true;
    } else {
      let best = null, bestD = 68;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const d = Math.hypot(v.x - player.x, v.y - player.y);
        if (d < bestD) { bestD = d; best = v; }
      }
      if (best) {
        const wasAI = best.isAI, wasPol = best.isPolice;
        best.isAI = false;
        best.isPersistent = true;
        player.inVehicle = best;
        if (wasPol) {
          addWanted(Math.max(wanted.level, 2));
          if (notify) notify('🚨 Ukradol si policajné auto! (+2★)', '#ef4444');
        } else if (wasAI && Math.random() < 0.4) {
          addWanted(Math.max(wanted.level, 1));
          if (notify) notify(`🚗 Nastúpil si do ${best.spec.name}`, '#38bdf8');
        } else if (notify) {
          notify(`🚗 ${best.spec.name}${best.spec.isAircraft ? ' – pridaj plyn na vzlet!' : ''}`, '#38bdf8');
        }
        return true;
      }
      if (notify) notify('Žiadne vozidlo nablízku', '#94a3b8');
      return false;
    }
  }

  function repairCurrentVehicle() {
    const v = player.inVehicle;
    if (!v) return false;
    v.hp = v.maxHp;
    player.hp = player.maxHp;
    return true;
  }

  function spawnParticles(x, y, color, count, speed, sizeMin) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random()) * speed;
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.025 + Math.random() * 0.03,
        color, size: (sizeMin || 3) + Math.random() * 4
      });
    }
    if (particles.length > 220) particles.splice(0, particles.length - 220);
  }

  // Explózia s tlakovou vlnou, kráterom a trasením obrazovky
  function triggerExplosion(x, y, radius, callbacks) {
    explosions.push({ x, y, r: 10, maxR: radius, life: 1 });
    scorchMarks.push({ x, y, r: radius * 0.36 });
    if (scorchMarks.length > 35) scorchMarks.shift();

    spawnParticles(x, y, '#f97316', 22, 6.5, 5);
    spawnParticles(x, y, '#facc15', 14, 5.0, 4);
    spawnParticles(x, y, '#334155', 16, 3.2, 7);

    if (window.GTA.Audio) window.GTA.Audio.playExplosion();
    if (callbacks && callbacks.onShake) callbacks.onShake(16);

    // Tlaková vlna na okolité autá
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      const dx = v.x - x, dy = v.y - y;
      const d = Math.hypot(dx, dy);
      if (d < radius) {
        const push = (1 - d / radius) * 14;
        const ang = Math.atan2(dy, dx);
        v.vx += Math.cos(ang) * push;
        v.vy += Math.sin(ang) * push;

        if (v !== player.inVehicle) {
          v.hp -= (1 - d / radius) * 180;
        }
      }
    }
  }

  // Streľba z auta (Drive-by) alebo pešo s jemným auto-aimom na prenasledovateľov!
  function fireWeapon(callbacks) {
    if (player.fireCooldown > 0) return;

    const isRPG = player.weapon === 'rpg';
    if (isRPG && player.rockets <= 0) {
      player.weapon = 'smg';
      if (callbacks && callbacks.onNotify) callbacks.onNotify('Došli rakety – prepínam na SMG!', '#facc15');
      return;
    }

    // Nájdeme najbližšieho policajta alebo zločinca do 460 px pre plynulý auto-aim
    let aimAngle = player.angle;
    let bestTarget = null, bestDist = 460;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v === player.inVehicle) continue;
      if (v.isCriminal || (v.isPolice && wanted.level > 0)) {
        const d = Math.hypot(v.x - player.x, v.y - player.y);
        if (d < bestDist) { bestDist = d; bestTarget = v; }
      }
    }
    if (bestTarget) {
      aimAngle = Math.atan2(bestTarget.y - player.y, bestTarget.x - player.x);
    }

    const ox = player.x + Math.cos(aimAngle) * 24;
    const oy = player.y + Math.sin(aimAngle) * 24;

    if (isRPG) {
      player.rockets--;
      player.fireCooldown = 34;
      projectiles.push({
        type: 'rocket', x: ox, y: oy,
        vx: Math.cos(aimAngle) * 17.5, vy: Math.sin(aimAngle) * 17.5,
        angle: aimAngle, life: 70
      });
      spawnParticles(ox, oy, '#f97316', 8, 3, 4);
      if (window.GTA.Audio) window.GTA.Audio.playRocket();
      if (callbacks && callbacks.onShake) callbacks.onShake(7);
    } else {
      player.fireCooldown = 7;
      const spread = (Math.random() - 0.5) * 0.08;
      const a = aimAngle + spread;
      projectiles.push({
        type: 'bullet', x: ox, y: oy,
        vx: Math.cos(a) * 24, vy: Math.sin(a) * 24,
        angle: a, life: 32
      });
      spawnParticles(ox, oy, '#fef08a', 3, 2.5, 2.5);
      if (window.GTA.Audio) window.GTA.Audio.playShot();
      if (callbacks && callbacks.onShake) callbacks.onShake(1.8);
    }
  }

  function maintainAmbientWorld() {
    const px = player.x, py = player.y;
    let aiCount = 0, policeCount = 0;

    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      if (v === player.inVehicle || v.isPersistent || v.isCriminal) continue;
      if (Math.hypot(v.x - px, v.y - py) > 2100) {
        vehicles.splice(i, 1);
      } else {
        if (v.isAI) aiCount++;
        if (v.isPolice) policeCount++;
      }
    }

    if (aiCount < 20) trySpawnRoadVehicle(px, py, false);
    const desiredPolice = wanted.level > 0 ? Math.min(6, wanted.level + 1) : 2;
    if (policeCount < desiredPolice) trySpawnRoadVehicle(px, py, true);

    for (let i = peds.length - 1; i >= 0; i--) {
      if (Math.hypot(peds[i].x - px, peds[i].y - py) > 1300) peds.splice(i, 1);
    }
    if (peds.length < 24) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 420 + Math.random() * 680;
      const tx = px + Math.cos(ang) * dist, ty = py + Math.sin(ang) * dist;
      const c = Math.floor(tx / TS), r = Math.floor(ty / TS);
      if (r > 1 && r < N - 2 && c > 1 && c < N - 2) {
        const tile = W.tiles[r][c];
        if ((tile === T.SIDEWALK || tile === T.SAND || tile === T.GRASS || tile === T.PIER) && !W.checkCollision(tx, ty, 12)) {
          peds.push({
            x: tx, y: ty, angle: Math.random() * Math.PI * 2,
            speed: 0.9 + Math.random() * 0.6,
            shirt: pick(['#ef4444', '#38bdf8', '#facc15', '#22c55e', '#a855f7', '#f97316', '#e2e8f0']),
            panic: 0
          });
        }
      }
    }
  }

  function trySpawnRoadVehicle(px, py, isPolice) {
    for (let tries = 0; tries < 6; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = isPolice && wanted.level > 0 ? (720 + Math.random() * 520) : (600 + Math.random() * 950);
      const sx = px + Math.cos(ang) * dist, sy = py + Math.sin(ang) * dist;
      const c = Math.floor(sx / TS), r = Math.floor(sy / TS);
      if (r < 2 || r >= N - 2 || c < 2 || c >= N - 2) continue;
      const t = W.tiles[r][c];
      if (t !== T.ROAD && t !== T.HIGHWAY && t !== T.BRIDGE) continue;

      const cx = c * TS + TS / 2, cy = r * TS + TS / 2;
      let blocked = false;
      for (let i = 0; i < vehicles.length; i++) {
        if (Math.hypot(vehicles[i].x - cx, vehicles[i].y - cy) < 130) { blocked = true; break; }
      }
      if (blocked) continue;

      const dirs = [];
      if (W.isRoadLike(W.tiles[r][c + 1])) dirs.push(0);
      if (W.isRoadLike(W.tiles[r][c - 1])) dirs.push(Math.PI);
      if (W.isRoadLike(W.tiles[r + 1][c])) dirs.push(Math.PI / 2);
      if (W.isRoadLike(W.tiles[r - 1][c])) dirs.push(-Math.PI / 2);

      const type = isPolice ? 'police' : pick(['sports', 'muscle', 'suv', 'taxi', 'taxi', 'truck', 'ambulance']);
      spawnVehicle(type, cx, cy, dirs.length ? pick(dirs) : 0, {
        isAI: true, isPolice, sirenOn: isPolice && wanted.level > 0
      });
      return;
    }
  }

  function spawnCriminalForMission() {
    clearCriminal();
    const spots = [
      { x: 42 * TS + 90, y: 12 * TS + 90 },
      { x: 56 * TS + 90, y: 32 * TS + 90 },
      { x: 42 * TS + 90, y: 58 * TS + 90 },
      { x: 12 * TS + 90, y: 32 * TS + 90 }
    ];
    let best = spots[0], bestD = 0;
    for (let i = 0; i < spots.length; i++) {
      const d = Math.hypot(spots[i].x - player.x, spots[i].y - player.y);
      if (d > bestD && d < 6500) { bestD = d; best = spots[i]; }
    }
    targetCriminalVeh = spawnVehicle('muscle', best.x, best.y, 0, {
      color: '#18181b', underglow: '#ef4444', isAI: true, isCriminal: true, isPersistent: true
    });
    targetCriminalVeh.aiSpeed = 9.2;
    return targetCriminalVeh;
  }

  function clearCriminal() {
    if (targetCriminalVeh) {
      const idx = vehicles.indexOf(targetCriminalVeh);
      if (idx >= 0) vehicles.splice(idx, 1);
      targetCriminalVeh = null;
    }
  }

  // Hlavný update entít
  function update(dt, input, upgrades, callbacks) {
    maintainAmbientWorld();

    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (player.rockets < 8) {
      player.rocketRegen += dt / 60;
      if (player.rocketRegen >= 18) { player.rocketRegen = 0; player.rockets++; }
    }
    if (input.fire) fireWeapon(callbacks);

    const engBonus = 1 + (upgrades.engine || 0) * 0.14;
    const nitroBonus = 1 + (upgrades.nitro || 0) * 0.14;
    const armorMult = 1 - (upgrades.armor || 0) * 0.2;

    // 1. Ovládanie hráča (auto / stíhačka / pešo)
    if (player.inVehicle) {
      const v = player.inVehicle;
      const sp = v.spec;

      const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
      const rx = -fy, ry = fx;
      let fwd = v.vx * fx + v.vy * fy;
      let lat = v.vx * rx + v.vy * ry;

      const useNitro = input.nitro && (input.up || fwd > 2);
      const curAccel = sp.accel * engBonus * (useNitro ? 1.68 : 1);
      const curMax = useNitro ? sp.nitro * nitroBonus : sp.max * engBonus;

      if (input.up || useNitro) fwd += curAccel * dt;
      if (input.down) fwd -= (fwd > 0 ? 0.56 : 0.28) * dt;
      fwd = Math.max(sp.isAircraft ? -2.5 : -6.2, Math.min(curMax, fwd));

      v.steerVis = (input.left ? -0.45 : (input.right ? 0.45 : 0));
      const speedMag = Math.abs(fwd);
      if (speedMag > 0.2 || (sp.isAircraft && v.altitude > 0.1)) {
        const baseTurn = sp.isAircraft ? 0.038 : (input.drift ? 0.072 : 0.054);
        const turnRate = baseTurn * Math.min(1, Math.max(0.45, speedMag / 2.6));
        const dir = fwd >= 0 ? 1 : -1;
        if (input.left) v.angle -= turnRate * dir * dt;
        if (input.right) v.angle += turnRate * dir * dt;
      }

      if (sp.isAircraft) {
        if (fwd > 10.5) v.altitude = Math.min(1, v.altitude + 0.018 * dt);
        else if (fwd < 8.5) v.altitude = Math.max(0, v.altitude - 0.022 * dt);
      }

      const grip = (input.drift && !sp.isAircraft) ? 0.962 : sp.grip;
      lat *= Math.pow(grip, dt);
      fwd *= Math.pow(sp.isAircraft ? 0.994 : (input.drift ? 0.986 : 0.99), dt);

      const nfx = Math.cos(v.angle), nfy = Math.sin(v.angle);
      const nrx = -nfy, nry = nfx;
      v.vx = nfx * fwd + nrx * lat;
      v.vy = nfy * fwd + nry * lat;

      if (v.jumpZ > 0 || v.jumpVz > 0) {
        v.jumpZ += v.jumpVz * dt;
        v.jumpVz -= 0.38 * dt;
        if (v.jumpZ <= 0) { v.jumpZ = 0; v.jumpVz = 0; }
      }

      // Pohyb + hladké kĺzanie popri stenách bez zaseknutia!
      const airborne = v.altitude > 0.22;
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      if (airborne) {
        v.x = Math.max(60, Math.min(C.WORLD_SIZE - 60, v.x));
        v.y = Math.max(60, Math.min(C.WORLD_SIZE - 60, v.y));
      } else {
        const wallHit = resolveWorldCollisions(v, v.radius);
        if (wallHit) {
          // Zruš len zložku rýchlosti idúcu DO steny -> auto hladko kĺže popri budove!
          const vn = v.vx * wallHit.nx + v.vy * wallHit.ny;
          if (vn < 0) {
            const impact = -vn;
            v.vx -= 1.28 * vn * wallHit.nx;
            v.vy -= 1.28 * vn * wallHit.ny;
            if (impact > 5.5) {
              v.hp = Math.max(0, v.hp - impact * 1.15 * armorMult);
              spawnParticles(v.x - wallHit.nx * v.radius, v.y - wallHit.ny * v.radius, '#facc15', 7, 3.8, 3);
              if (window.GTA.Audio) window.GTA.Audio.playCrash(impact);
              if (callbacks && callbacks.onShake) callbacks.onShake(Math.min(9, impact * 0.7));
            }
          }
        }
      }

      // Stopy pneumatík + biely dym pri drifte!
      if (!airborne && v.jumpZ < 2 && ((input.drift && speedMag > 3.5) || Math.abs(lat) > 2.6)) {
        const rearX = v.x - nfx * 16, rearY = v.y - nfy * 16;
        skids.push({ x: rearX + nrx * 8, y: rearY + nry * 8 });
        skids.push({ x: rearX - nrx * 8, y: rearY - nry * 8 });
        if (skids.length > 360) skids.splice(0, 2);
        if (Math.random() < 0.55) {
          spawnParticles(rearX, rearY, 'rgba(226,232,240,0.65)', 1, 1.4, 6);
        }
      }

      // Dym z poškodeného motora
      if (v.hp < v.maxHp * 0.45 && Math.random() < 0.35) {
        spawnParticles(v.x + nfx * 14, v.y + nfy * 14, v.hp < v.maxHp * 0.2 ? '#f97316' : '#475569', 1, 1.5, 5);
      }

      player.x = v.x;
      player.y = v.y;
      player.angle = v.angle;

      if (window.GTA.Audio) {
        window.GTA.Audio.updateEngine(Math.hypot(v.vx, v.vy) / sp.max, true, !!sp.isAircraft, useNitro);
      }

      if (v.hp <= 0) {
        triggerExplosion(v.x, v.y, 130, callbacks);
        v.hp = v.maxHp; v.vx = 0; v.vy = 0; v.altitude = 0;
        if (callbacks.onWasted) callbacks.onWasted('💥 VOZIDLO ZNIČENÉ! Odťahovka do Downtown (-$200)');
      }
    } else {
      let mx = 0, my = 0;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (input.up) my -= 1;
      if (input.down) my += 1;
      const len = Math.hypot(mx, my);
      const walkSpeed = (input.nitro || input.drift) ? 4.6 : 2.8;
      if (len > 0) {
        mx /= len; my /= len;
        player.angle = Math.atan2(my, mx);
        player.walkAnim += dt * 0.28;
        player.x += mx * walkSpeed * dt;
        player.y += my * walkSpeed * dt;
        resolveWorldCollisions(player, player.radius);
      }
      if (window.GTA.Audio) window.GTA.Audio.updateEngine(0, false, false, false);
    }

    // 2. Aktualizácia AI vozidiel a polície (s vlastnou ochranou proti zaseknutiu)
    let nearestPoliceDist = 9999;
    let anySiren = (player.inVehicle && player.inVehicle.sirenOn);

    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      if (v === player.inVehicle) continue;

      // Zničené AI / policajné auto -> VÝBUCH + ODMENA!
      if (v.hp <= 0) {
        const wasPol = v.isPolice;
        const wasCrim = v.isCriminal;
        triggerExplosion(v.x, v.y, 150, callbacks);
        vehicles.splice(i, 1);
        if (wasPol) {
          addWanted(Math.min(5, Math.max(wanted.level + 1, 2)));
          player.rockets = Math.min(10, player.rockets + 2);
          if (callbacks && callbacks.onPoliceDestroyed) callbacks.onPoliceDestroyed();
        } else if (wasCrim && callbacks && callbacks.onCriminalHit) {
          callbacks.onCriminalHit(v, 999);
        }
        continue;
      }

      if (!v.isAI) continue;
      const distToPlayer = Math.hypot(v.x - player.x, v.y - player.y);

      if (v.isPolice && wanted.level > 0) {
        v.sirenOn = true;
        if (distToPlayer < 900) anySiren = true;
        if (distToPlayer < nearestPoliceDist) nearestPoliceDist = distToPlayer;

        // Chytré prenasledovanie: mieria mierne na bok/pred hráča, nie tupo do jedného bodu
        const targetAngle = Math.atan2(player.y - v.y, player.x - v.x);
        v.angle = steerTowards(v.angle, targetAngle, 0.068 * dt);
        const chaseSpeed = Math.min(11.8, 7.8 + wanted.level * 0.78);
        v.vx += (Math.cos(v.angle) * chaseSpeed - v.vx) * 0.12 * dt;
        v.vy += (Math.sin(v.angle) * chaseSpeed - v.vy) * 0.12 * dt;

        v.x += v.vx * dt;
        v.y += v.vy * dt;
        const wHit = resolveWorldCollisions(v, v.radius);
        if (wHit) {
          // Policajt sa odrazí od steny a otočí popri nej
          const vn = v.vx * wHit.nx + v.vy * wHit.ny;
          if (vn < 0) { v.vx -= 1.4 * vn * wHit.nx; v.vy -= 1.4 * vn * wHit.ny; }
          v.angle += 0.25;
        }
      } else {
        if (v.aiTurnCooldown > 0) v.aiTurnCooldown -= dt;
        const c = Math.floor(v.x / TS), r = Math.floor(v.y / TS);
        const cx = c * TS + TS / 2, cy = r * TS + TS / 2;

        if (v.aiTurnCooldown <= 0 && Math.hypot(v.x - cx, v.y - cy) < 18) {
          const dirs = [];
          if (c < N - 2 && W.isRoadLike(W.tiles[r][c + 1])) dirs.push(0);
          if (c > 1 && W.isRoadLike(W.tiles[r][c - 1])) dirs.push(Math.PI);
          if (r < N - 2 && W.isRoadLike(W.tiles[r + 1][c])) dirs.push(Math.PI / 2);
          if (r > 1 && W.isRoadLike(W.tiles[r - 1][c])) dirs.push(-Math.PI / 2);
          const nonRev = dirs.filter(d => Math.abs(angleDiff(d, v.angle)) < 2.2);
          const choices = nonRev.length ? nonRev : dirs;
          if (choices.length) { v.angle = pick(choices); v.aiTurnCooldown = 36; }
        }

        let speed = v.aiSpeed;
        if (distToPlayer < 90 && !v.isCriminal) speed *= 0.25;
        v.vx = Math.cos(v.angle) * speed;
        v.vy = Math.sin(v.angle) * speed;
        v.x += v.vx * dt;
        v.y += v.vy * dt;
        if (resolveWorldCollisions(v, v.radius)) {
          v.angle += Math.PI / 2;
          v.aiTurnCooldown = 14;
        }
      }

      if (v.hp < v.maxHp * 0.45 && Math.random() < 0.3) {
        spawnParticles(v.x, v.y, v.hp < v.maxHp * 0.2 ? '#f97316' : '#475569', 1, 1.4, 5);
      }
    }

    // 3. BEZPEČNÉ KOLÍZIE MEDZI AUTAMI (nikdy nenatlačia hráča do steny!)
    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      if (a.altitude > 0.2 || a.jumpZ > 12) continue;
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        if (b.altitude > 0.2 || b.jumpZ > 12) continue;

        const dx = a.x - b.x, dy = a.y - b.y;
        const minDist = a.radius + b.radius + 2;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0.01 || dist >= minDist) continue;

        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;

        const aIsPlayer = (a === player.inVehicle);
        const bIsPlayer = (b === player.inVehicle);

        // Ak je jedno auto hráč, AI auto ustúpi viac (75%), aby ťa policajti neprimáčkli!
        const aShare = aIsPlayer ? 0.25 : (bIsPlayer ? 0.75 : 0.5);
        const bShare = 1 - aShare;

        a.x += nx * overlap * aShare;
        a.y += ny * overlap * aShare;
        b.x -= nx * overlap * bShare;
        b.y -= ny * overlap * bShare;

        // OKAMŽITÉ vytlačenie oboch áut von z prípadných budov (100% ochrana proti zaseknutiu!)
        const aWall = resolveWorldCollisions(a, a.radius);
        const bWall = resolveWorldCollisions(b, b.radius);

        // Ak hráč skončil pri stene, odraz druhé auto extra dozadu, nech má hráč priestor!
        if (aIsPlayer && aWall) { b.x -= nx * 10; b.y -= ny * 10; b.vx -= nx * 4; b.vy -= ny * 4; }
        if (bIsPlayer && bWall) { a.x += nx * 10; a.y += ny * 10; a.vx += nx * 4; a.vy += ny * 4; }

        // Výmena impulzu a poškodenia pri silnom náraze
        const relSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        if (relSpeed > 3.2) {
          spawnParticles((a.x + b.x) / 2, (a.y + b.y) / 2, '#fbbf24', 6, 3.6, 3);
          if (aIsPlayer || bIsPlayer) {
            if (window.GTA.Audio) window.GTA.Audio.playCrash(relSpeed);
            if (callbacks && callbacks.onShake) callbacks.onShake(Math.min(8, relSpeed * 0.5));

            const pv = aIsPlayer ? a : b;
            const other = aIsPlayer ? b : a;
            const sign = aIsPlayer ? 1 : -1;

            // Nitro úder roztočí a zničí policajta!
            const nitroHit = input.nitro && Math.hypot(pv.vx, pv.vy) > 9;
            other.vx -= sign * nx * (nitroHit ? 11 : 5.5);
            other.vy -= sign * ny * (nitroHit ? 11 : 5.5);
            other.hp -= relSpeed * (nitroHit ? 8.5 : 4.2);

            pv.vx += sign * nx * 2.2;
            pv.vy += sign * ny * 2.2;

            if (other.isPolice && !other.isCriminal) addWanted(Math.max(wanted.level, 2));
            else if (other.isCriminal && callbacks.onCriminalHit) callbacks.onCriminalHit(other, relSpeed);
            else if (relSpeed > 9 && Math.random() < 0.3) addWanted(Math.max(wanted.level, 1));
          }
        }
      }
    }

    // 4. Projektily (SMG strely + RPG rakety)
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      if (pr.type === 'rocket') {
        spawnParticles(pr.x, pr.y, 'rgba(226,232,240,0.75)', 1, 0.8, 5);
      }

      let hit = false;
      if (W.checkCollision(pr.x, pr.y, 4)) {
        hit = true;
      } else {
        for (let j = 0; j < vehicles.length; j++) {
          const v = vehicles[j];
          if (v === player.inVehicle) continue;
          if (Math.hypot(pr.x - v.x, pr.y - v.y) < v.radius + 6) {
            hit = true;
            if (pr.type === 'bullet') {
              v.hp -= 24;
              spawnParticles(pr.x, pr.y, '#facc15', 5, 3.5, 2.5);
              if (v.isPolice) addWanted(Math.max(wanted.level, 2));
              if (v.isCriminal && callbacks.onCriminalHit) callbacks.onCriminalHit(v, 5);
            }
            break;
          }
        }
      }

      if (hit || pr.life <= 0) {
        if (pr.type === 'rocket') {
          triggerExplosion(pr.x, pr.y, 165, callbacks);
          if (wanted.level < 2) addWanted(2);
        } else if (hit) {
          spawnParticles(pr.x, pr.y, '#fbbf24', 4, 2.5, 2);
        }
        projectiles.splice(i, 1);
      }
    }

    // 5. Explózie (animácia tlakovej vlny)
    for (let i = explosions.length - 1; i >= 0; i--) {
      const ex = explosions[i];
      ex.r += (ex.maxR - ex.r) * 0.22 * dt;
      ex.life -= 0.045 * dt;
      if (ex.life <= 0) explosions.splice(i, 1);
    }

    if (window.GTA.Audio) window.GTA.Audio.updateSiren(anySiren, dt);

    // 6. Zatknutie (férový čas 3 sekundy + len keď takmer stojíš) a únik
    if (wanted.level > 0) {
      const pSpeed = player.inVehicle ? Math.hypot(player.inVehicle.vx, player.inVehicle.vy) : 0;
      const inAir = player.inVehicle && player.inVehicle.altitude > 0.25;

      if (!inAir && nearestPoliceDist < 62 && pSpeed < 1.3) {
        wanted.bustedTimer += dt / 60;
        wanted.bustedProgress = Math.min(1, wanted.bustedTimer / 3.0);
        if (wanted.bustedTimer >= 3.0) {
          clearWanted();
          if (callbacks.onBusted) callbacks.onBusted();
        }
      } else {
        wanted.bustedTimer = Math.max(0, wanted.bustedTimer - dt / 30);
        wanted.bustedProgress = Math.min(1, wanted.bustedTimer / 3.0);
      }

      if (nearestPoliceDist > 750 || inAir) {
        wanted.cooldown -= dt / 60;
        if (wanted.cooldown <= 0) {
          wanted.level--;
          wanted.cooldown = wanted.level > 0 ? 10 : 0;
          if (wanted.level === 0 && callbacks.onEscaped) callbacks.onEscaped();
        }
      } else {
        wanted.cooldown = Math.max(wanted.cooldown, 8 + wanted.level * 2);
      }
    } else {
      wanted.bustedProgress = 0;
    }

    // 7. Chodci
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (player.inVehicle && d < 95 && Math.hypot(player.inVehicle.vx, player.inVehicle.vy) > 3.5) {
        p.angle = Math.atan2(p.y - player.y, p.x - player.x);
        p.panic = 90;
      }
      const sp = p.panic > 0 ? p.speed * 2.4 : p.speed;
      if (p.panic > 0) p.panic -= dt;
      p.x += Math.cos(p.angle) * sp * dt;
      p.y += Math.sin(p.angle) * sp * dt;
      if (resolveWorldCollisions(p, 8)) p.angle += Math.PI * 0.7;
      if (Math.random() < 0.008) p.angle += (Math.random() - 0.5) * 1.4;
    }

    // 8. Častice
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.96; pt.vy *= 0.96;
      pt.life -= pt.decay * dt;
      if (pt.life <= 0) particles.splice(i, 1);
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

  // Vykreslenie pozemných entít, kráterov, striel a explózií
  function drawGroundEntities(ctx, cam, vw, vh, zoom, time, input) {
    const halfW = (vw / 2) / zoom + 140;
    const halfH = (vh / 2) / zoom + 140;

    // Krátery po výbuchoch
    for (let i = 0; i < scorchMarks.length; i++) {
      const sc = scorchMarks[i];
      ctx.fillStyle = 'rgba(10, 10, 12, 0.65)';
      ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, Math.PI * 2); ctx.fill();
    }

    // Stopy pneumatík
    ctx.fillStyle = 'rgba(10, 10, 14, 0.45)';
    for (let i = 0; i < skids.length; i++) {
      ctx.fillRect(skids[i].x - 2.5, skids[i].y - 2.5, 5, 5);
    }

    // Chodci
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (Math.abs(p.x - cam.x) > halfW || Math.abs(p.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(2, 3, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.shirt;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(1.5, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Autá na zemi
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.altitude > 0.22) continue;
      if (Math.abs(v.x - cam.x) > halfW || Math.abs(v.y - cam.y) > halfH) continue;
      drawSingleVehicle(ctx, v, time, v === player.inVehicle ? input : null);
    }

    // Hráč pešo
    if (!player.inVehicle) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.arc(2, 3, 8, 0, Math.PI * 2); ctx.fill();
      const swing = Math.sin(player.walkAnim) * 2.5;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.ellipse(swing * 0.4, 0, 6.5, 10, 0, 0, Math.PI * 2); ctx.fill();
      // Zbraň v ruke
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 3, player.weapon === 'rpg' ? 14 : 9, 3.5);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Projektily (svietiace guľky a rakety)
    for (let i = 0; i < projectiles.length; i++) {
      const pr = projectiles[i];
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(pr.angle);
      if (pr.type === 'rocket') {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-10, -2.5, 10, 5);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, -2.5, 9, 5);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(9, -2.5); ctx.lineTo(14, 0); ctx.lineTo(9, 2.5); ctx.fill();
      } else {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-7, -1.3, 14, 2.6);
      }
      ctx.restore();
    }

    // Častice
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Explózie (ohnivá guľa + tlaková vlna)
    for (let i = 0; i < explosions.length; i++) {
      const ex = explosions[i];
      const g = ctx.createRadialGradient(ex.x, ex.y, ex.r * 0.1, ex.x, ex.y, ex.r);
      g.addColorStop(0, `rgba(255, 255, 220, ${ex.life})`);
      g.addColorStop(0.4, `rgba(249, 115, 22, ${ex.life * 0.85})`);
      g.addColorStop(0.8, `rgba(220, 38, 38, ${ex.life * 0.45})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawFlyingEntities(ctx, cam, vw, vh, zoom, time, input) {
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.altitude > 0.22) drawSingleVehicle(ctx, v, time, v === player.inVehicle ? input : null);
    }
    ctx.restore();
  }

  // Prepracovaný dizajn vozidiel (kolesá, spojlery, odlesky skiel, podsvietenie)
  function drawSingleVehicle(ctx, v, time, pInput) {
    const sp = v.spec;
    const hw = sp.w / 2, hh = sp.h / 2;
    const liftScale = 1 + v.altitude * 0.48 + (v.jumpZ * 0.012);
    const shadowOff = 5 + v.altitude * 55 + v.jumpZ * 1.1;

    ctx.save();
    ctx.translate(v.x, v.y);

    // Tieň
    ctx.save();
    ctx.translate(shadowOff, shadowOff);
    ctx.rotate(v.angle);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.15, 0.46 - v.altitude * 0.25)})`;
    if (sp.isAircraft) {
      ctx.beginPath();
      ctx.moveTo(hw, 0); ctx.lineTo(-hw * 0.3, -hh); ctx.lineTo(-hw, -hh * 0.3);
      ctx.lineTo(-hw, hh * 0.3); ctx.lineTo(-hw * 0.3, hh); ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath(); ctx.roundRect(-hw, -hh, sp.w, sp.h, 6); ctx.fill();
    }
    ctx.restore();

    ctx.rotate(v.angle);
    ctx.scale(liftScale, liftScale);

    // Neón pod autom
    if (v.underglow && !sp.isAircraft) {
      ctx.shadowColor = v.underglow;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = v.underglow;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-hw - 1, -hh - 1, sp.w + 2, sp.h + 2, 6); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Predné svetlomety
    if (!sp.isAircraft) {
      const grad = ctx.createLinearGradient(hw - 2, 0, hw + 125, 0);
      grad.addColorStop(0, 'rgba(254, 249, 195, 0.35)');
      grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(hw - 2, -hh + 3); ctx.lineTo(hw + 125, -40);
      ctx.lineTo(hw + 125, 40); ctx.lineTo(hw - 2, hh - 3);
      ctx.closePath(); ctx.fill();
    }

    // Plamene z výfuku (Nitro / Stíhačka)
    const showFlame = (pInput && pInput.nitro && (pInput.up || Math.hypot(v.vx, v.vy) > 3)) || (sp.isAircraft && Math.hypot(v.vx, v.vy) > 9);
    if (showFlame) {
      const fl = 16 + Math.random() * 15;
      ctx.fillStyle = sp.isAircraft ? '#f97316' : '#a855f7';
      ctx.beginPath(); ctx.moveTo(-hw, -6); ctx.lineTo(-hw - fl, -3); ctx.lineTo(-hw, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(-hw - fl, 3); ctx.lineTo(-hw, 6); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.moveTo(-hw, -4); ctx.lineTo(-hw - fl * 0.6, 0); ctx.lineTo(-hw, 4); ctx.fill();
    }

    if (sp.isAircraft) {
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(hw + 5, 0); ctx.lineTo(2, -hh); ctx.lineTo(-hw + 8, -hh + 6);
      ctx.lineTo(-hw + 12, -7); ctx.lineTo(-hw, -13); ctx.lineTo(-hw, 13);
      ctx.lineTo(-hw + 12, 7); ctx.lineTo(-hw + 8, hh - 6); ctx.lineTo(2, hh);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.ellipse(9, 0, 11, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // Kolesá (predné sa viditeľne natáčajú!)
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-hw + 5, -hh - 2, 10, 3);
      ctx.fillRect(-hw + 5, hh - 1, 10, 3);
      ctx.save(); ctx.translate(hw - 10, -hh - 0.5); ctx.rotate(v.steerVis || 0); ctx.fillRect(-5, -1.5, 10, 3); ctx.restore();
      ctx.save(); ctx.translate(hw - 10, hh + 0.5); ctx.rotate(v.steerVis || 0); ctx.fillRect(-5, -1.5, 10, 3); ctx.restore();

      // Karoséria s jemným okrajom
      ctx.fillStyle = v.color;
      ctx.beginPath(); ctx.roundRect(-hw, -hh, sp.w, sp.h, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();

      // Bočné odlesky karosérie
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-hw + 4, -hh + 2, sp.w - 8, 3);

      // Špeciálne pruhy a spojler
      if (sp.isPoliceModel) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-9, -hh + 1, 18, sp.h - 2);
      } else if (v.type === 'taxi') {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(-4, -5, 8, 10);
        ctx.fillStyle = '#facc15'; ctx.fillRect(-2, -3, 4, 6);
      } else if (sp.isEMS) {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-10, -2, 12, 4); ctx.fillRect(-6, -6, 4, 12);
      } else if (v.type === 'sports' || v.type === 'hyper') {
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.fillRect(-hw + 4, -3, sp.w - 8, 2);
        ctx.fillRect(-hw + 4, 1, sp.w - 8, 2);
        // Zadný karbónový spojler
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-hw + 1, -hh + 1, 4, sp.h - 2);
      }

      // Sklo s odleskom
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hw * 0.14, -hh + 3, sp.w * 0.22, sp.h - 6);
      ctx.fillRect(-hw * 0.68, -hh + 3, sp.w * 0.15, sp.h - 6);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
      ctx.fillRect(hw * 0.24, -hh + 4, 3, sp.h - 8);

      // Policajný maják
      if (sp.isPoliceModel) {
        const flash = Math.floor(time / 120) % 2 === 0;
        ctx.fillStyle = v.sirenOn ? (flash ? '#ef4444' : '#3b82f6') : '#475569';
        ctx.fillRect(-2, -7, 4, 7);
        ctx.fillStyle = v.sirenOn ? (flash ? '#3b82f6' : '#ef4444') : '#475569';
        ctx.fillRect(-2, 0, 4, 7);
      }

      // Predné a zadné svetlá
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(hw - 2, -hh + 2, 2.5, 4.5);
      ctx.fillRect(hw - 2, hh - 6.5, 2.5, 4.5);
      ctx.fillStyle = (pInput && (pInput.down || pInput.drift)) ? '#ff2a2a' : '#7f1d1d';
      ctx.fillRect(-hw - 1, -hh + 2, 2.5, 5);
      ctx.fillRect(-hw - 1, hh - 7, 2.5, 5);
    }

    if (v.isCriminal) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  function getRadarBlips() {
    const blips = [];
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v === player.inVehicle) continue;
      if (v.isPolice && wanted.level > 0) blips.push({ x: v.x, y: v.y, color: '#ef4444', size: 3.8, pulse: true });
      else if (v.isCriminal) blips.push({ x: v.x, y: v.y, color: '#f97316', size: 5, pulse: true });
      else if (v.spec.isAircraft) blips.push({ x: v.x, y: v.y, color: '#c084fc', size: 4, label: '✈' });
    }
    return blips;
  }

  return {
    VEH_TYPES, player, vehicles, wanted,
    init, update, toggleVehicle, switchWeapon, spawnVehicle,
    addWanted, clearWanted, repairCurrentVehicle,
    spawnCriminalForMission, clearCriminal, spawnParticles,
    drawGroundEntities, drawFlyingEntities, getRadarBlips
  };
})();
