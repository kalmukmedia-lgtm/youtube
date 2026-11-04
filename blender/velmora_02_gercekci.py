"""
Velmora — Sahne 01 v2: Fotogerçekçi açılış manzarası (Poly Haven, ücretsiz CC0)
================================================================================
Kullanım:
  1. Blender > Scripting > + New > bu dosyanın tamamını yapıştır > ▶ Run Script.
  2. İlk çalıştırmada gerekli dosyalar Poly Haven'dan indirilir (internet gerekir,
     birkaç dakika sürebilir; Blender bu sırada donmuş gibi görünür, bekle).
     Dosyalar Masaüstü/velmora/assets klasörüne kaydedilir; sonraki çalıştırmalar anında açılır.
  3. Layout sekmesi > 3D alanda Z > Rendered ile önizle. Video: Ctrl+F12.
     Çıktı: Masaüstü/velmora/velmora-world.mp4

Konsol: Window > Toggle System Console (Windows) açılırsa neyin indirildiğini görürsün.
Poly Haven varlıkları CC0 lisanslıdır: YouTube dahil her yerde serbestçe kullanılabilir.
"""
import json
import math
import os
import random
import urllib.request

import bpy

# ---------------- Ayarlar ----------------
ROOT = os.path.join(os.path.expanduser("~"), "Desktop", "velmora")
ASSETS = os.path.join(ROOT, "assets")
OUTPUT = os.path.join(ROOT, "velmora-world")
SECONDS = 10
FPS = 30
QUALITY = "taslak"   # "taslak" (hızlı, yarım çözünürlük) veya "final"
ENGINE = "eevee"     # "eevee" (hızlı) veya "cycles" (en gerçekçi, çok daha yavaş)
RES = "2k"           # doku/model çözünürlüğü: "1k" hızlı, "2k" dengeli, "4k" ağır
TREE_COUNT = 2500
ROCK_COUNT = 400
random.seed(7)

API = "https://api.polyhaven.com"
HEADERS = {"User-Agent": "Metaficta-Velmora-Blender/1.0"}


# ---------------- Poly Haven yardımcıları ----------------
def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print("  ↓", os.path.basename(path))
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def pick(kind, words, avoid=(), count=1):
    """Poly Haven listesinden ad/etiket/kategoriye göre varlık seçer (önbellekli)."""
    cache = os.path.join(ASSETS, f"_list_{kind}.json")
    if os.path.exists(cache):
        data = json.load(open(cache, encoding="utf-8"))
    else:
        data = fetch_json(f"{API}/assets?t={kind}")
        os.makedirs(ASSETS, exist_ok=True)
        json.dump(data, open(cache, "w", encoding="utf-8"))
    scored = []
    for aid, info in data.items():
        text = " ".join([aid, info.get("name", "")] + info.get("tags", []) + info.get("categories", [])).lower()
        if any(a in text for a in avoid):
            continue
        score = sum(1 for w in words if w in text)
        if score:
            scored.append((score, info.get("download_count", 0), aid))
    scored.sort(reverse=True)
    return [aid for _, _, aid in scored[:count]]


def get_hdri():
    aid = pick("hdris", ["night", "moon", "dusk", "twilight", "stars"], avoid=["indoor", "studio", "urban", "city"])[0]
    files = fetch_json(f"{API}/files/{aid}")
    url = files["hdri"][RES]["hdr"]["url"]
    return download(url, os.path.join(ASSETS, "hdri", f"{aid}_{RES}.hdr"))


def get_texture(words, avoid=()):
    aid = pick("textures", words, avoid)[0]
    files = fetch_json(f"{API}/files/{aid}")
    maps = {}
    for key, name in (("Diffuse", "diff"), ("Rough", "rough"), ("nor_gl", "nor")):
        if key in files and RES in files[key]:
            fmt = "jpg" if "jpg" in files[key][RES] else next(iter(files[key][RES]))
            maps[name] = download(files[key][RES][fmt]["url"], os.path.join(ASSETS, "textures", aid, f"{aid}_{name}_{RES}.{fmt}"))
    print("  doku:", aid)
    return maps


def get_models(words, avoid=(), count=3):
    objs = []
    for aid in pick("models", words, avoid, count):
        files = fetch_json(f"{API}/files/{aid}")
        blend = files["blend"][RES]["blend"]
        folder = os.path.join(ASSETS, "models", aid)
        path = download(blend["url"], os.path.join(folder, os.path.basename(blend["url"])))
        for rel, inc in blend.get("include", {}).items():
            download(inc["url"], os.path.join(folder, rel))
        with bpy.data.libraries.load(path, link=False) as (src, dst):
            dst.objects = src.objects
        meshes = [o for o in dst.objects if o and o.type == "MESH"]
        if meshes:
            col = bpy.data.collections.new(f"Asset_{aid}")
            for o in meshes:
                col.objects.link(o)
            objs.append(col)
            print("  model:", aid)
    return objs


def safe(label, fn, fallback=None):
    try:
        return fn()
    except Exception as e:  # internet yoksa ya da bir varlık bulunamazsa sahne yine kurulur
        print(f"⚠ {label} atlandı: {e}")
        return fallback


# ---------------- Sahne ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, SECONDS * FPS
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080


def principled(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat, mat.node_tree, mat.node_tree.nodes.get("Principled BSDF")


def set_emission(bsdf, color, strength):
    key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
    bsdf.inputs[key].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = strength


def image_node(nt, path, non_color=False):
    n = nt.nodes.new("ShaderNodeTexImage")
    n.image = bpy.data.images.load(path, check_existing=True)
    if non_color:
        n.image.colorspace_settings.name = "Non-Color"
    return n


def textured_layer(nt, maps, scale):
    """Diffuse/roughness/normal düğümlerini kurar; (renk, pürüzlülük, normal) çıkışlarını döndürür."""
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (scale, scale, scale)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    out = {}
    if "diff" in maps:
        d = image_node(nt, maps["diff"])
        nt.links.new(mapping.outputs[0], d.inputs[0])
        out["color"] = d.outputs["Color"]
    if "rough" in maps:
        r = image_node(nt, maps["rough"], True)
        nt.links.new(mapping.outputs[0], r.inputs[0])
        out["rough"] = r.outputs["Color"]
    if "nor" in maps:
        n = image_node(nt, maps["nor"], True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(mapping.outputs[0], n.inputs[0])
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        out["normal"] = nm.outputs["Normal"]
    return out


# ---- Arazi ----
print("Arazi kuruluyor...")
bpy.ops.mesh.primitive_grid_add(x_subdivisions=500, y_subdivisions=500, size=600)
land = bpy.context.active_object
land.name = "Velmora_Arazi"
tex = bpy.data.textures.new("Arazi_Gurultu", type="CLOUDS")
tex.noise_scale, tex.noise_depth = 1.6, 8
mod = land.modifiers.new("Displace", "DISPLACE")
mod.texture, mod.strength, mod.mid_level = tex, 34, 0.4
bpy.ops.object.modifier_apply(modifier="Displace")
RIVER_Z = 1.0
for v in land.data.vertices:
    side = abs(v.co.x) / 300
    v.co.z += (side ** 1.5) * 95 - 4                # yanlarda yükselen dağlar, ortada vadi
    river = math.exp(-((v.co.x - 12 * math.sin(v.co.y / 40)) ** 2) / 90)
    v.co.z -= river * 9                             # kıvrılan nehir yatağı
bpy.ops.object.shade_smooth()

mat, nt, bsdf = principled("Arazi")
rock = safe("Kaya dokusu", lambda: get_texture(["rock", "cliff", "rocky"], avoid=["wall", "brick", "floor tiles"]), {})
ground = safe("Zemin dokusu", lambda: get_texture(["forest", "ground", "grass", "moss", "leaves"], avoid=["wall", "brick", "floor tiles", "wood"]), {})
r_out, g_out = textured_layer(nt, rock, 0.08), textured_layer(nt, ground, 0.12)
# Eğim maskesi: dik yerler kaya, düz yerler orman zemini
geo = nt.nodes.new("ShaderNodeNewGeometry")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[1].position = 0.72, 0.86
nt.links.new(geo.outputs["Normal"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
mix = nt.nodes.new("ShaderNodeMix")
mix.data_type = "RGBA"
nt.links.new(ramp.outputs["Color"], mix.inputs["Factor"])
mix.inputs[6].default_value = (0.18, 0.17, 0.16, 1)
mix.inputs[7].default_value = (0.05, 0.08, 0.04, 1)
if "color" in r_out:
    nt.links.new(r_out["color"], mix.inputs[6])
if "color" in g_out:
    nt.links.new(g_out["color"], mix.inputs[7])
nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
if "normal" in r_out:
    nt.links.new(r_out["normal"], bsdf.inputs["Normal"])
bsdf.inputs["Roughness"].default_value = 0.9
land.data.materials.append(mat)

# Ağaç/kaya dağıtımı için ağırlık haritası: düz, nehirden uzak, çok yüksek olmayan yerler
forest = land.vertex_groups.new(name="orman")
stones = land.vertex_groups.new(name="kaya")
mesh = land.data
for v in mesh.vertices:
    flat = v.normal.z
    river = math.exp(-((v.co.x - 12 * math.sin(v.co.y / 40)) ** 2) / 200)
    w_forest = max(0.0, (flat - 0.8) * 5) * (1 - river) * (1.0 if v.co.z < 55 else 0.2)
    forest.add([v.index], min(1.0, w_forest), "REPLACE")
    stones.add([v.index], max(0.0, min(1.0, (0.85 - flat) * 4)), "REPLACE")

# ---- Nehir (Öz'ün parıltısı) ----
bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, RIVER_Z))
water = bpy.context.active_object
water.name = "Oz_Nehri"
wm, wnt, wb = principled("Oz_Suyu")
wb.inputs["Base Color"].default_value = (0.02, 0.05, 0.07, 1)
wb.inputs["Roughness"].default_value = 0.03
set_emission(wb, (0.15, 0.6, 0.85), 0.6)
water.data.materials.append(wm)


def scatter(name, collections, group, count, size, size_rand):
    if not collections:
        return
    col = bpy.data.collections.new(f"Dagit_{name}")
    for c in collections:
        for o in c.objects:
            col.objects.link(o) if o.name not in col.objects else None
            o.location = (0, 0, -500)   # kaynak modelleri görünmeyen yere al
    ps_mod = land.modifiers.new(name, "PARTICLE_SYSTEM")
    ps = ps_mod.particle_system
    s = ps.settings
    s.type = "HAIR"
    s.use_advanced_hair = True
    s.count = count
    s.hair_length = 1
    s.render_type = "COLLECTION"
    s.instance_collection = col
    s.use_collection_pick_random = True
    s.particle_size = size
    s.size_random = size_rand
    s.use_rotations = True
    s.rotation_mode = "OB_Z"
    s.phase_factor_random = 2.0
    s.display_percentage = 15
    ps.vertex_group_density = group
    ps.seed = random.randint(0, 9999)


print("Ağaçlar ve kayalar indiriliyor/yerleştiriliyor...")
trees = safe("Ağaç modelleri", lambda: get_models(["tree", "pine", "fir", "spruce"], avoid=["dead", "trunk", "log", "stump", "branch", "palm"], count=3), [])
rocks = safe("Kaya modelleri", lambda: get_models(["rock", "boulder", "stone"], avoid=["wall", "statue", "brick"], count=3), [])
scatter("Orman", trees, "orman", TREE_COUNT, 1.0, 0.5)
scatter("Kayalar", rocks, "kaya", ROCK_COUNT, 2.0, 0.7)

# ---- Yedi Kule (yer tutucu; sonra BlenderKit modelleriyle değiştirilecek) ----
towers = bpy.data.collections.new("Kuleler_YerTutucu")
scene.collection.children.link(towers)
colors = [(0.9, 0.2, 0.2), (0.25, 0.45, 1.0), (0.2, 0.9, 0.4), (0.6, 0.25, 1.0), (1.0, 0.65, 0.2), (0.85, 0.85, 1.0), (0.5, 0.9, 0.95)]
stone_mat, _, sb = principled("Kule_Tas")
sb.inputs["Base Color"].default_value = (0.16, 0.15, 0.17, 1)
sb.inputs["Roughness"].default_value = 0.7
for i, colr in enumerate(colors):
    x, y = (i - 3) * 22, 260 + abs(i - 3) * 8
    h = 90 + random.uniform(-10, 25)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=4, depth=h, location=(x, y, h / 2 + 20))
    t = bpy.context.active_object
    t.data.materials.append(stone_mat)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=5.5, depth=16, location=(x, y, h + 28))
    c = bpy.context.active_object
    c.data.materials.append(stone_mat)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=2.5, location=(x, y, h + 40))
    k = bpy.context.active_object
    km, _, kb = principled(f"Kristal_{i}")
    set_emission(kb, colr, 40)
    k.data.materials.append(km)
    for o in (t, c, k):
        for uc in o.users_collection:
            uc.objects.unlink(o)
        towers.objects.link(o)

# ---- Gökyüzü: gerçek gece HDRI + iki ay ----
world = bpy.data.worlds.new("Velmora_Gok")
scene.world = world
world.use_nodes = True
wnt = world.node_tree
bg = wnt.nodes["Background"]
hdri = safe("Gökyüzü (HDRI)", get_hdri)
if hdri:
    env = wnt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(hdri, check_existing=True)
    wnt.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.6
else:
    bg.inputs["Color"].default_value = (0.03, 0.03, 0.08, 1)
fog = wnt.nodes.new("ShaderNodeVolumePrincipled")
fog.inputs["Density"].default_value = 0.0018
fog.inputs["Color"].default_value = (0.65, 0.6, 0.85, 1)
wnt.links.new(fog.outputs[0], wnt.nodes["World Output"].inputs["Volume"])

for name, loc, r, colr, strength in [("Ay_Gumus", (-160, 700, 240), 34, (0.9, 0.92, 1.0), 8), ("Ay_Mor", (140, 760, 180), 20, (0.78, 0.6, 1.0), 6)]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=r, location=loc)
    m = bpy.context.active_object
    m.name = name
    mm, _, mb = principled(name)
    set_emission(mb, colr, strength)
    m.data.materials.append(mm)

bpy.ops.object.light_add(type="SUN", rotation=(math.radians(62), 0, math.radians(195)))
sun = bpy.context.active_object
sun.name = "Ay_Isigi"
sun.data.energy = 1.6
sun.data.color = (0.7, 0.75, 1.0)
sun.data.angle = math.radians(1.5)

# ---- Kamera uçuşu ----
bpy.ops.object.camera_add()
cam = bpy.context.active_object
scene.camera = cam
cam.data.lens = 32
cam.data.dof.use_dof = False
target = bpy.data.objects.new("Kamera_Hedefi", None)
scene.collection.objects.link(target)
track = cam.constraints.new("TRACK_TO")
track.target, track.track_axis, track.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"
for frame, cl, tl in [(1, (6, -230, 26), (0, 150, 40)), (scene.frame_end, (0, 40, 46), (0, 260, 95))]:
    cam.location, target.location = cl, tl
    cam.keyframe_insert("location", frame=frame)
    target.keyframe_insert("location", frame=frame)

# ---- Render ----
engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
if ENGINE == "cycles":
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64 if QUALITY == "taslak" else 256
    scene.cycles.use_denoising = True
    try:  # AMD ekran kartı (HIP) varsa kullan
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "HIP"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception as e:
        print("GPU ayarlanamadı, CPU kullanılacak:", e)
else:
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    ee = scene.eevee
    ee.taa_render_samples = 32 if QUALITY == "taslak" else 128
    for attr in ("use_raytracing", "use_volumetric_shadows", "use_shadows", "use_bloom"):
        if hasattr(ee, attr):
            setattr(ee, attr, True)
views = [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items]
scene.view_settings.view_transform = "AgX" if "AgX" in views else "Filmic"
scene.render.resolution_percentage = 50 if QUALITY == "taslak" else 100

os.makedirs(ROOT, exist_ok=True)
scene.render.filepath = OUTPUT
try:
    scene.render.image_settings.media_type = "VIDEO"  # Blender 5.x
except (AttributeError, TypeError):
    pass
scene.render.image_settings.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "HIGH"
print("✅ Velmora v2 kuruldu. Önizleme: Z > Rendered. Video: Ctrl+F12 →", OUTPUT + ".mp4")
