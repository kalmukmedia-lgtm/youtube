import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Portrait } from "../components/Portrait";
import { StatBar } from "../components/StatBar";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const CharacterCard = ({ scene }: { scene: SceneOf<"CharacterCard"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u } = useLayout();
  const theme = useTheme();
  const card = spring({ frame, fps, config: { damping: 16 } });
  const info = spring({ frame: frame - 10, fps, config: { damping: 200 } });

  const portrait = (
    <Portrait
      image={scene.image}
      style={{
        width: vertical ? "100%" : 640 * u,
        height: vertical ? 760 * u : 760 * u,
        transform: `scale(${interpolate(card, [0, 1], [0.9, 1])})`,
        opacity: card,
      }}
    />
  );

  const details = (
    <div style={{ flex: 1, opacity: info, transform: `translateX(${interpolate(info, [0, 1], [vertical ? 0 : 60, 0]) * u}px)` }}>
      <div style={{ fontFamily: theme.bodyFont, fontWeight: 600, fontSize: 28 * u, letterSpacing: 8 * u, color: theme.colors.accent }}>{upper(scene.mythology)}</div>
      <div style={{ fontFamily: theme.displayFont, fontWeight: 900, fontSize: (vertical ? 120 : 140) * u, lineHeight: 1, color: theme.colors.text, margin: `${14 * u}px 0`, textShadow: `0 0 ${40 * u}px ${theme.colors.accentSoft}` }}>
        {upper(scene.name)}
      </div>
      <div style={{ fontFamily: theme.bodyFont, fontSize: 40 * u, color: theme.colors.muted, marginBottom: 40 * u }}>{scene.epithet}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 * u }}>
        {scene.stats.slice(0, 5).map((stat, i) => (
          <StatBar key={stat.label} stat={stat} delay={20 + i * 8} highlight={stat.value === Math.max(...scene.stats.map((s) => s.value))} />
        ))}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop seed={scene.image.id} intensity={0.9} />
      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: (vertical ? 40 : 90) * u,
          padding: vertical ? `${120 * u}px ${70 * u}px` : `${90 * u}px ${150 * u}px ${190 * u}px`,
        }}
      >
        {portrait}
        {details}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
