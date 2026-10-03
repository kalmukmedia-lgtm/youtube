import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * GitHub Actions işçisi:  pnpm worker --job <id>   veya   pnpm worker --all
 * Gerekli ortam değişkenleri: PANEL_URL, WORKER_TOKEN (+ ANTHROPIC/AZURE/CLOUDFLARE anahtarları)
 */

const args = process.argv.slice(2);
const jobArg = args.indexOf("--job");
const jobId = jobArg >= 0 ? Number.parseInt(args[jobArg + 1] ?? "", 10) : undefined;
const all = args.includes("--all") || jobId === undefined || Number.isNaN(jobId);

const panelUrl = process.env.PANEL_URL;
const token = process.env.WORKER_TOKEN;
if (!panelUrl || !token) {
  console.error("❌ PANEL_URL ve WORKER_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

// Proje/karakter/müzik dosyaları bu geçici klasöre indirilir; config modülü yüklenmeden önce ayarlanmalı.
const dataDir = process.env.METAFICTA_DATA_DIR ?? mkdtempSync(path.join(tmpdir(), "metaficta-worker-"));
process.env.METAFICTA_DATA_DIR = dataDir;

const { PanelClient } = await import("./panel-client");
const { runJob } = await import("./run");
const client = new PanelClient(panelUrl, token);

const reset = () => {
  for (const dir of ["projects", "characters", "music"]) {
    rmSync(path.join(dataDir, dir), { recursive: true, force: true });
    mkdirSync(path.join(dataDir, dir), { recursive: true });
  }
};

let failures = 0;
let processed = 0;
for (;;) {
  const job = await client.claim(all ? undefined : jobId);
  if (!job) break;
  reset();
  if (!(await runJob(job, client, dataDir))) failures++;
  processed++;
  if (!all) break;
}

console.log(processed === 0 ? "ℹ️  Kuyrukta iş yok (başka bir işçi almış olabilir)." : `🏁 ${processed} iş işlendi, ${failures} başarısız.`);
process.exitCode = failures > 0 ? 1 : 0;
