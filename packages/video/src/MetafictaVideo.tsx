import { buildTimeline, type RenderInput, type Timeline } from "@metaficta/core";
import { TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import { AssetsProvider, resolveAsset } from "./assets";
import { Captions } from "./components/Captions";
import { FilmGrain, Particles, ProgressBar, Vignette, Watermark } from "./components/Overlays";
import { SceneRenderer, Sting } from "./scenes";
import { SceneDurationProvider, ThemeProvider, useTheme } from "./theme";
import { transitionFor } from "./transitions";

/** Ses dosyası olan sahnelerde anlatımın sürdüğü kare aralıkları (müzik bu aralıklarda kısılır). */
const speechRanges = (timeline: Timeline, audio: RenderInput["audio"]): [number, number][] =>
  timeline.items.flatMap((item) => {
    const sceneAudio = item.kind === "scene" ? audio[item.scene.id] : undefined;
    return sceneAudio ? [[item.from, item.from + sceneAudio.durationSec * timeline.fps] as [number, number]] : [];
  });

const DUCK_LEVEL = 0.45;
const DUCK_WINDOW = 8;

/** Konuşma sırasında müziği kısar; geçişler ±8 karede yumuşatılır. */
const duckingLevel = (frame: number, ranges: [number, number][]): number => {
  if (ranges.length === 0) return 1;
  let speaking = 0;
  for (let f = frame - DUCK_WINDOW; f <= frame + DUCK_WINDOW; f++) {
    if (ranges.some(([a, b]) => f >= a && f < b)) speaking++;
  }
  return 1 - (speaking / (DUCK_WINDOW * 2 + 1)) * (1 - DUCK_LEVEL);
};

const Body = ({ script, audio, music }: RenderInput) => {
  const { fps, durationInFrames } = useVideoConfig();
  const theme = useTheme();
  const timeline = buildTimeline({ script, audio }, fps);
  const isShort = script.format === "short";
  const speech = speechRanges(timeline, audio);

  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <TransitionSeries>
        {timeline.items.map((item, index) => {
          const key = item.kind === "scene" ? item.scene.id : `sting-${index}`;
          const sceneAudio = item.kind === "scene" ? audio[item.scene.id] : undefined;
          return (
            <Fragment key={key}>
              {index > 0 && item.transitionIn !== "none" ? <TransitionSeries.Transition {...transitionFor(item.transitionIn)} /> : null}
              <TransitionSeries.Sequence durationInFrames={item.durationInFrames}>
                <SceneDurationProvider durationInFrames={item.durationInFrames}>
                  {item.kind === "scene" ? (
                    <>
                      <SceneRenderer scene={item.scene} />
                      <Captions narration={item.scene.narration} audio={sceneAudio} />
                      {sceneAudio ? <Audio src={resolveAsset(sceneAudio.src)} /> : null}
                    </>
                  ) : (
                    <Sting />
                  )}
                </SceneDurationProvider>
              </TransitionSeries.Sequence>
            </Fragment>
          );
        })}
      </TransitionSeries>
      <Particles />
      <Vignette />
      <FilmGrain />
      {isShort ? <ProgressBar /> : <Watermark />}
      {music ? (
        <Audio
          src={resolveAsset(music.src)}
          loop
          volume={(f) =>
            music.volume *
            duckingLevel(f, speech) *
            interpolate(f, [0, fps, durationInFrames - fps * 2, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const MetafictaVideo = (props: RenderInput) => (
  <ThemeProvider themeId={props.script.theme}>
    <AssetsProvider assets={props.assets}>
      <Body {...props} />
    </AssetsProvider>
  </ThemeProvider>
);
