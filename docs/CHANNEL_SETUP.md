# Metaficta Kanalını Sisteme Bağlama (Faz 0)

> Kanal: **Metaficta** — [youtube.com/@Metaficta](https://www.youtube.com/@Metaficta)
> Amaç: Pipeline'ın videoları bu kanala **otomatik ve zamanlanmış** olarak yükleyebilmesi,
> thumbnail koyabilmesi, oynatma listelerine ekleyebilmesi ve analiz verilerini okuyabilmesi.
>
> Bu adımların çoğunu **kanal sahibi olarak senin** yapman gerekiyor (Google hesabına giriş ve onay gerekir).
> Gizli anahtarlar (client secret, token) **asla repoya eklenmez**; `.env` ve `secrets/` klasörü `.gitignore`'dadır.

---

## 1. YouTube Studio – Kanal Ayarları

| # | Adım | Nerede | Neden |
|---|------|--------|-------|
| 1 | **Telefon doğrulaması** | youtube.com/verify | Özel thumbnail, 15 dk'dan uzun video ve canlı yayın için şart |
| 2 | **Gelişmiş özellikler** | Studio → Ayarlar → Kanal → Özellik uygunluğu | Harici bağlantılar, özel thumbnail vb. |
| 3 | **Ülke ve anahtar kelimeler** | Studio → Ayarlar → Kanal → Temel bilgiler | Ülke: Türkiye; anahtar kelimeler: mitoloji, tanrılar, tarih, evren, gelecek… |
| 4 | **Yükleme varsayılanları** | Studio → Ayarlar → Yükleme varsayılanları | Kategori: *Eğitim* veya *Bilim ve Teknoloji*; dil: Türkçe; altyazı dili; varsayılan açıklama alt bilgisi |
| 5 | **Kanal açıklaması** | Studio → Özelleştirme → Temel bilgiler | Taslak: [CONTENT_STRATEGY.md §1](CONTENT_STRATEGY.md#1-kanal-kimliği) |
| 6 | **Görsel kimlik** | Studio → Özelleştirme → Marka | Banner 2560×1440 (güvenli alan 1546×423), profil 800×800, filigran 150×150 — Remotion ile üretilecek |
| 7 | **Oynatma listeleri** | Studio → İçerik → Oynatma listeleri | Her seri için bir liste: Tanrılar Savaşı, Panteon, Kayıp Medeniyetler, Evrenin Ölçeği, Yıl ____, Top 10, Bunu Biliyor muydun? |
| 8 | **Kanal fragmanı & öne çıkan bölümler** | Studio → Özelleştirme → Düzen | İlk videolar yayınlandıktan sonra |

---

## 2. Google Cloud Projesi

1. [console.cloud.google.com](https://console.cloud.google.com) → **Yeni proje** oluştur: `metaficta-pipeline`
2. **API'ler ve Hizmetler → Kitaplık** üzerinden şunları etkinleştir:
   - **YouTube Data API v3** (yükleme, thumbnail, oynatma listesi, metadata)
   - **YouTube Analytics API** (izlenme, izlenme süresi, tutma oranı raporları)
3. **OAuth izin ekranı** (OAuth consent screen / Google Auth Platform):
   - Kullanıcı türü: **Harici (External)**
   - Uygulama adı: `Metaficta Pipeline`, destek e-postası: kanal sahibinin e-postası
   - Kapsamlar (scopes):
     - `https://www.googleapis.com/auth/youtube.upload` — video ve thumbnail yükleme
     - `https://www.googleapis.com/auth/youtube` — oynatma listesi ve video düzenleme
     - `https://www.googleapis.com/auth/yt-analytics.readonly` — analiz verileri
   - Test kullanıcısı olarak kanal sahibinin Google hesabını ekle
4. **Kimlik bilgileri → OAuth istemci kimliği oluştur** → Uygulama türü: **Masaüstü uygulaması**
   → JSON dosyasını indir → `secrets/client_secret.json` olarak kaydet (repoya girmez)

> ⚠️ **Önemli – token süresi:** Uygulama "Test" durumundayken alınan yenileme (refresh) token'ları
> **7 gün sonra geçersiz olur** ve otomatik yükleme durur. Kalıcı çalışma için uygulamayı
> **"Yayında / In production"** durumuna al. Doğrulanmamış uygulama uyarısı çıkar; kendi hesabın için
> "Gelişmiş → devam et" ile geçilebilir.

---

## 3. Kanalı Yetkilendirme (Tek Seferlik)

Faz 8'de pipeline'a eklenecek komut:

```bash
pnpm yt auth
```

1. Tarayıcıda Google giriş ekranı açılır
2. **Metaficta kanalının bağlı olduğu hesabı** seç
   - Kanal bir **Marka Hesabı (Brand Account)** altındaysa, hesap seçiminde kişisel hesabın değil **Metaficta** seçilmeli
3. İzinleri onayla → refresh token `secrets/youtube_token.json` dosyasına kaydedilir
4. Komut, `channels.list(mine=true)` ile bağlanan kanalı doğrular:
   ```
   ✔ Bağlanan kanal: Metaficta (@Metaficta) — UCxxxxxxxxxxxx
   ```
   Kanal ID'si `config/channel.yaml` dosyasına yazılır; yanlış kanala yükleme yapılmasını engellemek için
   her yüklemeden önce bu ID kontrol edilir.

---

## 4. API Denetimi (Audit) – Videoların Herkese Açık Olabilmesi İçin

- Google'ın doğrulamadığı API projeleriyle yüklenen videolar **otomatik olarak "Gizli" (private)** kilitlenir.
- Çözüm: **YouTube API Services – Audit and Quota Extension** formu ile başvuru
  (proje amacı, kullanım şekli, ekran görüntüleri istenir; onay süresi değişkendir).
- **Onay gelene kadar:** Pipeline videoları `private` + planlanan yayın tarihiyle yükler,
  sen YouTube Studio'dan tek tıkla **Herkese açık / Planla** yaparsın.
- Varsayılan günlük kota 10.000 birim; video yükleme kotanın büyük kısmını harcar →
  haftada 2 uzun + günde 1 Shorts için yeterli. Daha fazlası gerekirse aynı formla kota artışı istenir.

---

## 5. Diğer API Anahtarları (`.env`)

```bash
# .env  (repoya girmez — şablonu .env.example'da)
ANTHROPIC_API_KEY=          # senaryo üretimi (Claude)
ELEVENLABS_API_KEY=         # seslendirme (karar bekliyor)
IMAGE_API_KEY=              # yapay zekâ görsel servisi (karar bekliyor)
PEXELS_API_KEY=             # stok video/fotoğraf (ücretsiz)
PIXABAY_API_KEY=            # stok video/müzik (ücretsiz)
NASA_API_KEY=               # NASA görselleri (ücretsiz, opsiyonel)
YOUTUBE_CLIENT_SECRET_PATH=secrets/client_secret.json
YOUTUBE_TOKEN_PATH=secrets/youtube_token.json
YOUTUBE_CHANNEL_ID=         # `pnpm yt auth` tarafından doldurulur
```

---

## 6. Yükleme Kuralları (Pipeline Davranışı)

| Kural | Değer |
|-------|-------|
| Yükleme durumu | Her zaman `private` + `publishAt` (zamanlanmış) — asla anında herkese açık değil |
| Yayın saatleri (başlangıç) | Uzun video: 19:00–20:00 (TR), Shorts: 12:00 ve/veya 18:00 — analizlere göre güncellenecek |
| Kategori | Eğitim (veya seriye göre Bilim ve Teknoloji) |
| Dil | `defaultLanguage` ve `defaultAudioLanguage`: `tr` |
| Çocuklara özel | Hayır (`selfDeclaredMadeForKids: false`) |
| Yapay içerik beyanı | Gerçekçi sentetik içerik varsa işaretlenir |
| Oynatma listesi | Seriye göre otomatik |
| Thumbnail | Uzun videolarda otomatik yüklenir; 3 varyasyon Studio'daki "Test ve Karşılaştır" için hazırlanır |
| Kanal doğrulama | Yüklemeden önce token'ın Metaficta kanal ID'sine ait olduğu kontrol edilir |

---

## 7. Kontrol Listesi

- [ ] Kanal telefonla doğrulandı
- [ ] Gelişmiş özellikler açık
- [ ] Kanal açıklaması, banner, profil fotoğrafı ve filigran yüklendi
- [ ] Seri oynatma listeleri oluşturuldu
- [ ] Google Cloud projesi oluşturuldu, YouTube Data API v3 + Analytics API etkin
- [ ] OAuth izin ekranı ayarlandı ve **"Yayında"** durumuna alındı
- [ ] `client_secret.json` indirildi (repoya eklenmedi)
- [ ] `pnpm yt auth` ile Metaficta kanalı bağlandı
- [ ] API audit başvurusu yapıldı
- [ ] `.env` dosyası dolduruldu
