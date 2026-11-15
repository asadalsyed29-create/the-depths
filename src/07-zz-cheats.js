// ---------- cheats console (for testing) ----------
const CHEAT = { god: false, nomon: false, fast: false };
const CHAPTERS = [[0, 'Start of the game', 'depths'], [9, 'Find the lighthouse', 'depths'], [10, 'Find the core fragments', 'depths'], [12, 'Install the first core', 'depths'],
  [13, 'The Abyss: find fragments', 'abyss'], [15, 'Install the second core', 'abyss'], [16, 'The Heart: light the pillars', 'heart'], [17, 'Bring Pryce samples', 'heart'],
  [18, 'Brace the hull', 'heart'], [19, 'Fly into the Heart', 'heart'], [20, 'After the ending', 'heart']];
function cheatTick() {
  if (CHEAT.god) { G.ship.hull = G.ship.hullMax; G.p.hp = 100; if (G.e) G.e.o2 = G.o2Max(); }
  if (CHEAT.nomon) { const P = SP.pale; if (P.on) { P.on = false; P.g.visible = false; P.fade = 0; loopTo('growl', 0); loopTo('whisper', 0); } if (G.e) P.spawnAt = G.e.t + 1e6; }
}
function cheatGoZone(id) { if (G.zone === id) return; if (G.state === 'eva') G.endEVA(); G.switchZone(id); G.ship.pos.copy(ARRIVE); G.ship.vel.set(0, 0, 0); G.ship.yaw = 0; }
function cheatChapter(st) {
  const c = CHAPTERS.find(x => x[0] === st); cheatGoZone(c[2]);
  if (st >= 19) { G.ship.hullMax = Math.max(G.ship.hullMax, 140); G.ship.hull = G.ship.hullMax; }
  if (st === 20) G.flags.ended = 1; G.setStage(st); if (st === 16) updPillars(); G.refreshTouch(); G.save();
}
function cheatFrags() { const zd = G.zd[G.zone]; zd.frags = SP.sites.filter(s => s.frag).map(s => s.i); applyFrags(); G.fragCheck(); G.save(); }
function cheatNextFrag() {
  const s = SP.sites.find(s => s.frag && s.frag.g.visible); if (!s) return 'No fragments left in this bubble.';
  if (G.state === 'eva') { G.e.pos.copy(s.frag.wp); G.e.vel.set(0, 0, 0); return 'Moved you to the fragment in ' + s.name + '.'; }
  s.known = true; G.ship.pos.copy(s.c).add(new THREE.Vector3(0, 0, 620)); G.ship.vel.set(0, 0, 0); G.ship.yaw = 0; return 'Moved the ship next to ' + s.name + '. Go outside to pick it up.';
}
const CHEAT_CMDS = {
  help: () => 'Commands: god, nomon, fast, give ore 50, give all 100, frags, nextfrag, stage 13, go abyss, map, upgrades, heal, end',
  god: () => (CHEAT.god = !CHEAT.god, 'God mode ' + (CHEAT.god ? 'on' : 'off')),
  nomon: () => (CHEAT.nomon = !CHEAT.nomon, 'No monsters ' + (CHEAT.nomon ? 'on' : 'off')),
  fast: () => (CHEAT.fast = !CHEAT.fast, 'Super speed ' + (CHEAT.fast ? 'on' : 'off')),
  give: (k, n) => { n = +n || 50; const ks = !k || k === 'all' ? ['ore', 'ice', 'glass', 'scrap', 'samples'] : [k === 'deepglass' ? 'glass' : k]; if (ks.some(x => !(x in G.res))) return 'Unknown material. Use ore, ice, glass, scrap, samples or all.'; for (const x of ks) G.res[x] += n; G.save(); return 'Added ' + n + ' ' + ks.join(', '); },
  frags: () => (cheatFrags(), 'All fragments in this bubble collected'),
  nextfrag: () => cheatNextFrag(),
  stage: n => { const c = CHAPTERS.find(x => x[0] === +n); if (!c) return 'Stages: ' + CHAPTERS.map(x => x[0]).join(', '); cheatChapter(+n); return 'Jumped to: ' + c[1]; },
  go: id => { id = (id || '').replace(/^the/, ''); if (!ZONES[id]) return 'Bubbles: depths, abyss, heart'; cheatGoZone(id); G.save(); return 'Now in ' + ZONES[id].name; },
  map: () => { for (const s of SP.sites) s.known = true; return 'Every place is shown on the map'; },
  upgrades: () => { for (const f of FAB) if (f.max) while ((G.up[f.id] || 0) < f.max) f.make(); G.save(); return 'All workshop upgrades made'; },
  heal: () => { G.ship.hull = G.ship.hullMax; G.p.hp = 100; if (G.e) G.e.o2 = G.o2Max(); return 'Hull, health and oxygen full'; },
  end: () => { if (G.zone !== 'heart') cheatGoZone('heart'); G.ship.hullMax = Math.max(G.ship.hullMax, 140); G.setStage(19); UI.closePanel(); G.q.stage = 19.5; heartEnding(); return ''; },
};
function runCheat(line) { const [c, ...a] = line.trim().toLowerCase().split(/\s+/); const f = CHEAT_CMDS[c]; return f ? f(...a) : 'Unknown command. Type help.'; }
UI.cheats = function () {
  const tog = (k, l) => `<div class="row"><div class="d">${l}</div><button data-t="${k}">${CHEAT[k] ? 'On' : 'Off'}</button></div>`;
  const btn = (c, l) => `<div class="row"><div class="d">${l}</div><button data-c="${c}">Do it</button></div>`;
  const b = this.panel('Cheats', `<div class="lbl">CONSOLE</div><div style="display:flex;gap:8px"><input id="chIn" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type a command, or help" style="flex:1;min-width:0;padding:8px;background:#0d1417;color:#dfe8ea;border:1px solid #3a4a50;font:inherit"><button id="chGo">Run</button></div><div id="chOut" style="color:#9ab;font-size:13px;min-height:18px;margin:6px 0 4px"></div>
    <div class="lbl">TOGGLES</div>${tog('god', 'God mode (no damage, endless oxygen)')}${tog('nomon', 'No monsters')}${tog('fast', 'Super speed (ship and suit)')}
    <div class="lbl">QUICK</div>${btn('give all 100', 'Add 100 of every material')}${btn('frags', 'Collect all core fragments in this bubble')}${btn('nextfrag', 'Move to the next core fragment')}${btn('map', 'Show every place on the map')}${btn('upgrades', 'Make all workshop upgrades')}${btn('heal', 'Fill hull, health and oxygen')}
    <div class="lbl">GO TO BUBBLE</div><div class="seg">${ZONE_ORDER.map(id => `<button data-c="go ${id}">${ZONES[id].name}</button>`).join('')}</div>
    <div class="lbl">JUMP TO CHAPTER</div>${CHAPTERS.map(c => btn('stage ' + c[0], c[1])).join('')}
    ${btn('end', 'Play the ending now')}`);
  const out = b.querySelector('#chOut'), inp = b.querySelector('#chIn');
  const run = s => { if (!s.trim()) return; const r = runCheat(s); if (G.state === 'cut') return; out.textContent = r; sfx('ui'); };
  b.querySelector('#chGo').onclick = () => { run(inp.value); inp.value = ''; };
  inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { run(inp.value); inp.value = ''; } };
  inp.onkeyup = e => e.stopPropagation();
  b.querySelectorAll('button[data-t]').forEach(x => x.onclick = () => { out.textContent = runCheat(x.dataset.t); x.textContent = CHEAT[x.dataset.t] ? 'On' : 'Off'; sfx('ui'); });
  b.querySelectorAll('button[data-c]').forEach(x => x.onclick = () => run(x.dataset.c));
};
