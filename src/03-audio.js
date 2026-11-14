// ---------- audio: generated music + sound effects ----------
const AU = { ctx: null, mood: 'menu', vol: { master: .9, music: .7, sfx: .9 }, next: 0, chordI: 0, loops: {}, tension: 0, muffle: 0 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function makeIR(C, sec, decay) {
  const len = C.sampleRate * sec | 0, b = C.createBuffer(2, len, C.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 200 ? i / 200 : 1); } }
  return b;
}
function auInit() {
  if (AU.ctx) { if (AU.ctx.state !== 'running') AU.ctx.resume(); return; }
  const C = AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
  AU.master = C.createGain(); AU.master.gain.value = AU.vol.master;
  const comp = C.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .01; comp.release.value = .3;
  AU.master.connect(comp); comp.connect(C.destination);
  AU.rev = C.createConvolver(); AU.rev.buffer = makeIR(C, 5, 2.4); const rv = C.createGain(); rv.gain.value = .85; AU.rev.connect(rv); rv.connect(AU.master);
  AU.music = C.createGain(); AU.music.gain.value = AU.vol.music;
  AU.musicLP = C.createBiquadFilter(); AU.musicLP.type = 'lowpass'; AU.musicLP.frequency.value = 18000;
  AU.music.connect(AU.musicLP); AU.musicLP.connect(AU.master); const ms = C.createGain(); ms.gain.value = .55; AU.musicLP.connect(ms); ms.connect(AU.rev);
  AU.sfx = C.createGain(); AU.sfx.gain.value = AU.vol.sfx; AU.sfx.connect(AU.master); const ss = C.createGain(); ss.gain.value = .25; AU.sfx.connect(ss); ss.connect(AU.rev);
  // echo for bells
  AU.dly = C.createDelay(2); AU.dly.delayTime.value = .42; const fb = C.createGain(); fb.gain.value = .42; const dlp = C.createBiquadFilter(); dlp.frequency.value = 2600;
  AU.dly.connect(dlp); dlp.connect(fb); fb.connect(AU.dly); dlp.connect(AU.music);
  // noise buffers
  const len = C.sampleRate * 2; AU.white = C.createBuffer(1, len, C.sampleRate); AU.brown = C.createBuffer(1, len, C.sampleRate);
  { const w = AU.white.getChannelData(0), b = AU.brown.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; l = (l + .02 * w[i]) / 1.02; b[i] = l * 3.5; } }
  AU.next = C.currentTime + .3;
  setInterval(auTick, 200);
  makeLoops();
}
function auSetVol() { if (!AU.ctx) return; AU.master.gain.value = AU.vol.master; AU.music.gain.value = AU.vol.music; AU.sfx.gain.value = AU.vol.sfx; }
function noiseSrc(brown, loop) { const s = AU.ctx.createBufferSource(); s.buffer = brown ? AU.brown : AU.white; s.loop = loop !== false; s.loopStart = Math.random(); return s; }
function env(g, t, a, peak, d, end) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(end || .0001, .0001), t + a + d); }
function pan(v) { const p = AU.ctx.createStereoPanner(); p.pan.value = v; return p; }

// ---- music ----
const MOODS = {
  menu: { len: 11, prog: [[45, 52, 59, 60, 64], [41, 48, 55, 57, 64], [38, 45, 52, 53, 57], [40, 47, 52, 55, 59]], bright: 900, vel: .05, bells: [69, 71, 72, 76, 79, 81, 83], bellP: .5, pulse: 0, arp: 0 },
  ship: { len: 12, prog: [[38, 45, 52, 54, 57], [35, 42, 50, 52, 57], [31, 38, 45, 50, 54], [33, 40, 47, 50, 55]], bright: 750, vel: .045, bells: [66, 69, 71, 73, 74, 76, 78], bellP: .35, pulse: 0, arp: 0 },
  helm: { len: 9, prog: [[40, 47, 54, 55, 62], [36, 43, 47, 52, 54], [33, 40, 47, 48, 52], [35, 42, 49, 52, 54]], bright: 1100, vel: .045, bells: [64, 66, 67, 71, 74, 76, 79], bellP: .3, pulse: 1, arp: 1 },
  eva: { len: 10, prog: [[36, 43, 49, 56], [35, 42, 48, 55], [37, 44, 50, 55], [34, 41, 47, 54]], bright: 420, vel: .05, bells: [], bellP: 0, pulse: 0, arp: 0 },
  dread: { len: 8, prog: [[31, 32, 38, 44], [30, 31, 37, 43]], bright: 300, vel: .06, bells: [], bellP: 0, pulse: 0, arp: 0 },
};
function setMood(m) { AU.mood = m; }
function padNote(t, m, dur, vel, bright) {
  const C = AU.ctx, f = mtof(m), g = C.createGain(), lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .8;
  lp.frequency.setValueAtTime(bright * .5, t); lp.frequency.linearRampToValueAtTime(bright * (1 + AU.tension * .8), t + dur * .5); lp.frequency.linearRampToValueAtTime(bright * .45, t + dur);
  const att = dur * .3, rel = dur * .45;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + att); g.gain.setValueAtTime(vel, t + dur - rel); g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
  const p = pan((Math.random() - .5) * .8); lp.connect(g); g.connect(p); p.connect(AU.music);
  for (const [type, mul, det, gv] of [['sawtooth', 1, -6, .5], ['sawtooth', 1, 7, .5], ['triangle', .5, 0, .6]]) {
    const o = C.createOscillator(); o.type = type; o.frequency.value = f * mul; o.detune.value = det + (Math.random() - .5) * 4;
    const og = C.createGain(); og.gain.value = gv; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 1.7);
  }
}
function bell(t, m, vel, toDelay = true) {
  const C = AU.ctx, f = mtof(m), car = C.createOscillator(), mod = C.createOscillator(), mg = C.createGain(), g = C.createGain();
  car.frequency.value = f; mod.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(f * .04, t + 2.5);
  mod.connect(mg); mg.connect(car.frequency); env(g, t, .004, vel, 4.5);
  const p = pan((Math.random() - .5) * 1.2); car.connect(g); g.connect(p); p.connect(AU.music); if (toDelay) p.connect(AU.dly);
  car.start(t); mod.start(t); car.stop(t + 5); mod.stop(t + 5);
}
function pluck(t, m, vel) {
  const C = AU.ctx, o = C.createOscillator(), lp = C.createBiquadFilter(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = mtof(m);
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(300, t + .5); env(g, t, .005, vel, 1.2);
  const p = pan((Math.random() - .5) * .9); o.connect(lp); lp.connect(g); g.connect(p); p.connect(AU.music); p.connect(AU.dly); o.start(t); o.stop(t + 1.4);
}
function subPulse(t, vel) {
  const C = AU.ctx, o = C.createOscillator(), g = C.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + .35); env(g, t, .01, vel, .6); o.connect(g); g.connect(AU.music); o.start(t); o.stop(t + .7);
}
function scrape(t, vel) { // eerie metal groan for the spacewalk
  const C = AU.ctx, n = noiseSrc(false), bp = C.createBiquadFilter(), g = C.createGain(); bp.type = 'bandpass'; bp.Q.value = 30; const f0 = 300 + Math.random() * 900;
  bp.frequency.setValueAtTime(f0, t); bp.frequency.linearRampToValueAtTime(f0 * (.6 + Math.random() * .8), t + 3.5);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 3.8);
  const p = pan((Math.random() - .5) * 1.6); n.connect(bp); bp.connect(g); g.connect(p); p.connect(AU.music); n.start(t); n.stop(t + 4);
}
function auTick() {
  const C = AU.ctx; if (!C || C.state !== 'running') return;
  const now = C.currentTime; if (AU.next < now) AU.next = now + .1;
  if (AU.next > now + .6) return;
  const M = MOODS[AU.mood] || MOODS.menu, t = AU.next, chord = M.prog[AU.chordI % M.prog.length]; AU.chordI++;
  const L = M.len;
  for (const n of chord) padNote(t, n, L + 2, M.vel / Math.sqrt(chord.length) * 1.6, M.bright);
  // bass drone
  { const o = C.createOscillator(), g = C.createGain(); o.frequency.value = mtof(chord[0] - 12); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + 3); g.gain.linearRampToValueAtTime(0, t + L + 2); o.connect(g); g.connect(AU.music); o.start(t); o.stop(t + L + 2.2); }
  if (M.bells.length) { const n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) if (Math.random() < M.bellP + .4) bell(t + 1 + Math.random() * (L - 2), M.bells[Math.random() * M.bells.length | 0], .05 + Math.random() * .04); }
  if (M.pulse) for (let b = 0; b < L; b += 1.5) subPulse(t + b, .12);
  if (M.arp) { const notes = chord.slice(1).map(n => n + 12); for (let b = 0; b < L; b += .375) if (Math.random() < .55) pluck(t + b, notes[(b / .375 | 0) % notes.length] + (Math.random() < .2 ? 12 : 0), .035); }
  if (AU.mood === 'eva' || AU.mood === 'dread') for (let i = 0; i < 2; i++) if (Math.random() < .7) scrape(t + Math.random() * L, .05 + AU.tension * .05);
  AU.next = t + L;
}

// ---- looping effects (engine, hum, jetpack, monster, breathing) ----
function makeLoop(name, build) { const g = AU.ctx.createGain(); g.gain.value = 0; build(g); g.connect(AU.sfx); AU.loops[name] = g; }
function makeLoops() {
  const C = AU.ctx;
  makeLoop('engine', g => { const n = noiseSrc(true), lp = C.createBiquadFilter(); lp.frequency.value = 220; n.connect(lp); lp.connect(g); n.start(); const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 42; const ol = C.createBiquadFilter(); ol.frequency.value = 160; const og = C.createGain(); og.gain.value = .35; o.connect(ol); ol.connect(og); og.connect(g); o.start(); AU.engO = o; AU.engLP = lp; });
  makeLoop('hum', g => { const o = C.createOscillator(); o.frequency.value = 55; const o2 = C.createOscillator(); o2.frequency.value = 110.4; const g2 = C.createGain(); g2.gain.value = .3; o.connect(g); o2.connect(g2); g2.connect(g); o.start(); o2.start(); const n = noiseSrc(true), lp = C.createBiquadFilter(); lp.frequency.value = 300; const ng = C.createGain(); ng.gain.value = .5; n.connect(lp); lp.connect(ng); ng.connect(g); n.start(); });
  makeLoop('jet', g => { const n = noiseSrc(false), hp = C.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2200; hp.Q.value = .6; n.connect(hp); hp.connect(g); n.start(); });
  makeLoop('mine', g => { const o = C.createOscillator(); o.type = 'square'; o.frequency.value = 96; const lp = C.createBiquadFilter(); lp.frequency.value = 900; lp.Q.value = 6; const lfo = C.createOscillator(); lfo.frequency.value = 23; const lg = C.createGain(); lg.gain.value = 500; lfo.connect(lg); lg.connect(lp.frequency); o.connect(lp); lp.connect(g); o.start(); lfo.start(); const n = noiseSrc(false), hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; const ng = C.createGain(); ng.gain.value = .4; n.connect(hp); hp.connect(ng); ng.connect(g); n.start(); });
  makeLoop('growl', g => { const n = noiseSrc(true), bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 120; bp.Q.value = 3; const lfo = C.createOscillator(); lfo.frequency.value = .3; const lg = C.createGain(); lg.gain.value = 50; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(); const ws = C.createWaveShaper(); const cu = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cu[i] = Math.tanh(x * 4); } ws.curve = cu; const pre = C.createGain(); pre.gain.value = 6; n.connect(bp); bp.connect(pre); pre.connect(ws); ws.connect(g); n.start(); const o = C.createOscillator(); o.frequency.value = 31; const og = C.createGain(); og.gain.value = .5; o.connect(og); og.connect(g); o.start(); });
  makeLoop('whisper', g => { const n = noiseSrc(false), b1 = C.createBiquadFilter(), b2 = C.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.Q.value = 12; b2.Q.value = 9; b1.frequency.value = 800; b2.frequency.value = 2200; const l1 = C.createOscillator(), l2 = C.createOscillator(); l1.frequency.value = 2.3; l2.frequency.value = 3.7; const lg1 = C.createGain(), lg2 = C.createGain(); lg1.gain.value = 400; lg2.gain.value = 700; l1.connect(lg1); lg1.connect(b1.frequency); l2.connect(lg2); lg2.connect(b2.frequency); l1.start(); l2.start(); const am = C.createGain(); const l3 = C.createOscillator(); l3.frequency.value = 5.3; const lg3 = C.createGain(); lg3.gain.value = .5; am.gain.value = .5; l3.connect(lg3); lg3.connect(am.gain); l3.start(); n.connect(b1); n.connect(b2); b1.connect(am); b2.connect(am); const p = C.createStereoPanner(); const l4 = C.createOscillator(); l4.frequency.value = .13; l4.connect(p.pan); l4.start(); am.connect(p); p.connect(g); n.start(); });
  makeLoop('wind', g => { const n = noiseSrc(true), lp = C.createBiquadFilter(); lp.frequency.value = 400; const lfo = C.createOscillator(); lfo.frequency.value = .07; const lg = C.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); n.connect(lp); lp.connect(g); n.start(); });
}
function loopTo(name, v, k = .15) { const g = AU.loops[name]; if (!g) return; g.gain.setTargetAtTime(v, AU.ctx.currentTime, k); }

// ---- one-shot effects ----
function sfx(name, v = 1, p = 0) {
  const C = AU.ctx; if (!C || C.state !== 'running') return; const t = C.currentTime, out = C.createGain(); out.gain.value = v; const pn = pan(p); out.connect(pn); pn.connect(AU.sfx);
  const nz = (dur, type, f, q, a, peak, d, brown) => { const n = noiseSrc(brown, false), fl = C.createBiquadFilter(), g = C.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, t, a, peak, d); n.connect(fl); fl.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + dur); return fl; };
  const tone = (type, f, a, peak, d, f2, dt = 0) => { const o = C.createOscillator(), g = C.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + dt); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dt + a + d); g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(.0001, t + dt); g.gain.linearRampToValueAtTime(peak, t + dt + a); g.gain.exponentialRampToValueAtTime(.0001, t + dt + a + d); o.connect(g); g.connect(out); o.start(t); o.stop(t + dt + a + d + .05); };
  switch (name) {
    case 'step': nz(.12, 'bandpass', 700 + Math.random() * 900, 1.5, .002, .22, .07); tone('sine', 85 + Math.random() * 20, .003, .25, .08); tone('sine', 2200 + Math.random() * 600, .001, .015, .12); break;
    case 'door': { const f = nz(.9, 'bandpass', 3000, 1.2, .02, .35, .6); f.frequency.setValueAtTime(3500, t); f.frequency.exponentialRampToValueAtTime(600, t + .6); tone('sine', 70, .01, .3, .25, 45, .55); break; }
    case 'clunk': tone('sine', 90, .002, .5, .3, 40); nz(.3, 'lowpass', 800, 1, .002, .4, .2); tone('triangle', 520, .002, .05, .5, 500); break;
    case 'hiss': { const f = nz(3.2, 'highpass', 1500, .5, 1.2, .3, 1.8); break; }
    case 'beep': tone('square', 880, .005, .05, .12); break;
    case 'beep2': tone('sine', 660, .005, .12, .2); tone('sine', 990, .005, .1, .25, 0, .18); break;
    case 'alarm': for (let i = 0; i < 3; i++) { tone('square', 740, .01, .06, .2, 0, i * .5); tone('square', 520, .01, .06, .2, 0, i * .5 + .25); } break;
    case 'ui': tone('sine', 1250, .002, .08, .05); break;
    case 'pick': tone('sine', 880, .003, .12, .2); tone('sine', 1320, .003, .1, .3, 0, .07); break;
    case 'talk': tone('triangle', 300 + Math.random() * 60, .005, .03, .05); break;
    case 'place': tone('sine', 110, .002, .5, .25, 60); nz(.25, 'bandpass', 1800, 2, .001, .3, .15); tone('triangle', 900, .001, .06, .4, 870); break;
    case 'hit': tone('sine', 60, .005, .9, .9, 30); nz(1.2, 'lowpass', 1200, 1, .002, .9, 1, true); for (let i = 0; i < 4; i++) tone('sine', 300 + Math.random() * 900, .002, .06, 1.2 + Math.random()); break;
    case 'roar': { const o = C.createOscillator(), m = C.createOscillator(), mg = C.createGain(), g = C.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(30, t + 3); m.frequency.value = 23; mg.gain.value = 30; m.connect(mg); mg.connect(o.frequency); const lp = C.createBiquadFilter(); lp.frequency.value = 400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.7, t + .8); g.gain.linearRampToValueAtTime(0, t + 3.2); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); m.start(t); o.stop(t + 3.3); m.stop(t + 3.3); nz(3.2, 'bandpass', 300, 2, .8, .4, 2.4, true); break; }
    case 'swell': { const n = noiseSrc(true, false), lp = C.createBiquadFilter(), g = C.createGain(); lp.frequency.setValueAtTime(100, t); lp.frequency.exponentialRampToValueAtTime(900, t + 4); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.8, t + 3.8); g.gain.linearRampToValueAtTime(0, t + 4.3); n.connect(lp); lp.connect(g); g.connect(out); n.start(t); n.stop(t + 4.4); tone('sine', 40, 3.5, .4, .6, 36); break; }
    case 'caught': tone('sawtooth', 70, .01, .8, 2, 25); nz(2.2, 'bandpass', 600, 1, .01, .9, 2); tone('sine', 1800, .01, .1, 1.5, 300); break;
    case 'heart': tone('sine', 55, .005, .6, .14, 40); tone('sine', 52, .005, .45, .16, 38, .2); break;
    case 'breathIn': { const n = noiseSrc(false, false), bp = C.createBiquadFilter(), g = C.createGain(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(600, t); bp.frequency.linearRampToValueAtTime(1100, t + 1.1); bp.Q.value = 1.5; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .5); g.gain.linearRampToValueAtTime(0, t + 1.2); n.connect(bp); bp.connect(g); g.connect(out); n.start(t); n.stop(t + 1.3); break; }
    case 'breathOut': { const n = noiseSrc(false, false), bp = C.createBiquadFilter(), g = C.createGain(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(450, t + 1.5); bp.Q.value = 1.2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .3); g.gain.linearRampToValueAtTime(0, t + 1.6); n.connect(bp); bp.connect(g); g.connect(out); n.start(t); n.stop(t + 1.7); break; }
    case 'flare': { const f = nz(1.5, 'bandpass', 900, 1, .02, .5, 1.2); f.frequency.exponentialRampToValueAtTime(3000, t + .8); tone('sine', 200, .01, .2, .8, 800); break; }
    case 'deny': tone('square', 160, .005, .07, .15); tone('square', 120, .005, .07, .2, 0, .12); break;
    case 'boost': { const f = nz(1.3, 'lowpass', 300, 1, .3, .4, .9, true); f.frequency.linearRampToValueAtTime(1200, t + 1); break; }
    case 'ping': bell(t, 84, .08, true); break;
  }
}
