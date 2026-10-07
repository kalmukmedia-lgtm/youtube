import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import YAML from "yaml";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");

loadEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

/**
 * METAFICTA_DATA_DIR verilirse projeler, karakterler ve müzik o klasörden okunur
 * (<dir>/projects, <dir>/characters, <dir>/music). İşçi bunu panelden indirilen dosyalar için kullanır.
 */
const DATA_DIR = process.env.METAFICTA_DATA_DIR ? path.resolve(process.env.METAFICTA_DATA_DIR) : null;

export const PATHS = {
  config: path.join(REPO_ROOT, "config"),
  prompts: path.join(REPO_ROOT, "prompts"),
  projects: DATA_DIR ? path.join(DATA_DIR, "projects") : path.join(REPO_ROOT, "projects"),
  videoEntry: path.join(REPO_ROOT, "packages/video/src/index.ts"),
  music: DATA_DIR ? path.join(DATA_DIR, "music") : path.join(REPO_ROOT, "assets/music"),
  characters: DATA_DIR ? path.join(DATA_DIR, "characters") : path.join(REPO_ROOT, "assets/characters"),
  sfx: path.join(REPO_ROOT, "assets/sfx"),
};

/** Senaryo modeli. Varsayılan Claude Opus 5.5; .env'de METAFICTA_MODEL ile değiştirilebilir. */
export const MODEL = process.env.METAFICTA_MODEL ?? "claude-opus-5-5";

/** Remotion'ın kendi Chrome'unu indiremediği ortamlarda kullanılacak tarayıcı (opsiyonel). */
export const BROWSER_EXECUTABLE = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const ChannelSchema = z.object({
  name: z.string(),
  handle: z.string(),
  url: z.string(),
  channelId: z.string(),
  language: z.literal("tr"),
  tagline: z.string(),
  audience: z.string(),
  persona: z.string(),
  defaults: z.object({
    long: z.object({ targetMinutes: z.number() }),
    short: z.object({ targetSeconds: z.number() }),
  }),
});
export type ChannelConfig = z.infer<typeof ChannelSchema>;

export const loadChannel = (): ChannelConfig => ChannelSchema.parse(YAML.parse(readFileSync(path.join(PATHS.config, "channel.yaml"), "utf8")));

export const loadStyleGuide = (): string => readFileSync(path.join(PATHS.config, "style_guide.md"), "utf8");

const VoiceSchema = z.object({
  provider: z.literal("azure"),
  voice: z.string(),
  rate: z.string(),
  pitch: z.string(),
  sentencePauseMs: z.number(),
  musicVolume: z.number(),
});
export type VoiceConfig = z.infer<typeof VoiceSchema>;

export const loadVoiceConfig = (): VoiceConfig => VoiceSchema.parse(YAML.parse(readFileSync(path.join(PATHS.config, "voice.yaml"), "utf8")));

/** Telaffuz sözlüğü: yazım → okunuş. */
export const loadPronunciations = (): Record<string, string> =>
  z.record(z.string(), z.string()).parse(YAML.parse(readFileSync(path.join(PATHS.config, "pronunciation.yaml"), "utf8")) ?? {});

export const azureCredentials = (): { key: string; region: string } => {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error("AZURE_SPEECH_KEY ve AZURE_SPEECH_REGION .env dosyasında tanımlı olmalı (bkz. docs/VOICE_SETUP.md).");
  return { key, region };
};

const ImagesSchema = z.object({
  provider: z.literal("cloudflare"),
  model: z.string(),
  sizes: z.object({
    long: z.tuple([z.number(), z.number()]),
    short: z.tuple([z.number(), z.number()]),
    portrait: z.tuple([z.number(), z.number()]),
  }),
  referenceSize: z.number(),
  globalStyle: z.string(),
  neuronsPerOutputTile: z.number(),
  neuronsPerInputTile: z.number(),
  freeNeuronsPerDay: z.number(),
});
export type ImagesConfig = z.infer<typeof ImagesSchema>;

export const loadImagesConfig = (): ImagesConfig => ImagesSchema.parse(YAML.parse(readFileSync(path.join(PATHS.config, "images.yaml"), "utf8")));

export const cloudflareCredentials = (): { accountId: string; apiToken: string } => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) throw new Error("CLOUDFLARE_ACCOUNT_ID ve CLOUDFLARE_API_TOKEN .env dosyasında tanımlı olmalı (bkz. docs/IMAGE_SETUP.md).");
  return { accountId, apiToken };
};
