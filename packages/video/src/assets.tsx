import type { RenderInput } from "@metaficta/core";
import { createContext, useContext, type ReactNode } from "react";
import { staticFile } from "remotion";

/** Proje klasöründeki göreli yolları Remotion public klasörüne, URL'leri olduğu gibi çözer. */
export const resolveAsset = (src: string): string => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src));

type Clips = NonNullable<RenderInput["clips"]>;

interface Media {
  assets: Record<string, string>;
  clips: Clips;
}

const MediaContext = createContext<Media>({ assets: {}, clips: {} });

export const AssetsProvider = ({ assets, clips = {}, children }: { assets: Record<string, string>; clips?: Clips; children: ReactNode }) => (
  <MediaContext.Provider value={{ assets, clips }}>{children}</MediaContext.Provider>
);

/** Görsel id'sine karşılık gelen kaynak; görsel henüz üretilmediyse undefined. */
export const useAsset = (id: string | undefined): string | undefined => {
  const { assets } = useContext(MediaContext);
  const src = id ? assets[id] : undefined;
  return src ? resolveAsset(src) : undefined;
};

/** Görselin hareketli hali (image-to-video klibi) varsa kaynağı ve süresi. */
export const useClip = (id: string | undefined): { src: string; durationSec: number } | undefined => {
  const { clips } = useContext(MediaContext);
  const clip = id ? clips[id] : undefined;
  return clip ? { src: resolveAsset(clip.src), durationSec: clip.durationSec } : undefined;
};
