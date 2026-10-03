# Remotion Video Mimarisi

> [Remotion](https://www.remotion.dev) videoları **React bileşenleriyle kod olarak** üretir.
> Her kare bir React render'ıdır; animasyonlar `useCurrentFrame()`, `interpolate()` ve `spring()` ile yazılır.
> Bu sayede videolar **şablonlanabilir, veriyle (JSON) beslenebilir ve tamamen otomatik** üretilebilir.

---

## 1. Neden Remotion?

| İhtiyaç | Remotion'ın karşılığı |
|---------|----------------------|
| Senaryodan otomatik video | Senaryo JSON'u → `inputProps` → aynı şablon her video için farklı içerik |
| Çok gelişmiş görsel efektler | React + CSS + SVG + Canvas + WebGL/Three.js — web'de yapılabilen her şey |
| 3D gezegenler, yıldız alanları | `@remotion/three` (React Three Fiber) |
| TikTok tarzı kelime kelime altyazı | `@remotion/captions` + `@remotion/install-whisper-cpp` |
| Profesyonel geçişler | `@remotion/transitions` (`TransitionSeries`, fade, slide, wipe, özel geçişler) |
| Organik hareket / parçacıklar | `@remotion/noise`, `@remotion/motion-blur`, `@remotion/light-leaks` |
| Lottie animasyonları | `@remotion/lottie` |
| Yazı tipleri | `@remotion/google-fonts` |
| Ses süresi ölçümü, dalga formu | `@remotion/media-utils` |
| Önizleme / ince ayar | **Remotion Studio** (tarayıcıda canlı önizleme, props düzenleme) |
| Otomatik render | `@remotion/renderer` (`renderMedia`) — Node.js'ten programatik |
| Bulutta hızlı render | `@remotion/lambda` (AWS) — ileride, gerekirse |
| Tek dil | Tüm pipeline TypeScript olabilir |

**Lisans:** Remotion bireyler ve küçük ekipler için ücretsiz; belirli bir çalışan sayısının üzerindeki şirketler
için ücretli şirket lisansı gerekir. Kurulumdan önce güncel şartlar `remotion.dev/license` adresinden kontrol edilmeli.

---

## 2. Temel Fikir: "Sahne DSL'i"

LLM **video kodu yazmaz**; sabit bir **sahne kataloğundan** seçim yapıp her sahnenin verisini (props) doldurur.
Remotion bu JSON'u okuyup ilgili React bileşenini render eder.

```
Senaryo LLM'i ──▶ script.json (sahne tipleri + props) ──▶ zod doğrulama ──▶ Remotion <LongVideo/> / <ShortVideo/>
```

Avantajları:
- Görsel kalite **her zaman tutarlı** (bileşenler elle tasarlanmış ve test edilmiş)
- LLM hatası videoyu bozmaz (zod şeması geçersiz props'u reddeder)
- Yeni sahne tipi eklemek = yeni bir React bileşeni + şemaya bir satır

### Örnek `script.json` parçası
```json
{
  "format": "long",
  "series": "gods-battle",
  "theme": "olympus-gold",
  "scenes": [
    {
      "type": "ColdOpen",
      "narration": "Zeus'un bile korktuğu tek bir varlık vardı.",
      "props": { "image": "nyx_silhouette", "effect": "slow-push", "overlayText": "ZEUS BİLE KORKARDI" }
    },
    {
      "type": "CharacterCard",
      "narration": "Zeus. Olimpos'un hükümdarı, gök gürültüsünün efendisi.",
      "props": {
        "name": "ZEUS",
        "title": "Olimpos'un Kralı",
        "mythology": "Yunan",
        "image": "zeus_portrait",
        "stats": { "Güç": 95, "Zekâ": 80, "Etki": 99, "Korkutuculuk": 85 },
        "symbol": "lightning"
      }
    },
    {
      "type": "MapScene",
      "narration": "Antik Yunan'da Zeus'a adanmış tapınaklar...",
      "props": { "region": "aegean", "markers": [{ "label": "Olympia", "lat": 37.64, "lon": 21.63 }] }
    },
    {
      "type": "VersusScene",
      "narration": "Peki Odin ile karşılaşsaydı?",
      "props": { "left": "zeus", "right": "odin", "categories": ["Güç", "Zekâ", "Büyü"] }
    }
  ]
}
```

---

## 3. Sahne Kataloğu (Bileşen Kütüphanesi)

### 3.1 Anlatım Sahneleri
| Bileşen | Açıklama | Kullanım |
|---------|----------|----------|
| `ColdOpen` | Karanlıktan açılan dramatik ilk sahne, büyük metin, ses vurgusu | Her videonun ilk 5 sn'si |
| `CinematicImage` | Ken Burns (zoom/pan) + vinyet + film greni + toz parçacıkları | Genel anlatım |
| `Parallax25D` | Ön plan / arka plan katmanlarına ayrılmış görselde derinlik hareketi | Tanrı portreleri, manzaralar |
| `VideoClip` | Stok veya yapay zekâ video (`OffthreadVideo`), renk filtresi | Hareketli sahneler |
| `QuoteScene` | Kadim metinden alıntı, parşömen üzerinde harf harf belirme | Mitler, kutsal metinler |
| `ChapterTitle` | Bölüm başlığı, büyük epik yazı + ışık sızıntısı geçişi | Chapter geçişleri |

### 3.2 Bilgi Sahneleri
| Bileşen | Açıklama | Kullanım |
|---------|----------|----------|
| `CharacterCard` | Tanrı/varlık profil kartı: portre, isim, unvan, sembol, animasyonlu güç çubukları | Tanrılar Savaşı, Panteon |
| `VersusScene` | İki karakter karşı karşıya, kategori kategori puan karşılaştırması | Tanrılar Savaşı |
| `TimelineScene` | Kayan zaman çizelgesi, olay noktaları, "şu an" işaretçisi | Tarih, Gelecek |
| `MapScene` | SVG/GeoJSON harita, sınırların büyümesi, rota çizgileri, işaretçiler | Medeniyetler, savaşlar |
| `FamilyTree` | Soy ağacı, dalların sırayla açılması | Panteon |
| `CountdownItem` | "#7" büyük sayı + öğe tanıtımı | Top 10 |
| `TierList` | S/A/B/C/D satırlarına öğelerin uçarak yerleşmesi | Tier List |
| `StatCounter` | 0'dan hedefe sayan dev sayı ("12.000 YIL") | Şaşırtıcı veriler |
| `ComparisonBars` | Animasyonlu çubuk/oran grafikleri | Karşılaştırmalar |

### 3.3 Kozmik / Gelecek Sahneleri
| Bileşen | Açıklama | Kullanım |
|---------|----------|----------|
| `StarField` | 3D yıldız alanında ileri uçuş (Three.js) | Uzay, göksel varlıklar |
| `Planet3D` | Dokulu, dönen 3D gezegen/yıldız, atmosfer parlaması | Evren videoları |
| `ScaleComparison` | Nesneler arasında kamera uzaklaşması (Dünya → Güneş → …) | Evrenin Ölçeği |
| `HoloInterface` | Holografik arayüz, tarama çizgileri, glitch | Yıl ____ serisi |
| `CosmicEntity` | Işık, sis ve parçacıklarla belirsiz göksel varlık siluetleri | Göksel varlıklar |

### 3.4 Kalıcı Katmanlar (Overlay)
| Bileşen | Açıklama |
|---------|----------|
| `Captions` | Uzun video: alt-orta sade altyazı · Shorts: ortada büyük, kelime vurgulu (`createTikTokStyleCaptions`) |
| `FilmGrain` + `Vignette` | Sinematik doku |
| `Particles` | Toz, kıvılcım, kar, yıldız tozu (tema bazlı, `@remotion/noise`) |
| `LightLeaks` | Geçişlerde ışık sızıntısı |
| `KeywordPop` | Anlatımda geçen anahtar kelimenin ekranda belirmesi |
| `ProgressBar` | Shorts'ta üstte ince ilerleme çubuğu (izlemeyi tamamlama isteği) |
| `SubscribeCTA` | Animasyonlu abone ol / zil butonu |
| `Watermark` | Kanal logosu (köşede, düşük opaklık) |

### 3.5 Geçişler
`TransitionSeries` ile: `fade`, `slide`, `wipe` + özel geçişler:
- `FlashCut` — beyaz/altın parlama (vurgu anları)
- `ZoomThrough` — bir sonraki sahnenin içine dalış
- `InkBleed` — mürekkep yayılması (tarih/mitoloji)
- `Glitch` — dijital bozulma (gelecek temaları)
- `Portal` — dairesel açılış (kozmik temalar)

---

## 4. Tema Sistemi

Her seri/konu bir tema seçer; tüm bileşenler renk, font, parçacık ve doku bilgisini temadan alır.

| Tema | Renkler | Font | Parçacık | Doku | Müzik ruhu |
|------|---------|------|----------|------|-----------|
| `olympus-gold` | Siyah, altın, mermer beyazı | Cinzel | Altın toz, kıvılcım | Mermer | Epik orkestral |
| `norse-frost` | Buz mavisi, gri, beyaz | Norse tarzı serif | Kar | Taş, ahşap | Davul, koro |
| `egypt-sand` | Kum, lacivert, altın | Cormorant | Kum | Papirüs | Etnik, gizemli |
| `turkic-steppe` | Gök mavisi, kızıl, toprak | Serif | Rüzgâr, kıvılcım | Keçe/kilim motifi | Kopuz, gırtlak ezgisi |
| `ancient-sepia` | Sepya, kahve, krem | Cormorant | Toz | Parşömen, eski harita | Ambient |
| `cosmic-void` | Derin mor, lacivert, cyan | Inter / Space Grotesk | Yıldız tozu | Nebula | Ambient synth |
| `future-neon` | Siyah, neon cyan, magenta | Space Grotesk | Veri parçacıkları | Tarama çizgisi | Synthwave/elektronik |

---

## 5. Kompozisyonlar

```tsx
// src/Root.tsx (taslak)
<Composition
  id="LongVideo"
  component={LongVideo}
  width={1920} height={1080} fps={30}
  schema={scriptSchema}                 // zod — Studio'da props düzenlenebilir
  calculateMetadata={calcLongMetadata}  // süre = ses dosyalarının toplam süresi
  defaultProps={sampleScript}
/>
<Composition
  id="ShortVideo"
  component={ShortVideo}
  width={1080} height={1920} fps={30}
  schema={shortSchema}
  calculateMetadata={calcShortMetadata}
  defaultProps={sampleShort}
/>
<Composition id="Thumbnail" component={Thumbnail} width={1280} height={720} ... />  // renderStill ile PNG
```

- **Süre dinamik:** `calculateMetadata`, her sahnenin ses dosyası süresini ölçer (`getAudioDurationInSeconds`)
  ve toplam kare sayısını hesaplar → video, anlatıma birebir oturur.
- **Thumbnail da Remotion'la:** aynı tema/font/görsellerle `renderStill()` → tutarlı marka kimliği.
- **Çoklu dil:** aynı kompozisyon, farklı `language` props'u ve ses dosyaları.

---

## 6. Ses Katmanları (Remotion içinde)

| Katman | Uygulama |
|--------|----------|
| Anlatım | Sahne başına `<Audio>` (her `<Sequence>` içinde) |
| Müzik | Tüm video boyunca `<Audio>`; `volume` fonksiyonu ile **ducking** (konuşma varken kısılır, sessizlikte yükselir) |
| SFX | Geçişlerde whoosh, kart açılışında "impact", sayılarda "tick" — sahne tipine göre otomatik |
| Atmosfer | Tema bazlı arka plan sesi (rüzgâr, uzay uğultusu) çok düşük seviyede |

---

## 7. Görsel Varlık Üretimi (Bu Niş İçin Kritik)

Tanrılar ve kozmik varlıklar stok videoda bulunmaz → **yapay zekâ görselleri ana kaynak** olur.

### 7.1 Karakter Kütüphanesi (Tutarlılık)
- `assets/characters/<id>/` — her tanrı/varlık için: açıklama (`bible.md`), referans görseller, portre, tam boy, sembol
- Aynı tanrı tüm videolarda **aynı görünür** (ör. Zeus hep aynı yüz, aynı zırh) → kanal kimliği oluşur
- Karakter bilgisi (`bible.md`): görünüm, sembol, renk, köken, ilişkiler — senaryo LLM'i de bunu kullanır

### 7.2 Görsel Üretim Akışı
1. Senaryo her sahne için `image_prompt` üretir (tema stil ön-ekleriyle: *"epic cinematic, dramatic lighting, …"*)
2. Önbellek kontrolü (aynı karakter/sahne daha önce üretildiyse yeniden kullan)
3. Yapay zekâ görsel API'si ile üret (16:9 ve 9:16 iki ayrı oran veya güvenli kırpma alanı)
4. **Parallax için:** arka plan kaldırma (ön plan katmanı) ve/veya derinlik haritası → `Parallax25D`
5. İsteğe bağlı: en önemli 2–3 sahne için yapay zekâ video (image-to-video) → "hero shot"

### 7.3 Diğer Kaynaklar
- **Stok video** (Pexels/Pixabay): uzay, doğa, antik kalıntılar, gökyüzü
- **Harita verisi:** Natural Earth GeoJSON + tarihî sınırlar (açık veri setleri)
- **NASA görselleri:** büyük çoğunluğu kamu malı → evren videoları için ideal
- **Müze açık koleksiyonları:** kamu malı eser fotoğrafları (lisans kontrolüyle)

---

## 8. Render Stratejisi

| Mod | Komut / API | Ne zaman |
|-----|-------------|----------|
| Önizleme | `npx remotion studio` | Tasarım ve kontrol |
| Hızlı taslak | `renderMedia` düşük çözünürlük (`scale: 0.5`) | Onay öncesi kontrol |
| Final | `renderMedia` H.264, 1080p, yüksek CRF kalitesi | Yükleme |
| Thumbnail | `renderStill` | Her uzun video için 3 varyasyon |
| Bulut | `@remotion/lambda` | Render süresi sorun olursa |

**Performans notları:**
- 10 dk @ 30fps = 18.000 kare → yerel render süresi CPU'ya bağlı; `concurrency` ile paralel
- Ağır 3D sahneler sınırlı süreli tutulur; videolarda `OffthreadVideo` kullanılır
- Varlıklar render öncesi yerel/statik klasöre indirilir (`staticFile`)

---

## 9. Kalite Hedefleri ("Çok Gelişmiş" Tanımı)

- Ekranda **hiçbir an durağan değil**: her görselde hareket (zoom, parallax, parçacık)
- Her 5–8 sn'de görsel değişim; her bölümde en az bir "bilgi sahnesi" (kart, harita, zaman çizelgesi)
- Tutarlı tipografi ve renk; tema dışı öğe yok
- Ses tasarımı: her geçiş ve vurgu sesli → profesyonel his
- Shorts: ilk karede güçlü görsel + büyük metin; altyazı arayüz öğelerinin altında kalmaz (güvenli alan)
