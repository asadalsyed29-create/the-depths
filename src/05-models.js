// ---------- rigged character models (crew, the thing in the fog) ----------
const MD = {};
function b64ToBuf(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
async function loadModels() {
  const L = new THREE.GLTFLoader(); const P = k => new Promise((res, rej) => L.parse(b64ToBuf(MODEL_DATA[k]), '', res, rej));
  MD.soldier = await P('soldier'); MD.michelle = await P('michelle'); MD.xbot = await P('xbot');
  MD.clips = {}; for (const c of MD.xbot.animations) MD.clips[c.name] = c;
  // the crew rigs have different bone rolls, so bake each animation onto them through world space
  const want = ['idle', 'walk', 'agree', 'headShake', 'sad_pose'];
  for (const k of ['soldier', 'michelle']) { MD[k].clips = {}; for (const n of want) MD[k].clips[n] = retargetClip(MD.xbot.scene, MD.clips[n], MD[k].scene, MD[k].animations); }
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
function makeCrew(o) {
  const src = o.female ? MD.michelle : MD.soldier; const m = THREE.SkeletonUtils.clone(src.scene);
  m.traverse(c => { if (c.isMesh) { c.frustumCulled = false; c.material = c.material.clone(); if (o.tint) c.material.color.lerp(new THREE.Color(o.tint), o.female ? .45 : .5); c.material.envMapIntensity = 1; } });
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
