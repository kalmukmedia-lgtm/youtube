# Metaficta Panel — Plesk (Windows) Kurulumu

Sistem iki parçadan oluşur:

| Parça | Nerede çalışır | Ne yapar |
|---|---|---|
| **Panel** (ASP.NET Core + MSSQL) | Senin Plesk hosting'in | Yeni video, senaryo okuma/düzenleme/onay, karakterler, müzik, video ve görselleri izleme, iş kuyruğu |
| **İşçi** (Node.js) | GitHub Actions (ücretsiz dakika) | Senaryo (Claude), seslendirme (Azure), görseller (Cloudflare), render (Remotion). Sonuçları panele yükler |

Paylaşımlı hosting'de video render edilemez (Chrome + ffmpeg + uzun süren işlemci kullanımı yasak/sınırlı).
Bu yüzden ağır işler GitHub Actions'ta yapılır; panel sadece yönetim ekranı ve dosya deposudur.

```
Panel (Plesk)  ──"işi başlat"──▶  GitHub Actions işçisi
     ▲                                   │
     └──── sonuçlar (senaryo, ses, ───────┘
           görsel, video) yüklenir
```

---

## 1. Plesk hazırlığı

1. **Alan adı / alt alan adı:** Panel için ör. `panel.alanadin.com` oluştur (veya mevcut sitenin kökünü kullan).
2. **SSL:** Plesk → *SSL/TLS Certificates* → **Let's Encrypt** ile ücretsiz sertifika al. İşçi panele HTTPS ile bağlanmalı.
3. **MSSQL veritabanı:** Plesk → *Databases* → *Add Database*
   - Tür: **Microsoft SQL Server**, ad: `metaficta`
   - Bir veritabanı kullanıcısı ve güçlü bir şifre oluştur
   - "Connection info" bölümündeki **sunucu adresini** not al
4. **Yazma izni:** Plesk → *Hosting Settings* → "Additional write/modify permissions" seçeneğini aç
   (panel `App_Data` klasörüne dosya yazar: veritabanı ayarı, şifreleme anahtarları, videolar/görseller).

## 2. Panel dosyalarını indir

Panel her kod değişikliğinde GitHub'da otomatik paketlenir; bilgisayarına .NET kurman gerekmez.

1. GitHub'da depo → **Actions** → **CI** → en son yeşil (✓) çalıştırma
2. Sayfanın altındaki **Artifacts** bölümünden indir:
   - **`metaficta-panel-win-x64`** — önerilen
   - `metaficta-panel-win-x86` — sadece x64 sürümü "500.32" hatası verirse (32-bit uygulama havuzu)
3. Paket "self-contained"dır: sunucuda .NET kurulu olmasına gerek yoktur, sadece IIS'in
   **ASP.NET Core Module**'ü gerekir (ASP.NET Core destekleyen Plesk paketlerinde vardır).

## 3. Yükle ve çalıştır

1. Plesk → *Files* → sitenin kök klasörü (`httpdocs` veya alt alan adının klasörü)
2. İndirdiğin zip'i yükle ve **Extract** ile aç (zip büyükse FTP ile de yükleyebilirsin).
   `web.config`, `Metaficta.Panel.exe` ve `wwwroot` doğrudan kök klasörde olmalı.
3. Siteyi tarayıcıda aç → **Veritabanı bağlantısı** ekranı gelir:
   sunucu, veritabanı adı, kullanıcı ve şifreyi gir → *Bağlantıyı test et ve kaydet*.
   Bilgiler `App_Data/appsettings.local.json` dosyasına yazılır.
4. Sayfayı yenile → panel tabloları otomatik oluşturur → **yönetici hesabını** oluştur.

> Bağlantı ekranı herkese açıktır; dosyaları yükledikten hemen sonra kurulumu tamamla.

## 4. GitHub bağlantısı

### 4.1 Token (panel → GitHub)
GitHub → sağ üst profil → *Settings* → *Developer settings* → *Personal access tokens* → **Fine-grained tokens** → *Generate new token*
- Repository access: **Only select repositories** → `youtube`
- Permissions → Repository permissions → **Actions: Read and write**
- Oluşan token'ı panelde **Ayarlar** sayfasına yapıştır, hesap (`kalmukmedia-lgtm`) ve depo (`youtube`) adını gir.
  Dal alanını boş bırakırsan deponun varsayılan dalı kullanılır.
- **Bağlantıyı test et** düğmesiyle kontrol et.

### 4.2 Secret'lar (GitHub → işçi)
GitHub'da depo → *Settings* → *Secrets and variables* → *Actions* → **New repository secret**:

| Secret | Değer |
|---|---|
| `PANEL_URL` | Panelin adresi, ör. `https://panel.alanadin.com` (Ayarlar sayfasında yazar) |
| `WORKER_TOKEN` | Panelin **Ayarlar** sayfasındaki işçi anahtarı |
| `ANTHROPIC_API_KEY` | Claude API anahtarı |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Seslendirme ([VOICE_SETUP.md](VOICE_SETUP.md)) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Görseller ([IMAGE_SETUP.md](IMAGE_SETUP.md)) |

## 5. Kullanım

1. **Projeler** → konuyu yaz → *Senaryoyu üret*. İş GitHub'da başlar, ilerlemesi **İşler** sayfasında canlı görünür.
2. Proje sayfasında senaryoyu oku, gerekirse **Senaryoyu düzenle**, sonra **✔ Senaryoyu onayla**.
3. **⚡ Hepsini üret** → seslendirme + görseller + önizleme kareleri + taslak video.
4. Beğenmediğin görseli prompt'unu düzenleyip **↻ yenile** ile tek başına yeniden üret.
5. **🎬 Final render** → tam çözünürlüklü video ve 3 thumbnail; panelden izle/indir.
6. **Karakterler** sayfasında tanrıların referans portrelerini seç; **Müzik** sayfasına telifsiz parçalar yükle.

## 6. Güncelleme

1. Plesk *Files* ile kök klasöre `app_offline.htm` adında boş bir dosya oluştur (uygulama durur, dosyalar serbest kalır).
2. Yeni paketi yükleyip eskisinin üzerine aç. **`App_Data` klasörünü silme** (ayarlar, anahtarlar ve tüm proje dosyaları orada).
3. `app_offline.htm`'yi sil. Veritabanı değişiklikleri ilk açılışta otomatik uygulanır.

## 7. Sorun giderme

| Belirti | Çözüm |
|---|---|
| **HTTP 500.30** veya "Panel başlatılamadı" sayfası | Panel, başlatılamadığında sebebini ve çözümünü gösteren bir sayfa açar. En sık sebep `App_Data` klasörüne yazma izninin olmamasıdır → *Hosting Settings* → "Additional write/modify permissions" seçeneğini aç. Ayrıntı ayrıca `App_Data/metaficta-startup-error.log` dosyasına yazılır |
| **HTTP 500.19** | Sunucuda ASP.NET Core Module yok → hosting firmasından "ASP.NET Core Hosting Bundle" iste |
| **HTTP 500.30 / 500.32** | Uygulama havuzu 32-bit olabilir → Plesk'te *Dedicated IIS Application Pool* ayarlarında 32-bit'i kapat veya `win-x86` paketini kullan |
| Uygulama açılmıyor, sebep belli değil | `web.config` içinde `stdoutLogEnabled="true"` yap, kökte `logs` klasörü oluştur, siteyi aç ve `logs` içindeki dosyaya bak |
| İş "Kuyrukta" kalıyor | İş sayfasındaki hata mesajına bak; GitHub token/ayarlarını kontrol et; *İşçiyi tekrar tetikle* |
| İş GitHub'da başlıyor ama hata veriyor | GitHub → Actions → "Metaficta işçi" çalıştırmasının günlüğüne bak; genelde eksik secret veya yanlış `PANEL_URL` |
| Video yüklenirken hata | Disk kotasını kontrol et; işçi dosyaları 16 MB'lık parçalarla yüklediği için boyut sınırına takılmaz |

## 8. Maliyet ve sınırlar

- **GitHub Actions:** Özel (private) depolarda aylık ücretsiz dakika sınırı vardır (güncel değeri GitHub *Billing* sayfasından kontrol et).
  Senaryo/ses/görsel işleri birkaç dakika sürer. Render en uzun adımdır: 10 dakikalık bir videonun final render'ı
  GitHub'ın ücretsiz makinelerinde yaklaşık 1 saat sürebilir. Taslak render yarım çözünürlükte ve daha hızlıdır.
- **Disk:** Her proje (ses + görseller + videolar) birkaç yüz MB tutabilir. YouTube'a yüklenen eski projelerin
  `render` klasörünü silerek yer açabilirsin.
