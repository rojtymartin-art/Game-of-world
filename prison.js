window.GTA = window.GTA || {};

window.GTA.Prison = (function () {
  const C = window.GTA.Config;
  const TS = C.TILE_SIZE;

  const CENTER_X = 18.5 * TS;
  const CENTER_Y = 18.5 * TS;

  const SPOTS = {
    workshop: { id: 'workshop', x: CENTER_X - 240, y: CENTER_Y - 170, r: 44, icon: '🔧', label: 'Dielňa (Získať páčidlo)' },
    gym:      { id: 'gym',      x: CENTER_X - 240, y: CENTER_Y + 170, r: 44, icon: '🏋️', label: 'Posilňovňa (Skrátiť trest / Páska)' },
    gate:     { id: 'gate',     x: CENTER_X + 265, y: CENTER_Y + 10,  r: 46, icon: '🚧', label: 'Vypáčiť bránu k mólu' },
    dock:     { id: 'dock',     x: CENTER_X + 430, y: CENTER_Y + 210, r: 52, icon: '🚤', label: 'Nastúpiť do únikového člna' }
  };

  const state = {
    inPrison: false,
    sentenceTimer: 45,
    step: 0,
    hasCrowbar: false,
    gateOpen: false,
    workProgress: 0,
    activeWorkId: null,
    alarm: false,
    alarmTimer: 0
  };

  const guards = [
    { x: CENTER_X - 90, y: CENTER_Y - 120, a: 0, dir: 1, range: 210, speed: 1.4, patrolX: [CENTER_X - 150, CENTER_X + 90], cd: 30 },
    { x: CENTER_X + 80, y: CENTER_Y + 130, a: Math.PI, dir: -1, range: 210, speed: 1.4, patrolX: [CENTER_X - 120, CENTER_X + 140], cd: 45 }
  ];

  const spotlights = [
    { x: CENTER_X - 540, y: CENTER_Y - 540, angle: 0.4, speed: 0.014, len: 560, spread: 0.24 },
    { x: CENTER_X + 540, y: CENTER_Y + 540, angle: 3.5, speed: -0.012, len: 560, spread: 0.24 }
  ];

  let escapeBoat = null;

  function isOnAlcatrazIsland(wx, wy) {
    return Math.hypot(wx - CENTER_X, wy - CENTER_Y) < 1150;
  }

  function enterPrison(entities, notify, stars) {
    state.inPrison = true;
    state.sentenceTimer = 35 + Math.max(0, (stars || 3) - 3) * 15;
    state.step = 0;
    state.hasCrowbar = false;
    state.gateOpen = false;
    state.workProgress = 0;
    state.activeWorkId = null;
    state.alarm = false;
    state.alarmTimer = 0;

    entities.clearWanted();
    entities.player.inVehicle = null;
    entities.player.isSwimming = false;
    entities.player.hp = 100;
    entities.player.rockets = 0;
    entities.player.weapon = 'smg';
    entities.player.outfitColor = '#f97316';

    entities.player.x = CENTER_X - 40;
    entities.player.y = CENTER_Y + 20;

    escapeBoat = entities.spawnBoatNear('jetski', 24, 25, 0.8);
    if (notify) notify('🔒 ALCATRAZ! Získaj páčidlo v dielni/posilňovni a vyhni sa svetlometom!', '#f97316');
  }

  function releaseFromPrison(entities, activities, notify, escaped) {
    state.inPrison = false;
    state.activeWorkId = null;
    state.workProgress = 0;
    state.alarm = false;
    entities.player.outfitColor = (activities && activities.state.outfitColor) || '#38bdf8';

    if (escaped) {
      entities.addWanted(4);
      if (activities) activities.addMoney(450, 'Úspešný útek z Alcatrazu!');
      if (notify) notify('🚨 ÚTEK Z ALCATRAZU! Okamžité 4★ – polícia ťa hľadá!', '#ef4444');
    } else {
      const lspd = window.GTA.World.landmarks.find(l => l.id === 'police');
      entities.player.x = lspd ? lspd.x : 70 * TS + 90;
      entities.player.y = lspd ? lspd.y : 94 * TS + 90;
      entities.player.hp = 100;
      if (notify) notify('✅ Odsedel si si trest v Alcatraze a bol si prepustený.', '#4ade80');
    }
  }

  function startSpotAction(spotId, entities, activities, notify) {
    if (!state.inPrison) return false;

    if (spotId === 'workshop' || spotId === 'gym') {
      if (state.hasCrowbar && spotId === 'workshop') {
        if (notify) notify('🔧 Páčidlo už máš! Choď k východnej bráne (🚧).', '#facc15');
        return true;
      }
      if (spotId === 'gym' && state.hasCrowbar) {
        state.sentenceTimer = Math.max(1, state.sentenceTimer - 12);
        if (notify) notify('🏋️ Tréning v posilňovni skrátil trest o 12s!', '#4ade80');
        return true;
      }
      state.activeWorkId = spotId;
      state.workProgress = 0;
      if (notify) notify('⏳ Pracuj v pokoji (3s) – nevojdi do svetlometov ani pred dozorcov!', '#38bdf8');
      return true;
    }

    if (spotId === 'gate') {
      if (state.gateOpen) {
        state.step = 3;
        if (notify) notify('🚤 Brána je otvorená! Bež na mólo k únikovému člnu!', '#4ade80');
        return true;
      }
      if (!state.hasCrowbar) {
        if (notify) notify('🔒 Brána je zamknutá! Najprv získaj páčidlo v dielni (🔧).', '#ef4444');
        return true;
      }
      state.activeWorkId = 'gate';
      state.workProgress = 0;
      if (notify) notify('🔓 Páčim zámok brány (3.5s)...', '#facc15');
      return true;
    }

    if (spotId === 'dock') {
      if (!state.gateOpen) {
        if (notify) notify('🚧 Najprv vypáč bránu (🚧) na východnej strane dvora!', '#f97316');
        return true;
      }
      if (escapeBoat && escapeBoat.hp > 0) {
        entities.player.x = escapeBoat.x;
        entities.player.y = escapeBoat.y;
        entities.player.inVehicle = escapeBoat;
      }
      releaseFromPrison(entities, activities, notify, true);
      return true;
    }

    return false;
  }

  function getNearbySpot(px, py) {
    if (!state.inPrison) return null;
    const keys = Object.keys(SPOTS);
    for (let i = 0; i < keys.length; i++) {
      const s = SPOTS[keys[i]];
      if (s.id === 'gate' && state.gateOpen) continue;
      if (Math.hypot(px - s.x, py - s.y) < s.r + 14) return s;
    }
    return null;
  }

  function update(dt, entities, activities, callbacks) {
    if (!state.inPrison) return;
    const sec = dt / 60;
    const p = entities.player;

    state.sentenceTimer -= sec;
    if (state.sentenceTimer <= 0) {
      releaseFromPrison(entities, activities, callbacks ? callbacks.onNotify : null, false);
      return;
    }

    if (state.alarm) {
      state.alarmTimer -= sec;
      if (state.alarmTimer <= 0) state.alarm = false;
    }

    for (let i = 0; i < spotlights.length; i++) {
      const sp = spotlights[i];
      sp.angle += sp.speed * dt;
      const dx = p.x - sp.x, dy = p.y - sp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < sp.len) {
        const angToP = Math.atan2(dy, dx);
        let diff = angToP - sp.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < sp.spread) {
          state.alarm = true;
          state.alarmTimer = 5.0;
          state.activeWorkId = null;
          state.workProgress = 0;
          entities.damagePlayer(0.28 * dt, callbacks);
          if (Math.random() < 0.04 * dt && callbacks && callbacks.onNotify) {
            callbacks.onNotify('🚨 SVETLOMET ŤA OSVIETIL! Poplach v Alcatraze!', '#ef4444');
          }
        }
      }
    }

    for (let i = 0; i < guards.length; i++) {
      const g = guards[i];
      g.x += g.dir * g.speed * dt;
      if (g.x < g.patrolX[0]) { g.x = g.patrolX[0]; g.dir = 1; }
      if (g.x > g.patrolX[1]) { g.x = g.patrolX[1]; g.dir = -1; }
      g.a = g.dir > 0 ? 0 : Math.PI;

      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < 36) {
        state.activeWorkId = null;
        state.workProgress = 0;
        p.x = CENTER_X - 40;
        p.y = CENTER_Y + 20;
        entities.damagePlayer(12, callbacks);
        if (window.GTA.Audio) window.GTA.Audio.playAlert();
        if (callbacks && callbacks.onNotify) callbacks.onNotify('👮 Dozorca ťa chytil a vrátil na dvor!', '#ef4444');
      } else if (d < g.range && state.alarm) {
        g.cd -= dt;
        if (g.cd <= 0) { g.cd = 55; entities.damagePlayer(5, callbacks); }
      }
    }

    if (state.activeWorkId) {
      const sp = SPOTS[state.activeWorkId];
      if (!sp || Math.hypot(p.x - sp.x, p.y - sp.y) > sp.r + 28) {
        state.activeWorkId = null;
        state.workProgress = 0;
      } else {
        const dur = (state.activeWorkId === 'gate') ? 3.5 : 3.0;
        state.workProgress += sec / dur;
        if (state.workProgress >= 1) {
          const doneId = state.activeWorkId;
          state.activeWorkId = null;
          state.workProgress = 0;

          if (doneId === 'workshop' || doneId === 'gym') {
            state.hasCrowbar = true;
            state.step = 2;
            if (window.GTA.Audio) window.GTA.Audio.playSuccess();
            if (callbacks && callbacks.onNotify) callbacks.onNotify('🔧 Získal si páčidlo! Choď k bráne (🚧) vpravo!', '#4ade80');
          } else if (doneId === 'gate') {
            state.gateOpen = true;
            state.step = 3;
            if (window.GTA.Audio) window.GTA.Audio.playSuccess();
            if (callbacks && callbacks.onNotify) callbacks.onNotify('🔓 Brána otvorená! Bež na mólo k člnu (🚤)!', '#4ade80');
          }
        }
      }
    }

    if (state.gateOpen && !isOnAlcatrazIsland(p.x, p.y)) {
      releaseFromPrison(entities, activities, callbacks ? callbacks.onNotify : null, true);
    }
  }

  function drawWorldOverlay(ctx, cam, vw, vh, zoom, time) {
    const halfW = (vw / 2) / zoom + 650, halfH = (vh / 2) / zoom + 650;
    if (Math.abs(CENTER_X - cam.x) > halfW || Math.abs(CENTER_Y - cam.y) > halfH) return;

    ctx.save();
    const pulse = 0.86 + Math.sin(time * 0.006) * 0.14;

    const keys = Object.keys(SPOTS);
    for (let i = 0; i < keys.length; i++) {
      const s = SPOTS[keys[i]];
      if (s.id === 'gate' && state.gateOpen) continue;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.22)';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.icon, s.x, s.y);

      if (state.activeWorkId === s.id) {
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.workProgress);
        ctx.stroke();
      }
    }

    for (let i = 0; i < guards.length; i++) {
      const g = guards[i];
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.a);
      ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < spotlights.length; i++) {
      const sp = spotlights[i];
      const grad = ctx.createRadialGradient(sp.x, sp.y, 10, sp.x, sp.y, sp.len);
      grad.addColorStop(0, state.alarm ? 'rgba(239, 68, 68, 0.36)' : 'rgba(254, 249, 195, 0.24)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.arc(sp.x, sp.y, sp.len, sp.angle - sp.spread, sp.angle + sp.spread);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    CENTER_X: CENTER_X, CENTER_Y: CENTER_Y,
    get state() { return state; },
    enterPrison: enterPrison, getNearbySpot: getNearbySpot,
    startSpotAction: startSpotAction, update: update, drawWorldOverlay: drawWorldOverlay
  };
})();
