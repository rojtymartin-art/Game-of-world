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
        if (t === T.WATER) col = '#0c4a6e';
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
          mctx.fillStyle = 'rgba(255,255,255,0.16)';
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

  function drawGround(ctx, cam, vw, vh, zoom, time) {
    const b = getVisibleBounds(cam, vw, vh, zoom, 1);

    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        const t = W.tiles[r][c];
        const x = c * TS, y = r * TS;

        if (t === T.WATER) {
          ctx.fillStyle = '#0c4a6e';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          const wave = Math.sin(time * 0.002 + r * 0.7 + c * 0.5) * 10;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
          ctx.fillRect(x + 24 + wave, y + 45, 42, 4);
          ctx.fillRect(x + 95 - wave, y + 125, 36, 4);
        } else if (t === T.SAND) {
          ctx.fillStyle = '#d6bc8b';
          ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.GRASS || t === T.FOREST) {
          ctx.fillStyle = t === T.FOREST ? '#174224' : '#245c34';
          ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.SIDEWALK) {
          ctx.fillStyle = '#475061';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4);
        } else if (t === T.CONCRETE) {
          ctx.fillStyle = '#525866';
          ctx.fillRect(x, y, TS + 1, TS + 1);
        } else if (t === T.PIER) {
          ctx.fillStyle = '#784826';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          ctx.strokeStyle = 'rgba(40, 20, 10, 0.45)';
          ctx.lineWidth = 3;
          for (let px = 0; px < TS; px += 18) {
            ctx.beginPath(); ctx.moveTo(x + px, y); ctx.lineTo(x + px, y + TS); ctx.stroke();
          }
          ctx.fillStyle = '#451a03';
          ctx.fillRect(x, y, TS, 7);
          ctx.fillRect(x, y + TS - 7, TS, 7);
        } else if (t === T.RUNWAY) {
          ctx.fillStyle = '#181c24';
          ctx.fillRect(x, y, TS + 1, TS + 1);
          if (r === 48) {
            ctx.fillStyle = 'rgba(255,255,255,0.82)';
            ctx.fillRect(x + 22, y + TS - 5, TS - 44, 10);
          }
          if (c === 5 || c === 20) {
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            for (let sy = 18; sy < TS - 18; sy += 26) {
              ctx.fillRect(x + (c === 5 ? 16 : TS - 76), y + sy, 60, 12);
            }
          }
        } else if (t === T.ROAD || t === T.HIGHWAY || t === T.BRIDGE) {
          ctx.fillStyle = t === T.HIGHWAY ? '#191e28' : '#232936';
          ctx.fillRect(x, y, TS + 1, TS + 1);

          const left = c > 0 && W.isRoadLike(W.tiles[r][c - 1]);
          const right = c < N - 1 && W.isRoadLike(W.tiles[r][c + 1]);
          const up = r > 0 && W.isRoadLike(W.tiles[r - 1][c]);
          const down = r < N - 1 && W.isRoadLike(W.tiles[r + 1][c]);

          const isHoriz = (left || right) && !(up || down);
          const isVert = (up || down) && !(left || right);

          ctx.strokeStyle = t === T.HIGHWAY ? 'rgba(250, 204, 21, 0.72)' : 'rgba(226, 232, 240, 0.42)';
          ctx.lineWidth = t === T.HIGHWAY ? 4 : 3;
          ctx.setLineDash(t === T.HIGHWAY ? [26, 20] : [18, 18]);

          if (isHoriz) {
            ctx.beginPath(); ctx.moveTo(x, y + TS / 2); ctx.lineTo(x + TS, y + TS / 2); ctx.stroke();
          } else if (isVert) {
            ctx.beginPath(); ctx.moveTo(x + TS / 2, y); ctx.lineTo(x + TS / 2, y + TS); ctx.stroke();
          }
          ctx.setLineDash([]);

          if (t === T.BRIDGE) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(x, y, TS, 10);
            ctx.fillRect(x, y + TS - 10, TS, 10);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + TS / 2 - 4, y + 2, 8, 6);
            ctx.fillRect(x + TS / 2 - 4, y + TS - 8, 8, 6);
          }
        }

        const props = W.propsGrid[r][c];
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          if (p.type === 'pool') {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(p.x, p.y, p.w, p.h);
          } else if (p.type === 'umbrella') {
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.beginPath(); ctx.arc(p.x + 4, p.y + 4, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'tree') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.arc(p.x + 5, p.y + 5, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#15803d';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'palm') {
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 5;
            for (let a = 0; a < 6; a++) {
              const ang = a * (Math.PI / 3);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + Math.cos(ang) * p.r, p.y + Math.sin(ang) * p.r);
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  function drawBuildings25D(ctx, cam, vw, vh, zoom) {
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
      const x1 = (b.x - cam.x) * zoom + hw;
      const y1 = (b.y - cam.y) * zoom + hh;
      const x2 = x1 + b.w * zoom;
      const y2 = y1 + b.h * zoom;

      const f = b.height * 0.0024;
      const rx1 = x1 + (x1 - hw) * f;
      const ry1 = y1 + (y1 - hh) * f;
      const rx2 = x2 + (x2 - hw) * f;
      const ry2 = y2 + (y2 - hh) * f;

      if (y1 > hh) drawQuad(ctx, x1, y1, x2, y1, rx2, ry1, rx1, ry1, b.w1);
      if (y2 < hh) drawQuad(ctx, x1, y2, x2, y2, rx2, ry2, rx1, ry2, b.w1);
      if (x1 > hw) drawQuad(ctx, x1, y1, x1, y2, rx1, ry2, rx1, ry1, b.w2);
      if (x2 < hw) drawQuad(ctx, x2, y1, x2, y2, rx2, ry2, rx2, ry1, b.w2);

      const rw = rx2 - rx1, rh = ry2 - ry1;
      ctx.fillStyle = b.roof;
      ctx.fillRect(rx1, ry1, rw, rh);

      ctx.strokeStyle = b.neon || 'rgba(255,255,255,0.1)';
      ctx.lineWidth = b.neon ? 2.2 : 1;
      ctx.strokeRect(rx1 + 3, ry1 + 3, Math.max(0, rw - 6), Math.max(0, rh - 6));

      if (b.helipad && rw > 45) {
        const cx = rx1 + rw / 2, cy = ry1 + rh / 2;
        const rad = Math.min(rw, rh) * 0.28;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.font = `bold ${Math.round(rad * 1.1)}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('H', cx, cy + 1);
      }
    }
  }

  function drawQuad(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function drawDayNight(ctx, vw, vh, darkAlpha) {
    if (darkAlpha <= 0.01) return;
    ctx.fillStyle = `rgba(6, 12, 32, ${darkAlpha})`;
    ctx.fillRect(0, 0, vw, vh);
  }

  // GTA Radar s ikonami misií, garáží a polície
  function drawRadar(ctx, vw, player, blips, time) {
    const size = Math.min(144, vw * 0.30);
    const mx = vw - size - 14;
    const my = 14;
    const viewSpan = 128;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mx, my, size, size, 12);
    ctx.clip();

    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(mx, my, size, size);

    const pxMap = (player.x / C.WORLD_SIZE) * mapCanvas.width;
    const pyMap = (player.y / C.WORLD_SIZE) * mapCanvas.height;

    ctx.drawImage(
      mapCanvas,
      pxMap - viewSpan / 2, pyMap - viewSpan / 2, viewSpan, viewSpan,
      mx, my, size, size
    );

    // Vykreslenie ikon na radare (s orezaním na okraj radaru pre cieľ misie!)
    const scale = size / viewSpan;
    const cx = mx + size / 2;
    const cy = my + size / 2;
    const pulse = 0.8 + Math.sin(time * 0.008) * 0.25;

    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      const bxMap = (b.x / C.WORLD_SIZE) * mapCanvas.width;
      const byMap = (b.y / C.WORLD_SIZE) * mapCanvas.height;
      let rx = cx + (bxMap - pxMap) * scale;
      let ry = cy + (byMap - pyMap) * scale;

      const out = (rx < mx + 4 || rx > mx + size - 4 || ry < my + 4 || ry > my + size - 4);
      if (out && !b.pulse) continue;
      rx = Math.max(mx + 6, Math.min(mx + size - 6, rx));
      ry = Math.max(my + 6, Math.min(my + size - 6, ry));

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(rx, ry, (b.size || 4) * (b.pulse ? pulse : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Šípka hráča v strede
    ctx.translate(cx, cy);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(mx, my, size, size, 12);
    ctx.stroke();

    return { x: mx, y: my, size };
  }

  // Celoobrazovková mapa sveta s legendou a všetkými bodmi
  function drawFullMap(ctx, vw, vh, player, blips) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
    ctx.fillRect(0, 0, vw, vh);

    const mapSize = Math.min(vw - 44, vh - 135);
    const ox = (vw - mapSize) / 2;
    const oy = (vh - mapSize) / 2 + 8;

    ctx.fillStyle = '#fff';
    ctx.font = '800 17px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('GRAND CITY – MAPA SVETA (12,9 × 12,9 KM)', vw / 2, oy - 16);

    ctx.drawImage(mapCanvas, ox, oy, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, mapSize, mapSize);

    // Názvy štvrtí
    const labels = [
      { text: 'WEST HILLS',  cx: 0.18, cy: 0.25 },
      { text: 'NORTHSIDE',   cx: 0.60, cy: 0.13 },
      { text: 'DOWNTOWN',    cx: 0.60, cy: 0.44 },
      { text: 'PALM BAY',    cx: 0.87, cy: 0.36 },
      { text: 'LETISKO',     cx: 0.18, cy: 0.68 },
      { text: 'SOUTH DOCKS', cx: 0.60, cy: 0.80 }
    ];
    ctx.font = `800 ${Math.max(10, Math.round(mapSize * 0.024))}px system-ui`;
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillText(l.text, ox + l.cx * mapSize + 1, oy + l.cy * mapSize + 1);
      ctx.fillStyle = 'rgba(248,250,252,0.85)';
      ctx.fillText(l.text, ox + l.cx * mapSize, oy + l.cy * mapSize);
    }

    // Ikony POI, polície, lietadiel a aktívnej misie
    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      const bx = ox + (b.x / C.WORLD_SIZE) * mapSize;
      const by = oy + (b.y / C.WORLD_SIZE) * mapSize;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(bx, by, b.pulse ? 6.5 : 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Hráč
    const px = ox + (player.x / C.WORLD_SIZE) * mapSize;
    const py = oy + (player.y / C.WORLD_SIZE) * mapSize;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px system-ui';
    ctx.fillText('🔧 Garáž  •  💰 Lúpež  •  🏁 Preteky  •  🚕 Taxi  •  📦 Kuriér  •  🏠 Nehnuteľnosť  •  ✈ Lietadlo', vw / 2, oy + mapSize + 22);
    ctx.fillStyle = '#64748b';
    ctx.fillText('Klikni kamkoľvek alebo stlač M pre návrat do hry', vw / 2, oy + mapSize + 40);
    ctx.restore();
  }

  return { drawGround, drawBuildings25D, drawDayNight, drawRadar, drawFullMap };
})();
