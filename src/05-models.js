// ---------- rigged character models (crew, the thing in the fog) ----------
const MD = {};
function b64ToBuf(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
async function loadModels() {
  const L = new THREE.GLTFLoader(); const P = k => new Promise((res, rej) => L.parse(b64ToBuf(MODEL_DATA[k]), '', res, rej));
  MD.rpm = await P('rpm'); MD.michelle = await P('michelle'); MD.xbot = await P('xbot');
  tposeRig(MD.rpm.scene);
  MD.clips = {}; for (const c of MD.xbot.animations) MD.clips[c.name] = c;
  // the crew rigs have different bone rolls, so bake each animation onto them through world space
  const want = ['idle', 'walk', 'agree', 'headShake', 'sad_pose'];
  for (const k of ['rpm', 'michelle']) { MD[k].clips = {}; for (const n of want) MD[k].clips[n] = retargetClip(MD.xbot.scene, MD.clips[n], MD[k].scene, MD[k].animations); }
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
function makeCrew(o) {
  const src = o.female ? MD.michelle : MD.rpm; const m = THREE.SkeletonUtils.clone(src.scene);
  m.traverse(c => { if (!c.isMesh) return; c.frustumCulled = false; const mt = c.material = c.material.clone(); mt.envMapIntensity = 1; const n = mt.name;
    if (o.female) { // one atlas: trousers (yellow), skin (brown), trims (red), hair (near black)
      if (mt.map) { const [pr, pg, pb] = hexRGB(o.pants), [ar, ag, ab] = hexRGB(o.trim), [sr, sg, sb] = hexRGB(o.skin), [hr, hg, hb] = hexRGB(o.hair || 0x222222);
        mt.map = repaint(mt.map, (r, g, b) => { const [h, s, v] = hsv(r, g, b);
          if (h > 38 && h < 75 && s > .35 && v > .35) { const l = v * 1.1; return [pr * l, pg * l, pb * l]; }
          if ((h < 14 || h > 335) && s > .55 && v > .3) { const l = v * 1.2; return [ar * l, ag * l, ab * l]; }
          if (h >= 8 && h <= 38 && s > .2 && s < .75 && v > .12) { const l = v / .45; return [Math.min(1, sr * l), Math.min(1, sg * l), Math.min(1, sb * l)]; }
          if (v < .2 && s < .5) { const l = v / .12; return [Math.min(1, hr * l), Math.min(1, hg * l), Math.min(1, hb * l)]; }
          return null; }); }
    } else {
      if (n === 'Wolf3D_Outfit_Top' && mt.map) mt.map = dye(mt.map, o.top, 1.6, .7);
      else if (n === 'Wolf3D_Outfit_Bottom' && mt.map) mt.map = dye(mt.map, o.bottom, 1.6, .5);
      else if (n === 'Wolf3D_Outfit_Footwear' && mt.map) mt.map = dye(mt.map, o.shoes || 0x2a2a2a, 1.3);
      else if (n === 'Wolf3D_Skin' || n === 'Wolf3D_Body') mt.color.set(o.skin);
      else if (n === 'Wolf3D_Headwear') c.visible = false; // a hat; hair is added below
      else if (n === 'Wolf3D_Beard') { mt.color.set(o.hair); c.visible = !!o.beard; }
    } });
  if (!o.female && !o.bald) { // short hair: a thin shell fitted to the top of the skull, following the head bone
    m.updateMatrixWorld(true); let hm = null; m.traverse(c => { if (c.isMesh && c.material.name === 'Wolf3D_Skin') hm = c; });
    const pa = hm.geometry.attributes.position, v = new THREE.Vector3(), pts = []; let y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(hm.matrixWorld); pts.push(v.clone()); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const hy = y1 - (y1 - y0) * .24, bb = new THREE.Box3(); for (const p of pts) if (p.y > hy) bb.expandByPoint(p);
    const rx = (bb.max.x - bb.min.x) / 2, rz = (bb.max.z - bb.min.z) / 2, R = Math.max(rx, rz), ry = (y1 - hy) * 1.0;
    const c = new THREE.Vector3((bb.min.x + bb.max.x) / 2, y1 - ry, (bb.min.z + bb.max.z) / 2);
    const head = boneByName(m, 'Head'); const ws = head.getWorldScale(new THREE.Vector3());
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18, 0, TAU, 0, o.long ? 2.0 : 1.62), new THREE.MeshStandardMaterial({ color: o.hair, roughness: .9 }));
    // the shell sits lower at the back than the front (a hairline)
    const g2 = new THREE.Group(); g2.position.copy(head.worldToLocal(c.clone())); head.add(g2); g2.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert());
    cap.scale.set(rx * 1.07 / ws.x, ry * 1.08 / ws.y, rz * 1.07 / ws.z); cap.rotation.x = -.3 * (rigYaw(m) ? -1 : 1); cap.position.z = 0; g2.add(cap);
  }
  m.rotation.y = -rigYaw(m); const g = new THREE.Group(); g.add(m); fitHeight(m, 1.76 * (o.tall || 1)); if (o.wide) { m.scale.x *= o.wide; m.scale.z *= o.wide; }
  const mixer = new THREE.AnimationMixer(m); const act = {};
  for (const k in src.clips) act[k] = mixer.clipAction(src.clips[k]);
  act.walk.timeScale = .9; act.idle.play(); act.idle.time = Math.random() * 4; act.idle.timeScale = .85 + Math.random() * .3;
  return { g, model: m, mixer, act, head: boneByName(m, 'Head'), cur: 'idle' };
}
function crewPlay(P, name, fade = .4) { if (P.cur === name || !P.act[name]) return; const a = P.act[name], b = P.act[P.cur]; a.reset(); a.setEffectiveWeight(1); a.play(); if (b) a.crossFadeFrom(b, fade, true); P.cur = name; }
// smooth the head into a bare skull: pull every head vertex outside a sphere back onto it
function baldHead(sm) {
  const geo = sm.geometry.clone(); const pa = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const sk = sm.skeleton, hi = sk.bones.findIndex(b => bname(b) === 'Head'), ni = sk.bones.findIndex(b => bname(b) === 'Neck');
  const bp = i => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert());
  const H = bp(hi), Nk = bp(ni), up = H.clone().sub(Nk), L = up.length(); up.normalize();
  const C = H.clone().addScaledVector(up, L * 1.05), R = L * 1.08;
  const out = new Float32Array(pa.count * 3), v = new THREE.Vector3(), moved = new Uint8Array(pa.count), nrm = new Float32Array(pa.count * 3);
  const thin = {}; const seg = (n, c, f) => { const a = sk.bones.findIndex(b => bname(b) === n), b = sk.bones.findIndex(b => bname(b) === c); if (a >= 0 && b >= 0) thin[a] = { a: bp(a), b: bp(b), f }; };
  for (const s of ['Left', 'Right']) { seg(s + 'UpLeg', s + 'Leg', .52); seg(s + 'Leg', s + 'Foot', .5); seg(s + 'Arm', s + 'ForeArm', .7); seg(s + 'ForeArm', s + 'Hand', .7); }
  seg('Neck', 'Head', .3); seg('Spine', 'Spine1', .8); seg('Hips', 'Spine', .75); seg('Spine1', 'Spine2', .85);
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent ? si.getComponent(i, k) === hi : [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)][k] === hi) w += [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)][k];
    const hh = v.clone().sub(H).dot(up), rad = v.clone().sub(H).addScaledVector(up, -hh).length();
    if (w > .2 && (hh > -L * .6 || rad > L * .3)) { const d = v.clone().sub(C); const r = d.length(); if (r > R * .97) { v.copy(C).addScaledVector(d, Math.min(r, R) / r); moved[i] = 1; d.normalize().toArray(nrm, i * 3); } }
    else { // thin the limbs: pull vertices toward the bone line
      let bi = -1, bw = 0; for (let k = 0; k < 4; k++) { const ww = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)][k]; if (ww > bw) { bw = ww; bi = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)][k]; } }
      const T = thin[bi]; if (T) { const ab = T.b.clone().sub(T.a), t = Math.max(0, Math.min(1, v.clone().sub(T.a).dot(ab) / ab.lengthSq())); const pnt = T.a.clone().addScaledVector(ab, t); v.sub(pnt).multiplyScalar(T.f).add(pnt); }
    }
    v.toArray(out, i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3)); geo.computeVertexNormals(); const na = geo.attributes.normal; for (let i = 0; i < pa.count; i++) if (moved[i]) na.setXYZ(i, nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]); geo.userData.skull = { C, R }; return geo;
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
