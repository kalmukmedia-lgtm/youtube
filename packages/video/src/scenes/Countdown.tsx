import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Portrait } from "../components/Portrait";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const Countdown = ({ scene }: { scene: SceneOf<"Countdown"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u } = useLayout();
  const theme = useTheme();
  const rank = spring({ frame, fps, config: { damping: 10, mass: 0.7 } });
  const content = spring({ frame: frame - 12, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Backdrop seed={`rank-${scene.rank}`} />
      <AbsoluteFill style={{ flexDirection: vertical ? "column" : "row", alignItems: "center", justifyContent: "center", gap: 70 * u, padding: vertical ? `${120 * u}px ${70 * u}px` : `${100 * u}px ${140 * u}px` }}>
        <div
          style={{
            fontFamily: theme.displayFont,
            fontWeight: 900,
            fontSize: (vertical ? 260 : 380) * u,
            lineHeight: 0.9,
            color: "transparent",
            WebkitTextStroke: `${5 * u}px ${theme.colors.accent}`,
            textShadow: `0 0 ${60 * u}px ${theme.colors.accentSoft}`,
            transform: `scale(${interpolate(rank, [0, 1], [2.2, 1])})`,
            opacity: Math.min(1, rank * 1.4),
          }}
        >
          #{scene.rank}
        </div>
        <div style={{ flex: vertical ? undefined : 1, display: "flex", flexDirection: "column", alignItems: vertical ? "center" : "flex-start", gap: 30 * u, opacity: content, transform: `translateY(${interpolate(content, [0, 1], [40, 0]) * u}px)` }}>
          <Portrait image={scene.image} style={{ width: vertical ? 860 * u : 900 * u, height: vertical ? 700 * u : 500 * u }} />
          <div style={{ textAlign: vertical ? "center" : "left" }}>
            <div style={{ fontFamily: theme.displayFont, fontWeight: 700, fontSize: (vertical ? 76 : 72) * u, color: theme.colors.text, lineHeight: 1.1 }}>{upper(scene.title)}</div>
            {scene.subtitle ? <div style={{ fontFamily: theme.bodyFont, fontSize: 36 * u, color: theme.colors.muted, marginTop: 10 * u }}>{scene.subtitle}</div> : null}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
