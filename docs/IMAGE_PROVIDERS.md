# Yapay Zekâ Görsel Servisi Karşılaştırması (Ekim 2026)

> Amaç: Metaficta videolarındaki tanrı, mitoloji, kozmik ve gelecek sahnelerini **düşük bütçeyle** ve
> **aynı karakter her videoda aynı görünecek şekilde** üretmek.
> Fiyatlar Ekim 2026'da web araştırmasıyla derlendi; çoğu üçüncü taraf kaynaklardan. İlk kullanımda
> sağlayıcının kendi panelinden doğrulanmalı.

## 1. İhtiyaç

| Kriter | Neden önemli |
|---|---|
| **Görsel başına maliyet** | Uzun video ~25–35, Shorts ~2–5 yeni görsel. Ayda ~250 görsel (deneme/yeniden üretim payıyla ~300+) |
| **Karakter tutarlılığı** | Zeus her videoda aynı yüz/zırhla görünmeli → **referans görsel** desteği şart |
| **API** | Tam otomasyon için resmi API gerekli |
| **16:9 ve 9:16** | Uzun video ve Shorts için iki farklı oran |
| **Görsel kalite** | Sinematik, epik dijital resim tarzı |

## 2. Karşılaştırma

| Servis / Model | Görsel başına (yaklaşık) | Ücretsiz kullanım | Referans görsel (tutarlılık) | Not |
|---|---|---|---|---|
| **Cloudflare Workers AI — FLUX.2 [klein] 4B** | ~$0.002–0.004 | **Var: 10.000 neuron/gün** (≈ 30–60 görsel/gün), kart gerekmez | ✅ 4 referansa kadar (referanslar en fazla 512×512) | En ucuz; kalite iyi ama en üst seviye değil |
| Cloudflare Workers AI — FLUX.2 [klein] 9B | 4B'den pahalı (başka sağlayıcılarda ~$0.015) | Aynı günlük havuzdan | ✅ 4 referans | 4B'den daha iyi kalite; Cloudflare fiyatı ilk testte ölçülmeli |
| Google Imagen 4 Fast | $0.02 | Yok | ❌ Sadece metin | Ucuz ama karakter tutarlılığı zayıf |
| Gemini 3.1 Flash-Lite Image | ~$0.034 | Yok | ✅ Görsel girdi destekli | Orta fiyat |
| Gemini 3.1 Flash Image | $0.045–0.151 (çözünürlüğe göre) | Yok | ✅ | İyi kalite ve tutarlılık |
| Gemini 3 Pro Image ("Nano Banana Pro") | ~$0.134 (1–2K), ~$0.24 (4K) | Yok | ✅ Çok güçlü | En iyi kalite; her sahne için pahalı |
| FLUX.1 Kontext [pro] | ~$0.025–0.04 | Yok | ✅ Tek referans, güçlü kimlik koruma | fal.ai / Replicate üzerinden |
| OpenAI GPT Image 2 | düşük $0.005 · orta $0.041–0.053 · yüksek $0.165–0.211 | Yok | ✅ Düzenleme ile | Düşük kalite seviyesi sinematik sahneler için yetersiz kalabilir |
| Midjourney | — | — | — | Resmi API yok → otomasyona uygun değil |
| ~~Gemini 2.5 Flash Image ("Nano Banana")~~ | — | — | — | **2 Ekim 2026'da kapatıldı**; ücretsiz katmanını anlatan bloglar eskimiş |

### Aylık maliyet tahmini (~250 görsel)

| Seçenek | Aylık |
|---|---|
| **Cloudflare FLUX.2 klein 4B** | **$0** (günlük ücretsiz kota içinde) |
| Google Imagen 4 Fast | ~$5 |
| Gemini 3.1 Flash-Lite Image | ~$8–9 |
| FLUX.1 Kontext [pro] | ~$6–10 |
| GPT Image 2 (orta kalite) | ~$10–13 |
| Gemini 3 Pro Image | ~$34+ |

## 3. Öneri: Cloudflare FLUX.2 [klein] + karakter kütüphanesi

**Ana sağlayıcı: Cloudflare Workers AI üzerinde FLUX.2 [klein].**
- Bu yayın temposunda büyük ihtimalle **tamamen ücretsiz** (günlük 10.000 neuron; kota her gün 00:00 UTC'de yenilenir).
- Kart gerekmeden başlanabilir; kota aşılırsa bile görsel başına maliyet yaklaşık $0.002–0.004.
- **4 referans görsel** desteği sayesinde karakter tutarlılığı sağlanabilir.
- Önce 4B ile başlanıp, ilk testte 9B'nin kalitesi ve neuron maliyeti karşılaştırılacak.

**Karakter tutarlılığı nasıl sağlanacak:**
1. Her tanrı/varlık için bir kez **referans portre** üretilir (birkaç aday arasından seçilir) →
   `assets/characters/<id>/reference.png` + `bible.md` (görünüm tarifi).
2. Senaryodaki her görsel, içinde hangi karakterlerin olduğunu belirtir (ör. `characters: ["zeus"]`).
3. Sahne görseli üretilirken ilgili karakterlerin referans portreleri (en fazla 4) modele verilir →
   Zeus her videoda aynı görünür.
4. Karakter kütüphanesi büyüdükçe yeni videolarda yeni portre üretmeye gerek kalmaz (maliyet ve süre düşer).

**İsteğe bağlı kalite takviyesi (ileride):** Tıklanma oranını doğrudan etkileyen **thumbnail'ler** için
Gemini 3.1 Flash Image veya Gemini 3 Pro Image kullanılabilir. Uzun video başına 3 thumbnail → ayda ~20 görsel →
~$1–3/ay. Kod sağlayıcıdan bağımsız yazılacağı için tek ayarla eklenebilir.

### Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Fiyat/kota değişebilir | Her çalıştırmada kullanılan neuron/görsel sayısı yazdırılır; sağlayıcı tek ayarla değiştirilebilir |
| Referans görseller 512×512 ile sınırlı → ince detay kaybı | Referans portreler yüz/kostüm odaklı, sade arka planla üretilir |
| Savaş/şiddet içeren mitolojik sahneler içerik filtresine takılabilir | Prompt'lar "epik, sinematik" tarzda, kan/vahşet içermeyecek şekilde yazılır; reddedilen görsel için yumuşatılmış prompt ile yeniden denenir |
| Üretilen görselde metin/yazı çıkması | Prompt'a "no text" eklenir; yazılar zaten Remotion ile eklenir |

## 4. Uygulama planı (Faz 4)

- `pnpm yt character <id>`: karakter için birkaç referans portre adayı üretir; seçilen `reference.png` olarak kaydedilir.
- `pnpm yt images <proje>`: senaryodaki tüm görselleri üretir.
  - Mevcut görselleri atlar (önbellek).
  - Karakter referanslarını otomatik ekler.
  - Uzun video için 16:9, Shorts için 9:16 üretir.
  - Temaya göre stil ön-eki ekler (ör. olympus-gold → "golden hour, marble, epic").
- Senaryo şemasına görsel başına `characters` alanı eklenir; senaryo prompt'u karakter kütüphanesini tanır.
- Kurulum rehberi: Cloudflare hesabı → Account ID + Workers AI yetkili API token → `.env`.

## Kaynaklar

- [Gemini API Pricing (Sep 2026)](https://developer.puter.com/tutorials/gemini-api-pricing/)
- [Google Imagen 4 & Nano Banana Pricing 2026](https://the-rogue-marketing.github.io/google-nano-banana-imagen-4-image-generation-pricing-may-2026/)
- [Gemini 3.1 Flash-Lite Image — OpenRouter](https://openrouter.ai/google/gemini-3.1-flash-lite-image)
- [Gemini API free tier değişiklikleri (agentdeals #2017)](https://github.com/robhunter/agentdeals/issues/2017)
- [Flux API Pricing 2026](https://pricepertoken.com/flux-pricing)
- [FLUX.2 Klein 4B — OpenRouter](https://openrouter.ai/black-forest-labs/flux.2-klein-4b)
- [FLUX.2 [klein] 4B on Workers AI — Cloudflare Changelog](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/)
- [FLUX.2 [klein] 9B on Workers AI — Cloudflare Changelog](https://developers.cloudflare.com/changelog/post/2026-01-28-flux-2-klein-9b-workers-ai/)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Workers AI free tier (no credit card)](https://yangmao.ai/en/providers/cloudflare-workers-ai/no-credit-card/)
- [FLUX.1 Kontext — character consistency (Together AI)](https://www.together.ai/blog/flux-1-kontext)
- [FLUX.1 Kontext [pro] on fal](https://fal.ai/models/fal-ai/flux-pro/kontext)
- [GPT Image 2 Pricing 2026](https://wavespeed.ai/blog/posts/gpt-image-2-pricing-2026/)
- [GPT Image API Pricing 2026](https://pricepertoken.com/gpt-image-pricing)
