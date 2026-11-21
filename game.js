(function () {
  const World = window.GTA.World;
  const Renderer = window.GTA.Renderer;
  const Entities = window.GTA.Entities;
  const Police = window.GTA.Police;
  const Activities = window.GTA.Activities;
  const Interiors = window.GTA.Interiors;
  const Audio = window.GTA.Audio;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

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
  const btnCarFoot = document.getElementById('btnCarFoot');
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
  const interiorModal = document.getElementById('interiorModal');
  const intTitle = document.getElementById('intTitle');
  const intBody = document.getElementById('intBody');

  let W = 0, H = 0, DPR = 1;
  let showFullMap = false;
  let radarRect = { x: 0, y: 0, size: 112 };
  let activePhoneTab = 'jobs';
  let currentAction = null;
  let toastTimer = null;
  let shakeMag = 0;
  let cinematicTimer = 0;
  let lastMode = 'car';

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

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
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
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

  if (Activities.state.outfitColor) Entities.player.outfitColor = Activities.state.outfitColor;
  if (Activities.state.ownedWeapons && Activities.state.ownedWeapons.length) {
    Entities.player.ownedWeapons = Activities.state.ownedWeapons.slice();
  }

  const input = {
    up: false, down: false, left: false, right: false,
    drift: false, nitro: false, fire: false, joyX: 0, joyY: 0
  };
  const keyMap = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'drift', ShiftLeft: 'nitro', ShiftRight: 'nitro', KeyQ: 'fire', KeyX: 'fire'
  };

  function isModalOpen() {
    return phoneModal.classList.contains('open') ||
      garageModal.classList.contains('open') ||
      interiorModal.classList.contains('open') ||
      cinematicTimer > 0;
  }

  window.addEventListener('keydown', e => {
    if (Audio) Audio.unlock();
    if (e.code === 'Escape') {
      phoneModal.classList.remove('open'); garageModal.classList.remove('open');
      interiorModal.classList.remove('open'); showFullMap = false; return;
    }
    if (isModalOpen()) return;
    if (e.code === 'KeyM' && !(Interiors && Interiors.isInside())) { showFullMap = !showFullMap; return; }
    if (e.code === 'KeyP') { openPhone(); return; }
    if (e.code === 'KeyF' && !(Interiors && Interiors.isInside())) { Entities.toggleVehicle(notify); return; }
    if (e.code === 'KeyE') { triggerAction(); return; }
    if (e.code === 'KeyR') { Entities.switchWeapon(notify); return; }
    if (e.code === 'KeyH' && Entities.player.inVehicle && Entities.player.inVehicle.spec.isPoliceModel) {
      Entities.player.inVehicle.sirenOn = !Entities.player.inVehicle.sirenOn; return;
    }
    if (keyMap[e.code]) input[keyMap[e.code]] = true;
  });

  window.addEventListener('keyup', e => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });

  // 360° Joystick
  const joyZone = document.getElementById('joyZone');
  const joyKnob = document.getElementById('joyKnob');
  let joyTouchId = null;
  const JOY_MAX_R = 40;

  function updateJoyFromPoint(clientX, clientY) {
    const rect = joyZone.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2), dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_MAX_R) { dx = (dx / dist) * JOY_MAX_R; dy = (dy / dist) * JOY_MAX_R; }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.joyX = dx / JOY_MAX_R; input.joyY = dy / JOY_MAX_R;
    joyZone.classList.toggle('sprinting', Math.hypot(input.joyX, input.joyY) > 0.74);
  }
  function resetJoy() {
    joyTouchId = null; input.joyX = 0; input.joyY = 0;
    joyKnob.style.transform = 'translate(0px, 0px)'; joyZone.classList.remove('sprinting');
  }

  joyZone.addEventListener('touchstart', e => {
    e.preventDefault(); if (Audio) Audio.unlock();
    if (joyTouchId !== null) return;
    const t = e.changedTouches[0]; joyTouchId = t.identifier;
    updateJoyFromPoint(t.clientX, t.clientY);
  }, { passive: false });
  joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) { updateJoyFromPoint(e.changedTouches[i].clientX, e.changedTouches[i].clientY); break; }
    }
  }, { passive: false });
  const endJoyTouch = e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) { resetJoy(); break; }
    }
  };
  joyZone.addEventListener('touchend', endJoyTouch, { passive: false });
  joyZone.addEventListener('touchcancel', endJoyTouch, { passive: false });

  let joyMouseDown = false;
  joyZone.addEventListener('mousedown', e => { joyMouseDown = true; if (Audio) Audio.unlock(); updateJoyFromPoint(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e => { if (joyMouseDown) updateJoyFromPoint(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { if (joyMouseDown) { joyMouseDown = false; resetJoy(); } });

  function bindTouch(id, prop) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = e => { e.preventDefault(); if (Audio) Audio.unlock(); input[prop] = true; el.classList.add('active'); };
    const off = e => { e.preventDefault(); input[prop] = false; el.classList.remove('active'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }
  bindTouch('btnLeft', 'left'); bindTouch('btnRight', 'right');
  bindTouch('btnGas', 'up'); bindTouch('btnBrake', 'down');
  bindTouch('btnDrift', 'drift'); bindTouch('btnNitro', 'nitro'); bindTouch('btnFire', 'fire');

  const onCarToggle = () => { if (Audio) Audio.unlock(); resetJoy(); Entities.toggleVehicle(notify); };
  document.getElementById('btnCar').addEventListener('click', onCarToggle);
  btnCarFoot.addEventListener('click', onCarToggle);
  document.getElementById('btnMap').addEventListener('click', () => { if (Audio) Audio.unlock(); if (!(Interiors && Interiors.isInside())) showFullMap = !showFullMap; });
  document.getElementById('btnPhone').addEventListener('click', () => { if (Audio) Audio.unlock(); openPhone(); });
  btnWeapon.addEventListener('click', () => { if (Audio) Audio.unlock(); Entities.switchWeapon(notify); });
  document.getElementById('btnCancelM').addEventListener('click', () => Activities.cancelMission());
  actionPrompt.addEventListener('click', () => { if (Audio) Audio.unlock(); triggerAction(); });

  btnSiren.addEventListener('click', () => {
    if (Audio) Audio.unlock();
    if (Entities.player.inVehicle && Entities.player.inVehicle.spec.isPoliceModel) {
      Entities.player.inVehicle.sirenOn = !Entities.player.inVehicle.sirenOn;
      notify(Entities.player.inVehicle.sirenOn ? '🚨 Siréna ZAPNUTÁ' : 'Siréna vypnutá', '#38bdf8');
    }
  });

  canvas.addEventListener('pointerdown', e => {
    if (Audio) Audio.unlock();
    if (Interiors && Interiors.isInside()) return;
    if (showFullMap) { showFullMap = false; return; }
    if (e.clientX >= radarRect.x && e.clientX <= radarRect.x + radarRect.size &&
        e.clientY >= radarRect.y && e.clientY <= radarRect.y + radarRect.size) showFullMap = true;
  });

  function triggerAction() {
    if (!currentAction) return;
    const act = currentAction;

    if (act.kind === 'door') {
      if (Entities.player.inVehicle) Entities.toggleVehicle(notify);
      resetJoy();
      Interiors.enter(act.door.id, act.door.x, act.door.y, notify);
    } else if (act.kind === 'spot') {
      const s = act.spot;
      if (s.id === 'exit') { resetJoy(); Interiors.exit(notify); }
      else if (s.id === 'vault') Interiors.startBankHeist(notify);
      else if (s.id === 'ammu_shop') openAmmuShop();
      else if (s.id === 'food_menu') openBurgerShop();
      else if (s.id === 'slots') openSlotsGame();
      else if (s.id === 'blackjack') openBlackjackGame();
      else if (s.id === 'wardrobe') openWardrobe();
      else if (s.id === 'bed') sleepAtHome();
    } else if (act.kind === 'poi') {
      const poi = act.poi;
      if (poi.type === 'garage') openGarage();
      else if (poi.type === 'chopshop') Activities.deliverChopCar();
      else if (poi.type === 'property') {
        const pr = poi.propData;
        if (Activities.state.ownedProps.includes(pr.id)) notify(`🏠 Tvoja nehnuteľnosť: ${pr.name} (+$${pr.income}/min)`, '#4ade80');
        else Activities.buyProperty(pr.id);
      } else Activities.startMission(poi.type, poi);
    }
  }

  // --- INTERIÉROVÉ OBCHODY & MINIHRY ---
  document.getElementById('closeInterior').addEventListener('click', () => interiorModal.classList.remove('open'));
  function openInteriorModal(title) {
    resetJoy(); intTitle.textContent = title; intBody.innerHTML = ''; interiorModal.classList.add('open');
  }

  function openAmmuShop() {
    openInteriorModal('🔫 Ammu-Nation – Zbrane');
    const items = [
      { id: 'shotgun', title: '💥 Brokovnica (5 brokov)', desc: 'Ničivá na blízko proti polícii a gangom', price: 2200 },
      { id: 'rifle',   title: '🎯 Útočná puška AK-47',     desc: 'Rýchla, presná a silná streľba', price: 4200 }
    ];
    items.forEach(it => {
      const owned = Entities.player.ownedWeapons.includes(it.id);
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div><h4>${it.title}</h4><p>${it.desc}</p></div><button class="buy-btn ${owned ? 'blue' : ''}">${owned ? 'Vybrať' : '$' + it.price.toLocaleString()}</button>`;
      card.querySelector('button').onclick = () => {
        if (owned) { Entities.player.weapon = it.id; notify(`Zbraň: ${it.title}`, '#facc15'); interiorModal.classList.remove('open'); }
        else if (Activities.spendMoney(it.price)) {
          Entities.player.ownedWeapons.push(it.id); Entities.player.weapon = it.id;
          Activities.state.ownedWeapons = Entities.player.ownedWeapons.slice(); Activities.save();
          if (Audio) Audio.playSuccess(); notify(`🔫 Kúpil si ${it.title}!`, '#4ade80'); openAmmuShop();
        }
      };
      intBody.appendChild(card);
    });

    const armorCard = document.createElement('div'); armorCard.className = 'card';
    armorCard.innerHTML = `<div><h4>🛡️ Ťažká nepriestrelná vesta</h4><p>Doplní 100 % vesty</p></div><button class="buy-btn">$350</button>`;
    armorCard.querySelector('button').onclick = () => {
      if (Activities.spendMoney(350)) { Entities.player.armor = 100; if (Audio) Audio.playSuccess(); notify('🛡️ Vesta 100%!', '#38bdf8'); }
    };
    intBody.appendChild(armorCard);

    const rpgCard = document.createElement('div'); rpgCard.className = 'card';
    rpgCard.innerHTML = `<div><h4>🚀 Balík RPG Rakiet (+5 ks)</h4><p>Máš: ${Entities.player.rockets} rakiet</p></div><button class="buy-btn">$600</button>`;
    rpgCard.querySelector('button').onclick = () => {
      if (Activities.spendMoney(600)) { Entities.player.rockets += 5; if (Audio) Audio.playCash(); notify('🚀 +5 rakiet!', '#facc15'); openAmmuShop(); }
    };
    intBody.appendChild(rpgCard);
  }

  function openBurgerShop() {
    openInteriorModal('🍔 Burger Shot Menu');
    [
      { name: '🍔 Klasik Burger', desc: '+35 HP zdravia', hp: 35, price: 40 },
      { name: '🍟 Mega Menu Box', desc: '+75 HP zdravia', hp: 75, price: 90 },
      { name: '⚡ Monster Combo', desc: '100 % HP + 25 % Vesta', hp: 100, armor: 25, price: 150 }
    ].forEach(m => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div><h4>${m.name}</h4><p>${m.desc}</p></div><button class="buy-btn">$${m.price}</button>`;
      card.querySelector('button').onclick = () => {
        if (Activities.spendMoney(m.price)) {
          Entities.player.hp = Math.min(100, Entities.player.hp + m.hp);
          if (m.armor) Entities.player.armor = Math.min(100, Entities.player.armor + m.armor);
          if (Audio) Audio.playCash(); notify(`😋 Zdravie: ${Math.round(Entities.player.hp)}%`, '#4ade80');
        }
      };
      intBody.appendChild(card);
    });
  }

  function openWardrobe() {
    openInteriorModal('👕 Šatník – Skin postavy');
    const owned = Activities.state.ownedOutfits || ['cyan'];
    Interiors.OUTFITS.forEach(o => {
      const has = owned.includes(o.id), eq = Entities.player.outfitColor === o.color;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div style="width:24px;height:24px;border-radius:50%;background:${o.color};border:2px solid #fff"></div><div><h4>${o.name}</h4><p>${eq ? 'Práve nosíš' : (has ? 'Vlastníš' : 'Nový outfit')}</p></div></div><button class="buy-btn ${has ? 'blue' : ''}">${eq ? 'OK' : (has ? 'Obliecť' : '$' + o.price)}</button>`;
      card.querySelector('button').onclick = () => {
        if (has) { Entities.player.outfitColor = o.color; Activities.state.outfitColor = o.color; Activities.save(); notify(`👕 ${o.name}`, '#38bdf8'); openWardrobe(); }
        else if (Activities.spendMoney(o.price)) {
          owned.push(o.id); Activities.state.ownedOutfits = owned; Entities.player.outfitColor = o.color; Activities.state.outfitColor = o.color;
          Activities.save(); if (Audio) Audio.playSuccess(); notify(`👕 Kúpil si ${o.name}!`, '#4ade80'); openWardrobe();
        }
      };
      intBody.appendChild(card);
    });
  }

  function sleepAtHome() {
    Activities.state.timeOfDay = (Activities.state.timeOfDay + 8) % 24;
    Entities.player.hp = 100;
    if (Entities.wanted.level <= 2) Entities.clearWanted();
    Activities.save();
    if (Audio) Audio.playSuccess();
    notify(`🛏️ Vyspal si sa (+8h, čas ${Activities.getClockString()}, hra uložená!)`, '#38bdf8');
  }

  function openSlotsGame() {
    openInteriorModal('🎰 Royal Casino – Automaty');
    const syms = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
    let bet = 100, spinning = false;
    intBody.innerHTML = `
      <div class="casino-box">
        <div class="slot-reels"><span id="r1">7️⃣</span><span id="r2">💎</span><span id="r3">7️⃣</span></div>
        <div id="slotMsg" style="font-size:12px;color:#cbd5e1;margin:8px 0">3× 7️⃣ = 15× Jackpot • 3× 💎 = 10× • 3× = 5× • 2× = 1.5×</div>
        <div style="display:flex;gap:6px;justify-content:center;margin:10px 0">
          <button class="q-btn" data-b="50">$50</button>
          <button class="q-btn" data-b="100" style="border-color:#facc15">$100</button>
          <button class="q-btn" data-b="500">$500</button>
          <button class="q-btn" data-b="2000">$2000</button>
        </div>
        <button class="buy-btn" id="btnSpin" style="width:100%;padding:12px;font-size:15px">🎰 ROZTOČIŤ ($100)</button>
      </div>`;
    const msgEl = intBody.querySelector('#slotMsg'), spinBtn = intBody.querySelector('#btnSpin');
    intBody.querySelectorAll('[data-b]').forEach(b => {
      b.onclick = () => {
        bet = Number(b.dataset.b);
        intBody.querySelectorAll('[data-b]').forEach(x => x.style.borderColor = 'rgba(255,255,255,0.2)');
        b.style.borderColor = '#facc15'; spinBtn.textContent = `🎰 ROZTOČIŤ ($${bet.toLocaleString()})`;
      };
    });
    spinBtn.onclick = () => {
      if (spinning || !Activities.spendMoney(bet)) return;
      spinning = true; msgEl.textContent = 'Točia sa valce...'; let ticks = 0;
      const iv = setInterval(() => {
        intBody.querySelector('#r1').textContent = syms[Math.floor(Math.random() * syms.length)];
        intBody.querySelector('#r2').textContent = syms[Math.floor(Math.random() * syms.length)];
        intBody.querySelector('#r3').textContent = syms[Math.floor(Math.random() * syms.length)];
        if (++ticks >= 12) {
          clearInterval(iv); spinning = false;
          const a = intBody.querySelector('#r1').textContent, b = intBody.querySelector('#r2').textContent, c = intBody.querySelector('#r3').textContent;
          let win = 0;
          if (a === b && b === c) win = bet * (a === '7️⃣' ? 15 : (a === '💎' ? 10 : 5));
          else if (a === b || b === c || a === c) win = Math.round(bet * 1.5);
          if (win > 0) { Activities.addMoney(win); msgEl.innerHTML = `<b style="color:#4ade80">🎉 VÝHRA +$${win.toLocaleString()}!</b>`; }
          else msgEl.innerHTML = `<span style="color:#f87171">Smola, skús ešte raz!</span>`;
        }
      }, 65);
    };
  }

  function openBlackjackGame() {
    openInteriorModal('🃏 Royal Casino – Blackjack 21');
    let bet = 100, pHand = [], dHand = [], playing = false;
    function drawCard() {
      const vals = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'], suits = ['♠','♥','♦','♣'];
      return { v: vals[Math.floor(Math.random() * vals.length)], s: suits[Math.floor(Math.random() * 4)] };
    }
    function handVal(h) {
      let sum = 0, aces = 0;
      for (let i = 0; i < h.length; i++) {
        const v = h[i].v;
        if (v === 'A') { sum += 11; aces++; } else if (v === 'J' || v === 'Q' || v === 'K') sum += 10; else sum += Number(v);
      }
      while (sum > 21 && aces > 0) { sum -= 10; aces--; }
      return sum;
    }
    function fmtHand(h, hide) { return h.map((c, i) => (hide && i === 1) ? '🂠' : `${c.v}${c.s}`).join('  '); }

    function renderBJ(msg) {
      intBody.innerHTML = `
        <div class="casino-box">
          <p style="font-size:11px;color:#94a3b8">KRUPIÉR (${playing ? '?' : handVal(dHand)})</p>
          <div class="bj-cards">${dHand.length ? fmtHand(dHand, playing) : '—'}</div>
          <p style="font-size:11px;color:#94a3b8;margin-top:10px">TY (${handVal(pHand)})</p>
          <div class="bj-cards">${pHand.length ? fmtHand(pHand, false) : '—'}</div>
          <div style="margin:10px 0;font-size:13px;font-weight:800;color:#facc15">${msg || 'Vyber stávku a rozdaj'}</div>
          ${!playing ? `
            <div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px">
              <button class="q-btn" data-jb="100">$100</button>
              <button class="q-btn" data-jb="500">$500</button>
              <button class="q-btn" data-jb="2000">$2000</button>
            </div>
            <button class="buy-btn" id="bjDeal" style="width:100%;padding:11px">🃏 ROZDAŤ ($${bet})</button>
          ` : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="buy-btn blue" id="bjHit" style="padding:11px">➕ KARTA</button><button class="buy-btn" id="bjStand" style="padding:11px">✋ STÁŤ</button></div>`}
        </div>`;
      intBody.querySelectorAll('[data-jb]').forEach(b => { b.onclick = () => { bet = Number(b.dataset.jb); renderBJ(`Stávka $${bet}`); }; });
      const deal = intBody.querySelector('#bjDeal');
      if (deal) deal.onclick = () => {
        if (!Activities.spendMoney(bet)) return;
        pHand = [drawCard(), drawCard()]; dHand = [drawCard(), drawCard()]; playing = true;
        if (handVal(pHand) === 21) { playing = false; const w = Math.round(bet * 2.5); Activities.addMoney(w); renderBJ(`🔥 BLACKJACK +$${w}!`); }
        else renderBJ('Ďalšia karta alebo stojíš?');
      };
      const hit = intBody.querySelector('#bjHit');
      if (hit) hit.onclick = () => {
        pHand.push(drawCard()); const pv = handVal(pHand);
        if (pv > 21) { playing = false; renderBJ(`💥 Prehral si (${pv})!`); } else if (pv === 21) standNow(); else renderBJ(`Máš ${pv}`);
      };
      const stand = intBody.querySelector('#bjStand');
      if (stand) stand.onclick = standNow;
    }
    function standNow() {
      playing = false; while (handVal(dHand) < 17) dHand.push(drawCard());
      const pv = handVal(pHand), dv = handVal(dHand);
      if (dv > 21 || pv > dv) { Activities.addMoney(bet * 2); renderBJ(`🎉 VÝHRA +$${bet * 2}!`); }
      else if (pv === dv) { Activities.addMoney(bet); renderBJ('🤝 Remíza – vklad vrátený'); }
      else renderBJ(`😔 Krupiér vyhral (${dv} vs ${pv})`);
    }
    renderBJ();
  }

  // --- SMARTFÓN UI ---
  function openPhone() {
    showFullMap = false; garageModal.classList.remove('open'); interiorModal.classList.remove('open');
    phoneModal.classList.add('open'); renderPhoneTab();
  }
  document.getElementById('closePhone').addEventListener('click', () => phoneModal.classList.remove('open'));
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); activePhoneTab = btn.dataset.tab; renderPhoneTab();
    });
  });

  function renderPhoneTab() {
    const st = Activities.state;
    phoneBody.innerHTML = '';

    if (activePhoneTab === 'jobs') {
      // Aktuálna objednávka pre Chop Shop!
      const req = Activities.getWantedChopCar();
      const chopCard = document.createElement('div'); chopCard.className = 'card';
      chopCard.style.borderColor = 'rgba(249, 115, 22, 0.55)';
      chopCard.innerHTML = `<div><h4>🔩 Chop Shop: ${req.name}</h4><p>Ukradni z ulice a odvez do prístavu (až $${req.pay.toLocaleString()})</p></div><button class="buy-btn">GPS</button>`;
      chopCard.querySelector('button').onclick = () => { Activities.startMission('chopshop'); phoneModal.classList.remove('open'); };
      phoneBody.appendChild(chopCard);

      [
        { type: 'taxi',      title: '🚕 Taxi Jazda',            desc: 'Odvoz pasažiera na čas ($320+)' },
        { type: 'courier',   title: '📦 Expres Kuriér',          desc: 'Rýchle doručenie balíka ($460+)' },
        { type: 'race',      title: '🏁 Pouličné preteky',       desc: '6 checkpointov mestom ($980+)' },
        { type: 'vigilante', title: '🚨 Policajná Hliadka',      desc: 'Zastav utekajúceho zločinca ($780+)' },
        { type: 'flight',    title: '🚁 Vzdušné kruhy (Heli/Jet)', desc: '5 vzdušných kruhov ($1 400+)' }
      ].forEach(j => {
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `<div><h4>${j.title}</h4><p>${j.desc}</p></div><button class="buy-btn blue">Spustiť</button>`;
        card.querySelector('button').onclick = () => { Activities.startMission(j.type); phoneModal.classList.remove('open'); };
        phoneBody.appendChild(card);
      });
    } else if (activePhoneTab === 'cars') {
      Object.keys(Entities.VEH_TYPES).forEach(key => {
        const v = Entities.VEH_TYPES[key];
        const note = v.isBoat ? 'Na vodu' : (v.isHeli ? 'Vertikálny let' : (v.isAircraft ? 'Lietadlo' : `Max ${Math.round(v.max * 14)} km/h`));
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `<div><h4>${v.cat} ${v.name}</h4><p>${note} • HP: ${v.hp}</p></div><button class="buy-btn">$${v.price.toLocaleString()}</button>`;
        card.querySelector('button').onclick = () => { if (Activities.orderVehicle(key)) phoneModal.classList.remove('open'); };
        phoneBody.appendChild(card);
      });
    } else if (activePhoneTab === 'props') {
      Activities.PROPERTIES.forEach(pr => {
        const owned = st.ownedProps.includes(pr.id);
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `<div><h4>🏠 ${pr.name}</h4><p>${pr.desc} • +$${pr.income} / min</p></div><button class="buy-btn ${owned ? 'blue' : ''}">${owned ? 'Teleport' : '$' + pr.price.toLocaleString()}</button>`;
        card.querySelector('button').onclick = () => {
          if (owned) { if (Interiors && Interiors.isInside()) Interiors.forceExit(); Activities.teleportToProperty(pr.id); phoneModal.classList.remove('open'); }
          else if (Activities.buyProperty(pr.id)) renderPhoneTab();
        };
        phoneBody.appendChild(card);
      });
    } else if (activePhoneTab === 'sys') {
      const soundCard = document.createElement('div'); soundCard.className = 'card';
      soundCard.innerHTML = `<div><h4>🔊 Zvuky hry</h4><p>Motor, streľba, výbuchy, sirény</p></div><button class="buy-btn blue">${st.soundOn ? 'ZAPNUTÉ' : 'VYPNUTÉ'}</button>`;
      soundCard.querySelector('button').onclick = () => { st.soundOn = !st.soundOn; if (Audio) Audio.setEnabled(st.soundOn); Activities.save(); renderPhoneTab(); };
      phoneBody.appendChild(soundCard);

      const timeCard = document.createElement('div'); timeCard.className = 'card';
      timeCard.innerHTML = `<div><h4>🌗 Denný čas</h4><p>Režim: ${st.timeMode.toUpperCase()}</p></div><button class="buy-btn blue">Prepnúť</button>`;
      timeCard.querySelector('button').onclick = () => { st.timeMode = st.timeMode === 'auto' ? 'night' : (st.timeMode === 'night' ? 'day' : 'auto'); Activities.save(); renderPhoneTab(); };
      phoneBody.appendChild(timeCard);

      const resetCard = document.createElement('div'); resetCard.className = 'card';
      resetCard.innerHTML = `<div><h4>🗑️ Nová hra ($250)</h4><p>Vymaže peniaze, reality a tuning</p></div><button class="buy-btn red">Reset</button>`;
      resetCard.querySelector('button').onclick = () => { Activities.resetSave(); phoneModal.classList.remove('open'); };
      phoneBody.appendChild(resetCard);
    }
  }

  // --- GARÁŽ UI ---
  function openGarage() {
    showFullMap = false; phoneModal.classList.remove('open'); interiorModal.classList.remove('open');
    garageModal.classList.add('open'); renderGarage();
  }
  document.getElementById('closeGarage').addEventListener('click', () => garageModal.classList.remove('open'));

  function renderGarage() {
    const up = Activities.state.upgrades;
    garageBody.innerHTML = '';

    const fixCard = document.createElement('div'); fixCard.className = 'card';
    fixCard.innerHTML = `<div><h4>🛡️ Pay'n'Spray Oprava + Zmazať políciu</h4><p>100% HP + vesta + zmazanie všetkých ★</p></div><button class="buy-btn">$250</button>`;
    fixCard.querySelector('button').onclick = () => { if (Activities.paintVehicle(null, undefined)) garageModal.classList.remove('open'); };
    garageBody.appendChild(fixCard);

    const colors = ['#e11d48', '#2563eb', '#16a34a', '#facc15', '#a855f7', '#06b6d4', '#f8fafc', '#18181b'];
    const paintCard = document.createElement('div'); paintCard.className = 'card';
    paintCard.style.flexDirection = 'column'; paintCard.style.alignItems = 'flex-start';
    paintCard.innerHTML = `<div><h4>🎨 Prelakovať karosériu ($250)</h4></div><div class="swatches" id="paintSwatches"></div>`;
    colors.forEach(c => {
      const s = document.createElement('div'); s.className = 'swatch'; s.style.background = c;
      s.onclick = () => Activities.paintVehicle(c, undefined);
      paintCard.querySelector('#paintSwatches').appendChild(s);
    });
    garageBody.appendChild(paintCard);

    const neons = [null, '#38bdf8', '#f43f5e', '#4ade80', '#a855f7', '#facc15'];
    const neonCard = document.createElement('div'); neonCard.className = 'card';
    neonCard.style.flexDirection = 'column'; neonCard.style.alignItems = 'flex-start';
    neonCard.innerHTML = `<div><h4>✨ Neónové podsvietenie ($250)</h4></div><div class="swatches" id="neonSwatches"></div>`;
    neons.forEach(n => {
      const s = document.createElement('div'); s.className = 'swatch'; s.style.background = n || '#334155';
      if (!n) s.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:12px">✕</span>';
      s.onclick = () => Activities.paintVehicle(null, n);
      neonCard.querySelector('#neonSwatches').appendChild(s);
    });
    garageBody.appendChild(neonCard);

    [
      { key: 'engine', title: '⚡ Turbo Motor', desc: 'Vyššia maximálka a zrýchlenie' },
      { key: 'nitro',  title: '🔥 Nitro Systém', desc: 'Silnejší boost a odhodenie polície' },
      { key: 'armor',  title: '🛡️ Pancierovanie', desc: 'Menšie poškodenie pri nárazoch' }
    ].forEach(u => {
      const lvl = up[u.key] || 0, cost = (lvl + 1) * 1600;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div><h4>${u.title} (LVL ${lvl}/3)</h4><p>${u.desc}</p></div><button class="buy-btn ${lvl >= 3 ? 'blue' : ''}">${lvl >= 3 ? 'MAX' : '$' + cost.toLocaleString()}</button>`;
      card.querySelector('button').onclick = () => { if (Activities.buyUpgrade(u.key)) renderGarage(); };
      garageBody.appendChild(card);
    });
  }

  const cam = { x: Entities.player.x, y: Entities.player.y, zoom: 1.0 };

  function triggerWasted() {
    resetJoy();
    if (Interiors && Interiors.isInside()) Interiors.forceExit();
    const bill = Math.min(Activities.state.money, 180);
    Activities.state.money -= bill; Activities.save();
    Entities.player.inVehicle = null;
    Entities.player.x = Police ? Police.HOSPITAL.x : World.spawnX;
    Entities.player.y = Police ? Police.HOSPITAL.y : World.spawnY;
    Entities.player.hp = 100; Entities.player.armor = 25;
    showCinematic('WASTED', `Bol si vyradený • Ošetrenie -$${bill.toLocaleString()} • Grand City Hospital`, '#ef4444');
  }

  function updateHUD() {
    const st = Activities.state, p = Entities.player, v = p.inVehicle, w = Entities.wanted;
    const inside = Interiors && Interiors.isInside();

    const curMode = (inside || !v) ? 'foot' : 'car';
    if (curMode !== lastMode) {
      lastMode = curMode;
      document.body.classList.toggle('mode-car', curMode === 'car');
      document.body.classList.toggle('mode-foot', curMode === 'foot');
    }
    btnCarFoot.style.display = (!inside && !v) ? 'flex' : 'none';

    moneyHud.textContent = '$' + st.money.toLocaleString();
    levelHud.textContent = 'LVL ' + st.level;
    clockHud.textContent = Activities.getClockString();

    const wSpec = Entities.WEAPONS[p.weapon] || Entities.WEAPONS.smg;
    btnWeapon.textContent = p.weapon === 'rpg' ? `🚀 ${p.rockets}` : `${wSpec.icon} ${wSpec.id.toUpperCase()}`;

    hpFill.style.width = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) + '%';
    armorFill.style.width = Math.max(0, Math.min(100, (p.armor / p.maxArmor) * 100)) + '%';
    damageVignette.style.opacity = p.hitFlash > 0.05 ? (p.hitFlash * 0.75) : 0;

    starsHud.textContent = w.level > 0 ? '★'.repeat(w.level) + '☆'.repeat(5 - w.level) : '';
    starsHud.style.color = w.level >= 3 ? '#ef4444' : '#facc15';
    const isEscaping = w.level > 0 && !w.seen;
    starsHud.classList.toggle('searching', isEscaping);
    escapeBadge.style.display = isEscaping ? 'block' : 'none';
    if (isEscaping) escapeBadge.textContent = `ÚTEK: ${Math.max(1, Math.ceil(w.searchTimer))}s`;

    if (w.bustedProgress > 0.04 && !inside) {
      bustedWrap.classList.add('show');
      bustedFill.style.width = Math.round(w.bustedProgress * 100) + '%';
    } else bustedWrap.classList.remove('show');

    if (inside) {
      speedVal.textContent = 'INTERIÉR';
      districtHud.textContent = Interiors.getCurrentRoom().title;
      districtHud.style.color = '#facc15';
      vehHpWrap.style.display = 'none'; btnSiren.style.display = 'none';
    } else if (v) {
      const kmh = Math.round(Math.hypot(v.vx, v.vy) * 14);
      if ((v.spec.isAircraft || v.spec.isHeli) && v.altitude > 0.15) {
        speedVal.textContent = `${kmh} KM/H ${v.spec.cat} ${Math.round(v.altitude * 280)}m`;
      } else {
        speedVal.textContent = `${v.spec.cat} ${kmh} KM/H`;
      }
      vehHpWrap.style.display = 'block';
      vehHpFill.style.width = Math.max(0, Math.min(100, (v.hp / v.maxHp) * 100)) + '%';
      btnSiren.style.display = v.spec.isPoliceModel ? 'flex' : 'none';
      const dist = World.getDistrictAt(p.x, p.y);
      if (dist) { districtHud.textContent = dist.name; districtHud.style.color = dist.color; }
    } else {
      speedVal.textContent = p.isSwimming ? '🏊 PLÁVAŠ' : 'PEŠO';
      vehHpWrap.style.display = 'none'; btnSiren.style.display = 'none';
      const dist = World.getDistrictAt(p.x, p.y);
      if (dist) { districtHud.textContent = dist.name; districtHud.style.color = dist.color; }
    }

    const m = Activities.activeMission;
    if (m && !inside) {
      missionBox.classList.add('show');
      mTitle.textContent = m.title; mDesc.textContent = m.desc;
      mTimer.textContent = `Čas: ${Math.max(0, Math.ceil(m.timer))}s`;
    } else missionBox.classList.remove('show');

    currentAction = null;
    if (!isModalOpen()) {
      if (inside) {
        const spot = Interiors.getNearbySpot();
        if (spot) { currentAction = { kind: 'spot', spot: spot }; actionPrompt.textContent = `${spot.icon} ${spot.label}`; }
      } else {
        const door = Interiors ? Interiors.getNearbyDoor(p.x, p.y) : null;
        if (door) { currentAction = { kind: 'door', door: door }; actionPrompt.textContent = `🚪 Vojsť: ${door.name}`; }
        else {
          const poi = Activities.getNearbyPOI(p.x, p.y);
          if (poi) {
            currentAction = { kind: 'poi', poi: poi };
            if (poi.type === 'chopshop') {
              const req = Activities.getWantedChopCar();
              actionPrompt.textContent = `🔩 Odovzdať ${req.name} ($${req.pay})`;
            } else {
              actionPrompt.textContent = `${poi.icon} ${poi.name}`;
            }
          }
        }
      }
    }
    actionPrompt.classList.toggle('show', currentAction !== null);
  }

  function update(dt) {
    if (cinematicTimer > 0) { cinematicTimer = Math.max(0, cinematicTimer - dt / 60); return; }
    if (showFullMap || isModalOpen()) return;

    if (Interiors && Interiors.isInside()) {
      Interiors.update(dt, input, {
        onNotify: notify, onShake: amt => { shakeMag = Math.max(shakeMag, amt); }, onWasted: triggerWasted
      });
      if (Entities.player.hitFlash > 0) Entities.player.hitFlash = Math.max(0, Entities.player.hitFlash - 0.08 * dt);
      shakeMag *= Math.pow(0.84, dt); updateHUD(); return;
    }

    Entities.update(dt, input, Activities.state.upgrades, {
      onNotify: notify,
      onShake: amt => { shakeMag = Math.max(shakeMag, amt); },
      onCriminalHit: Activities.onCriminalHit,
      onPoliceDestroyed: () => Activities.addMoney(120, 'Zničená policajná jednotka (+1 RPG)'),
      onCopDown: () => Activities.addMoney(35, 'Zneškodnený policajt'),
      onBusted: (stars) => {
        resetJoy();
        const fine = Math.min(Activities.state.money, 100 * Math.max(1, stars || 1));
        Activities.state.money -= fine; Activities.save();
        Entities.player.rockets = Math.floor(Entities.player.rockets / 2);
        Entities.player.inVehicle = null;
        Entities.player.x = Police ? Police.POLICE_STATION.x : World.spawnX;
        Entities.player.y = Police ? Police.POLICE_STATION.y : World.spawnY;
        Entities.player.hp = 100;
        showCinematic('BUSTED', `Polícia ťa zatkla • Pokuta -$${fine.toLocaleString()} • Policajná stanica`, '#38bdf8');
      },
      onWasted: triggerWasted,
      onEscaped: () => notify('😎 Čistý útek! Polícia prerušila pátranie.', '#4ade80')
    });

    Activities.update(dt);

    const p = Entities.player, v = p.inVehicle;
    const speed = v ? Math.hypot(v.vx, v.vy) : 0;
    const altZoom = v ? v.altitude * 0.28 : 0;
    const baseZoom = v ? (W < 600 ? 0.88 : 1.0) : (W < 600 ? 1.12 : 1.22);
    const targetZoom = v ? Math.max(0.52, baseZoom - (speed / 22) * 0.25 - altZoom) : baseZoom;

    cam.zoom += (targetZoom - cam.zoom) * 0.07 * dt;
    cam.x += (p.x + (v ? v.vx * 14 : 0) - cam.x) * 0.12 * dt;
    cam.y += (p.y + (v ? v.vy * 14 : 0) - cam.y) * 0.12 * dt;
    shakeMag *= Math.pow(0.84, dt); if (shakeMag < 0.2) shakeMag = 0;

    updateHUD();
  }

  function render(time) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (Interiors && Interiors.isInside()) {
      const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
      ctx.save(); ctx.translate(sx, sy); Interiors.render(ctx, W, H, time); ctx.restore();
      return;
    }

    const darkAlpha = Activities.getDarknessAlpha();
    const sx = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
    const sy = shakeMag ? (Math.random() - 0.5) * shakeMag : 0;
    const renderCam = { x: cam.x + sx, y: cam.y + sy, zoom: cam.zoom };

    ctx.fillStyle = '#083358'; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(renderCam.zoom, renderCam.zoom); ctx.translate(-renderCam.x, -renderCam.y);
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
    const cones = Police ? Police.getVisionCones() : [];
    if (showFullMap) Renderer.drawFullMap(ctx, W, H, Entities.player, allBlips);
    else radarRect = Renderer.drawRadar(ctx, W, Entities.player, allBlips, cones, Entities.wanted, time);
  }

  let lastTime = performance.now(), errorShown = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 16.667, 2);
    lastTime = now;
    try { update(dt); render(now); }
    catch (err) {
      if (!errorShown) { errorShown = true; notify('⚠️ Chyba: ' + err.message, '#ef4444'); }
    }
  }
  requestAnimationFrame(loop);
})();
