import { SAMPLE_LONG_SCRIPT, SAMPLE_SHORT_SCRIPT, SERIES_IDS, type SeriesId, THEME_IDS, type ThemeId } from "@metaficta/core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command, InvalidArgumentError, Option } from "commander";
import * as actions from "./actions";
import { azureCredentials, loadPronunciations, loadVoiceConfig, REPO_ROOT } from "./config";
import { listCharacters } from "./images/characters";
import { pickCandidate } from "./images/generate";
import { createProject, listProjects, loadProject, saveScript, setStage } from "./project";
import { AzureTts, listTurkishVoices } from "./tts/azure";
import { buildSsml } from "./tts/ssml";

const log = (message: string) => console.log(message);

const positiveInt = (value: string) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) throw new InvalidArgumentError("Pozitif bir sayı olmalı.");
  return n;
};

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
    await actions.newScript({ topic, ...opts }, log);
    log("👉 Senaryoyu oku (projects/<proje>/script.md), gerekirse script.json'u düzenle, sonra: pnpm yt approve <proje>");
  });

program
  .command("shorts")
  .description("Mevcut uzun video projesinden Shorts senaryoları türetir")
  .argument("<project>", "Proje id'si veya klasörü")
  .option("-c, --count <count>", "Shorts sayısı", positiveInt, 3)
  .action(async (id: string, opts: { count: number }) => {
    await actions.deriveShorts(id, opts.count, log);
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
    await actions.voice(id, opts, log);
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
    const summary = await actions.images(id, { force: opts.force, only: opts.only?.split(",").map((s) => s.trim()).filter(Boolean) }, log);
    if (summary.failed.length) process.exitCode = 1;
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
    await actions.characterCandidates({ id, ...opts }, log);
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
    await actions.stills(id, log);
  });

program
  .command("render")
  .description("Videoyu (ve uzun videolar için 3 thumbnail varyasyonunu) render eder")
  .argument("<project>")
  .option("--draft", "Yarım çözünürlükte hızlı taslak render")
  .option("--no-thumbnails", "Thumbnail üretme")
  .action(async (id: string, opts: { draft?: boolean; thumbnails: boolean }) => {
    await actions.render(id, opts, log);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
