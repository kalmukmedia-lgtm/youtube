# YouTube Otomatik İçerik Üretim Planı (Uzun Video + Shorts)

> Amaç: **Fikir → Senaryo → Seslendirme → Görseller → Montaj → Thumbnail → SEO → Yükleme → Analiz**
> zincirini, insan onayı gereken noktalar dışında otomatik çalışan bir sistemle kurmak.
> Her uzun videodan 3–5 adet Shorts türetmek (repurpose) temel stratejidir.

---

## 0. Önce Karar Verilmesi Gerekenler

Bu kararlar sistemin tasarımını doğrudan etkiler. Varsayılanlar parantez içinde.

| # | Karar | Seçenekler | Varsayılan öneri |
|---|-------|-----------|------------------|
| 1 | **Niş / konu** | Tarih, bilim, finans, teknoloji, gizem, motivasyon, belgesel, liste videoları… | Arama hacmi yüksek, "evergreen" bir niş (örn. tarih/bilim anlatımı) |
| 2 | **Dil** | Türkçe, İngilizce, ikisi birden | Türkçe ile başla, sistem çok dilli tasarlansın |
| 3 | **Format** | Yüzsüz (faceless) / kamera karşısı / karma | Yüzsüz (tam otomasyona uygun) |
| 4 | **Ses** | Yapay zekâ TTS / kendi sesin / ses klonu | Kaliteli TTS (ElevenLabs vb.) veya kendi sesinin klonu |
| 5 | **Görsel kaynağı** | Stok video, yapay zekâ görsel, yapay zekâ video, ekran kaydı, animasyon | Stok video + yapay zekâ görsel karışımı |
| 6 | **Otomasyon seviyesi** | Tam otomatik / her aşamada onay / sadece senaryo + yükleme onayı | Senaryo ve yükleme öncesi **insan onayı** |
| 7 | **Yayın sıklığı** | Örn. haftada 2 uzun + 7–10 Shorts | Haftada 2 uzun + günde 1 Shorts |
| 8 | **Bütçe** | Ücretsiz araçlar / aylık abonelikler | Başlangıçta düşük, sonuçlara göre artır |

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
│ 8. Yükleme │◀──│ 7. SEO &   │◀──│ 6. Montaj  │◀──│ 5. Altyazı │
│ & Planlama │   │ Thumbnail  │   │ (FFmpeg)   │   │ + Görseller│
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
5. **Sahne bölme** – her cümle grubuna görsel ipucu, ekran yazısı, ses efekti
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
  "id": "2026-10-03-roma-imparatorlugu-cokus",
  "format": "long",
  "language": "tr",
  "title_options": ["...", "...", "..."],
  "hook": "...",
  "sections": [
    {
      "id": "s1",
      "heading": "Bölüm başlığı (chapter için)",
      "scenes": [
        {
          "narration": "Seslendirilecek metin",
          "visual": {"type": "stock|ai_image|ai_video|text_card", "query": "ancient rome ruins aerial", "prompt": "..."},
          "on_screen_text": "Kısa vurgu yazısı",
          "sfx": "whoosh",
          "duration_hint_sec": 6
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
- **faster-whisper** ile kelime düzeyinde zaman damgaları → `subtitles.srt` / `.ass`
- Bu zamanlamalar **montajın iskeletidir**: her sahnenin süresi gerçek ses süresinden hesaplanır.
- Shorts için kelime kelime renk vurgulu (karaoke) ASS altyazı.

### 3.6 Görsel Varlıklar
**Çıktı:** `visuals/` klasörü + `assets.json` (kaynak ve lisans kaydıyla)

| Kaynak | Kullanım | Lisans |
|--------|---------|--------|
| Pexels / Pixabay API | Stok video ve fotoğraf (ücretsiz) | Ticari kullanım serbest, kayıt tutulmalı |
| Yapay zekâ görsel (Flux, SD, DALL·E, Imagen) | Stokta olmayan sahneler, tarihî/kurgusal | Sağlayıcı şartlarına bağlı |
| Yapay zekâ video (Veo, Runway, Kling) | Önemli sahneler için (pahalı) | Sağlayıcı şartlarına bağlı |
| Metin kartı / grafik / harita | Sayılar, listeler, karşılaştırmalar | Kendi üretimimiz |

- Senaryodaki `visual.query` ile arama → LLM ile en uygun sonucu seçme (opsiyonel görsel puanlama).
- Durağan görsellere **Ken Burns** (yavaş zoom/pan) efekti.
- Aynı görselin tekrar kullanımını engelleyen önbellek.
- Uzun video için yatay, Shorts için dikey (veya yataydan akıllı kırpma) arama.

### 3.7 Müzik & Ses Efektleri
- Kaynak: YouTube Ses Kitaplığı, Pixabay Music (Content ID sorunu olmayanlar)
- Ruh haline göre etiketli müzik kütüphanesi: `assets/music/{gizemli,epik,sakin,...}`
- **Ducking:** konuşma varken müzik −18/−20 dB'e iner
- SFX: geçişlerde whoosh, vurgu için "pop", ekran yazılarında "click"

### 3.8 Montaj / Render
**Araç:** FFmpeg + MoviePy (Python) — ileride daha zengin animasyon için **Remotion** (React) seçeneği

Adımlar:
1. Zaman çizelgesi (`timeline.json`) oluştur: sahne → ses aralığı → görsel → efekt
2. Klipleri kes/ölçekle/kırp, Ken Burns uygula, geçişleri ekle
3. Ekran yazıları ve altyazıyı bindir
4. Ses katmanları: anlatım + müzik (ducking) + SFX
5. Render: H.264, yüksek bitrate, AAC 320 kbps
6. Shorts için ayrı 9:16 render; ilk karede güçlü görsel + metin

**Önizleme modu:** düşük çözünürlükte hızlı render (onay öncesi kontrol).

### 3.9 Thumbnail (Uzun Video)
- Şablon tabanlı (Pillow): büyük 2–4 kelimelik yazı, yüksek kontrast, tek odak noktası
- Arka plan: yapay zekâ görseli veya videodan en çarpıcı kare
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
| Dil | Python 3.11+ |
| CLI | Typer (`yt idea`, `yt script`, `yt voice`, `yt render`, `yt upload`, `yt run`) |
| Şema doğrulama | Pydantic |
| LLM | Anthropic Python SDK (Claude) |
| TTS | ElevenLabs / OpenAI / Azure (soyutlanmış arayüz, değiştirilebilir) |
| Altyazı | faster-whisper |
| Görsel | Pexels/Pixabay API, görsel üretim API'si |
| Montaj | FFmpeg, MoviePy |
| Thumbnail | Pillow |
| YouTube | google-api-python-client, google-auth-oauthlib |
| Yapılandırma | YAML + `.env` (API anahtarları, asla repoya girmez) |
| Zamanlama | cron / GitHub Actions (render için yerel makine veya GPU sunucu) |
| Test | pytest (şema, zamanlama hesapları, metadata üretimi) |

---

## 5. Klasör Yapısı

```
youtube/
├── docs/PLAN.md                 # bu doküman
├── config/
│   ├── channel.yaml             # niş, persona, ton, hedef kitle, dil
│   ├── style_guide.md           # senaryo yazım kuralları
│   ├── pronunciation.yaml       # TTS telaffuz sözlüğü
│   └── render.yaml              # çözünürlük, font, renkler, altyazı stili
├── prompts/
│   ├── research.md
│   ├── outline_long.md
│   ├── script_long.md
│   ├── script_short.md
│   ├── critique.md
│   ├── shorts_extract.md
│   └── metadata.md
├── src/ytpipe/
│   ├── cli.py
│   ├── models.py                # Pydantic şemaları (Script, Scene, Timeline…)
│   ├── ideas/                   # trend & rakip analizi
│   ├── script/                  # LLM senaryo zinciri
│   ├── voice/                   # TTS sağlayıcıları (ortak arayüz)
│   ├── subtitles/               # whisper hizalama, SRT/ASS
│   ├── visuals/                 # stok arama, YZ görsel, önbellek
│   ├── audio/                   # müzik, ducking, normalizasyon
│   ├── render/                  # timeline → video (long & shorts)
│   ├── thumbnail/
│   ├── seo/
│   ├── upload/                  # YouTube API
│   └── analytics/
├── assets/
│   ├── fonts/  music/  sfx/  templates/
├── projects/                    # (gitignore) her video için çalışma klasörü
│   └── 2026-10-03-ornek-konu/
│       ├── script.json  script.md  status.json
│       ├── audio/  visuals/  subtitles/
│       ├── render/long.mp4  render/short_01.mp4 ...
│       ├── thumbnail/  metadata.json
├── tests/
├── .env.example
├── pyproject.toml
└── README.md
```

---

## 6. Yol Haritası (Aşamalı Geliştirme)

Her faz sonunda **çalışan bir çıktı** olur; bir sonraki faza onunla geçilir.

| Faz | Kapsam | Teslimat | Tahmini süre |
|-----|--------|----------|--------------|
| **0. Hazırlık** | Kanal kurulumu, Google Cloud projesi + YouTube API, API anahtarları, niş & persona kararı | `channel.yaml`, `.env` | 1–2 gün |
| **1. Senaryo MVP** | Proje iskeleti, Pydantic şemaları, senaryo zinciri (uzun + Shorts), Markdown önizleme | `yt script "konu"` → `script.json` + `script.md` | 2–3 gün |
| **2. Ses + Altyazı** | TTS entegrasyonu, normalizasyon, whisper hizalama | `narration.wav` + `.srt/.ass` | 2 gün |
| **3. Shorts Render** | Stok görsel arama, 9:16 montaj, karaoke altyazı, müzik | İlk otomatik Shorts videosu | 3–4 gün |
| **4. Uzun Video Render** | 16:9 montaj, Ken Burns, geçişler, ekran yazıları, chapter'lar | İlk otomatik uzun video | 3–5 gün |
| **5. Thumbnail + SEO** | Thumbnail şablonları, başlık/açıklama/etiket üretimi | `thumbnail_*.png`, `metadata.json` | 2 gün |
| **6. Yükleme** | OAuth, zamanlanmış yükleme, oynatma listesi, API audit başvurusu | `yt upload` | 1–2 gün |
| **7. Tam Otomasyon** | `yt run` tek komut, haftalık takvim, cron, bildirimler | Haftalık içerik kuyruğu | 2–3 gün |
| **8. Analiz Döngüsü** | Analytics API, haftalık rapor, stil rehberine geri besleme | Haftalık performans raporu | 2–3 gün |

> İlk hedef: **Faz 1–3** → 1–2 hafta içinde ilk Shorts'u yayınlamak (en hızlı geri bildirim Shorts'tan gelir).

---

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
| Görsel | Pexels, Pixabay | Yapay zekâ görsel/video API'leri |
| Müzik | YouTube Ses Kitaplığı, Pixabay | Epidemic Sound, Artlist |
| Render | Kendi bilgisayarın | Bulut sunucu / GPU |
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

1. Bölüm 0'daki kararları netleştir (özellikle **niş, dil, ses, bütçe**).
2. Faz 0: YouTube kanalı + Google Cloud projesi + gerekli API anahtarları.
3. Faz 1'e başla: proje iskeleti + senaryo üretim zinciri → ilk 3 örnek senaryo üretip birlikte değerlendir.
