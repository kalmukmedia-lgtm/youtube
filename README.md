# Metaficta — Video Üretim Hattı

**Metaficta** ([youtube.com/@Metaficta](https://www.youtube.com/@Metaficta)) için konu → araştırma → senaryo → video
zincirini otomatikleştiren sistem. Konsept: kadim tarih, tanrılar ve mitoloji, göksel varlıklar, evren ve gelecek.
Videolar [Remotion](https://www.remotion.dev) ile koddan üretilir; senaryolar Claude ile yazılır.

## Yönetim paneli (Plesk) + GitHub Actions işçisi

Sistemi tarayıcıdan kullanmak için **panel** Plesk (Windows) hosting'e yüklenir; ağır işler (senaryo, ses, görsel, render)
**GitHub Actions** üzerinde çalışan işçi tarafından yapılır ve sonuçlar panele geri yüklenir.
Kurulum: **[docs/PANEL_SETUP.md](docs/PANEL_SETUP.md)** — panel paketi GitHub Actions → CI → Artifacts'tan indirilir.

| Klasör | İçerik |
|---|---|
| `panel/` | ASP.NET Core 10 + MSSQL yönetim paneli (Razor Pages, EF Core) ve testleri |
| `packages/pipeline/src/worker/` | GitHub Actions işçisi (`pnpm worker --job <id>`) |
| `.github/workflows/worker.yml` | Panelin tetiklediği işçi iş akışı |
| `.github/workflows/ci.yml` | Testler + Windows için panel paketleri |

## Yerel kurulum (komut satırı)

Gereksinimler: Node.js 20+, [pnpm](https://pnpm.io) 10+.

```bash
pnpm install
cp .env.example .env      # ANTHROPIC_API_KEY ve Azure anahtarlarını doldur (docs/VOICE_SETUP.md)
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

# 3) Seslendirme (Azure) — sadece değişen sahneler yeniden seslendirilir
pnpm yt voice <proje>

# 3b) Görseller (Cloudflare FLUX.2) — karakterler her videoda aynı görünür
pnpm yt images <proje>

# 4) Görsel kontrol ve render
pnpm yt stills <proje>            # her sahneden bir PNG → projects/<proje>/preview/
pnpm yt render <proje> --draft    # yarım çözünürlükte hızlı taslak
pnpm yt render <proje>            # final MP4 (+ uzun videolar için 3 thumbnail)

# Diğer
pnpm yt list                      # projeler ve durumları
pnpm yt shorts <proje> -c 3       # mevcut uzun videodan Shorts türet
pnpm yt sample                    # API anahtarı olmadan örnek projeler oluştur
pnpm yt voices                    # Türkçe konuşabilen Azure sesleri
pnpm yt voice-test "metin" -v tr-TR-EmelNeural   # sesi dinleyerek seç
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
├── audio/          # sahne sesleri (s01.mp3…) + manifest.json (süreler, kelime zamanları)
├── music.mp3       # seçilen fon müziği (assets/music'ten otomatik veya elle)
├── preview/        # yt stills çıktısı
├── render/         # MP4 çıktıları
└── thumbnail/      # thumbnail_v1..v3.png
```

`pnpm yt images` görselleri `visuals/` klasörüne senaryodaki görsel id'siyle (`zeus-portrait.png` gibi) kaydeder;
istersen kendi görselini de aynı isimle koyabilirsin. Görseli olmayan sahnelerde tema arka planı ve "GÖRSEL BEKLENİYOR" etiketi görünür.

## Yapı

| Paket | İçerik |
|---|---|
| `packages/core` | Senaryo şeması (zod), sahne tipleri, temalar, zaman çizelgesi, önizleme |
| `packages/pipeline` | `yt` komut satırı: Claude ile senaryo üretimi, proje yönetimi, render |
| `packages/video` | Remotion projesi: sahne bileşenleri, efektler, geçişler, thumbnail |
| `config/` | Kanal ayarları, senaryo stil rehberi, ses ayarları, telaffuz sözlüğü |
| `assets/music/` | Temaya göre fon müziği kütüphanesi (dosyalar git'e eklenmez) |
| `prompts/` | Claude prompt şablonları |

```bash
pnpm test        # birim testler
pnpm typecheck   # tip kontrolü
dotnet test panel   # panel testleri (.NET 10 SDK gerekir)
```

## Dokümanlar

- [Ana plan](docs/PLAN.md)
- [İçerik stratejisi](docs/CONTENT_STRATEGY.md)
- [Remotion mimarisi](docs/REMOTION_ARCHITECTURE.md)
- [Kanal bağlantısı (YouTube API)](docs/CHANNEL_SETUP.md)
- [Seslendirme kurulumu (Azure)](docs/VOICE_SETUP.md)
- [Görsel servisi karşılaştırması](docs/IMAGE_PROVIDERS.md)
- [Görsel üretim kurulumu (Cloudflare) ve karakter kütüphanesi](docs/IMAGE_SETUP.md)
- [Panel kurulumu (Plesk + GitHub Actions)](docs/PANEL_SETUP.md)
