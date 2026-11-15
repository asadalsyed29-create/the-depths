// ---------- input ----------
const $ = s => document.querySelector(s);
const IN = { keys: {}, hold: {}, pressed: {}, mx: 0, my: 0, locked: false, joy: { x: 0, y: 0, id: null, ox: 0, oy: 0 }, look: { id: null, x: 0, y: 0 }, sens: 1 };
const KEYMAP = { KeyE: 'use', Space: 'up', KeyC: 'down', ControlLeft: 'down', ShiftLeft: 'run', ShiftRight: 'run', KeyB: 'build', Tab: 'bag', KeyI: 'bag', KeyF: 'flare', KeyR: 'rot', KeyV: 'view', KeyX: 'remove', KeyQ: 'leave' };
IN.press = a => { IN.pressed[a] = true; };
IN.take = a => { const v = IN.pressed[a]; IN.pressed[a] = false; return v; };
IN.clear = () => { IN.pressed = {}; IN.hold = {}; IN.keys = {}; IN.joy.x = IN.joy.y = 0; IN.joy.id = null; IN.look.id = null; $('#knob').style.transform = ''; document.querySelectorAll('.tb.held').forEach(b => b.classList.remove('held')); };
addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return; IN.keys[e.code] = true;
  if (e.code === 'Escape') { UI.escape(); return; }
  if (UI.dlgOpen && /^Digit[1-9]$/.test(e.code)) { UI.dlgPick(+e.code.slice(5) - 1); return; }
  if (UI.dlgOpen && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { if (UI.dlgSkip()) return; }
  const a = KEYMAP[e.code]; if (a) { IN.hold[a] = true; IN.press(a); }
});
addEventListener('keyup', e => { IN.keys[e.code] = false; const a = KEYMAP[e.code]; if (a) IN.hold[a] = false; });
addEventListener('blur', () => IN.clear());
const cvEl = () => $('#cv');
addEventListener('mousemove', e => { if (IN.locked) { IN.mx += e.movementX; IN.my += e.movementY; } });
addEventListener('mousedown', e => { if (G.mode !== 'pc' || UI.blocking()) return; if (e.target.closest && e.target.closest('button,#panel,#dlg,#title')) return; if (!IN.locked && G.inPlay()) { cvEl().requestPointerLock && cvEl().requestPointerLock(); return; } if (e.button === 0) { IN.hold.fire = true; IN.press('fire'); } if (e.button === 2) { IN.press('flare'); } });
addEventListener('mouseup', e => { if (e.button === 0) IN.hold.fire = false; });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { IN.locked = document.pointerLockElement === cvEl(); if (!IN.locked && G.inPlay() && G.mode === 'pc' && !UI.blocking() && !UI.noPauseOnUnlock) UI.pauseMenu(); UI.noPauseOnUnlock = false; UI.hint(); });
// touch
function setupTouch() {
  const T = $('#touch'); const joy = $('#joy'), knob = $('#knob');
  T.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      const b = t.target.closest('.tb'); if (b) { const a = b.dataset.a; IN.hold[a] = true; IN.press(a); b.classList.add('held'); b._tid = t.identifier; continue; }
      if (t.clientX < innerWidth * .42 && IN.joy.id === null) { IN.joy.id = t.identifier; const r = joy.getBoundingClientRect(); IN.joy.ox = r.left + r.width / 2; IN.joy.oy = r.top + r.height / 2; moveJoy(t); }
      else if (IN.look.id === null) { IN.look.id = t.identifier; IN.look.x = t.clientX; IN.look.y = t.clientY; IN.look.t0 = performance.now(); IN.look.moved = 0; }
    }
    e.preventDefault();
  }, { passive: false });
  const moveJoy = t => { let dx = t.clientX - IN.joy.ox, dy = t.clientY - IN.joy.oy; const d = Math.hypot(dx, dy), R = 58; if (d > R) { dx *= R / d; dy *= R / d; } IN.joy.x = dx / R; IN.joy.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  T.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === IN.joy.id) moveJoy(t);
      else if (t.identifier === IN.look.id) { const dx = t.clientX - IN.look.x, dy = t.clientY - IN.look.y; IN.mx += dx * 2.2 * IN.sens; IN.my += dy * 2.2 * IN.sens; IN.look.moved += Math.abs(dx) + Math.abs(dy); IN.look.x = t.clientX; IN.look.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === IN.joy.id) { IN.joy.id = null; IN.joy.x = IN.joy.y = 0; knob.style.transform = ''; }
      else if (t.identifier === IN.look.id) { IN.look.id = null; }
      document.querySelectorAll('.tb').forEach(b => { if (b._tid === t.identifier) { b.classList.remove('held'); IN.hold[b.dataset.a] = false; b._tid = null; } });
    }
    e.preventDefault();
  };
  T.addEventListener('touchend', end, { passive: false }); T.addEventListener('touchcancel', end, { passive: false });
}
function moveAxis() {
  let x = 0, y = 0; const k = IN.keys;
  if (k.KeyW) y -= 1; if (k.KeyS) y += 1; if (k.KeyA) x -= 1; if (k.KeyD) x += 1;
  x += IN.joy.x; y += IN.joy.y; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
}

// ---------- UI ----------
const TOUCH_SETS = {
  ship: [['use', 'Use', 'big', 0, 0], ['up', 'Jump', '', 1, 0], ['run', 'Run', '', 0, 1], ['bag', 'Bag', 'sq', 't', 0], ['menu', 'Menu', 'sq', 't', 1]],
  helm: [['up', 'Up', 'big', 0, 1], ['down', 'Down', 'big', 0, 0], ['view', 'View', 'sq', 't', 0], ['leave', 'Leave', 'sq', 't', 1], ['menu', 'Menu', 'sq', 't', 2], ['dash', 'Dash', 'sq', 't', 3]],
  eva: [['fire', 'Use', 'big', 0, 0], ['up', 'Up', '', 1, 0], ['down', 'Down', '', 1, 1], ['flare', 'Flare', '', 0, 1], ['build', 'Build', 'sq', 't', 0], ['bag', 'Bag', 'sq', 't', 1], ['menu', 'Menu', 'sq', 't', 2]],
  build: [['fire', 'Place', 'big', 0, 0], ['rot', 'Rotate', '', 1, 0], ['remove', 'Remove', '', 0, 1], ['up', 'Up', '', 2, 0], ['down', 'Down', '', 2, 1], ['build', 'Done', 'sq', 't', 0], ['menu', 'Menu', 'sq', 't', 1]],
};
const UI = {
  dlgOpen: false, panelOpen: false, curTouch: '',
  blocking() { return this.dlgOpen || this.panelOpen || !$('#title').classList.contains('hidden') || !$('#over').classList.contains('hidden'); },
  touchSet(name) {
    if (this.curTouch === name) return; this.curTouch = name; const box = $('#tbs'); box.innerHTML = ''; const set = TOUCH_SETS[name]; if (!set) return;
    const R = 'calc(18px + env(safe-area-inset-right))';
    for (const [a, label, cls, col, row] of set) { if (a === 'dash' && !G.flags.ended) continue;
      const b = document.createElement('button'); b.className = 'tb ' + cls; b.dataset.a = a; b.textContent = label;
      if (col === 't') { b.style.top = '10px'; b.style.right = `calc(${12 + row * 74}px + env(safe-area-inset-right))`; b.style.width = '68px'; }
      else { const big = cls === 'big'; b.style.right = `calc(${(big ? 20 : 30) + col * 84 + (col && 10)}px + env(safe-area-inset-right))`; b.style.bottom = `${(big ? 24 : 34) + row * 86}px`; }
      if (a === 'menu') b.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); UI.pauseMenu(); }, { passive: false });
      if (a === 'bag') b.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); UI.showBag(); }, { passive: false });
      box.appendChild(b);
    }
  },
  toast(t, ms = 2600) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(() => el.style.opacity = 0, ms); },
  prompt(t) { const el = $('#prompt'); if (el._t !== t) { el._t = t; el.textContent = t || ''; } },
  warn(t) { const el = $('#warn'); if (el._t !== t) { el._t = t; el.textContent = t || ''; } },
  hint() { $('#hint').classList.toggle('hidden', !(G.mode === 'pc' && G.inPlay() && !IN.locked && !this.blocking())); },
  objective(t) { $('#obj').innerHTML = '<b>OBJECTIVE</b>' + t; },
  res() { const r = G.res; const h = ['ore', 'ice', 'glass', 'scrap', 'samples'].map(k => `<span><i>${RES_NAME[k]}</i>${r[k]}</span>`).join(''); const el = $('#res'); if (el._h !== h) { el._h = h; el.innerHTML = h; } },
  bars(list) { const key = list.map(b => b[0]).join(); const el = $('#bars'); if (el._k !== key) { el._k = key; el.innerHTML = list.map(b => `<div class="bar"><div class="l"><span>${b[0]}</span><span></span></div><div class="t"><div class="f"></div></div></div>`).join(''); }
    const bs = el.children; list.forEach((b, i) => { const f = bs[i].querySelector('.f'); const w = clamp(b[1], 0, 1) * 100; f.style.width = w + '%'; f.style.background = b[3] || (b[1] < .25 ? '#e07a6a' : '#8fd0d8'); bs[i].querySelector('.l span:last-child').textContent = b[2]; }); },
  // dialogue
  dialog(name, role, text, choices) {
    this.dlgOpen = true; const d = $('#dlg'); d.classList.remove('hidden'); d.querySelector('.who').innerHTML = `${name}<small>${role}</small>`;
    const tx = d.querySelector('.txt'), ch = d.querySelector('.ch'); ch.innerHTML = ''; this._choices = choices; this._full = text; let i = 0; Dialog.typing = true; tx.textContent = '';
    clearInterval(this._ti); this._ti = setInterval(() => { i += 2; tx.textContent = text.slice(0, i); if (i % 6 == 0) sfx('talk', .6); if (i >= text.length) this.dlgSkip(); }, 22);
    this._showCh = () => { ch.innerHTML = ''; choices.forEach((c, k) => { const b = document.createElement('button'); b.textContent = (G.mode === 'pc' ? (k + 1) + '. ' : '') + c.t; b.onclick = () => { sfx('ui'); c.f(); }; ch.appendChild(b); }); };
  },
  dlgSkip() { if (!Dialog.typing) return false; clearInterval(this._ti); Dialog.typing = false; $('#dlg .txt').textContent = this._full; this._showCh(); return true; },
  dlgPick(i) { if (Dialog.typing) { this.dlgSkip(); return; } const c = this._choices && this._choices[i]; if (c) { sfx('ui'); c.f(); } },
  dialogClose() { this.dlgOpen = false; clearInterval(this._ti); Dialog.typing = false; $('#dlg').classList.add('hidden'); this.hint(); },
  // panels
  panel(title, html, onClose) {
    this.panelOpen = true; G.pause(true, 'panel'); const p = $('#panel'); p.classList.remove('hidden'); p.querySelector('.pt').textContent = title; p.querySelector('.pb').innerHTML = html; this._onClose = onClose;
    p.querySelector('.pc').onclick = () => { sfx('ui'); this.closePanel(); };
    if (IN.locked) { this.noPauseOnUnlock = true; document.exitPointerLock(); }
    return p.querySelector('.pb');
  },
  closePanel() { if (!this.panelOpen) return; this.panelOpen = false; $('#panel').classList.add('hidden'); G.pause(false, 'panel'); if (this._onClose) { const f = this._onClose; this._onClose = null; f(); } this.hint(); },
  escape() { if (this.dlgOpen) { Dialog.close(); return; } if (this.panelOpen) { this.closePanel(); return; } if (G.inPlay()) this.pauseMenu(); },
  costHtml(cost) { return Object.entries(cost).map(([k, v]) => `<span class="${G.have(k) < v ? 'no' : ''}">${v} ${RES_NAME[k]}</span>`).join(' &nbsp;'); },
  showStores() {
    const r = G.res, c = G.p.cargo;
    this.panel('Cargo stores', `<div class="lbl">SHIP STORES</div><div class="grid2">${['ore', 'ice', 'glass', 'scrap', 'samples'].map(k => `<div class="row"><span>${RES_NAME[k]}</span><b>${r[k]}</b></div>`).join('')}</div>
      <div class="lbl">SHIP</div><div class="grid2"><div class="row"><span>Hull</span><b>${Math.round(G.ship.hull)} / ${G.ship.hullMax}</b></div><div class="row"><span>Bases built</span><b>${G.bases.length}</b></div><div class="row"><span>Sites found</span><b>${SP.sites.filter(s => s.known).length} / ${SP.sites.length}</b></div><div class="row"><span>Flares</span><b>${G.p.flares}</b></div></div>`);
  },
  showBag() {
    if (this.blocking()) return; const c = G.p.cargo; const n = G.cargoN();
    this.panel('Suit and stores', `<div class="lbl">SUIT CARGO (${n} / ${G.cargoMax()})</div><div class="grid2">${['ore', 'ice', 'glass', 'scrap', 'samples'].map(k => `<div class="row"><span>${RES_NAME[k]}</span><b>${c[k] || 0}</b></div>`).join('')}</div>
      <div class="lbl">SHIP STORES</div><div class="grid2">${['ore', 'ice', 'glass', 'scrap', 'samples'].map(k => `<div class="row"><span>${RES_NAME[k]}</span><b>${G.res[k]}</b></div>`).join('')}</div>
      <div class="lbl">YOU</div><div class="grid2"><div class="row"><span>Health</span><b>${Math.round(G.p.hp)}</b></div><div class="row"><span>Flares</span><b>${G.p.flares}</b></div></div>
      <div class="lbl">UPGRADES</div><div>${FAB.filter(f => f.max && G.up[f.id]).map(f => `${f.name} ${f.max > 1 ? G.up[f.id] : ''}`).join(', ') || 'None yet.'}</div>`);
  },
  showFab() {
    const draw = () => {
      const b = $('#panel .pb'); b.innerHTML = FAB.map((f, i) => {
        const lvl = G.up[f.id] || 0, maxed = f.max && lvl >= f.max, locked = f.need && !f.need();
        const cost = f.cost(lvl); return `<div class="row"><div class="d">${f.name}${f.max > 1 ? ` <span style="color:#8a9aa0">${lvl}/${f.max}</span>` : ''}<small>${locked ? f.lockText : f.desc}</small></div><span class="cost">${maxed ? 'Done' : locked ? '' : this.costHtml(cost)}</span><button data-i="${i}" ${maxed || locked || !G.canPay(cost) ? 'disabled' : ''}>Make</button></div>`;
      }).join('');
      b.querySelectorAll('button[data-i]').forEach(btn => btn.onclick = () => { const f = FAB[+btn.dataset.i]; const lvl = G.up[f.id] || 0; if (G.pay(f.cost(lvl))) { f.make(); sfx('place'); this.toast(f.name + ' made'); draw(); } });
      if (G.q.stage === 11 || G.q.stage === 14) { const b = $('#panel .pb'); const row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<div class="d">Hyperspeed Dash Core<small>Fuse the ${fragsHave()} fragments into one core.</small></div><button>Assemble</button>`; row.querySelector('button').onclick = () => { sfx('place'); sfx('swell', .6); this.toast('Hyperspeed Dash Core assembled. Take it to Chief Okafor in Engineering.', 4000); G.setStage(G.q.stage + 1); draw(); }; b.prepend(row); }
    };
    this.panel('Fabricator', ''); draw();
  },
  pauseMenu() {
    if (this.blocking()) return;
    const b = this.panel('Paused', `<div class="seg" style="flex-direction:column;align-items:stretch;gap:8px"><button id="pmR">Resume</button><button id="pmS">Save game</button><button id="pmO">Settings</button><button id="pmH">How to play</button><button id="pmQ">Save and quit to title</button></div>`);
    b.querySelector('#pmR').onclick = () => this.closePanel();
    b.querySelector('#pmS').onclick = () => { G.save(); this.toast('Game saved'); this.closePanel(); };
    b.querySelector('#pmO').onclick = () => { this.closePanel(); this.settings(); };
    b.querySelector('#pmH').onclick = () => { this.closePanel(); this.help(); };
    b.querySelector('#pmQ').onclick = () => { G.save(); this.closePanel(); G.toTitle(); };
  },
  settingsHtml() {
    const s = G.set; const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${s[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    return `<div class="lbl">GRAPHICS</div>${seg('gfx', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}
      <div class="lbl">LOOK SENSITIVITY</div><input type="range" min="0.3" max="2.5" step="0.1" data-r="sens" value="${s.sens}">
      <div class="lbl">MUSIC</div><input type="range" min="0" max="1" step="0.05" data-r="music" value="${s.music}">
      <div class="lbl">SOUND EFFECTS</div><input type="range" min="0" max="1" step="0.05" data-r="sfx" value="${s.sfx}">`;
  },
  bindSettings(root) {
    root.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { sfx('ui'); G.set[b.dataset.k] = b.dataset.v; if (b.dataset.k === 'mode') G.set.gfx = b.dataset.v === 'pc' ? 'high' : 'medium'; G.applySettings(); root.querySelectorAll(`button[data-k="${b.dataset.k}"]`).forEach(x => x.classList.toggle('on', x === b)); });
    root.querySelectorAll('input[data-r]').forEach(r => r.oninput = () => { G.set[r.dataset.r] = +r.value; G.applySettings(); });
  },
  settings() { const b = this.panel('Settings', this.settingsHtml(), () => { if (G.state === 'title') titleMenu(); }); this.bindSettings(b); },
  help() {
    const pc = false;
    this.panel('How to play', `<div style="line-height:1.55">${pc ? `<b>On foot:</b> WASD to move, arrow keys or mouse to look, Shift to run, Space to jump, E to use or talk.<br><b>At the helm:</b> W/S thrust, A/D turn, arrow keys look around, Space/C climb and dive, Shift boost, V switch view, E or Q stand up.<br><b>Outside:</b> WASD to fly the suit, arrow keys to look, Space/C up and down, Shift boost, hold the left mouse button or E to mine, F or right click for a flare, B to build (R rotate, X remove). Tab shows your bag. Esc pauses.`
      : `<b>On foot:</b> left stick to move, drag the right side to look, Use to talk or use things.<br><b>At the helm:</b> left stick steers and thrusts, Up and Down climb and dive, View switches camera, Leave to stand up.<br><b>Outside:</b> left stick to fly the suit, hold Use to mine, Flare to push the thing in the fog back, Build to place base parts.`}
      <br><br>Stop the ship near a site, walk to the Suit Room and go out the airlock. Mine resources, then come back inside before your oxygen runs out. Something lives in the fog. Light keeps it back. Huge hunters swim out here too. If one comes after the ship, fly away from it until it gives up.</div>`);
  },
};
