# Fon Müziği Kütüphanesi

Her temanın bir müzik ruh hali (`musicMood`) var; render sırasında ilgili klasörden bir parça seçilir.
Aynı proje her render'da aynı parçayı alır. Bir projeye özel parça istersen proje klasörüne `music.mp3` koy.

| Klasör | Tema | Önerilen tarz |
|---|---|---|
| `epic-orchestral/` | olympus-gold | Epik orkestra, koro |
| `nordic/` | norse-frost | Davul, kuzey ezgileri |
| `ethnic-mystery/` | egypt-sand | Gizemli, etnik |
| `steppe/` | turkic-steppe | Kopuz, gırtlak ezgisi, bozkır |
| `ambient/` | ancient-sepia | Sakin, atmosferik |
| `cosmic-ambient/` | cosmic-void | Uzay ambiyansı, synth pad |
| `synthwave/` | future-neon | Elektronik, synthwave |

**Kaynak:** YouTube Studio → Ses Kitaplığı (telif sorunu olmayan, ücretsiz) veya lisansını bildiğin parçalar.
Desteklenen biçimler: `.mp3`, `.m4a`, `.wav`, `.ogg`.

Ses dosyaları boyutları nedeniyle git'e eklenmez (`.gitignore`); bu klasörü kendi bilgisayarında doldur.
