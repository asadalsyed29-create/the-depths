// ---------- rigged character models (crew, the thing in the fog) ----------
const MD = {};
function b64ToBuf(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
async function loadModels() {
  const L = new THREE.GLTFLoader(); const P = k => new Promise((res, rej) => L.parse(b64ToBuf(MODEL_DATA[k]), '', res, rej));
  MD.crew = await P('crew'); MD.anims = await P('anims'); MD.michelle = await P('michelle'); MD.xbot = await P('xbot');
  { // the loader renames repeated bone names (thigh_l_1 ...); give every part's bones their real names back so clips and hair find them
    const real = new Set(); crewScene('body_Male').traverse(c => { if (c.isBone) real.add(c.name); });
    for (const s of MD.crew.scenes) s.traverse(c => { if (c.isBone && !real.has(c.name)) { const n = c.name.replace(/_\d+$/, ''); if (real.has(n)) c.name = n; } }); }
  MD.crewClips = {}; for (const c of MD.anims.animations) MD.crewClips[c.name] = c;
  MD.mask = {}; for (const s of ['Male', 'Female']) { const im = new Image(); im.src = CREW_MASK[s]; await im.decode(); MD.mask[s] = im; }
  MD.clips = {}; for (const c of MD.xbot.animations) MD.clips[c.name] = c;
  // the crew rigs have different bone rolls, so bake each animation onto them through world space
  const want = ['idle', 'walk', 'agree', 'headShake', 'sad_pose'];
  for (const k of ['michelle']) { MD[k].clips = {}; for (const n of want) MD[k].clips[n] = retargetClip(MD.xbot.scene, MD.clips[n], MD[k].scene, MD[k].animations); }
}
// the second crew rig rests in an A-pose; lift its arms out level so it matches the others
function tposeRig(root) {
  root.updateMatrixWorld(true); const l = boneByName(root, 'LeftUpLeg').getWorldPosition(new THREE.Vector3()).x > boneByName(root, 'RightUpLeg').getWorldPosition(new THREE.Vector3()).x ? 1 : -1;
  for (const [s, sg] of [['Left', l], ['Right', -l]]) for (const [a, b] of [['Arm', 'ForeArm'], ['ForeArm', 'Hand'], ['Hand', 'HandMiddle1']]) {
    const A = boneByName(root, s + a), B = boneByName(root, s + b); if (!A || !B) continue; root.updateMatrixWorld(true);
    const d = B.getWorldPosition(new THREE.Vector3()).sub(A.getWorldPosition(new THREE.Vector3())).normalize(), want = new THREE.Vector3(sg, 0, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(d, want); A.parent.getWorldQuaternion(_q1); const w = _q1.clone().multiply(A.quaternion); A.quaternion.copy(_q1.clone().invert().multiply(q).multiply(w));
  }
  for (const s of ['Left', 'Right']) for (const [a, b] of [['UpLeg', 'Leg'], ['Leg', 'Foot']]) {
    const A = boneByName(root, s + a), B = boneByName(root, s + b); if (!A || !B) continue; root.updateMatrixWorld(true);
    const d = B.getWorldPosition(new THREE.Vector3()).sub(A.getWorldPosition(new THREE.Vector3())).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(d, new THREE.Vector3(0, -1, 0)); A.parent.getWorldQuaternion(_q1); const w = _q1.clone().multiply(A.quaternion); A.quaternion.copy(_q1.clone().invert().multiply(q).multiply(w));
  }
  root.updateMatrixWorld(true);
}
function rigYaw(root) { root.updateMatrixWorld(true); const l = boneByName(root, 'LeftUpLeg').getWorldPosition(new THREE.Vector3()), r = boneByName(root, 'RightUpLeg').getWorldPosition(new THREE.Vector3()); return l.x > r.x ? 0 : Math.PI; }
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3();
// turn a bone about a world axis (works whatever the rig's bone roll is)
function turnBone(b, axis, a) { if (!a) return; b.parent.updateWorldMatrix(true, false); b.parent.getWorldQuaternion(_q1); _ax.copy(axis); _q2.setFromAxisAngle(_ax, a); const w = _q1.clone().multiply(b.quaternion); b.quaternion.copy(_q1.invert().multiply(_q2).multiply(w)); }
const bname = o => o.name.replace(/^mixamorig:?/, '');
function retargetClip(srcScene, clip, tgtScene, tgtAnims) {
  const src = THREE.SkeletonUtils.clone(srcScene), tgt = THREE.SkeletonUtils.clone(tgtScene);
  // put the target in its T-pose first if its rest pose is something else
  const tp = tgtAnims.find(a => /tpose/i.test(a.name));
  if (tp) { const mx = new THREE.AnimationMixer(tgt); mx.clipAction(tp).play(); mx.setTime(0); }
  src.updateMatrixWorld(true); tgt.updateMatrixWorld(true);
  const sb = {}; src.traverse(o => { if (o.isBone) sb[bname(o)] = o; });
  const tb = []; tgt.traverse(o => { if (o.isBone) tb.push(o); });
  const q = () => new THREE.Quaternion(), v = () => new THREE.Vector3();
  const sRest = {}, tRest = new Map(), tLocal = new Map();
  for (const n in sb) sRest[n] = sb[n].getWorldQuaternion(q());
  for (const b of tb) { tRest.set(b, b.getWorldQuaternion(q())); tLocal.set(b, b.quaternion.clone()); }
  const sh = sb.Hips, th = tb.find(b => bname(b) === 'Hips');
  // rigs may face opposite ways; turn the source motion into the target's facing
  const F = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rigYaw(tgt) - rigYaw(src)), Fi = F.clone().invert();
  const sh0 = sh.getWorldPosition(v()), th0 = th.getWorldPosition(v()); const ratio = th0.y / sh0.y;
  const mixer = new THREE.AnimationMixer(src); mixer.clipAction(clip).play();
  const fps = 30, n = Math.max(2, Math.ceil(clip.duration * fps) + 1), times = new Float32Array(n);
  const qv = new Map(); for (const b of tb) qv.set(b, new Float32Array(n * 4)); const pv = new Float32Array(n * 3);
  const W = new Map(), tmp = q(), inv = q();
  for (let i = 0; i < n; i++) {
    const t = Math.min(clip.duration, i / fps); times[i] = t; mixer.setTime(t); src.updateMatrixWorld(true);
    for (const b of tb) {
      const pw = W.get(b.parent) || b.parent.getWorldQuaternion(q()); const s = sb[bname(b)]; let w;
      if (s) { const dq = s.getWorldQuaternion(q()).multiply(inv.copy(sRest[bname(b)]).invert()); w = F.clone().multiply(dq).multiply(Fi).multiply(tRest.get(b)); }
      else w = pw.clone().multiply(tLocal.get(b));
      W.set(b, w); tmp.copy(pw).invert().multiply(w); tmp.toArray(qv.get(b), i * 4);
    }
    const d = sh.getWorldPosition(v()).sub(sh0).multiplyScalar(ratio).applyQuaternion(F); const wp = th0.clone().add(d); th.parent.worldToLocal(wp); wp.toArray(pv, i * 3);
    W.clear();
  }
  const tracks = [new THREE.VectorKeyframeTrack(th.name + '.position', times, pv)];
  for (const b of tb) tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, qv.get(b)));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
function boneByName(root, part) { let b = null; root.traverse(o => { if (o.isBone && !b && o.name.replace(/^mixamorig:?/, '') === part) b = o; }); return b; }
function fitHeight(m, h) { m.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(m, true); const s = h / (box.max.y - box.min.y); m.scale.multiplyScalar(s); m.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(m, true); m.position.y -= b2.min.y; }
// repaint a texture: fn(r,g,b) -> [r,g,b] or null to keep the pixel
function repaint(tex, fn) {
  const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const o = fn(p[i] / 255, p[i + 1] / 255, p[i + 2] / 255); if (o) { p[i] = o[0] * 255; p[i + 1] = o[1] * 255; p[i + 2] = o[2] * 255; } }
  x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = 4; return t;
}
const hexRGB = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255]; // sRGB, as painted on the texture
// keep the cloth detail, swap its colour: brightness of the original times the new colour
function dye(tex, col, k = 1.6, flat = 0) { const [r0, g0, b0] = hexRGB(col); return repaint(tex, (r, g, b) => { const l = Math.min(1.25, ((r * .3 + g * .59 + b * .11) * (1 - flat) + .42 * flat) * k); return [Math.min(1, r0 * l), Math.min(1, g0 * l), Math.min(1, b0 * l)]; }); }
function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
let HAIRTEX = null;
function hairTex() { if (HAIRTEX) return HAIRTEX; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 900; i++) { const v = 90 + Math.random() * 110 | 0; x.strokeStyle = `rgba(${v},${v},${v},.55)`; x.lineWidth = .6 + Math.random(); const px = Math.random() * 256; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (Math.random() - .5) * 6, 64); x.stroke(); }
  HAIRTEX = new THREE.CanvasTexture(c); HAIRTEX.wrapS = HAIRTEX.wrapT = THREE.RepeatWrapping; HAIRTEX.repeat.set(6, 1); HAIRTEX.colorSpace = THREE.SRGBColorSpace; return HAIRTEX; }
// a hairstyle in skull units (radius 1, y up, z to the face)
function makeHair(style, col) {
  const mat = new THREE.MeshStandardMaterial({ color: col, map: hairTex(), roughness: .62, side: THREE.DoubleSide }); const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 40, 20, 0, TAU, 0, 2.15), mat); cap.rotation.x = -.95; g.add(cap);
  const curtain = (h, r0, r1, gap) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 36, 4, true, gap, TAU - gap * 2), mat); m.position.y = -h / 2 + .05; m.position.z = -.08; g.add(m); };
  if (style === 'bob') curtain(1.05, 1.08, 1.16, 1.45);
  if (style === 'long') curtain(2.6, 1.08, 1.3, 1.45);
  if (style === 'pony') { const tie = new THREE.Mesh(new THREE.SphereGeometry(.32, 16, 10), mat); tie.position.set(0, .05, -1.08); g.add(tie);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(.3, .06, 2.1, 14, 6), mat); tail.position.set(0, -1.0, -1.3); tail.rotation.x = .22; g.add(tail); }
  if (style === 'bun') { const b = new THREE.Mesh(new THREE.SphereGeometry(.48, 20, 14), mat); b.position.set(0, .72, -.78); g.add(b); }
  return g;
}
// a crew member: base body + hairstyle, dressed in a ship jumpsuit painted over the body (mask: red body, green shoulders, blue boots)
function crewScene(name) { return MD.crew.scenes.find(s => s.name === name); }
function crewTex(mt, o, mask) {
  const im = mt.map.image, W = im.width, H = im.height; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.drawImage(im, 0, 0, W, H); const T = x.getImageData(0, 0, W, H); x.filter = 'blur(' + (W / 512) + 'px)'; x.drawImage(mask, 0, 0, W, H); x.filter = 'none'; const M = x.getImageData(0, 0, W, H);
  const t = T.data, m = M.data, sk = hexRGB(o.skin), A = hexRGB(o.suit), B = hexRGB(o.accent), Bt = hexRGB(o.boots || 0x1c1d20);
  const ref = [.93, .72, .58]; // the light skin the texture was painted with
  for (let i = 0; i < t.length; i += 4) {
    const r = t[i] / 255, g = t[i + 1] / 255, b = t[i + 2] / 255, lum = r * .3 + g * .59 + b * .11;
    const wr = m[i] / 255, wg = m[i + 1] / 255, wb = m[i + 2] / 255, ws = Math.min(1, wr + wg + wb);
    const sr = Math.min(1, r * sk[0] / ref[0]), sg = Math.min(1, g * sk[1] / ref[1]), sb = Math.min(1, b * sk[2] / ref[2]);
    const tot = wr + wg + wb || 1, d = .86 + (lum - .62) * .45; // keep a little of the body shading as cloth folds
    const cr = (A[0] * wr + B[0] * wg + Bt[0] * wb) / tot * d, cg = (A[1] * wr + B[1] * wg + Bt[1] * wb) / tot * d, cb = (A[2] * wr + B[2] * wg + Bt[2] * wb) / tot * d;
    t[i] = (sr * (1 - ws) + cr * ws) * 255; t[i + 1] = (sg * (1 - ws) + cg * ws) * 255; t[i + 2] = (sb * (1 - ws) + cb * ws) * 255;
  }
  x.putImageData(T, 0, 0); const out = new THREE.CanvasTexture(c); out.flipY = mt.map.flipY; out.colorSpace = THREE.SRGBColorSpace; out.anisotropy = 4;
  let nrm = mt.normalMap; if (nrm) { const n2 = document.createElement('canvas'); n2.width = W; n2.height = H; const y = n2.getContext('2d'); y.drawImage(nrm.image, 0, 0, W, H); const N = y.getImageData(0, 0, W, H), n = N.data;
    for (let i = 0; i < n.length; i += 4) { const ws = Math.min(1, (m[i] + m[i + 1] + m[i + 2]) / 255) * .75; n[i] += (128 - n[i]) * ws; n[i + 1] += (128 - n[i + 1]) * ws; n[i + 2] += (255 - n[i + 2]) * ws; }
    y.putImageData(N, 0, 0); nrm = new THREE.CanvasTexture(n2); nrm.flipY = mt.normalMap.flipY; nrm.colorSpace = THREE.NoColorSpace; }
  return [out, nrm];
}
function makeCrew(o) {
  const sex = o.female ? 'Female' : 'Male'; const m = THREE.SkeletonUtils.clone(crewScene('body_' + sex));
  let body = null; m.traverse(c => { if (c.isSkinnedMesh) { c.frustumCulled = false; c.material = c.material.clone(); if (/Superhero/i.test(c.material.name)) body = c; if (/Hair/.test(c.material.name)) c.material.color.set(o.hair); } });
  const [map, nrm] = crewTex(body.material, o, MD.mask[sex]); body.material.map = map; if (nrm) body.material.normalMap = nrm; body.material.roughness = .8;
  // hair and beard: separate skinned meshes, re-bound to this body's bones
  const bones = {}; m.traverse(c => { if (c.isBone) bones[c.name] = c; });
  for (const hk of [o.style, o.beard ? 'Hair_Beard' : null]) { if (!hk) continue; const hs = THREE.SkeletonUtils.clone(crewScene(hk));
    hs.traverse(c => { if (!c.isSkinnedMesh) return; const sk = new THREE.Skeleton(c.skeleton.bones.map(b => bones[b.name] || b), c.skeleton.boneInverses); c.material = c.material.clone(); c.material.color.set(o.hair); c.frustumCulled = false;
      const mesh = new THREE.SkinnedMesh(c.geometry, c.material); mesh.bind(sk, c.bindMatrix); body.parent.add(mesh); }); }
  m.updateMatrixWorld(true); const l = bones.thigh_l.getWorldPosition(new THREE.Vector3()).x, r = bones.thigh_r.getWorldPosition(new THREE.Vector3()).x;
  m.rotation.y = l > r ? 0 : Math.PI; const g = new THREE.Group(); g.add(m); fitHeight(m, (o.female ? 1.68 : 1.8) * (o.tall || 1)); if (o.wide) { m.scale.x *= o.wide; m.scale.z *= o.wide; }
  const mixer = new THREE.AnimationMixer(m); const act = {}; const C = MD.crewClips;
  for (const [k, n] of [['idle', 'Idle_Loop'], ['walk', 'Walk_Loop'], ['agree', 'Idle_Talking_Loop'], ['headShake', 'Idle_Talking_Loop'], ['fix', 'Fixing_Kneeling']]) if (C[n]) act[k] = mixer.clipAction(C[n]);
  act.walk.timeScale = .9; act.idle.play(); act.idle.time = Math.random() * 4; act.idle.timeScale = .85 + Math.random() * .3;
  return { g, model: m, mixer, act, head: bones.Head, cur: 'idle' };
}
function crewPlay(P, name, fade = .4) { if (P.cur === name || !P.act[name]) return; const a = P.act[name], b = P.act[P.cur]; a.reset(); a.setEffectiveWeight(1); a.play(); if (b) a.crossFadeFrom(b, fade, true); P.cur = name; }
// smooth the head into a bare skull: pull every head vertex outside a sphere back onto it
function baldHead(sm, crew) {
  const geo = sm.geometry.clone(); const pa = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const sk = sm.skeleton, hi = sk.bones.findIndex(b => bname(b) === 'Head'), ni = sk.bones.findIndex(b => bname(b) === 'Neck');
  const bp = i => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert());
  const H = bp(hi), Nk = bp(ni), up = H.clone().sub(Nk), L = up.length(); up.normalize();
  const C = H.clone().addScaledVector(up, L * 1.05), R = L * 1.08;
  const ls = sk.bones.findIndex(b => bname(b) === 'LeftShoulder'), rs = sk.bones.findIndex(b => bname(b) === 'RightShoulder'); const side = bp(ls).sub(bp(rs)).normalize(), front = side.clone().cross(up).normalize();
  const out = new Float32Array(pa.count * 3), v = new THREE.Vector3(), moved = new Uint8Array(pa.count), nrm = new Float32Array(pa.count * 3);
  const thin = {}; const seg = (n, c, f) => { const a = sk.bones.findIndex(b => bname(b) === n), b = sk.bones.findIndex(b => bname(b) === c); if (a >= 0 && b >= 0) thin[a] = { a: bp(a), b: bp(b), f }; };
  for (const s of ['Left', 'Right']) { seg(s + 'UpLeg', s + 'Leg', .52); seg(s + 'Leg', s + 'Foot', .5); seg(s + 'Arm', s + 'ForeArm', .7); seg(s + 'ForeArm', s + 'Hand', .7); }
  seg('Neck', 'Head', .3); seg('Spine', 'Spine1', .8); seg('Hips', 'Spine', .75); seg('Spine1', 'Spine2', .85);
  // crew: the separate pieces round the head (goggles, headphones, hair buns) are folded away, keeping head and eyes
  let drop = null; if (crew && geo.index) { const n = pa.count, ix = geo.index.array, par = new Int32Array(n).map((_, i) => i); const f = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }; const u = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    const km = new Map(); for (let i = 0; i < n; i++) { const k = pa.getX(i).toFixed(4) + ',' + pa.getY(i).toFixed(4) + ',' + pa.getZ(i).toFixed(4); if (km.has(k)) u(i, km.get(k)); else km.set(k, i); }
    for (let i = 0; i < ix.length; i += 3) { u(ix[i], ix[i + 1]); u(ix[i], ix[i + 2]); }
    const cnt = new Map(); for (let i = 0; i < n; i++) { const r = f(i); cnt.set(r, (cnt.get(r) || 0) + 1); }
    drop = new Uint8Array(n); for (let i = 0; i < n; i++) { const c = cnt.get(f(i)); if ([2160, 330, 322, 29, 19].includes(c) && pa.getY(i) > H.y - L * 3) drop[i] = 1; } }
  const ex = [];
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    if (drop && drop[i]) { v.copy(C); v.toArray(out, i * 3); continue; }
    let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent ? si.getComponent(i, k) === hi : [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)][k] === hi) w += [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)][k];
    const hh = v.clone().sub(H).dot(up), rad = v.clone().sub(H).addScaledVector(up, -hh).length();
    if (w > .2 && (hh > -L * .6 || rad > L * .3)) { const d = v.clone().sub(C); const r = d.length(); if (crew) { if (w > .6) { const q = v.clone().sub(H); ex.push([q.dot(side), q.dot(up), q.dot(front), i]); } v.toArray(out, i * 3); continue; } const Rr = R; if (r > Rr * .97) { v.copy(C).addScaledVector(d, Math.min(r, Rr) / r); moved[i] = 1; d.normalize().toArray(nrm, i * 3); } }
    else if (!crew) { // thin the limbs: pull vertices toward the bone line
      let bi = -1, bw = 0; for (let k = 0; k < 4; k++) { const ww = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)][k]; if (ww > bw) { bw = ww; bi = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)][k]; } }
      const T = thin[bi]; if (T) { const ab = T.b.clone().sub(T.a), t = Math.max(0, Math.min(1, v.clone().sub(T.a).dot(ab) / ab.lengthSq())); const pnt = T.a.clone().addScaledVector(ab, t); v.sub(pnt).multiplyScalar(T.f).add(pnt); }
    }
    v.toArray(out, i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3)); geo.computeVertexNormals(); const na = geo.attributes.normal; for (let i = 0; i < pa.count; i++) if (moved[i]) na.setXYZ(i, nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]); if (crew && ex.length) { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const e of ex) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], e[k]); mx[k] = Math.max(mx[k], e[k]); }
    // the headphones stick out past the ears: press anything that wide back in to the side of the skull
    const cx = (mn[0] + mx[0]) / 2, hw = (mx[0] - mn[0]) / 2, lim = hw * .74;
    for (const e of ex) { const o = e[0] - cx; if (Math.abs(o) > lim) { const i = e[3]; v.fromArray(out, i * 3).addScaledVector(side, Math.sign(o) * lim - o); v.toArray(out, i * 3); e[0] = cx + Math.sign(o) * lim; } }
    mn[0] = cx - lim; mx[0] = cx + lim;
    const rad = [(mx[0] - mn[0]) / 2, (mx[1] - mn[1]) / 2, (mx[2] - mn[2]) / 2]; const top = mx[1], rs = Math.max(rad[0], rad[2]);
    // the skull: as wide as the head, its top at the crown, centred a little behind the face
    C.copy(H).addScaledVector(side, (mn[0] + mx[0]) / 2).addScaledVector(up, top - rad[0] * 1.05).addScaledVector(front, (mn[2] + mx[2]) / 2 - rad[2] * .12);
    geo.userData.skull = { C, R: rad[0], RS: [rad[0] * 1.16, rad[0] * 1.1, rad[2] * .98], up, front, hi }; return geo; }
  geo.userData.skull = { C, R, up, front, hi }; return geo;
}
// the thing in the fog: a tall, too-thin, faceless figure (the female crew body, stretched at the joints)
function makePaleModel() {
  const src = MD.michelle; const m = THREE.SkeletonUtils.clone(src.scene);
  const pale = new THREE.MeshStandardMaterial({ color: 0xd4d8d2, roughness: .82, metalness: 0, emissive: 0x141a1a, transparent: true, opacity: 1 });
  m.traverse(c => { if (c.isMesh) { c.material = pale; c.frustumCulled = false; if (c.isSkinnedMesh) c.geometry = baldHead(c); } });
  // longer neck, forearms, hands and fingers; slightly longer legs and body
  const len = { Spine1: 1.12, Spine2: 1.12, Neck: 1.1, Head: 1.7, LeftForeArm: 1.3, RightForeArm: 1.3, LeftHand: 1.45, RightHand: 1.45, LeftLeg: 1.12, RightLeg: 1.12, LeftFoot: 1.1, RightFoot: 1.1 };
  m.traverse(o => { if (!o.isBone) return; const n = bname(o); if (len[n]) o.position.multiplyScalar(len[n]); if (/Hand(Thumb|Index|Middle|Ring|Pinky)[2-4]$/.test(n)) o.position.multiplyScalar(1.9); });
  m.rotation.y = -rigYaw(m); const g = new THREE.Group(); g.add(m); fitHeight(m, 5.4); m.scale.x *= .82; m.scale.z *= .8;
  // two dark hollows where eyes should be
  const head = boneByName(m, 'Head'); g.updateMatrixWorld(true); let sm = null; m.traverse(c => { if (c.isSkinnedMesh && c.geometry.userData.skull) sm = c; });
  const Hw = head.getWorldPosition(new THREE.Vector3()), Nw = boneByName(m, 'Neck').getWorldPosition(new THREE.Vector3()); const Lw = Hw.distanceTo(Nw) / 1.7; const Cw = Hw.clone().addScaledVector(Hw.clone().sub(Nw).normalize(), Lw * 1.05), Rw = Lw * 1.08;
  const hole = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true });
  const rc = new THREE.Raycaster(); sm.updateMatrixWorld(true); if (!sm.boundingSphere) sm.computeBoundingSphere(); sm.boundingSphere.radius = 1e4;
  for (const sx of [-1, 1]) { const o = new THREE.Vector3(Cw.x + sx * Rw * .34, Cw.y - Rw * .15, Cw.z + 2); rc.set(o, new THREE.Vector3(0, 0, -1)); const hit = rc.intersectObject(sm)[0];
    const e = new THREE.Mesh(new THREE.SphereGeometry(Rw * .19, 12, 10), hole); e.scale.set(1, 1.5, .5); e.position.copy(hit ? hit.point : new THREE.Vector3(o.x, o.y, Cw.z + Rw)); e.position.z -= Rw * .03; g.add(e); head.attach(e); }
  const mixer = new THREE.AnimationMixer(m); const act = {}; for (const k in src.clips) act[k] = mixer.clipAction(src.clips[k]);
  act.walk.timeScale = .32; act.idle.timeScale = .5; act.walk.play();
  return { g, model: m, mixer, act, head, cur: 'walk', mats: [pale, hole] };
}
