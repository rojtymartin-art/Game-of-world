(function () {
  const World = window.GTA.World;
  const Renderer = window.GTA.Renderer;
  const Entities = window.GTA.Entities;
  const Activities = window.GTA.Activities;
  const Audio = window.GTA.Audio;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // DOM prvky HUDu
  const moneyHud = document.getElementById('moneyHud');
  const levelHud = document.getElementById('levelHud');
  const clockHud = document.getElementById('clockHud');
  const starsHud = document.getElementById('starsHud');
  const speedVal = document.getElementById('speedVal');
  const districtHud = document.getElementById('districtHud');
  const hpBar = document.getElementById('hpBar');
  const missionBox = document.getElementById('missionBox');
  const mTitle = document.getElementById('mTitle');
  const mDesc = document.getElementById('mDesc');
  const mTimer = document.getElementById('mTimer');
  const actionPrompt = document.getElementById('actionPrompt');
  const toastEl = document.getElementById('toast');
  const btnSiren = document.getElementById('btnSiren');

  const phoneModal = document.getElementById('phoneModal');
  const phoneBody = document.getElementById('phoneBody');
  const garageModal = document.getElementById('garageModal');
  const garageBody = document.getElementById('garageBody');

  let W = 0, H = 0;
  let showFullMap = false;
  let radarRect = { x: 0, y: 0, size: 0 };
  let activePhoneTab = 'jobs';
  let currentPOI = null;
  let toastTimer = null;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function notify(msg, color) {
    toastEl.textContent = msg;
    toastEl.style.color = color || '#fff';
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2900);
  }

  // Inicializácia modulov
  Entities.init();
  Activities.init(notify);

  // Ovládanie
  const input = { up: false, down: false, left: false, right: false, drift: false, nitro: false };
  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'drift',
    ShiftLeft: 'nitro', ShiftRight: 'nitro'
  };

  function isModalOpen() {
    return phoneModal.classList.contains('open') || garageModal.classList.contains('open');
  }

  window.addEventListener('keydown', e => {
    Audio.unlock();
    if (e.code === 'Escape') {
      phoneModal.classList.remove('open');
      garageModal.classList.remove('open');
      showFullMap = false;
      return;
    }
    if (isModalOpen()) return;
    if (e.code === 'KeyM') { showFullMap = !showFullMap; return; }
    if (e.code === 'KeyP') { openPhone(); return; }
    if (e.code === 'KeyF') { Entities.toggleVehicle(notify); return; }
    if (e.code === 'KeyE') { triggerPOI(); return; }
    if (e.code === 'KeyH' && Entities.player.inVehicle && Entities.player.inVehicle.spec.isPoliceModel) {
      Entities.player.inVehicle.sirenOn = !Entities.player.inVehicle.sirenOn;
      return;
    }
    if (keyMap[e.code]) input[keyMap[e.code]] = true;
  });

  window.addEventListener('keyup', e => {
    if (keyMap[e.code]) input[keyMap[e.code]] = false;
  });

  // Dotykové ovládanie pre mobil
  function bindTouch(id, prop) {
    const el = document.getElementById(id);
    const on = e => { e.preventDefault(); Audio.unlock(); input[prop] = true; el.classList.add('active'); };
    const off = e => { e.preventDefault(); input[prop] = false; el.classList.remove('active'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  }
  bindTouch('btnLeft', 'left');
  bindTouch('btnRight', 'right');
  bindTouch('btnGas', 'up');
  bindTouch('btnBrake', 'down');
  bindTouch('btnDrift', 'drift');
  bindTouch('btnNitro', 'nitro');

  document.getElementById('btnCar').addEventListener('click', () => { Audio.unlock(); Entities.toggleVehicle(notify); });
  document.getElementById('btnMap').addEventListener('click', () => { Audio.unlock(); showFullMap = !showFullMap; });
  document.getElementById('btnPhone').addEventListener('click', () => { Audio.unlock(); openPhone(); });
  document.getElementById('btnCancelM').addEventListener('click', () => Activities.cancelMission());
  actionPrompt.addEventListener('click', () => { Audio.unlock(); triggerPOI(); });

  btnSiren.addEventListener('click', () => {
    Audio.unlock();
    if (Entities.player.inVehicle && Entities.player.inVehicle.spec.isPoliceModel) {
      Entities.player.inVehicle.sirenOn = !Entities.player.inVehicle.sirenOn;
      notify(Entities.player.inVehicle.sirenOn ? '🚨 Siréna ZAPNUTÁ' : 'Siréna vypnutá', '#38bdf8');
    }
  });

  // Klik na radar otvorí veľkú mapu
  canvas.addEventListener('pointerdown', e => {
    Audio.unlock();
    if (showFullMap) { showFullMap = false; return; }
    if (
      e.clientX >= radarRect.x && e.clientX <= radarRect.x + radarRect.size &&
      e.clientY >= radarRect.y && e.clientY <= radarRect.y + radarRect.size
    ) {
      showFullMap = true;
    }
  });

  // Spustenie akcie na POI zóne
  function triggerPOI() {
    if (!currentPOI) return;
    if (currentPOI.type === 'garage') {
      openGarage();
    } else if (currentPOI.type === 'property') {
      const pr = currentPOI.propData;
      if (Activities.state.ownedProps.includes(pr.id)) {
        notify(`🏠 Tvoja nehnuteľnosť: ${pr.name} (+$${pr.income} / 20s)`, '#4ade80');
      } else {
        Activities.buyProperty(pr.id);
      }
    } else {
      Activities.startMission(currentPOI.type, currentPOI);
    }
  }

  // --- SMARTFÓN UI ---
  function openPhone() {
    showFullMap = false;
    garageModal.classList.remove('open');
    phoneModal.classList.add('open');
    renderPhoneTab();
  }
  document.getElementById('closePhone').addEventListener('click', () => phoneModal.classList.remove('open'));

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePhoneTab = btn.dataset.tab;
      renderPhoneTab();
    });
  });

  function renderPhoneTab() {
    const st = Activities.state;
    phoneBody.innerHTML = '';

    if (activePhoneTab === 'jobs') {
      const jobs = [
        { type: 'taxi',      title: '🚕 Taxi Jazda',           desc: 'Odvoz pasažiera na čas ($1 400+)', color: 'blue' },
        { type: 'courier',   title: '📦 Expres Kuriér',         desc: 'Rýchle doručenie balíka ($1 850+)', color: 'blue' },
        { type: 'race',      title: '🏁 Pouličné preteky',      desc: '6 checkpointov mestom ($3 500+)', color: 'blue' },
        { type: 'vigilante', title: '🚨 Policajná Hliadka',     desc: 'Zastav utekajúceho zločinca ($2 800+)', color: 'blue' },
        { type: 'flight',    title: '✈️ Letecké kruhy (Jet)',   desc: 'Preleť 5 kruhov stíhačkou ($4 500+)', color: 'blue' }
      ];
      jobs.forEach(j => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div><h4>${j.title}</h4><p>${j.desc}</p></div><button class="buy-btn ${j.color}">Spustiť</button>`;
        card.querySelector('button').onclick = () => {
          Activities.startMission(j.type);
          phoneModal.classList.remove('open');
        };
        phoneBody.appendChild(card);
      });
      const statsCard = document.createElement('div');
      statsCard.className = 'card';
      statsCard.innerHTML = `<div><h4>📊 Tvoje štatistiky</h4><p>Misie: ${st.stats.missionsDone} • Skoky: ${st.stats.stuntsDone} • Kufríky: ${st.collectedBoxes.length}/${Activities.BRIEFCASES.length} • Pasívny príjem: $${Activities.getTotalPassiveIncome()}/20s</p></div>`;
      phoneBody.appendChild(statsCard);
    } else if (activePhoneTab === 'cars') {
      Object.keys(Entities.VEH_TYPES).forEach(key => {
        const v = Entities.VEH_TYPES[key];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div><h4>${v.isAircraft ? '✈️ ' : '🚗 '}${v.name}</h4><p>Rýchlosť: ${Math.round(v.max * 14)} km/h • Odolnosť: ${v.hp}</p></div><button class="buy-btn">$${v.price.toLocaleString()}</button>`;
        card.querySelector('button').onclick = () => {
          if (Activities.orderVehicle(key)) phoneModal.classList.remove('open');
        };
        phoneBody.appendChild(card);
      });
    } else if (activePhoneTab === 'props') {
      Activities.PROPERTIES.forEach(pr => {
        const owned = st.ownedProps.includes(pr.id);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div><h4>🏠 ${pr.name}</h4><p>${pr.desc} • Príjem: +$${pr.income} / 20s</p></div><button class="buy-btn ${owned ? 'blue' : ''}">${owned ? 'Teleport' : '$' + pr.price.toLocaleString()}</button>`;
        card.querySelector('button').onclick = () => {
          if (owned) {
            Activities.teleportToProperty(pr.id);
            phoneModal.classList.remove('open');
          } else if (Activities.buyProperty(pr.id)) {
            renderPhoneTab();
          }
        };
        phoneBody.appendChild(card);
      });
    } else if (activePhoneTab === 'sys') {
      const soundCard = document.createElement('div');
      soundCard.className = 'card';
      soundCard.innerHTML = `<div><h4>🔊 Zvuky hry (Web Audio)</h4><p>Motor, sirény, nárazy, odmeny</p></div><button class="buy-btn blue">${st.soundOn ? 'ZAPNUTÉ' : 'VYPNUTÉ'}</button>`;
      soundCard.querySelector('button').onclick = () => {
        st.soundOn = !st.soundOn;
        Audio.setEnabled(st.soundOn);
        Activities.save();
        renderPhoneTab();
      };
      phoneBody.appendChild(soundCard);

      const timeCard = document.createElement('div');
      timeCard.className = 'card';
      timeCard.innerHTML = `<div><h4>🌗 Denný čas</h4><p>Aktuálny režim: ${st.timeMode.toUpperCase()}</p></div><button class="buy-btn blue">Prepnúť</button>`;
      timeCard.querySelector('button').onclick = () => {
        st.timeMode = st.timeMode === 'auto' ? 'day' : (st.timeMode === 'day' ? 'night' : 'auto');
        Activities.save();
        renderPhoneTab();
      };
      phoneBody.appendChild(timeCard);

      const resetCard = document.createElement('div');
      resetCard.className = 'card';
      resetCard.innerHTML = `<div><h4>🗑️ Resetovať postup</h4><p>Vymaže peniaze, nehnuteľnosti a tuning</p></div><button class="buy-btn red">Reset</button>`;
      resetCard.querySelector('button').onclick = () => {
        Activities.resetSave();
        phoneModal.classList.remove('open');
      };
      phoneBody.appendChild(resetCard);
    }
  }

  // --- GARÁŽ & TUNING UI ---
  function openGarage() {
    showFullMap = false;
    phoneModal.classList.remove('open');
    garageModal.classList.add('open');
    renderGarage();
  }
  document.getElementById('closeGarage').addEventListener('click', () => garageModal.classList.remove('open'));

  function renderGarage() {
    const up = Activities.state.upgrades;
    garageBody.innerHTML = '';

    // Rýchly Pay'n'Spray (oprava + zmazanie hviezdičiek)
    const fixCard = document.createElement('div');
    fixCard.className = 'card';
    fixCard.innerHTML = `<div><h4>🛡️ Pay'n'Spray Oprava + Zmazať políciu</h4><p>Opraví 100% HP vozidla a odstráni všetky ★</p></div><button class="buy-btn">$350</button>`;
    fixCard.querySelector('button').onclick = () => {
      if (Activities.paintVehicle(null, undefined)) garageModal.classList.remove('open');
    };
    garageBody.appendChild(fixCard);

    // Lakovanie
    const colors = ['#e11d48', '#2563eb', '#16a34a', '#facc15', '#a855f7', '#06b6d4', '#f8fafc', '#18181b'];
    const paintCard = document.createElement('div');
    paintCard.className = 'card';
    paintCard.style.flexDirection = 'column';
    paintCard.style.alignItems = 'flex-start';
    paintCard.innerHTML = `<div><h4>🎨 Prelakovať karosériu ($350)</h4></div><div class="swatches" id="paintSwatches"></div>`;
    colors.forEach(c => {
      const s = document.createElement('div');
      s.className = 'swatch';
      s.style.background = c;
      s.onclick = () => Activities.paintVehicle(c, undefined);
      paintCard.querySelector('#paintSwatches').appendChild(s);
    });
    garageBody.appendChild(paintCard);

    // Neónové podsvietenie
    const neons = [null, '#38bdf8', '#f43f5e', '#4ade80', '#a855f7', '#facc15'];
    const neonCard = document.createElement('div');
    neonCard.className = 'card';
    neonCard.style.flexDirection = 'column';
    neonCard.style.alignItems = 'flex-start';
    neonCard.innerHTML = `<div><h4>✨ Neónové podsvietenie ($350)</h4></div><div class="swatches" id="neonSwatches"></div>`;
    neons.forEach(n => {
      const s = document.createElement('div');
      s.className = 'swatch';
      s.style.background = n || '#334155';
      if (!n) s.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px">✕</span>';
      s.onclick = () => Activities.paintVehicle(null, n);
      neonCard.querySelector('#neonSwatches').appendChild(s);
    });
    garageBody.appendChild(neonCard);

    // Trvalé tuning vylepšenia
    const upgrades = [
      { key: 'engine', title: '⚡ Turbo Motor', desc: 'Vyššia maximálka a zrýchlenie pre všetky autá' },
      { key: 'nitro',  title: '🔥 Nitro Systém', desc: 'Silnejší Nitro boost a stíhačka' },
      { key: 'armor',  title: '🛡️ Pancierovanie', desc: 'Menšie poškodenie pri nárazoch' }
    ];
    upgrades.forEach(u => {
      const lvl = up[u.key] || 0;
      const cost = (lvl + 1) * 1800;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<div><h4>${u.title} (LVL ${lvl}/3)</h4><p>${u.desc}</p></div><button class="buy-btn ${lvl >= 3 ? 'blue' : ''}">${lvl >= 3 ? 'MAX' : '$' + cost.toLocaleString()}</button>`;
      card.querySelector('button').onclick = () => {
        if (Activities.buyUpgrade(u.key)) renderGarage();
      };
      garageBody.appendChild(card);
    });
  }

  // Kamera
  const cam = { x: Entities.player.x, y: Entities.player.y, zoom: 1.0 };

  function updateHUD() {
    const st = Activities.state;
    const p = Entities.player;
    const v = p.inVehicle;

    moneyHud.textContent = '$' + st.money.toLocaleString();
    levelHud.textContent = 'LVL ' + st.level;
    clockHud.textContent = Activities.getClockString();

    // Wanted hviezdičky
    const w = Entities.wanted.level;
    starsHud.textContent = w > 0 ? '★'.repeat(w) + '☆'.repeat(5 - w) : '';
    starsHud.style.color = w >= 3 ? '#ef4444' : '#facc15';

    // Rýchlosť a režim
    if (v) {
      const kmh = Math.round(Math.hypot(v.vx, v.vy) * 14);
      speedVal.textContent = v.spec.isAircraft && v.altitude > 0.2
        ? `${kmh} KM/H ✈ ${Math.round(v.altitude * 300)}m`
        : `${kmh} KM/H`;
      const hpPct = Math.max(0, Math.min(100, (v.hp / v.maxHp) * 100));
      hpBar.style.width = hpPct + '%';
      hpBar.style.background = hpPct > 45 ? '#22c55e' : (hpPct > 20 ? '#f59e0b' : '#ef4444');
      btnSiren.style.display = v.spec.isPoliceModel ? 'flex' : 'none';
    } else {
      speedVal.textContent = 'PEŠO';
      hpBar.style.width = '100%';
      hpBar.style.background = '#38bdf8';
      btnSiren.style.display = 'none';
    }

    const dist = World.getDistrictAt(p.x, p.y);
    if (dist) {
      districtHud.textContent = dist.name;
      districtHud.style.color = dist.color;
    }

    // Aktívna misia
    const m = Activities.activeMission;
    if (m) {
      missionBox.classList.add('show');
      mTitle.textContent = m.title;
      mDesc.textContent = m.desc;
      mTimer.textContent = `Čas: ${Math.max(0, Math.ceil(m.timer))}s`;
    } else {
      missionBox.classList.remove('show');
    }

    // Kontextová zóna (POI)
    currentPOI = Activities.getNearbyPOI(p.x, p.y);
    if (currentPOI && !isModalOpen()) {
      actionPrompt.textContent = `${currentPOI.icon} ${currentPOI.name} (E)`;
      actionPrompt.classList.add('show');
    } else {
      actionPrompt.classList.remove('show');
    }
  }

  function update(dt) {
    if (showFullMap || isModalOpen()) return;

    Entities.update(dt, input, Activities.state.upgrades, {
      onCriminalHit: Activities.onCriminalHit,
      onBusted: () => {
        const fine = Math.min(Activities.state.money, 400);
        Activities.state.money -= fine;
        Activities.save();
        Entities.player.x = World.spawnX; Entities.player.y = World.spawnY;
        if (Entities.player.inVehicle) {
          Entities.player.inVehicle.x = World.spawnX;
          Entities.player.inVehicle.y = World.spawnY;
          Entities.player.inVehicle.vx = 0; Entities.player.inVehicle.vy = 0;
        }
        notify(`🚔 BUSTED! Polícia ťa zatkla (pokuta -$${fine})`, '#ef4444');
      },
      onWasted: (msg) => {
        const fine = Math.min(Activities.state.money, 200);
        Activities.state.money -= fine;
        Activities.save();
        Entities.player.x = World.spawnX; Entities.player.y = World.spawnY;
        if (Entities.player.inVehicle) {
          Entities.player.inVehicle.x = World.spawnX;
          Entities.player.inVehicle.y = World.spawnY;
        }
        notify(msg, '#f97316');
      },
      onEscaped: () => notify('😎 Unikol si polícii!', '#4ade80')
    });

    Activities.update(dt);

    // Dynamická kamera (oddiali sa pri vysokej rýchlosti alebo vo vzduchu v stíhačke)
    const p = Entities.player;
    const v = p.inVehicle;
    const speed = v ? Math.hypot(v.vx, v.vy) : 0;
    const altZoom = v ? v.altitude * 0.28 : 0;
    const targetZoom = v
      ? Math.max(0.56, 1.0 - (speed / 22) * 0.28 - altZoom)
      : 1.15;

    cam.zoom += (targetZoom - cam.zoom) * 0.06 * dt;
    const lookX = v ? v.vx * 14 : 0;
    const lookY = v ? v.vy * 14 : 0;
    cam.x += (p.x + lookX - cam.x) * 0.11 * dt;
    cam.y += (p.y + lookY - cam.y) * 0.11 * dt;

    updateHUD();
  }

  function render(time) {
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(0, 0, W, H);

    // 1. Pozemný svet + značky + pozemné entity
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    Renderer.drawGround(ctx, cam, W, H, cam.zoom, time);
    Activities.drawWorldMarkers(ctx, cam, W, H, cam.zoom, time);
    Entities.drawGroundEntities(ctx, cam, W, H, cam.zoom, time, input);
    ctx.restore();

    // 2. 2.5D budovy
    Renderer.drawBuildings25D(ctx, cam, W, H, cam.zoom);

    // 3. Letiace stíhačky AŽ NAD budovami!
    Entities.drawFlyingEntities(ctx, cam, W, H, cam.zoom, time, input);

    // 4. Cyklus dňa a noci + GPS šípka misie
    Renderer.drawDayNight(ctx, W, H, Activities.getDarknessAlpha());
    Activities.drawGPSArrow(ctx, W, H);

    // 5. Radar alebo celoobrazovková mapa sveta
    const allBlips = Activities.getRadarBlips().concat(Entities.getRadarBlips());
    if (showFullMap) {
      Renderer.drawFullMap(ctx, W, H, Entities.player, allBlips);
    } else {
      radarRect = Renderer.drawRadar(ctx, W, Entities.player, allBlips, time);
    }
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 16.667, 2);
    lastTime = now;
    update(dt);
    render(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
