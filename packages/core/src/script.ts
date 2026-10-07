import { z } from "zod";
import { ThemeIdSchema } from "./themes";

/*
 * Senaryo şeması — LLM'in ürettiği ve Remotion'ın render ettiği tek veri formatı.
 *
 * Not: Bu şema Claude structured outputs ile de kullanıldığı için sayısal sınır
 * (min/max), varsayılan değer ve uzunluk kısıtı içermez; bu kurallar açıklamalarda
 * (describe) belirtilir ve render tarafında güvenli şekilde uygulanır (clamp).
 */

export const SERIES_IDS = [
  "gods-battle",
  "pantheon",
  "lost-civilizations",
  "cosmic-scale",
  "future-year",
  "top-10",
  "did-you-know",
  "tier-list",
  "standalone",
] as const;
export const SeriesIdSchema = z.enum(SERIES_IDS);
export type SeriesId = z.infer<typeof SeriesIdSchema>;

export const FormatSchema = z.enum(["long", "short"]);
export type VideoFormat = z.infer<typeof FormatSchema>;

export const TransitionSchema = z
  .enum(["fade", "slide", "wipe", "flash", "zoom", "whip", "burn", "none"])
  .describe(
    "Bu sahneye GİRİŞ geçişi. Vurgu anlarında 'flash', bölüm geçişlerinde 'wipe' veya 'zoom', hızlı aksiyonda 'whip' (hareket bulanıklıklı kaydırma), duygusal/sinematik anlarda 'burn' (ışık sızıntısıyla erime), genelde 'fade'.",
  );
export type TransitionKind = z.infer<typeof TransitionSchema>;

export const CharacterSchema = z.object({
  id: z.string().describe("Karakter kütüphanesi kimliği, İngilizce kebab-case (ör. 'zeus', 'umay')"),
  name: z.string().describe("Türkçe görünen ad"),
  look: z
    .string()
    .describe("İngilizce, kalıcı görünüm tarifi: yaş, yüz, saç/sakal, kıyafet, sembol nesneler, renkler. Her videoda aynı karakter için aynı tarif."),
});
export type Character = z.infer<typeof CharacterSchema>;

export const ImageRefSchema = z.object({
  id: z
    .string()
    .describe("Tekrar kullanılabilir görsel kimliği, İngilizce kebab-case (ör. 'zeus-portrait'). Aynı karakter veya mekân için her yerde aynı id."),
  prompt: z
    .string()
    .describe("İngilizce görsel üretim prompt'u: konu, kompozisyon, ışık, atmosfer. Ana özne ortada. Yazı/metin içermesin."),
  characters: z
    .array(z.string())
    .describe("Görselde görünen karakterlerin id'leri (en fazla 4, `characters` listesinden). Karakter yoksa boş liste."),
  motion: z
    .string()
    .optional()
    .describe("İsteğe bağlı İngilizce image-to-video hareket prompt'u: bu görsel kısa bir video klibe çevrilecekse kamera ve sahne hareketi."),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

export const StatSchema = z.object({
  label: z.string().describe("Kısa Türkçe etiket, ör. 'Güç'"),
  value: z.number().describe("0 ile 100 arası puan"),
});
export type Stat = z.infer<typeof StatSchema>;

const sceneBase = {
  id: z.string().describe("Sıralı sahne kimliği: s01, s02, ..."),
  narration: z
    .string()
    .describe("Bu sahnede seslendirilecek Türkçe metin. Kısa, akıcı cümleler; rakamlar yazıyla okunacak şekilde."),
  transition: TransitionSchema.optional(),
};

export const ColdOpenSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("ColdOpen"),
  headline: z.string().describe("Ekranda dev harflerle görünecek 2-5 kelimelik şok cümle"),
  image: ImageRefSchema.optional(),
});

export const CinematicImageSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("CinematicImage"),
  image: ImageRefSchema,
  overlayText: z.string().optional().describe("İsteğe bağlı kısa vurgu yazısı (en fazla 6 kelime)"),
  motion: z.enum(["push-in", "pull-out", "pan-left", "pan-right"]).describe("Kamera hareketi"),
});

export const ChapterTitleSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("ChapterTitle"),
  chapterNumber: z.number().describe("1'den başlayan bölüm numarası"),
  title: z.string().describe("Bölüm başlığı (YouTube chapter olarak da kullanılır)"),
  subtitle: z.string().optional(),
});

export const QuoteSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("Quote"),
  quote: z.string().describe("Kadim metinden veya tarihî kişiden alıntı (Türkçe çeviri)"),
  attribution: z.string().describe("Kaynak, ör. 'Hesiodos, Theogonia'"),
});

export const StatCounterSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("StatCounter"),
  value: z.number().describe("Sayılacak hedef sayı"),
  prefix: z.string().optional(),
  suffix: z.string().optional().describe("ör. ' YIL', ' KM', '%'"),
  label: z.string().describe("Sayının altındaki açıklama"),
  image: ImageRefSchema.optional(),
});

export const CharacterCardSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("CharacterCard"),
  name: z.string(),
  epithet: z.string().describe("Unvan, ör. 'Olimpos'un Kralı'"),
  mythology: z.string().describe("ör. 'Yunan Mitolojisi'"),
  image: ImageRefSchema,
  stats: z.array(StatSchema).describe("3-5 adet puan"),
});

export const FighterSchema = z.object({
  name: z.string(),
  epithet: z.string(),
  image: ImageRefSchema,
  stats: z.array(StatSchema).describe("Her iki tarafta aynı etiketler, aynı sırada"),
});

export const VersusSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("Versus"),
  left: FighterSchema,
  right: FighterSchema,
  verdict: z.enum(["left", "right", "draw", "hidden"]).describe("Sonucu göster ya da 'hidden' ile merakta bırak"),
});

export const TimelineSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("Timeline"),
  title: z.string().optional(),
  events: z.array(z.object({ date: z.string().describe("ör. 'MÖ 9600'"), label: z.string() })).describe("3-6 olay, kronolojik"),
  focusIndex: z.number().describe("Vurgulanacak olayın sırası (0'dan başlar)"),
});

export const CountdownSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("Countdown"),
  rank: z.number(),
  title: z.string(),
  subtitle: z.string().optional(),
  image: ImageRefSchema,
});

export const OutroSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("Outro"),
  cta: z.string().describe("Abone olma / yorum çağrısı (ekranda görünür)"),
  nextVideoTeaser: z.string().optional().describe("Sonraki videoya merak köprüsü"),
});

export const SceneSchema = z.discriminatedUnion("type", [
  ColdOpenSceneSchema,
  CinematicImageSceneSchema,
  ChapterTitleSceneSchema,
  QuoteSceneSchema,
  StatCounterSceneSchema,
  CharacterCardSceneSchema,
  VersusSceneSchema,
  TimelineSceneSchema,
  CountdownSceneSchema,
  OutroSceneSchema,
]);
export type Scene = z.infer<typeof SceneSchema>;
export type SceneType = Scene["type"];
export type SceneOf<T extends SceneType> = Extract<Scene, { type: T }>;

export const FactCheckSchema = z.object({
  claim: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().describe("Neden bu güven seviyesi; tartışmalıysa farklı görüşler"),
});

/** LLM'in ürettiği kısım. */
export const ScriptDraftSchema = z.object({
  workingTitle: z.string(),
  titleOptions: z.array(z.string()).describe("3-5 YouTube başlığı, her biri en fazla 60 karakter"),
  hook: z.string().describe("Videonun ilk cümlesi"),
  summary: z.string().describe("2-3 cümlelik içerik özeti"),
  scenes: z.array(SceneSchema),
  loopLine: z.string().optional().describe("Sadece Shorts: videonun başına bağlanan son cümle"),
  description: z.string().describe("YouTube açıklaması (chapter zaman damgaları HARİÇ, onlar otomatik eklenir)"),
  tags: z.array(z.string()),
  hashtags: z.array(z.string()).describe("3 adet, # ile"),
  thumbnail: z.object({
    text: z.string().describe("2-4 kelimelik büyük yazı"),
    concept: z.string().describe("Thumbnail görsel fikri"),
    image: ImageRefSchema,
  }),
  characters: z.array(CharacterSchema).describe("Senaryodaki görsellerde görünen TÜM karakterler (kütüphanede olanlar dahil)"),
  factChecks: z.array(FactCheckSchema).describe("Senaryodaki doğrulanması gereken tüm önemli iddialar"),
  sources: z.array(z.object({ title: z.string(), url: z.string().optional() })),
});
export type ScriptDraft = z.infer<typeof ScriptDraftSchema>;

/** Diske kaydedilen tam senaryo. */
export const ScriptSchema = ScriptDraftSchema.extend({
  id: z.string(),
  topic: z.string(),
  format: FormatSchema,
  language: z.literal("tr"),
  series: SeriesIdSchema,
  theme: ThemeIdSchema,
  createdAt: z.string(),
  parentId: z.string().optional().describe("Uzun videodan türetilen Shorts için kaynak senaryo id'si"),
});
export type Script = z.infer<typeof ScriptSchema>;

/** Senaryodaki tüm görsel referanslarını (tekilleştirilmiş) döndürür. */
export const collectImages = (script: Pick<Script, "scenes" | "thumbnail">): ImageRef[] => {
  const found = new Map<string, ImageRef>();
  const add = (ref?: ImageRef) => {
    if (ref && !found.has(ref.id)) found.set(ref.id, ref);
  };
  for (const scene of script.scenes) {
    switch (scene.type) {
      case "ColdOpen":
      case "StatCounter":
      case "CinematicImage":
      case "CharacterCard":
      case "Countdown":
        add(scene.image);
        break;
      case "Versus":
        add(scene.left.image);
        add(scene.right.image);
        break;
      default:
        break;
    }
  }
  add(script.thumbnail.image);
  return [...found.values()];
};
