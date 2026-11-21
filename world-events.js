window.GTA = window.GTA || {};

window.GTA.WorldEvents = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const WEATHER_TYPES = ['clear', 'rain', 'storm', 'sandstorm'];

  const state = {
    weather: 'clear',
    weatherTimer: 55,
    lightningAlpha: 0,
    radioChannel: 0, // 0=Off, 1=Synthwave, 2=Street Beat, 3=Police Scanner
    radioTick: 0,
    respect: 0,
    bankBalance: 0,
    bestJumpMeters: 0,
    slowMoTimer: 0,
    savedGarageCars: [null, null, null]
  };

  let activeEvent = null; // { kind, x, y, timer, targetVeh, reward, label }
  let eventSpawnCooldown = 14;
  let scrapCooldown = 0;

  // Šrotovisko pri South Docks
  const SCRAP_YARD = { x: 48 * TS + 90, y: 55 * TS + 90, icon: '♻️', name: 'Šrotovisko (Lis na autá)' };

  function loadExtra(saved) {
    if (!saved) return;
    if (typeof saved.respect === 'number') state.respect = saved.respect;
    if (typeof saved.bankBalance === 'number') state.bankBalance = saved.bankBalance;
    if (typeof saved.bestJumpMeters === 'number') state.bestJumpMeters = saved.bestJumpMeters;
    if (Array.isArray(saved.savedGarageCars)) {
      state.savedGarageCars = [
        saved.savedGarageCars[0] || null,
        saved.savedGarageCars[1] || null,
        saved.savedGarageCars[2] || null
      ];
    }
  }

  function exportExtra() {
    return {
      respect: state.respect,
      bankBalance: state.bankBalance,
      bestJumpMeters: state.bestJumpMeters,
      savedGarageCars: state.savedGarageCars.slice()
    };
  }

  function addRespect(pts, notify) {
    state.respect += Math.max(1, Math.round(pts));
    if (notify) notify(`⭐ +${Math.round(pts)} Rešpekt (Celkom: ${state.respect})`, '#c084fc');
  }

  function depositToBank(amount, activities, notify) {
    if (amount <= 0) return false;
    if (!activities.spendMoney(amount)) return false;
    state.bankBalance += amount;
    activities.save();
    if (notify) notify(`🏦 Uložené do banky: +$${amount.toLocaleString()} (Trezor: $${state.bankBalance.toLocaleString()})`, '#4ade80');
    return true;
  }

  function withdrawFromBank(amount, activities, notify) {
    if (amount <= 0) return false;
    if (state.bankBalance < amount) {
      if (notify) notify('🏦 Na účte nemáš toľko peňazí!', '#ef4444');
      return false;
    }
    state.bankBalance -= amount;
    activities.addMoney(amount, 'Výber z banky');
    return true;
  }

  function saveCurrentCarToSlot(slotIdx, entities, activities, notify) {
    const v = entities.player.inVehicle;
    if (!v) {
      if (notify) notify('🅿️ Najskôr nasadni do vozidla, ktoré chceš uložiť!', '#facc15');
      return false;
    }
    if (slotIdx < 0 || slotIdx > 2) return false;
    state.savedGarageCars[slotIdx] = {
      type: v.type,
      color: v.color,
      underglow: v.underglow || null,
      name: v.spec.name,
      cat: v.spec.cat || '🚗'
    };
    activities.save();
    if (notify) notify(`🅿️ Slot ${slotIdx + 1}: ${v.spec.name} uložený natrvalo!`, '#4ade80');
    return true;
  }

  function spawnCarFromSlot(slotIdx, entities, notify) {
    const item = state.savedGarageCars[slotIdx];
    if (!item) {
      if (notify) notify(`🅿️ Slot ${slotIdx + 1} je prázdny.`, '#94a3b8');
      return false;
    }
    const p = entities.player;
    const sx = p.x + Math.cos(p.angle) * 70;
    const sy = p.y + Math.sin(p.angle) * 70;
    const v = entities.spawnVehicle(item.type, sx, sy, p.angle, {
      color: item.color,
      underglow: item.underglow,
      isPersistent: true
    });
    if (p.inVehicle && !p.inVehicle.isPersistent) p.inVehicle.isAI = false;
    p.inVehicle = v;
    p.x = v.x;
    p.y = v.y;
    if (notify) notify(`🅿️ Privolané: ${item.cat} ${item.name}`, '#38bdf8');
    if (window.GTA.Audio) window.GTA.Audio.playSuccess();
    return true;
  }

  function crushCarAtScrapyard(entities, activities, notify) {
    const v = entities.player.inVehicle;
    if (!v) {
      if (notify) notify('♻️ Privez auto do Šrotoviska v South Docks a zošrotujeme ho!', '#facc15');
      return false;
    }
    if (scrapCooldown > 0) return false;
    scrapCooldown = 2;

    const baseVal = Math.max(220, Math.round((v.spec.price || 1500) * 0.22));
    const hpRatio = Math.max(0.35, v.hp / v.maxHp);
    const payout = Math.round(baseVal * hpRatio);

    const idx = entities.vehicles.indexOf(v);
    entities.player.inVehicle = null;
    if (idx >= 0) entities.vehicles.splice(idx, 1);

    entities.spawnParticles(SCRAP_YARD.x, SCRAP_YARD.y, '#94a3b8', 18, 4.5, 5);
    addRespect(15, null);
    activities.addMoney(payout, `Šrotovisko: ${v.spec.name}`);
    return true;
  }

  function cycleRadio(notify) {
    state.radioChannel = (state.radioChannel + 1) % 4;
    const names = ['📻 Rádio: Vypnuté', '📻 Synthwave Night', '📻 Street Beat', '📻 Police Scanner'];
    if (notify) notify(names[state.radioChannel], '#38bdf8');
    if (window.GTA.Audio && state.radioChannel > 0) window.GTA.Audio.playCash();
  }

  function triggerHorn(entities, notify) {
    const p = entities.player;
    if (window.GTA.Audio) window.GTA.Audio.playAlert();
    let pushed = 0;
    for (let i = 0; i < entities.vehicles.length; i++) {
      const v = entities.vehicles[i];
      if (v === p.inVehicle || !v.isAI || v.isPolice) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < 165) {
        const ang = Math.atan2(v.y - p.y, v.x - p.x);
        v.vx += Math.cos(ang) * 4.2;
        v.vy += Math.sin(ang) * 4.2;
        pushed++;
      }
    }
    if (notify) notify(pushed > 0 ? `📣 TRÚBIŠ! Autá vpredu sa pohli (${pushed})` : '📣 BEEP BEEP!', '#facc15');
  }

  function setWeather(mode, notify) {
    if (WEATHER_TYPES.indexOf(mode) >= 0) {
      state.weather = mode;
      state.weatherTimer = 60;
      const labels = {
        clear: '☀️ Jasné počasie',
        rain: '🌧️ Dážď (mokrý asfalt – ľahší drift)',
        storm: '⛈️ Búrka s bleskami',
        sandstorm: '🌪️ Piesočná búrka'
      };
      if (notify) notify(labels[mode], '#38bdf8');
    }
  }

  function spawnRandomEvent(px, py, entities, notify) {
    const candidates = [];
    for (let rad = 5; rad <= 11; rad++) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + Math.random() * 0.4;
        const c = Math.floor((px + Math.cos(ang) * rad * TS) / TS);
        const r = Math.floor((py + Math.sin(ang) * rad * TS) / TS);
        if (r > 2 && r < N - 3 && c > 2 && c < N - 3) {
          const t = W.tiles[r][c];
          if (t === T.ROAD || t === T.HIGHWAY || t === T.DIRT_ROAD) {
            candidates.push({ x: c * TS + TS / 2, y: r * TS + TS / 2, tile: t });
          }
        }
      }
    }
    if (!candidates.length) return;
    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    const roll = Math.random();

    if (roll < 0.34) {
      // Pancierové auto banky!
      const veh = entities.spawnVehicle('swat', spot.x, spot.y, Math.random() * Math.PI * 2, {
        color: '#e2e8f0', isAI: true, isPersistent: true
      });
      veh.hp = 260; veh.maxHp = 260;
      activeEvent = {
        kind: 'armored', x: veh.x, y: veh.y, timer: 65,
        targetVeh: veh, reward: 1450,
        title: '🚚 Pancierové auto banky',
        desc: 'Zastav alebo rozbi obrnenú dodávku a vezmi lup ($1 450)!'
      };
      if (notify) notify('🚚 Na blízkej ceste ide pancierové auto s peniazmi!', '#facc15');
    } else if (roll < 0.68) {
      // Pouličný šprint 1v1
      const rival = entities.spawnVehicle('sports', spot.x, spot.y, 0, {
        color: '#ef4444', underglow: '#ef4444', isAI: true, isPersistent: true
      });
      const gx = spot.x + (Math.random() < 0.5 ? 1100 : -1100);
      const gy = spot.y + (Math.random() < 0.5 ? 900 : -900);
      activeEvent = {
        kind: 'sprint', x: gx, y: gy, timer: 45,
        targetVeh: rival, reward: 650,
        title: '🏁 Pouličný šprint 1v1',
        desc: 'Doraz do cieľa skôr než súper ($650 + Rešpekt)!'
      };
      if (notify) notify('🏁 Súper na športiaku vyzýva na šprint 1v1!', '#38bdf8');
    } else {
      // Zlodej na úteku
      activeEvent = {
        kind: 'thief', x: spot.x, y: spot.y, timer: 45,
        targetVeh: null, reward: 380,
        title: '🏃 Zlodej na úteku',
        desc: 'Dostaň zlodeja (zraz ho alebo zastav pri ňom)!'
      };
      if (notify) notify('🏃 Niekto uteká s ukradnutou taškou!', '#f97316');
    }
  }

  function update(dt, entities, activities, callbacks) {
    const sec = dt / 60;
    if (scrapCooldown > 0) scrapCooldown = Math.max(0, scrapCooldown - sec);
    if (state.slowMoTimer > 0) state.slowMoTimer = Math.max(0, state.slowMoTimer - sec);
    if (state.lightningAlpha > 0) state.lightningAlpha = Math.max(0, state.lightningAlpha - 0.04 * dt);

    // Dynamické počasie
    state.weatherTimer -= sec;
    if (state.weatherTimer <= 0) {
      const dist = W.getDistrictAt(entities.player.x, entities.player.y);
      if (dist && dist.id === 'DESERT' && Math.random() < 0.45) {
        setWeather('sandstorm', callbacks ? callbacks.onNotify : null);
      } else {
        const nextW = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
        setWeather(nextW, callbacks ? callbacks.onNotify : null);
      }
    }

    // Blesky počas búrky
    if (state.weather === 'storm' && Math.random() < 0.004 * dt) {
      state.lightningAlpha = 0.85;
      if (window.GTA.Audio) window.GTA.Audio.playExplosion();
      if (callbacks && callbacks.onShake) callbacks.onShake(6);
    }

    // Autorádio – jemné tónové pulzy podľa zvoleného kanála
    if (state.radioChannel > 0 && entities.player.inVehicle && window.GTA.Audio && window.GTA.Audio.isEnabled()) {
      state.radioTick -= sec;
      if (state.radioTick <= 0) {
        state.radioTick = state.radioChannel === 1 ? 0.55 : (state.radioChannel === 2 ? 0.38 : 1.4);
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          if (ac.state === 'running') {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            const notes1 = [220, 261.6, 329.6, 392, 329.6, 261.6];
            const notes2 = [110, 110, 146.8, 110, 164.8, 130.8];
            const notes3 = [660, 880, 520];
            const arr = state.radioChannel === 1 ? notes1 : (state.radioChannel === 2 ? notes2 : notes3);
            osc.type = state.radioChannel === 1 ? 'sawtooth' : (state.radioChannel === 2 ? 'triangle' : 'sine');
            osc.frequency.value = arr[Math.floor(Math.random() * arr.length)];
            g.gain.setValueAtTime(0.014, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + 0.14);
            osc.connect(g); g.connect(ac.destination);
            osc.start(); osc.stop(ac.currentTime + 0.15);
          }
          ac.close();
        } catch (e) {}
      }
    }

    // Šrotovisko v South Docks – keď prídeš s vozidlom, zničí ho a vyplatí
    if (entities.player.inVehicle && Math.hypot(entities.player.x - SCRAP_YARD.x, entities.player.y - SCRAP_YARD.y) < 72) {
      crushCarAtScrapyard(entities, activities, callbacks ? callbacks.onNotify : null);
    }

    // Náhodné pouličné udalosti
    if (!activeEvent && !activities.activeMission) {
      eventSpawnCooldown -= sec;
      if (eventSpawnCooldown <= 0) {
        eventSpawnCooldown = 28;
        spawnRandomEvent(entities.player.x, entities.player.y, entities, callbacks ? callbacks.onNotify : null);
      }
    } else if (activeEvent) {
      const ev = activeEvent;
      ev.timer -= sec;
      if (ev.timer <= 0) {
        if (ev.targetVeh && ev.targetVeh.isPersistent) ev.targetVeh.isPersistent = false;
        activeEvent = null;
        return;
      }

      if (ev.kind === 'armored') {
        const tv = ev.targetVeh;
        if (!tv || tv.hp <= 0 || entities.vehicles.indexOf(tv) < 0) {
          addRespect(20, null);
          activities.addMoney(ev.reward, 'Lup z pancierového auta');
          activeEvent = null;
        } else {
          ev.x = tv.x; ev.y = tv.y;
        }
      } else if (ev.kind === 'sprint') {
        const tv = ev.targetVeh;
        if (tv && tv.isAI) {
          const ang = Math.atan2(ev.y - tv.y, ev.x - tv.x);
          tv.angle = ang;
          tv.vx = Math.cos(ang) * 7.8;
          tv.vy = Math.sin(ang) * 7.8;
          tv.x += tv.vx * dt;
          tv.y += tv.vy * dt;
          if (Math.hypot(tv.x - ev.x, tv.y - ev.y) < 85) {
            if (callbacks && callbacks.onNotify) callbacks.onNotify('🏁 Súper bol v cieli skôr!', '#f87171');
            tv.isPersistent = false;
            activeEvent = null;
            return;
          }
        }
        if (Math.hypot(entities.player.x - ev.x, entities.player.y - ev.y) < 85) {
          if (tv) tv.isPersistent = false;
          addRespect(15, null);
          activities.addMoney(ev.reward, 'Výhra v pouličnom šprinte 1v1');
          activeEvent = null;
        }
      } else if (ev.kind === 'thief') {
        // Zlodej uteká preč od miesta
        const runAng = Math.atan2(ev.y - entities.player.y, ev.x - entities.player.x) + Math.sin(ev.timer * 3) * 0.4;
        ev.x += Math.cos(runAng) * 2.1 * dt;
        ev.y += Math.sin(runAng) * 2.1 * dt;
        if (Math.hypot(entities.player.x - ev.x, entities.player.y - ev.y) < 42) {
          addRespect(12, null);
          activities.addMoney(ev.reward, 'Zachytený zlodej');
          activeEvent = null;
        }
      }
    }
  }

  function registerJumpMeters(meters, notify) {
    const m = Math.max(5, Math.round(meters));
    state.slowMoTimer = 1.25;
    if (m > state.bestJumpMeters) {
      state.bestJumpMeters = m;
      if (notify) notify(`🏆 NOVÝ REKORD SKOKU: ${m}m! (Slow-Mo)`, '#facc15');
    } else if (notify) {
      notify(`🎥 Skok: ${m}m (Rekord: ${state.bestJumpMeters}m)`, '#38bdf8');
    }
  }

  function drawWorldOverlay(ctx, cam, vw, vh, zoom, time) {
    const halfW = (vw / 2) / zoom + 200, halfH = (vh / 2) / zoom + 200;
    const pulse = 0.88 + Math.sin(time * 0.006) * 0.12;

    // Šrotovisko pri South Docks
    if (Math.abs(SCRAP_YARD.x - cam.x) < halfW && Math.abs(SCRAP_YARD.y - cam.y) < halfH) {
      ctx.save(); ctx.translate(SCRAP_YARD.x, SCRAP_YARD.y);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'; ctx.beginPath(); ctx.arc(0, 0, 38 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 38 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♻️', 0, 0);
      ctx.restore();
    }

    // Aktívna pouličná udalosť (zlodej / cieľ šprintu)
    if (activeEvent) {
      const ev = activeEvent;
      if (Math.abs(ev.x - cam.x) < halfW && Math.abs(ev.y - cam.y) < halfH) {
        ctx.save(); ctx.translate(ev.x, ev.y);
        if (ev.kind === 'thief') {
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        } else if (ev.kind === 'sprint') {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.24)'; ctx.beginPath(); ctx.arc(0, 0, 48 * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 48 * pulse, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // Efekt počasia cez celú obrazovku (dážď, búrka s bleskami, piesočná búrka)
  function drawWeatherScreen(ctx, vw, vh, time) {
    if (state.weather === 'rain' || state.weather === 'storm') {
      ctx.save();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.34)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const shiftX = (time * 0.25) % 120;
      const shiftY = (time * 0.85) % 120;
      for (let x = -120; x < vw + 120; x += 48) {
        for (let y = -120; y < vh + 120; y += 64) {
          const rx = x + shiftX;
          const ry = y + shiftY;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 10, ry + 22);
        }
      }
      ctx.stroke();
      ctx.restore();
    } else if (state.weather === 'sandstorm') {
      ctx.save();
      ctx.fillStyle = 'rgba(217, 119, 6, 0.18)';
      ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = 'rgba(253, 186, 116, 0.22)';
      const drift = (time * 0.4) % 180;
      for (let y = 20; y < vh; y += 44) {
        const x = ((y * 37 + drift) % (vw + 140)) - 70;
        ctx.fillRect(x, y, 75, 2.5);
      }
      ctx.restore();
    }

    if (state.lightningAlpha > 0.02) {
      ctx.fillStyle = `rgba(240, 249, 255, ${state.lightningAlpha})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  function getRadarBlips() {
    const blips = [{ x: SCRAP_YARD.x, y: SCRAP_YARD.y, color: '#4ade80', size: 4.2 }];
    if (activeEvent) {
      blips.push({
        x: activeEvent.x,
        y: activeEvent.y,
        color: activeEvent.kind === 'armored' ? '#facc15' : '#38bdf8',
        size: 6,
        pulse: true
      });
    }
    return blips;
  }

  return {
    SCRAP_YARD: SCRAP_YARD,
    get state() { return state; },
    get activeEvent() { return activeEvent; },
    loadExtra: loadExtra,
    exportExtra: exportExtra,
    addRespect: addRespect,
    depositToBank: depositToBank,
    withdrawFromBank: withdrawFromBank,
    saveCurrentCarToSlot: saveCurrentCarToSlot,
    spawnCarFromSlot: spawnCarFromSlot,
    crushCarAtScrapyard: crushCarAtScrapyard,
    cycleRadio: cycleRadio,
    triggerHorn: triggerHorn,
    setWeather: setWeather,
    registerJumpMeters: registerJumpMeters,
    update: update,
    drawWorldOverlay: drawWorldOverlay,
    drawWeatherScreen: drawWeatherScreen,
    getRadarBlips: getRadarBlips
  };
})();
