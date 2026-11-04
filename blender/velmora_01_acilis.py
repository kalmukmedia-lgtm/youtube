"""
Velmora — Sahne 01: Açılış manzarası
=====================================
Kullanım (Blender bilmeden):
  1. Blender'ı aç, açılış penceresinde "General" (Genel) seç.
  2. Üstteki sekmelerden "Scripting" sekmesine tıkla.
  3. Ortadaki metin alanında "+ New" (Yeni) düğmesine bas.
  4. Bu dosyanın tamamını kopyalayıp oraya yapıştır.
  5. Sağ üstteki ▶ (Run Script) düğmesine bas. Sahne birkaç saniyede kurulur.
  6. Önizleme: üstteki "Layout" sekmesine dön, imleç 3D alanın üzerindeyken
     Z tuşuna basıp "Rendered" seç. Animasyonu oynatmak için boşluk tuşu.
  7. Video çıkarmak: üst menü Render > Render Animation (Ctrl+F12).
     Dosya, aşağıdaki OUTPUT klasörüne velmora-world.mp4 olarak yazılır.

Sahne: sisli vadiler, dağlar, parlayan nehir, yüzen adalar, ufukta yedi kule,
mor gökyüzünde iki ay. Kamera 10 saniye boyunca vadinin üzerinden kulelere doğru süzülür.
"""
import math
import os
import random

import bpy

# ---------------- Ayarlar ----------------
OUTPUT = os.path.join(os.path.expanduser("~"), "Desktop", "velmora", "velmora-world")
SECONDS = 10
FPS = 30
QUALITY = "final"  # "taslak" = hızlı deneme, "final" = yüksek kalite
random.seed(7)

# ---------------- Temizlik ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = SECONDS * FPS
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080


def material(name, color, emission=0.0, roughness=0.8, emit_color=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = (*(emit_color or color), 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def displace(obj, size, strength, detail=6, seed=0):
    tex = bpy.data.textures.new(f"{obj.name}_noise", type="CLOUDS")
    tex.noise_scale = size
    tex.noise_depth = detail
    mod = obj.modifiers.new("Displace", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.35
    if seed:
        obj.location.x += 0  # gürültü konumu nesne konumuna bağlı; tohum için doku koordinatı kaydırılır
        mod.texture_coords = "GLOBAL"


# ---------------- Arazi ----------------
bpy.ops.mesh.primitive_grid_add(x_subdivisions=400, y_subdivisions=400, size=400)
land = bpy.context.active_object
land.name = "Velmora_Arazi"
displace(land, size=1.4, strength=38)
# Ortadaki vadiyi aç: kenarlar yüksek dağ, orta alçak
for v in land.data.vertices:
    d = abs(v.co.x) / 200
    v.co.z += (d ** 1.6) * 60 - 6
land.modifiers.new("Yumusat", "SUBSURF").levels = 1
bpy.ops.object.shade_smooth()
land.data.materials.append(material("Cimen_Kaya", (0.05, 0.09, 0.07), roughness=0.95))

# ---------------- Parlayan nehir / su ----------------
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 2))
water = bpy.context.active_object
water.name = "Oz_Nehri"
water.data.materials.append(material("Oz_Suyu", (0.05, 0.25, 0.35), emission=1.2, roughness=0.05, emit_color=(0.2, 0.7, 0.9)))

# ---------------- Yedi Kule ----------------
tower_colors = [(0.9, 0.2, 0.2), (0.25, 0.45, 1.0), (0.2, 0.9, 0.4), (0.6, 0.25, 1.0), (1.0, 0.65, 0.2), (0.85, 0.85, 1.0), (0.5, 0.9, 0.95)]
for i, col in enumerate(tower_colors):
    ang = (i - 3) * 0.16
    x, y = math.sin(ang) * 40, 170 + math.cos(ang) * 10
    h = 70 + random.uniform(-8, 14)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.2, depth=h, location=(x, y, h / 2))
    t = bpy.context.active_object
    t.name = f"Kule_{i + 1}"
    t.data.materials.append(material(f"Kule_Tas_{i}", (0.12, 0.11, 0.16), roughness=0.6))
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=4.2, depth=12, location=(x, y, h + 6))
    bpy.context.active_object.data.materials.append(material(f"Kule_Cati_{i}", (0.08, 0.07, 0.1)))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=2.2, location=(x, y, h + 15))
    bpy.context.active_object.data.materials.append(material(f"Kristal_{i}", col, emission=25, roughness=0.1))

# ---------------- Yüzen adalar ----------------
for i in range(9):
    loc = (random.uniform(-90, 90), random.uniform(40, 150), random.uniform(45, 85))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=random.uniform(4, 9), location=loc)
    isl = bpy.context.active_object
    isl.name = f"Yuzen_Ada_{i + 1}"
    isl.scale.z = 0.55
    displace(isl, size=0.6, strength=2.5)
    bpy.ops.object.shade_smooth()
    isl.data.materials.append(material("Ada_Kaya", (0.1, 0.12, 0.09)))

# ---------------- İki ay ----------------
for name, loc, r, col in [("Ay_Gumus", (-120, 380, 150), 22, (0.85, 0.88, 1.0)), ("Ay_Mor", (90, 420, 115), 13, (0.75, 0.55, 1.0))]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r, location=loc)
    m = bpy.context.active_object
    m.name = name
    m.data.materials.append(material(name, col, emission=6))

# ---------------- Gökyüzü ve sis ----------------
world = bpy.data.worlds.new("Velmora_Gok")
scene.world = world
world.use_nodes = True
nt = world.node_tree
bg = nt.nodes["Background"]
grad = nt.nodes.new("ShaderNodeTexGradient")
coord = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(coord.outputs["Generated"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
ramp.color_ramp.elements[0].position = 0.5
ramp.color_ramp.elements[0].color = (0.35, 0.18, 0.45, 1)   # ufuk: sıcak mor
ramp.color_ramp.elements[1].position = 0.75
ramp.color_ramp.elements[1].color = (0.02, 0.02, 0.08, 1)   # tepe: koyu lacivert
nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.2
grad.location = (-600, 0)
# Hafif hacimsel sis (vadide derinlik hissi)
vol = nt.nodes.new("ShaderNodeVolumePrincipled")
vol.inputs["Density"].default_value = 0.0025
vol.inputs["Color"].default_value = (0.6, 0.5, 0.8, 1)
nt.links.new(vol.outputs[0], nt.nodes["World Output"].inputs["Volume"])

# Ay ışığı
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(60), 0, math.radians(200)))
sun = bpy.context.active_object
sun.data.energy = 2.0
sun.data.color = (0.75, 0.75, 1.0)

# ---------------- Kamera uçuşu ----------------
bpy.ops.object.camera_add()
cam = bpy.context.active_object
scene.camera = cam
cam.data.lens = 28
target = bpy.data.objects.new("Kamera_Hedefi", None)
scene.collection.objects.link(target)
target.location = (0, 170, 55)
track = cam.constraints.new("TRACK_TO")
track.target = target
track.track_axis, track.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
for frame, loc in [(1, (0, -150, 30)), (scene.frame_end, (0, 40, 42))]:
    cam.location = loc
    cam.keyframe_insert("location", frame=frame)

# ---------------- Render ayarları ----------------
engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
eevee = scene.eevee
eevee.taa_render_samples = 16 if QUALITY == "taslak" else 64
for attr in ("use_bloom", "use_raytracing", "use_volumetric_shadows"):
    if hasattr(eevee, attr):
        setattr(eevee, attr, True)
if hasattr(eevee, "volumetric_tile_size"):
    eevee.volumetric_tile_size = "8"
scene.view_settings.view_transform = "AgX" if "AgX" in [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
scene.view_settings.look = "None"
if QUALITY == "taslak":
    scene.render.resolution_percentage = 50

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
scene.render.filepath = OUTPUT
try:
    scene.render.image_settings.media_type = "VIDEO"  # Blender 5.x
except (AttributeError, TypeError):
    pass
scene.render.image_settings.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "HIGH"

print("✅ Velmora açılış sahnesi kuruldu. Render > Render Animation ile videoyu al.")
