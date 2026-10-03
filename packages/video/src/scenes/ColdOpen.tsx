import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneImage } from "../components/SceneImage";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const ColdOpen = ({ scene }: { scene: SceneOf<"ColdOpen"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u, centerPaddingBottom } = useLayout();
  const theme = useTheme();
  const words = upper(scene.headline).split(/\s+/);

  return (
    <AbsoluteFill>
      <SceneImage image={scene.image} motion="push-in" darken={0.5} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 * u, paddingBottom: Math.max(80 * u, centerPaddingBottom) }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${10 * u}px ${28 * u}px`, maxWidth: vertical ? "100%" : "80%" }}>
          {words.map((word, i) => {
            const s = spring({ frame: frame - 8 - i * 7, fps, config: { damping: 14, mass: 0.8 } });
            const blur = interpolate(s, [0, 1], [18, 0]);
            return (
              <span
                key={i}
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: 900,
                  fontSize: (vertical ? 120 : 132) * u,
                  lineHeight: 1.05,
                  color: theme.colors.text,
                  opacity: s,
                  transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`,
                  filter: `blur(${blur}px)`,
                  textShadow: `0 0 ${40 * u}px ${theme.colors.accent}, 0 ${8 * u}px ${30 * u}px rgba(0,0,0,0.8)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
