window.GTA = window.GTA || {};

window.GTA.Train = (function () {
  const C = window.GTA.Config;
  const TS = C.TILE_SIZE;

  const STATIONS = [
    { id: 'st_dt',     name: 'Stanica Grand City',  x: 46.5 * TS,  y: 96 * TS,    icon: '🚉' },
    { id: 'st_docks',  name: 'Stanica South Docks', x: 82 * TS,    y: 124.5 * TS, icon: '🚉' },
    { id: 'st_north',  name: 'Stanica Northwood',   x: 46.5 * TS,  y: 44 * TS,    icon: '🚉' },
    { id: 'st_desert', name: 'Stanica Red Desert',  x: 92 * TS,    y: 16.5 * TS,  icon: '🚉' }
  ];

  const WAYPOINTS = [
    { x: 46.5 * TS,  y: 16.5 * TS },
    { x: 46.5 * TS,  y: 124.5 * TS },
    { x: 118.5 * TS, y: 124.5 * TS },
    { x: 118.5 * TS, y: 74.5 * TS },
    { x: 126.5 * TS, y: 74.5 * TS },
    { x: 126.5 * TS, y: 16.5 * TS }
  ];

  const segments = [];
  let totalLength = 0;

  (function buildTrack() {
    for (let i = 0; i < WAYPOINTS.length; i++) {
      const a = WAYPOINTS[i];
      const b = WAYPOINTS[(i + 1) % WAYPOINTS.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segments.push({
        ax: a.x, ay: a.y, bx: b.x, by: b.y,
        len: len, startD: totalLength,
        angle: Math.atan2(b.y - a.y, b.x - a.x)
      });
      totalLength += len;
    }
  })();

  function getPosAtDistance(dist) {
    let d = ((dist % totalLength) + totalLength) % totalLength;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (d <= s.len || i === segments.length - 1) {
        const t = s.len > 0 ? Math.min(1, Math.max(0, d / s.len)) : 0;
        return {
          x: s.ax + (s.bx - s.ax) * t,
          y: s.ay + (s.by - s.ay) * t,
          angle: s.angle
        };
      }
      d -= s.len;
    }
    return { x: WAYPOINTS[0].x, y: WAYPOINTS[0].y, angle: Math.PI / 2 };
  }

  function findClosestDistOnTrack(wx, wy) {
    let bestD = Infinity, bestDistAlong = 0;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const dx = s.bx - s.ax, dy = s.by - s.ay;
      const len2 = dx * dx + dy * dy || 1;
      const proj = Math.max(0, Math.min(1, ((wx - s.ax) * dx + (wy - s.ay) * dy) / len2));
      const px = s.ax + dx * proj, py = s.ay + dy * proj;
      const dist = Math.hypot(wx - px, wy - py);
      if (dist < bestD) {
        bestD = dist;
        bestDistAlong = s.startD + proj * s.len;
      }
    }
    return bestDistAlong;
  }

  const state = {
    dist: 400,
    speed: 7.4,
    stopTimer: 0,
    lastStoppedStation: null,
    riding: false,
    driving: false
  };

  function init() {
    state.dist = findClosestDistOnTrack(STATIONS[0].x, STATIONS[0].y) - 140;
    state.speed = 7.4;
    state.stopTimer = 0;
    state.lastStoppedStation = null;
    state.riding = false;
    state.driving = false;
  }

  function getLocoPos() { return getPosAtDistance(state.dist); }

  function getCarPositions() {
    const list = [];
    for (let k = 0; k < 5; k++) {
      const pos = getPosAtDistance(state.dist - k * 64);
      list.push({ x: pos.x, y: pos.y, angle: pos.angle, isLoco: k === 0, carIndex: k });
    }
    return list;
  }

  function getNearbyStation(wx, wy) {
    for (let i = 0; i < STATIONS.length; i++) {
      if (Math.hypot(STATIONS[i].x - wx, STATIONS[i].y - wy) < 125) return STATIONS[i];
    }
    return null;
  }

  function getNearbyTrainCar(wx, wy) {
    const cars = getCarPositions();
    let best = null, bestD = 82;
    for (let i = 0; i < cars.length; i++) {
      const d = Math.hypot(cars[i].x - wx, cars[i].y - wy);
      if (d < bestD) { bestD = d; best = cars[i]; }
    }
    return best;
  }

  function boardTrain(activities, entities, notify, hijackLoco) {
    if (state.riding) return false;
    const loco = getLocoPos();
    const nearCar = getNearbyTrainCar(entities.player.x, entities.player.y);
    const nearSt = getNearbyStation(entities.player.x, entities.player.y);

    if (!nearCar && !nearSt) {
      if (notify) notify('🚂 Vlak je práve inde – počkaj na stanici alebo pri trati!', '#facc15');
      return false;
    }

    if (hijackLoco) {
      if (!nearCar || (!nearCar.isLoco && Math.hypot(entities.player.x - loco.x, entities.player.y - loco.y) > 150)) {
        if (notify) notify('🚂 Choď bližšie k lokomotíve na čele vlaku!', '#facc15');
        return false;
      }
      entities.player.inVehicle = null;
      entities.player.isSwimming = false;
      state.riding = true;
      state.driving = true;
      state.stopTimer = 0;
      entities.addWanted(Math.max(entities.wanted.level, 1));
      if (notify) notify('🚂 Uniesol si rušeň! ▲ plyn, ▼ brzda, vystúpiš cez 🚂/F', '#f97316');
      if (window.GTA.Audio) window.GTA.Audio.playAlert();
      return true;
    }

    if (!activities.spendMoney(15)) return false;
    entities.player.inVehicle = null;
    entities.player.isSwimming = false;
    state.riding = true;
    state.driving = false;
    if (nearSt && !nearCar) {
      state.dist = findClosestDistOnTrack(nearSt.x, nearSt.y);
      state.stopTimer = 4.5;
      state.lastStoppedStation = nearSt.id;
    }
    if (notify) notify('🎫 Lístok ($15) kúpený! Vystúpiš kedykoľvek tlačidlom vlaku alebo F.', '#4ade80');
    if (window.GTA.Audio) window.GTA.Audio.playCash();
    return true;
  }

  function exitTrain(entities, notify) {
    if (!state.riding) return false;
    const cars = getCarPositions();
    const mid = cars[2] || cars[0];
    const nearSt = getNearbyStation(mid.x, mid.y);

    if (nearSt) {
      entities.player.x = nearSt.x;
      entities.player.y = nearSt.y;
    } else {
      const perp = mid.angle + Math.PI / 2;
      entities.player.x = mid.x + Math.cos(perp) * 34;
      entities.player.y = mid.y + Math.sin(perp) * 34;
    }
    entities.resolveWorldCollisions(entities.player, entities.player.radius, 'swim');
    state.riding = false;
    state.driving = false;
    if (notify) notify(nearSt ? `🚉 Vystúpil si na stanici: ${nearSt.name}` : '🚂 Zoskočil si z vlaku', '#38bdf8');
    return true;
  }

  function update(dt, input, entities, activities, callbacks) {
    const sec = dt / 60;

    if (state.driving && state.riding) {
      if (input.up || input.nitro) state.speed = Math.min(15.5, state.speed + 0.16 * dt);
      else if (input.down) state.speed = Math.max(0, state.speed - 0.26 * dt);
      else state.speed *= Math.pow(0.992, dt);
    } else {
      if (state.stopTimer > 0) {
        state.stopTimer = Math.max(0, state.stopTimer - sec);
        state.speed = 0;
      } else {
        state.speed += (7.6 - state.speed) * 0.06 * dt;
        const loco = getPosAtDistance(state.dist);
        for (let i = 0; i < STATIONS.length; i++) {
          const st = STATIONS[i];
          if (state.lastStoppedStation === st.id) continue;
          if (Math.hypot(loco.x - st.x, loco.y - st.y) < 38) {
            state.stopTimer = 5.0;
            state.lastStoppedStation = st.id;
            state.speed = 0;
            if (state.riding && callbacks && callbacks.onNotify) {
              callbacks.onNotify(`🚉 Vlak zastavil v stanici: ${st.name} (môžeš vystúpiť!)`, '#facc15');
            }
            break;
          }
        }
        if (state.lastStoppedStation) {
          const prev = STATIONS.find(s => s.id === state.lastStoppedStation);
          if (prev && Math.hypot(loco.x - prev.x, loco.y - prev.y) > 260) {
            state.lastStoppedStation = null;
          }
        }
      }
    }

    state.dist += state.speed * dt;
    const cars = getCarPositions();

    if (state.speed > 1.8) {
      for (let c = 0; c < cars.length; c++) {
        const car = cars[c];
        for (let i = entities.vehicles.length - 1; i >= 0; i--) {
          const v = entities.vehicles[i];
          if (v === entities.player.inVehicle || v.altitude > 0.22) continue;
          if (Math.hypot(v.x - car.x, v.y - car.y) < v.radius + 18) v.hp = 0;
        }
      }
    }

    if (state.riding) {
      const anchor = state.driving ? cars[0] : (cars[2] || cars[0]);
      entities.player.x = anchor.x;
      entities.player.y = anchor.y;
      entities.player.angle = anchor.angle;
      if (window.GTA.Audio) window.GTA.Audio.updateEngine(state.speed / 15.5, true, false, false);
    }
  }

  function drawStationsAndTrain(ctx, cam, vw, vh, zoom, time) {
    const halfW = (vw / 2) / zoom + 200, halfH = (vh / 2) / zoom + 200;
    const pulse = 0.88 + Math.sin(time * 0.006) * 0.12;

    for (let i = 0; i < STATIONS.length; i++) {
      const st = STATIONS[i];
      if (Math.abs(st.x - cam.x) > halfW || Math.abs(st.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.beginPath(); ctx.arc(0, 0, 32 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 32 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🚉', 0, 0);
      ctx.restore();
    }

    const cars = getCarPositions();
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (Math.abs(c.x - cam.x) > halfW || Math.abs(c.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath(); ctx.roundRect(-27, -11, 56, 26, 4); ctx.fill();

      if (c.isLoco) {
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath(); ctx.roundRect(-28, -13, 56, 26, 5); ctx.fill();
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#18181b'; ctx.fillRect(-20, -10, 18, 20);
        ctx.fillStyle = '#fef9c3'; ctx.fillRect(26, -9, 3, 5); ctx.fillRect(26, 4, 3, 5);
      } else {
        const vColors = ['#334155', '#1e3a8a', '#9a3412', '#1e293b'];
        ctx.fillStyle = vColors[(i - 1) % vColors.length];
        ctx.beginPath(); ctx.roundRect(-26, -12, 52, 24, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
    }
  }

  function getRadarBlips() {
    const blips = [];
    for (let i = 0; i < STATIONS.length; i++) {
      blips.push({ x: STATIONS[i].x, y: STATIONS[i].y, color: '#facc15', size: 4.5 });
    }
    const loco = getLocoPos();
    blips.push({ x: loco.x, y: loco.y, color: '#ef4444', size: 5.5, pulse: true });
    return blips;
  }

  return {
    STATIONS: STATIONS, get state() { return state; },
    init: init, update: update, getLocoPos: getLocoPos, getCarPositions: getCarPositions,
    getNearbyStation: getNearbyStation, getNearbyTrainCar: getNearbyTrainCar,
    boardTrain: boardTrain, exitTrain: exitTrain,
    drawStationsAndTrain: drawStationsAndTrain, getRadarBlips: getRadarBlips
  };
})();
