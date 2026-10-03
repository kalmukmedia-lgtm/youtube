import type { SeriesId, ThemeId, VideoFormat } from "@metaficta/core";
import { azureCredentials, cloudflareCredentials, type ImagesConfig, loadImagesConfig, loadPronunciations, loadVoiceConfig } from "./config";
import { generateCharacterCandidates, generateProjectImages, type ImageJobSummary } from "./images/generate";
import { CloudflareImageProvider } from "./images/provider";
import { LlmClient } from "./llm";
import { createProject, loadAudio, loadProject, setStage } from "./project";
import { renderProject, renderSceneStills } from "./render";
import { DEFAULT_THEME, generateScript, generateShorts, lengthWarning } from "./script-gen";
import { AzureTts } from "./tts/azure";
import { voiceProject } from "./tts/voice";

/*
 * Üretim adımları: hem `pnpm yt` komutları hem de GitHub Actions işçisi bu fonksiyonları kullanır.
 */

export type Log = (message: string) => void;

const printCost = (llm: LlmClient, log: Log) => {
  const { input, output, cacheRead, webSearches } = llm.usage;
  const cost = llm.estimatedCostUsd();
  log(`💰 Token: ${input} giriş, ${output} çıkış, ${cacheRead} önbellek · web araması: ${webSearches} · tahmini $${Number.isNaN(cost) ? "?" : cost.toFixed(2)} (web arama ücreti hariç)`);
};

const imageProvider = (config: ImagesConfig) => {
  const { accountId, apiToken } = cloudflareCredentials();
  return new CloudflareImageProvider(accountId, apiToken, config.model);
};

const printNeurons = (neurons: number, config: ImagesConfig, log: Log) =>
  log(`💰 Tahmini kullanım: ~${Math.round(neurons)} neuron (günlük ücretsiz kota: ${config.freeNeuronsPerDay}, her gün 00:00 UTC'de yenilenir)`);

export interface NewScriptOptions {
  topic: string;
  format: VideoFormat;
  series: SeriesId;
  theme?: ThemeId | null;
  research: boolean;
  revise: boolean;
  shorts?: number | null;
}

/** Araştırma + senaryo (+ isteğe bağlı Shorts). Oluşan proje id'lerini döndürür. */
export const newScript = async (opts: NewScriptOptions, log: Log): Promise<string[]> => {
  const llm = new LlmClient();
  const { script, research } = await generateScript(llm, {
    topic: opts.topic,
    format: opts.format,
    series: opts.series,
    theme: opts.theme ?? DEFAULT_THEME[opts.series],
    research: opts.research,
    revise: opts.revise,
    log,
  });
  const project = createProject(script, { research: opts.research ? research : undefined });
  log(`✅ Senaryo hazır: ${project.script.id}`);
  const warning = lengthWarning(project.script);
  if (warning) log(`⚠️  ${warning}`);

  const ids = [project.script.id];
  if (opts.shorts && opts.format === "long") {
    log(`✂️  ${opts.shorts} Shorts türetiliyor...`);
    for (const short of await generateShorts(llm, project.script, opts.shorts)) {
      const created = createProject(short);
      ids.push(created.script.id);
      log(`   ✅ ${created.script.id}`);
    }
  }
  printCost(llm, log);
  return ids;
};

export const deriveShorts = async (projectId: string, count: number, log: Log): Promise<string[]> => {
  const parent = loadProject(projectId);
  if (parent.script.format !== "long") throw new Error("Shorts sadece uzun video projelerinden türetilebilir.");
  const llm = new LlmClient();
  const ids: string[] = [];
  for (const short of await generateShorts(llm, parent.script, count)) {
    const created = createProject(short);
    ids.push(created.script.id);
    log(`✅ ${created.script.id}`);
  }
  printCost(llm, log);
  return ids;
};

export const voice = async (projectId: string, opts: { voice?: string; force?: boolean; skipApproval?: boolean }, log: Log) => {
  const project = loadProject(projectId);
  if (project.status.stage === "script" && !opts.skipApproval) {
    throw new Error("Senaryo henüz onaylanmadı. Önce onayla (pnpm yt approve <proje> veya paneldeki onay düğmesi).");
  }
  const { key, region } = azureCredentials();
  const voiceConfig = { ...loadVoiceConfig(), ...(opts.voice ? { voice: opts.voice } : {}) };
  log(`🎙  Seslendiriliyor: ${voiceConfig.voice} (${project.script.scenes.length} sahne)`);
  const summary = await voiceProject(project, new AzureTts(key, region), { voice: voiceConfig, pronunciations: loadPronunciations(), force: opts.force, log });
  if (project.status.stage === "script" || project.status.stage === "approved") setStage(project.dir, "voiced");
  log(`✅ ${summary.synthesized} sahne seslendirildi, ${summary.skipped} sahne değişmediği için atlandı.`);
  log(`   Toplam süre: ${Math.floor(summary.totalSeconds / 60)} dk ${Math.round(summary.totalSeconds % 60)} sn · bu çalıştırmada ${summary.characters} karakter kullanıldı`);
  return summary;
};

/** Görselleri üretir; üretilemeyen görsel varsa özetteki `failed` listesi dolu döner. */
export const images = async (projectId: string, opts: { force?: boolean; only?: string[] | null }, log: Log): Promise<ImageJobSummary> => {
  const project = loadProject(projectId);
  const config = loadImagesConfig();
  log(`🎨 Görseller üretiliyor: ${config.model}`);
  const summary = await generateProjectImages(project, { provider: imageProvider(config), config, force: opts.force, only: opts.only ?? undefined, log });
  log(`✅ ${summary.generated.length} görsel üretildi, ${summary.skipped.length} görsel zaten vardı.`);
  if (summary.createdCharacters.length) log(`🧑‍🎨 Kütüphaneye eklenen karakterler: ${summary.createdCharacters.join(", ")}`);
  printNeurons(summary.neurons, config, log);
  if (summary.failed.length) {
    log(`⚠️  ${summary.failed.length} görsel üretilemedi; tekrar çalıştırınca sadece eksikler denenir:`);
    for (const f of summary.failed) log(`   - ${f.id}: ${f.error}`);
  }
  return summary;
};

export const characterCandidates = async (opts: { id: string; name: string; look: string; count: number }, log: Log): Promise<string[]> => {
  const config = loadImagesConfig();
  const files = await generateCharacterCandidates({ id: opts.id, name: opts.name, look: opts.look }, opts.count, imageProvider(config), config);
  for (const file of files) log(`🖼  ${file}`);
  return files;
};

export const stills = async (projectId: string, log: Log): Promise<string[]> => {
  const outputs = await renderSceneStills(loadProject(projectId), log);
  log(`✅ ${outputs.length} önizleme karesi üretildi.`);
  return outputs;
};

export const render = async (projectId: string, opts: { draft?: boolean; thumbnails?: boolean }, log: Log): Promise<string[]> => {
  const project = loadProject(projectId);
  if (!opts.draft && project.status.stage === "script") log("⚠️  Senaryo henüz onaylanmadı. Final render yine de yapılıyor.");
  if (Object.keys(loadAudio(project.dir)).length === 0) log("ℹ️  Ses yok: video sessiz render edilecek.");
  const outputs = await renderProject(project, { draft: opts.draft, thumbnails: (opts.thumbnails ?? true) && project.script.format === "long", log });
  if (!opts.draft) setStage(project.dir, "rendered");
  for (const output of outputs) log(`✅ ${output}`);
  return outputs;
};
