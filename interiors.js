window.GTA = window.GTA || {};

window.GTA.Interiors = (function () {
  const C = window.GTA.Config;
  const W = window.GTA.World;
  const A = window.GTA.Activities;
  const E = window.GTA.Entities;

  const OUTFITS = [
    { id: 'cyan',    name: 'Grand Street Modrý', color: '#38bdf8', price: 0 },
    { id: 'crimson', name: 'Crimson Gangster',   color: '#ef4444', price: 650 },
    { id: 'gold',    name: 'VIP Zlatý Boss',     color: '#facc15', price: 1800 },
    { id: 'emerald', name: 'Emerald Runner',     color: '#10b981', price: 1100 },
    { id: 'violet',  name: 'Neon Cyber',         color: '#a855f7', price: 1500 }
  ];

  const ROOMS = {
    ammu: {
      id: 'ammu', title: '🔫 Ammu-Nation Zbrojnica', w: 680, h: 460,
      floor: '#1e293b', wall: '#0f172a', accent: '#ef4444',
      spawn: { x: 340, y: 370 },
      spots: [
        { id: 'exit',      x: 340, y: 422, r: 34, icon: '🚪', label: 'Vyjsť na ulicu' },
        { id: 'ammu_shop', x: 340, y: 150, r: 44, icon: '🛒', label: 'Pult: Zbrane, Vesty & RPG' }
      ],
      decor: [
        { x: 120, y: 120, w: 90, h: 42, col: '#334155' },
        { x: 470, y: 120, w: 90, h: 42, col: '#334155' },
        { x: 140, y: 260, w: 70, h: 32, col: '#475569' }
      ]
    },
    burger: {
      id: 'burger', title: '🍔 McBurger & Diner – Reštaurácia', w: 700, h: 480,
      floor: '#451a03', wall: '#290f02', accent: '#facc15',
      spawn: { x: 350, y: 390 },
      spots: [
        { id: 'exit',      x: 350, y: 440, r: 34, icon: '🚪', label: 'Vyjsť von' },
        { id: 'food_menu', x: 350, y: 145, r: 46, icon: '🍔', label: 'Objednať z Menu (Burgery, Komba & Špeciály)' }
      ],
      decor: [
        { x: 110, y: 220, w: 84, h: 48, col: '#b45309' },
        { x: 506, y: 220, w: 84, h: 48, col: '#b45309' },
        { x: 110, y: 320, w: 84, h: 48, col: '#b45309' },
        { x: 506, y: 320, w: 84, h: 48, col: '#b45309' }
      ]
    },
    home: {
      id: 'home', title: '🏠 Tvoj Apartmán – Grand City', w: 680, h: 460,
      floor: '#1e293b', wall: '#0f172a', accent: '#38bdf8',
      spawn: { x: 340, y: 370 },
      spots: [
        { id: 'exit',     x: 340, y: 420, r: 34, icon: '🚪', label: 'Vyjsť na ulicu' },
        { id: 'wardrobe', x: 185, y: 170, r: 40, icon: '👕', label: 'Šatník (Zmeniť outfit)' },
        { id: 'bed',      x: 495, y: 170, r: 40, icon: '🛏️', label: 'Posteľ (Uložiť & +8h spánok)' }
      ],
      decor: [
        { x: 280, y: 255, w: 120, h: 46, col: '#0284c7' },
        { x: 300, y: 105, w: 80, h: 24, col: '#0f172a' }
      ]
    },
    bank: {
      id: 'bank', title: '🏦 Grand City Banka & Trezor', w: 720, h: 500,
      floor: '#1e293b', wall: '#090d16', accent: '#facc15',
      spawn: { x: 360, y: 420 },
      spots: [
        { id: 'exit',  x: 360, y: 460, r: 34, icon: '🚪', label: 'Vyjsť z banky' },
        { id: 'vault', x: 360, y: 140, r: 46, icon: '💰', label: 'Vykradnúť trezor (3★ Poplach)' }
      ],
      decor: [
        { x: 140, y: 250, w: 96, h: 36, col: '#475569' },
        { x: 484, y: 250, w: 96, h: 36, col: '#475569' }
      ]
    },
    casino: {
      id: 'casino', title: '🎰 Royal Casino & Lounge', w: 740, h: 500,
      floor: '#2e1065', wall: '#14052e', accent: '#facc15',
      spawn: { x: 370, y: 425 },
      spots: [
        { id: 'exit',      x: 370, y: 462, r: 34, icon: '🚪', label: 'Vyjsť z kasína' },
        { id: 'slots',     x: 200, y: 185, r: 44, icon: '🎰', label: 'Výherné automaty' },
        { id: 'blackjack', x: 540, y: 185, r: 44, icon: '🃏', label: 'Blackjack 21' }
      ],
      decor: [
        { x: 310, y: 120, w: 120, h: 34, col: '#7e22ce' },
        { x: 320, y: 290, w: 100, h: 44, col: '#581c87' }
      ]
    },
    area51: {
      id: 'area51', title: '👽 Area 51 – Tajný Laboratórny Sektor', w: 740, h: 500,
      floor: '#06281e', wall: '#02120d', accent: '#4ade80',
      spawn: { x: 370, y: 425 },
      spots: [
        { id: 'exit',         x: 370, y: 462, r: 34, icon: '🚪', label: 'Vyjsť do zóny' },
        { id: 'u51_artifact', x: 370, y: 155, r: 46, icon: '🛸', label: 'Ukradnúť mimozemský artefakt ($4 500)' }
      ],
      decor: [
        { x: 140, y: 160, w: 76, h: 76, col: '#0f766e' },
        { x: 524, y: 160, w: 76, h: 76, col: '#0f766e' }
      ]
    }
  };

  let currentRoom = null;
  let exitPos = null;
  let heistDone = false;
  let artifactDone = false;
  const p = { x: 340, y: 370, angle: -Math.PI / 2, r: 12, walk: 0 };

  function getNearbyDoor(px, py) {
    if (!W.landmarks) return null;
    for (let i = 0; i < W.landmarks.length; i++) {
      const lm = W.landmarks[i];
      if (!lm.enterable || !ROOMS[lm.id]) continue;
      if (Math.hypot(px - lm.x, py - lm.y) < 58) {
        return { id: lm.id, name: lm.name, x: lm.x, y: lm.y };
      }
    }
    return null;
  }

  function enter(roomId, doorX, doorY, notify) {
    const rm = ROOMS[roomId];
    if (!rm) return false;
    currentRoom = rm;
    exitPos = { x: doorX, y: doorY + (doorY > (E.player.y || doorY) ? 24 : -24) };
    p.x = rm.spawn.x;
    p.y = rm.spawn.y;
    p.angle = -Math.PI / 2;
    if (notify) notify(`🚪 Vošiel si: ${rm.title}`, '#facc15');
    return true;
  }

  function exit(notify) {
    if (!currentRoom) return false;
    const dest = exitPos || { x: W.spawnX, y: W.spawnY };
    E.player.x = dest.x;
    E.player.y = dest.y;
    E.resolveWorldCollisions(E.player, E.player.radius, 'swim');
    currentRoom = null;
    exitPos = null;
    if (notify) notify('🚶 Vyšiel si späť do mesta', '#38bdf8');
    return true;
  }

  function forceExit() {
    currentRoom = null;
    exitPos = null;
  }

  function isInside() { return currentRoom !== null; }
  function getCurrentRoom() { return currentRoom; }

  function getNearbySpot() {
    if (!currentRoom) return null;
    for (let i = 0; i < currentRoom.spots.length; i++) {
      const s = currentRoom.spots[i];
      if (Math.hypot(p.x - s.x, p.y - s.y) < s.r + 16) return s;
    }
    return null;
  }

  function startBankHeist(notify) {
    if (heistDone) {
      if (notify) notify('🏦 Trezor je už vykradnutý – vráť sa neskôr!', '#94a3b8');
      return;
    }
    heistDone = true;
    E.addWanted(3);
    A.addMoney(2400, 'Vykradnutý bankový trezor!');
    if (window.GTA.Audio) window.GTA.Audio.playAlert();
    if (notify) notify('💰 Ukradol si $2 400! Spustil sa 3★ policajný poplach!', '#facc15');
  }

  function stealArtifact(notify) {
    if (artifactDone) {
      if (notify) notify('🛸 Artefakt je už preč – vráť sa neskôr!', '#94a3b8');
      return;
    }
    artifactDone = true;
    E.addWanted(4);
    A.addMoney(4500, 'Mimozemský artefakt z Area 51!');
    if (window.GTA.Audio) window.GTA.Audio.playAlert();
    if (notify) notify('🛸 Získal si artefakt za $4 500! (4★ POPLACH)', '#4ade80');
  }

  function update(dt, input, callbacks) {
    if (!currentRoom) return;
    let mx = input.joyX || 0, my = input.joyY || 0;
    if (Math.hypot(mx, my) < 0.08) {
      mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    }
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag > 0.08) {
      const dx = mx / Math.hypot(mx, my);
      const dy = my / Math.hypot(mx, my);
      const spd = ((mag > 0.74 || input.nitro) ? 4.2 : 2.7) * mag;
      p.angle = Math.atan2(dy, dx);
      p.walk += spd * 0.12 * dt;
      const nx = Math.max(48, Math.min(currentRoom.w - 48, p.x + dx * spd * dt));
      const ny = Math.max(48, Math.min(currentRoom.h - 48, p.y + dy * spd * dt));
      p.x = nx;
      p.y = ny;
    }
  }

  function render(ctx, vw, vh, time) {
    if (!currentRoom) return;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, vw, vh);

    const scale = Math.min((vw - 24) / currentRoom.w, (vh - 120) / currentRoom.h);
    const ox = (vw - currentRoom.w * scale) / 2;
    const oy = Math.max(66, (vh - currentRoom.h * scale) / 2);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // Podlaha a steny miestnosti
    ctx.fillStyle = currentRoom.wall;
    ctx.fillRect(-14, -14, currentRoom.w + 28, currentRoom.h + 28);
    ctx.fillStyle = currentRoom.floor;
    ctx.fillRect(0, 0, currentRoom.w, currentRoom.h);

    // Dlaždice / mriežka interiéru
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let gx = 40; gx < currentRoom.w; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, currentRoom.h); ctx.stroke();
    }
    for (let gy = 40; gy < currentRoom.h; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(currentRoom.w, gy); ctx.stroke();
    }

    ctx.strokeStyle = currentRoom.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, currentRoom.w - 4, currentRoom.h - 4);

    // Dekorácie (stoly, pulty, boxy)
    for (let i = 0; i < currentRoom.decor.length; i++) {
      const d = currentRoom.decor[i];
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(d.x + 4, d.y + 5, d.w, d.h);
      ctx.fillStyle = d.col;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(d.x, d.y, d.w, d.h);
    }

    // Interaktívne body
    const pulse = 0.88 + Math.sin(time * 0.006) * 0.12;
    for (let i = 0; i < currentRoom.spots.length; i++) {
      const s = currentRoom.spots[i];
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = currentRoom.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '22px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.icon, s.x, s.y);
    }

    // Hráč v interiéri
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = E.player.outfitColor || '#38bdf8';
    ctx.beginPath(); ctx.ellipse(Math.sin(p.walk) * 2.5, 0, 8.5, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(2.5, 0, 6.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  return {
    OUTFITS: OUTFITS,
    getNearbyDoor: getNearbyDoor,
    enter: enter,
    exit: exit,
    forceExit: forceExit,
    isInside: isInside,
    getCurrentRoom: getCurrentRoom,
    getNearbySpot: getNearbySpot,
    startBankHeist: startBankHeist,
    stealArtifact: stealArtifact,
    update: update,
    render: render
  };
})();
