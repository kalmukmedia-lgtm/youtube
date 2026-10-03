import { buildTimeline, type RenderInput } from "@metaficta/core";
import { TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import { AssetsProvider, resolveAsset } from "./assets";
import { Captions } from "./components/Captions";
import { FilmGrain, Particles, ProgressBar, Vignette, Watermark } from "./components/Overlays";
import { SceneRenderer, Sting } from "./scenes";
import { SceneDurationProvider, ThemeProvider, useTheme } from "./theme";
import { transitionFor } from "./transitions";

const Body = ({ script, audio, music }: RenderInput) => {
  const { fps, durationInFrames } = useVideoConfig();
  const theme = useTheme();
  const timeline = buildTimeline({ script, audio }, fps);
  const isShort = script.format === "short";

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
                      <Captions narration={item.scene.narration} spokenSeconds={sceneAudio?.durationSec} />
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
          volume={(f) => music.volume * interpolate(f, [0, fps, durationInFrames - fps * 2, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
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
