import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RenderInput } from "@metaficta/core";
import type { VoiceConfig } from "../config";
import { loadAudio, type Project, saveScript } from "../project";
import { alignWords } from "./align";
import type { TtsProvider } from "./azure";
import { buildSsml } from "./ssml";

type Log = (message: string) => void;

export interface VoiceOptions {
  voice: VoiceConfig;
  pronunciations: Record<string, string>;
  /** Değişmemiş sahneleri de yeniden seslendir. */
  force?: boolean;
  log?: Log;
  /** Hız sınırı (429) sonrası bekleme; testlerde kısaltılır. */
  retryDelaysMs?: number[];
}

export interface VoiceSummary {
  synthesized: number;
  skipped: number;
  characters: number;
  totalSeconds: number;
}

const sha1 = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 16);

const isRateLimit = (error: unknown) => /429|too many|throttl/i.test(String(error));

const withRetry = async <T>(fn: () => Promise<T>, delays: number[], log: Log): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimit(error) || attempt >= delays.length) throw error;
      log(`   ⏳ Azure hız sınırı, ${delays[attempt] / 1000} sn bekleniyor...`);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
};

/**
 * Her sahneyi ayrı ses dosyası olarak seslendirir ve audio/manifest.json'u günceller.
 * Metni/ses ayarı değişmeyen sahneler atlanır; böylece senaryo düzenlemeleri ücretsiz kotayı boşa harcamaz.
 */
export const voiceProject = async (project: Project, tts: TtsProvider, options: VoiceOptions): Promise<VoiceSummary> => {
  const log = options.log ?? (() => {});
  const audioDir = path.join(project.dir, "audio");
  mkdirSync(audioDir, { recursive: true });
  const previous = loadAudio(project.dir);
  const manifest: RenderInput["audio"] = {};
  const summary: VoiceSummary = { synthesized: 0, skipped: 0, characters: 0, totalSeconds: 0 };
  const writeManifest = () => writeFileSync(path.join(audioDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  for (const scene of project.script.scenes) {
    const ssml = buildSsml(scene.narration, options.voice, options.pronunciations);
    const hash = sha1(ssml);
    const src = `audio/${scene.id}.mp3`;
    const cached = previous[scene.id];

    if (!options.force && cached?.hash === hash && existsSync(path.join(project.dir, cached.src))) {
      manifest[scene.id] = cached;
      summary.skipped++;
      summary.totalSeconds += cached.durationSec;
      continue;
    }

    const result = await withRetry(() => tts.synthesize(ssml), options.retryDelaysMs ?? [5000, 15000, 30000], log);
    writeFileSync(path.join(project.dir, src), result.audio);
    manifest[scene.id] = {
      src,
      durationSec: result.durationSec,
      words: alignWords(scene.narration, result.boundaries, result.durationSec),
      hash,
    };
    // Her sahneden sonra kaydet: yarıda kesilirse kaldığı yerden devam eder.
    writeManifest();
    summary.synthesized++;
    summary.characters += scene.narration.length;
    summary.totalSeconds += result.durationSec;
    log(`   🎙  ${scene.id} · ${result.durationSec.toFixed(1)} sn`);
  }

  writeManifest();
  // Önizlemedeki zaman damgaları artık gerçek ses sürelerine göre.
  saveScript(project.dir, project.script);
  return summary;
};
