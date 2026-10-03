import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { SceneImage } from "../components/SceneImage";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

const formatNumber = (n: number) => Math.round(n).toLocaleString("tr-TR");

export const StatCounter = ({ scene }: { scene: SceneOf<"StatCounter"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u, centerPaddingBottom } = useLayout();
  const theme = useTheme();
  const value = interpolate(frame, [5, 5 + fps * 1.4], [0, scene.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const done = spring({ frame: frame - 5 - fps * 1.4, fps, config: { damping: 10 } });
  const label = spring({ frame: frame - 20, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      {scene.image ? <SceneImage image={scene.image} motion="push-in" darken={0.65} /> : <Backdrop seed="stat" />}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 * u, paddingBottom: Math.max(60 * u, centerPaddingBottom) }}>
        <div
          style={{
            fontFamily: theme.displayFont,
            fontWeight: 900,
            fontSize: (vertical ? 210 : 240) * u,
            lineHeight: 1,
            color: theme.colors.accent,
            transform: `scale(${1 + 0.06 * done * (1 - done)})`,
            textShadow: `0 0 ${60 * u}px ${theme.colors.accent}`,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {scene.prefix ?? ""}
          {formatNumber(value)}
          <span style={{ fontSize: (vertical ? 90 : 110) * u }}>{upper(scene.suffix ?? "")}</span>
        </div>
        <div
          style={{
            marginTop: 30 * u,
            maxWidth: vertical ? "100%" : "60%",
            fontFamily: theme.bodyFont,
            fontWeight: 600,
            fontSize: (vertical ? 50 : 44) * u,
            color: theme.colors.text,
            opacity: label,
            transform: `translateY(${interpolate(label, [0, 1], [20, 0]) * u}px)`,
          }}
        >
          {scene.label}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
