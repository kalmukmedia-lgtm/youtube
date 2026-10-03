import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import YAML from "yaml";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");

export const PATHS = {
  config: path.join(REPO_ROOT, "config"),
  prompts: path.join(REPO_ROOT, "prompts"),
  projects: path.join(REPO_ROOT, "projects"),
  videoEntry: path.join(REPO_ROOT, "packages/video/src/index.ts"),
};

loadEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

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
