import { createContext, useContext, type ReactNode } from "react";
import { staticFile } from "remotion";

/** Proje klasöründeki göreli yolları Remotion public klasörüne, URL'leri olduğu gibi çözer. */
export const resolveAsset = (src: string): string => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src));

const AssetsContext = createContext<Record<string, string>>({});

export const AssetsProvider = ({ assets, children }: { assets: Record<string, string>; children: ReactNode }) => (
  <AssetsContext.Provider value={assets}>{children}</AssetsContext.Provider>
);

/** Görsel id'sine karşılık gelen kaynak; görsel henüz üretilmediyse undefined. */
export const useAsset = (id: string | undefined): string | undefined => {
  const assets = useContext(AssetsContext);
  const src = id ? assets[id] : undefined;
  return src ? resolveAsset(src) : undefined;
};
