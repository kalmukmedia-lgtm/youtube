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
      {/* Altyazı ve başlığın durduğu alt kısmı hafifçe karart: parlak görsellerde de yazı okunaklı kalsın. */}
      <AbsoluteFill
        style={{
          background: scene.overlayText && !vertical
            ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 32%, transparent 55%), linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 45%)"
            : "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 30%)",
        }}
      />
      {scene.overlayText ? (
        <div
          style={{
            position: "absolute",
            left: vertical ? 60 * u : 110 * u,
            right: vertical ? 60 * u : undefined,
            top: vertical ? "18%" : undefined,
            bottom: vertical ? undefined : 250 * u,
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
              WebkitTextStroke: `${2 * u}px rgba(0,0,0,0.85)`,
              paintOrder: "stroke fill",
              textShadow: `0 0 ${6 * u}px rgba(0,0,0,0.95), 0 ${6 * u}px ${24 * u}px rgba(0,0,0,0.9)`,
            }}
          >
            {upper(scene.overlayText)}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
