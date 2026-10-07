# Video klipler ve motion graphics

## Karma yöntem: görsel + video klip
Her sahne bir görselle başlar. Önemli sahnelerde (senaryoda `image.motion` alanı olanlar) görsel,
bir image-to-video aracında (Kling, Runway, Hailuo, Luma…) 5–10 saniyelik bir klibe çevrilir.

- Klip, görselle **aynı adla** `visuals/<görsel-id>.mp4` (veya .webm/.mov) olarak konur.
- Render sırasında sistem klibi görür ve sahnede görselin yerine onu oynatır; thumbnail yine görseli kullanır.
- Klip sahneden kısaysa en fazla 0,6× hıza kadar yavaşlatılır; yine yetmezse son karesinde donar.
  Üstteki kamera hareketi sürdüğü için donma fark edilmez. Klibin kendi sesi kapatılır.
- Shorts'ta klip de dikey kırpılır; ana öğenin ortada olması önemlidir.

Üretim listesi (`python3 scripts/uretim_paketi.py videos/<proje>`) klipleri ve hareket prompt'larını
"Video klipler" bölümünde ayrıca listeler.

## Motion graphics katmanı
| Öğe | Nerede |
|---|---|
| Sinematik başlık açılışı (harf aralığı daralır, alttan maskeyle gelir, üzerinden ışık geçer) | Görsel başlıkları, bölüm başlıkları |
| Dönen süslü halka, dev Romen rakamı, ışık huzmeleri | Bölüm başlıkları |
| Kamera sarsıntısı + ışık sızıntısı | Açılış başlığının son kelimesi, `flash`/`whip` girişleri, VS anı |
| Sis/duman katmanı ve "elde tutulan kamera" salınımı | Tüm görsel/klip sahneleri |
| `whip` geçişi (hareket bulanıklıklı savurma) | Hızlı aksiyon sahneleri |
| `burn` geçişi (ışık sızıntısıyla erime) | Duygusal/sinematik geçişler |
| Bölüm etiketi (sol üst) | Uzun videolarda her bölüm başında 5 sn |

## Ses tasarımı
`assets/sfx/` içindeki efektler otomatik yerleştirilir: geçişlerde **whoosh**, flash/açılış/VS anlarında
**impact**, bölüm başlıklarından önce **riser**. Dosyalar ffmpeg ile sentezlendi; aynı adlarla
YouTube Ses Kitaplığı'ndaki efektlerle değiştirilebilir.
