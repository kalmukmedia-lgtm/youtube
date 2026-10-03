import { z } from "zod";
import { type Scene, ScriptSchema, type TransitionKind } from "./script";

export const FPS = 30;
export const TRANSITION_FRAMES = 15;
/** Uzun videolarda ColdOpen'dan sonra gelen METAFICTA logo animasyonu. */
export const STING_FRAMES = 75;
/** Türkçe anlatım hızı (kelime/sn) — gerçek ses gelene kadar süre tahmini için. */
export const WORDS_PER_SECOND = 2.4;

export const WordTimingSchema = z.object({
  text: z.string(),
  /** Sahne sesinin başından itibaren saniye. */
  start: z.number(),
  end: z.number(),
});
export type WordTiming = z.infer<typeof WordTimingSchema>;

export const SceneAudioSchema = z.object({
  src: z.string(),
  durationSec: z.number(),
  /** Kelime zamanları (TTS'ten); altyazılar bunlarla senkronlanır. Yoksa tahmin edilir. */
  words: z.array(WordTimingSchema).optional(),
  /** Seslendirilen SSML'in özeti: metin değişmediyse sahne yeniden seslendirilmez. */
  hash: z.string().optional(),
});
export type SceneAudio = z.infer<typeof SceneAudioSchema>;

/** Remotion kompozisyonlarına giden props. */
export const RenderInputSchema = z.object({
  script: ScriptSchema,
  /** Görsel id → dosya yolu/URL. Eksik görseller için tema bazlı prosedürel arka plan çizilir. */
  assets: z.record(z.string(), z.string()),
  /** Sahne id → anlatım sesi. Yoksa süre metinden tahmin edilir. */
  audio: z.record(z.string(), SceneAudioSchema),
  /** Fon müziği; konuşma sırasında otomatik kısılır (ducking). */
  music: z.object({ src: z.string(), volume: z.number() }).optional(),
});
export type RenderInput = z.infer<typeof RenderInputSchema>;

const MIN_SECONDS: Record<Scene["type"], number> = {
  ColdOpen: 3,
  CinematicImage: 3,
  ChapterTitle: 3,
  Quote: 4,
  StatCounter: 3.5,
  CharacterCard: 5,
  Versus: 6,
  Timeline: 5,
  Countdown: 3.5,
  Outro: 4,
};

export const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

export const estimateNarrationSeconds = (text: string): number => countWords(text) / WORDS_PER_SECOND;

/** Sahnenin ekranda kalma süresi (saniye): ses süresi + kısa nefes payı, sahne tipine göre alt sınır. */
export const sceneSeconds = (scene: Scene, audio?: SceneAudio): number => {
  const spoken = audio?.durationSec ?? estimateNarrationSeconds(scene.narration);
  return Math.max(MIN_SECONDS[scene.type], spoken + 0.5);
};

export const transitionFrames = (kind: TransitionKind | undefined): number => (kind === "none" ? 0 : TRANSITION_FRAMES);

export type TimelineItem =
  | { kind: "scene"; scene: Scene; from: number; durationInFrames: number; transitionIn: TransitionKind }
  | { kind: "sting"; from: number; durationInFrames: number; transitionIn: TransitionKind };

export interface Timeline {
  items: TimelineItem[];
  durationInFrames: number;
  fps: number;
}

/**
 * Sahneleri zaman çizelgesine dizer. Geçişler iki sahneyi üst üste bindirdiği için
 * her öğenin süresine bir sonraki geçişin uzunluğu eklenir; böylece anlatım kesilmez.
 */
export const buildTimeline = (input: Pick<RenderInput, "script" | "audio">, fps = FPS): Timeline => {
  const { script, audio } = input;
  type Draft = { kind: "scene"; scene: Scene; seconds: number; transitionIn: TransitionKind } | { kind: "sting"; seconds: number; transitionIn: TransitionKind };
  const drafts: Draft[] = [];

  script.scenes.forEach((scene, index) => {
    drafts.push({
      kind: "scene",
      scene,
      seconds: sceneSeconds(scene, audio[scene.id]),
      transitionIn: index === 0 ? "none" : (scene.transition ?? "fade"),
    });
    if (script.format === "long" && index === 0 && scene.type === "ColdOpen") {
      drafts.push({ kind: "sting", seconds: STING_FRAMES / fps, transitionIn: "flash" });
    }
  });

  const items: TimelineItem[] = [];
  let cursor = 0;
  drafts.forEach((draft, index) => {
    const next = drafts[index + 1];
    const overlap = next ? transitionFrames(next.transitionIn) : 0;
    const durationInFrames = Math.ceil(draft.seconds * fps) + overlap;
    const from = cursor;
    items.push(
      draft.kind === "scene"
        ? { kind: "scene", scene: draft.scene, transitionIn: draft.transitionIn, from, durationInFrames }
        : { kind: "sting", transitionIn: draft.transitionIn, from, durationInFrames },
    );
    cursor += durationInFrames - overlap;
  });

  return { items, durationInFrames: Math.max(cursor, 1), fps };
};

export const formatTimestamp = (seconds: number): string => {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/** YouTube açıklaması için bölüm zaman damgaları (ilk bölüm her zaman 0:00). */
export const chapterMarkers = (timeline: Timeline): { time: string; title: string }[] => {
  const markers: { time: string; title: string }[] = [];
  for (const item of timeline.items) {
    if (item.kind === "scene" && item.scene.type === "ChapterTitle") {
      markers.push({ time: formatTimestamp(item.from / timeline.fps), title: item.scene.title });
    }
  }
  if (markers.length > 0 && markers[0].time !== "0:00") {
    markers.unshift({ time: "0:00", title: "Giriş" });
  }
  return markers;
};
