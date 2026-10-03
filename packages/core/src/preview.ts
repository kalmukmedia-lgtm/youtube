import type { Scene, Script } from "./script";
import { buildTimeline, chapterMarkers, formatTimestamp, type RenderInput } from "./timeline";
import { getTheme } from "./themes";

const CONFIDENCE_LABEL = { high: "✅ yüksek", medium: "⚠️ orta", low: "❌ düşük" } as const;

const sceneDetails = (scene: Scene): string[] => {
  switch (scene.type) {
    case "ColdOpen":
      return [`**Ekran:** ${scene.headline}`];
    case "CinematicImage":
      return [`**Görsel:** \`${scene.image.id}\` (${scene.motion})`, ...(scene.overlayText ? [`**Yazı:** ${scene.overlayText}`] : [])];
    case "ChapterTitle":
      return [`**Bölüm ${scene.chapterNumber}:** ${scene.title}${scene.subtitle ? ` — ${scene.subtitle}` : ""}`];
    case "Quote":
      return [`**Alıntı:** “${scene.quote}” — ${scene.attribution}`];
    case "StatCounter":
      return [`**Sayaç:** ${scene.prefix ?? ""}${scene.value}${scene.suffix ?? ""} — ${scene.label}`];
    case "CharacterCard":
      return [`**Kart:** ${scene.name}, ${scene.epithet} (${scene.mythology})`, `**Puanlar:** ${scene.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}`];
    case "Versus":
      return [`**Karşılaşma:** ${scene.left.name} vs ${scene.right.name} (sonuç: ${scene.verdict})`];
    case "Timeline":
      return [`**Zaman çizelgesi:** ${scene.events.map((e) => `${e.date} ${e.label}`).join(" → ")}`];
    case "Countdown":
      return [`**#${scene.rank}:** ${scene.title}${scene.subtitle ? ` — ${scene.subtitle}` : ""}`];
    case "Outro":
      return [`**CTA:** ${scene.cta}`, ...(scene.nextVideoTeaser ? [`**Sonraki video:** ${scene.nextVideoTeaser}`] : [])];
  }
};

/** İnsan onayı için okunabilir Markdown önizleme. */
export const renderScriptMarkdown = (script: Script, audio: RenderInput["audio"] = {}): string => {
  const timeline = buildTimeline({ script, audio });
  const totalSec = timeline.durationInFrames / timeline.fps;
  const lines: string[] = [];

  lines.push(`# ${script.workingTitle}`, "");
  lines.push(
    `| Alan | Değer |`,
    `|---|---|`,
    `| Format | ${script.format === "long" ? "Uzun video (16:9)" : "Shorts (9:16)"} |`,
    `| Seri | ${script.series} |`,
    `| Tema | ${getTheme(script.theme).label} |`,
    `| Tahmini süre | ${formatTimestamp(totalSec)} |`,
    `| Sahne sayısı | ${script.scenes.length} |`,
    `| Durum | ⏳ Onay bekliyor |`,
    "",
  );

  lines.push("## Başlık seçenekleri", "", ...script.titleOptions.map((t) => `- ${t} _(${t.length} karakter)_`), "");
  lines.push("## Özet", "", script.summary, "");

  lines.push("## Senaryo", "");
  for (const item of timeline.items) {
    const at = formatTimestamp(item.from / timeline.fps);
    if (item.kind === "sting") {
      lines.push(`### [${at}] METAFICTA logo animasyonu`, "");
      continue;
    }
    const { scene } = item;
    lines.push(`### [${at}] ${scene.id} · ${scene.type}`, "");
    lines.push(...sceneDetails(scene).map((d) => `- ${d}`));
    lines.push("", `> ${scene.narration}`, "");
  }
  if (script.loopLine) lines.push(`**Döngü cümlesi:** ${script.loopLine}`, "");

  const chapters = chapterMarkers(timeline);
  if (chapters.length > 0) {
    lines.push("## Bölümler (YouTube)", "", ...chapters.map((c) => `- ${c.time} ${c.title}`), "");
  }

  lines.push("## Thumbnail", "", `- **Yazı:** ${script.thumbnail.text}`, `- **Fikir:** ${script.thumbnail.concept}`, "");

  lines.push("## Doğrulanacak iddialar", "", "| Güven | İddia | Not |", "|---|---|---|");
  for (const fc of script.factChecks) {
    lines.push(`| ${CONFIDENCE_LABEL[fc.confidence]} | ${fc.claim} | ${fc.note} |`);
  }
  lines.push("");

  lines.push("## Kaynaklar", "", ...script.sources.map((s) => (s.url ? `- [${s.title}](${s.url})` : `- ${s.title}`)), "");
  lines.push("## YouTube metadata", "", "**Açıklama:**", "", script.description, "", `**Etiketler:** ${script.tags.join(", ")}`, "", `**Hashtag'ler:** ${script.hashtags.join(" ")}`, "");

  lines.push(
    "## Onay kontrol listesi",
    "",
    "- [ ] İlk cümle merak uyandırıyor mu?",
    "- [ ] ❌/⚠️ işaretli iddialar kontrol edildi mi?",
    "- [ ] Dinî/kültürel hassasiyetlere saygılı mı?",
    "- [ ] Teoriler gerçek gibi sunulmuyor mu?",
    "- [ ] Başlık ve thumbnail videoda karşılanıyor mu?",
    "",
  );
  return lines.join("\n");
};
