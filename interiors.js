window.GTA = window.GTA || {};

window.GTA.Interiors = (function () {
  const W = window.GTA.World;

  const OUTFITS = [
    { id: 'cyan',   name: 'Streetwear Cyan',  color: '#38bdf8', price: 0 },
    { id: 'mafia',  name: 'Mafia Oblek',      color: '#18181b', price: 450 },
    { id: 'red',    name: 'Crimson Gang',     color: '#dc2626', price: 600 },
    { id: 'tac',    name: 'Taktická Vesta',   color: '#3f6212', price: 950 },
    { id: 'cyber',  name: 'Neon Cyber',       color: '#a855f7', price: 1400 },
    { id: 'gold',   name: 'Zlatý Boss VIP',   color: '#eab308', price: 2800 }
  ];

  // Definícia 5 detailných miestností (súradnice so stredom 0,0)
  const ROOMS = {
    ammu: {
      id: 'ammu', title: '🔫 AMMU-NATION', w: 460, h: 340,
      floor: '#27272a', floorAlt: '#2e2e33', wall: '#14532d', accent: '#ef4444',
      spawnX: 0, spawnY: 118, exitX: 0, exitY: 146,
      obstacles: [
        { x: -175, y: -115, w: 350, h: 34, color: '#3f3f46', label: 'PULT' },
        { x: -210, y: -40,  w: 32,  h: 110, color: '#18181b', label: '🔫' },
        { x: 178,  y: -40,  w: 32,  h: 110, color: '#18181b', label: '🚀' }
      ],
      npcs: [{ x: 0, y: -135, shirt: '#166534', angle: Math.PI / 2 }],
      spots: [
        { id: 'ammu_shop', x: 0, y: -62, r: 38, color: '#ef4444', icon: '🔫', label: 'Kúpiť zbrane & vestu' }
      ]
    },
    casino: {
      id: 'casino', title: '🎰 ROYAL CASINO', w: 520, h: 380,
      floor: '#581c28', floorAlt: '#6b1d2f', wall: '#3b0764', accent: '#facc15',
      spawnX: 0, spawnY: 135, exitX: 0, exitY: 165,
      obstacles: [
        { x: -230, y: -110, w: 46, h: 170, color: '#eab308', label: '🎰' },
        { x: 105,  y: -85,  w: 115, h: 66, color: '#15803d', label: '21' },
        { x: 105,  y: 12,   w: 115, h: 66, color: '#15803d', label: 'VIP' },
        { x: -95,  y: -168, w: 190, h: 36, color: '#451a03', label: 'BAR' }
      ],
      npcs: [
        { x: 0, y: -145, shirt: '#f8fafc', angle: Math.PI / 2 },
        { x: 160, y: -102, shirt: '#18181b', angle: Math.PI / 2 }
      ],
      spots: [
        { id: 'slots',     x: -146, y: -25, r: 42, color: '#facc15', icon: '🎰', label: 'Hrať Automaty (Slot)' },
        { id: 'blackjack', x: 64,   y: -48, r: 42, color: '#4ade80', icon: '🃏', label: 'Hrať Blackjack (21)' }
      ]
    },
    bank: {
      id: 'bank', title: '🏦 GRAND BANK', w: 520, h: 400,
      floor: '#cbd5e1', floorAlt: '#e2e8f0', wall: '#334155', accent: '#facc15',
      spawnX: 0, spawnY: 145, exitX: 0, exitY: 175,
      obstacles: [
        { x: -235, y: -45,  w: 165, h: 28, color: '#64748b', label: 'POKLADŇA' },
        { x: 70,   y: -45,  w: 165, h: 28, color: '#64748b', label: 'POKLADŇA' },
        { x: -72,  y: -195, w: 144, h: 36, color: '#1e293b', label: 'TREZOR' }
      ],
      npcs: [
        { x: -155, y: -68, shirt: '#1e3a8a', angle: Math.PI / 2 },
        { x: 155,  y: -68, shirt: '#1e3a8a', angle: Math.PI / 2 }
      ],
      spots: [
        { id: 'vault', x: 0, y: -136, r: 46, color: '#ef4444', icon: '💰', label: 'Vylúpiť Trezor ($6 500)' }
      ]
    },
    burger: {
      id: 'burger', title: '🍔 BURGER SHOT', w: 460, h: 340,
      floor: '#f1f5f9', floorAlt: '#cbd5e1', wall: '#c2410c', accent: '#facc15',
      spawnX: 0, spawnY: 118, exitX: 0, exitY: 146,
      obstacles: [
        { x: -150, y: -115, w: 300, h: 34, color: '#ea580c', label: 'BURGER SHOT' },
        { x: -205, y: -10,  w: 74,  h: 40, color: '#dc2626', label: '' },
        { x: -205, y: 55,   w: 74,  h: 40, color: '#dc2626', label: '' },
        { x: 131,  y: -10,  w: 74,  h: 40, color: '#dc2626', label: '' },
        { x: 131,  y: 55,   w: 74,  h: 40, color: '#dc2626', label: '' }
      ],
      npcs: [{ x: 0, y: -135, shirt: '#facc15', angle: Math.PI / 2 }],
      spots: [
        { id: 'food_menu', x: 0, y: -62, r: 40, color: '#f97316', icon: '🍔', label: 'Objednať jedlo (+HP)' }
      ]
    },
    home: {
      id: 'home', title: '🏠 TVOJ BYT (SAFEHOUSE)', w: 480, h: 360,
      floor: '#784826', floorAlt: '#85502a', wall: '#0f172a', accent: '#38bdf8',
      spawnX: 0, spawnY: 126, exitX: 0, exitY: 155,
      obstacles: [
        { x: -215, y: -155, w: 96,  h: 64, color: '#1d4ed8', label: 'POSTEĽ' },
        { x: 125,  y: -162, w: 90,  h: 36, color: '#451a03', label: 'ŠATNÍK' },
        { x: -62,  y: 12,   w: 124, h: 40, color: '#334155', label: 'GAUČ' },
        { x: -45,  y: -60,  w: 90,  h: 18, color: '#020617', label: 'TV' }
      ],
      npcs: [],
      spots: [
        { id: 'bed',      x: -165, y: -62, r: 40, color: '#38bdf8', icon: '🛏️', label: 'Vyspať sa (Uložiť + HP)' },
        { id: 'wardrobe', x: 170,  y: -98, r: 40, color: '#a855f7', icon: '👕', label: 'Šatník (Zmeniť skin)' }
      ]
    }
  };

  let currentRoom = null;
  let returnPos = { x: 0, y: 0 };
  const p = { x: 0, y: 0, angle: -Math.PI / 2, radius: 11, walkAnim: 0, fireCD: 0 };

  // Stav lúpeže banky zvnútra
  let guards = [];
  let inBullets = [];
  let bankAlarm = false;
  let bankCracking = false;
  let vaultProgress = 0;
  let bankCooldown = 0;
  let exitBlockTimer = 0;

  function isInside() { return currentRoom !== null; }
  function getCurrentRoom() { return currentRoom; }

  // Nájde blízke vstupné dvere vonku v meste
  function getNearbyDoor(wx, wy) {
    if (!W.landmarks) return null;
    for (let i = 0; i < W.landmarks.length; i++) {
      const lm = W.landmarks[i];
      if (!lm.enterable) continue;
      if (Math.hypot(lm.x - wx, lm.y - wy) < 62) return lm;
    }
    return null;
  }

  function enter(roomId, outX, outY, notify) {
    const room = ROOMS[roomId];
    if (!room) return false;
    currentRoom = room;
    returnPos.x = outX;
    returnPos.y = outY;
    p.x = room.spawnX;
    p.y = room.spawnY;
    p.angle = -Math.PI / 2;
    p.walkAnim = 0;
    p.fireCD = 0;
    inBullets = [];
    guards = [];
    bankAlarm = false;
    bankCracking = false;
    vaultProgress = 0;
    exitBlockTimer = 0.6;

    // V Banke hliadkujú 2 ozbrojení strážnici
    if (roomId === 'bank') {
      guards.push({ x: -115, y: -110, angle: Math.PI / 2, hp: 75, maxHp: 75, fireCD: 35, radius: 10 });
      guards.push({ x: 115,  y: -110, angle: Math.PI / 2, hp: 75, maxHp: 75, fireCD: 45, radius: 10 });
    }
    if (notify) notify(`🚪 Vošiel si do: ${room.title}`, '#38bdf8');
    return true;
  }

  function exit(notify) {
    if (!currentRoom) return;
    const E = window.GTA.Entities;
    const wasBankHeist = (currentRoom.id === 'bank' && bankAlarm);

    E.player.x = returnPos.x;
    E.player.y = returnPos.y;
    E.resolveWorldCollisions(E.player, E.player.radius);

    currentRoom = null;
    guards = [];
    inBullets = [];
    bankAlarm = false;
    bankCracking = false;

    if (wasBankHeist) {
      E.addWanted(3);
      // Vonku pred bankou čaká policajné obkľúčenie!
      E.spawnVehicle('police', returnPos.x - 95, returnPos.y + 42, 0, { isAI: true, isPolice: true, sirenOn: true });
      E.spawnVehicle('police', returnPos.x + 95, returnPos.y + 42, Math.PI, { isAI: true, isPolice: true, sirenOn: true });
      if (notify) notify('🚨 POLÍCIA ČAKÁ PRED BANKOU! Uteč k autu!', '#ef4444');
    } else if (notify) {
      notify('☀️ Vyšiel si von na ulicu', '#cbd5e1');
    }
  }

  function forceExit() {
    currentRoom = null;
    guards = [];
    inBullets = [];
    bankAlarm = false;
    bankCracking = false;
  }

  function pushOutRect(ent, r, rx, ry, rw, rh) {
    const cx = Math.max(rx, Math.min(ent.x, rx + rw));
    const cy = Math.max(ry, Math.min(ent.y, ry + rh));
    const dx = ent.x - cx, dy = ent.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      ent.x += (dx / d) * (r - d + 0.3);
      ent.y += (dy / d) * (r - d + 0.3);
    } else {
      ent.y = ry + rh + r + 1;
    }
    return true;
  }

  function resolveRoomCollisions(ent, r) {
    if (!currentRoom) return;
    const hw = currentRoom.w / 2 - 14;
    const hh = currentRoom.h / 2 - 14;
    ent.x = Math.max(-hw + r, Math.min(hw - r, ent.x));
    ent.y = Math.max(-hh + r, Math.min(hh - r, ent.y));
    for (let i = 0; i < currentRoom.obstacles.length; i++) {
      const o = currentRoom.obstacles[i];
      pushOutRect(ent, r, o.x, o.y, o.w, o.h);
    }
  }

  function getNearbySpot() {
    if (!currentRoom) return null;
    if (Math.hypot(p.x - currentRoom.exitX, p.y - currentRoom.exitY) < 34) {
      return { id: 'exit', icon: '🚪', label: 'Odísť von na ulicu' };
    }
    for (let i = 0; i < currentRoom.spots.length; i++) {
      const s = currentRoom.spots[i];
      if (Math.hypot(p.x - s.x, p.y - s.y) < s.r + 12) return s;
    }
    return null;
  }

  function startBankHeist(notify) {
    if (bankCooldown > 0) {
      if (notify) notify(`🏦 Trezor je prázdny! Nová dodávka o ${Math.ceil(bankCooldown)}s`, '#f59e0b');
      return;
    }
    if (!bankCracking) {
      bankCracking = true;
      bankAlarm = true;
      vaultProgress = 0;
      if (window.GTA.Audio) window.GTA.Audio.playAlert();
      if (notify) notify('🚨 ALARM! Zostaň pri trezore 5 sekúnd a bráň sa strážnikom!', '#ef4444');
    }
  }

  function fireIndoorWeapon(callbacks) {
    const E = window.GTA.Entities;
    if (p.fireCD > 0) return;

    // Mierenie na najbližšieho strážnika v banke
    let ang = p.angle;
    let bestG = null, bestD = 380;
    for (let i = 0; i < guards.length; i++) {
      const d = Math.hypot(guards[i].x - p.x, guards[i].y - p.y);
      if (d < bestD) { bestD = d; bestG = guards[i]; }
    }
    if (bestG) {
      ang = Math.atan2(bestG.y - p.y, bestG.x - p.x);
      p.angle = ang;
    }

    const wId = E.player.weapon === 'rpg' ? 'smg' : E.player.weapon; // Bezpečná streľba vnútri
    const wSpec = E.WEAPONS[wId] || E.WEAPONS.smg;
    p.fireCD = wSpec.cd;

    for (let k = 0; k < wSpec.pellets; k++) {
      const a = ang + (Math.random() - 0.5) * wSpec.spread;
      inBullets.push({
        fromPlayer: true, x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14,
        vx: Math.cos(a) * 18, vy: Math.sin(a) * 18, dmg: wSpec.dmg, life: 28
      });
    }
    if (window.GTA.Audio) window.GTA.Audio.playShot();
    if (callbacks && callbacks.onShake) callbacks.onShake(2);

    if (currentRoom.id === 'bank' && !bankAlarm) {
      bankAlarm = true;
      if (window.GTA.Audio) window.GTA.Audio.playAlert();
      if (callbacks && callbacks.onNotify) callbacks.onNotify('🚨 Strážnici banky spúšťajú poplach!', '#ef4444');
    }
  }

  function update(dt, input, callbacks) {
    const sec = dt / 60;
    if (bankCooldown > 0) bankCooldown = Math.max(0, bankCooldown - sec);
    if (!currentRoom) return;
    if (exitBlockTimer > 0) exitBlockTimer = Math.max(0, exitBlockTimer - sec);
    if (p.fireCD > 0) p.fireCD -= dt;

    // 1. Pohyb hráča vnútri (360° joystick + WASD)
    let mx = input.joyX || 0, my = input.joyY || 0;
    if (Math.hypot(mx, my) < 0.08) {
      mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    }
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag > 0.08) {
      const dx = mx / Math.hypot(mx, my), dy = my / Math.hypot(mx, my);
      const spd = (mag > 0.74 || input.nitro) ? 3.8 : (2.4 * mag);
      p.angle = Math.atan2(dy, dx);
      p.walkAnim += spd * 0.1 * dt;
      p.x += dx * spd * dt;
      p.y += dy * spd * dt;
      resolveRoomCollisions(p, p.radius);
    }

    if (input.fire) fireIndoorWeapon(callbacks);

    // Automatický odchod cez zelený EXIT koberec, ak potiahneš dole na dvere
    if (exitBlockTimer <= 0 && Math.hypot(p.x - currentRoom.exitX, p.y - currentRoom.exitY) < 20 && my > 0.4) {
      exit(callbacks ? callbacks.onNotify : null);
      return;
    }

    // 2. Logika lúpeže trezoru v Banke
    if (currentRoom.id === 'bank') {
      const E = window.GTA.Entities;
      const A = window.GTA.Activities;

      if (bankCracking) {
        const vaultSpot = currentRoom.spots[0];
        if (Math.hypot(p.x - vaultSpot.x, p.y - vaultSpot.y) < 74) {
          vaultProgress += sec / 5.0;
          if (vaultProgress >= 1) {
            bankCracking = false;
            vaultProgress = 0;
            bankCooldown = 90;
            A.addMoney(6500, '💰 TREZOR GRAND BANK VYBRATÝ!');
            E.addWanted(3);
            if (window.GTA.Audio) window.GTA.Audio.playSuccess();
            if (callbacks && callbacks.onNotify) {
              callbacks.onNotify('💰 +$6,500! Bež k EXITU – vonku čaká 3★ polícia!', '#facc15');
            }
          }
        }
      }

      // Strážnici banky pri alarme strieľajú na hráča
      for (let i = guards.length - 1; i >= 0; i--) {
        const g = guards[i];
        g.angle = Math.atan2(p.y - g.y, p.x - g.x);
        if (bankAlarm) {
          g.fireCD -= dt;
          if (g.fireCD <= 0) {
            const a = g.angle + (Math.random() - 0.5) * 0.14;
            inBullets.push({
              fromPlayer: false, x: g.x + Math.cos(a) * 14, y: g.y + Math.sin(a) * 14,
              vx: Math.cos(a) * 11.5, vy: Math.sin(a) * 11.5, dmg: 7, life: 45
            });
            g.fireCD = 46;
            if (window.GTA.Audio) window.GTA.Audio.playShot();
          }
        }
      }

      // Vnútorné guľky
      for (let i = inBullets.length - 1; i >= 0; i--) {
        const b = inBullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        let hit = (Math.abs(b.x) > currentRoom.w / 2 - 14 || Math.abs(b.y) > currentRoom.h / 2 - 14);
        if (!hit && b.fromPlayer) {
          for (let j = guards.length - 1; j >= 0; j--) {
            const g = guards[j];
            if (Math.hypot(b.x - g.x, b.y - g.y) < g.radius + 6) {
              hit = true;
              g.hp -= b.dmg;
              if (g.hp <= 0) {
                guards.splice(j, 1);
                A.addMoney(120, 'Strážnik banky vyradený');
              }
              break;
            }
          }
        } else if (!hit && !b.fromPlayer) {
          if (Math.hypot(b.x - p.x, b.y - p.y) < p.radius + 5) {
            hit = true;
            E.damagePlayer(b.dmg, {
              onShake: callbacks.onShake,
              onWasted: () => {
                forceExit();
                if (callbacks.onWasted) callbacks.onWasted();
              }
            });
          }
        }
        if (hit || b.life <= 0) inBullets.splice(i, 1);
      }
    }
  }

  // Vykreslenie detailnej miestnosti presne prispôsobenej mobilnému displeju
  function render(ctx, vw, vh, time) {
    if (!currentRoom) return;
    const rm = currentRoom;
    const E = window.GTA.Entities;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, vw, vh);

    const scale = Math.min((vw - 24) / (rm.w + 30), (vh - 185) / (rm.h + 50), 1.45);
    const ox = vw / 2;
    const oy = Math.max(rm.h * scale * 0.5 + 78, vh * 0.44);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    const hw = rm.w / 2, hh = rm.h / 2;

    // 1. Podlaha so šachovnicovými dlaždicami
    const tile = 32;
    for (let y = -hh; y < hh; y += tile) {
      for (let x = -hw; x < hw; x += tile) {
        const alt = ((Math.floor((x + hw) / tile) + Math.floor((y + hh) / tile)) % 2 === 0);
        ctx.fillStyle = alt ? rm.floor : rm.floorAlt;
        ctx.fillRect(x, y, Math.min(tile, hw - x), Math.min(tile, hh - y));
      }
    }

    // 2. Steny miestnosti s farebným neónom
    ctx.strokeStyle = rm.wall;
    ctx.lineWidth = 22;
    ctx.strokeRect(-hw, -hh, rm.w, rm.h);
    ctx.strokeStyle = rm.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(-hw + 11, -hh + 11, rm.w - 22, rm.h - 22);

    // 3. Zelená výstupná zóna EXIT
    ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
    ctx.fillRect(rm.exitX - 36, rm.exitY - 14, 72, 26);
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.strokeRect(rm.exitX - 36, rm.exitY - 14, 72, 26);
    ctx.fillStyle = '#4ade80'; ctx.font = '900 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▼ EXIT ▼', rm.exitX, rm.exitY);

    // 4. Nábytok, pulty, hracie automaty, trezor
    for (let i = 0; i < rm.obstacles.length; i++) {
      const o = rm.obstacles[i];
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(o.x + 5, o.y + 6, o.w, o.h);
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (o.label) {
        ctx.fillStyle = '#fff'; ctx.font = '900 11px system-ui';
        ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2);
      }
    }

    // 5. Interaktívne zóny (pult, automaty, trezor, posteľ, šatník)
    const pulse = 0.88 + Math.sin(time * 0.006) * 0.12;
    for (let i = 0; i < rm.spots.length; i++) {
      const s = rm.spots[i];
      ctx.fillStyle = s.color + '30';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '18px system-ui';
      ctx.fillText(s.icon, s.x, s.y);

      // Kruh priebehu vŕtania trezoru v banke!
      if (s.id === 'vault' && bankCracking) {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * vaultProgress);
        ctx.stroke();
      }
    }

    // 6. Predavači / Krupiéri
    for (let i = 0; i < rm.npcs.length; i++) {
      const n = rm.npcs[i];
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.angle);
      ctx.fillStyle = n.shirt; ctx.beginPath(); ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 7. Strážnici banky
    for (let i = 0; i < guards.length; i++) {
      const g = guards[i];
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.angle);
      ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#020617'; ctx.fillRect(5, 3, 10, 3.2);
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // HP bar nad strážnikom
      ctx.fillStyle = '#0f172a'; ctx.fillRect(g.x - 14, g.y - 18, 28, 4);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(g.x - 14, g.y - 18, 28 * (g.hp / g.maxHp), 4);
    }

    // 8. Hráč s vybraným outfitom zo šatníka!
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(2, 4, 9.5, 0, Math.PI * 2); ctx.fill();
    const swing = Math.sin(p.walkAnim) * 2.5;
    ctx.fillStyle = E.player.outfitColor || '#38bdf8';
    ctx.beginPath(); ctx.ellipse(swing * 0.4, 0, 7.5, 11.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.fillRect(5, 3, 10, 3.5);
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 13.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 9. Vnútorné strely
    for (let i = 0; i < inBullets.length; i++) {
      const b = inBullets[i];
      ctx.fillStyle = b.fromPlayer ? '#fef08a' : '#ef4444';
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    // 10. Blikajúci červený alarm pri lúpeži banky!
    if (bankAlarm) {
      const a = 0.14 + Math.abs(Math.sin(time * 0.008)) * 0.18;
      ctx.fillStyle = `rgba(239, 68, 68, ${a})`;
      ctx.fillRect(-hw, -hh, rm.w, rm.h);
    }

    // Nadpis miestnosti nad stenou
    ctx.fillStyle = '#fff';
    ctx.font = '900 15px system-ui';
    ctx.fillText(rm.title, 0, -hh - 22);

    ctx.restore();
  }

  return {
    OUTFITS: OUTFITS,
    isInside: isInside,
    getCurrentRoom: getCurrentRoom,
    getNearbyDoor: getNearbyDoor,
    getNearbySpot: getNearbySpot,
    enter: enter,
    exit: exit,
    forceExit: forceExit,
    startBankHeist: startBankHeist,
    update: update,
    render: render
  };
})();
