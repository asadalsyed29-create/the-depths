'use strict';
// ---------- basic helpers ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
function rng(seed) { let a = seed >>> 0; return function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PERM = (() => { const r = rng(7); const p = []; for (let i = 0; i < 256; i++) p[i] = i; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; } const P = new Uint8Array(512); for (let i = 0; i < 512; i++) P[i] = p[i & 255]; return P; })();
function h2(x, y) { return PERM[PERM[x & 255] + (y & 255)] / 255; }
function h3(x, y, z) { return PERM[PERM[PERM[x & 255] + (y & 255)] + (z & 255)] / 255; }
function vn(x, y, p) {
  let xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; let x1 = xi + 1, y1 = yi + 1;
  if (p) { xi = ((xi % p) + p) % p; yi = ((yi % p) + p) % p; x1 = ((x1 % p) + p) % p; y1 = ((y1 % p) + p) % p; }
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(x1, yi), c = h2(xi, y1), d = h2(x1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct, p) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vn(x * f, y * f, p ? p * f : 0); n += a; a *= .5; f *= 2; } return s / n; }
function vn3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smooth(xf), v = smooth(yf), w = smooth(zf);
  const c = (i, j, k) => h3(xi + i, yi + j, zi + k);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u), x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}
function fbm3(x, y, z, oct) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vn3(x * f, y * f, z * f); n += a; a *= .5; f *= 2.03; } return s / n; }

// ---------- canvas texture helpers ----------
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rgb(r, g, b, a) { r = clamp(r | 0, 0, 255); g = clamp(g | 0, 0, 255); b = clamp(b | 0, 0, 255); return a === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`; }
function mkTex(canvas, srgb = true, rep) {
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.repeat.set(rep[0], rep[1]); return t;
}
// normal map from a grayscale height canvas
function normalFromHeight(hc, strength) {
  const w = hc.width, h = hc.height; const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cv(w, h); const ox = out.getContext('2d'); const id = ox.createImageData(w, h); const d = id.data;
  const H = (x, y) => src[((((y + h) % h) * w) + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    let nx = -dx, ny = dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4; d[i] = (nx * .5 + .5) * 255; d[i + 1] = (ny * .5 + .5) * 255; d[i + 2] = (nz * .5 + .5) * 255; d[i + 3] = 255;
  }
  ox.putImageData(id, 0, 0); return out;
}
// grime / wear pass over a colour canvas, reading the height canvas so seams get dirtier
function grime(c, hc, amt, scale, seed, rust) {
  const w = c.width, h = c.height, x = c.getContext('2d'); const id = x.getImageData(0, 0, w, h); const d = id.data;
  const hd = hc ? hc.getContext('2d').getImageData(0, 0, w, h).data : null; const per = scale; const o = seed * 13.7;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4; const u = i / w * per, v = j / h * per * (h / w);
    const n = fbm(u + o, v + o, 5, per); const m = fbm(u * 3.1 + 40 + o, v * 3.1 + o, 3, per * 3);
    let dark = (n - .45) * amt; if (hd) { const hv = hd[k] / 255; if (hv < .35) dark += (.35 - hv) * .9; }
    const fine = (h2(i * 7 + seed, j * 13) - .5) * .06;
    let f = 1 - dark + fine; f = clamp(f, .35, 1.25);
    let r = d[k] * f, g = d[k + 1] * f, b = d[k + 2] * f;
    if (rust && m > .62) { const t = (m - .62) * rust; r = lerp(r, 92, t); g = lerp(g, 56, t); b = lerp(b, 38, t); }
    d[k] = r; d[k + 1] = g; d[k + 2] = b;
  }
  x.putImageData(id, 0, 0);
}
function scratches(x, w, h, n, seed, col) {
  const r = rng(seed); x.save(); x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, l = 6 + r() * 40, px = r() * w, py = r() * h; x.strokeStyle = col || `rgba(200,210,215,${.04 + r() * .09})`; x.lineWidth = .6 + r() * .8;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * .5 + r() * 4, py + Math.sin(a) * l * .5 + r() * 4, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  x.restore();
}
function rivet(x, hx, px, py, r, base) {
  const g = x.createRadialGradient(px - r * .3, py - r * .3, 0, px, py, r); g.addColorStop(0, rgb(base * 1.5, base * 1.55, base * 1.6)); g.addColorStop(1, rgb(base * .7, base * .72, base * .76));
  x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
  if (hx) { const hg = hx.createRadialGradient(px, py, 0, px, py, r); hg.addColorStop(0, '#fff'); hg.addColorStop(1, '#888'); hx.fillStyle = hg; hx.beginPath(); hx.arc(px, py, r, 0, TAU); hx.fill(); }
}
function bevelRect(x, hx, px, py, w, h, col, hv, bev) {
  x.fillStyle = col; x.fillRect(px, py, w, h);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(px, py, w, bev); x.fillRect(px, py, bev, h);
  x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(px, py + h - bev, w, bev); x.fillRect(px + w - bev, py, bev, h);
  if (hx) { hx.fillStyle = rgb(hv * 255, hv * 255, hv * 255); hx.fillRect(px, py, w, h); }
}
function stencil(x, txt, px, py, size, col, rot) {
  x.save(); x.translate(px, py); if (rot) x.rotate(rot); x.font = `bold ${size}px "Arial Narrow", Arial, sans-serif`; x.fillStyle = col; x.textBaseline = 'middle'; x.fillText(txt, 0, 0); x.restore();
}
function hazard(x, px, py, w, h, s) {
  x.save(); x.beginPath(); x.rect(px, py, w, h); x.clip(); x.fillStyle = '#c99a24'; x.fillRect(px, py, w, h); x.fillStyle = '#1b1b1b';
  for (let i = -h; i < w + h; i += s * 2) { x.beginPath(); x.moveTo(px + i, py + h); x.lineTo(px + i + s, py + h); x.lineTo(px + i + s + h, py); x.lineTo(px + i + h, py); x.closePath(); x.fill(); }
  x.restore();
}
