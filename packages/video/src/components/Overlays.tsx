import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, useTheme } from "../theme";

const PARTICLE_COUNT = 70;

/** Tema bazlı parçacıklar: kıvılcım, kar, kum, toz, yıldız tozu veya veri. */
export const Particles = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { u } = useLayout();
  const theme = useTheme();
  const kind = theme.particles;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const r = (k: string) => random(`${kind}-${i}-${k}`);
        const speed = 0.4 + r("speed") * 1.2;
        const size = (kind === "stars" ? 1.5 + r("size") * 2.5 : 2 + r("size") * 4) * u;
        const phase = r("phase") * Math.PI * 2;
        let x = r("x") * width;
        let y = r("y") * height;
        let opacity = 0.25 + r("o") * 0.5;
        let color = theme.colors.accent;

        switch (kind) {
          case "embers":
            y = (((y - frame * speed * 1.6 * u) % height) + height) % height;
            x += Math.sin(frame / 25 + phase) * 18 * u;
            opacity *= 0.6 + 0.4 * Math.sin(frame / 6 + phase);
            break;
          case "snow":
            y = (y + frame * speed * 1.4 * u) % height;
            x += Math.sin(frame / 40 + phase) * 30 * u;
            color = "#ffffff";
            break;
          case "sand":
            x = (x + frame * speed * 2.5 * u) % width;
            y += Math.sin(frame / 30 + phase) * 10 * u;
            break;
          case "dust":
            x += Math.sin(frame / 90 + phase) * 40 * u;
            y += Math.cos(frame / 110 + phase) * 30 * u;
            color = theme.colors.text;
            opacity *= 0.5;
            break;
          case "stars":
            opacity *= 0.5 + 0.5 * Math.sin(frame / (10 + r("tw") * 30) + phase);
            x = (x + frame * 0.15 * speed * u) % width;
            color = r("c") > 0.7 ? theme.colors.accentSoft : "#ffffff";
            break;
          case "data":
            y = (y + frame * speed * 3 * u) % height;
            color = r("c") > 0.5 ? theme.colors.accent : theme.colors.accentSoft;
            break;
        }

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: kind === "data" ? size * 0.6 : size,
              height: kind === "data" ? size * 6 : size,
              borderRadius: kind === "data" ? 0 : "50%",
              background: color,
              opacity: Math.max(0, opacity),
              boxShadow: kind === "embers" || kind === "stars" ? `0 0 ${size * 3}px ${color}` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Sinematik film greni (her karede değişen gürültü). */
export const FilmGrain = () => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: theme.grain, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id="metaficta-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#metaficta-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette = ({ strength = 0.75 }: { strength?: number }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** Köşede düşük opaklıklı kanal imzası (uzun videolar). */
export const Watermark = () => {
  const theme = useTheme();
  const { u } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        top: 36 * u,
        right: 44 * u,
        fontFamily: theme.displayFont,
        fontWeight: 700,
        fontSize: 22 * u,
        letterSpacing: 6 * u,
        color: theme.colors.text,
        opacity: 0.35,
      }}
    >
      METAFICTA
    </div>
  );
};

/** Shorts için üstte ince ilerleme çubuğu (izlemeyi tamamlama isteği). */
export const ProgressBar = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const theme = useTheme();
  const { u } = useLayout();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 100], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8 * u, background: "rgba(255,255,255,0.12)" }}>
      <div style={{ width: `${progress}%`, height: "100%", background: theme.colors.accent, boxShadow: `0 0 ${12 * u}px ${theme.colors.accent}` }} />
    </div>
  );
};
