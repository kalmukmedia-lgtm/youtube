import { createContext, useContext, type ReactNode } from "react";
import { getTheme, type Theme, type ThemeId } from "@metaficta/core";
import { useVideoConfig } from "remotion";
import { fontFamily } from "./fonts";

export interface ResolvedTheme extends Theme {
  displayFont: string;
  bodyFont: string;
}

const ThemeContext = createContext<ResolvedTheme | null>(null);

export const ThemeProvider = ({ themeId, children }: { themeId: ThemeId; children: ReactNode }) => {
  const theme = getTheme(themeId);
  const value: ResolvedTheme = { ...theme, displayFont: fontFamily(theme.fonts.display), bodyFont: fontFamily(theme.fonts.body) };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ResolvedTheme => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
};

/** Aynı bileşenin hem 16:9 hem 9:16'da çalışması için ölçek bilgisi. `u` = 1080p'ye göre 1 piksel. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const u = Math.min(width, height) / 1080;
  // Dikey videoda altyazı ekranın %60'ından başlar; ortalanan içerik bu bölgenin üstünde kalmalı.
  return { width, height, vertical, u, centerPaddingBottom: vertical ? height * 0.38 : 0 };
};

const SceneDurationContext = createContext<number | null>(null);

export const SceneDurationProvider = ({ durationInFrames, children }: { durationInFrames: number; children: ReactNode }) => (
  <SceneDurationContext.Provider value={durationInFrames}>{children}</SceneDurationContext.Provider>
);

/** İçinde bulunulan sahnenin süresi (kare). Sahne dışında kompozisyon süresini döndürür. */
export const useSceneDuration = (): number => {
  const scene = useContext(SceneDurationContext);
  const { durationInFrames } = useVideoConfig();
  return scene ?? durationInFrames;
};
