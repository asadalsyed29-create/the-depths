// ---------- mothership interior ----------
const ROOMS = [
  { id: 'corr', name: 'Main Corridor', x: [-2, 2], z: [-24, 26], h: 3.0, floor: 'grate' },
  { id: 'bridge', name: 'Bridge', x: [-8, 8], z: [-36, -24], h: 4.4 },
  { id: 'quarters', name: 'Crew Quarters', x: [-12, -2], z: [-22, -12], h: 3.0 },
  { id: 'medbay', name: 'Medbay', x: [2, 12], z: [-22, -12], h: 3.2 },
  { id: 'mess', name: 'Mess Hall', x: [-12, -2], z: [-10, 2], h: 3.2 },
  { id: 'lab', name: 'Xeno Lab', x: [2, 12], z: [-10, 2], h: 3.4 },
  { id: 'cargo', name: 'Cargo Hold', x: [-14, -2], z: [4, 16], h: 4.6 },
  { id: 'suit', name: 'Suit Room', x: [2, 8], z: [4, 14], h: 3.0 },
  { id: 'airlock', name: 'Airlock', x: [8, 14], z: [7, 11], h: 3.0, floor: 'grate' },
  { id: 'hydro', name: 'Hydroponics', x: [-12, -2], z: [18, 24], h: 3.2 },
  { id: 'work', name: 'Workshop', x: [2, 12], z: [16, 24], h: 3.6 },
  { id: 'eng', name: 'Engineering', x: [-9, 9], z: [26, 38], h: 6.0 },
];
const DOORS = [
  { axis: 'z', at: -24, c: 0, w: 2.2, sign: 'BRIDGE' },
  { axis: 'x', at: -2, c: -17, w: 1.6, sign: 'QUARTERS' }, { axis: 'x', at: 2, c: -17, w: 1.6, sign: 'MEDBAY' },
  { axis: 'x', at: -2, c: -4, w: 1.6, sign: 'MESS' }, { axis: 'x', at: 2, c: -4, w: 1.6, sign: 'XENO LAB' },
  { axis: 'x', at: -2, c: 10, w: 2.4, sign: 'CARGO' }, { axis: 'x', at: 2, c: 9, w: 1.6, sign: 'SUIT ROOM' },
  { axis: 'x', at: 8, c: 9, w: 1.6, sign: 'AIRLOCK', id: 'inner', auto: false },
  { axis: 'x', at: 14, c: 9, w: 1.6, id: 'outer', auto: false },
  { axis: 'x', at: -2, c: 21, w: 1.6, sign: 'HYDROPONICS' }, { axis: 'x', at: 2, c: 20, w: 1.6, sign: 'WORKSHOP' },
  { axis: 'z', at: 26, c: 0, w: 2.4, sign: 'ENGINEERING' },
];
const WINDOWS = [
  { axis: 'z', at: -36, a0: -7, a1: 7, sill: .9, top: 3.8 },
  { axis: 'x', at: -12, a0: -8.5, a1: -.5, sill: 1.0, top: 2.6 },
  { axis: 'x', at: -12, a0: 19, a1: 23, sill: 1.0, top: 2.7 },
];
const INT = { segs: [], boxes: [], doors: [], inter: [], npcs: [], anchors: [], pool: [], anim: [] };
const CS = .5, GX0 = -16, GZ0 = -40, GNX = 64, GNZ = 164;
function roomAt(x, z) { for (const r of ROOMS) if (x >= r.x[0] && x < r.x[1] && z >= r.z[0] && z < r.z[1]) return r; return null; }

function buildInterior() {
  const S = new THREE.Scene(); INT.scene = S;
  const M = INT.mat = {
    floor: new THREE.MeshPhongMaterial({ map: TX.floor, normalMap: TX.floorN, shininess: 38, specular: 0x2a2a2a }),
    grate: new THREE.MeshPhongMaterial({ map: TX.grate, normalMap: TX.grateN, shininess: 30, specular: 0x333333 }),
    wall: new THREE.MeshPhongMaterial({ map: TX.wall, normalMap: TX.wallN, shininess: 18, specular: 0x1c1c1c }),
    ceil: new THREE.MeshPhongMaterial({ map: TX.ceil, normalMap: TX.ceilN, emissiveMap: TX.ceilE, emissive: 0xffffff, emissiveIntensity: .9, shininess: 10 }),
    trim: new THREE.MeshPhongMaterial({ map: TX.trim, normalMap: TX.trimN, shininess: 30, specular: 0x333333 }),
    hazard: new THREE.MeshLambertMaterial({ map: TX.hazard }),
    dark: new THREE.MeshPhongMaterial({ color: 0x1c1f22, shininess: 40, specular: 0x222222 }),
    white: new THREE.MeshPhongMaterial({ color: 0xc9cdcf, shininess: 25, specular: 0x222222 }),
    cloth: new THREE.MeshLambertMaterial({ color: 0x48586a }),
    glass: new THREE.MeshPhongMaterial({ color: 0x88aabb, transparent: true, opacity: .08, shininess: 90, specular: 0x88aaaa, depthWrite: false }),
  };
  S.add(new THREE.HemisphereLight(0x9fb4c4, 0x3a3430, 1.0));
  S.add(new THREE.AmbientLight(0x505860, .8));
  for (let i = 0; i < 5; i++) { const L = new THREE.PointLight(0xffffff, 0, 14, 1.6); S.add(L); INT.pool.push(L); }

  // grid
  const grid = new Int8Array(GNX * GNZ);
  ROOMS.forEach((r, i) => { for (let ix = Math.round((r.x[0] - GX0) / CS); ix < Math.round((r.x[1] - GX0) / CS); ix++) for (let iz = Math.round((r.z[0] - GZ0) / CS); iz < Math.round((r.z[1] - GZ0) / CS); iz++) grid[iz * GNX + ix] = i + 1; });
  const id = (ix, iz) => (ix < 0 || iz < 0 || ix >= GNX || iz >= GNZ) ? 0 : grid[iz * GNX + ix];
  const W = { p: [], n: [], u: [] };
  const quad = (A, B, Cc, D, nrm, ua, ub, va, vb) => {
    // A,B along the wall at bottom, D,C at top
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    let v = [A, B, Cc, A, Cc, D], uv = [[ua, va], [ub, va], [ub, vb], [ua, va], [ub, vb], [ua, vb]];
    if (cr[0] * nrm[0] + cr[1] * nrm[1] + cr[2] * nrm[2] < 0) { v = [A, Cc, B, A, D, Cc]; uv = [[ua, va], [ub, vb], [ub, va], [ua, va], [ua, vb], [ub, vb]]; }
    for (let i = 0; i < 6; i++) { W.p.push(...v[i]); W.n.push(...nrm); W.u.push(...uv[i]); }
  };
  const inSpan = (list, axis, at, m) => list.find(d => d.axis === axis && Math.abs(d.at - at) < .01 && (d.c !== undefined ? Math.abs(m - d.c) < d.w / 2 : m > d.a0 && m < d.a1));
  const face = (axis, at, m0, m1, side, ranges) => {
    for (const [y0, y1] of ranges) {
      if (y1 - y0 < .01) continue;
      if (axis === 'x') { const n = [side, 0, 0]; const s = side < 0 ? 1 : -1; quad([at, y0, m0], [at, y0, m1], [at, y1, m1], [at, y1, m0], n, s * m0 / 2, s * m1 / 2, y0 / 3.2, y1 / 3.2); }
      else { const n = [0, 0, side]; const s = side < 0 ? -1 : 1; quad([m0, y0, at], [m1, y0, at], [m1, y1, at], [m0, y1, at], n, s * m0 / 2, s * m1 / 2, y0 / 3.2, y1 / 3.2); }
    }
  };
  const edge = (axis, at, m0, m1, a, b) => {
    const mm = (m0 + m1) / 2; const door = inSpan(DOORS, axis, at, mm), win = inSpan(WINDOWS, axis, at, mm);
    for (const [s, side] of [[a, -1], [b, 1]]) {
      if (!s) continue; const h = ROOMS[s - 1].h;
      const ranges = door ? [[2.6, h]] : win ? [[0, win.sill], [win.top, h]] : [[0, h]];
      face(axis, at, m0, m1, side, ranges);
    }
    if (!door) INT.segs.push({ axis, at, a0: m0, a1: m1 });
  };
  for (let ix = 0; ix <= GNX; ix++) for (let iz = 0; iz < GNZ; iz++) { const a = id(ix - 1, iz), b = id(ix, iz); if (a !== b) edge('x', GX0 + ix * CS, GZ0 + iz * CS, GZ0 + (iz + 1) * CS, a, b); }
  for (let iz = 0; iz <= GNZ; iz++) for (let ix = 0; ix < GNX; ix++) { const a = id(ix, iz - 1), b = id(ix, iz); if (a !== b) edge('z', GZ0 + iz * CS, GX0 + ix * CS, GX0 + (ix + 1) * CS, a, b); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(W.p, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(W.n, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(W.u, 2));
  S.add(new THREE.Mesh(wg, M.wall));
  // floors & ceilings
  for (const r of ROOMS) {
    const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0], cx = (r.x[0] + r.x[1]) / 2, cz = (r.z[0] + r.z[1]) / 2;
    const fg = new THREE.PlaneGeometry(w, d); fg.rotateX(-Math.PI / 2); setUV(fg, r.floor === 'grate' && r.id === 'corr' ? (x, z) => [(x + 2) / 4, z / 4] : (x, z) => [x / 2, z / 2], cx, cz);
    const f = new THREE.Mesh(fg, r.floor === 'grate' ? M.grate : M.floor); f.position.set(cx, 0, cz); S.add(f);
    const cg = new THREE.PlaneGeometry(w, d); cg.rotateX(Math.PI / 2); setUV(cg, r.id === 'corr' ? (x, z) => [(x + 2) / 4 + .0, z / 3] : (x, z) => [x / 3, z / 3], cx, cz);
    const c = new THREE.Mesh(cg, M.ceil); c.position.set(cx, r.h, cz); S.add(c);
  }
  // window glass + struts
  for (const w of WINDOWS) {
    const len = w.a1 - w.a0, mid = (w.a0 + w.a1) / 2, hh = w.top - w.sill;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(len, hh), M.glass); g.position.set(w.axis === 'x' ? w.at : mid, w.sill + hh / 2, w.axis === 'x' ? mid : w.at); if (w.axis === 'x') g.rotation.y = Math.PI / 2; S.add(g);
    const n = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i <= n; i++) { const m = w.a0 + len * i / n; box(.16, hh, .22, M.trim, w.axis === 'x' ? w.at : m, w.sill + hh / 2, w.axis === 'x' ? m : w.at, w.axis === 'x' ? Math.PI / 2 : 0); }
    box(len + .3, .2, .4, M.trim, w.axis === 'x' ? w.at : mid, w.sill - .1, w.axis === 'x' ? mid : w.at, w.axis === 'x' ? Math.PI / 2 : 0);
    box(len + .3, .2, .3, M.trim, w.axis === 'x' ? w.at : mid, w.top + .1, w.axis === 'x' ? mid : w.at, w.axis === 'x' ? Math.PI / 2 : 0);
  }
  // doors
  const doorTex = (() => { const c = cv(128, 256), x = c.getContext('2d'); bevelRect(x, null, 0, 0, 128, 256, '#5c6268', 0, 4); x.fillStyle = '#23272b'; x.fillRect(10, 60, 108, 8); x.fillRect(10, 180, 108, 8); x.fillStyle = 'rgba(120,200,215,.7)'; x.fillRect(20, 120, 6, 18); hazard(x, 0, 230, 128, 26, 12); grime(c, null, .6, 2, 17, .4); scratches(x, 128, 256, 50, 18); return mkTex(c); })();
  const dm = new THREE.MeshPhongMaterial({ map: doorTex, shininess: 30, specular: 0x222222 });
  for (const d of DOORS) {
    const pw = d.w / 2 + .14; const X = (a, m) => d.axis === 'x' ? [a, m] : [m, a];
    for (const s of [-1, 1]) { const m = d.c + s * (d.w / 2 + pw / 2); const [px, pz] = X(d.at, m); const b = box(d.axis === 'x' ? .4 : pw, 2.6, d.axis === 'x' ? pw : .4, M.trim, px, 1.3, pz); collideBox(b); }
    const [lx, lz] = X(d.at, d.c); box(d.axis === 'x' ? .4 : d.w + pw * 2, .2, d.axis === 'x' ? d.w + pw * 2 : .4, M.trim, lx, 2.7, lz);
    // hazard sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(d.axis === 'x' ? .42 : d.w, .03, d.axis === 'x' ? d.w : .42), M.hazard); sill.position.set(lx, .015, lz); S.add(sill);
    const panels = []; for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(d.axis === 'x' ? .08 : d.w / 2, 2.6, d.axis === 'x' ? d.w / 2 : .08), dm); S.add(p); panels.push(p); }
    // status light above
    const lm = new THREE.MeshBasicMaterial({ color: 0x38c070 }); const lt = new THREE.Mesh(new THREE.BoxGeometry(d.axis === 'x' ? .42 : .3, .05, d.axis === 'x' ? .3 : .42), lm); lt.position.set(lx, 2.62, lz); S.add(lt);
    const D = { ...d, panels, open: 0, locked: false, auto: d.auto !== false, lightM: lm, wasOpen: false, cx: lx, cz: lz };
    INT.doors.push(D); if (d.id) INT[d.id + 'Door'] = D;
    if (d.sign) { const t = signTex(d.sign); const sm = new THREE.MeshBasicMaterial({ map: t, color: 0xcccccc }); for (const s of [-1, 1]) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(.9, .225), sm); const m = d.c + (d.w / 2 + pw / 2); if (d.axis === 'x') { sg.position.set(d.at + s * .205, 2.1, m); sg.rotation.y = s * Math.PI / 2; } else { sg.position.set(m, 2.1, d.at + s * .205); sg.rotation.y = s > 0 ? 0 : Math.PI; } S.add(sg); } }
    updateDoorMesh(D);
  }
  furnish();
}
function setUV(g, fn, cx, cz) { const p = g.attributes.position, u = g.attributes.uv; for (let i = 0; i < p.count; i++) { const [a, b] = fn(p.getX(i) + cx, p.getZ(i) + cz); u.setXY(i, a, b); } u.needsUpdate = true; }
function signTex(txt) { const c = cv(256, 64), x = c.getContext('2d'); x.fillStyle = '#15191c'; x.fillRect(0, 0, 256, 64); x.strokeStyle = '#3c454c'; x.lineWidth = 3; x.strokeRect(2, 2, 252, 60); x.font = 'bold 26px "Arial Narrow", Arial, sans-serif'; x.fillStyle = '#d8dcd6'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 33); grime(c, null, .4, 2, txt.length, 0); return mkTex(c); }
function updateDoorMesh(D) {
  const o = smooth(D.open);
  D.panels.forEach((p, i) => { const s = i ? 1 : -1; const m = D.c + s * (D.w / 4 + o * D.w / 2 * .98); if (D.axis === 'x') p.position.set(D.at, 1.3, m); else p.position.set(m, 1.3, D.at); });
}
function box(w, h, d, mat, x, y, z, ry, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; (parent || INT.scene).add(m); return m; }
function cyl(rt, rb, h, mat, x, y, z, seg, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat); m.position.set(x, y, z); (parent || INT.scene).add(m); return m; }
function collideBox(m, pad = 0) { m.updateMatrixWorld(); const bb = new THREE.Box3().setFromObject(m); INT.boxes.push({ x1: bb.min.x - pad, x2: bb.max.x + pad, z1: bb.min.z - pad, z2: bb.max.z + pad, y2: bb.max.y }); }
function solid(w, h, d, mat, x, y, z, ry) { const m = box(w, h, d, mat, x, y, z, ry); collideBox(m); return m; }
function anchor(x, y, z, color, I, dist) { INT.anchors.push({ p: new THREE.Vector3(x, y, z), color: new THREE.Color(color), I, dist: dist || 14 }); }
function screen(x, y, z, ry, w, h, kind, seed, tilt) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screenTex(kind, seed), color: 0xbbbbbb })); m.position.set(x, y, z); m.rotation.order = 'YXZ'; m.rotation.y = ry || 0; m.rotation.x = tilt || 0; INT.scene.add(m); return m; }
function interact(x, z, r, label, act, y) { const it = { x, z, y: y || 1.2, r, label, act }; INT.inter.push(it); return it; }

function furnish() {
  const M = INT.mat; const S = INT.scene;
  const steel = new THREE.MeshPhongMaterial({ color: 0x6c7378, shininess: 50, specular: 0x444444 });
  const padM = new THREE.MeshLambertMaterial({ color: 0x2a3138 });
  const glowCyan = new THREE.MeshBasicMaterial({ color: 0x6fd8e0 });
  // ---- lights (anchors for the light pool) ----
  anchor(0, 3.6, -30, 0x9fc4d8, 26); anchor(-5, 3.5, -27, 0x7fa8c0, 12); anchor(5, 3.5, -27, 0x7fa8c0, 12);
  for (let z = -20; z <= 24; z += 8) anchor(0, 2.7, z, 0xd8e2e6, 10, 11);
  anchor(-7, 2.7, -17, 0xf0d2a8, 14); anchor(7, 2.9, -17, 0xe8f4f6, 18); anchor(-7, 2.9, -4, 0xffcf96, 18); anchor(7, 3.1, -4, 0x8ff0b8, 15);
  anchor(-8, 4.2, 10, 0xd8d0b8, 22); anchor(5, 2.7, 9, 0xd8e2e6, 12); anchor(11, 2.7, 9, 0xff6a50, 10); anchor(-7, 2.9, 21, 0xd890f0, 15); anchor(7, 3.3, 20, 0xf0d6a8, 16); anchor(0, 4.8, 32, 0x78c8ff, 34, 18);
  // ---- bridge ----
  const helmDesk = solid(4.2, 1.0, 1.1, M.trim, 0, .5, -33.4); box(4.3, .08, 1.3, M.dark, 0, 1.02, -33.4);
  screen(-1.2, 1.25, -33.85, 0, 1.1, .6, 'cyan', 2, -.5); screen(0, 1.25, -33.85, 0, 1.1, .6, 'map', 3, -.5); screen(1.2, 1.25, -33.85, 0, 1.1, .6, 'amber', 4, -.5);
  // pilot seat
  const seat = new THREE.Group(); seat.position.set(0, 0, -32.2); S.add(seat); box(.6, .1, .6, padM, 0, .55, 0, 0, seat); box(.6, .8, .12, padM, 0, .95, .3, 0, seat); cyl(.05, .05, .5, steel, 0, .27, 0, 8, seat); collideBox(seat.children[0], .1);
  INT.helmSeat = new THREE.Vector3(0, 1.3, -32.3);
  interact(0, -32.6, 1.8, () => 'Take the helm', () => G.toHelm(), 1.0);
  // side consoles
  for (const s of [-1, 1]) { solid(1.0, 1.0, 3.6, M.trim, s * 7, .5, -30); screen(s * 6.48, 1.3, -30.6, -s * Math.PI / 2, 1.0, .6, s < 0 ? 'cyan' : 'green', 6 + s, -.35); screen(s * 6.48, 1.3, -29.4, -s * Math.PI / 2, 1.0, .6, 'amber', 9 + s, -.35); }
  // nav table with holo
  solid(1.6, .9, 1.2, M.trim, -3.5, .45, -27.5); const holo = screen(-3.5, .95, -27.5, 0, 1.4, 1.0, 'map', 12, -Math.PI / 2); holo.material.transparent = true; holo.material.opacity = .9;
  // captain's chair
  { const g = new THREE.Group(); g.position.set(2.5, 0, -27.5); S.add(g); box(.75, .14, .7, padM, 0, .5, 0, 0, g); box(.75, 1.1, .14, padM, 0, 1.05, .32, 0, g); box(.12, .25, .7, M.trim, -.42, .68, 0, 0, g); box(.12, .25, .7, M.trim, .42, .68, 0, 0, g); collideBox(g.children[0], .15); }
  // ceiling beams in bridge
  for (const z of [-34, -30, -26]) box(16, .3, .4, M.trim, 0, 4.25, z);
  // ---- corridor: pipes and wall lamps ----
  for (const s of [-1, 1]) { cyl(.07, .07, 50, steel, s * 1.7, 2.75, 1, 8).rotation.x = Math.PI / 2; cyl(.045, .045, 50, M.dark, s * 1.5, 2.86, 1, 8).rotation.x = Math.PI / 2; }
  for (let z = -22; z <= 24; z += 4) { box(4, .12, .25, M.trim, 0, 2.94, z); }
  // ---- crew quarters ----
  for (const [x, z, ry] of [[-11.1, -20.5, 0], [-11.1, -16.5, 0], [-11.1, -13.6, 0]]) {
    const g = new THREE.Group(); g.position.set(x + .1, 0, z); S.add(g);
    for (const y of [.45, 1.65]) { box(1.9, .12, .95, M.trim, .55, y, 0, 0, g); box(1.8, .14, .85, M.cloth, .55, y + .13, 0, 0, g); box(.4, .1, .7, M.white, -.15, y + .26, 0, 0, g); }
    box(.08, 2.2, .95, M.trim, 1.5, 1.1, 0, 0, g); collideBox(g.children[0], .05); INT.boxes[INT.boxes.length - 1].x2 += .05;
  }
  for (let i = 0; i < 4; i++) solid(.6, 2, .5, steel, -3 - i * .65 - .3, 1, -21.6);
  solid(1.0, .75, 1.0, M.trim, -6, .375, -15);
  // ---- medbay ----
  for (const z of [-20, -16]) { const g = new THREE.Group(); g.position.set(10.4, 0, z); S.add(g); box(1.0, .7, 2.0, M.white, 0, .35, 0, 0, g); box(.95, .12, 1.9, new THREE.MeshLambertMaterial({ color: 0xbcc8cc }), 0, .76, 0, 0, g); box(.6, .1, .4, M.white, 0, .86, -.7, 0, g); collideBox(g.children[0]); screen(11.95, 1.7, z, -Math.PI / 2, .7, .45, 'green', 20 + z); }
  { const arch = new THREE.Group(); arch.position.set(6, 0, -13.6); S.add(arch); box(.3, 2.4, .5, M.white, -1, 1.2, 0, 0, arch); box(.3, 2.4, .5, M.white, 1, 1.2, 0, 0, arch); box(2.3, .35, .5, M.white, 0, 2.35, 0, 0, arch); const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .04, 6, 24), glowCyan); ring.position.set(0, 1.4, 0); arch.add(ring); INT.anim.push(t => { ring.position.y = 1.4 + Math.sin(t * 1.3) * .7; }); }
  { const cab = solid(1.6, 2.0, .5, M.white, 4, 1, -21.6); const c = cv(128, 128), x = c.getContext('2d'); x.fillStyle = '#d6dadb'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#3a8a6a'; x.fillRect(52, 28, 24, 72); x.fillRect(28, 52, 72, 24); grime(c, null, .3, 2, 30, 0); const p = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), new THREE.MeshLambertMaterial({ map: mkTex(c) })); p.position.set(4, 1.4, -21.34); S.add(p); }
  // ---- mess hall ----
  for (const x of [-9.5, -5.5]) { solid(1.0, .78, 6, M.trim, x, .39, -4.5); box(1.1, .05, 6.1, new THREE.MeshPhongMaterial({ color: 0x8c8f8a, shininess: 60 }), x, .8, -4.5); for (const s of [-1, 1]) solid(.35, .45, 5.6, padM, x + s * .85, .225, -4.5); }
  { const counter = solid(6, 1.0, .9, steel, -7, .5, 1.4); box(6.1, .06, 1.0, new THREE.MeshPhongMaterial({ color: 0xb0b4b6, shininess: 80, specular: 0x666666 }), -7, 1.02, 1.4); const stove = box(.9, .02, .6, new THREE.MeshBasicMaterial({ color: 0xff5a1c }), -9, 1.06, 1.4); INT.anim.push(t => { stove.material.color.setHSL(.04, 1, .35 + Math.sin(t * 7) * .04); }); box(1.2, .9, .1, M.dark, -4.5, 1.6, 1.88); screen(-4.5, 1.6, 1.82, Math.PI, 1.0, .7, 'amber', 33); }
  // ---- xeno lab ----
  for (const [x, z] of [[10.6, -8.5], [10.6, -5.5], [10.6, -2.5]]) {
    cyl(.55, .6, .3, M.trim, x, .15, z); cyl(.55, .6, .3, M.trim, x, 2.55, z);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, 2.1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x2a9a6a, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })); fl.position.set(x, 1.35, z); S.add(fl);
    const thing = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshLambertMaterial({ color: 0x18261f, emissive: 0x0a3020 })); thing.scale.set(1, 1.6, .8); thing.position.set(x, 1.35, z); S.add(thing);
    const tent = new THREE.Mesh(new THREE.ConeGeometry(.08, .9, 6), thing.material); tent.position.set(0, -.55, 0); thing.add(tent);
    const ph = x + z; INT.anim.push(t => { thing.position.y = 1.35 + Math.sin(t * .6 + ph) * .12; thing.rotation.y = t * .2 + ph; });
    INT.boxes.push({ x1: x - .6, x2: x + .6, z1: z - .6, z2: z + .6 });
  }
  solid(3.5, .9, 1.1, M.white, 5.5, .45, -9.2); screen(4.5, 1.35, -9.7, 0, .9, .55, 'green', 41, -.3); screen(6.5, 1.35, -9.7, 0, .9, .55, 'cyan', 42, -.3);
  for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .22, 8), new THREE.MeshPhongMaterial({ color: [0x7ad0a0, 0xc0a0f0, 0xe0c060, 0x90c0f0, 0xe08080][i], transparent: true, opacity: .75 })); j.position.set(4 + i * .35, 1.01, -8.9); S.add(j); }
  // ---- cargo hold ----
  const crateM = [0x7a3a2c, 0x2d5a5e, 0x8a6a2a, 0x4a4f55].map(c => new THREE.MeshPhongMaterial({ color: c, map: TX.cont, normalMap: TX.contN, shininess: 20 }));
  const cr = rng(5);
  for (const [x, z] of [[-12.6, 5.5], [-12.6, 7.6], [-10.4, 5.5], [-12.6, 13.8], [-10.4, 14.4], [-6.5, 14.6], [-12.6, 11.5]]) { const n = 1 + (cr() * 2 | 0); for (let i = 0; i < n; i++) { const b = box(2, 1.6, 2, crateM[cr() * 4 | 0], x, .8 + i * 1.6, z, (cr() - .5) * .1); if (!i) collideBox(b); } }
  { const shelf = new THREE.Group(); shelf.position.set(-6, 0, 4.5); S.add(shelf); for (const y of [.1, 1.2, 2.3]) box(4, .08, .9, steel, 0, y, 0, 0, shelf); for (const x of [-1.95, 1.95]) for (const z of [-.4, .4]) box(.08, 3, .08, M.trim, x, 1.5, z, 0, shelf); for (let i = 0; i < 6; i++) box(.5 + cr() * .4, .4 + cr() * .4, .5, crateM[i % 4], -1.5 + i * .6, .45 + ((i % 3) * 1.1), 0, cr(), shelf); collideBox(shelf.children[0], .1); INT.boxes[INT.boxes.length - 1].x1 -= 0; }
  solid(1.2, 1.2, .6, M.trim, -3, .6, 15.4); screen(-3, 1.45, 15.08, Math.PI, .9, .55, 'amber', 51, .25);
  interact(-3, 14.5, 1.6, () => 'Check cargo stores', () => UI.showStores(), 1.2);
  // ---- suit room ----
  const suitM = new THREE.MeshPhongMaterial({ color: 0xc8c2b0, shininess: 20 }), visorM = new THREE.MeshPhongMaterial({ color: 0x0c1418, shininess: 120, specular: 0x88aacc });
  for (let i = 0; i < 4; i++) { const z = 5 + i * 1.1; solid(.8, 2.3, 1.0, M.trim, 7.5, 1.15, z); const sg = new THREE.Group(); sg.position.set(7.0, 0, z); sg.rotation.y = -Math.PI / 2; S.add(sg); box(.42, .6, .28, suitM, 0, 1.3, 0, 0, sg); const h = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), suitM); h.position.set(0, 1.78, 0); sg.add(h); const v = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8, 0, TAU, 0, 1.2), visorM); v.position.set(0, 1.79, .08); v.rotation.x = Math.PI / 2; sg.add(v); for (const s of [-1, 1]) { box(.13, .55, .14, suitM, s * .29, 1.25, 0, 0, sg); box(.15, .75, .16, suitM, s * .11, .62, 0, 0, sg); } }
  solid(.5, .45, 3, padM, 3, .225, 9);
  { const p = box(.4, .5, .08, M.dark, 7.75, 1.45, 10.3, Math.PI / 2); screen(7.7, 1.45, 10.3, -Math.PI / 2, .3, .36, 'amber', 61); interact(7.5, 10.3, 1.4, () => G.ship.speed > 2.5 ? 'Airlock (ship is moving)' : 'Open airlock', () => G.airlockIn(), 1.4); }
  // ---- airlock ----
  { const fl = new THREE.Mesh(new THREE.PlaneGeometry(5.8, .5), M.hazard); fl.rotation.x = -Math.PI / 2; fl.position.set(11, .02, 7.3); S.add(fl); const f2 = fl.clone(); f2.position.z = 10.7; S.add(f2);
    INT.alarmLamp = new THREE.Mesh(new THREE.BoxGeometry(.3, .15, .3), new THREE.MeshBasicMaterial({ color: 0x441010 })); INT.alarmLamp.position.set(11, 2.9, 9); S.add(INT.alarmLamp);
    for (const s of [-1, 1]) for (const x of [9.5, 12.5]) box(.1, 2.4, .3, M.trim, x, 1.2, 9 + s * 1.85);
    screen(13.4, 1.45, 10.6, 0, .35, .4, 'red', 71); interact(13.2, 10.2, 1.5, () => 'Cycle airlock', () => G.airlockPanel(), 1.4);
  }
  // ---- hydroponics ----
  const leafM = [new THREE.MeshLambertMaterial({ color: 0x3f7a3a }), new THREE.MeshLambertMaterial({ color: 0x5a8f3e }), new THREE.MeshLambertMaterial({ color: 0x2f5f40 })];
  for (const x of [-9.5, -5.5]) { solid(1.2, .8, 5, steel, x, .4, 21); box(1.1, .1, 4.9, new THREE.MeshLambertMaterial({ color: 0x3a2a1e }), x, .82, 21); for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.18 + cr() * .12, 0), leafM[i % 3]); p.position.set(x + (cr() - .5) * .7, .98 + cr() * .1, 18.8 + i * .5); p.scale.y = 1.3 + cr(); S.add(p); } for (const dx of [-.35, .35]) box(.08, .04, 4.6, new THREE.MeshBasicMaterial({ color: 0xf0b0f8 }), x + dx, 2.3, 21); }
  // ---- workshop ----
  { const fab = solid(2.6, 2.2, 1.8, M.trim, 9.5, 1.1, 22.6); box(1.6, .7, .1, new THREE.MeshBasicMaterial({ color: 0xffa040 }), 9.5, 1.2, 21.69); hazard; const arm = new THREE.Group(); arm.position.set(6, 0, 23.2); S.add(arm); cyl(.18, .25, .3, M.dark, 0, .15, 0, 12, arm); const a1 = new THREE.Group(); a1.position.y = .3; arm.add(a1); box(.18, 1.2, .18, new THREE.MeshPhongMaterial({ color: 0xd09a30 }), 0, .6, 0, 0, a1); const a2 = new THREE.Group(); a2.position.y = 1.2; a1.add(a2); box(.14, .9, .14, new THREE.MeshPhongMaterial({ color: 0xd09a30 }), 0, .45, 0, 0, a2); INT.anim.push(t => { a1.rotation.z = Math.sin(t * .7) * .4; a2.rotation.z = -.9 + Math.sin(t * 1.1) * .5; arm.rotation.y = Math.sin(t * .3) * 1.2; }); INT.boxes.push({ x1: 5.7, x2: 6.3, z1: 22.9, z2: 23.5 });
    solid(2.4, .9, 1.0, steel, 5, .45, 16.7); screen(5, 1.35, 17.22, Math.PI, 1.0, .55, 'cyan', 81, .3);
    interact(5, 17.6, 1.7, () => 'Use fabricator', () => UI.showFab(), 1.2); }
  // ---- engineering ----
  { const core = new THREE.Group(); core.position.set(0, 0, 33); S.add(core); cyl(2.2, 2.4, .6, M.trim, 0, .3, 0, 24, core); cyl(2.2, 2.4, .6, M.trim, 0, 5.7, 0, 24, core);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.8, 24, 1, true), new THREE.MeshPhongMaterial({ color: 0x6ab8ff, transparent: true, opacity: .22, side: THREE.DoubleSide, shininess: 100, depthWrite: false })); glass.position.y = 3; core.add(glass);
    const coreM = new THREE.MeshBasicMaterial({ color: 0x8fd8ff }); const inner = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 4.6, 16), coreM); inner.position.y = 3; core.add(inner);
    const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.95, .09, 6, 28), M.trim); r.rotation.x = Math.PI / 2; r.position.y = 1.4 + i * 1.6; core.add(r); rings.push(r); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const p = cyl(.12, .12, 5.4, steel, Math.cos(a) * 2.05, 3, Math.sin(a) * 2.05, 8, core); }
    INT.anim.push(t => { coreM.color.setHSL(.56, .9, .62 + Math.sin(t * 2.2) * .08 + Math.sin(t * 9.1) * .02); inner.rotation.y = t; });
    INT.boxes.push({ x1: -2.5, x2: 2.5, z1: 30.5, z2: 35.5 });
    for (const s of [-1, 1]) { solid(1.0, 1.1, 4, M.trim, s * 7.8, .55, 32); screen(s * 7.28, 1.4, 32, -s * Math.PI / 2, 1.2, .6, s < 0 ? 'amber' : 'red', 90 + s, -.3); for (let k = 0; k < 3; k++) cyl(.18, .18, 12, k % 2 ? steel : M.dark, s * (8.5 - k * .4), 4.8 + k * .4, 32, 10).rotation.x = Math.PI / 2; }
    const cat = box(18, .1, 1.2, steel, 0, 3.4, 37.3); for (let x = -8; x <= 8; x += 2) box(.05, .9, .05, M.trim, x, 3.9, 36.75);
  }
}
