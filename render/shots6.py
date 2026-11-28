"""v5: the v4 night scenes with crunchy low-res old-3D textures, and a real-looking town."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shots5
from shots5 import *
from lib import *
from shots2 import cube
import bpy, bmesh

RES = tuple(int(x) for x in os.environ.get('RES', '640x360').split('x'))
SAMP = int(os.environ.get('SAMP', '16'))

# ------------------------------------------------------------------ rough old textures
def retro_materials(inc=0.045, eye_inc=0.06):
    """Snap every texture lookup to a coarse grid so surfaces look like small stretched bitmaps."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        step = eye_inc if '_em' in m.name else inc
        for n in list(nt.nodes):
            if n.bl_idname != 'ShaderNodeTexCoord':
                continue
            for out in n.outputs:
                for lk in list(out.links):
                    to = lk.to_socket
                    sn = nt.nodes.new('ShaderNodeVectorMath')
                    sn.operation = 'SNAP'
                    sn.inputs[1].default_value = (step, step, step)
                    nt.links.remove(lk)
                    nt.links.new(out, sn.inputs[0])
                    nt.links.new(sn.outputs[0], to)
        # harsher, flatter 90s shading
        for n in nt.nodes:
            if n.bl_idname == 'ShaderNodeBump':
                n.inputs['Strength'].default_value = min(1.0, n.inputs['Strength'].default_value * 1.4)

# ------------------------------------------------------------------ real houses
def tex_mat(name, kind, c1, c2, mortar=None, scale=1.0, rough=0.8, bump=0.6, row=0.25, brick=0.5):
    """Brick, board siding or shingles from Blender's brick texture plus grime."""
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': rough})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    br = N(nt, 'ShaderNodeTexBrick', ins={'Scale': scale, 'Mortar Size': 0.012 if mortar else 0.004,
                                           'Brick Width': brick, 'Row Height': row, 'Color1': c1 + (1,), 'Color2': c2 + (1,),
                                           'Mortar': (mortar or tuple(x * 0.4 for x in c1)) + (1,)})
    br.offset = 0.5 if kind != 'siding' else 0.0
    if kind == 'siding':
        br.inputs['Brick Width'].default_value = 40
    L(nt, tc.outputs['Object'], br.inputs['Vector'])
    gn = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 3, 'Detail': 8})
    L(nt, tc.outputs['Object'], gn.inputs['Vector'])
    grime = ramp(nt, gn.outputs['Fac'], [(0.35, (0.45, 0.42, 0.38)), (0.7, (1, 1, 1))])
    c = mix_col(nt, 1.0, br.outputs['Color'], grime.outputs[0], 'MULTIPLY')
    L(nt, c, bs.inputs['Base Color'])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': bump, 'Distance': 0.02})
    L(nt, br.outputs['Fac'], bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def box(name, loc, size, m, rot=0.0, par=None):
    o = cube(name, loc, size, m)
    if par:
        o.parent = par
    return o

def prism_roof(name, w, d, rise, over, m, par, z):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    W = w / 2 + over; D = d / 2 + over
    v = [bm.verts.new(p) for p in [(-W, -D, 0), (W, -D, 0), (W, D, 0), (-W, D, 0), (0, -D, rise), (0, D, rise)]]
    for f in [(0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4), (0, 3, 2, 1)]:
        bm.faces.new([v[i] for i in f])
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new(name, me))
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.06
    assign(o, m)
    o.parent = par
    o.location = (0, 0, z)
    return o

_hm = {}
def house_mats():
    if _hm:
        return _hm
    _hm['brick'] = tex_mat('brick', 'brick', hexc('5a2a1c'), hexc('7a3a28'), mortar=hexc('6a6458'), scale=9, row=0.22, brick=0.45)
    _hm['brick2'] = tex_mat('brick2', 'brick', hexc('6a5a48'), hexc('5a4a3a'), mortar=hexc('4a4640'), scale=9, row=0.22, brick=0.45)
    _hm['siding'] = tex_mat('siding', 'siding', hexc('8a8a82'), hexc('7e7e76'), scale=7, row=0.5, bump=0.8)
    _hm['siding2'] = tex_mat('siding2', 'siding', hexc('6a7466'), hexc('626a5e'), scale=7, row=0.5, bump=0.8)
    _hm['siding3'] = tex_mat('siding3', 'siding', hexc('9a8a6a'), hexc('8e7e60'), scale=7, row=0.5, bump=0.8)
    _hm['shingle'] = tex_mat('shingle', 'brick', hexc('2a2a2c'), hexc('343436'), scale=14, row=0.35, brick=0.3, bump=1.0)
    _hm['shingle2'] = tex_mat('shingle2', 'brick', hexc('3a2a22'), hexc('46322a'), scale=14, row=0.35, brick=0.3, bump=1.0)
    _hm['trim'] = simple_mat('trim', hexc('b8b4a8'), rough=0.6)
    _hm['glass'] = simple_mat('glassd', (0.01, 0.012, 0.015), rough=0.08)
    _hm['lit'] = simple_mat('lit', (0.2, 0.12, 0.05), emit=(1.0, 0.6, 0.28), emit_str=3.5)
    _hm['door'] = tex_mat('doorw', 'siding', hexc('2a1a10'), hexc('321e12'), scale=20, row=0.5)
    _hm['concrete'] = skin('concrete', [hexc('3a3a38'), hexc('5a5a56'), hexc('6e6e6a')], scale=4, cell=2, bump=0.4, coat=0, rough=0.9, crease=0.3)
    _hm['asphalt'] = skin('asphalt', [hexc('0c0c0c'), hexc('1a1a1a'), hexc('262624')], scale=8, cell=3, bump=0.4, coat=0.05, rough=0.85)
    _hm['lawn'] = skin('lawn', [hexc('0c140a'), hexc('16220e'), hexc('22301a')], scale=2, cell=4, bump=0.3, coat=0, rough=0.95)
    _hm['wood'] = tex_mat('fence', 'siding', hexc('3a3026'), hexc('342a20'), scale=30, row=0.5)
    return _hm

def real_house(name, x, y, rot, seed, lit_p=0.3):
    rnd = random.Random(seed)
    H = house_mats()
    g = empty(name, (x, y, 0)); g.rotation_euler = (0, 0, rot)
    w = rnd.uniform(7, 10); d = rnd.uniform(6, 8.5)
    stories = rnd.choice([1, 1, 2])
    fh = 2.7
    h = fh * stories
    wall = H[rnd.choice(['brick', 'brick2', 'siding', 'siding2', 'siding3'])]
    roofm = H[rnd.choice(['shingle', 'shingle2'])]
    box(name + 'fnd', (0, 0, 0.2), (w + 0.1, d + 0.1, 0.4), H['concrete'], par=g)
    box(name + 'body', (0, 0, 0.4 + h / 2), (w, d, h), wall, par=g)
    prism_roof(name + 'roof', w, d, rnd.uniform(1.8, 3.0), 0.45, roofm, g, 0.4 + h)
    # chimney
    if rnd.random() < 0.7:
        cx = rnd.choice([-1, 1]) * w * 0.3
        box(name + 'chim', (cx, d * 0.15, 0.4 + h + 1.6), (0.7, 0.7, 3.2), H['brick'], par=g)
        box(name + 'chimc', (cx, d * 0.15, 0.4 + h + 3.25), (0.85, 0.85, 0.12), H['concrete'], par=g)
    # windows with frames and sills on front and back
    for side in (-1, 1):
        for st in range(stories):
            n = rnd.randint(2, 3)
            for k in range(n):
                wx = (-w / 2 + w * (k + 0.5) / n) + (0.0 if not (side == -1 and st == 0 and k == n // 2) else 99)
                if wx > 50:
                    # front door instead
                    box(name + 'door', (0, side * (d / 2 + 0.02), 0.4 + 1.05), (1.0, 0.06, 2.1), H['door'], par=g)
                    box(name + 'dfr', (0, side * (d / 2 + 0.03), 0.4 + 2.15), (1.2, 0.08, 0.12), H['trim'], par=g)
                    box(name + 'step', (0, side * (d / 2 + 0.45), 0.15), (1.6, 0.9, 0.3), H['concrete'], par=g)
                    continue
                wz = 0.4 + st * fh + 1.5
                lit = rnd.random() < lit_p
                box(name + 'gl%d%d%d' % (side + 1, st, k), (wx, side * (d / 2 + 0.02), wz), (1.1, 0.04, 1.3), H['lit'] if lit else H['glass'], par=g)
                for (dx, dz, sx, sz) in [(0, 0.7, 1.3, 0.1), (0, -0.7, 1.4, 0.12), (-0.6, 0, 0.1, 1.4), (0.6, 0, 0.1, 1.4), (0, 0, 1.1, 0.05), (0, 0, 0.05, 1.3)]:
                    box(name + 'fr', (wx + dx, side * (d / 2 + 0.05), wz + dz), (sx, 0.08, sz), H['trim'], par=g)
                if lit:
                    l = light('POINT', (0, 0, 0), 25, (1.0, 0.6, 0.28), 0.3)
                    l.parent = g; l.location = (wx, side * (d / 2 + 0.6), wz)
    # side windows
    for side in (-1, 1):
        box(name + 'sw%d' % side, (side * (w / 2 + 0.02), 0, 0.4 + 1.5), (0.04, 1.0, 1.2), H['glass'], par=g)
    # driveway, garage door, fence at back
    if rnd.random() < 0.5:
        box(name + 'gar', (w / 2 + 1.8, 0.3, 0.4 + 1.3), (3.4, d * 0.8, 2.6), wall, par=g)
        g2 = prism_roof(name + 'garr', 3.4, d * 0.8, 0.8, 0.3, roofm, g, 0.4 + 2.6)
        g2.location = (w / 2 + 1.8, 0.3, 0.4 + 2.6)
        box(name + 'gard', (w / 2 + 1.8, -(d * 0.4 + 0.02) + 0.3, 0.4 + 1.1), (2.6, 0.05, 2.2), H['trim'], par=g)
        box(name + 'drive', (w / 2 + 1.8, -d / 2 - 3, 0.03), (3.0, 6, 0.06), H['concrete'], par=g)
    else:
        box(name + 'walk', (0, -d / 2 - 2.5, 0.03), (1.1, 4.5, 0.06), H['concrete'], par=g)
    box(name + 'fence', (0, d / 2 + 5, 0.9), (w + 6, 0.08, 1.8), H['wood'], par=g)
    return g

def street_light(x, y, rot):
    met = metal_mat('poles', base=(0.12, 0.12, 0.12))
    cylinder('sl', (x, y, 0), 0.09, 6.5, met, seg=10)
    lamp = cube('slh', (x + math.cos(rot) * 0.9, y + math.sin(rot) * 0.9, 6.4), (1.0, 0.35, 0.15),
                simple_mat('slg', (0.9, 0.7, 0.4), emit=(1.0, 0.65, 0.3), emit_str=15))
    lamp.rotation_euler = (0, 0, rot)
    l = light('POINT', (x + math.cos(rot) * 0.9, y + math.sin(rot) * 0.9, 6.1), 900, (1.0, 0.62, 0.3), 0.4)
    return l

def bare_tree(x, y, h, seed):
    branches('tree%d' % seed, (x, y, 0), (0, 0, 1), 8, h, h * 0.035, M('deadwood'), seed, wander=0.25, kids=5, sway=0)

def shot_town():
    """Looking down on a real suburb at night; something on stick legs walks between the houses."""
    F = S(DUR['town']); sc = reset(); shots5._mc.clear(); _hm.clear()
    night(0.4)
    H = house_mats()
    g = ground(300, H['lawn'], 0.3, 6)
    # street grid: two streets running away from camera, one across
    for sx in (-14, 14):
        cube('road%d' % sx, (sx, 30, 0.04), (7, 160, 0.08), H['asphalt'])
        for k in range(-3, 9):
            cube('kerb%d_%d' % (sx, k), (sx - 3.7, k * 12, 0.1), (0.3, 12, 0.2), H['concrete'])
            cube('kerb%d_%dr' % (sx, k), (sx + 3.7, k * 12, 0.1), (0.3, 12, 0.2), H['concrete'])
    cube('cross', (0, 22, 0.045), (120, 7, 0.08), H['asphalt'])
    rnd = random.Random(11)
    hid = 0
    for sx in (-14, 14):
        for side in (-1, 1):
            for k in range(-2, 8):
                y = k * 14 + rnd.uniform(-1, 1)
                if abs(y - 22) < 8: continue
                x = sx + side * 12
                real_house('H%d' % hid, x, y, (-side) * math.pi / 2 + rnd.uniform(-0.03, 0.03), 100 + hid)
                hid += 1
                if rnd.random() < 0.5:
                    bare_tree(x + rnd.uniform(-5, 5), y + rnd.uniform(5, 7), rnd.uniform(6, 10), 300 + hid)
    for sx in (-14, 14):
        for k in range(-1, 8, 2):
            street_light(sx + 3.9, k * 14 + 6, math.pi)
    cam, tgt = camera((16, -40, 40), (0, 22, 4), lens=30)
    key_loc(cam, 1, (17, -41, 40.5)); key_loc(cam, F, (15, -38, 39))
    body = empty('walker', (0, 0, 0))
    r = thicket('W', (0, 22, 20), 5.0, 41, cam.location, mats=('deadwood', 'bruise'), up=40, down=0)
    parent(r, body)
    for k in range(6):
        a = k / 6 * math.tau + 0.3
        foot = (math.cos(a) * 14, 22 + math.sin(a) * 14, 0)
        knee = (math.cos(a) * 10, 22 + math.sin(a) * 10, 26)
        t = tube('leg%d' % k, [(0, 22, 20), knee, foot], 0.5, 0.08, M('deadwood'), res=8, bevel_res=3)
        pe = empty('legp%d' % k, (0, 22, 20)); parent(t, pe); parent(pe, body)
        noise_anim(pe, 'rotation_euler', 0, 0.04, 30); noise_anim(pe, 'rotation_euler', 1, 0.04, 30)
    key_loc(body, 1, (0, 8, 0)); key_loc(body, F, (0, 0, 0)); linear(body)
    rig = big_eye('W', (1.0, 22 - 3.2, 19.0), 1.3, (16, -40, 40), 'ash', M('deadwood'), cam=cam, glow=4)
    for o in (rig['sock'], rig['pouch']): parent(o, r)
    light('SUN', (0, 0, 10), 0.3, (0.5, 0.6, 1.0), target=(4, 10, -6), angle=2)
    light('AREA', (20, 60, 60), 150000, (0.45, 0.55, 1.0), 30, target=(0, 22, 15))
    light('AREA', (25, -10, 45), 40000, (0.8, 0.7, 0.6), 20, target=(0, 22, 18))
    return sc, F

shots5.shot_town = shot_town
SHOTS = dict(shots5.SHOTS); SHOTS['town'] = shot_town

if __name__ == '__main__':
    argv = sys.argv[1:]
    name = argv[0]
    mode = argv[1] if len(argv) > 1 else 'still'
    outdir = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    sc, F = SHOTS[name]()
    retro_materials()
    if mode == 'still':
        fr = int(argv[3]) if len(argv) > 3 else F // 2
        setup_render(sc, F, res=(640, 360), samples=12, out='%s/z_%s.png' % (outdir, name))
        sc.view_settings.exposure = 1.4
        sc.frame_set(fr)
        bpy.ops.render.render(write_still=True)
    else:
        a, b = int(argv[3]), int(argv[4])
        os.makedirs('%s/%s' % (outdir, name), exist_ok=True)
        setup_render(sc, F, res=RES, samples=SAMP, out='%s/%s/f_' % (outdir, name))
        sc.frame_start, sc.frame_end = a, b
        sc.render.use_overwrite = False
        sc.view_settings.exposure = 1.4
        bpy.ops.render.render(animation=True)
