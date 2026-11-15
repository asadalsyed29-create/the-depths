// ---------- crew members ----------
const NPCS = [
  { id: 'varga', name: 'Ilse Varga', role: 'Navigator', x: -4.6, z: -29.5, yaw: .6, look: { female: 1, tint: 0x6a86b0 } },
  { id: 'okafor', name: 'Tomas Okafor', role: 'Chief Engineer', x: -5.5, z: 30.5, yaw: 1.2, look: { tint: 0xd08850, wide: 1.08 } },
  { id: 'hartley', name: 'Dr. Mei Hartley', role: 'Medical Officer', x: 7.5, z: -18.5, yaw: -1.2, look: { female: 1, tint: 0xffffff, tall: .97 } },
  { id: 'benny', name: 'Benny Salas', role: 'Cook', x: -8, z: .5, yaw: Math.PI, look: { tint: 0xe8e2d4, wide: 1.15, tall: .97 }, path: [[-8, .3], [-5.5, .3]] },
  { id: 'pryce', name: 'Dr. Anwen Pryce', role: 'Xenobiologist', x: 8.6, z: -5, yaw: -1.5, look: { female: 1, tint: 0x9ad0b0, tall: 1.02 } },
  { id: 'rook', name: 'Hal Rook', role: 'Quartermaster', x: -5, z: 8.5, yaw: -1.2, look: { tint: 0xb09070, wide: 1.05 } },
  { id: 'pell', name: 'Pell Arden', role: 'Hydroponics', x: -7.5, z: 19, yaw: 1.6, look: { tint: 0x80b8a8, tall: .95 } },
];
function buildNPCs() {
  for (const n of NPCS) {
    const P = makeCrew(n.look); P.g.position.set(n.x, 0, n.z); P.g.rotation.y = n.yaw; INT.scene.add(P.g);
    const N = { ...n, P, yaw0: n.yaw, ph: Math.random() * 10, walkT: 0, wi: 0, talkT: 0 };
    INT.npcs.push(N);
    interact(n.x, n.z, 2.5, () => 'Talk to ' + n.name, () => Dialog.open(N), 1.5);
    N.inter = INT.inter[INT.inter.length - 1];
  }
}
const UPY = new THREE.Vector3(0, 1, 0);
function updateNPCs(dt, t, px, pz) {
  for (const N of INT.npcs) {
    const P = N.P, g = P.g; let moving = false;
    if (N.path && !(Dialog.cur === N)) {
      const tg = N.path[N.wi]; const dx = tg[0] - g.position.x, dz = tg[1] - g.position.z, d = Math.hypot(dx, dz);
      if (d < .1) { N.walkT += dt; if (N.walkT > 4) { N.walkT = 0; N.wi = (N.wi + 1) % N.path.length; } }
      else { g.position.x += dx / d * dt * 1.1; g.position.z += dz / d * dt * 1.1; N.yaw = Math.atan2(dx, dz); moving = true; }
      N.inter.x = g.position.x; N.inter.z = g.position.z;
    }
    const dx = px - g.position.x, dz = pz - g.position.z, d = Math.hypot(dx, dz);
    let targetYaw = N.yaw; if ((d < 4 && !moving) || Dialog.cur === N) targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 2.5);
    // animation: walk, talk gestures, idle
    const talking = Dialog.cur === N && Dialog.typing;
    if (moving) crewPlay(P, 'walk', .3);
    else if (talking) { N.talkT -= dt; if (N.talkT <= 0 || (P.cur !== 'agree' && P.cur !== 'headShake')) { N.talkT = 2.2; crewPlay(P, Math.random() < .7 ? 'agree' : 'headShake', .5); } }
    else crewPlay(P, 'idle', .6);
    if (d < 25) {
      P.mixer.update(dt);
      // look at the player (head turns a little on top of the animation)
      if (P.head && d < 5) { let a = Math.atan2(dx, dz) - g.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); N.look = lerp(N.look || 0, clamp(a, -1, 1), Math.min(1, dt * 4)); } else N.look = lerp(N.look || 0, 0, Math.min(1, dt * 3));
      if (P.head) turnBone(P.head, UPY, N.look * .8);
    }
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
    fly: { t: () => (G.mode === 'pc' ? 'Sit at the helm. W and S for thrust, A and D to turn, Space and C to climb and dive, Shift to boost. Press E to stand up again.' : 'Sit at the helm. The left stick steers and pushes us forward. Up and Down climb and dive. She is big, but she is quick. Tap Leave to stand up again.') + ' And keep an eye out. The big things out here hunt anything that comes close. If one starts following us, fly away until it loses us.', c: [{ t: 'Got it.', go: 'start' }] },
    where: { t: 'There is a rock field about four hundred meters ahead. I have marked it on the helm map. Ore for Okafor\'s repairs. The pale fields give ice, the violet gardens give deepglass, and the wrecks give scrap. And other things.', act: () => { if (G.q.stage === 0) G.setStage(1); }, c: [{ t: 'Back.', go: 'start' }] },
  }),
  okafor: () => ({
    start: { t: G.ship.hull < G.ship.hullMax ? `Hull is at ${Math.round(G.ship.hull / G.ship.hullMax * 100)} percent. Every creak out there is a new crack in here.` : 'Reactor is purring. Which usually means something is about to break.',
      c: [{ t: 'Install the Hyperspeed Dash Core.', if: () => G.q.stage === 12 || G.q.stage === 15, go: 'install' }, { t: 'Brace the hull for the Heart (25 ore, 12 deepglass)', if: () => G.q.stage === 18, go: 'brace' }, { t: 'Repair the hull (5 ore, 3 scrap)', if: () => G.ship.hull < G.ship.hullMax, go: 'repair' }, { t: 'What can the workshop make?', go: 'fab' }, { t: 'Tell me about the engines.', go: 'eng' }, { t: 'Bye, Tomas.', end: 1 }] },
    repair: { t: () => { if (G.pay({ ore: 5, scrap: 3 })) { G.ship.hull = Math.min(G.ship.hullMax, G.ship.hull + 35); sfx('place'); if (G.q.stage === 4) G.setStage(5); return 'Done. Plates welded, seams sealed. She will hold. For now.'; } return 'I need five ore and three scrap in the cargo hold. I cannot weld wishes, Captain.'; }, c: [{ t: 'Back.', go: 'start' }] },
    install: { t: () => G.q.stage === 12 ? 'So that is what all those pieces were. It fits the drive like it was made for her. Captain, when I close this panel, hold on to something. I have no idea what happens next.' : 'Second core. Darker than the first. It hums at a pitch I can feel in my teeth. Wherever this one takes us, it is the last stop. Hold on.', c: [{ t: 'Do it.', end: 1, act: () => { const st = G.q.stage; setTimeout(() => dashTo(st === 12 ? 'abyss' : 'heart', () => G.setStage(st === 12 ? 13 : 16)), 300); } }, { t: 'Not yet.', go: 'start' }] },
    brace: { t: () => { if (G.pay({ ore: 25, glass: 12 })) { G.ship.hullMax = 140; G.ship.hull = 140; sfx('place'); G.setStage(19); return 'Deepglass ribs under every plate. She will take whatever that light throws at her. Fly us in, Captain.'; } return 'Twenty-five ore and twelve deepglass. I will not take her into that light with anything less.'; }, c: [{ t: 'Back.', go: 'start' }] },
    fab: { t: 'The fabricator in the Workshop builds suit and ship upgrades. Bigger oxygen tanks, thruster packs, flares, shadow coils for the hull. You bring materials, it does the rest.', c: [{ t: 'Back.', go: 'start' }] },
    eng: { t: 'Twelve thousand tonnes of ship and the loudest part is the drive. Out here, big things come for anything that moves. Shadow coils from the fabricator make her harder to notice.', c: [{ t: 'Back.', go: 'start' }] },
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
    give: { t: () => { const n = G.res.samples; G.res.samples = 0; if (G.q.stage === 17) { G.flags.heartS = (G.flags.heartS || 0) + n; if (G.flags.heartS >= 4) { setTimeout(() => G.setStage(18), 400); return 'These are not samples. They are seeds, and they are all pointing the same way. Toward the Heart. Captain, the Heart is not a place. It is asleep. Ask Okafor to brace the hull, and then we wake it.'; } G.updObjective(); return 'From the Heart. Warm, still. I need more of them to understand the pattern.'; } const before = G.flags.samplesIn || 0; G.flags.samplesIn = before + n; const now = G.flags.samplesIn; let s = 'Remarkable. They are breathing. Very slowly, but they are breathing.'; if (before < 1 && now >= 1) s += ' I have sent the fabricator a pattern for a suit fog lamp. It should make you harder to find.'; if (before < 3 && now >= 3) { s += ' And with three, I can tune a deep scanner. Samples will show on the helm map now.'; if (G.q.stage === 8) G.setStage(9); } if (before < 5 && now >= 5) s += ' Five. Captain, these are not plants. They are seeds of something much bigger.'; sfx('pick'); return s; }, c: [{ t: 'Back.', go: 'start' }] },
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
    ok2: { t: 'If something big starts following the ship, get us away from it. Please. They do not have eyes. They feel us coming.', c: [{ t: 'Back.', go: 'start' }] },
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
