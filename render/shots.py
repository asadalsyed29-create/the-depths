import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy

S = lambda s: int(s * FPS)
RES = tuple(int(x) for x in os.environ.get('RES', '960x540').split('x'))
SAMP = int(os.environ.get('SAMP', '16'))

# ============================================================ 1. the opening eye
def shot_eye(close_at_end=False):
    F = S(5)
    sc = reset()
    world_nebula((0.02, 0.01, 0.02), (0.05, 0.02, 0.03), 0.3, stars=False)
    flesh = skin('flesh', [hexc('2e1a12'), hexc('6a4030'), hexc('9c7052'), hexc('c09572')], scale=3.0, cell=2.6, bump=0.7, sss=0.2, coat=0.22, rough=0.5)
    head = sphere('head', (0, 0, -0.6), 3.0, (1.3, 1.0, 1.0), m=flesh)
    displace(head, 0.5, 0.8)
    rig = eye('E', (0, -2.2, 0.15), 1.0, (0, -12, 0.5), [hexc('2a120a'), hexc('6b3a22'), hexc('9c6a45'), hexc('c49a6c')], flesh,
              open_up=-38, open_dn=36, pupil=0.19, iris=0.46)
    # fleshy bulge rim around the socket
    rim = torus('rim', (0, -2.2, 0.15), 1.08, 0.26, flesh)
    aim(rim, (0, -12, 0.5))
    displace(rim, 0.08, 0.3, subdiv=1)
    cam, tgt = camera((0.35, -9.0, 0.55), (0, -2.2, 0.15), lens=60, dof=6.8, fstop=5.6)
    key_loc(cam, 1, (0.45, -9.6, 0.7)); key_loc(cam, F, (0.1, -7.6, 0.4))
    light('AREA', (-4, -6, 4), 900, (1.0, 0.85, 0.7), 3, target=(0, -2, 0))
    light('AREA', (5, -3, -1), 300, (0.5, 0.6, 1.0), 2, target=(0, -2, 0))
    light('POINT', (0.6, -5, 1.2), 30, (1, 0.95, 0.9), 0.3)
    if not close_at_end:
        lid_key(rig, 1, 1); lid_key(rig, 14, 1); lid_key(rig, 26, 0)
        darts(rig, F, seed=3, amp=(22, 10), hold=(14, 26))
        blink(rig, 80)
    else:
        darts(rig, F, seed=8, amp=(18, 8), hold=(14, 24))
        lid_key(rig, 1, 0); lid_key(rig, F - 40, 0); lid_key(rig, F - 22, 1)
    return sc, F

# ============================================================ 2. root eye over the swamp
def shot_root():
    F = S(6)
    sc = reset()
    world_dusk([(0.0, hexc('c87a3a')), (0.08, hexc('e6a25e')), (0.25, hexc('6d6f8e')), (0.6, hexc('263357')), (1.0, hexc('0d1226'))], clouds=0.8, strength=1.2)
    bark = skin('bark', [hexc('2b1a0e'), hexc('6e4626'), hexc('a87a48'), hexc('d0a86f')], scale=2.0, cell=2.0, bump=0.8,
                stretch=(1, 1, 0.3), coat=0.25, rough=0.45)
    turf = skin('turf', [hexc('1f2a12'), hexc('3c4a1f'), hexc('5d5a2c')], scale=0.6, cell=3, bump=0.4, coat=0.0, rough=0.8)
    grass = hair_mat('grass', hexc('2a3514'), hexc('8a8a40'))
    g = ground(80, turf, 0.6, 4.0)
    add_mat_slot(g, grass)
    fur(g, 'grass', count=9000, length=0.35, children=10, rough=0.08, frizz=0.05, radius=0.006, clump=0.3, rand=0.35, seed=4)
    water = simple_mat('water', (0.02, 0.03, 0.04), rough=0.04)
    for i, (x, y, s) in enumerate([(-6, 8, 4), (7, 12, 6), (-2, 18, 7)]):
        p = sphere('pond%d' % i, (x, y, 0.05), 1, (s, s * 0.5, 0.02), seg=48, rings=8, m=water)
    eyec = (0, 0, 2.2)
    rig = eye('E', eyec, 1.0, (0.5, -12, 2.5), [hexc('2a1208'), hexc('6d2c1a'), hexc('a2593a'), hexc('d79b78')], bark,
              open_up=-55, open_dn=50, pupil=0.16, iris=0.45)
    knot = sphere('knot', (0, 0.55, 2.2), 1.05, (1.05, 0.9, 1.05), m=bark)
    displace(knot, 0.35, 0.5)
    rnd = random.Random(11)
    for i in range(14):
        a = i / 14 * math.tau + rnd.uniform(-0.2, 0.2)
        d = Vector((math.cos(a), math.sin(a) * 0.8 + 0.3, rnd.uniform(-0.4, 0.5)))
        start = Vector(eyec) + Vector((0, 0.5, 0)) + d * 0.7
        pts = walk(start, d, 10, 0.75, 0.32, gravity=0.18, seed=rnd.random())
        pts = [(x, y, max(z, -0.1)) for (x, y, z) in pts]
        tube('root%d' % i, pts, 0.32, 0.03, bark, res=6, bevel_res=5)
        for k in range(3):
            j = rnd.randint(2, 6)
            sub = walk(pts[j], Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.2, 0.8))), 6, 0.4, 0.4, gravity=0.1, seed=rnd.random())
            tube('twig%d_%d' % (i, k), sub, 0.08, 0.008, bark, res=4, bevel_res=3)
    # gentle sway of the whole eye
    for idx in range(3):
        noise_anim(rig['sock'], 'rotation_euler', idx, 0.06, 60)
    darts(rig, F, seed=5, amp=(25, 10), hold=(18, 30))
    blink(rig, 70)
    cam, tgt = camera((-1.5, -9.5, 2.0), (0, 0, 1.9), lens=40)
    key_loc(cam, 1, (-2.5, -10.5, 1.6)); key_loc(cam, F, (0.8, -8.2, 2.2))
    light('SUN', (0, 0, 10), 2.2, (1.0, 0.72, 0.45), target=(0, 30, -1.5), angle=4)
    light('AREA', (-4, -6, 5), 500, (0.6, 0.7, 1.0), 5, target=eyec)
    return sc, F

# ============================================================ 3. head behind the chimneys
def shot_chimney_head():
    F = S(6)
    sc = reset()
    world_nebula((0.10, 0.04, 0.16), (0.30, 0.13, 0.30), 0.9, scale=1.6)
    hide = skin('hide', [hexc('2f2c1e'), hexc('57553c'), hexc('7f7a5a'), hexc('a49c77')], scale=2.2, cell=3.2, bump=0.9, coat=0.35, crease=0.7)
    metal = metal_mat('metal', (0.22, 0.21, 0.2), (0.28, 0.14, 0.06), 4)
    smk = smoke_mat('smoke', (0.75, 0.78, 0.85), 2.5, 2.0, rise=(F, 1.2))
    furm = hair_mat('furh', hexc('3a1a0b'), hexc('a0582a'))
    soil = skin('soil', [hexc('0d0d0b'), hexc('22211b')], scale=1, bump=0.3, coat=0)
    ground(80, soil, 0.3, 4)
    head = sphere('head', (0, 9, 3.6), 4.4, (1.0, 0.95, 0.92), m=hide)
    displace(head, 0.3, 1.2)
    add_mat_slot(head, furm)
    vg = head.vertex_groups.new(name='sides')
    for v in head.data.vertices:
        w = max(0.0, (abs(v.co.x) - 0.55)) * 2.2 * (1 if v.co.z < 0.6 else 0)
        if w > 0:
            vg.add([v.index], min(1, w), 'REPLACE')
    fur(head, 'furh', count=5000, length=1.6, children=12, rough=0.15, frizz=0.25, radius=0.008, clump=0.4, rand=0.25, vgroup='sides', seed=2)
    rigs = []
    for sx in (-1, 1):
        r = eye('E%d' % sx, (sx * 1.6, 9 - 3.6, 4.7), 0.95, (sx * 0.3, -14, 3.4),
                [hexc('2a0c02'), hexc('8e3c0d'), hexc('d26f1f'), hexc('f3a446')], hide, open_up=-40, open_dn=46, pupil=0.13, iris=0.47)
        brow = torus('brow%d' % sx, (sx * 1.6, 9 - 3.6, 4.7), 1.02, 0.22, hide)
        aim(brow, (sx * 0.3, -14, 3.4))
        brow.scale = (1, 1, 0.6)
        rigs.append(r)
    for i, r in enumerate(rigs):
        darts(r, F, seed=21, amp=(18, 8), hold=(20, 34))
        blink(r, 92)
    hd = empty('hd', (0, 0, 0))
    for o in list(sc.objects):
        if o.name.startswith(('head', 'E-', 'E1', 'brow')) and o.parent is None:
            parent(o, hd)
    key_loc(hd, 1, (0, 0, -0.9)); key_loc(hd, F, (0, 0, 0.1))
    factory(0, 1.5, 26, 7, metal, area=8, hmin=1.0, hmax=3.6, smoke_m=smk, smokes=3, tanks=6, pipes=8)
    weeds(40, 8, 3, bark_like(), center=(0, -2), hmax=1.0)
    cam, tgt = camera((0, -12, 1.4), (0, 4, 3.9), lens=32)
    key_loc(cam, 1, (-0.8, -12.5, 1.3)); key_loc(cam, F, (0.6, -10.8, 1.6))
    light('AREA', (-6, -4, 9), 2500, (1.0, 0.85, 0.7), 6, target=(0, 7, 3))
    light('AREA', (7, 14, 6), 2000, (0.6, 0.4, 1.0), 6, target=(0, 9, 3))
    light('POINT', (2, 1, 1.0), 120, (1.0, 0.5, 0.2), 0.5)
    return sc, F

def bark_like():
    return skin('weedm', [hexc('1b1d0e'), hexc('3f4520'), hexc('69602e')], scale=8, bump=0.3, coat=0.1)

# ============================================================ 4. beaked night bird by the refinery
def shot_beak():
    F = S(5)
    sc = reset()
    world_nebula((0.015, 0.02, 0.03), (0.04, 0.05, 0.07), 0.6, stars=True, scale=1.2)
    metal = metal_mat('metal', (0.3, 0.3, 0.31), (0.25, 0.16, 0.1), 5, rough=0.35)
    smk = smoke_mat('smoke', (0.8, 0.82, 0.9), 2.2, 2.2, rise=(F, 1.0))
    soil = skin('soil', [hexc('0c1115'), hexc('1d2a33'), hexc('2e3c44')], scale=1.2, bump=0.5, coat=0.2, rough=0.6)
    ground(80, soil, 0.4, 3)
    factory(-5, 6, 12, 31, metal, area=4.5, hmin=1.5, hmax=6, smoke_m=smk, smokes=2, tanks=3)
    glow = sphere('glow', (-2.2, 2.5, 1.0), 1.2, m=smoke_mat('glowm', (0.9, 0.92, 1.0), 1.0, 1.0, emit=(0.7, 0.75, 0.9), emit_str=0.4))
    # replace glow material with a uniform soft volume
    gm, nt = mat('glowv')
    out = N(nt, 'ShaderNodeOutputMaterial')
    pv = N(nt, 'ShaderNodeVolumePrincipled', ins={'Color': (0.85, 0.88, 0.95, 1), 'Density': 0.12, 'Emission Strength': 0.15})
    pv.inputs['Emission Color'].default_value = (0.7, 0.75, 0.95, 1)
    L(nt, pv.outputs[0], out.inputs['Volume'])
    assign(glow, gm)
    weeds(70, 7, 9, bark_like(), center=(-1, 2))
    feather = skin('beakskin', [hexc('3b2220'), hexc('7d4a42'), hexc('b97f6e')], scale=3, cell=2, bump=0.5, coat=0.5, stretch=(3, 1, 1))
    furm = hair_mat('furb', hexc('1e1210'), hexc('7a5a50'))
    headc = Vector((3.2, 2.0, 3.0))
    hd = empty('hd', headc)
    head = sphere('head', headc, 1.0, (1.15, 1.0, 1.0), m=feather)
    displace(head, 0.08, 0.5)
    add_mat_slot(head, furm)
    vg = head.vertex_groups.new(name='furzone')
    eyed = Vector((-0.05, -0.82, 0.3)).normalized(); bkd = Vector((-1, -0.1, 0)).normalized()
    for v in head.data.vertices:
        n = v.co.normalized()
        if n.dot(eyed) < 0.8 and n.dot(bkd) < 0.85:
            vg.add([v.index], 1.0, 'REPLACE')
    fur(head, 'furb', vgroup='furzone', count=4000, length=0.55, children=12, rough=0.12, frizz=0.25, radius=0.012, clump=0.35, rand=0.3, seed=7)
    body = sphere('body', tuple(headc + Vector((0.9, 1.6, -2.8))), 1.0, (0.9, 0.9, 2.6), m=feather)
    add_mat_slot(body, furm)
    fur(body, 'furb', count=6000, length=1.0, children=10, rough=0.15, frizz=0.3, radius=0.012, clump=0.4, rand=0.3, seed=8)
    beak = cone('beak', tuple(headc + Vector((-0.7, -0.1, -0.05))), 0.5, 0.02, 3.6, feather, seg=32)
    beak.rotation_euler = (0, math.radians(-96), math.radians(-12))
    beak.scale = (1.0, 0.75, 1)
    rig = eye('E', tuple(headc + Vector((-0.05, -0.82, 0.3))), 0.42, tuple(headc + Vector((-1.0, -12, 0.0))),
              [hexc('1a1008'), hexc('4a2e18'), hexc('8a6440')], feather, open_up=-50, open_dn=44, pupil=0.2, iris=0.38, veins=0.9)
    for o in (head, beak, rig['sock']):
        parent(o, hd)
    hd.rotation_mode = 'XYZ'
    for f, rz, rx in [(1, 0, 0), (30, 6, -3), (55, 6, -3), (62, -4, 4), (90, -4, 4), (96, 3, -1), (F, 3, -1)]:
        hd.rotation_euler = (math.radians(rx), 0, math.radians(rz))
        hd.keyframe_insert('rotation_euler', frame=f)
    darts(rig, F, seed=12, amp=(30, 12), hold=(8, 18))
    blink(rig, 44)
    cam, tgt = camera((0.0, -9.0, 2.3), (0.4, 2.5, 2.2), lens=30)
    key_loc(cam, 1, (0.2, -9.4, 2.2)); key_loc(cam, F, (-0.4, -8.4, 2.4))
    light('AREA', (6, -4, 6), 900, (0.8, 0.85, 1.0), 4, target=headc)
    light('AREA', (-6, 8, 4), 1600, (0.4, 0.5, 0.9), 6, target=(-3, 5, 2))
    light('POINT', (-2.2, 0.6, 1.0), 25, (0.85, 0.9, 1.0), 0.8)
    return sc, F

# ============================================================ 5. spiked twins in the dark
def urchin(name, c, r, m, eye_m_cols, seed, look):
    rnd = random.Random(seed)
    core = sphere(name, c, r, m=m)
    displace(core, 0.08, 0.3)
    spikes = []
    for i in range(70):
        u = rnd.uniform(-1, 1); a = rnd.uniform(0, math.tau)
        d = Vector((math.sqrt(1 - u * u) * math.cos(a), math.sqrt(1 - u * u) * math.sin(a), u))
        if d.dot((Vector(look) - Vector(c)).normalized()) > 0.6:
            continue
        L_ = rnd.uniform(0.6, 1.6) * r
        sp = cone('%s_sp%d' % (name, i), tuple(Vector(c) + d * r * 0.8), r * rnd.uniform(0.08, 0.16), 0.0, L_, m, seg=6)
        sp.rotation_mode = 'QUATERNION'
        sp.rotation_quaternion = d.to_track_quat('Z', 'Y')
        spikes.append(sp)
    rig = eye(name + 'E', tuple(Vector(c) + (Vector(look) - Vector(c)).normalized() * r * 0.55), r * 0.62, look,
              eye_m_cols, m, open_up=-48, open_dn=48, pupil=0.16, iris=0.42)
    grp = empty(name + 'grp', c)
    for o in [core, rig['sock']] + spikes:
        parent(o, grp)
    return grp, rig

def crystal(name, c1, c2):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Metallic': 0.85, 'Roughness': 0.22, 'Coat Weight': 0.6})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    lw = N(nt, 'ShaderNodeLayerWeight', ins={'Blend': 0.45})
    tc = N(nt, 'ShaderNodeTexCoord')
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 9, 'Detail': 10, 'Distortion': 2.0})
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    f = math_n(nt, 'MULTIPLY_ADD', lw.outputs['Facing'], 0.6, math_n(nt, 'MULTIPLY', nz.outputs['Fac'], 0.5))
    c = ramp(nt, f, [(0.2, c1), (0.55, c2), (0.9, (0.95, 0.85, 0.9))])
    L(nt, c.outputs[0], bs.inputs['Base Color'])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.6, 'Distance': 0.02})
    L(nt, nz.outputs['Fac'], bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def shot_urchins():
    F = S(6)
    sc = reset()
    world_nebula((0.01, 0.005, 0.03), (0.04, 0.02, 0.08), 0.5, stars=False)
    m1 = crystal('cr1', hexc('3a1830'), hexc('b0607a'))
    m2 = crystal('cr2', hexc('201838'), hexc('8070b0'))
    g1, r1 = urchin('U1', (-1.6, 0, 0), 1.1, m1, [hexc('2b0f08'), hexc('7a2a14'), hexc('c45a30'), hexc('f09a5a')], 1, (-0.3, -12, 0.3))
    g2, r2 = urchin('U2', (1.7, 0.6, 0.3), 1.0, m2, [hexc('0e1420'), hexc('2c4a6e'), hexc('7aa0c4')], 2, (0.3, -12, 0.2))
    for g, sgn in ((g1, 1), (g2, -1)):
        g.rotation_mode = 'XYZ'
        g.rotation_euler = (0, 0, 0); g.keyframe_insert('rotation_euler', frame=1)
        g.rotation_euler = (math.radians(8 * sgn), math.radians(-10 * sgn), math.radians(14 * sgn)); g.keyframe_insert('rotation_euler', frame=F)
        noise_anim(g, 'location', 2, 0.12, 50)
    darts(r1, F, seed=31, amp=(25, 15), hold=(12, 24)); darts(r2, F, seed=32, amp=(25, 15), hold=(12, 24))
    blink(r1, 60); blink(r2, 100)
    cam, tgt = camera((0, -8.5, 0.6), (0, 0.2, 0.15), lens=45, dof=8.3, fstop=5.6)
    key_loc(cam, 1, (0.6, -9.2, 0.8)); key_loc(cam, F, (-0.5, -7.8, 0.4))
    light('AREA', (-5, -5, 4), 900, (1.0, 0.6, 0.9), 4, target=(0, 0, 0))
    light('AREA', (6, 2, 3), 1200, (0.4, 0.5, 1.0), 4, target=(0, 0, 0))
    light('AREA', (0, 6, -3), 700, (0.8, 0.3, 1.0), 4, target=(0, 0, 0))
    return sc, F

# ============================================================ 6. stalk-eyed crawler (gets the old UI panels)
def shot_crawler():
    F = S(6)
    sc = reset()
    world_dusk([(0.0, hexc('3b3a5a')), (0.15, hexc('2a3a66')), (0.5, hexc('121c3c')), (1.0, hexc('05070f'))], clouds=0.6, strength=1.0)
    turf = skin('turf', [hexc('152010'), hexc('2c3b18'), hexc('4a4a22')], scale=0.6, bump=0.4, coat=0, rough=0.8)
    grass = hair_mat('grass', hexc('1d2a10'), hexc('6d7a35'))
    g = ground(60, turf, 0.4, 4)
    add_mat_slot(g, grass)
    fur(g, 'grass', count=9000, length=0.45, children=10, rough=0.1, frizz=0.05, radius=0.006, clump=0.3, rand=0.4, seed=5)
    shell = skin('shell', [hexc('3a1606'), hexc('8a3c12'), hexc('c4752e'), hexc('e9b468')], scale=2.5, cell=2.2, bump=0.8, coat=0.3, rough=0.38)
    gearm = metal_mat('gear', (0.08, 0.15, 0.5), (0.05, 0.08, 0.3), 6, rough=0.2)
    bc = Vector((0, 0, 1.1))
    body = sphere('body', tuple(bc), 1.4, (1.3, 1.0, 0.7), m=shell)
    displace(body, 0.25, 0.4)
    head = sphere('headc', tuple(bc + Vector((0, -1.3, 0.2))), 0.8, (1.1, 0.9, 0.8), m=shell)
    displace(head, 0.15, 0.3)
    rnd = random.Random(3)
    legs = []
    for sx in (-1, 1):
        for i in range(3):
            y0 = -0.6 + i * 0.6
            pts = [tuple(bc + Vector((sx * 1.3, y0, -0.1))), tuple(bc + Vector((sx * 2.4, y0 * 1.3, 0.7))),
                   tuple(bc + Vector((sx * 3.1, y0 * 1.6, 0.2))), tuple(bc + Vector((sx * 3.4, y0 * 1.8, -1.1)))]
            legs.append(tube('leg%d%d' % (sx, i), pts, 0.16, 0.05, shell, res=6, bevel_res=4))
    # blue gear discs on the flanks
    for sx in (-1, 1):
        for k in range(2):
            c = bc + Vector((sx * 1.55, -0.3 + k * 0.75, 0.15 + k * 0.1))
            t = torus('gear%d%d' % (sx, k), tuple(c), 0.32, 0.09, gearm)
            t.rotation_euler = (0, math.radians(90), 0)
            for j in range(10):
                a = j / 10 * math.tau
                tooth = cone('tooth%d%d%d' % (sx, k, j), tuple(c + Vector((0, math.cos(a) * 0.4, math.sin(a) * 0.4))), 0.07, 0.03, 0.12, gearm, seg=6)
                tooth.rotation_mode = 'QUATERNION'
                tooth.rotation_quaternion = Vector((0, math.cos(a), math.sin(a))).to_track_quat('Z', 'Y')
    rigs = []
    for sx in (-1, 1):
        base = bc + Vector((sx * 0.35, -1.6, 0.6))
        top = base + Vector((sx * 0.5, -0.3, 1.5))
        tube('stalk%d' % sx, [tuple(base), tuple(base + Vector((sx * 0.1, -0.2, 0.8))), tuple(top)], 0.13, 0.08, shell)
        r = eye('S%d' % sx, tuple(top + Vector((0, 0, 0.2))), 0.42, (sx * 0.5, -12, 2.5),
                [hexc('1d1604'), hexc('6d5a12'), hexc('c4b040'), hexc('ece09a')], shell, open_up=-45, open_dn=45, pupil=0.2, iris=0.45)
        rigs.append(r)
    for i, r in enumerate(rigs):
        darts(r, F, seed=40 + i, amp=(35, 15), hold=(8, 20))
        blink(r, 50 + i * 40)
        for idx in range(3):
            noise_anim(r['sock'], 'location', idx, 0.06, 25)
    # mandibles
    for sx in (-1, 1):
        mb = cone('mand%d' % sx, tuple(bc + Vector((sx * 0.3, -1.95, -0.1))), 0.12, 0.01, 0.8, shell, seg=12)
        mb.rotation_euler = (math.radians(100), 0, math.radians(-sx * 25))
    cam, tgt = camera((2.5, -10.5, 2.4), (0, -0.6, 2.05), lens=35)
    key_loc(cam, 1, (3.6, -10.2, 2.2)); key_loc(cam, F, (1.2, -9.9, 2.6))
    light('AREA', (-5, -6, 6), 1400, (1.0, 0.85, 0.7), 5, target=tuple(bc))
    light('AREA', (5, 4, 4), 900, (0.5, 0.6, 1.0), 5, target=tuple(bc))
    return sc, F

# ============================================================ 7. spiral-eyed sentinel over ruins
def shot_sentinel():
    F = S(6)
    sc = reset()
    world_nebula((0.01, 0.012, 0.02), (0.03, 0.035, 0.05), 0.5, stars=True, scale=1.0)
    lump = skin('lump', [hexc('141a24'), hexc('2b3648'), hexc('52627c'), hexc('8a9ab4')], scale=1.6, cell=2.4, bump=1.2, coat=0.5, rough=0.3, crease=0.75)
    metal = metal_mat('metal', (0.16, 0.16, 0.15), (0.2, 0.1, 0.05), 4)
    smk = smoke_mat('smoke', (0.5, 0.55, 0.62), 1.6, 2.0, rise=(F, 1.0))
    soil = skin('soil', [hexc('07090b'), hexc('151a1e')], scale=1, bump=0.3, coat=0)
    ground(80, soil, 0.3, 4)
    factory(0, 6, 16, 77, metal, area=9, hmin=1, hmax=4, smoke_m=smk, smokes=2, tanks=2)
    c = Vector((0, 3, 4.6))
    body = sphere('blob', tuple(c), 1.6, (1.2, 0.9, 1.0), m=lump)
    displace(body, 0.6, 0.35, kind='VORONOI')
    horn = cone('horn', tuple(c + Vector((0, 0, 1.3))), 0.35, 0.0, 1.1, simple_mat('bone', (0.85, 0.85, 0.9), 0.3, coat=0.5))
    rig = eye('E', tuple(c + Vector((0, -1.15, 0.05))), 0.82, (0, -14, 3.5), [hexc('2a0402'), hexc('9a1808'), hexc('e04a1a'), hexc('f8a060')],
              lump, spiral=True, open_up=-46, open_dn=46, pupil=0.08, iris=0.5)
    rnd = random.Random(9)
    arms = []
    for i, (dx, dz) in enumerate([(-1, 0.3), (1, 0.3), (-1, -0.6), (1, -0.5)]):
        pts = [tuple(c + Vector((dx * 1.4, 0, dz)))]
        d = Vector((dx, rnd.uniform(-0.3, 0.3), dz * 0.4 + 0.15))
        pts += walk(tuple(c + Vector((dx * 1.9, 0, dz))), d, 9, 0.65, 0.25, gravity=-0.05 if dz > 0 else 0.12, seed=rnd.random())
        arm = tube('arm%d' % i, pts, 0.45, 0.06, lump, res=6, bevel_res=5)
        arm_e = empty('armp%d' % i, pts[0])
        parent(arm, arm_e)
        arm_e.rotation_mode = 'XYZ'
        for idx in range(3):
            noise_anim(arm_e, 'rotation_euler', idx, 0.12, 30)
        arms.append(arm_e)
    hd = empty('hd', tuple(c))
    for o in [body, horn, rig['sock']] + arms:
        parent(o, hd)
    noise_anim(hd, 'location', 2, 0.15, 45)
    darts(rig, F, seed=55, amp=(15, 8), hold=(25, 40))
    blink(rig, 110)
    cam, tgt = camera((0, -11, 3.6), (0, 3, 4.2), lens=35)
    key_loc(cam, 1, (0, -12.5, 3.2)); key_loc(cam, F, (0, -10.0, 3.8))
    light('AREA', (-6, -6, 8), 1800, (0.7, 0.8, 1.0), 6, target=tuple(c))
    light('AREA', (5, 8, 6), 1500, (0.5, 0.6, 1.0), 6, target=tuple(c))
    light('POINT', tuple(c + Vector((0, -2.5, 0))), 15, (1, 0.4, 0.2), 0.3)
    return sc, F

# ============================================================ 8. starfish twins at the mossy wall
def starhead(name, c, r, m, iris, look, seed):
    rnd = random.Random(seed)
    core = sphere(name, c, r, (1, 0.7, 1), m=m)
    displace(core, 0.1, 0.4)
    dirv = (Vector(look) - Vector(c)).normalized()
    side = dirv.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(dirv).normalized()
    parts = [core]
    n = 9
    for i in range(n):
        a = i / n * math.tau + rnd.uniform(-0.15, 0.15)
        d = (side * math.cos(a) + up * math.sin(a) - dirv * 0.15).normalized()
        sp = cone('%s_arm%d' % (name, i), tuple(Vector(c) + d * r * 0.7), r * 0.28, 0.0, r * rnd.uniform(0.8, 1.4), m, seg=16)
        sp.rotation_mode = 'QUATERNION'
        sp.rotation_quaternion = d.to_track_quat('Z', 'Y')
        parts.append(sp)
    rig = eye(name + 'E', tuple(Vector(c) + dirv * r * 0.25), r * 0.78, look, iris, m, open_up=-50, open_dn=52, pupil=0.2, iris=0.43, veins=0.8)
    parts.append(rig['sock'])
    g = empty(name + 'g', c)
    for p in parts:
        parent(p, g)
    return g, rig

def shot_starfish():
    F = S(5)
    sc = reset()
    world_nebula((0.0, 0.0, 0.0), (0.01, 0.01, 0.01), 0.2, stars=False)
    wet = skin('wet', [hexc('3a0e02'), hexc('8a2e08'), hexc('cc5a1a'), hexc('f09048')], scale=2.6, cell=2.0, bump=0.7, coat=0.9, rough=0.25, crease=0.6)
    stem = skin('stem', [hexc('3a2a22'), hexc('8a6a5a'), hexc('c4a896')], scale=3, cell=1.5, bump=0.6, coat=0.5, stretch=(1, 1, 0.25))
    moss = skin('moss', [hexc('0b1410'), hexc('233b2c'), hexc('4c6a50'), hexc('7a8e6a')], scale=2.2, cell=3, bump=1.0, coat=0.0, rough=0.85, crease=0.5, stretch=(1, 4, 1))
    wall = sphere('wall', (0, 6, 0), 1, (14, 0.4, 10), seg=64, rings=32, m=moss)
    displace(wall, 0.25, 0.08)
    g1, r1 = starhead('A', (-1.05, 0, 1.2), 1.0, wet, [hexc('1a0804'), hexc('4a1a0a'), hexc('7a3a1a')], (-0.6, -12, 1.4), 1)
    g2, r2 = starhead('B', (1.0, 0.3, 1.25), 0.95, wet, [hexc('1a0804'), hexc('4a1a0a'), hexc('7a3a1a')], (0.6, -12, 1.4), 2)
    rnd = random.Random(4)
    for i in range(5):
        x = rnd.uniform(-1.4, 1.4)
        pts = walk((x * 0.6, 0.3, 0.6), (x * 0.4, rnd.uniform(-0.3, 0.3), -1), 6, 0.7, 0.3, gravity=0.1, seed=rnd.random())
        tube('stemleg%d' % i, pts, 0.16, 0.05, stem, res=5)
    for g, s in ((g1, 1), (g2, -1)):
        g.rotation_mode = 'XYZ'
        noise_anim(g, 'rotation_euler', 1, 0.08, 35)
        noise_anim(g, 'rotation_euler', 0, 0.05, 35)
    darts(r1, F, seed=61, amp=(20, 10), hold=(12, 22)); darts(r2, F, seed=62, amp=(20, 10), hold=(12, 22))
    blink(r1, 40); blink(r2, 82)
    cam, tgt = camera((0.3, -6.8, 0.9), (0, 0.2, 1.05), lens=40)
    key_loc(cam, 1, (0.8, -7.2, 0.7)); key_loc(cam, F, (-0.2, -6.0, 1.0))
    light('AREA', (-5, -5, 5), 1100, (1.0, 0.85, 0.7), 4, target=(0, 0, 1))
    light('AREA', (5, -1, 2), 500, (0.6, 0.8, 1.0), 3, target=(0, 0, 1))
    return sc, F

# ============================================================ 9. shaggy pair breathing smoke
def shot_shaggy():
    F = S(7)
    sc = reset()
    world_nebula((0.0, 0.0, 0.0), (0.01, 0.012, 0.015), 0.2, stars=False)
    face1 = skin('face1', [hexc('2a1e14'), hexc('6a5038'), hexc('a88a66')], scale=3, cell=2, bump=0.7, coat=0.4, stretch=(1, 1, 0.3))
    face2 = skin('face2', [hexc('12180e'), hexc('2c3a22'), hexc('5a6a44')], scale=3, cell=2, bump=0.7, coat=0.4)
    h1 = hair_mat('h1', hexc('1e140c'), hexc('a08458'))
    h2 = hair_mat('h2', hexc('0c140c'), hexc('5a7a48'))
    a = sphere('shagA', (-1.4, 0, 0.5), 1.4, (1, 0.9, 1.1), m=face1)
    displace(a, 0.15, 0.5)
    add_mat_slot(a, h1)
    vg = a.vertex_groups.new(name='nofront')
    for v in a.data.vertices:
        if not (v.co.y < -0.5 and abs(v.co.x) < 0.75 and -0.7 < v.co.z < 0.6):
            vg.add([v.index], 1.0, 'REPLACE')
    fur(a, 'h1', count=6000, length=0.9, children=12, rough=0.2, frizz=0.35, radius=0.006, clump=0.5, rand=0.45, vgroup='nofront', seed=11)
    b = sphere('shagB', (1.6, 0.6, 0.6), 1.4, (1, 0.9, 1.1), m=face2)
    displace(b, 0.15, 0.5)
    add_mat_slot(b, h2)
    vg = b.vertex_groups.new(name='nofront')
    for v in b.data.vertices:
        if not (v.co.y < -0.5 and abs(v.co.x + 0.15) < 0.7 and -0.4 < v.co.z < 0.6):
            vg.add([v.index], 1.0, 'REPLACE')
    fur(b, 'h2', count=6000, length=1.0, children=12, rough=0.25, frizz=0.4, radius=0.006, clump=0.5, rand=0.5, vgroup='nofront', seed=12)
    nose = tube('nose', [(-1.35, -1.1, 0.4), (-1.3, -1.6, -0.3), (-1.25, -1.7, -1.4)], 0.32, 0.12, face1, res=6)
    ra = []
    for sx in (-1, 1):
        r = eye('A%d' % sx, (-1.35 + sx * 0.5, -1.18, 0.62), 0.38, (-0.6 + sx * 0.2, -12, 1.0), [hexc('1a0806'), hexc('7a2a1a'), hexc('c86a4a')], face1,
                open_up=-14, open_dn=40, pupil=0.2, iris=0.44, veins=1.0, sclera=(0.85, 0.7, 0.62))
        ra.append(r)
    rb = eye('B1', (1.25, -0.75, 0.75), 0.42, (-0.5, -12, 1.2), [hexc('1a0806'), hexc('7a2a1a'), hexc('c86a4a')], face2,
             open_up=-28, open_dn=40, pupil=0.18, iris=0.44, veins=0.9)
    # blue smoke drifting from the green one toward the brown one
    smb = smoke_mat('blue', (0.45, 0.6, 1.0), 2.5, 1.6, rise=(F, 1.4), emit=(0.25, 0.35, 0.8), emit_str=0.6)
    p = plume((0.6, -0.9, 0.3), 0.2, smb, height=2.2)
    p.scale = (0.9, 0.9, 2.4)
    p.rotation_euler = (0, math.radians(-75), 0)
    for i, r in enumerate(ra):
        darts(r, F, seed=71, amp=(12, 5), hold=(30, 45))
    darts(rb, F, seed=72, amp=(16, 6), hold=(26, 40))
    for r in ra: blink(r, 120)
    blink(rb, 70)
    for o, ph in ((a, 1), (b, 2)):
        noise_anim(o, 'location', 2, 0.05, 40, phase=ph * 10)
    cam, tgt = camera((0, -7.2, 0.8), (0.1, 0, 0.5), lens=38)
    key_loc(cam, 1, (0.4, -7.8, 0.9)); key_loc(cam, F, (-0.3, -6.6, 0.7))
    light('AREA', (-5, -5, 5), 1200, (1.0, 0.85, 0.7), 4, target=(0, 0, 0.5))
    light('AREA', (5, -2, 3), 700, (0.6, 0.7, 1.0), 3, target=(0, 0, 0.5))
    light('AREA', (0, 5, 4), 900, (0.7, 0.8, 1.0), 4, target=(0, 0, 0.5))
    return sc, F

SHOTS = {
    'eye': shot_eye, 'root': shot_root, 'chimney': shot_chimney_head, 'beak': shot_beak, 'urchins': shot_urchins,
    'crawler': shot_crawler, 'sentinel': shot_sentinel, 'starfish': shot_starfish, 'shaggy': shot_shaggy,
    'eyeclose': lambda: shot_eye(True),
}

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else '/tmp/claude-0/-home-user/10ec65bc-a63b-5279-9c28-fcd2f1913f15/scratchpad/v/out'
    sc, F = SHOTS[name]()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else F // 2
        setup_render(sc, F, res=(640, 360), samples=16, out='%s/still_%s.png' % (outdir, name))
        sc.frame_set(fr)
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        bpy.ops.render.render(animation=True)
