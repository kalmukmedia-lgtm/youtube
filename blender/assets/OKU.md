# Velmora varlıkları (Poly Haven, ücretsiz CC0)

Bu klasördeki dosyaları Blender betiği (`blender/velmora_02_gercekci.py`) otomatik bulur.
**Dosya adları önemli değil, klasör adları önemli.**

```
blender/assets/
├── gokyuzu/      → 1 adet .hdr dosyası (gece gökyüzü)
├── doku_kaya/    → kaya dokusu: _diff_, _rough_, _nor_gl_ içeren 3 resim
├── doku_zemin/   → orman zemini dokusu: aynı 3 resim
├── agaclar/      → her ağaç kendi alt klasöründe: .blend dosyası + textures klasörü
└── kayalar/      → her kaya kendi alt klasöründe: .blend dosyası + textures klasörü
```

Ayrıntılı adımlar sohbette; özet:
- Gökyüzü: polyhaven.com/hdris → Night kategorisi → 2K · HDR
- Dokular: polyhaven.com/textures → rocky_terrain_02 ve forrest_ground_01 → 1K · JPG · Diffuse + Rough + Normal (GL)
- Modeller: polyhaven.com/models → "tree" ve "boulder" arat → 1K · Blend (zip) → zip'i aç
- GitHub web yüklemesinde dosya başına 25 MB sınırı var; 1K seçersen sorun olmaz.
