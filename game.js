(function () {
  const World = window.GTA.World;
  const Renderer = window.GTA.Renderer;
  const Entities = window.GTA.Entities;
  const Police = window.GTA.Police;
  const Activities = window.GTA.Activities;
  const Audio = window.GTA.Audio;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // HUD prvky
  const moneyHud = document.getElementById('moneyHud');
  const levelHud = document.getElementById('levelHud');
  const clockHud = document.getElementById('clockHud');
  const starsHud = document.getElementById('starsHud');
  const escapeBadge = document.getElementById('escapeBadge');
  const speedVal = document.getElementById('speedVal');
  const districtHud = document.getElementById('districtHud');
  const hpFill = document.getElementById('hpFill');
  const armorFill = document.getElementById('armorFill');
  const vehHpWrap = document.getElementById('vehHpWrap');
  const vehHpFill = document.getElementById('vehHpFill');
  const hudRight = document.getElementById('hudRight');

  const missionBox = document.getElementById('missionBox');
  const mTitle = document.getElementById('mTitle');
  const mDesc = document.getElementById('mDesc');
  const mTimer = document.getElementById('mTimer');
  const actionPrompt = document.getElementById('actionPrompt');
  const toastEl = document.getElementById('toast');
  const btnSiren = document.getElementById('btnSiren');
  const btnWeapon = document.getElementById('btnWeapon');
  const bustedWrap = document.getElementById('bustedWrap');
  const bustedFill = document.getElementById('bustedFill');
  const damageVignette = document.getElementById('damageVignette');

  const cinOverlay = document.getElementById('cinematicOverlay');
  const cinTitle = document.getElementById('cinTitle');
  const cinSub = document.getElementById('cinSub');

  const phoneModal = document.getElementById('phoneModal');
  const phoneBody = document.getElementById('phoneBody');
  const garageModal = document.getElementById('garageModal');
  const garageBody = document.getElementById('garageBody');

  // Ostrý HD displej (Retina / HiDPI) pre mobil aj PC
  let W = 0, H = 0, DPR = 1;
  let showFullMap = false;
  let radarRect = { x: 0, y: 0, size: 112 };
  let activePhoneTab = 'jobs';
  let currentPOI = null;
  let toastTimer = null;
  let shakeMag = 0;
  let cinematicTimer = 0;
  let lastMode = 'car';

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const rSize = Math.min(124, Math.max(96, Math.round(W * 0.27)));
    hudRight.style.top = (rSize + 18) + 'px';
    hudRight.style.width = rSize + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  function notify(msg, color) {
    toastEl.textContent = msg;
    toastEl.style.color = color || '#fff';
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function showCinematic(title, sub, color, onDone) {
    cinTitle.textContent = title;
    cinTitle.style.color = color;
    cinSub.textContent = sub;
    cinOverlay.classList.add('show');
    cinematicTimer = 2.6;
    setTimeout(() => {
      cinOverlay.classList.remove('show');
      if (onDone) onDone();
    }, 2600);
  }

  Entities.init();
  Activities.init(notify);

  // Vstup: klávesnica + mobilné tlačidlá + 360° joystick
  const input = {
    up: false, down: false, left: false, right: false,
    drift: false, nitro: false, fire: false,
    joyX: 0, joyY: 0
  };

  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'drift',
    ShiftLeft: 'nitro', ShiftRight: 'nitro',
    KeyQ: 'fire', KeyX: 'fire'
  };

  function isModalOpen() {
    return phoneModal.classList.contains('open') || garageModal.classList.contains('open') || cinematicTimer > 0;
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
    if (e.code === 'KeyR') { Entities.switchWeapon(notify); return; }
    if (e.code === 'KeyH' && Entities.player.inVehicle && Entities.player.inVehicle.spec.isPoliceModel) {
      Entities.player.inVehicle.sirenOn = !Entities.player.inVehicle.sirenOn;
      return;
    }
    if (keyMap[e.code]) input[keyMap[e.code]] = true;
  });

  window.addEventListener('keyup', e => {
    if (keyMap[e.code]) input[keyMap[e.code]] = false;
  });

  // =========================================================================
  // 360° DOTYKOVÝ JOYSTICK PRE CHODENIE A ŠPRINT PEŠO (Multi-touch!)
  // =========================================================================
  const joyZone = document.getElementById('joyZone');
  const joyKnob = document.getElementById('joyKnob');
  let joyTouchId = null;
  const JOY_MAX_R = 44;

  function updateJoyFromPoint(clientX, clientY) {
    const rect = joyZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_MAX_R) {
      dx = (dx / dist) * JOY_MAX_R;
      dy = (dy / dist) * JOY_MAX_R;
    }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.joyX = dx / JOY_MAX_R;
    input.joyY = dy / JOY_MAX_R;
    if (Math.hypot(input.joyX, input.joyY) > 0.74) joyZone.classList.add('sprinting');
    else joyZone.classList.remove('sprinting');
  }

  function resetJoy() {
    joyTouchId = null;
    input.joyX = 0;
    input.joyY = 0;
    joyKnob.style.transform = 'translate(0px, 0px)';
    joyZone.classList.remove('sprinting');
  }

  joyZone.addEventListener('touchstart', e => {
    e.preventDefault();
    Audio.unlock();
    if (joyTouchId !== null) return;
    const t = e.changedTouches[0];
    joyTouchId = t.identifier;
    updateJoyFromPoint(t.clientX, t.clientY);
  }, { passive: false });

  joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        updateJoyFromPoint(t.clientX, t.clientY);
        break;
      }
    }
  }, { passive: false });

  const endJoyTouch = e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) { resetJoy(); break; }
    }
  };
  joyZone.addEventListener('touchend', endJoyTouch, { passive: false });
  joyZone.addEventListener('touchcancel', endJoyTouch, { passive: false });

  // Podpora joysticku aj myšou pri testovaní na PC
  let joyMouseDown = false;
  joyZone.addEventListener('mousedown', e => { joyMouseDown = true; Audio.unlock(); updateJoyFromPoint(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e => { if (joyMouseDown) updateJoyFromPoint(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { if (joyMouseDown) { joyMouseDown = false; resetJoy(); } });

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
  bindTouch('btnFire', 'fire');

  document.getElementById('btnCar').addEventListener('click', () => {
    Audio.unlock();
    resetJoy();
    Entities.toggleVehicle(notify);
  });
  document.getElementById('btnMap').addEventListener('click', () => { Audio.unlock(); showFullMap = !showFullMap; });
  document.getElementById('btnPhone').addEventListener('click', () => { Audio.unlock(); openPhone(); });
  btnWeapon.addEventListener('click', () => { Audio.unlock(); Entities.switchWeapon(notify); });
  document.getElementById('btnCancelM').addEventListener('click', () => Activities.cancelMission());
  actionPrompt.addEventListener('click', () => { Audio.unlock(); triggerPOI(); });

  btnSiren.addEventListener('click', () => {
    Audio.unlock();
    if (Entities.player.inVehicle && Entities.player.inVehicle.spec.isPoliceModel) {
      Entities.player.inVehicle.sirenOn = !Entities.player.inVehicle.sirenOn;
      notify(Entities.player.inVehicle.sirenOn ? '🚨 Siréna ZAPNUTÁ' : 'Siréna vypnutá', '#38bdf8');
    }
  });

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

  function triggerPOI() {
    if (!currentPOI) return;
    if (currentPOI.type === 'garage') openGarage();
    else if (currentPOI.type === 'property') {
      const pr = currentPOI.propData;
      if (Activities.state.ownedProps.includes(pr.id)) notify(`🏠 Tvoja nehnuteľnosť: ${pr.name} (+$${pr.income}/20s)`, '#4ade80');
      else Activities.buyProperty(pr.id);
    } else Activities.startMission(currentPOI.type, currentPOI);
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
        { type: 'taxi',      title: '🚕 Taxi Jazda',         desc: 'Odvoz pasažiera na čas ($1 400+)' },
        { type: 'courier',   title: '📦 Expres Kuriér',       desc: 'Rýchle doručenie balíka ($1 850+)' },
        { type: 'race',      title: '🏁 Pouličné preteky',    desc: '6 checkpointov mestom ($3 500+)' },
        { type: 'vigilante', title: '🚨 Policajná Hliadka',   desc: 'Znič utekajúceho zločinca ($2 800+)' },
        { type: 'flight',    title: '✈️ Letecké kruhy (Jet)', desc: 'Preleť 5 kruhov stíhačkou ($4 500+)' }
      ];
      jobs.forEach(j => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div><h4>${j.title}</h4><p>${j.desc}</p></div><button class="buy-btn blue">Spustiť</button>`;
        card.querySelector('button').onclick = () => {
          Activities.startMission(j.type);
          phoneModal.classList.remove('open');
        };
        phoneBody.appendChild(card);
      });

      const gearCard = document.createElement('div');
      gearCard.className = 'card';
      gearCard.innerHTML = `<div><h4>🛡️ Nepriestrelná vesta + Lekárnička</h4><p>Doplní 100% HP a 100% vestu na prestrelky</p></div><button class="buy-btn">$450</button>`;
      gearCard.querySelector('button').onclick = () => {
        if (Activities.spendMoney(450)) {
          Entities.player.hp = 100; Entities.player.armor = 100;
          notify('🛡️ Plné zdravie a vesta doplnená!', '#38bdf8');
          phoneModal.classList.remove('open');
        }
      };
      phoneBody.appendChild(gearCard);

      const ammoCard = document.createElement('div');
      ammoCard.className = 'card';
      ammoCard.innerHTML = `<div><h4>🚀 Dokúpiť RPG Rakety (+5 ks)</h4><p>Aktuálne máš: ${Entities.player.rockets} rakiet</p></div><button class="buy-btn">$600</button>`;
      ammoCard.querySelector('button').onclick = () => {
        if (Activities.spendMoney(600)) {
          Entities.player.rockets += 5;
          notify('🚀 +5 rakiet do RPG!', '#facc15');
          renderPhoneTab();
        }
      };
      phoneBody.appendChild(ammoCard);
    } else if (activePhoneTab === 'cars') {
      Object.keys(Entities.VEH_TYPES).forEach(key => {
        const v = Entities.VEH_TYPES[key];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div><h4>${v.isAircraft ? '✈️ ' : (v.isTank ? '🪖 ' : '🚗 ')}${v.name}</h4><p>Max: ${Math.round(v.max * 14)} km/h • Odolnosť: ${v.hp}</p></div><button class="buy-btn">$${v.price.toLocaleString()}</button>`;
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
        card.innerHTML = `<div><h4>🏠 ${pr.name}</h4><p>${pr.desc} • +$${pr.income} / 20s</p></div><button class="buy-btn ${owned ? 'blue' : ''}">${owned ? 'Teleport' : '$' + pr.price.toLocaleString()}</button>`;
        card.querySelector('button').onclick = () => {
          if (owned) { Activities.teleportToProperty(pr.id); phoneModal.classList.remove('open'); }
          else if (Activities.buyProperty(pr.id)) renderPhoneTab();
        };
        phoneBody.appendChild(card);
      });
    } else if (activePhoneTab === 'sys') {
      const soundCard = document.createElement('div');
      soundCard.className = 'card';
      soundCard.innerHTML = `<div><h4>🔊 Zvuky hry</h4><p>Motor, streľba, výbuchy, sirény</p></div><button class="buy-btn blue">${st.soundOn ? 'ZAPNUTÉ' : 'VYPNUTÉ'}</button>`;
      soundCard.querySelector('button').onclick = () => {
        st.soundOn = !st.soundOn; Audio.setEnabled(st.soundOn); Activities.save(); renderPhoneTab();
      };
      phoneBody.appendChild(soundCard);

      const timeCard = document.createElement('div');
      timeCard.className = 'card';
      timeCard.innerHTML = `<div><h4>🌗 Denný čas</h4><p>Režim: ${st.timeMode.toUpperCase()}</p></div><button class="buy-btn blue">Prepnúť</button>`;
      timeCard.querySelector('button').onclick = () => {
        st.timeMode = st.timeMode === 'auto' ? 'night' : (st.timeMode === 'night' ? 'day' : 'auto');
        Activities.save(); renderPhoneTab();
      };
      phoneBody.appendChild(timeCard);

      const resetCard = document.createElement('div');
      resetCard.className = 'card';
      resetCard.innerHTML = `<div><h4>🗑️ Resetovať postup</h4><p>Vymaže peniaze, reality a tuning</p></div><button class="buy-btn red">Reset</button>`;
      resetCard.querySelector('button').onclick = () => { Activities.resetSave(); phoneModal.classList.remove('open'); };
      phoneBody.appendChild(resetCard);
    }
  }

  // --- GARÁŽ UI ---
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

    const fixCard = document.createElement('div');
    fixCard.className = 'card';
    fixCard.innerHTML = `<div><h4>🛡️ Pay'n'Spray Oprava + Zmazať políciu</h4><p>100% HP + vesta + zmazanie všetkých ★</p></div><button class="buy-btn">$350</button>`;
    fixCard.querySelector('button').onclick = () => {
      if (Activities.paintVehicle(null, undefined)) garageModal.classList.remove('open');
    };
    garageBody.appendChild(fixCard);

    const colors = ['#e11d48', '#2563eb', '#16a34a', '#facc15', '#a855f7', '#06b6d4', '#f8fafc', '#18181b'];
    const paintCard = document.createElement('div');
    paintCard.className = 'card';
    paintCard.style.flexDirection = 'column';
    paintCard.style.alignItems = 'flex-start';
    paintCard.innerHTML = `<div><h4>🎨 Prelakovať karosériu ($350)</h4></div><div class="swatches" id="paintSwatches"></div>`;
    colors.forEach(c => {
      const s = document.createElement('div');
      s.className = 'swatch'; s.style.background = c;
      s.onclick = () => Activities.paintVehicle(c, undefined);
      paintCard.querySelector('#paintSwatches').appendChild(s);
    });
    garageBody.appendChild(paintCard);

    const neons = [null, '#38bdf8', '#f43f5e', '#4ade80', '#a855f7', '#facc15'];
    const neonCard = document.createElement('div');
    neonCard.className = 'card';
    neonCard.style.flexDirection = 'column';
    neonCard.style.alignItems = 'flex-start';
    neonCard.innerHTML = `<div><h4>✨ Neónové podsvietenie ($350)</h4></div><div class="swatches" id="neonSwatches"></div>`;
    neons.forEach(n => {
      const s = document.createElement('div');
      s.className = 'swatch'; s.style.background = n || '#334155';
      if (!n) s.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px">✕</span>';
      s.onclick = () => Activities.paintVehicle(null, n);
      neonCard.querySelector('#neonSwatches').appendChild(s);
    });
    garageBody.appendChild(neonCard);

    const upgrades = [
      { key: 'engine', title: '⚡ Turbo Motor', desc: 'Vyššia maximálka a zrýchlenie' },
      { key: 'nitro',  title: '🔥 Nitro Systém', desc: 'Silnejší boost a odhodenie polície' },
      { key: 'armor',  title: '🛡️ Pancierovanie', desc: 'Menšie poškodenie pri nárazoch' }
    ];
    upgrades.forEach(u => {
      const lvl = up[u.key] || 0;
      const cost = (lvl + 1) * 1800;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<div><h4>${u.title} (LVL ${lvl}/3)</h4><p>${u.desc}</p></div><button class="buy-btn ${lvl >= 3 ? 'blue' : ''}">${lvl >= 3 ? 'MAX' : '$' + cost.toLocaleString()}</button>`;
      card.querySelector('button').onclick = () => { if (Activities.buyUpgrade(u.key)) renderGarage(); };
      garageBody.appendChild(card);
    });
  }

  const cam = { x: Entities.player.x, y: Entities.player.y, zoom: 1.0 };

  function updateHUD() {
    const st = Activities.state;
    const p = Entities.player;
    const v = p.inVehicle;
    const w = Entities.wanted;

    // Automatické prepnutie rozhrania AUTO vs PEŠO (360° Joystick)
    const curMode = v ? 'car' : 'foot';
    if (curMode !== lastMode) {
      lastMode = curMode;
      document.body.classList.toggle('mode-car', curMode === 'car');
      document.body.classList.toggle('mode-foot', curMode === 'foot');
    }

    moneyHud.textContent = '$' + st.money.toLocaleString();
    levelHud.textContent = 'LVL ' + st.level;
    clockHud.textContent = Activities.getClockString();
    btnWeapon.textContent = p.weapon === 'rpg' ? `🚀 ${p.rockets}` : '🔫 SMG';

    // Zdravie, vesta a HP auta
    hpFill.style.width = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) + '%';
    armorFill.style.width = Math.max(0, Math.min(100, (p.armor / p.maxArmor) * 100)) + '%';
    damageVignette.style.opacity = p.hitFlash > 0.05 ? (p.hitFlash * 0.75) : 0;

    // Wanted hviezdičky + blikanie pri schovávaní
    starsHud.textContent = w.level > 0 ? '★'.repeat(w.level) + '☆'.repeat(5 - w.level) : '';
    starsHud.style.color = w.level >= 3 ? '#ef4444' : '#facc15';
    const isEscaping = w.level > 0 && !w.seen;
    starsHud.classList.toggle('searching', isEscaping);
    escapeBadge.style.display = isEscaping ? 'block' : 'none';
    if (isEscaping) escapeBadge.textContent = `ÚTEK: ${Math.max(1, Math.ceil(w.searchTimer))}s`;

    // Zatýkanie
    if (w.bustedProgress > 0.04) {
      bustedWrap.classList.add('show');
      bustedFill.style.width = Math.round(w.bustedProgress * 100) + '%';
    } else {
      bustedWrap.classList.remove('show');
    }

    if (v) {
      const kmh = Math.round(Math.hypot(v.vx, v.vy) * 14);
      speedVal.textContent = v.spec.isAircraft && v.altitude > 0.2
        ? `${kmh} KM/H ✈ ${Math.round(v.altitude * 300)}m`
        : `${kmh} KM/H`;
      vehHpWrap.style.display = 'block';
      vehHpFill.style.width = Math.max(0, Math.min(100, (v.hp / v.maxHp) * 100)) + '%';
      btnSiren.style.display = v.spec.isPoliceModel ? 'flex' : 'none';
    } else {
      speedVal.textContent = 'PEŠO';
      vehHpWrap.style.display = 'none';
      btnSiren.style.display = 'none';
    }

    const dist = World.getDistrictAt(p.x, p.y);
    if (dist) {
      districtHud.textContent = dist.name;
      districtHud.style.color = dist.color;
    }

    const m = Activities.activeMission;
    if (m) {
      missionBox.classList.add('show');
      mTitle.textContent = m.title;
      mDesc.textContent = m.desc;
      mTimer.textContent = `Čas: ${Math.max(0, Math.ceil(m.timer))}s`;
    } else {
      missionBox.classList.remove('show');
    }

    currentPOI = Activities.getNearbyPOI(p.x, p.y);
    if (currentPOI && !isModalOpen()) {
      actionPrompt.textContent = `${currentPOI.icon} ${currentPOI.name} (E)`;
      actionPrompt.classList.add('show');
    } else {
      actionPrompt.classList.remove('show');
    }
  }

  function update(dt) {
    if (cinematicTimer > 0) {
      cinematicTimer = Math.max(0, cinematicTimer - dt / 60);
      return;
    }
    if (showFullMap || isModalOpen()) return;

    Entities.update(dt, input, Activities.state.upgrades, {
      onNotify: notify,
      onShake: amt => { shakeMag = Math.max(shakeMag, amt); },
      onCriminalHit: Activities.onCriminalHit,
      onPoliceDestroyed: () => Activities.addMoney(350, 'Zničená policajná jednotka (+2 RPG)'),
      onCopDown: () => Activities.addMoney(90, 'Zneškodnený policajt'),
      onBusted: (stars) => {
        resetJoy();
        const fine = Math.min(Activities.state.money, 150 * Math.max(1, stars || 1));
        Activities.state.money -= fine;
        Activities.save();
        Entities.player.rockets = Math.floor(Entities.player.rockets / 2);
        Entities.player.inVehicle = null;
        Entities.player.x = Police.POLICE_STATION.x;
        Entities.player.y = Police.POLICE_STATION.y;
        Entities.player.hp = 100;
        showCinematic(
          'BUSTED',
          `Polícia ťa zatkla • Pokuta -$${fine.toLocaleString()} • Prepustený pred Policajnou stanicou`,
          '#38bdf8'
        );
      },
      onWasted: () => {
        resetJoy();
        const bill = Math.min(Activities.state.money, 250);
        Activities.state.money -= bill;
        Activities.save();
        Entities.player.inVehicle = null;
        Entities.player.x = Police.HOSPITAL.x;
        Entities.player.y = Police.HOSPITAL.y;
        Entities.player.hp = 100;
        Entities.player.armor = 25;
        showCinematic(
          'WASTED',
          `Bol si vyradený • Nemocničný účet -$${bill.toLocaleString()} • Ošetrený v Grand City Hospital`,
          '#ef4444'
        );
      },
      onEscaped: () => notify('😎 Čistý útek! Polícia prerušila pátranie.', '#4ade80')
    });

    Activities.update(dt);

    const p = Entities.player;
    const v = p.inVehicle;
    const speed = v ? Math.hypot(v.vx, v.vy) : 0;
    const altZoom = v ? v.altitude * 0.28 : 0;
    const isMobileNarrow = W < 600;
    const baseZoom = v ? (isMobileNarrow ? 0.88 : 1.0) : (isMobileNarrow ? 1.12 : 1.22);
    const targetZoom = v ? Math.max(0.52, baseZoom - (speed / 22) * 0.25 - altZoom) : baseZoom;

    cam.zoom += (targetZoom - cam.zoom) * 0.07 * dt;
    const lookX = v ? v.vx * 14 : 0;
    const lookY = v ? v.vy * 14 : 0;
    cam.x += (p.x + lookX - cam.x) * 0.12 * dt;
    cam.y += (p.y + lookY - cam.y) * 0.12 * dt;

    shakeMag *= Math.pow(0.84, dt);
    if (shakeMag < 0.2) shakeMag = 0;

    updateHUD();
  }

  function render(time) {
    // Nastavenie natívnej HD ostrosti (Retina DPR)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const darkAlpha = Activities.getDarknessAlpha();
    const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
    const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
    const renderCam = { x: cam.x + sx, y: cam.y + sy, zoom: cam.zoom };

    ctx.fillStyle = '#083358';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(renderCam.zoom, renderCam.zoom);
    ctx.translate(-renderCam.x, -renderCam.y);

    Renderer.drawGround(ctx, renderCam, W, H, renderCam.zoom, time);
    Renderer.drawBuildingShadows(ctx, renderCam, W, H, renderCam.zoom, darkAlpha);
    Activities.drawWorldMarkers(ctx, renderCam, W, H, renderCam.zoom, time);
    Entities.drawGroundEntities(ctx, renderCam, W, H, renderCam.zoom, time, input);
    ctx.restore();

    Renderer.drawBuildings25D(ctx, renderCam, W, H, renderCam.zoom, time, darkAlpha);
    Entities.drawFlyingEntities(ctx, renderCam, W, H, renderCam.zoom, time, input);
    Renderer.drawDayNight(ctx, renderCam, W, H, renderCam.zoom, darkAlpha, time, Entities);
    Activities.drawGPSArrow(ctx, W, H);

    const allBlips = Activities.getRadarBlips().concat(Entities.getRadarBlips());
    const cones = Police.getVisionCones();
    if (showFullMap) {
      Renderer.drawFullMap(ctx, W, H, Entities.player, allBlips);
    } else {
      radarRect = Renderer.drawRadar(ctx, W, Entities.player, allBlips, cones, Entities.wanted, time);
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
