# Görsel Üretim Kurulumu (Cloudflare Workers AI — FLUX.2 [klein])

Seçim gerekçesi ve fiyat karşılaştırması: [IMAGE_PROVIDERS.md](IMAGE_PROVIDERS.md)

## 1. Cloudflare hesabı ve API token (tek seferlik, ~5 dk, kart gerekmez)

1. [dash.cloudflare.com](https://dash.cloudflare.com) üzerinden ücretsiz hesap aç.
2. **Account ID:** Panelde sağ taraftaki "Account ID" değerini kopyala (Workers & Pages → Overview sayfasında da görünür).
3. **API token:** Sağ üst profil → **My Profile → API Tokens → Create Token** →
   "Workers AI" şablonunu seç (veya Custom Token: *Account → Workers AI → Read* ve *Edit*) → Create.
4. Repo kökündeki `.env` dosyasına yaz:
   ```bash
   CLOUDFLARE_ACCOUNT_ID=...
   CLOUDFLARE_API_TOKEN=...
   ```

> Ücretsiz kota günde 10.000 neuron (her gün 00:00 UTC'de yenilenir). 1536×864 bir sahne görseli
> yaklaşık 160–170 neuron → günde ~60 görsel. Her `yt images` çalıştırması tahmini kullanımı yazdırır.

## 2. Karakter kütüphanesi

Tanrılar ve varlıklar her videoda aynı görünsün diye her karakterin bir **referans portresi** vardır:
`assets/characters/<id>/reference.png` (+ `character.json`: ad ve İngilizce görünüm tarifi).

- **Otomatik:** `yt images` senaryoda geçen ama kütüphanede olmayan bir karakter görürse, senaryodaki görünüm
  tarifinden bir referans portre üretip kütüphaneye ekler.
- **Elle seçerek (önerilen, önemli karakterler için):**
  ```bash
  pnpm yt character create zeus --name "Zeus" \
    --look "muscular elder man, long storm-grey hair and beard, white and gold chiton, golden laurel crown, golden thunderbolt"
  # assets/characters/zeus/candidates/ altındaki 4 adaya bak, beğendiğini seç:
  pnpm yt character pick zeus 3
  pnpm yt character list
  ```

Referans portreler ve `character.json` git'e eklenir (kanalın görsel kimliğinin parçası); adaylar eklenmez.
Senaryo üretimi kütüphaneyi bilir: Claude bilinen karakterlerin id'lerini ve görünüm tariflerini kullanır.

## 3. Görselleri üret

```bash
pnpm yt images <proje>                         # eksik tüm görseller
pnpm yt images <proje> --only zeus-portrait --force   # tek görseli yeniden üret
pnpm yt stills <proje>                         # sonucu sahne sahne kontrol et
```

- Uzun videolar 16:9 (1536×864), Shorts 9:16 (864×1536) üretilir; boyutlar `config/images.yaml`'da.
- Beğenmediğin bir görselin prompt'unu `script.json`'da düzenleyip `--only <id> --force` ile yeniden üret.
- İçerik filtresine takılan görsel otomatik olarak yumuşatılmış prompt ile yeniden denenir.
- Bir görsel başarısız olursa diğerleri üretilmeye devam eder; komutu tekrar çalıştırınca sadece eksikler denenir.
- Daha yüksek kalite için `config/images.yaml`'da modeli `@cf/black-forest-labs/flux-2-klein-9b` yap
  (neuron maliyeti daha yüksek; değerleri Cloudflare fiyat sayfasından güncelle).
