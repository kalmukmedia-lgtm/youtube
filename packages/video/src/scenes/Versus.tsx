import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Portrait } from "../components/Portrait";
import { StatBar } from "../components/StatBar";
import { upper } from "../text";
import { useLayout, useSceneDuration, useTheme } from "../theme";

type Fighter = SceneOf<"Versus">["left"];

export const Versus = ({ scene }: { scene: SceneOf<"Versus"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = useSceneDuration();
  const { vertical, u } = useLayout();
  const theme = useTheme();

  const enter = spring({ frame, fps, config: { damping: 18 } });
  const vs = spring({ frame: frame - 14, fps, config: { damping: 8, mass: 0.6 } });
  const flash = interpolate(frame, [14, 18, 30], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Sonuç sahnenin son üçte birinde açıklanır.
  const verdictAt = Math.floor(duration * 0.66);
  const verdict = spring({ frame: frame - verdictAt, fps, config: { damping: 14 } });

  const isWinner = (side: "left" | "right") => scene.verdict === side;
  const isLoser = (side: "left" | "right") => (scene.verdict === "left" || scene.verdict === "right") && scene.verdict !== side;

  const side = (fighter: Fighter, which: "left" | "right") => {
    const dir = which === "left" ? -1 : 1;
    const dim = isLoser(which) ? interpolate(verdict, [0, 1], [1, 0.35]) : 1;
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: vertical ? "row" : "column",
          alignItems: "center",
          gap: 30 * u,
          opacity: enter * dim,
          transform: `translate${vertical ? "Y" : "X"}(${interpolate(enter, [0, 1], [dir * 200, 0]) * u}px) scale(${isWinner(which) ? 1 + 0.05 * verdict : 1})`,
        }}
      >
        <Portrait image={fighter.image} motion={which === "left" ? "pan-right" : "pan-left"} style={{ width: vertical ? 380 * u : 400 * u, height: vertical ? 520 * u : 430 * u, flexShrink: 0 }} />
        <div style={{ width: vertical ? "100%" : 560 * u, textAlign: vertical ? "left" : "center" }}>
          <div style={{ fontFamily: theme.displayFont, fontWeight: 900, fontSize: 80 * u, lineHeight: 1, color: theme.colors.text }}>{upper(fighter.name)}</div>
          <div style={{ fontFamily: theme.bodyFont, fontSize: 30 * u, color: theme.colors.accent, letterSpacing: 4 * u, margin: `${8 * u}px 0 ${20 * u}px` }}>{upper(fighter.epithet)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 * u }}>
            {fighter.stats.slice(0, 4).map((stat, i) => {
              const other = (which === "left" ? scene.right : scene.left).stats.find((s) => s.label === stat.label);
              return <StatBar key={stat.label} stat={stat} delay={30 + i * 10} align={which === "left" && !vertical ? "right" : "left"} highlight={!other || stat.value >= other.value} />;
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <Backdrop seed="versus" intensity={1.1} />
      <AbsoluteFill style={{ flexDirection: vertical ? "column" : "row", alignItems: "center", padding: vertical ? `${110 * u}px ${60 * u}px` : `${60 * u}px ${110 * u}px ${180 * u}px`, gap: (vertical ? 150 : 200) * u }}>
        {side(scene.left, "left")}
        {side(scene.right, "right")}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: theme.displayFont,
            fontWeight: 900,
            fontSize: 150 * u,
            color: theme.colors.accent,
            transform: `scale(${interpolate(vs, [0, 1], [3, 1])}) rotate(${interpolate(vs, [0, 1], [-20, -6])}deg)`,
            opacity: Math.min(1, vs * 1.5),
            textShadow: `0 0 ${50 * u}px ${theme.colors.accent}, 0 0 ${120 * u}px ${theme.colors.accentSoft}`,
          }}
        >
          VS
        </div>
        {scene.verdict === "hidden" ? (
          <div style={{ position: "absolute", bottom: (vertical ? 260 : 60) * u, fontFamily: theme.displayFont, fontWeight: 700, fontSize: 56 * u, color: theme.colors.text, opacity: verdict, letterSpacing: 6 * u }}>
            KİM KAZANIRDI?
          </div>
        ) : null}
        {scene.verdict === "draw" ? (
          <div style={{ position: "absolute", bottom: (vertical ? 260 : 60) * u, fontFamily: theme.displayFont, fontWeight: 700, fontSize: 56 * u, color: theme.colors.accent, opacity: verdict, letterSpacing: 6 * u }}>
            BERABERE
          </div>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff8e6", opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
