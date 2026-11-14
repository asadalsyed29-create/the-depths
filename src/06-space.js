// ---------- the Depths: space scene, ship exterior, sites, decorations, creatures ----------
const SP = { sites: [], decor: [], gulpers: [], drifters: [], solids: [], bases: [], lanternPool: [] };
const FOG_COL = new THREE.Color(0xc4ccce);
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
  SP.bubC = new THREE.Vector3(0, 0, -600); SP.bubR = 3000;
  SP.bubble = new THREE.Mesh(new THREE.SphereGeometry(SP.bubR, 96, 48), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, depthTest: true, uniforms: { t: { value: 0 }, eva: { value: 0 }, cam: { value: new THREE.Vector3() }, ctr: { value: SP.bubC } },
    vertexShader: 'varying vec3 wp;varying vec3 wn;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;wn=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;gl_Position.z=gl_Position.w*.99999;}',
    fragmentShader: `uniform float t;uniform float eva;uniform vec3 cam;uniform vec3 ctr;varying vec3 wp;varying vec3 wn;
void main(){vec3 v=normalize(wp-cam);float f=pow(1.-abs(dot(v,wn)),3.);vec3 d=normalize(wp-ctr);
 float la=asin(d.y)*28.,lo=atan(d.z,d.x)*28.;vec2 q=vec2(lo+la*.5,la*.866);vec2 g=abs(fract(q)-.5);float hex=smoothstep(.43,.5,max(g.x,g.y));
 float dist=length(wp-cam);float near=max(smoothstep(2600.,250.,dist),.1);
 float wave=.5+.5*sin(la*.35+lo*.25-t*.8);
 float a=.015+f*.35+hex*(.02+near*.45)*(.35+.65*wave)+near*.03;
 gl_FragColor=eva>.5?vec4(vec3(.05,.35,.5),clamp(a*1.6,0.,.85)):vec4(vec3(.3,.78,.95)*a,1.);}` }));
  SP.bubble.position.copy(SP.bubC); SP.bubble.renderOrder = 5; SP.bubble.frustumCulled = false; S.add(SP.bubble);
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
  // masts, dish
  for (const [x, z, h] of [[-9, -20, 14], [10, 12, 9], [-4, 30, 11]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.25, .4, h, 8), steel); m.position.set(x, 6.6 + h / 2, z); ship.add(m); const b = glow(0xff4040, 3, 1); b.position.set(x, 6.6 + h, z); ship.add(b); SP.blink = SP.blink || []; SP.blink.push(b); }
  { const d = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8, 0, TAU, 0, 1.1), new THREE.MeshPhongMaterial({ color: 0xbfc4c6, side: THREE.DoubleSide, shininess: 40 })); d.position.set(9, 8.4, 18); d.rotation.x = -.9; ship.add(d); }
  // nav lights
  for (const [x, c] of [[-14.8, 0xff3030], [14.8, 0x30ff60]]) { const g = glow(c, 5, 1); g.position.set(x, 5, -30); ship.add(g); SP.blink.push(g); }
  // floodlights: one real spotlight plus soft beams through the fog
  SP.flood = new THREE.SpotLight(0xdfe9ef, 900, 520, .42, .6, 1.25); SP.flood.position.set(0, 8, -40); ship.add(SP.flood); SP.flood.target.position.set(0, -20, -400); ship.add(SP.flood.target);
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.6, 12), steel); h.rotation.x = Math.PI / 2; h.position.set(sx * 9, 6.6, -37.5); ship.add(h); const l = glow(0xffffff, 7, 1); l.position.set(sx * 9, 6.4, -38.6); ship.add(l); }
  // ---- surface detail ----
  { const r = rng(808); const hi = G.set.gfx === 'high'; const N = hi ? 900 : 420; const geo = new THREE.BoxGeometry(1, 1, 1);
    const gm = new THREE.MeshPhongMaterial({ map: TX.trim, normalMap: TX.trimN, shininess: 35, specular: 0x333333 });
    const im = new THREE.InstancedMesh(geo, gm, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(); let k = 0;
    // surfaces: [axis, sign, plane, u-range, v-range]
    const surf = [['y', 1, 6.6, [-14, 14], [-36, 38]], ['x', 1, 14.6, [-1, 6], [-36, 38]], ['x', -1, -14.6, [-1, 6], [-36, 38]], ['y', 1, 7.5, [-4.5, 4.5], [40, 230]], ['x', 1, 5, [-1, 7], [40, 230]], ['x', -1, -5, [-1, 7], [40, 230]], ['y', -1, -1.2, [-14, 14], [-36, 38]]];
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
    // running lights under the spine (they chase toward the stern)
    SP.run = []; for (let z = 45; z < 230; z += 12) { const g = glow(0x9fe0ff, 3.5, 1); g.position.set(0, -1.9, z); ship.add(g); SP.run.push(g); }
    // forward sensor domes
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x20262a, shininess: 120, specular: 0x8899aa })); d.position.set(sx * 9, 6.6, 26); ship.add(d); }
  }
  // collision boxes (ship local) for spacewalks; an optional 7th value turns the box about the ship's long axis
  SP.shipBoxes = [[-14.6, -1.2, -37, 14.6, 6.6, 39], [-14.6, -1.4, -65, 14.6, 1, -37], [-5, -1.5, 39, 5, 10.5, 233], [-11.6, -2, 40, 11.6, 8.5, 228]];
  SP.habParts = ship.children.slice();
  buildMega(ship);
}

// ---- the rest of the Aster Vane: a city-sized structure behind the forward habitat ----
function winTex(seed, cols, rows, lit) {
  const W = 512, H = 512, c = cv(W, H), x = c.getContext('2d'), e = cv(W, H), ex = e.getContext('2d'); const r = rng(seed);
  x.drawImage(TX.hull.image, 0, 0, W, H); ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / rows;
  for (let j = 0; j < rows; j++) { if (r() < .12) continue; for (let i = 0; i < cols; i++) { const wx = i * cw + cw * .2, wy = j * rh + rh * .35, ww = cw * .6, wh = rh * .3; x.fillStyle = '#0d1418'; x.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
    if (r() < lit) { const warm = r() < .7; const v = .55 + r() * .45; const col = warm ? rgb(255 * v, 214 * v, 150 * v) : rgb(160 * v, 210 * v, 235 * v); x.fillStyle = col; x.fillRect(wx, wy, ww, wh); ex.fillStyle = col; ex.fillRect(wx, wy, ww, wh); } } }
  const t = mkTex(c), te = mkTex(e); for (const k of [t, te]) { k.wrapS = k.wrapT = THREE.RepeatWrapping; } return [t, te];
}
function buildMega(ship) {
  const [wt, we] = winTex(31, 12, 16, .3); const [wt2, we2] = winTex(32, 8, 10, .22);
  const winMat = (rx, ry, t = wt, e = we) => { const m = new THREE.MeshPhongMaterial({ map: t.clone(), emissiveMap: e.clone(), emissive: 0xffffff, emissiveIntensity: 1.3, normalMap: TX.hullN, shininess: 24, specular: 0x2a2a2a }); for (const k of [m.map, m.emissiveMap]) { k.repeat.set(rx, ry); k.needsUpdate = true; } return m; };
  const hull = SP.hullMat, steel = new THREE.MeshPhongMaterial({ color: 0x585e62, shininess: 50, specular: 0x444444 }), dark = new THREE.MeshPhongMaterial({ map: TX.hull, normalMap: TX.hullN, color: 0x55595d, shininess: 30 });
  const B = SP.megaBoxes = []; const addB = (x0, y0, z0, x1, y1, z1, rz) => SP.shipBoxes.push([x0, y0, z0, x1, y1, z1, rz || 0]);
  // main spine: a square truss tower lying along the ship, 24 m across, 820 m long
  const Z0 = 40, Z1 = 860, L = Z1 - Z0, zc = (Z0 + Z1) / 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, L, 10), steel); c.rotation.x = Math.PI / 2; c.position.set(sx * 13, 3 + sy * 13, zc); ship.add(c); }
  { const geo = new THREE.CylinderGeometry(.7, .7, 1, 6); const list = []; for (let z = Z0; z < Z1; z += 26) for (const [a, b] of [[[-13, -10], [13, 16]], [[13, -10], [-13, 16]], [[-13, 16], [13, 16]], [[-13, -10], [13, -10]]]) list.push([new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z + 26)]);
    for (let z = Z0; z < Z1; z += 26) for (const sx of [-1, 1]) list.push([new THREE.Vector3(sx * 13, -10, z), new THREE.Vector3(sx * 13, 16, z + 26)]);
    const im = new THREE.InstancedMesh(geo, steel, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach(([a, b], i) => { const d = b.clone().sub(a); q.setFromUnitVectors(up, d.clone().normalize()); m4.compose(a.clone().add(b).multiplyScalar(.5), q, new THREE.Vector3(1, d.length(), 1)); im.setMatrixAt(i, m4); }); ship.add(im); }
  // inner core: the long lit habitat tube through the truss
  { const core = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, L - 40, 32, 1), winMat(10, 40)); core.rotation.x = Math.PI / 2; core.position.set(0, 3, zc + 20); ship.add(core); }
  addB(-14.6, -10.6, Z0, 14.6, 16.6, Z1);
  // three great vanes: tapered blades full of decks, standing out from the spine (one up, two down-sideways)
  const vaneShape = new THREE.Shape(); vaneShape.moveTo(0, 0); vaneShape.lineTo(0, 120); vaneShape.quadraticCurveTo(40, 150, 140, 210); vaneShape.lineTo(470, 170); vaneShape.quadraticCurveTo(520, 120, 540, 0); vaneShape.lineTo(0, 0);
  const vg = new THREE.ExtrudeGeometry(vaneShape, { depth: 14, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2, curveSegments: 16 }); vg.translate(0, 0, -7);
  { const uv = vg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 110, uv.getY(i) / 110); }
  const vm = winMat(1, 1, wt2, we2); for (const k of [vm.map, vm.emissiveMap]) k.repeat.set(1, 1);
  SP.vanes = [];
  for (const [i, ang] of [[0, 0], [1, TAU / 3], [2, -TAU / 3]]) {
    const piv = new THREE.Group(); piv.position.set(0, 3, 0); piv.rotation.z = ang; ship.add(piv);
    const v = new THREE.Mesh(vg, vm); v.rotation.set(0, -Math.PI / 2, 0); v.rotation.order = 'YXZ'; // shape x -> ship +z, shape y -> outward (+y of pivot)
    v.position.set(0, 14, 180); piv.add(v);
    // edge lights along the outer rim
    for (let k = 0; k < 12; k++) { const g = glow(k % 3 ? 0xff5040 : 0xffffff, 10, 1); g.position.set(0, 14 + 150 + Math.sin(k / 11 * Math.PI) * 50, 180 + 140 + k * 30); piv.add(g); SP.blink.push(g); }
    addB(-9, 14, 180, 9, 14 + 200, 720, ang);
    SP.vanes.push(piv);
  }
  // the great ring: a turning habitat ring around the middle of the ship
  { const ring = new THREE.Group(); ring.position.set(0, 3, 470); ship.add(ring); SP.bigRing = ring;
    const rm = winMat(48, 2); const t = new THREE.Mesh(new THREE.TorusGeometry(250, 16, 20, 160), rm); ring.add(t);
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + TAU / 12; const sp = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 236, 10), steel); sp.position.set(Math.cos(a) * 128, Math.sin(a) * 128, 0); sp.rotation.z = a - Math.PI / 2; ring.add(sp); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; const g = glow(0x9fe0ff, 16, .9); g.position.set(Math.cos(a) * 268, Math.sin(a) * 268, 0); ring.add(g); }
  }
  // forward claws: two long curved arms reaching past the habitat (the ship's silhouette from far away)
  for (const sx of [-1, 1]) { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 14, 2, 120), new THREE.Vector3(sx * 70, -10, 40), new THREE.Vector3(sx * 95, -18, -120), new THREE.Vector3(sx * 70, -12, -260), new THREE.Vector3(sx * 40, -4, -330)]);
    const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 7, 12), winMat(30, 2)); ship.add(arm);
    for (let k = 0; k <= 8; k++) { const p = curve.getPointAt(k / 8); const g = glow(k === 8 ? 0xff4030 : 0x9fe0ff, k === 8 ? 26 : 12, 1); g.position.copy(p).y += 8; ship.add(g); if (k === 8) SP.blink.push(g); }
    for (let k = 0; k < 20; k++) { const u = k / 20, p = curve.getPointAt(u), q = curve.getPointAt(Math.min(1, u + .05)); addB(Math.min(p.x, q.x) - 7, Math.min(p.y, q.y) - 7, Math.min(p.z, q.z) - 7, Math.max(p.x, q.x) + 7, Math.max(p.y, q.y) + 7, Math.max(p.z, q.z) + 7); } }
  // hab blocks clinging to the spine
  { const r = rng(91); const bm = winMat(2, 2); for (let k = 0; k < 26; k++) { const z = 80 + r() * 740, a = (r() * 6 | 0) / 6 * TAU + TAU / 12, w = 16 + r() * 24, h = 14 + r() * 22, d = 30 + r() * 60; const piv = new THREE.Group(); piv.position.set(0, 3, z); piv.rotation.z = a; ship.add(piv); const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, 30), bm); m.position.y = 16 + h / 2; piv.add(m); addB(-w / 2, 16, z - d / 2, w / 2, 16 + h, z + d / 2, a); } }
  // the stern: six huge engines in a cluster
  SP.nozzles = []; SP.plumes = [];
  const plumeM = new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ventM = new THREE.MeshBasicMaterial({ color: 0xff7a3a }); SP.vents = ventM;
  { const housing = new THREE.Mesh(new THREE.CylinderGeometry(70, 46, 120, 6), hull); housing.rotation.x = Math.PI / 2; housing.position.set(0, 3, 900); ship.add(housing); addB(-62, -59, 840, 62, 65, 960);
    const coll = new THREE.Mesh(new THREE.CylinderGeometry(28, 70, 60, 6), dark); coll.rotation.x = -Math.PI / 2; coll.position.set(0, 3, 830); ship.add(coll);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, x = Math.cos(a) * 40, y = 3 + Math.sin(a) * 40;
      const n = new THREE.Mesh(new THREE.CylinderGeometry(16, 22, 40, 24, 1, true), new THREE.MeshPhongMaterial({ color: 0x34383b, side: THREE.DoubleSide, shininess: 40 })); n.rotation.x = Math.PI / 2; n.position.set(x, y, 975); ship.add(n);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: 0x9fdcff })); disc.position.set(x, y, 962); ship.add(disc); SP.nozzles.push(disc);
      const g = glow(0x6ab8ff, 90, .8); g.position.set(x, y, 990); ship.add(g); SP.nozzles.push(g);
      const pl = new THREE.Mesh(new THREE.ConeGeometry(15, 140, 20, 1, true), plumeM); pl.rotation.x = -Math.PI / 2; pl.position.set(x, y, 1065); ship.add(pl); SP.plumes.push(pl);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(40, 3), ventM); v.position.set(Math.cos(a + TAU / 12) * 61, 3 + Math.sin(a + TAU / 12) * 61, 900); v.lookAt(v.position.clone().multiplyScalar(2).setZ(900)); ship.add(v); }
    const sg = glow(0xffffff, 30, 1); sg.position.set(0, 80, 900); ship.add(sg); SP.strobe = sg; }
  SP.shipLen = [-330, 1000];
}

// ---- rocks ----
const ROCK_GEOS = [];
function rockGeo(seed, detail) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; const o = seed * 3.7;
  const v = new THREE.Vector3(); const cache = new Map(); const key = v => v.x.toFixed(3) + ',' + v.y.toFixed(3) + ',' + v.z.toFixed(3);
  const keys = [];
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = key(v); keys.push(k); let d = cache.get(k); if (d === undefined) { const ridge = 1 - Math.abs(vn3(v.x * 2.2 + o, v.y * 2.2, v.z * 2.2) * 2 - 1); d = .7 + fbm3(v.x * 1.4 + o, v.y * 1.4, v.z * 1.4 - o, 5) * .55 + ridge * .12 + (vn3(v.x * 6 + o, v.y * 6, v.z * 6) - .5) * .08; cache.set(k, d); } v.multiplyScalar(d); v.y *= .84; p.setXYZ(i, v.x, v.y, v.z); }
  // smooth normals across shared corners, planar uvs for the stone texture
  g.computeVertexNormals(); const n = g.attributes.normal, acc = new Map();
  for (let i = 0; i < p.count; i++) { const a = acc.get(keys[i]) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(keys[i], a); }
  const uv = g.attributes.uv; const col = [];
  for (let i = 0; i < p.count; i++) { const a = acc.get(keys[i]); const l = Math.hypot(...a) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); v.fromBufferAttribute(p, i); uv.setXY(i, v.x * .9 + v.z * .4, v.y * .9 - v.z * .3);
    const s2 = .7 + fbm3(v.x * 2 + o, v.y * 2, v.z * 2, 3) * .45; col.push(s2, s2 * .97, s2 * .93); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
function rockTextures() {
  if (TX.rock) return; const W = 512, c = cv(W, W), x = c.getContext('2d'), hc = cv(W, W), hx = hc.getContext('2d'); const id = x.createImageData(W, W), hd = hx.createImageData(W, W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const u = i / W * 8, v = j / W * 8;
    const n = fbm(u, v, 6, 8), cr = Math.abs(vn(u * 3.1 + 17, v * 3.1) - .5), crack = cr < .025 ? (1 - cr / .025) : 0, st = Math.pow(1 - Math.abs(fbm(u * .6 + 4, v * .6, 3, 4.8) - .5) * 2, 6);
    const h = n * .8 + st * .15 - crack * .35; const k = (j * W + i) * 4; const b = 70 + n * 120 - crack * 50 + st * 30;
    id.data[k] = b * 1.02; id.data[k + 1] = b * .97; id.data[k + 2] = b * .9; id.data[k + 3] = 255; const hv = clamp(h * 255, 0, 255); hd.data[k] = hd.data[k + 1] = hd.data[k + 2] = hv; hd.data[k + 3] = 255; }
  x.putImageData(id, 0, 0); hx.putImageData(hd, 0, 0); TX.rock = mkTex(c); TX.rockN = mkTex(normalFromHeight(hc, 4), false);
}
const SITE_T = {
  ore: { name: 'Rock field', res: 'ore', tint: [1, .92, .82] }, ice: { name: 'Pale field', res: 'ice', tint: [.8, .9, 1.05] },
  glass: { name: 'Deepglass garden', res: 'glass', tint: [.82, .78, .95] }, wreck: { name: 'Wreck', res: 'scrap', tint: [.9, .9, .9] },
};
const RES_NAME = { ore: 'Ore', ice: 'Ice', glass: 'Deepglass', scrap: 'Scrap', samples: 'Samples' };
function inBubble(r, minD, maxD) { for (;;) { const d = new THREE.Vector3(r() * 2 - 1, (r() * 2 - 1) * .8, r() * 2 - 1); if (d.lengthSq() > 1) continue; const p = SP.bubC.clone().addScaledVector(d, SP.bubR * .82); const dc = p.length(); if (dc >= (minD || 0) && dc <= (maxD || 1e9)) return p; } }
// world-space boxes for collision and building on structures
function siteBox(s, c, q, half) { s.boxes.push({ c: c.clone(), qi: q.clone().invert(), h: half.clone() }); }
function meshBox(s, m) { m.updateWorldMatrix(true, false); if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m.matrixWorld.decompose(p, q, sc); const c = bb.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld); const h = bb.getSize(new THREE.Vector3()).multiply(sc).multiplyScalar(.5); siteBox(s, c, q, h); }
function beamBox(s, a, b, r) { const d = b.clone().sub(a), L = d.length(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); siteBox(s, a.clone().add(b).multiplyScalar(.5), q, new THREE.Vector3(r, L / 2, r)); }
// push a point out of a site's boxes; returns true if it hit
const _bl = new THREE.Vector3();
function pushOutBoxes(boxes, pos, pad, vel) { let hit = false; for (const B of boxes) { _bl.copy(pos).sub(B.c); if (Math.abs(_bl.x) > B.h.x + B.h.y + B.h.z + pad) continue; _bl.applyQuaternion(B.qi); const ox = B.h.x + pad - Math.abs(_bl.x), oy = B.h.y + pad - Math.abs(_bl.y), oz = B.h.z + pad - Math.abs(_bl.z); if (ox <= 0 || oy <= 0 || oz <= 0) continue;
  const n = new THREE.Vector3(); if (ox < oy && ox < oz) n.x = Math.sign(_bl.x) || 1; else if (oy < oz) n.y = Math.sign(_bl.y) || 1; else n.z = Math.sign(_bl.z) || 1; const m = Math.min(ox, oy, oz); n.applyQuaternion(B.qi.clone().invert()); pos.addScaledVector(n, m); if (vel) { const vn = vel.dot(n); if (vn < 0) vel.addScaledVector(n, -vn); } hit = true; } return hit; }
function buildSites() {
  rockTextures(); for (let i = 0; i < 6; i++) ROCK_GEOS.push(rockGeo(i + 1, i < 3 ? 4 : 3));
  const r = rng(2024); const pts = [[0, -60, -760, 'ore']]; const types = ['wreck', 'ice', 'glass', 'ore', 'wreck', 'glass', 'ice'];
  let tries = 0; while (pts.length < 14 && tries++ < 6000) { const p = inBubble(r, 700); if (pts.every(q => Math.hypot(q[0] - p.x, q[1] - p.y, q[2] - p.z) > 620)) pts.push([p.x, p.y, p.z, types[pts.length % types.length]]); }
  const rockMat = new THREE.MeshStandardMaterial({ map: TX.rock, normalMap: TX.rockN, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: .92, metalness: 0 });
  SP.rockMat = rockMat;
  const filler = ROCK_GEOS.map(() => []);
  const rock = (s, pos, rad, sr, tint) => { s.rocks.push({ p: pos.clone().add(s.c), r: rad * .8 }); filler[(sr() * 6) | 0].push({ p: pos.clone().add(s.c), r: rad, rot: [sr() * TAU, sr() * TAU, sr() * TAU], tint: tint || SITE_T[s.type].tint, v: .8 + sr() * .35 }); };
  pts.forEach((p, i) => {
    const s = { i, type: p[3], c: new THREE.Vector3(p[0], p[1], p[2]), rocks: [], deps: [], boxes: [], surf: [], known: i < 1, name: SITE_T[p[3]].name + ' ' + String.fromCharCode(65 + (i % 26)), group: new THREE.Group() };
    SP.scene.add(s.group); s.group.position.copy(s.c); s.group.updateMatrixWorld(true);
    const sr = rng(500 + i);
    BUILD_SITE[s.type](s, sr, rock);
    // scattered boulders around the structure
    for (let k = 0; k < 10; k++) { const d = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize().multiplyScalar(170 + sr() * 120); rock(s, d, 6 + sr() * 14, sr); }
    s.group.updateMatrixWorld(true);
    SP.sites.push(s);
  });
  filler.forEach((list, gi) => { const im = new THREE.InstancedMesh(ROCK_GEOS[gi], rockMat, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); list.forEach((f, k) => { q.setFromEuler(e.set(...f.rot)); m4.compose(f.p, q, new THREE.Vector3(f.r, f.r, f.r)); im.setMatrixAt(k, m4); im.setColorAt(k, new THREE.Color(f.tint[0] * f.v, f.tint[1] * f.v, f.tint[2] * f.v)); }); SP.scene.add(im); (SP.rockIMs = SP.rockIMs || []).push(im); });
  for (const s of SP.sites) for (const rk of s.rocks) SP.solids.push({ p: rk.p, r: rk.r });
}
// deposits sit on a surface point, pushed out along its normal
function depOn(s, type, wp, n, sr) { addDeposit(s, type, wp.clone().addScaledVector(n, 1.4).sub(s.c), sr); }
const BUILD_SITE = {
  // a hollow planetoid shell you fly into through three wide openings
  ore(s, sr, rock) {
    const R = 105, holes = [0, 1, 2].map(() => new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize()); const N = 150;
    for (let k = 0; k < N; k++) { const y = 1 - (k + .5) / N * 2, rr = Math.sqrt(1 - y * y), a = k * 2.39996; const d = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
      if (holes.some(h => h.dot(d) > .9)) continue; const rad = 20 + sr() * 10; rock(s, d.clone().multiplyScalar(R + sr() * 8), rad, sr); }
    for (let k = 0; k < 5; k++) rock(s, new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).multiplyScalar(80), 6 + sr() * 9, sr);
    // ore veins on the inside wall and around the openings
    for (let k = 0; k < 16; k++) { const d = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize(); if (holes.some(h => h.dot(d) > .86)) { k--; continue; } depOn(s, 'ore', s.c.clone().addScaledVector(d, R - 22), d.clone().negate(), sr); }
    for (const h of holes) { const g = glow(0xffb070, 30, .35); g.position.copy(h).multiplyScalar(R); s.group.add(g); }
    const core = glow(0xffa860, 60, .25); s.group.add(core);
  },
  // a crown of enormous ice spires leaning in over a hollow centre
  ice(s, sr, rock) {
    const im = new THREE.MeshStandardMaterial({ color: 0xcfe8f4, roughness: .15, metalness: .1, transparent: true, opacity: .82, emissive: 0x1a3644, normalMap: TX.rockN, normalScale: new THREE.Vector2(.4, .4) });
    const n = 14; for (let k = 0; k < n; k++) { const a = k / n * TAU, h = 150 + sr() * 90, rad = 10 + sr() * 7; const geo = new THREE.ConeGeometry(rad, h, 7, 6); const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) { pa.setX(i, pa.getX(i) * (1 + (sr() - .5) * .25)); pa.setZ(i, pa.getZ(i) * (1 + (sr() - .5) * .25)); } geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, im); m.position.set(Math.cos(a) * 95, -60 + h / 2 * Math.cos(.35), Math.sin(a) * 95); m.lookAt(0, m.position.y + 1000, 0); m.rotateX(Math.PI / 2); m.rotation.set(0, 0, 0); const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), .33 + sr() * .12); m.quaternion.copy(tilt); m.position.set(Math.cos(a) * 95, -60, Math.sin(a) * 95).add(new THREE.Vector3(0, h / 2, 0).applyQuaternion(tilt)); s.group.add(m); s.surf.push(m);
      const base = m.position.clone().add(new THREE.Vector3(0, -h / 2, 0).applyQuaternion(tilt)), tip = m.position.clone().add(new THREE.Vector3(0, h / 2, 0).applyQuaternion(tilt)); beamBox(s, base.clone().add(s.c), tip.clone().lerp(base, .15).add(s.c), rad * .55);
      rock(s, base, rad * 1.6, sr, [.75, .85, 1]); const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); depOn(s, 'ice', base.clone().add(s.c).addScaledVector(out, -rad * 1.4), out.clone().negate(), sr); }
    // floating crystal heart
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(22, 1), im); heart.scale.set(1, 1.8, 1); s.group.add(heart); s.surf.push(heart); s.rocks.push({ p: s.c.clone(), r: 24 }); s.blinkSpin = heart;
    const hg = glow(0x9fe0ff, 120, .4); s.group.add(hg);
    for (let k = 0; k < 4; k++) { const d = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize(); depOn(s, 'ice', s.c.clone().addScaledVector(d, 30), d, sr); }
  },
  // a broken geodesic cage full of giant violet crystals
  glass(s, sr, rock) {
    const R = 140, geo = new THREE.IcosahedronGeometry(R, 1), pa = geo.attributes.position; const verts = [], key = v => v.toArray().map(x => x.toFixed(1)).join();
    const vm = new Map(); for (let i = 0; i < pa.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pa, i); const k = key(v); if (!vm.has(k)) { vm.set(k, verts.length); verts.push(v); } }
    const edges = new Set(); for (let i = 0; i < pa.count; i += 3) { const ids = [0, 1, 2].map(j => vm.get(key(new THREE.Vector3().fromBufferAttribute(pa, i + j)))); for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = [ids[a], ids[b]].sort((x, y) => x - y).join('-'); edges.add(e); } }
    const bm = new THREE.MeshStandardMaterial({ color: 0x8c8794, roughness: .35, metalness: .7 }); const list = [...edges].map(e => e.split('-').map(Number)).filter(() => sr() > .18);
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.4, 2.4, 1, 8), bm, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach(([a, b], k) => { const A = verts[a], Bv = verts[b], d = Bv.clone().sub(A); q.setFromUnitVectors(up, d.clone().normalize()); m4.compose(A.clone().add(Bv).multiplyScalar(.5), q, new THREE.Vector3(1, d.length(), 1)); im.setMatrixAt(k, m4); beamBox(s, A.clone().add(s.c), Bv.clone().add(s.c), 3); });
    s.group.add(im); s.surf.push(im);
    const nm = new THREE.MeshBasicMaterial({ color: 0xd8b8ff }); for (const v of verts) { const n = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), nm); n.position.copy(v); s.group.add(n); const g = glow(0xb080ff, 18, .6); g.position.copy(v); s.group.add(g); }
    const cm = new THREE.MeshStandardMaterial({ color: 0x8a5ad8, emissive: 0x3a1680, roughness: .08, metalness: .2, transparent: true, opacity: .9 });
    for (let k = 0; k < 9; k++) { const d = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize(); const L = 40 + sr() * 50, w = 8 + sr() * 7; const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), cm); c.scale.set(w, L, w); const pos = d.clone().multiplyScalar(30 + sr() * 50); c.position.copy(pos); c.quaternion.setFromUnitVectors(up, d); s.group.add(c); s.surf.push(c);
      s.rocks.push({ p: pos.clone().add(s.c), r: w * .9 }); s.rocks.push({ p: pos.clone().addScaledVector(d, L * .45).add(s.c), r: w * .55 }); s.rocks.push({ p: pos.clone().addScaledVector(d, -L * .45).add(s.c), r: w * .55 });
      const side = new THREE.Vector3(1, 0, 0).cross(d).normalize(); depOn(s, 'glass', pos.clone().add(s.c).addScaledVector(side, w * .9), side, sr); depOn(s, 'glass', pos.clone().add(s.c).addScaledVector(side, -w * .9), side.clone().negate(), sr); }
    const g = glow(0xa070ff, 160, .35); s.group.add(g);
    for (let k = 0; k < 2; k++) { const d = new THREE.Vector3(sr() - .5, sr() - .5, sr() - .5).normalize(); depOn(s, 'samples', s.c.clone().addScaledVector(d, 12), d, sr); }
  },
  wreck(s, sr, rock) { buildWreck(s, sr); },
};
// a derelict ark: a long hollow hull with decks and bulkheads you can fly through
function buildWreck(s, sr) {
  const plate = new THREE.MeshStandardMaterial({ map: TX.hull, normalMap: TX.hullN, color: 0x8a8580, roughness: .7, metalness: .45 });
  const darkM = new THREE.MeshStandardMaterial({ map: TX.hull, normalMap: TX.hullN, color: 0x4a4744, roughness: .8, metalness: .4 });
  const g = new THREE.Group(); g.rotation.set((sr() - .5) * .5, sr() * TAU, (sr() - .5) * .6); s.group.add(g); g.updateMatrixWorld(true);
  const L = 280, W = 56, H = 44; const add = (w, h, d, x, y, z, m, rx, rz) => { const b = hbox(w, h, d, m || plate, x, y, z, g, 18); if (rx) b.rotation.x = rx; if (rz) b.rotation.z = rz; b.updateWorldMatrix(true, false); meshBox(s, b); s.surf.push(b); return b; };
  // hull plating with torn gaps
  for (let z = -L / 2; z < L / 2; z += 20) { const zc = z + 10; const torn = k => sr() < k;
    if (!torn(.15)) add(W, 2, 19.6, 0, -H / 2, zc); if (!torn(.35)) add(W, 2, 19.6, 0, H / 2, zc);
    for (const sx of [-1, 1]) { if (!torn(.3)) add(2, H * .55, 19.6, sx * W / 2, -H * .22, zc); if (!torn(.5)) add(2, H * .4, 19.6, sx * W / 2, H * .3, zc); }
    add(W - 4, 1.2, 19.6, 0, 0, zc, darkM); // mid deck
    if ((z / 20 | 0) % 2 === 0) { for (const sx of [-1, 1]) add(14, H - 4, 2, sx * (W / 2 - 9), 0, z, darkM); add(W - 4, 8, 2, 0, H / 2 - 6, z, darkM); } // bulkhead frame with a doorway
    const lc = sr() < .5 ? 0xff5a3a : 0xffc070; const l = glow(lc, 14, .7); l.position.set((sr() - .5) * 30, -H / 2 + 5, zc); g.add(l); if (sr() < .5) { const l2 = glow(lc, 10, .6); l2.position.set((sr() - .5) * 30, 5, zc); g.add(l2); }
  }
  // the broken prow
  const nose = new THREE.Mesh(frustum(W, H, 14, 10, 70), plate); nose.position.z = -L / 2; g.add(nose); nose.updateWorldMatrix(true, false); s.surf.push(nose);
  siteBox(s, nose.localToWorld(new THREE.Vector3(0, 0, -35)), g.getWorldQuaternion(new THREE.Quaternion()), new THREE.Vector3(W * .35, H * .35, 35));
  // spars and cables floating loose
  for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 20 + sr() * 30, 6), darkM); b.position.set((sr() - .5) * 120, (sr() - .5) * 80, (sr() - .5) * L); b.rotation.set(sr() * 3, sr() * 3, sr() * 3); g.add(b); }
  const lt = glow(0xff6040, 20, .9); lt.position.set(W / 2 + 2, H / 2, -L / 2 + 10); g.add(lt); s.blink = lt;
  // scrap on the decks inside, samples in the dark aft section
  const q = g.getWorldQuaternion(new THREE.Quaternion()), upW = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  for (let k = 0; k < 18; k++) { const lp = new THREE.Vector3((sr() - .5) * (W - 12), sr() < .5 ? -H / 2 + 1 : 0.6, (sr() - .5) * (L - 30)); depOn(s, 'scrap', g.localToWorld(lp), upW, sr); }
  for (let k = 0; k < 2; k++) { const lp = new THREE.Vector3((sr() - .5) * 20, -H / 2 + 1, L / 2 - 20 - sr() * 30); depOn(s, 'samples', g.localToWorld(lp), upW, sr); }
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
    let p, ok = false; for (let k = 0; k < 50 && !ok; k++) { p = inBubble(r, 450); ok = SP.sites.every(s => s.c.distanceTo(p) > 420) && SP.decor.every(d2 => d2.p.distanceTo(p) > 360); }
    if (!ok) continue;
    const g = new THREE.Group(); const kind = i < kinds.length ? kinds[i] : kinds[(r() * kinds.length) | 0]; const sc = 2.2 + r() * 2.2; const rad = DECOR[kind](g, r) * sc;
    g.scale.setScalar(sc); g.position.copy(p); g.rotation.set((r() - .5) * .8, r() * TAU, (r() - .5) * .8); SP.scene.add(g);
    SP.decor.push({ g, p, r: rad, kind, spin: (r() - .5) * .01 });
  }
  // the drowned lighthouse, far out
  const g = new THREE.Group(); lighthouse(g); g.scale.setScalar(3.2); const p = new THREE.Vector3(1500, 600, -2300); g.position.copy(p); g.rotation.z = .2; SP.scene.add(g); SP.lighthouse = { g, p, r: 120, kind: 'lighthouse', spin: 0 }; SP.decor.push(SP.lighthouse);
  for (const d of SP.decor) SP.solids.push({ p: d.p, r: d.r * .6 });
}

// ---- creatures ----
function buildCreatures() {
  // gulpers: long eel-like hunters with a smooth flexible body, a hinged jaw and a glowing lure
  const skinTex = (() => { const W = 512, H = 128, c = cv(W, H), x = c.getContext('2d'), id = x.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = j / H; const back = Math.cos((v - .5) * TAU) * .5 + .5; // 1 on back, 0 on belly
      const n = fbm(i / 40, j / 18, 4, 0) , sc = Math.abs(vn(i / 6, j / 4) - .5) < .06 ? .75 : 1; const bl = Math.max(0, fbm(i / 14 + 9, j / 10, 2) - .62) * 2.2;
      const r = lerp(150, 34, back) * (.7 + n * .5) * sc, g = lerp(140, 44, back) * (.7 + n * .5) * sc, b = lerp(122, 50, back) * (.7 + n * .5) * sc;
      const k = (j * W + i) * 4; id.data[k] = r + bl * 40; id.data[k + 1] = g + bl * 90; id.data[k + 2] = b + bl * 80; id.data[k + 3] = 255; }
    x.putImageData(id, 0, 0); const t = mkTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; })();
  const skin = new THREE.MeshStandardMaterial({ map: skinTex, roughness: .55, metalness: .05, emissive: 0x0c1a1a, emissiveIntensity: 1 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: .4 });
  const mouthM = new THREE.MeshStandardMaterial({ color: 0x2a0e10, roughness: .8, side: THREE.DoubleSide });
  const r = rng(99);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); SP.scene.add(g);
    const NP = 18, spacing = 8.5, RINGS = 64, SIDES = 16, len = (NP - 1) * spacing;
    const pts = []; const home = inBubble(r, 1000);
    for (let k = 0; k < NP; k++) pts.push(home.clone().add(new THREE.Vector3(0, 0, k * spacing)));
    // tube geometry, rewritten every frame
    const pos = new Float32Array((RINGS + 1) * (SIDES + 1) * 3), uv = new Float32Array((RINGS + 1) * (SIDES + 1) * 2), idx = [];
    for (let a = 0; a <= RINGS; a++) for (let b = 0; b <= SIDES; b++) { const k = a * (SIDES + 1) + b; uv[k * 2] = a / RINGS; uv[k * 2 + 1] = b / SIDES; if (a < RINGS && b < SIDES) { const n = SIDES + 1; idx.push(k, k + n, k + 1, k + 1, k + n, k + n + 1); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const body = new THREE.Mesh(geo, skin); body.frustumCulled = false; g.add(body);
    // radius along the body (0 = head end): thick neck, long taper, thin whip tail
    const prof = u => { const head = u < .08 ? lerp(6.5, 9, u / .08) : 9 * Math.pow(1 - (u - .08) / .92, .85) + .5; return head * (1 + .08 * Math.sin(u * 60)); };
    // glowing spots along the flanks
    const SPOTS = 70, spPos = new Float32Array(SPOTS * 3), spot = []; for (let k = 0; k < SPOTS; k++) spot.push([.1 + (k >> 1) / (SPOTS / 2) * .8, (k & 1 ? .27 : .73) + (r() - .5) * .04]);
    const spG = new THREE.BufferGeometry(); spG.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
    const spots = new THREE.Points(spG, new THREE.PointsMaterial({ map: glowTex(), color: 0x7affe0, size: 3.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spots.frustumCulled = false; g.add(spots);
    // head: skull, hinged jaw, teeth, eyes, lure
    const head = new THREE.Group(); g.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(9, 28, 18), skin); skull.scale.set(1.05, .78, 1.55); skull.position.set(0, 1.5, -5); head.add(skull);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 10), skin); brow.scale.set(2.1, .6, 1.4); brow.position.set(0, 6, -9); head.add(brow);
    const jawP = new THREE.Group(); jawP.position.set(0, -1, 4); head.add(jawP);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(8.6, 26, 14, 0, TAU, Math.PI / 2, Math.PI / 2), skin); jaw.scale.set(1.05, .55, 1.6); jaw.position.set(0, 0, -10); jawP.add(jaw);
    const gullet = new THREE.Mesh(new THREE.SphereGeometry(8.2, 20, 10, 0, TAU, 0, Math.PI / 2), mouthM); gullet.scale.set(1, .35, 1.55); gullet.position.set(0, -.2, -10); jawP.add(gullet);
    const teethG = new THREE.ConeGeometry(.55, 4.2, 6); const upT = new THREE.InstancedMesh(teethG, bone, 18), loT = new THREE.InstancedMesh(teethG, bone, 18); const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3();
    for (let t = 0; t < 18; t++) { const a = (t / 17 - .5) * Math.PI * 1.15, L = 2.5 + r() * 2.5; S1.set(1, L / 4.2, 1);
      V.set(Math.sin(a) * 8.4, -.6, -5 - Math.cos(a) * 12.5); Q.setFromEuler(new THREE.Euler(Math.PI + (r() - .5) * .3, 0, (r() - .5) * .3)); M4.compose(V, Q, S1); upT.setMatrixAt(t, M4);
      V.set(Math.sin(a) * 8.2, .4, -10 - Math.cos(a) * 12.8); Q.setFromEuler(new THREE.Euler((r() - .5) * .3, 0, (r() - .5) * .3)); M4.compose(V, Q, S1); loT.setMatrixAt(t, M4); }
    head.add(upT); jawP.add(loT); loT.position.z = 0;
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xbfffee }); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.9, 10, 8), eyeM); e.position.set(sx * 6.8, 4.2, -12); head.add(e); const eg = glow(0x8affe0, 5, .7); e.add(eg); }
    const stalkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 6.5, -8), new THREE.Vector3(0, 13, -10), new THREE.Vector3(0, 15, -18), new THREE.Vector3(0, 11, -25)]);
    const stalk = new THREE.Mesh(new THREE.TubeGeometry(stalkCurve, 24, .35, 6), skin); head.add(stalk);
    const lure = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 10), new THREE.MeshBasicMaterial({ color: 0xc8fff0 })); lure.position.set(0, 11, -25); head.add(lure); const lg = glow(0x9affe0, 26, .9); lure.add(lg);
    // tail fin
    const finS = new THREE.Shape(); finS.moveTo(0, 0); finS.quadraticCurveTo(6, 4, 14, 9); finS.quadraticCurveTo(9, 0, 14, -9); finS.quadraticCurveTo(6, -4, 0, 0);
    const fin = new THREE.Mesh(new THREE.ShapeGeometry(finS, 12), new THREE.MeshStandardMaterial({ map: skinTex, color: 0x9ab0a8, roughness: .6, side: THREE.DoubleSide, transparent: true, opacity: .85 })); fin.rotation.y = -Math.PI / 2; const tail = new THREE.Group(); tail.add(fin); g.add(tail);
    const G2 = { g, pts, spacing, len, NP, RINGS, SIDES, geo, prof, spot, spG, head, jawP, tail, home, pos: home.clone(), vel: new THREE.Vector3(), state: 'roam', t: 0, wp: home.clone(), lure, lostT: 0, cool: 0, jawOpen: 0, ph: r() * 10 };
    SP.gulpers.push(G2); gulperMesh(G2, 0);
  }
  // drifters: pale glowing jellies (harmless)
  const jm = new THREE.MeshBasicMaterial({ color: 0x9fe8e0, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const tm = new THREE.LineBasicMaterial({ color: 0x8fd8d0, transparent: true, opacity: .35, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 46; i++) {
    const g = new THREE.Group(); const bell = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 8, 0, TAU, 0, Math.PI / 2), jm); g.add(bell);
    for (let k = 0; k < 6; k++) { const pts = []; const a = k / 6 * TAU; for (let j = 0; j < 8; j++) pts.push(new THREE.Vector3(Math.cos(a) * 2, -j * 1.6, Math.sin(a) * 2)); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), tm); g.add(l); }
    const gl = glow(0x8ff0e0, 14, .45); g.add(gl);
    g.position.copy(inBubble(r, 150)); g.scale.setScalar(.6 + r() * 1.4); SP.scene.add(g);
    SP.drifters.push({ g, bell, ph: r() * 10, v: new THREE.Vector3((r() - .5) * 2, (r() - .5) * .5, (r() - .5) * 2) });
  }
  buildPale();
}
// rebuild a gulper's tube body along its spine
const _gc = new THREE.CatmullRomCurve3(), _gt = new THREE.Vector3(), _gn = new THREE.Vector3(), _gb = new THREE.Vector3(), _gp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function gulperMesh(G2, t) {
  _gc.points = G2.pts; const pa = G2.geo.attributes.position.array, R = G2.RINGS, S = G2.SIDES;
  const frames = []; let prevN = null;
  for (let a = 0; a <= R; a++) {
    const u = a / R; _gc.getPointAt(u, _gp); _gc.getTangentAt(u, _gt);
    if (!prevN) { _gn.crossVectors(_gt, _up); if (_gn.lengthSq() < 1e-4) _gn.set(1, 0, 0); _gn.normalize(); } else { _gn.copy(prevN).addScaledVector(_gt, -prevN.dot(_gt)).normalize(); }
    prevN = _gn.clone(); _gb.crossVectors(_gt, _gn).normalize(); // _gb ~ up-ish (back)
    const rad = G2.prof(u); frames.push([_gp.clone(), _gn.clone(), _gb.clone(), rad]);
    for (let b = 0; b <= S; b++) { const ang = b / S * TAU; const c = Math.cos(ang), s = Math.sin(ang); const flat = c > 0 ? 1 : .82; // flatter belly
      const ridge = c > .9 && u > .08 && u < .85 ? 1 + .18 * Math.max(0, Math.sin(u * 120)) * (c - .9) * 10 : 1;
      const k = (a * (S + 1) + b) * 3; pa[k] = _gp.x + (_gb.x * c * flat * ridge + _gn.x * s) * rad; pa[k + 1] = _gp.y + (_gb.y * c * flat * ridge + _gn.y * s) * rad; pa[k + 2] = _gp.z + (_gb.z * c * flat * ridge + _gn.z * s) * rad; }
  }
  G2.geo.attributes.position.needsUpdate = true; G2.geo.computeVertexNormals();
  const sp = G2.spG.attributes.position.array; G2.spot.forEach(([u, v], k) => { const f = frames[Math.round(u * R)], ang = v * TAU, c = Math.cos(ang), s = Math.sin(ang), rr = f[3] * 1.03; sp[k * 3] = f[0].x + (f[2].x * c + f[1].x * s) * rr; sp[k * 3 + 1] = f[0].y + (f[2].y * c + f[1].y * s) * rr; sp[k * 3 + 2] = f[0].z + (f[2].z * c + f[1].z * s) * rr; });
  G2.spG.attributes.position.needsUpdate = true;
  const tl = frames[R]; G2.tail.position.copy(tl[0]); G2.tail.lookAt(_gp.copy(tl[0]).multiplyScalar(2).sub(frames[R - 2][0]));
}
// The thing in the fog
function buildPale() {
  const P = makePaleModel(); const g = P.g;
  const aura = glow(0xc8d8d8, 9, .16); aura.position.y = 2.6; g.add(aura); P.aura = aura;
  g.visible = false; SP.scene.add(g); SP.pale = P; P.pos = new THREE.Vector3(); P.on = false;
}
