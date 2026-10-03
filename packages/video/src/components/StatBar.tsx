import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Stat } from "@metaficta/core";
import { useLayout, useTheme } from "../theme";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Animasyonlu puan çubuğu. `align="right"` çubuğu sağdan sola doldurur (Versus sol taraf için). */
export const StatBar = ({ stat, delay, align = "left", highlight = false }: { stat: Stat; delay: number; align?: "left" | "right"; highlight?: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const theme = useTheme();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 40 });
  const value = clamp(stat.value);
  const color = highlight ? theme.colors.accent : theme.colors.accentSoft;

  return (
    <div style={{ width: "100%", opacity: interpolate(p, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }) }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexDirection: align === "right" ? "row-reverse" : "row", fontFamily: theme.bodyFont, fontWeight: 600, fontSize: 30 * u, color: theme.colors.text, marginBottom: 8 * u }}>
        <span>{stat.label}</span>
        <span style={{ color: theme.colors.accent, fontVariantNumeric: "tabular-nums" }}>{Math.round(value * p)}</span>
      </div>
      <div style={{ height: 14 * u, background: "rgba(255,255,255,0.1)", borderRadius: 7 * u, overflow: "hidden", display: "flex", justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        <div style={{ width: `${value * p}%`, height: "100%", borderRadius: 7 * u, background: `linear-gradient(90deg, ${theme.colors.accentSoft}, ${color})`, boxShadow: `0 0 ${14 * u}px ${color}` }} />
      </div>
    </div>
  );
};
