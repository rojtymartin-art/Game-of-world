window.GTA = window.GTA || {};

window.GTA.Entities = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const WEAPONS = {
    smg:     { id: 'smg',     name: 'SMG Samopal',     icon: '🔫', cd: 7,  dmg: 22, speed: 24, pellets: 1, spread: 0.08, life: 32, price: 0 },
    shotgun: { id: 'shotgun', name: 'Brokovnica',      icon: '💥', cd: 28, dmg: 18, speed: 22, pellets: 5, spread: 0.25, life: 20, price: 2200 },
    rifle:   { id: 'rifle',   name: 'Útočná puška AK', icon: '🎯', cd: 6,  dmg: 32, speed: 27, pellets: 1, spread: 0.04, life: 38, price: 4200 },
    rpg:     { id: 'rpg',     name: 'Raketomet RPG',   icon: '🚀', cd: 34, dmg: 160, speed: 18, pellets: 1, spread: 0,    life: 70, price: 600 }
  };

  const VEH_TYPES = {
    scooter:   { name: 'Faggio Skúter',    cat: '🛵', w: 28, h: 12, accel: 0.24, max: 7.4,  nitro: 9.8,  grip: 0.87, hp: 65,  price: 650,   colors: ['#facc15', '#38bdf8', '#f43f5e', '#f8fafc'], isBike: true },
    dirtbike:  { name: 'Sanchez Cross',    cat: '🏍️', w: 32, h: 13, accel: 0.34, max: 9.8,  nitro: 13.5, grip: 0.86, hp: 85,  price: 1800,  colors: ['#22c55e', '#f97316', '#ef4444', '#eab308'], isBike: true },
    taxi:      { name: 'City Cab',         cat: '🚕', w: 44, h: 22, accel: 0.25, max: 9.2,  nitro: 12.8, grip: 0.85, hp: 120, price: 2200,  colors: ['#facc15'] },
    jetski:    { name: 'Seashark Skúter',  cat: '🚤', w: 32, h: 15, accel: 0.52, max: 14.2, nitro: 19.5, grip: 0.93, hp: 90,  price: 2600,  colors: ['#06b6d4', '#f43f5e', '#facc15', '#22c55e'], isBoat: true },
    sports:    { name: 'Viper GT',         cat: '🏎️', w: 46, h: 22, accel: 0.30, max: 11.2, nitro: 16.0, grip: 0.86, hp: 115, price: 4200,  colors: ['#e11d48', '#2563eb', '#f59e0b', '#10b981'] },
    muscle:    { name: 'V8 Fury',          cat: '🚗', w: 46, h: 23, accel: 0.30, max: 10.4, nitro: 15.2, grip: 0.90, hp: 145, price: 4800,  colors: ['#ea580c', '#18181b', '#dc2626', '#16a34a'] },
    drift:     { name: 'Sakura JDM Drift', cat: '🏎️', w: 45, h: 22, accel: 0.34, max: 11.6, nitro: 16.8, grip: 0.93, hp: 120, price: 5200,  colors: ['#ec4899', '#a855f7', '#06b6d4', '#f8fafc'], isDrift: true },
    suv:       { name: 'G-Titan 4x4',      cat: '🚙', w: 50, h: 26, accel: 0.24, max: 9.0,  nitro: 12.5, grip: 0.84, hp: 200, price: 5600,  colors: ['#334155', '#f8fafc', '#1e293b', '#3f6212'] },
    ambulance: { name: 'EMS Rescue',       cat: '🚑', w: 54, h: 26, accel: 0.24, max: 9.2,  nitro: 12.4, grip: 0.84, hp: 180, price: 6200,  colors: ['#f8fafc'], isEMS: true },
    moto:      { name: 'Hayabusa R1',      cat: '🏍️', w: 35, h: 13, accel: 0.42, max: 13.6, nitro: 18.5, grip: 0.89, hp: 80,  price: 6800,  colors: ['#dc2626', '#0284c7', '#18181b', '#a855f7'], isBike: true },
    truck:     { name: 'Cargo Hauler',     cat: '🚛', w: 64, h: 28, accel: 0.18, max: 7.4,  nitro: 10.2, grip: 0.82, hp: 280, price: 7400,  colors: ['#64748b', '#b91c1c', '#1d4ed8'] },
    speedboat: { name: 'Marquis Čln',      cat: '🚤', w: 56, h: 24, accel: 0.50, max: 16.2, nitro: 22.0, grip: 0.92, hp: 165, price: 8500,  colors: ['#f8fafc', '#0284c7', '#e11d48'], isBoat: true },
    limo:      { name: 'Stretch Limuzína', cat: '🚘', w: 72, h: 23, accel: 0.20, max: 9.0,  nitro: 12.2, grip: 0.84, hp: 210, price: 9500,  colors: ['#18181b', '#f8fafc', '#4c1d95'], isLimo: true },
    police:    { name: 'PD Interceptor',   cat: '🚓', w: 46, h: 22, accel: 0.30, max: 11.2, nitro: 15.8, grip: 0.87, hp: 140, price: 11000, colors: ['#0f172a'], isPoliceModel: true },
    monster:   { name: 'Crusher Monster',  cat: '🛻', w: 54, h: 32, accel: 0.26, max: 9.6,  nitro: 13.4, grip: 0.84, hp: 350, price: 14500, colors: ['#dc2626', '#16a34a', '#2563eb', '#eab308'], isMonster: true },
    hyper:     { name: 'Neon Apex',        cat: '🏎️', w: 48, h: 23, accel: 0.38, max: 13.4, nitro: 19.2, grip: 0.89, hp: 125, price: 19500, colors: ['#a855f7', '#06b6d4', '#f43f5e', '#facc15'] },
    swat:      { name: 'SWAT Enforcer',    cat: '🚐', w: 56, h: 27, accel: 0.24, max: 9.2,  nitro: 12.2, grip: 0.84, hp: 320, price: 22000, colors: ['#111827'], isPoliceModel: true, isSWAT: true },
    heli:      { name: 'Buzzard Vrtuľník', cat: '🚁', w: 54, h: 26, accel: 0.34, max: 13.5, nitro: 18.0, grip: 0.90, hp: 240, price: 24000, colors: ['#1e293b', '#0f766e', '#b91c1c'], isHeli: true },
    jet:       { name: 'F-99 Skyhawk',     cat: '✈️', w: 60, h: 54, accel: 0.48, max: 20.5, nitro: 26.5, grip: 0.92, hp: 200, price: 36000, colors: ['#94a3b8'], isAircraft: true },
    tank:      { name: 'Rhino Tank',       cat: '🪖', w: 62, h: 34, accel: 0.18, max: 6.4,  nitro: 8.5,  grip: 0.80, hp: 900, price: 65000, colors: ['#3f4d36'], isTank: true }
  };

  const player = {
    x: W.spawnX, y: W.spawnY,
    vx: 0, vy: 0, angle: 0, radius: 10,
    hp: 100, maxHp: 100, armor: 25, maxArmor: 100,
    stamina: 100, maxStamina: 100,
    inVehicle: null, walkAnim: 0, isSwimming: false,
    outfitColor: '#38bdf8',
    ownedWeapons: ['smg', 'rpg'],
    weapon: 'smg', rockets: 3, rocketRegen: 0,
    fireCooldown: 0, hitFlash: 0
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
    level: 0, seen: false, searchTimer: 0,
    bustedTimer: 0, bustedProgress: 0,
    lastKnownX: W.spawnX, lastKnownY: W.spawnY
  };

  let targetCriminalVeh = null;
  let copBumpCooldown = 0;
  let baseAlarmCooldown = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function pushCircleOutOfRect(ent, r, rx, ry, rw, rh) {
    const cx = Math.max(rx, Math.min(ent.x, rx + rw));
    const cy = Math.max(ry, Math.min(ent.y, ry + rh));
    const dx = ent.x - cx, dy = ent.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= r * r) return null;

    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const pen = (r - dist) + 0.35;
      const nx = dx / dist, ny = dy / dist;
      ent.x += nx * pen; ent.y += ny * pen;
      return { nx: nx, ny: ny };
    } else {
      const dL = ent.x - rx, dR = (rx + rw) - ent.x;
      const dT = ent.y - ry, dB = (ry + rh) - ent.y;
      const m = Math.min(dL, dR, dT, dB);
      if (m === dL) { ent.x = rx - r - 1; return { nx: -1, ny: 0 }; }
      if (m === dR) { ent.x = rx + rw + r + 1; return { nx: 1, ny: 0 }; }
      if (m === dT) { ent.y = ry - r - 1; return { nx: 0, ny: -1 }; }
      ent.y = ry + rh + r + 1; return { nx: 0, ny: 1 };
    }
  }

  function resolveWorldCollisions(ent, r, mode) {
    mode = mode || 'land';
    let hit = false, sumNx = 0, sumNy = 0;

    if (ent.x < r + 8) { ent.x = r + 8; sumNx += 1; hit = true; }
    if (ent.y < r + 8) { ent.y = r + 8; sumNy += 1; hit = true; }
    if (ent.x > C.WORLD_SIZE - r - 8) { ent.x = C.WORLD_SIZE - r - 8; sumNx -= 1; hit = true; }
    if (ent.y > C.WORLD_SIZE - r - 8) { ent.y = C.WORLD_SIZE - r - 8; sumNy -= 1; hit = true; }

    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const tc = Math.floor(ent.x / TS), tr = Math.floor(ent.y / TS);
      for (let rr = tr - 1; rr <= tr + 1; rr++) {
        if (rr < 0 || rr >= N) continue;
        for (let cc = tc - 1; cc <= tc + 1; cc++) {
          if (cc < 0 || cc >= N) continue;
          const tile = W.tiles[rr][cc];

          if (mode === 'land' && tile === T.WATER) {
            const res = pushCircleOutOfRect(ent, r, cc * TS, rr * TS, TS, TS);
            if (res) { hit = true; moved = true; sumNx += res.nx; sumNy += res.ny; }
          } else if (mode === 'water' && tile !== T.WATER && tile !== T.BRIDGE) {
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

  function isOverBuilding(x, y, r) {
    const tc = Math.floor(x / TS), tr = Math.floor(y / TS);
    for (let rr = tr - 1; rr <= tr + 1; rr++) {
      if (rr < 0 || rr >= N) continue;
      for (let cc = tc - 1; cc <= tc + 1; cc++) {
        if (cc < 0 || cc >= N) continue;
        const objs = W.solidGrid[rr][cc];
        for (let i = 0; i < objs.length; i++) {
          const b = objs[i];
          const nx = Math.max(b.x, Math.min(x, b.x + b.w));
          const ny = Math.max(b.y, Math.min(y, b.y + b.h));
          if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
        }
      }
    }
    return false;
  }

  function spawnVehicle(typeKey, x, y, angle, opts) {
    opts = opts || {};
    const spec = VEH_TYPES[typeKey] || VEH_TYPES.sports;
    const v = {
      id: nextId++, type: typeKey, spec: spec,
      x: x, y: y, vx: 0, vy: 0, angle: angle || 0, steerVis: 0,
      radius: spec.isAircraft || spec.isHeli ? 20 : Math.max(10, spec.h * 0.68),
      hp: spec.hp, maxHp: spec.hp,
      color: opts.color || pick(spec.colors),
      underglow: opts.underglow || null,
      isAI: !!opts.isAI, isPolice: !!opts.isPolice,
      isCriminal: !!opts.isCriminal, isPersistent: !!opts.isPersistent,
      sirenOn: !!opts.sirenOn, braking: false,
      crew: opts.isPolice ? (typeKey === 'swat' ? 3 : (typeKey === 'tank' ? 0 : 2)) : 0,
      reverseTimer: 0, aiSpeed: spec.max * (0.36 + Math.random() * 0.24),
      jumpZ: 0, jumpVz: 0, altitude: 0, rotorAngle: 0
    };
    resolveWorldCollisions(v, v.radius, spec.isBoat ? 'water' : 'land');
    vehicles.push(v);
    return v;
  }

  function spawnBoatNear(typeKey, row, col, angle) {
    for (let rad = 0; rad <= 7; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const r = row + dr, c = col + dc;
          if (r > 1 && r < N - 2 && c > 1 && c < N - 2 && W.tiles[r][c] === T.WATER) {
            return spawnVehicle(typeKey, c * TS + TS / 2, r * TS + TS / 2, angle, { isPersistent: true });
          }
        }
      }
    }
    return null;
  }

  function init() {
    vehicles.length = 0; peds.length = 0; skids.length = 0;
    scorchMarks.length = 0; particles.length = 0; projectiles.length = 0; explosions.length = 0;

    player.hp = player.maxHp;
    player.armor = 25;
    player.stamina = player.maxStamina;
    player.isSwimming = false;
    copBumpCooldown = 0;
    baseAlarmCooldown = 0;

    const starter = spawnVehicle('muscle', W.spawnX + 120, W.spawnY + 38, 0, { color: '#ea580c', isPersistent: true });
    player.inVehicle = starter;
    player.x = starter.x; player.y = starter.y;

    spawnVehicle('scooter',   W.spawnX + 190, W.spawnY - 40, Math.PI, { isPersistent: true });
    spawnVehicle('dirtbike',  W.spawnX + 45,  W.spawnY - 40, 0, { isPersistent: true });
    spawnVehicle('drift',     W.spawnX + 260, W.spawnY + 38, 0, { color: '#ec4899', underglow: '#ec4899', isPersistent: true });
    spawnVehicle('police',    34 * TS + 90,   43 * TS + 38,  0, { isPersistent: true });
    spawnVehicle('limo',      52 * TS + 90,   43 * TS - 38,  0, { color: '#f8fafc', isPersistent: true });
    spawnVehicle('monster',   24 * TS + 90,   43 * TS + 38,  0, { color: '#16a34a', isPersistent: true });
    spawnVehicle('truck',     37 * TS + 90,   55 * TS + 38,  0, { isPersistent: true });
    spawnVehicle('heli',      45 * TS + 90,   39 * TS + 90,  0, { color: '#1e293b', isPersistent: true });

    // Ťažká technika priamo vo Vojenskej základni na severe (r=6..11, c=25..40)
    spawnVehicle('tank',      33 * TS + 90,   9.5 * TS + 90, 0, { color: '#3f4d36', isPersistent: true });
    spawnVehicle('heli',      30 * TS + 90,   8.0 * TS + 90, 0, { color: '#3f4d36', isPersistent: true });
    spawnVehicle('jet',       34 * TS + 90,   7.0 * TS + 90, 0, { color: '#94a3b8', isPersistent: true });

    spawnBoatNear('speedboat', 43, 62, 0);
    spawnBoatNear('jetski',    45, 62, Math.PI);
    spawnBoatNear('speedboat', 65, 32, 0);

    if (window.GTA.Police) window.GTA.Police.init();
  }

  function addWanted(stars) {
    if (window.GTA.Police) window.GTA.Police.addWanted(stars);
    else wanted.level = Math.min(5, Math.max(wanted.level, stars));
  }

  function clearWanted() {
    if (window.GTA.Police) window.GTA.Police.clearWanted();
    else wanted.level = 0;
  }

  function damagePlayer(amount, callbacks) {
    if (amount <= 0) return;
    player.hitFlash = 1;
    let rem = amount;
    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, rem * 0.75);
      player.armor -= absorbed;
      rem -= absorbed;
    }
    player.hp = Math.max(0, player.hp - rem);
    if (callbacks && callbacks.onShake) callbacks.onShake(Math.min(7, amount * 0.45));
    if (player.hp <= 0) {
      clearWanted();
      if (callbacks && callbacks.onWasted) callbacks.onWasted();
    }
  }

  function switchWeapon(notify) {
    const list = player.ownedWeapons.length ? player.ownedWeapons : ['smg', 'rpg'];
    const idx = list.indexOf(player.weapon);
    player.weapon = list[(idx + 1) % list.length];
    const w = WEAPONS[player.weapon] || WEAPONS.smg;
    if (notify) {
      notify(player.weapon === 'rpg' ? `🚀 ${w.name} (${player.rockets} rakiet)` : `${w.icon} ${w.name}`, '#facc15');
    }
  }

  function toggleVehicle(notify) {
    if (player.inVehicle) {
      const v = player.inVehicle;
      if (v.altitude > 0.22 || v.jumpZ > 8) {
        if (notify) notify('Najskôr pristaň bližšie k zemi (drž ▼)!', '#f59e0b');
        return false;
      }
      player.x = v.x + Math.cos(v.angle - Math.PI / 2) * (v.radius + 16);
      player.y = v.y + Math.sin(v.angle - Math.PI / 2) * (v.radius + 16);
      resolveWorldCollisions(player, player.radius, 'swim');
      player.angle = v.angle;
      v.isAI = false;
      player.inVehicle = null;
      return true;
    } else {
      let best = null, bestD = 78;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const d = Math.hypot(v.x - player.x, v.y - player.y);
        if (d < bestD) { bestD = d; best = v; }
      }
      if (best) {
        const wasAI = best.isAI, wasPol = best.isPolice;
        const isMilVeh = best.spec.isTank || (best.y < 12 * TS && best.x > 25 * TS && best.x < 41 * TS);
        best.isAI = false;
        best.isPersistent = true;
        player.inVehicle = best;
        player.isSwimming = false;
        if (isMilVeh) {
          addWanted(Math.max(wanted.level, 4));
          if (notify) notify(`🪖 Ukradol si ${best.spec.name} zo základne! (4★ POPLACH)`, '#ef4444');
          if (window.GTA.Audio) window.GTA.Audio.playAlert();
        } else if (wasPol && wanted.level === 0) {
          addWanted(1);
          if (notify) notify(`🚨 Ukradol si ${best.spec.name}! (+1★)`, '#ef4444');
        } else if (notify) {
          const hint = best.spec.isHeli ? ' (▲ vzlet, ▼ pristátie)' : (best.spec.isAircraft ? ' (pridaj plyn na vzlet)' : '');
          notify(`${best.spec.cat} ${best.spec.name}${hint}`, '#38bdf8');
        }
        return true;
      }
      if (notify) notify('Žiadne vozidlo nablízku', '#94a3b8');
      return false;
    }
  }

  function repairCurrentVehicle() {
    const v = player.inVehicle;
    player.hp = player.maxHp;
    player.armor = player.maxArmor;
    if (!v) return false;
    v.hp = v.maxHp;
    return true;
  }

  function spawnParticles(x, y, color, count, speed, sizeMin) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random()) * speed;
      particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.025 + Math.random() * 0.03,
        color: color, size: (sizeMin || 3) + Math.random() * 4
      });
    }
    if (particles.length > 220) particles.splice(0, particles.length - 220);
  }

  function triggerExplosion(x, y, radius, callbacks) {
    explosions.push({ x: x, y: y, r: 10, maxR: radius, life: 1 });
    scorchMarks.push({ x: x, y: y, r: radius * 0.36 });
    if (scorchMarks.length > 35) scorchMarks.shift();

    spawnParticles(x, y, '#f97316', 22, 6.5, 5);
    spawnParticles(x, y, '#facc15', 14, 5.0, 4);
    spawnParticles(x, y, '#334155', 16, 3.2, 7);

    if (window.GTA.Audio) window.GTA.Audio.playExplosion();
    if (callbacks && callbacks.onShake) callbacks.onShake(16);
    if (window.GTA.Traffic) window.GTA.Traffic.triggerPanic(x, y, 520, vehicles);

    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      const dx = v.x - x, dy = v.y - y, d = Math.hypot(dx, dy);
      if (d < radius) {
        const push = (1 - d / radius) * 14, ang = Math.atan2(dy, dx);
        v.vx += Math.cos(ang) * push; v.vy += Math.sin(ang) * push;
        if (v !== player.inVehicle) v.hp -= (1 - d / radius) * 185;
      }
    }

    const P = window.GTA.Police;
    if (P && P.cops) {
      for (let i = P.cops.length - 1; i >= 0; i--) {
        const cp = P.cops[i], d = Math.hypot(cp.x - x, cp.y - y);
        if (d < radius) P.damageCop(cp, (1 - d / radius) * 150, callbacks);
      }
    }
  }

  function fireWeapon(callbacks) {
    if (player.fireCooldown > 0 || player.isSwimming) return;
    const isRPG = player.weapon === 'rpg';
    if (isRPG && player.rockets <= 0) {
      player.weapon = 'smg';
      if (callbacks && callbacks.onNotify) callbacks.onNotify('Došli rakety – prepínam na SMG!', '#facc15');
      return;
    }

    if (window.GTA.Traffic) window.GTA.Traffic.triggerPanic(player.x, player.y, 320, vehicles);

    const P = window.GTA.Police;
    let aimAngle = player.angle;
    let bestTarget = null, bestDist = 470;

    if (P && P.cops) {
      for (let i = 0; i < P.cops.length; i++) {
        const cp = P.cops[i], d = Math.hypot(cp.x - player.x, cp.y - player.y);
        if (d < bestDist && P.hasLineOfSight(player.x, player.y, cp.x, cp.y)) { bestDist = d; bestTarget = cp; }
      }
    }
    if (!bestTarget) {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v === player.inVehicle) continue;
        if (v.isCriminal || (v.isPolice && wanted.level > 0)) {
          const d = Math.hypot(v.x - player.x, v.y - player.y);
          if (d < bestDist && (!P || P.hasLineOfSight(player.x, player.y, v.x, v.y))) { bestDist = d; bestTarget = v; }
        }
      }
    }
    if (bestTarget) {
      aimAngle = Math.atan2(bestTarget.y - player.y, bestTarget.x - player.x);
      if (!player.inVehicle) player.angle = aimAngle;
    }

    const ox = player.x + Math.cos(aimAngle) * 22;
    const oy = player.y + Math.sin(aimAngle) * 22;
    const wSpec = WEAPONS[player.weapon] || WEAPONS.smg;
    player.fireCooldown = wSpec.cd;

    if (isRPG) {
      player.rockets--;
      projectiles.push({ type: 'rocket', x: ox, y: oy, vx: Math.cos(aimAngle) * 18, vy: Math.sin(aimAngle) * 18, angle: aimAngle, dmg: wSpec.dmg, life: 70 });
      spawnParticles(ox, oy, '#f97316', 8, 3, 4);
      if (window.GTA.Audio) window.GTA.Audio.playRocket();
      if (callbacks && callbacks.onShake) callbacks.onShake(7);
    } else {
      for (let k = 0; k < wSpec.pellets; k++) {
        const a = aimAngle + (Math.random() - 0.5) * wSpec.spread;
        projectiles.push({
          type: 'bullet', x: ox, y: oy,
          vx: Math.cos(a) * wSpec.speed, vy: Math.sin(a) * wSpec.speed,
          angle: a, dmg: wSpec.dmg, life: wSpec.life
        });
      }
      spawnParticles(ox, oy, '#fef08a', wSpec.pellets > 1 ? 6 : 3, 2.8, 2.5);
      if (window.GTA.Audio) window.GTA.Audio.playShot();
      if (callbacks && callbacks.onShake) callbacks.onShake(wSpec.pellets > 1 ? 3.5 : 1.6);
    }
  }

  const EXTRA_STREET_TYPES = ['scooter', 'dirtbike', 'moto', 'drift', 'limo', 'monster', 'hyper'];
  function spawnTrafficWrapper(type, x, y, ang, opts) {
    if (Math.random() < 0.36) type = pick(EXTRA_STREET_TYPES);
    return spawnVehicle(type, x, y, ang, opts);
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
        if (v.isAI && !v.isPolice) aiCount++;
        if (v.isPolice) policeCount++;
      }
    }

    if (aiCount < 22 && window.GTA.Traffic) window.GTA.Traffic.trySpawn(px, py, vehicles, spawnTrafficWrapper);
    const desiredPolice = wanted.level > 0 ? Math.min(6, wanted.level + 1) : 2;
    if (policeCount < desiredPolice) trySpawnPoliceVehicle(px, py);

    for (let i = peds.length - 1; i >= 0; i--) {
      if (Math.hypot(peds[i].x - px, peds[i].y - py) > 1300) peds.splice(i, 1);
    }
    if (peds.length < 22) {
      const ang = Math.random() * Math.PI * 2, dist = 420 + Math.random() * 680;
      const tx = px + Math.cos(ang) * dist, ty = py + Math.sin(ang) * dist;
      const c = Math.floor(tx / TS), r = Math.floor(ty / TS);
      if (r > 1 && r < N - 2 && c > 1 && c < N - 2) {
        const tile = W.tiles[r][c];
        if ((tile === T.SIDEWALK || tile === T.SAND || tile === T.GRASS || tile === T.PIER || tile === T.DESERT) && !W.checkCollision(tx, ty, 12)) {
          peds.push({
            x: tx, y: ty, angle: Math.random() * Math.PI * 2, speed: 0.9 + Math.random() * 0.6,
            shirt: pick(['#ef4444', '#38bdf8', '#facc15', '#22c55e', '#a855f7', '#f97316', '#e2e8f0']), panic: 0
          });
        }
      }
    }
  }

  function trySpawnPoliceVehicle(px, py) {
    for (let tries = 0; tries < 6; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = wanted.level > 0 ? (740 + Math.random() * 520) : (620 + Math.random() * 920);
      const sx = px + Math.cos(ang) * dist, sy = py + Math.sin(ang) * dist;
      const c = Math.floor(sx / TS), r = Math.floor(sy / TS);
      if (r < 2 || r >= N - 2 || c < 2 || c >= N - 2) continue;
      const t = W.tiles[r][c];
      if (!W.isRoadLike(t)) continue;

      const cx = c * TS + TS / 2, cy = r * TS + TS / 2;
      let blocked = false;
      for (let i = 0; i < vehicles.length; i++) {
        if (Math.hypot(vehicles[i].x - cx, vehicles[i].y - cy) < 135) { blocked = true; break; }
      }
      if (blocked) continue;

      const dirs = [];
      if (W.isRoadLike(W.tiles[r][c + 1])) dirs.push(0);
      if (W.isRoadLike(W.tiles[r][c - 1])) dirs.push(Math.PI);
      if (W.isRoadLike(W.tiles[r + 1][c])) dirs.push(Math.PI / 2);
      if (W.isRoadLike(W.tiles[r - 1][c])) dirs.push(-Math.PI / 2);

      let type = 'police';
      if (wanted.level >= 5 && Math.random() < 0.35) type = 'tank';
      else if (wanted.level >= 4 && Math.random() < 0.55) type = 'swat';

      spawnVehicle(type, cx, cy, dirs.length ? pick(dirs) : 0, {
        isAI: true, isPolice: true, sirenOn: wanted.level > 0
      });
      return;
    }
  }

  function spawnCriminalForMission() {
    clearCriminal();
    const spots = [
      { x: 45 * TS + 90, y: 29 * TS + 90 }, { x: 54 * TS + 90, y: 43 * TS + 90 },
      { x: 37 * TS + 90, y: 55 * TS + 90 }, { x: 24 * TS + 90, y: 43 * TS + 90 }
    ];
    let best = spots[0], bestD = 0;
    for (let i = 0; i < spots.length; i++) {
      const d = Math.hypot(spots[i].x - player.x, spots[i].y - player.y);
      if (d > bestD && d < 6500) { bestD = d; best = spots[i]; }
    }
    targetCriminalVeh = spawnVehicle('muscle', best.x, best.y, 0, {
      color: '#18181b', underglow: '#ef4444', isAI: true, isCriminal: true, isPersistent: true
    });
    return targetCriminalVeh;
  }

  function clearCriminal() {
    if (targetCriminalVeh) {
      const idx = vehicles.indexOf(targetCriminalVeh);
      if (idx >= 0) vehicles.splice(idx, 1);
      targetCriminalVeh = null;
    }
  }

  function update(dt, input, upgrades, callbacks) {
    maintainAmbientWorld();

    if (copBumpCooldown > 0) copBumpCooldown -= dt / 60;
    if (baseAlarmCooldown > 0) baseAlarmCooldown -= dt / 60;
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (player.hitFlash > 0) player.hitFlash = Math.max(0, player.hitFlash - 0.08 * dt);
    if (player.rockets < 6) {
      player.rocketRegen += dt / 60;
      if (player.rocketRegen >= 28) { player.rocketRegen = 0; player.rockets++; }
    }
    if (input.fire) fireWeapon(callbacks);
    if (wanted.level === 0 && player.hp > 0 && player.hp < 35) player.hp = Math.min(35, player.hp + 0.03 * dt);

    // Kontrola zakázaných zón: Vojenská základňa (r=6..11, c=25..40) a Area 51 (r=11..19, c=44..55)
    const pCol = Math.floor(player.x / TS), pRow = Math.floor(player.y / TS);
    const inMilBase = (pRow >= 6 && pRow <= 11 && pCol >= 25 && pCol <= 40);
    const inArea51 = (pRow >= 11 && pRow <= 19 && pCol >= 44 && pCol <= 55);
    if ((inMilBase || inArea51) && baseAlarmCooldown <= 0 && wanted.level < 4) {
      baseAlarmCooldown = 14;
      addWanted(4);
      if (window.GTA.Audio) window.GTA.Audio.playAlert();
      if (callbacks && callbacks.onNotify) {
        callbacks.onNotify(inMilBase ? '🪖 ZAKÁZANÁ VOJENSKÁ ZÁKLADŇA! (4★ POPLACH)' : '👽 ZÓNA AREA 51! Tajný poplach (4★)!', '#ef4444');
      }
    }

    const engBonus = 1 + (upgrades.engine || 0) * 0.14;
    const nitroBonus = 1 + (upgrades.nitro || 0) * 0.14;
    const armorMult = 1 - (upgrades.armor || 0) * 0.2;

    if (player.inVehicle) {
      const v = player.inVehicle, sp = v.spec;
      player.isSwimming = false;
      player.stamina = Math.min(player.maxStamina, player.stamina + 0.35 * dt);

      const fx = Math.cos(v.angle), fy = Math.sin(v.angle), rx = -fy, ry = fx;
      let fwd = v.vx * fx + v.vy * fy, lat = v.vx * rx + v.vy * ry;

      const useNitro = input.nitro && (input.up || fwd > 2 || sp.isHeli);
      const curAccel = sp.accel * engBonus * (useNitro ? 1.62 : 1);
      const curMax = useNitro ? sp.nitro * nitroBonus : sp.max * engBonus;

      if (sp.isHeli) {
        v.rotorAngle = (v.rotorAngle || 0) + (0.28 + v.altitude * 0.52) * dt;
        if (input.up || input.nitro) { v.altitude = Math.min(1, v.altitude + 0.022 * dt); fwd += curAccel * dt; }
        if (input.down) {
          fwd -= (fwd > 0.5 ? 0.36 : 0.14) * dt;
          if (Math.abs(fwd) < 2.5) {
            const minAlt = isOverBuilding(v.x, v.y, v.radius) ? 0.26 : 0;
            v.altitude = Math.max(minAlt, v.altitude - 0.022 * dt);
          }
        }
        fwd = Math.max(-4.5, Math.min(curMax, fwd));
        if (input.left) v.angle -= 0.052 * dt;
        if (input.right) v.angle += 0.052 * dt;
        lat *= Math.pow(0.92, dt); fwd *= Math.pow(0.975, dt);
      } else {
        if (input.up || useNitro) fwd += curAccel * dt;
        if (input.down) fwd -= (fwd > 0 ? 0.56 : 0.28) * dt;
        fwd = Math.max(sp.isAircraft ? -2.5 : -6.2, Math.min(curMax, fwd));

        v.steerVis = (input.left ? -0.45 : (input.right ? 0.45 : 0));
        v.braking = !!(input.down || input.drift);
        const speedMag = Math.abs(fwd);

        if (speedMag > 0.2 || sp.isBoat || (sp.isAircraft && v.altitude > 0.1)) {
          const baseTurn = sp.isAircraft ? 0.038 : (sp.isBike ? 0.068 : (sp.isBoat ? 0.062 : (input.drift ? 0.072 : 0.054)));
          const turnRate = baseTurn * Math.min(1, Math.max(sp.isBoat ? 0.55 : 0.45, speedMag / 2.6));
          const dir = fwd >= 0 ? 1 : -1;
          if (input.left) v.angle -= turnRate * dir * dt;
          if (input.right) v.angle += turnRate * dir * dt;
        }

        if (sp.isAircraft) {
          if (fwd > 10.5) v.altitude = Math.min(1, v.altitude + 0.018 * dt);
          else if (fwd < 8.5) v.altitude = Math.max(isOverBuilding(v.x, v.y, v.radius) ? 0.28 : 0, v.altitude - 0.022 * dt);
        }

        const grip = (input.drift && !sp.isAircraft && !sp.isBoat) ? 0.962 : sp.grip;
        lat *= Math.pow(grip, dt);
        fwd *= Math.pow(sp.isAircraft ? 0.994 : (sp.isBoat ? 0.988 : (input.drift ? 0.986 : 0.99)), dt);
      }

      const nfx = Math.cos(v.angle), nfy = Math.sin(v.angle), nrx = -nfy, nry = nfx;
      v.vx = nfx * fwd + nrx * lat; v.vy = nfy * fwd + nry * lat;

      if (v.jumpZ > 0 || v.jumpVz > 0) {
        v.jumpZ += v.jumpVz * dt; v.jumpVz -= 0.38 * dt;
        if (v.jumpZ <= 0) { v.jumpZ = 0; v.jumpVz = 0; }
      }

      const airborne = v.altitude > 0.22;
      v.x += v.vx * dt; v.y += v.vy * dt;

      if (airborne) {
        v.x = Math.max(60, Math.min(C.WORLD_SIZE - 60, v.x));
        v.y = Math.max(60, Math.min(C.WORLD_SIZE - 60, v.y));
      } else {
        const colMode = sp.isBoat ? 'water' : 'land';
        const wallHit = resolveWorldCollisions(v, v.radius, colMode);
        if (wallHit) {
          const vn = v.vx * wallHit.nx + v.vy * wallHit.ny;
          if (vn < 0) {
            const impact = -vn;
            v.vx -= 1.28 * vn * wallHit.nx; v.vy -= 1.28 * vn * wallHit.ny;
            if (impact > 5.5) {
              v.hp = Math.max(0, v.hp - impact * 1.15 * armorMult);
              spawnParticles(v.x - wallHit.nx * v.radius, v.y - wallHit.ny * v.radius, sp.isBoat ? '#e0f2fe' : '#facc15', 7, 3.8, 3);
              if (window.GTA.Audio) window.GTA.Audio.playCrash(impact);
              if (callbacks && callbacks.onShake) callbacks.onShake(Math.min(9, impact * 0.7));
            }
          }
        }
      }

      const totalSpd = Math.hypot(v.vx, v.vy);
      if (sp.isBoat && totalSpd > 2.2) {
        const sternX = v.x - nfx * (sp.w * 0.45), sternY = v.y - nfy * (sp.w * 0.45);
        spawnParticles(sternX + nrx * 6, sternY + nry * 6, 'rgba(224,242,254,0.75)', 1, 1.3, 5);
        spawnParticles(sternX - nrx * 6, sternY - nry * 6, 'rgba(224,242,254,0.75)', 1, 1.3, 5);
      }

      if (!airborne && !sp.isBoat && !sp.isHeli && v.jumpZ < 2 && ((input.drift && totalSpd > 3.5) || Math.abs(lat) > 2.6)) {
        const rearX = v.x - nfx * 16, rearY = v.y - nfy * 16;
        if (sp.isBike) skids.push({ x: rearX, y: rearY });
        else { skids.push({ x: rearX + nrx * 8, y: rearY + nry * 8 }); skids.push({ x: rearX - nrx * 8, y: rearY - nry * 8 }); }
        if (skids.length > 360) skids.splice(0, 2);
        if (Math.random() < 0.55) spawnParticles(rearX, rearY, 'rgba(226,232,240,0.65)', 1, 1.4, 6);
      }

      if (v.hp < v.maxHp * 0.45 && Math.random() < 0.35) {
        spawnParticles(v.x + nfx * 14, v.y + nfy * 14, v.hp < v.maxHp * 0.2 ? '#f97316' : '#475569', 1, 1.5, 5);
      }

      player.x = v.x; player.y = v.y; player.angle = v.angle;

      if (window.GTA.Audio) window.GTA.Audio.updateEngine(totalSpd / sp.max, true, !!(sp.isAircraft || sp.isHeli), useNitro);

      if (v.hp <= 0) {
        triggerExplosion(v.x, v.y, 145, callbacks);
        v.hp = v.maxHp; v.vx = 0; v.vy = 0; v.altitude = 0;
        player.hp = 0; clearWanted();
        if (callbacks && callbacks.onWasted) callbacks.onWasted();
      }
    } else {
      const tc = Math.max(0, Math.min(N - 1, Math.floor(player.x / TS)));
      const tr = Math.max(0, Math.min(N - 1, Math.floor(player.y / TS)));
      const tileNow = W.tiles[tr][tc];
      player.isSwimming = (tileNow === T.WATER);

      let mx = input.joyX || 0, my = input.joyY || 0;
      if (Math.hypot(mx, my) < 0.08) {
        mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      }
      const mag = Math.min(1, Math.hypot(mx, my));
      const P = window.GTA.Police;
      const tased = P && P.isPlayerTased();
      const grabbed = wanted.bustedProgress > 0.05;
      const wantsSprint = (mag > 0.74) || input.nitro || input.drift;

      if (player.isSwimming) {
        if (mag > 0.08 && wantsSprint && player.stamina > 2) {
          player.stamina = Math.max(0, player.stamina - 0.42 * dt);
        } else {
          player.stamina = Math.min(player.maxStamina, player.stamina + 0.16 * dt);
        }
        const isDeep = W.shallowGrid && !W.shallowGrid[tr * N + tc];
        if (isDeep && player.stamina <= 0.5 && Math.random() < 0.02 * dt) {
          damagePlayer(2.5, callbacks);
        }
      } else {
        player.stamina = Math.min(player.maxStamina, player.stamina + 0.35 * dt);
      }

      if (mag > 0.08) {
        const dirX = mx / Math.hypot(mx, my), dirY = my / Math.hypot(mx, my);
        let walkSpd;
        if (player.isSwimming) {
          const canSwimFast = wantsSprint && player.stamina > 1;
          walkSpd = canSwimFast ? 2.2 : (1.35 * mag);
          if (player.stamina <= 0.5) walkSpd = 0.75;
        } else {
          walkSpd = wantsSprint ? 4.45 : (2.7 * mag);
        }
        if (tased) walkSpd *= 0.35;
        else if (grabbed) walkSpd *= 0.58;

        player.angle = Math.atan2(dirY, dirX);
        player.walkAnim += (walkSpd * 0.09) * dt;
        player.x += dirX * walkSpd * dt; player.y += dirY * walkSpd * dt;
        resolveWorldCollisions(player, player.radius, 'swim');

        if (player.isSwimming && Math.random() < 0.25) {
          spawnParticles(player.x, player.y, 'rgba(186,230,253,0.65)', 1, 0.7, 5);
        }
      }
      if (window.GTA.Audio) window.GTA.Audio.updateEngine(0, false, false, false);
    }

    if (window.GTA.Police) window.GTA.Police.update(dt, callbacks);
    if (window.GTA.Traffic) window.GTA.Traffic.update(dt, vehicles, peds, player, wanted.level, resolveWorldCollisions);
    if (window.GTA.Train) window.GTA.Train.update(dt, input, window.GTA.Entities, window.GTA.Activities, callbacks);

    let anySiren = (player.inVehicle && player.inVehicle.sirenOn);
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      if (v === player.inVehicle) continue;
      if (v.spec.isHeli && v.altitude > 0) v.rotorAngle = (v.rotorAngle || 0) + 0.4 * dt;
      if (v.sirenOn && Math.hypot(v.x - player.x, v.y - player.y) < 900) anySiren = true;

      if (v.hp <= 0) {
        const wasPol = v.isPolice, wasCrim = v.isCriminal;
        triggerExplosion(v.x, v.y, 150, callbacks);
        vehicles.splice(i, 1);
        if (wasPol) {
          addWanted(Math.min(5, Math.max(wanted.level + 1, 2)));
          player.rockets = Math.min(8, player.rockets + 1);
          if (callbacks && callbacks.onPoliceDestroyed) callbacks.onPoliceDestroyed();
        } else if (wasCrim && callbacks && callbacks.onCriminalHit) {
          callbacks.onCriminalHit(v, 999);
        }
        continue;
      }
      if (v.hp < v.maxHp * 0.45 && Math.random() < 0.3) {
        spawnParticles(v.x, v.y, v.hp < v.maxHp * 0.2 ? '#f97316' : '#475569', 1, 1.4, 5);
      }
    }

    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      if (a.altitude > 0.2 || a.jumpZ > 12) continue;
      for (let j = i + 1; j < vehicles.length; j++) {
        const b = vehicles[j];
        if (b.altitude > 0.2 || b.jumpZ > 12) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const minDist = a.radius + b.radius + 2, dist = Math.hypot(dx, dy);
        if (dist <= 0.01 || dist >= minDist) continue;

        const nx = dx / dist, ny = dy / dist, overlap = minDist - dist;
        const aIsP = (a === player.inVehicle), bIsP = (b === player.inVehicle);
        const aShare = aIsP ? 0.25 : (bIsP ? 0.75 : 0.5);

        a.x += nx * overlap * aShare; a.y += ny * overlap * aShare;
        b.x -= nx * overlap * (1 - aShare); b.y -= ny * overlap * (1 - aShare);

        const aWall = resolveWorldCollisions(a, a.radius, a.spec.isBoat ? 'water' : 'land');
        const bWall = resolveWorldCollisions(b, b.radius, b.spec.isBoat ? 'water' : 'land');
        if (aIsP && aWall) { b.x -= nx * 10; b.y -= ny * 10; b.vx -= nx * 4; b.vy -= ny * 4; }
        if (bIsP && bWall) { a.x += nx * 10; a.y += ny * 10; a.vx += nx * 4; a.vy += ny * 4; }

        const relSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        if (relSpeed > 3.2) {
          spawnParticles((a.x + b.x) / 2, (a.y + b.y) / 2, '#fbbf24', 6, 3.6, 3);
          if (aIsP || bIsP) {
            if (window.GTA.Audio) window.GTA.Audio.playCrash(relSpeed);
            if (callbacks && callbacks.onShake) callbacks.onShake(Math.min(8, relSpeed * 0.5));
            const pv = aIsP ? a : b, other = aIsP ? b : a, sign = aIsP ? 1 : -1;
            const pSpd = Math.hypot(pv.vx, pv.vy);
            const heavyHit = (input.nitro && pSpd > 9) || pv.spec.isMonster || pv.spec.isTank;
            other.vx -= sign * nx * (heavyHit ? 12 : 5.5);
            other.vy -= sign * ny * (heavyHit ? 12 : 5.5);
            other.hp -= relSpeed * (heavyHit ? 9.5 : 4.2);
            pv.vx += sign * nx * 2.2; pv.vy += sign * ny * 2.2;

            if (other.isPolice && !other.isCriminal) {
              if (pSpd > 8.5 || heavyHit) {
                addWanted(Math.max(wanted.level, 1));
              } else if (copBumpCooldown <= 0 && wanted.level === 0) {
                copBumpCooldown = 4.5;
                other.sirenOn = true;
                setTimeout(() => { if (wanted.level === 0) other.sirenOn = false; }, 1800);
                if (callbacks && callbacks.onPoliceWarn) callbacks.onPoliceWarn('🚓 Polícia: Dávaj pozor na jazdu!');
              }
            } else if (other.isCriminal && callbacks.onCriminalHit) {
              callbacks.onCriminalHit(other, relSpeed);
            }
          }
        }
      }
    }

    const P = window.GTA.Police;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      if (pr.type === 'rocket') spawnParticles(pr.x, pr.y, 'rgba(226,232,240,0.75)', 1, 0.8, 5);

      let hit = false;
      if (isOverBuilding(pr.x, pr.y, 4)) {
        hit = true;
      } else {
        if (P && P.cops) {
          for (let c = P.cops.length - 1; c >= 0; c--) {
            const cp = P.cops[c];
            if (Math.hypot(pr.x - cp.x, pr.y - cp.y) < cp.radius + 7) {
              hit = true;
              if (pr.type === 'bullet') P.damageCop(cp, pr.dmg || 24, callbacks);
              break;
            }
          }
        }
        if (!hit) {
          for (let j = 0; j < vehicles.length; j++) {
            const v = vehicles[j];
            if (v === player.inVehicle) continue;
            if (Math.hypot(pr.x - v.x, pr.y - v.y) < v.radius + 6) {
              hit = true;
              if (pr.type === 'bullet') {
                v.hp -= (pr.dmg || 24);
                spawnParticles(pr.x, pr.y, '#facc15', 5, 3.5, 2.5);
                if (v.isPolice) addWanted(Math.max(wanted.level, 2));
                if (v.isCriminal && callbacks.onCriminalHit) callbacks.onCriminalHit(v, 5);
              }
              break;
            }
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

    for (let i = explosions.length - 1; i >= 0; i--) {
      const ex = explosions[i];
      ex.r += (ex.maxR - ex.r) * 0.22 * dt; ex.life -= 0.045 * dt;
      if (ex.life <= 0) explosions.splice(i, 1);
    }

    if (window.GTA.Audio) window.GTA.Audio.updateSiren(anySiren, dt);

    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (player.inVehicle && d < 95 && Math.hypot(player.inVehicle.vx, player.inVehicle.vy) > 3.5) {
        p.angle = Math.atan2(p.y - player.y, p.x - player.x); p.panic = 90;
      }
      const sp = p.panic > 0 ? p.speed * 2.4 : p.speed;
      if (p.panic > 0) p.panic -= dt;
      p.x += Math.cos(p.angle) * sp * dt; p.y += Math.sin(p.angle) * sp * dt;
      if (resolveWorldCollisions(p, 8, 'land')) p.angle += Math.PI * 0.7;
      if (Math.random() < 0.008) p.angle += (Math.random() - 0.5) * 1.4;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.96; pt.vy *= 0.96; pt.life -= pt.decay * dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
  }

  function drawGroundEntities(ctx, cam, vw, vh, zoom, time, input) {
    const halfW = (vw / 2) / zoom + 140, halfH = (vh / 2) / zoom + 140;

    for (let i = 0; i < scorchMarks.length; i++) {
      const sc = scorchMarks[i];
      ctx.fillStyle = 'rgba(10, 10, 12, 0.65)';
      ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(10, 10, 14, 0.45)';
    for (let i = 0; i < skids.length; i++) ctx.fillRect(skids[i].x - 2.5, skids[i].y - 2.5, 5, 5);

    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (Math.abs(p.x - cam.x) > halfW || Math.abs(p.y - cam.y) > halfH) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(2, 3, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(1.5, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (window.GTA.Police) window.GTA.Police.drawCops(ctx, cam, vw, vh, zoom, time);

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.altitude > 0.22) continue;
      if (Math.abs(v.x - cam.x) > halfW || Math.abs(v.y - cam.y) > halfH) continue;
      drawSingleVehicle(ctx, v, time, v === player.inVehicle ? input : null);
    }

    if (window.GTA.Train) {
      window.GTA.Train.drawStationsAndTrain(ctx, cam, vw, vh, zoom, time);
    }

    const ridingTrain = window.GTA.Train && window.GTA.Train.state.riding;
    if (!player.inVehicle && !ridingTrain) {
      ctx.save(); ctx.translate(player.x, player.y);
      if (player.isSwimming) {
        const rip = 12 + Math.sin(time * 0.008) * 3;
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, rip, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.rotate(player.angle);
      if (!player.isSwimming) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(2, 3, 8, 0, Math.PI * 2); ctx.fill();
      }
      const swing = Math.sin(player.walkAnim) * 2.5;
      ctx.fillStyle = player.hitFlash > 0.2 ? '#ef4444' : (player.outfitColor || '#38bdf8');
      ctx.beginPath(); ctx.ellipse(swing * 0.4, 0, 6.5, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (!player.isSwimming) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 3, player.weapon === 'rpg' ? 14 : 10, 3.5);
      }
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    if (window.GTA.Police) window.GTA.Police.drawArrestOverlay(ctx, player, wanted, time);

    for (let i = 0; i < projectiles.length; i++) {
      const pr = projectiles[i];
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.angle);
      if (pr.type === 'rocket') {
        ctx.fillStyle = '#f97316'; ctx.fillRect(-10, -2.5, 10, 5);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, -2.5, 9, 5);
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(9, -2.5); ctx.lineTo(14, 0); ctx.lineTo(9, 2.5); ctx.fill();
      } else {
        ctx.fillStyle = '#fef08a'; ctx.fillRect(-7, -1.3, 14, 2.6);
      }
      ctx.restore();
    }

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

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
    ctx.save(); ctx.translate(vw / 2, vh / 2); ctx.scale(zoom, zoom); ctx.translate(-cam.x, -cam.y);
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.altitude > 0.22) drawSingleVehicle(ctx, v, time, v === player.inVehicle ? input : null);
    }
    ctx.restore();
  }

  function drawSingleVehicle(ctx, v, time, pInput) {
    const sp = v.spec, hw = sp.w / 2, hh = sp.h / 2;
    const liftScale = 1 + v.altitude * 0.48 + (v.jumpZ * 0.012);
    const shadowOff = 5 + v.altitude * 58 + v.jumpZ * 1.1;

    ctx.save(); ctx.translate(v.x, v.y);

    ctx.save(); ctx.translate(shadowOff, shadowOff); ctx.rotate(v.angle);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.14, 0.45 - v.altitude * 0.25)})`;
    if (sp.isAircraft) {
      ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(-hw * 0.3, -hh); ctx.lineTo(-hw, -hh * 0.3);
      ctx.lineTo(-hw, hh * 0.3); ctx.lineTo(-hw * 0.3, hh); ctx.closePath(); ctx.fill();
    } else if (sp.isBoat) {
      ctx.beginPath(); ctx.moveTo(hw + 4, 0); ctx.lineTo(0, -hh); ctx.lineTo(-hw, -hh * 0.8);
      ctx.lineTo(-hw, hh * 0.8); ctx.lineTo(0, hh); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.roundRect(-hw, -hh, sp.w, sp.h, 6); ctx.fill();
    }
    ctx.restore();

    ctx.rotate(v.angle); ctx.scale(liftScale, liftScale);

    if (v.underglow && !sp.isAircraft && !sp.isHeli) {
      ctx.shadowColor = v.underglow; ctx.shadowBlur = 18;
      ctx.strokeStyle = v.underglow; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-hw - 1, -hh - 1, sp.w + 2, sp.h + 2, 6); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (!sp.isAircraft && !sp.isHeli && !sp.isBoat) {
      const grad = ctx.createLinearGradient(hw - 2, 0, hw + 120, 0);
      grad.addColorStop(0, 'rgba(254, 249, 195, 0.34)');
      grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(hw - 2, -hh + 3); ctx.lineTo(hw + 120, -36);
      ctx.lineTo(hw + 120, 36); ctx.lineTo(hw - 2, hh - 3); ctx.closePath(); ctx.fill();
    }

    const showFlame = (pInput && pInput.nitro && (pInput.up || Math.hypot(v.vx, v.vy) > 3)) || (sp.isAircraft && Math.hypot(v.vx, v.vy) > 9);
    if (showFlame && !sp.isHeli) {
      const fl = 14 + Math.random() * 14;
      ctx.fillStyle = sp.isAircraft ? '#f97316' : '#a855f7';
      ctx.beginPath(); ctx.moveTo(-hw, -4); ctx.lineTo(-hw - fl, 0); ctx.lineTo(-hw, 4); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.moveTo(-hw, -2.5); ctx.lineTo(-hw - fl * 0.6, 0); ctx.lineTo(-hw, 2.5); ctx.fill();
    }

    if (sp.isAircraft) {
      ctx.fillStyle = v.color;
      ctx.beginPath(); ctx.moveTo(hw + 5, 0); ctx.lineTo(2, -hh); ctx.lineTo(-hw + 8, -hh + 6);
      ctx.lineTo(-hw + 12, -7); ctx.lineTo(-hw, -13); ctx.lineTo(-hw, 13);
      ctx.lineTo(-hw + 12, 7); ctx.lineTo(-hw + 8, hh - 6); ctx.lineTo(2, hh); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(9, 0, 11, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (sp.isHeli) {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(18, -14); ctx.moveTo(-8, 14); ctx.lineTo(18, 14); ctx.stroke();
      ctx.fillStyle = v.color; ctx.fillRect(-hw - 8, -3, 28, 6);
      ctx.fillStyle = '#facc15'; ctx.fillRect(-hw - 10, -8, 4, 16);
      ctx.fillStyle = v.color; ctx.beginPath(); ctx.ellipse(8, 0, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(16, 0, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(6, 0); ctx.rotate(v.rotorAngle || 0);
      ctx.fillStyle = 'rgba(226,232,240,0.16)'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.moveTo(0, -34); ctx.lineTo(0, 34); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (sp.isBoat) {
      ctx.fillStyle = v.color;
      ctx.beginPath(); ctx.moveTo(hw + 5, 0); ctx.lineTo(hw * 0.2, -hh); ctx.lineTo(-hw, -hh * 0.82);
      ctx.lineTo(-hw, hh * 0.82); ctx.lineTo(hw * 0.2, hh); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.moveTo(hw * 0.5, 0); ctx.lineTo(-2, -hh * 0.55); ctx.lineTo(-4, hh * 0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1e293b'; ctx.fillRect(-hw + 4, -hh * 0.45, hw * 0.85, hh * 0.9);
      if (v === player.inVehicle) {
        ctx.fillStyle = player.outfitColor || '#38bdf8';
        ctx.beginPath(); ctx.arc(-4, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (sp.isBike) {
      ctx.fillStyle = '#09090b'; ctx.fillRect(-hw, -3, 9, 6); ctx.fillRect(hw - 8, -3, 9, 6);
      ctx.fillStyle = v.color; ctx.beginPath(); ctx.roundRect(-hw + 3, -hh * 0.72, sp.w - 6, sp.h * 1.44, 4); ctx.fill();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hw - 9, -8); ctx.lineTo(hw - 9, 8); ctx.stroke();
      if (v === player.inVehicle || v.isAI) {
        ctx.fillStyle = v === player.inVehicle ? (player.outfitColor || '#38bdf8') : '#334155';
        ctx.beginPath(); ctx.ellipse(-2, 0, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fef9c3'; ctx.fillRect(hw - 1, -2.5, 2.5, 5);
    } else if (sp.isTank) {
      ctx.fillStyle = '#18181b'; ctx.fillRect(-hw, -hh - 2, sp.w, 6); ctx.fillRect(-hw, hh - 4, sp.w, 6);
      ctx.fillStyle = '#3f4d36'; ctx.beginPath(); ctx.roundRect(-hw + 2, -hh + 3, sp.w - 4, sp.h - 6, 4); ctx.fill();
      ctx.fillStyle = '#2d3826'; ctx.beginPath(); ctx.arc(-2, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f291a'; ctx.fillRect(4, -3, 32, 6);
    } else {
      const wThick = sp.isMonster ? 6 : 3, wLen = sp.isMonster ? 14 : 10;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-hw + 5, -hh - wThick + 1, wLen, wThick); ctx.fillRect(-hw + 5, hh - 1, wLen, wThick);
      ctx.save(); ctx.translate(hw - 10, -hh - wThick / 2 + 1); ctx.rotate(v.steerVis || 0); ctx.fillRect(-wLen / 2, -wThick / 2, wLen, wThick); ctx.restore();
      ctx.save(); ctx.translate(hw - 10, hh + wThick / 2 - 1); ctx.rotate(v.steerVis || 0); ctx.fillRect(-wLen / 2, -wThick / 2, wLen, wThick); ctx.restore();

      ctx.fillStyle = v.color; ctx.beginPath(); ctx.roundRect(-hw, -hh, sp.w, sp.h, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-hw + 4, -hh + 2, sp.w - 8, 3);

      if (sp.isSWAT) {
        ctx.fillStyle = '#38bdf8'; ctx.font = '900 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SWAT', -6, 0);
      } else if (sp.isPoliceModel) {
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(-9, -hh + 1, 18, sp.h - 2);
      } else if (v.type === 'taxi') {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(-4, -5, 8, 10); ctx.fillStyle = '#facc15'; ctx.fillRect(-2, -3, 4, 6);
      } else if (sp.isEMS) {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-10, -2, 12, 4); ctx.fillRect(-6, -6, 4, 12);
      } else if (v.type === 'sports' || v.type === 'hyper' || sp.isDrift) {
        ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fillRect(-hw + 4, -3, sp.w - 8, 2); ctx.fillRect(-hw + 4, 1, sp.w - 8, 2);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(-hw + 1, -hh + 1, 4, sp.h - 2);
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hw * 0.14, -hh + 3, sp.w * 0.22, sp.h - 6);
      ctx.fillRect(-hw * 0.68, -hh + 3, sp.w * 0.15, sp.h - 6);
      if (sp.isLimo) ctx.fillRect(-hw * 0.35, -hh + 3, sp.w * 0.4, sp.h - 6);

      if (sp.isPoliceModel) {
        const flash = Math.floor(time / 120) % 2 === 0;
        ctx.fillStyle = v.sirenOn ? (flash ? '#ef4444' : '#3b82f6') : '#475569'; ctx.fillRect(sp.isSWAT ? 10 : -2, -7, 4, 7);
        ctx.fillStyle = v.sirenOn ? (flash ? '#3b82f6' : '#ef4444') : '#475569'; ctx.fillRect(sp.isSWAT ? 10 : -2, 0, 4, 7);
      }

      ctx.fillStyle = '#fef9c3'; ctx.fillRect(hw - 2, -hh + 2, 2.5, 4.5); ctx.fillRect(hw - 2, hh - 6.5, 2.5, 4.5);
      const isBraking = v.braking || (pInput && (pInput.down || pInput.drift));
      ctx.fillStyle = isBraking ? '#ff2a2a' : '#7f1d1d'; ctx.fillRect(-hw - 1, -hh + 2, 2.8, 5); ctx.fillRect(-hw - 1, hh - 7, 2.8, 5);
    }

    if (v.isCriminal) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function getRadarBlips() {
    const blips = [];
    if (W.landmarks) {
      for (let i = 0; i < W.landmarks.length; i++) {
        blips.push({ x: W.landmarks[i].x, y: W.landmarks[i].y, color: W.landmarks[i].color, size: 4.4 });
      }
    }
    if (window.GTA.Train) {
      const tBlips = window.GTA.Train.getRadarBlips();
      for (let i = 0; i < tBlips.length; i++) blips.push(tBlips[i]);
    }
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v === player.inVehicle) continue;
      if (v.isPolice && wanted.level > 0) blips.push({ x: v.x, y: v.y, color: '#ef4444', size: 4, pulse: true });
      else if (v.isCriminal) blips.push({ x: v.x, y: v.y, color: '#f97316', size: 5, pulse: true });
      else if (v.spec.isAircraft || v.spec.isHeli) blips.push({ x: v.x, y: v.y, color: '#c084fc', size: 4 });
      else if (v.spec.isBoat) blips.push({ x: v.x, y: v.y, color: '#22d3ee', size: 3.6 });
    }
    if (window.GTA.Police) {
      const pBlips = window.GTA.Police.getRadarBlips();
      for (let i = 0; i < pBlips.length; i++) blips.push(pBlips[i]);
    }
    return blips;
  }

  return {
    WEAPONS: WEAPONS, VEH_TYPES: VEH_TYPES, player: player, vehicles: vehicles, wanted: wanted,
    init: init, update: update, toggleVehicle: toggleVehicle, switchWeapon: switchWeapon,
    spawnVehicle: spawnVehicle, spawnBoatNear: spawnBoatNear,
    resolveWorldCollisions: resolveWorldCollisions, damagePlayer: damagePlayer, triggerExplosion: triggerExplosion,
    addWanted: addWanted, clearWanted: clearWanted, repairCurrentVehicle: repairCurrentVehicle,
    spawnCriminalForMission: spawnCriminalForMission, clearCriminal: clearCriminal,
    spawnParticles: spawnParticles, drawGroundEntities: drawGroundEntities,
    drawFlyingEntities: drawFlyingEntities, getRadarBlips: getRadarBlips
  };
})();
