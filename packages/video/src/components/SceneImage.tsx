import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import type { ImageRef } from "@metaficta/core";
import { useAsset } from "../assets";
import { useLayout, useSceneDuration, useTheme } from "../theme";
import { Backdrop } from "./Backdrop";

export type Motion = "push-in" | "pull-out" | "pan-left" | "pan-right" | "still";

/** Ken Burns hareketli tam ekran görsel. Görsel yoksa tema arka planı + küçük etiket gösterir. */
export const SceneImage = ({ image, motion = "push-in", darken = 0.25 }: { image?: ImageRef; motion?: Motion; darken?: number }) => {
  const frame = useCurrentFrame();
  const durationInFrames = useSceneDuration();
  const src = useAsset(image?.id);
  const { u } = useLayout();
  const theme = useTheme();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });

  const transform = {
    "push-in": `scale(${1 + 0.14 * p})`,
    "pull-out": `scale(${1.14 - 0.14 * p})`,
    "pan-left": `scale(1.15) translateX(${4 - 8 * p}%)`,
    "pan-right": `scale(1.15) translateX(${-4 + 8 * p}%)`,
    still: "none",
  }[motion];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform }}>
        {src ? <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Backdrop seed={image?.id ?? "empty"} />}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${darken})` }} />
      {!src && image ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-start", padding: 30 * u }}>
          <div style={{ padding: `${14 * u}px ${24 * u}px`, border: `${2 * u}px dashed ${theme.colors.accentSoft}`, borderRadius: 12 * u, fontFamily: theme.bodyFont, color: theme.colors.muted, opacity: 0.75 }}>
            <div style={{ fontSize: 18 * u, letterSpacing: 4 * u }}>GÖRSEL BEKLENİYOR</div>
            <div style={{ fontSize: 26 * u, fontWeight: 600, color: theme.colors.text, marginTop: 6 * u }}>{image.id}</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
