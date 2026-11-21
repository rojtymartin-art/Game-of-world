window.GTA = window.GTA || {};

window.GTA.Entities = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  // 9 rôznych tried vozidiel s vlastnou fyzikou a vzhľadom
  const VEH_TYPES = {
    sports:    { name: 'Viper GT',        w: 44, h: 22, accel: 0.42, max: 13.5, nitro: 19.5, grip: 0.84, hp: 100, price: 3500,  colors: ['#e11d48', '#2563eb', '#f59e0b', '#10b981'] },
    hyper:     { name: 'Neon Apex',       w: 46, h: 23, accel: 0.56, max: 16.5, nitro: 23.5, grip: 0.87, hp: 110, price: 14000, colors: ['#a855f7', '#06b6d4', '#f43f5e', '#facc15'] },
    muscle:    { name: 'V8 Fury',         w: 45, h: 23, accel: 0.44, max: 12.8, nitro: 18.5, grip: 0.90, hp: 130, price: 4500,  colors: ['#ea580c', '#18181b', '#dc2626', '#16a34a'] },
    suv:       { name: 'G-Titan 4x4',     w: 48, h: 26, accel: 0.34, max: 10.8, nitro: 15.0, grip: 0.82, hp: 180, price: 5000,  colors: ['#334155', '#f8fafc', '#1e293b', '#3f6212'] },
    taxi:      { name: 'City Cab',        w: 43, h: 22, accel: 0.36, max: 11.4, nitro: 16.0, grip: 0.83, hp: 115, price: 2500,  colors: ['#facc15'] },
    truck:     { name: 'Cargo Hauler',    w: 62, h: 28, accel: 0.24, max: 8.8,  nitro: 12.0, grip: 0.80, hp: 260, price: 7000,  colors: ['#64748b', '#b91c1c', '#1d4ed8'] },
    police:    { name: 'PD Interceptor',  w: 45, h: 22, accel: 0.48, max: 14.5, nitro: 20.5, grip: 0.85, hp: 150, price: 9500,  colors: ['#0f172a'], isPoliceModel: true },
    ambulance: { name: 'EMS Rescue',      w: 52, h: 26, accel: 0.34, max: 11.2, nitro: 15.0, grip: 0.82, hp: 170, price: 6000,  colors: ['#f8fafc'], isEMS: true },
    jet:       { name: 'F-99 Skyhawk',    w: 58, h: 52, accel: 0.52, max: 22.0, nitro: 28.0, grip: 0.92, hp: 180, price: 28000, colors: ['#94a3b8'], isAircraft: true }
  };

  const player = {
    x: W.spawnX,
    y: W.spawnY,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 10,
    hp: 100,
    maxHp: 100,
    inVehicle: null,
    walkAnim: 0
  };

  let nextId = 1;
  const vehicles = [];
  const peds = [];
  const skids = [];
  const particles = [];

  const wanted = {
    level: 0,
    heat: 0,
    cooldown: 0,
    bustedTimer: 0
  };

  // Kriminálnik pre policajnú misiu (Vigilante)
  let targetCriminalVeh = null;

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
      radius: spec.isAircraft ? 20 : Math.max(15, spec.h * 0.72),
      hp: spec.hp,
      maxHp: spec.hp,
      color: opts.color || pick(spec.colors),
      underglow: opts.underglow || null,
      isAI: !!opts.isAI,
      isPolice: !!opts.isPolice,
      isCriminal: !!opts.isCriminal,
      isPersistent: !!opts.isPersistent,
      sirenOn: !!opts.sirenOn,
      aiSpeed: spec.max * (0.35 + Math.random() * 0.25),
      aiTurnCooldown: 0,
      jumpZ: 0,
      jumpVz: 0,
      altitude: 0
    };
    vehicles.push(v);
    return v;
  }

  function init() {
    vehicles.length = 0;
    peds.length = 0;
    skids.length = 0;
    particles.length = 0;

    // Štartovacie športové auto hráča v Downtown
    const starter = spawnVehicle('sports', W.spawnX, W.spawnY, 0, { color: '#e11d48', isPersistent: true });
    player.inVehicle = starter;
    player.x = starter.x;
    player.y = starter.y;

    // Špeciálne zaparkované vozidlá po celom svete
    spawnVehicle('taxi', W.spawnX + 120, W.spawnY - 45, 0, { isPersistent: true });
    spawnVehicle('police', W.spawnX - 160, W.spawnY + 45, Math.PI, { isPersistent: true });
    spawnVehicle('hyper', 64 * TS + 90, 32 * TS + 90, Math.PI, { color: '#06b6d4', underglow: '#38bdf8', isPersistent: true }); // Na plážovom móle
    spawnVehicle('suv', 12 * TS + 90, 16 * TS + 90, Math.PI / 2, { color: '#f8fafc', isPersistent: true }); // West Hills
    spawnVehicle('truck', 42 * TS + 90, 58 * TS + 120, 0, { isPersistent: true }); // South Docks
    spawnVehicle('jet', 6 * TS + 90, 48 * TS + TS, 0, { isPersistent: true }); // Stíhačka na dráhe letiska!
    spawnVehicle('jet', 7 * TS + 90, 45 * TS + 90, Math.PI / 2, { color: '#e2e8f0', isPersistent: true }); // Druhé lietadlo pri hangároch
  }

  // Pridanie / zrušenie Wanted hviezdičiek
  function addWanted(stars) {
    const prev = wanted.level;
    wanted.level = Math.min(5, Math.max(wanted.level, stars));
    wanted.cooldown = 12 + wanted.level * 3;
    if (wanted.level > prev && window.GTA.Audio) window.GTA.Audio.playAlert();
  }

  function clearWanted() {
    wanted.level = 0;
    wanted.heat = 0;
    wanted.cooldown = 0;
    wanted.bustedTimer = 0;
    // Zruš naháňačku u aktívnych policajtov
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].isPolice && vehicles[i] !== player.inVehicle) {
        vehicles[i].sirenOn = false;
      }
    }
  }

  // Vystúpenie alebo nastúpenie do najbližšieho vozidla
  function toggleVehicle(notify) {
    if (player.inVehicle) {
      const v = player.inVehicle;
      if (v.altitude > 0.18 || v.jumpZ > 8) {
        if (notify) notify('Najskôr pristaň na zemi!', '#f59e0b');
        return false;
      }
      // Vystúpi na ľavú stranu od auta
      const ex = v.x + Math.cos(v.angle - Math.PI / 2) * (v.radius + 16);
      const ey = v.y + Math.sin(v.angle - Math.PI / 2) * (v.radius + 16);
      const safeX = W.checkCollision(ex, ey, player.radius) ? v.x : ex;
      const safeY = W.checkCollision(ex, ey, player.radius) ? v.y : ey;
      player.x = safeX;
      player.y = safeY;
      player.angle = v.angle;
      v.isAI = false;
      player.inVehicle = null;
      return true;
    } else {
      // Nájdi najbližšie vozidlo do 65 px
      let best = null, bestD = 65;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const d = Math.hypot(v.x - player.x, v.y - player.y);
        if (d < bestD) { bestD = d; best = v; }
      }
      if (best) {
        const wasAI = best.isAI;
        const wasPol = best.isPolice;
        best.isAI = false;
        best.isPersistent = true;
        player.inVehicle = best;
        if (wasPol) {
          addWanted(Math.max(wanted.level, 2));
          if (notify) notify('🚨 Ukradol si policajné auto! (+2★)', '#ef4444');
        } else if (wasAI && Math.random() < 0.45) {
          addWanted(Math.max(wanted.level, 1));
          if (notify) notify(`🚗 Nastúpil si do ${best.spec.name}`, '#38bdf8');
        } else if (notify) {
          notify(`🚗 ${best.spec.name}${best.spec.isAircraft ? ' – rozbehni sa na vzlet!' : ''}`, '#38bdf8');
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

  function spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random()) * speed;
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.03 + Math.random() * 0.03, color, size: 3 + Math.random() * 3
      });
    }
    if (particles.length > 160) particles.splice(0, particles.length - 160);
  }

  // Dynamické dopĺňanie premávky, polície a chodcov v okolí hráča
  function maintainAmbientWorld() {
    const px = player.x, py = player.y;

    // 1. Odstránenie ďalekých AI vozidiel (šetrí výkon)
    let aiCount = 0;
    let policeCount = 0;
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      if (v === player.inVehicle || v.isPersistent || v.isCriminal) continue;
      const d = Math.hypot(v.x - px, v.y - py);
      if (d > 2100) {
        vehicles.splice(i, 1);
      } else {
        if (v.isAI) aiCount++;
        if (v.isPolice) policeCount++;
      }
    }

    // 2. Doplnenie bežnej premávky na cestách okolo hráča
    const desiredTraffic = 20;
    if (aiCount < desiredTraffic) {
      trySpawnRoadVehicle(px, py, false);
    }

    // 3. Doplnenie policajných hliadok podľa Wanted hviezdičiek
    const desiredPolice = wanted.level > 0 ? Math.min(7, wanted.level + 2) : 2;
    if (policeCount < desiredPolice) {
      trySpawnRoadVehicle(px, py, true);
    }

    // 4. Chodci na chodníkoch okolo hráča
    for (let i = peds.length - 1; i >= 0; i--) {
      if (Math.hypot(peds[i].x - px, peds[i].y - py) > 1300) peds.splice(i, 1);
    }
    if (peds.length < 24) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 420 + Math.random() * 680;
      const tx = px + Math.cos(ang) * dist;
      const ty = py + Math.sin(ang) * dist;
      const c = Math.floor(tx / TS), r = Math.floor(ty / TS);
      if (r > 1 && r < N - 2 && c > 1 && c < N - 2) {
        const tile = W.tiles[r][c];
        if ((tile === T.SIDEWALK || tile === T.SAND || tile === T.GRASS || tile === T.PIER) && !W.checkCollision(tx, ty, 12)) {
          peds.push({
            x: tx, y: ty,
            angle: Math.random() * Math.PI * 2,
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
      const dist = isPolice && wanted.level > 0 ? (650 + Math.random() * 550) : (600 + Math.random() * 950);
      const sx = px + Math.cos(ang) * dist;
      const sy = py + Math.sin(ang) * dist;
      const c = Math.floor(sx / TS);
      const r = Math.floor(sy / TS);
      if (r < 2 || r >= N - 2 || c < 2 || c >= N - 2) continue;

      const t = W.tiles[r][c];
      if (t !== T.ROAD && t !== T.HIGHWAY && t !== T.BRIDGE) continue;

      const cx = c * TS + TS / 2;
      const cy = r * TS + TS / 2;
      // Nespawnuj priamo na inom aute
      let blocked = false;
      for (let i = 0; i < vehicles.length; i++) {
        if (Math.hypot(vehicles[i].x - cx, vehicles[i].y - cy) < 120) { blocked = true; break; }
      }
      if (blocked) continue;

      // Urči smer podľa napojenia cesty
      const dirs = [];
      if (W.isRoadLike(W.tiles[r][c + 1])) dirs.push(0);
      if (W.isRoadLike(W.tiles[r][c - 1])) dirs.push(Math.PI);
      if (W.isRoadLike(W.tiles[r + 1][c])) dirs.push(Math.PI / 2);
      if (W.isRoadLike(W.tiles[r - 1][c])) dirs.push(-Math.PI / 2);
      const dir = dirs.length ? pick(dirs) : 0;

      const type = isPolice ? 'police' : pick(['sports', 'muscle', 'suv', 'taxi', 'taxi', 'truck', 'ambulance']);
      spawnVehicle(type, cx, cy, dir, {
        isAI: true,
        isPolice: isPolice,
        sirenOn: isPolice && wanted.level > 0
      });
      return;
    }
  }

  function spawnCriminalForMission() {
    if (targetCriminalVeh) {
      const idx = vehicles.indexOf(targetCriminalVeh);
      if (idx >= 0) vehicles.splice(idx, 1);
      targetCriminalVeh = null;
    }
    // Spawn na hlavnej diaľnici v bezpečnej vzdialenosti
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

  // Hlavný update všetkých entít
  function update(dt, input, upgrades, callbacks) {
    maintainAmbientWorld();

    const engBonus = 1 + (upgrades.engine || 0) * 0.14;
    const nitroBonus = 1 + (upgrades.nitro || 0) * 0.14;
    const armorMult = 1 - (upgrades.armor || 0) * 0.2;

    // 1. Ovládanie hráča (buď v aute/stíhačke, alebo pešo)
    if (player.inVehicle) {
      const v = player.inVehicle;
      const sp = v.spec;

      const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
      const rx = -fy, ry = fx;
      let fwd = v.vx * fx + v.vy * fy;
      let lat = v.vx * rx + v.vy * ry;

      const useNitro = input.nitro && (input.up || fwd > 2);
      const curAccel = sp.accel * engBonus * (useNitro ? 1.65 : 1);
      const curMax = (useNitro ? sp.nitro * nitroBonus : sp.max * engBonus);

      if (input.up || useNitro) fwd += curAccel * dt;
      if (input.down) fwd -= (fwd > 0 ? 0.55 : 0.25) * dt;
      fwd = Math.max(sp.isAircraft ? -2.5 : -5.5, Math.min(curMax, fwd));

      const speedMag = Math.abs(fwd);
      if (speedMag > 0.25 || (sp.isAircraft && v.altitude > 0.1)) {
        const baseTurn = sp.isAircraft ? 0.038 : (input.drift ? 0.068 : 0.05);
        const turnRate = baseTurn * Math.min(1, Math.max(0.45, speedMag / 3));
        const dir = fwd >= 0 ? 1 : -1;
        if (input.left) v.angle -= turnRate * dir * dt;
        if (input.right) v.angle += turnRate * dir * dt;
      }

      // Lietanie stíhačkou (vzlet pri rýchlosti > 10.5, klesanie pri spomalení)
      if (sp.isAircraft) {
        if (fwd > 10.5) {
          v.altitude = Math.min(1, v.altitude + 0.018 * dt);
        } else if (fwd < 8.5) {
          v.altitude = Math.max(0, v.altitude - 0.022 * dt);
        }
      }

      const grip = (input.drift && !sp.isAircraft) ? 0.962 : sp.grip;
      lat *= Math.pow(grip, dt);
      fwd *= Math.pow(sp.isAircraft ? 0.994 : (input.drift ? 0.986 : 0.99), dt);

      const nfx = Math.cos(v.angle), nfy = Math.sin(v.angle);
      const nrx = -nfy, nry = nfx;
      v.vx = nfx * fwd + nrx * lat;
      v.vy = nfy * fwd + nry * lat;

      // Skok na rampe (vertikálna fyzika)
      if (v.jumpZ > 0 || v.jumpVz > 0) {
        v.jumpZ += v.jumpVz * dt;
        v.jumpVz -= 0.38 * dt;
        if (v.jumpZ <= 0) {
          v.jumpZ = 0;
          v.jumpVz = 0;
        }
      }

      // Pohyb a kolízia so svetom (lietadlo vo výške ignoruje budovy aj vodu!)
      const airborne = v.altitude > 0.22;
      const nx = v.x + v.vx * dt;
      const ny = v.y + v.vy * dt;

      if (airborne) {
        // Iba okraj celej mapy
        v.x = Math.max(60, Math.min(C.WORLD_SIZE - 60, nx));
        v.y = Math.max(60, Math.min(C.WORLD_SIZE - 60, ny));
      } else {
        let hit = false;
        if (!W.checkCollision(nx, v.y, v.radius)) v.x = nx;
        else { hit = true; v.vx *= -0.35; }
        if (!W.checkCollision(v.x, ny, v.radius)) v.y = ny;
        else { hit = true; v.vy *= -0.35; }

        if (hit && speedMag > 5.5) {
          v.hp = Math.max(0, v.hp - (speedMag * 1.4 * armorMult));
          spawnParticles(v.x, v.y, '#facc15', 6, 3.2);
          if (window.GTA.Audio) window.GTA.Audio.playCrash(speedMag);
        }
      }

      // Stopy pneumatík
      if (!airborne && v.jumpZ < 2 && ((input.drift && speedMag > 3.5) || Math.abs(lat) > 2.6)) {
        const rearX = v.x - nfx * 15, rearY = v.y - nfy * 15;
        skids.push({ x: rearX + nrx * 8, y: rearY + nry * 8 });
        skids.push({ x: rearX - nrx * 8, y: rearY - nry * 8 });
        if (skids.length > 340) skids.splice(0, 2);
      }

      // Synchronizácia hráča s autom
      player.x = v.x;
      player.y = v.y;
      player.angle = v.angle;

      // Audio motora
      if (window.GTA.Audio) {
        window.GTA.Audio.updateEngine(Math.hypot(v.vx, v.vy) / sp.max, true, !!sp.isAircraft, useNitro);
      }

      // Zničené auto -> vyskočenie a oprava/respawn
      if (v.hp <= 0) {
        spawnParticles(v.x, v.y, '#f97316', 24, 6);
        if (window.GTA.Audio) window.GTA.Audio.playCrash(15);
        v.hp = v.maxHp;
        v.vx = 0; v.vy = 0; v.altitude = 0;
        if (callbacks.onWasted) callbacks.onWasted('💥 VOZIDLO ZNIČENÉ! Odťahovka do Downtown (-$200)');
      }
    } else {
      // Pohyb hráča PEŠO
      let mx = 0, my = 0;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (input.up) my -= 1;
      if (input.down) my += 1;

      const len = Math.hypot(mx, my);
      const walkSpeed = (input.nitro || input.drift) ? 4.4 : 2.7;
      if (len > 0) {
        mx /= len; my /= len;
        player.angle = Math.atan2(my, mx);
        player.walkAnim += dt * 0.25;
        const nx = player.x + mx * walkSpeed * dt;
        const ny = player.y + my * walkSpeed * dt;
        if (!W.checkCollision(nx, player.y, player.radius)) player.x = nx;
        if (!W.checkCollision(player.x, ny, player.radius)) player.y = ny;
      }
      if (window.GTA.Audio) window.GTA.Audio.updateEngine(0, false, false, false);
    }

    // 2. Aktualizácia AI vozidiel a polície
    let nearestPoliceDist = 9999;
    let anySiren = (player.inVehicle && player.inVehicle.sirenOn);

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v === player.inVehicle || !v.isAI) continue;

      const distToPlayer = Math.hypot(v.x - player.x, v.y - player.y);

      if (v.isPolice && wanted.level > 0) {
        // Policajná naháňačka!
        v.sirenOn = true;
        if (distToPlayer < 900) anySiren = true;
        if (distToPlayer < nearestPoliceDist) nearestPoliceDist = distToPlayer;

        const targetAngle = Math.atan2(player.y - v.y, player.x - v.x);
        v.angle = steerTowards(v.angle, targetAngle, 0.065 * dt);
        const chaseSpeed = Math.min(12.2, 8.2 + wanted.level * 0.8);
        v.vx = Math.cos(v.angle) * chaseSpeed;
        v.vy = Math.sin(v.angle) * chaseSpeed;

        const nx = v.x + v.vx * dt;
        const ny = v.y + v.vy * dt;
        if (!W.checkCollision(nx, v.y, v.radius)) v.x = nx;
        else v.angle += 0.35;
        if (!W.checkCollision(v.x, ny, v.radius)) v.y = ny;
        else v.angle += 0.35;
      } else {
        // Bežná AI premávka po cestách (alebo utekajúci zločinec)
        if (v.aiTurnCooldown > 0) v.aiTurnCooldown -= dt;

        // Zvoľ si ďalší smer na križovatke
        const c = Math.floor(v.x / TS);
        const r = Math.floor(v.y / TS);
        const cx = c * TS + TS / 2;
        const cy = r * TS + TS / 2;

        if (v.aiTurnCooldown <= 0 && Math.hypot(v.x - cx, v.y - cy) < 16) {
          const dirs = [];
          if (c < N - 2 && W.isRoadLike(W.tiles[r][c + 1])) dirs.push(0);
          if (c > 1 && W.isRoadLike(W.tiles[r][c - 1])) dirs.push(Math.PI);
          if (r < N - 2 && W.isRoadLike(W.tiles[r + 1][c])) dirs.push(Math.PI / 2);
          if (r > 1 && W.isRoadLike(W.tiles[r - 1][c])) dirs.push(-Math.PI / 2);

          // Vyhni sa otočeniu o 180°, ak existuje iná cesta
          const nonReverse = dirs.filter(d => Math.abs(angleDiff(d, v.angle)) < 2.2);
          const choices = nonReverse.length ? nonReverse : dirs;
          if (choices.length) {
            v.angle = pick(choices);
            v.aiTurnCooldown = 36;
          }
        }

        // Spomalenie, ak je pred AI iné auto
        let speed = v.aiSpeed;
        if (distToPlayer < 85 && !v.isCriminal) speed *= 0.25;

        v.vx = Math.cos(v.angle) * speed;
        v.vy = Math.sin(v.angle) * speed;
        const nx = v.x + v.vx * dt;
        const ny = v.y + v.vy * dt;

        if (!W.checkCollision(nx, ny, v.radius)) {
          v.x = nx; v.y = ny;
        } else {
          v.angle += Math.PI / 2;
          v.aiTurnCooldown = 15;
        }
      }

      // Kolízia medzi hráčovým autom a AI autom
      if (player.inVehicle && player.inVehicle.altitude < 0.2 && player.inVehicle.jumpZ < 12) {
        const pv = player.inVehicle;
        const dx = pv.x - v.x, dy = pv.y - v.y;
        const minDist = pv.radius + v.radius;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.1 && dist < minDist) {
          const overlap = (minDist - dist) * 0.55;
          const nx = dx / dist, ny = dy / dist;
          pv.x += nx * overlap; pv.y += ny * overlap;
          v.x -= nx * overlap; v.y -= ny * overlap;

          const relSpeed = Math.hypot(pv.vx - v.vx, pv.vy - v.vy);
          if (relSpeed > 3.5) {
            spawnParticles((pv.x + v.x) / 2, (pv.y + v.y) / 2, '#fbbf24', 5, 3);
            if (window.GTA.Audio) window.GTA.Audio.playCrash(relSpeed);
            pv.vx *= 0.65; pv.vy *= 0.65;
            v.hp -= relSpeed * 3.5;

            if (v.isPolice && !v.isCriminal) {
              addWanted(Math.max(wanted.level, 2));
            } else if (v.isCriminal) {
              // Zásah cieľa v policajnej misii!
              if (callbacks.onCriminalHit) callbacks.onCriminalHit(v, relSpeed);
            } else if (relSpeed > 9 && Math.random() < 0.35) {
              addWanted(Math.max(wanted.level, 1));
            }
          }
        }
      }
    }

    if (window.GTA.Audio) window.GTA.Audio.updateSiren(anySiren, dt);

    // 3. Logika zatknutia (BUSTED) a úniku pred políciou
    if (wanted.level > 0) {
      const playerSpeed = player.inVehicle ? Math.hypot(player.inVehicle.vx, player.inVehicle.vy) : 0;
      const inAir = player.inVehicle && player.inVehicle.altitude > 0.25;

      if (!inAir && nearestPoliceDist < 68 && playerSpeed < 2.2) {
        wanted.bustedTimer += dt / 60;
        if (wanted.bustedTimer >= 2.2) {
          clearWanted();
          if (callbacks.onBusted) callbacks.onBusted();
        }
      } else {
        wanted.bustedTimer = Math.max(0, wanted.bustedTimer - dt / 40);
      }

      // Únik mimo dosahu polície znižuje Wanted level
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
    }

    // 4. Pohyb chodcov (utekajú pred rýchlymi autami)
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (player.inVehicle && d < 95 && Math.hypot(player.inVehicle.vx, player.inVehicle.vy) > 3.5) {
        p.angle = Math.atan2(p.y - player.y, p.x - player.x);
        p.panic = 90;
      }
      const sp = p.panic > 0 ? p.speed * 2.4 : p.speed;
      if (p.panic > 0) p.panic -= dt;

      const nx = p.x + Math.cos(p.angle) * sp * dt;
      const ny = p.y + Math.sin(p.angle) * sp * dt;
      if (!W.checkCollision(nx, ny, 8)) {
        p.x = nx; p.y = ny;
      } else {
        p.angle += Math.PI * 0.7;
      }
      if (Math.random() < 0.008) p.angle += (Math.random() - 0.5) * 1.4;
    }

    // 5. Častice (iskry, dym)
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
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

  // Vykreslenie pozemných entít (stopy, chodci, autá, hráč pešo, iskry)
  function drawGroundEntities(ctx, cam, vw, vh, zoom, time, input) {
    const halfW = (vw / 2) / zoom + 120;
    const halfH = (vh / 2) / zoom + 120;

    // Stopy pneumatík
    ctx.fillStyle = 'rgba(10, 10, 14, 0.42)';
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

    // Vozidlá na zemi (vrátane áut vo výskoku na rampe)
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.altitude > 0.22) continue; // Letiace stíhačky sa kreslia AŽ NAD 2.5D budovami!
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
      // Ramená (animácia chôdze)
      const swing = Math.sin(player.walkAnim) * 2.5;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.ellipse(swing * 0.4, 0, 6.5, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Iskry a častice
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  // Vykreslenie letiacich lietadiel AŽ NAD 2.5D budovami!
  function drawFlyingEntities(ctx, cam, vw, vh, zoom, time, input) {
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.altitude > 0.22) {
        drawSingleVehicle(ctx, v, time, v === player.inVehicle ? input : null);
      }
    }
    ctx.restore();
  }

  function drawSingleVehicle(ctx, v, time, pInput) {
    const sp = v.spec;
    const hw = sp.w / 2, hh = sp.h / 2;
    const liftScale = 1 + v.altitude * 0.48 + (v.jumpZ * 0.012);
    const shadowOff = 4 + v.altitude * 55 + v.jumpZ * 1.1;

    ctx.save();
    ctx.translate(v.x, v.y);

    // Tieň posunutý podľa výšky letu/skoku
    ctx.save();
    ctx.translate(shadowOff, shadowOff);
    ctx.rotate(v.angle);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.15, 0.44 - v.altitude * 0.24)})`;
    if (sp.isAircraft) {
      ctx.beginPath();
      ctx.moveTo(hw, 0); ctx.lineTo(-hw * 0.3, -hh); ctx.lineTo(-hw, -hh * 0.3);
      ctx.lineTo(-hw, hh * 0.3); ctx.lineTo(-hw * 0.3, hh); ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-hw, -hh, sp.w, sp.h);
    }
    ctx.restore();

    ctx.rotate(v.angle);
    ctx.scale(liftScale, liftScale);

    // Neónové podsvietenie (ak kúpené v garáži)
    if (v.underglow && !sp.isAircraft) {
      ctx.shadowColor = v.underglow;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = v.underglow;
      ctx.lineWidth = 3;
      ctx.strokeRect(-hw - 1, -hh - 1, sp.w + 2, sp.h + 2);
      ctx.shadowBlur = 0;
    }

    // Predné svetlá
    if (!sp.isAircraft) {
      const grad = ctx.createLinearGradient(hw - 2, 0, hw + 115, 0);
      grad.addColorStop(0, 'rgba(254, 249, 195, 0.30)');
      grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(hw - 2, -hh + 3); ctx.lineTo(hw + 115, -36);
      ctx.lineTo(hw + 115, 36); ctx.lineTo(hw - 2, hh - 3);
      ctx.closePath(); ctx.fill();
    }

    // Nitro alebo tryskový plameň
    const showFlame = (pInput && pInput.nitro && (pInput.up || Math.hypot(v.vx, v.vy) > 3)) || (sp.isAircraft && Math.hypot(v.vx, v.vy) > 9);
    if (showFlame) {
      const fl = 14 + Math.random() * 14;
      ctx.fillStyle = sp.isAircraft ? '#f97316' : '#a855f7';
      ctx.beginPath(); ctx.moveTo(-hw, -5); ctx.lineTo(-hw - fl, 0); ctx.lineTo(-hw, 5); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.moveTo(-hw, -3); ctx.lineTo(-hw - fl * 0.6, 0); ctx.lineTo(-hw, 3); ctx.fill();
    }

    if (sp.isAircraft) {
      // Stíhačka F-99 Skyhawk
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(hw + 4, 0);
      ctx.lineTo(2, -hh);
      ctx.lineTo(-hw + 8, -hh + 6);
      ctx.lineTo(-hw + 12, -7);
      ctx.lineTo(-hw, -13);
      ctx.lineTo(-hw, 13);
      ctx.lineTo(-hw + 12, 7);
      ctx.lineTo(-hw + 8, hh - 6);
      ctx.lineTo(2, hh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Kokpit stíhačky
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(8, 0, 10, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Karoséria auta
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, sp.w, sp.h, 5);
      ctx.fill();

      // Policajné pruhy / Taxi značka / Sanitka kríž
      if (sp.isPoliceModel) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-8, -hh + 1, 16, sp.h - 2);
      } else if (v.type === 'taxi') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4, -5, 8, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2, -3, 4, 6);
      } else if (sp.isEMS) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-10, -2, 12, 4);
        ctx.fillRect(-6, -6, 4, 12);
      } else if (v.type === 'sports' || v.type === 'hyper') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(-hw + 3, -3, sp.w - 6, 2);
        ctx.fillRect(-hw + 3, 1, sp.w - 6, 2);
      }

      // Okná
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hw * 0.14, -hh + 3, sp.w * 0.2, sp.h - 6);
      ctx.fillRect(-hw * 0.68, -hh + 3, sp.w * 0.14, sp.h - 6);

      // Policajný maják (červeno-modré blikanie)
      if (sp.isPoliceModel) {
        const flash = Math.floor(time / 130) % 2 === 0;
        ctx.fillStyle = v.sirenOn ? (flash ? '#ef4444' : '#3b82f6') : '#475569';
        ctx.fillRect(-2, -7, 4, 7);
        ctx.fillStyle = v.sirenOn ? (flash ? '#3b82f6' : '#ef4444') : '#475569';
        ctx.fillRect(-2, 0, 4, 7);
        if (v.sirenOn) {
          ctx.fillStyle = flash ? 'rgba(239,68,68,0.28)' : 'rgba(59,130,246,0.28)';
          ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Brzdové svetlá
      ctx.fillStyle = (pInput && (pInput.down || pInput.drift)) ? '#ff2a2a' : '#7f1d1d';
      ctx.fillRect(-hw - 1, -hh + 2, 2, 5);
      ctx.fillRect(-hw - 1, hh - 7, 2, 5);
    }

    // Červená šípka nad hľadaným zločincom (Vigilante misia)
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
      if (v.isPolice && wanted.level > 0) {
        blips.push({ x: v.x, y: v.y, color: '#ef4444', size: 3.5, pulse: true });
      } else if (v.isCriminal) {
        blips.push({ x: v.x, y: v.y, color: '#f97316', size: 5, pulse: true });
      } else if (v.spec.isAircraft) {
        blips.push({ x: v.x, y: v.y, color: '#c084fc', size: 4, label: '✈' });
      }
    }
    return blips;
  }

  return {
    VEH_TYPES, player, vehicles, wanted,
    init, update, toggleVehicle, spawnVehicle,
    addWanted, clearWanted, repairCurrentVehicle,
    spawnCriminalForMission, clearCriminal, spawnParticles,
    drawGroundEntities, drawFlyingEntities, getRadarBlips
  };
})();
