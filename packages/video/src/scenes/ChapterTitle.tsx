import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { GodRays, LightLeak, OrnamentRing, RevealText, useShake } from "../components/Motion";
import { roman, upper } from "../text";
import { useLayout, useSceneDuration, useTheme } from "../theme";

/**
 * Bölüm açılışı: arkada dev Romen rakamı ve dönen süslü halka, yukarıdan ışık huzmeleri,
 * başlık harf aralığı daralarak netleşir ve üzerinden ışık geçer. Girişte hafif bir darbe sarsıntısı.
 */
export const ChapterTitle = ({ scene }: { scene: SceneOf<"ChapterTitle"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = useSceneDuration();
  const { vertical, u, centerPaddingBottom } = useLayout();
  const theme = useTheme();
  const line = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const sub = spring({ frame: frame - 26, fps, config: { damping: 200 } });
  const numeral = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const push = interpolate(frame, [0, duration], [1, 1.08]);
  const shake = useShake(8, 14, 10);
  const ringSize = (vertical ? 820 : 760) * u;

  return (
    <AbsoluteFill style={{ transform: `scale(${push})${shake}` }}>
      <Backdrop seed={`chapter-${scene.chapterNumber}`} intensity={1.2} />
      <GodRays opacity={0.3} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: centerPaddingBottom }}>
        <div
          style={{
            position: "absolute",
            fontFamily: theme.displayFont,
            fontWeight: 900,
            fontSize: (vertical ? 520 : 560) * u,
            color: "transparent",
            WebkitTextStroke: `${2 * u}px ${theme.colors.accent}`,
            opacity: 0.16 * numeral,
            transform: `scale(${1.25 - 0.25 * numeral})`,
          }}
        >
          {roman(scene.chapterNumber)}
        </div>
        <OrnamentRing size={ringSize} opacity={0.45} />
      </AbsoluteFill>
      <LightLeak strength={interpolate(frame, [0, 12, 45], [0.6, 0.4, 0.12], { extrapolateRight: "clamp" })} seed={`chapter-${scene.chapterNumber}`} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 80 * u, paddingBottom: Math.max(80 * u, centerPaddingBottom) }}>
        <div style={{ fontFamily: theme.bodyFont, fontWeight: 600, fontSize: 28 * u, letterSpacing: 14 * u, color: theme.colors.accent, opacity: line }}>
          BÖLÜM {roman(scene.chapterNumber)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 * u, margin: `${26 * u}px 0` }}>
          <div style={{ height: 2 * u, width: interpolate(line, [0, 1], [0, vertical ? 160 : 260]) * u, background: `linear-gradient(90deg, transparent, ${theme.colors.accent})` }} />
          <div style={{ width: 12 * u, height: 12 * u, transform: `rotate(${45 + frame * 2}deg)`, background: theme.colors.accent, opacity: line, boxShadow: `0 0 ${14 * u}px ${theme.colors.accent}` }} />
          <div style={{ height: 2 * u, width: interpolate(line, [0, 1], [0, vertical ? 160 : 260]) * u, background: `linear-gradient(90deg, ${theme.colors.accent}, transparent)` }} />
        </div>
        <RevealText text={upper(scene.title)} delay={8} fontSize={(vertical ? 96 : 112) * u} fontFamily={theme.displayFont} />
        {scene.subtitle ? (
          <div style={{ marginTop: 22 * u, fontFamily: theme.bodyFont, fontSize: 40 * u, color: theme.colors.muted, opacity: sub, letterSpacing: interpolate(sub, [0, 1], [16, 4]) * u }}>
            {scene.subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
