window.GTA = window.GTA || {};

window.GTA.Activities = (function () {
  const C = window.GTA.Config;
  const TS = C.TILE_SIZE;
  const E = window.GTA.Entities;

  const SAVE_KEY = 'grand_city_25d_save_v1';

  const defaultState = {
    money: 2500,
    xp: 0,
    level: 1,
    soundOn: true,
    timeMode: 'auto', // 'auto' | 'day' | 'night'
    timeOfDay: 11.5,  // 0..24 hodín
    upgrades: { engine: 0, nitro: 0, armor: 0 },
    ownedProps: [],
    collectedBoxes: [],
    stats: { missionsDone: 0, stuntsDone: 0, heistsDone: 0 }
  };

  let state = JSON.parse(JSON.stringify(defaultState));

  // Zoznam nehnuteľností na kúpu (pasívny príjem každých 20 sekúnd + teleport)
  const PROPERTIES = [
    { id: 'villa',     name: 'Vila West Hills',      x: 12 * TS + 90, y: 16 * TS + 90, price: 6000,  income: 350,  desc: 'Tichá vila s bazénom na západe' },
    { id: 'beachclub', name: 'Palm Bay Beach Club',  x: 65 * TS + 90, y: 32 * TS + 90, price: 12000, income: 750,  desc: 'Klub priamo na drevenom móle' },
    { id: 'penthouse', name: 'Downtown Penthouse',   x: 42 * TS + 90, y: 36 * TS + 90, price: 22000, income: 1450, desc: 'Luxusné sídlo v srdci mrakodrapov' },
    { id: 'hangar',    name: 'Letiskový Hangár HQ',  x: 12 * TS + 90, y: 45 * TS + 90, price: 35000, income: 2400, desc: 'Súkromná základňa pri pristávacej dráhe' }
  ];

  // Fixné interaktívne body (POI) na garantovaných cestách a plochách
  const POIS = [
    { id: 'gar_dt',   type: 'garage',  name: 'Garáž & Pay\'n\'Spray (Centrum)', x: 42 * TS + 90, y: 27 * TS + 90, color: '#facc15', icon: '🔧' },
    { id: 'gar_dock', type: 'garage',  name: 'Garáž & Tuning (Prístav)',        x: 42 * TS + 90, y: 58 * TS + 90, color: '#facc15', icon: '🔧' },
    { id: 'heist_1',  type: 'heist',   name: 'Centrálna Banka (Lúpež)',         x: 48 * TS + 90, y: 32 * TS + 90, color: '#ef4444', icon: '💰', reward: 5500 },
    { id: 'heist_2',  type: 'heist',   name: 'Klenotníctvo Northside (Lúpež)',  x: 42 * TS + 90, y: 12 * TS + 90, color: '#ef4444', icon: '💎', reward: 4200 },
    { id: 'race_1',   type: 'race',    name: 'Pouličné preteky Grand City',     x: 32 * TS + 90, y: 32 * TS + 90, color: '#38bdf8', icon: '🏁' },
    { id: 'taxi_hub', type: 'taxi',    name: 'Taxi Dispečing',                  x: 45 * TS + 90, y: 32 * TS + 90, color: '#eab308', icon: '🚕' },
    { id: 'courier',  type: 'courier', name: 'Expres Kuriér (Prístav)',         x: 56 * TS + 90, y: 58 * TS + 90, color: '#22c55e', icon: '📦' },
    { id: 'air_job',  type: 'flight',  name: 'Letecká výzva (Dráha)',           x: 8 * TS + 90,  y: 48 * TS + TS, color: '#c084fc', icon: '✈️' }
  ];

  // Pridanie nehnuteľností do POI zoznamu pre interakciu na mape
  PROPERTIES.forEach(pr => {
    POIS.push({ id: 'prop_' + pr.id, type: 'property', propData: pr, name: pr.name, x: pr.x, y: pr.y, color: '#4ade80', icon: '🏠' });
  });

  // 5 skokanských rámp (stunt jumps!)
  const RAMPS = [
    { x: 46 * TS + 90, y: 32 * TS + 90, angle: 0,       name: 'Downtown Highway Jump' },
    { x: 28 * TS + 90, y: 32 * TS + 90, angle: Math.PI, name: 'Skok cez Veľkú rieku' },
    { x: 61 * TS + 90, y: 32 * TS + 90, angle: 0,       name: 'Palm Bay Pier Launch' },
    { x: 16 * TS + 90, y: 48 * TS + TS, angle: 0,       name: 'Airport Runway Mega Jump' },
    { x: 48 * TS + 90, y: 58 * TS + 90, angle: 0,       name: 'South Docks Container Jump' }
  ];

  // 10 skrytých kufríkov s peniazmi ($1000 každý) po celom ostrove
  const BRIEFCASES = [
    { id: 'b1', x: 66 * TS + 90, y: 32 * TS + 90 }, // Koniec plážového móla
    { id: 'b2', x: 36 * TS + 90, y: 25 * TS + 90 }, // Central Park
    { id: 'b3', x: 20 * TS + 90, y: 48 * TS + TS }, // Koniec letiskovej dráhy
    { id: 'b4', x: 36 * TS + 90, y: 66 * TS + 90 }, // Západné prístavné mólo
    { id: 'b5', x: 48 * TS + 90, y: 66 * TS + 90 }, // Východné prístavné mólo
    { id: 'b6', x: 12 * TS + 90, y: 8 * TS + 90 },  // Sever West Hills
    { id: 'b7', x: 56 * TS + 90, y: 12 * TS + 90 }, // Severovýchod Northside
    { id: 'b8', x: 56 * TS + 90, y: 45 * TS + 90 }, // Pobrežná diaľnica
    { id: 'b9', x: 12 * TS + 90, y: 32 * TS + 90 }, // Západná križovatka
    { id: 'b10', x: 25 * TS + 90, y: 58 * TS + 90 } // Južný most
  ];

  let activeMission = null;
  let incomeTimer = 0;
  let stuntCooldown = 0;
  let notifyFn = null;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign({}, defaultState, parsed);
        state.upgrades = Object.assign({}, defaultState.upgrades, parsed.upgrades || {});
        state.stats = Object.assign({}, defaultState.stats, parsed.stats || {});
      }
    } catch (e) {}
    if (window.GTA.Audio) window.GTA.Audio.setEnabled(state.soundOn);
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function resetSave() {
    state = JSON.parse(JSON.stringify(defaultState));
    activeMission = null;
    E.clearWanted();
    E.clearCriminal();
    save();
    notify('🔄 Uložená pozícia bola resetovaná', '#38bdf8');
  }

  function init(onNotify) {
    notifyFn = onNotify;
    load();
  }

  function notify(msg, color) {
    if (notifyFn) notifyFn(msg, color || '#fff');
  }

  function addMoney(amount, reason) {
    state.money += Math.round(amount);
    addXP(Math.max(15, Math.round(amount * 0.08)));
    if (window.GTA.Audio) window.GTA.Audio.playCash();
    if (reason) notify(`+$${Math.round(amount).toLocaleString()} • ${reason}`, '#4ade80');
    save();
  }

  function spendMoney(amount) {
    if (state.money < amount) {
      notify(`Nedostatok peňazí! Chýba $${(amount - state.money).toLocaleString()}`, '#ef4444');
      if (window.GTA.Audio) window.GTA.Audio.playAlert();
      return false;
    }
    state.money -= amount;
    save();
    return true;
  }

  function addXP(pts) {
    state.xp += pts;
    const needed = state.level * 500;
    if (state.xp >= needed) {
      state.xp -= needed;
      state.level++;
      notify(`⭐ LEVEL UP! Dosiahol si úroveň ${state.level}`, '#facc15');
      if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    }
  }

  // Spustenie jedného zo 6 typov misií
  function startMission(type, poi) {
    E.clearCriminal();
    const roadSpots = [
      { x: 42 * TS + 90, y: 12 * TS + 90, name: 'Northside' },
      { x: 56 * TS + 90, y: 32 * TS + 90, name: 'Palm Bay' },
      { x: 12 * TS + 90, y: 32 * TS + 90, name: 'West Hills' },
      { x: 12 * TS + 90, y: 12 * TS + 90, name: 'Horné West Hills' },
      { x: 42 * TS + 90, y: 58 * TS + 90, name: 'South Docks' },
      { x: 56 * TS + 90, y: 58 * TS + 90, name: 'Východný prístav' },
      { x: 12 * TS + 90, y: 45 * TS + 90, name: 'Letisko' }
    ];
    const farSpots = roadSpots.filter(s => Math.hypot(s.x - E.player.x, s.y - E.player.y) > 1600);
    const dest = farSpots[Math.floor(Math.random() * farSpots.length)] || roadSpots[0];

    if (type === 'taxi') {
      activeMission = {
        type: 'taxi', title: '🚕 Taxi Jazda',
        desc: `Odvez pasažiera do štvrte ${dest.name}`,
        targetX: dest.x, targetY: dest.y, timer: 55, reward: 1400
      };
    } else if (type === 'courier') {
      activeMission = {
        type: 'courier', title: '📦 Expres Kuriér',
        desc: `Doruč urgentný balík do ${dest.name}`,
        targetX: dest.x, targetY: dest.y, timer: 50, reward: 1850
      };
    } else if (type === 'race') {
      const cps = [
        { x: 42 * TS + 90, y: 32 * TS + 90 },
        { x: 56 * TS + 90, y: 32 * TS + 90 },
        { x: 56 * TS + 90, y: 12 * TS + 90 },
        { x: 42 * TS + 90, y: 12 * TS + 90 },
        { x: 12 * TS + 90, y: 12 * TS + 90 },
        { x: 12 * TS + 90, y: 32 * TS + 90 }
      ];
      activeMission = {
        type: 'race', title: '🏁 Grand City Street Race',
        desc: 'Prejdi všetkými 6 checkpointmi!',
        checkpoints: cps, step: 0,
        targetX: cps[0].x, targetY: cps[0].y, timer: 85, reward: 3500
      };
    } else if (type === 'heist') {
      const rew = (poi && poi.reward) ? poi.reward : 5000;
      activeMission = {
        type: 'heist', title: '💰 Lúpež Trezoru',
        desc: 'Drž pozíciu 4 sekundy pri trezore!',
        stage: 'crack', progress: 0,
        targetX: poi ? poi.x : E.player.x, targetY: poi ? poi.y : E.player.y,
        timer: 95, reward: rew
      };
    } else if (type === 'vigilante') {
      const crim = E.spawnCriminalForMission();
      activeMission = {
        type: 'vigilante', title: '🚨 Policajná Hliadka',
        desc: 'Dostihni a vytlač z cesty označené čierne auto!',
        crimVeh: crim, crimHp: 100,
        targetX: crim.x, targetY: crim.y, timer: 90, reward: 2800
      };
    } else if (type === 'flight') {
      const rings = [
        { x: 25 * TS + 90, y: 48 * TS + 90 },
        { x: 42 * TS + 90, y: 36 * TS + 90 },
        { x: 64 * TS + 90, y: 32 * TS + 90 },
        { x: 42 * TS + 90, y: 20 * TS + 90 },
        { x: 14 * TS + 90, y: 48 * TS + TS }
      ];
      activeMission = {
        type: 'flight', title: '✈️ Letecké Kruhy nad mestom',
        desc: 'Vzlietni stíhačkou a preleť cez 5 vzdušných kruhov!',
        checkpoints: rings, step: 0,
        targetX: rings[0].x, targetY: rings[0].y, timer: 95, reward: 4500
      };
    }

    if (activeMission) {
      notify(`Misia spustená: ${activeMission.title}`, '#38bdf8');
      if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    }
  }

  function cancelMission() {
    activeMission = null;
    E.clearCriminal();
    notify('Misia zrušená', '#94a3b8');
  }

  function onCriminalHit(veh, impact) {
    if (!activeMission || activeMission.type !== 'vigilante' || activeMission.crimVeh !== veh) return;
    activeMission.crimHp -= impact * 4.5;
    if (activeMission.crimHp <= 0) {
      E.spawnParticles(veh.x, veh.y, '#f97316', 24, 6);
      E.clearCriminal();
      finishMission();
    } else {
      notify(`Zločinec zasiahnutý! Zostáva ${Math.max(1, Math.round(activeMission.crimHp))}%`, '#f97316');
    }
  }

  function finishMission() {
    if (!activeMission) return;
    const m = activeMission;
    const timeBonus = Math.max(0, Math.round(m.timer * 15));
    state.stats.missionsDone++;
    if (m.type === 'heist') state.stats.heistsDone++;
    addMoney(m.reward + timeBonus, `${m.title} (+$${timeBonus} časový bonus)`);
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    activeMission = null;
  }

  // Nákup nehnuteľností, garážové vylepšenia a objednávanie áut cez Mobil
  function buyProperty(propId) {
    const pr = PROPERTIES.find(p => p.id === propId);
    if (!pr) return false;
    if (state.ownedProps.includes(pr.id)) {
      notify('Túto nehnuteľnosť už vlastníš!', '#facc15');
      return false;
    }
    if (!spendMoney(pr.price)) return false;
    state.ownedProps.push(pr.id);
    save();
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    notify(`🏠 Kúpil si ${pr.name}! (+$${pr.income} / 20s)`, '#4ade80');
    return true;
  }

  function teleportToProperty(propId) {
    const pr = PROPERTIES.find(p => p.id === propId);
    if (!pr) return;
    if (E.player.inVehicle) {
      E.player.inVehicle.x = pr.x;
      E.player.inVehicle.y = pr.y;
      E.player.inVehicle.vx = 0; E.player.inVehicle.vy = 0;
      E.player.inVehicle.altitude = 0;
    }
    E.player.x = pr.x;
    E.player.y = pr.y;
    notify(`📍 Rýchly presun: ${pr.name}`, '#38bdf8');
  }

  function buyUpgrade(key) {
    const cur = state.upgrades[key] || 0;
    if (cur >= 3) { notify('Maximálny level vylepšenia!', '#facc15'); return false; }
    const cost = (cur + 1) * 1800;
    if (!spendMoney(cost)) return false;
    state.upgrades[key] = cur + 1;
    save();
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    notify(`🔧 Vylepšenie ${key.toUpperCase()} na úroveň ${cur + 1}!`, '#38bdf8');
    return true;
  }

  function paintVehicle(color, underglow) {
    const v = E.player.inVehicle;
    if (!v) { notify('Musíš sedieť v aute!', '#ef4444'); return false; }
    if (!spendMoney(350)) return false;
    if (color) v.color = color;
    if (underglow !== undefined) v.underglow = underglow;
    E.repairCurrentVehicle();
    E.clearWanted();
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    notify('🎨 Nový lak + oprava + polícia stratená!', '#4ade80');
    return true;
  }

  function orderVehicle(typeKey) {
    const spec = E.VEH_TYPES[typeKey];
    if (!spec) return false;
    if (!spendMoney(spec.price)) return false;
    const ang = E.player.angle;
    const sx = E.player.x + Math.cos(ang) * 75;
    const sy = E.player.y + Math.sin(ang) * 75;
    const v = E.spawnVehicle(typeKey, sx, sy, ang, { isPersistent: true });
    if (E.player.inVehicle) E.player.inVehicle.isAI = false;
    E.player.inVehicle = v;
    E.player.x = v.x; E.player.y = v.y;
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    notify(`🔑 Doručené vozidlo: ${spec.name}!`, '#38bdf8');
    return true;
  }

  function getNearbyPOI(x, y) {
    for (let i = 0; i < POIS.length; i++) {
      if (Math.hypot(POIS[i].x - x, POIS[i].y - y) < 88) return POIS[i];
    }
    return null;
  }

  function getTotalPassiveIncome() {
    let sum = 0;
    for (let i = 0; i < PROPERTIES.length; i++) {
      if (state.ownedProps.includes(PROPERTIES[i].id)) sum += PROPERTIES[i].income;
    }
    return sum;
  }

  function update(dt) {
    const sec = dt / 60;

    // 1. Cyklus dňa a noci (1 herný deň = cca 4 minúty)
    if (state.timeMode === 'auto') {
      state.timeOfDay = (state.timeOfDay + sec * 0.1) % 24;
    } else if (state.timeMode === 'day') {
      state.timeOfDay = 13;
    } else if (state.timeMode === 'night') {
      state.timeOfDay = 23.5;
    }

    // 2. Pasívny príjem z nehnuteľností každých 20 sekúnd
    const passive = getTotalPassiveIncome();
    if (passive > 0) {
      incomeTimer += sec;
      if (incomeTimer >= 20) {
        incomeTimer = 0;
        addMoney(passive, 'Pasívny príjem z nehnuteľností');
      }
    }

    // 3. Zber skrytých kufríkov s peniazmi
    for (let i = 0; i < BRIEFCASES.length; i++) {
      const b = BRIEFCASES[i];
      if (state.collectedBoxes.includes(b.id)) continue;
      if (Math.hypot(E.player.x - b.x, E.player.y - b.y) < 42) {
        state.collectedBoxes.push(b.id);
        addMoney(1000, `Skrytý kufrík (${state.collectedBoxes.length}/${BRIEFCASES.length})`);
      }
    }

    // 4. Skokanské rampy (Stunt Jumps)
    if (stuntCooldown > 0) stuntCooldown -= sec;
    if (E.player.inVehicle && !E.player.inVehicle.spec.isAircraft && stuntCooldown <= 0) {
      const v = E.player.inVehicle;
      const spd = Math.hypot(v.vx, v.vy);
      if (spd > 7.5 && v.jumpZ < 2) {
        for (let i = 0; i < RAMPS.length; i++) {
          const r = RAMPS[i];
          if (Math.hypot(v.x - r.x, v.y - r.y) < 46) {
            v.jumpVz = Math.min(9.5, spd * 0.62);
            stuntCooldown = 3.5;
            state.stats.stuntsDone++;
            const bonus = Math.round(spd * 45);
            if (window.GTA.Audio) window.GTA.Audio.playJump();
            addMoney(bonus, `STUNT SKOK: ${r.name}`);
            break;
          }
        }
      }
    }

    // 5. Priebeh aktívnej misie
    if (activeMission) {
      const m = activeMission;
      m.timer -= sec;
      if (m.timer <= 0) {
        notify(`⏱️ Čas vypršal! ${m.title} zlyhala.`, '#ef4444');
        if (window.GTA.Audio) window.GTA.Audio.playAlert();
        E.clearCriminal();
        activeMission = null;
        return;
      }

      if (m.type === 'vigilante' && m.crimVeh) {
        m.targetX = m.crimVeh.x;
        m.targetY = m.crimVeh.y;
      } else if (m.type === 'heist') {
        if (m.stage === 'crack') {
          if (Math.hypot(E.player.x - m.targetX, E.player.y - m.targetY) < 95) {
            m.progress += sec;
            m.desc = `Otváram trezor... ${Math.min(100, Math.round((m.progress / 4) * 100))}%`;
            if (m.progress >= 4) {
              m.stage = 'escape';
              m.desc = '🚨 Trezor je tvoj! Zbav sa 3-hviezdičkovej polície!';
              E.addWanted(3);
              notify('🚨 ALARM! Polícia ide po tebe – uteč z ich dosahu!', '#ef4444');
            }
          } else {
            m.desc = 'Zostaň v červenom kruhu pri trezore!';
          }
        } else if (m.stage === 'escape') {
          m.targetX = null; m.targetY = null;
          if (E.wanted.level === 0) {
            finishMission();
          }
        }
      } else {
        // Dosiahnutie cieľa / checkpointu
        const dist = Math.hypot(E.player.x - m.targetX, E.player.y - m.targetY);
        const radius = m.type === 'flight' ? 120 : 82;
        if (dist < radius) {
          if (m.type === 'flight' && (!E.player.inVehicle || !E.player.inVehicle.spec.isAircraft || E.player.inVehicle.altitude < 0.25)) {
            m.desc = 'Vzlietni stíhačkou nad zem a preleť kruhom!';
          } else if (m.checkpoints) {
            m.step++;
            if (window.GTA.Audio) window.GTA.Audio.playCash();
            if (m.step >= m.checkpoints.length) {
              finishMission();
            } else {
              m.targetX = m.checkpoints[m.step].x;
              m.targetY = m.checkpoints[m.step].y;
              m.desc = `Checkpoint ${m.step + 1} / ${m.checkpoints.length}`;
              m.timer += 10;
            }
          } else {
            finishMission();
          }
        }
      }
    }
  }

  // Úroveň tmy pre cyklus dňa a noci (0 = poludnie, 0.52 = hlboká noc)
  function getDarknessAlpha() {
    const h = state.timeOfDay;
    if (h >= 7 && h <= 18) return 0;
    if (h > 18 && h < 21) return ((h - 18) / 3) * 0.48;
    if (h >= 21 || h <= 4) return 0.48;
    return ((7 - h) / 3) * 0.48;
  }

  function getClockString() {
    const hh = Math.floor(state.timeOfDay);
    const mm = Math.floor((state.timeOfDay - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // Vykreslenie značiek, rámp, kufríkov a cieľov misií priamo na vozovke
  function drawWorldMarkers(ctx, cam, vw, vh, zoom, time) {
    const halfW = (vw / 2) / zoom + 160;
    const halfH = (vh / 2) / zoom + 160;
    const pulse = 0.85 + Math.sin(time * 0.006) * 0.15;

    // 1. Skokanské rampy
    for (let i = 0; i < RAMPS.length; i++) {
      const r = RAMPS[i];
      if (Math.abs(r.x - cam.x) > halfW || Math.abs(r.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-34, -22, 68, 44);
      ctx.fillStyle = '#facc15';
      for (let s = -22; s <= 18; s += 16) {
        ctx.beginPath();
        ctx.moveTo(s, -14); ctx.lineTo(s + 10, 0); ctx.lineTo(s, 14);
        ctx.lineTo(s + 5, 14); ctx.lineTo(s + 15, 0); ctx.lineTo(s + 5, -14);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Skryté kufríky s peniazmi
    for (let i = 0; i < BRIEFCASES.length; i++) {
      const b = BRIEFCASES[i];
      if (state.collectedBoxes.includes(b.id)) continue;
      if (Math.abs(b.x - cam.x) > halfW || Math.abs(b.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
      ctx.beginPath(); ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-10, -7, 20, 14);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -7, 20, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      ctx.restore();
    }

    // 3. POI zóny (Garáže, Banky, Misie, Nehnuteľnosti)
    for (let i = 0; i < POIS.length; i++) {
      const p = POIS[i];
      if (Math.abs(p.x - cam.x) > halfW || Math.abs(p.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 36 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = p.color + '28';
      ctx.beginPath(); ctx.arc(0, 0, 36 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.font = '22px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, 0);
      ctx.restore();
    }

    // 4. Cieľ aktívnej misie
    if (activeMission && activeMission.targetX != null) {
      const tx = activeMission.targetX, ty = activeMission.targetY;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 52 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.24)';
      ctx.beginPath(); ctx.arc(0, 0, 52 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // GPS šípka okolo stredu obrazovky smerujúca k cieľu aktívnej misie
  function drawGPSArrow(ctx, vw, vh) {
    if (!activeMission || activeMission.targetX == null) return;
    const dx = activeMission.targetX - E.player.x;
    const dy = activeMission.targetY - E.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 260) return;

    const ang = Math.atan2(dy, dx);
    const rad = Math.min(vw, vh) * 0.28;
    const ax = vw / 2 + Math.cos(ang) * rad;
    const ay = vh / 2 + Math.sin(ang) * rad;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#facc15';
    ctx.font = '800 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(dist / 10)}m`, ax, ay + 20);
  }

  function getRadarBlips() {
    const blips = [];
    for (let i = 0; i < POIS.length; i++) {
      const p = POIS[i];
      blips.push({ x: p.x, y: p.y, color: p.color, size: 4.5, label: p.icon });
    }
    if (activeMission && activeMission.targetX != null) {
      blips.push({ x: activeMission.targetX, y: activeMission.targetY, color: '#facc15', size: 6.5, pulse: true });
    }
    return blips;
  }

  return {
    PROPERTIES, POIS, BRIEFCASES,
    get state() { return state; },
    get activeMission() { return activeMission; },
    init, save, resetSave, update,
    addMoney, spendMoney, startMission, cancelMission, onCriminalHit,
    buyProperty, teleportToProperty, buyUpgrade, paintVehicle, orderVehicle,
    getNearbyPOI, getTotalPassiveIncome, getDarknessAlpha, getClockString,
    drawWorldMarkers, drawGPSArrow, getRadarBlips
  };
})();
