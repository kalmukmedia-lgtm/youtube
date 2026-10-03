# Seslendirme Kurulumu (Azure Neural TTS)

Metaficta videoları Azure'un yapay zekâ sesleriyle Türkçe seslendirilir. Azure her kelimenin seste hangi anda
söylendiğini de verdiği için altyazılar kelime kelime senkronlanır; ayrıca konuşma tanıma aracı gerekmez.

## 1. Azure hesabı ve Speech kaynağı (tek seferlik, ~10 dk)

1. [azure.microsoft.com](https://azure.microsoft.com) üzerinden ücretsiz hesap aç
   (kimlik doğrulama için kart istenebilir; ücretsiz katmanda ücret kesilmez).
2. [portal.azure.com](https://portal.azure.com) → **Kaynak oluştur** → **Speech** (Konuşma hizmeti) ara → **Oluştur**
   - Kaynak grubu: `metaficta`
   - Bölge: `West Europe` (Türkiye'ye yakın) — bölge kodu: `westeurope`
   - Ad: `metaficta-speech`
   - Fiyatlandırma katmanı: **Free F0** (abonelik başına bir adet ücretsiz kaynak açılabilir)
3. Kaynak açılınca → **Anahtarlar ve Uç Nokta** → `KEY 1` ve `Konum/Bölge` değerlerini kopyala.
4. Repo kökündeki `.env` dosyasına yaz:
   ```bash
   AZURE_SPEECH_KEY=buraya-key-1
   AZURE_SPEECH_REGION=westeurope
   ```

> **Ücretsiz kota:** Free F0 katmanı her ay belirli bir karakter kotasıyla gelir. 10 dakikalık bir video yaklaşık
> 9.000–11.000 karakter, 45 saniyelik bir Shorts ~700 karakterdir. Güncel kota ve fiyatlar için Azure'un
> "Speech services pricing" sayfasına bak. Sistem, metni değişmeyen sahneleri tekrar seslendirmediği için
> senaryo düzenlemeleri kotayı boşa harcamaz.

## 2. Sesi seç

```bash
pnpm yt voices                    # Türkçe konuşabilen tüm sesler (Türkçe + çok dilli)
pnpm yt voice-test "Efsanenin bittiği yerde gerçek başlar." --voice tr-TR-AhmetNeural
pnpm yt voice-test "Efsanenin bittiği yerde gerçek başlar." --voice tr-TR-EmelNeural --rate "-10%"
```

Örnek dosyalar `voice-tests/` klasörüne kaydedilir. Beğendiğin ses ve ayarları `config/voice.yaml` dosyasına yaz:

| Ayar | Açıklama | Önerilen |
|---|---|---|
| `voice` | Ses adı | `tr-TR-AhmetNeural` (tok erkek) veya `tr-TR-EmelNeural` |
| `rate` | Konuşma hızı | `-4%` … `-10%` (belgesel anlatımı için biraz yavaş) |
| `pitch` | Ses tonu | `-2%` … `-5%` (daha tok) |
| `sentencePauseMs` | Cümle arası duraklama | `300` … `450` |
| `musicVolume` | Fon müziği seviyesi | `0.15` … `0.3` |

> İpucu: `pnpm yt voices` listesindeki **çok dilli** sesler (adında `Multilingual` geçenler) Türkçeyi de konuşur
> ve bazıları daha duygulu anlatım yapar. Mutlaka `voice-test` ile dinleyerek karşılaştır.

## 3. Telaffuz sözlüğü

Yabancı isimler (Yggdrasil, Mjölnir, Hávamál…) Türkçe sesle yanlış okunabilir. `config/pronunciation.yaml`
dosyasına `yazım: okunuş` olarak ekle. Altyazıda orijinal yazım görünür, seslendirmede okunuş kullanılır.

```yaml
Yggdrasil: İgdrasil
Mjölnir: Myölnir
```

## 4. Seslendirme akışı

```bash
pnpm yt approve <proje>     # senaryo onayı (kota boşa gitmesin diye zorunlu)
pnpm yt voice <proje>       # sahne başına MP3 + kelime zamanları → audio/
pnpm yt render <proje>      # sesli, altyazılı, müzikli video
```

- Senaryoda bir sahneyi değiştirip `yt voice`'u tekrar çalıştırırsan **sadece değişen sahne** yeniden seslendirilir.
- Ses ayarını (`voice`, `rate`, `pitch`…) değiştirirsen tüm sahneler yeniden seslendirilir.
- `--force` tüm sahneleri zorla yeniden seslendirir.

## 5. Fon müziği

`assets/music/<ruh-hali>/` klasörlerine telifsiz parçalar koy (bkz. [assets/music/README.md](../assets/music/README.md)).
Render sırasında temaya uygun bir parça otomatik seçilir ve anlatım sırasında sesi otomatik kısılır.
