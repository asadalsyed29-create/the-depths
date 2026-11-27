import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from shots2 import bone_mat, cube, key_scale, key_rot
from shots3 import IRIS_PALE, IRIS_YEL, IRIS_GREY, SCLERA, stare, open_lids
import bpy, bmesh

S = lambda s: int(s * FPS)
RES = tuple(int(x) for x in os.environ.get('RES', '960x540').split('x'))
SAMP = int(os.environ.get('SAMP', '16'))
DUR = {'meadow': 6, 'pair': 6, 'stump': 6, 'swamp': 6, 'totem': 6, 'crawler': 6, 'brood': 6, 'giant': 6, 'face': 7}

PAL = {
    'bark': ['3a1e0c', '7a4a22', 'b07a44', 'dcb27a'],
    'flesh': ['4a1e1a', '9a4a40', 'd08a78', 'f0c0a8'],
    'moss': ['0e1a0c', '2e4a22', '5a7a3a', '9aa86a'],
    'bruise': ['1e1028', '4a2a5a', '8a5a8a', 'c49ab8'],
    'rust': ['2a0c04', '7a2a0a', 'c45a1a', 'f09a48'],
    'slate': ['14181e', '34404e', '6a7a8e', 'a8b4c4'],
    'pink': ['3a1420', '8a3a52', 'd07a94', 'f4b8c8'],
}
IRISES = [IRIS_PALE, IRIS_YEL, IRIS_GREY,
          [hexc('2a0c02'), hexc('8e3c0d'), hexc('d26f1f'), hexc('f3a446')],
          [hexc('0c1a10'), hexc('2a5a30'), hexc('6aa060'), hexc('c4e0a0')],
          [hexc('1a0410'), hexc('6a1030'), hexc('c44a6a'), hexc('f0a0b0')]]

_mats = {}
def pmat(key, variant=0):
    k = (key, variant)
    if k not in _mats:
        cols = [hexc(c) for c in PAL[key]]
        _mats[k] = skin('%s%d' % k, cols, scale=[2.4, 3.6, 1.6][variant % 3], cell=[2.2, 1.6, 3.0][variant % 3], bump=0.9,
                        coat=[0.6, 0.85, 0.3][variant % 3], rough=0.32, sss=0.15, crease=0.6,
                        stretch=[(1, 1, 1), (1, 1, 0.3), (2, 1, 1)][variant % 3])
    return _mats[k]

def crystal(name, c1, c2):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Metallic': 0.9, 'Roughness': 0.2, 'Coat Weight': 0.6})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    lw = N(nt, 'ShaderNodeLayerWeight', ins={'Blend': 0.45})
    tc = N(nt, 'ShaderNodeTexCoord')
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 9, 'Detail': 10, 'Distortion': 2.0})
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    f = math_n(nt, 'MULTIPLY_ADD', lw.outputs['Facing'], 0.6, math_n(nt, 'MULTIPLY', nz.outputs['Fac'], 0.5))
    c = ramp(nt, f, [(0.2, c1), (0.55, c2), (0.9, (0.9, 0.85, 0.8))])
    L(nt, c.outputs[0], bs.inputs['Base Color'])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.6, 'Distance': 0.02})
    L(nt, nz.outputs['Fac'], bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def weird(name, c, s, seed, cam, pals=('flesh', 'bark'), eyes=(3, 7), roots=10, spikes=30, hair=True, mouth=True, stalks=2,
          look=None, stare_p=0.55, hair_col=('3a1a0b', 'a0582a'), spike_kind='bone', squash=None, breathe=True, lumps=3, F=144):
    """A lumpy amalgam creature facing `look` (default the camera's start)."""
    rnd = random.Random(seed)
    c = Vector(c)
    look = Vector(look if look else cam.location)
    fwd = (look - c).normalized()
    side = fwd.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(fwd).normalized()
    root = empty(name, tuple(c))
    m0 = pmat(pals[0], rnd.randint(0, 2)); m1 = pmat(pals[1 % len(pals)], rnd.randint(0, 2))
    sq = squash or (rnd.uniform(0.85, 1.25), rnd.uniform(0.85, 1.15), rnd.uniform(0.75, 1.2))
    body = sphere(name + 'body', tuple(c), s, sq, m=m0)
    displace(body, 0.28 * s, 0.45, subdiv=2)
    d2 = displace(body, 0.1 * s, 0.18, kind='VORONOI', subdiv=0)
    parent(body, root)
    parts = []
    for k in range(lumps):
        d = (fwd * rnd.uniform(-0.6, 0.3) + side * rnd.uniform(-1, 1) + up * rnd.uniform(-0.3, 1)).normalized()
        lp = sphere(name + 'lump%d' % k, tuple(c + d * s * 0.75), s * rnd.uniform(0.35, 0.6), m=m1 if k % 2 else m0)
        displace(lp, 0.15 * s, 0.3, subdiv=1)
        parent(lp, root)
    # eyes: mismatched sizes, some on stalks; some roll around, some stare
    ne = rnd.randint(eyes[0] * 2, eyes[1] * 2)
    rigs = []
    for k in range(ne):
        a = rnd.uniform(-0.9, 0.9); b = rnd.uniform(-0.15, 0.9)
        d = (fwd + side * a + up * b).normalized()
        r = s * (rnd.uniform(0.05, 0.15) if k else 0.2)
        p = c + d * s * 0.92
        if 0 < k <= stalks:
            base = c + d * s * 0.8
            tip = base + (d + up * 0.6).normalized() * s * rnd.uniform(0.6, 1.1)
            t = tube(name + 'stk%d' % k, [tuple(base), tuple((base + tip) / 2 + side * rnd.uniform(-0.2, 0.2) * s), tuple(tip)], r * 0.5, r * 0.35, m0)
            pe = empty(name + 'stp%d' % k, tuple(base)); parent(t, pe); parent(pe, root)
            noise_anim(pe, 'rotation_euler', 0, 0.12, 25); noise_anim(pe, 'rotation_euler', 1, 0.12, 25)
            p = tip + (tip - base).normalized() * r * 0.6
            holder = pe
        else:
            holder = root
        rig = eye(name + 'E%d' % k, tuple(p), r, tuple(p + (look - p).normalized() * 3 + Vector((rnd.uniform(-1, 1), 0, 0))),
                  rnd.choice(IRISES), m0 if k % 2 == 0 else m1, open_up=rnd.uniform(-34, -18), open_dn=rnd.uniform(16, 30),
                  pupil=rnd.uniform(0.03, 0.08), iris=rnd.uniform(0.26, 0.4), veins=1.6, sclera=(0.48, 0.36, 0.24))
        parent(rig['sock'], holder)
        if rnd.random() < stare_p:
            stare(rig, cam)
        else:
            darts(rig, F, seed=rnd.randint(0, 999), amp=(45, 25), hold=(5, 16))
        for _ in range(rnd.randint(0, 2)):
            blink(rig, rnd.randint(10, F - 10))
        rigs.append(rig)
    # roots / tendrils hanging and reaching to the ground
    rootm = pmat(pals[-1], 1)
    for k in range(roots):
        ang = rnd.uniform(0, math.tau)
        d = Vector((math.cos(ang), math.sin(ang), rnd.uniform(-0.9, 0.2))).normalized()
        start = c + d * s * 0.8
        pts = walk(tuple(start), d, rnd.randint(6, 10), s * rnd.uniform(0.25, 0.45), 0.35, gravity=0.25, seed=rnd.random())
        pts = [(x, y, max(z, -0.05)) for (x, y, z) in pts]
        t = tube(name + 'rt%d' % k, pts, s * rnd.uniform(0.08, 0.16), s * 0.01, rootm, res=5, bevel_res=4)
        pe = empty(name + 'rtp%d' % k, tuple(start)); parent(t, pe); parent(pe, root)
        noise_anim(pe, 'rotation_euler', 0, 0.06, 40); noise_anim(pe, 'rotation_euler', 1, 0.06, 40)
    # spikes on the back
    spm = bone_mat(name + 'spk', dark=rnd.random() < 0.5) if spike_kind == 'bone' else crystal(name + 'cry', hexc('2a1030'), hexc('a070c0'))
    for k in range(spikes):
        d = (-fwd * rnd.uniform(0, 1) + up * rnd.uniform(0.2, 1.2) + side * rnd.uniform(-1, 1)).normalized()
        sp = cone(name + 'sp%d' % k, tuple(c + d * s * 0.85), s * rnd.uniform(0.04, 0.1), 0.0, s * rnd.uniform(0.3, 1.0), spm, seg=8)
        sp.rotation_mode = 'QUATERNION'; sp.rotation_quaternion = d.to_track_quat('Z', 'Y')
        parent(sp, root)
    # tufts of hair
    if hair:
        hm = hair_mat(name + 'hair', hexc(hair_col[0]), hexc(hair_col[1]))
        add_mat_slot(body, hm)
        vg = body.vertex_groups.new(name='tuft')
        for v in body.data.vertices:
            n = v.co.normalized()
            w = max(0.0, -n.dot(Vector((0, -1, 0))) * 0.4 + n.z * 0.8 + rnd.uniform(-0.2, 0.2))
            if w > 0.35:
                vg.add([v.index], min(1, w), 'REPLACE')
        fur(body, hm.name, count=2500, length=s * 0.45, children=8, rough=0.15, frizz=0.3, radius=0.006, clump=0.4, rand=0.4, vgroup='tuft', seed=seed)
    # mouth slit with teeth
    if mouth:
        tm = bone_mat(name + 'tth')
        mc = c + (fwd + up * -0.3).normalized() * s * 0.97
        mo = empty(name + 'mouth', tuple(mc))
        mo.rotation_mode = 'QUATERNION'; mo.rotation_quaternion = (look - mc).normalized().to_track_quat('Z', 'Y')
        cav = sphere(name + 'cav', (0, 0, 0), s * 0.45, (1.3, 0.25, 0.35), seg=24, rings=12, m=simple_mat(name + 'void', (0, 0, 0), rough=1))
        cav.parent = mo
        jaws = []
        for sg in (-1, 1):
            j = empty(name + 'jaw%d' % sg, (0, 0, 0)); j.parent = mo; jaws.append((sg, j))
            for k in range(20):
                a = -1 + 2 * k / 19
                th = cone(name + 'th%d_%d' % (k, sg), (a * s * 0.52 * (1 - 0.15 * a * a), 0, 0), s * 0.03, s * 0.012, s * rnd.uniform(0.07, 0.13), tm, seg=6)
                th.rotation_euler = (math.radians(90 * sg), 0, 0)
                th.parent = j
        parent(mo, root)
        for f in range(1, F + 1, 12):
            o_ = 1.3 + 2.0 * max(0, math.sin(f * 0.05 + seed))
            key_scale(cav, f, (1.3, 0.25 * o_, 0.35))
            for sg, j in jaws:
                key_loc(j, f, (0, sg * s * 0.45 * 0.25 * o_ * 0.8, 0.15 * s))
    if breathe:
        for f in range(1, F + 1, 10):
            b = math.sin(f / 24 * 2 * math.pi / 2.6 + seed)
            key_scale(body, f, (sq[0] * (1 + 0.03 * b), sq[1] * (1 + 0.03 * b), sq[2] * (1 + 0.05 * b)))
    root.rotation_mode = 'XYZ'
    noise_anim(root, 'rotation_euler', 2, 0.05, 60)
    noise_anim(root, 'rotation_euler', 0, 0.03, 60)
    return root, rigs

def night(world_strength=1.0):
    return world_nebula((0.01, 0.012, 0.03), (0.03, 0.035, 0.08), world_strength, stars=True, scale=1.4,
                        horizon=[(0.0, (0.03, 0.04, 0.06)), (0.08, (0.012, 0.014, 0.025)), (0.3, (0.0, 0.0, 0.0))])

def meadow_ground(seed=4, count=7000, size=60, col=('0a1208', '3e5228')):
    turf = skin('turf', [hexc('080c06'), hexc('16200e'), hexc('2a3418')], scale=0.6, cell=3, bump=0.4, coat=0, rough=0.85)
    grass = hair_mat('grass', hexc(col[0]), hexc(col[1]))
    g = ground(size, turf, 0.5, 4.0)
    add_mat_slot(g, grass)
    fur(g, 'grass', count=count, length=0.5, children=8, rough=0.08, frizz=0.05, radius=0.006, clump=0.3, rand=0.4, seed=seed)
    return g

def moonlight(target=(0, 0, 1), key=600, rim=1200, warm=(0.75, 0.7, 0.6)):
    key *= 0.55
    light('SUN', (0, 0, 10), 0.35, (0.55, 0.65, 1.0), target=(4, 10, -6), angle=2)
    light('AREA', (-4, -5, 4), key, warm, 4, target=target)
    light('AREA', (4, 8, 4), rim, (0.45, 0.55, 1.0), 6, target=target)

# ------------------------------------------------------------------ scenes
def shot_meadow():
    F = S(DUR['meadow']); sc = reset(); _mats.clear()
    night(); meadow_ground(1)
    cam, tgt = camera((0.4, -7.2, 1.2), (0, 0, 1.9), lens=32)
    key_loc(cam, 1, (0.8, -7.8, 1.1)); key_loc(cam, F, (0.1, -6.0, 1.3))
    weird('A', (0, 0.4, 1.6), 1.25, 11, cam, pals=('rust', 'bark'), eyes=(5, 7), roots=12, spikes=35, stalks=2, F=F)
    moonlight((0, 0, 1.5))
    return sc, F

def shot_pair():
    F = S(DUR['pair']); sc = reset(); _mats.clear()
    night(0.7); meadow_ground(2, col=('080c08', '2a3a22'))
    bark = skin('trunk', [hexc('080605'), hexc('1a140e'), hexc('2e241a')], scale=1.5, cell=1.5, bump=1.0, coat=0, stretch=(1, 1, 0.15))
    rnd = random.Random(2)
    for i in range(12):
        cylinder('tr%d' % i, (rnd.uniform(-12, 12), rnd.uniform(5, 20), -0.5), rnd.uniform(0.3, 0.8), 18, bark, seg=16)
    cam, tgt = camera((0, -6.5, 1.4), (0, 0, 1.4), lens=32)
    key_loc(cam, 1, (-0.6, -7.0, 1.3)); key_loc(cam, F, (0.5, -6.0, 1.5))
    weird('A', (-1.35, 0.3, 1.3), 1.0, 21, cam, pals=('pink', 'flesh'), eyes=(4, 6), roots=8, spikes=25, stalks=1, hair_col=('2a1018', 'b07080'), F=F)
    weird('B', (1.4, 0.6, 1.45), 1.05, 22, cam, pals=('moss', 'bark'), eyes=(3, 5), roots=10, spikes=20, stalks=3, hair_col=('0a140a', '5a7a3a'), spike_kind='crystal', F=F)
    moonlight((0, 0, 1.3), 500, 1400)
    return sc, F

def shot_stump():
    F = S(DUR['stump']); sc = reset(); _mats.clear()
    night(0.8); meadow_ground(3)
    bark = pmat('bark', 1)
    st = tube('stump', [(0, 1, -0.2), (0.05, 1, 0.8), (0, 1, 1.6)], 0, 0, bark, res=6, bevel_res=8, radii=[1.1, 0.8, 0.85])
    rnd = random.Random(7)
    for i in range(6):
        a = i / 6 * math.tau
        tube('sroot%d' % i, walk((math.cos(a) * 0.6, 1 + math.sin(a) * 0.6, 0.3), (math.cos(a), math.sin(a), -0.4), 5, 0.5, 0.2, gravity=0.2, seed=i), 0.35, 0.05, bark, res=5)
    cam, tgt = camera((1.2, -4.5, 1.6), (0, 1, 2.3), lens=30)
    key_loc(cam, 1, (1.8, -5.0, 1.2)); key_loc(cam, F, (0.4, -3.8, 1.9))
    weird('A', (0, 1, 2.45), 0.95, 31, cam, pals=('bruise', 'bark'), eyes=(6, 8), roots=14, spikes=30, stalks=3, hair_col=('140a1a', '6a4a7a'), F=F)
    moonlight((0, 1, 2.2), 600, 1500)
    return sc, F

def shot_swamp():
    F = S(DUR['swamp']); sc = reset(); _mats.clear()
    night(0.8)
    mud = skin('mud', [hexc('050604'), hexc('12140c')], scale=1, bump=0.3, coat=0.4)
    ground(80, mud, 0.8, 3, z=-0.6)
    cube('water', (0, 0, 0), (200, 200, 0.02), simple_mat('swampw', (0.01, 0.014, 0.008), rough=0.04))
    reed = skin('reed', [hexc('0e140a'), hexc('2a361a'), hexc('4a5228')], scale=6, bump=0.3, coat=0.1, stretch=(1, 1, 0.1))
    rnd = random.Random(5)
    for i in range(70):
        x, y = rnd.uniform(-7, 7), rnd.uniform(-2, 10)
        if abs(x) < 1.6 and -1 < y < 2: continue
        h = rnd.uniform(0.6, 2.2)
        tube('reed%d' % i, walk((x, y, -0.3), (rnd.uniform(-0.15, 0.15), 0, 1), 5, h / 4, 0.08, seed=rnd.random()), 0.025, 0.006, reed, res=3, bevel_res=2)
    cam, tgt = camera((0, -5.5, 0.5), (0, 0.5, 0.9), lens=32)
    key_loc(cam, 1, (-0.5, -6.0, 0.4)); key_loc(cam, F, (0.4, -4.6, 0.55))
    r, _ = weird('A', (0, 0.8, 0.35), 1.0, 41, cam, pals=('slate', 'moss'), eyes=(5, 8), roots=8, spikes=20, stalks=2, hair_col=('0a100a', '3a4a2a'), F=F)
    key_loc(r, 1, (0, 0.5, -0.3)); key_loc(r, F, (0, 0.5, 0.45))
    moonlight((0, 0.5, 0.8), 500, 1500)
    return sc, F

def shot_totem():
    F = S(DUR['totem']); sc = reset(); _mats.clear()
    night(); meadow_ground(5)
    cam, tgt = camera((0.3, -8.0, 1.2), (0, 0, 2.6), lens=28)
    key_loc(cam, 1, (0.9, -8.6, 1.0)); key_loc(cam, F, (0.0, -7.0, 1.6))
    key_loc(tgt, 1, (0, 0, 1.8)); key_loc(tgt, F, (0, 0, 3.6))
    weird('A', (0, 0.3, 1.0), 1.0, 51, cam, pals=('bark', 'rust'), eyes=(3, 5), roots=12, spikes=12, stalks=0, hair=False, F=F)
    weird('B', (0.15, 0.3, 2.65), 0.85, 52, cam, pals=('flesh', 'pink'), eyes=(4, 6), roots=6, spikes=10, stalks=1, mouth=True, hair=False, F=F)
    weird('C', (-0.1, 0.3, 4.05), 0.7, 53, cam, pals=('bruise', 'slate'), eyes=(5, 7), roots=4, spikes=24, stalks=2, mouth=False, hair_col=('140a1a', '8a6a9a'), spike_kind='crystal', F=F)
    moonlight((0, 0, 2.6), 900, 1800)
    return sc, F

def shot_crawler():
    F = S(DUR['crawler']); sc = reset(); _mats.clear()
    night(0.8)
    rock = skin('rock', [hexc('0a0a0a'), hexc('1e1e1c'), hexc('3a3834')], scale=0.8, cell=3, bump=1.0, coat=0.1, rough=0.8, crease=0.7)
    g = ground(80, rock, 1.0, 2.5)
    rnd = random.Random(9)
    for i in range(16):
        b = sphere('boulder%d' % i, (rnd.uniform(-8, 8), rnd.uniform(1, 14), 0), rnd.uniform(0.3, 1.2), (1, 1, 0.6), seg=24, rings=12, m=rock)
        displace(b, 0.3, 0.5, subdiv=1)
    cam, tgt = camera((1.8, -4.0, 0.7), (0, 1.5, 0.6), lens=30)
    r, _ = weird('A', (0, 3.5, 0.75), 0.85, 61, cam, pals=('rust', 'flesh'), eyes=(6, 9), roots=18, spikes=40, stalks=4, squash=(1.5, 1.0, 0.6), hair_col=('2a0c04', 'c45a1a'), look=(0, -6, 0.6), F=F)
    key_loc(r, 1, (0, 4.5, 0.75)); key_loc(r, F, (0, 1.2, 0.75)); linear(r)
    key_loc(cam, 1, (2.2, -4.3, 0.6)); key_loc(cam, F, (1.2, -3.4, 0.8))
    key_loc(tgt, 1, (0, 4.2, 0.6)); key_loc(tgt, F, (0, 1.3, 0.7))
    moonlight((0, 2.5, 0.6), 500, 1400)
    return sc, F

def shot_brood():
    F = S(DUR['brood']); sc = reset(); _mats.clear()
    night(0.8); meadow_ground(7, count=6000)
    cam, tgt = camera((0, -1.0, 4.2), (0, 2.2, 0.3), lens=28)
    key_loc(cam, 1, (0, -0.6, 4.6)); key_loc(cam, F, (0.2, -0.2, 3.6))
    spots = [(-1.6, 1.6, 0.42), (0.0, 2.2, 0.5), (1.5, 1.7, 0.4), (-0.8, 3.2, 0.38), (0.9, 3.3, 0.44), (-2.2, 2.9, 0.33), (2.3, 3.0, 0.35)]
    pals = [('pink', 'flesh'), ('moss', 'bark'), ('rust', 'bark'), ('bruise', 'slate'), ('flesh', 'rust'), ('slate', 'moss'), ('bark', 'pink')]
    for i, (x, y, s) in enumerate(spots):
        weird('K%d' % i, (x, y, s * 0.9), s, 70 + i, cam, pals=pals[i], eyes=(2, 4), roots=5, spikes=8, stalks=1, hair=False, mouth=i % 2 == 0, F=F)
    moonlight((0, 2.4, 0.3), 700, 1300)
    return sc, F

def shot_giant():
    F = S(DUR['giant']); sc = reset(); _mats.clear()
    night(1.0)
    sphere('moon', (8, 120, 30), 8, m=simple_mat('moon', (0.8, 0.85, 0.9), emit=(0.85, 0.9, 1.0), emit_str=4))
    meadow_ground(8, count=9000, size=80)
    bark = skin('trunk', [hexc('060504'), hexc('14100c'), hexc('241c16')], scale=1.5, cell=1.5, bump=1.0, coat=0, stretch=(1, 1, 0.15))
    rnd = random.Random(8)
    for i in range(10):
        x = rnd.uniform(-14, 14); y = rnd.uniform(6, 12)
        tube('dead%d' % i, walk((x, y, -0.3), (0, 0, 1), 6, rnd.uniform(0.8, 1.6), 0.15, seed=i), 0.3, 0.05, bark, res=4)
    cam, tgt = camera((0, -9, 1.0), (0, 20, 5.5), lens=30)
    key_loc(cam, 1, (0.6, -9.5, 0.9)); key_loc(cam, F, (0.0, -8.0, 1.1))
    r, _ = weird('G', (0, 22, 3.0), 6.0, 81, cam, pals=('slate', 'bruise'), eyes=(5, 7), roots=14, spikes=40, stalks=2, hair_col=('0a0c14', '4a5a7a'), F=F)
    key_loc(r, 1, (0, 22, -0.5)); key_loc(r, F, (0, 22, 3.0))
    light('SUN', (0, 0, 10), 0.4, (0.55, 0.65, 1.0), target=(0, -10, -6), angle=2)
    light('AREA', (-10, 4, 12), 9000, (0.9, 0.7, 0.6), 12, target=(0, 22, 4))
    light('AREA', (12, 34, 10), 12000, (0.4, 0.5, 1.0), 14, target=(0, 22, 4))
    return sc, F

def shot_face():
    F = S(DUR['face']); sc = reset(); _mats.clear()
    night(0.4)
    cam, tgt = camera((0, -4.2, 0.25), (0, 0, 0.25), lens=40, dof=3.0, fstop=4)
    key_loc(cam, 1, (0, -4.6, 0.25)); key_loc(cam, F, (0, -3.3, 0.2))
    weird('Z', (0, 0, 0), 1.2, 91, cam, pals=('flesh', 'bark'), eyes=(8, 9), roots=3, stare_p=1.0, spikes=30, stalks=2, hair_col=('2a140a', 'a06a40'), F=F)
    light('AREA', (-2.5, -3, -1.5), 300, (1.0, 0.8, 0.65), 2, target=(0, 0, 0))
    light('AREA', (3, 2, 2), 600, (0.45, 0.55, 1.0), 3, target=(0, 0, 0))
    lc = light('POINT', (0, 0, 0), 25, (0.9, 0.9, 1.0), 0.2); lc.parent = cam; lc.location = (0.2, 0.3, 0.2)
    return sc, F

SHOTS = {'meadow': shot_meadow, 'pair': shot_pair, 'stump': shot_stump, 'swamp': shot_swamp, 'totem': shot_totem,
         'crawler': shot_crawler, 'brood': shot_brood, 'giant': shot_giant, 'face': shot_face}

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    sc, F = SHOTS[name]()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else F // 2
        setup_render(sc, F, res=(640, 360), samples=12, out='%s/w_%s.png' % (outdir, name))
        sc.frame_set(fr)
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        bpy.ops.render.render(animation=True)
