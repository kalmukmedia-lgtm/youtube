import type { CSSProperties } from "react";
import type { ImageRef } from "@metaficta/core";
import { SceneImage, type Motion } from "./SceneImage";
import { useLayout, useTheme } from "../theme";

/** Altın çerçeveli, içinde hafif Ken Burns hareketi olan portre paneli. */
export const Portrait = ({ image, motion = "push-in", style }: { image: ImageRef; motion?: Motion; style?: CSSProperties }) => {
  const theme = useTheme();
  const { u } = useLayout();
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18 * u,
        border: `${3 * u}px solid ${theme.colors.accent}`,
        boxShadow: `0 0 ${50 * u}px ${theme.colors.accentSoft}, inset 0 0 ${80 * u}px rgba(0,0,0,0.6)`,
        ...style,
      }}
    >
      <SceneImage image={image} motion={motion} darken={0.05} atmosphere={false} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 55%, ${theme.colors.bg} 100%)` }} />
    </div>
  );
};
