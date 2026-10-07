import type { ImageRef } from "@metaficta/core";
import { AbsoluteFill, Easing, Freeze, Img, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { useAsset, useClip } from "../assets";
import { useLayout, useSceneDuration, useTheme } from "../theme";
import { Backdrop } from "./Backdrop";
import { Atmosphere } from "./Motion";

export type Motion = "push-in" | "pull-out" | "pan-left" | "pan-right" | "still";

const cover = { width: "100%", height: "100%", objectFit: "cover" } as const;

/** Klip en fazla bu kadar yavaşlatılır; daha kısaysa son karede donar ve kamera hareketi sürer. */
const MIN_PLAYBACK_RATE = 0.6;

/**
 * Image-to-video klibi. Sahneden kısaysa önce yavaşlatılır, yine yetmezse son karede donar;
 * üstteki kamera hareketi devam ettiği için donma fark edilmez.
 */
const Clip = ({ src, durationSec }: { src: string; durationSec: number }) => {
  const { fps } = useVideoConfig();
  const sceneFrames = useSceneDuration();
  const clipFrames = durationSec * fps;
  const rate = Math.min(1, Math.max(MIN_PLAYBACK_RATE, clipFrames / sceneFrames));
  const playFrames = Math.floor(clipFrames / rate) - 2;
  return (
    <Freeze frame={playFrames} active={(f) => f >= playFrames}>
      <OffthreadVideo src={src} muted playbackRate={rate} style={cover} />
    </Freeze>
  );
};

/**
 * Sahnenin arka plan görüntüsü. Görselin klibi varsa klip, yoksa Ken Burns hareketli görsel,
 * ikisi de yoksa tema arka planı + "görsel bekleniyor" etiketi. Üzerinde nefes alan kamera ve sis katmanı vardır.
 */
export const SceneImage = ({ image, motion = "push-in", darken = 0.25, atmosphere = true }: { image?: ImageRef; motion?: Motion; darken?: number; atmosphere?: boolean }) => {
  const frame = useCurrentFrame();
  const durationInFrames = useSceneDuration();
  const src = useAsset(image?.id);
  const clip = useClip(image?.id);
  const { u } = useLayout();
  const theme = useTheme();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  // Elde tutulan kamera hissi: çok küçük, yavaş bir salınım.
  const driftX = Math.sin(frame / 47) * 0.35;
  const driftY = Math.cos(frame / 59) * 0.3;

  // Klipte sahne zaten hareketli: kamera hareketi daha hafif.
  const k = clip ? 0.45 : 1;
  const transform = {
    "push-in": `scale(${1.02 + 0.16 * k * p}) rotate(${0.6 * k * p}deg)`,
    "pull-out": `scale(${1.02 + 0.16 * k * (1 - p)}) rotate(${-0.6 * k * (1 - p)}deg)`,
    "pan-left": `scale(${1.08 + 0.08 * k}) translateX(${(4 - 8 * p) * k}%)`,
    "pan-right": `scale(${1.08 + 0.08 * k}) translateX(${(-4 + 8 * p) * k}%)`,
    still: "scale(1.04)",
  }[motion];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${driftX}%, ${driftY}%) ${transform}` }}>
        {clip ? <Clip {...clip} /> : src ? <Img src={src} style={cover} /> : <Backdrop seed={image?.id ?? "empty"} />}
      </AbsoluteFill>
      {atmosphere && (clip || src) ? <Atmosphere seed={image?.id} /> : null}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${darken})` }} />
      {!src && !clip && image ? (
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
