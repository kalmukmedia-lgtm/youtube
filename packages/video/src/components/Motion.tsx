import { noise2D } from "@remotion/noise";
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, useTheme } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Film ışık sızıntısı: sıcak renkli, yavaşça kayan parlak lekeler (screen karışımı).
 * `strength` 0-1 arası; geçişlerde kısa süre tepe yapar, açılış ve bölüm sahnelerinde hafif kalır.
 */
export const LightLeak = ({ strength = 0.5, seed = "leak" }: { strength?: number; seed?: string }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const theme = useTheme();
  if (strength <= 0) return null;
  const t = frame / 90;
  const blobs = [
    { color: "#ffb347", size: 0.9 },
    { color: theme.colors.accent, size: 0.7 },
    { color: "#ff6a3d", size: 0.55 },
  ].map((b, i) => ({
    ...b,
    x: (0.15 + 0.7 * (0.5 + 0.5 * noise2D(`${seed}-x${i}`, t, i))) * width,
    y: (0.5 + 0.45 * noise2D(`${seed}-y${i}`, i, t)) * height,
    r: Math.max(width, height) * b.size * 0.5,
  }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: Math.min(1, strength) }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x - b.r,
            top: b.y - b.r,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color} 0%, ${b.color}88 25%, transparent 65%)`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Görüntünün üzerinde süzülen ince sis/duman katmanı: düz görsellere derinlik katar. */
export const Atmosphere = ({ opacity = 0.22, seed = "fog" }: { opacity?: number; seed?: string }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const theme = useTheme();
  const layers = [0, 1, 2].map((i) => ({
    x: ((frame * (0.6 + i * 0.35) + i * width * 0.4) % (width * 1.6)) - width * 0.3,
    y: height * (0.55 + 0.25 * noise2D(`${seed}-${i}`, frame / 300, i)),
    w: width * (0.9 + i * 0.3),
    h: height * (0.35 + i * 0.1),
    color: i === 1 ? theme.colors.accentSoft : "#d8d2c8",
  }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "screen" }}>
      {layers.map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: l.x - l.w / 2,
            top: l.y - l.h / 2,
            width: l.w,
            height: l.h,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${l.color}66 0%, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Yukarıdan dönen ışık huzmeleri (god rays). */
export const GodRays = ({ opacity = 0.35, origin = "50% -10%" }: { opacity?: number; origin?: string }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const angle = frame * 0.08;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "screen",
        opacity,
        background: `repeating-conic-gradient(from ${angle}deg at ${origin}, ${theme.colors.accent}00 0deg, ${theme.colors.accent}55 3deg, ${theme.colors.accent}00 9deg, ${theme.colors.accent}00 16deg)`,
        maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%)",
        filter: "blur(6px)",
      }}
    />
  );
};

/**
 * Sahne başında sönümlenen kamera sarsıntısı (vurgu/darbe anları).
 * Dönen değer doğrudan `transform`'a eklenir.
 */
export const useShake = (startFrame: number, durationFrames = 14, amplitude = 14): string => {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  const local = frame - startFrame;
  if (local < 0 || local > durationFrames) return "";
  const decay = 1 - local / durationFrames;
  const x = noise2D("shake-x", local / 2.2, 0) * amplitude * decay * u;
  const y = noise2D("shake-y", 0, local / 2.2) * amplitude * decay * u;
  const r = noise2D("shake-r", local / 3, 1) * 0.4 * decay;
  return ` translate(${x}px, ${y}px) rotate(${r}deg)`;
};

/**
 * Sinematik başlık açılışı: harf aralığı daralarak, alttan maskeyle ve bulanıklıktan netleşerek gelir;
 * ardından yazının üzerinden bir ışık parıltısı geçer.
 */
export const RevealText = ({
  text,
  fontSize,
  fontFamily,
  delay = 0,
  weight = 700,
  color,
  glow,
  align = "center",
  style,
}: {
  text: string;
  fontSize: number;
  fontFamily: string;
  delay?: number;
  weight?: number;
  color?: string;
  glow?: string;
  align?: "left" | "center";
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const local = frame - delay;
  const p = interpolate(local, [0, 22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const shine = interpolate(local, [18, 48], [-60, 160], clamp);
  const base = color ?? theme.colors.text;
  const glowColor = glow ?? theme.colors.accent;
  return (
    <div
      style={{
        fontFamily,
        fontWeight: weight,
        fontSize,
        lineHeight: 1.08,
        textAlign: align,
        letterSpacing: `${interpolate(p, [0, 1], [0.35, 0.04])}em`,
        backgroundImage: `linear-gradient(105deg, ${base} 0%, ${base} ${shine - 12}%, #ffffff ${shine}%, ${base} ${shine + 12}%, ${base} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        clipPath: `inset(${interpolate(p, [0, 1], [100, -20])}% -20% -20% -20%)`,
        opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
        filter: `blur(${(1 - p) * 10}px) drop-shadow(0 0 ${fontSize * 0.35}px ${glowColor}88) drop-shadow(0 ${fontSize * 0.06}px ${fontSize * 0.12}px rgba(0,0,0,0.9))`,
        transform: `translateY(${(1 - p) * fontSize * 0.25}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Bölüm başlıklarının arkasında dönen süslü halka (antik kadran / rün çemberi hissi). */
export const OrnamentRing = ({ size, opacity = 0.5 }: { size: number; opacity?: number }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const appear = interpolate(frame, [0, 25], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      style={{ position: "absolute", opacity: opacity * appear, transform: `scale(${0.85 + 0.15 * appear})`, filter: `drop-shadow(0 0 6px ${theme.colors.accent})` }}
    >
      <g transform={`rotate(${frame * 0.25})`}>
        <circle r="92" fill="none" stroke={theme.colors.accent} strokeWidth="0.6" strokeDasharray="1 3" />
        {ticks.map((i) => (
          <line key={i} x1="0" y1={-86} x2="0" y2={i % 6 === 0 ? -79 : -83} stroke={theme.colors.accent} strokeWidth={i % 6 === 0 ? 0.9 : 0.4} transform={`rotate(${i * 5})`} />
        ))}
      </g>
      <g transform={`rotate(${-frame * 0.4})`}>
        <circle r="74" fill="none" stroke={theme.colors.accent} strokeWidth="0.4" strokeDasharray={`${2 * Math.PI * 74 * appear} 999`} />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="-2.2" y="-76.2" width="4.4" height="4.4" fill={theme.colors.accent} transform={`rotate(${a}) rotate(45 0 -74)`} />
        ))}
      </g>
      <circle r="60" fill="none" stroke={theme.colors.accentSoft} strokeWidth="0.3" opacity="0.8" />
    </svg>
  );
};
