import { SAMPLE_LONG_SCRIPT, SAMPLE_SHORT_SCRIPT, SERIES_IDS, type SeriesId, THEME_IDS, type ThemeId } from "@metaficta/core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command, InvalidArgumentError, Option } from "commander";
import { azureCredentials, cloudflareCredentials, type ImagesConfig, loadImagesConfig, loadPronunciations, loadVoiceConfig, REPO_ROOT } from "./config";
import { listCharacters } from "./images/characters";
import { generateCharacterCandidates, generateProjectImages, pickCandidate } from "./images/generate";
import { CloudflareImageProvider } from "./images/provider";
import { LlmClient } from "./llm";
import { createProject, listProjects, loadAudio, loadProject, saveScript, setStage } from "./project";
import { renderProject, renderSceneStills } from "./render";
import { DEFAULT_THEME, generateScript, generateShorts, lengthWarning } from "./script-gen";
import { AzureTts, listTurkishVoices } from "./tts/azure";
import { buildSsml } from "./tts/ssml";
import { voiceProject } from "./tts/voice";

const log = (message: string) => console.log(message);

const positiveInt = (value: string) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) throw new InvalidArgumentError("Pozitif bir sayı olmalı.");
  return n;
};

const printCost = (llm: LlmClient) => {
  const { input, output, cacheRead, webSearches } = llm.usage;
  const cost = llm.estimatedCostUsd();
  log(`💰 Token: ${input} giriş, ${output} çıkış, ${cacheRead} önbellek · web araması: ${webSearches} · tahmini $${Number.isNaN(cost) ? "?" : cost.toFixed(2)} (web arama ücreti hariç)`);
};

const imageProvider = (config: ImagesConfig) => {
  const { accountId, apiToken } = cloudflareCredentials();
  return new CloudflareImageProvider(accountId, apiToken, config.model);
};

const printNeurons = (neurons: number, config: ImagesConfig) =>
  log(`💰 Tahmini kullanım: ~${Math.round(neurons)} neuron (günlük ücretsiz kota: ${config.freeNeuronsPerDay}, her gün 00:00 UTC'de yenilenir)`);

const program = new Command().name("yt").description("Metaficta video üretim hattı");

program
  .command("new")
  .description("Konu için araştırma + senaryo üretir ve proje klasörü oluşturur")
  .argument("<topic>", 'Video konusu, ör. "Zeus vs Odin — kim kazanırdı?"')
  .addOption(new Option("-f, --format <format>", "Video formatı").choices(["long", "short"]).default("long"))
  .addOption(new Option("-s, --series <series>", "Seri").choices([...SERIES_IDS]).default("standalone"))
  .addOption(new Option("-t, --theme <theme>", "Görsel tema (varsayılan: seriye göre)").choices([...THEME_IDS]))
  .option("--no-research", "Web araştırmasını atla (daha ucuz, daha az güvenilir)")
  .option("--no-revise", "Editör revizyonunu atla (daha ucuz)")
  .option("--shorts <count>", "Uzun videodan bu kadar Shorts da türet", positiveInt)
  .action(async (topic: string, opts: { format: "long" | "short"; series: SeriesId; theme?: ThemeId; research: boolean; revise: boolean; shorts?: number }) => {
    const llm = new LlmClient();
    const { script, research } = await generateScript(llm, {
      topic,
      format: opts.format,
      series: opts.series,
      theme: opts.theme ?? DEFAULT_THEME[opts.series],
      research: opts.research,
      revise: opts.revise,
      log,
    });
    const project = createProject(script, { research: opts.research ? research : undefined });
    log(`✅ Senaryo hazır: ${project.dir}/script.md`);
    const warning = lengthWarning(project.script);
    if (warning) log(`⚠️  ${warning}`);

    if (opts.shorts && opts.format === "long") {
      log(`✂️  ${opts.shorts} Shorts türetiliyor...`);
      for (const short of await generateShorts(llm, project.script, opts.shorts)) {
        log(`   ✅ ${createProject(short).dir}`);
      }
    }
    printCost(llm);
    log("👉 Senaryoyu oku, gerekirse script.json'u düzenle, sonra: pnpm yt approve <proje>");
  });

program
  .command("shorts")
  .description("Mevcut uzun video projesinden Shorts senaryoları türetir")
  .argument("<project>", "Proje id'si veya klasörü")
  .option("-c, --count <count>", "Shorts sayısı", positiveInt, 3)
  .action(async (id: string, opts: { count: number }) => {
    const parent = loadProject(id);
    if (parent.script.format !== "long") throw new Error("Shorts sadece uzun video projelerinden türetilebilir.");
    const llm = new LlmClient();
    for (const short of await generateShorts(llm, parent.script, opts.count)) log(`✅ ${createProject(short).dir}`);
    printCost(llm);
  });

program
  .command("preview")
  .description("script.json elle düzenlendikten sonra script.md önizlemesini yeniler")
  .argument("<project>")
  .action((id: string) => {
    const project = loadProject(id);
    saveScript(project.dir, project.script);
    log(`✅ ${project.dir}/script.md`);
  });

program
  .command("approve")
  .description("Senaryoyu onaylar (seslendirme ve final render için gerekli)")
  .argument("<project>")
  .action((id: string) => {
    const project = loadProject(id);
    setStage(project.dir, "approved");
    log(`✅ Onaylandı: ${project.script.workingTitle}`);
  });

program
  .command("voice")
  .description("Onaylı senaryoyu Azure ile seslendirir (sahne başına MP3 + kelime zamanları)")
  .argument("<project>")
  .option("-v, --voice <voice>", "Ses (varsayılan: config/voice.yaml)")
  .option("--force", "Değişmemiş sahneleri de yeniden seslendir")
  .option("--skip-approval", "Onay beklemeden seslendir")
  .action(async (id: string, opts: { voice?: string; force?: boolean; skipApproval?: boolean }) => {
    const project = loadProject(id);
    if (project.status.stage === "script" && !opts.skipApproval) {
      throw new Error("Senaryo henüz onaylanmadı. Önce: pnpm yt approve <proje> (veya --skip-approval)");
    }
    const { key, region } = azureCredentials();
    const voice = { ...loadVoiceConfig(), ...(opts.voice ? { voice: opts.voice } : {}) };
    log(`🎙  Seslendiriliyor: ${voice.voice} (${project.script.scenes.length} sahne)`);
    const summary = await voiceProject(project, new AzureTts(key, region), { voice, pronunciations: loadPronunciations(), force: opts.force, log });
    if (project.status.stage === "script" || project.status.stage === "approved") setStage(project.dir, "voiced");
    log(`✅ ${summary.synthesized} sahne seslendirildi, ${summary.skipped} sahne değişmediği için atlandı.`);
    log(`   Toplam süre: ${Math.floor(summary.totalSeconds / 60)} dk ${Math.round(summary.totalSeconds % 60)} sn · bu çalıştırmada ${summary.characters} karakter kullanıldı`);
  });

program
  .command("voices")
  .description("Türkçe konuşabilen Azure seslerini listeler")
  .action(async () => {
    const { key, region } = azureCredentials();
    const voices = await listTurkishVoices(key, region);
    for (const v of voices) {
      const kind = v.Locale === "tr-TR" ? "Türkçe" : "çok dilli";
      log(`${v.ShortName.padEnd(44)} ${v.Gender.padEnd(7)} ${kind}${v.StyleList?.length ? ` · stiller: ${v.StyleList.join(", ")}` : ""}`);
    }
  });

program
  .command("voice-test")
  .description("Bir metni seçilen sesle seslendirip voice-tests/ klasörüne kaydeder")
  .argument("<text>")
  .option("-v, --voice <voice>", "Ses (varsayılan: config/voice.yaml)")
  .option("-r, --rate <rate>", 'Hız, ör. "-6%"')
  .option("-p, --pitch <pitch>", 'Ton, ör. "-3%"')
  .action(async (text: string, opts: { voice?: string; rate?: string; pitch?: string }) => {
    const { key, region } = azureCredentials();
    const config = loadVoiceConfig();
    const voice = { ...config, voice: opts.voice ?? config.voice, rate: opts.rate ?? config.rate, pitch: opts.pitch ?? config.pitch };
    const result = await new AzureTts(key, region).synthesize(buildSsml(text, voice, loadPronunciations()));
    const dir = path.join(REPO_ROOT, "voice-tests");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${voice.voice}_${voice.rate}_${voice.pitch}.mp3`.replace(/%/g, "pct"));
    writeFileSync(file, result.audio);
    log(`✅ ${file} (${result.durationSec.toFixed(1)} sn)`);
  });

program
  .command("images")
  .description("Senaryodaki görselleri yapay zekâ ile üretir (karakter referanslarıyla)")
  .argument("<project>")
  .option("--force", "Var olan görselleri de yeniden üret")
  .option("--only <ids>", "Sadece bu görsel id'leri (virgülle ayrılmış)")
  .action(async (id: string, opts: { force?: boolean; only?: string }) => {
    const project = loadProject(id);
    const config = loadImagesConfig();
    log(`🎨 Görseller üretiliyor: ${config.model}`);
    const summary = await generateProjectImages(project, {
      provider: imageProvider(config),
      config,
      force: opts.force,
      only: opts.only?.split(",").map((s) => s.trim()).filter(Boolean),
      log,
    });
    log(`✅ ${summary.generated.length} görsel üretildi, ${summary.skipped.length} görsel zaten vardı.`);
    if (summary.createdCharacters.length) log(`🧑‍🎨 Kütüphaneye eklenen karakterler: ${summary.createdCharacters.join(", ")} (beğenmezsen: pnpm yt character create <id> ...)`);
    printNeurons(summary.neurons, config);
    if (summary.failed.length) {
      log(`⚠️  ${summary.failed.length} görsel üretilemedi; komutu tekrar çalıştırınca sadece eksikler denenir:`);
      for (const f of summary.failed) log(`   - ${f.id}: ${f.error}`);
      process.exitCode = 1;
    }
  });

const character = program.command("character").description("Karakter kütüphanesi (assets/characters)");

character
  .command("create")
  .description("Karakter tanımlar ve aday referans portreler üretir")
  .argument("<id>", "İngilizce kebab-case kimlik, ör. zeus")
  .requiredOption("-n, --name <name>", "Türkçe görünen ad")
  .requiredOption("-l, --look <look>", "İngilizce kalıcı görünüm tarifi")
  .option("-c, --count <count>", "Aday portre sayısı", positiveInt, 4)
  .action(async (id: string, opts: { name: string; look: string; count: number }) => {
    const config = loadImagesConfig();
    const files = await generateCharacterCandidates({ id, name: opts.name, look: opts.look }, opts.count, imageProvider(config), config);
    for (const file of files) log(`🖼  ${file}`);
    log(`👉 Beğendiğini seç: pnpm yt character pick ${id} <numara>`);
  });

character
  .command("pick")
  .description("Aday portrelerden birini karakterin referansı yapar")
  .argument("<id>")
  .argument("<candidate>", "Aday numarası", positiveInt)
  .action((id: string, candidate: number) => log(`✅ Referans: ${pickCandidate(id, candidate)}`));

character
  .command("list")
  .description("Kütüphanedeki karakterleri listeler")
  .action(() => {
    const characters = listCharacters();
    if (characters.length === 0) return log("Kütüphane boş. Karakterler ilk görsel üretiminde otomatik eklenir veya: pnpm yt character create <id> ...");
    for (const c of characters) log(`${c.hasReference ? "✅" : "⏳"} ${c.id.padEnd(20)} ${c.name} — ${c.look}`);
  });

program
  .command("list")
  .description("Projeleri ve durumlarını listeler")
  .action(() => {
    const projects = listProjects();
    if (projects.length === 0) return log("Henüz proje yok. Başlamak için: pnpm yt new \"konu\"");
    for (const p of projects) log(`${p.status.stage.padEnd(9)} ${p.script.format.padEnd(5)} ${p.script.id}  —  ${p.script.workingTitle}`);
  });

program
  .command("sample")
  .description("Örnek projeleri (Zeus vs Odin + Odin'in gözü) oluşturur — API anahtarı gerekmez")
  .action(() => {
    for (const script of [SAMPLE_LONG_SCRIPT, SAMPLE_SHORT_SCRIPT]) log(`✅ ${createProject(script).dir}`);
  });

program
  .command("stills")
  .description("Her sahneden bir önizleme karesi (PNG) üretir")
  .argument("<project>")
  .action(async (id: string) => {
    const outputs = await renderSceneStills(loadProject(id), log);
    log(`✅ ${outputs.length} kare: ${loadProject(id).dir}/preview`);
  });

program
  .command("render")
  .description("Videoyu (ve uzun videolar için 3 thumbnail varyasyonunu) render eder")
  .argument("<project>")
  .option("--draft", "Yarım çözünürlükte hızlı taslak render")
  .option("--no-thumbnails", "Thumbnail üretme")
  .action(async (id: string, opts: { draft?: boolean; thumbnails: boolean }) => {
    const project = loadProject(id);
    if (!opts.draft && project.status.stage === "script") log("⚠️  Senaryo henüz onaylanmadı (pnpm yt approve). Final render yine de yapılıyor.");
    if (Object.keys(loadAudio(project.dir)).length === 0) log("ℹ️  Ses yok: video sessiz render edilecek (seslendirme için: pnpm yt voice <proje>).");
    const outputs = await renderProject(project, { draft: opts.draft, thumbnails: opts.thumbnails && project.script.format === "long", log });
    if (!opts.draft) setStage(project.dir, "rendered");
    for (const output of outputs) log(`✅ ${output}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
