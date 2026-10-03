# YouTube Otomatik İçerik Üretim Planı (Uzun Video + Shorts)

> Amaç: **Fikir → Senaryo → Seslendirme → Görseller → Montaj → Thumbnail → SEO → Yükleme → Analiz**
> zincirini, insan onayı gereken noktalar dışında otomatik çalışan bir sistemle kurmak.
> Her uzun videodan 3–5 adet Shorts türetmek (repurpose) temel stratejidir.
>
> **İlgili dokümanlar:**
> - [CONTENT_STRATEGY.md](CONTENT_STRATEGY.md) — kanal konsepti, seriler, başlık/kanca formülleri, ilk 20 video
> - [REMOTION_ARCHITECTURE.md](REMOTION_ARCHITECTURE.md) — Remotion ile video şablonları, sahne kataloğu, temalar

---

## 0. Kararlar

### Alınan kararlar ✅
| Karar | Seçim |
|-------|-------|
| **Konsept / niş** | Kadim tarih, tanrılar & mitoloji, göksel varlıklar, evren, ütopik/distopik gelecek, ilginç bilgiler → detay: [CONTENT_STRATEGY.md](CONTENT_STRATEGY.md) |
| **Video motoru** | **Remotion** (React ile kodla video) → detay: [REMOTION_ARCHITECTURE.md](REMOTION_ARCHITECTURE.md) |
| **Format** | Yüzsüz (faceless), sinematik anlatım |
| **Görsel kaynağı** | Ağırlıklı yapay zekâ görselleri (tanrılar/kozmik sahneler stokta yok) + stok video + NASA/kamu malı + Remotion animasyonları |
| **Dil (yazılım)** | Tüm pipeline **TypeScript / Node.js** (Remotion ile tek dil) |

### Bekleyen kararlar ⏳
| # | Karar | Seçenekler | Varsayılan öneri |
|---|-------|-----------|------------------|
| 1 | **Video dili** | Türkçe / İngilizce / ikisi | Türkçe başla, Remotion sayesinde İngilizce versiyon sonradan kolay |
| 2 | **Ses** | Yapay zekâ TTS / kendi sesin / ses klonu | Derin, sinematik bir TTS sesi (ElevenLabs) veya kendi sesinin klonu |
| 3 | **Yapay zekâ görsel servisi** | Flux, Imagen, DALL·E, Midjourney (API yok) vb. | API'si olan, tutarlı karakter üretebilen bir servis |
| 4 | **Otomasyon seviyesi** | Tam otomatik / onaylı | Senaryo ve yükleme öncesi **insan onayı** |
| 5 | **Yayın sıklığı** | Örn. haftada 2 uzun + günde 1 Shorts | Haftada 2 uzun + günde 1 Shorts |
| 6 | **Bütçe** | Ücretsiz ağırlıklı / aylık abonelikler | Seslendirme + görsel üretim için küçük aylık bütçe |
| 7 | **Kanal adı** | Bkz. CONTENT_STRATEGY.md §1 | "Zamanın Ötesi" |

---

## 1. Video Formatları – Teknik Özellikler

| Özellik | Uzun Video | Shorts |
|---------|-----------|--------|
| Oran / Çözünürlük | 16:9 – 1920×1080 (ileride 4K) | 9:16 – 1080×1920 |
| Süre | 8–15 dk (8+ dk ara reklam imkânı verir) | 15–60 sn ideal (YouTube 3 dk'ya kadar izin veriyor) |
| FPS | 30 | 30 |
| Kelime sayısı (TR, ~140 kelime/dk) | 10 dk ≈ 1.300–1.500 kelime | 45 sn ≈ 100–120 kelime |
| Altyazı | Alt kısımda, sade | Ortada, büyük, kelime kelime vurgulu (karaoke) |
| Kurgu temposu | Her 5–10 sn görsel değişimi, her ~60 sn "pattern interrupt" | Her 1–3 sn kesme, sürekli hareket |
| Başlangıç | İlk 30 sn kanca (hook) + vaat | İlk 1–2 sn kanca, giriş yok |
| Bitiş | CTA + bitiş ekranı (son 20 sn) | Başa saran döngü (loop) cümlesi |
| Thumbnail | Zorunlu, özel tasarım | Gerekmez (kapak karesi seçilebilir) |
| Bölümler | Açıklamada zaman damgalı chapter'lar | Yok |

---

## 2. Genel Mimari (Pipeline)

```
┌────────────┐   ┌────────────┐   ┌──────────┐   ┌────────────┐
│ 1. Fikir    │──▶│ 2. Senaryo │──▶│ 3. Onay  │──▶│ 4. Ses (TTS)│
│ & Araştırma │   │  (LLM)     │   │ (insan)  │   └─────┬──────┘
└────────────┘   └────────────┘   └──────────┘         │
                                                        ▼
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│ 8. Yükleme │◀──│ 7. SEO &   │◀──│ 6. Remotion│◀──│ 5. Altyazı │
│ & Planlama │   │ Thumbnail  │   │  Render    │   │ + Görseller│
└─────┬──────┘   └────────────┘   └────────────┘   └────────────┘
      ▼
┌────────────┐
│ 9. Analiz  │──▶ (geri besleme: hangi konu/kanca işe yaradı → 1. adıma)
└────────────┘
```

**Tasarım ilkeleri**
- Her video kendi klasöründe yaşar: `projects/<tarih>-<slug>/`.
- Her aşama **bağımsız ve tekrar çalıştırılabilir** (idempotent): çıktısı varsa atlanır, `--force` ile yeniden üretilir.
- Aşamalar arası veri **JSON** ile taşınır (şema doğrulamalı).
- Shorts, uzun videonun senaryosundan **türetilir** ama ayrıca bağımsız Shorts da üretilebilir.

---

## 3. Aşama Aşama Detaylı Plan

### 3.1 Fikir & Araştırma
**Girdi:** Niş tanımı, rakip kanal listesi
**Çıktı:** `ideas.json` – puanlanmış konu listesi

- **Kaynaklar:**
  - YouTube Data API → nişteki popüler videolar, rakip kanalların en çok izlenenleri
  - Google Trends (pytrends) → yükselen aramalar
  - YouTube arama otomatik tamamlama önerileri
  - Reddit / forum / haber RSS (nişe göre)
- **Puanlama:** arama ilgisi × rekabet (düşük) × niş uyumu × "evergreen" olma
- LLM, ham verilerden **başlık + açı (angle) + kanca** önerileri üretir.
- İnsan haftalık listeden konuları seçer.

### 3.2 Senaryo Üretimi (Çekirdek)
**Araç:** Claude API (`claude-opus-5-5` kalite için, `claude-sonnet-5-5` hız/maliyet için)
**Çıktı:** `script.json`

**Çok adımlı üretim (tek prompt yerine):**
1. **Araştırma özeti** – konu hakkında doğrulanabilir bilgiler, kaynaklarıyla
2. **Taslak (outline)** – kanca, bölümler, her bölümün amacı, merak boşlukları
3. **Tam metin** – konuşma diliyle, kısa cümlelerle, seslendirmeye uygun
4. **Öz-eleştiri ve revizyon** – tempo, tekrar, sıkıcı bölüm, doğruluk kontrolü
5. **Sahne bölme** – her cümle grubu için Remotion **sahne kataloğundan** bir tip seçilir (`CharacterCard`, `MapScene`, `TimelineScene`…) ve props'ları doldurulur ([sahne kataloğu](REMOTION_ARCHITECTURE.md#3-sahne-kataloğu-bileşen-kütüphanesi))
6. **Shorts çıkarımı** – uzun senaryodan 3–5 bağımsız, kancalı kısa senaryo
7. **Metadata** – başlık varyasyonları, açıklama, etiketler, chapter'lar

**Uzun video senaryo şablonu:**
```
[0:00–0:30]  KANCA       – şaşırtıcı iddia / soru / sonuçtan bir kesit + izleyiciye vaat
[0:30–1:00]  BAĞLAM      – neden önemli, videoda ne öğrenecek
[1:00–8:00]  BÖLÜMLER    – 3–5 bölüm; her bölüm sonunda bir sonrakine merak köprüsü
             (her ~60 sn'de soru, şaşırtıcı bilgi veya ton değişimi)
[8:00–9:30]  DORUK       – en güçlü bilgi / cevap / ders
[9:30–10:00] KAPANIŞ+CTA – özet, abone çağrısı, sonraki video önerisi
```

**Shorts senaryo şablonu:**
```
[0–2 sn]   KANCA   – ilk kelimeler merak uyandırmalı ("Bunu bilen %1'lik kesimdesin…")
[2–40 sn]  İÇERİK  – tek fikir, hızlı, somut
[40–50 sn] PAYOFF  – cevap / sürpriz
[son]      LOOP    – son cümle ilk cümleye bağlanır (tekrar izlenme artar)
```

**`script.json` şeması (özet):**
```json
{
  "id": "2026-10-03-zeus-vs-odin",
  "format": "long",
  "series": "gods-battle",
  "theme": "olympus-gold",
  "language": "tr",
  "title_options": ["...", "...", "..."],
  "hook": "...",
  "sections": [
    {
      "id": "s1",
      "heading": "Bölüm başlığı (chapter için)",
      "scenes": [
        {
          "type": "CinematicImage | CharacterCard | MapScene | TimelineScene | VersusScene | ...",
          "narration": "Seslendirilecek metin",
          "props": { "image": "zeus_portrait", "overlayText": "Kısa vurgu yazısı" },
          "assets": [{"kind": "ai_image|stock_video|nasa|map", "prompt_or_query": "..."}],
          "transition": "fade | flash | zoom-through | ink-bleed | glitch",
          "sfx": "whoosh"
        }
      ]
    }
  ],
  "cta": "...",
  "shorts": [ { "hook": "...", "scenes": [...], "loop_line": "..." } ],
  "sources": ["https://..."],
  "metadata": { "description": "...", "tags": ["..."], "hashtags": ["..."] }
}
```

**Kalite kuralları (prompt'a gömülecek "stil rehberi"):**
- Cümleler ≤ 20 kelime; konuşma dili; "siz" yerine "sen" (kanal tonuna göre)
- Her 2–3 cümlede bir somut örnek, sayı veya görsel imge
- Tekrarlayan kalıp ifadelerden kaçın (YZ izi bırakan "Hadi başlayalım!", "Peki ya…?" fazlası)
- İddialar kaynaklı; emin olunmayan bilgi işaretlenir → insan kontrolü
- Kanal kişiliği (persona) dosyası: `config/channel.yaml`

### 3.3 İnsan Onayı (Kalite Kapısı #1)
- Senaryo, okunabilir bir **Markdown önizlemesine** dönüştürülür.
- Kontrol listesi: doğruluk, ton, telif riski, hassas içerik, kanca gücü.
- Onay: `status: approved` → pipeline devam eder.

### 3.4 Seslendirme (TTS)
**Çıktı:** `audio/narration.wav` + sahne bazlı parçalar

| Seçenek | Türkçe kalite | Maliyet | Not |
|---------|--------------|---------|-----|
| ElevenLabs | Çok iyi | Abonelik | Ses klonlama, duygu kontrolü |
| OpenAI TTS | İyi | Kullanım başı | Basit API |
| Azure / Google TTS | İyi | Kullanım başı | SSML ile vurgu/duraklama |
| XTTS / Piper (yerel) | Orta | Ücretsiz | GPU gerekebilir |
| Kendi sesin | En özgün | Zaman | Monetizasyon açısından en güvenli |

- Sahne sahne üretim → hatalı bir cümle tek başına yeniden üretilebilir.
- Ses normalizasyonu: −14 LUFS (YouTube standardı), sessizlik kırpma.
- Telaffuz sözlüğü: özel isimler, kısaltmalar (`config/pronunciation.yaml`).

### 3.5 Altyazı & Zamanlama
- **whisper.cpp** (`@remotion/install-whisper-cpp`) ile kelime düzeyinde zaman damgaları → `captions.json` (+ YouTube için `.srt`)
- Bu zamanlamalar **montajın iskeletidir**: her sahnenin süresi gerçek ses süresinden hesaplanır.
- `@remotion/captions` (`createTikTokStyleCaptions`) ile Shorts'ta kelime kelime vurgulu altyazı.

### 3.6 Görsel Varlıklar
**Çıktı:** `visuals/` klasörü + `assets.json` (kaynak ve lisans kaydıyla)
**Detay:** [REMOTION_ARCHITECTURE.md §7](REMOTION_ARCHITECTURE.md#7-görsel-varlık-üretimi-bu-niş-için-kritik)

| Kaynak | Kullanım | Lisans |
|--------|---------|--------|
| **Yapay zekâ görsel** (ana kaynak) | Tanrılar, mitolojik sahneler, kozmik varlıklar, gelecek şehirleri | Sağlayıcı şartlarına bağlı |
| **Karakter kütüphanesi** | Her tanrı/varlık için sabit görünüm → videolar arası tutarlılık | Kendi üretimimiz |
| Pexels / Pixabay API | Uzay, doğa, antik kalıntı, gökyüzü stok videoları | Ticari kullanım serbest, kayıt tutulmalı |
| NASA / müze açık koleksiyonları | Gezegenler, galaksiler, tarihî eserler | Çoğu kamu malı (tek tek kontrol) |
| Yapay zekâ video (image-to-video) | Videonun en önemli 2–3 "hero" sahnesi | Sağlayıcı şartlarına bağlı |
| Remotion bileşenleri | Haritalar, zaman çizelgeleri, kartlar, 3D gezegenler, sayılar | Kendi kodumuz |

- Görseller hem 16:9 hem 9:16 için uygun üretilir (veya güvenli kırpma alanıyla).
- Parallax için arka plan kaldırma / derinlik haritası.
- Aynı görselin tekrar kullanımını ve gereksiz yeniden üretimi engelleyen önbellek.

### 3.7 Müzik & Ses Efektleri
- Kaynak: YouTube Ses Kitaplığı, Pixabay Music (Content ID sorunu olmayanlar)
- Ruh haline göre etiketli müzik kütüphanesi: `assets/music/{epik-orkestral,gizemli,kozmik-ambient,synthwave,...}` — temaya göre otomatik seçim
- **Ducking:** konuşma varken müzik −18/−20 dB'e iner
- SFX: geçişlerde whoosh, vurgu için "pop", ekran yazılarında "click"

### 3.8 Montaj / Render — Remotion
**Araç:** Remotion (React) → detay: [REMOTION_ARCHITECTURE.md](REMOTION_ARCHITECTURE.md)

Adımlar:
1. `script.json` + ses dosyaları + görseller → zod ile doğrulanmış `inputProps`
2. `calculateMetadata` ses sürelerinden toplam kare sayısını hesaplar
3. `<LongVideo>` (1920×1080) / `<ShortVideo>` (1080×1920) kompozisyonları sahne kataloğundaki bileşenleri sırayla (`TransitionSeries`) render eder
4. Kalıcı katmanlar: altyazı, film greni, parçacıklar, filigran, Shorts ilerleme çubuğu
5. Ses: anlatım + müzik (ducking) + SFX + atmosfer — hepsi Remotion içinde
6. `renderMedia()` ile H.264 çıktı; önce yarım çözünürlükte hızlı önizleme, onaydan sonra final

**Remotion Studio** ile her şablon tarayıcıda canlı önizlenip ince ayar yapılır.

### 3.9 Thumbnail (Uzun Video)
- **Remotion `<Thumbnail>` kompozisyonu + `renderStill()`**: videoyla aynı tema/font; büyük 2–4 kelimelik yazı, yüksek kontrast, tek odak noktası
- Bu nişte işe yarayan kalıplar: iki tanrı karşı karşıya + "VS", dev bir varlık karşısında küçük insan, parlayan gözler, karanlık zemin + altın yazı
- Görsel: karakter kütüphanesindeki portreler veya özel üretilmiş yapay zekâ görseli
- Her video için **3 varyasyon** → YouTube'un "Test & Compare" özelliğiyle A/B testi
- 1280×720, < 2 MB

### 3.10 SEO & Metadata
- **Başlık:** 3–5 öneri, ≤ 60 karakter, anahtar kelime başta, merak unsuru
- **Açıklama:** ilk 2 satır özet + anahtar kelimeler, chapter zaman damgaları (otomatik, gerçek ses sürelerinden), kaynaklar, sosyal linkler
- **Etiketler & hashtag'ler:** 3 hashtag (açıklamada), nişe özgü etiketler
- **Shorts:** başlıkta/açıklamada `#Shorts`, ilgili uzun videoya bağlantı ("ilgili video" özelliği)
- **Yapay zekâ beyanı:** gerçekçi sentetik içerik varsa "değiştirilmiş veya yapay içerik" işareti

### 3.11 Yükleme & Planlama
**Araç:** YouTube Data API v3 (`videos.insert`, `thumbnails.set`, `playlistItems.insert`)
- OAuth 2.0 (kanal sahibinin hesabıyla bir kez yetkilendirme, token saklama)
- `privacyStatus: private` + `publishAt` ile **zamanlanmış yayın**
- Oynatma listesine otomatik ekleme
- **Önemli kısıtlar:**
  - Varsayılan günlük kota 10.000 birim; tek bir yükleme yaklaşık 1.600 birim tutar → günde ~6 yükleme (güncel değeri kontrol et)
  - Doğrulanmamış (audit edilmemiş) API projeleriyle yüklenen videolar **gizli** kalır → Google'a API denetim (audit) başvurusu yapılmalı. O zamana kadar yükleme `private` yapılır, yayın YouTube Studio'dan elle açılır.
  - Özel thumbnail için kanalın telefonla doğrulanmış olması gerekir.

### 3.12 Analiz & Geri Besleme
- **YouTube Analytics API:** izlenme, ortalama izlenme süresi, tutma (retention) eğrisi, CTR, abone kazanımı
- Haftalık rapor: hangi konu / kanca / thumbnail / süre daha iyi çalıştı
- Tutma eğrisindeki düşüş noktaları → senaryo stil rehberine geri besleme
- Başarılı formatlar fikir puanlamasında ağırlık kazanır

---

## 4. Teknoloji Yığını

| Katman | Seçim |
|--------|-------|
| Dil / çalışma ortamı | **TypeScript**, Node.js 20+ |
| Paket yöneticisi | pnpm (workspace / monorepo) |
| CLI | `yt` komutu (commander veya citty): `yt idea`, `yt script`, `yt voice`, `yt assets`, `yt render`, `yt upload`, `yt run` |
| Şema doğrulama | **zod** (hem pipeline hem Remotion props şeması — tek kaynak) |
| LLM | Anthropic TypeScript SDK (Claude) |
| TTS | ElevenLabs / OpenAI / Azure — ortak arayüz, değiştirilebilir sağlayıcı |
| Altyazı / hizalama | whisper.cpp (`@remotion/install-whisper-cpp`), `@remotion/captions` |
| Görsel | Yapay zekâ görsel API'si, Pexels/Pixabay API, NASA Images API |
| **Video motoru** | **Remotion** + `@remotion/transitions`, `@remotion/three`, `@remotion/noise`, `@remotion/motion-blur`, `@remotion/light-leaks`, `@remotion/lottie`, `@remotion/google-fonts`, `@remotion/media-utils` |
| Render | `@remotion/renderer` (yerel), ileride `@remotion/lambda` (bulut) |
| Thumbnail | Remotion `renderStill` |
| YouTube | `googleapis` (YouTube Data API v3 + Analytics API), OAuth 2.0 |
| Yapılandırma | YAML + `.env` (API anahtarları, asla repoya girmez) |
| Zamanlama | cron / GitHub Actions (render yerel makine veya sunucuda) |
| Test | vitest (şemalar, zamanlama hesapları, metadata) |

## 5. Klasör Yapısı (pnpm monorepo)

```
youtube/
├── docs/
│   ├── PLAN.md                      # bu doküman
│   ├── CONTENT_STRATEGY.md          # konsept, seriler, fikirler
│   └── REMOTION_ARCHITECTURE.md     # video mimarisi
├── config/
│   ├── channel.yaml                 # kanal adı, persona, ton, hedef kitle, dil
│   ├── style_guide.md               # senaryo yazım kuralları
│   ├── series.yaml                  # seriler → tema, format, süre, sahne tercihleri
│   └── pronunciation.yaml           # TTS telaffuz sözlüğü (Tengri, Ereşkigal…)
├── prompts/                         # LLM prompt şablonları
│   ├── research.md  outline_long.md  script_long.md  script_short.md
│   ├── critique.md  scene_planner.md  shorts_extract.md  metadata.md
├── packages/
│   ├── core/                        # zod şemaları (Script, Scene, Theme…), ortak tipler
│   ├── pipeline/                    # CLI + aşamalar
│   │   └── src/{ideas,script,voice,captions,assets,render,seo,upload,analytics}/
│   └── video/                       # Remotion projesi
│       └── src/
│           ├── Root.tsx             # LongVideo, ShortVideo, Thumbnail kompozisyonları
│           ├── compositions/        # LongVideo.tsx, ShortVideo.tsx, Thumbnail.tsx
│           ├── scenes/              # CharacterCard, MapScene, TimelineScene, VersusScene…
│           ├── overlays/            # Captions, FilmGrain, Particles, ProgressBar…
│           ├── transitions/         # FlashCut, ZoomThrough, InkBleed, Glitch, Portal
│           ├── themes/              # olympus-gold, norse-frost, cosmic-void…
│           └── three/               # Planet3D, StarField
├── assets/
│   ├── characters/<id>/             # tanrı/varlık kütüphanesi: bible.md + görseller
│   ├── fonts/  music/<ruh-hali>/  sfx/  textures/  maps/  logo/
├── projects/                        # (gitignore) her video için çalışma klasörü
│   └── 2026-10-03-zeus-vs-odin/
│       ├── script.json  script.md  status.json
│       ├── audio/  captions/  visuals/
│       ├── render/long.mp4  render/short_01.mp4 …
│       ├── thumbnail/  metadata.json
├── .env.example
├── package.json  pnpm-workspace.yaml
└── README.md
```

## 6. Yol Haritası (Aşamalı Geliştirme)

Her faz sonunda **çalışan bir çıktı** olur; bir sonraki faza onunla geçilir.

| Faz | Kapsam | Teslimat | Tahmini süre |
|-----|--------|----------|--------------|
| **0. Hazırlık** | Kanal adı & kurulumu, Google Cloud projesi + YouTube API (audit başvurusu dahil), API anahtarları | `channel.yaml`, `.env` | 1–2 gün |
| **1. İskelet + Senaryo** | pnpm monorepo, zod şemaları, senaryo zinciri (uzun + Shorts), sahne planlayıcı, Markdown önizleme | `yt script "Zeus vs Odin"` → `script.json` + `script.md` | 2–3 gün |
| **2. Remotion Temeli** | Remotion projesi, 2 tema (`olympus-gold`, `cosmic-void`), temel sahneler (`ColdOpen`, `CinematicImage`, `ChapterTitle`), overlay'ler, geçişler | Studio'da örnek veriyle çalışan video | 3–4 gün |
| **3. Ses + Altyazı** | TTS entegrasyonu, telaffuz sözlüğü, whisper.cpp hizalama, TikTok tarzı altyazı, müzik ducking | Gerçek sesle senkron video | 2–3 gün |
| **4. Görsel Üretim** | Yapay zekâ görsel entegrasyonu, karakter kütüphanesi, stok/NASA arama, önbellek | Senaryodan otomatik görsel seti | 3–4 gün |
| **5. İlk Shorts** 🎯 | `ShortVideo` kompozisyonu, `StatCounter`, `ScaleComparison`, ilerleme çubuğu, uçtan uca `yt run --short` | **İlk otomatik Shorts yayında** | 2–3 gün |
| **6. Gelişmiş Sahneler** | `CharacterCard`, `VersusScene`, `MapScene`, `TimelineScene`, `CountdownItem`, `TierList`, `Planet3D`, `StarField`, kalan temalar | Tüm seriler için şablonlar | 5–7 gün |
| **7. İlk Uzun Video** 🎯 | `LongVideo` kompozisyonu, chapter'lar, CTA, bitiş ekranı | **İlk otomatik uzun video** | 2–3 gün |
| **8. Thumbnail + SEO + Yükleme** | `Thumbnail` kompozisyonu (3 varyasyon), metadata üretimi, OAuth, zamanlanmış yükleme, oynatma listeleri | `yt upload` | 3 gün |
| **9. Otomasyon + Analiz** | Haftalık içerik kuyruğu, cron, Analytics API raporu, stil rehberine geri besleme | Haftalık performans raporu | 3–4 gün |
| **10. Çok Dil** (opsiyonel) | İngilizce senaryo/ses/altyazı, aynı görsel kurgu | İngilizce versiyonlar | 2–3 gün |

> İlk hedef: **Faz 1–5** → yaklaşık 2–3 hafta içinde ilk Shorts'un yayınlanması
> (Shorts en hızlı geri bildirimi verir; uzun video şablonları bu sürede olgunlaşır).

## 7. Haftalık Üretim Akışı (Sistem Oturduktan Sonra)

| Gün | İş |
|-----|----|
| Pazartesi | Fikir raporu → 2 uzun video konusu seç |
| Salı | Senaryolar üretilir → oku, düzelt, onayla (~30 dk/video) |
| Çarşamba | Ses + görsel + render otomatik; önizlemeyi kontrol et |
| Perşembe | Thumbnail seçimi, yükleme kuyruğuna al (zamanlanmış) |
| Her gün | 1 Shorts otomatik yayın (uzun videolardan türetilmiş) |
| Pazar | Analiz raporu → stil rehberini güncelle |

---

## 8. YouTube Politikaları & Riskler (Kritik)

| Risk | Açıklama | Önlem |
|------|----------|-------|
| **"Özgün olmayan / seri üretim içerik" politikası** | YouTube, şablonla seri üretilmiş, tekrarlayan, katma değeri düşük içeriği para kazanma programından (YPP) dışlar | Her videoda özgün araştırma, yorum ve anlatım; şablon hissi veren tekrarlardan kaçınma; insan editoryal katkısı |
| **Yapay zekâ beyanı** | Gerçekçi görünen sentetik içerik (gerçek kişi/olay gibi) beyan edilmeli | Yükleme sırasında ilgili bayrağı otomatik ayarla |
| **Telif hakkı** | Müzik, stok görsel, film kesitleri | Sadece lisanslı kaynaklar; `assets.json`'da her varlığın kaynağı ve lisansı |
| **Yanlış bilgi** | LLM'in uydurduğu bilgiler (halüsinasyon) | Kaynaklı araştırma adımı + insan onayı; tıbbi/finansal konularda ekstra dikkat |
| **API kotası / audit** | Günlük kota ve doğrulanmamış proje kısıtı | Erken audit başvurusu, kota takibi |
| **Ses kalitesi** | Robotik TTS izleyiciyi kaçırır | Kaliteli TTS, telaffuz sözlüğü, ses klonu veya kendi sesin |
| **API anahtarı sızıntısı** | `.env` yanlışlıkla repoya girerse | `.gitignore`, `.env.example`, gizli bilgi taraması |

**Para kazanma (YPP) eşikleri (yaklaşık, güncel şartları kontrol et):**
- Tam YPP: 1.000 abone + son 12 ayda 4.000 saat izlenme **veya** son 90 günde 10 milyon Shorts görüntülenmesi
- Alt kademe (fan finansmanı): 500 abone + 3 yükleme + 3.000 saat veya 3 milyon Shorts görüntülenmesi

---

## 9. Maliyet Kalemleri (Değişken)

| Kalem | Ücretsiz seçenek | Ücretli seçenek |
|-------|------------------|-----------------|
| Senaryo (LLM) | — | Claude API (kullanım başına; video başı genelde düşük) |
| Seslendirme | Yerel TTS (Piper/XTTS), kendi sesin | ElevenLabs / OpenAI / Azure |
| Görsel | Pexels, Pixabay, NASA | Yapay zekâ görsel/video API'leri (bu nişte ana kalem) |
| Müzik | YouTube Ses Kitaplığı, Pixabay | Epidemic Sound, Artlist |
| Render (Remotion) | Kendi bilgisayarın | `@remotion/lambda` (AWS kullanım başı) |
| Remotion lisansı | Bireyler / küçük ekipler ücretsiz | Belirli büyüklükteki şirketler için şirket lisansı (güncel şartları kontrol et) |
| Yükleme / Analiz | YouTube API (ücretsiz) | — |

> Kesin fiyatlar sağlayıcılara göre değiştiği için Faz 0'da seçilen araçlara göre bütçe tablosu çıkarılacak.

---

## 10. Kalite Kontrol Listesi (Her Video)

**Senaryo**
- [ ] İlk 5 saniye (Shorts: ilk 1 saniye) merak uyandırıyor mu?
- [ ] Başlık ve thumbnail'in verdiği söz videoda karşılanıyor mu?
- [ ] Bilgiler doğru ve kaynaklı mı?
- [ ] Gereksiz tekrar veya dolgu var mı?

**Ses & Görüntü**
- [ ] Telaffuz hatası var mı (özel isimler)?
- [ ] Görseller anlatılanla uyumlu mu? Aynı görsel tekrar ediyor mu?
- [ ] Altyazı senkron ve okunur mu? (Shorts: arayüz öğelerinin altında kalmıyor mu?)
- [ ] Müzik sesi anlatımı bastırıyor mu? Ses seviyesi −14 LUFS civarı mı?

**Yayın**
- [ ] Başlık ≤ 60 karakter, açıklamada chapter'lar ve kaynaklar var mı?
- [ ] Yapay zekâ beyanı gerekiyorsa işaretli mi?
- [ ] Tüm varlıkların lisansı kayıtlı mı?
- [ ] Doğru tarih/saatte zamanlandı mı?

---

## 11. Sıradaki Adımlar

1. Bölüm 0'daki **bekleyen kararları** netleştir (özellikle video dili, ses, görsel servisi, bütçe).
2. Faz 0: Kanal + Google Cloud projesi + gerekli API anahtarları.
3. Faz 1–2'ye başla: monorepo iskeleti + senaryo zinciri + Remotion temeli
   → "Zeus vs Odin" için örnek senaryo ve Studio'da ilk sahneler.
