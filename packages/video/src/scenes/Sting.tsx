import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useLayout, useSceneDuration, useTheme } from "../theme";

const LETTERS = "METAFICTA".split("");

/** ~2.5 sn'lik kanal imzası: harfler ışıkla belirir, slogan altında açılır. */
export const Sting = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = useSceneDuration();
  const { u } = useLayout();
  const theme = useTheme();
  const spacing = interpolate(frame, [0, duration], [40, 18]);
  const tagline = spring({ frame: frame - 28, fps, config: { damping: 200 } });
  const line = spring({ frame: frame - 18, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Backdrop seed="sting" intensity={1.3} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          {LETTERS.map((letter, i) => {
            const s = spring({ frame: frame - i * 2.5, fps, config: { damping: 15 } });
            return (
              <span
                key={i}
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: 700,
                  fontSize: 150 * u,
                  marginRight: spacing * u,
                  backgroundImage: `linear-gradient(180deg, #fff6dc 0%, ${theme.colors.accent} 55%, ${theme.colors.accentSoft} 100%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  opacity: s,
                  filter: `blur(${(1 - s) * 12}px) drop-shadow(0 0 ${30 * u}px ${theme.colors.accent})`,
                  transform: `translateY(${interpolate(s, [0, 1], [40, 0]) * u}px)`,
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
        <div style={{ height: 2 * u, width: 700 * u * line, background: `linear-gradient(90deg, transparent, ${theme.colors.accent}, transparent)`, margin: `${24 * u}px 0` }} />
        <div style={{ fontFamily: theme.bodyFont, fontWeight: 600, fontSize: 30 * u, letterSpacing: 14 * u, color: theme.colors.text, opacity: tagline }}>EFSANENİN ÖTESİ</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
