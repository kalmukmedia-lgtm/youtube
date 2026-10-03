import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RenderInput } from "@metaficta/core";
import { parseFile } from "music-metadata";
import { type Project, saveScript, setStage } from "../project";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg"];

export interface ImportSummary {
  imported: number;
  missing: string[];
  totalSeconds: number;
}

/**
 * Elle hazırlanmış (ör. ElevenLabs veya kendi kaydın) sahne seslerini videoya bağlar:
 * audio/<sahne-id>.mp3 dosyalarının süresini ölçüp audio/manifest.json'u yazar.
 * Kelime zamanları olmadığı için altyazılar ses süresine orantılı dağıtılır.
 */
export const importSceneAudio = async (project: Project, log: (m: string) => void = () => {}): Promise<ImportSummary> => {
  const audioDir = path.join(project.dir, "audio");
  const files = existsSync(audioDir) ? readdirSync(audioDir) : [];
  const manifest: RenderInput["audio"] = {};
  const summary: ImportSummary = { imported: 0, missing: [], totalSeconds: 0 };

  for (const scene of project.script.scenes) {
    const file = files.find((f) => path.parse(f).name.toLowerCase() === scene.id && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    if (!file) {
      summary.missing.push(scene.id);
      continue;
    }
    const { format } = await parseFile(path.join(audioDir, file), { duration: true });
    if (!format.duration) throw new Error(`Ses süresi okunamadı: ${file}`);
    manifest[scene.id] = { src: `audio/${file}`, durationSec: format.duration };
    summary.imported++;
    summary.totalSeconds += format.duration;
  }

  writeFileSync(path.join(audioDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  saveScript(project.dir, project.script);
  if (summary.missing.length === 0 && ["script", "approved"].includes(project.status.stage)) setStage(project.dir, "voiced");
  log(`✅ ${summary.imported} sahne sesi bağlandı (toplam ${Math.floor(summary.totalSeconds / 60)} dk ${Math.round(summary.totalSeconds % 60)} sn).`);
  if (summary.missing.length) log(`⚠️  Ses dosyası eksik sahneler (süre metinden tahmin edilecek): ${summary.missing.join(", ")}`);
  return summary;
};
