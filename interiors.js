window.GTA = window.GTA || {};

window.GTA.Interiors = (function () {
  const C = window.GTA.Config;
  const W = window.GTA.World;
  const E = window.GTA.Entities;

  const OUTFITS = [
    { id: 'cyan',   name: 'Street Cyan',    color: '#38bdf8', price: 0 },
    { id: 'crimson',name: 'Outlaw Crimson', color: '#ef4444', price: 350 },
    { id: 'gold',   name: 'VIP Gold',       color: '#facc15', price: 750 },
    { id: 'emerald',name: 'Syndicate Mint', color: '#34d399', price: 550 },
    { id: 'violet', name: 'Night Phantom',  color: '#a855f7', price: 650 }
  ];

  const ROOMS = {
    bank: {
      id: 'bank', title: '🏦 Grand Bank – Trezor',
      w: 760, h: 520, bg: '#1e293b', floor: '#334155', wall: '#0f172a', accent: '#facc15',
      spawnX: 380, spawnY: 435,
      rects: [
        { x: 110, y: 150, w: 150, h: 55, col: '#475569' },
        { x: 500, y: 150, w: 150, h: 55, col: '#475569' },
        { x: 295, y: 80,  w: 170, h: 85, col: '#0f172a', border: '#facc15' }
      ],
      spots: [
        { id: 'vault', x: 380, y: 195, r: 34, icon: '💰', label: 'Vylúpiť trezor ($2 200)' },
        { id: 'exit',  x: 380, y: 478, r: 34, icon: '🚪', label: 'Vyjsť z banky' }
      ]
    },
    ammu: {
      id: 'ammu', title: '🔫 Ammu-Nation',
      w: 680, h: 480, bg: '#18181b', floor: '#27272a', wall: '#09090b', accent: '#ef4444',
      spawnX: 340, spawnY: 400,
      rects: [
        { x: 110, y: 120, w: 460, h: 42, col: '#3f3f46', border: '#ef4444' },
        { x: 90,  y: 220, w: 44,  h: 130, col: '#52525b' },
        { x: 546, y: 220, w: 44,  h: 130, col: '#52525b' }
      ],
      spots: [
        { id: 'ammu_shop', x: 340, y: 190, r: 36, icon: '🔫', label: 'Zbrojársky pult' },
        { id: 'exit',      x: 340, y: 438, r: 34, icon: '🚪', label: 'Vyjsť von' }
      ]
    },
    burger: {
      id: 'burger', title: '🍔 Burger Shot',
      w: 680, h: 480, bg: '#29150c', floor: '#451a03', wall: '#1c0a04', accent: '#f97316',
      spawnX: 340, spawnY: 400,
      rects: [
        { x: 150, y: 110, w: 380, h: 46, col: '#dc2626', border: '#facc15' },
        { x: 130, y: 240, w: 95,  h: 46, col: '#78350f' },
        { x: 455, y: 240, w: 95,  h: 46, col: '#78350f' },
        { x: 130, y: 330, w: 95,  h: 46, col: '#78350f' },
        { x: 455, y: 330, w: 95,  h: 46, col: '#78350f' }
      ],
      spots: [
        { id: 'food_menu', x: 340, y: 182, r: 36, icon: '🍔', label: 'Objednať jedlo' },
        { id: 'exit',      x: 340, y: 438, r: 34, icon: '🚪', label: 'Vyjsť von' }
      ]
    },
    casino: {
      id: 'casino', title: '🎰 Royal Casino',
      w: 780, h: 540, bg: '#1e0b36', floor: '#2e1065', wall: '#0f051d', accent: '#facc15',
      spawnX: 390, spawnY: 455,
      rects: [
        { x: 120, y: 130, w: 180, h: 60, col: '#4c1d95', border: '#facc15' },
        { x: 480, y: 130, w: 180, h: 60, col: '#065f46', border: '#34d399' },
        { x: 290, y: 280, w: 200, h: 50, col: '#581c87', border: '#e879f9' }
      ],
      spots: [
        { id: 'slots',     x: 210, y: 215, r: 36, icon: '🎰', label: 'Hracie automaty' },
        { id: 'blackjack', x: 570, y: 215, r: 36, icon: '🃏', label: 'Blackjack 21' },
        { id: 'exit',      x: 390, y: 498, r: 34, icon: '🚪', label: 'Vyjsť z kasína' }
      ]
    },
    home: {
      id: 'home', title: '🏠 Tvoj Byt',
      w: 640, h: 460, bg: '#172033', floor: '#1e293b', wall: '#0b1120', accent: '#38bdf8',
      spawnX: 320, spawnY: 380,
      rects: [
        { x: 85,  y: 95,  w: 130, h: 75, col: '#1d4ed8', border: '#93c5fd' },
        { x: 430, y: 95,  w: 145, h: 48, col: '#334155', border: '#38bdf8' },
        { x: 455, y: 235, w: 110, h: 95, col: '#0f766e', border: '#5eead4' }
      ],
      spots: [
        { id: 'bed',      x: 150, y: 195, r: 34, icon: '🛏️', label: 'Vyspať sa (+8h / Uložiť)' },
        { id: 'wardrobe', x: 505, y: 168, r: 34, icon: '👕', label: 'Šatník / Oblečenie' },
        { id: 'exit',     x: 320, y: 418, r: 34, icon: '🚪', label: 'Vyjsť na ulicu' }
      ]
    },
    area51_lab: {
      id: 'area51_lab', title: '👽 AREA 51 – Tajný Komplex',
      w: 820, h: 560, bg: '#051510', floor: '#0a241c', wall: '#020c09', accent: '#4ade80',
      spawnX: 410, spawnY: 475,
      rects: [
        { x: 120, y: 140, w: 150, h: 90, col: '#064e3b', border: '#4ade80' },
        { x: 550, y: 140, w: 150, h: 90, col: '#064e3b', border: '#4ade80' },
        { x: 310, y: 110, w: 200, h: 110, col: '#0f172a', border: '#22c55e' },
        { x: 180, y: 310, w: 120, h: 44, col: '#1e293b', border: '#10b981' },
        { x: 520, y: 310, w: 120, h: 44, col: '#1e293b', border: '#10b981' }
      ],
      spots: [
        { id: 'u51_artifact', x: 410, y: 245, r: 38, icon: '🛸', label: 'Ukradnúť záhadný artefakt ($3 500 + 4★)' },
        { id: 'exit',         x: 410, y: 515, r: 36, icon: '🚪', label: 'Vyjsť z Area 51' }
      ]
    }
  };

  let currentRoom = null;
  let returnPos = { x: W.spawnX, y: W.spawnY };
  let px = 320, py = 320, pAngle = -Math.PI / 2, walkT = 0;
  let robTimer = 0, robCooldown = 0, artifactCooldown = 0;
  let guards = [], bullets = [], onRoomEvent = null;

  function isInside() { return currentRoom !== null; }
  function getCurrentRoom() { return currentRoom; }

  function getNearbyDoor(wx, wy) {
    if (currentRoom || !W.landmarks) return null;
    for (let i = 0; i < W.landmarks.length; i++) {
      const lm = W.landmarks[i];
      if (!lm.enterable) continue;
      if (Math.hypot(wx - lm.x, wy - lm.y) < 48) return lm;
    }
    return null;
  }

  function enter(roomId, doorX, doorY, notify, eventHandler) {
    const mappedId = (roomId === 'area51') ? 'area51_lab' : roomId;
    const r = ROOMS[mappedId];
    if (!r) return false;
    returnPos = { x: doorX, y: doorY + 24 };
    currentRoom = r;
    onRoomEvent = eventHandler || null;
    px = r.spawnX; py = r.spawnY; pAngle = -Math.PI / 2;
    robTimer = 0; bullets = []; guards = [];

    if (mappedId === 'bank') {
      guards.push({ x: 240, y: 255, vx: 1.5, vy: 0, hp: 70, cd: 35, alert: false });
      guards.push({ x: 520, y: 295, vx: -1.5, vy: 0, hp: 70, cd: 50, alert: false });
    } else if (mappedId === 'area51_lab') {
      guards.push({ x: 250, y: 265, vx: 1.8, vy: 0, hp: 85, cd: 30, alert: true });
      guards.push({ x: 560, y: 265, vx: -1.8, vy: 0, hp: 85, cd: 42, alert: true });
      guards.push({ x: 410, y: 365, vx: 1.4, vy: 0, hp: 85, cd: 55, alert: true });
    }

    if (notify) notify(`Vstúpil si: ${r.title}`, r.accent);
    return true;
  }

  function exit(notify) {
    if (!currentRoom) return;
    const isU51 = currentRoom.id === 'area51_lab';
    currentRoom = null;
    onRoomEvent = null;
    E.player.x = returnPos.x; E.player.y = returnPos.y;
    E.player.inVehicle = null;
    if (notify) notify(isU51 ? '👽 Opustil si tajný komplex Area 51' : 'Vyšiel si von', '#38bdf8');
  }

  function forceExit() {
    if (!currentRoom) return;
    currentRoom = null;
    onRoomEvent = null;
    E.player.x = returnPos.x; E.player.y = returnPos.y;
    E.player.inVehicle = null;
  }

  function startBankHeist(notify) {
    if (!currentRoom || currentRoom.id !== 'bank') return;
    if (robCooldown > 0) { if (notify) notify(`Trezor je prázdny! Počkaj ${Math.ceil(robCooldown)}s.`, '#facc15'); return; }
    if (robTimer > 0) { if (notify) notify('Už vŕtaš do trezoru...', '#facc15'); return; }
    robTimer = 4.0;
    for (let i = 0; i < guards.length; i++) guards[i].alert = true;
    if (notify) notify('🚨 ALARM! Vŕtam trezor (4s) – strážnici útočia!', '#ef4444');
    if (window.GTA.Audio) window.GTA.Audio.playAlert();
  }

  function stealArtifact(notify) {
    if (!currentRoom || currentRoom.id !== 'area51_lab') return;
    if (artifactCooldown > 0) {
      if (notify) notify(`🛸 Komora sa nabíja (${Math.ceil(artifactCooldown)}s)...`, '#4ade80');
      return;
    }
    artifactCooldown = 45;
    E.player.rockets = Math.min(8, E.player.rockets + 3);
    E.player.armor = 100;
    for (let i = 0; i < guards.length; i++) guards[i].alert = true;
    if (window.GTA.Activities) {
      window.GTA.Activities.addMoney(3500, 'Záhadný artefakt z Area 51 (+3 RPG + Vesta)');
    }
    if (onRoomEvent) onRoomEvent('area51_stolen');
    if (notify) notify('🛸 ARTEFAKT UKRADNUTÝ! Získal si $3 500, +3 RPG a 100% vestu! POPLACH!', '#4ade80');
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
  }

  function getNearbySpot() {
    if (!currentRoom) return null;
    for (let i = 0; i < currentRoom.spots.length; i++) {
      const s = currentRoom.spots[i];
      if (Math.hypot(px - s.x, py - s.y) < s.r + 16) return s;
    }
    return null;
  }

  function collidesRoom(nx, ny, rad) {
    if (!currentRoom) return true;
    if (nx - rad < 28 || ny - rad < 28 || nx + rad > currentRoom.w - 28 || ny + rad > currentRoom.h - 28) return true;
    for (let i = 0; i < currentRoom.rects.length; i++) {
      const rc = currentRoom.rects[i];
      const cx = Math.max(rc.x, Math.min(nx, rc.x + rc.w));
      const cy = Math.max(rc.y, Math.min(ny, rc.y + rc.h));
      if ((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < rad * rad) return true;
    }
    return false;
  }

  function update(dt, input, callbacks) {
    if (!currentRoom) return;
    const sec = dt / 60;
    if (robCooldown > 0) robCooldown = Math.max(0, robCooldown - sec);
    if (artifactCooldown > 0) artifactCooldown = Math.max(0, artifactCooldown - sec);

    let mx = input.joyX || 0, my = input.joyY || 0;
    if (Math.hypot(mx, my) < 0.08) {
      mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    }
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag > 0.08) {
      const dx = mx / Math.hypot(mx, my), dy = my / Math.hypot(mx, my);
      const spd = ((mag > 0.74) || input.nitro || input.drift) ? 4.3 : 2.8 * mag;
      pAngle = Math.atan2(dy, dx);
      walkT += spd * 0.1 * dt;
      if (!collidesRoom(px + dx * spd * dt, py, 11)) px += dx * spd * dt;
      if (!collidesRoom(px, py + dy * spd * dt, 11)) py += dy * spd * dt;
    }

    if (robTimer > 0) {
      robTimer -= sec;
      if (robTimer <= 0) {
        robTimer = 0; robCooldown = 35;
        if (window.GTA.Activities) window.GTA.Activities.addMoney(2200, 'Lúpež bankového trezoru');
        E.addWanted(3);
        if (callbacks && callbacks.onNotify) callbacks.onNotify('💰 Trezor vylúpený! (+$2 200 & 3★)', '#4ade80');
      }
    }

    if (input.fire && E.player.fireCooldown <= 0) {
      E.player.fireCooldown = 9;
      if (window.GTA.Audio) window.GTA.Audio.playShot();
      if (callbacks && callbacks.onShake) callbacks.onShake(2);
      bullets.push({ fromPlayer: true, x: px + Math.cos(pAngle) * 16, y: py + Math.sin(pAngle) * 16, vx: Math.cos(pAngle) * 15, vy: Math.sin(pAngle) * 15, life: 36 });
    }

    for (let i = guards.length - 1; i >= 0; i--) {
      const g = guards[i];
      if (g.hp <= 0) { guards.splice(i, 1); continue; }
      if (g.alert) {
        const ang = Math.atan2(py - g.y, px - g.x);
        const stepX = Math.cos(ang) * 1.45 * dt, stepY = Math.sin(ang) * 1.45 * dt;
        if (!collidesRoom(g.x + stepX, g.y, 11)) g.x += stepX;
        if (!collidesRoom(g.x, g.y + stepY, 11)) g.y += stepY;
        g.cd -= dt;
        if (g.cd <= 0 && Math.hypot(px - g.x, py - g.y) < 340) {
          g.cd = 42;
          bullets.push({ fromPlayer: false, x: g.x, y: g.y, vx: Math.cos(ang) * 9.5, vy: Math.sin(ang) * 9.5, life: 45 });
          if (window.GTA.Audio) window.GTA.Audio.playShot();
        }
      } else {
        if (collidesRoom(g.x + g.vx * dt, g.y, 11)) g.vx *= -1;
        else g.x += g.vx * dt;
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || collidesRoom(b.x, b.y, 3)) { bullets.splice(i, 1); continue; }
      if (b.fromPlayer) {
        for (let j = 0; j < guards.length; j++) {
          if (Math.hypot(b.x - guards[j].x, b.y - guards[j].y) < 15) {
            guards[j].hp -= 28; guards[j].alert = true; b.life = 0; break;
          }
        }
      } else if (Math.hypot(b.x - px, b.y - py) < 13) {
        E.damagePlayer(8, callbacks); b.life = 0;
      }
    }
  }

  function render(ctx, vw, vh, time) {
    if (!currentRoom) return;
    ctx.fillStyle = currentRoom.bg; ctx.fillRect(0, 0, vw, vh);
    const scale = Math.min((vw - 24) / currentRoom.w, (vh - 24) / currentRoom.h);
    const ox = (vw - currentRoom.w * scale) / 2, oy = (vh - currentRoom.h * scale) / 2;

    ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
    ctx.fillStyle = currentRoom.wall; ctx.fillRect(0, 0, currentRoom.w, currentRoom.h);
    ctx.fillStyle = currentRoom.floor; ctx.fillRect(28, 28, currentRoom.w - 56, currentRoom.h - 56);
    ctx.strokeStyle = currentRoom.accent; ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, currentRoom.w - 56, currentRoom.h - 56);

    // Záhadná zelená žiara uprostred komplexu Area 51
    if (currentRoom.id === 'area51_lab') {
      const pulse = 0.85 + Math.sin(time * 0.006) * 0.15;
      const g = ctx.createRadialGradient(410, 245, 8, 410, 245, 110 * pulse);
      g.addColorStop(0, 'rgba(74, 222, 128, 0.35)');
      g.addColorStop(1, 'rgba(74, 222, 128, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(410, 245, 110 * pulse, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = 0; i < currentRoom.rects.length; i++) {
      const rc = currentRoom.rects[i];
      ctx.fillStyle = rc.col; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      if (rc.border) { ctx.strokeStyle = rc.border; ctx.lineWidth = 2; ctx.strokeRect(rc.x, rc.y, rc.w, rc.h); }
    }

    const pulse = 0.88 + Math.sin(time * 0.006) * 0.12;
    for (let i = 0; i < currentRoom.spots.length; i++) {
      const s = currentRoom.spots[i];
      ctx.fillStyle = currentRoom.accent + '33'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = currentRoom.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.icon, s.x, s.y);
    }

    for (let i = 0; i < guards.length; i++) {
      const g = guards[i];
      ctx.save(); ctx.translate(g.x, g.y);
      ctx.fillStyle = currentRoom.id === 'area51_lab' ? '#065f46' : '#1e3a8a';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(3, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.save(); ctx.translate(px, py); ctx.rotate(pAngle);
    const sw = Math.sin(walkT) * 2.5;
    ctx.fillStyle = E.player.outfitColor || '#38bdf8';
    ctx.beginPath(); ctx.ellipse(sw * 0.4, 0, 7, 10.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 3, 11, 3.5);
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    for (let i = 0; i < bullets.length; i++) {
      ctx.fillStyle = bullets[i].fromPlayer ? '#fef08a' : '#ef4444';
      ctx.beginPath(); ctx.arc(bullets[i].x, bullets[i].y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  return {
    OUTFITS: OUTFITS, isInside: isInside, getCurrentRoom: getCurrentRoom, getNearbyDoor: getNearbyDoor,
    enter: enter, exit: exit, forceExit: forceExit, startBankHeist: startBankHeist, stealArtifact: stealArtifact,
    getNearbySpot: getNearbySpot, update: update, render: render
  };
})();
