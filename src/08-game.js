// ---------- upgrades and base modules ----------
const FAB = [
  { id: 'tank', name: 'Oxygen tank', max: 2, desc: 'More suit oxygen for longer spacewalks.', cost: l => l ? { ice: 10, scrap: 8 } : { ice: 6, scrap: 4 }, make: () => G.up.tank++ },
  { id: 'pack', name: 'Cargo pack', max: 2, desc: 'Carry more on a spacewalk.', cost: l => l ? { ore: 14, scrap: 8 } : { ore: 8, scrap: 4 }, make: () => G.up.pack++ },
  { id: 'thrust', name: 'Thruster pack', max: 2, desc: 'Faster suit thrusters.', cost: l => l ? { glass: 8, scrap: 10 } : { glass: 4, scrap: 6 }, make: () => G.up.thrust++ },
  { id: 'flare', name: 'Flares (2)', desc: 'Throw one to push the thing in the fog back.', cost: () => ({ glass: 2 }), make: () => G.p.flares += 2 },
  { id: 'lamp', name: 'Suit fog lamp', max: 1, desc: 'Brighter suit lamp. The thing in the fog moves slower.', need: () => (G.flags.samplesIn || 0) >= 1, lockText: 'Needs research from Dr. Pryce (1 sample).', cost: () => ({ glass: 6, ice: 4 }), make: () => G.up.lamp++ },
  { id: 'hush', name: 'Shadow coils', max: 2, desc: 'The hunters notice the ship from less far away.', cost: l => l ? { glass: 10, scrap: 12 } : { glass: 6, scrap: 8 }, make: () => G.up.hush++ },
  { id: 'plating', name: 'Hull plating', max: 3, desc: 'Stronger hull (+25).', cost: l => ({ ore: 12 + l * 6, scrap: 8 + l * 4 }), make: () => { G.up.plating++; G.ship.hullMax += 25; G.ship.hull += 25; } },
];
const BUILD = [
  { id: 'lantern', name: 'Lantern', desc: 'Bright light. The thing in the fog will not come near it.', cost: { glass: 2, ore: 2 } },
  { id: 'extractor', name: 'Extractor', desc: 'Keeps digging resources from a nearby site.', cost: { ore: 6, scrap: 4 } },
  { id: 'o2', name: 'Oxygen node', desc: 'Refills your suit oxygen nearby.', cost: { ice: 4, scrap: 2 } },
  { id: 'shelter', name: 'Shelter pod', desc: 'A safe room. Nothing gets in. Refills oxygen.', cost: { ore: 10, scrap: 6, ice: 2 } },
  { id: 'beacon', name: 'Beacon', desc: 'Marks this base on the helm map.', cost: { scrap: 3 } },
  { id: 'floor', name: 'Floor plate', desc: '4 by 4 m deck plate.', cost: { ore: 2 } },
  { id: 'wall', name: 'Wall panel', desc: '4 m wall section.', cost: { ore: 2 } },
  { id: 'strut', name: 'Strut', desc: 'Support beam.', cost: { ore: 1 } },
];
let MODM = null;
function modMats() {
  if (MODM) return MODM;
  MODM = {
    floor: new THREE.MeshPhongMaterial({ map: TX.floor, normalMap: TX.floorN, shininess: 30 }), wall: new THREE.MeshPhongMaterial({ map: TX.wall, normalMap: TX.wallN, shininess: 18 }),
    trim: new THREE.MeshPhongMaterial({ map: TX.trim, normalMap: TX.trimN, shininess: 30 }), white: new THREE.MeshPhongMaterial({ color: 0xd0d2cc, shininess: 30 }), hz: new THREE.MeshLambertMaterial({ map: TX.hazard }),
    warm: new THREE.MeshBasicMaterial({ color: 0xffe0a8 }), blue: new THREE.MeshBasicMaterial({ color: 0x7ad0ff }), red: new THREE.MeshBasicMaterial({ color: 0xff4a3a }), amber: new THREE.MeshBasicMaterial({ color: 0xffa040 }), win: new THREE.MeshBasicMaterial({ color: 0xd8c890 }),
    ghostOk: new THREE.MeshBasicMaterial({ color: 0x80ffb0, transparent: true, opacity: .35, depthWrite: false }), ghostNo: new THREE.MeshBasicMaterial({ color: 0xff7060, transparent: true, opacity: .35, depthWrite: false }),
  };
  return MODM;
}
function makeModule(type) {
  const M = modMats(), g = new THREE.Group(); const U = {};
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; };
  switch (type) {
    case 'floor': { const geo = boxUV(new THREE.BoxGeometry(4, .3, 4), 4, .3, 4, 2); add(geo, M.floor); break; }
    case 'wall': { const geo = new THREE.BoxGeometry(4, 3.2, .25); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i)); add(geo, M.wall, 0, 1.6, 0); add(new THREE.BoxGeometry(4.1, .2, .35), M.trim, 0, .1, 0); break; }
    case 'strut': { const c = add(new THREE.CylinderGeometry(.14, .14, 4, 8), M.trim, 0, 2, 0); add(new THREE.BoxGeometry(.4, .15, .4), M.trim, 0, .07, 0); add(new THREE.BoxGeometry(.4, .15, .4), M.trim, 0, 3.93, 0); break; }
    case 'lantern': { add(new THREE.CylinderGeometry(.6, .7, .2, 10), M.trim, 0, .1); add(new THREE.CylinderGeometry(.08, .1, 2.2, 8), M.trim, 0, 1.2); add(new THREE.CylinderGeometry(.3, .3, .5, 10), M.trim, 0, 2.5); const b = add(new THREE.SphereGeometry(.24, 10, 8), M.warm, 0, 2.5); const gl = glow(0xffd090, 9, .9); gl.position.y = 2.5; g.add(gl); U.light = new THREE.Vector3(0, 2.5, 0); break; }
    case 'o2': { add(new THREE.CylinderGeometry(.5, .5, 2, 14), M.white, 0, 1.1); add(new THREE.CylinderGeometry(.51, .51, .2, 14), new THREE.MeshLambertMaterial({ color: 0x3a7ac0 }), 0, 1.5); add(new THREE.SphereGeometry(.5, 14, 8, 0, TAU, 0, Math.PI / 2), M.white, 0, 2.1); add(new THREE.BoxGeometry(1.4, .15, 1.4), M.trim, 0, .07); const l = add(new THREE.SphereGeometry(.08, 6, 6), M.blue, .5, 1.8); const gl = glow(0x7ad0ff, 2.5, .8); gl.position.set(.55, 1.8, 0); g.add(gl); break; }
    case 'extractor': { for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const l = add(new THREE.CylinderGeometry(.08, .1, 3.2, 6), M.trim, Math.cos(a) * .9, 1.4, Math.sin(a) * .9); l.rotation.z = Math.cos(a) * .3; l.rotation.x = -Math.sin(a) * .3; } add(new THREE.BoxGeometry(1.2, .9, 1.2), M.trim, 0, 2.9); add(new THREE.BoxGeometry(1.22, .12, 1.22), M.hz, 0, 2.5); const d = add(new THREE.ConeGeometry(.3, 1.6, 8), M.trim, 0, .6); d.rotation.x = Math.PI; U.drill = d; const lt = add(new THREE.BoxGeometry(.2, .2, .05), M.amber, 0, 3.0, .61); U.lamp = lt; break; }
    case 'shelter': { const p = add(new THREE.CapsuleGeometry(1.8, 3, 6, 16), M.white, 0, 1.9); p.rotation.z = Math.PI / 2; add(new THREE.BoxGeometry(4.6, .25, .3), M.win, 0, 2.4, 1.68); add(new THREE.BoxGeometry(1.2, 1.9, .2), M.trim, 0, 1.5, 1.7); add(new THREE.BoxGeometry(5, .3, 2.6), M.trim, 0, .15); const gl = glow(0xffe0a0, 6, .5); gl.position.set(0, 2.4, 2); g.add(gl); break; }
    case 'beacon': { add(new THREE.CylinderGeometry(.07, .12, 5, 6), M.trim, 0, 2.5); add(new THREE.BoxGeometry(1, .2, 1), M.trim, 0, .1); const b = add(new THREE.SphereGeometry(.18, 8, 6), M.red, 0, 5.1); const gl = glow(0xff4a3a, 7, 1); gl.position.y = 5.1; g.add(gl); U.blink = gl; break; }
  }
  g.userData = U; return g;
}
const SAFE_R = { lantern: 15, shelter: 3.5 };

// ---------- game ----------
const G = {
  mode: 'mobile', state: 'title', paused: 0, pauseSet: new Set(), time: 0, view: 'out',
  set: { mode: 'mobile', gfx: 'high', sens: 1, music: .7, sfx: .9 },
  inPlay() { return this.state !== 'title' && this.state !== 'over'; },
  pause(on, who) { if (on) this.pauseSet.add(who); else this.pauseSet.delete(who); this.paused = this.pauseSet.size; IN.clear(); this.refreshTouch(); UI.hint(); },
  have(k) { return (this.res[k] || 0) + (this.p.cargo[k] || 0); },
  canPay(c) { return Object.entries(c).every(([k, v]) => this.have(k) >= v); },
  pay(c) { if (!this.canPay(c)) return false; for (const [k, v] of Object.entries(c)) { const fromCargo = Math.min(this.p.cargo[k] || 0, v); this.p.cargo[k] = (this.p.cargo[k] || 0) - fromCargo; this.res[k] -= v - fromCargo; } return true; },
  cargoN() { return Object.values(this.p.cargo).reduce((a, b) => a + b, 0); },
  cargoMax() { return 20 + this.up.pack * 15; },
  o2Max() { return 100 * (1 + .45 * this.up.tank); },
  newState() {
    this.res = { ore: 2, ice: 4, glass: 2, scrap: 6, samples: 0 };
    this.p = { x: -1.5, y: 0, z: -27.5, yaw: 1.0, pitch: 0, vy: 0, hp: 100, flares: 0, cargo: { ore: 0, ice: 0, glass: 0, scrap: 0, samples: 0 } };
    this.up = { tank: 0, pack: 0, thrust: 0, lamp: 0, hush: 0, plating: 0 };
    this.ship = { pos: new THREE.Vector3(0, 0, 0), yaw: 0, vel: new THREE.Vector3(), speed: 0, hull: 62, hullMax: 100, bank: 0, thr: 0 };
    this.q = { stage: 0, n: 0 }; this.flags = {}; this.bases = []; this.mined = {}; this.time = 0; this.evaCount = 0;
  },
  setStage(s) { this.q.stage = s; this.q.n = 0; sfx('beep2'); UI.toast('New objective'); this.updObjective(); this.save(); },
  updObjective() {
    const s = this.q.stage; const T = [
      'Talk to Navigator Varga on the Bridge.', 'Take the helm on the Bridge and fly to the rock field ahead.', 'Stop the ship. Go to the Suit Room and out through the airlock.',
      `Mine ore from the rocks. (${Math.min(this.q.n, 8)}/8)`, 'Come back inside and ask Chief Okafor in Engineering to repair the hull.', 'Ask Quartermaster Rook in the Cargo Hold about building bases.',
      'Go outside and build a Lantern at a site.', 'Build an Extractor near a site.', `Find strange samples for Dr. Pryce in the Xeno Lab. Wrecks and deepglass gardens have them. (${Math.min(G.flags.samplesIn || 0, 3)}/3 studied)`,
      'Find the lighthouse deep in the Depths, far to the north-east.', 'Keep exploring the Depths. Build bases, upgrade the ship and survive.'];
    UI.objective(T[s] || T[10]);
  },
  applySettings() {
    const s = this.set; this.mode = s.mode; document.body.classList.toggle('mobile', s.mode === 'mobile'); IN.sens = s.sens;
    AU.vol.music = s.music; AU.vol.sfx = s.sfx; auSetVol();
    const pr = s.gfx === 'low' ? Math.min(devicePixelRatio, 1) * .75 : s.gfx === 'medium' ? Math.min(devicePixelRatio, 1.3) : Math.min(devicePixelRatio, 1.7);
    R.setPixelRatio(pr); R.setSize(innerWidth, innerHeight, false);
    try { localStorage.setItem('thedepths-settings', JSON.stringify(s)); } catch (e) { }
    this.refreshTouch(); UI.hint();
  },
  refreshTouch() {
    const show = this.mode === 'mobile' && this.inPlay() && !this.paused; $('#touch').classList.toggle('hidden', !show);
    if (show) UI.touchSet(this.state === 'eva' && this.building ? 'build' : this.state);
  },
  // ---- save / load ----
  save() {
    if (!this.inPlay()) return; const s = this.ship;
    const d = { v: 1, res: this.res, p: { hp: this.p.hp, flares: this.p.flares, cargo: this.p.cargo }, up: this.up, ship: { pos: s.pos.toArray(), yaw: s.yaw, hull: s.hull, hullMax: s.hullMax }, q: this.q, flags: this.flags, bases: this.bases.map(b => ({ type: b.type, p: b.p, ry: b.ry, store: b.store || 0, acc: b.acc || 0, site: b.site })), mined: this.mined, known: SP.sites.filter(x => x.known).map(x => x.i), time: this.time, evaCount: this.evaCount };
    try { localStorage.setItem('thedepths-save', JSON.stringify(d)); } catch (e) { }
  },
  hasSave() { try { return !!localStorage.getItem('thedepths-save'); } catch (e) { return false; } },
  load() {
    let d; try { d = JSON.parse(localStorage.getItem('thedepths-save')); } catch (e) { } if (!d) return false;
    this.newState(); Object.assign(this.res, d.res); this.p.hp = d.p.hp; this.p.flares = d.p.flares; Object.assign(this.p.cargo, d.p.cargo || {}); Object.assign(this.up, d.up);
    this.ship.pos.fromArray(d.ship.pos); this.ship.yaw = d.ship.yaw; this.ship.hull = d.ship.hull; this.ship.hullMax = d.ship.hullMax;
    this.q = d.q; this.flags = d.flags || {}; this.time = d.time || 0; this.evaCount = d.evaCount || 0;
    this.mined = d.mined || {}; for (const s of SP.sites) for (const dep of s.deps) applyMined(dep);
    for (const i of d.known || []) if (SP.sites[i]) SP.sites[i].known = true;
    for (const b of d.bases || []) placeBase(b.type, new THREE.Vector3().fromArray(b.p), b.ry, b, true);
    this.p.x = 0; this.p.z = -30; this.p.yaw = Math.PI; return true;
  },
  resetWorld() { for (const b of this.bases || []) SP.scene.remove(b.g); this.bases = []; for (const s of SP.sites) { s.known = s.i < 1; for (const dep of s.deps) { dep.amt = dep.max; dep.g.visible = true; dep.g.scale.setScalar(1); } } },
  start(cont) {
    auInit(); this.resetWorld();
    if (!(cont && this.load())) { this.newState(); }
    $('#title').classList.add('hidden'); $('#hud').classList.remove('hidden');
    this.toShip(true); this.updObjective();
    if (this.mode === 'mobile') { try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }
    if (!cont) setTimeout(() => UI.toast(this.mode === 'pc' ? 'WASD to move, arrow keys to look around, E to talk.' : 'Left stick to move, drag on the right to look.', 4500), 800);
    else UI.toast('Welcome back, Captain.');
  },
  toTitle() { this.state = 'title'; $('#hud').classList.add('hidden'); $('#title').classList.remove('hidden'); titleMenu(); setMood('menu'); this.refreshTouch(); for (const k in AU.loops) loopTo(k, 0); if (document.pointerLockElement) document.exitPointerLock(); },
  // ---- state switches ----
  toShip(first) {
    this.state = 'ship'; setMood('ship'); this.building = false; ghostOff(); this.refreshTouch(); $('#map').classList.add('hidden'); $('#compass').classList.add('hidden'); $('#cross').classList.remove('hidden');
    SP.suitLamp.intensity = 0; SP.pale.g.visible = false; loopTo('jet', 0); loopTo('growl', 0); loopTo('whisper', 0); loopTo('wind', 0); loopTo('mine', 0); UI.warn('');
  },
  toHelm() { this.state = 'helm'; this.view = this.view || 'out'; setMood('helm'); this.refreshTouch(); $('#map').classList.remove('hidden'); sfx('beep2'); this.camYaw = 0; this.camPitch = .22; if (this.q.stage === 0) this.setStage(1); UI.toast(this.mode === 'pc' ? 'W/S thrust, A/D turn, Space/C up and down, V view, E stand up' : 'Left stick to steer, Boost to go fast, Leave to stand up', 4000); },
  leaveHelm() { this.state = 'ship'; this.p.x = 0; this.p.z = -31.2; this.p.yaw = Math.PI; this.p.pitch = 0; this.toShip(); sfx('beep'); this.save(); },
  // airlock
  airlockIn() { if (this.ship.speed > 2.5) { sfx('deny'); UI.toast('The ship has to be stopped before anyone goes outside.'); } else UI.toast('The inner door opens when you walk up to it.'); },
  airlockPanel() {
    if (this.al) return; const inD = INT.innerDoor, outD = INT.outerDoor;
    if (outD.want) { outD.want = 0; this.al = { ph: 'in', t: 0 }; sfx('door'); return; }
    if (this.ship.speed > 2.5) { sfx('deny'); UI.toast('The ship is still moving. Stop it at the helm first.'); return; }
    if (roomAt(this.p.x, this.p.z)?.id !== 'airlock') return;
    inD.want = 0; this.al = { ph: 'out', t: 0 }; sfx('alarm'); setTimeout(() => sfx('hiss'), 900);
  },
  updAirlock(dt) {
    const inD = INT.innerDoor, outD = INT.outerDoor, A = this.al; const inAir = roomAt(this.p.x, this.p.z)?.id === 'airlock';
    if (!A) { inD.want = (!outD.want && outD.open < .05 && this.ship.speed < 2.5 && Math.hypot(this.p.x - 8, this.p.z - 9) < 2.6) ? 1 : 0; INT.alarmLamp.material.color.setHex(outD.open > .05 ? 0xff4030 : 0x441010); return; }
    A.t += dt; const blink = (A.t * 3 | 0) % 2;
    INT.alarmLamp.material.color.setHex(blink ? 0xff3020 : 0x441010);
    if (A.ph === 'out' && A.t > 3.6 && inD.open < .05) { outD.want = 1; sfx('door'); this.al = null; UI.toast('Airlock open. Step outside when ready.'); }
    if (A.ph === 'in' && A.t > 1 && outD.open < .05 && !A.h) { A.h = 1; sfx('hiss'); }
    if (A.ph === 'in' && A.t > 3.6) { this.al = null; sfx('beep2'); }
  },
  // ---------- spacewalk ----------
  startEVA() {
    fade(() => {
      this.state = 'eva'; this.evaCount++; setMood('eva'); const E = this.e = { pos: SP.ship.localToWorld(SP.airlockLocal.clone()), vel: new THREE.Vector3(), yaw: this.ship.yaw - Math.PI / 2, pitch: 0, o2: this.o2Max(), t: 0, mineT: 0, breathT: 0, heartT: 0, flares: [], warnT: 0 };
      E.vel.set(Math.cos(this.ship.yaw), 0, -Math.sin(this.ship.yaw)).multiplyScalar(2);
      G.flares = []; const P = SP.pale; P.on = false; P.spawnAt = 5; P.state = 'none';
      SP.suitLamp.intensity = this.up.lamp ? 20 : 13; $('#cross').classList.remove('hidden'); $('#compass').classList.remove('hidden'); $('#map').classList.add('hidden');
      loopTo('wind', .25, 1); this.refreshTouch(); if (this.q.stage === 2) this.setStage(3);
      UI.toast(this.mode === 'pc' ? 'Hold the left mouse button on glowing rocks to mine. B to build.' : 'Hold Use on glowing rocks to mine. Build to place base parts.', 4000);
    });
  },
  endEVA(caught) {
    fade(() => {
      this.e = null; this.building = false; ghostOff(); SP.pale.g.visible = false; SP.pale.on = false;
      const c = this.p.cargo; let got = [];
      if (caught) { for (const k in c) c[k] = 0; this.p.hp = 35; this.p.x = 9.6; this.p.z = -18; this.p.yaw = Math.PI / 2; this.p.pitch = 0; INT.outerDoor.want = 0; INT.outerDoor.open = 0; this.toShip(); UI.toast('You wake up in the Medbay. Your suit cargo is gone.', 5000); sfx('beep2'); }
      else {
        for (const k in c) if (c[k]) { this.res[k] += c[k]; got.push(c[k] + ' ' + RES_NAME[k]); c[k] = 0; }
        this.p.x = 12.6; this.p.z = 9; this.p.yaw = Math.PI / 2; this.p.pitch = 0; this.p.y = 0; INT.outerDoor.open = 1; INT.outerDoor.want = 0; this.al = { ph: 'in', t: 0 }; sfx('door'); this.toShip();
        UI.toast(got.length ? 'Unloaded to cargo: ' + got.join(', ') : 'Back inside.', 4000);
      }
      for (const f of this.flares || []) SP.scene.remove(f.g); this.flares = [];
      this.save();
    }, caught ? 1.8 : .6);
  },
  caught() { if (this.dying) return; this.dying = true; sfx('caught'); loopTo('growl', 0, .05); loopTo('whisper', 0, .05); setTimeout(() => { this.dying = false; this.endEVA(true); }, 900); },
};
function fade(fn, hold = .6) { const f = $('#fade'); f.style.opacity = 1; setTimeout(() => { fn(); setTimeout(() => f.style.opacity = 0, hold * 1000); }, 600); }
function applyMined(dep) { const v = G.mined[dep.key]; if (v === undefined) { dep.amt = dep.max; dep.g.visible = true; dep.g.scale.setScalar(1); return; } dep.amt = v; dep.g.visible = v > 0; dep.g.scale.setScalar(.35 + .65 * v / dep.max); }

// ---------- three.js setup ----------
let R, camI, camS;
function initRenderer() {
  R = new THREE.WebGLRenderer({ canvas: $('#cv'), antialias: true, powerPreference: 'high-performance' });
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.55; R.autoClear = false;
  camI = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 120); camI.rotation.order = 'YXZ';
  camS = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .3, 1100); camS.rotation.order = 'YXZ';
  addEventListener('resize', () => { R.setSize(innerWidth, innerHeight, false); for (const c of [camI, camS]) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); } });
}

// ---------- interior update ----------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
function lookInput(scale) { const s = .0024 * (scale || 1); const dx = IN.mx * s, dy = IN.my * s; IN.mx = IN.my = 0; return [dx, dy]; }
function collideCircle(p, r) {
  for (let it = 0; it < 2; it++) {
    for (const s of INT.segs) {
      let cx, cz; if (s.axis === 'x') { if (Math.abs(p.x - s.at) > r + .1) continue; cx = s.at; cz = clamp(p.z, s.a0, s.a1); } else { if (Math.abs(p.z - s.at) > r + .1) continue; cz = s.at; cx = clamp(p.x, s.a0, s.a1); }
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d < r && d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    }
    for (const D of INT.doors) if (D.open < .7) { const s = D, w = D.w / 2; let cx, cz; if (s.axis === 'x') { cx = s.at; cz = clamp(p.z, s.c - w, s.c + w); } else { cz = s.at; cx = clamp(p.x, s.c - w, s.c + w); } const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d < r && d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } }
    for (const b of INT.boxes) { if (b.y2 !== undefined && b.y2 < p.y + .3) continue; const cx = clamp(p.x, b.x1, b.x2), cz = clamp(p.z, b.z1, b.z2); const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else { const o = [p.x - b.x1, b.x2 - p.x, p.z - b.z1, b.z2 - p.z]; const m = Math.min(...o); if (m === o[0]) p.x = b.x1 - r; else if (m === o[1]) p.x = b.x2 + r; else if (m === o[2]) p.z = b.z1 - r; else p.z = b.z2 + r; } } }
  }
}
let stepAcc = 0, bob = 0;
function updateShipWalk(dt) {
  const P = G.p; const [dx, dy] = lookInput(); P.yaw -= dx; P.pitch = clamp(P.pitch - dy, -1.45, 1.45);
  const a = moveAxis(); const run = IN.hold.run ? 1.75 : 1; const sp = 3.1 * run;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const mx = (fx * -a.y + rx * a.x) * sp * dt, mz = (fz * -a.y + rz * a.x) * sp * dt;
  P.x += mx; P.z += mz; collideCircle(P, .3);
  // gravity / jump
  P.vy -= 14 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; if (IN.take('up')) P.vy = 4.6; }
  const moving = Math.hypot(a.x, a.y) > .1 && P.y === 0;
  if (moving) { bob += dt * 9 * run; stepAcc += dt * run; if (stepAcc > .5) { stepAcc = 0; sfx('step', .7); } } else bob *= .9;
  camI.position.set(P.x, P.y + 1.62 + Math.sin(bob) * .035, P.z); camI.rotation.set(P.pitch, P.yaw, 0);
  if (P.x > 14.25 && Math.abs(P.z - 9) < 1 && INT.outerDoor.open > .8) { P.x = 13.6; G.startEVA(); return; }
  // interact
  let best = null, bs = 1e9; for (const it of INT.inter) { const ddx = it.x - P.x, ddz = it.z - P.z, d = Math.hypot(ddx, ddz); if (d > it.r) continue; const f = d < .6 ? 1 : (ddx * fx + ddz * fz) / d; if (f < .35) continue; const s = d - f; if (s < bs) { bs = s; best = it; } }
  UI.prompt(best ? (G.mode === 'pc' ? 'E  ' : '') + best.label() : '');
  if (IN.take('use') && best) { sfx('ui'); best.act(); }
  IN.take('fire'); IN.take('build'); IN.take('flare');
  if (IN.take('bag')) UI.showBag();
}
function updateDoors(dt) {
  for (const D of INT.doors) {
    let want = D.auto ? (Math.hypot(G.p.x - D.cx, G.p.z - D.cz) < 2.4 || INT.npcs.some(n => Math.hypot(n.P.g.position.x - D.cx, n.P.g.position.z - D.cz) < 1.6) ? 1 : 0) : (D.want || 0);
    const prev = D.open; D.open = clamp(D.open + (want ? 1 : -1) * dt * 2.2, 0, 1); if (prev !== D.open) updateDoorMesh(D);
    if (want && !D.wasOpen && D.auto) sfx('door', .55); D.wasOpen = !!want;
    D.lightM.color.setHex(D.auto ? 0x38c070 : (D.open > .05 ? 0xff4030 : 0xd09030));
  }
  if (SP.extDoor) SP.extDoor.forEach((p, i) => { p.position.z = 9 + (i ? 1 : -1) * (.4 + INT.outerDoor.open * .85); });
}
function updateInteriorLights() {
  const p = camI.position; const list = INT.anchors.map(a => [a, a.p.distanceToSquared(p)]).sort((a, b) => a[1] - b[1]);
  INT.pool.forEach((L, i) => { const a = list[i][0]; L.position.copy(a.p); L.color.copy(a.color); L.intensity = a.I; L.distance = a.dist; });
}

// ---------- flight ----------
function shipAxisClosest(p, out) { tmpV2.set(0, 3, -40); const a = SP.ship.localToWorld(tmpV2.clone()); tmpV2.set(0, 3, 960); const b = SP.ship.localToWorld(tmpV2.clone()); const ab = b.sub(a); const t = clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1); return (out || new THREE.Vector3()).copy(a).addScaledVector(ab, t); }
function updateFlight(dt, controlling) {
  const S = G.ship; const a = controlling ? moveAxis() : { x: 0, y: 0 };
  const boost = false; const maxS = 110;
  const fwd = new THREE.Vector3(-Math.sin(S.yaw), 0, -Math.cos(S.yaw));
  let thr = -a.y; S.thr = lerp(S.thr, thr, dt * 2);
  S.vel.addScaledVector(fwd, thr * 20 * dt);
  let vy = (controlling ? (IN.hold.up ? 1 : 0) - (IN.hold.down ? 1 : 0) : 0); S.vel.y += vy * 22 * dt;
  const turn = -a.x * .32; S.yaw += turn * dt * (1 - Math.min(.5, S.vel.length() / 300)); S.bank = lerp(S.bank, turn * .5 * Math.min(1, S.vel.length() / 25), dt * 2);
  // drag: lateral drift dies faster than forward motion
  const fs = S.vel.dot(fwd); const lat = S.vel.clone().addScaledVector(fwd, -fs); lat.y *= .05;
  S.vel.addScaledVector(lat, -Math.min(1, dt * 1.2)); S.vel.y *= 1 - Math.min(1, dt * .5);
  if (!controlling || Math.abs(thr) < .05) S.vel.multiplyScalar(1 - Math.min(1, dt * (controlling ? .25 : .6)));
  const sp = S.vel.length(); if (sp > maxS) S.vel.multiplyScalar(lerp(1, maxS / sp, dt * 2));
  S.pos.addScaledVector(S.vel, dt); S.speed = S.vel.length();
  { const off = S.pos.clone().sub(SP.bubC), d = off.length(); if (d > SP.bubR * 2.2) S.pos.copy(SP.bubC).addScaledVector(off, SP.bubR * 2.2 / d); }
  SP.ship.position.copy(S.pos); SP.ship.rotation.set(0, S.yaw, S.bank, 'YXZ'); SP.ship.updateMatrixWorld();
  // noise
  G.noise = clamp(S.speed / 80 * (1 - .3 * G.up.hush), 0, 1.6);
  const inside = G.state !== 'helm' || G.view === 'bridge';
  loopTo('engine', (.12 + Math.min(1, S.speed / 110) * .5) * (inside ? .6 : 1)); if (AU.engO) { AU.engO.frequency.value = 38 + S.speed * .2; AU.engLP.frequency.value = 160 + S.speed * 5; }
  for (const pl of SP.plumes) { pl.scale.set(1, .3 + Math.abs(S.thr) * 1.4, 1); pl.material.opacity = .12 + Math.abs(S.thr) * .2; }
  // collisions with rocks and oddities
  const c = new THREE.Vector3(); for (const s of SP.solids) {
    if (!s.p || s.p.distanceToSquared(S.pos) > 1400 * 1400) continue; shipAxisClosest(s.p, c); const d = c.distanceTo(s.p), min = s.r + 22;
    if (d < min) { const n = c.sub(s.p).normalize(); S.pos.addScaledVector(n, min - d); const vn = S.vel.dot(n); if (vn < 0) { const hitSp = -vn; S.vel.addScaledVector(n, -vn * 1.4); if (hitSp > 6 && G.time - (G._hitT || 0) > 1) { G._hitT = G.time; S.hull -= hitSp * .35; sfx('hit', Math.min(1, hitSp / 30)); G.shake = Math.min(1.5, hitSp / 20); UI.toast('Hull impact'); } } }
  }
  // hull against the big structures
  for (const st of SP.sites) { if (st.c.distanceTo(S.pos) > 1500) continue; shipAxisClosest(st.c, c); const pt = c.clone(); const before = pt.clone(); if (pushOutBoxes(st.boxes, pt, 24, null)) { const n = pt.clone().sub(before); const L = n.length(); n.normalize(); S.pos.addScaledVector(n, L); const vn = S.vel.dot(n); if (vn < 0) { S.vel.addScaledVector(n, -vn * 1.3); if (-vn > 6 && G.time - (G._hitT || 0) > 1) { G._hitT = G.time; S.hull -= -vn * .3; sfx('hit', Math.min(1, -vn / 30)); G.shake = Math.min(1.5, -vn / 20); UI.toast('Hull impact'); } } } }
  // discover sites
  for (const s of SP.sites) if (!s.known && s.c.distanceTo(S.pos) < 1100) { s.known = true; UI.toast('Found: ' + s.name); sfx('ping'); }
  if (G.q.stage === 1 && SP.sites[0].c.distanceTo(S.pos) < 700) G.setStage(2);
  if (G.q.stage === 9 && SP.lighthouse.p.distanceTo(S.pos) < 800) { G.setStage(10); setTimeout(() => lighthouseStory(), 600); }
  if (S.hull <= 0 && G.state !== 'over') gameOver();
}
function updateGulpers(dt) {
  const S = G.ship; let hunted = false; const near = new THREE.Vector3();
  for (const g of SP.gulpers) {
    g.t += dt; g.cool -= dt; shipAxisClosest(g.pos, near); const d = near.distanceTo(g.pos);
    const detect = 380 * (1 - .2 * G.up.hush) * (G.state === 'eva' ? .4 : 1);
    let target, speed;
    if (g.state === 'roam') { if (g.t > 22 || g.pos.distanceTo(g.wp) < 60) { g.t = 0; const stalk = Math.random() < .55; g.wp.copy(stalk ? S.pos : g.home).add(new THREE.Vector3((Math.random() - .5) * (stalk ? 900 : 1400), (Math.random() - .5) * (stalk ? 500 : 900), (Math.random() - .5) * (stalk ? 900 : 1400))); } target = g.wp; speed = 22; if (d < detect && g.cool <= 0 && G.inPlay()) { g.state = 'hunt'; g.lostT = 0; if (d < 1600) sfx('roar', .7); } }
    else if (g.state === 'hunt') { target = near; speed = 60 + Math.min(25, g.t * .5); hunted = true; if (d > detect * 1.3) { g.lostT += dt; if (g.lostT > 5) { g.state = 'roam'; g.t = 0; UI.toast('It lost us.'); } } else g.lostT = 0; if (d < 75) { g.state = 'flee'; g.t = 0; g.cool = 25; S.hull -= 14; sfx('hit'); sfx('roar', 1); G.shake = 1.6; S.vel.addScaledVector(near.clone().sub(g.pos).normalize(), 14); UI.toast('Something hit the ship!'); } }
    else { target = g.pos.clone().add(g.pos.clone().sub(S.pos).normalize().multiplyScalar(50)); speed = 40; if (g.t > 8) { g.state = 'roam'; g.t = 0; } }
    const want = target.clone().sub(g.pos); const wl = want.length(); if (wl > .1) want.multiplyScalar(speed / wl); g.vel.lerp(want, Math.min(1, dt * 1.2)); g.pos.addScaledVector(g.vel, dt);
    // body follows the head like a chain, with a travelling side-to-side wave
    const P = g.pts; P[0].copy(g.pos); const sp = g.vel.length();
    const side = tmpV.set(-g.vel.z, 0, g.vel.x); if (side.lengthSq() > 1e-4) side.normalize();
    for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k]; const d0 = b.clone().sub(a); const l = d0.length() || 1; b.copy(a).addScaledVector(d0, g.spacing / l); b.addScaledVector(side, Math.sin(G.time * (1.2 + sp * .05) - k * .55 + g.ph) * .05 * k * Math.min(1, .3 + sp * .04)); }
    if (!g.g.visible) continue;
    g.jawOpen = lerp(g.jawOpen, g.state === 'hunt' ? .55 + Math.sin(G.time * 3) * .1 : .08 + Math.sin(G.time * .7 + g.ph) * .05, Math.min(1, dt * 3)); g.jawP.rotation.x = g.jawOpen;
    g.head.position.copy(P[0]); g.head.lookAt(tmpV.copy(P[0]).multiplyScalar(2).sub(P[1])); g.head.rotateY(Math.PI);
    g.lure.position.y = 11 + Math.sin(G.time * 2 + g.ph) * .8;
    gulperMesh(g, G.time);
  }
  G.hunted = hunted;
}
function updateWorldAnim(dt, t) {
  for (const s of SP.sites) if (s.blinkSpin) s.blinkSpin.rotation.y += dt * .1;
  if (SP.bigRing) SP.bigRing.rotation.z += dt * .025;
  for (const d of SP.decor) { if (d.spin) d.g.rotation.y += d.spin * dt; if (d.g.userData.tick) d.g.userData.tick(t); }
  for (const j of SP.drifters) { const s = 1 + Math.sin(t * 1.4 + j.ph) * .12; j.bell.scale.set(s, 1 / s, s); j.g.position.addScaledVector(j.v, dt); j.g.position.y += Math.sin(t * .7 + j.ph) * .02; }
  const bl = (t * 1.1 % 1) < .12; if (SP.run) SP.run.forEach((g, i) => { const ph = (t * 1.2 - i * .08) % 1; g.material.opacity = ph < .15 ? 1 : .15; }); if (SP.vents) SP.vents.color.setHSL(.05, 1, .45 + Math.sin(t * 1.3) * .06); if (SP.blink) for (const b of SP.blink) b.visible = bl; SP.strobe.visible = (t * .7 % 1) < .05;
  for (const s of SP.sites) if (s.blink) s.blink.visible = (t * .9 % 1) < .4;
  SP.dome.material.uniforms.t.value = t;
  for (const b of G.bases || []) { if (b.type === 'beacon') b.g.userData.blink.visible = (t % 1.4) < .2; if (b.type === 'extractor') { b.g.userData.drill.rotation.y += dt * 6; } }
}
function updateExtractors(dt) { for (const b of G.bases) if (b.type === 'extractor') { b.acc = (b.acc || 0) + dt; while (b.acc > 25 && (b.store || 0) < 20) { b.acc -= 25; b.store = (b.store || 0) + 1; } if ((b.store || 0) >= 20) b.acc = 0; b.g.userData.lamp.material = (b.store || 0) > 0 ? modMats().amber : modMats().trim; } }

// ---------- spacewalk update ----------
let ghost = null, ghostType = 0, ghostRot = 0, laser = null, laserGlow = null;
function ghostOff() { if (ghost) { SP.scene.remove(ghost); ghost = null; } }
function placeBase(type, pos, ry, src, silent) {
  const g = makeModule(type); g.position.copy(pos); g.rotation.y = ry; SP.scene.add(g);
  let site = src && src.site !== undefined ? src.site : null; if (site === null) { let bd = 1e9; for (const s of SP.sites) { const d = s.c.distanceTo(pos); if (d < bd) { bd = d; site = s.i; } } }
  const b = { type, p: pos.toArray(), ry, g, store: src ? src.store || 0 : 0, acc: src ? src.acc || 0 : 0, site, pos: pos.clone() };
  if (type === 'beacon' || type === 'extractor' || type === 'lantern' || type === 'shelter') SP.sites[site] && (SP.sites[site].base = true);
  G.bases.push(b); return b;
}
function nearestSite(p) { let best = null, bd = 1e9; for (const s of SP.sites) { const d = s.c.distanceTo(p); if (d < bd) { bd = d; best = s; } } return [best, bd]; }
function rayDeposit(o, dir, range) {
  let best = null, bt = range; for (const s of SP.sites) { if (s.c.distanceTo(o) > 380) continue; for (const d of s.deps) { if (d.amt <= 0) continue; tmpV.copy(d.wp).sub(o); const t = tmpV.dot(dir); if (t < 0 || t > bt + d.r) continue; const dd = tmpV.lengthSq() - t * t; if (dd < d.r * d.r * 1.3) { best = d; bt = t; } } }
  return best;
}
function safeZone(p) {
  for (const b of G.bases) { const r = SAFE_R[b.type]; if (r && b.pos.distanceTo(p) < r) return b.pos; }
  for (const f of G.flares || []) if (f.g.position.distanceTo(p) < 12) return f.g.position;
  const al = SP.ship.localToWorld(SP.airlockLocal.clone()); if (al.distanceTo(p) < 5) return al; return null;
}
function updateEVA(dt) {
  const E = G.e; if (!E) return; E.t += dt;
  const [dx, dy] = lookInput(); E.yaw -= dx; E.pitch = clamp(E.pitch - dy, -1.5, 1.5);
  camS.rotation.set(E.pitch, E.yaw, 0); const fwd = new THREE.Vector3(0, 0, -1).applyEuler(camS.rotation), right = new THREE.Vector3(1, 0, 0).applyEuler(camS.rotation);
  const a = moveAxis(); const boost = false; const acc = 11 * (1 + .25 * G.up.thrust);
  const th = new THREE.Vector3().addScaledVector(fwd, -a.y).addScaledVector(right, a.x); th.y += (IN.hold.up ? 1 : 0) - (IN.hold.down ? 1 : 0);
  if (th.lengthSq() > 1) th.normalize(); E.vel.addScaledVector(th, acc * dt); E.vel.multiplyScalar(1 - Math.min(1, dt * .9));
  const maxV = 12 * (1 + .25 * G.up.thrust); if (E.vel.length() > maxV) E.vel.setLength(maxV);
  E.pos.addScaledVector(E.vel, dt);
  loopTo('jet', th.lengthSq() > .01 ? (boost ? .22 : .12) : 0, .08);
  // collide with rocks and the hull
  for (const s of SP.sites) { if (s.c.distanceTo(E.pos) > 380) continue; if (pushOutBoxes(s.boxes, E.pos, .6, E.vel)) E.vel.multiplyScalar(.8); for (const rk of s.rocks) { const d = rk.p.distanceTo(E.pos), m = rk.r + .6; if (d < m) { const n = E.pos.clone().sub(rk.p).normalize(); E.pos.copy(rk.p).addScaledVector(n, m); const vn = E.vel.dot(n); if (vn < 0) E.vel.addScaledVector(n, -vn); } } }
  { const lp0 = SP.ship.worldToLocal(E.pos.clone()); let hitAny = false; for (const b of SP.shipBoxes) { const pad = .5; const rz = b[6] || 0, cz = Math.cos(-rz), sz = Math.sin(-rz); const lp = rz ? new THREE.Vector3(lp0.x * cz - (lp0.y - 3) * sz, lp0.x * sz + (lp0.y - 3) * cz + 3, lp0.z) : lp0.clone(); if (lp.x > b[0] - pad && lp.x < b[3] + pad && lp.y > b[1] - pad && lp.y < b[4] + pad && lp.z > b[2] - pad && lp.z < b[5] + pad) { const o = [lp.x - (b[0] - pad), (b[3] + pad) - lp.x, lp.y - (b[1] - pad), (b[4] + pad) - lp.y, lp.z - (b[2] - pad), (b[5] + pad) - lp.z]; const m = Math.min(...o), i = o.indexOf(m); if (i === 0) lp.x = b[0] - pad; else if (i === 1) lp.x = b[3] + pad; else if (i === 2) lp.y = b[1] - pad; else if (i === 3) lp.y = b[4] + pad; else if (i === 4) lp.z = b[2] - pad; else lp.z = b[5] + pad; if (rz) { const c2 = Math.cos(rz), s2 = Math.sin(rz), y3 = lp.y - 3; lp.set(lp.x * c2 - y3 * s2, lp.x * s2 + y3 * c2 + 3, lp.z); } lp0.copy(lp); hitAny = true; E.vel.multiplyScalar(.5); } }
    { const rl = lp0.clone().sub(new THREE.Vector3(0, 3, 470)); const q = Math.hypot(rl.x, rl.y), d2 = Math.hypot(q - 250, rl.z); if (d2 < 17 && q > 1) { const n = new THREE.Vector3(rl.x / q * (q - 250), rl.y / q * (q - 250), rl.z).normalize(); const fix = n.multiplyScalar(17); const base = new THREE.Vector3(rl.x / q * 250, rl.y / q * 250, 0); lp0.copy(base.add(fix)).add(new THREE.Vector3(0, 3, 470)); hitAny = true; } }
    if (hitAny) E.pos.copy(SP.ship.localToWorld(lp0)); }
  camS.position.copy(E.pos); camS.position.y += Math.sin(E.t * 1.3) * .03;
  SP.suitLamp.position.copy(camS.position).addScaledVector(right, .3).y -= .2; SP.suitLamp.target.position.copy(camS.position).addScaledVector(fwd, 10);
  // fog thickens around you outside
  const P = SP.pale; const prox = P.on ? clamp(1 - (P.pos.distanceTo(E.pos) - 3) / 70, 0, 1) : 0;
  SP.scene.fog.density = lerp(SP.scene.fog.density, .0115 + Math.min(.004, E.t * .0001) + prox * .006, dt * .8);
  // oxygen
  const o2Max = G.o2Max(); let refill = false;
  for (const b of G.bases) if ((b.type === 'o2' && b.pos.distanceTo(E.pos) < 6) || (b.type === 'shelter' && b.pos.distanceTo(E.pos) < 3.5)) refill = true;
  if (refill) E.o2 = Math.min(o2Max, E.o2 + dt * 25); else E.o2 -= dt * (100 / 150) * (boost ? 1.3 : 1);
  if (E.o2 <= 0) { E.o2 = 0; G.p.hp -= dt * 7; if (G.p.hp <= 0) { G.p.hp = 0; G.caught(); } }
  if (E.o2 / o2Max < .25) { E.warnT -= dt; if (E.warnT <= 0) { E.warnT = 1.6; sfx('beep', .7); } }
  // breathing
  E.breathT -= dt; if (E.breathT <= 0) { const rate = lerp(4.2, 1.6, prox); E.breathT = rate; sfx('breathIn', .9); setTimeout(() => sfx('breathOut', .9), rate * 450); }
  // airlock / prompts
  const alw = SP.ship.localToWorld(SP.airlockLocal.clone()); const dAl = alw.distanceTo(E.pos);
  let prompt = '', act = null;
  if (dAl < 4) { prompt = 'Enter airlock'; act = () => G.endEVA(false); }
  for (const b of G.bases) if (b.type === 'extractor' && (b.store || 0) > 0 && b.pos.distanceTo(E.pos) < 4.5) { const s = SP.sites[b.site]; const rk = s.type === 'wreck' ? 'scrap' : SITE_T[s.type].res; prompt = `Collect ${b.store} ${RES_NAME[rk]}`; act = () => { const space = G.cargoMax() - G.cargoN(); const n = Math.min(space, b.store); if (n <= 0) { UI.toast('Suit cargo is full.'); sfx('deny'); return; } b.store -= n; G.p.cargo[rk] += n; sfx('pick'); UI.toast(`+${n} ${RES_NAME[rk]}`); }; }
  // compass
  drawCompass(alw, E);
  if (IN.take('bag')) UI.showBag();
  // building
  if (IN.take('build')) { G.building = !G.building; if (G.building) openBuildMenu(); else ghostOff(); G.refreshTouch(); }
  if (G.building) { updateBuild(dt, fwd); UI.prompt(ghost ? (G.mode === 'pc' ? 'Click to place, R rotate, X remove, B done' : '') : ''); if (laser) laser.visible = laserGlow.visible = false; loopTo('mine', 0); }
  else {
    // mining
    const firing = IN.hold.fire || IN.hold.use; const usePressed = IN.take('use') | IN.take('fire');
    if (usePressed && act) { act(); }
    const dep = rayDeposit(camS.position, fwd, 9);
    if (!act && dep && !firing) prompt = (G.mode === 'pc' ? 'Hold click: ' : 'Hold Use: ') + 'mine ' + RES_NAME[dep.type];
    if (firing && dep && !act) {
      E.mineT += dt; loopTo('mine', .16, .05); if (!laser) makeLaser();
      laser.visible = laserGlow.visible = true; const from = camS.position.clone().addScaledVector(right, .35).addScaledVector(fwd, .4); from.y -= .3; const to = dep.wp.clone(); const L = from.distanceTo(to);
      laser.position.copy(from).lerp(to, .5); laser.lookAt(to); laser.scale.set(1, 1, L); laserGlow.position.copy(to).addScaledVector(fwd, -dep.r * .7); laserGlow.scale.setScalar(1.5 + Math.random() * 1.2);
      const need = dep.type === 'samples' ? 1.6 : .55;
      if (E.mineT > need) { E.mineT = 0; if (G.cargoN() >= G.cargoMax()) { UI.toast('Suit cargo is full. Go back to the airlock.'); sfx('deny'); } else { dep.amt--; G.mined[dep.key] = dep.amt; G.p.cargo[dep.type]++; sfx('pick', .5); UI.toast(`+1 ${RES_NAME[dep.type]}`, 900); if (dep.type === 'ore' && G.q.stage === 3) { G.q.n++; G.updObjective(); if (G.q.n >= 8) G.setStage(4); } applyMined(dep); } }
    } else { E.mineT = 0; loopTo('mine', 0, .05); if (laser) laser.visible = laserGlow.visible = false; }
    UI.prompt(prompt ? (G.mode === 'pc' && act ? 'E  ' : '') + prompt : '');
  }
  // flares
  if (IN.take('flare')) { if (G.p.flares > 0) { G.p.flares--; sfx('flare'); const g = glow(0xff6a3a, 10, 1); const core = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffd0a0 })); const grp = new THREE.Group(); grp.add(g); grp.add(core); grp.position.copy(camS.position).addScaledVector(fwd, 1); SP.scene.add(grp); G.flares.push({ g: grp, v: fwd.clone().multiplyScalar(16).add(E.vel), t: 0 }); if (P.on && P.pos.distanceTo(E.pos) < 55) { P.state = 'flee'; P.fleeT = 0; } } else { sfx('deny'); UI.toast('No flares left. The fabricator makes them from deepglass.'); } }
  for (let i = G.flares.length - 1; i >= 0; i--) { const f = G.flares[i]; f.t += dt; f.g.position.addScaledVector(f.v, dt); f.v.multiplyScalar(1 - Math.min(1, dt * 1.5)); f.g.children[0].scale.setScalar(9 + Math.random() * 3); if (f.t > 25) { SP.scene.remove(f.g); G.flares.splice(i, 1); } }
  // light pool: nearest lanterns / flares
  const lights = []; for (const b of G.bases) if (b.type === 'lantern') lights.push([b.pos.clone().setY(b.pos.y + 2.5), 0xffd9a0, 55]); for (const f of G.flares) lights.push([f.g.position, 0xff7a40, 70]);
  lights.sort((x, y) => x[0].distanceToSquared(E.pos) - y[0].distanceToSquared(E.pos)); SP.lanternPool.forEach((L, i) => { const l = lights[i]; if (l) { L.position.copy(l[0]); L.color.setHex(l[1]); L.intensity = l[2]; } else L.intensity = 0; });
  updatePale(dt, E, fwd, prox);
}
function makeLaser() { const geo = new THREE.CylinderGeometry(.025, .025, 1, 6); geo.rotateX(Math.PI / 2); laser = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); laserGlow = glow(0xffa060, 2, 1); SP.scene.add(laser); SP.scene.add(laserGlow); }
function updatePale(dt, E, fwd, prox) {
  const P = SP.pale, g = P.g;
  if (!P.on) { if (E.t > P.spawnAt) { P.on = true; P.state = 'approach'; P.t = 0; const a = -E.yaw - Math.PI / 2 + (Math.random() - .5) * 1.2; P.pos.copy(E.pos).add(new THREE.Vector3(Math.cos(a) * 28, 2 + (Math.random() - .5) * 4, Math.sin(a) * 28)); P.fade = 0; g.visible = true; sfx('swell', .8); } else { loopTo('growl', 0); loopTo('whisper', 0); $('#vign').style.opacity = 0; $('#static').style.opacity = 0; AU.tension = 0; UI.warn(E.o2 / G.o2Max() < .25 ? 'OXYGEN LOW' : ''); return; } }
  P.fade = Math.min(1, (P.fade || 0) + dt / 5); for (const m of P.mats) m.opacity = P.fade * P.fade * (3 - 2 * P.fade); if (P.aura) P.aura.material.opacity = .16 * P.fade;
  P.t += dt; const toP = E.pos.clone().sub(P.pos); const d = toP.length(); toP.divideScalar(d || 1);
  const seen = fwd.dot(toP.clone().negate()) > Math.cos(.38) && d < 45;
  let speed = (1.4 + Math.min(3.6, P.t * .045)) * (G.up.lamp ? .75 : 1) * (seen ? .45 : 1);
  const safe = safeZone(E.pos);
  if (P.state === 'flee') { P.fleeT += dt; P.pos.addScaledVector(toP, -7 * dt); if (P.fleeT > 9) { P.state = 'approach'; P.t = Math.min(P.t, 20); } }
  else if (safe) { const ds = P.pos.distanceTo(safe); const keep = 20; if (ds > keep + 1) P.pos.addScaledVector(toP, speed * dt); else { const side = new THREE.Vector3(-toP.z, 0, toP.x); P.pos.addScaledVector(side, dt * 1.2); P.pos.addScaledVector(P.pos.clone().sub(safe).normalize(), (keep - ds) * dt); } P.safeT = (P.safeT || 0) + dt; if (P.safeT > 30) { P.on = false; g.visible = false; P.spawnAt = E.t + 20 + Math.random() * 15; P.safeT = 0; } }
  else { P.safeT = 0; P.pos.addScaledVector(toP, speed * dt); if (d > 170) { const a = Math.random() * TAU; P.pos.copy(E.pos).add(new THREE.Vector3(Math.cos(a) * 120, 0, Math.sin(a) * 120)); } if (d < 2.4) G.caught(); }
  // look and move like something wrong
  g.position.copy(P.pos); g.position.y += Math.sin(P.t * .9) * .25 - 2.4; g.lookAt(E.pos.x, g.position.y, E.pos.z);
  // animation: slow wrong walk, stops dead and twitches when looked at, reaches out when close
  const want = seen ? 'idle' : (d < 10 ? 'sad_pose' : 'walk');
  if (P.cur !== want && P.act[want]) { const a = P.act[want], o = P.act[P.cur]; a.reset(); a.play(); if (o) a.crossFadeFrom(o, seen ? .15 : .9, true); P.cur = want; }
  P.act.walk.timeScale = .25 + speed * .06;
  P.mixer.update(dt);
  if (P.head) { g.updateMatrixWorld(true); const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion); P.tw = seen && Math.random() < .1 ? (Math.random() - .5) * 1.6 : (P.tw || 0) * .85; turnBone(P.head, fw, Math.sin(P.t * .4) * .35 + P.tw); }
  SP.monLight.position.copy(g.position).y += 3; SP.monLight.intensity = 3 + prox * 6;
  // fear
  $('#vign').style.opacity = (prox * .95).toFixed(3);
  const st = $('#static'); st.style.opacity = (Math.max(0, prox - .35) * .3).toFixed(3); if (prox > .35) { const x = st.getContext('2d'); const id = x.createImageData(160, 90); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }
  loopTo('growl', Math.pow(prox, 1.5) * .45); loopTo('whisper', prox * .3); AU.tension = prox;
  setMood(prox > .5 ? 'dread' : 'eva');
  if (prox > .15) { E.heartT -= dt; if (E.heartT <= 0) { E.heartT = lerp(1.3, .42, prox); sfx('heart', .5 + prox * .5); } }
  if (prox > .6) UI.warn('IT IS CLOSE'); else UI.warn(E.o2 / G.o2Max() < .25 ? 'OXYGEN LOW' : '');
}
function drawCompass(target, E) {
  const c = $('#cmp'), x = c.getContext('2d'); x.clearRect(0, 0, 44, 44); const to = target.clone().sub(E.pos); const d = to.length();
  const ang = Math.atan2(to.x, to.z) - (E.yaw + Math.PI); x.save(); x.translate(22, 22); x.rotate(-ang); x.fillStyle = '#8fd0d8'; x.beginPath(); x.moveTo(0, -16); x.lineTo(9, 10); x.lineTo(0, 5); x.lineTo(-9, 10); x.closePath(); x.fill(); x.restore();
  const v = `Airlock ${Math.round(d)} m${Math.abs(to.y) > 6 ? (to.y > 0 ? ', above' : ', below') : ''}`; const t = $('#cmpT'); if (t._v !== v) { t._v = v; t.textContent = v; }
}
function openBuildMenu() {
  const b = UI.panel('Build', `<div style="color:#93a4aa;font-size:12px;margin-bottom:6px">Materials come from your suit cargo first, then the ship's stores.</div>` + BUILD.map((m, i) => `<div class="row"><div class="d">${m.name}<small>${m.desc}</small></div><span class="cost">${UI.costHtml(m.cost)}</span><button data-i="${i}" ${G.canPay(m.cost) ? '' : 'disabled'}>Choose</button></div>`).join(''), () => { if (!ghost) { G.building = false; G.refreshTouch(); } });
  b.querySelectorAll('button[data-i]').forEach(btn => btn.onclick = () => { ghostType = +btn.dataset.i; ghostOff(); ghost = makeModule(BUILD[ghostType].id); ghost.traverse(o => { if (o.isMesh) o.material = modMats().ghostOk; if (o.isSprite) o.visible = false; }); SP.scene.add(ghost); G.ghostDist = 7; UI.closePanel(); G.building = true; G.refreshTouch(); });
}
function updateBuild(dt, fwd) {
  if (!ghost) { G.building = false; G.refreshTouch(); return; }
  const E = G.e; const def = BUILD[ghostType]; let p = E.pos.clone().addScaledVector(fwd, G.ghostDist || 7);
  // aim at a structure or rock within reach and the part sits on its surface
  { const [st, sd] = nearestSite(E.pos); if (st && sd < 400) { if (!G._ray) G._ray = new THREE.Raycaster(); const rc = G._ray; rc.set(E.pos, fwd); rc.far = 16; const hits = rc.intersectObjects(st.surf.concat(SP.rockIMs || []), false); if (hits[0]) { const h = hits[0]; const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : fwd.clone().negate(); if (h.instanceId !== undefined) { const m4 = new THREE.Matrix4(); h.object.getMatrixAt(h.instanceId, m4); n.copy(h.face.normal).transformDirection(m4); } p = h.point.clone().addScaledVector(n, .6); G.ghostSnap = true; } else G.ghostSnap = false; } }
  if (IN.hold.up && G.mode === 'mobile') { } // up/down move the suit while building
  const snap = G.ghostSnap ? .01 : def.id === 'floor' || def.id === 'wall' ? 2 : .5; p.set(Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap, Math.round(p.z / snap) * snap);
  ghost.position.copy(p); ghost.rotation.y = ghostRot;
  if (IN.take('rot')) { ghostRot += Math.PI / 2; sfx('ui'); }
  let ok = G.canPay(def.cost), why = ok ? '' : 'Not enough materials';
  const [site, sd] = nearestSite(p); if (def.id === 'extractor' && sd > 320) { ok = false; why = 'Extractors must be built near a site'; }
  const mat = ok ? modMats().ghostOk : modMats().ghostNo; ghost.traverse(o => { if (o.isMesh) o.material = mat; });
  if (why) UI.warn(why); else UI.warn('');
  if (IN.take('fire') || IN.take('use')) {
    if (!ok) { sfx('deny'); UI.toast(why); }
    else { G.pay(def.cost); placeBase(def.id, p.clone(), ghostRot); sfx('place'); UI.toast(def.name + ' built'); if (def.id === 'lantern' && G.q.stage === 6) G.setStage(7); if (def.id === 'extractor' && G.q.stage === 7) G.setStage(8); G.save(); if (!G.canPay(def.cost)) UI.toast('Out of materials for another ' + def.name, 2000); }
  }
  if (IN.take('remove')) {
    let best = null, bd = 9; for (const b of G.bases) { tmpV.copy(b.pos).sub(E.pos); const t = tmpV.dot(fwd); if (t < 0 || t > 10) continue; const dd = Math.sqrt(Math.max(0, tmpV.lengthSq() - t * t)); if (dd < 2.5 && t < bd) { bd = t; best = b; } }
    if (best) { SP.scene.remove(best.g); G.bases.splice(G.bases.indexOf(best), 1); const c = BUILD.find(x => x.id === best.type).cost; for (const k in c) G.res[k] += Math.floor(c[k] / 2); sfx('clunk'); UI.toast('Removed. Half the materials went back to the stores.'); G.save(); } else { sfx('deny'); UI.toast('Look at a base part to remove it.'); }
  }
}

// ---------- map ----------
function drawMap() {
  const c = $('#map'), x = c.getContext('2d'), W = 170, sc = W / 2 / 1100; const S = G.ship;
  x.clearRect(0, 0, W, W); x.save(); x.translate(W / 2, W / 2);
  x.strokeStyle = 'rgba(143,208,216,.15)'; for (const r of [.33, .66, 1]) { x.beginPath(); x.arc(0, 0, W / 2 * r - 1, 0, TAU); x.stroke(); }
  const col = { ore: '#d08a50', ice: '#a8d8f0', glass: '#b08af0', wreck: '#c8c8c8' };
  const P = p => [(p.x - S.pos.x) * sc, (p.z - S.pos.z) * sc];
  const edge = (px, py) => { const l = Math.hypot(px, py), m = W / 2 - 6; return l > m ? [px / l * m, py / l * m, true] : [px, py, false]; };
  for (const s of SP.sites) { if (!s.known) continue; let [px, py, e] = edge(...P(s.c)); x.fillStyle = col[s.type]; x.globalAlpha = e ? .5 : 1; x.fillRect(px - 3, py - 3, 6, 6); if (s.base) { x.strokeStyle = '#ffd890'; x.strokeRect(px - 5, py - 5, 10, 10); } }
  x.globalAlpha = 1;
  if ((G.flags.samplesIn || 0) >= 3) for (const s of SP.sites) for (const d of s.deps) if (d.type === 'samples' && d.amt > 0) { const [px, py, e] = edge(...P(d.wp)); if (!e) { x.fillStyle = '#7af0a0'; x.beginPath(); x.arc(px, py, 2, 0, TAU); x.fill(); } }
  for (const b of G.bases) if (b.type === 'beacon') { const [px, py] = edge(...P(b.pos)); x.fillStyle = '#ff6a50'; x.beginPath(); x.arc(px, py, 3, 0, TAU); x.fill(); }
  if (G.q.stage >= 9) { const [px, py] = edge(...P(SP.lighthouse.p)); x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(px, py, 4, 0, TAU); x.fill(); }
  { const [bx, by] = P(SP.bubC); x.strokeStyle = 'rgba(90,200,240,.6)'; x.lineWidth = 2; x.beginPath(); x.arc(bx, by, SP.bubR * sc, 0, TAU); x.stroke(); x.lineWidth = 1; }
  x.rotate(-S.yaw); x.fillStyle = '#e8f6f8'; x.beginPath(); x.moveTo(0, -8); x.lineTo(5, 6); x.lineTo(0, 3); x.lineTo(-5, 6); x.closePath(); x.fill();
  x.restore(); x.fillStyle = 'rgba(200,220,225,.6)'; x.font = '10px sans-serif'; x.fillText('N', W / 2 - 3, 11);
}
function lighthouseStory() {
  UI.panel('The lighthouse', `<div style="line-height:1.6">The lamp is lit. Nobody is there.<br><br>The radio clicks, and a voice comes through, very faint and very calm: <i>"Keep the light on. They come when it goes out."</i><br><br>Ilse logs the position. The Depths keep going, deeper than any chart. There is more out there.</div>`);
  sfx('ping');
}
function gameOver() {
  G.state = 'over'; G.refreshTouch(); for (const k in AU.loops) loopTo(k, 0); if (document.pointerLockElement) { UI.noPauseOnUnlock = true; document.exitPointerLock(); }
  const o = $('#over'); o.classList.remove('hidden'); o.innerHTML = `<h2>THE ASTER VANE IS LOST</h2><div>The hull gave way somewhere in the Depths.</div><div class="seg"><button id="ovL">Load last save</button><button id="ovT">Title screen</button></div>`;
  o.querySelector('#ovL').onclick = () => { o.classList.add('hidden'); G.state = 'ship'; G.start(true); };
  o.querySelector('#ovT').onclick = () => { o.classList.add('hidden'); G.toTitle(); };
}

// ---------- title ----------
function titleMenu() {
  const m = $('#tmenu'); m.innerHTML = ''; const add = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { auInit(); sfx('ui'); f(); }; m.appendChild(b); };
  if (G.hasSave()) add('Continue', () => G.start(true));
  add('New game', () => { if (G.hasSave()) { const b = UI.panel('New game', `<div style="margin-bottom:12px">Start a new game? Your saved game will be replaced.</div><div class="seg"><button id="ngY">Start new game</button><button id="ngN">Cancel</button></div>`); b.querySelector('#ngY').onclick = () => { UI.closePanel(); try { localStorage.removeItem('thedepths-save'); } catch (e) { } G.start(false); }; b.querySelector('#ngN').onclick = () => UI.closePanel(); } else G.start(false); });
  add('Settings', () => UI.settings());
  add('How to play', () => UI.help());
  $('#topts').innerHTML = '';
}

// ---------- main loop ----------
let last = 0, titleT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; const t = now / 1000;
  const st = G.state; const run = !G.paused && G.inPlay();
  if (run) G.time += dt;
  { const k = IN.keys, v = 650 * dt * IN.sens; if (k.ArrowLeft) IN.mx -= v; if (k.ArrowRight) IN.mx += v; if (k.ArrowUp) IN.my -= v * .7; if (k.ArrowDown) IN.my += v * .7; }
  updateWorldAnim(dt, t);
  if (st === 'title' || st === 'over') {
    titleT += dt; if (st === 'title') { const a = titleT * .05; SP.ship.position.set(0, 0, 0); SP.ship.rotation.set(0, 0, 0); SP.ship.updateMatrixWorld(); camS.position.set(Math.cos(a) * 260 + 40, 45 + Math.sin(a * .7) * 20, Math.sin(a) * 260 + 120); camS.lookAt(0, 0, 110); SP.scene.fog.density = .00008; if (window.DBG) { camS.position.copy(DBG.p); camS.lookAt(DBG.l); } }
    updateDust(camS.position, 160); R.clear(); renderSpace(); return;
  }
  if (run) {
    if (st !== 'eva') updateFlight(dt, st === 'helm'); else { G.ship.vel.set(0, 0, 0); G.ship.speed = 0; G.noise = 0; loopTo('engine', .05); }
    updateGulpers(dt); updateExtractors(dt);
    if (st === 'ship') { updateShipWalk(dt); G.updAirlock(dt); }
    if (st === 'helm') {
      const [dx, dy] = lookInput(.8); G.camYaw = clamp((G.camYaw || 0) - dx, -2.6, 2.6); G.camPitch = clamp((G.camPitch || .2) + dy * .6, -.3, 1.1);
      if (IN.take('view')) { G.view = G.view === 'out' ? 'bridge' : 'out'; sfx('ui'); }
      if (IN.take('use') || IN.take('leave')) G.leaveHelm();
      IN.take('bag') && UI.showBag();
      if (G.hunted) { UI.warn('SOMETHING IS FOLLOWING THE SHIP'); setMood('dread'); } else { UI.warn(''); setMood('helm'); }
      if (G.state === 'helm') { let near = ''; for (const s of SP.sites) if (s.c.distanceTo(G.ship.pos) < 330) near = s.name; UI.prompt(near ? near + (G.ship.speed > 2.5 ? ' nearby. Stop the ship to go outside.' : '. Ship stopped. You can go out the airlock.') : ''); }
    }
    if (st === 'eva') updateEVA(dt);
    if (st !== 'eva') { G.e = null; AU.tension = lerp(AU.tension, 0, dt); $('#vign').style.opacity = 0; $('#static').style.opacity = 0; }
    if (st === 'ship') { loopTo('hum', .1); } else loopTo('hum', st === 'helm' && G.view === 'bridge' ? .08 : 0);
    if (st === 'ship' && G.hunted) UI.warn('SOMETHING IS FOLLOWING THE SHIP'); else if (st === 'ship') UI.warn('');
    if (G.time - (G._autosave || 0) > 60 && st !== 'eva') { G._autosave = G.time; G.save(); }
  }
  // HUD
  UI.res();
  if (st === 'ship') UI.bars([['Health', G.p.hp / 100, Math.round(G.p.hp)], ['Hull', G.ship.hull / G.ship.hullMax, Math.round(G.ship.hull)]]);
  if (st === 'helm') { UI.bars([['Hull', G.ship.hull / G.ship.hullMax, Math.round(G.ship.hull)], ['Speed', G.ship.speed / 110, Math.round(G.ship.speed) + ' m/s', '#c8d8dc']]); drawMap(); $('#cross').classList.toggle('hidden', G.view === 'out'); }
  if (st === 'eva' && G.e) UI.bars([['Oxygen', G.e.o2 / G.o2Max(), Math.round(G.e.o2 / G.o2Max() * 100) + '%'], ['Health', G.p.hp / 100, Math.round(G.p.hp)], ['Cargo', G.cargoN() / G.cargoMax(), G.cargoN() + '/' + G.cargoMax(), '#c8d8dc'], ['Flares', Math.min(1, G.p.flares / 6), G.p.flares, '#ff9a6a']]);
  // render
  let shake = G.shake || 0; G.shake = Math.max(0, shake - dt * 1.5);
  R.clear();
  if (st === 'ship' || (st === 'helm' && G.view === 'bridge')) {
    if (st === 'helm') { camI.position.set(0, 1.62, -31.9); camI.rotation.set(.02 - (G.camPitch - .22) * .5, Math.PI * 0 + G.camYaw * .6, 0); }
    if (shake) { camI.position.x += (Math.random() - .5) * shake * .08; camI.position.y += (Math.random() - .5) * shake * .08; }
    updateNPCs(dt, t, G.p.x, G.p.z); for (const f of INT.anim) f(t); updateDoors(run ? dt : 0); updateInteriorLights();
    // the view outside through the windows
    SP.ship.updateMatrixWorld(); camS.position.copy(camI.position).applyMatrix4(SP.ship.matrixWorld); SP.ship.getWorldQuaternion(tmpQ); camS.quaternion.copy(tmpQ).multiply(camI.quaternion);
    SP.scene.fog.density = .00008;
    for (const o of SP.habParts) o.visible = false; SP.suitLamp.intensity = 0; updateDust(camS.position, 160); renderSpace(); for (const o of SP.habParts) o.visible = true;
    R.clearDepth(); R.render(INT.scene, camI);
  } else if (st === 'helm') {
    const S = G.ship; const yaw = S.yaw + (G.camYaw || 0); const dist = 1250, pitch = G.camPitch; const back = new THREE.Vector3(Math.sin(S.yaw), 0, Math.cos(S.yaw));
    const target = S.pos.clone().addScaledVector(back, 420); target.y += 20;
    const want = target.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist));
    if (!G._camInit) { camS.position.copy(want); G._camInit = true; } camS.position.lerp(want, Math.min(1, dt * 3)); camS.lookAt(target.clone().addScaledVector(back, -150));
    if (shake) camS.position.add(new THREE.Vector3((Math.random() - .5) * shake * 2, (Math.random() - .5) * shake * 2, 0));
    SP.scene.fog.density = .00008; updateDust(camS.position, 160); renderSpace();
  } else if (st === 'eva') {
    if (shake) camS.position.x += (Math.random() - .5) * shake * .1;
    updateDust(camS.position, 30); renderSpace();
  }
}

function renderSpace() {
  const c = camS.position, eva = G.state === 'eva', range = eva ? 520 : 6000; const far = eva ? 1200 : 9000;
  if (camS.far !== far) { camS.far = far; camS.updateProjectionMatrix(); }
  SP.dome.scale.setScalar(far * .92); SP.dome.material.uniforms.fm.value = eva ? 1 : 0;
  SP.bubble.material.uniforms.cam.value.copy(c); SP.bubble.material.uniforms.trick.value = eva ? 1 : 0; SP.bubble.material.uniforms.t.value = G.time;
  for (const d of SP.decor) d.g.visible = d.p.distanceTo(c) < range + d.r;
  for (const s of SP.sites) s.group.visible = s.c.distanceTo(c) < (eva ? range : 4000) + 200;
  for (const g of SP.gulpers) g.g.visible = g.pos.distanceTo(c) < range + 200;
  for (const j of SP.drifters) j.g.visible = j.g.position.distanceTo(c) < range;
  for (const b of G.bases || []) b.g.visible = b.pos.distanceTo(c) < (eva ? range : 1500);
  SP.dome.position.copy(c);
  // past the fog wall you are blind: thick white fog
  { const out = clamp((c.distanceTo(SP.bubC) - SP.bubR + 120) / 420, 0, 1); SP.scene.fog.color.copy(eva ? FOG_EVA : FOG_SPACE).lerp(WHITE_FOG, out); FOG_COL.copy(SP.scene.fog.color); SP.scene.background.copy(FOG_COL);
    if (out > 0) { SP.scene.fog.density = Math.max(SP.scene.fog.density, out * .03); SP.dome.material.uniforms.fm.value = Math.max(SP.dome.material.uniforms.fm.value, out); }
    SP.bubble.visible = out < 1; }
  R.render(SP.scene, camS);
}
// ---------- boot ----------
async function boot() {
  try { const s = JSON.parse(localStorage.getItem('thedepths-settings')); if (s) Object.assign(G.set, s); else G.set.gfx = 'high'; G.set.mode = 'mobile'; } catch (e) { }
  initRenderer();
  makeTextures(G.set.gfx !== 'low');
  await loadModels();
  buildInterior(); buildNPCs(); buildSpace();
  INT.outerDoor.want = 0; INT.innerDoor.want = 0;
  G.newState(); G.applySettings(); setupTouch();
  $('#load').classList.add('hidden'); G.toTitle();
  // warm up shaders
  R.compile(SP.scene, camS); R.compile(INT.scene, camI);
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { G.save(); if (AU.ctx) AU.ctx.suspend(); } else if (AU.ctx && G.inPlay()) AU.ctx.resume(); });
  addEventListener('pagehide', () => G.save());
}
setTimeout(() => boot().catch(e => { $('#load').textContent = 'COULD NOT START: ' + e.message; console.error(e); }), 30);
if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { });
