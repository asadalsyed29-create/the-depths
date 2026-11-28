"""v6: bright, crisp, frame-filling original creatures on black, huge glossy eyes, static camera."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from shots2 import bone_mat, cube, key_scale, key_rot
from shots3 import stare, open_lids
import shots5
from shots5 import branches
import shots6
from shots6 import real_house, house_mats, _hm
import bpy, bmesh

S = lambda s: int(s * FPS)
RES = tuple(int(x) for x in os.environ.get('RES', '960x540').split('x'))
SAMP = int(os.environ.get('SAMP', '20'))
DUR = {'worm': 6, 'barnacle': 7, 'valve': 6, 'moth': 6, 'petal': 7, 'twins': 6, 'crab': 6, 'lichen': 6, 'stare': 7, 'jump': 4, 'tongue': 6, 'hanging': 6, 'tv': 6, 'molar': 6}

IRIS = {
    'hazel': [hexc('1a0c04'), hexc('5a3410'), hexc('a86e2a'), hexc('d8b070')],
    'orange': [hexc('2a0a02'), hexc('8a2e06'), hexc('d86a16'), hexc('f8b04a')],
    'violet': [hexc('10061a'), hexc('3a1a5a'), hexc('8a5ab0'), hexc('c8a8e8')],
    'blue': [hexc('040a14'), hexc('14325a'), hexc('3a7ab0'), hexc('a0d0f0')],
    'green': [hexc('061006'), hexc('1e4a1a'), hexc('5a9a3a'), hexc('b8e080')],
    'red': [hexc('140202'), hexc('5a0a06'), hexc('b82a16'), hexc('f08a60')],
}
WHITE = (0.82, 0.76, 0.66)

_m = {}
def SK(key):
    P = {
        'gold': (['3a2206', '8a5a1a', 'c8963a', 'f0d08a'], 3.0),
        'pink': (['4a1420', '9a4a5a', 'd88a96', 'f8c8cc'], 2.6),
        'violet': (['1a0a2a', '4a2a7a', '8a6ab8', 'c8b0e8'], 2.6),
        'rust': (['2a0802', '7a2a0a', 'c4561a', 'f09a50'], 3.0),
        'moss': (['0a1404', '2a4a12', '6a8a2a', 'b8c870'], 3.4),
        'bark': (['1a0c04', '4a2a12', '8a5a2e', 'c89a6a'], 2.4),
        'pale': (['4a3a30', '9a8070', 'd0b8a4', 'f4e4d4'], 2.4),
        'teal': (['041414', '0e3a3a', '3a7a72', '9ad0c0'], 2.8),
    }
    if key not in _m:
        cols, sc = P[key]
        _m[key] = skin('sk_' + key, [hexc(c) for c in cols], scale=sc, cell=2.4, bump=1.6, rough=0.32, coat=0.7, sss=0.12,
                       crease=0.85, fine=1.6, stretch=(1, 1, 0.4) if key in ('bark', 'gold') else (1, 1, 1))
    return _m[key]

def RUST():
    if 'rustm' not in _m:
        _m['rustm'] = metal_mat('rustm', base=(0.3, 0.26, 0.22), rust=(0.45, 0.15, 0.04), scale=9, rough=0.4)
    return _m['rustm']

def blob(name, c, r, m, sq=(1, 1, 1), disp=0.25, size=0.45, sub=2):
    o = sphere(name, tuple(c), r, sq, m=m)
    displace(o, r * disp, size, subdiv=sub)
    return o

def eye2(name, p, r, look, ir, lid_m, cam=None, darts_seed=None, F=144, wide=True, blinks=(), stare_at=None):
    rig = eye(name, tuple(p), r, tuple(look), IRIS[ir], lid_m, open_up=-62 if wide else -40, open_dn=52 if wide else 34,
              pupil=0.13, iris=0.43, veins=1.2, sclera=WHITE)
    if darts_seed is not None:
        darts(rig, F, seed=darts_seed, amp=(32, 16), hold=(10, 30))
    if cam is not None:
        stare(rig, cam, snap=stare_at)
    for b in blinks:
        blink(rig, b)
    return rig

def fronds(o, name, c1, c2, count, length, radius=0.02, clump=0.85, rough=0.25, seed=0, vg=None):
    """Replaced fur with stiff blades (fur read as cute pompoms)."""
    c = Vector(o.location); r = max(o.dimensions) / 2 if o.dimensions.length > 0 else 1
    bpy.context.view_layer.update()
    r = max(o.scale) * (o.data.vertices[0].co.length if len(o.data.vertices) else 1)
    leaf = skin(name, [hexc(c1), hexc(c2), tuple(min(1, x * 1.4) for x in hexc(c2))], scale=6, cell=2, bump=1.2, coat=0.8, rough=0.25, metal=0.35, stretch=(1, 1, 0.15))
    blades(name, c, r, max(60, count // 25), leaf, seed, length=(length * 0.4, length), width=0.22, par=o)
    return leaf
    hm = hair_mat(name, hexc(c1), hexc(c2), rough=0.3)
    hm = hair_mat(name, hexc(c1), hexc(c2), rough=0.3)
    add_mat_slot(o, hm)
    fur(o, hm.name, count=count, length=length, children=12, rough=rough, frizz=0.25, radius=radius, clump=clump,
        rand=0.5, root=1.0, tip=0.0, seed=seed, vgroup=vg)
    return hm

def blades(name, c, r, n, m, seed, length=(0.5, 1.2), width=0.12, bias=None, par=None, droop=0.0):
    """Stiff jagged leaf/feather blades bristling out of a surface (no soft fur)."""
    rnd = random.Random(seed)
    me = bpy.data.meshes.new(name + 'proto')
    bm = bmesh.new()
    # a jagged leaf: zig-zag outline in local XZ plane, tip at +Z
    pts = [(0, 0)]
    K = 7
    for i in range(1, K):
        t = i / K
        w = math.sin(t * math.pi) * (1.0 if i % 2 else 0.55)
        pts.append((w, t))
    pts.append((0, 1.0))
    left = [bm.verts.new((-x, 0, z)) for (x, z) in pts]
    right = [bm.verts.new((x, 0.04 * x, z)) for (x, z) in pts]
    for i in range(len(pts) - 1):
        bm.faces.new([left[i], left[i + 1], right[i + 1], right[i]]) if i < len(pts) - 1 else None
    bm.to_mesh(me); bm.free()
    for k in range(n):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
        if bias is not None:
            d = (d + Vector(bias) * 1.2).normalized()
        L = rnd.uniform(*length)
        o = link_obj(bpy.data.objects.new(name + '%d' % k, me))
        o.data = me
        o.location = tuple(Vector(c) + d * r * 0.85)
        o.rotation_mode = 'QUATERNION'
        q = (d + Vector((0, 0, -droop))).normalized().to_track_quat('Z', 'Y')
        from mathutils import Quaternion
        o.rotation_quaternion = q @ Quaternion((0, 0, 1), rnd.uniform(0, math.tau))
        o.scale = (width * L * rnd.uniform(0.7, 1.3), 1, L)
        assign(o, m) if not o.data.materials else None
        if par: parent(o, par)
    if not me.materials:
        me.materials.append(m)
    sol = None
    return me

def spikes(name, c, r, n, m, seed, lo=0.25, hi=0.8, rmin=0.03, rmax=0.08, half=None, par=None):
    rnd = random.Random(seed)
    for k in range(n):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
        if half is not None and d.dot(Vector(half)) < 0.1:
            d = -d
        sp = cone(name + '%d' % k, tuple(Vector(c) + d * r * 0.9), r * rnd.uniform(rmin, rmax), 0.0, r * rnd.uniform(lo, hi), m, seg=8)
        sp.rotation_mode = 'QUATERNION'; sp.rotation_quaternion = d.to_track_quat('Z', 'Y')
        if par: parent(sp, par)

def sway(o, s=0.04, scale=45):
    o.rotation_mode = 'XYZ'
    noise_anim(o, 'rotation_euler', 0, s, scale); noise_anim(o, 'rotation_euler', 1, s, scale); noise_anim(o, 'rotation_euler', 2, s * 0.6, scale)

def black(strength=1.0, stars=False):
    return world_nebula((0.004, 0.003, 0.008), (0.012, 0.008, 0.02), strength, stars=stars, scale=1.5)

def lights3(target, key=(-4, -5, 4), keyE=1400, rim=(4, 5, 3), rimE=2600, fill=(5, -4, -1), fillE=250, size=3, warm=(1.0, 0.86, 0.72)):
    light('AREA', key, keyE, warm, size, target=target)
    light('AREA', rim, rimE, (0.65, 0.75, 1.0), size * 1.3, target=target)
    light('AREA', fill, fillE, (1.0, 0.7, 0.8), size, target=target)

def still_cam(loc, target, lens=22):
    cam, tgt = camera(loc, target, lens=lens)
    return cam

# ------------------------------------------------------------------ scenes (camera never moves)
def shot_worm():
    """A segmented flesh-and-pipe worm rises behind smoking stacks and turns its single eye on us."""
    F = S(DUR['worm']); sc = reset(); _m.clear()
    black(1.0, stars=True)
    g = ground(80, skin('slag', [hexc('0a0806'), hexc('1e1a16'), hexc('3a322a')], scale=1, bump=0.8, coat=0.05, rough=0.9), 0.6, 3)
    met = metal_mat('stk', base=(0.22, 0.2, 0.18), rust=(0.4, 0.14, 0.04))
    factory(0, -1, 10, 7, met, area=6, hmin=1.5, hmax=5, tanks=3)
    cam = still_cam((0.5, -3.2, 3.4), (0, 5, 7.0), lens=22)
    head = empty('head', (0, 5, 7.5))
    segs = []
    pts = [(0.4 * math.sin(i * 0.7), 5 + 0.15 * i, 0.9 * i) for i in range(9)]
    for i, p in enumerate(pts):
        r = 1.1 - 0.05 * i
        s = blob('seg%d' % i, p, r, SK('pink' if i % 2 else 'pale'), sq=(1, 1, 0.75), disp=0.2)
        segs.append(s)
        if i < 8:
            t = torus('col%d' % i, (p[0], p[1], p[2] + 0.45), r * 0.92, 0.12, RUST())
    for i in range(1, 9):
        parent(segs[i], segs[i - 1])
    for i, s in enumerate(segs):
        s.rotation_mode = 'XYZ'
        noise_anim(s, 'rotation_euler', 0, 0.05, 30, phase=i * 3); noise_anim(s, 'rotation_euler', 1, 0.06, 35, phase=i * 5)
    top = Vector(pts[-1])
    hd = blob('headb', top + Vector((0, 0, 0.9)), 1.3, SK('pale'), disp=0.25)
    parent(hd, segs[-1])
    rig = eye2('W', top + Vector((0, -1.05, 1.0)), 0.85, (0.5, -3.2, 3.4), 'orange', SK('pink'), cam=cam, stare_at=50, darts_seed=3, F=F, blinks=(100,))
    parent(rig['sock'], hd)
    for k in range(6):
        a = k / 6 * math.tau
        p0 = top + Vector((math.cos(a) * 1.0, math.sin(a) * 1.0 + 0.3, 1.5))
        pp = tube('wpipe%d' % k, walk(tuple(p0), (math.cos(a), math.sin(a), 0.6), 6, 0.45, 0.3, seed=k), 0.12, 0.08, RUST(), res=6)
        parent(pp, hd)
    spikes('wsp', top + Vector((0, 0.2, 1.2)), 1.2, 16, bone_mat('wbone'), 4, half=(0, 0.5, 1), par=hd)
    sm = smoke_mat('wsmoke', color=(0.55, 0.58, 0.62), density=2.5)
    for (x, y, h) in [(-3.5, 0.5, 4.5), (3.8, -0.5, 4.2)]:
        plume((x, y, h), 0.3, sm, height=6)
    lights3((0, 5, 6), key=(-6, -4, 9), keyE=5000, rim=(5, 14, 9), rimE=9000, fill=(6, -6, 2), fillE=800, size=5)
    return sc, F

def shot_barnacle():
    """A lump crusted with shells; an eye looks out of every shell, one after another, all at us."""
    F = S(DUR['barnacle']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -3.6, 0.4), (0, 0, 0.35), lens=26)
    core = blob('core', (0, 0.5, 0), 1.6, SK('teal'), sq=(1.3, 1, 1), disp=0.3)
    shell = skin('shell', [hexc('2a2622'), hexc('7a7064'), hexc('c8bca8'), hexc('efe6d4')], scale=4, cell=1.2, bump=1.4, coat=0.4, rough=0.4, stretch=(1, 1, 0.2))
    rnd = random.Random(8)
    irs = list(IRIS)
    n = 0
    for k in range(28):
        th = rnd.uniform(-1.1, 1.1); ph = rnd.uniform(-0.5, 0.9)
        d = Vector((math.sin(th) * math.cos(ph), -math.cos(th) * math.cos(ph), math.sin(ph))).normalized()
        base = Vector((0, 0.5, 0)) + Vector((d.x * 1.6 * 1.3, d.y * 1.6, d.z * 1.6)) * 0.92
        rr = rnd.uniform(0.18, 0.34)
        b = cone('bar%d' % k, tuple(base), rr, rr * 0.55, rr * 0.9, shell, seg=14)
        b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = d.to_track_quat('Z', 'Y')
        displace(b, rr * 0.08, 0.1, subdiv=1)
        if d.y < -0.35 and n < 14:
            tip = base + d * rr * 0.75
            rig = eye2('B%d' % k, tuple(tip), rr * 0.5, tuple(tip + d * 3), rnd.choice(irs), SK('teal'), F=F)
            open_lids(rig, 6 + n * 9 + rnd.randint(0, 4), dur=8)
            stare(rig, cam, snap=10 + n * 9)
            n += 1
    lights3((0, 0.3, 0.3), key=(-3, -3, 3), keyE=900, rim=(3, 3, 3), rimE=1800, fill=(3, -3, -1.5), fillE=200, size=2)
    return sc, F

def shot_valve():
    """A pale fleshy face with two huge eyes; a rusty valve where a nose should be, cables for whiskers."""
    F = S(DUR['valve']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -3.3, 0.1), (0, 0, 0.1), lens=24)
    face = blob('face', (0, 0.8, 0), 1.7, SK('pale'), sq=(1.25, 1, 1.05), disp=0.22)
    sway(face, 0.025, 60)
    for sx in (-1, 1):
        rig = eye2('V%d' % sx, (sx * 0.62, -0.62, 0.45), 0.5, (sx * 0.62, -4, 0.45), 'violet' if sx < 0 else 'hazel', SK('pink'),
                   cam=cam if sx > 0 else None, darts_seed=7 if sx < 0 else None, F=F, blinks=(70 + sx * 6,))
        parent(rig['sock'], face)
    # valve wheel + stem
    st = cylinder('stem', (0, -0.95, -0.25), 0.12, 0.6, RUST(), seg=16); st.rotation_euler = (math.radians(90), 0, 0); st.location = (0, -0.75, -0.25)
    wh = torus('wheel', (0, -1.25, -0.25), 0.4, 0.05, RUST()); wh.rotation_euler = (math.radians(90), 0, 0)
    for k in range(4):
        sp = cylinder('spoke%d' % k, (0, -1.25, -0.25), 0.03, 0.8, RUST(), seg=8)
        sp.location = (0, -1.25, -0.25); sp.rotation_mode = 'XYZ'; sp.rotation_euler = (0, math.radians(45 * k), 0)
        parent(sp, wh)
    key_rot(wh, 1, (90, 0, 0)); key_rot(wh, F, (90, 200, 0)); linear(wh)
    for o in (st, wh): parent(o, face)
    # cable whiskers
    cab = simple_mat('cable', (0.02, 0.02, 0.02), rough=0.3, coat=0.5)
    for k in range(10):
        sx = -1 if k < 5 else 1
        p0 = (sx * 0.35, -0.95, -0.45 - 0.05 * (k % 5))
        pts = walk(p0, (sx, -0.3, -0.4), 7, 0.28, 0.25, gravity=0.25, seed=k)
        t = tube('cab%d' % k, pts, 0.03, 0.02, cab if k % 2 else RUST(), res=5)
        pe = empty('cabp%d' % k, p0); parent(t, pe); parent(pe, face); sway(pe, 0.08, 30)
    # mouth slit with teeth below
    tm = bone_mat('vt')
    for k in range(16):
        x = -0.55 + 1.1 * k / 15
        th = cone('vth%d' % k, (x, -0.98 + 0.12 * (x * x), -0.95), 0.035, 0.0, 0.14, tm, seg=6)
        th.rotation_euler = (math.radians(180), 0, 0); parent(th, face)
    blades('vbl', (0, 1.2, 0), 1.9, 70, skin('vleaf', [hexc('1a1208'), hexc('6a5030'), hexc('b89a60')], scale=6, bump=1.2, coat=0.8, metal=0.3, stretch=(1, 1, 0.15)), 3, length=(0.8, 1.6), width=0.25, bias=(0, 0.6, 0), par=face)
    lights3((0, 0, 0.1), key=(-3, -3, 2.5), keyE=900, rim=(3, 3, 2.5), rimE=1800, fill=(2.5, -3, -1.5), fillE=220, size=2)
    return sc, F

def shot_moth():
    """A feathery moth-thing hangs over a sleeping street, two bulging eyes looking down at us."""
    F = S(DUR['moth']); sc = reset(); _m.clear(); _hm.clear()
    black(1.0, stars=True)
    H = house_mats()
    ground(200, H['lawn'], 0.2, 6)
    cube('rd', (0, 10, 0.04), (7, 120, 0.08), H['asphalt'])
    for k, (x, y, r) in enumerate([(-11, 4, math.pi / 2), (-11, 18, math.pi / 2), (11, 6, -math.pi / 2), (11, 20, -math.pi / 2), (-11, 32, math.pi / 2), (11, 34, -math.pi / 2)]):
        real_house('mh%d' % k, x, y, r, 500 + k, lit_p=0.4)
    cam = still_cam((0, -6, 2.0), (0, 10, 9.0), lens=22)
    body = blob('mbody', (0, 10, 10), 2.2, SK('rust'), sq=(1, 0.8, 1.4), disp=0.15)
    fronds(body, 'mfur', '3a1404', 'e08a3a', 4000, 1.4, radius=0.015, clump=0.6, seed=1)
    for sx in (-1, 1):
        wing = blob('wing%d' % sx, (sx * 6.5, 11, 10.5), 5.0, SK('gold'), sq=(1, 0.08, 0.7), disp=0.2, size=0.6)
        pass
        piv = empty('wp%d' % sx, (sx * 1.5, 10.5, 10.3)); parent(wing, piv); parent(piv, body)
        for f in range(1, F + 1, 12):
            key_rot(piv, f, (0, sx * 12 * math.sin(f * 0.13), sx * 8 * math.sin(f * 0.13)))
        ant = tube('ant%d' % sx, walk((sx * 0.6, 8.4, 12.6), (sx * 0.5, -0.4, 1), 7, 0.6, 0.15, seed=sx), 0.06, 0.02, SK('bark'))
        parent(ant, body)
    for sx in (-1, 1):
        rig = eye2('M%d' % sx, (sx * 0.95, 8.25, 10.6), 0.75, (sx * 0.95, -14, 2), 'red', SK('rust'), cam=cam, F=F, blinks=(60 + 20 * sx,))
        parent(rig['sock'], body)
    for f in range(1, F + 1, 24):
        key_loc(body, f, (0.3 * math.sin(f * 0.05), 10, 10 + 0.35 * math.sin(f * 0.07)))
    lights3((0, 10, 9), key=(-8, -6, 14), keyE=12000, rim=(8, 24, 14), rimE=20000, fill=(8, -6, 3), fillE=2000, size=7)
    return sc, F

def shot_petal():
    """A flower of fleshy petals slowly opens around a toothed mouth; an eye on a stalk rises out."""
    F = S(DUR['petal']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -3.9, 1.8), (0, 0, 1.1), lens=22)
    core = blob('pcore', (0, 0, 0), 0.7, SK('pink'), disp=0.2)
    hole = sphere('phole', (0, -0.05, 0.45), 0.42, (1, 1, 0.5), m=simple_mat('pvoid', (0.01, 0, 0), rough=1))
    tm = bone_mat('pt')
    for k in range(20):
        a = k / 20 * math.tau
        th = cone('pth%d' % k, (math.cos(a) * 0.4, -0.05 + math.sin(a) * 0.4, 0.62), 0.035, 0.0, 0.18, tm, seg=6)
        th.rotation_mode = 'QUATERNION'; th.rotation_quaternion = Vector((-math.cos(a), -math.sin(a), 0.5)).normalized().to_track_quat('Z', 'Y')
    for k in range(12):
        a = k / 12 * math.tau
        piv = empty('pp%d' % k, (math.cos(a) * 0.55, math.sin(a) * 0.55, 0.4))
        pet = blob('pet%d' % k, (math.cos(a) * 1.35, math.sin(a) * 1.35, 0.55), 0.95, SK('violet' if k % 2 else 'pink'), sq=(1, 0.42, 0.12), disp=0.3, size=0.3)
        pet.rotation_euler = (0, 0, a)
        parent(pet, piv)
        piv.rotation_mode = 'XYZ'
        ax = (math.sin(a), -math.cos(a))
        for f, ang in [(1, 75), (int(F * 0.6), 8), (F, 4)]:
            piv.rotation_euler = (math.radians(ang) * ax[0], math.radians(ang) * ax[1], 0)
            piv.keyframe_insert('rotation_euler', frame=f)
    stalk = empty('stk', (0.15, 0.2, 0.4))
    t = tube('stalk', [(0.15, 0.2, 0.4), (0.2, 0.15, 1.0), (0.05, 0.0, 1.6), (0, -0.1, 2.0)], 0.1, 0.07, SK('pink'))
    rig = eye2('P', (0, -0.15, 2.2), 0.32, (0, -3.6, 1.6), 'green', SK('pink'), cam=cam, F=F, stare_at=110, darts_seed=12, blinks=(140,))
    parent(t, stalk); parent(rig['sock'], stalk)
    key_scale(stalk, 1, (0.01, 0.01, 0.01)); key_scale(stalk, 60, (0.01, 0.01, 0.01)); key_scale(stalk, 100, (1, 1, 1))
    sway(stalk, 0.05, 30)
    lights3((0, 0, 0.8), key=(-3, -3, 4), keyE=900, rim=(3, 4, 3), rimE=2000, fill=(3, -3, 0), fillE=200, size=2)
    return sc, F

def shot_twins():
    """Two heads on long stalks stand in black swamp water, staring at each other, then at us."""
    F = S(DUR['twins']); sc = reset(); _m.clear()
    black(1.0, stars=True)
    cube('water', (0, 0, 0), (200, 200, 0.02), simple_mat('tw', (0.005, 0.006, 0.006), rough=0.03))
    reed = skin('reedt', [hexc('0e140a'), hexc('3a4a1e'), hexc('7a8a3a')], scale=6, bump=0.3, coat=0.2, stretch=(1, 1, 0.1))
    rnd = random.Random(3)
    for i in range(60):
        x, y = rnd.uniform(-9, 9), rnd.uniform(2, 14)
        tube('rd%d' % i, walk((x, y, -0.2), (rnd.uniform(-0.2, 0.2), 0, 1), 5, rnd.uniform(0.3, 0.7), 0.08, seed=rnd.random()), 0.04, 0.008, reed, res=3, bevel_res=2)
    cam = still_cam((0, -4.2, 3.0), (0, 4, 4.2), lens=22)
    for k, (sx, ir, mm) in enumerate([(-1, 'blue', 'moss'), (1, 'orange', 'gold')]):
        x = sx * 2.0
        stalk = tube('ts%d' % k, [(x, 4, -0.3), (x * 1.1, 4, 1.5), (x * 0.9, 4, 3.0), (x * 0.8, 4, 4.0)], 0.22, 0.14, SK('bark'))
        hd = blob('th%d' % k, (x * 0.8, 4, 4.6), 0.95, SK(mm), disp=0.3)
        spikes('tsp%d' % k, (x * 0.8, 4, 4.6), 0.95, 18, bone_mat('tb%d' % k), 10 + k, half=(0, 1, 0.6), par=hd)
        fronds(hd, 'thf%d' % k, '0a1406' if k == 0 else '2a1a04', '8aa040' if k == 0 else 'e0b050', 1500, 0.9, radius=0.02, seed=k)
        piv = empty('tp%d' % k, (x, 4, -0.3)); parent(stalk, piv); parent(hd, piv); sway(piv, 0.03, 50)
        rig = eye2('T%d' % k, (x * 0.8 - sx * 0.2, 3.3, 4.65), 0.7, (-x, 3.0, 4.6), ir, SK(mm), F=F, blinks=(40 + 30 * k,))
        stare(rig, cam, snap=95 + 4 * k)
        parent(rig['sock'], hd)
    lights3((0, 4, 4), key=(-5, -4, 7), keyE=3000, rim=(4, 12, 7), rimE=6000, fill=(5, -4, 2), fillE=600, size=4)
    return sc, F

def shot_crab():
    """A bark-plated crab-thing with eyes on stalks scuttles out of the dark along a kerb toward us."""
    F = S(DUR['crab']); sc = reset(); _m.clear(); _hm.clear()
    black()
    H = house_mats()
    cube('road', (1.5, 5, 0.0), (6, 40, 0.1), H['asphalt'])
    cube('kerb', (-1.7, 5, 0.08), (0.35, 40, 0.3), H['concrete'])
    cube('walkw', (-3.5, 5, 0.12), (3.4, 40, 0.24), H['concrete'])
    cam = still_cam((0.4, -4.2, 0.7), (0, 3, 0.6), lens=22)
    body = empty('crab', (0, 0, 0))
    shell = blob('cshell', (0, 0, 0.75), 1.0, SK('bark'), sq=(1.4, 1.0, 0.55), disp=0.3)
    parent(shell, body)
    spikes('csp', (0, 0, 0.75), 1.0, 30, bone_mat('cb', dark=True), 21, lo=0.2, hi=0.6, half=(0, 0.3, 1), par=body)
    for k in range(8):
        sx = -1 if k < 4 else 1; i = k % 4
        y0 = -0.45 + i * 0.3
        hip = (sx * 1.1, y0, 0.7)
        knee = (sx * 1.9, y0 - 0.1, 1.3)
        foot = (sx * 2.4, y0 - 0.2, 0.05)
        t = tube('cl%d' % k, [hip, knee, foot], 0.09, 0.02, SK('rust'), res=6)
        pe = empty('clp%d' % k, hip); parent(t, pe); parent(pe, body)
        for f in range(1, F + 1, 4):
            ph = f * 0.9 + k * 1.7
            key_rot(pe, f, (8 * math.sin(ph), 0, 10 * math.cos(ph)))
    for sx in (-1, 1):
        base = (sx * 0.35, -0.75, 1.0)
        st = tube('cst%d' % sx, [base, (sx * 0.45, -0.95, 1.5), (sx * 0.4, -1.0, 1.9)], 0.06, 0.05, SK('rust'))
        rig = eye2('C%d' % sx, (sx * 0.4, -1.05, 2.05), 0.22, (sx * 0.4, -5, 1.5), 'red' if sx < 0 else 'hazel', SK('rust'), cam=cam, F=F, blinks=(80 + sx * 10,))
        pe = empty('csp%d' % sx, base); parent(st, pe); parent(rig['sock'], pe); parent(pe, body); sway(pe, 0.08, 20)
    key_loc(body, 1, (0.4, 9, 0)); key_loc(body, F, (0.2, 1.4, 0)); linear(body)
    sl = light('SPOT', (0.5, 2, 5), 1600, (1.0, 0.7, 0.4), 0.3); sl.data.spot_size = math.radians(100); aim_neg(sl, (0.3, 3, 0))
    lights3((0, 3, 0.6), key=(-3, -2, 3), keyE=500, rim=(3, 9, 3), rimE=2500, fill=(3, -3, 1), fillE=150, size=3)
    return sc, F

def shot_lichen():
    """Low under a crusted green-gold giant with a bone beak and one eye, chimneys behind."""
    F = S(DUR['lichen']); sc = reset(); _m.clear()
    black(1.0, stars=True)
    ground(80, skin('slag2', [hexc('0a0a06'), hexc('1e1e12'), hexc('3a3a22')], scale=1, bump=0.8, coat=0.05, rough=0.9), 0.6, 3)
    met = metal_mat('stk2', base=(0.2, 0.18, 0.16), rust=(0.4, 0.14, 0.04))
    factory(0, 10, 8, 9, met, area=8, hmin=3, hmax=9, tanks=2)
    cam = still_cam((1.0, -6, 0.6), (0, 2, 4.2), lens=20)
    body = blob('lb', (0, 2.5, 4.5), 2.6, SK('moss'), sq=(1, 1, 1.15), disp=0.3)
    fronds(body, 'lf', '0a1404', 'b8c060', 5000, 1.6, radius=0.03, clump=0.9, rough=0.4, seed=5)
    beak = cone('beak', (0.2, 0.2, 3.6), 0.55, 0.0, 2.6, bone_mat('lbk'), seg=20)
    beak.rotation_mode = 'QUATERNION'; beak.rotation_quaternion = Vector((0.05, -1, -0.55)).normalized().to_track_quat('Z', 'Y')
    displace(beak, 0.06, 0.2, subdiv=1)
    parent(beak, body)
    rig = eye2('Li', (-0.75, 0.3, 5.0), 0.85, (1, -6, 0.6), 'hazel', SK('gold'), F=F, darts_seed=21, blinks=(50,))
    stare(rig, cam, snap=110)
    parent(rig['sock'], body)
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        tube('lleg%d' % k, walk((math.cos(a) * 1.5, 2.5 + math.sin(a) * 1.5, 3.0), (math.cos(a) * 0.3, math.sin(a) * 0.3, -1), 6, 0.7, 0.12, seed=k), 0.35, 0.12, SK('bark'), res=6)
    sway(body, 0.025, 60)
    lights3((0, 2, 4), key=(-5, -4, 3), keyE=4000, rim=(4, 10, 8), rimE=8000, fill=(4, -4, 0), fillE=600, size=5)
    return sc, F

def shot_stare():
    """Extreme close-up: violet folds of skin part around one huge eye whose pupil swells as it finds us."""
    F = S(DUR['stare']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -2.6, 0), (0, 0, 0), lens=28)
    folds = []
    rnd = random.Random(4)
    for k in range(14):
        a = k / 14 * math.tau
        f_ = blob('fold%d' % k, (math.cos(a) * 1.25, 0.15, math.sin(a) * 0.95), 0.55, SK('violet' if k % 3 else 'pink'), sq=(1.4, 0.7, 0.55), disp=0.35, size=0.3)
        f_.rotation_euler = (0, -a, 0)
        piv = empty('fp%d' % k, (0, 0.2, 0)); parent(f_, piv)
        for fr, s in [(1, 0.55), (30, 0.6), (70, 1.0), (F, 1.04)]:
            key_scale(piv, fr, (s, 1, s))
    back = blob('fback', (0, 1.4, 0), 2.2, SK('violet'), disp=0.25)
    rig = eye(name='S', loc=(0, -0.1, 0), r=0.9, look_at=(0, -4, 0), iris_cols=IRIS['violet'], lid_m=SK('pink'),
              open_up=-64, open_dn=54, pupil=0.06, iris=0.46, veins=1.4, sclera=WHITE)
    open_lids(rig, 30, dur=25)
    gaze(rig, 1, -35, 10); gaze(rig, 80, -35, 10); gaze(rig, 86, 20, -8); gaze(rig, 112, 20, -8)
    stare(rig, cam, snap=118)
    # pupil swells: scale the ball's z a touch and push iris by swapping pupil size via a second eye material is costly; pulse the whole eye instead
    for fr, s in [(1, 1.0), (118, 1.0), (124, 1.08), (F, 1.08)]:
        key_scale(rig['sock'], fr, (0.9 * s, 0.9 * s, 0.9 * s))
    lights3((0, 0, 0), key=(-2.5, -2.5, 2), keyE=600, rim=(2.5, 2.5, 2), rimE=1400, fill=(2, -2.5, -1.5), fillE=160, size=1.6)
    return sc, F

def shot_jump():
    """Darkness, one far eye blinks. Then a pale many-eyed mouth-thing lunges out and fills the frame."""
    F = S(DUR['jump']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -3.0, 0.0), (0, 0, 0.0), lens=24)
    root = empty('J', (0, 0, 0))
    head = blob('jhead', (0, 0, 0), 1.6, SK('pale'), sq=(1.05, 0.9, 1.3), disp=0.3, size=0.35)
    parent(head, root)
    # gaping mouth: black throat ringed by two rows of long uneven teeth, raw pink lips
    mo = empty('jmo', (0, -1.55, -0.55)); parent(mo, root)
    throat = sphere('jthroat', (0, -1.45, -0.55), 0.75, (1.0, 0.5, 0.8), m=simple_mat('jvoid', (0.0, 0.0, 0.0), rough=1)); parent(throat, mo)
    lip = torus('jlip', (0, -1.6, -0.55), 0.78, 0.13, SK('pink')); lip.rotation_euler = (math.radians(90), 0, 0); lip.scale = (1, 1.25, 1); parent(lip, mo)
    tm = bone_mat('jt')
    rnd = random.Random(66)
    for ring, (R, L0) in enumerate([(0.74, 0.32), (0.55, 0.22)]):
        for k in range(26 - ring * 6):
            a = k / (26 - ring * 6) * math.tau + ring * 0.1
            x, z = math.cos(a) * R, math.sin(a) * R * 1.25 - 0.55
            th = cone('jth%d_%d' % (ring, k), (x, -1.6 + ring * 0.1, z), 0.05, 0.004, L0 * rnd.uniform(0.6, 1.4), tm, seg=6)
            d = Vector((-x, 0.25, -(z + 0.55))).normalized()
            th.rotation_mode = 'QUATERNION'; th.rotation_quaternion = d.to_track_quat('Z', 'Y')
            parent(th, mo)
    for f, s_ in [(1, 0.55), (60, 0.55), (64, 1.25), (70, 1.12), (F, 1.18)]:
        key_scale(mo, f, (1, 1, s_))
    # many mismatched eyes, closed until the lunge, then all wide open at once
    spots = [(-0.95, 0.75, 0.42, 'red'), (0.9, 0.85, 0.36, 'violet'), (-0.1, 1.15, 0.24, 'green'), (0.35, 0.45, 0.18, 'blue'),
             (-1.35, 0.1, 0.2, 'hazel'), (1.35, 0.15, 0.26, 'orange'), (-0.55, 1.45, 0.14, 'hazel'), (0.7, 1.45, 0.16, 'red'),
             (-0.45, 0.35, 0.12, 'blue'), (1.0, -0.45, 0.13, 'green')]
    rigs = []
    for k, (x, z, r, ir) in enumerate(spots):
        y = -math.sqrt(max(0.05, 1.0 - (x / 1.68) ** 2 - (z / 2.08) ** 2)) * 1.44 - 0.05
        rig = eye2('JE%d' % k, (x, y, z), r, (x * 0.3, -4, z * 0.3), ir, SK('pink'), F=F)
        lid_key(rig, 1, 1); lid_key(rig, 60 + (k % 3), 1); lid_key(rig, 63 + (k % 3), 0)
        stare(rig, cam)
        parent(rig['sock'], root)
        rigs.append(rig)
    # one small eye open in the dark beforehand, blinking once
    lid_key(rigs[3], 14, 1); lid_key(rigs[3], 18, 0); blink(rigs[3], 40)
    blades('jbl', (0, 0.4, 0.2), 1.75, 90, skin('jleaf', [hexc('0a0606'), hexc('3a1a14'), hexc('7a4a3a')], scale=6, bump=1.2, coat=0.6, metal=0.3, stretch=(1, 1, 0.15)), 9, length=(0.9, 2.0), width=0.2, bias=(0, 0.7, 0), par=root)
    spikes('jsp', (0, 0.3, 0.6), 1.6, 26, bone_mat('jb', dark=True), 13, lo=0.4, hi=1.2, half=(0, 0.6, 1), par=root)
    # far away and still, then a 4-frame lunge right into the lens with a twitch after
    for f, loc in [(1, (0, 16, 0.3)), (58, (0, 15.5, 0.3)), (62, (0, 2.2, 0.0)), (64, (0, 0.7, 0.05)), (68, (0, 1.2, 0.0)), (96, (0, 1.05, 0.0))]:
        key_loc(root, f, loc)
    root.rotation_mode = 'XYZ'
    for f in range(64, F + 1, 2):
        key_rot(root, f, (rnd.uniform(-3, 3), rnd.uniform(-3, 3), rnd.uniform(-4, 4)))
    # light from below and a cold rim; harsh
    light('AREA', (0, -2.2, -2.2), 900, (1.0, 0.8, 0.65), 1.5, target=(0, 0, 0))
    light('AREA', (2.5, 3, 2.5), 1800, (0.6, 0.7, 1.0), 2.5, target=(0, 0, 0))
    light('AREA', (-2.5, -1.5, 2.0), 300, (1.0, 0.6, 0.6), 1.5, target=(0, 0, 0))
    return sc, F

def shot_tongue():
    """A stack of lipped mouths; a long tongue with an eye at its tip slides out and searches."""
    F = S(DUR['tongue']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -4.2, 1.6), (0, 0, 1.7), lens=24)
    col = blob('tcol', (0, 0.6, 1.2), 1.2, SK('rust'), sq=(1, 0.9, 2.0), disp=0.25)
    tm = bone_mat('tt')
    for k, z in enumerate([0.2, 1.3, 2.4]):
        lip = torus('tl%d' % k, (0, -0.35, z), 0.38, 0.1, SK('pink')); lip.rotation_euler = (math.radians(90), 0, 0); lip.scale = (1.3, 0.7, 1)
        hole = sphere('th%d' % k, (0, -0.3, z), 0.33, (1.25, 0.4, 0.6), m=simple_mat('tv%d' % k, (0, 0, 0), rough=1))
        for i in range(12):
            a = i / 12 * math.tau
            th = cone('ttt%d_%d' % (k, i), (math.cos(a) * 0.4, -0.4, z + math.sin(a) * 0.22), 0.03, 0.0, 0.1, tm, seg=6)
            th.rotation_mode = 'QUATERNION'; th.rotation_quaternion = Vector((-math.cos(a), 0, -math.sin(a))).normalized().to_track_quat('Z', 'Y')
    spikes('tsp', (0, 0.9, 1.4), 1.3, 22, bone_mat('tsb', dark=True), 5, half=(0, 1, 0.3))
    # tongue from the middle mouth: chain of segments that extends and curls toward us
    base = empty('tbase', (0, -0.4, 1.3))
    segs = []
    prev = base
    for i in range(9):
        e = empty('tg%d' % i, (0, -0.4 - 0.22 * (i + 1), 1.3))
        sg = sphere('tgs%d' % i, (0, -0.4 - 0.22 * (i + 1), 1.3), 0.16 - 0.008 * i, (1.2, 1.4, 0.7), m=SK('pink'))
        parent(sg, e); parent(e, prev); prev = e; segs.append(e)
        e.rotation_mode = 'XYZ'
        noise_anim(e, 'rotation_euler', 0, 0.12, 20, phase=i * 7); noise_anim(e, 'rotation_euler', 2, 0.18, 24, phase=i * 3)
    tip = segs[-1]
    rig = eye2('TG', (0, -0.4 - 0.22 * 9 - 0.2, 1.3), 0.2, (0, -5, 1.3), 'green', SK('pink'), F=F, darts_seed=31, blinks=(90,))
    stare(rig, cam, snap=118)
    parent(rig['sock'], tip)
    key_scale(base, 1, (0.05, 0.05, 0.05)); key_scale(base, 24, (0.05, 0.05, 0.05)); key_scale(base, 60, (1, 1, 1))
    lights3((0, 0, 1.4), key=(-3, -4, 3), keyE=1100, rim=(3, 3, 4), rimE=2200, fill=(3, -3, -0.5), fillE=220, size=2)
    return sc, F

def shot_hanging():
    """Something hangs upside down out of the dark, eyes dangling below it on cords, slowly turning."""
    F = S(DUR['hanging']); sc = reset(); _m.clear()
    black()
    cam = still_cam((0, -5.0, 0.6), (0, 0, 1.6), lens=24)
    body = blob('hb', (0, 0, 3.4), 1.3, SK('bark'), sq=(1, 1, 1.4), disp=0.3)
    for k in range(10):
        a = k / 10 * math.tau
        tube('hr%d' % k, walk((math.cos(a) * 0.6, math.sin(a) * 0.6, 4.4), (math.cos(a) * 0.2, math.sin(a) * 0.2, 1), 6, 0.6, 0.2, seed=k), 0.12, 0.05, SK('bark'))
    piv = empty('hpiv', (0, 0, 5)); parent(body, piv)
    rnd = random.Random(2)
    cab = simple_mat('hcab', (0.03, 0.02, 0.02), rough=0.3, coat=0.4)
    for k in range(8):
        a = k / 8 * math.tau + 0.3
        x, y = math.cos(a) * 0.9, math.sin(a) * 0.7
        L = rnd.uniform(1.2, 2.6)
        top = (x, y, 2.6)
        e = empty('hc%d' % k, top)
        t = tube('hcord%d' % k, [top, (x, y, 2.6 - L / 2), (x, y, 2.6 - L)], 0.025, 0.02, cab)
        rig = eye2('H%d' % k, (x, y, 2.6 - L - 0.2), rnd.uniform(0.16, 0.3), (x, -5, 2.6 - L), rnd.choice(list(IRIS)), SK('bark'), F=F)
        stare(rig, cam, snap=40 + k * 9)
        parent(t, e); parent(rig['sock'], e); parent(e, body)
        e.rotation_mode = 'XYZ'
        noise_anim(e, 'rotation_euler', 0, 0.06, 40); noise_anim(e, 'rotation_euler', 1, 0.06, 40)
    spikes('hsp', (0, 0, 3.4), 1.3, 24, bone_mat('hsb', dark=True), 7, half=(0, -0.5, -1), par=body)
    piv.rotation_mode = 'XYZ'
    key_rot(piv, 1, (0, 0, -25)); key_rot(piv, F, (0, 0, 25))
    lights3((0, 0, 1.8), key=(-3, -4, 0), keyE=1500, rim=(3, 4, 4), rimE=2800, fill=(2, -3, -2), fillE=300, size=2.5)
    return sc, F

def shot_tv():
    """An old TV in a dark room. The screen bulges like skin and an eye pushes through it."""
    F = S(DUR['tv']); sc = reset(); _m.clear(); _hm.clear()
    black()
    H = house_mats()
    floor = cube('floor', (0, 2, -0.05), (12, 12, 0.1), skin('boards', [hexc('1a0e06'), hexc('3a2412'), hexc('5a3a1e')], scale=2, cell=8, bump=0.6, coat=0.3, stretch=(1, 8, 1)))
    wp = shots6.tex_mat('wallp', 'siding', hexc('3a4a3a'), hexc('344234'), scale=3, row=0.08, bump=0.2)
    cube('wall', (0, 3.5, 2), (12, 0.1, 4.2), wp)
    stand = cube('stand', (0, 1.6, 0.35), (1.8, 0.8, 0.7), H['door'])
    case = cube('case', (0, 1.6, 1.25), (1.3, 1.0, 1.05), simple_mat('tvcase', (0.06, 0.05, 0.045), rough=0.35, coat=0.3))
    bez = cube('bez', (0, 1.08, 1.27), (1.15, 0.04, 0.9), simple_mat('bez', (0.02, 0.02, 0.02), rough=0.4))
    for i, x in enumerate((0.45, 0.45)):
        cylinder('knob%d' % i, (0.5, 1.06, 1.0 + 0.18 * i), 0.04, 0.03, RUST(), seg=10)
    # screen membrane: glowing grey static skin that bulges toward us
    scr = sphere('scr', (-0.07, 1.05, 1.3), 0.42, (1.0, 0.12, 0.78), m=skin('scrm', [hexc('5a6a6a'), hexc('8a9a98'), hexc('c4d0cc')], scale=8, cell=1.5, bump=0.6, coat=0.9, sss=0.4))
    for f, sy in [(1, 0.12), (40, 0.14), (70, 0.6), (90, 0.75), (F, 0.8)]:
        key_scale(scr, f, (1.0, sy, 0.78))
    glow = light('AREA', (-0.07, 0.6, 1.3), 40, (0.7, 0.85, 1.0), 0.8, target=(-0.07, -3, 1.0))
    rig = eye2('TV', (-0.07, 1.0, 1.3), 0.3, (0, -4, 1.2), 'blue', SK('pale'), F=F, blinks=(120,))
    lid_key(rig, 1, 1); lid_key(rig, 84, 1); lid_key(rig, 92, 0)
    stare(rig, cam=None) if False else None
    for f, y in [(1, 1.25), (60, 1.25), (90, 0.72), (F, 0.68)]:
        key_loc(rig['sock'], f, (-0.07, y, 1.3))
    cam = still_cam((0.6, -2.4, 1.1), (0, 1.5, 1.2), lens=26)
    stare(rig, cam, snap=96)
    cube('lamp', (-2.5, 2.8, 0.8), (0.3, 0.3, 1.6), H['concrete'])
    light('POINT', (-2.5, 2.4, 1.8), 30, (1.0, 0.6, 0.3), 0.2)
    lights3((0, 1.5, 1.2), key=(-2, -2, 2.5), keyE=250, rim=(2.5, 3, 3), rimE=500, fill=(2, -2, 0.5), fillE=80, size=1.5)
    return sc, F

def shot_molar():
    """A boulder made of huge yellowed teeth sits on a road; eyes roll around in the gaps between them."""
    F = S(DUR['molar']); sc = reset(); _m.clear(); _hm.clear()
    black(1.0, stars=True)
    H = house_mats()
    cube('road', (0, 4, 0.0), (8, 40, 0.1), H['asphalt'])
    for k in range(-2, 6):
        cube('dash%d' % k, (0, k * 4, 0.06), (0.15, 1.6, 0.02), simple_mat('paint', (0.6, 0.55, 0.3), rough=0.6))
    cam = still_cam((0.6, -3.6, 0.9), (0, 2.5, 1.3), lens=24)
    tooth = skin('molarm', [hexc('5a4a2a'), hexc('a89060'), hexc('d8c8a0'), hexc('f0e8d0')], scale=3, cell=1.2, bump=0.8, coat=0.6, rough=0.3, crease=0.6)
    gum = SK('pink')
    core = blob('mcore', (0, 3, 1.4), 1.3, gum, disp=0.2)
    rnd = random.Random(5)
    for k in range(34):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 1))).normalized()
        t = blob('mt%d' % k, tuple(Vector((0, 3, 1.4)) + d * 1.25), rnd.uniform(0.32, 0.5), tooth, sq=(1, 1, 1.4), disp=0.15, size=0.3, sub=1)
        t.rotation_mode = 'QUATERNION'; t.rotation_quaternion = d.to_track_quat('Z', 'Y')
    for k in range(6):
        d = Vector((rnd.uniform(-0.8, 0.8), -1, rnd.uniform(-0.3, 0.8))).normalized()
        p = Vector((0, 3, 1.4)) + d * 1.25
        rig = eye2('ME%d' % k, tuple(p), rnd.uniform(0.14, 0.24), tuple(p + d * 3), rnd.choice(list(IRIS)), gum, F=F, darts_seed=60 + k)
        if k < 3: stare(rig, cam, snap=70 + 15 * k)
    lights3((0, 3, 1.3), key=(-3, -2, 4), keyE=1500, rim=(3, 7, 4), rimE=3000, fill=(3, -2, 0.5), fillE=300, size=3)
    return sc, F

SHOTS = {k: globals()['shot_' + k] for k in DUR}

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    sc, F = SHOTS[name]()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else int(F * 0.75)
        setup_render(sc, F, res=(640, 360), samples=12, out='%s/s7_%s.png' % (outdir, name))
        sc.frame_set(fr)
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        bpy.ops.render.render(animation=True)
