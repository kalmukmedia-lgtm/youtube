import {
  countWords,
  projectId,
  SAMPLE_LONG_SCRIPT,
  SAMPLE_SHORT_SCRIPT,
  type Script,
  type ScriptDraft,
  ScriptDraftSchema,
  type SeriesId,
  type ThemeId,
  type VideoFormat,
} from "@metaficta/core";
import { z } from "zod";
import { type ChannelConfig, loadChannel, loadStyleGuide } from "./config";
import { characterLibraryPrompt } from "./images/characters";
import type { LlmClient } from "./llm";
import { renderPrompt } from "./prompts";

/** Seriye göre varsayılan görsel tema (CLI'da --theme ile değiştirilebilir). */
export const DEFAULT_THEME: Record<SeriesId, ThemeId> = {
  "gods-battle": "olympus-gold",
  pantheon: "olympus-gold",
  "lost-civilizations": "ancient-sepia",
  "cosmic-scale": "cosmic-void",
  "future-year": "future-neon",
  "top-10": "olympus-gold",
  "did-you-know": "ancient-sepia",
  "tier-list": "olympus-gold",
  standalone: "cosmic-void",
};

export const formatRules = (format: VideoFormat, channel: ChannelConfig): string => {
  if (format === "long") {
    const min = channel.defaults.long.targetMinutes;
    return [
      `Uzun video (16:9). Hedef süre yaklaşık ${min} dakika: toplam anlatım ${min * 130}-${min * 150} kelime, ${min * 4}-${min * 6} sahne.`,
      "Yapı: ColdOpen → 3-5 bölüm (her bölüm ChapterTitle ile başlar) → doruk noktası → Outro.",
      "loopLine kullanma.",
    ].join(" ");
  }
  const sec = channel.defaults.short.targetSeconds;
  return [
    `YouTube Shorts (9:16). Hedef yaklaşık ${sec} saniye: toplam anlatım ${Math.round(sec * 2.2)}-${Math.round(sec * 2.6)} kelime, 4-8 sahne.`,
    "ChapterTitle ve Outro kullanma; ilk sahne ColdOpen.",
    "loopLine zorunlu: son cümle videonun ilk cümlesine doğal şekilde bağlansın.",
    "hashtags içinde #Shorts olsun.",
  ].join(" ");
};

const toDraft = ({ id, topic, format, language, series, theme, createdAt, parentId, ...draft }: Script): ScriptDraft => draft;

const exampleFor = (format: VideoFormat): string => {
  const sample = format === "long" ? { ...SAMPLE_LONG_SCRIPT, scenes: SAMPLE_LONG_SCRIPT.scenes.slice(0, 6) } : SAMPLE_SHORT_SCRIPT;
  return JSON.stringify(toDraft(sample), null, 1);
};

export const systemPrompt = (channel = loadChannel()): string =>
  renderPrompt("system", { channel, styleGuide: loadStyleGuide(), characterLibrary: characterLibraryPrompt() });

export interface ScriptRequest {
  topic: string;
  format: VideoFormat;
  series: SeriesId;
  theme: ThemeId;
  research: boolean;
  revise: boolean;
  log?: (message: string) => void;
}

export interface ScriptResult {
  script: Script;
  research: string;
}

const NO_RESEARCH = "(Web araştırması atlandı. Sadece emin olduğun, iyi bilinen bilgileri kullan ve factChecks alanını dikkatle doldur.)";

/** Araştırma → taslak → editör revizyonu zinciri. */
export const generateScript = async (llm: LlmClient, request: ScriptRequest): Promise<ScriptResult> => {
  const log = request.log ?? (() => {});
  const channel = loadChannel();
  const system = systemPrompt(channel);
  const formatLabel = request.format === "long" ? "uzun video" : "YouTube Shorts";
  const rules = formatRules(request.format, channel);

  let research = NO_RESEARCH;
  if (request.research) {
    log("🔎 Araştırma yapılıyor (web araması)...");
    research = await llm.research(system, renderPrompt("research", { topic: request.topic, series: request.series, formatLabel }));
  }

  log("✍️  Senaryo taslağı yazılıyor...");
  let draft = await llm.structured(
    ScriptDraftSchema,
    system,
    renderPrompt("script", { topic: request.topic, series: request.series, theme: request.theme, formatLabel, formatRules: rules, research, example: exampleFor(request.format) }),
  );

  if (request.revise) {
    log("🧐 Editör revizyonu yapılıyor...");
    draft = await llm.structured(ScriptDraftSchema, system, renderPrompt("revise", { formatRules: rules, research, draft: JSON.stringify(draft, null, 1) }));
  }

  const script: Script = {
    ...normalizeDraft(draft),
    id: projectId(request.topic),
    topic: request.topic,
    format: request.format,
    language: "tr",
    series: request.series,
    theme: request.theme,
    createdAt: new Date().toISOString(),
  };
  return { script, research };
};

const ShortsSchema = z.object({ shorts: z.array(ScriptDraftSchema) });

/** Uzun videodan bağımsız Shorts senaryoları türetir. */
export const generateShorts = async (llm: LlmClient, parent: Script, count: number): Promise<Script[]> => {
  const channel = loadChannel();
  const { shorts } = await llm.structured(
    ShortsSchema,
    systemPrompt(channel),
    renderPrompt("shorts", { count, formatRules: formatRules("short", channel), script: JSON.stringify(toDraft(parent), null, 1) }),
    "medium",
  );
  return shorts.slice(0, count).map((draft, index) => ({
    ...normalizeDraft(draft),
    id: `${parent.id}-short-${String(index + 1).padStart(2, "0")}`,
    topic: draft.workingTitle,
    format: "short",
    language: "tr",
    series: "did-you-know",
    theme: parent.theme,
    createdAt: new Date().toISOString(),
    parentId: parent.id,
  }));
};

/** Sahne id'lerini sıralı hale getirir ve ilk sahnenin geçişini kaldırır. */
export const normalizeDraft = (draft: ScriptDraft): ScriptDraft => ({
  ...draft,
  scenes: draft.scenes.map((scene, index) => ({
    ...scene,
    id: `s${String(index + 1).padStart(2, "0")}`,
    transition: index === 0 ? undefined : scene.transition,
  })),
});

/** Senaryo hedef kelime aralığının dışındaysa uyarı metni döndürür. */
export const lengthWarning = (script: Script, channel = loadChannel()): string | null => {
  const words = script.scenes.reduce((sum, scene) => sum + countWords(scene.narration), 0);
  const [min, max] =
    script.format === "long"
      ? [channel.defaults.long.targetMinutes * 130, channel.defaults.long.targetMinutes * 150]
      : [Math.round(channel.defaults.short.targetSeconds * 2.2), Math.round(channel.defaults.short.targetSeconds * 2.6)];
  if (words < min * 0.8) return `Senaryo kısa: ${words} kelime (hedef ${min}-${max}).`;
  if (words > max * 1.2) return `Senaryo uzun: ${words} kelime (hedef ${min}-${max}).`;
  return null;
};
