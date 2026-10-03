import type { Script } from "./script";

/*
 * Örnek senaryolar: Remotion Studio önizlemesi, testler ve LLM prompt'larına
 * format örneği olarak kullanılır. Gerçek videolar `pnpm yt new` ile üretilir.
 */

const zeus = {
  id: "zeus-portrait",
  prompt: "Zeus, king of the Greek gods, muscular bearded elder with storm-grey hair, holding a crackling golden thunderbolt, standing on Mount Olympus above the clouds, dramatic rim lighting, epic cinematic digital painting",
  characters: ["zeus"],
};
const odin = {
  id: "odin-portrait",
  prompt: "Odin the Allfather, one-eyed Norse god with long grey beard, wide-brimmed hood, spear Gungnir, two ravens on his shoulders, frost and aurora behind him, dramatic cinematic digital painting",
  characters: ["odin"],
};

const ZEUS = {
  id: "zeus",
  name: "Zeus",
  look: "muscular elder man in his fifties, long storm-grey hair and full beard, piercing blue eyes, white and gold Greek chiton, golden laurel crown, holding a crackling golden thunderbolt",
};
const ODIN = {
  id: "odin",
  name: "Odin",
  look: "tall old man with a long grey braided beard, missing right eye, dark blue wide-brimmed hood and cloak, silver runic armor, spear Gungnir, two black ravens",
};

export const SAMPLE_LONG_SCRIPT: Script = {
  id: "sample-zeus-vs-odin",
  topic: "Zeus vs Odin — kim kazanırdı?",
  format: "long",
  language: "tr",
  series: "gods-battle",
  theme: "olympus-gold",
  createdAt: "2026-10-03T00:00:00.000Z",
  workingTitle: "Zeus vs Odin — Kim Kazanırdı?",
  titleOptions: ["Zeus vs Odin: Kim Kazanırdı?", "Yıldırım mı Bilgelik mi? Zeus ve Odin Karşı Karşıya", "Olimpos ile Asgard Savaşsaydı"],
  hook: "Biri yıldırımları yönetir. Diğeri, bilgelik için kendi gözünü feda etti.",
  summary: "Yunan ve İskandinav mitolojilerinin baş tanrıları Zeus ve Odin'i güç, zekâ ve büyü açısından karşılaştırıyoruz.",
  scenes: [
    {
      id: "s01",
      type: "ColdOpen",
      headline: "YILDIRIM VS BİLGELİK",
      narration: "Biri yıldırımları yönetir. Diğeri, bilgelik için kendi gözünü feda etti. Peki bu iki tanrı karşılaşsaydı, kim ayakta kalırdı?",
      image: {
        id: "zeus-odin-clash",
        prompt: "Zeus and Odin facing each other across a stormy sky split between golden lightning and icy aurora, epic cinematic wide shot",
        characters: ["zeus", "odin"],
      },
    },
    { id: "s02", type: "ChapterTitle", chapterNumber: 1, title: "Gök Gürültüsünün Efendisi", subtitle: "Zeus", narration: "Önce Olimpos'a gidelim.", transition: "wipe" },
    {
      id: "s03",
      type: "CharacterCard",
      name: "ZEUS",
      epithet: "Olimpos'un Kralı",
      mythology: "Yunan Mitolojisi",
      image: zeus,
      stats: [
        { label: "Güç", value: 95 },
        { label: "Zekâ", value: 75 },
        { label: "Büyü", value: 70 },
        { label: "Etki", value: 98 },
      ],
      narration: "Zeus, Yunan tanrılarının kralı. Gökyüzünü, yıldırımları ve fırtınaları yönetir. Babası Kronos'u ve Titanları yenerek tahta oturdu.",
    },
    {
      id: "s04",
      type: "CinematicImage",
      image: {
        id: "titanomachy",
        prompt: "The Titanomachy, Olympian gods battling giant Titans amid volcanic fire and lightning, epic cinematic wide shot",
        characters: ["zeus"],
      },
      motion: "push-in",
      overlayText: "TİTANLARIN SAVAŞI",
      narration: "On yıl süren Titanlar Savaşı'nda, Kykloplar'ın onun için dövdüğü yıldırım, savaşın kaderini değiştirdi.",
      transition: "flash",
    },
    { id: "s05", type: "ChapterTitle", chapterNumber: 2, title: "Her Şeyin Babası", subtitle: "Odin", narration: "Şimdi kuzeyin buzlu diyarlarına.", transition: "zoom" },
    {
      id: "s06",
      type: "CharacterCard",
      name: "ODİN",
      epithet: "Her Şeyin Babası",
      mythology: "İskandinav Mitolojisi",
      image: odin,
      stats: [
        { label: "Güç", value: 82 },
        { label: "Zekâ", value: 99 },
        { label: "Büyü", value: 96 },
        { label: "Etki", value: 88 },
      ],
      narration: "Odin, Asgard'ın hükümdarı. Savaşın, şiirin ve bilgeliğin tanrısı. Gücünü kastan çok bilgiden alır.",
    },
    {
      id: "s07",
      type: "Quote",
      quote: "Rüzgârlı ağaçta asılı kaldım, tam dokuz gece, mızrakla yaralanmış, kendimi kendime adayarak.",
      attribution: "Hávamál, Şiirsel Edda",
      narration: "Efsaneye göre Odin, rünlerin sırrını öğrenmek için dünya ağacı Yggdrasil'de dokuz gece asılı kaldı.",
    },
    {
      id: "s08",
      type: "StatCounter",
      value: 9,
      suffix: " GECE",
      label: "Odin'in Yggdrasil'de asılı kaldığı süre",
      narration: "Dokuz gece. Ne yemek, ne su. Sadece bilgi.",
    },
    {
      id: "s09",
      type: "Timeline",
      title: "Bu Mitleri Nereden Biliyoruz?",
      events: [
        { date: "MÖ 8. yüzyıl", label: "Homeros, İlyada" },
        { date: "MÖ 700 civarı", label: "Hesiodos, Theogonia" },
        { date: "MS 1220 civarı", label: "Snorri, Düzyazı Edda" },
        { date: "MS 1270 civarı", label: "Codex Regius" },
      ],
      focusIndex: 2,
      narration: "Zeus'u anlatan metinler yaklaşık iki bin yedi yüz yıllık. Odin'in hikâyeleri ise çok daha sonra, Orta Çağ İzlanda'sında yazıya geçirildi.",
    },
    { id: "s10", type: "ChapterTitle", chapterNumber: 3, title: "Karşılaşma", narration: "Ve şimdi asıl soru.", transition: "wipe" },
    {
      id: "s11",
      type: "Versus",
      left: { name: "ZEUS", epithet: "Yıldırım", image: zeus, stats: [{ label: "Güç", value: 95 }, { label: "Zekâ", value: 75 }, { label: "Büyü", value: 70 }] },
      right: { name: "ODİN", epithet: "Bilgelik", image: odin, stats: [{ label: "Güç", value: 82 }, { label: "Zekâ", value: 99 }, { label: "Büyü", value: 96 }] },
      verdict: "hidden",
      narration: "Kaba güçte Zeus önde. Ama zekâ ve büyüde Odin rakipsiz. Bu savaş, yıldırımın hızıyla bilgeliğin sabrı arasında geçerdi.",
      transition: "flash",
    },
    {
      id: "s12",
      type: "Outro",
      cta: "Sence kim kazanırdı? Yorumlara yaz!",
      nextVideoTeaser: "Sıradaki karşılaşma: Ra vs Thor",
      narration: "Sence kim kazanırdı? Cevabını yorumlara yaz. Bir sonraki karşılaşmada güneş tanrısı Ra, gök gürültüsü tanrısı Thor'a karşı.",
    },
  ],
  description: "Yunan mitolojisinin kralı Zeus ile İskandinav mitolojisinin Her Şeyin Babası Odin'i karşılaştırıyoruz.",
  tags: ["zeus", "odin", "mitoloji", "yunan mitolojisi", "iskandinav mitolojisi", "tanrılar"],
  hashtags: ["#mitoloji", "#zeus", "#odin"],
  thumbnail: {
    text: "ZEUS vs ODİN",
    concept: "İki tanrı karşı karşıya, ortada parlayan VS",
    image: { id: "zeus-odin-clash", prompt: "Zeus and Odin facing each other", characters: ["zeus", "odin"] },
  },
  characters: [ZEUS, ODIN],
  factChecks: [
    { claim: "Odin Yggdrasil'de dokuz gece asılı kaldı", confidence: "high", note: "Hávamál 138. kıta" },
    { claim: "Titanlar Savaşı on yıl sürdü", confidence: "high", note: "Hesiodos, Theogonia" },
  ],
  sources: [{ title: "Hesiodos, Theogonia" }, { title: "Hávamál (Şiirsel Edda)" }, { title: "Snorri Sturluson, Düzyazı Edda" }],
};

export const SAMPLE_SHORT_SCRIPT: Script = {
  id: "sample-odin-eye",
  topic: "Odin bilgelik için bir gözünü feda etti",
  format: "short",
  language: "tr",
  series: "did-you-know",
  theme: "norse-frost",
  createdAt: "2026-10-03T00:00:00.000Z",
  parentId: "sample-zeus-vs-odin",
  workingTitle: "Odin Neden Tek Gözlü?",
  titleOptions: ["Odin Neden Tek Gözlü? #Shorts", "Bilgelik İçin Gözünü Veren Tanrı"],
  hook: "İskandinav tanrılarının babası, kendi gözünü bir kuyuya attı.",
  summary: "Odin'in Mímir'in kuyusunda bilgelik karşılığında gözünü feda etmesi.",
  scenes: [
    {
      id: "s01",
      type: "ColdOpen",
      headline: "GÖZÜNÜ KUYUYA ATTI",
      narration: "İskandinav tanrılarının babası, kendi gözünü bir kuyuya attı.",
      image: odin,
    },
    {
      id: "s02",
      type: "CinematicImage",
      image: {
        id: "mimir-well",
        prompt: "Mimir's well beneath the roots of Yggdrasil, glowing water, ancient runes, mist, vertical cinematic composition",
        characters: [],
      },
      motion: "push-in",
      overlayText: "MİMİR'İN KUYUSU",
      narration: "Dünya ağacının köklerinde, Mímir'in kuyusu vardı. Suyundan içen, evrenin tüm bilgeliğine sahip olurdu.",
      transition: "flash",
    },
    {
      id: "s03",
      type: "StatCounter",
      value: 1,
      suffix: " GÖZ",
      label: "Bir yudum bilgeliğin bedeli",
      narration: "Ama bedeli ağırdı. Tek bir yudum için Odin, gözlerinden birini verdi.",
    },
    {
      id: "s04",
      type: "CinematicImage",
      image: odin,
      motion: "pull-out",
      overlayText: "BİLGELİK > GÜÇ",
      narration: "Ve bu yüzden Odin, gücünü kastan değil bilgiden alır. Peki sen olsan, bilgelik için neyi feda ederdin?",
      transition: "zoom",
    },
  ],
  loopLine: "Çünkü İskandinav tanrılarının babası, kendi gözünü bir kuyuya attı.",
  description: "Odin, Mímir'in kuyusundan bir yudum içebilmek için gözünü feda etti.",
  tags: ["odin", "iskandinav mitolojisi", "mitoloji"],
  hashtags: ["#Shorts", "#odin", "#mitoloji"],
  thumbnail: { text: "ODİN'İN GÖZÜ", concept: "Tek gözlü Odin, parlayan kuyu", image: odin },
  characters: [ODIN],
  factChecks: [{ claim: "Odin bilgelik için gözünü Mímir'in kuyusuna verdi", confidence: "high", note: "Völuspá ve Düzyazı Edda (Gylfaginning)" }],
  sources: [{ title: "Völuspá (Şiirsel Edda)" }, { title: "Snorri Sturluson, Gylfaginning" }],
};
