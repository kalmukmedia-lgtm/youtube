import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneImage } from "../components/SceneImage";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const CinematicImage = ({ scene }: { scene: SceneOf<"CinematicImage"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u } = useLayout();
  const theme = useTheme();
  const reveal = spring({ frame: frame - 12, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <SceneImage image={scene.image} motion={scene.motion} darken={0.2} />
      {scene.overlayText ? (
        <div
          style={{
            position: "absolute",
            left: vertical ? 60 * u : 110 * u,
            right: vertical ? 60 * u : undefined,
            top: vertical ? "18%" : undefined,
            bottom: vertical ? undefined : 190 * u,
            textAlign: vertical ? "center" : "left",
          }}
        >
          <div
            style={{
              height: 4 * u,
              width: `${interpolate(reveal, [0, 1], [0, vertical ? 40 : 100])}%`,
              margin: vertical ? "0 auto" : undefined,
              minWidth: 0,
              maxWidth: 420 * u,
              background: theme.colors.accent,
              boxShadow: `0 0 ${16 * u}px ${theme.colors.accent}`,
            }}
          />
          <div
            style={{
              marginTop: 18 * u,
              fontFamily: theme.displayFont,
              fontWeight: 700,
              fontSize: (vertical ? 76 : 70) * u,
              letterSpacing: 4 * u,
              color: theme.colors.text,
              opacity: reveal,
              transform: `translateY(${interpolate(reveal, [0, 1], [30, 0]) * u}px)`,
              textShadow: `0 ${6 * u}px ${24 * u}px rgba(0,0,0,0.9)`,
            }}
          >
            {upper(scene.overlayText)}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
