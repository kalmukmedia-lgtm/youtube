# Metaficta — Video Üretim Hattı

**Metaficta** ([youtube.com/@Metaficta](https://www.youtube.com/@Metaficta)) için konu → araştırma → senaryo → video
zincirini otomatikleştiren sistem. Konsept: kadim tarih, tanrılar ve mitoloji, göksel varlıklar, evren ve gelecek.
Videolar [Remotion](https://www.remotion.dev) ile koddan üretilir; senaryolar Claude ile yazılır.

## Kurulum

Gereksinimler: Node.js 20+, [pnpm](https://pnpm.io) 10+.

```bash
pnpm install
cp .env.example .env      # ANTHROPIC_API_KEY'i doldur
```

## Kullanım

```bash
# 1) Senaryo üret (web araştırması + taslak + editör revizyonu)
pnpm yt new "Zeus vs Odin — kim kazanırdı?" --series gods-battle
pnpm yt new "Odin neden tek gözlü?" --format short --series did-you-know
pnpm yt new "Göbeklitepe'nin sırrı" --series lost-civilizations --shorts 3   # + 3 Shorts

# 2) Senaryoyu oku: projects/<proje>/script.md
#    Gerekirse projects/<proje>/script.json'u düzenle, sonra önizlemeyi yenile:
pnpm yt preview <proje>
pnpm yt approve <proje>

# 3) Görsel kontrol ve render
pnpm yt stills <proje>            # her sahneden bir PNG → projects/<proje>/preview/
pnpm yt render <proje> --draft    # yarım çözünürlükte hızlı taslak
pnpm yt render <proje>            # final MP4 (+ uzun videolar için 3 thumbnail)

# Diğer
pnpm yt list                      # projeler ve durumları
pnpm yt shorts <proje> -c 3       # mevcut uzun videodan Shorts türet
pnpm yt sample                    # API anahtarı olmadan örnek projeler oluştur
pnpm studio                       # Remotion Studio: şablonları tarayıcıda canlı önizle
```

Seriler: `gods-battle`, `pantheon`, `lost-civilizations`, `cosmic-scale`, `future-year`, `top-10`, `did-you-know`, `tier-list`, `standalone`
Temalar: `olympus-gold`, `norse-frost`, `egypt-sand`, `turkic-steppe`, `ancient-sepia`, `cosmic-void`, `future-neon`

## Proje klasörü

```
projects/2026-10-03-zeus-vs-odin/
├── script.json     # senaryo (tek kaynak) — elle düzenlenebilir
├── script.md       # okunabilir önizleme + doğrulanacak iddialar + onay listesi
├── research.md     # web araştırması özeti ve kaynaklar
├── status.json     # script → approved → voiced → rendered → uploaded
├── visuals/        # <görsel-id>.png  (Faz 4'te otomatik; şimdilik elle konabilir)
├── audio/          # sahne sesleri + manifest.json (Faz 3)
├── preview/        # yt stills çıktısı
├── render/         # MP4 çıktıları
└── thumbnail/      # thumbnail_v1..v3.png
```

Görsel üretimi gelene kadar `visuals/` klasörüne senaryodaki görsel id'siyle (`zeus-portrait.png` gibi)
dosya koyarsan render'da otomatik kullanılır. Görseli olmayan sahnelerde tema arka planı ve "GÖRSEL BEKLENİYOR" etiketi görünür.

## Yapı

| Paket | İçerik |
|---|---|
| `packages/core` | Senaryo şeması (zod), sahne tipleri, temalar, zaman çizelgesi, önizleme |
| `packages/pipeline` | `yt` komut satırı: Claude ile senaryo üretimi, proje yönetimi, render |
| `packages/video` | Remotion projesi: sahne bileşenleri, efektler, geçişler, thumbnail |
| `config/` | Kanal ayarları ve senaryo stil rehberi |
| `prompts/` | Claude prompt şablonları |

```bash
pnpm test        # birim testler
pnpm typecheck   # tip kontrolü
```

## Dokümanlar

- [Ana plan](docs/PLAN.md)
- [İçerik stratejisi](docs/CONTENT_STRATEGY.md)
- [Remotion mimarisi](docs/REMOTION_ARCHITECTURE.md)
- [Kanal bağlantısı (YouTube API)](docs/CHANNEL_SETUP.md)
