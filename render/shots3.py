import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from shots2 import bone_mat, house, glass_mat, cap_mat, cube, key_scale, key_rot
import bpy, bmesh

S = lambda s: int(s * FPS)
RES = tuple(int(x) for x in os.environ.get('RES', '960x540').split('x'))
SAMP = int(os.environ.get('SAMP', '16'))
DUR = {'eyetunnel': 6, 'snail': 6, 'handtree': 6, 'grinner': 6, 'eyejelly': 6, 'mushrooms': 6, 'centipede': 6, 'stilts': 6, 'sleeper': 7}

# pale, yellowed, bloodshot eyes with small pupils
IRIS_PALE = [hexc('2a2a1e'), hexc('6a6a52'), hexc('a8a684'), hexc('d6d2b0')]
IRIS_YEL = [hexc('2a1c04'), hexc('7a5a10'), hexc('c49a2a'), hexc('ecd27a')]
IRIS_GREY = [hexc('1a1e22'), hexc('4a545a'), hexc('8a969c'), hexc('c4ccd0')]
SCLERA = (0.66, 0.56, 0.42)

def flesh(name='flesh', pale=True, wet=0.6):
    cols = [hexc('3a2620'), hexc('8a665a'), hexc('c4a08e'), hexc('e2c6b4')] if pale else [hexc('2a0c0a'), hexc('5e1e18'), hexc('8e3e30'), hexc('b86a56')]
    return skin(name, cols, scale=2.6, cell=2.2, bump=0.7, coat=wet, rough=0.35, sss=0.3, crease=0.5)

def stare(rig, cam, start=1, snap=None):
    """Ball turns to follow the camera. snap=(frame) blends from 0 to 1 over 3 frames."""
    c = rig['ball'].constraints.new('DAMPED_TRACK')
    c.target = cam
    c.track_axis = 'TRACK_Z'
    if snap:
        c.influence = 0.0; c.keyframe_insert('influence', frame=1); c.keyframe_insert('influence', frame=snap)
        c.influence = 1.0; c.keyframe_insert('influence', frame=snap + 3)
    return c

def open_lids(rig, f_open, dur=10, start_closed=True):
    if start_closed:
        lid_key(rig, 1, 1)
        lid_key(rig, f_open, 1)
    lid_key(rig, f_open + dur, 0)

def dark_world(c=(0.004, 0.004, 0.006), strength=1.0):
    return world_nebula(c, tuple(x * 3 for x in c), strength, stars=False, scale=1.0)

# ============================================================ 1. tunnel of watching eyes
def shot_eyetunnel():
    F = S(DUR['eyetunnel'])
    sc = reset()
    dark_world((0.006, 0.001, 0.001))
    bone = bone_mat('bone', dark=True)
    meat = flesh('meat', pale=False, wet=0.9)
    lidm = flesh('lidm', pale=False, wet=0.7)
    ground(60, meat, 0.5, 2.5)
    shell = sphere('shell', (0, 18, 0), 1.0, (4.2, 30, 5.6), seg=96, rings=48, m=meat)
    displace(shell, 0.05, 0.12, subdiv=1)
    rnd = random.Random(5)
    for i in range(16):
        y = i * 2.3
        w = 3.2 + 0.4 * math.sin(i * 0.7)
        hgt = 4.6 + 0.3 * math.cos(i)
        pts = [(-w * math.cos(math.pi * k / 12), y, -0.3 + hgt * math.sin(math.pi * k / 12) ** 0.85) for k in range(13)]
        rad = [0.42 - 0.12 * math.sin(math.pi * k / 12) for k in range(13)]
        tube('rib%d' % i, pts, 0, 0, bone, res=5, bevel_res=5, radii=rad)
        for k in range(rnd.randint(1, 3)):
            x = rnd.uniform(-w * 0.7, w * 0.7)
            top = hgt * math.sin(math.acos(max(-1, min(1, x / -w)))) ** 0.85 - 0.4
            sp = walk((x, y, top), (0, 0, -1), 6, rnd.uniform(1.0, 2.6) / 5, 0.08, seed=rnd.random())
            t = tube('strand%d_%d' % (i, k), sp, 0.06, 0.012, meat, res=4, bevel_res=3)
            pe = empty('sp%d_%d' % (i, k), (x, y, top)); parent(t, pe)
            noise_anim(pe, 'rotation_euler', 0, 0.05, 40); noise_anim(pe, 'rotation_euler', 1, 0.05, 40)
    cam, tgt = camera((0, -3, 1.9), (0, 30, 2.2), lens=24)
    key_loc(cam, 1, (0.3, -4, 1.7)); key_loc(cam, F, (-0.2, 11, 2.0))
    key_loc(tgt, 1, (0.5, 30, 2.4)); key_loc(tgt, F, (-0.3, 40, 2.0))
    linear(cam)
    noise_anim(cam, 'location', 2, 0.06, 30)
    # eyes set into the flesh between the ribs; they open as the camera nears and follow it
    for i in range(36):
        y = 2.5 + i * 0.75 + rnd.uniform(-0.3, 0.3)
        a = rnd.uniform(0.1, 0.95) if i % 2 else math.pi - rnd.uniform(0.1, 0.95)
        if i % 7 == 3:
            a = rnd.uniform(1.2, 1.9)
        rx, rz = 3.55, 4.6
        p = Vector((-rx * math.cos(a), y, -0.2 + rz * math.sin(a) * 0.95))
        inward = Vector((math.cos(a), 0, -math.sin(a))).normalized()
        r = rnd.uniform(0.3, 0.62)
        rig = eye('E%d' % i, tuple(p - inward * r * 0.2), r, (0, y - 7, 2.0), rnd.choice([IRIS_PALE, IRIS_YEL, IRIS_GREY]),
                  lidm, open_up=-48, open_dn=44, pupil=0.09, iris=0.36, veins=1.0, sclera=SCLERA)
        cam_y_at = lambda f: -4 + 15 * (f - 1) / (F - 1)
        f_open = int(max(2, min(F - 12, (y - 13 + 4) / 15 * (F - 1))))
        open_lids(rig, f_open, rnd.randint(4, 9))
        stare(rig, cam)
    light('AREA', (0, 40, 2.5), 2500, (1.0, 0.35, 0.2), 6, target=(0, 0, 2))
    light('POINT', (0, 18, 3.0), 120, (1.0, 0.3, 0.15), 1)
    light('POINT', (0, 6, 3.0), 60, (0.9, 0.4, 0.3), 1)
    lc = light('POINT', (0, -3, 2.3), 300, (0.75, 0.8, 0.95), 0.3)
    lc.parent = cam
    lc.location = (0, 0.2, 0.3)
    return sc, F

# ============================================================ 2. teeth-shell slug with eye stalks, at night
def shot_snail():
    F = S(DUR['snail'])
    sc = reset()
    world_dusk([(0.0, hexc('0e1408')), (0.1, hexc('141c0c')), (0.35, hexc('080a06')), (1.0, hexc('020302'))], clouds=0.5, strength=1.0)
    sphere('moon', (-14, 60, 22), 3.0, m=simple_mat('moon', (0.6, 0.7, 0.4), emit=(0.55, 0.7, 0.35), emit_str=3))
    stone = skin('stone', [hexc('121210'), hexc('2a2a24'), hexc('44423a')], scale=1.0, cell=3.0, bump=0.9, coat=0.0, rough=0.8, crease=0.7)
    slug = flesh('slug', pale=True, wet=0.95)
    tooth = bone_mat('tooth')
    cube('deck', (0, 0, -0.35), (30, 3.2, 0.7), stone)
    for x in (-9, 0, 9):
        cube('pier%d' % x, (x, 0, -6), (1.6, 2.6, 11), stone)
    cube('water', (0, 0, -9), (200, 200, 0.1), simple_mat('water', (0.005, 0.006, 0.005), rough=0.03))
    cd = bpy.data.cameras.new('Cam')
    snail = empty('snail', (-2.5, 0, 0))
    n = 14
    pts = [(-2.4 + 4.8 * i / (n - 1), 0, 0.28 + 0.12 * math.sin(math.pi * i / (n - 1))) for i in range(n)]
    rad = [0.08 + 0.42 * math.sin(math.pi * (0.15 + 0.8 * i / (n - 1))) for i in range(n)]
    rad[-1] = 0.32; rad[-2] = 0.4
    body = tube('body', pts, 0, 0, slug, res=6, bevel_res=6, radii=rad)
    body.scale = (1, 1, 0.75); parent(body, snail)
    head = sphere('head', (2.45, 0, 0.42), 0.4, (1.2, 0.9, 0.9), m=slug); parent(head, snail)
    # mouth of small human-like teeth under the head
    for k in range(9):
        a = -0.8 + 1.6 * k / 8
        t = sphere('ht%d' % k, (2.75 + 0.05 * math.cos(a), 0.28 * math.sin(a), 0.22), 0.045, (0.8, 1, 1.3), seg=10, rings=6, m=tooth)
        parent(t, snail)
    shell = empty('shell', (-0.4, 0, 0.05))
    rnd = random.Random(3)
    a = 0.0; i = 0
    while a < 4.2 * math.pi:
        r = 1.7 * math.exp(-0.13 * a)
        x, z = r * math.cos(a), r * math.sin(a) + 1.75
        nrm = Vector((math.cos(a), 0, math.sin(a)))
        sz = 0.42 * math.exp(-0.12 * a)
        for yy in (-1, 0, 1):
            if r < 0.5 and yy != 0:
                continue
            t = sphere('molar%d_%d' % (i, yy), (x, yy * sz * 1.6 * (r / 1.7) ** 0.4, z), sz, (1, 0.85, 1.3), seg=16, rings=10, m=tooth)
            t.rotation_mode = 'QUATERNION'; t.rotation_quaternion = nrm.to_track_quat('Z', 'Y')
            displace(t, sz * 0.35, 0.25, subdiv=1)
            t.parent = shell
        a += 0.26 + 0.04 * rnd.random(); i += 1
    parent(shell, snail)
    cam, tgt = camera((0, -8.5, 1.3), (0, 0, 1.5), lens=40)
    key_loc(cam, 1, (-0.6, -8.8, 1.1)); key_loc(cam, F, (1.2, -7.2, 1.4))
    key_loc(tgt, 1, (-1.0, 0, 1.5)); key_loc(tgt, F, (1.2, 0, 1.3))
    # five eye stalks that turn to the camera
    for k, (dy, dz, ln) in enumerate([(-0.25, 0.6, 1.3), (0.25, 0.7, 1.5), (0, 0.9, 1.9), (-0.45, 0.4, 1.0), (0.45, 0.5, 1.1)]):
        base = Vector((2.5, dy * 0.4, 0.65))
        tip = base + Vector((0.3, dy, ln))
        st = tube('stalk%d' % k, [tuple(base), tuple(base + Vector((0.2, dy * 0.4, ln * 0.5))), tuple(tip)], 0.07, 0.04, slug)
        pe = empty('stp%d' % k, tuple(base)); parent(st, pe)
        rig = eye('S%d' % k, tuple(tip + Vector((0, 0, 0.14))), 0.22 + 0.04 * (k % 2), (0, -10, 1.5), rnd.choice([IRIS_PALE, IRIS_YEL]), slug,
                  open_up=-50, open_dn=46, pupil=0.08, iris=0.38, sclera=SCLERA)
        parent(rig['sock'], pe)
        parent(pe, snail)
        noise_anim(pe, 'rotation_euler', 0, 0.1, 28); noise_anim(pe, 'rotation_euler', 1, 0.1, 28)
        stare(rig, cam, snap=30 + k * 6)
        darts(rig, F, seed=k, amp=(30, 15), hold=(6, 14))
        blink(rig, 80 + k * 9)
    key_loc(snail, 1, (-3.4, 0, 0)); key_loc(snail, F, (-2.0, 0, 0)); linear(snail)
    light('AREA', (-4, -5, 4), 300, (0.6, 0.8, 0.5), 4, target=(-2, 0, 1))
    light('AREA', (3, 6, 3), 600, (0.4, 0.7, 0.4), 4, target=(-2, 0, 1))
    light('SPOT', (2, -3, 4), 400, (0.85, 0.95, 0.8), 0.3, target=(1, 0, 1.5)).data.spot_size = math.radians(40)
    return sc, F

# ============================================================ 3. the watching tree at night
def shot_handtree():
    F = S(DUR['handtree'])
    sc = reset()
    world_dusk([(0.0, hexc('141822')), (0.1, hexc('0e121a')), (0.35, hexc('06080c')), (1.0, hexc('020203'))], clouds=0.6, strength=1.0)
    soil = skin('soil', [hexc('0a0806'), hexc('1a160e')], scale=1, bump=0.3, coat=0)
    wheat = hair_mat('wheat', hexc('14120a'), hexc('5a5032'))
    g = ground(60, soil, 0.4, 5)
    add_mat_slot(g, wheat)
    fur(g, 'wheat', count=7000, length=0.9, children=6, rough=0.05, frizz=0.02, radius=0.008, clump=0.2, rand=0.15, seed=9)
    bark = skin('pale', [hexc('2a2622'), hexc('5a544a'), hexc('8a8476'), hexc('aaa496')], scale=1.8, cell=2.0, bump=0.9, coat=0.15, rough=0.6, stretch=(1, 1, 0.25), crease=0.6)
    nail = skin('nail', [hexc('2a1e12'), hexc('4a3a24')], scale=6, bump=0.3, coat=0.6)
    tc = Vector((0, 4, 0))
    trunk_pts = [tuple(tc + Vector((0.1 * math.sin(k), 0, k * 0.8))) for k in range(9)]
    tube('trunk', trunk_pts, 0, 0, bark, res=6, bevel_res=8, radii=[1.3, 1.05, 0.95, 0.9, 0.85, 0.8, 0.7, 0.55, 0.4])
    rnd = random.Random(2)
    for i in range(7):
        a = i / 7 * math.tau + rnd.uniform(-0.2, 0.2)
        pts = walk(tuple(tc + Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 0.6))), (math.cos(a), math.sin(a), -0.5), 6, 0.6, 0.2, gravity=0.2, seed=rnd.random())
        tube('root%d' % i, pts, 0.45, 0.05, bark, res=5)
    cam, tgt = camera((1.2, -6, 1.0), (0, 4, 3.6), lens=24)
    key_loc(cam, 1, (1.6, -7.0, 0.9)); key_loc(cam, F, (0.5, -4.2, 1.3))
    # mouth with long teeth, opening wide
    mc = tc + Vector((0, -0.97, 1.9))
    mouth = empty('mouth', tuple(mc))
    gullet = sphere('gullet', (0, 0, 0), 0.5, (0.2, 0.15, 1.3), m=simple_mat('throat', (0.0, 0.0, 0.0), rough=0.8)); gullet.parent = mouth
    lipm = flesh('lip', pale=False, wet=0.9)
    tooth = bone_mat('tooth2', dark=True)
    for sx in (-1, 1):
        le = empty('lipE%d' % sx, (0, 0, 0)); le.parent = mouth
        lp = tube('lip%d' % sx, [(0, -0.02, -0.75), (sx * 0.1, -0.08, 0), (0, -0.02, 0.75)], 0.09, 0.09, lipm); lp.parent = le
        for k in range(8):
            z = -0.6 + k * 0.17
            t = cone('tooth%d_%d' % (sx, k), (sx * 0.02, -0.03, z), 0.05, 0.0, 0.2 + 0.1 * rnd.random(), tooth, seg=8)
            t.rotation_euler = (0, math.radians(-90 * sx), 0); t.parent = le
        for f, x in [(1, 0.04), (int(F * 0.3), 0.04), (int(F * 0.8), 0.45), (F, 0.42)]:
            key_loc(le, f, (sx * x, 0, 0))
    for f, x in [(1, 0.1), (int(F * 0.3), 0.1), (int(F * 0.8), 0.95), (F, 0.9)]:
        key_scale(gullet, f, (x, 0.15, 1.3))
    # eyes in the bark
    for k, (zz, ang, r) in enumerate([(3.4, -0.35, 0.28), (3.3, 0.35, 0.26), (4.6, 0.0, 0.2), (1.2, 0.5, 0.16), (2.4, -0.7, 0.17), (5.2, 0.45, 0.14)]):
        rr = 0.92 - 0.04 * zz
        p = tc + Vector((math.sin(ang) * rr, -math.cos(ang) * rr, zz))
        rig = eye('T%d' % k, tuple(p), r, tuple(p + Vector((math.sin(ang), -math.cos(ang), 0)) * 5), rnd.choice([IRIS_PALE, IRIS_YEL]), bark,
                  open_up=-46, open_dn=42, pupil=0.07, iris=0.36, sclera=SCLERA)
        open_lids(rig, 10 + k * 9, 6)
        stare(rig, cam)
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
            f = tube('finger%d_%d' % (i, k), seg, 0.1, 0.045, bark, res=5, bevel_res=4); f.parent = hand
            nl = sphere('nail%d_%d' % (i, k), seg[-1], 0.06, (1, 1, 0.5), seg=12, rings=6, m=nail); nl.parent = hand
        noise_anim(hand, 'rotation_euler', 0, 0.15, 30); noise_anim(hand, 'rotation_euler', 1, 0.15, 30)
    light('SUN', (0, 0, 10), 0.25, (0.6, 0.7, 1.0), target=(-6, 8, -6), angle=3)
    light('AREA', (-5, -6, 6), 300, (0.6, 0.7, 1.0), 6, target=(0, 4, 3))
    light('SPOT', (0.5, -3.5, 0.3), 600, (0.9, 0.85, 0.75), 0.2, target=(0, 4, 3)).data.spot_size = math.radians(50)
    light('AREA', (0, 10, 5), 1500, (0.4, 0.5, 0.8), 6, target=(0, 4, 3))
    return sc, F

# ============================================================ 4. the grinner rising from black water
def shot_grinner():
    F = S(DUR['grinner'])
    sc = reset()
    dark_world((0.002, 0.002, 0.003))
    wm = simple_mat('blackwater', (0.003, 0.003, 0.004), rough=0.02)
    w = cube('water', (0, 0, -0.05), (200, 200, 0.1), wm)
    pale = skin('pale', [hexc('3a3432'), hexc('8a807a'), hexc('c8beb6'), hexc('e6ded6')], scale=2.0, cell=2.5, bump=0.5, coat=0.85, rough=0.25, sss=0.35, crease=0.45)
    tooth = bone_mat('teeth')
    dark = simple_mat('void', (0.0, 0.0, 0.0), rough=0.9)
    lipm = skin('lips', [hexc('3a2224'), hexc('6a4446'), hexc('8a6264')], scale=4, bump=0.4, coat=0.8, rough=0.3)
    hd = empty('hd', (0, 0, 0))
    head = sphere('head', (0, 0, 0), 1.0, (0.95, 0.85, 1.35), m=pale); displace(head, 0.06, 0.5); head.parent = hd
    # sunken sockets + small staring eyes
    cam, tgt = camera((0, -5.2, 0.55), (0, 0, 0.55), lens=50)
    def surf(x, z, off=0.0):
        v = 1 - (x / 0.95) ** 2 - (z / 1.35) ** 2
        return Vector((x, -0.85 * math.sqrt(max(0.0, v)) - off, z))
    for sx in (-1, 1):
        sp_ = surf(sx * 0.3, 0.38)
        so = sphere('sock%d' % sx, tuple(sp_ + Vector((0, 0.1, 0))), 0.17, (1, 0.45, 0.8), seg=24, rings=12, m=dark); so.parent = hd
        rig = eye('G%d' % sx, tuple(sp_ + Vector((0, 0.04, 0))), 0.095, (sx * 0.1, -6, 0.4), IRIS_GREY, None, lids=False, pupil=0.05, iris=0.3, sclera=(0.7, 0.62, 0.5), veins=1.0)
        rig['sock'].parent = hd
        rig['sock'].location = tuple(sp_ + Vector((0, 0.04, 0)))
        stare(rig, cam)
    arc = lambda t: surf(0.72 * t, -0.42 + 0.26 * t * t, 0.01)
    slot = tube('grin', [tuple(arc(-1 + 2 * k / 12)) for k in range(13)], 0, 0, dark, res=5, bevel_res=5, radii=[0.02 + 0.08 * math.sin(math.pi * k / 12) for k in range(13)])
    slot.parent = hd
    for s_ in (-1, 1):
        for k in range(22):
            t = -0.92 + 1.84 * k / 21
            p = arc(t) + Vector((0, -0.005, s_ * (0.015 + 0.06 * math.sin(math.pi * (t + 1) / 2))))
            th = sphere('t%d_%d' % (s_, k), tuple(p), 0.03, (0.7, 0.55, 1.4), seg=10, rings=6, m=tooth)
            th.parent = hd
    # rises, tilts its head, keeps grinning
    for f, z, rz, rx in [(1, -1.55, 0, 6), (int(F * 0.45), -0.35, 0, 0), (int(F * 0.7), 0.15, 12, -4), (F, 0.3, 14, -6)]:
        key_loc(hd, f, (0, 0, z)); key_rot(hd, f, (rx, rz, 0))
    key_loc(cam, 1, (0, -5.4, 0.45)); key_loc(cam, F, (0, -4.0, 0.55))
    key_loc(tgt, 1, (0, 0, 0.0)); key_loc(tgt, F, (0, 0, 0.55))
    sp = light('SPOT', (0, -0.8, 5), 1600, (0.85, 0.9, 1.0), 0.4, target=(0, 0, 0.3))
    sp.data.spot_size = math.radians(30); sp.data.spot_blend = 0.6
    light('AREA', (0, 4, 1), 400, (0.9, 0.2, 0.15), 3, target=(0, 0, 0.5))
    light('AREA', (-3, -4, 0.3), 25, (0.5, 0.6, 0.8), 2, target=(0, 0, 0.3))
    return sc, F

# ============================================================ 5. floating sac of eyes over the drowned village
def shot_eyejelly():
    F = S(DUR['eyejelly'])
    sc = reset()
    world_dusk([(0.0, hexc('2a0806')), (0.08, hexc('1e0606')), (0.25, hexc('0e0406')), (1.0, hexc('020102'))], clouds=0.9, strength=1.0)
    cube('water', (0, 0, -0.05), (300, 300, 0.1), simple_mat('water', (0.01, 0.006, 0.006), rough=0.02))
    wall = skin('plaster', [hexc('1a1612'), hexc('3a3028'), hexc('4a4036')], scale=2, cell=1.5, bump=0.5, coat=0, rough=0.85)
    roof = skin('tiles', [hexc('120a08'), hexc('2a1410'), hexc('3a2018')], scale=4, cell=4, bump=0.8, coat=0.1, rough=0.6, stretch=(1, 3, 1))
    win = simple_mat('win', (0.1, 0.08, 0.05), emit=(1.0, 0.5, 0.2), emit_str=2)
    rnd = random.Random(8)
    for i in range(16):
        x = rnd.uniform(-16, 16); y = rnd.uniform(4, 34)
        house('h%d' % i, x, y, -rnd.uniform(1.5, 2.6), rnd.uniform(2, 3.5), rnd.uniform(2.5, 4), 3.0, wall, roof, win if rnd.random() < 0.15 else None, rot=rnd.uniform(-0.4, 0.4))
    cube('tower', (6, 20, 2.0), (2, 2, 8), wall)
    cone('spire', (6, 20, 6.0), 1.5, 0.0, 4.0, roof, seg=4)
    jc = Vector((-0.5, 5, 4.4))
    jel = empty('jelly', tuple(jc))
    cam, tgt = camera((1.0, -6, 1.8), tuple(jc + Vector((0, 0, -0.4))), lens=30)
    key_loc(cam, 1, (1.6, -6.6, 1.5)); key_loc(cam, F, (0.4, -4.8, 2.2))
    me = bpy.data.meshes.new('bell')
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=1.0)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.25], context='VERTS')
    bm.to_mesh(me); bm.free()
    bell = link_obj(bpy.data.objects.new('bell', me))
    bell.scale = (1.8, 1.8, 1.4)
    sol = bell.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.1
    smooth(bell)
    bm_ = glass_mat('skinglass', (0.97, 0.92, 0.9), (0.5, 0.15, 0.1))
    for nd in bm_.node_tree.nodes:
        if nd.type == 'MATH' and nd.operation == 'MULTIPLY' and abs(nd.inputs[1].default_value - 3.0) < 1e-6:
            nd.inputs[1].default_value = 0.5
    assign(bell, bm_)
    bell.parent = jel
    meat = flesh('meat', pale=False, wet=0.9)
    core = sphere('core', (0, 0.25, 0.25), 0.9, (1.2, 0.8, 0.8), m=meat); displace(core, 0.15, 0.4); core.parent = jel
    lidm = flesh('lidm2', pale=False)
    for k, (x, z, r) in enumerate([(0, 0.45, 0.42), (-0.75, 0.25, 0.26), (0.72, 0.3, 0.28), (-0.35, -0.1, 0.2), (0.38, -0.08, 0.22), (-0.95, 0.6, 0.15), (0.95, 0.68, 0.16), (0.0, 0.95, 0.18)]):
        rig = eye('J%d' % k, (x, -0.5 + 0.1 * abs(x), z), r, (x, -6, z), rnd.choice([IRIS_PALE, IRIS_YEL, IRIS_GREY]), lidm,
                  open_up=-50, open_dn=46, pupil=0.08, iris=0.38, sclera=SCLERA)
        rig['sock'].parent = jel
        rig['sock'].location = (x, -0.5 + 0.1 * abs(x), z)
        stare(rig, cam)
        blink(rig, 40 + k * 11)
    tm = flesh('tent', pale=False, wet=1.0)
    for k in range(14):
        a = k / 14 * math.tau
        top = (math.cos(a) * 1.4, math.sin(a) * 1.4, -0.3)
        pts = walk(top, (math.cos(a) * 0.1, math.sin(a) * 0.1, -1), 9, 0.5, 0.15, seed=k)
        t = tube('tent%d' % k, pts, 0.09, 0.01, tm, res=4, bevel_res=3)
        pe = empty('tp%d' % k, top); pe.parent = jel
        t.parent = pe; t.location = (-top[0], -top[1], -top[2])
        noise_anim(pe, 'rotation_euler', 0, 0.15, 35); noise_anim(pe, 'rotation_euler', 1, 0.15, 35)
    for f in range(1, F + 1, 12):
        p = math.sin(f / 24 * math.pi * 1.1)
        key_scale(bell, f, (1.8 + 0.1 * p, 1.8 + 0.1 * p, 1.4 - 0.08 * p))
    key_loc(jel, 1, tuple(jc + Vector((0.4, 1.0, 0.2)))); key_loc(jel, F, tuple(jc + Vector((-0.2, -0.6, -0.2))))
    light('AREA', (-8, -4, 9), 1500, (1.0, 0.55, 0.45), 8, target=tuple(jc))
    il = light('POINT', (0, -0.2, 1.1), 60, (1.0, 0.6, 0.5), 0.3); il.parent = jel; il.location = (0, -0.2, 1.1)
    light('AREA', (6, 14, 6), 1200, (0.8, 0.2, 0.15), 8, target=tuple(jc))
    lc = light('POINT', (0, 0, 0), 150, (0.8, 0.85, 1.0), 0.3); lc.parent = cam; lc.location = (0, 0.3, 0.2)
    return sc, F

# ============================================================ 6. mushrooms whose eyes all turn at once
def shot_mushrooms():
    F = S(DUR['mushrooms'])
    sc = reset()
    dark_world((0.002, 0.004, 0.004))
    moss = skin('moss', [hexc('040804'), hexc('0e1a0c'), hexc('1e2c16')], scale=1.5, cell=3, bump=0.8, coat=0, rough=0.9)
    ground(60, moss, 0.5, 3)
    bark = skin('bark', [hexc('060504'), hexc('14100c'), hexc('241c16')], scale=1.5, cell=1.5, bump=1.0, coat=0, rough=0.8, stretch=(1, 1, 0.15))
    rnd = random.Random(4)
    for i in range(14):
        cylinder('tree%d' % i, (rnd.uniform(-14, 14), rnd.uniform(6, 26), -0.5), rnd.uniform(0.4, 0.9), 20, bark, seg=20)
    stem = skin('stem', [hexc('3a342a'), hexc('6a6250'), hexc('8a826a')], scale=3, cell=1.2, bump=0.5, coat=0.4, stretch=(1, 1, 0.2), sss=0.2)
    gillm = skin('gillsk', [hexc('2a1a16'), hexc('5a3a30')], scale=12, bump=0.6, coat=0.5, stretch=(1, 1, 0.1))
    lidm = flesh('mlid', pale=True)
    caps = [cap_mat('capA', hexc('2a0a06'), hexc('5a1a0c')), cap_mat('capB', hexc('1a1222'), hexc('3a2a4a')), cap_mat('capC', hexc('2a2410'), hexc('5a4a1e'), False)]
    cam, tgt = camera((0.3, -7.5, 1.7), (0, 1, 2.2), lens=35)
    key_loc(cam, 1, (-0.5, -8.2, 1.5)); key_loc(cam, F, (0.5, -6.4, 1.8))
    spec = [(-2.4, 1.0, 2.2), (-1.0, 0.2, 3.1), (0.4, 0.6, 2.6), (1.7, 0.0, 3.4), (2.9, 1.2, 2.0), (-3.6, 2.0, 1.6), (3.8, 2.4, 1.5)]
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
        cap.modifiers.new('s', 'SOLIDIFY').thickness = 0.08
        smooth(cap); assign(cap, caps[i % 3])
        cylinder('gills%d' % i, tuple(top - Vector((0, 0, 0.06))), R * 0.95, 0.04, gillm, seg=32)
        # one or two eyes hanging under the cap rim
        for k in range(1 if R < 0.75 else 2):
            ex = (k - 0.5) * R * 0.7 if R >= 0.75 else 0
            p = top + Vector((ex, -R * 0.55, -0.22))
            rig = eye('M%d_%d' % (i, k), tuple(p), 0.13 + 0.05 * R, (0, -8, 1.6),
                      rnd.choice([IRIS_PALE, IRIS_YEL]), lidm, open_up=-44, open_dn=40, pupil=0.07, iris=0.36, sclera=SCLERA)
            darts(rig, 70, seed=i * 3 + k, amp=(45, 25), hold=(6, 14))
            stare(rig, cam, snap=66)
            blink(rig, 100 + rnd.randint(0, 30))
    light('AREA', (-4, -5, 6), 250, (0.6, 0.8, 0.7), 5, target=(0, 1, 2))
    light('AREA', (5, 6, 5), 900, (0.3, 0.6, 0.55), 6, target=(0, 1, 2))
    lc = light('POINT', (0, 0, 0), 30, (0.8, 0.9, 0.85), 0.2); lc.parent = cam; lc.location = (0, 0.4, 0.3)
    return sc, F

# ============================================================ 7. pale centipede crawling at the camera
def shot_centipede():
    F = S(DUR['centipede'])
    sc = reset()
    world_dusk([(0.0, hexc('16141e')), (0.12, hexc('0c0c14')), (0.4, hexc('050508')), (1.0, hexc('010102'))], clouds=0.4, strength=1.0)
    sand = skin('sand', [hexc('1a1610'), hexc('2e2a20'), hexc('443c2e')], scale=0.5, cell=4, bump=0.5, coat=0, rough=0.9, crease=0.2)
    ground(120, sand, 1.0, 6)
    bone = bone_mat('bone', dark=True)
    rnd = random.Random(12)
    for i in range(9):
        x = rnd.uniform(-20, 20); y = rnd.uniform(10, 40)
        for s in (-1, 1):
            tube('grib%d_%d' % (i, s), [(x + s * 1.5, y, -0.5), (x + s * 3.0, y, 3.5), (x + s * 2.2, y + 0.4, 7.0), (x + s * 0.4, y + 0.8, 8.5)], 0.55, 0.2, bone, res=5)
    shell = flesh('cflesh', pale=True, wet=0.8)
    tooth = bone_mat('teeth')
    lidm = flesh('clid')
    cam, tgt = camera((0.6, -3.2, 0.35), (0, 4, 0.5), lens=45)
    NSEG = 24
    path = lambda s: Vector((0.9 * math.sin(s * 0.3), 12 - s * 0.6, 0.35))
    segs = []
    for k in range(NSEG):
        sg = empty('seg%d' % k, (0, 0, 0))
        r = 0.32 if k > 0 else 0.42
        body = sphere('sb%d' % k, (0, 0, 0), r, (1.2, 0.85, 0.75), seg=24, rings=12, m=shell); body.parent = sg
        for sy in (-1, 1):
            leg = tube('lg%d_%d' % (k, sy), [(0, sy * 0.3, 0), (0.15, sy * 0.75, 0.25), (0.05, sy * 1.0, -0.38)], 0.05, 0.02, shell, res=3, bevel_res=3)
            lp = empty('lp%d_%d' % (k, sy), (0, sy * 0.25, 0)); lp.parent = sg
            leg.parent = lp; leg.location = (0, -sy * 0.25, 0)
            for f in range(1, F + 1, 4):
                lp.rotation_euler = (0, 0, math.radians(22 * math.sin(f * 0.6 + k * 0.9 + (0 if sy > 0 else math.pi))))
                lp.keyframe_insert('rotation_euler', frame=f)
        if k == 0:
            # mouth of human-like teeth and a cluster of eyes
            for j in range(10):
                a = -0.9 + 1.8 * j / 9
                for zz in (-0.05, -0.17):
                    t = sphere('ct%d_%d' % (j, zz < -0.1), (0.42 + 0.04 * math.cos(a), 0.2 * math.sin(a), zz), 0.035, (0.7, 0.9, 1.3), seg=10, rings=6, m=tooth)
                    t.parent = sg
            mo = sphere('cmouth', (0.4, 0, -0.11), 0.2, (0.3, 1.0, 0.35), seg=16, rings=8, m=simple_mat('cv', (0, 0, 0), rough=1)); mo.parent = sg
            for j, (yy, zz, rr) in enumerate([(-0.14, 0.2, 0.08), (0.14, 0.2, 0.08), (0, 0.3, 0.06), (-0.25, 0.12, 0.05), (0.25, 0.12, 0.05), (-0.07, 0.34, 0.045), (0.07, 0.34, 0.045)]):
                rig = eye('C%d' % j, (0.33, yy, zz), rr, (3, yy, zz), IRIS_YEL, lidm, lids=False, pupil=0.08, iris=0.4, sclera=SCLERA)
                rig['sock'].parent = sg; rig['sock'].location = (0.33, yy, zz)
                stare(rig, cam)
            for sy in (-1, 1):
                mb = cone('mand%d' % sy, (0.35, sy * 0.18, -0.08), 0.06, 0.0, 0.55, shell, seg=10)
                mb.rotation_euler = (0, math.radians(80), math.radians(-sy * 30)); mb.parent = sg
        segs.append(sg)
    for f in range(1, F + 1, 3):
        head_s = 6 + f * 0.1
        for k, sg in enumerate(segs):
            s = head_s - k * 0.6
            p = path(s)
            d = (path(s + 0.05) - path(s - 0.05)).normalized()
            sg.location = tuple(p + Vector((0, 0, 0.05 * math.sin(f * 0.4 + k))))
            sg.rotation_mode = 'XYZ'
            sg.rotation_euler = (0, 0, math.atan2(d.y, d.x))
            sg.keyframe_insert('location', frame=f); sg.keyframe_insert('rotation_euler', frame=f)
    key_loc(tgt, 1, (0.3, 8.4, 0.4)); key_loc(tgt, F, (0.4, 0.2, 0.5))
    light('SUN', (0, 0, 10), 0.3, (0.5, 0.55, 0.9), target=(10, -20, -8), angle=2)
    light('AREA', (-3, 2, 3), 300, (0.6, 0.6, 0.9), 4, target=(0, 3, 0))
    light('SPOT', (1.5, -2.5, 1.2), 500, (0.95, 0.9, 0.8), 0.2, target=(0, 4, 0.3)).data.spot_size = math.radians(35)
    return sc, F

# ============================================================ 8. long-faced stilt walker coming closer in the dark
def shot_stilts():
    F = S(DUR['stilts'])
    sc = reset()
    world_dusk([(0.0, hexc('1a1420')), (0.05, hexc('120e18')), (0.2, hexc('08060c')), (1.0, hexc('020203'))], clouds=0.5, strength=1.0)
    salt = skin('salt', [hexc('1a1816'), hexc('34302a'), hexc('4a4640')], scale=0.35, cell=2.2, bump=0.6, coat=0.3, rough=0.35, crease=0.6)
    ground(200, salt, 0.15, 8)
    pale = skin('face', [hexc('3a3430'), hexc('8a807a'), hexc('c4bab2'), hexc('e2dad2')], scale=2.0, cell=2.5, bump=0.5, coat=0.6, rough=0.3, sss=0.35, crease=0.45)
    hide = skin('hide', [hexc('0e0a08'), hexc('241a14'), hexc('3a2a20')], scale=3, cell=2.5, bump=0.8, coat=0.4, rough=0.4)
    lamp = simple_mat('belly', (1.0, 0.8, 0.5), emit=(1.0, 0.5, 0.2), emit_str=4)
    cam, tgt = camera((0.3, -9, 0.6), (0, 0, 6.0), lens=26)
    walker = empty('walker', (0, 8, 7.0))
    body = sphere('wbody', (0, 0, 0), 1.0, (0.9, 0.9, 0.7), m=hide); displace(body, 0.15, 0.4); body.parent = walker
    face = sphere('face', (0, -0.55, -0.5), 1.0, (0.62, 0.45, 1.25), m=pale); displace(face, 0.04, 0.5); face.parent = walker
    dark = simple_mat('void', (0, 0, 0), rough=1)
    for sx in (-1, 1):
        so = sphere('fs%d' % sx, (sx * 0.24, -0.92, -0.15), 0.2, (1, 0.5, 1.1), seg=20, rings=10, m=dark); so.parent = walker
        rig = eye('F%d' % sx, (sx * 0.24, -0.97, -0.15), 0.15, (0, -9, 0), IRIS_PALE, None, lids=False, pupil=0.05, iris=0.32, sclera=(0.7, 0.62, 0.5))
        rig['sock'].parent = walker; rig['sock'].location = (sx * 0.24, -0.97, -0.15)
        stare(rig, cam)
    mo = sphere('fmouth', (0, -0.95, -1.15), 0.12, (1.0, 0.4, 0.4), seg=16, rings=8, m=dark); mo.parent = walker
    for f, sy in [(1, 0.3), (int(F * 0.5), 0.3), (int(F * 0.75), 1.6), (F, 1.8)]:
        key_scale(mo, f, (1.0, 0.4, 0.4 * sy))
    chain = tube('chain', [(0, 0.3, -0.6), (0, 0.3, -1.8)], 0.02, 0.02, metal_mat('iron', (0.1, 0.1, 0.1), (0.2, 0.1, 0.05), 6)); chain.parent = walker
    bl = sphere('lantern', (0, 0.3, -2.0), 0.25, (1, 1, 1.25), seg=24, rings=12, m=lamp); bl.parent = walker
    pl = light('POINT', (0, 0.3, -2.0), 60, (1.0, 0.5, 0.2), 0.3); pl.parent = walker
    rnd = random.Random(6)
    for f in range(1, F + 1, 2):
        pl.data.energy = 60 * (0.6 + 0.4 * rnd.random()); pl.data.keyframe_insert('energy', frame=f)
    for i, (x, y, ph) in enumerate([(0.6, 0.5, 0), (-0.6, 0.5, math.pi), (0.6, -0.5, math.pi), (-0.6, -0.5, 0)]):
        hip = empty('hip%d' % i, (x, y, -0.3)); hip.parent = walker
        up = tube('thigh%d' % i, [(0, 0, 0), (x * 0.5, 0, -1.8), (x * 0.8, 0, -3.6)], 0.09, 0.06, hide, res=4); up.parent = hip
        knee = empty('knee%d' % i, (x * 0.8, 0, -3.6)); knee.parent = hip
        lo = tube('shin%d' % i, [(0, 0, 0), (0, 0, -1.8), (0, 0, -3.3)], 0.06, 0.025, hide, res=4); lo.parent = knee
        hip.rotation_mode = knee.rotation_mode = 'XYZ'
        for f in range(1, F + 1, 3):
            t = f / 24 * 2 * math.pi * 0.4 + ph
            hip.rotation_euler = (math.radians(-20 * math.sin(t)), 0, 0)
            knee.rotation_euler = (math.radians(16 * max(0, math.cos(t))), 0, 0)
            hip.keyframe_insert('rotation_euler', frame=f); knee.keyframe_insert('rotation_euler', frame=f)
    for f in range(1, F + 1, 3):
        t = f / 24 * 2 * math.pi * 0.8
        walker.location = (0, 8 - f * 0.045, 6.85 + 0.08 * math.sin(t))
        walker.keyframe_insert('location', frame=f)
        walker.rotation_euler = (math.radians(-8 * f / F), math.radians(10 * math.sin(t * 0.3)), 0)
        walker.keyframe_insert('rotation_euler', frame=f)
    key_loc(tgt, 1, (0, 8, 5.6)); key_loc(tgt, F, (0, 2.0, 6.2))
    light('SUN', (0, 0, 10), 0.2, (0.6, 0.55, 0.8), target=(-20, 30, -3), angle=3)
    light('SPOT', (0, -6, 0.2), 4000, (0.9, 0.88, 0.8), 0.2, target=(0, 4, 6)).data.spot_size = math.radians(30)
    light('AREA', (0, 14, 9), 1500, (0.5, 0.55, 0.9), 6, target=(0, 4, 6))
    return sc, F

# ============================================================ 9. the hill wakes up and looks at you
def shot_sleeper():
    F = S(DUR['sleeper'])
    sc = reset()
    world_nebula((0.006, 0.008, 0.016), (0.02, 0.025, 0.05), 0.6, stars=True, scale=1.3)
    soil = skin('soil', [hexc('050605'), hexc('0e100c')], scale=1, bump=0.3, coat=0)
    ground(160, soil, 0.6, 6)
    furm = hair_mat('grassfur', hexc('060a06'), hexc('2a3a22'))
    hidem = skin('hhide', [hexc('080a08'), hexc('1a2016'), hexc('2e3826')], scale=1.5, cell=2, bump=0.7, coat=0.3, rough=0.6)
    hill = empty('hill', (0, 8, 0))
    body = sphere('hbody', (0, 0, 0), 1.0, (9, 6, 4.2), m=hidem); displace(body, 0.25, 0.6)
    add_mat_slot(body, furm)
    fur(body, 'grassfur', count=12000, length=0.35, children=12, rough=0.05, frizz=0.04, radius=0.005, clump=0.3, rand=0.3, seed=21)
    body.parent = hill
    headb = sphere('hhead', (-8.5, -3.2, 0.2), 1.0, (3.6, 3.0, 2.6), m=hidem); displace(headb, 0.2, 0.5)
    add_mat_slot(headb, furm)
    vg = headb.vertex_groups.new(name='nf')
    for v in headb.data.vertices:
        if not (v.co.y < -0.3 and abs(v.co.x + 0.1) < 0.45 and 0.0 < v.co.z < 0.75):
            vg.add([v.index], 1.0, 'REPLACE')
    fur(headb, 'grassfur', count=4000, length=0.3, children=10, rough=0.05, frizz=0.04, radius=0.005, clump=0.3, rand=0.3, vgroup='nf', seed=22)
    headb.parent = hill
    hornm = bone_mat('horn', dark=True)
    for sy, yy in ((-1, -4.6), (1, -1.6)):
        tube('horn%d' % sy, [(-8.0, yy, 2.2), (-7.2, yy - 0.3 * sy, 3.6), (-6.0, yy - 0.6 * sy, 4.0), (-5.2, yy - 0.4 * sy, 3.2), (-5.6, yy, 2.6)], 0.45, 0.06, hornm, res=6).parent = hill
    tube('tail', [(8, -2, -0.5), (10, -5, 0.2), (8, -8, 0.4), (3, -9, 0.3), (-1, -8.5, 0.2)], 1.2, 0.3, hidem, res=6).parent = hill
    wall = skin('hwall', [hexc('1a140e'), hexc('3a2e20')], scale=6, bump=0.4, coat=0)
    roof = skin('hroof', [hexc('0a0604'), hexc('1e100c')], scale=8, cell=4, bump=0.6, coat=0, stretch=(1, 4, 1))
    win = simple_mat('hwin', (0.1, 0.08, 0.04), emit=(1.0, 0.65, 0.3), emit_str=10)
    hs = house('cottage', -1.0, -1.0, 3.95, 1.2, 1.0, 0.8, wall, roof, win, rot=0.3); hs.parent = hill
    light('POINT', (-1.0, -1.8, 4.4), 6, (1.0, 0.6, 0.3), 0.1).parent = hill
    cube('chim', (-0.65, -0.9, 5.05), (0.18, 0.18, 0.5), wall).parent = hill
    for f in range(1, F + 1, 8):
        b = math.sin(f / 24 * 2 * math.pi / 3.2)
        key_scale(body, f, (9, 6 + 0.12 * b, 4.2 + 0.3 * b))
        hs.location = (-1.0, -1.0, 3.95 + 0.3 * b); hs.keyframe_insert('location', frame=f)
    cam, tgt = camera((-1.0, 9.0, 5.0), (-1.2, 14, 4.4), lens=35)
    # big eye on the side of the head: opens late and fixes on the camera
    ep = Vector((-8.6, -6.05 + 8, 0.95))
    rig = eye('BIG', tuple(ep), 0.75, tuple(ep + Vector((0, -8, 0))), [hexc('1a0a02'), hexc('6a2a06'), hexc('c46a14'), hexc('f0b04a')], hidem,
              open_up=-46, open_dn=40, pupil=0.05, iris=0.42, veins=1.0, sclera=SCLERA)
    open_lids(rig, int(F * 0.6), 7)
    stare(rig, cam)
    for f, c, t in [(1, (1.6, 2.2, 5.4), (-1.0, 7.2, 4.4)), (int(F * 0.45), (-2.0, -7, 3.5), (-4.0, 4, 2.0)), (int(F * 0.62), (-6.5, -6.0, 1.5), (-8.6, 1.95, 0.95)), (F, (-7.8, -3.2, 1.1), (-8.6, 1.95, 0.95))]:
        key_loc(cam, f, c); key_loc(tgt, f, t)
    light('SUN', (0, 0, 10), 0.2, (0.6, 0.7, 1.0), target=(10, 20, -10), angle=1)
    light('AREA', (-12, -10, 10), 4000, (0.4, 0.5, 0.9), 12, target=(0, 8, 2))
    light('AREA', (12, 20, 8), 3000, (0.3, 0.4, 0.8), 12, target=(0, 8, 2))
    lc = light('POINT', (0, 0, 0), 20, (0.8, 0.85, 1.0), 0.3); lc.parent = cam; lc.location = (0.3, 0.3, 0.2)
    return sc, F

SHOTS = {'eyetunnel': shot_eyetunnel, 'snail': shot_snail, 'handtree': shot_handtree, 'grinner': shot_grinner, 'eyejelly': shot_eyejelly,
         'mushrooms': shot_mushrooms, 'centipede': shot_centipede, 'stilts': shot_stilts, 'sleeper': shot_sleeper}

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    sc, F = SHOTS[name]()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else F // 2
        setup_render(sc, F, res=(640, 360), samples=12, out='%s/x_%s.png' % (outdir, name))
        sc.frame_set(fr)
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        bpy.ops.render.render(animation=True)
