import bpy, bmesh, math, random
from mathutils import Vector, Euler

FPS = 24
ADV = True

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    return sc

def setup_render(sc, frames, res=(960, 540), samples=24, out='/tmp/x_'):
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.05
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 4
    sc.cycles.diffuse_bounces = 2
    sc.cycles.glossy_bounces = 2
    sc.cycles.transmission_bounces = 2
    sc.cycles.volume_bounces = 0
    sc.cycles.transparent_max_bounces = 6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.volume_step_rate = 3.0
    sc.cycles.blur_glossy = 1.0
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.use_persistent_data = True
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = out
    vs = sc.view_settings
    vs.view_transform = 'AgX'
    for lk in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Punchy'):
        try:
            vs.look = lk
            break
        except Exception:
            pass

# ---------------------------------------------------------------- nodes
def mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    return m, nt

def N(nt, t, ins=None, **props):
    n = nt.nodes.new(t)
    for k, v in props.items():
        setattr(n, k, v)
    for k, v in (ins or {}).items():
        n.inputs[k].default_value = v
    return n

def L(nt, a, b):
    nt.links.new(a, b)

def ramp(nt, fac, stops):
    r = N(nt, 'ShaderNodeValToRGB')
    els = r.color_ramp.elements
    while len(els) > 1:
        els.remove(els[-1])
    for i, (p, c) in enumerate(stops):
        e = els[0] if i == 0 else els.new(p)
        e.position = p
        e.color = (c[0], c[1], c[2], 1)
    L(nt, fac, r.inputs['Fac'])
    return r

def math_n(nt, op, a, b=None, c=None):
    n = N(nt, 'ShaderNodeMath', operation=op)
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            L(nt, v, n.inputs[i])
    return n.outputs[0]

def mix_col(nt, fac, a, b, blend='MIX'):
    n = N(nt, 'ShaderNodeMix', data_type='RGBA', blend_type=blend)
    if isinstance(fac, (int, float)):
        n.inputs['Factor'].default_value = fac
    else:
        L(nt, fac, n.inputs['Factor'])
    for sock, v in ((n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(v, (tuple, list)):
            sock.default_value = (v[0], v[1], v[2], 1)
        else:
            L(nt, v, sock)
    return n.outputs[2]

def hexc(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

# ---------------------------------------------------------------- materials
def skin(name, cols, scale=4.0, cell=3.0, bump=0.6, rough=0.4, coat=0.3, metal=0.0,
         sss=0.05, crease=0.55, stretch=(1, 1, 1), fine=1.0, sheen=0.0):
    """Wrinkly, cell-cracked organic surface with a wet 90s sheen."""
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': rough, 'Metallic': metal,
          'Coat Weight': coat, 'Coat Roughness': 0.38, 'Subsurface Weight': sss,
          'Specular IOR Level': 0.6, 'Sheen Weight': sheen})
    bs.inputs['Subsurface Radius'].default_value = (0.6, 0.25, 0.15)
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    mp = N(nt, 'ShaderNodeMapping', ins={'Scale': stretch})
    L(nt, tc.outputs['Object'], mp.inputs['Vector'])
    v = mp.outputs[0]
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': scale, 'Detail': 12, 'Roughness': 0.62, 'Distortion': 0.4})
    L(nt, v, nz.inputs['Vector'])
    # warp coordinates for the cells
    wv = N(nt, 'ShaderNodeVectorMath', operation='MULTIPLY_ADD')
    L(nt, nz.outputs['Color'], wv.inputs[0]); wv.inputs[1].default_value = (0.25, 0.25, 0.25); L(nt, v, wv.inputs[2])
    vr = N(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', ins={'Scale': scale * cell})
    L(nt, wv.outputs[0], vr.inputs['Vector'])
    vr2 = N(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', ins={'Scale': scale * cell * 3.1})
    L(nt, wv.outputs[0], vr2.inputs['Vector'])
    edge = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 0.09})
    L(nt, vr.outputs['Distance'], edge.inputs['Value'])
    edge2 = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 0.06})
    L(nt, vr2.outputs['Distance'], edge2.inputs['Value'])
    fn = N(nt, 'ShaderNodeTexNoise', ins={'Scale': scale * 22, 'Detail': 6, 'Roughness': 0.7})
    L(nt, v, fn.inputs['Vector'])
    # colour
    col = ramp(nt, nz.outputs['Fac'], [(0.3 + i * 0.4 / max(1, len(cols) - 1), c) for i, c in enumerate(cols)])
    cr = math_n(nt, 'MULTIPLY', edge.outputs[0], edge2.outputs[0])
    dark = N(nt, 'ShaderNodeMapRange', ins={'To Min': 1 - crease, 'To Max': 1.0})
    L(nt, cr, dark.inputs['Value'])
    c2 = mix_col(nt, 1.0, col.outputs[0], dark.outputs[0], 'MULTIPLY')
    spec = ramp(nt, fn.outputs['Fac'], [(0.35, (0.75, 0.75, 0.75)), (0.65, (1.15, 1.1, 1.05))])
    c3 = mix_col(nt, 1.0, c2, spec.outputs[0], 'MULTIPLY')
    L(nt, c3, bs.inputs['Base Color'])
    # height
    h1 = math_n(nt, 'MULTIPLY', edge.outputs[0], 0.6)
    h2 = math_n(nt, 'MULTIPLY_ADD', edge2.outputs[0], 0.3, h1)
    h3 = math_n(nt, 'MULTIPLY_ADD', fn.outputs['Fac'], 0.25 * fine, h2)
    h4 = math_n(nt, 'MULTIPLY_ADD', nz.outputs['Fac'], 0.4, h3)
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': bump, 'Distance': 0.03})
    L(nt, h4, bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def eye_mat(name, iris_cols, spiral=False, pupil=0.17, iris=0.44, sclera=(0.74, 0.62, 0.48), veins=1.0):
    """Eyeball: local +Z is the front."""
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': 0.3, 'Coat Weight': 1.0,
          'Coat Roughness': 0.02, 'Subsurface Weight': 0.15, 'Specular IOR Level': 0.7})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    sx = N(nt, 'ShaderNodeSeparateXYZ')
    L(nt, tc.outputs['Object'], sx.inputs[0])
    obj = tc.outputs['Object']
    flat = N(nt, 'ShaderNodeVectorMath', operation='MULTIPLY')
    L(nt, obj, flat.inputs[0]); flat.inputs[1].default_value = (1, 1, 0)
    r = N(nt, 'ShaderNodeVectorMath', operation='LENGTH')
    L(nt, flat.outputs[0], r.inputs[0])
    rr = r.outputs['Value']
    front = math_n(nt, 'GREATER_THAN', sx.outputs['Z'], 0.0)
    rf = math_n(nt, 'ADD', rr, math_n(nt, 'MULTIPLY', math_n(nt, 'SUBTRACT', 1.0, front), 5.0))
    # sclera with veins
    vn = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 7, 'Detail': 8, 'Distortion': 1.8, 'Roughness': 0.6})
    L(nt, obj, vn.inputs['Vector'])
    vband = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.47, 'From Max': 0.5, 'To Min': 1, 'To Max': 0})
    vb = math_n(nt, 'ABSOLUTE', math_n(nt, 'SUBTRACT', vn.outputs['Fac'], 0.5))
    L(nt, vb, vband.inputs['Value'])
    vb2 = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 0.04, 'To Min': 1, 'To Max': 0})
    L(nt, vb, vb2.inputs['Value'])
    vmask = math_n(nt, 'MULTIPLY', vb2.outputs[0], veins)
    # veins stronger away from the iris
    rim = N(nt, 'ShaderNodeMapRange', ins={'From Min': iris + 0.05, 'From Max': 1.0})
    L(nt, rf, rim.inputs['Value'])
    vmask = math_n(nt, 'MULTIPLY', vmask, rim.outputs[0])
    scl_n = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 3, 'Detail': 4})
    L(nt, obj, scl_n.inputs['Vector'])
    scl = ramp(nt, scl_n.outputs['Fac'], [(0.35, sclera), (0.65, tuple(min(1, c * 1.08) for c in sclera[:1]) + (sclera[1] * 0.9, sclera[2] * 0.85))])
    scl = mix_col(nt, rim.outputs[0], scl.outputs[0], (0.7, 0.35, 0.3), 'MULTIPLY') if False else scl.outputs[0]
    pinkish = mix_col(nt, math_n(nt, 'MULTIPLY', rim.outputs[0], 0.7), scl, (0.7, 0.34, 0.3))
    sc_col = mix_col(nt, vmask, pinkish, (0.45, 0.04, 0.03))
    # iris
    ang = math_n(nt, 'ARCTAN2', sx.outputs['Y'], sx.outputs['X'])
    nrm = N(nt, 'ShaderNodeVectorMath', operation='NORMALIZE')
    L(nt, flat.outputs[0], nrm.inputs[0])
    fib = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 18, 'Detail': 6, 'Roughness': 0.7})
    fv = N(nt, 'ShaderNodeVectorMath', operation='MULTIPLY_ADD')
    L(nt, nrm.outputs[0], fv.inputs[0]); fv.inputs[1].default_value = (1, 1, 1)
    L(nt, flat.outputs[0], fv.inputs[2])
    L(nt, nrm.outputs[0], fib.inputs['Vector'])
    if spiral:
        sp = math_n(nt, 'ADD', math_n(nt, 'MULTIPLY', rr, 70.0), ang)
        sw = math_n(nt, 'SINE', sp)
        ifac = math_n(nt, 'MULTIPLY_ADD', sw, 0.35, math_n(nt, 'MULTIPLY', fib.outputs['Fac'], 0.6))
    else:
        rad = N(nt, 'ShaderNodeMapRange', ins={'From Min': pupil, 'From Max': iris})
        L(nt, rr, rad.inputs['Value'])
        ifac = math_n(nt, 'MULTIPLY_ADD', fib.outputs['Fac'], 0.75, math_n(nt, 'MULTIPLY', rad.outputs[0], 0.35))
    icol = ramp(nt, ifac, [(0.25 + i * 0.5 / max(1, len(iris_cols) - 1), c) for i, c in enumerate(iris_cols)])
    # limbal ring darkening + pupil collar
    limb = N(nt, 'ShaderNodeMapRange', ins={'From Min': iris - 0.08, 'From Max': iris, 'To Min': 1, 'To Max': 0.25})
    L(nt, rr, limb.inputs['Value'])
    collar = N(nt, 'ShaderNodeMapRange', ins={'From Min': pupil, 'From Max': pupil + 0.06, 'To Min': 0.5, 'To Max': 1})
    L(nt, rr, collar.inputs['Value'])
    ic = mix_col(nt, 1.0, icol.outputs[0], limb.outputs[0], 'MULTIPLY')
    ic = mix_col(nt, 1.0, ic, collar.outputs[0], 'MULTIPLY')
    in_iris = math_n(nt, 'LESS_THAN', rf, iris)
    in_pup = math_n(nt, 'LESS_THAN', rf, pupil)
    c = mix_col(nt, in_iris, sc_col, ic)
    c = mix_col(nt, in_pup, c, (0.005, 0.004, 0.004))
    L(nt, c, bs.inputs['Base Color'])
    # slight bump on veins + iris fibres
    h = math_n(nt, 'MULTIPLY_ADD', fib.outputs['Fac'], math_n(nt, 'MULTIPLY', in_iris, 0.4), math_n(nt, 'MULTIPLY', vmask, 0.3))
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.25, 'Distance': 0.01})
    L(nt, h, bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def metal_mat(name, base=(0.25, 0.22, 0.2), rust=(0.33, 0.12, 0.04), scale=6, rough=0.45):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Specular IOR Level': 0.5})
    L(nt, bs.outputs[0], out.inputs['Surface'])
    tc = N(nt, 'ShaderNodeTexCoord')
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': scale, 'Detail': 12, 'Roughness': 0.65})
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    rk = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.48, 'From Max': 0.62})
    L(nt, nz.outputs['Fac'], rk.inputs['Value'])
    fn = N(nt, 'ShaderNodeTexNoise', ins={'Scale': scale * 15, 'Detail': 4})
    L(nt, tc.outputs['Object'], fn.inputs['Vector'])
    grime = ramp(nt, fn.outputs['Fac'], [(0.3, (0.6, 0.6, 0.6)), (0.7, (1.1, 1.05, 1.0))])
    c = mix_col(nt, rk.outputs[0], base, rust)
    c = mix_col(nt, 1.0, c, grime.outputs[0], 'MULTIPLY')
    L(nt, c, bs.inputs['Base Color'])
    met = math_n(nt, 'SUBTRACT', 0.85, math_n(nt, 'MULTIPLY', rk.outputs[0], 0.8))
    L(nt, met, bs.inputs['Metallic'])
    ro = math_n(nt, 'ADD', rough, math_n(nt, 'MULTIPLY', rk.outputs[0], 0.4))
    L(nt, ro, bs.inputs['Roughness'])
    h = math_n(nt, 'MULTIPLY_ADD', fn.outputs['Fac'], 0.3, rk.outputs[0])
    bp = N(nt, 'ShaderNodeBump', ins={'Strength': 0.5, 'Distance': 0.02})
    L(nt, h, bp.inputs['Height'])
    L(nt, bp.outputs[0], bs.inputs['Normal'])
    return m

def simple_mat(name, col, rough=0.5, metal=0.0, emit=None, emit_str=0.0, coat=0.0, alpha=1.0):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Base Color': col + (1,), 'Roughness': rough,
          'Metallic': metal, 'Coat Weight': coat, 'Alpha': alpha})
    if emit:
        bs.inputs['Emission Color'].default_value = emit + (1,)
        bs.inputs['Emission Strength'].default_value = emit_str
    L(nt, bs.outputs[0], out.inputs['Surface'])
    return m

def hair_mat(name, c1, c2, rough=0.35):
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    hi = N(nt, 'ShaderNodeHairInfo')
    rnd = N(nt, 'ShaderNodeMath', operation='MULTIPLY_ADD')
    L(nt, hi.outputs['Random'], rnd.inputs[0]); rnd.inputs[1].default_value = 0.6
    L(nt, hi.outputs['Intercept'], rnd.inputs[2])
    col = ramp(nt, rnd.outputs[0], [(0.1, c1), (0.9, c2)])
    bs = N(nt, 'ShaderNodeBsdfPrincipled', ins={'Roughness': rough, 'Specular IOR Level': 0.6, 'Coat Weight': 0.2})
    L(nt, col.outputs[0], bs.inputs['Base Color'])
    L(nt, bs.outputs[0], out.inputs['Surface'])
    return m

def smoke_mat(name, color=(0.7, 0.72, 0.78), density=3.0, scale=2.2, rise=None, emit=None, emit_str=0.0):
    """Volumetric plume: object-space z 0..1 bottom..top. rise=(frames, amount) animates noise."""
    m, nt = mat(name)
    out = N(nt, 'ShaderNodeOutputMaterial')
    pv = N(nt, 'ShaderNodeVolumePrincipled', ins={'Color': color + (1,), 'Anisotropy': 0.25})
    if emit:
        pv.inputs['Emission Color'].default_value = emit + (1,)
    L(nt, pv.outputs[0], out.inputs['Volume'])
    tc = N(nt, 'ShaderNodeTexCoord')
    mp = N(nt, 'ShaderNodeMapping')
    L(nt, tc.outputs['Generated'], mp.inputs['Vector'])
    nz = N(nt, 'ShaderNodeTexNoise', noise_dimensions='4D', ins={'Scale': scale * 1.6, 'Detail': 8, 'Roughness': 0.65, 'Distortion': 1.4})
    L(nt, mp.outputs[0], nz.inputs['Vector'])
    if rise:
        frames, amt = rise
        mp.inputs['Location'].default_value = (0, 0, 0)
        mp.inputs['Location'].keyframe_insert('default_value', frame=1)
        mp.inputs['Location'].default_value = (0, 0, -amt)
        mp.inputs['Location'].keyframe_insert('default_value', frame=frames)
        nz.inputs['W'].default_value = 0
        nz.inputs['W'].keyframe_insert('default_value', frame=1)
        nz.inputs['W'].default_value = frames / 60
        nz.inputs['W'].keyframe_insert('default_value', frame=frames)
        linear(m.node_tree)
    sx = N(nt, 'ShaderNodeSeparateXYZ')
    L(nt, tc.outputs['Generated'], sx.inputs[0])
    # radial falloff from centre (0.5,0.5)
    cen = N(nt, 'ShaderNodeVectorMath', operation='DISTANCE')
    L(nt, tc.outputs['Generated'], cen.inputs[0])
    cmb = N(nt, 'ShaderNodeCombineXYZ', ins={'X': 0.5, 'Y': 0.5})
    L(nt, sx.outputs['Z'], cmb.inputs['Z'])
    L(nt, cmb.outputs[0], cen.inputs[1])
    radial = N(nt, 'ShaderNodeMapRange', ins={'From Max': 0.0})
    L(nt, cen.outputs['Value'], radial.inputs['Value'])
    L(nt, math_n(nt, 'MULTIPLY_ADD', sx.outputs['Z'], 0.38, 0.08), radial.inputs['From Min'])
    vert = N(nt, 'ShaderNodeMapRange', ins={'From Min': 1.0, 'From Max': 0.35})
    L(nt, sx.outputs['Z'], vert.inputs['Value'])
    base = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 0.05})
    L(nt, sx.outputs['Z'], base.inputs['Value'])
    d = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.47, 'From Max': 0.68})
    L(nt, nz.outputs['Fac'], d.inputs['Value'])
    dd = math_n(nt, 'MULTIPLY', d.outputs[0], radial.outputs[0])
    dd = math_n(nt, 'MULTIPLY', dd, vert.outputs[0])
    dd = math_n(nt, 'MULTIPLY', dd, base.outputs[0])
    L(nt, math_n(nt, 'MULTIPLY', dd, density), pv.inputs['Density'])
    if emit:
        L(nt, math_n(nt, 'MULTIPLY', dd, emit_str), pv.inputs['Emission Strength'])
    return m

def linear(idblock):
    ad = getattr(idblock, 'animation_data', None)
    if not ad or not ad.action:
        return
    for fc in fcurves_of(ad.action):
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'

def fcurves_of(action):
    try:
        return list(action.fcurves)
    except Exception:
        out = []
        for layer in action.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out.extend(cb.fcurves)
        return out

# ---------------------------------------------------------------- world
def world_nebula(c1=(0.12, 0.03, 0.2), c2=(0.35, 0.12, 0.28), strength=1.0, stars=True, scale=1.8, horizon=None):
    w = bpy.data.worlds.new('W')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = N(nt, 'ShaderNodeOutputWorld')
    bg = N(nt, 'ShaderNodeBackground', ins={'Strength': strength})
    L(nt, bg.outputs[0], out.inputs[0])
    tc = N(nt, 'ShaderNodeTexCoord')
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': scale, 'Detail': 12, 'Roughness': 0.6, 'Distortion': 0.8})
    L(nt, tc.outputs['Generated'], nz.inputs['Vector'])
    neb = ramp(nt, nz.outputs['Fac'], [(0.38, (0, 0, 0)), (0.55, c1), (0.72, c2), (0.85, tuple(min(1, x * 1.8) for x in c2))])
    col = neb.outputs[0]
    if stars:
        vr = N(nt, 'ShaderNodeTexVoronoi', ins={'Scale': 260})
        L(nt, tc.outputs['Generated'], vr.inputs['Vector'])
        st = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.06, 'From Max': 0.0, 'To Max': 6.0})
        L(nt, vr.outputs['Distance'], st.inputs['Value'])
        sel = math_n(nt, 'GREATER_THAN', N(nt, 'ShaderNodeSeparateColor').outputs[0] if False else vr.outputs['Color'], 0.0)
        cut = N(nt, 'ShaderNodeSeparateColor')
        L(nt, vr.outputs['Color'], cut.inputs[0])
        keep = math_n(nt, 'GREATER_THAN', cut.outputs[0], 0.82)
        sv = math_n(nt, 'MULTIPLY', st.outputs[0], keep)
        col = mix_col(nt, 1.0, col, N(nt, 'ShaderNodeCombineColor').outputs[0] if False else col, 'MIX')
        add = N(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='ADD')
        add.inputs['Factor'].default_value = 1
        L(nt, col, add.inputs[6])
        cc = N(nt, 'ShaderNodeCombineColor')
        L(nt, sv, cc.inputs[0]); L(nt, sv, cc.inputs[1]); L(nt, sv, cc.inputs[2])
        L(nt, cc.outputs[0], add.inputs[7])
        col = add.outputs[2]
    if horizon:
        sx = N(nt, 'ShaderNodeSeparateXYZ')
        L(nt, tc.outputs['Generated'], sx.inputs[0])
        hz = ramp(nt, sx.outputs['Z'], horizon)
        col = mix_col(nt, 1.0, col, hz.outputs[0], 'ADD')
    L(nt, col, bg.inputs['Color'])
    return w

def world_dusk(stops, clouds=0.5, strength=1.0):
    w = bpy.data.worlds.new('W')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = N(nt, 'ShaderNodeOutputWorld')
    bg = N(nt, 'ShaderNodeBackground', ins={'Strength': strength})
    L(nt, bg.outputs[0], out.inputs[0])
    tc = N(nt, 'ShaderNodeTexCoord')
    sx = N(nt, 'ShaderNodeSeparateXYZ')
    L(nt, tc.outputs['Generated'], sx.inputs[0])
    sk = ramp(nt, sx.outputs['Z'], stops)
    mp = N(nt, 'ShaderNodeMapping', ins={'Scale': (1, 1, 5)})
    L(nt, tc.outputs['Generated'], mp.inputs['Vector'])
    nz = N(nt, 'ShaderNodeTexNoise', ins={'Scale': 2.5, 'Detail': 10, 'Roughness': 0.6})
    L(nt, mp.outputs[0], nz.inputs['Vector'])
    cl = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.5, 'From Max': 0.75, 'To Max': clouds})
    L(nt, nz.outputs['Fac'], cl.inputs['Value'])
    hband = N(nt, 'ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 0.35, 'To Min': 1, 'To Max': 0})
    L(nt, sx.outputs['Z'], hband.inputs['Value'])
    cf = math_n(nt, 'MULTIPLY', cl.outputs[0], hband.outputs[0])
    c = mix_col(nt, cf, sk.outputs[0], (0.04, 0.03, 0.05))
    L(nt, c, bg.inputs['Color'])
    return w

# ---------------------------------------------------------------- geometry
def link_obj(o):
    bpy.context.scene.collection.objects.link(o)
    return o

def assign(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)

def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True

def sphere(name, loc=(0, 0, 0), r=1.0, scale=(1, 1, 1), seg=64, rings=32, m=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    bm.to_mesh(me)
    bm.free()
    o = link_obj(bpy.data.objects.new(name, me))
    o.location = loc
    o.scale = scale
    smooth(o)
    if m:
        assign(o, m)
    return o

def displace(o, strength=0.2, size=0.6, kind='CLOUDS', subdiv=2, midlevel=0.5, depth=2):
    if subdiv:
        sm = o.modifiers.new('sub', 'SUBSURF')
        sm.levels = sm.render_levels = subdiv
    t = bpy.data.textures.new(o.name + 'tx', kind)
    if kind == 'CLOUDS':
        t.noise_scale = size
        t.noise_depth = depth
    elif kind == 'VORONOI':
        t.noise_scale = size
        t.distance_metric = 'DISTANCE'
    d = o.modifiers.new('disp', 'DISPLACE')
    d.texture = t
    d.strength = strength
    d.mid_level = midlevel
    d.texture_coords = 'LOCAL'
    return d

def cylinder(name, loc, r, h, m=None, seg=32, cap=True):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, segments=seg, radius1=r, radius2=r, depth=h)
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new(name, me))
    o.location = (loc[0], loc[1], loc[2] + h / 2)
    smooth(o)
    if m: assign(o, m)
    return o

def cone(name, loc, r1, r2, h, m=None, seg=24):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new(name, me))
    o.location = loc
    smooth(o)
    if m: assign(o, m)
    return o

def torus(name, loc, R, r, m=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, major_segments=48, minor_segments=12)
    o = bpy.context.active_object
    o.name = name
    smooth(o)
    if m: assign(o, m)
    return o

def tube(name, pts, r0, r1, m=None, res=4, bevel_res=6, radii=None):
    """Tapered tube along a list of points."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 1.0
    cu.bevel_resolution = bevel_res
    cu.resolution_u = res
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    n = len(pts)
    for i, p in enumerate(pts):
        t = i / (n - 1)
        sp.points[i].co = (p[0], p[1], p[2], 1)
        sp.points[i].radius = radii[i] if radii else r0 + (r1 - r0) * t
    sp.use_endpoint_u = True
    sp.order_u = 4
    o = link_obj(bpy.data.objects.new(name, cu))
    if m:
        cu.materials.append(m)
    return o

def walk(start, direction, n, step, wander=0.35, gravity=0.0, seed=None):
    rnd = random.Random(seed)
    p = Vector(start)
    d = Vector(direction).normalized()
    pts = [tuple(p)]
    for i in range(n - 1):
        d = (d + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * wander + Vector((0, 0, -gravity))).normalized()
        p = p + d * step
        pts.append(tuple(p))
    return pts

def empty(name, loc=(0, 0, 0)):
    o = link_obj(bpy.data.objects.new(name, None))
    o.location = loc
    return o

def parent(child, par):
    bpy.context.view_layer.update()
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()

def aim(o, target):
    d = Vector(target) - Vector(o.location)
    o.rotation_mode = 'XYZ'
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()

def noise_anim(o, path, idx, strength, scale=40, phase=None):
    o.keyframe_insert(path, index=idx, frame=1)
    ad = o.animation_data
    for fc in fcurves_of(ad.action):
        if fc.data_path == path and fc.array_index == idx:
            md = fc.modifiers.new('NOISE')
            md.strength = strength
            md.scale = scale
            md.phase = phase if phase is not None else random.uniform(0, 100)

# ---------------------------------------------------------------- eye rig
def lid_mesh(name, upper=True, r=1.07, thick=0.08):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=r)
    kill = [v for v in bm.verts if (v.co.y < -0.001 if upper else v.co.y > 0.001)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new(name, me))
    s = o.modifiers.new('sol', 'SOLIDIFY')
    s.thickness = thick
    s.offset = 1
    sb = o.modifiers.new('sub', 'SUBSURF')
    sb.levels = sb.render_levels = 1
    smooth(o)
    return o

def eye(name, loc, r, look_at, iris_cols, lid_m=None, spiral=False, open_up=-42, open_dn=38,
        pupil=0.17, iris=0.44, veins=1.0, sclera=(0.74, 0.62, 0.48), lids=True):
    """Socket empty aimed at look_at. Children: ball (rotate for gaze), upper/lower lids."""
    sock = empty(name + '_sock', loc)
    aim(sock, look_at)
    sock.scale = (r, r, r)
    ball = sphere(name + '_ball', (0, 0, 0), 1.0, seg=64, rings=40,
                  m=eye_mat(name + '_em', iris_cols, spiral=spiral, pupil=pupil, iris=iris, veins=veins, sclera=sclera))
    ball.parent = sock
    ball.rotation_mode = 'XYZ'
    rig = {'sock': sock, 'ball': ball}
    if lids and lid_m:
        up = lid_mesh(name + '_lu', True)
        dn = lid_mesh(name + '_ld', False)
        for l in (up, dn):
            assign(l, lid_m)
            l.parent = sock
            l.rotation_mode = 'XYZ'
        up.rotation_euler = (math.radians(open_up), 0, 0)
        dn.rotation_euler = (math.radians(open_dn), 0, 0)
        rig.update(up=up, dn=dn, open_up=open_up, open_dn=open_dn)
    return rig

def gaze(rig, frame, yaw, pitch):
    """yaw/pitch in degrees relative to socket direction."""
    b = rig['ball']
    b.rotation_euler = (math.radians(-pitch), math.radians(yaw), 0)
    b.keyframe_insert('rotation_euler', frame=frame)

def lid_key(rig, frame, closed):
    """closed 0..1"""
    if 'up' not in rig:
        return
    u = rig['open_up'] * (1 - closed) + 2 * closed
    d = rig['open_dn'] * (1 - closed) - 2 * closed
    rig['up'].rotation_euler = (math.radians(u), 0, 0)
    rig['up'].keyframe_insert('rotation_euler', frame=frame)
    rig['dn'].rotation_euler = (math.radians(d), 0, 0)
    rig['dn'].keyframe_insert('rotation_euler', frame=frame)

def blink(rig, f):
    lid_key(rig, f, 0); lid_key(rig, f + 2, 1); lid_key(rig, f + 4, 1); lid_key(rig, f + 7, 0)

def darts(rig, frames, seed=1, amp=(25, 12), hold=(10, 30)):
    rnd = random.Random(seed)
    f = 1
    gaze(rig, 1, 0, 0)
    while f < frames:
        f2 = f + rnd.randint(*hold)
        gaze(rig, f2, rnd.uniform(-amp[0], amp[0]), rnd.uniform(-amp[1], amp[1]))
        gaze(rig, f2 + rnd.randint(2, 4), *[0, 0]) if False else None
        # quick saccade: hold old value, then jump
        b = rig['ball']
        f = f2
    # make saccades snappy
    for fc in fcurves_of(rig['ball'].animation_data.action):
        for k in fc.keyframe_points:
            k.interpolation = 'BACK'
            k.easing = 'EASE_OUT'

# ---------------------------------------------------------------- hair
def fur(o, mname, count=2000, length=0.3, children=12, rough=0.05, frizz=0.15,
        root=1.0, tip=0.0, radius=0.004, clump=0.0, normal=1.0, rand=0.2, steps=4, vgroup=None, seed=0):
    md = o.modifiers.new('fur', 'PARTICLE_SYSTEM')
    ps = o.particle_systems[-1]
    ps.seed = seed
    s = ps.settings
    s.type = 'HAIR'
    s.use_advanced_hair = ADV
    s.count = count
    s.hair_length = length
    s.hair_step = steps
    s.normal_factor = normal * length / 4.0
    s.factor_random = rand * length / 4.0
    s.emit_from = 'FACE'
    s.use_emit_random = True
    s.child_type = 'INTERPOLATED' if children else 'NONE'
    s.rendered_child_count = children
    s.child_percent = max(1, min(children, 4))
    s.roughness_1 = rough
    s.roughness_1_size = 1.0
    s.roughness_2 = frizz
    s.roughness_2_size = 0.5
    s.roughness_endpoint = 0.0
    s.clump_factor = clump
    s.root_radius = root
    s.tip_radius = tip
    s.radius_scale = radius
    s.display_step = 3
    s.render_step = 3
    if mname not in [m.name for m in o.data.materials]:
        pass
    s.material_slot = mname
    if vgroup:
        ps.vertex_group_density = vgroup
    return ps

def add_mat_slot(o, m):
    o.data.materials.append(m)

# ---------------------------------------------------------------- lights / camera
def camera(loc, target, lens=50, dof=None, fstop=2.8):
    cd = bpy.data.cameras.new('Cam')
    cd.lens = lens
    cd.clip_start = 0.05
    cd.clip_end = 500
    c = link_obj(bpy.data.objects.new('Cam', cd))
    c.location = loc
    t = empty('CamTarget', target)
    tr = c.constraints.new('TRACK_TO')
    tr.target = t
    tr.track_axis = 'TRACK_NEGATIVE_Z'
    tr.up_axis = 'UP_Y'
    bpy.context.scene.camera = c
    if dof is not None:
        cd.dof.use_dof = True
        cd.dof.focus_distance = dof
        cd.dof.aperture_fstop = fstop
    return c, t

def key_loc(o, f, loc):
    o.location = loc
    o.keyframe_insert('location', frame=f)

def light(kind, loc, energy, color=(1, 1, 1), size=1.0, target=None, angle=None):
    ld = bpy.data.lights.new(kind, kind)
    ld.energy = energy
    ld.color = color
    if kind == 'AREA':
        ld.size = size
    elif kind in ('POINT', 'SPOT'):
        ld.shadow_soft_size = size
    elif kind == 'SUN':
        ld.angle = math.radians(angle or 3)
    o = link_obj(bpy.data.objects.new(kind, ld))
    o.location = loc
    if target is not None:
        aim_neg(o, target)
    return o

def aim_neg(o, target):
    d = Vector(target) - Vector(o.location)
    o.rotation_mode = 'XYZ'
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- scenery
def ground(size=80, m=None, strength=0.6, noise=3.0, z=0.0, sub=6):
    me = bpy.data.meshes.new('ground')
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size / 2)
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new('ground', me))
    o.location = (0, 0, z)
    sm = o.modifiers.new('sub', 'SUBSURF')
    sm.subdivision_type = 'SIMPLE'
    sm.levels = sm.render_levels = sub
    t = bpy.data.textures.new('gtx', 'CLOUDS')
    t.noise_scale = noise
    d = o.modifiers.new('disp', 'DISPLACE')
    d.texture = t
    d.strength = strength
    smooth(o)
    if m: assign(o, m)
    return o

def factory(cx, cy, n, seed, metal, area=6.0, hmin=1.5, hmax=6.0, smoke_m=None, smokes=2, scale=1.0, tanks=3, pipes=None):
    rnd = random.Random(seed)
    tops = []
    objs = []
    for i in range(n):
        x = cx + rnd.uniform(-area, area)
        y = cy + rnd.uniform(-area * 0.6, area * 0.6)
        h = rnd.uniform(hmin, hmax) * scale
        r = rnd.uniform(0.12, 0.35) * scale
        c = cylinder('stack%d' % i, (x, y, 0), r, h, metal, seg=20)
        objs.append(c)
        for k in range(rnd.randint(1, 4)):
            torus('ring%d_%d' % (i, k), (x, y, rnd.uniform(0.2, 0.95) * h), r * 1.12, r * 0.12, metal)
        if rnd.random() < 0.5:
            cone('cap%d' % i, (x, y, h), r * 1.25, r * 0.7, r * 0.6, metal)
        tops.append((x, y, h, r))
    for i in range(tanks):
        x = cx + rnd.uniform(-area, area); y = cy + rnd.uniform(-area * 0.5, area * 0.5)
        rr = rnd.uniform(0.5, 1.1) * scale
        sphere('tank%d' % i, (x, y, rr * 0.8), rr, (1, 1, 0.85), seg=32, rings=16, m=metal)
        cylinder('tleg%d' % i, (x, y, 0), rr * 0.5, rr * 0.4, metal, seg=16)
    # pipes
    for i in range(n if pipes is None else pipes):
        a = tops[rnd.randrange(len(tops))]; b = tops[rnd.randrange(len(tops))]
        if a is b or math.hypot(a[0] - b[0], a[1] - b[1]) > 4:
            continue
        hz = rnd.uniform(0.3, 0.8) * scale
        tube('pipe%d' % i, [(a[0], a[1], hz), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, hz + 0.3), (b[0], b[1], hz)], 0.05 * scale, 0.05 * scale, metal)
    plumes = []
    if smoke_m:
        tall = sorted(tops, key=lambda t: -t[2])[:smokes]
        for (x, y, h, r) in tall:
            plumes.append(plume((x, y, h), r, smoke_m, height=h * 0.9 + 3))
    return tops, plumes

def plume(base, r, m, height=5.0, lean=(0.8, 0.3)):
    me = bpy.data.meshes.new('plume')
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.5))
    bm.to_mesh(me); bm.free()
    o = link_obj(bpy.data.objects.new('plume', me))
    o.location = (base[0], base[1], base[2] - 0.05)
    w = max(1.2, r * 6)
    o.scale = (w, w, height)
    o.rotation_euler = (math.radians(lean[1] * 10), math.radians(lean[0] * 10), 0)
    assign(o, m)
    return o

def weeds(n, area, seed, m, z=0.0, hmin=0.4, hmax=1.8, center=(0, 0), exclude=0.0):
    rnd = random.Random(seed)
    for i in range(n):
        x = center[0] + rnd.uniform(-area, area); y = center[1] + rnd.uniform(-area, area)
        if math.hypot(x - center[0], y - center[1]) < exclude:
            continue
        h = rnd.uniform(hmin, hmax)
        pts = walk((x, y, z - 0.1), (rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), 1), 6, h / 5, 0.15, seed=rnd.random())
        tube('weed%d' % i, pts, 0.025, 0.004, m, res=3, bevel_res=2)
        for k in range(rnd.randint(2, 5)):
            j = rnd.randint(1, 4)
            p = pts[j]
            lp = walk(p, (rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0.6), 4, h / 8, 0.2, seed=rnd.random())
            tube('leaf%d_%d' % (i, k), lp, 0.018, 0.002, m, res=3, bevel_res=2)
