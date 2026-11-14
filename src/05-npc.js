// ---------- crew members ----------
function makePerson(o) {
  const g = new THREE.Group(); const L = c => new THREE.MeshLambertMaterial({ color: c });
  const suit = L(o.suit), skin = L(o.skin), hair = L(o.hair), boot = L(0x1e1e20), trimM = L(o.trim || 0x2a2d30);
  const w = o.wide || 1, h = o.tall || 1;
  const P = { g };
  const leg = s => { const p = new THREE.Group(); p.position.set(s * .1 * w, .88 * h, 0); g.add(p); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.075 * w, .62 * h, 3, 8), suit); m.position.y = -.42 * h; p.add(m); const b = new THREE.Mesh(new THREE.BoxGeometry(.13 * w, .1, .24), boot); b.position.set(0, -.83 * h, .04); p.add(b); return p; };
  P.legL = leg(-1); P.legR = leg(1);
  const torso = new THREE.Group(); torso.position.y = .9 * h; g.add(torso); P.torso = torso;
  const t = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .3 * h, 4, 10), suit); t.scale.set(1.2 * w, 1, .72 * w); t.position.y = .3 * h; torso.add(t);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(.205 * w, .205 * w, .06, 12), trimM); belt.scale.z = .74; belt.position.y = .08; torso.add(belt);
  if (o.coat) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.21 * w, .26 * w, .55, 12, 1, true), L(o.coat)); c.material.side = THREE.DoubleSide; c.scale.z = .75; c.position.y = -.12; torso.add(c); }
  if (o.apron) { const a = new THREE.Mesh(new THREE.BoxGeometry(.3 * w, .55, .02), L(0xdedad0)); a.position.set(0, .1, .14 * w); torso.add(a); }
  const patch = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .07), L(o.patch || 0xc0a040)); patch.position.set(.21 * w, .45 * h, 0); torso.add(patch);
  const arm = s => { const p = new THREE.Group(); p.position.set(s * .25 * w, .52 * h, 0); torso.add(p); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.055 * w, .48 * h, 3, 8), o.coat ? L(o.coat) : suit); m.position.y = -.28 * h; p.add(m); const hd = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), skin); hd.position.y = -.58 * h; p.add(hd); p.rotation.z = s * .08; return p; };
  P.armL = arm(-1); P.armR = arm(1);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.085, .025, 6, 14), trimM); collar.rotation.x = Math.PI / 2; collar.position.y = .62 * h; torso.add(collar);
  for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(.085 * w, 10, 6, 0, TAU, 0, Math.PI / 2), o.coat ? L(o.coat) : suit); sp.scale.set(1.1, .7, 1); sp.position.set(s * .2 * w, .55 * h, 0); torso.add(sp); const pk = new THREE.Mesh(new THREE.BoxGeometry(.08, .07, .02), trimM); pk.position.set(s * .1 * w, .4 * h, .125 * w); torso.add(pk); }
  const seam = new THREE.Mesh(new THREE.BoxGeometry(.012, .42 * h, .01), trimM); seam.position.set(0, .3 * h, .128 * w); torso.add(seam);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .1, 8), skin); neck.position.y = .66 * h; torso.add(neck);
  const head = new THREE.Group(); head.position.y = .8 * h; torso.add(head); P.head = head;
  const hm = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 12), skin); hm.scale.set(.92, 1.12, 1); head.add(hm);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.018, .05, 5), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.005, .11); head.add(nose);
  const eyeM = L(0x14110f); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.013, 6, 5), eyeM); e.position.set(s * .038, .025, .096); head.add(e); const br = new THREE.Mesh(new THREE.BoxGeometry(.04, .008, .01), hair); br.position.set(s * .038, .05, .1); head.add(br); }
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(.026, 6, 5), skin); ear.scale.set(.5, 1, .8); ear.position.set(s * .1, 0, 0); head.add(ear); }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.035, .006, .01), L(0x5a2a24)); mouth.position.set(0, -.055, .1); head.add(mouth);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), skin); jaw.scale.set(1, .7, .9); jaw.position.set(0, -.06, .02); head.add(jaw);
  if (o.hairStyle !== 'bald') { const hc = new THREE.Mesh(new THREE.SphereGeometry(.118, 14, 10, 0, TAU, 0, o.hairStyle === 'long' ? 1.9 : 1.45), hair); hc.scale.set(.95, 1.12, 1.04); hc.position.set(0, .006, -.008); hc.rotation.x = -.25; head.add(hc); if (o.hairStyle === 'long') { const tail = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .16, 3, 6), hair); tail.position.set(0, -.1, -.1); head.add(tail); } }
  if (o.beard) { const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8, 0, TAU, 1.6, 1.3), hair); b.position.set(0, -.02, .02); b.scale.set(.95, 1.1, 1.05); head.add(b); }
  return P;
}
const NPCS = [
  { id: 'varga', name: 'Ilse Varga', role: 'Navigator', x: -4.6, z: -29.5, yaw: .6, look: { suit: 0x26344c, skin: 0xc9a07e, hair: 0x2e2018, hairStyle: 'long', patch: 0x6fa8d0 } },
  { id: 'okafor', name: 'Tomas Okafor', role: 'Chief Engineer', x: -5.5, z: 30.5, yaw: 1.2, look: { suit: 0xa4552a, skin: 0x5a3a28, hair: 0x111111, hairStyle: 'bald', beard: true, wide: 1.12, patch: 0xd0c040 } },
  { id: 'hartley', name: 'Dr. Mei Hartley', role: 'Medical Officer', x: 7.5, z: -18.5, yaw: -1.2, look: { suit: 0x4a5560, coat: 0xdcdcd4, skin: 0xe2c0a0, hair: 0x15120f, hairStyle: 'long', patch: 0x3a8a6a } },
  { id: 'benny', name: 'Benny Salas', role: 'Cook', x: -8, z: .5, yaw: Math.PI, look: { suit: 0x55595c, apron: true, skin: 0xb88a64, hair: 0x2a1c12, wide: 1.25, patch: 0xc06040 }, path: [[-8, .3], [-5.5, .3]] },
  { id: 'pryce', name: 'Dr. Anwen Pryce', role: 'Xenobiologist', x: 8.6, z: -5, yaw: -1.5, look: { suit: 0x404a44, coat: 0x6f8a78, skin: 0xead2bc, hair: 0x9a3a1e, hairStyle: 'long', patch: 0x8ad0a0 } },
  { id: 'rook', name: 'Hal Rook', role: 'Quartermaster', x: -5, z: 8.5, yaw: -1.2, look: { suit: 0x5a4834, skin: 0xd0a888, hair: 0x8a8a86, beard: true, wide: 1.08, patch: 0xa08040 } },
  { id: 'pell', name: 'Pell Arden', role: 'Hydroponics', x: -7.5, z: 19, yaw: 1.6, look: { suit: 0x35605e, skin: 0xe8c8a8, hair: 0xc8a050, tall: .94, patch: 0x80c060 } },
];
function buildNPCs() {
  for (const n of NPCS) {
    const P = makePerson(n.look); P.g.position.set(n.x, 0, n.z); P.g.rotation.y = n.yaw; INT.scene.add(P.g);
    const N = { ...n, P, yaw0: n.yaw, ph: Math.random() * 10, walkT: 0, wi: 0 };
    INT.npcs.push(N);
    interact(n.x, n.z, 2.5, () => 'Talk to ' + n.name, () => Dialog.open(N), 1.5);
    N.inter = INT.inter[INT.inter.length - 1];
  }
}
function updateNPCs(dt, t, px, pz) {
  for (const N of INT.npcs) {
    const P = N.P, g = P.g; let moving = false;
    if (N.path && !(Dialog.cur === N)) {
      const tg = N.path[N.wi]; const dx = tg[0] - g.position.x, dz = tg[1] - g.position.z, d = Math.hypot(dx, dz);
      if (d < .1) { N.walkT += dt; if (N.walkT > 4) { N.walkT = 0; N.wi = (N.wi + 1) % N.path.length; } }
      else { g.position.x += dx / d * dt * .9; g.position.z += dz / d * dt * .9; N.yaw = Math.atan2(dx, dz); moving = true; }
      N.inter.x = g.position.x; N.inter.z = g.position.z;
    }
    const dx = px - g.position.x, dz = pz - g.position.z, d = Math.hypot(dx, dz);
    let targetYaw = N.yaw; if (d < 4 && !moving) targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 3);
    const b = Math.sin(t * 1.6 + N.ph);
    P.torso.scale.y = 1 + b * .008; P.head.rotation.x = Math.sin(t * .5 + N.ph) * .05; P.head.rotation.y = Math.sin(t * .31 + N.ph) * .15;
    const talk = Dialog.cur === N && Dialog.typing; if (talk) P.head.rotation.x += Math.sin(t * 14) * .03;
    if (moving) { const s = Math.sin(t * 6 + N.ph); P.legL.rotation.x = s * .45; P.legR.rotation.x = -s * .45; P.armL.rotation.x = -s * .35; P.armR.rotation.x = s * .35; }
    else { P.legL.rotation.x *= .85; P.legR.rotation.x *= .85; P.armL.rotation.x = Math.sin(t * .9 + N.ph) * .04; P.armR.rotation.x = -Math.sin(t * .9 + N.ph) * .04; }
  }
}

// ---------- dialogue ----------
const RUMORS = [
  'Pell swears the plants lean toward the hull when something big swims past.',
  'Rook keeps counting the crates. Says one of them hums at night.',
  'There is a lighthouse out there, deep in. Still turning. Nobody has ever seen who lights it.',
  'Okafor says the rings on the drive spine sing when the gulpers pass close.',
  'Ravi never eats here anymore. Says he can still taste the fog.',
];
const TREES = {
  varga: () => ({
    start: { t: G.q.stage === 0 ? 'Captain. We crossed into the Depths an hour ago. Instruments are half blind out here, but the hull sensors still pick up rock and ice.' : ['Holding steady, Captain.', 'The fog is thicker to the north. I would rather not go north.', 'I keep hearing something on the hull mic. It is probably nothing.'][Math.random() * 3 | 0],
      c: [{ t: 'What is this place?', go: 'lore' }, { t: 'How do I fly the ship?', go: 'fly' }, { t: 'Where should we go?', go: 'where' }, { t: 'Carry on.', end: 1 }] },
    lore: { t: 'Nobody agrees. Space just thickens here, like we sailed into the bottom of an ocean. Light dies after a few hundred meters. And things drift in from somewhere. Statues. Doors. A whole lighthouse, once. None of it was built by anyone we know.', c: [{ t: 'Who built them?', go: 'who' }, { t: 'Back.', go: 'start' }] },
    who: { t: 'If you find out, tell me before you tell anyone else.', c: [{ t: 'Back.', go: 'start' }] },
    fly: { t: () => (G.mode === 'pc' ? 'Sit at the helm. W and S for thrust, A and D to turn, Space and C to climb and dive, Shift to boost. Press E to stand up again.' : 'Sit at the helm. The left stick steers and pushes us forward. Up and Down climb and dive, Boost when you need it. Tap Leave to stand up again.') + ' And watch the noise gauge. The big things out here hunt by sound. If something starts following us, cut the engines and let it lose us.', c: [{ t: 'Got it.', go: 'start' }] },
    where: { t: 'There is a rock field about four hundred meters ahead. I have marked it on the helm map. Ore for Okafor\'s repairs. The pale fields give ice, the violet gardens give deepglass, and the wrecks give scrap. And other things.', act: () => { if (G.q.stage === 0) G.setStage(1); }, c: [{ t: 'Back.', go: 'start' }] },
  }),
  okafor: () => ({
    start: { t: G.ship.hull < G.ship.hullMax ? `Hull is at ${Math.round(G.ship.hull / G.ship.hullMax * 100)} percent. Every creak out there is a new crack in here.` : 'Reactor is purring. Which usually means something is about to break.',
      c: [{ t: 'Repair the hull (5 ore, 3 scrap)', if: () => G.ship.hull < G.ship.hullMax, go: 'repair' }, { t: 'What can the workshop make?', go: 'fab' }, { t: 'Tell me about the engines.', go: 'eng' }, { t: 'Bye, Tomas.', end: 1 }] },
    repair: { t: () => { if (G.pay({ ore: 5, scrap: 3 })) { G.ship.hull = Math.min(G.ship.hullMax, G.ship.hull + 35); sfx('place'); if (G.q.stage === 4) G.setStage(5); return 'Done. Plates welded, seams sealed. She will hold. For now.'; } return 'I need five ore and three scrap in the cargo hold. I cannot weld wishes, Captain.'; }, c: [{ t: 'Back.', go: 'start' }] },
    fab: { t: 'The fabricator in the Workshop builds suit and ship upgrades. Bigger oxygen tanks, thruster packs, flares, hush coils for the engines. You bring materials, it does the rest.', c: [{ t: 'Back.', go: 'start' }] },
    eng: { t: 'Twelve thousand tonnes of ship and the loudest part is the drive. Out here, loud is a problem. Things follow noise. Hush coils from the fabricator will quiet her down.', c: [{ t: 'Back.', go: 'start' }] },
  }),
  hartley: () => ({
    start: { t: G.p.hp < 100 ? 'You look terrible, Captain. Sit down.' : 'Clean bill of health. Try to keep it that way.',
      c: [{ t: 'Patch me up.', if: () => G.p.hp < 100, go: 'heal' }, { t: 'What happened to the last EVA crew?', go: 'ravi' }, { t: 'Any advice for spacewalks?', go: 'adv' }, { t: 'Thanks, Doc.', end: 1 }] },
    heal: { t: 'There. Do not make me do that again.', act: () => { G.p.hp = 100; sfx('pick'); }, c: [{ t: 'Back.', go: 'start' }] },
    ravi: { t: 'Ravi came back without his cargo, and without a lot of other things. He said it does not run. It does not need to. It just keeps coming, and the fog comes with it.', c: [{ t: 'How did he survive?', go: 'ravi2' }] },
    ravi2: { t: 'He said light kept it back. Lanterns. Flares. Anything bright. Whatever it is, it does not like to be seen.', c: [{ t: 'Back.', go: 'start' }] },
    adv: { t: 'Watch your oxygen. Stay near light. And if you hear breathing that is not yours, come home.', c: [{ t: 'Back.', go: 'start' }] },
  }),
  benny: () => ({
    start: { t: 'Captain! You are just in time. It is either stew or... well, it is stew.', c: [{ t: 'I will take the stew.', go: 'stew' }, { t: 'Heard any rumors?', go: 'rumor' }, { t: 'Later, Benny.', end: 1 }] },
    stew: { t: () => { if (G.time - (G.flags.stewT || -999) > 120) { G.flags.stewT = G.time; G.p.hp = Math.min(100, G.p.hp + 30); sfx('pick'); return 'Eat up. Nobody survives the Depths on an empty stomach.'; } return 'Second helpings after the next shift, Captain.'; }, c: [{ t: 'Back.', go: 'start' }] },
    rumor: { t: () => RUMORS[(G.flags.rumor = ((G.flags.rumor || 0) + 1)) % RUMORS.length], c: [{ t: 'Another one?', go: 'rumor' }, { t: 'Back.', go: 'start' }] },
  }),
  pryce: () => ({
    start: { t: G.flags.samplesIn ? `Captain. ${G.flags.samplesIn} samples studied so far. Bring me more and I can do more.` : 'Captain, do you know how much we do not know about this place? Everything. We know nothing.',
      c: [{ t: `Hand over samples (${G.res.samples})`, if: () => G.res.samples > 0, go: 'give' }, { t: 'What lives out here?', go: 'life' }, { t: 'What do you need?', go: 'need' }, { t: 'I will leave you to it.', end: 1 }] },
    life: { t: 'Gulpers, mostly. Huge, eyeless, they hunt by vibration. The drifters are harmless, the glowing ones. And then there is the thing in the fog, which I am not allowed to call a ghost.', c: [{ t: 'Back.', go: 'start' }] },
    need: { t: 'Strange samples. Green, glowing pods. They grow on wrecks and in the deepglass gardens. Bring me three and I will make it worth your while.', c: [{ t: 'Back.', go: 'start' }] },
    give: { t: () => { const n = G.res.samples; G.res.samples = 0; const before = G.flags.samplesIn || 0; G.flags.samplesIn = before + n; const now = G.flags.samplesIn; let s = 'Remarkable. They are breathing. Very slowly, but they are breathing.'; if (before < 1 && now >= 1) s += ' I have sent the fabricator a pattern for a suit fog lamp. It should make you harder to find.'; if (before < 3 && now >= 3) { s += ' And with three, I can tune a deep scanner. Samples will show on the helm map now.'; if (G.q.stage === 8) G.setStage(9); } if (before < 5 && now >= 5) s += ' Five. Captain, these are not plants. They are seeds of something much bigger.'; sfx('pick'); return s; }, c: [{ t: 'Back.', go: 'start' }] },
  }),
  rook: () => ({
    start: { t: 'Stores are counted, sorted and judged, Captain.', c: [{ t: 'Show me the stores.', end: 1, act: () => setTimeout(() => UI.showStores(), 50) }, { t: 'How do I build a base?', go: 'base' }, { t: 'Can I have some flares?', go: 'flares' }, { t: 'That is all.', end: 1 }] },
    base: { t: 'Out here, a base is just a promise you make to a rock. Go outside near a site, open the Build menu and place modules. Materials come straight from the ship\'s stores.', c: [{ t: 'What should I build first?', go: 'base2' }] },
    base2: { t: 'Lanterns. Always lanterns first. Then an extractor, it keeps digging while you are away. Oxygen nodes and shelters if you plan to stay. Floors and walls if you want it to feel like home.', act: () => { if (G.q.stage === 5) G.setStage(6); if (!G.flags.flareGift) { G.flags.flareGift = 1; G.p.flares += 2; UI.toast('Received 2 flares'); } }, c: [{ t: 'Back.', go: 'start' }] },
    flares: { t: () => G.p.flares < 1 && !G.flags.flare2 ? (G.flags.flare2 = 1, G.p.flares += 2, UI.toast('Received 2 flares'), 'Two flares. Bring them back unused and I will be very surprised.') : 'The fabricator makes more from deepglass. I am a quartermaster, not a fireworks shop.', c: [{ t: 'Back.', go: 'start' }] },
  }),
  pell: () => ({
    start: { t: 'Oh. Captain. Sorry, I was talking to the tomatoes.', c: [{ t: 'Are you alright?', go: 'ok' }, { t: 'How are the crops?', go: 'crops' }, { t: 'Carry on.', end: 1 }] },
    ok: { t: 'The plants lean toward the hull when something big swims past. All of them, at once. I measured it.', c: [{ t: 'And?', go: 'ok2' }] },
    ok2: { t: 'If the noise gauge on the bridge goes red, stop the engines. Please. They do not have eyes. They listen.', c: [{ t: 'Back.', go: 'start' }] },
    crops: { t: 'Growing. Slowly. Everything is slow down here, except the things that are not.', c: [{ t: 'Back.', go: 'start' }] },
  }),
};
const Dialog = {
  cur: null, typing: false,
  open(N) { this.cur = N; this.tree = TREES[N.id](); G.pause(true, 'dlg'); this.show('start'); if (G.q.stage === 4 && N.id === 'okafor') { } },
  show(k) {
    const n = this.tree[k]; if (!n) return this.close();
    if (n.act) n.act();
    const text = typeof n.t === 'function' ? n.t() : n.t; if (k !== 'start' || true) this.tree = TREES[this.cur.id](); const nn = this.tree[k] || n;
    UI.dialog(this.cur.name, this.cur.role, text, (nn.c || n.c).filter(c => !c.if || c.if()).map(c => ({ t: c.t, f: () => { if (c.act) c.act(); if (c.end) this.close(); else this.show(c.go); } })));
  },
  close() { this.cur = null; UI.dialogClose(); G.pause(false, 'dlg'); },
};
