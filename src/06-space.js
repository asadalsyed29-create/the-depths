// ---------- the Depths: space scene, ship exterior, sites, decorations, creatures ----------
const SP = { sites: [], decor: [], gulpers: [], drifters: [], solids: [], bases: [], lanternPool: [] };
const FOG_COL = new THREE.Color(0x3a5056);
let GLOW_TEX = null;
function glowTex() { if (GLOW_TEX) return GLOW_TEX; const c = cv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); GLOW_TEX = new THREE.CanvasTexture(c); return GLOW_TEX; }
function glow(color, size, op) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: op || 1, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; }
function boxUV(g, w, h, d, s) { const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s); } return g; }
function hbox(w, h, d, mat, x, y, z, parent, s = 24) { const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, s), mat); m.position.set(x, y, z); parent.add(m); return m; }
// tapered box, back face (w0,h0) at z=0, front (w1,h1) at z=-L
function frustum(w0, h0, w1, h1, L, s = 24, yOff1 = 0) {
  const b = [[-w0 / 2, -h0 / 2, 0], [w0 / 2, -h0 / 2, 0], [w0 / 2, h0 / 2, 0], [-w0 / 2, h0 / 2, 0]], f = [[-w1 / 2, -h1 / 2 + yOff1, -L], [w1 / 2, -h1 / 2 + yOff1, -L], [w1 / 2, h1 / 2 + yOff1, -L], [-w1 / 2, h1 / 2 + yOff1, -L]];
  const P = [], U = []; const q = (a, bb, c, d, uw, uh) => { P.push(...a, ...bb, ...c, ...a, ...c, ...d); U.push(0, 0, uw / s, 0, uw / s, uh / s, 0, 0, uw / s, uh / s, 0, uh / s); };
  q(b[1], f[1], f[2], b[2], L, h0); q(f[0], b[0], b[3], f[3], L, h0); q(b[3], b[2], f[2], f[3], w0, L); q(f[0], f[1], b[1], b[0], w0, L); q(f[1], f[0], f[3], f[2], w1, h1); q(b[0], b[1], b[2], b[3], w0, h0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); return g;
}

function buildSpace() {
  const S = new THREE.Scene(); SP.scene = S;
  S.fog = new THREE.FogExp2(FOG_COL, .00008); S.background = FOG_COL.clone();
  // sky: deep space with nebula clouds and stars (blends to fog colour on spacewalks)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { fc: { value: FOG_COL }, fm: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec3 vp;void main(){vp=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 fc;uniform float fm;uniform float t;varying vec3 vp;
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
float star(vec3 d,float sc,float th){vec3 p=d*sc;vec3 i=floor(p);float r=h(i);if(r<th)return 0.;vec3 o=vec3(h(i+3.1),h(i+7.7),h(i+1.3))*.6+.2;float l=length(fract(p)-o);return smoothstep(.22,0.,l)*(.6+.4*sin(t*(1.+r*3.)+r*50.));}
void main(){vec3 d=normalize(vp);
 float w=fb(d*2.2+vec3(0.,0.,t*.003));float w2=fb(d*4.7+11.);
 float band=exp(-pow(d.y*2.6+sin(d.x*2.1+d.z)*.5,2.));
 vec3 c=vec3(.012,.02,.038);
 c+=mix(vec3(.06,.2,.27),vec3(.24,.1,.32),w2)*smoothstep(.42,.8,w)*(.55+band*.9);
 c+=vec3(.05,.09,.12)*band*w;
 c+=vec3(.9,.95,1.)*star(d,260.,.985)+vec3(1.,.9,.8)*star(d,520.,.992)*.7+vec3(.8,.9,1.)*star(d,90.,.993)*1.3;
 gl_FragColor=vec4(mix(c,fc,fm),1.);}` }));
  dome.renderOrder = -1; S.add(dome); SP.dome = dome;
  S.add(new THREE.HemisphereLight(0x8ab4c4, 0x2a2630, 2.6));
  const sun = new THREE.DirectionalLight(0xc8dce4, 2.2); sun.position.set(.3, 1, .2); S.add(sun);
  // suit lamp (attached to camera in EVA) and lantern light pool: fixed light count to avoid shader rebuilds
  SP.suitLamp = new THREE.SpotLight(0xe8f0ff, 0, 70, .5, .55, 1); S.add(SP.suitLamp); S.add(SP.suitLamp.target);
  for (let i = 0; i < 2; i++) { const L = new THREE.PointLight(0xffd9a0, 0, 40, 1.2); S.add(L); SP.lanternPool.push(L); }
  SP.monLight = new THREE.PointLight(0xbfd8d8, 0, 25, 1.5); S.add(SP.monLight);
  // dust
  { const n = 900, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) p[i] = Math.random(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); SP.dustBase = p.slice();
    SP.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb8bc, size: .5, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex() })); SP.dust.frustumCulled = false; S.add(SP.dust); }
  // the edge of the Depths: a glowing bubble you cannot fly through
  SP.bubC = new THREE.Vector3(0, 0, -600); SP.bubR = 3900;
  SP.bubble = new THREE.Mesh(new THREE.SphereGeometry(SP.bubR, 96, 48), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { t: { value: 0 }, cam: { value: new THREE.Vector3() }, ctr: { value: SP.bubC } },
    vertexShader: 'varying vec3 wp;varying vec3 wn;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;wn=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float t;uniform vec3 cam;uniform vec3 ctr;varying vec3 wp;varying vec3 wn;
void main(){vec3 v=normalize(wp-cam);float f=pow(1.-abs(dot(v,wn)),3.);vec3 d=normalize(wp-ctr);
 float la=asin(d.y)*28.,lo=atan(d.z,d.x)*28.;vec2 q=vec2(lo+la*.5,la*.866);vec2 g=abs(fract(q)-.5);float hex=smoothstep(.43,.5,max(g.x,g.y));
 float dist=length(wp-cam);float near=smoothstep(2200.,250.,dist);
 float wave=.5+.5*sin(la*.35+lo*.25-t*.8);
 float a=.02+f*.45+hex*(.025+near*.55)*(.4+.6*wave)+near*.06;
 gl_FragColor=vec4(vec3(.3,.78,.95)*a,1.);}` }));
  SP.bubble.position.copy(SP.bubC); SP.bubble.renderOrder = 5; S.add(SP.bubble);
  buildShip();
  buildSites();
  buildDecor();
  buildCreatures();
}
function updateDust(camPos, box) {
  const a = SP.dust.geometry.attributes.position, b = SP.dustBase; for (let i = 0; i < a.count; i++) {
    const x = b[i * 3] * box, y = b[i * 3 + 1] * box, z = b[i * 3 + 2] * box;
    a.setXYZ(i, camPos.x + ((x - camPos.x) % box + box * 1.5) % box - box / 2, camPos.y + ((y - camPos.y) % box + box * 1.5) % box - box / 2, camPos.z + ((z - camPos.z) % box + box * 1.5) % box - box / 2);
  }
  a.needsUpdate = true; SP.dust.material.size = box / 280;
}

// ---- ship exterior ----
function buildShip() {
  const ship = new THREE.Group(); SP.ship = ship; SP.scene.add(ship);
  const hull = new THREE.MeshPhongMaterial({ map: TX.hull, normalMap: TX.hullN, emissiveMap: TX.hullE, emissive: 0xffffff, emissiveIntensity: 1.1, shininess: 22, specular: 0x2a2a2a });
  const dark = new THREE.MeshPhongMaterial({ map: TX.hull, normalMap: TX.hullN, color: 0x6a6e72, shininess: 30 });
  const steel = new THREE.MeshPhongMaterial({ color: 0x5c6266, shininess: 50, specular: 0x444444 });
  SP.hullMat = hull;
  // forward habitat block (holds the interior)
  hbox(29.2, 7.8, 76, hull, 0, 2.7, 1, ship);
  const keel = new THREE.Mesh(frustum(29.2, 2.4, 9, .9, 28), hull); keel.position.set(0, -.2, -37); ship.add(keel);
  const brow = new THREE.Mesh(frustum(29.2, 2.8, 22, 1, 6, 24, .7), hull); brow.position.set(0, 5.2, -37); ship.add(brow);
  // windows (lit from inside)
  const winM = new THREE.MeshBasicMaterial({ color: 0x2c4a52 }); const winL = new THREE.MeshBasicMaterial({ color: 0xb8c8b0 });
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.9), winM); w.position.set(0, 2.35, -37.05); w.rotation.y = Math.PI; ship.add(w); const lit = new THREE.Mesh(new THREE.PlaneGeometry(13.6, .25), winL); lit.position.set(0, 3.6, -37.07); lit.rotation.y = Math.PI; ship.add(lit); }
  for (const [z0, z1] of [[-8.5, -.5], [19, 23]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 1.6), new THREE.MeshBasicMaterial({ color: 0x8a7a58 })); w.position.set(-14.65, 1.8, (z0 + z1) / 2); w.rotation.y = -Math.PI / 2; ship.add(w); }
  // airlock door outside
  { const fr = hbox(.5, 3.2, 3.2, steel, 14.7, 1.4, 9, ship, 4); const dm = new THREE.MeshLambertMaterial({ map: TX.hazard }); const strip = new THREE.Mesh(new THREE.BoxGeometry(.52, .25, 3.2), dm); strip.position.set(14.7, 3.1, 9); ship.add(strip);
    SP.extDoor = []; for (const s of [-1, 1]) { const p = hbox(.3, 2.6, .8, dark, 14.8, 1.3, 9 + s * .4, ship, 4); SP.extDoor.push(p); }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshBasicMaterial({ color: 0x40ff80 })); lamp.position.set(14.9, 3.4, 10.6); ship.add(lamp); SP.airLamp = lamp; const gl = glow(0x60ff90, 4, .8); gl.position.copy(lamp.position); gl.position.x += .4; ship.add(gl); SP.airGlow = gl;
    SP.airlockLocal = new THREE.Vector3(16.2, 1.3, 9); }
  // spine
  hbox(10, 9, 196, hull, 0, 3, 136, ship);
  hbox(4, 3, 190, dark, 0, 9, 136, ship);
  for (let z = 50; z < 230; z += 22) hbox(12, 10.5, 2, steel, 0, 3, z, ship, 8);
  // rings
  for (const z of [92, 168]) { const r = new THREE.Mesh(new THREE.TorusGeometry(26, 2.2, 10, 48), dark); r.position.set(0, 3, z); ship.add(r); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; const sp = hbox(1.6, 22, 1.6, steel, Math.cos(a) * 15, 3 + Math.sin(a) * 15, z, ship, 8); sp.rotation.z = a - Math.PI / 2; } SP.solids.push({ ring: true, z, R: 26, r: 2.4 }); }
  // containers (instanced)
  { const geo = boxUV(new THREE.BoxGeometry(6, 5, 12), 6, 5, 12, 6); const mat = new THREE.MeshPhongMaterial({ map: TX.cont, normalMap: TX.contN, shininess: 20 }); const cols = [0x8a3a2a, 0x2d5f63, 0x9a7a30, 0x4c5258, 0x6a2f48]; const r = rng(77); const list = [];
    for (let z = 46; z < 224; z += 13.2) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) if (r() < .85) list.push([s * 8.4, .6 + k * 5.2, z, cols[r() * cols.length | 0]]);
    const im = new THREE.InstancedMesh(geo, mat, list.length); const m4 = new THREE.Matrix4(); list.forEach((c, i) => { m4.makeTranslation(c[0], c[1], c[2]); im.setMatrixAt(i, m4); im.setColorAt(i, new THREE.Color(c[3])); }); ship.add(im); }
  // engine block
  hbox(48, 26, 46, hull, 0, 3, 257, ship);
  { const coll = new THREE.Mesh(frustum(48, 26, 12, 10, 18), hull); coll.position.set(0, 3, 234); ship.add(coll); }
  SP.nozzles = []; SP.plumes = [];
  const plumeM = new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, y] of [[-12, -3], [12, -3], [-12, 10], [12, 10]]) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 12, 24, 1, true), new THREE.MeshPhongMaterial({ color: 0x3a3d40, side: THREE.DoubleSide, shininess: 40 })); n.rotation.x = Math.PI / 2; n.position.set(x, y, 286); ship.add(n);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshBasicMaterial({ color: 0x9fdcff })); disc.position.set(x, y, 282); ship.add(disc); SP.nozzles.push(disc);
    const g = glow(0x6ab8ff, 26, .8); g.position.set(x, y, 290); ship.add(g); SP.nozzles.push(g);
    const pl = new THREE.Mesh(new THREE.ConeGeometry(5.5, 40, 20, 1, true), plumeM); pl.rotation.x = -Math.PI / 2; pl.position.set(x, y, 312); ship.add(pl); SP.plumes.push(pl);
  }
  // radiator fins
  { const c = cv(64, 256), x = c.getContext('2d'); x.fillStyle = '#2a2c2e'; x.fillRect(0, 0, 64, 256); for (let i = 6; i < 256; i += 12) { x.fillStyle = '#b05020'; x.fillRect(4, i, 56, 2); } grime(c, null, .6, 2, 44, .5); const e = mkTex(c);
    const fm = new THREE.MeshPhongMaterial({ map: e, emissiveMap: e, emissive: 0xff7733, emissiveIntensity: .35, color: 0x555555, side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), fm); f.rotation.y = Math.PI / 2; f.position.set(s * 26, 3, 250); f.rotation.z = Math.PI / 2; f.position.x = s * 44; f.rotation.set(-Math.PI / 2, 0, 0); f.position.set(s * 44, 3, 250); ship.add(f); hbox(16, 1.5, 4, steel, s * 30, 3, 250, ship, 8); }
  }
  // masts, dish
  for (const [x, z, h] of [[-9, -20, 14], [10, 12, 9], [-4, 30, 11]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.25, .4, h, 8), steel); m.position.set(x, 6.6 + h / 2, z); ship.add(m); const b = glow(0xff4040, 3, 1); b.position.set(x, 6.6 + h, z); ship.add(b); SP.blink = SP.blink || []; SP.blink.push(b); }
  { const d = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8, 0, TAU, 0, 1.1), new THREE.MeshPhongMaterial({ color: 0xbfc4c6, side: THREE.DoubleSide, shininess: 40 })); d.position.set(9, 8.4, 18); d.rotation.x = -.9; ship.add(d); }
  // nav lights
  for (const [x, c] of [[-14.8, 0xff3030], [14.8, 0x30ff60]]) { const g = glow(c, 5, 1); g.position.set(x, 5, -30); ship.add(g); SP.blink.push(g); }
  { const g = glow(0xffffff, 8, 1); g.position.set(0, 16, 257); ship.add(g); SP.strobe = g; }
  // floodlights: one real spotlight plus soft beams through the fog
  SP.flood = new THREE.SpotLight(0xdfe9ef, 900, 520, .42, .6, 1.25); SP.flood.position.set(0, 8, -40); ship.add(SP.flood); SP.flood.target.position.set(0, -20, -400); ship.add(SP.flood.target);
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.6, 12), steel); h.rotation.x = Math.PI / 2; h.position.set(sx * 9, 6.6, -37.5); ship.add(h); const l = glow(0xffffff, 7, 1); l.position.set(sx * 9, 6.4, -38.6); ship.add(l); }
  // ---- surface detail ----
  { const r = rng(808); const hi = G.set.gfx === 'high'; const N = hi ? 900 : 420; const geo = new THREE.BoxGeometry(1, 1, 1);
    const gm = new THREE.MeshPhongMaterial({ map: TX.trim, normalMap: TX.trimN, shininess: 35, specular: 0x333333 });
    const im = new THREE.InstancedMesh(geo, gm, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(); let k = 0;
    // surfaces: [axis, sign, plane, u-range, v-range]
    const surf = [['y', 1, 6.6, [-14, 14], [-36, 38]], ['x', 1, 14.6, [-1, 6], [-36, 38]], ['x', -1, -14.6, [-1, 6], [-36, 38]], ['y', 1, 7.5, [-4.5, 4.5], [40, 230]], ['x', 1, 5, [-1, 7], [40, 230]], ['x', -1, -5, [-1, 7], [40, 230]], ['y', 1, 16, [-23, 23], [235, 279]], ['x', 1, 24, [-9, 15], [235, 279]], ['x', -1, -24, [-9, 15], [235, 279]], ['y', -1, -10, [-23, 23], [235, 279]], ['y', -1, -1.2, [-14, 14], [-36, 38]]];
    while (k < N) { const S2 = surf[(r() * surf.length) | 0]; const u = lerp(S2[3][0], S2[3][1], r()), v = lerp(S2[4][0], S2[4][1], r()); const w = .4 + r() * r() * 3.2, h = .2 + r() * r() * 1.4, d = .4 + r() * r() * 4;
      if (S2[0] === 'y') { pos.set(u, S2[2] + S2[1] * h / 2, v); sc.set(w, h, d); } else { pos.set(S2[2] + S2[1] * h / 2, u, v); sc.set(h, w, d); }
      if (S2 === surf[1] && Math.abs(v - 9) < 3 && u < 4) continue; // keep the airlock clear
      m4.compose(pos, q, sc); im.setMatrixAt(k, m4); const g = .55 + r() * .5; im.setColorAt(k, col.setRGB(g, g, g * (1 + (r() - .5) * .1))); k++; }
    ship.add(im);
    // command tower
    const tw = new THREE.Mesh(frustum(18, 5, 11, 3.5, 22, 24, .4), hull); tw.position.set(0, 9.1, 2); ship.add(tw);
    const twTop = hbox(11, 1.2, 9, dark, 0, 11.6, -12, ship, 12);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(10.5, .7), new THREE.MeshBasicMaterial({ color: 0xcfe2d8 })); band.position.set(0, 10.3, -20.15); band.rotation.y = Math.PI; band.rotation.x = -.06; ship.add(band);
    for (const sx of [-1, 1]) { const sb = new THREE.Mesh(new THREE.PlaneGeometry(20, .5), new THREE.MeshBasicMaterial({ color: 0xbcd0c8 })); sb.position.set(sx * 7.6, 10, -9); sb.rotation.y = sx * Math.PI / 2; sb.rotation.z = sx * .0; ship.add(sb); }
    for (const [x, z, hgt] of [[-3, -4, 9], [2.5, -6, 6], [0, 6, 12]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.15, .3, hgt, 6), steel); m.position.set(x, 12.2 + hgt / 2, z); ship.add(m); const g = glow(0xff4040, 3, 1); g.position.set(x, 12.2 + hgt, z); ship.add(g); SP.blink.push(g); }
    // armour plates on the habitat sides
    for (const sx of [-1, 1]) for (let z = -32; z < 36; z += 9) { if (sx > 0 && Math.abs(z + 4.5 - 9) < 5) continue; const pl = hbox(.6, 3.2, 8.4, hull, sx * 14.9, -0.2, z + 4.5, ship, 24); pl.rotation.z = sx * .25; }
    // pipes along the spine
    for (const sx of [-1, 1]) for (const [y, rad] of [[1.2, .55], [5.4, .4], [7.6, .3]]) { const pp = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 190, 10), y > 5 ? steel : dark); pp.rotation.x = Math.PI / 2; pp.position.set(sx * 5.4, y, 136); ship.add(pp); }
    // engine block ribs and heat vents
    const ventM = new THREE.MeshBasicMaterial({ color: 0xff7a3a }); SP.vents = ventM;
    for (const sx of [-1, 1]) { for (let z = 238; z < 278; z += 5) hbox(1.2, 26.5, 1.2, steel, sx * 24.3, 3, z, ship, 6); for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.PlaneGeometry(8, .5), ventM); v.position.set(sx * 24.95, -4 + i * 3.4, 256); v.rotation.y = sx * Math.PI / 2; ship.add(v); } }
    // running lights under the spine (they chase toward the stern)
    SP.run = []; for (let z = 45; z < 230; z += 12) { const g = glow(0x9fe0ff, 3.5, 1); g.position.set(0, -1.9, z); ship.add(g); SP.run.push(g); }
    // forward sensor domes
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x20262a, shininess: 120, specular: 0x8899aa })); d.position.set(sx * 9, 6.6, 26); ship.add(d); }
  }
  // collision boxes (ship local) for spacewalks
  SP.shipBoxes = [[-14.6, -1.2, -37, 14.6, 6.6, 39], [-14.6, -1.4, -65, 14.6, 1, -37], [-5, -1.5, 39, 5, 10.5, 233], [-11.6, -2, 40, 11.6, 8.5, 228], [-24, -10, 234, 24, 16, 292], [-46, 1, 230, 46, 5, 270]];
}

// ---- rocks ----
const ROCK_GEOS = [];
function rockGeo(seed, detail) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; const o = seed * 3.7; const col = [];
  const v = new THREE.Vector3(); const cache = new Map();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const key = v.x.toFixed(3) + v.y.toFixed(3) + v.z.toFixed(3); let d = cache.get(key); if (d === undefined) { d = .72 + fbm3(v.x * 1.6 + o, v.y * 1.6, v.z * 1.6 - o, 4) * .6 + (vn3(v.x * 4 + o, v.y * 4, v.z * 4) - .5) * .12; cache.set(key, d); } v.multiplyScalar(d); v.y *= .82; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i); const n = fbm3(v.x * 3 + o, v.y * 3, v.z * 3, 3); const s = .55 + n * .5; for (let k = 0; k < 3; k++) col.push(.15 * s, .14 * s, .13 * s); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
const SITE_T = {
  ore: { name: 'Rock field', res: 'ore', tint: [1, .92, .82] }, ice: { name: 'Pale field', res: 'ice', tint: [.8, .9, 1.05] },
  glass: { name: 'Deepglass garden', res: 'glass', tint: [.82, .78, .95] }, wreck: { name: 'Wreck', res: 'scrap', tint: [.9, .9, .9] },
};
const RES_NAME = { ore: 'Ore', ice: 'Ice', glass: 'Deepglass', scrap: 'Scrap', samples: 'Samples' };
function buildSites() {
  for (let i = 0; i < 6; i++) ROCK_GEOS.push(rockGeo(i + 1, i < 3 ? 2 : 1));
  const r = rng(2024); const pts = [[0, 0, -430, 'ore'], [260, 25, -760, 'ice'], [-420, -15, -620, 'wreck'], [-120, 30, -1150, 'glass']];
  const types = ['ore', 'ice', 'glass', 'wreck', 'ore', 'wreck'];
  let tries = 0; while (pts.length < 26 && tries++ < 4000) { const a = r() * TAU, d = 500 + r() * 2900; const p = [Math.cos(a) * d, (r() - .5) * 140, Math.sin(a) * d - 600]; if (pts.every(q => Math.hypot(q[0] - p[0], q[2] - p[2]) > 380)) pts.push([...p, types[(r() * types.length) | 0]]); }
  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  SP.rockMat = rockMat;
  const filler = ROCK_GEOS.map(() => []);
  pts.forEach((p, i) => {
    const s = { i, type: p[3], c: new THREE.Vector3(p[0], p[1], p[2]), rocks: [], deps: [], known: i < 1, name: SITE_T[p[3]].name + ' ' + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? i : ''), group: new THREE.Group() };
    SP.scene.add(s.group); s.group.position.copy(s.c);
    const sr = rng(500 + i); const nR = s.type === 'wreck' ? 6 : 10 + (sr() * 6 | 0);
    for (let k = 0; k < nR; k++) { const rad = 5 + sr() * (k < 3 ? 22 : 12); const pos = new THREE.Vector3((sr() - .5) * 150, (sr() - .5) * 60, (sr() - .5) * 150); s.rocks.push({ p: pos.clone().add(s.c), r: rad * .85 }); filler[(sr() * 6) | 0].push({ p: pos.add(s.c), r: rad, rot: [sr() * TAU, sr() * TAU, sr() * TAU], tint: SITE_T[s.type].tint, v: .8 + sr() * .35 }); }
    if (s.type === 'wreck') buildWreck(s, sr);
    const nD = 9 + (sr() * 5 | 0);
    for (let k = 0; k < nD; k++) {
      const rk = s.rocks[(sr() * s.rocks.length) | 0]; const dir = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize();
      const pos = rk.p.clone().add(dir.multiplyScalar(rk.r * 1.15 + 1)).sub(s.c);
      addDeposit(s, s.type === 'wreck' ? 'scrap' : SITE_T[s.type].res, pos, sr);
    }
    if (s.type === 'wreck' || s.type === 'glass') { const n = 1 + (sr() * 2 | 0); for (let k = 0; k < n; k++) { const rk = s.rocks[(sr() * s.rocks.length) | 0]; const dir = new THREE.Vector3(sr() - .5, sr() * .5, sr() - .5).normalize(); addDeposit(s, 'samples', rk.p.clone().add(dir.multiplyScalar(rk.r + .8)).sub(s.c), sr); } }
    SP.sites.push(s);
  });
  filler.forEach((list, gi) => { const im = new THREE.InstancedMesh(ROCK_GEOS[gi], rockMat, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); list.forEach((f, k) => { q.setFromEuler(e.set(...f.rot)); m4.compose(f.p, q, new THREE.Vector3(f.r, f.r, f.r)); im.setMatrixAt(k, m4); im.setColorAt(k, new THREE.Color(f.tint[0] * f.v, f.tint[1] * f.v, f.tint[2] * f.v)); }); SP.scene.add(im); });
  for (const s of SP.sites) for (const rk of s.rocks) SP.solids.push({ p: rk.p, r: rk.r });
}
function buildWreck(s, sr) {
  const hull = SP.hullMat; const dark = new THREE.MeshPhongMaterial({ map: TX.hull, normalMap: TX.hullN, color: 0x6a6460, shininess: 15 });
  const g = new THREE.Group(); g.rotation.set(sr() * .6, sr() * TAU, sr() * .8 - .4); s.group.add(g);
  hbox(14, 10, 60, dark, 0, 0, 0, g); const f = new THREE.Mesh(frustum(14, 10, 4, 3, 20), dark); f.position.z = -30; g.add(f);
  for (let i = 0; i < 6; i++) { const p = hbox(2 + sr() * 6, .5, 4 + sr() * 10, dark, (sr() - .5) * 30, (sr() - .5) * 20, (sr() - .5) * 70, g); p.rotation.set(sr() * 3, sr() * 3, sr() * 3); }
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 10 + sr() * 14, 6), dark); b.position.set((sr() - .5) * 20, 6, (sr() - .5) * 50); b.rotation.set(sr() * 2, 0, sr() * 2); g.add(b); }
  const lt = glow(0xff6040, 5, .9); lt.position.set(7.2, 4, -10); g.add(lt); s.blink = lt;
  s.rocks.push({ p: s.c.clone(), r: 9 }); s.rocks.push({ p: s.c.clone().add(new THREE.Vector3(0, 0, 22).applyEuler(g.rotation)), r: 8 }); s.rocks.push({ p: s.c.clone().add(new THREE.Vector3(0, 0, -22).applyEuler(g.rotation)), r: 8 });
}
const DEP_MAT = {};
function depMats() {
  if (DEP_MAT.ore) return DEP_MAT;
  DEP_MAT.ore = new THREE.MeshPhongMaterial({ color: 0xb2662e, emissive: 0x2a1004, shininess: 90, specular: 0xffc080, flatShading: true });
  DEP_MAT.ice = new THREE.MeshPhongMaterial({ color: 0xbfe4f5, emissive: 0x16303c, shininess: 120, specular: 0xffffff, transparent: true, opacity: .88, flatShading: true });
  DEP_MAT.glass = new THREE.MeshPhongMaterial({ color: 0x9a6ae0, emissive: 0x4a1ea0, shininess: 120, specular: 0xffffff, flatShading: true });
  DEP_MAT.scrap = new THREE.MeshPhongMaterial({ map: TX.hull, color: 0x9a9894, shininess: 40, flatShading: true });
  DEP_MAT.samples = new THREE.MeshPhongMaterial({ color: 0x7af0a0, emissive: 0x2a9a50, shininess: 60 });
  DEP_MAT.base = new THREE.MeshLambertMaterial({ color: 0x3e3a36, flatShading: true });
  return DEP_MAT;
}
function addDeposit(s, type, pos, sr) {
  const M = depMats(); const g = new THREE.Group(); g.position.copy(pos); s.group.add(g); const r = type === 'samples' ? .8 : 1.6 + sr() * .9;
  if (type === 'scrap') { for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.6 + sr() * 1.4, .25 + sr() * .5, .6 + sr() * 1.6), M.scrap); b.position.set((sr() - .5) * 1.4, (sr() - .5) * 1, (sr() - .5) * 1.4); b.rotation.set(sr() * 3, sr() * 3, sr() * 3); g.add(b); } const l = glow(0xffa060, 2.2, .5); g.add(l); }
  else if (type === 'samples') { const pod = new THREE.Mesh(new THREE.SphereGeometry(.35, 12, 10), M.samples); pod.scale.set(1, 1.4, 1); g.add(pod); for (let i = 0; i < 3; i++) { const p2 = pod.clone(); p2.scale.multiplyScalar(.55); p2.position.set((sr() - .5) * .7, -.3, (sr() - .5) * .7); g.add(p2); } const l = glow(0x6aff9a, 5, .9); g.add(l); }
  else {
    const base = new THREE.Mesh(ROCK_GEOS[(sr() * 6) | 0], SP.rockMat); base.scale.setScalar(r * .7); g.add(base);
    const n = 5 + (sr() * 5 | 0); for (let i = 0; i < n; i++) {
      const geo = type === 'glass' ? new THREE.OctahedronGeometry(.3, 0) : type === 'ice' ? new THREE.IcosahedronGeometry(.42, 0) : new THREE.DodecahedronGeometry(.3, 0);
      const c = new THREE.Mesh(geo, M[type]); const d = new THREE.Vector3(sr() - .5, sr() - .2, sr() - .5).normalize(); c.position.copy(d.multiplyScalar(r * .62)); c.lookAt(c.position.clone().multiplyScalar(2)); if (type === 'glass') c.scale.set(.8, .8, 2.6 + sr() * 2); else c.scale.setScalar(.8 + sr() * .9); g.add(c);
    }
    if (type === 'glass') { const l = glow(0xa070ff, 6, .55); g.add(l); }
  }
  g.rotation.set(sr() * 3, sr() * 3, sr() * 3);
  const max = type === 'samples' ? 1 : 6 + (sr() * 6 | 0);
  s.deps.push({ g, type, r: r + .3, amt: max, max, wp: pos.clone().add(s.c), site: s, key: s.i + ':' + s.deps.length });
}

// ---- weird decorations ----
function stoneMat(c) { return new THREE.MeshLambertMaterial({ color: c || 0x8a8680, flatShading: true }); }
const DECOR = {
  hand(g, r) { const m = stoneMat(); hbox(9, 11, 3, m, 0, 0, 0, g); for (let i = 0; i < 4; i++) { let px = -3.4 + i * 2.25, len = 8 + Math.sin(i * 1.3) * 2; const f1 = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1, len, 7), m); f1.position.set(px, 5.5 + len / 2, 0); f1.rotation.x = -.2 - i * .1; g.add(f1); const f2 = new THREE.Mesh(new THREE.CylinderGeometry(.75, .9, len * .7, 7), m); f2.position.set(0, len / 2 + len * .3, -1.2); f2.rotation.x = -.6; f1.add(f2); } const th = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 7, 7), m); th.position.set(5.5, 2, 1); th.rotation.z = -.9; g.add(th); const wr = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 14, 8), m); wr.position.y = -12; g.add(wr); return 18; },
  ring(g, r) { const m = stoneMat(0x6f6e6a); const t = new THREE.Mesh(new THREE.TorusGeometry(40, 3, 8, 40), m); g.add(t); const gm = new THREE.MeshBasicMaterial({ color: 0x5fd0c8 }); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, .3), gm); b.position.set(Math.cos(a) * 40, Math.sin(a) * 40, 3.1); b.rotation.z = a; g.add(b); } const gl = glow(0x5fd0c8, 90, .18); g.add(gl); return 44; },
  stairs(g, r) { const m = stoneMat(0x9a948a); const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 70, 8), m); g.add(pole); for (let i = 0; i < 46; i++) { const s = hbox(8, .8, 3, m, 0, 0, 0, g); const a = i * .4; s.position.set(Math.cos(a) * 5, -33 + i * 1.5, Math.sin(a) * 5); s.rotation.y = -a; } return 14; },
  doors(g, r) { const m = stoneMat(0x5e5850); const lit = new THREE.MeshBasicMaterial({ color: 0xf2c47a }); const dk = new THREE.MeshBasicMaterial({ color: 0x050607 }); for (let i = 0; i < 7; i++) { const d = new THREE.Group(); d.position.set(i * 9 - 27, Math.sin(i) * 3, Math.cos(i * 1.7) * 4); d.rotation.set(Math.sin(i) * .2, i * .25, Math.cos(i) * .15); g.add(d); hbox(1, 9, 1, m, -2.5, 0, 0, d); hbox(1, 9, 1, m, 2.5, 0, 0, d); hbox(6, 1, 1, m, 0, 4.5, 0, d); const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), i % 3 == 1 ? lit : dk); p.material = i % 3 == 1 ? lit : dk; p.material.side = THREE.DoubleSide; p.position.y = -.5; d.add(p); if (i % 3 == 1) { const gl = glow(0xf2c47a, 16, .5); d.add(gl); } } return 34; },
  mask(g, r) { const m = stoneMat(0xb8b2a6); const f = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12, 0, Math.PI, 0, Math.PI), m); f.scale.set(1, 1.3, .55); f.rotation.y = -Math.PI / 2; g.add(f); const dk = new THREE.MeshBasicMaterial({ color: 0x000000 }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), dk); e.scale.set(1.3, .8, .5); e.position.set(s * 5, 3, -7.1); g.add(e); } const n = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 4), m); n.position.set(0, -1, -7.5); n.rotation.x = -Math.PI / 2 + .3; g.add(n); const mo = new THREE.Mesh(new THREE.BoxGeometry(7, .9, 1), dk); mo.position.set(0, -8, -7); g.add(mo); return 18; },
  chandelier(g, r) { const m = new THREE.MeshPhongMaterial({ color: 0x8a6a30, shininess: 70, specular: 0xffd080 }); for (const [rad, y] of [[14, 0], [9, -6], [5, -11]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(rad, .5, 6, 32), m); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); for (let i = 0; i < Math.round(rad * .8); i++) { const a = i / Math.round(rad * .8) * TAU; const c = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0xe8e0c8 })); c.position.set(Math.cos(a) * rad, y - 1.2, Math.sin(a) * rad); g.add(c); const fl = glow(0xffb050, 3, .9); fl.position.set(c.position.x, y - 2.2, c.position.z); g.add(fl); } } for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const ch = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 30, 4), m); ch.position.set(Math.cos(a) * 7, 13, Math.sin(a) * 7); ch.rotation.z = Math.cos(a) * .25; ch.rotation.x = -Math.sin(a) * .25; g.add(ch); } g.rotation.z = Math.PI; return 18; },
  monoliths(g, r) { const m = new THREE.MeshPhongMaterial({ color: 0x0c0d0e, shininess: 120, specular: 0x556066 }); for (let i = 0; i < 5; i++) { const s = hbox(4, 26 + r() * 10, 1.4, m, (i - 2) * 9, 0, Math.sin(i * 2) * 6, g); s.rotation.set((r() - .5) * .4, r() * .5, (r() - .5) * .4); } return 26; },
  clock(g, r) { const c = cv(512, 512), x = c.getContext('2d'); x.fillStyle = '#d8d0bc'; x.beginPath(); x.arc(256, 256, 250, 0, TAU); x.fill(); x.strokeStyle = '#2a2420'; x.lineWidth = 10; x.stroke(); x.font = 'bold 54px Georgia, serif'; x.fillStyle = '#2a2420'; x.textAlign = 'center'; x.textBaseline = 'middle'; const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2; x.fillText(R[(12 - i) % 12], 256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200); } grime(c, null, .9, 3, 55, 1); const f = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 2, 40), [new THREE.MeshLambertMaterial({ color: 0x4a3a2a }), new THREE.MeshLambertMaterial({ map: mkTex(c) }), new THREE.MeshLambertMaterial({ color: 0x4a3a2a })]); f.rotation.x = Math.PI / 2; g.add(f); const hm = new THREE.MeshLambertMaterial({ color: 0x1a1612 }); const h1 = new THREE.Group(), h2 = new THREE.Group(); h1.position.z = 1.2; h2.position.z = 1.4; g.add(h1); g.add(h2); hbox(1, 10, .3, hm, 0, 5, 0, h1); hbox(.6, 15, .3, hm, 0, 7.5, 0, h2); g.userData.tick = (t) => { h1.rotation.z = t * .02; h2.rotation.z = t * .24; }; return 20; },
  tree(g, r) { const m = stoneMat(0x3a332c); const br = (p, len, rad, d, dir) => { const geo = new THREE.CylinderGeometry(rad * .6, rad, len, 6); geo.translate(0, len / 2, 0); const b = new THREE.Mesh(geo, m); b.position.copy(p); b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(b); if (d > 0) { const end = p.clone().add(dir.clone().multiplyScalar(len)); for (let i = 0; i < 2 + (r() < .4); i++) { const nd = dir.clone().add(new THREE.Vector3(r() - .5, r() * .3, r() - .5).multiplyScalar(1.4)).normalize(); br(end, len * .7, rad * .6, d - 1, nd); } } }; br(new THREE.Vector3(0, 0, 0), 14, 2.4, 3, new THREE.Vector3(0, 1, 0)); br(new THREE.Vector3(0, 0, 0), 10, 2.2, 2, new THREE.Vector3(0, -1, 0)); return 22; },
  statue(g, r) { const m = stoneMat(0xc4c0b8); hbox(6, 9, 4, m, 0, 0, 0, g); const h = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), m); h.position.set(0, 7, -1.5); g.add(h); for (const s of [-1, 1]) { const a = hbox(1.6, 9, 1.6, m, s * 3.6, -1, -2.5, g); a.rotation.x = -.7; const l = hbox(2, 7, 2, m, s * 1.6, -6, -3, g); l.rotation.x = 1.3; } g.rotation.x = .3; return 12; },
  whale(g, r) { const m = stoneMat(0xd8d2c4); for (let i = 0; i < 26; i++) { const t = i / 25; const v = new THREE.Mesh(new THREE.SphereGeometry(1.4 - t * .8, 7, 5), m); v.position.set(0, Math.sin(t * 3) * 3, i * 3.2 - 40); g.add(v); if (i > 3 && i < 18) { const rb = new THREE.Mesh(new THREE.TorusGeometry(7 - Math.abs(i - 10) * .4, .35, 4, 14, Math.PI * 1.1), m); rb.position.copy(v.position); rb.rotation.set(0, Math.PI / 2, Math.PI * .95); g.add(rb); } } const sk = new THREE.Mesh(new THREE.ConeGeometry(4, 14, 7), m); sk.rotation.x = -Math.PI / 2; sk.position.set(0, 0, -48); g.add(sk); return 30; },
  cages(g, r) { const m = new THREE.MeshPhongMaterial({ color: 0x4a4440, shininess: 40 }); for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 8, len = 14 + r() * 16; const ch = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, len, 4), m); ch.position.set(x, len / 2, 0); g.add(ch); const cg = new THREE.Group(); cg.position.set(x, -2.5, 0); g.add(cg); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; const bar = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 5, 4), m); bar.position.set(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8); cg.add(bar); } const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.5, 10), m); top.position.y = 3.2; cg.add(top); const bt = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, .3, 10), m); bt.position.y = -2.5; cg.add(bt); } return 18; },
};
function lighthouse(g) {
  const m = new THREE.MeshLambertMaterial({ color: 0xd8d4cc }), rd = new THREE.MeshLambertMaterial({ color: 0x8a2a24 });
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(6 - i * .5, 6.5 - i * .5, 8, 16), i % 2 ? rd : m); t.position.y = i * 8; g.add(t); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 5, 12), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); lamp.position.y = 49; g.add(lamp); const cap = new THREE.Mesh(new THREE.ConeGeometry(4, 4, 12), rd); cap.position.y = 53.5; g.add(cap);
  const gl = glow(0xffe8b0, 60, .9); gl.position.y = 49; g.add(gl);
  const beamM = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Group(); beam.position.y = 49; g.add(beam); const b = new THREE.Mesh(new THREE.ConeGeometry(14, 300, 16, 1, true), beamM); b.geometry.translate(0, -150, 0); b.rotation.z = Math.PI / 2; beam.add(b);
  const rock = new THREE.Mesh(ROCK_GEOS[0], SP.rockMat); rock.scale.set(16, 10, 16); rock.position.y = -10; g.add(rock);
  g.userData.tick = t => { beam.rotation.y = t * .5; };
  return 30;
}
function buildDecor() {
  const r = rng(4242); const kinds = Object.keys(DECOR);
  for (let i = 0; i < 34; i++) {
    let p, ok = false; for (let k = 0; k < 50 && !ok; k++) { const a = r() * TAU, d = 250 + r() * 3200; p = new THREE.Vector3(Math.cos(a) * d, (r() - .5) * 200, Math.sin(a) * d - 600); ok = SP.sites.every(s => s.c.distanceTo(p) > 220) && SP.decor.every(d2 => d2.p.distanceTo(p) > 260); }
    if (!ok) continue;
    const g = new THREE.Group(); const kind = i < kinds.length ? kinds[i] : kinds[(r() * kinds.length) | 0]; const sc = 1 + r() * 1.6; const rad = DECOR[kind](g, r) * sc;
    g.scale.setScalar(sc); g.position.copy(p); g.rotation.set((r() - .5) * .8, r() * TAU, (r() - .5) * .8); SP.scene.add(g);
    SP.decor.push({ g, p, r: rad, kind, spin: (r() - .5) * .01 });
  }
  // the drowned lighthouse, far out
  const g = new THREE.Group(); lighthouse(g); g.scale.setScalar(1.6); const p = new THREE.Vector3(1900, -30, -3100); g.position.copy(p); g.rotation.z = .2; SP.scene.add(g); SP.lighthouse = { g, p, r: 60, kind: 'lighthouse', spin: 0 }; SP.decor.push(SP.lighthouse);
  for (const d of SP.decor) SP.solids.push({ p: d.p, r: d.r * .6 });
}

// ---- creatures ----
function buildCreatures() {
  const skin = new THREE.MeshLambertMaterial({ color: 0x2a3438, emissive: 0x060a0c, flatShading: true });
  const belly = new THREE.MeshLambertMaterial({ color: 0x55605c, flatShading: true });
  const r = rng(99);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); SP.scene.add(g); const segs = [];
    for (let k = 0; k < 16; k++) { const s = (k < 3 ? 1 : 1 - (k - 3) / 15) * 9 + 1.5; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), skin); m.scale.set(1, .8, 1.3); g.add(m); segs.push(m); if (k % 2 == 0 && k > 2) { const fin = new THREE.Mesh(new THREE.ConeGeometry(s * .35, s * 1.6, 4), belly); fin.position.y = s * .9; fin.rotation.x = -.6; m.add(fin); } }
    const head = segs[0]; head.scale.set(1.3, 1, 1.6);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), belly); jaw.position.set(0, -2, -4); head.add(jaw);
    for (let t = 0; t < 10; t++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(.6, 3.5, 4), new THREE.MeshLambertMaterial({ color: 0xd8d0c0 })); const a = t / 9 * Math.PI - Math.PI / 2; tooth.position.set(Math.sin(a) * 8, -2.2, -4 - Math.cos(a) * 8); tooth.rotation.x = Math.PI; head.add(tooth); }
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(.25, .4, 14, 5), skin); stalk.position.set(0, 9, -10); stalk.rotation.x = .9; head.add(stalk);
    const lure = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xc8fff0 })); lure.position.set(0, 13, -17); head.add(lure); const lg = glow(0x9affe0, 26, .9); lure.add(lg);
    const home = new THREE.Vector3((r() - .5) * 5000, (r() - .5) * 120, -600 - r() * 3000 + 600);
    if (home.length() < 900) home.setLength(900 + r() * 400);
    const G2 = { g, segs, head, home, pos: home.clone(), vel: new THREE.Vector3(), state: 'roam', t: 0, wp: home.clone(), lure, lostT: 0, cool: 0, spacing: 9 };
    segs.forEach((s, k) => s.position.copy(home).add(new THREE.Vector3(0, 0, k * 9)));
    SP.gulpers.push(G2);
  }
  // drifters: pale glowing jellies (harmless)
  const jm = new THREE.MeshBasicMaterial({ color: 0x9fe8e0, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const tm = new THREE.LineBasicMaterial({ color: 0x8fd8d0, transparent: true, opacity: .35, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 46; i++) {
    const g = new THREE.Group(); const bell = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 8, 0, TAU, 0, Math.PI / 2), jm); g.add(bell);
    for (let k = 0; k < 6; k++) { const pts = []; const a = k / 6 * TAU; for (let j = 0; j < 8; j++) pts.push(new THREE.Vector3(Math.cos(a) * 2, -j * 1.6, Math.sin(a) * 2)); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), tm); g.add(l); }
    const gl = glow(0x8ff0e0, 14, .45); g.add(gl);
    const a = r() * TAU, d = 150 + r() * 3200; g.position.set(Math.cos(a) * d, (r() - .5) * 160, Math.sin(a) * d - 600); g.scale.setScalar(.6 + r() * 1.4); SP.scene.add(g);
    SP.drifters.push({ g, bell, ph: r() * 10, v: new THREE.Vector3((r() - .5) * 2, (r() - .5) * .5, (r() - .5) * 2) });
  }
  buildPale();
}
// The thing in the fog
function buildPale() {
  const g = new THREE.Group(); const m = new THREE.MeshLambertMaterial({ color: 0xc9cdc8, emissive: 0x1b2020 }); const dk = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const P = { g };
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.32, 1.5, 4, 10), m); torso.scale.set(1, 1, .6); torso.position.y = 2.6; g.add(torso);
  for (let i = 0; i < 5; i++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 4, 10, Math.PI), m); rb.position.set(0, 2.5 + i * .18, .12); rb.rotation.set(0, 0, Math.PI); rb.scale.z = .6; g.add(rb); }
  const head = new THREE.Group(); head.position.set(0, 3.85, .1); g.add(head); P.head = head;
  const hm = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 10), m); hm.scale.set(.85, 1.35, .9); head.add(hm);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), dk); e.scale.set(1, 1.6, .5); e.position.set(s * .09, .05, .21); head.add(e); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), dk); mouth.scale.set(1.2, 2.8, .5); mouth.position.set(0, -.2, .21); head.add(mouth); P.mouth = mouth;
  const arm = s => { const sh = new THREE.Group(); sh.position.set(s * .38, 3.35, 0); g.add(sh); const up = new THREE.Mesh(new THREE.CapsuleGeometry(.07, 1.3, 3, 6), m); up.position.y = -.75; sh.add(up); const el = new THREE.Group(); el.position.y = -1.5; sh.add(el); const lo = new THREE.Mesh(new THREE.CapsuleGeometry(.06, 1.4, 3, 6), m); lo.position.y = -.8; el.add(lo); for (let f = 0; f < 4; f++) { const fi = new THREE.Mesh(new THREE.CylinderGeometry(.015, .025, .55, 4), m); fi.position.set((f - 1.5) * .04, -1.75, 0); fi.rotation.z = (f - 1.5) * .15; el.add(fi); } sh.rotation.z = s * .12; return { sh, el }; };
  P.armL = arm(-1); P.armR = arm(1);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(.08, 1.6, 3, 6), m); l.position.set(s * .15, 1.0, 0); l.rotation.z = s * .05; g.add(l); }
  const aura = glow(0xc8d8d8, 9, .18); aura.position.y = 2.4; g.add(aura); P.aura = aura;
  g.visible = false; SP.scene.add(g); SP.pale = P; P.pos = new THREE.Vector3(); P.on = false;
}
