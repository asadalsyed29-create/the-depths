// ---------- procedural textures (painted once at load) ----------
const TX = {};
function makeTextures(q) {
  const S = q ? 512 : 256, k = S / 512;
  // floor: worn metal deck plates
  {
    const c = cv(S, S), x = c.getContext('2d'), hc = cv(S, S), hx = hc.getContext('2d'); const r = rng(11);
    hx.fillStyle = '#111'; hx.fillRect(0, 0, S, S);
    const P = S / 2;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const t = .88 + r() * .16, px = i * P, py = j * P;
      bevelRect(x, hx, px + 2 * k, py + 2 * k, P - 4 * k, P - 4 * k, rgb(70 * t, 74 * t, 80 * t), .7, 3 * k);
      if ((i + j) % 2 == 0) { // tread pattern
        x.save(); x.globalAlpha = .55;
        for (let yy = 12 * k; yy < P - 8 * k; yy += 14 * k) for (let xx = 12 * k + ((yy / (14 * k)) % 2) * 7 * k; xx < P - 8 * k; xx += 14 * k) {
          x.save(); x.translate(px + xx, py + yy); x.rotate(((xx + yy) / (7 * k)) % 2 ? .6 : -.6); x.fillStyle = 'rgba(150,158,166,.35)'; x.fillRect(-5 * k, -1.4 * k, 10 * k, 2.8 * k); x.restore();
          hx.save(); hx.translate(px + xx, py + yy); hx.rotate(((xx + yy) / (7 * k)) % 2 ? .6 : -.6); hx.fillStyle = '#ddd'; hx.fillRect(-5 * k, -1.4 * k, 10 * k, 2.8 * k); hx.restore();
        }
        x.restore();
      }
      for (const [a, b] of [[14, 14], [P / k - 14, 14], [14, P / k - 14], [P / k - 14, P / k - 14]]) rivet(x, hx, px + a * k, py + b * k, 4 * k, 70);
    }
    scratches(x, S, S, 260, 3);
    grime(c, hc, .55, 4, 1, 0);
    TX.floor = mkTex(c); TX.floorN = mkTex(normalFromHeight(hc, 2.2), false);
  }
  // corridor grating
  {
    const c = cv(S, S), x = c.getContext('2d'), hc = cv(S, S), hx = hc.getContext('2d');
    x.fillStyle = '#0d0f11'; x.fillRect(0, 0, S, S); hx.fillStyle = '#000'; hx.fillRect(0, 0, S, S);
    const step = 32 * k;
    for (let y = 0; y < S; y += step) for (let xx = 0; xx < S; xx += step) {
      x.fillStyle = '#4c5258'; x.fillRect(xx, y, step, 6 * k); x.fillRect(xx, y, 6 * k, step);
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(xx, y, step, 1.5 * k);
      hx.fillStyle = '#ccc'; hx.fillRect(xx, y, step, 6 * k); hx.fillRect(xx, y, 6 * k, step);
    }
    // side rails
    bevelRect(x, hx, 0, 0, S * .1, S, '#5a6066', .9, 3 * k); bevelRect(x, hx, S * .9, 0, S * .1, S, '#5a6066', .9, 3 * k);
    for (let y = 16 * k; y < S; y += 64 * k) { rivet(x, hx, S * .05, y, 4 * k, 80); rivet(x, hx, S * .95, y, 4 * k, 80); }
    x.fillStyle = 'rgba(210,160,40,.55)'; x.fillRect(S * .1, 0, 5 * k, S); x.fillRect(S * .9 - 5 * k, 0, 5 * k, S);
    scratches(x, S, S, 120, 9);
    grime(c, hc, .5, 4, 2, 0);
    TX.grate = mkTex(c); TX.grateN = mkTex(normalFromHeight(hc, 3), false);
  }
  // wall panels (u: 2 m, v: 3.2 m)
  {
    const W = S, H = Math.round(S * 1.6); const c = cv(W, H), x = c.getContext('2d'), hc = cv(W, H), hx = hc.getContext('2d'); const r = rng(21);
    x.fillStyle = '#1a1d20'; x.fillRect(0, 0, W, H); hx.fillStyle = '#222'; hx.fillRect(0, 0, W, H);
    const kick = H * .08, mid = H * .55, top = H * .92;
    // kick plate
    bevelRect(x, hx, 0, H - kick, W, kick, '#2b2e31', .5, 3 * k);
    // lower panels
    for (let i = 0; i < 2; i++) bevelRect(x, hx, i * W / 2 + 3 * k, mid + 3 * k, W / 2 - 6 * k, H - kick - mid - 6 * k, rgb(96 + r() * 8, 101 + r() * 8, 104 + r() * 8), .75, 3 * k);
    // trim band
    bevelRect(x, hx, 0, mid - 18 * k, W, 18 * k, '#3a3f44', .9, 2 * k);
    x.fillStyle = 'rgba(120,200,215,.85)'; x.fillRect(W * .1, mid - 11 * k, W * .08, 4 * k); x.fillStyle = 'rgba(220,150,60,.8)'; x.fillRect(W * .6, mid - 11 * k, 6 * k, 4 * k);
    // upper panels
    for (let i = 0; i < 2; i++) bevelRect(x, hx, i * W / 2 + 3 * k, top - (top - H * .08) + 3 * k + H * .08 - H * .08, W / 2 - 6 * k, mid - 18 * k - H * .08 - 6 * k, rgb(108 + r() * 8, 113 + r() * 8, 116 + r() * 8), .72, 3 * k);
    // vent in upper left panel
    for (let v = 0; v < 7; v++) { x.fillStyle = '#16181a'; x.fillRect(W * .08, H * .16 + v * 10 * k, W * .3, 5 * k); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(W * .08, H * .16 + v * 10 * k + 5 * k, W * .3, 1.5 * k); hx.fillStyle = '#000'; hx.fillRect(W * .08, H * .16 + v * 10 * k, W * .3, 5 * k); }
    // cornice
    bevelRect(x, hx, 0, 0, W, H * .08, '#2c3034', .55, 3 * k);
    stencil(x, 'D-0' + (1 + (r() * 8 | 0)), W * .58, H * .2, 22 * k, 'rgba(230,230,220,.55)');
    stencil(x, 'PRESS. SEAL', W * .58, H * .26, 11 * k, 'rgba(230,230,220,.35)');
    for (const px of [10, W / k / 2 - 10, W / k / 2 + 10, W / k - 10]) { rivet(x, hx, px * k, mid + 14 * k, 3 * k, 90); rivet(x, hx, px * k, H - kick - 12 * k, 3 * k, 90); rivet(x, hx, px * k, H * .08 + 12 * k, 3 * k, 90); }
    // streaks below vent
    for (let s = 0; s < 14; s++) { const sx = W * .08 + r() * W * .3; const g = x.createLinearGradient(0, H * .3, 0, H * .3 + 80 * k + r() * 120 * k); g.addColorStop(0, 'rgba(20,16,12,.35)'); g.addColorStop(1, 'rgba(20,16,12,0)'); x.fillStyle = g; x.fillRect(sx, H * .3, 1.5 * k + r() * 3 * k, 200 * k); }
    scratches(x, W, H, 160, 4);
    grime(c, hc, .5, 3, 3, .5);
    TX.wall = mkTex(c); TX.wallN = mkTex(normalFromHeight(hc, 2), false);
  }
  // ceiling with light strips (+ emissive)
  {
    const c = cv(S, S), x = c.getContext('2d'), hc = cv(S, S), hx = hc.getContext('2d'); const e = cv(S, S), ex = e.getContext('2d');
    ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) bevelRect(x, hx, i * S / 2 + 2 * k, j * S / 2 + 2 * k, S / 2 - 4 * k, S / 2 - 4 * k, '#2e3237', .6, 3 * k);
    // light strip across the middle
    x.fillStyle = '#c9d3d6'; x.fillRect(S * .44, 8 * k, S * .12, S - 16 * k); ex.fillStyle = '#dfe8ea'; ex.fillRect(S * .44, 8 * k, S * .12, S - 16 * k);
    ex.fillStyle = '#566'; ex.fillRect(S * .44, S / 2 - 3 * k, S * .12, 6 * k); x.fillStyle = '#566'; x.fillRect(S * .44, S / 2 - 3 * k, S * .12, 6 * k);
    grime(c, hc, .4, 4, 5, 0);
    TX.ceil = mkTex(c); TX.ceilE = mkTex(e); TX.ceilN = mkTex(normalFromHeight(hc, 2), false);
  }
  // dark trim metal
  {
    const c = cv(S / 2, S / 2), x = c.getContext('2d'), hc = cv(S / 2, S / 2), hx = hc.getContext('2d');
    bevelRect(x, hx, 0, 0, S / 2, S / 2, '#3d4247', .6, 2 * k);
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, i * S / 8, S / 2, 1.5 * k); }
    scratches(x, S / 2, S / 2, 60, 6); grime(c, hc, .6, 2, 6, .4);
    TX.trim = mkTex(c); TX.trimN = mkTex(normalFromHeight(hc, 2), false);
  }
  // hazard stripes
  { const c = cv(256, 64), x = c.getContext('2d'); hazard(x, 0, 0, 256, 64, 24); grime(c, null, .7, 4, 7, 0); scratches(x, 256, 64, 40, 8, 'rgba(30,30,30,.4)'); TX.hazard = mkTex(c); }
  // exterior hull: random greebled plates + emissive windows
  {
    const N = q ? 1024 : 512, kk = N / 1024; const c = cv(N, N), x = c.getContext('2d'), hc = cv(N, N), hx = hc.getContext('2d'); const e = cv(N, N), ex = e.getContext('2d'); const r = rng(31);
    x.fillStyle = '#2a2d30'; x.fillRect(0, 0, N, N); hx.fillStyle = '#333'; hx.fillRect(0, 0, N, N); ex.fillStyle = '#000'; ex.fillRect(0, 0, N, N);
    const split = (px, py, w, h, d) => {
      if (d > 4 || (d > 1 && r() < .25) || w < 40 * kk || h < 40 * kk) {
        const t = .75 + r() * .35; const base = r() < .1 ? [92, 78, 62] : r() < .12 ? [70, 84, 92] : [96, 99, 102];
        bevelRect(x, hx, px + 2 * kk, py + 2 * kk, w - 4 * kk, h - 4 * kk, rgb(base[0] * t, base[1] * t, base[2] * t), .5 + r() * .4, 3 * kk);
        if (r() < .25 && w > 80 * kk && h > 30 * kk) { for (let i = 0; i < Math.min(8, (w / (22 * kk)) | 0); i++) { const lit = r() < .55; x.fillStyle = lit ? '#e8d9a8' : '#111518'; x.fillRect(px + 10 * kk + i * 20 * kk, py + h / 2 - 5 * kk, 12 * kk, 9 * kk); if (lit) { ex.fillStyle = r() < .3 ? '#9fd4e0' : '#f2dca0'; ex.fillRect(px + 10 * kk + i * 20 * kk, py + h / 2 - 5 * kk, 12 * kk, 9 * kk); } } }
        if (r() < .08 && w > 120 * kk) hazard(x, px + 6 * kk, py + h - 18 * kk, w - 12 * kk, 10 * kk, 10 * kk);
        if (r() < .1 && w > 90 * kk) stencil(x, ['AV-07', 'ASTER VANE', '04', 'NO STEP', 'VENT'][(r() * 5) | 0], px + 10 * kk, py + 18 * kk, 16 * kk, 'rgba(225,225,215,.5)');
        if (r() < .15) for (let i = 0; i < 4; i++) rivet(x, hx, px + (i % 2 ? w - 9 * kk : 9 * kk), py + (i < 2 ? 9 * kk : h - 9 * kk), 2.5 * kk, 70);
        return;
      }
      if ((w > h) ^ (r() < .2)) { const s = w * (.3 + r() * .4); split(px, py, s, h, d + 1); split(px + s, py, w - s, h, d + 1); }
      else { const s = h * (.3 + r() * .4); split(px, py, w, s, d + 1); split(px, py + s, w, h - s, d + 1); }
    };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) split(i * N / 4, j * N / 4, N / 4, N / 4, 0);
    scratches(x, N, N, 300, 12); grime(c, hc, .65, 5, 9, .7);
    TX.hull = mkTex(c); TX.hullN = mkTex(normalFromHeight(hc, 2.5), false); TX.hullE = mkTex(e);
  }
  // cargo container corrugation (tinted by material colour)
  {
    const c = cv(256, 256), x = c.getContext('2d'), hc = cv(256, 256), hx = hc.getContext('2d');
    for (let i = 0; i < 256; i += 16) { const g = x.createLinearGradient(i, 0, i + 16, 0); g.addColorStop(0, '#9a9a9a'); g.addColorStop(.5, '#e6e6e6'); g.addColorStop(1, '#8a8a8a'); x.fillStyle = g; x.fillRect(i, 0, 16, 256); const hg = hx.createLinearGradient(i, 0, i + 16, 0); hg.addColorStop(0, '#222'); hg.addColorStop(.5, '#fff'); hg.addColorStop(1, '#222'); hx.fillStyle = hg; hx.fillRect(i, 0, 16, 256); }
    x.fillStyle = '#777'; x.fillRect(0, 0, 256, 10); x.fillRect(0, 246, 256, 10);
    grime(c, hc, .7, 3, 13, 1.2); scratches(x, 256, 256, 80, 14);
    TX.cont = mkTex(c); TX.contN = mkTex(normalFromHeight(hc, 2.5), false);
  }
}

// console screen textures
function screenTex(kind, seed) {
  const c = cv(256, 160), x = c.getContext('2d'); const r = rng(seed || 5);
  x.fillStyle = '#04100f'; x.fillRect(0, 0, 256, 160);
  const col = kind === 'amber' ? '#e0a040' : kind === 'red' ? '#e05a48' : kind === 'green' ? '#7ad070' : '#5fd0d0';
  x.strokeStyle = col; x.fillStyle = col; x.globalAlpha = .9; x.lineWidth = 1.2;
  if (kind === 'map') {
    x.globalAlpha = .25; for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 160); x.stroke(); } for (let i = 0; i < 160; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    x.globalAlpha = .9; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(20 + r() * 216, 15 + r() * 130, 3 + r() * 5, 0, TAU); x.stroke(); }
    x.beginPath(); x.moveTo(128, 80); x.lineTo(122, 92); x.lineTo(134, 92); x.closePath(); x.fill();
  } else {
    x.font = '10px monospace';
    for (let i = 0; i < 6; i++) x.fillText(['HULL', 'O2', 'PWR', 'NAV', 'TEMP', 'GRAV'][i] + '  ' + (r() * 100).toFixed(1), 8, 16 + i * 13);
    x.beginPath(); for (let i = 0; i < 120; i++) { const y = 110 + Math.sin(i * .15 + r()) * 12 + r() * 8; i ? x.lineTo(130 + i, y - 60) : x.moveTo(130, y - 60); } x.stroke();
    for (let i = 0; i < 12; i++) x.fillRect(10 + i * 19, 150 - r() * 50, 12, 50);
  }
  x.globalAlpha = .12; x.fillStyle = '#000'; for (let i = 0; i < 160; i += 3) x.fillRect(0, i, 256, 1);
  const t = mkTex(c); return t;
}
