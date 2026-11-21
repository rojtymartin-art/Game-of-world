window.GTA = window.GTA || {};

window.GTA.Renderer = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const MAP_PX = 4;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = N * MAP_PX;
  mapCanvas.height = N * MAP_PX;
  const mctx = mapCanvas.getContext('2d');

  (function bakeWorldMap() {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const t = W.tiles[r][c];
        let col = '#334155';
        if (t === T.WATER) col = (W.shallowGrid && W.shallowGrid[r * N + c]) ? '#0e7490' : '#082f49';
        else if (t === T.SAND) col = '#e5cfa0';
        else if (t === T.DESERT) col = '#c26d3a';
        else if (t === T.DIRT_ROAD) col = '#9a5b32';
        else if (t === T.GRASS) col = '#266137';
        else if (t === T.FOREST) col = '#143d22';
        else if (t === T.SIDEWALK) col = '#475061';
        else if (t === T.ROAD) col = '#1f2937';
        else if (t === T.HIGHWAY) col = '#0f172a';
        else if (t === T.BRIDGE) col = '#64748b';
        else if (t === T.CONCRETE) col = '#52525b';
        else if (t === T.RUNWAY) col = '#111827';
        else if (t === T.PIER) col = '#78350f';
        else if (t === T.TRACK) col = '#18181b';
        else if (t === T.STADIUM) col = '#16a34a';
        else if (t === T.PLAZA) col = '#38bdf8';
        else if (t === T.SHIP_DECK) col = '#b91c1c';

        mctx.fillStyle = col;
        mctx.fillRect(c * MAP_PX, r * MAP_PX, MAP_PX, MAP_PX);
        if (W.solidGrid[r][c].length > 0 && t !== T.FOREST) {
          mctx.fillStyle = W.solidGrid[r][c][0].roof || 'rgba(255,255,255,0.25)';
          mctx.fillRect(c * MAP_PX + 1, r * MAP_PX + 1, Math.max(1, MAP_PX - 2), Math.max(1, MAP_PX - 2));
        }
      }
    }
    if (W.railPath && W.railPath.length) {
      mctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      mctx.lineWidth = 1.6;
      mctx.beginPath();
      for (let i = 0; i < W.railPath.length; i++) {
        const px = (W.railPath[i].x / C.WORLD_SIZE) * mapCanvas.width;
        const py = (W.railPath[i].y / C.WORLD_SIZE) * mapCanvas.height;
        if (i === 0) mctx.moveTo(px, py); else mctx.lineTo(px, py);
      }
      mctx.closePath(); mctx.stroke();
    }
  })();

  function getVisibleBounds(cam, vw, vh, zoom, pad) {
    const halfW = (vw / 2) / zoom, halfH = (vh / 2) / zoom;
    return {
      c0: Math.max(0, Math.floor((cam.x - halfW) / TS) - pad),
      c1: Math.min(N - 1, Math.ceil((cam.x + halfW) / TS) + pad),
      r0: Math.max(0, Math.floor((cam.y - halfH) / TS) - pad),
      r1: Math.min(N - 1, Math.ceil((cam.y + halfH) / TS) + pad)
    };
  }

  function bHash(b) { return Math.abs(Math.floor(b.x * 13 + b.y * 29 + b.height * 7)); }
  function lightHex(col) { return col === 'green' ? '#22c55e' : (col === 'yellow' ? '#facc15' : '#ef4444'); }

  function lightenHex(hex, amt) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + amt)},${Math.min(255, ((n >> 8) & 255) + amt)},${Math.min(255, (n & 255) + amt)})`;
  }

  function drawGround(ctx, cam, vw, vh, zoom, time) {
    const b = getVisibleBounds(cam, vw, vh, zoom, 1);
    const Traffic = window.GTA.Traffic;
    const phase = Traffic ? Traffic.getLightPhase() : null;

    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        const t = W.tiles[r][c];
        const x = c * TS, y = r * TS;

        if (t === T.WATER) {
          const isShallow = W.shallowGrid && W.shallowGrid[r * N + c];
          ctx.fillStyle = isShallow ? '#0e7490' : '#082f49';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          const wave = Math.sin(time * 0.0024 + r * 0.8 + c * 0.6) * 14;
          ctx.fillStyle = isShallow ? 'rgba(165, 243, 252, 0.24)' : 'rgba(56, 189, 248, 0.14)';
          ctx.fillRect(x + 24 + wave, y + 44, 56, 3.5);
          ctx.fillRect(x + 84 - wave, y + 124, 50, 3.5);
        } else if (t === T.SAND) {
          ctx.fillStyle = '#e6cf9e'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.DESERT) {
          ctx.fillStyle = '#c46c3b'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = 'rgba(124, 45, 18, 0.18)';
          ctx.fillRect(x + 24, y + 36, 44, 7); ctx.fillRect(x + 102, y + 114, 52, 7);
        } else if (t === T.DIRT_ROAD) {
          ctx.fillStyle = '#9a5830'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.GRASS || t === T.FOREST) {
          ctx.fillStyle = t === T.FOREST ? '#163f24' : '#256137'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.SIDEWALK) {
          ctx.fillStyle = '#4e586a'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, TS - 8, TS - 8);
        } else if (t === T.CONCRETE) {
          ctx.fillStyle = '#4b5260'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.PLAZA) {
          ctx.fillStyle = '#64748b'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x + TS / 2, y + TS / 2, TS * 0.45, 0, Math.PI * 2); ctx.fill();
        } else if (t === T.STADIUM) {
          ctx.fillStyle = (c % 2 === 0) ? '#15803d' : '#16a34a'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.SHIP_DECK) {
          ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.TRACK) {
          ctx.fillStyle = '#181c24'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.PIER) {
          ctx.fillStyle = '#7c4a27'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.RUNWAY) {
          ctx.fillStyle = '#141821'; ctx.fillRect(x, y, TS + 1, TS + 1);
          if (r === 38 || r === 39 || r === 20) {
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            for (let sx = 16; sx < TS - 16; sx += 24) ctx.fillRect(x + sx, y + TS / 2 - 5, 14, 7);
          }
        } else if (t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE) {
          ctx.fillStyle = t === T.HIGHWAY ? '#171c26' : '#212734';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          const left = c > 0 && W.isRoadLike(W.tiles[r][c - 1]);
          const right = c < N - 1 && W.isRoadLike(W.tiles[r][c + 1]);
          const up = r > 0 && W.isRoadLike(W.tiles[r - 1][c]);
          const down = r < N - 1 && W.isRoadLike(W.tiles[r + 1][c]);
          const isHoriz = (left || right) && !(up || down);
          const isVert = (up || down) && !(left || right);
          const isCross = (left || right) && (up || down);

          ctx.fillStyle = '#64748b';
          if (!up && t !== T.BRIDGE) ctx.fillRect(x, y, TS, 5);
          if (!down && t !== T.BRIDGE) ctx.fillRect(x, y + TS - 5, TS, 5);
          if (!left && t !== T.BRIDGE) ctx.fillRect(x, y, 5, TS);
          if (!right && t !== T.BRIDGE) ctx.fillRect(x + TS - 5, y, 5, TS);

          if (isHoriz) {
            ctx.strokeStyle = t === T.HIGHWAY ? 'rgba(250, 204, 21, 0.8)' : 'rgba(226, 232, 240, 0.55)';
            ctx.lineWidth = 3.5; ctx.setLineDash([22, 16]);
            ctx.beginPath(); ctx.moveTo(x, y + TS / 2); ctx.lineTo(x + TS, y + TS / 2); ctx.stroke(); ctx.setLineDash([]);
          } else if (isVert) {
            ctx.strokeStyle = t === T.HIGHWAY ? 'rgba(250, 204, 21, 0.8)' : 'rgba(226, 232, 240, 0.55)';
            ctx.lineWidth = 3.5; ctx.setLineDash([22, 16]);
            ctx.beginPath(); ctx.moveTo(x + TS / 2, y); ctx.lineTo(x + TS / 2, y + TS); ctx.stroke(); ctx.setLineDash([]);
          } else if (isCross && phase && Traffic.hasTrafficLight(r, c)) {
            ctx.fillStyle = lightHex(phase.ew);
            ctx.beginPath(); ctx.arc(x + 14, y + TS - 14, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = lightHex(phase.ns);
            ctx.beginPath(); ctx.arc(x + 14, y + 14, 5, 0, Math.PI * 2); ctx.fill();
          }
        }

        const props = W.propsGrid[r][c];
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          if (p.type === 'bench') {
            ctx.fillStyle = '#92400e'; ctx.fillRect(p.x - 13, p.y - 4, 26, 8);
          } else if (p.type === 'tree' || p.type === 'pine') {
            ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.arc(p.x + 8, p.y + 9, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.type === 'pine' ? '#047857' : '#16a34a'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.type === 'pine' ? '#10b981' : '#4ade80'; ctx.beginPath(); ctx.arc(p.x - 4, p.y - 4, p.r * 0.42, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'palm') {
            ctx.strokeStyle = '#15803d'; ctx.lineWidth = 6.5;
            for (let a = 0; a < 7; a++) {
              const ang = a * (Math.PI * 2 / 7);
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(ang) * p.r, p.y + Math.sin(ang) * p.r); ctx.stroke();
            }
          } else if (p.type === 'cactus') {
            ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    drawRailTrack(ctx);
    drawGasStationsGround(ctx);
    drawGrandSign(ctx);
    drawCrashedUFO(ctx, time);

    if (W.landmarks) {
      const pulse = 0.85 + Math.sin(time * 0.006) * 0.15;
      for (let i = 0; i < W.landmarks.length; i++) {
        const lm = W.landmarks[i];
        if (!lm.enterable) continue;
        ctx.save(); ctx.translate(lm.x, lm.y);
        ctx.fillStyle = lm.color + '44'; ctx.beginPath(); ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = lm.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawRailTrack(ctx) {
    if (!W.railPath || W.railPath.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 12;
    ctx.beginPath();
    for (let i = 0; i < W.railPath.length; i++) {
      if (i === 0) ctx.moveTo(W.railPath[i].x, W.railPath[i].y);
      else ctx.lineTo(W.railPath[i].x, W.railPath[i].y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  }

  function drawGasStationsGround(ctx) {
    if (!W.gasStations) return;
    for (let i = 0; i < W.gasStations.length; i++) {
      const g = W.gasStations[i];
      ctx.save(); ctx.translate(g.x + 28, g.y + 18);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)'; ctx.fillRect(-38, -36, 76, 72);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.strokeRect(-38, -36, 76, 72);
      ctx.restore();
    }
  }

  function drawGrandSign(ctx) {
    const gs = W.megaZones.grandSign;
    ctx.save(); ctx.font = '900 120px system-ui'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 5;
    ctx.strokeText('G R A N D', gs.x, gs.y); ctx.fillText('G R A N D', gs.x, gs.y); ctx.restore();
  }

  function drawCrashedUFO(ctx, time) {
    const u = W.megaZones.ufo, glow = 0.55 + Math.sin(time * 0.006) * 0.35;
    ctx.save(); ctx.translate(u.x, u.y);
    ctx.fillStyle = `rgba(74, 222, 128, ${glow})`; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBuildingShadows(ctx, cam, vw, vh, zoom, darkAlpha) {
    const bounds = getVisibleBounds(cam, vw, vh, zoom, 2);
    const alpha = Math.max(0.16, 0.4 - darkAlpha * 0.35);
    ctx.fillStyle = `rgba(4, 8, 18, ${alpha})`;
    for (let r = bounds.r0; r <= bounds.r1; r++) {
      for (let c = bounds.c0; c <= bounds.c1; c++) {
        const objs = W.solidGrid[r][c];
        for (let i = 0; i < objs.length; i++) {
          const b = objs[i];
          if (b.style === 'fountain') continue;
          const sx = b.height * 0.28, sy = b.height * 0.36;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + sx, b.y + sy);
          ctx.lineTo(b.x + b.w + sx, b.y + b.h + sy); ctx.lineTo(b.x + sx, b.y + b.h + sy);
          ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  function drawWindowedWall(ctx, ax, ay, bx, by, rax, ray, rbx, rby, baseColor, b, darkAlpha, isSide) {
    ctx.fillStyle = isSide ? baseColor : lightenHex(baseColor, 20);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(rbx, rby); ctx.lineTo(rax, ray); ctx.closePath(); ctx.fill();
    if (b.style === 'mesa' || b.style === 'wall' || b.style === 'fountain') return;
    const wallH = Math.hypot(rax - ax, ray - ay);
    if (wallH < 6) return;
    const floors = Math.max(3, Math.min(9, Math.round(b.height / 22)));
    const nightBoost = Math.min(1, darkAlpha * 2.1);
    ctx.lineWidth = Math.max(2, Math.min(5, (wallH / floors) * 0.45));
    for (let f = 1; f < floors; f++) {
      const t = f / floors;
      const p1x = ax + (rax - ax) * t, p1y = ay + (ray - ay) * t;
      const p2x = bx + (rbx - bx) * t, p2y = by + (rby - by) * t;
      ctx.strokeStyle = (nightBoost > 0.25 && ((bHash(b) + f) % 2 === 0))
        ? 'rgba(253, 224, 71, 0.68)'
        : 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
    }
  }

  function drawBuildings25D(ctx, cam, vw, vh, zoom, time, darkAlpha) {
    const hw = vw / 2, hh = vh / 2;
    const bounds = getVisibleBounds(cam, vw, vh, zoom, 2);
    const visible = [];

    for (let r = bounds.r0; r <= bounds.r1; r++) {
      for (let c = bounds.c0; c <= bounds.c1; c++) {
        const objs = W.solidGrid[r][c];
        for (let i = 0; i < objs.length; i++) {
          const b = objs[i];
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          visible.push({ b: b, distSq: (cx - cam.x) ** 2 + (cy - cam.y) ** 2 });
        }
      }
    }
    visible.sort((a, b) => b.distSq - a.distSq);

    for (let i = 0; i < visible.length; i++) {
      const b = visible[i].b;
      const x1 = (b.x - cam.x) * zoom + hw, y1 = (b.y - cam.y) * zoom + hh;
      const x2 = x1 + b.w * zoom, y2 = y1 + b.h * zoom;
      const f = b.height * 0.0026;
      const rx1 = x1 + (x1 - hw) * f, ry1 = y1 + (y1 - hh) * f;
      const rx2 = x2 + (x2 - hw) * f, ry2 = y2 + (y2 - hh) * f;

      if (b.style === 'fountain') {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rad = (x2 - x1) / 2;
        ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.84, 0, Math.PI * 2); ctx.fill();
        continue;
      }

      if (y1 > hh) drawWindowedWall(ctx, x1, y1, x2, y1, rx1, ry1, rx2, ry1, b.w1, b, darkAlpha, false);
      if (y2 < hh) drawWindowedWall(ctx, x1, y2, x2, y2, rx1, ry2, rx2, ry2, b.w1, b, darkAlpha, false);
      if (x1 > hw) drawWindowedWall(ctx, x1, y1, x1, y2, rx1, ry1, rx1, ry2, b.w2, b, darkAlpha, true);
      if (x2 < hw) drawWindowedWall(ctx, x2, y1, x2, y2, rx2, ry1, rx2, ry2, b.w2, b, darkAlpha, true);

      const rw = rx2 - rx1, rh = ry2 - ry1;
      ctx.fillStyle = lightenHex(b.roof, 14); ctx.fillRect(rx1, ry1, rw, rh);
      const rim = Math.max(4, Math.min(10, rw * 0.07));
      ctx.fillStyle = b.roof; ctx.fillRect(rx1 + rim, ry1 + rim, Math.max(0, rw - rim * 2), Math.max(0, rh - rim * 2));

      if (b.style === 'landmark' && rw > 40) {
        ctx.strokeStyle = b.neon; ctx.lineWidth = 3;
        ctx.strokeRect(rx1 + 2, ry1 + 2, Math.max(0, rw - 4), Math.max(0, rh - 4));
        ctx.fillStyle = 'rgba(10,15,28,0.78)'; ctx.fillRect(rx1 + rw * 0.12, ry1 + rh * 0.34, rw * 0.76, rh * 0.32);
        ctx.fillStyle = b.neon; ctx.font = '900 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.landmarkLabel, rx1 + rw / 2, ry1 + rh / 2);
      } else if (b.roofPool && rw > 50 && rh > 50) {
        ctx.fillStyle = '#06b6d4'; ctx.fillRect(rx1 + rw * 0.24, ry1 + rh * 0.24, rw * 0.52, rh * 0.52);
      } else if (b.helipad && rw > 45) {
        const cx = rx1 + rw / 2, cy = ry1 + rh / 2, rad = Math.min(rw, rh) * 0.28;
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#facc15'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', cx, cy + 1);
      } else if (b.height > 170 && rw > 56) {
        const pw = rw * 0.5, ph = rh * 0.5;
        const px = rx1 + (rw - pw) / 2, py = ry1 + (rh - ph) / 2;
        ctx.fillStyle = lightenHex(b.roof, 24); ctx.fillRect(px, py, pw, ph);
      }

      if (b.sign && rw > 54) {
        ctx.fillStyle = b.neon || '#f8fafc'; ctx.font = '900 9px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.sign, rx1 + rw / 2, ry1 + rh * 0.84);
      }
      if (b.neon) { ctx.strokeStyle = b.neon; ctx.lineWidth = 2.2; ctx.strokeRect(rx1 + 2, ry1 + 2, Math.max(0, rw - 4), Math.max(0, rh - 4)); }
    }
  }

  function drawDayNight(ctx, cam, vw, vh, zoom, darkAlpha, time, entities) {
    if (darkAlpha > 0.01) {
      ctx.fillStyle = `rgba(5, 10, 28, ${darkAlpha})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  function drawRadar(ctx, vw, player, blips, cones, wanted, time, gpsPath, gpsTarget) {
    const size = Math.min(124, Math.max(96, Math.round(vw * 0.27)));
    const mx = vw - size - 10, my = 10, viewSpan = 120;

    ctx.save();
    ctx.beginPath(); ctx.roundRect(mx, my, size, size, 12); ctx.clip();
    ctx.fillStyle = '#082f49'; ctx.fillRect(mx, my, size, size);

    const pxMap = (player.x / C.WORLD_SIZE) * mapCanvas.width;
    const pyMap = (player.y / C.WORLD_SIZE) * mapCanvas.height;
    ctx.drawImage(mapCanvas, pxMap - viewSpan / 2, pyMap - viewSpan / 2, viewSpan, viewSpan, mx, my, size, size);

    const scale = size / viewSpan, cx = mx + size / 2, cy = my + size / 2;
    const pxPerWorld = (mapCanvas.width / C.WORLD_SIZE) * scale;
    const pulse = 0.8 + Math.sin(time * 0.008) * 0.25;

    if (gpsPath && gpsPath.length > 1) {
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < gpsPath.length; i++) {
        const rx = cx + (gpsPath[i].x - player.x) * pxPerWorld;
        const ry = cy + (gpsPath[i].y - player.y) * pxPerWorld;
        if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }

    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      const bxMap = (b.x / C.WORLD_SIZE) * mapCanvas.width, byMap = (b.y / C.WORLD_SIZE) * mapCanvas.height;
      let rx = cx + (bxMap - pxMap) * scale, ry = cy + (byMap - pyMap) * scale;
      rx = Math.max(mx + 5, Math.min(mx + size - 5, rx)); ry = Math.max(my + 5, Math.min(my + size - 5, ry));
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(rx, ry, (b.size || 3.6) * (b.pulse ? pulse : 1), 0, Math.PI * 2); ctx.fill();
    }

    ctx.translate(cx, cy); ctx.rotate(player.angle);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-2.5, 0); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = (wanted && wanted.level > 0) ? '#ef4444' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.roundRect(mx, my, size, size, 12); ctx.stroke();
    return { x: mx, y: my, size: size };
  }

  function drawFullMap(ctx, vw, vh, player, mapIcons, gpsPath, gpsTarget, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 20, 0.95)'; ctx.fillRect(0, 0, vw, vh);

    const mapSize = Math.min(vw - 24, vh - 175);
    const ox = (vw - mapSize) / 2;
    const oy = Math.max(108, (vh - mapSize) / 2 - 4);

    ctx.fillStyle = '#fff'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('🗺️ MAPA (150×150) – ŤUKNI PRE GPS', vw / 2, oy - 12);

    ctx.drawImage(mapCanvas, ox, oy, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, mapSize, mapSize);

    const labels = [
      { text: 'ALCATRAZ',    cx: 0.12, cy: 0.08, col: '#cbd5e1' },
      { text: 'ZÁKLADŇA',    cx: 0.42, cy: 0.10, col: '#fca5a5' },
      { text: 'NORTHWOOD',   cx: 0.50, cy: 0.21, col: '#93c5fd' },
      { text: 'LETISKO',     cx: 0.65, cy: 0.21, col: '#fde047' },
      { text: 'AREA 51',     cx: 0.76, cy: 0.34, col: '#4ade80' },
      { text: 'LES',         cx: 0.22, cy: 0.52, col: '#86efac' },
      { text: 'GRAND CITY',  cx: 0.52, cy: 0.62, col: '#7dd3fc' },
      { text: 'PALM BAY',    cx: 0.80, cy: 0.62, col: '#f9a8d4' },
      { text: 'DOCKS',       cx: 0.52, cy: 0.85, col: '#cbd5e1' },
      { text: 'OSTROV',      cx: 0.88, cy: 0.91, col: '#5eead4' }
    ];
    ctx.font = `900 ${Math.max(7.5, Math.round(mapSize * 0.02))}px system-ui`;
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillText(l.text, ox + l.cx * mapSize + 1, oy + l.cy * mapSize + 1);
      ctx.fillStyle = l.col;
      ctx.fillText(l.text, ox + l.cx * mapSize, oy + l.cy * mapSize);
    }

    if (gpsPath && gpsPath.length > 1) {
      ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (let i = 0; i < gpsPath.length; i++) {
        const lx = ox + (gpsPath[i].x / C.WORLD_SIZE) * mapSize;
        const ly = oy + (gpsPath[i].y / C.WORLD_SIZE) * mapSize;
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    if (mapIcons) {
      const badgeR = Math.max(8, Math.min(11, mapSize * 0.024));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(badgeR * 1.1)}px system-ui`;
      for (let i = 0; i < mapIcons.length; i++) {
        const ic = mapIcons[i];
        const bx = ox + (ic.x / C.WORLD_SIZE) * mapSize;
        const by = oy + (ic.y / C.WORLD_SIZE) * mapSize;
        ctx.fillStyle = 'rgba(10, 15, 28, 0.88)';
        ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(ic.icon, bx, by + 0.5);
      }
    }

    const px = ox + (player.x / C.WORLD_SIZE) * mapSize;
    const py = oy + (player.y / C.WORLD_SIZE) * mapSize;
    ctx.fillStyle = '#38bdf8'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.restore();
    return { ox: ox, oy: oy, size: mapSize };
  }

  return {
    drawGround: drawGround,
    drawBuildingShadows: drawBuildingShadows,
    drawBuildings25D: drawBuildings25D,
    drawDayNight: drawDayNight,
    drawRadar: drawRadar,
    drawFullMap: drawFullMap
  };
})();
