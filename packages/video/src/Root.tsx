import { buildTimeline, FPS, type RenderInput, RenderInputSchema, SAMPLE_LONG_SCRIPT, SAMPLE_SHORT_SCRIPT } from "@metaficta/core";
import { type CalculateMetadataFunction, Composition, Folder, Still } from "remotion";
import { MetafictaVideo } from "./MetafictaVideo";
import { Thumbnail, type ThumbnailProps } from "./Thumbnail";

const calculateMetadata: CalculateMetadataFunction<RenderInput> = ({ props }) => ({
  durationInFrames: buildTimeline(props, FPS).durationInFrames,
  fps: FPS,
});

const longDefaults: RenderInput = { script: SAMPLE_LONG_SCRIPT, assets: {}, audio: {} };
const shortDefaults: RenderInput = { script: SAMPLE_SHORT_SCRIPT, assets: {}, audio: {} };
const thumbnailDefaults: ThumbnailProps = { ...longDefaults, variant: 0 };

export const RemotionRoot = () => (
  <Folder name="Metaficta">
    <Composition
      id="LongVideo"
      component={MetafictaVideo}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={1}
      schema={RenderInputSchema}
      defaultProps={longDefaults}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="ShortVideo"
      component={MetafictaVideo}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={1}
      schema={RenderInputSchema}
      defaultProps={shortDefaults}
      calculateMetadata={calculateMetadata}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={thumbnailDefaults} />
  </Folder>
);
