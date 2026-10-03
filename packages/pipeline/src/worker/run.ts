import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getTheme, SERIES_IDS, THEME_IDS } from "@metaficta/core";
import { z } from "zod";
import * as defaultActions from "../actions";
import type { ClaimedJob, PanelClient } from "./panel-client";
import { diff, pull, push, snapshot } from "./sync";

export type Actions = Pick<typeof defaultActions, "newScript" | "deriveShorts" | "voice" | "images" | "stills" | "render" | "characterCandidates">;

const ScriptParams = z.object({
  topic: z.string().min(1),
  format: z.enum(["long", "short"]),
  series: z.enum(SERIES_IDS),
  theme: z.enum(THEME_IDS).nullish(),
  research: z.boolean().default(true),
  revise: z.boolean().default(true),
  shorts: z.number().int().positive().nullish(),
});
const ForceParams = z.object({ force: z.boolean().default(false), only: z.array(z.string()).nullish(), voice: z.string().nullish() });
const RenderParams = z.object({ draft: z.boolean().default(true) });
const ShortsParams = z.object({ count: z.number().int().min(1).max(10).default(3) });
const CharacterParams = z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/), name: z.string().min(1), look: z.string().min(1), count: z.number().int().min(1).max(8).default(4) });

/** Paneldeki iş günlüğüne satırları toplu halde gönderir (her satırda istek atmamak için). */
export class JobLogger {
  private buffer: string[] = [];
  private lastFlush = Date.now();
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly client: PanelClient,
    private readonly jobId: number,
    private readonly echo: (line: string) => void = console.log,
  ) {}

  readonly log = (line: string) => {
    this.echo(line);
    this.buffer.push(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
    if (Date.now() - this.lastFlush > 3000) void this.flush();
  };

  flush(): Promise<void> {
    if (this.buffer.length === 0) return this.pending;
    const text = `${this.buffer.join("\n")}\n`;
    this.buffer = [];
    this.lastFlush = Date.now();
    // Sıra korunsun diye istekler zincirlenir; günlük gönderilemezse iş durmaz.
    this.pending = this.pending.then(() => this.client.log(this.jobId, text)).catch((error) => this.echo(`(günlük gönderilemedi: ${error})`));
    return this.pending;
  }
}

const requireProject = (job: ClaimedJob): string => {
  if (!job.projectId) throw new Error(`"${job.type}" işi bir proje gerektirir.`);
  return job.projectId;
};

/** İşi çalıştırır; oluşturulan yeni proje id'lerini döndürür. */
export const execute = async (job: ClaimedJob, actions: Actions, log: (m: string) => void): Promise<string[]> => {
  switch (job.type) {
    case "script":
      return actions.newScript(ScriptParams.parse(job.params), log);
    case "shorts":
      return actions.deriveShorts(requireProject(job), ShortsParams.parse(job.params).count, log);
    case "voice": {
      const p = ForceParams.parse(job.params);
      await actions.voice(requireProject(job), { force: p.force, voice: p.voice ?? undefined }, log);
      return [];
    }
    case "images": {
      const p = ForceParams.parse(job.params);
      const summary = await actions.images(requireProject(job), { force: p.force, only: p.only }, log);
      if (summary.failed.length) throw new Error(`${summary.failed.length} görsel üretilemedi (diğerleri kaydedildi; işi yeniden çalıştırınca sadece eksikler denenir).`);
      return [];
    }
    case "stills":
      await actions.stills(requireProject(job), log);
      return [];
    case "render":
      await actions.render(requireProject(job), RenderParams.parse(job.params), log);
      return [];
    case "produce": {
      const id = requireProject(job);
      await actions.voice(id, {}, log);
      const summary = await actions.images(id, {}, log);
      await actions.stills(id, log);
      await actions.render(id, { draft: true }, log);
      if (summary.failed.length) throw new Error(`Video taslağı hazır ama ${summary.failed.length} görsel üretilemedi; "Görseller" işini tekrar çalıştır.`);
      return [];
    }
    case "character":
      await actions.characterCandidates(CharacterParams.parse(job.params), log);
      return [];
    default:
      throw new Error(`Bilinmeyen iş tipi: ${job.type}`);
  }
};

const NEEDS_MUSIC = new Set(["render", "produce"]);
/** İşçinin ürettiği çıktılar indirilmez (gereksiz bant genişliği); yeniden üretilecekleri için gerekmezler. */
const OUTPUT_DIRS = ["render/", "preview/", "thumbnail/"];

/**
 * Bir işi baştan sona yürütür: gerekli dosyaları panelden indir → çalıştır → değişenleri yükle → sonucu bildir.
 * Hata olsa bile o ana kadar üretilen dosyalar yüklenir (ör. 30 görselden 28'i).
 */
export const runJob = async (job: ClaimedJob, client: PanelClient, dataDir: string, actions: Actions = defaultActions): Promise<boolean> => {
  const logger = new JobLogger(client, job.id);
  const log = logger.log;
  log(`▶️  İş #${job.id}: ${job.type}${job.projectId ? ` · ${job.projectId}` : ""}`);

  let projectIds: string[] = [];
  let error: string | undefined;
  try {
    await pull(client, dataDir, "characters");
    if (job.projectId) {
      const count = await pull(client, dataDir, `projects/${job.projectId}`, OUTPUT_DIRS.map((d) => `projects/${job.projectId}/${d}`));
      if (count === 0) throw new Error(`Proje panelde bulunamadı: ${job.projectId}`);
      const scriptFile = path.join(dataDir, "projects", job.projectId, "script.json");
      if (NEEDS_MUSIC.has(job.type) && existsSync(scriptFile)) {
        const mood = getTheme(JSON.parse(readFileSync(scriptFile, "utf8")).theme).musicMood;
        await pull(client, dataDir, `music/${mood}`);
      }
    }

    const before = snapshot(dataDir, ["projects", "characters"]);
    try {
      projectIds = await execute(job, actions, log);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      log(`❌ ${error}`);
    }
    await push(client, dataDir, diff(before, snapshot(dataDir, ["projects", "characters"])), log);
  } catch (e) {
    error ??= e instanceof Error ? e.message : String(e);
    log(`❌ ${error}`);
  }

  if (!error) log("✅ İş tamamlandı.");
  await logger.flush();
  await client.complete(job.id, { success: !error, error, projectIds });
  return !error;
};
