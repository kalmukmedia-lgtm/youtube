import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { roman, upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const ChapterTitle = ({ scene }: { scene: SceneOf<"ChapterTitle"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u, centerPaddingBottom } = useLayout();
  const theme = useTheme();
  const line = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const title = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const sub = spring({ frame: frame - 22, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Backdrop seed={`chapter-${scene.chapterNumber}`} intensity={1.2} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 80 * u, paddingBottom: Math.max(80 * u, centerPaddingBottom) }}>
        <div style={{ fontFamily: theme.bodyFont, fontWeight: 600, fontSize: 28 * u, letterSpacing: 14 * u, color: theme.colors.accent, opacity: line }}>
          BÖLÜM {roman(scene.chapterNumber)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 * u, margin: `${26 * u}px 0` }}>
          <div style={{ height: 2 * u, width: interpolate(line, [0, 1], [0, vertical ? 160 : 260]) * u, background: theme.colors.accent }} />
          <div style={{ width: 12 * u, height: 12 * u, transform: "rotate(45deg)", background: theme.colors.accent, opacity: line }} />
          <div style={{ height: 2 * u, width: interpolate(line, [0, 1], [0, vertical ? 160 : 260]) * u, background: theme.colors.accent }} />
        </div>
        <div
          style={{
            fontFamily: theme.displayFont,
            fontWeight: 700,
            fontSize: (vertical ? 96 : 110) * u,
            lineHeight: 1.1,
            color: theme.colors.text,
            opacity: title,
            transform: `translateY(${interpolate(title, [0, 1], [40, 0]) * u}px)`,
            textShadow: `0 0 ${50 * u}px ${theme.colors.accentSoft}`,
          }}
        >
          {upper(scene.title)}
        </div>
        {scene.subtitle ? (
          <div style={{ marginTop: 22 * u, fontFamily: theme.bodyFont, fontSize: 40 * u, color: theme.colors.muted, opacity: sub, letterSpacing: 3 * u }}>{scene.subtitle}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
