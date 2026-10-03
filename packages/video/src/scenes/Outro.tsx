import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useLayout, useTheme } from "../theme";

export const Outro = ({ scene }: { scene: SceneOf<"Outro"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u, centerPaddingBottom } = useLayout();
  const theme = useTheme();
  const cta = spring({ frame, fps, config: { damping: 200 } });
  const button = spring({ frame: frame - 15, fps, config: { damping: 9 } });
  const pulse = 1 + 0.04 * Math.sin(frame / 5);
  const teaser = spring({ frame: frame - 35, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Backdrop seed="outro" intensity={1.2} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 80 * u, paddingBottom: Math.max(80 * u, centerPaddingBottom), gap: 50 * u }}>
        <div style={{ fontFamily: theme.displayFont, fontWeight: 700, fontSize: (vertical ? 80 : 76) * u, lineHeight: 1.15, color: theme.colors.text, opacity: cta, maxWidth: vertical ? "100%" : "70%" }}>{scene.cta}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18 * u,
            padding: `${22 * u}px ${54 * u}px`,
            borderRadius: 60 * u,
            background: "#e62117",
            color: "#fff",
            fontFamily: theme.bodyFont,
            fontWeight: 800,
            fontSize: 44 * u,
            letterSpacing: 2 * u,
            transform: `scale(${button * pulse})`,
            boxShadow: `0 ${10 * u}px ${40 * u}px rgba(230,33,23,0.5)`,
          }}
        >
          ABONE OL <span style={{ fontSize: 40 * u }}>🔔</span>
        </div>
        {scene.nextVideoTeaser ? (
          <div style={{ marginTop: 20 * u, padding: `${24 * u}px ${40 * u}px`, border: `${2 * u}px solid ${theme.colors.accent}`, borderRadius: 16 * u, opacity: teaser, transform: `translateY(${interpolate(teaser, [0, 1], [30, 0]) * u}px)` }}>
            <div style={{ fontFamily: theme.bodyFont, fontSize: 26 * u, letterSpacing: 6 * u, color: theme.colors.accent }}>SIRADAKİ VİDEO</div>
            <div style={{ fontFamily: theme.displayFont, fontWeight: 700, fontSize: 48 * u, color: theme.colors.text, marginTop: 8 * u }}>{scene.nextVideoTeaser}</div>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
