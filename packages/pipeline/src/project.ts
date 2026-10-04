import { parseFile } from "music-metadata";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getTheme, renderScriptMarkdown, type RenderInput, type Script, ScriptSchema, SceneAudioSchema } from "@metaficta/core";
import { z } from "zod";
import { loadVoiceConfig, PATHS } from "./config";

export const STAGES = ["script", "approved", "voiced", "rendered", "uploaded"] as const;
const StatusSchema = z.object({
  stage: z.enum(STAGES),
  updatedAt: z.string(),
  history: z.array(z.object({ stage: z.enum(STAGES), at: z.string() })),
});
export type ProjectStatus = z.infer<typeof StatusSchema>;

export interface Project {
  dir: string;
  script: Script;
  status: ProjectStatus;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** Proje kimliği (projects/<id>) veya klasör yolu. Göreli yollar komutun çalıştırıldığı klasöre göre çözülür. */
export const projectDir = (idOrPath: string): string =>
  idOrPath.includes("/") || idOrPath.includes(path.sep) || idOrPath.startsWith(".")
    ? path.resolve(process.env.INIT_CWD ?? process.cwd(), idOrPath)
    : path.join(PATHS.projects, idOrPath);

const writeJson = (file: string, data: unknown) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

export const saveScript = (dir: string, script: Script) => {
  writeJson(path.join(dir, "script.json"), script);
  writeFileSync(path.join(dir, "script.md"), renderScriptMarkdown(script, loadAudio(dir)));
};

export const setStage = (dir: string, stage: ProjectStatus["stage"]) => {
  const file = path.join(dir, "status.json");
  const now = new Date().toISOString();
  const previous = existsSync(file) ? StatusSchema.parse(JSON.parse(readFileSync(file, "utf8"))) : { history: [] };
  writeJson(file, { stage, updatedAt: now, history: [...previous.history, { stage, at: now }] } satisfies ProjectStatus);
};

/** Yeni proje klasörü oluşturur; aynı isim varsa sonuna sayı ekler. */
export const createProject = (script: Script, extras: { research?: string } = {}): Project => {
  let dir = path.join(PATHS.projects, script.id);
  for (let n = 2; existsSync(dir); n++) dir = path.join(PATHS.projects, `${script.id}-${n}`);
  const finalScript = { ...script, id: path.basename(dir) };
  for (const sub of ["visuals", "audio", "render", "thumbnail"]) mkdirSync(path.join(dir, sub), { recursive: true });
  saveScript(dir, finalScript);
  if (extras.research) writeFileSync(path.join(dir, "research.md"), extras.research);
  setStage(dir, "script");
  return loadProject(dir);
};

export const loadProject = (idOrPath: string): Project => {
  const dir = projectDir(idOrPath);
  if (!existsSync(path.join(dir, "script.json"))) throw new Error(`Proje bulunamadı: ${dir}`);
  const script = ScriptSchema.parse(JSON.parse(readFileSync(path.join(dir, "script.json"), "utf8")));
  const status = StatusSchema.parse(JSON.parse(readFileSync(path.join(dir, "status.json"), "utf8")));
  return { dir, script, status };
};

export const listProjects = (): Project[] =>
  existsSync(PATHS.projects)
    ? readdirSync(PATHS.projects, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(path.join(PATHS.projects, entry.name, "script.json")))
        .map((entry) => loadProject(path.join(PATHS.projects, entry.name)))
    : [];

/** visuals/<görsel-id>.<uzantı> dosyalarını bulur (yollar proje klasörüne göre). */
export const loadAssets = (dir: string): Record<string, string> => {
  const visuals = path.join(dir, "visuals");
  if (!existsSync(visuals)) return {};
  const assets: Record<string, string> = {};
  for (const file of readdirSync(visuals)) {
    const ext = path.extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) assets[path.basename(file, ext)] = `visuals/${file}`;
  }
  return assets;
};

/** audio/manifest.json: sahne id → { src, durationSec } (seslendirme adımı yazar). */
export const loadAudio = (dir: string): RenderInput["audio"] => {
  const manifest = path.join(dir, "audio", "manifest.json");
  if (!existsSync(manifest)) return {};
  return z.record(z.string(), SceneAudioSchema).parse(JSON.parse(readFileSync(manifest, "utf8")));
};

const MUSIC_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg"];

/**
 * Fon müziği: proje klasöründe `music.*` varsa o; yoksa temanın ruh haline uygun kütüphane
 * klasöründen (assets/music/<mood>/) proje id'sine göre sabit bir parça seçilip projeye kopyalanır.
 */
export const resolveMusic = (project: Project): string | undefined => {
  const own = MUSIC_EXTENSIONS.map((ext) => `music${ext}`).find((file) => existsSync(path.join(project.dir, file)));
  if (own) return own;
  const library = path.join(PATHS.music, getTheme(project.script.theme).musicMood);
  if (!existsSync(library)) return undefined;
  const tracks = readdirSync(library)
    .filter((file) => MUSIC_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .sort();
  if (tracks.length === 0) return undefined;
  const hash = [...project.script.id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const track = tracks[hash % tracks.length];
  const target = `music${path.extname(track).toLowerCase()}`;
  copyFileSync(path.join(library, track), path.join(project.dir, target));
  return target;
};

export const renderInputFor = async (project: Project): Promise<RenderInput> => {
  const music = resolveMusic(project);
  const musicDuration = music ? (await parseFile(path.join(project.dir, music), { duration: true })).format.duration : undefined;
  return {
    script: project.script,
    assets: loadAssets(project.dir),
    audio: loadAudio(project.dir),
    music: music ? { src: music, volume: loadVoiceConfig().musicVolume, durationSec: musicDuration } : undefined,
  };
};
