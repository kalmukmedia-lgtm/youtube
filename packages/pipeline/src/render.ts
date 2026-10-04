import { mkdirSync } from "node:fs";
import path from "node:path";
import { buildTimeline, type RenderInput } from "@metaficta/core";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { BROWSER_EXECUTABLE, PATHS } from "./config";
import { type Project, renderInputFor } from "./project";

type Log = (message: string) => void;

/** Remotion projesini paketler. Proje klasörü public klasör olur: görseller/sesler `staticFile` ile okunur. */
const bundleFor = (project: Project, log: Log) => {
  log("📦 Remotion paketleniyor...");
  return bundle({ entryPoint: PATHS.videoEntry, publicDir: project.dir });
};

const compositionId = (input: RenderInput) => (input.script.format === "long" ? "LongVideo" : "ShortVideo");

export interface RenderOptions {
  /** Yarım çözünürlük, düşük kalite: onay öncesi hızlı kontrol. */
  draft?: boolean;
  thumbnails?: boolean;
  log?: Log;
}

export const renderProject = async (project: Project, options: RenderOptions = {}): Promise<string[]> => {
  const log = options.log ?? (() => {});
  const inputProps = await renderInputFor(project);
  const serveUrl = await bundleFor(project, log);
  const outputs: string[] = [];

  const composition = await selectComposition({ serveUrl, id: compositionId(inputProps), inputProps, browserExecutable: BROWSER_EXECUTABLE, logLevel: "error" });
  const name = `${project.script.format}${options.draft ? "-draft" : ""}.mp4`;
  const outputLocation = path.join(project.dir, "render", name);
  mkdirSync(path.dirname(outputLocation), { recursive: true });

  log(`🎬 Render: ${composition.width}x${composition.height}, ${(composition.durationInFrames / composition.fps).toFixed(1)} sn`);
  let lastLogged = -10;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: options.draft ? 28 : 18,
    scale: options.draft ? 0.5 : 1,
    outputLocation,
    inputProps,
    browserExecutable: BROWSER_EXECUTABLE, logLevel: "error",
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= lastLogged + 10) {
        lastLogged = pct;
        log(`   %${pct}`);
      }
    },
  });
  outputs.push(outputLocation);

  if (options.thumbnails ?? project.script.format === "long") {
    for (const variant of [0, 1, 2]) {
      // Kompozisyon her varyasyon için ayrı seçilmeli: seçilen kompozisyonun props'ları renderStill'e taşınır.
      const thumbProps = { ...inputProps, variant };
      const thumbnail = await selectComposition({ serveUrl, id: "Thumbnail", inputProps: thumbProps, browserExecutable: BROWSER_EXECUTABLE, logLevel: "error" });
      const output = path.join(project.dir, "thumbnail", `thumbnail_v${variant + 1}.png`);
      await renderStill({ composition: thumbnail, serveUrl, output, inputProps: thumbProps, browserExecutable: BROWSER_EXECUTABLE, logLevel: "error" });
      outputs.push(output);
    }
  }
  return outputs;
};

/** Her sahnenin ortasından bir kare: senaryoyu ve tasarımı hızlıca gözden geçirmek için. */
export const renderSceneStills = async (project: Project, log: Log = () => {}): Promise<string[]> => {
  const inputProps = await renderInputFor(project);
  const serveUrl = await bundleFor(project, log);
  const composition = await selectComposition({ serveUrl, id: compositionId(inputProps), inputProps, browserExecutable: BROWSER_EXECUTABLE, logLevel: "error" });
  const timeline = buildTimeline(inputProps, composition.fps);
  const outDir = path.join(project.dir, "preview");
  mkdirSync(outDir, { recursive: true });

  const outputs: string[] = [];
  for (const [index, item] of timeline.items.entries()) {
    const label = item.kind === "scene" ? `${item.scene.id}-${item.scene.type}` : "sting";
    const output = path.join(outDir, `${String(index + 1).padStart(2, "0")}-${label}.png`);
    const frame = item.from + Math.floor(item.durationInFrames * 0.6);
    await renderStill({ composition, serveUrl, output, frame, inputProps, browserExecutable: BROWSER_EXECUTABLE, logLevel: "error" });
    log(`🖼  ${path.basename(output)}`);
    outputs.push(output);
  }
  return outputs;
};
