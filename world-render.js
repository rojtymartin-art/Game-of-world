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
        if (t === T.WATER) col = '#083358';
        else if (t === T.SAND) col = '#d4b483';
        else if (t === T.GRASS) col = '#1e5631';
        else if (t === T.FOREST) col = '#143d22';
        else if (t === T.SIDEWALK) col = '#3f4756';
        else if (t === T.ROAD) col = '#1f2937';
        else if (t === T.HIGHWAY) col = '#111827';
        else if (t === T.BRIDGE) col = '#475569';
        else if (t === T.CONCRETE) col = '#52525b';
        else if (t === T.RUNWAY) col = '#0f172a';
        else if (t === T.PIER) col = '#78350f';

        mctx.fillStyle = col;
        mctx.fillRect(c * MAP_PX, r * MAP_PX, MAP_PX, MAP_PX);
        if (W.solidGrid[r][c].length > 0 && t !== T.FOREST) {
          mctx.fillStyle = 'rgba(255,255,255,0.22)';
          mctx.fillRect(c * MAP_PX + 1, r * MAP_PX + 1, MAP_PX - 2, MAP_PX - 2);
        }
      }
    }
  })();

  function getVisibleBounds(cam, vw, vh, zoom, pad) {
    const halfW = (vw / 2) / zoom;
    const halfH = (vh / 2) / zoom;
    return {
      c0: Math.max(0, Math.floor((cam.x - halfW) / TS) - pad),
      c1: Math.min(N - 1, Math.ceil((cam.x + halfW) / TS) + pad),
      r0: Math.max(0, Math.floor((cam.y - halfH) / TS) - pad),
      r1: Math.min(N - 1, Math.ceil((cam.y + halfH) / TS) + pad)
    };
  }

  function bHash(b) {
    return Math.abs(Math.floor(b.x * 13 + b.y * 29 + b.height * 7));
  }

  function drawGround(ctx, cam, vw, vh, zoom, time) {
    const b = getVisibleBounds(cam, vw, vh, zoom, 1);

    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        const t = W.tiles[r][c];
        const x = c * TS, y = r * TS;

        if (t === T.WATER) {
          ctx.fillStyle = '#09395e';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          const wave = Math.sin(time * 0.0022 + r * 0.8 + c * 0.6) * 12;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
          ctx.fillRect(x + 22 + wave, y + 40, 48, 3);
          ctx.fillRect(x + 88 - wave, y + 124, 44, 3);
          if (c > 0 && W.tiles[r][c - 1] === T.SAND) {
            const foam = 6 + Math.sin(time * 0.003 + r) * 4;
            ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
            ctx.fillRect(x, y, foam, TS + 1);
          }
        } else if (t === T.SAND) {
          ctx.fillStyle = '#d8be8c';
          ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.GRASS || t === T.FOREST) {
          ctx.fillStyle = t === T.FOREST ? '#153b21' : '#215430';
          ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.SIDEWALK) {
          ctx.fillStyle = '#4e586a';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 3, y + 3, TS - 6, TS - 6);
        } else if (t === T.CONCRETE) {
          ctx.fillStyle = '#4b5260';
          ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.PIER) {
          ctx.fillStyle = '#7c4a27';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(35, 18, 8, 0.5)';
          ctx.lineWidth = 2.5;
          for (let px = 0; px < TS; px += 16) {
            ctx.beginPath(); ctx.moveTo(x + px, y); ctx.lineTo(x + px, y + TS); ctx.stroke();
          }
          ctx.fillStyle = '#3b1806';
          ctx.fillRect(x, y, TS, 8); ctx.fillRect(x, y + TS - 8, TS, 8);
        } else if (t === T.RUNWAY) {
          ctx.fillStyle = '#141821';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          if (r === 48) {
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.fillRect(x + 24, y + TS - 5, TS - 48, 10);
          }
          if (c === 5 || c === 20) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (let sy = 16; sy < TS - 16; sy += 24) {
              ctx.fillRect(x + (c === 5 ? 16 : TS - 76), y + sy, 60, 11);
            }
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
              ctx.fillRect(x, y + TS / 2 - 4, TS, 2.5);
              ctx.fillRect(x, y + TS / 2 + 1.5, TS, 2.5);
            } else {
              ctx.strokeStyle = 'rgba(226, 232, 240, 0.52)';
              ctx.lineWidth = 3; ctx.setLineDash([20, 18]);
              ctx.beginPath(); ctx.moveTo(x, y + TS / 2); ctx.lineTo(x + TS, y + TS / 2); ctx.stroke();
              ctx.setLineDash([]);
            }
          } else if (isVert) {
            if (t === T.HIGHWAY) {
              ctx.fillStyle = 'rgba(250, 204, 21, 0.78)';
              ctx.fillRect(x + TS / 2 - 4, y, 2.5, TS);
              ctx.fillRect(x + TS / 2 + 1.5, y, 2.5, TS);
            } else {
              ctx.strokeStyle = 'rgba(226, 232, 240, 0.52)';
              ctx.lineWidth = 3; ctx.setLineDash([20, 18]);
              ctx.beginPath(); ctx.moveTo(x + TS / 2, y); ctx.lineTo(x + TS / 2, y + TS); ctx.stroke();
              ctx.setLineDash([]);
            }
          } else if (isCross) {
            ctx.fillStyle = 'rgba(241, 245, 249, 0.42)';
            for (let s = 22; s < TS - 22; s += 20) {
              if (up) ctx.fillRect(x + s, y + 6, 10, 18);
              if (down) ctx.fillRect(x + s, y + TS - 24, 10, 18);
              if (left) ctx.fillRect(x + 6, y + s, 18, 10);
              if (right) ctx.fillRect(x + TS - 24, y + s, 18, 10);
            }
          }

          if (t === T.BRIDGE) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(x, y, TS, 11); ctx.fillRect(x, y + TS - 11, TS, 11);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + TS / 2 - 5, y + 2, 10, 6); ctx.fillRect(x + TS / 2 - 5, y + TS - 8, 10, 6);
          }
        }

        const props = W.propsGrid[r][c];
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          if (p.type === 'pool') {
            ctx.fillStyle = '#e2e8f0'; ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(p.x, p.y, p.w, p.h);
          } else if (p.type === 'umbrella') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.arc(p.x + 5, p.y + 5, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'tree') {
            ctx.fillStyle = 'rgba(0,0,0,0.34)';
            ctx.beginPath(); ctx.arc(p.x + 7, p.y + 8, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#14532d';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, p.r * 0.78, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4ade80';
            ctx.beginPath(); ctx.arc(p.x - 5, p.y - 5, p.r * 0.42, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'palm') {
            ctx.strokeStyle = '#15803d'; ctx.lineWidth = 6;
            for (let a = 0; a < 7; a++) {
              const ang = a * (Math.PI * 2 / 7);
              ctx.beginPath(); ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + Math.cos(ang) * p.r, p.y + Math.sin(ang) * p.r); ctx.stroke();
            }
          }
        }
      }
    }
  }

  function drawBuildingShadows(ctx, cam, vw, vh, zoom, darkAlpha) {
    const bounds = getVisibleBounds(cam, vw, vh, zoom, 2);
    const alpha = Math.max(0.12, 0.34 - darkAlpha * 0.35);
    ctx.fillStyle = `rgba(4, 8, 18, ${alpha})`;
    for (let r = bounds.r0; r <= bounds.r1; r++) {
      for (let c = bounds.c0; c <= bounds.c1; c++) {
        const objs = W.solidGrid[r][c];
        for (let i = 0; i < objs.length; i++) {
          const b = objs[i];
          if (b.style === 'hill') continue;
          const sx = b.height * 0.24, sy = b.height * 0.32;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w, b.y);
          ctx.lineTo(b.x + b.w + sx, b.y + sy);
          ctx.lineTo(b.x + b.w + sx, b.y + b.h + sy);
          ctx.lineTo(b.x + sx, b.y + b.h + sy);
          ctx.lineTo(b.x, b.y + b.h);
          ctx.lineTo(b.x + b.w, b.y + b.h);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  function lightenHex(hex, amt) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + amt);
    const g = Math.min(255, ((n >> 8) & 255) + amt);
    const b = Math.min(255, (n & 255) + amt);
    return `rgb(${r},${g},${b})`;
  }

  function drawWindowedWall(ctx, ax, ay, bx, by, rax, ray, rbx, rby, baseColor, b, darkAlpha, isSide) {
    const grad = ctx.createLinearGradient((ax + bx) / 2, (ay + by) / 2, (rax + rbx) / 2, (ray + rby) / 2);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.28, baseColor);
    grad.addColorStop(1, isSide ? baseColor : lightenHex(baseColor, 18));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(rbx, rby); ctx.lineTo(rax, ray);
    ctx.closePath(); ctx.fill();

    if (b.style === 'hill') return;
    const wallLen = Math.hypot(bx - ax, by - ay);
    const wallH = Math.hypot(rax - ax, ray - ay);
    if (wallH < 5 || wallLen < 16) return;

    const h = bHash(b);
    if (b.style === 'container') {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
      for (let u = 0.14; u < 0.92; u += 0.16) {
        ctx.beginPath();
        ctx.moveTo(ax + (bx - ax) * u, ay + (by - ay) * u);
        ctx.lineTo(rax + (rbx - rax) * u, ray + (rby - ray) * u); ctx.stroke();
      }
      return;
    }

    const floors = b.style === 'villa' ? 2 : Math.max(2, Math.min(8, Math.round(b.height / 24)));
    const cols = b.style === 'villa' ? 3 : Math.max(3, Math.min(6, Math.round(wallLen / 24)));
    const nightBoost = Math.min(1, darkAlpha * 2.1);

    ctx.lineWidth = Math.max(2, Math.min(5.5, (wallH / floors) * 0.52));
    for (let f = 0; f < floors; f++) {
      const t = (f + 0.55) / (floors + 0.25);
      const p1x = ax + (rax - ax) * t, p1y = ay + (ray - ay) * t;
      const p2x = bx + (rbx - bx) * t, p2y = by + (rby - by) * t;
      const step = Math.hypot(p2x - p1x, p2y - p1y) / cols;
      const sx = p1x + (p2x - p1x) * 0.08, sy = p1y + (p2y - p1y) * 0.08;
      const ex = p1x + (p2x - p1x) * 0.92, ey = p1y + (p2y - p1y) * 0.92;

      const isLit = ((h + f * 7) % 3 !== 0);
      if (nightBoost > 0.25 && isLit) {
        ctx.strokeStyle = b.neon && (f % 2 === 0)
          ? `rgba(125, 211, 252, ${0.45 + nightBoost * 0.45})`
          : `rgba(253, 224, 71, ${0.38 + nightBoost * 0.5})`;
      } else {
        ctx.strokeStyle = b.style === 'villa' ? 'rgba(30, 58, 95, 0.72)' : 'rgba(12, 24, 42, 0.62)';
      }

      ctx.setLineDash([Math.max(3, step * 0.55), Math.max(2, step * 0.35)]);
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
          visible.push({ b, distSq: (cx - cam.x) ** 2 + (cy - cam.y) ** 2 });
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

      if (y1 > hh) drawWindowedWall(ctx, x1, y1, x2, y1, rx1, ry1, rx2, ry1, b.w1, b, darkAlpha, false);
      if (y2 < hh) drawWindowedWall(ctx, x1, y2, x2, y2, rx1, ry2, rx2, ry2, b.w1, b, darkAlpha, false);
      if (x1 > hw) drawWindowedWall(ctx, x1, y1, x1, y2, rx1, ry1, rx1, ry2, b.w2, b, darkAlpha, true);
      if (x2 < hw) drawWindowedWall(ctx, x2, y1, x2, y2, rx2, ry1, rx2, ry2, b.w2, b, darkAlpha, true);

      const rw = rx2 - rx1, rh = ry2 - ry1;
      if (b.style === 'villa') {
        ctx.fillStyle = b.roof; ctx.fillRect(rx1, ry1, rw, rh);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(rx1, ry1 + rh / 2, rw, rh / 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rx1 + 4, ry1 + rh / 2); ctx.lineTo(rx2 - 4, ry1 + rh / 2); ctx.stroke();
      } else if (b.style === 'container') {
        ctx.fillStyle = b.roof; ctx.fillRect(rx1, ry1, rw, rh);
      } else if (b.style === 'warehouse' || b.style === 'hangar') {
        ctx.fillStyle = b.roof; ctx.fillRect(rx1, ry1, rw, rh);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
        ctx.fillRect(rx1 + rw * 0.14, ry1 + rh * 0.22, rw * 0.72, rh * 0.16);
        ctx.fillRect(rx1 + rw * 0.14, ry1 + rh * 0.62, rw * 0.72, rh * 0.16);
      } else {
        ctx.fillStyle = lightenHex(b.roof, 14); ctx.fillRect(rx1, ry1, rw, rh);
        const rim = Math.max(4, Math.min(10, rw * 0.08));
        ctx.fillStyle = b.roof;
        ctx.fillRect(rx1 + rim, ry1 + rim, Math.max(0, rw - rim * 2), Math.max(0, rh - rim * 2));

        if (b.height > 140 && !b.helipad && rw > 54) {
          const pw = rw * 0.52, ph = rh * 0.52;
          const px = rx1 + (rw - pw) / 2, py = ry1 + (rh - ph) / 2;
          const prx = px + (px - hw) * 0.075, pry = py + (py - hh) * 0.075;
          ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(px + 5, py + 6, pw, ph);
          ctx.fillStyle = lightenHex(b.roof, 24); ctx.fillRect(prx, pry, pw, ph);
          if (Math.floor(time / 650 + bHash(b)) % 2 === 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(prx + pw / 2, pry + ph / 2, 3.2, 0, Math.PI * 2); ctx.fill();
          }
        } else if (b.helipad && rw > 45) {
          const cx = rx1 + rw / 2, cy = ry1 + rh / 2, rad = Math.min(rw, rh) * 0.3;
          ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx, cy, rad + 3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#facc15'; ctx.font = `900 ${Math.round(rad * 1.15)}px system-ui`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', cx, cy + 1);
        }
        if (b.neon) {
          ctx.strokeStyle = b.neon; ctx.lineWidth = 2.4;
          ctx.strokeRect(rx1 + 2, ry1 + 2, Math.max(0, rw - 4), Math.max(0, rh - 4));
        }
      }
    }
  }

  function drawDayNight(ctx, cam, vw, vh, zoom, darkAlpha, time, entities) {
    if (darkAlpha > 0.01) {
      ctx.fillStyle = `rgba(5, 10, 28, ${darkAlpha})`;
      ctx.fillRect(0, 0, vw, vh);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    if (darkAlpha > 0.12) {
      const b = getVisibleBounds(cam, vw, vh, zoom, 1);
      const lampAlpha = darkAlpha * 0.42;
      for (let r = b.r0; r <= b.r1; r++) {
        for (let c = b.c0; c <= b.c1; c++) {
          const t = W.tiles[r][c];
          if ((t === T.ROAD || t === T.HIGHWAY) && (r + c) % 2 === 0) {
            const lx = c * TS + TS / 2, ly = r * TS + TS / 2;
            const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 95);
            g.addColorStop(0, `rgba(254, 240, 138, ${lampAlpha})`);
            g.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(lx, ly, 95, 0, Math.PI * 2); ctx.fill();
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
          g.addColorStop(0, flash ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(v.x, v.y, 75, 0, Math.PI * 2); ctx.fill();
        }
        if (darkAlpha > 0.15 && !v.spec.isAircraft) {
          const hx = v.x + Math.cos(v.angle) * 65, hy = v.y + Math.sin(v.angle) * 65;
          const g = ctx.createRadialGradient(hx, hy, 5, hx, hy, 78);
          g.addColorStop(0, `rgba(254, 249, 195, ${darkAlpha * 0.45})`);
          g.addColorStop(1, 'rgba(254, 249, 195, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(hx, hy, 78, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // Kompaktný HD Radar s kužeľmi policajného hľadania (GTA V štýl!)
  function drawRadar(ctx, vw, player, blips, cones, wanted, time) {
    const size = Math.min(124, Math.max(96, Math.round(vw * 0.27)));
    const mx = vw - size - 10;
    const my = 10;
    const viewSpan = 128;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mx, my, size, size, 12);
    ctx.clip();

    ctx.fillStyle = '#083358';
    ctx.fillRect(mx, my, size, size);

    const pxMap = (player.x / C.WORLD_SIZE) * mapCanvas.width;
    const pyMap = (player.y / C.WORLD_SIZE) * mapCanvas.height;

    ctx.drawImage(
      mapCanvas,
      pxMap - viewSpan / 2, pyMap - viewSpan / 2, viewSpan, viewSpan,
      mx, my, size, size
    );

    const scale = size / viewSpan;
    const cx = mx + size / 2, cy = my + size / 2;
    const pulse = 0.8 + Math.sin(time * 0.008) * 0.25;

    // Kužele dohľadu polície pri schovávaní (blikajú červeno-modro!)
    if (cones && cones.length) {
      const flash = Math.floor(time / 220) % 2 === 0;
      const pxPerWorld = (mapCanvas.width / C.WORLD_SIZE) * scale;
      for (let i = 0; i < cones.length; i++) {
        const cn = cones[i];
        const rx = cx + (cn.x - player.x) * pxPerWorld;
        const ry = cy + (cn.y - player.y) * pxPerWorld;
        const rr = cn.range * pxPerWorld;
        ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.28)' : 'rgba(59, 130, 246, 0.28)';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.arc(rx, ry, rr, cn.angle - 1.0, cn.angle + 1.0);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Ikony na radare
    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      const bxMap = (b.x / C.WORLD_SIZE) * mapCanvas.width;
      const byMap = (b.y / C.WORLD_SIZE) * mapCanvas.height;
      let rx = cx + (bxMap - pxMap) * scale;
      let ry = cy + (byMap - pyMap) * scale;

      const out = (rx < mx + 4 || rx > mx + size - 4 || ry < my + 4 || ry > my + size - 4);
      if (out && !b.pulse) continue;
      rx = Math.max(mx + 5, Math.min(mx + size - 5, rx));
      ry = Math.max(my + 5, Math.min(my + size - 5, ry));

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(rx, ry, (b.size || 3.6) * (b.pulse ? pulse : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.1; ctx.stroke();
    }

    // Šípka hráča
    ctx.translate(cx, cy);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-2.5, 0); ctx.lineTo(-5, 4.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    // Rámček radaru (pri naháňačke bliká červeno-modro!)
    let borderCol = 'rgba(255,255,255,0.3)';
    if (wanted && wanted.level > 0) {
      borderCol = (Math.floor(time / 180) % 2 === 0) ? '#ef4444' : '#3b82f6';
    }
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.roundRect(mx, my, size, size, 12); ctx.stroke();

    return { x: mx, y: my, size };
  }

  function drawFullMap(ctx, vw, vh, player, blips) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
    ctx.fillRect(0, 0, vw, vh);

    const mapSize = Math.min(vw - 36, vh - 130);
    const ox = (vw - mapSize) / 2, oy = (vh - mapSize) / 2 + 8;

    ctx.fillStyle = '#fff';
    ctx.font = '800 16px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('GRAND CITY – MAPA SVETA (12,9 × 12,9 KM)', vw / 2, oy - 14);

    ctx.drawImage(mapCanvas, ox, oy, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, mapSize, mapSize);

    const labels = [
      { text: 'WEST HILLS',  cx: 0.18, cy: 0.25 },
      { text: 'NORTHSIDE',   cx: 0.60, cy: 0.13 },
      { text: 'DOWNTOWN',    cx: 0.60, cy: 0.44 },
      { text: 'PALM BAY',    cx: 0.87, cy: 0.36 },
      { text: 'LETISKO',     cx: 0.18, cy: 0.68 },
      { text: 'SOUTH DOCKS', cx: 0.60, cy: 0.80 }
    ];
    ctx.font = `800 ${Math.max(10, Math.round(mapSize * 0.025))}px system-ui`;
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillText(l.text, ox + l.cx * mapSize + 1, oy + l.cy * mapSize + 1);
      ctx.fillStyle = 'rgba(248,250,252,0.88)';
      ctx.fillText(l.text, ox + l.cx * mapSize, oy + l.cy * mapSize);
    }

    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      const bx = ox + (b.x / C.WORLD_SIZE) * mapSize;
      const by = oy + (b.y / C.WORLD_SIZE) * mapSize;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(bx, by, b.pulse ? 6 : 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.4; ctx.stroke();
    }

    const px = ox + (player.x / C.WORLD_SIZE) * mapSize;
    const py = oy + (player.y / C.WORLD_SIZE) * mapSize;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#94a3b8'; ctx.font = '600 11px system-ui';
    ctx.fillText('Klikni kamkoľvek alebo stlač M pre návrat do hry', vw / 2, oy + mapSize + 24);
    ctx.restore();
  }

  return { drawGround, drawBuildingShadows, drawBuildings25D, drawDayNight, drawRadar, drawFullMap };
})();
