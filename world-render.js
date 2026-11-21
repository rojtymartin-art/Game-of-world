window.GTA = window.GTA || {};

window.GTA.Renderer = (function () {
  const C = window.GTA.Config;
  const T = C.TILES;
  const W = window.GTA.World;
  const TS = C.TILE_SIZE;
  const N = C.GRID_SIZE;

  const MAP_PX = 6;
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
          mctx.fillStyle = W.solidGrid[r][c][0].roof || 'rgba(255,255,255,0.22)';
          mctx.fillRect(c * MAP_PX + 1, r * MAP_PX + 1, MAP_PX - 2, MAP_PX - 2);
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
          const wave = Math.sin(time * 0.0024 + r * 0.8 + c * 0.6) * 12;
          ctx.fillStyle = isShallow ? 'rgba(165, 243, 252, 0.24)' : 'rgba(56, 189, 248, 0.14)';
          ctx.fillRect(x + 22 + wave, y + 40, 48, 3);
          ctx.fillRect(x + 88 - wave, y + 124, 44, 3);
        } else if (t === T.SAND) {
          ctx.fillStyle = '#e6cf9e'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.DESERT) {
          ctx.fillStyle = '#c46c3b'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = 'rgba(124, 45, 18, 0.16)';
          ctx.fillRect(x + 20, y + 32, 34, 6); ctx.fillRect(x + 108, y + 118, 42, 6);
        } else if (t === T.DIRT_ROAD) {
          ctx.fillStyle = '#9a5830'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = 'rgba(67, 20, 7, 0.22)'; ctx.fillRect(x + 26, y + 26, TS - 52, TS - 52);
        } else if (t === T.GRASS || t === T.FOREST) {
          ctx.fillStyle = t === T.FOREST ? '#163f24' : '#256137'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(x + 24, y + 28, 22, 5); ctx.fillRect(x + 112, y + 128, 26, 5);
        } else if (t === T.SIDEWALK) {
          ctx.fillStyle = '#4e586a'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.24)'; ctx.lineWidth = 3; ctx.strokeRect(x + 3, y + 3, TS - 6, TS - 6);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x + TS / 2, y + 4); ctx.lineTo(x + TS / 2, y + TS - 4); ctx.stroke();
        } else if (t === T.CONCRETE) {
          ctx.fillStyle = '#4b5260'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4);
        } else if (t === T.PLAZA) {
          ctx.fillStyle = '#64748b'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x + TS / 2, y + TS / 2, TS * 0.44, 0, Math.PI * 2); ctx.fill();
        } else if (t === T.STADIUM) {
          ctx.fillStyle = (c % 2 === 0) ? '#15803d' : '#16a34a'; ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.SHIP_DECK) {
          ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3;
          if (r === 62) { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + TS, y + 4); ctx.stroke(); }
          if (r === 64) { ctx.beginPath(); ctx.moveTo(x, y + TS - 4); ctx.lineTo(x + TS, y + TS - 4); ctx.stroke(); }
        } else if (t === T.TRACK) {
          ctx.fillStyle = '#181c24'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.fillStyle = (r + c) % 2 === 0 ? '#ef4444' : '#f8fafc';
          if (r === 22) ctx.fillRect(x, y, TS, 10);
          if (r === 27) ctx.fillRect(x, y + TS - 10, TS, 10);
          if (c === 27) ctx.fillRect(x, y, 10, TS);
          if (c === 39) ctx.fillRect(x + TS - 10, y, 10, TS);
          if (r === 27 && c === 33) {
            for (let sy = 14; sy < TS - 14; sy += 16) {
              for (let sx = 0; sx < 2; sx++) {
                ctx.fillStyle = ((Math.floor(sy / 16) + sx) % 2 === 0) ? '#fff' : '#09090b';
                ctx.fillRect(x + TS / 2 - 14 + sx * 14, y + sy, 14, 16);
              }
            }
          }
        } else if (t === T.PIER) {
          ctx.fillStyle = '#7c4a27'; ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(35, 18, 8, 0.5)'; ctx.lineWidth = 2.5;
          for (let px = 0; px < TS; px += 16) { ctx.beginPath(); ctx.moveTo(x + px, y); ctx.lineTo(x + px, y + TS); ctx.stroke(); }
          ctx.fillStyle = '#3b1806'; ctx.fillRect(x, y, TS, 6); ctx.fillRect(x, y + TS - 6, TS, 6);
        } else if (t === T.RUNWAY) {
          ctx.fillStyle = '#141821'; ctx.fillRect(x, y, TS + 1, TS + 1);
          if (r === 7) {
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
            if (t === T.HIGHWAY) {
              ctx.fillStyle = 'rgba(250, 204, 21, 0.78)';
              ctx.fillRect(x, y + TS / 2 - 4, TS, 2.5); ctx.fillRect(x, y + TS / 2 + 1.5, TS, 2.5);
            } else {
              ctx.strokeStyle = 'rgba(226, 232, 240, 0.52)'; ctx.lineWidth = 3; ctx.setLineDash([20, 18]);
              ctx.beginPath(); ctx.moveTo(x, y + TS / 2); ctx.lineTo(x + TS, y + TS / 2); ctx.stroke(); ctx.setLineDash([]);
            }
          } else if (isVert) {
            if (t === T.HIGHWAY) {
              ctx.fillStyle = 'rgba(250, 204, 21, 0.78)';
              ctx.fillRect(x + TS / 2 - 4, y, 2.5, TS); ctx.fillRect(x + TS / 2 + 1.5, y, 2.5, TS);
            } else {
              ctx.strokeStyle = 'rgba(226, 232, 240, 0.52)'; ctx.lineWidth = 3; ctx.setLineDash([20, 18]);
              ctx.beginPath(); ctx.moveTo(x + TS / 2, y); ctx.lineTo(x + TS / 2, y + TS); ctx.stroke(); ctx.setLineDash([]);
            }
          } else if (isCross) {
            ctx.fillStyle = 'rgba(241, 245, 249, 0.42)';
            for (let s = 22; s < TS - 22; s += 20) {
              if (up) ctx.fillRect(x + s, y + 6, 10, 18);
              if (down) ctx.fillRect(x + s, y + TS - 24, 10, 18);
              if (left) ctx.fillRect(x + 6, y + s, 18, 10);
              if (right) ctx.fillRect(x + TS - 24, y + s, 18, 10);
            }
            if (phase && Traffic.hasTrafficLight(r, c)) {
              const ewCol = lightHex(phase.ew), nsCol = lightHex(phase.ns);
              ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 4, y + TS - 16, 12, 12); ctx.fillRect(x + TS - 16, y + 4, 12, 12);
              ctx.fillStyle = ewCol;
              ctx.beginPath(); ctx.arc(x + 10, y + TS - 10, 4.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(x + TS - 10, y + 10, 4.5, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 4, y + 4, 12, 12); ctx.fillRect(x + TS - 16, y + TS - 16, 12, 12);
              ctx.fillStyle = nsCol;
              ctx.beginPath(); ctx.arc(x + 10, y + 10, 4.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(x + TS - 10, y + TS - 10, 4.5, 0, Math.PI * 2); ctx.fill();
            }
          }

          if (t === T.BRIDGE) {
            ctx.fillStyle = '#94a3b8';
            if (isHoriz) { ctx.fillRect(x, y, TS, 10); ctx.fillRect(x, y + TS - 10, TS, 10); }
            else { ctx.fillRect(x, y, 10, TS); ctx.fillRect(x + TS - 10, y, 10, TS); }
          }
        }

        const props = W.propsGrid[r][c];
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          if (p.type === 'umbrella') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(p.x + 5, p.y + 5, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'bench') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(p.x - 10, p.y - 3, 22, 8);
            ctx.fillStyle = '#92400e'; ctx.fillRect(p.x - 11, p.y - 4, 22, 7);
            ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 1; ctx.strokeRect(p.x - 11, p.y - 4, 22, 7);
          } else if (p.type === 'lamp') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(p.x + 3, p.y + 3, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'bush' || p.type === 'rock') {
            ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.arc(p.x + 3, p.y + 3, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.type === 'bush' ? '#166534' : '#78716c';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'tree' || p.type === 'pine') {
            ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.arc(p.x + 7, p.y + 8, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.type === 'pine' ? '#064e3b' : '#14532d'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.type === 'pine' ? '#047857' : '#16a34a'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, p.r * 0.72, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.type === 'pine' ? '#10b981' : '#4ade80'; ctx.beginPath(); ctx.arc(p.x - 4, p.y - 4, p.r * 0.36, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'palm') {
            ctx.strokeStyle = '#15803d'; ctx.lineWidth = 6;
            for (let a = 0; a < 7; a++) {
              const ang = a * (Math.PI * 2 / 7);
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(ang) * p.r, p.y + Math.sin(ang) * p.r); ctx.stroke();
            }
          } else if (p.type === 'cactus') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(p.x + 3, p.y + 3, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#22c55e'; ctx.fillRect(p.x - 9, p.y - 2, 18, 4);
          }
        }
      }
    }

    drawRailTrack(ctx);
    drawStadiumMarkings(ctx);
    drawCargoShipBow(ctx);
    drawGasStationsGround(ctx);
    drawArea51WireAndMystery(ctx, time);
    drawGrandSign(ctx);
    drawCrashedUFO(ctx, time);

    if (W.landmarks) {
      const pulse = 0.85 + Math.sin(time * 0.006) * 0.15;
      for (let i = 0; i < W.landmarks.length; i++) {
        const lm = W.landmarks[i];
        if (!lm.enterable) continue;
        ctx.save(); ctx.translate(lm.x, lm.y);
        ctx.fillStyle = lm.color + '44'; ctx.beginPath(); ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = lm.color; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawArea51WireAndMystery(ctx, time) {
    const z = W.megaZones.area69;
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -(time * 0.03);
    ctx.strokeRect(z.x1 + 26, z.y1 + 26, (z.x2 - z.x1) - 52, (z.y2 - z.y1) - 52);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    for (let x = z.x1 + 40; x < z.x2 - 40; x += 48) {
      ctx.beginPath(); ctx.moveTo(x - 6, z.y1 + 14); ctx.lineTo(x + 6, z.y1 + 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, z.y2 - 14); ctx.lineTo(x + 6, z.y2 - 22); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRailTrack(ctx) {
    if (!W.railPath || W.railPath.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#57534e'; ctx.lineWidth = 22; ctx.setLineDash([6, 12]); traceRail(ctx); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 12; traceRail(ctx); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 6; traceRail(ctx); ctx.stroke();
    ctx.restore();
  }
  function traceRail(ctx) {
    ctx.beginPath();
    for (let i = 0; i < W.railPath.length; i++) {
      if (i === 0) ctx.moveTo(W.railPath[i].x, W.railPath[i].y);
      else ctx.lineTo(W.railPath[i].x, W.railPath[i].y);
    }
    ctx.closePath();
  }

  function drawStadiumMarkings(ctx) {
    const x = 48 * TS + 32, y = 33 * TS - 30, w = 5 * TS - 64, h = 3 * TS + 60;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 74, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(x, y + h * 0.24, 125, h * 0.52);
    ctx.strokeRect(x + w - 125, y + h * 0.24, 125, h * 0.52);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - 18, y + h * 0.4, 18, h * 0.2);
    ctx.fillRect(x + w, y + h * 0.4, 18, h * 0.2);
    ctx.restore();
  }

  function drawCargoShipBow(ctx) {
    const bx = 41 * TS, by = 62 * TS, bh = 3 * TS;
    ctx.save(); ctx.fillStyle = '#991b1b';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + TS * 1.15, by + bh / 2); ctx.lineTo(bx, by + bh);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  }

  function drawGasStationsGround(ctx) {
    if (!W.gasStations) return;
    for (let i = 0; i < W.gasStations.length; i++) {
      const g = W.gasStations[i];
      ctx.save(); ctx.translate(g.x + 28, g.y + 18);
      if (g.destroyedTimer > 0) {
        ctx.fillStyle = 'rgba(10,10,12,0.75)'; ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.22)'; ctx.fillRect(-36, -34, 72, 68);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.strokeRect(-36, -34, 72, 68);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-20, -14, 14, 28); ctx.fillRect(8, -14, 14, 28);
        ctx.fillStyle = '#facc15'; ctx.fillRect(-18, -10, 10, 9); ctx.fillRect(10, -10, 10, 9);
        ctx.fillStyle = '#fff'; ctx.font = '900 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⛽ GAS', 0, -22);
      }
      ctx.restore();
    }
  }

  function drawGrandSign(ctx) {
    const gs = W.megaZones.grandSign;
    ctx.save(); ctx.font = '900 112px system-ui'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText('G R A N D', gs.x + 14, gs.y + 18);
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 5;
    ctx.strokeText('G R A N D', gs.x, gs.y); ctx.fillText('G R A N D', gs.x, gs.y); ctx.restore();
  }

  function drawCrashedUFO(ctx, time) {
    const u = W.megaZones.ufo, glow = 0.55 + Math.sin(time * 0.006) * 0.35;
    ctx.save(); ctx.translate(u.x, u.y);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.16)'; ctx.beginPath(); ctx.arc(0, 0, 74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20, 12, 8, 0.65)'; ctx.beginPath(); ctx.ellipse(0, 0, 62, 44, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(0, 0, 44, 28, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = `rgba(74, 222, 128, ${glow})`; ctx.beginPath(); ctx.arc(0, -2, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBuildingShadows(ctx, cam, vw, vh, zoom, darkAlpha) {
    const bounds = getVisibleBounds(cam, vw, vh, zoom, 2);
    const alpha = Math.max(0.14, 0.36 - darkAlpha * 0.35);
    ctx.fillStyle = `rgba(4, 8, 18, ${alpha})`;
    for (let r = bounds.r0; r <= bounds.r1; r++) {
      for (let c = bounds.c0; c <= bounds.c1; c++) {
        const objs = W.solidGrid[r][c];
        for (let i = 0; i < objs.length; i++) {
          const b = objs[i];
          if (b.style === 'fountain') continue;
          const sx = b.height * 0.26, sy = b.height * 0.34;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + sx, b.y + sy);
          ctx.lineTo(b.x + b.w + sx, b.y + b.h + sy); ctx.lineTo(b.x + sx, b.y + b.h + sy);
          ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  function lightenHex(hex, amt) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255, ((n >> 16) & 255) + amt)},${Math.min(255, ((n >> 8) & 255) + amt)},${Math.min(255, (n & 255) + amt)})`;
  }

  function drawWindowedWall(ctx, ax, ay, bx, by, rax, ray, rbx, rby, baseColor, b, darkAlpha, isSide) {
    const grad = ctx.createLinearGradient((ax + bx) / 2, (ay + by) / 2, (rax + rbx) / 2, (ray + rby) / 2);
    grad.addColorStop(0, '#0a0f1a'); grad.addColorStop(0.25, baseColor);
    grad.addColorStop(1, isSide ? baseColor : lightenHex(baseColor, 20));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(rbx, rby); ctx.lineTo(rax, ray); ctx.closePath(); ctx.fill();

    if (b.style === 'mesa' || b.style === 'wall' || b.style === 'fountain') return;
    const wallLen = Math.hypot(bx - ax, by - ay), wallH = Math.hypot(rax - ax, ray - ay);
    if (wallH < 5 || wallLen < 16) return;

    const h = bHash(b), facade = b.facade || 'classic';
    if (b.style === 'container' || facade === 'industrial') {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
      for (let u = 0.14; u < 0.92; u += 0.16) {
        ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * u, ay + (by - ay) * u);
        ctx.lineTo(rax + (rbx - rax) * u, ray + (rby - ray) * u); ctx.stroke();
      }
      return;
    }
    if (facade === 'marble') {
      ctx.strokeStyle = 'rgba(255,255,255,0.42)'; ctx.lineWidth = 3;
      for (let u = 0.14; u < 0.92; u += 0.18) {
        ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * u, ay + (by - ay) * u);
        ctx.lineTo(rax + (rbx - rax) * u, ray + (rby - ray) * u); ctx.stroke();
      }
      return;
    }

    const floors = b.style === 'villa' || b.style === 'trailer' ? 2 : Math.max(2, Math.min(8, Math.round(b.height / 24)));
    const cols = b.style === 'villa' ? 3 : Math.max(3, Math.min(6, Math.round(wallLen / 24)));
    const nightBoost = Math.min(1, darkAlpha * 2.1);

    ctx.lineWidth = Math.max(2, Math.min(5.5, (wallH / floors) * 0.52));
    for (let f = 0; f < floors; f++) {
      const t = (f + 0.55) / (floors + 0.25);
      const p1x = ax + (rax - ax) * t, p1y = ay + (ray - ay) * t;
      const p2x = bx + (rbx - bx) * t, p2y = by + (rby - by) * t;
      const step = Math.hypot(p2x - p1x, p2y - p1y) / cols;
      const sx = p1x + (p2x - p1x) * 0.06, sy = p1y + (p2y - p1y) * 0.06;
      const ex = p1x + (p2x - p1x) * 0.94, ey = p1y + (p2y - p1y) * 0.94;

      const isLit = ((h + f * 7) % 3 !== 0);
      if (facade === 'glass') {
        ctx.setLineDash([]);
        ctx.strokeStyle = (nightBoost > 0.25 && isLit) ? `rgba(125,211,252,${0.42 + nightBoost * 0.45})` : 'rgba(186,230,253,0.34)';
      } else if (facade === 'balcony') {
        ctx.setLineDash([]);
        ctx.strokeStyle = (nightBoost > 0.25 && isLit) ? `rgba(253,224,71,${0.45 + nightBoost * 0.45})` : 'rgba(255,255,255,0.58)';
      } else {
        ctx.setLineDash([Math.max(3, step * 0.52), Math.max(2, step * 0.38)]);
        ctx.strokeStyle = (nightBoost > 0.25 && isLit) ? `rgba(253,224,71,${0.4 + nightBoost * 0.5})` : 'rgba(12,24,42,0.58)';
      }
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.setLineDash([]);
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
      const f = b.height * 0.0025;
      const rx1 = x1 + (x1 - hw) * f, ry1 = y1 + (y1 - hh) * f;
      const rx2 = x2 + (x2 - hw) * f, ry2 = y2 + (y2 - hh) * f;

      if (b.style === 'fountain') {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rad = (x2 - x1) / 2;
        ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.82, 0, Math.PI * 2); ctx.fill();
        const jet = 0.55 + Math.sin(time * 0.008) * 0.25;
        ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.42 * jet, 0, Math.PI * 2); ctx.fill();
        continue;
      }

      if (b.style === 'silo') {
        const bcx = (x1 + x2) / 2, bcy = (y1 + y2) / 2, rad = (x2 - x1) / 2;
        const rcx = (rx1 + rx2) / 2, rcy = (ry1 + ry2) / 2, rrad = (rx2 - rx1) / 2;
        ctx.fillStyle = b.w1; ctx.beginPath(); ctx.arc(bcx, bcy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = b.w2; ctx.lineWidth = rad * 1.4; ctx.beginPath(); ctx.moveTo(bcx, bcy); ctx.lineTo(rcx, rcy); ctx.stroke();
        ctx.fillStyle = b.roof; ctx.beginPath(); ctx.arc(rcx, rcy, rrad, 0, Math.PI * 2); ctx.fill();
        continue;
      }

      if (y1 > hh) drawWindowedWall(ctx, x1, y1, x2, y1, rx1, ry1, rx2, ry1, b.w1, b, darkAlpha, false);
      if (y2 < hh) drawWindowedWall(ctx, x1, y2, x2, y2, rx1, ry2, rx2, ry2, b.w1, b, darkAlpha, false);
      if (x1 > hw) drawWindowedWall(ctx, x1, y1, x1, y2, rx1, ry1, rx1, ry2, b.w2, b, darkAlpha, true);
      if (x2 < hw) drawWindowedWall(ctx, x2, y1, x2, y2, rx2, ry1, rx2, ry2, b.w2, b, darkAlpha, true);

      const rw = rx2 - rx1, rh = ry2 - ry1;

      if (b.style === 'villa') {
        ctx.fillStyle = b.roof; ctx.fillRect(rx1, ry1, rw, rh);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(rx1, ry1 + rh / 2, rw, rh / 2);
      } else if (b.style === 'construction') {
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 4; ctx.strokeRect(rx1, ry1, rw, rh);
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.moveTo(rx2, ry1); ctx.lineTo(rx1, ry2); ctx.stroke();
      } else if (b.style === 'container' || b.style === 'wall' || b.style === 'mesa' || b.style === 'trailer') {
        ctx.fillStyle = b.roof; ctx.fillRect(rx1, ry1, rw, rh);
      } else if (b.style === 'warehouse' || b.style === 'hangar') {
        ctx.fillStyle = b.roof; ctx.fillRect(rx1, ry1, rw, rh);
        ctx.fillStyle = 'rgba(186,230,253,0.35)';
        ctx.fillRect(rx1 + rw * 0.14, ry1 + rh * 0.22, rw * 0.72, rh * 0.16);
        ctx.fillRect(rx1 + rw * 0.14, ry1 + rh * 0.62, rw * 0.72, rh * 0.16);
      } else {
        ctx.fillStyle = lightenHex(b.roof, 16); ctx.fillRect(rx1, ry1, rw, rh);
        const rim = Math.max(4, Math.min(9, rw * 0.08));
        ctx.fillStyle = b.roof; ctx.fillRect(rx1 + rim, ry1 + rim, Math.max(0, rw - rim * 2), Math.max(0, rh - rim * 2));

        if (b.style === 'landmark') {
          ctx.strokeStyle = b.neon; ctx.lineWidth = 3.2;
          ctx.strokeRect(rx1 + 3, ry1 + 3, Math.max(0, rw - 6), Math.max(0, rh - 6));
          if (rw > 40) {
            const cx = rx1 + rw / 2, cy = ry1 + rh / 2;
            ctx.fillStyle = 'rgba(10, 15, 28, 0.78)';
            ctx.beginPath(); ctx.roundRect(rx1 + rw * 0.1, cy - 22, rw * 0.8, 44, 8); ctx.fill();
            ctx.font = `${Math.max(12, Math.round(rw * 0.16))}px system-ui`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(b.landmarkIcon, cx, cy - 7);
            ctx.fillStyle = b.neon; ctx.font = `900 ${Math.max(9, Math.round(rw * 0.12))}px system-ui`;
            ctx.fillText(b.landmarkLabel, cx, cy + 12);
          }
          continue;
        }

        if (b.roofPool && rw > 48 && rh > 48) {
          ctx.fillStyle = '#e2e8f0'; ctx.fillRect(rx1 + rw * 0.2, ry1 + rh * 0.22, rw * 0.6, rh * 0.56);
          ctx.fillStyle = '#06b6d4'; ctx.fillRect(rx1 + rw * 0.25, ry1 + rh * 0.27, rw * 0.5, rh * 0.46);
        } else if (b.helipad && rw > 45) {
          const cx = rx1 + rw / 2, cy = ry1 + rh / 2, rad = Math.min(rw, rh) * 0.3;
          ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx, cy, rad + 3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#facc15'; ctx.font = `900 ${Math.round(rad * 1.15)}px system-ui`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', cx, cy + 1);
        } else {
          if (b.acUnit && rw > 32 && rh > 32) {
            ctx.fillStyle = '#94a3b8'; ctx.fillRect(rx1 + rw * 0.16, ry1 + rh * 0.16, 10, 10);
          }
          if (b.antenna && rw > 32 && rh > 32) {
            ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(rx2 - rw * 0.2, ry1 + rh * 0.2); ctx.lineTo(rx2 - rw * 0.2 - 8, ry1 + rh * 0.2 - 10); ctx.stroke();
          }
          if (b.height > 145 && rw > 54) {
            const pw = rw * 0.52, ph = rh * 0.52;
            const px = rx1 + (rw - pw) / 2, py = ry1 + (rh - ph) / 2;
            const prx = px + (px - hw) * 0.075, pry = py + (py - hh) * 0.075;
            ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(px + 5, py + 6, pw, ph);
            ctx.fillStyle = lightenHex(b.roof, 26); ctx.fillRect(prx, pry, pw, ph);
            if (Math.floor(time / 650 + bHash(b)) % 2 === 0) {
              ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(prx + pw / 2, pry + ph / 2, 3.2, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
        if (b.sign && rw > 48) {
          ctx.fillStyle = b.neon || '#f8fafc'; ctx.font = `900 ${Math.max(8, Math.round(rw * 0.11))}px system-ui`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.sign, rx1 + rw / 2, ry1 + rh * 0.82);
        }
        if (b.neon) { ctx.strokeStyle = b.neon; ctx.lineWidth = 2.4; ctx.strokeRect(rx1 + 2, ry1 + 2, Math.max(0, rw - 4), Math.max(0, rh - 4)); }
      }
    }

    drawFerrisWheel(ctx, cam, hw, hh, zoom, time);
    drawTowerCrane(ctx, cam, hw, hh, zoom, time);
  }

  function drawFerrisWheel(ctx, cam, hw, hh, zoom, time) {
    const fw = W.megaZones.ferrisWheel;
    const sx = (fw.x - cam.x) * zoom + hw, sy = (fw.y - cam.y) * zoom + hh;
    if (Math.abs(sx - hw) > hw + 220 || Math.abs(sy - hh) > hh + 220) return;
    const rad = 68 * zoom;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(time * 0.00055);
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.stroke();
    const cols = ['#ef4444', '#facc15', '#38bdf8', '#4ade80', '#ec4899', '#a855f7'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, gx = Math.cos(a) * rad, gy = Math.sin(a) * rad;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.arc(gx, gy, 7 * zoom, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawTowerCrane(ctx, cam, hw, hh, zoom, time) {
    const cr = W.megaZones.crane;
    const sx = (cr.x - cam.x) * zoom + hw, sy = (cr.y - cam.y) * zoom + hh;
    if (Math.abs(sx - hw) > hw + 260 || Math.abs(sy - hh) > hh + 260) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(time * 0.0004) * 1.4);
    ctx.fillStyle = '#eab308'; ctx.fillRect(-55 * zoom, -5 * zoom, 220 * zoom, 10 * zoom);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(-55 * zoom, -8 * zoom, 24 * zoom, 16 * zoom);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(160 * zoom, 0, 4 * zoom, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawDayNight(ctx, cam, vw, vh, zoom, darkAlpha, time, entities) {
    if (darkAlpha > 0.01) {
      ctx.fillStyle = `rgba(5, 10, 28, ${darkAlpha})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(vw / 2, vh / 2); ctx.scale(zoom, zoom); ctx.translate(-cam.x, -cam.y);

    if (darkAlpha > 0.12) {
      const b = getVisibleBounds(cam, vw, vh, zoom, 1);
      const lampAlpha = darkAlpha * 0.42;
      for (let r = b.r0; r <= b.r1; r++) {
        for (let c = b.c0; c <= b.c1; c++) {
          const t = W.tiles[r][c];
          if ((t === T.ROAD || t === T.HIGHWAY) && (r + c) % 2 === 0) {
            const lx = c * TS + TS / 2, ly = r * TS + TS / 2;
            const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 95);
            g.addColorStop(0, `rgba(254,240,138,${lampAlpha})`); g.addColorStop(1, 'rgba(254,240,138,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 95, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    if (entities && entities.vehicles) {
      const flash = Math.floor(time / 120) % 2 === 0;
      const halfW = (vw / 2) / zoom + 160, halfH = (vh / 2) / zoom + 160;
      for (let i = 0; i < entities.vehicles.length; i++) {
        const v = entities.vehicles[i];
        if (Math.abs(v.x - cam.x) > halfW || Math.abs(v.y - cam.y) > halfH) continue;
        if (v.sirenOn) {
          const g = ctx.createRadialGradient(v.x, v.y, 4, v.x, v.y, 75);
          g.addColorStop(0, flash ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(v.x, v.y, 75, 0, Math.PI * 2); ctx.fill();
        }
        if (darkAlpha > 0.15 && !v.spec.isAircraft) {
          const hx = v.x + Math.cos(v.angle) * 65, hy = v.y + Math.sin(v.angle) * 65;
          const g = ctx.createRadialGradient(hx, hy, 5, hx, hy, 78);
          g.addColorStop(0, `rgba(254,249,195,${darkAlpha * 0.45})`); g.addColorStop(1, 'rgba(254,249,195,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 78, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawRadar(ctx, vw, player, blips, cones, wanted, time, gpsPath, gpsTarget) {
    const size = Math.min(124, Math.max(96, Math.round(vw * 0.27)));
    const mx = vw - size - 10, my = 10, viewSpan = 132;

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
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < gpsPath.length; i++) {
        const rx = cx + (gpsPath[i].x - player.x) * pxPerWorld;
        const ry = cy + (gpsPath[i].y - player.y) * pxPerWorld;
        if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }

    if (cones && cones.length) {
      const flash = Math.floor(time / 220) % 2 === 0;
      for (let i = 0; i < cones.length; i++) {
        const cn = cones[i];
        const rx = cx + (cn.x - player.x) * pxPerWorld, ry = cy + (cn.y - player.y) * pxPerWorld;
        ctx.fillStyle = flash ? 'rgba(239,68,68,0.28)' : 'rgba(59,130,246,0.28)';
        ctx.beginPath(); ctx.moveTo(rx, ry);
        ctx.arc(rx, ry, cn.range * pxPerWorld, cn.angle - 1.0, cn.angle + 1.0); ctx.closePath(); ctx.fill();
      }
    }

    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      const bxMap = (b.x / C.WORLD_SIZE) * mapCanvas.width, byMap = (b.y / C.WORLD_SIZE) * mapCanvas.height;
      let rx = cx + (bxMap - pxMap) * scale, ry = cy + (byMap - pyMap) * scale;
      const out = (rx < mx + 4 || rx > mx + size - 4 || ry < my + 4 || ry > my + size - 4);
      if (out && !b.pulse) continue;
      rx = Math.max(mx + 5, Math.min(mx + size - 5, rx)); ry = Math.max(my + 5, Math.min(my + size - 5, ry));
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(rx, ry, (b.size || 3.6) * (b.pulse ? pulse : 1), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.1; ctx.stroke();
    }

    if (gpsTarget) {
      let tx = cx + (gpsTarget.x - player.x) * pxPerWorld;
      let ty = cy + (gpsTarget.y - player.y) * pxPerWorld;
      tx = Math.max(mx + 7, Math.min(mx + size - 7, tx));
      ty = Math.max(my + 7, Math.min(my + size - 7, ty));
      ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(tx, ty, 5.5 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    ctx.translate(cx, cy); ctx.rotate(player.angle);
    ctx.fillStyle = '#38bdf8'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-2.5, 0); ctx.lineTo(-5, 4.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    let borderCol = 'rgba(255,255,255,0.3)';
    if (wanted && wanted.level > 0) borderCol = (Math.floor(time / 180) % 2 === 0) ? '#ef4444' : '#3b82f6';
    else if (gpsTarget) borderCol = '#c084fc';
    ctx.strokeStyle = borderCol; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.roundRect(mx, my, size, size, 12); ctx.stroke();
    return { x: mx, y: my, size: size };
  }

  function drawFullMap(ctx, vw, vh, player, mapIcons, gpsPath, gpsTarget, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 20, 0.95)'; ctx.fillRect(0, 0, vw, vh);

    const mapSize = Math.min(vw - 24, vh - 165);
    const ox = (vw - mapSize) / 2;
    const oy = Math.max(46, (vh - mapSize) / 2 - 18);

    ctx.fillStyle = '#fff'; ctx.font = '900 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('🗺️ GRAND STATE – ŤUKNI NA IKONU ALEBO CESTU PRE GPS', vw / 2, oy - 14);

    ctx.drawImage(mapCanvas, ox, oy, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, mapSize, mapSize);

    const labels = [
      { text: 'ALCATRAZ',    cx: 0.12, cy: 0.12, col: '#cbd5e1' },
      { text: 'VOJ. ZÁKLADŇA',cx: 0.45, cy: 0.11, col: '#fca5a5' },
      { text: 'AREA 51',     cx: 0.69, cy: 0.21, col: '#4ade80' },
      { text: 'SPEEDWAY',    cx: 0.46, cy: 0.34, col: '#fde047' },
      { text: 'PINE FOREST', cx: 0.18, cy: 0.50, col: '#86efac' },
      { text: 'DOWNTOWN',    cx: 0.49, cy: 0.60, col: '#7dd3fc' },
      { text: 'ŠTADIÓN',     cx: 0.70, cy: 0.48, col: '#4ade80' },
      { text: 'PALM BAY',    cx: 0.84, cy: 0.63, col: '#f9a8d4' },
      { text: 'SOUTH DOCKS', cx: 0.48, cy: 0.84, col: '#cbd5e1' },
      { text: 'PAŠERÁCI',    cx: 0.85, cy: 0.86, col: '#5eead4' }
    ];
    ctx.font = `900 ${Math.max(8, Math.round(mapSize * 0.022))}px system-ui`;
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillText(l.text, ox + l.cx * mapSize + 1, oy + l.cy * mapSize + 1);
      ctx.fillStyle = l.col;
      ctx.fillText(l.text, ox + l.cx * mapSize, oy + l.cy * mapSize);
    }

    if (gpsPath && gpsPath.length > 1) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
      ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < gpsPath.length; i++) {
        const lx = ox + (gpsPath[i].x / C.WORLD_SIZE) * mapSize;
        const ly = oy + (gpsPath[i].y / C.WORLD_SIZE) * mapSize;
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 3.2; ctx.stroke();
    }

    if (mapIcons) {
      const badgeR = Math.max(9, Math.min(12, mapSize * 0.028));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(badgeR * 1.15)}px system-ui`;
      for (let i = 0; i < mapIcons.length; i++) {
        const ic = mapIcons[i];
        const bx = ox + (ic.x / C.WORLD_SIZE) * mapSize;
        const by = oy + (ic.y / C.WORLD_SIZE) * mapSize;
        ctx.fillStyle = 'rgba(10, 15, 28, 0.88)';
        ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ic.color || '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillText(ic.icon, bx, by + 0.5);
      }
    }

    if (gpsTarget) {
      const gx = ox + (gpsTarget.x / C.WORLD_SIZE) * mapSize;
      const gy = oy + (gpsTarget.y / C.WORLD_SIZE) * mapSize;
      const pulse = 1 + Math.sin(time * 0.008) * 0.25;
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gx, gy, 14 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3e8ff'; ctx.font = '800 11px system-ui'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('🟣 ' + gpsTarget.label, gx, gy - 16);
    }

    const px = ox + (player.x / C.WORLD_SIZE) * mapSize;
    const py = oy + (player.y / C.WORLD_SIZE) * mapSize;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
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
