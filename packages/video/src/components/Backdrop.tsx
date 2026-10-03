import { noise2D } from "@remotion/noise";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../theme";

/**
 * Prosedürel sinematik arka plan: yavaşça hareket eden nebula/sis bulutları.
 * Görsel henüz üretilmemişse yer tutucu olarak, bölüm başlıklarında ise asıl arka plan olarak kullanılır.
 */
export const Backdrop = ({ seed = "backdrop", intensity = 1 }: { seed?: string; intensity?: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const theme = useTheme();
  const t = frame / 240;

  const blobs = [0, 1, 2, 3].map((i) => {
    const x = (0.5 + 0.38 * noise2D(`${seed}-x${i}`, t, i * 10)) * width;
    const y = (0.5 + 0.38 * noise2D(`${seed}-y${i}`, i * 10, t)) * height;
    const r = Math.max(width, height) * (0.35 + 0.12 * i);
    const color = i % 2 === 0 ? theme.colors.accentSoft : theme.colors.bgAlt;
    return { x, y, r, color, opacity: (i % 2 === 0 ? 0.45 : 0.9) * intensity };
  });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${theme.colors.bgAlt} 0%, ${theme.colors.bg} 65%)` }}>
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
            background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
            opacity: b.opacity,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
