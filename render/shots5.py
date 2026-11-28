import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from shots2 import bone_mat, cube, key_scale, key_rot, house
from shots3 import stare, open_lids
import bpy, bmesh

S = lambda s: int(s * FPS)
RES = tuple(int(x) for x in os.environ.get('RES', '960x540').split('x'))
SAMP = int(os.environ.get('SAMP', '16'))
DUR = {'chimneys': 6, 'hedge': 7, 'lake': 6, 'pylon': 6, 'town': 6, 'roots': 6, 'field': 6, 'road': 6, 'face': 7}

# realistic wet eyes: pale yellowed sclera, small pupils
IR = {
    'amber': [hexc('1a0a02'), hexc('6a2a06'), hexc('c0601a'), hexc('f0a040')],
    'ash': [hexc('101214'), hexc('3a4046'), hexc('7a8288'), hexc('b8bec2')],
    'rot': [hexc('140e04'), hexc('4a4010'), hexc('8a7a2a'), hexc('c8b860')],
    'blood': [hexc('140202'), hexc('5a0a08'), hexc('a02a1a'), hexc('e07050')],
}
SCL = (0.55, 0.45, 0.33)

def M(key):
    P = {
        'bark': ['0e0804', '3a2414', '6e4a2a', 'a07a50'],
        'deadwood': ['141210', '3a3630', '6a645a', 'a49c8c'],
        'flesh': ['2a0e0a', '6a2e24', 'a8604c', 'd8a08a'],
        'grey': ['0c0e10', '2a3036', '58626c', '9aa4ae'],
        'moss': ['060a04', '1a2610', '3a4a22', '6a7a44'],
        'bruise': ['0e0814', '2e1a3a', '5e3a6a', '9a7aa4'],
    }[key]
    if key in _mc: return _mc[key]
    _mc[key] = skin(key, [hexc(c) for c in P], scale=3.2, cell=1.8, bump=1.2, rough=0.45, coat=0.35, sss=0.08, crease=0.75,
                    stretch=(1, 1, 0.35) if key in ('bark', 'deadwood') else (1, 1, 1))
    return _mc[key]
_mc = {}

def glow_eye(rig, color=(1.0, 0.55, 0.25), energy=1.5):
    """Dim light just in front of the eye so it gleams out of the dark."""
    sock = rig['sock']
    l = light('POINT', (0, 0, 0), energy, color, 0.02)
    l.parent = sock
    l.location = (0, 0, 2.2)
    return l

def big_eye(name, p, r, look, ir, lid_m, cam=None, f_open=None, darts_seed=None, F=144, glow=1.5, lids=(-30, 26)):
    rig = eye(name, tuple(p), r, tuple(look), IR[ir], lid_m, open_up=lids[0], open_dn=lids[1], pupil=0.06, iris=0.36, veins=1.8, sclera=SCL)
    # a swollen pouch of skin around the socket
    pouch = sphere(name + 'pouch', tuple(p), r * 1.35, m=lid_m)
    displace(pouch, r * 0.2, 0.25, subdiv=1)
    pr = Vector(look) - Vector(p)
    pouch.location = tuple(Vector(p) - pr.normalized() * r * 0.55)
    rig['pouch'] = pouch
    if f_open is not None:
        open_lids(rig, f_open, dur=18)
    if darts_seed is not None:
        darts(rig, F, seed=darts_seed, amp=(30, 14), hold=(14, 40))
    elif cam is not None:
        stare(rig, cam)
    if glow:
        glow_eye(rig, energy=glow * r * 15)
    return rig

def branches(name, start, direction, n, length, r0, m, seed, gravity=0.0, wander=0.45, kids=3, sway=0.04, par=None):
    """A tangled branching limb: main walk with thinner offshoots, swaying slightly."""
    rnd = random.Random(seed)
    pe = empty(name, tuple(start))
    pts = walk(tuple(start), direction, n, length / n, wander, gravity, seed=rnd.random())
    objs = [tube(name + 'm', pts, r0, r0 * 0.04, m, res=4, bevel_res=3)]
    for k in range(kids):
        i = rnd.randint(1, n - 2)
        d = (Vector(pts[i + 1]) - Vector(pts[i])).normalized() + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 0.8)))
        kp = walk(pts[i], tuple(d), max(4, n // 2), length / n * 0.8, wander + 0.1, gravity, seed=rnd.random())
        rr = r0 * (1 - i / n) * 0.55
        objs.append(tube(name + 'k%d' % k, kp, rr, rr * 0.05, m, res=3, bevel_res=2))
        if rnd.random() < 0.5 and len(kp) > 3:
            j = rnd.randint(1, len(kp) - 2)
            kk = walk(kp[j], (rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.5, 1)), 4, length / n * 0.6, wander + 0.15, gravity, seed=rnd.random())
            objs.append(tube(name + 'kk%d' % k, kk, rr * 0.4, rr * 0.02, m, res=3, bevel_res=2))
    for o in objs:
        parent(o, pe)
    if sway:
        noise_anim(pe, 'rotation_euler', 0, sway, 50); noise_anim(pe, 'rotation_euler', 1, sway, 50)
    if par:
        parent(pe, par)
    return pe, pts

def thicket(name, c, s, seed, look, mats=('bark', 'deadwood'), up=40, down=30, hair_col=None, core_scale=(1, 1, 1)):
    """A huge tangle of roots and thorny branches around a hidden lumpy core."""
    rnd = random.Random(seed)
    c = Vector(c)
    root = empty(name, tuple(c))
    core = sphere(name + 'core', tuple(c), s * 0.55, core_scale, m=M(mats[0]))
    displace(core, s * 0.3, 0.35, subdiv=2)
    parent(core, root)
    for k in range(up):
        a = rnd.uniform(0, math.tau)
        d = (math.cos(a) * rnd.uniform(0.3, 1), math.sin(a) * rnd.uniform(0.3, 1), rnd.uniform(0.2, 1.2))
        st = c + Vector(d).normalized() * s * 0.4
        branches(name + 'u%d' % k, st, d, 9, s * rnd.uniform(1.0, 2.2), s * rnd.uniform(0.05, 0.11), M(mats[k % 2]), rnd.random(),
                 gravity=-0.02, kids=rnd.randint(1, 3), par=root)
    for k in range(down):
        a = rnd.uniform(0, math.tau)
        d = (math.cos(a), math.sin(a), rnd.uniform(-1.4, -0.2))
        st = c + Vector(d).normalized() * s * 0.45
        branches(name + 'd%d' % k, st, d, 10, s * rnd.uniform(1.2, 2.6), s * rnd.uniform(0.06, 0.13), M(mats[(k + 1) % 2]), rnd.random(),
                 gravity=0.18, kids=rnd.randint(0, 2), sway=0.06, par=root)
    if hair_col:
        hm = hair_mat(name + 'hair', hexc(hair_col[0]), hexc(hair_col[1]))
        add_mat_slot(core, hm)
        fur(core, hm.name, count=1500, length=s * 0.9, children=10, rough=0.3, frizz=0.4, radius=0.01, clump=0.6, rand=0.5, seed=seed)
    root.rotation_mode = 'XYZ'
    noise_anim(root, 'rotation_euler', 2, 0.03, 70)
    return root

def night(strength=0.5, c1=(0.006, 0.008, 0.016), c2=(0.02, 0.024, 0.05)):
    return world_nebula(c1, c2, strength, stars=True, scale=1.2)

def turf_ground(seed=1, count=6000, col=('050804', '242e16'), size=60, z=0.0):
    turf = skin('turf', [hexc('040604'), hexc('0e140a'), hexc('1c2412')], scale=0.6, cell=3, bump=0.5, coat=0, rough=0.9)
    g = ground(size, turf, 0.5, 4.0, z=z)
    if count:
        grass = hair_mat('grass', hexc(col[0]), hexc(col[1]))
        add_mat_slot(g, grass)
        fur(g, 'grass', count=count, length=0.45, children=8, rough=0.08, frizz=0.05, radius=0.006, clump=0.3, rand=0.4, seed=seed)
    return g

def sky_lights(target, key=250, rim=900, keypos=(-5, -6, 4), rimpos=(5, 9, 5), size=5):
    light('SUN', (0, 0, 10), 0.2, (0.5, 0.6, 1.0), target=(4, 10, -6), angle=2)
    light('AREA', keypos, key * 4, (0.8, 0.7, 0.6), size, target=target)
    light('AREA', rimpos, rim * 2, (0.4, 0.5, 1.0), size * 1.4, target=target)

# ------------------------------------------------------------------ scenes
def shot_chimneys():
    """A towering tangle rises behind factory stacks, one eye opens and stares."""
    F = S(DUR['chimneys']); sc = reset(); _mc.clear()
    night(0.6)
    turf_ground(1, count=0)
    met = metal_mat('stack', base=(0.08, 0.07, 0.06), rust=(0.15, 0.06, 0.02))
    factory(0, 2, 9, 4, met, area=6, hmin=2.5, hmax=7, tanks=0)
    cam, tgt = camera((0.5, -14, 1.2), (0, 6, 5.5), lens=30)
    key_loc(cam, 1, (0.9, -14.5, 1.1)); key_loc(cam, F, (0.2, -13, 1.3))
    r = thicket('T', (0, 9, 6), 4.0, 11, cam.location, mats=('deadwood', 'grey'), up=60, down=40)
    key_loc(r, 1, (0, 9, 3.6)); key_loc(r, F, (0, 9, 6.0))
    rig = big_eye('E', (0, 9 - 2.2, 6.1), 0.9, (0, -14, 2), 'amber', M('grey'), cam=cam, f_open=36, glow=3)
    for o in (rig['sock'], rig['pouch']): parent(o, r)
    sky_lights((0, 9, 5), 300, 2200, rimpos=(6, 20, 9), size=8)
    return sc, F

def shot_hedge():
    """A dark hedge at night. Eyes open in it one after another and all look at us."""
    F = S(DUR['hedge']); sc = reset(); _mc.clear()
    night(0.5)
    turf_ground(2, count=5000)
    leaf = hair_mat('leaf', hexc('020402'), hexc('16220c'), rough=0.5)
    for k in range(11):
        hb = sphere('hedge%d' % k, (-5 + k, 2.15, 1.0), 1.05, seg=32, rings=16, m=M('moss'))
        displace(hb, 0.2, 0.4, subdiv=1)
        add_mat_slot(hb, leaf)
        fur(hb, 'leaf', count=1200, length=0.25, children=10, rough=0.4, frizz=0.6, radius=0.012, clump=0.7, rand=0.6, seed=3 + k)
    cam, tgt = camera((0, -4.2, 1.1), (0, 2, 1.05), lens=32)
    key_loc(cam, 1, (0.3, -4.6, 1.1)); key_loc(cam, F, (-0.1, -3.4, 1.1))
    rnd = random.Random(5)
    spots = [(-1.2, 1.35), (0.6, 1.5), (2.3, 1.15), (-2.9, 1.0), (1.5, 0.75), (-0.3, 0.85), (3.4, 1.4), (-2.0, 1.75), (0.0, 1.75)]
    for i, (x, z) in enumerate(spots):
        y = 2.15 - math.sqrt(max(0.05, 1.1 - (x - round(x)) ** 2 - (z - 1) ** 2)) - 0.22
        rr = rnd.uniform(0.1, 0.17)
        rig = big_eye('H%d' % i, (x, y, z), rr, (x * 0.3, -4, 1.1), rnd.choice(list(IR)), M('moss'), cam=cam,
                      f_open=12 + i * 13 + rnd.randint(0, 6), glow=2)
        rig['pouch'].hide_render = True
    sky_lights((0, 2, 1), 600, 900, size=5)
    return sc, F

def shot_lake():
    """A bramble mass floats on black water, its two eyes drift across the shore."""
    F = S(DUR['lake']); sc = reset(); _mc.clear()
    night(0.6)
    ground(80, simple_mat('mud', (0.01, 0.01, 0.008), rough=0.9), 1.2, 3, z=-0.8)
    cube('water', (0, 0, 0), (200, 200, 0.02), simple_mat('lakew', (0.004, 0.005, 0.006), rough=0.03))
    dw = M('deadwood')
    rnd = random.Random(6)
    for i in range(14):
        x = rnd.uniform(-16, 16); y = rnd.uniform(12, 22)
        branches('tree%d' % i, (x, y, -0.3), (0, 0, 1), 8, rnd.uniform(4, 8), 0.25, dw, rnd.random(), wander=0.25, kids=4, sway=0)
    cam, tgt = camera((0, -7.5, 0.6), (0, 2, 1.5), lens=30)
    key_loc(cam, 1, (-0.4, -8.0, 0.55)); key_loc(cam, F, (0.4, -6.8, 0.65))
    r = thicket('L', (0, 3, 0.9), 1.8, 21, cam.location, mats=('bark', 'bruise'), up=34, down=20)
    key_loc(r, 1, (0.6, 3.3, 0.9)); key_loc(r, F, (-0.4, 2.6, 0.9))
    for k, (dx, ir) in enumerate([(-0.45, 'rot'), (0.5, 'rot')]):
        rig = big_eye('L%d' % k, (dx, 3 - 1.0, 1.25 + 0.1 * k), 0.34 - 0.06 * k, (dx * 3, -8, 1.5), ir, M('bark'), darts_seed=40 + k, F=F, glow=2)
        for o in (rig['sock'], rig['pouch']): parent(o, r)
    sky_lights((0, 3, 1), 200, 1500, rimpos=(3, 14, 5), size=6)
    return sc, F

def shot_pylon():
    """Something has wound itself around a power pylon."""
    F = S(DUR['pylon']); sc = reset(); _mc.clear()
    night(0.6)
    turf_ground(4, count=7000)
    met = metal_mat('steel', base=(0.12, 0.12, 0.12), rust=(0.2, 0.08, 0.03))
    def beam(a, b, r=0.05):
        tube('bm', [a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), b], r, r, met, res=1, bevel_res=1)
    H = 12
    for sx in (-1, 1):
        for sy in (-1, 1):
            beam((sx * 1.6, 4 + sy * 1.6, 0), (sx * 0.4, 4 + sy * 0.4, H), 0.08)
    for z in range(0, H, 2):
        w0 = 1.6 - 1.2 * z / H; w1 = 1.6 - 1.2 * (z + 2) / H
        for sx in (-1, 1):
            beam((sx * w0, 4 - w0, z), (-sx * w1, 4 - w1, z + 2)); beam((sx * w0, 4 + w0, z), (-sx * w1, 4 + w1, z + 2))
            beam((-w0, 4 + sx * w0, z), (w1, 4 + sx * w1, z + 2)); beam((w0, 4 + sx * w0, z), (-w1, 4 + sx * w1, z + 2))
    for z, w in ((8.5, 4), (10.5, 3)):
        beam((-w, 4, z), (w, 4, z), 0.07)
        for sx in (-1, 1):
            tube('wire', [(sx * w, 4, z), (sx * w, -20, z - 2.5), (sx * w, -60, z)], 0.015, 0.015, met, res=8, bevel_res=1)
    cam, tgt = camera((-3.5, -9, 1.0), (0, 4, 7.0), lens=24)
    key_loc(cam, 1, (-3.9, -9.4, 0.9)); key_loc(cam, F, (-3.0, -8.4, 1.1))
    r = thicket('P', (0, 4, 7.5), 1.6, 31, cam.location, mats=('flesh', 'bark'), up=24, down=34)
    rig = big_eye('P', (-0.5, 4 - 1.0, 7.4), 0.45, (-3.5, -9, 1), 'blood', M('flesh'), cam=cam, f_open=20, glow=3)
    for o in (rig['sock'], rig['pouch']): parent(o, r)
    sky_lights((0, 4, 7), 250, 2200, rimpos=(4, 14, 12), size=6)
    return sc, F

def shot_town():
    """From high above a sleeping town; something with long stick legs steps over the roofs."""
    F = S(DUR['town']); sc = reset(); _mc.clear()
    night(0.4)
    turf_ground(5, count=0, size=120)
    wall = skin('wall', [hexc('2a2622'), hexc('4a4440'), hexc('6a625a')], scale=3, bump=0.3, coat=0)
    roof = skin('roof', [hexc('140c0a'), hexc('3a2018'), hexc('5a3020')], scale=6, bump=0.5, coat=0.1, stretch=(1, 4, 1))
    win = simple_mat('win', (0.1, 0.07, 0.02), emit=(1.0, 0.62, 0.25), emit_str=5)
    rnd = random.Random(9)
    for i in range(70):
        x = rnd.uniform(-18, 18); y = rnd.uniform(-6, 26)
        if abs(x) < 1.0: continue
        house('h%d' % i, x, y, 0, rnd.uniform(1.4, 2.2), rnd.uniform(1.4, 2.4), rnd.uniform(1.2, 2.0), wall, roof,
              window=win if rnd.random() < 0.3 else None, rot=rnd.choice([0, math.pi / 2]) + rnd.uniform(-0.1, 0.1))
    for i in range(10):
        light('POINT', (rnd.uniform(-16, 16), rnd.uniform(-4, 24), 2.5), 40, (1.0, 0.6, 0.25), 0.3)
    cam, tgt = camera((6, -16, 16), (0, 6, 4), lens=30)
    key_loc(cam, 1, (6.5, -16.5, 16.2)); key_loc(cam, F, (5.5, -15, 15.5))
    body = empty('walker', (0, 0, 0))
    r = thicket('W', (0, 4, 8), 2.4, 41, cam.location, mats=('deadwood', 'bruise'), up=26, down=0)
    parent(r, body)
    legs = []
    for k in range(6):
        a = k / 6 * math.tau + 0.3
        foot = (math.cos(a) * 6, 4 + math.sin(a) * 6, 0)
        knee = (math.cos(a) * 4.0, 4 + math.sin(a) * 4.0, 10.5)
        t = tube('leg%d' % k, [(0, 4, 8), knee, foot], 0.22, 0.03, M('deadwood'), res=8, bevel_res=3)
        pe = empty('legp%d' % k, (0, 4, 8)); parent(t, pe); parent(pe, body)
        noise_anim(pe, 'rotation_euler', 0, 0.05, 30); noise_anim(pe, 'rotation_euler', 1, 0.05, 30)
    key_loc(body, 1, (0, -1, 0)); key_loc(body, F, (0, 4, 0)); linear(body)
    rig = big_eye('W', (0.6, 4 - 1.5, 7.4), 0.6, (6, -16, 16), 'ash', M('deadwood'), cam=cam, glow=4)
    for o in (rig['sock'], rig['pouch']): parent(o, r)
    light('SUN', (0, 0, 10), 0.25, (0.5, 0.6, 1.0), target=(4, 10, -6), angle=2)
    light('AREA', (8, 20, 25), 40000, (0.45, 0.55, 1.0), 12, target=(0, 4, 7))
    light('AREA', (10, -6, 20), 12000, (0.8, 0.7, 0.6), 10, target=(0, 4, 7))
    return sc, F

def shot_roots():
    """Close to the ground: a root mass with a single eye, looking around, then at us."""
    F = S(DUR['roots']); sc = reset(); _mc.clear()
    night(0.4)
    turf_ground(6, count=5000)
    cam, tgt = camera((0.8, -3.6, 0.5), (0, 0.4, 0.8), lens=35, dof=3.9, fstop=5)
    key_loc(cam, 1, (1.1, -3.9, 0.45)); key_loc(cam, F, (0.5, -3.2, 0.55))
    r = thicket('R', (0, 0.6, 0.9), 0.9, 51, cam.location, mats=('bark', 'flesh'), up=30, down=26)
    rig = big_eye('R', (0, 0.6 - 0.72, 0.95), 0.3, (0.8, -3.6, 0.6), 'amber', M('bark'), F=F, glow=2)
    for o in (rig['sock'], rig['pouch']): parent(o, r)
    gaze(rig, 1, -35, 8); gaze(rig, 30, -35, 8); gaze(rig, 36, 30, -5); gaze(rig, 70, 30, -5); gaze(rig, 76, -10, 15); gaze(rig, 100, -10, 15)
    c = stare(rig, cam, snap=108)
    blink(rig, 60)
    sky_lights((0, 0.6, 0.9), 120, 600, size=3)
    return sc, F

def shot_field():
    """Far across a field two tall tangles stand still in the dark, eyes gleaming."""
    F = S(DUR['field']); sc = reset(); _mc.clear()
    night(0.7)
    turf_ground(7, count=9000, size=90)
    cam, tgt = camera((0, -10, 1.2), (0, 10, 3.2), lens=38)
    key_loc(cam, 1, (0, -10.5, 1.2)); key_loc(cam, F, (0, -8.8, 1.2))
    for k, (x, y, s, ir) in enumerate([(-3.5, 12, 1.4, 'ash'), (3.0, 15, 1.7, 'amber')]):
        r = thicket('F%d' % k, (x, y, 3.5 + s), s, 60 + k, cam.location, mats=('deadwood', 'moss'), up=26, down=34)
        rig = big_eye('F%d' % k, (x, y - s * 0.75, 3.5 + s * 1.05), s * 0.22, (0, -10, 1.2), ir, M('deadwood'), cam=cam, glow=5)
        for o in (rig['sock'], rig['pouch']): parent(o, r)
        for tt in range(4):
            a = tt / 4 * math.tau + k
            t = tube('fl%d_%d' % (k, tt), walk((x, y, 3.5 + s), (math.cos(a) * 0.15, math.sin(a) * 0.15, -1), 8, (3.5 + s) / 7, 0.12, seed=tt + k), 0.12, 0.05, M('deadwood'), res=6)
    sky_lights((0, 13, 4), 200, 2800, rimpos=(4, 30, 8), size=8)
    return sc, F

def shot_road():
    """A lone streetlight on a country road. Something stands just at the edge of its light."""
    F = S(DUR['road']); sc = reset(); _mc.clear()
    night(0.4)
    turf_ground(8, count=7000)
    asph = skin('asphalt', [hexc('0a0a0a'), hexc('1a1a1a'), hexc('2a2826')], scale=8, cell=3, bump=0.4, coat=0.05, rough=0.8)
    cube('road', (0, 6, 0.05), (4, 60, 0.12), asph)
    met = metal_mat('pole', base=(0.15, 0.15, 0.15))
    cylinder('pole', (2.4, 6, 0), 0.07, 5.5, met, seg=12)
    tube('arm', [(2.4, 6, 5.4), (1.8, 6, 5.7), (1.0, 6, 5.6)], 0.05, 0.04, met, res=6)
    cube('lamp', (1.0, 6, 5.5), (0.5, 0.25, 0.1), simple_mat('lampg', (0.9, 0.7, 0.4), emit=(1.0, 0.7, 0.35), emit_str=20))
    sl = light('SPOT', (1.0, 6, 5.4), 900, (1.0, 0.68, 0.35), 0.2)
    sl.rotation_euler = (0, 0, 0); sl.data.spot_size = math.radians(80); sl.data.spot_blend = 0.6
    aim_neg(sl, (1.0, 6, 0))
    cam, tgt = camera((-0.6, -6, 1.5), (0.6, 7, 1.6), lens=30)
    key_loc(cam, 1, (-0.6, -6.5, 1.5)); key_loc(cam, F, (-0.5, -4.8, 1.5))
    r = thicket('D', (-1.6, 9.8, 1.7), 1.1, 71, cam.location, mats=('flesh', 'deadwood'), up=22, down=30, core_scale=(1, 1, 1.4))
    for k, (dx, dz) in enumerate([(-0.25, 0.1), (0.28, 0.2)]):
        rig = big_eye('D%d' % k, (-1.6 + dx, 9.8 - 0.62, 1.75 + dz), 0.17, (-0.6, -6, 1.5), 'blood', M('flesh'), cam=cam, glow=2)
        for o in (rig['sock'], rig['pouch']): parent(o, r)
    light('SUN', (0, 0, 10), 0.2, (0.5, 0.6, 1.0), target=(4, 10, -6), angle=2)
    light('AREA', (-4, 20, 6), 3000, (0.4, 0.5, 1.0), 8, target=(-1.6, 9.8, 2))
    light('AREA', (-3, 2, 3), 500, (0.8, 0.65, 0.5), 4, target=(-1.6, 9.8, 2))
    return sc, F

def shot_face():
    """Very close: bark peels open around one huge eye that turns and fixes on us."""
    F = S(DUR['face']); sc = reset(); _mc.clear()
    night(0.2)
    cam, tgt = camera((0, -3.4, 0.0), (0, 0, 0.0), lens=45, dof=2.6, fstop=3.5)
    key_loc(cam, 1, (0, -3.8, 0.0)); key_loc(cam, F, (0, -2.7, 0.0))
    r = thicket('Z', (0, 0.6, 0), 1.0, 91, cam.location, mats=('bark', 'deadwood'), up=36, down=30)
    rig = big_eye('Z', (0, -0.3, 0.02), 0.55, (0, -4, 0), 'amber', M('bark'), F=F, glow=1.2, lids=(-26, 22))
    open_lids(rig, 18, dur=30)
    gaze(rig, 1, 40, 10); gaze(rig, 70, 40, 10)
    stare(rig, cam, snap=96)
    light('AREA', (-2.5, -3, -1.0), 120, (1.0, 0.8, 0.65), 2, target=(0, 0, 0))
    light('AREA', (3, 2, 2), 500, (0.45, 0.55, 1.0), 3, target=(0, 0, 0))
    return sc, F

SHOTS = {k: globals()['shot_' + k] for k in DUR}

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    sc, F = SHOTS[name]()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else F // 2
        setup_render(sc, F, res=(640, 360), samples=12, out='%s/y_%s.png' % (outdir, name))
        sc.frame_set(fr)
        sc.view_settings.exposure = 1.4
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        sc.view_settings.exposure = 1.4
        bpy.ops.render.render(animation=True)
