import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy, bmesh

S = lambda s: int(s * FPS)
RES = tuple(int(x) for x in os.environ.get('RES', '960x540').split('x'))
SAMP = int(os.environ.get('SAMP', '16'))
DUR = {'ribs': 5, 'snail': 7, 'jelly': 7, 'handtree': 6, 'teapot': 5, 'mushrooms': 6, 'centipede': 6, 'stilts': 5, 'sleeper': 8}

def bone_mat(name='bone', dark=False):
    cols = [hexc('5a4a32'), hexc('a8946c'), hexc('d8c8a0'), hexc('efe4c8')] if not dark else [hexc('2a2218'), hexc('6a5a40'), hexc('a8946c')]
    return skin(name, cols, scale=2.5, cell=1.6, bump=0.5, coat=0.25, rough=0.45, crease=0.35, sss=0.1)

def key_scale(o, f, s):
    o.scale = s
    o.keyframe_insert('scale', frame=f)

def key_rot(o, f, r):
    o.rotation_mode = 'XYZ'
    o.rotation_euler = tuple(math.radians(a) for a in r)
    o.keyframe_insert('rotation_euler', frame=f)

def cube(name, loc, size, m=None, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new(name, me))
    o.location = loc; o.scale = size; o.rotation_euler = rot
    if m: assign(o, m)
    return o

def house(name, x, y, z, w, d, h, wall, roof, window=None, rot=0.0):
    """Box with a gabled roof. Returns parent empty."""
    g = empty(name, (x, y, z))
    me = bpy.data.meshes.new(name + 'r')
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in [(-w / 2 - .1, -d / 2 - .1, 0), (w / 2 + .1, -d / 2 - .1, 0), (w / 2 + .1, d / 2 + .1, 0), (-w / 2 - .1, d / 2 + .1, 0),
                                       (0, -d / 2 - .1, w * 0.45), (0, d / 2 + .1, w * 0.45)]]
    for f in [(0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4), (0, 3, 2, 1)]:
        bm.faces.new([vs[i] for i in f])
    bm.to_mesh(me); bm.free()
    r = link_obj(bpy.data.objects.new(name + 'roof', me))
    r.location = (0, 0, h)
    assign(r, roof)
    r.parent = g
    b = cube(name + 'box', (0, 0, h / 2), (w, d, h), wall)
    b.parent = g
    if window:
        win = cube(name + 'win', (0, -d / 2 - 0.01, h * 0.55), (w * 0.22, 0.02, h * 0.28), window)
        win.parent = g
    g.rotation_euler = (0, 0, rot)
    return g

# ============================================================ 1. through the rib tunnel
def shot_ribs():
    F = S(DUR['ribs'])
    sc = reset()
    world_nebula((0.03, 0.005, 0.005), (0.08, 0.02, 0.015), 0.25, stars=False)
    bone = bone_mat()
    flesh = skin('mem', [hexc('2a0a08'), hexc('5c1a14'), hexc('8a3428'), hexc('b0604a')], scale=1.2, cell=2.0, bump=0.9, coat=0.8, rough=0.25, sss=0.2)
    g = ground(60, flesh, 0.5, 2.5)
    rnd = random.Random(5)
    for i in range(16):
        y = i * 2.3
        w = 3.2 + 0.4 * math.sin(i * 0.7)
        hgt = 4.6 + 0.3 * math.cos(i)
        pts = []
        for k in range(13):
            a = math.pi * k / 12
            pts.append((-w * math.cos(a) + rnd.uniform(-.08, .08), y + rnd.uniform(-.1, .1), -0.3 + hgt * math.sin(a) ** 0.85))
        rad = [0.42 - 0.12 * math.sin(math.pi * k / 12) + 0.04 * rnd.random() for k in range(13)]
        tube('rib%d' % i, pts, 0, 0, bone, res=5, bevel_res=5, radii=rad)
        # knuckle at the top
        sphere('vert%d' % i, (0, y, hgt - 0.15), 0.5, (0.9, 0.9, 0.7), seg=24, rings=12, m=bone)
        # hanging strands
        for k in range(rnd.randint(1, 3)):
            x = rnd.uniform(-w * 0.7, w * 0.7)
            top = hgt * math.sin(math.acos(max(-1, min(1, x / -w)))) ** 0.85 - 0.4
            ln = rnd.uniform(1.0, 2.6)
            sp = walk((x, y, top), (0, 0, -1), 6, ln / 5, 0.08, seed=rnd.random())
            t = tube('strand%d_%d' % (i, k), sp, 0.06, 0.012, flesh, res=4, bevel_res=3)
            pe = empty('sp%d_%d' % (i, k), (x, y, top))
            parent(t, pe)
            noise_anim(pe, 'rotation_euler', 0, 0.05, 40)
            noise_anim(pe, 'rotation_euler', 1, 0.05, 40)
    tube('spine', [(0, -2, 4.9), (0, 10, 5.0), (0, 20, 4.8), (0, 36, 5.0)], 0.3, 0.3, bone)
    # warm glow at the far end
    light('AREA', (0, 40, 2.5), 4000, (1.0, 0.55, 0.25), 6, target=(0, 0, 2))
    light('POINT', (0, 20, 3.0), 300, (1.0, 0.4, 0.2), 1)
    light('POINT', (0, 8, 3.0), 150, (1.0, 0.5, 0.3), 1)
    cam, tgt = camera((0, -3, 1.9), (0, 30, 2.2), lens=24)
    key_loc(cam, 1, (0.4, -4, 1.7)); key_loc(cam, F, (-0.3, 14, 2.3))
    key_loc(tgt, 1, (0.6, 30, 2.4)); key_loc(tgt, F, (-0.4, 40, 2.0))
    linear(cam)
    noise_anim(cam, 'location', 2, 0.08, 30)
    return sc, F

# ============================================================ 2. snail with a shell of teeth, on a bridge
def shot_snail():
    F = S(DUR['snail'])
    sc = reset()
    world_dusk([(0.0, hexc('2f3a1e')), (0.1, hexc('4a5a30')), (0.35, hexc('22301c')), (1.0, hexc('070b07'))], clouds=0.7, strength=1.0)
    moonm = simple_mat('moon', (0.7, 0.9, 0.5), emit=(0.75, 0.95, 0.55), emit_str=6)
    sphere('moon', (-14, 60, 22), 4.0, m=moonm)
    stone = skin('stone', [hexc('2a2a26'), hexc('55534a'), hexc('7e7a6a'), hexc('a09a86')], scale=1.0, cell=3.0, bump=0.9, coat=0.0, rough=0.8, crease=0.7)
    slug = skin('slug', [hexc('231c28'), hexc('4a3d52'), hexc('7a6a80'), hexc('a898ac')], scale=3.0, cell=2.5, bump=0.6, coat=0.95, rough=0.2, sss=0.25, crease=0.4)
    tooth = bone_mat('tooth')
    # bridge deck + pillars + water below
    cube('deck', (0, 0, -0.35), (30, 3.2, 0.7), stone)
    cube('lip1', (0, -1.55, 0.15), (30, 0.25, 0.35), stone)
    for x in (-9, 0, 9):
        cube('pier%d' % x, (x, 0, -6), (1.6, 2.6, 11), stone)
    water = simple_mat('water', (0.01, 0.015, 0.01), rough=0.03)
    cube('water', (0, 0, -9), (200, 200, 0.1), water)
    # snail
    snail = empty('snail', (-2.5, 0, 0))
    n = 14
    pts = [(-2.4 + 4.8 * i / (n - 1), 0, 0.28 + 0.12 * math.sin(math.pi * i / (n - 1))) for i in range(n)]
    rad = [0.08 + 0.42 * math.sin(math.pi * (0.15 + 0.8 * i / (n - 1))) for i in range(n)]
    rad[-1] = 0.32; rad[-2] = 0.4
    body = tube('body', pts, 0, 0, slug, res=6, bevel_res=6, radii=rad)
    body.scale = (1, 1, 0.75)
    parent(body, snail)
    head = sphere('head', (2.45, 0, 0.42), 0.4, (1.2, 0.9, 0.9), m=slug)
    parent(head, snail)
    bulbm = simple_mat('bulb', (0.9, 0.95, 0.6), emit=(1.0, 0.95, 0.6), emit_str=8)
    for sy in (-1, 1):
        base = Vector((2.55, sy * 0.15, 0.7))
        ant = tube('ant%d' % sy, [tuple(base), tuple(base + Vector((0.25, sy * 0.25, 0.6))), tuple(base + Vector((0.35, sy * 0.4, 1.2)))], 0.07, 0.025, slug)
        bl = sphere('bulb%d' % sy, tuple(base + Vector((0.35, sy * 0.4, 1.22))), 0.07, m=bulbm)
        pe = empty('antp%d' % sy, tuple(base))
        parent(ant, pe); parent(bl, pe)
        parent(pe, snail)
        noise_anim(pe, 'rotation_euler', 0, 0.12, 25)
        noise_anim(pe, 'rotation_euler', 1, 0.1, 25)
        light('POINT', tuple(base + Vector((0.35, sy * 0.4, 1.22))), 3, (1.0, 0.95, 0.6), 0.05).parent = pe
    # shell: logarithmic spiral of molars in the XZ plane
    shell = empty('shell', (-0.4, 0, 0.05))
    rnd = random.Random(3)
    a = 0.0
    i = 0
    while a < 4.2 * math.pi:
        r = 1.7 * math.exp(-0.13 * a)
        x, z = r * math.cos(a), r * math.sin(a) + 1.75
        nrm = Vector((math.cos(a), 0, math.sin(a)))
        sz = 0.42 * math.exp(-0.12 * a)
        for yy in (-1, 0, 1):
            if r < 0.5 and yy != 0:
                continue
            t = sphere('molar%d_%d' % (i, yy), (x, yy * sz * 1.6 * (r / 1.7) ** 0.4, z), sz, (1, 0.85, 1.3), seg=16, rings=10, m=tooth)
            t.rotation_mode = 'QUATERNION'
            t.rotation_quaternion = nrm.to_track_quat('Z', 'Y')
            displace(t, sz * 0.35, 0.25, subdiv=1)
            t.parent = shell
        a += 0.26 + 0.04 * rnd.random()
        i += 1
    parent(shell, snail)
    key_loc(snail, 1, (-3.6, 0, 0)); key_loc(snail, F, (-1.2, 0, 0))
    linear(snail)
    noise_anim(shell, 'rotation_euler', 1, 0.02, 30)
    cam, tgt = camera((0, -11.5, 1.4), (0, 0, 1.7), lens=40)
    key_loc(cam, 1, (-1.6, -11.5, 1.2)); key_loc(cam, F, (0.6, -11.0, 1.5))
    key_loc(tgt, 1, (-2.0, 0, 1.7)); key_loc(tgt, F, (0.2, 0, 1.7))
    light('SUN', (0, 0, 10), 1.2, (0.75, 1.0, 0.6), target=(4, -20, -6), angle=2)
    light('AREA', (-4, -5, 4), 600, (0.9, 0.95, 0.8), 4, target=(-2, 0, 1))
    light('AREA', (3, 6, 3), 500, (0.6, 0.9, 0.5), 4, target=(-2, 0, 1))
    return sc, F

# ============================================================ 3. clockwork jellyfish over a drowned village
def glass_mat(name, tint=(0.9, 0.7, 0.85), emit=(0.6, 0.3, 0.6)):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Base Color': tint + (1,), 'Transmission Weight': 1.0, 'Roughness': 0.08, 'IOR': 1.34})
    lw = N(nt, 'ShaderNodeLayerWeight', ins={'Blend': 0.3})
    tc = N(nt, 'ShaderNodeTexCoord')
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 6, 'Detail': 6})
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    bs.inputs['Emission Color'].default_value = emit + (1,)
    L(nt, math_n(nt, 'MULTIPLY', math_n(nt, 'MULTIPLY', lw.outputs['Fresnel'], nz.outputs['Fac']), 3.0), bs.inputs['Emission Strength'])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.3})
    L(nt, nz.outputs['Fac'], bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    L(nt, bs.outputs[0], out.inputs['Surface'])
    return m

def gear(name, c, R, teeth, m, axis='Y'):
    g = empty(name, c)
    t = torus(name + 'rim', (0, 0, 0), R, R * 0.22, m)
    t.parent = g
    hub = sphere(name + 'hub', (0, 0, 0), R * 0.25, (1, 1, 0.5), seg=16, rings=8, m=m)
    hub.parent = g
    for k in range(3):
        sp = cube(name + 'spoke%d' % k, (0, 0, 0), (R * 2, R * 0.12, R * 0.12), m, rot=(0, 0, k * math.pi / 3))
        sp.parent = g
    for j in range(teeth):
        a = j / teeth * math.tau
        tt = cube(name + 't%d' % j, (math.cos(a) * R * 1.18, math.sin(a) * R * 1.18, 0), (R * 0.22, R * 0.16, R * 0.2), m, rot=(0, 0, a))
        tt.parent = g
    if axis == 'Y':
        g.rotation_euler = (math.radians(90), 0, 0)
    return g

def shot_jelly():
    F = S(DUR['jelly'])
    sc = reset()
    world_dusk([(0.0, hexc('d88a7a')), (0.08, hexc('b46a7e')), (0.25, hexc('5a3a66')), (0.6, hexc('231a3a')), (1.0, hexc('0b0a18'))], clouds=0.9, strength=1.1)
    water = simple_mat('water', (0.02, 0.02, 0.03), rough=0.02)
    wp = cube('water', (0, 0, -0.05), (300, 300, 0.1), water)
    wt = bpy.data.textures.new('ripple', 'CLOUDS'); wt.noise_scale = 0.4
    wall = skin('plaster', [hexc('3a3028'), hexc('6a5a48'), hexc('8a7a62')], scale=2, cell=1.5, bump=0.5, coat=0, rough=0.85)
    roof = skin('tiles', [hexc('2a1410'), hexc('5a2a1e'), hexc('7a4030')], scale=4, cell=4, bump=0.8, coat=0.1, rough=0.6, stretch=(1, 3, 1))
    win = simple_mat('win', (0.1, 0.08, 0.05), emit=(1.0, 0.7, 0.35), emit_str=3)
    rnd = random.Random(8)
    for i in range(16):
        x = rnd.uniform(-16, 16); y = rnd.uniform(4, 34)
        house('h%d' % i, x, y, -rnd.uniform(1.5, 2.6), rnd.uniform(2, 3.5), rnd.uniform(2.5, 4), 3.0, wall, roof, win if rnd.random() < 0.3 else None, rot=rnd.uniform(-0.4, 0.4))
    # church-like tower
    cube('tower', (6, 20, 2.0), (2, 2, 8), wall)
    cone('spire', (6, 20, 6.0), 1.5, 0.0, 4.0, roof, seg=4)
    jc = Vector((-0.5, 6, 5.2))
    jel = empty('jelly', tuple(jc))
    me = bpy.data.meshes.new('bell')
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=1.0)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.15], context='VERTS')
    bm.to_mesh(me); bm.free()
    bell = link_obj(bpy.data.objects.new('bell', me))
    bell.scale = (1.8, 1.8, 1.3)
    sol = bell.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.12
    sb = bell.modifiers.new('sub', 'SUBSURF'); sb.levels = sb.render_levels = 1
    smooth(bell)
    assign(bell, glass_mat('glass'))
    bell.parent = jel
    brass = metal_mat('brass', (0.55, 0.38, 0.12), (0.2, 0.25, 0.15), 8, rough=0.25)
    gears = [gear('g1', (0, 0, 0.45), 0.42, 14, brass), gear('g2', (0.62, 0.1, 0.2), 0.26, 9, brass), gear('g3', (-0.5, -0.1, 0.25), 0.3, 10, brass)]
    for k, gg in enumerate(gears):
        gg.parent = jel
        gg.rotation_mode = 'XYZ'
        base = gg.rotation_euler.copy()
        gg.keyframe_insert('rotation_euler', frame=1)
        gg.rotation_euler = (base[0], base[1] + (1 if k % 2 == 0 else -1.6) * math.radians(150), base[2])
        gg.keyframe_insert('rotation_euler', frame=F)
        linear(gg)
    heart = sphere('heartglow', (0, 0, 0.35), 0.25, m=simple_mat('hg', (1, 0.6, 0.3), emit=(1, 0.55, 0.25), emit_str=6))
    heart.parent = jel
    light('POINT', (0, 0, 0.35), 40, (1, 0.6, 0.3), 0.2).parent = jel
    tm = glass_mat('tglass', (0.85, 0.6, 0.85), (0.7, 0.3, 0.7))
    for k in range(16):
        a = k / 16 * math.tau
        r = 1.55
        top = (math.cos(a) * r, math.sin(a) * r, -0.1)
        pts = walk(top, (math.cos(a) * 0.1, math.sin(a) * 0.1, -1), 9, 0.55, 0.15, seed=k)
        t = tube('tent%d' % k, pts, 0.07, 0.01, tm, res=4, bevel_res=3)
        pe = empty('tp%d' % k, top)
        pe.parent = jel
        t.parent = pe
        t.location = (-top[0], -top[1], -top[2])
        noise_anim(pe, 'rotation_euler', 0, 0.15, 35)
        noise_anim(pe, 'rotation_euler', 1, 0.15, 35)
    # pulsing bell, slow drift
    for f in range(1, F + 1, 12):
        p = math.sin(f / 24 * math.pi * 1.2)
        key_scale(bell, f, (1.8 + 0.12 * p, 1.8 + 0.12 * p, 1.3 - 0.1 * p))
    key_loc(jel, 1, tuple(jc + Vector((0.6, 0, -0.3)))); key_loc(jel, F, tuple(jc + Vector((-0.4, 0, 0.5))))
    cam, tgt = camera((1.5, -8, 1.6), tuple(jc + Vector((0, 0, -0.5))), lens=30)
    key_loc(cam, 1, (2.2, -8.5, 1.3)); key_loc(cam, F, (0.5, -7.2, 1.9))
    light('AREA', (-8, -4, 9), 1500, (1.0, 0.75, 0.75), 8, target=tuple(jc))
    light('AREA', (6, 14, 6), 1500, (0.6, 0.5, 1.0), 8, target=tuple(jc))
    return sc, F

# ============================================================ 4. the hand tree in the wheat
def shot_handtree():
    F = S(DUR['handtree'])
    sc = reset()
    world_dusk([(0.0, hexc('a08a50')), (0.1, hexc('8a7a4c')), (0.35, hexc('5e5a44')), (1.0, hexc('2a2a24'))], clouds=0.9, strength=1.3)
    soil = skin('soil', [hexc('2a2214'), hexc('4a3e24')], scale=1, bump=0.3, coat=0)
    wheat = hair_mat('wheat', hexc('5a4a20'), hexc('d8c070'))
    g = ground(60, soil, 0.4, 5)
    add_mat_slot(g, wheat)
    fur(g, 'wheat', count=7000, length=0.9, children=6, rough=0.05, frizz=0.02, radius=0.008, clump=0.2, rand=0.15, seed=9)
    bark = skin('pale', [hexc('4a4640'), hexc('8a847a'), hexc('bab4a8'), hexc('dcd6ca')], scale=1.8, cell=2.0, bump=0.8, coat=0.15, rough=0.6, stretch=(1, 1, 0.25), crease=0.55)
    nail = skin('nail', [hexc('3a2e22'), hexc('6a5a44')], scale=6, bump=0.3, coat=0.6)
    tc = Vector((0, 4, 0))
    trunk_pts = [tuple(tc + Vector((0.1 * math.sin(k), 0, k * 0.8))) for k in range(9)]
    trunk = tube('trunk', trunk_pts, 0, 0, bark, res=6, bevel_res=8, radii=[1.3, 1.05, 0.95, 0.9, 0.85, 0.8, 0.7, 0.55, 0.4])
    # roots
    rnd = random.Random(2)
    for i in range(7):
        a = i / 7 * math.tau + rnd.uniform(-0.2, 0.2)
        pts = walk(tuple(tc + Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 0.6))), (math.cos(a), math.sin(a), -0.5), 6, 0.6, 0.2, gravity=0.2, seed=rnd.random())
        tube('root%d' % i, pts, 0.45, 0.05, bark, res=5)
    # mouth: dark slit with lips and teeth
    mc = tc + Vector((0, -0.95, 2.6))
    mouth = empty('mouth', tuple(mc))
    dark = simple_mat('throat', (0.02, 0.0, 0.0), rough=0.6)
    gullet = sphere('gullet', (0, 0, 0), 0.5, (0.2, 0.15, 1.1), m=dark)
    gullet.parent = mouth
    lipm = skin('lip', [hexc('3a1e1e'), hexc('7a4a44'), hexc('a07068')], scale=4, bump=0.5, coat=0.7, rough=0.3)
    tooth = bone_mat('tooth2')
    lipsE = []
    for sx in (-1, 1):
        le = empty('lipE%d' % sx, (0, 0, 0)); le.parent = mouth
        lp = tube('lip%d' % sx, [(0, -0.02, -0.65), (sx * 0.1, -0.08, 0), (0, -0.02, 0.65)], 0.09, 0.09, lipm)
        lp.parent = le
        for k in range(6):
            z = -0.45 + k * 0.18
            t = cone('tooth%d_%d' % (sx, k), (sx * 0.02, -0.03, z), 0.05, 0.0, 0.16, tooth, seg=8)
            t.rotation_euler = (0, math.radians(-90 * sx), 0)
            t.parent = le
        for f, x in [(1, 0.04), (int(F * 0.2), 0.04), (int(F * 0.75), 0.36), (F, 0.31)]:
            key_loc(le, f, (sx * x, 0, 0))
    for f, x in [(1, 0.1), (int(F * 0.2), 0.1), (int(F * 0.75), 0.75), (F, 0.65)]:
        key_scale(gullet, f, (x, 0.15, 1.1))
    # branches ending in long fingers
    for i in range(7):
        a = i / 7 * math.tau + 0.4
        start = Vector(trunk_pts[5 + i % 3])
        d = Vector((math.cos(a), math.sin(a) * 0.6, 0.7))
        pts = walk(tuple(start), d, 6, 0.75, 0.15, gravity=-0.05, seed=i * 7)
        tube('branch%d' % i, pts, 0.32, 0.12, bark, res=5)
        tip = Vector(pts[-1]); dd = (Vector(pts[-1]) - Vector(pts[-2])).normalized()
        hand = empty('hand%d' % i, tuple(tip))
        side = dd.cross(Vector((0, 0, 1))).normalized()
        for k in range(5):
            off = side * (k - 2) * 0.16
            seg = [tuple(off), tuple(off + dd * 0.9 + Vector((0, 0, 0.08))), tuple(off + dd * 1.7 - Vector((0, 0, 0.2))), tuple(off + dd * 2.3 - Vector((0, 0, 0.6)))]
            if k == 0:
                seg = [tuple(off), tuple(off - side * 0.45 + dd * 0.45), tuple(off - side * 0.7 + dd * 1.0)]
            f = tube('finger%d_%d' % (i, k), seg, 0.1, 0.045, bark, res=5, bevel_res=4)
            f.parent = hand
            nl = sphere('nail%d_%d' % (i, k), seg[-1], 0.06, (1, 1, 0.5), seg=12, rings=6, m=nail)
            nl.parent = hand
        hand.rotation_mode = 'XYZ'
        noise_anim(hand, 'rotation_euler', 0, 0.12, 45)
        noise_anim(hand, 'rotation_euler', 1, 0.12, 45)
    cam, tgt = camera((1.2, -6, 1.0), (0, 4, 3.8), lens=24)
    key_loc(cam, 1, (1.8, -7.0, 0.9)); key_loc(cam, F, (0.6, -4.6, 1.3))
    light('SUN', (0, 0, 10), 1.6, (1.0, 0.9, 0.7), target=(-6, 8, -6), angle=8)
    light('AREA', (-5, -6, 6), 700, (1.0, 0.95, 0.85), 6, target=(0, 4, 3))
    light('POINT', tuple(mc + Vector((0, -0.6, 0))), 2, (1, 0.3, 0.2), 0.1)
    return sc, F

# ============================================================ 5. glazed teapot beast on a chessboard
def glaze_mat(name):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': 0.12, 'Coat Weight': 1.0, 'Coat Roughness': 0.03, 'Subsurface Weight': 0.05})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    wv = N(nt, 'ShaderNodeTexWave', wave_type='RINGS', ins={'Scale': 3.5, 'Distortion': 6, 'Detail': 4})
    L(nt, tc.outputs['Object'], wv.inputs['Vector'])
    pat = ramp(nt, wv.outputs['Fac'], [(0.45, hexc('e8e4da')), (0.6, hexc('2a4a8a')), (0.75, hexc('e8e4da'))])
    vr = N(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', ins={'Scale': 7})
    L(nt, tc.outputs['Object'], vr.inputs['Vector'])
    crack = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 0.015, 'To Min': 0.35, 'To Max': 1})
    L(nt, vr.outputs['Distance'], crack.inputs['Value'])
    c = mix_col(nt, 1.0, pat.outputs[0], crack.outputs[0], 'MULTIPLY')
    L(nt, c, bs.inputs['Base Color'])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.15})
    L(nt, crack.outputs[0], bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def checker_mat(name):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': 0.15})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    ck = N(nt, 'ShaderNodeTexChecker', ins={'Scale': 0.5, 'Color1': (0.75, 0.72, 0.66, 1), 'Color2': (0.02, 0.02, 0.025, 1)})
    L(nt, tc.outputs['Object'], ck.inputs['Vector'])
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 3, 'Detail': 10, 'Distortion': 3})
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    vein = ramp(nt, nz.outputs['Fac'], [(0.45, (1, 1, 1)), (0.5, (0.6, 0.6, 0.6)), (0.55, (1, 1, 1))])
    L(nt, mix_col(nt, 1.0, ck.outputs['Color'], vein.outputs[0], 'MULTIPLY'), bs.inputs['Base Color'])
    return m

def shot_teapot():
    F = S(DUR['teapot'])
    sc = reset()
    world_nebula((0.0, 0.0, 0.0), (0.005, 0.005, 0.008), 0.1, stars=False)
    cube('floor', (0, 0, -0.05), (400, 400, 0.1), checker_mat('checker'))
    gl = glaze_mat('glaze')
    beast = empty('beast', (0, 0, 0))
    body = sphere('tbody', (0, 0, 1.3), 1.3, (1.15, 1.0, 0.85), m=gl)
    body.parent = beast
    belly = torus('band', (0, 0, 1.0), 1.32, 0.07, gl); belly.scale = (1.12, 0.98, 1); belly.parent = beast
    spout = tube('spout', [(-1.2, 0, 1.0), (-1.9, -0.05, 1.4), (-2.3, -0.1, 2.0), (-2.6, -0.15, 2.4)], 0.26, 0.09, gl, res=6)
    spout.parent = beast
    handle = tube('handle', [(1.25, 0, 1.8), (1.95, 0, 1.6), (1.9, 0, 0.9), (1.25, 0, 0.8)], 0.11, 0.11, gl)
    handle.parent = beast
    lid = empty('lid', (0, 0, 2.35))
    lidm = sphere('lidcap', (0, 0, 2.35), 0.72, (1, 1, 0.3), m=gl); parent(lidm, lid)
    knob = sphere('knob', (0, 0, 2.62), 0.15, m=gl); parent(knob, lid)
    lid.parent = beast
    dark = simple_mat('inside', (0.0, 0.0, 0.0), rough=1)
    sphere('hole', (0, 0, 2.2), 0.62, (1, 1, 0.2), m=dark).parent = beast
    for i, (x, y) in enumerate([(0.75, 0.6), (0.75, -0.6), (-0.75, 0.6), (-0.75, -0.6)]):
        lg = cone('leg%d' % i, (x, y, 0), 0.16, 0.3, 0.55, gl, seg=16)
        lg.parent = beast
    # the lid lifts, peeks, drops
    for f, z, rx in [(1, 0, 0), (30, 0, 0), (40, 0.35, -8), (66, 0.38, -10), (72, 0, 0), (92, 0, 0), (100, 0.25, 6), (112, 0.28, 8), (118, 0, 0)]:
        key_loc(lid, f, (0, 0, z)); key_rot(lid, f, (rx, 0, 0))
    # steam from the spout
    st = smoke_mat('steam', (0.9, 0.9, 0.92), 1.6, 2.6, rise=(F, 1.3))
    p = plume((-2.6, -0.15, 2.4), 0.12, st, height=2.6)
    p.scale = (1.0, 1.0, 2.6)
    key_rot(beast, 1, (0, 0, 8)); key_rot(beast, F, (0, 0, -10))
    for f in (1, 36, 70, 104, F):
        key_scale(body, f, (1.15, 1.0, 0.85) if f % 2 else (1.18, 1.03, 0.82))
    cam, tgt = camera((3.5, -6.5, 2.2), (0, 0, 1.4), lens=40, dof=7.2, fstop=8)
    key_loc(cam, 1, (4.2, -6.2, 2.4)); key_loc(cam, F, (2.4, -6.8, 2.0))
    sp = light('SPOT', (0, -1, 9), 3000, (1.0, 0.93, 0.85), 0.6, target=(0, 0, 1))
    sp.data.spot_size = math.radians(48); sp.data.spot_blend = 0.4
    light('AREA', (-4, 4, 3), 300, (0.5, 0.6, 1.0), 3, target=(0, 0, 1.4))
    return sc, F

# ============================================================ 6. singing mushrooms in the mist
def cap_mat(name, c1, c2, spots=True):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': 0.35, 'Coat Weight': 0.6, 'Subsurface Weight': 0.15})
    bs.inputs['Subsurface Radius'].default_value = (0.3, 0.1, 0.05)
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 4, 'Detail': 8})
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    c = ramp(nt, nz.outputs['Fac'], [(0.3, c1), (0.7, c2)])
    col = c.outputs[0]
    if spots:
        vr = N(nt, 'ShaderNodeTexVoronoi', ins={'Scale': 5, 'Randomness': 0.9})
        L(nt, tc.outputs['Object'], vr.inputs['Vector'])
        spt = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.22, 'From Max': 0.18})
        L(nt, vr.outputs['Distance'], spt.inputs['Value'])
        col = mix_col(nt, spt.outputs[0], col, (0.85, 0.82, 0.7))
    L(nt, col, bs.inputs['Base Color'])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.4})
    L(nt, nz.outputs['Fac'], bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def shot_mushrooms():
    F = S(DUR['mushrooms'])
    sc = reset()
    world_nebula((0.01, 0.02, 0.02), (0.04, 0.07, 0.07), 0.6, stars=False, scale=0.8)
    moss = skin('moss', [hexc('0c140c'), hexc('1e321a'), hexc('3a5226')], scale=1.5, cell=3, bump=0.8, coat=0, rough=0.9)
    g = ground(60, moss, 0.5, 3)
    bark = skin('bark', [hexc('100c08'), hexc('2a2018'), hexc('4a3a2a')], scale=1.5, cell=1.5, bump=1.0, coat=0, rough=0.8, stretch=(1, 1, 0.15))
    rnd = random.Random(4)
    for i in range(14):
        x = rnd.uniform(-14, 14); y = rnd.uniform(6, 26)
        cylinder('tree%d' % i, (x, y, -0.5), rnd.uniform(0.4, 0.9), 20, bark, seg=20)
    stem = skin('stem', [hexc('6a604c'), hexc('b0a68a'), hexc('d8ceb0')], scale=3, cell=1.2, bump=0.4, coat=0.2, stretch=(1, 1, 0.2), sss=0.2)
    gillm = simple_mat('gill', (0.1, 0.3, 0.25), emit=(0.3, 0.9, 0.7), emit_str=1.5)
    lipm = skin('mlip', [hexc('3a0e10'), hexc('7a2a2a'), hexc('a85a50')], scale=5, bump=0.4, coat=0.8, rough=0.25)
    dark = simple_mat('mdark', (0.01, 0.0, 0.0), rough=0.7)
    caps = [cap_mat('capA', hexc('5a1a0c'), hexc('a8481e')), cap_mat('capB', hexc('3a2a4a'), hexc('7a5a8a')), cap_mat('capC', hexc('6a5a1a'), hexc('b89a3a'), False)]
    spec = [(-2.4, 1.0, 2.2), (-1.0, 0.2, 3.1), (0.4, 0.6, 2.6), (1.7, 0.0, 3.4), (2.9, 1.2, 2.0), (-3.6, 2.0, 1.6), (3.8, 2.4, 1.5)]
    mouths = []
    for i, (x, y, h) in enumerate(spec):
        bend = rnd.uniform(-0.3, 0.3)
        pts = [(x, y, 0), (x + bend * 0.3, y, h * 0.4), (x + bend * 0.8, y, h * 0.75), (x + bend, y, h)]
        tube('mstem%d' % i, pts, 0.18, 0.12, stem, res=5)
        top = Vector(pts[-1])
        R = 0.55 + 0.25 * (h / 3)
        me = bpy.data.meshes.new('cap%d' % i)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.05], context='VERTS')
        bm.to_mesh(me); bm.free()
        cap = link_obj(bpy.data.objects.new('cap%d' % i, me))
        cap.location = tuple(top); cap.scale = (R, R, R * 0.75)
        sol = cap.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.08
        smooth(cap)
        assign(cap, caps[i % 3])
        gl = cylinder('gills%d' % i, tuple(top - Vector((0, 0, 0.06))), R * 0.95, 0.04, gillm, seg=32)
        # mouth on the front of the cap
        mo = empty('mouth%d' % i, tuple(top + Vector((0, -R * 0.93, R * 0.32))))
        mo.rotation_euler = (math.radians(-70), 0, 0)
        cav = sphere('cav%d' % i, (0, 0, 0), R * 0.32, (1, 0.5, 0.3), seg=24, rings=12, m=dark); cav.parent = mo
        lp = torus('mlip%d' % i, (0, 0, 0), R * 0.3, R * 0.07, lipm); lp.parent = mo
        mo.scale = (1, 0.15, 1)
        mouths.append(mo)
        for o in (cap, gl, mo):
            pass
    # mouths open and close in turn, like a choir
    order = [1, 3, 0, 2, 4, 1, 3, 5, 6, 2]
    for k, idx in enumerate(order):
        mo = mouths[idx]
        f0 = 6 + k * 13
        key_scale(mo, max(1, f0 - 1), (1, 0.15, 1))
        key_scale(mo, f0 + 6, (1, 0.9, 1))
        key_scale(mo, f0 + 16, (1, 0.15, 1))
    for mo in mouths:
        key_scale(mo, 1, (1, 0.15, 1))
    cam, tgt = camera((0.3, -8.5, 1.7), (0, 1, 2.3), lens=35)
    key_loc(cam, 1, (-0.8, -9.5, 1.5)); key_loc(cam, F, (0.8, -7.4, 1.9))
    light('AREA', (-4, -5, 6), 700, (0.8, 1.0, 0.9), 5, target=(0, 1, 2))
    light('AREA', (5, 6, 5), 1000, (0.4, 0.8, 0.8), 6, target=(0, 1, 2))
    return sc, F

# ============================================================ 7. lantern centipede over the rib desert
def shot_centipede():
    F = S(DUR['centipede'])
    sc = reset()
    world_dusk([(0.0, hexc('7a6a8a')), (0.12, hexc('4a4a7a')), (0.4, hexc('1e2244')), (1.0, hexc('06070f'))], clouds=0.4, strength=1.0)
    moonm = simple_mat('moon', (0.9, 0.85, 0.8), emit=(1.0, 0.92, 0.85), emit_str=5)
    sphere('moonA', (-30, 90, 30), 5, m=moonm)
    sphere('moonB', (-18, 95, 18), 2.4, m=simple_mat('moon2', (0.9, 0.6, 0.5), emit=(1.0, 0.6, 0.45), emit_str=5))
    sand = skin('sand', [hexc('5a4a36'), hexc('8a7458'), hexc('b09878')], scale=0.5, cell=4, bump=0.5, coat=0, rough=0.9, crease=0.2)
    ground(120, sand, 1.2, 6)
    bone = bone_mat()
    rnd = random.Random(12)
    for i in range(9):
        x = rnd.uniform(-20, 20); y = rnd.uniform(8, 40)
        for s in (-1, 1):
            pts = [(x + s * 1.5, y, -0.5), (x + s * 3.0, y, 3.5), (x + s * 2.2, y + 0.4, 7.0), (x + s * 0.4, y + 0.8, 8.5)]
            tube('grib%d_%d' % (i, s), pts, 0.55, 0.2, bone, res=5)
    shell = skin('chit', [hexc('1a0e08'), hexc('4a2814'), hexc('7a4a28'), hexc('a87a48')], scale=3, cell=2, bump=0.6, coat=0.7, rough=0.3)
    lamp = simple_mat('lamp', (1, 0.7, 0.3), emit=(1.0, 0.65, 0.3), emit_str=12)
    iron = metal_mat('iron', (0.12, 0.11, 0.1), (0.25, 0.12, 0.05), 6)
    NSEG = 22
    path = lambda s: Vector((s * 0.62 - 6, 2.0 + 1.3 * math.sin(s * 0.35), 0.45))
    segs = []
    for k in range(NSEG):
        sg = empty('seg%d' % k, (0, 0, 0))
        r = 0.42 if k > 0 else 0.5
        body = sphere('sb%d' % k, (0, 0, 0), r, (0.85, 1.1, 0.75), seg=24, rings=12, m=shell)
        body.parent = sg
        for sy in (-1, 1):
            leg = tube('lg%d_%d' % (k, sy), [(0, sy * 0.35, 0), (0.1, sy * 0.85, 0.25), (0.15, sy * 1.15, -0.45)], 0.06, 0.025, shell, res=3, bevel_res=3)
            lp = empty('lp%d_%d' % (k, sy), (0, sy * 0.3, 0))
            lp.parent = sg; leg.parent = lp; leg.location = (0, -sy * 0.3, 0)
            lp.rotation_mode = 'XYZ'
            for f in range(1, F + 1, 6):
                lp.rotation_euler = (0, 0, math.radians(18 * math.sin(f * 0.5 + k * 0.9 + (0 if sy > 0 else math.pi))))
                lp.keyframe_insert('rotation_euler', frame=f)
        if k % 3 == 1:
            pole = tube('pole%d' % k, [(0, 0, 0.25), (0, 0, 1.1), (0.25, 0, 1.3)], 0.025, 0.02, iron, res=3, bevel_res=2)
            pole.parent = sg
            ln = sphere('lan%d' % k, (0.27, 0, 1.08), 0.11, (1, 1, 1.4), seg=16, rings=8, m=lamp)
            ln.parent = sg
            pl = light('POINT', (0.27, 0, 1.0), 25, (1.0, 0.6, 0.3), 0.1)
            pl.parent = sg
        if k == 0:
            for sy in (-1, 1):
                mb = cone('mand%d' % sy, (0.35, sy * 0.18, -0.05), 0.07, 0.0, 0.6, shell, seg=10)
                mb.rotation_euler = (0, math.radians(80), math.radians(-sy * 25))
                mb.parent = sg
        segs.append(sg)
    for f in range(1, F + 1, 4):
        head_s = 12 + f * 0.05
        for k, sg in enumerate(segs):
            s = head_s - k * 0.78
            p = path(s)
            d = (path(s + 0.05) - path(s - 0.05)).normalized()
            sg.location = tuple(p + Vector((0, 0, 0.06 * math.sin(f * 0.3 + k))))
            sg.rotation_mode = 'XYZ'
            sg.rotation_euler = (0, 0, math.atan2(d.y, d.x))
            sg.keyframe_insert('location', frame=f)
            sg.keyframe_insert('rotation_euler', frame=f)
    cam, tgt = camera((3.5, -7.5, 2.4), (3.0, 2.5, 0.8), lens=30)
    key_loc(cam, 1, (2.5, -7.8, 2.3)); key_loc(cam, F, (5.0, -7.0, 2.6))
    key_loc(tgt, 1, (2.0, 2.5, 0.8)); key_loc(tgt, F, (4.0, 2.5, 0.8))
    light('SUN', (0, 0, 10), 0.6, (0.6, 0.65, 1.0), target=(10, -20, -8), angle=2)
    light('AREA', (-6, -4, 6), 500, (0.6, 0.6, 1.0), 6, target=(3, 2, 0))
    return sc, F

# ============================================================ 8. the stilt walker on the salt flat
def shot_stilts():
    F = S(DUR['stilts'])
    sc = reset()
    world_dusk([(0.0, hexc('e8905a')), (0.05, hexc('d46a5a')), (0.2, hexc('7a4a72')), (0.5, hexc('2a2448')), (1.0, hexc('0c0c1c'))], clouds=0.5, strength=1.2)
    salt = skin('salt', [hexc('8a8478'), hexc('c8c0b0'), hexc('e8e2d6')], scale=0.35, cell=2.2, bump=0.6, coat=0.3, rough=0.35, crease=0.6)
    ground(200, salt, 0.15, 8)
    hide = skin('hide', [hexc('1e1612'), hexc('4a3426'), hexc('7a5a40'), hexc('a07c58')], scale=3, cell=2.5, bump=0.8, coat=0.4, rough=0.4)
    lamp = simple_mat('belly', (1.0, 0.8, 0.5), emit=(1.0, 0.7, 0.35), emit_str=10)
    walker = empty('walker', (0, 0, 7.0))
    body = sphere('wbody', (0, 0, 0), 1.0, (1.3, 1.0, 0.8), m=hide)
    displace(body, 0.15, 0.4)
    body.parent = walker
    head = sphere('whead', (1.35, 0, 0.25), 0.4, (1.4, 0.9, 0.8), m=hide); head.parent = walker
    trunk = tube('wtrunk', [(1.85, 0, 0.2), (2.3, 0, -0.3), (2.35, 0, -1.2), (2.2, 0, -1.9)], 0.12, 0.04, hide); trunk.parent = walker
    chain = tube('chain', [(0, 0, -0.75), (0, 0, -1.6)], 0.02, 0.02, metal_mat('iron', (0.1, 0.1, 0.1), (0.2, 0.1, 0.05), 6)); chain.parent = walker
    bl = sphere('lantern', (0, 0, -1.85), 0.32, (1, 1, 1.25), seg=24, rings=12, m=lamp); bl.parent = walker
    light('POINT', (0, 0, -1.85), 120, (1.0, 0.65, 0.3), 0.3).parent = walker
    legs = []
    for i, (x, y, ph) in enumerate([(0.7, 0.6, 0), (0.7, -0.6, math.pi), (-0.7, 0.6, math.pi), (-0.7, -0.6, 0)]):
        hip = empty('hip%d' % i, (x, y, -0.3))
        hip.parent = walker
        up = tube('thigh%d' % i, [(0, 0, 0), (0, y * 0.4, -1.8), (0, y * 0.6, -3.6)], 0.11, 0.07, hide, res=4)
        up.parent = hip
        knee = empty('knee%d' % i, (0, y * 0.6, -3.6)); knee.parent = hip
        lo = tube('shin%d' % i, [(0, 0, 0), (0, 0, -1.8), (0, 0, -3.3)], 0.07, 0.03, hide, res=4)
        lo.parent = knee
        hip.rotation_mode = knee.rotation_mode = 'XYZ'
        for f in range(1, F + 1, 3):
            t = f / 24 * 2 * math.pi * 0.45 + ph
            hip.rotation_euler = (0, math.radians(22 * math.sin(t)), 0)
            knee.rotation_euler = (0, math.radians(-18 * max(0, math.cos(t))), 0)
            hip.keyframe_insert('rotation_euler', frame=f)
            knee.keyframe_insert('rotation_euler', frame=f)
    for f in range(1, F + 1, 3):
        t = f / 24 * 2 * math.pi * 0.9
        walker.location = (-3 + f * 0.035, 0, 6.85 + 0.08 * math.sin(t))
        walker.keyframe_insert('location', frame=f)
        walker.rotation_euler = (math.radians(2 * math.sin(t * 0.5)), 0, 0)
        walker.keyframe_insert('rotation_euler', frame=f)
    cam, tgt = camera((-1, -16, 1.2), (0, 0, 4.0), lens=42)
    key_loc(cam, 1, (-3, -16.5, 1.0)); key_loc(cam, F, (1.5, -15.5, 1.4))
    key_loc(tgt, 1, (-2.5, 0, 4.0)); key_loc(tgt, F, (1.0, 0, 4.0))
    light('SUN', (0, 0, 10), 2.4, (1.0, 0.6, 0.4), target=(-20, 30, -1.5), angle=3)
    light('AREA', (6, -8, 5), 500, (0.5, 0.5, 0.9), 6, target=(0, 0, 4))
    return sc, F

# ============================================================ 9. the sleeping hill
def shot_sleeper():
    F = S(DUR['sleeper'])
    sc = reset()
    world_nebula((0.02, 0.03, 0.07), (0.07, 0.09, 0.18), 0.7, stars=True, scale=1.3)
    soil = skin('soil', [hexc('0a0c0a'), hexc('1a1e16')], scale=1, bump=0.3, coat=0)
    ground(160, soil, 0.6, 6)
    furm = hair_mat('grassfur', hexc('0e1a0c'), hexc('4a6a3a'))
    hidem = skin('hhide', [hexc('101410'), hexc('2a3424'), hexc('4a5a3a')], scale=1.5, cell=2, bump=0.7, coat=0.2, rough=0.7)
    hill = empty('hill', (0, 8, 0))
    body = sphere('hbody', (0, 0, 0), 1.0, (9, 6, 4.2), m=hidem)
    displace(body, 0.25, 0.6)
    add_mat_slot(body, furm)
    fur(body, 'grassfur', count=12000, length=0.35, children=12, rough=0.05, frizz=0.04, radius=0.005, clump=0.3, rand=0.3, seed=21)
    body.parent = hill
    headb = sphere('hhead', (-8.5, -3.2, 0.2), 1.0, (3.6, 3.0, 2.6), m=hidem)
    displace(headb, 0.2, 0.5)
    add_mat_slot(headb, furm)
    fur(headb, 'grassfur', count=4000, length=0.3, children=10, rough=0.05, frizz=0.04, radius=0.005, clump=0.3, rand=0.3, seed=22)
    headb.parent = hill
    # closed eye: a crease with lashes, on the head side facing camera
    lidm = skin('lidc', [hexc('1a1a14'), hexc('3a3a2a')], scale=3, bump=0.5, coat=0.3)
    crease = tube('crease', [(-10.2, -5.75, 1.2), (-9.4, -6.15, 0.95), (-8.5, -5.9, 1.15)], 0.1, 0.1, lidm)
    crease.parent = hill
    for k in range(9):
        t = k / 8
        p = Vector((-10.2 + 1.7 * t, -5.75 - 0.4 * math.sin(math.pi * t), 1.2 - 0.25 * math.sin(math.pi * t)))
        lash = tube('lash%d' % k, [tuple(p), tuple(p + Vector((0, -0.15, -0.25)))], 0.02, 0.005, lidm, res=2, bevel_res=2)
        lash.parent = hill
    hornm = bone_mat('horn')
    for sy, yy in ((-1, -4.6), (1, -1.6)):
        hp_ = [(-8.0, yy, 2.2), (-7.2, yy - 0.3 * sy, 3.6), (-6.0, yy - 0.6 * sy, 4.0), (-5.2, yy - 0.4 * sy, 3.2), (-5.6, yy, 2.6)]
        hn = tube('horn%d' % sy, hp_, 0.45, 0.06, hornm, res=6)
        hn.parent = hill
    tail = tube('tail', [(8, -2, -0.5), (10, -5, 0.2), (8, -8, 0.4), (3, -9, 0.3), (-1, -8.5, 0.2)], 1.2, 0.3, hidem, res=6)
    add_mat_slot(tail, furm)
    tail.parent = hill
    # tiny house on its back
    wall = skin('hwall', [hexc('3a2e22'), hexc('6a5640')], scale=6, bump=0.4, coat=0)
    roof = skin('hroof', [hexc('1a0e0a'), hexc('3a2018')], scale=8, cell=4, bump=0.6, coat=0, stretch=(1, 4, 1))
    win = simple_mat('hwin', (0.1, 0.08, 0.04), emit=(1.0, 0.75, 0.35), emit_str=12)
    hs = house('cottage', -1.0, -1.0, 3.95, 1.2, 1.0, 0.8, wall, roof, win, rot=0.3)
    hs.parent = hill
    light('POINT', (-1.0, -1.8, 4.4), 8, (1.0, 0.7, 0.35), 0.1).parent = hill
    ch = cube('chim', (-0.65, -0.9, 5.05), (0.18, 0.18, 0.5), wall); ch.parent = hill
    sm = smoke_mat('csmoke', (0.6, 0.62, 0.7), 1.4, 2.4, rise=(F, 1.2))
    pl = plume((-0.65, 7.1, 5.25), 0.1, sm, height=2.4)
    pl.scale = (0.9, 0.9, 2.4)
    # breathing
    for f in range(1, F + 1, 8):
        b = math.sin(f / 24 * 2 * math.pi / 3.2)
        key_scale(body, f, (9, 6 + 0.12 * b, 4.2 + 0.3 * b))
        hs.location = (-1.0, -1.0, 3.95 + 0.3 * b); hs.keyframe_insert('location', frame=f)
    # camera: starts close on the cottage, pulls back to show the creature
    cam, tgt = camera((-1.0, 9.0, 5.0), (-1.2, 14, 4.4), lens=35)
    pts_c = [(1, (1.6, 2.2, 5.4), (-1.0, 7.2, 4.4)), (int(F * 0.45), (0.0, -7, 4.5), (-2.5, 7, 3.0)), (F, (-13.0, -15, 3.2), (-4.0, 6, 1.8))]
    for f, c, t in pts_c:
        key_loc(cam, f, c); key_loc(tgt, f, t)
    light('SUN', (0, 0, 10), 0.35, (0.6, 0.7, 1.0), target=(10, 20, -10), angle=1)
    light('AREA', (-12, -10, 10), 9000, (0.5, 0.6, 1.0), 12, target=(0, 8, 2))
    light('AREA', (12, 20, 8), 5000, (0.4, 0.5, 0.9), 12, target=(0, 8, 2))
    return sc, F

SHOTS = {'ribs': shot_ribs, 'snail': shot_snail, 'jelly': shot_jelly, 'handtree': shot_handtree, 'teapot': shot_teapot,
         'mushrooms': shot_mushrooms, 'centipede': shot_centipede, 'stilts': shot_stilts, 'sleeper': shot_sleeper}

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    sc, F = SHOTS[name]()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else F // 2
        setup_render(sc, F, res=(640, 360), samples=12, out='%s/n_%s.png' % (outdir, name))
        sc.frame_set(fr)
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        bpy.ops.render.render(animation=True)
