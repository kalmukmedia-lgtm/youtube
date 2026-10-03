import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { fontFamily } from "../fonts";
import { useLayout, useSceneDuration, useTheme } from "../theme";

export const Quote = ({ scene }: { scene: SceneOf<"Quote"> }) => {
  const frame = useCurrentFrame();
  const duration = useSceneDuration();
  const { vertical, u } = useLayout();
  const theme = useTheme();
  const words = scene.quote.split(/\s+/);
  // Alıntı sahnenin ilk %60'ında kelime kelime belirir.
  const revealFrames = Math.max(20, duration * 0.6);
  const attribution = interpolate(frame, [revealFrames, revealFrames + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Backdrop seed="quote" intensity={0.8} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: (vertical ? 70 : 220) * u }}>
        <div style={{ fontFamily: theme.displayFont, fontSize: 220 * u, lineHeight: 0.6, color: theme.colors.accent, opacity: 0.5, alignSelf: vertical ? "center" : "flex-start" }}>“</div>
        <div style={{ fontFamily: fontFamily("Cormorant Garamond"), fontWeight: 500, fontStyle: "italic", fontSize: (vertical ? 70 : 68) * u, lineHeight: 1.3, color: theme.colors.text, textAlign: "center" }}>
          {words.map((word, i) => {
            const start = (i / words.length) * revealFrames;
            const o = interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <span key={i} style={{ opacity: o, filter: `blur(${(1 - o) * 6}px)` }}>
                {word}{" "}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 40 * u, fontFamily: theme.bodyFont, fontSize: 32 * u, letterSpacing: 4 * u, color: theme.colors.accent, opacity: attribution }}>— {scene.attribution}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
