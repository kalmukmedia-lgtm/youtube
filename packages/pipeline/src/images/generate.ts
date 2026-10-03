import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Character, collectImages, getTheme, type ImageRef, type ThemeId } from "@metaficta/core";
import sharp from "sharp";
import { type ImagesConfig, PATHS } from "../config";
import type { Project } from "../project";
import { characterDir, loadCharacter, referencePath, saveCharacter } from "./characters";
import { type GeneratedImage, type ImageProvider, ImageRefusedError } from "./provider";

type Log = (message: string) => void;

const tiles = (width: number, height: number) => Math.ceil(width / 512) * Math.ceil(height / 512);

export const estimateNeurons = (config: ImagesConfig, width: number, height: number, referenceCount: number): number =>
  tiles(width, height) * config.neuronsPerOutputTile + referenceCount * tiles(config.referenceSize, config.referenceSize) * config.neuronsPerInputTile;

export const buildImagePrompt = (prompt: string, themeId: ThemeId, config: ImagesConfig, characters: Pick<Character, "name">[] = []): string => {
  const reference =
    characters.length > 0
      ? `Keep the exact face, hair, costume and colors of ${characters.map((c, i) => `${c.name} from reference image ${i + 1}`).join(", ")}`
      : "";
  return [prompt.trim().replace(/\.$/, ""), reference, getTheme(themeId).imageStyle, config.globalStyle].filter(Boolean).join(". ");
};

/** İçerik filtresine takılan prompt'u şiddet/çıplaklık içermeyecek şekilde yumuşatır. */
export const softenPrompt = (prompt: string): string => `${prompt}. Tasteful and majestic, no blood, no gore, no nudity, no graphic violence`;

const generateWithRetry = async (provider: ImageProvider, request: Parameters<ImageProvider["generate"]>[0], log: Log): Promise<GeneratedImage> => {
  try {
    return await provider.generate(request);
  } catch (error) {
    if (!(error instanceof ImageRefusedError)) throw error;
    log("   ⚠️  İçerik filtresine takıldı, yumuşatılmış prompt ile yeniden deneniyor...");
    return provider.generate({ ...request, prompt: softenPrompt(request.prompt) });
  }
};

const toReference = (image: Buffer, size: number) => sharp(image).resize(size, size, { fit: "inside", withoutEnlargement: true }).png().toBuffer();

export const portraitPrompt = (character: Character, config: ImagesConfig) =>
  `Character reference portrait of ${character.name}: ${character.look}. Head and shoulders, facing the camera, neutral dark background, soft cinematic studio light. ${config.globalStyle}`;

/** Karakter için aday portreler üretir: assets/characters/<id>/candidates/candidate-N.png */
export const generateCharacterCandidates = async (
  character: Character,
  count: number,
  provider: ImageProvider,
  config: ImagesConfig,
  root = PATHS.characters,
): Promise<string[]> => {
  saveCharacter(character, root);
  const dir = path.join(characterDir(character.id, root), "candidates");
  mkdirSync(dir, { recursive: true });
  const start = readdirSync(dir).length + 1;
  const [width, height] = config.sizes.portrait;
  const outputs: string[] = [];
  for (let i = 0; i < count; i++) {
    const image = await provider.generate({ prompt: portraitPrompt(character, config), width, height, references: [] });
    const file = path.join(dir, `candidate-${start + i}.png`);
    writeFileSync(file, await sharp(image.data).png().toBuffer());
    outputs.push(file);
  }
  return outputs;
};

/** Seçilen adayı karakterin referans portresi yapar. */
export const pickCandidate = (id: string, candidate: number, root = PATHS.characters): string => {
  const source = path.join(characterDir(id, root), "candidates", `candidate-${candidate}.png`);
  if (!existsSync(source)) throw new Error(`Aday bulunamadı: ${source}`);
  copyFileSync(source, referencePath(id, root));
  return referencePath(id, root);
};

export interface ImageJobOptions {
  provider: ImageProvider;
  config: ImagesConfig;
  /** Var olan görselleri de yeniden üret. */
  force?: boolean;
  /** Sadece bu görsel id'lerini üret. */
  only?: string[];
  log?: Log;
  charactersRoot?: string;
}

export interface ImageJobSummary {
  generated: string[];
  skipped: string[];
  failed: { id: string; error: string }[];
  createdCharacters: string[];
  neurons: number;
}

const existingImage = (visualsDir: string, id: string): string | undefined =>
  existsSync(visualsDir) ? readdirSync(visualsDir).find((file) => path.parse(file).name === id) : undefined;

/**
 * Senaryodaki tüm görselleri üretir (visuals/<görsel-id>.<uzantı>).
 * Görselde geçen karakterlerin referans portreleri modele verilir; kütüphanede olmayan karakter için
 * senaryodaki görünüm tarifinden otomatik bir referans portre üretilir ve kütüphaneye eklenir.
 */
export const generateProjectImages = async (project: Project, options: ImageJobOptions): Promise<ImageJobSummary> => {
  const { provider, config } = options;
  const log = options.log ?? (() => {});
  const root = options.charactersRoot ?? PATHS.characters;
  const visualsDir = path.join(project.dir, "visuals");
  mkdirSync(visualsDir, { recursive: true });
  const summary: ImageJobSummary = { generated: [], skipped: [], failed: [], createdCharacters: [], neurons: 0 };
  const [width, height] = config.sizes[project.script.format];
  const scriptCharacters = new Map(project.script.characters.map((c) => [c.id, c]));
  const referenceCache = new Map<string, Buffer>();

  const referenceFor = async (id: string): Promise<{ character: Character; image: Buffer } | undefined> => {
    const character = loadCharacter(id, root) ?? scriptCharacters.get(id);
    if (!character) {
      log(`   ⚠️  "${id}" karakteri ne kütüphanede ne senaryoda tanımlı; referanssız üretilecek.`);
      return undefined;
    }
    const cached = referenceCache.get(id);
    if (cached) return { character, image: cached };

    if (!existsSync(referencePath(id, root))) {
      log(`   🧑‍🎨 Yeni karakter: ${character.name} — referans portre üretiliyor...`);
      const [pw, ph] = config.sizes.portrait;
      const portrait = await generateWithRetry(provider, { prompt: portraitPrompt(character, config), width: pw, height: ph, references: [] }, log);
      saveCharacter(character, root);
      writeFileSync(referencePath(id, root), await sharp(portrait.data).png().toBuffer());
      summary.neurons += estimateNeurons(config, pw, ph, 0);
      summary.createdCharacters.push(id);
    }
    const image = await toReference(readFileSync(referencePath(id, root)), config.referenceSize);
    referenceCache.set(id, image);
    return { character, image };
  };

  const images: ImageRef[] = collectImages(project.script).filter((ref) => !options.only || options.only.includes(ref.id));
  for (const ref of images) {
    const existing = existingImage(visualsDir, ref.id);
    if (existing && !options.force) {
      summary.skipped.push(ref.id);
      continue;
    }
    try {
      const references = (await Promise.all(ref.characters.slice(0, 4).map(referenceFor))).filter((r) => r !== undefined);
      const prompt = buildImagePrompt(ref.prompt, project.script.theme, config, references.map((r) => r.character));
      const image = await generateWithRetry(provider, { prompt, width, height, references: references.map((r) => r.image) }, log);
      if (existing) rmSync(path.join(visualsDir, existing));
      writeFileSync(path.join(visualsDir, `${ref.id}.${image.extension}`), image.data);
      summary.neurons += estimateNeurons(config, width, height, references.length);
      summary.generated.push(ref.id);
      log(`   🖼  ${ref.id}${references.length ? ` (referans: ${references.map((r) => r.character.name).join(", ")})` : ""}`);
    } catch (error) {
      // Tek görselin hatası tüm işi durdurmasın; sonunda raporlanır, komut tekrar çalıştırılınca kaldığı yerden devam eder.
      summary.failed.push({ id: ref.id, error: error instanceof Error ? error.message : String(error) });
      log(`   ❌ ${ref.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return summary;
};
