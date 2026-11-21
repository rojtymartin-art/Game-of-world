(function () {
  const C = window.GTA.Config;
  const World = window.GTA.World;
  const Renderer = window.GTA.Renderer;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const speedEl = document.getElementById('speedVal');
  const districtHud = document.getElementById('districtHud');
  const coordsHud = document.getElementById('coordsHud');
  const banner = document.getElementById('districtBanner');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerSub = document.getElementById('bannerSub');
  const btnMap = document.getElementById('btnMap');

  let W = 0, H = 0;
  let showFullMap = false;
  let radarRect = { x: 0, y: 0, size: 0 };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Ovládanie (klávesnica + mobil)
  const input = { up: false, down: false, left: false, right: false, drift: false, nitro: false };
  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'drift',
    ShiftLeft: 'nitro', ShiftRight: 'nitro'
  };

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyM') { showFullMap = !showFullMap; return; }
    if (keyMap[e.code]) input[keyMap[e.code]] = true;
  });
  window.addEventListener('keyup', e => {
    if (keyMap[e.code]) input[keyMap[e.code]] = false;
  });

  btnMap.addEventListener('click', () => { showFullMap = !showFullMap; });

  // Kliknutie priamo na radar alebo na otvorenú mapu ju prepne
  canvas.addEventListener('pointerdown', e => {
    if (showFullMap) {
      showFullMap = false;
      return;
    }
    if (
      e.clientX >= radarRect.x && e.clientX <= radarRect.x + radarRect.size &&
      e.clientY >= radarRect.y && e.clientY <= radarRect.y + radarRect.size
    ) {
      showFullMap = true;
    }
  });

  function bindTouch(id, prop) {
    const el = document.getElementById(id);
    const on = e => { e.preventDefault(); input[prop] = true; el.classList.add('active'); };
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

  // Testovacie športové auto (rýchle na preskúmanie 12,9 km mapy)
  const car = {
    x: World.spawnX,
    y: World.spawnY,
    vx: 0,
    vy: 0,
    angle: 0, // Smerom na východ k pláži a mólu
    radius: 16,
    accel: 0.42,
    maxSpeed: 13.5,
    nitroSpeed: 19.5
  };

  const cam = { x: car.x, y: car.y, zoom: 1.0 };
  const skids = [];

  // Sledovanie zmeny štvrte pre GTA banner
  let lastDistrictId = null;
  let bannerTimer = null;

  function checkDistrictBanner() {
    const d = World.getDistrictAt(car.x, car.y);
    if (d && d.id !== lastDistrictId) {
      lastDistrictId = d.id;
      districtHud.textContent = d.name;
      districtHud.style.color = d.color;
      bannerTitle.textContent = d.name;
      bannerSub.textContent = d.sub;
      banner.classList.add('show');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => banner.classList.remove('show'), 2600);
    }
  }

  function update(dt) {
    if (showFullMap) return;

    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    const rx = -fy;
    const ry = fx;

    let forwardVel = car.vx * fx + car.vy * fy;
    let lateralVel = car.vx * rx + car.vy * ry;

    const useNitro = input.nitro && (input.up || forwardVel > 2);
    const curAccel = useNitro ? car.accel * 1.75 : car.accel;
    const curMax = useNitro ? car.nitroSpeed : car.maxSpeed;

    if (input.up || useNitro) forwardVel += curAccel * dt;
    if (input.down) forwardVel -= (forwardVel > 0 ? 0.55 : 0.25) * dt;

    forwardVel = Math.max(-5.5, Math.min(curMax, forwardVel));

    const speedMag = Math.abs(forwardVel);
    if (speedMag > 0.25) {
      const turnRate = (input.drift ? 0.068 : 0.05) * Math.min(1, speedMag / 2.8);
      const dir = forwardVel >= 0 ? 1 : -1;
      if (input.left) car.angle -= turnRate * dir * dt;
      if (input.right) car.angle += turnRate * dir * dt;
    }

    const grip = input.drift ? 0.962 : 0.83;
    lateralVel *= Math.pow(grip, dt);
    forwardVel *= Math.pow(input.drift ? 0.986 : 0.99, dt);

    const nfx = Math.cos(car.angle);
    const nfy = Math.sin(car.angle);
    const nrx = -nfy;
    const nry = nfx;

    car.vx = nfx * forwardVel + nrx * lateralVel;
    car.vy = nfy * forwardVel + nry * lateralVel;

    // Oddelená kontrola kolízií pre plynulé kĺzanie pozdĺž stien
    const nextX = car.x + car.vx * dt;
    if (!World.checkCollision(nextX, car.y, car.radius)) {
      car.x = nextX;
    } else {
      car.vx *= -0.35;
    }

    const nextY = car.y + car.vy * dt;
    if (!World.checkCollision(car.x, nextY, car.radius)) {
      car.y = nextY;
    } else {
      car.vy *= -0.35;
    }

    // Stopy pneumatík
    if ((input.drift && speedMag > 3.5) || Math.abs(lateralVel) > 2.6) {
      const rearX = car.x - nfx * 15;
      const rearY = car.y - nfy * 15;
      skids.push({ x: rearX + nrx * 8, y: rearY + nry * 8 });
      skids.push({ x: rearX - nrx * 8, y: rearY - nry * 8 });
      if (skids.length > 320) skids.splice(0, 2);
    }

    // Dynamická kamera (oddiali sa pri vysokej rýchlosti!)
    const totalSpeed = Math.hypot(car.vx, car.vy);
    const targetZoom = Math.max(0.72, 1.0 - (totalSpeed / car.nitroSpeed) * 0.28);
    cam.zoom += (targetZoom - cam.zoom) * 0.06 * dt;

    const lookAhead = 15;
    cam.x += (car.x + car.vx * lookAhead - cam.x) * 0.11 * dt;
    cam.y += (car.y + car.vy * lookAhead - cam.y) * 0.11 * dt;

    // Aktualizácia HUD
    speedEl.textContent = Math.round(totalSpeed * 14);
    coordsHud.textContent = `X: ${Math.round(car.x)} | Y: ${Math.round(car.y)}`;
    checkDistrictBanner();
  }

  function drawCar(ctx) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Svetlá
    const grad = ctx.createLinearGradient(18, 0, 145, 0);
    grad.addColorStop(0, 'rgba(254, 249, 195, 0.34)');
    grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(18, -9); ctx.lineTo(145, -40); ctx.lineTo(145, 40); ctx.lineTo(18, 9);
    ctx.closePath(); ctx.fill();

    // Nitro plamene z výfuku
    if (input.nitro && (input.up || Math.hypot(car.vx, car.vy) > 3)) {
      const fl = 14 + Math.random() * 14;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath(); ctx.moveTo(-21, -7); ctx.lineTo(-21 - fl, -4); ctx.lineTo(-21, -1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-21, 1); ctx.lineTo(-21 - fl, 4); ctx.lineTo(-21, 7); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.moveTo(-21, -6); ctx.lineTo(-21 - fl * 0.6, -4); ctx.lineTo(-21, -2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-21, 2); ctx.lineTo(-21 - fl * 0.6, 4); ctx.lineTo(-21, 6); ctx.fill();
    }

    // Tieň
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-21, -11, 46, 26);

    // Karoséria (športiak)
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(-22, -11, 44, 22, 6);
    ctx.fill();

    // Rýchle pruhy cez kapotu
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-20, -3, 40, 2);
    ctx.fillRect(-20, 1, 40, 2);

    // Sklá a strecha
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2, -8.5, 9, 17);
    ctx.fillRect(-14, -8.5, 6, 17);
    ctx.fillStyle = '#be123c';
    ctx.fillRect(-8, -8.5, 10, 17);

    // Brzdové svetlá
    ctx.fillStyle = (input.down || input.drift) ? '#ff2a2a' : '#7f1d1d';
    ctx.fillRect(-23, -9, 2.5, 5.5);
    ctx.fillRect(-23, 3.5, 2.5, 5.5);

    ctx.restore();
  }

  function render(time) {
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(0, 0, W, H);

    // Svetová kamera so zoomom
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    Renderer.drawGround(ctx, cam, W, H, cam.zoom, time);

    // Stopy pneumatík
    ctx.fillStyle = 'rgba(10, 10, 14, 0.42)';
    for (let i = 0; i < skids.length; i++) {
      ctx.fillRect(skids[i].x - 2.5, skids[i].y - 2.5, 5, 5);
    }

    drawCar(ctx);
    ctx.restore();

    // 2.5D budovy v obrazovkových súradniciach
    Renderer.drawBuildings25D(ctx, cam, W, H, cam.zoom);

    // Radar alebo celoobrazovková mapa
    if (showFullMap) {
      Renderer.drawFullMap(ctx, W, H, car);
    } else {
      radarRect = Renderer.drawRadar(ctx, W, car);
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
