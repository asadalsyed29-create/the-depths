// ---------- the bubbles: the Depths, the Abyss, the Heart ----------
const ARRIVE = new THREE.Vector3(0, 0, 300);
const ZONES = {
  depths: { id: 'depths', name: 'The Depths', seed: 0, sites: 10, first: [0, -60, -760, 'ore'], types: ['wreck', 'ice', 'glass', 'ore', 'wreck', 'glass', 'ice'], decor: 30, hunters: 12, drifters: 46, detect: 380, lighthouse: true,
    pale: { speed: 1, spawn: 5 }, fogEva: 0xc4ccce, fogSpace: 0x3a5056, white: 0xeef2f3, wall: [[.80, .84, .86], [.97, .98, .99]], sky: [[.012, .02, .038], [.06, .2, .27], [.24, .1, .32]], hemi: [0x8ab4c4, 0x2a2630, 2.6], skin: 0xffffff },
  abyss: { id: 'abyss', name: 'The Abyss', seed: 7, sites: 10, first: null, types: ['wreck', 'glass', 'ore', 'wreck', 'ice', 'glass'], decor: 26, hunters: 20, drifters: 18, detect: 520, tint: [.62, .55, .55],
    pale: { speed: 1.4, spawn: 3 }, fogEva: 0x302a2c, fogSpace: 0x140d0f, white: 0x1a1214, wall: [[.16, .09, .09], [.36, .26, .25]], sky: [[.008, .003, .005], [.26, .03, .04], [.09, .01, .1]], hemi: [0x9a7a78, 0x201214, 1.6], skin: 0xb07070 },
  heart: { id: 'heart', name: 'The Heart', seed: 13, sites: 10, first: null, types: ['pillar', 'glass', 'ice', 'pillar', 'ore', 'wreck', 'pillar', 'glass', 'ice', 'ore'], decor: 22, hunters: 10, drifters: 70, detect: 420, tint: [1.05, .98, .85], heart: true,
    pale: { speed: 1.2, spawn: 4 }, fogEva: 0xd6ccae, fogSpace: 0x23302e, white: 0xf4ecd6, wall: [[.86, .78, .58], [.99, .95, .84]], sky: [[.02, .03, .03], [.3, .22, .08], [.05, .26, .24]], hemi: [0xc4b894, 0x2a2a24, 1.7], skin: 0xd0c8a0 },
};
const ZONE_ORDER = ['depths', 'abyss', 'heart'];
SITE_T.pillar = { name: 'Anchor pillar', res: 'ore', tint: [.7, .7, .72] };
function Z_SKIN() { return new THREE.Color(SP.zone.skin); }
// everything that belongs to one bubble is added after this mark, so it can be taken away again
function clearZone() {
  for (const o of SP.zoneObjs || []) { SP.scene.remove(o); o.traverse(c => { if (c.geometry && !ROCK_GEOS.includes(c.geometry)) c.geometry.dispose(); }); }
  SP.zoneObjs = []; SP.sites = []; SP.decor = []; SP.gulpers = []; SP.drifters = []; SP.rockIMs = []; SP.heart = null; SP.lighthouse = null;
  SP.solids = SP.solids.filter(s => s.ring);
}
function buildZone(id) {
  clearZone(); const Z = SP.zone = ZONES[id]; const before = new Set(SP.scene.children);
  FOG_EVA.setHex(Z.fogEva); FOG_SPACE.setHex(Z.fogSpace); WHITE_FOG.setHex(Z.white);
  const du = SP.dome.material.uniforms; du.k0.value.set(...Z.sky[0]); du.k1.value.set(...Z.sky[1]); du.k2.value.set(...Z.sky[2]);
  const bu = SP.bubble.material.uniforms; bu.w0.value.set(...Z.wall[0]); bu.w1.value.set(...Z.wall[1]);
  SP.hemi.color.setHex(Z.hemi[0]); SP.hemi.groundColor.setHex(Z.hemi[1]); SP.hemi.intensity = Z.hemi[2]; SP.sun.intensity = Z.id === 'abyss' ? 1.1 : 2.2;
  buildSites(); buildDecor(); buildCreatures(); if (Z.heart) buildHeart();
  SP.zoneObjs = SP.scene.children.filter(o => !before.has(o));
}
// ---- core fragments: one hidden inside every structure ----
function addFragment(s) {
  const c = (s.fragAt || new THREE.Vector3()).clone(), tp = new THREE.Vector3();
  const free = v => { tp.copy(v).add(s.c); if (pushOutBoxes(s.boxes, tp.clone(), 2.5)) return false; return !s.rocks.some(k => k.p.distanceTo(tp) < k.r + 2.5); };
  if (!free(c)) { const sr = rng(900 + s.i); for (let k = 0; k < 400; k++) { const d = 4 + k * .6; const v = new THREE.Vector3(sr() - .5, (sr() - .5) * .5, sr() - .5).normalize().multiplyScalar(d).add(c); if (free(v)) { c.copy(v); break; } } }
  const g = new THREE.Group(); g.position.copy(c); s.group.add(g);
  const m = new THREE.MeshStandardMaterial({ color: 0xbff8ff, emissive: 0x55d8ff, emissiveIntensity: 1.6, roughness: .15, metalness: .3, flatShading: true });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), m); core.scale.set(.7, 1.5, .7); g.add(core);
  for (let k = 0; k < 5; k++) { const sh = new THREE.Mesh(new THREE.TetrahedronGeometry(.35, 0), m); const a = k / 5 * TAU; sh.position.set(Math.cos(a) * 1.3, Math.sin(a * 2) * .5, Math.sin(a) * 1.3); g.add(sh); }
  const ringM = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(2, .05, 6, 40), ringM), r2 = r1.clone(); r2.rotation.x = Math.PI / 2; g.add(r1); g.add(r2);
  g.add(glow(0x7fe0ff, 14, .9)); g.add(glow(0xffffff, 4, 1));
  s.frag = { g, wp: c.clone().add(s.c), r1, r2 };
}
function fragsHave() { return (G.zd[G.zone].frags || []).length; }
function fragsNeed() { return SP.sites.filter(s => s.frag).length; }
function applyFrags() { const got = new Set(G.zd[G.zone].frags || []); for (const s of SP.sites) if (s.frag) s.frag.g.visible = !got.has(s.i); }
function checkFragments(E, dt) {
  for (const s of SP.sites) { const f = s.frag; if (!f || !f.g.visible) continue; f.g.rotation.y += dt * .8; f.r1.rotation.y += dt * 1.6; f.r2.rotation.z += dt * 1.1;
    if (f.wp.distanceTo(E.pos) < 4.5) { f.g.visible = false; const zd = G.zd[G.zone]; (zd.frags = zd.frags || []).push(s.i); sfx('ping'); sfx('pick');
      const n = fragsHave(), N = fragsNeed(); UI.toast(n >= N ? 'All core fragments found. Take them to the fabricator in the Workshop.' : `Hyperspeed Dash Core fragment (${n}/${N})`, 3500); G.fragCheck(); G.save(); } }
}
// ---- the anchor pillars (final bubble): light them with a beacon ----
BUILD_SITE.pillar = function (s, sr, rock) {
  const stone = new THREE.MeshStandardMaterial({ map: TX.rock, normalMap: TX.rockN, color: 0x6a6660, roughness: .9 });
  const rune = new THREE.MeshStandardMaterial({ color: 0x302a20, emissive: 0xffc860, emissiveIntensity: 0 }); s.rune = rune;
  const g = new THREE.Group(); g.rotation.set((sr() - .5) * .3, sr() * TAU, (sr() - .5) * .3); s.group.add(g);
  const add = (w, h, d, x, y, z, m) => { const b = hbox(w, h, d, m || stone, x, y, z, g, 30); b.updateWorldMatrix(true, false); meshBox(s, b); s.surf.push(b); return b; };
  add(36, 360, 36, 0, 0, 0); add(56, 30, 56, 0, -180, 0); add(56, 30, 56, 0, 180, 0); add(18, 60, 18, 0, 225, 0);
  for (let k = 0; k < 12; k++) { const y = -150 + k * 26; for (const [x, z, ry] of [[18.3, 0, 0], [-18.3, 0, 0], [0, 18.3, 1], [0, -18.3, 1]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(ry ? 14 : .6, 8, ry ? .6 : 14), rune); p.position.set(x, y, z); g.add(p); } }
  const top = glow(0xffd890, 90, 0); top.position.y = 270; g.add(top); s.topGlow = top;
  for (let k = 0; k < 8; k++) { const d = new THREE.Vector3(sr() - .5, 0, sr() - .5).normalize().multiplyScalar(60 + sr() * 50); d.y = (sr() - .5) * 300; rock(s, d, 8 + sr() * 12, sr); }
  s.pillar = true; s.name = 'Anchor pillar ' + String.fromCharCode(65 + s.i);
};
function updPillars() { let n = 0; for (const s of SP.sites) if (s.pillar) { const lit = G.bases.some(b => b.type === 'beacon' && b.pos.distanceTo(s.c) < 260); s.lit = lit; s.rune.emissiveIntensity = lit ? 2.2 : 0; s.topGlow.material.opacity = lit ? .9 : 0; if (lit) n++; } return n; }
// ---- the Heart itself: a vast slow core at the middle of the last bubble ----
function buildHeart() {
  const g = new THREE.Group(); g.position.copy(SP.bubC); SP.scene.add(g);
  const cm = new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffb850, emissiveIntensity: 1.4, roughness: .3, normalMap: TX.rockN });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(110, 5), cm); g.add(core);
  const ringM = new THREE.MeshStandardMaterial({ map: TX.hull, color: 0x8a8070, metalness: .6, roughness: .4, emissive: 0x302010 });
  const rings = []; for (const [R, a] of [[190, 0], [250, 1.1], [320, 2.2]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R, 7, 12, 160), ringM); t.rotation.set(a, a * .7, 0); g.add(t); rings.push(t); for (let k = 0; k < 16; k++) { const l = glow(0xffd890, 22, .9); const an = k / 16 * TAU; l.position.set(Math.cos(an) * R, Math.sin(an) * R, 0); t.add(l); } }
  g.add(glow(0xffd890, 700, .22)); g.add(glow(0xffffff, 260, .45));
  SP.heart = { g, core, rings, cm }; SP.solids.push({ p: SP.bubC.clone(), r: 150, heart: 1 });
}
function updHeart(dt, t) { const H = SP.heart; if (!H) return; H.rings.forEach((r, i) => { r.rotation.z += dt * (.05 + i * .03) * (i % 2 ? -1 : 1); r.rotation.x += dt * .01; }); H.cm.emissiveIntensity = 1.2 + Math.sin(t * .8) * .4; H.core.scale.setScalar(1 + Math.sin(t * .8) * .02); }

// ---------- the dash between bubbles (cutscene) ----------
const CUT = { on: false };
function dashTo(zoneId, done) {
  G.state = 'cut'; G.refreshTouch(); UI.closePanel && UI.closePanel(); $('#hud').classList.add('hidden'); for (const k of ['jet', 'mine', 'growl', 'whisper', 'wind']) loopTo(k, 0);
  const S = G.ship; Object.assign(CUT, { on: true, t: 0, zone: zoneId, done, switched: false, pos0: S.pos.clone(), yaw0: S.yaw, fwd: new THREE.Vector3(-Math.sin(S.yaw), 0, -Math.cos(S.yaw)) });
  sfx('boost', 1); setMood('dread');
}
function updateCut(dt) {
  const C = CUT; C.t += dt; const t = C.t, S = G.ship, fade = $('#fade'), zt = $('#ztitle');
  const back = C.fwd.clone().negate(), side = new THREE.Vector3(-C.fwd.z, 0, C.fwd.x);
  if (t < 5.6) {
    // charge: the whole ship shudders, the engines flare, then she leaps away
    const shake = Math.min(1, t / 3) * (t < 4 ? 1 : .3); let off = 0; if (t > 4) off = .5 * 5200 * Math.pow(t - 4, 2);
    S.pos.copy(C.pos0).addScaledVector(C.fwd, off); SP.ship.position.copy(S.pos).add(new THREE.Vector3((Math.random() - .5) * shake * 4, (Math.random() - .5) * shake * 4, (Math.random() - .5) * shake * 4));
    SP.ship.rotation.set(0, C.yaw0, (Math.random() - .5) * shake * .01, 'YXZ'); SP.ship.scale.set(1, 1, 1 + Math.max(0, t - 4) * 3); SP.ship.updateMatrixWorld();
    for (const pl of SP.plumes) { pl.scale.set(1 + t * .2, .3 + t * 1.2, 1 + t * .2); pl.material.opacity = Math.min(.8, .2 + t * .15); }
    loopTo('engine', .2 + Math.min(.8, t * .2)); if (AU.engO) { AU.engO.frequency.value = 40 + t * 30; AU.engLP.frequency.value = 200 + t * 300; }
    camS.position.copy(C.pos0).addScaledVector(side, 1100).addScaledVector(back, 300).add(new THREE.Vector3(0, 260, 0)); camS.lookAt(C.pos0.clone().addScaledVector(back, 420).addScaledVector(C.fwd, Math.min(off, 1500)));
    camS.position.add(new THREE.Vector3((Math.random() - .5) * shake * 6, (Math.random() - .5) * shake * 6, 0));
    if (t > 4.6) { fade.style.transition = 'none'; fade.style.background = '#fff'; fade.style.opacity = Math.min(1, (t - 4.6) / .8); }
    if (t > 4 && !C.boom) { C.boom = 1; sfx('roar', .6); sfx('hit', 1); }
  } else {
    if (!C.switched) { C.switched = true; G.switchZone(C.zone); S.pos.copy(ARRIVE); S.yaw = 0; S.vel.set(0, 0, 0); SP.ship.scale.set(1, 1, 1); C.fwd.set(0, 0, -1); C.pos0.copy(ARRIVE); C.yaw0 = 0; for (const pl of SP.plumes) { pl.scale.set(1, .3, 1); pl.material.opacity = .12; } zt.textContent = SP.zone.name.toUpperCase(); setMood(SP.zone.id === 'abyss' ? 'dread' : 'helm'); }
    const k = t - 5.6; const back2 = new THREE.Vector3(0, 0, 1), side2 = new THREE.Vector3(1, 0, 0);
    const off = -2600 * Math.exp(-k * 1.6); S.pos.copy(ARRIVE).addScaledVector(new THREE.Vector3(0, 0, -1), off);
    SP.ship.position.copy(S.pos); SP.ship.rotation.set(0, 0, 0); SP.ship.updateMatrixWorld(); loopTo('engine', .15 + Math.exp(-k) * .5);
    camS.position.copy(ARRIVE).addScaledVector(side2, 1000).addScaledVector(back2, -900).add(new THREE.Vector3(0, 220, 0)); camS.lookAt(S.pos.clone().addScaledVector(back2, 420));
    fade.style.opacity = Math.max(0, 1 - k / 1.2);
    zt.style.opacity = k < .8 ? 0 : k < 2 ? (k - .8) / 1.2 : k < 4 ? 1 : Math.max(0, 1 - (k - 4) / 1);
    if (k > 5.2) { C.on = false; fade.style.background = '#000'; fade.style.opacity = 0; fade.style.transition = ''; zt.style.opacity = 0; $('#hud').classList.remove('hidden'); G.state = 'ship'; G.toShip(true); G.p.x = 0; G.p.z = -30; G.p.yaw = Math.PI; if (C.done) C.done(); G.save(); return; }
  }
  SP.scene.fog.density = .00008; updateDust(camS.position, 160); R.clear(); renderSpace();
}
// ---------- the ending ----------
function heartEnding() {
  dashTo('heart', null); CUT.t = 4.6; CUT.ending = true; // white out from the Heart itself
  CUT.done = () => {
    G.flags.ended = 1; UI.curTouch = ''; G.setStage(20);
    UI.panel('The Heart', `<div style="line-height:1.65">The light goes through the hull like it is not there. For a long moment nobody on the Aster Vane breathes.<br><br>Then the fog in every bubble thins at once. The hunters turn away. On the long-range screen the white walls between the Depths, the Abyss and the Heart open like doors.<br><br>Ilse Varga logs one line: <i>"Anchors lit. Heart awake. The way home is open, and so is everything else."</i><br><br><b>THE END</b><br><br><span style="color:#93a4aa">You can now dash to any bubble from the helm. Keep exploring, building and surviving.</span></div>`);
  };
}
function travelMenu() {
  if (!G.flags.ended) return;
  const b = UI.panel('Hyperspeed dash', ZONE_ORDER.map(id => `<div class="row"><div class="d">${ZONES[id].name}<small>${id === G.zone ? 'You are here.' : ''}</small></div><button data-z="${id}" ${id === G.zone ? 'disabled' : ''}>Dash</button></div>`).join(''));
  b.querySelectorAll('button[data-z]').forEach(btn => btn.onclick = () => { UI.closePanel(); dashTo(btn.dataset.z, null); });
}
